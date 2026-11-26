"use strict";

import { Monitor } from "../monitor";

export const BLOCKCHAIN_REGISTRATION_FAILED = "BLOCKCHAIN_REGISTRATION_FAILED";

/**
 * Thrown when an on-chain step fails after off-chain state was persisted.
 * Off-chain persist/rollback errors are not wrapped and propagate as-is.
 */
export class OnChainRegistrationError extends Error {
    public readonly cause: unknown;

    constructor(cause: unknown) {
        super(BLOCKCHAIN_REGISTRATION_FAILED);
        this.name = "OnChainRegistrationError";
        this.cause = cause;
    }
}

export function isOnChainRegistrationError(ex: unknown): ex is OnChainRegistrationError {
    return ex instanceof OnChainRegistrationError;
}

export type OnChainRollbackStep<T> = {
    execute: (ctx: T) => Promise<void>;
    compensate: (ctx: T) => Promise<void>;
};

/**
 * Persists off-chain state, runs on-chain steps sequentially, and rolls back on failure.
 * On step k failure: compensates steps 0..k-1 in reverse order, then runs off-chain rollback.
 */
export async function executeWithOnChainRollback<T>(opts: {
    persist: () => Promise<T>;
    rollback: (ctx: T) => Promise<void>;
    chainSteps: OnChainRollbackStep<T>[];
}): Promise<T> {
    const ctx = await opts.persist();

    for (let stepIndex = 0; stepIndex < opts.chainSteps.length; stepIndex++) {
        try {
            await opts.chainSteps[stepIndex].execute(ctx);
        } catch (ex) {
            const errorMessage = ex instanceof Error ? ex.message : String(ex);
            Monitor.error(
                `[OnChainRollback] Chain step ${stepIndex} failed: ${errorMessage}. Compensating ${stepIndex} prior step(s).`,
            );

            for (let compensateIndex = stepIndex - 1; compensateIndex >= 0; compensateIndex--) {
                try {
                    await opts.chainSteps[compensateIndex].compensate(ctx);
                } catch (compensateEx) {
                    Monitor.error(
                        `[OnChainRollback] Compensation for step ${compensateIndex} failed: `
                        + (compensateEx instanceof Error ? compensateEx.message : compensateEx),
                    );
                }
            }

            try {
                await opts.rollback(ctx);
            } catch (rollbackEx) {
                Monitor.error(
                    "[OnChainRollback] Off-chain rollback failed: "
                    + (rollbackEx instanceof Error ? rollbackEx.message : rollbackEx),
                );
            }

            throw new OnChainRegistrationError(ex);
        }
    }

    return ctx;
}
