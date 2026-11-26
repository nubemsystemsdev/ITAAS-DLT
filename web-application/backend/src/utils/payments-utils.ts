// Reserved for license

"use strict";

import Crypto from "crypto";
import { SubscriptionBillingCycle } from "../models/subscription";
import { PaymentsConfig } from "../config/config-payments";

export function paymentIdToBytes32(paymentId: string): string {
    const hash = Crypto.createHash("sha256");
    hash.update(paymentId || "", "utf8");
    return "0x" + hash.digest("hex");
}

export function computePeriodEnd(startMs: number, periodDays: number): number {
    const dayMs = 24 * 60 * 60 * 1000;
    return startMs + (periodDays * dayMs);
}

export function computeNoticeAt(periodEndMs: number, noticeDays: number): number {
    const dayMs = 24 * 60 * 60 * 1000;
    return periodEndMs - (noticeDays * dayMs);
}

export function getPeriodDays(cycle: SubscriptionBillingCycle, cfg: PaymentsConfig): number {
    return cycle === SubscriptionBillingCycle.ANNUAL ? cfg.subscriptionAnnualPeriodDays : cfg.subscriptionMonthlyPeriodDays;
}

/** Prorated refund for unused time left in the current billing period. */
export function computeUnusedPeriodRefundCents(
    periodStartMs: number,
    periodEndMs: number,
    paymentAmountCents: number,
    nowMs = Date.now(),
): number {
    if (paymentAmountCents <= 0 || periodEndMs <= nowMs || periodEndMs <= periodStartMs) {
        return 0;
    }
    const unusedRatio = (periodEndMs - nowMs) / (periodEndMs - periodStartMs);
    return Math.max(0, Math.floor(paymentAmountCents * unusedRatio));
}
