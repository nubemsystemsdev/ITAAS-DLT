// Parallel transaction helper

"use strict";

import { SignKey, TransactionSendingOptions } from "@cyberchain/smart-contract-wrapper";
import { BlockchainConfig } from "../config/config-blockchain";
import { AsyncSemaphore } from "@asanrom/async-tools";

/**
 * Function to send a transaction (parallel)
 */
export type ParallelTxFunc = (getTxOptions: (signKey?: SignKey) => TransactionSendingOptions) => Promise<void>;

/**
 * Runs parallel transactions, to speed them up
 * @param txFuncs The functions to send transactions
 */
export async function runParallelTransactions(txFuncs: ParallelTxFunc[]): Promise<void> {
    const sem = new AsyncSemaphore(1);

    let canRelease = false;

    const getTxOptions: (signKey?: SignKey) => TransactionSendingOptions = signKey => {
        return {
            ...BlockchainConfig.getInstance().getTransactionSendingOptions(signKey),
            beforeSend: async () => {
                await sem.acquire();
                canRelease = true;
            },
            afterSend: () => {
                if (!canRelease) {
                    return;
                }
                canRelease = false;
                sem.release();
            },
        };
    };

    await Promise.all(txFuncs.map(txFuncs => txFuncs(getTxOptions)));
}
