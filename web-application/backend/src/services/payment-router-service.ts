// Reserved for license

"use strict";

import { BlockchainConfig } from "../config/config-blockchain";
import { Monitor } from "../monitor";
import { PaymentRouterWrapper } from "../contracts/payment-router";
import { MethodTransactionOptions } from "@cyberchain/smart-contract-wrapper";
import { ZERO_ADDRESS } from "../utils/blockchain";

export class PaymentRouterService {
    public static instance: PaymentRouterService = null;

    public static getInstance(): PaymentRouterService {
        if (PaymentRouterService.instance) {
            return PaymentRouterService.instance;
        } else {
            PaymentRouterService.instance = new PaymentRouterService();
            return PaymentRouterService.instance;
        }
    }

    public get contract(): PaymentRouterWrapper {
        return BlockchainConfig.getInstance().contracts.paymentRouter;
    }

    public getTransactionOptionsAdmin(): MethodTransactionOptions {
        const config = BlockchainConfig.getInstance();
        return {
            signKey: config.privateKeys.admin,
            complementaryAddress: config.privateKeys.adminComplementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    public async isRecorded(paymentIdBytes32: string): Promise<boolean> {
        if (this.contract.address === ZERO_ADDRESS) {
            throw new Error("PaymentRouter not configured");
        }
        return this.contract.isPaymentRecorded(paymentIdBytes32);
    }

    public async recordPayment(paymentIdBytes32: string, account: string, amount: bigint, kind: number, ref: string): Promise<string> {
        if (this.contract.address === ZERO_ADDRESS) {
            throw new Error("PaymentRouter not configured");
        }
        const tx = await this.contract.recordPayment(paymentIdBytes32, account, amount, kind, ref, this.getTransactionOptionsAdmin());
        const txHash = tx.receipt.transactionHash;
        if (!txHash) {
            return "";
        }
        if (typeof txHash === "string") {
            return txHash;
        }
        return `0x${txHash.toString("hex")}`;
    }
}
