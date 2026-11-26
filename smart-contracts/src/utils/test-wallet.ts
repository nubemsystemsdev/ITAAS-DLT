// Test wallets

"use strict";

import { privateKeyToAddress, TransactionSendingOptions, SignKey } from "@cyberchain/smart-contract-wrapper";
import Crypto from "crypto";
import { BlockchainConfig } from "../config/config-blockchain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Test wallet
 */
export class TestWallet {
    /**
     * Generates a random wallet for testing
     * @returns The wallet
     */
    public static random(): TestWallet {
        const key = Crypto.randomBytes(32);
        return new TestWallet({
            type: "ec-dsa",
            key: key,
        });
    }

    /**
     * Obtains the deployer wallet
     * @returns The wallet
     */
    public static deployer(): TestWallet {
        const config = BlockchainConfig.getInstance();
        const wallet = new TestWallet(config.deploySignKey, config.complementaryAddress);
        wallet.address = config.deployAccountAddress;
        return wallet;
    }

    private static namedWallets: Map<string, TestWallet> = new Map();

    /**
     * Gets a named wallet (it will be the same between tests)
     * @param name The wallet name
     * @returns The wallet
     */
    public static named(name: string): TestWallet {
        if (TestWallet.namedWallets.has(name)) {
            return TestWallet.namedWallets.get(name);
        }

        const wallet = TestWallet.random();

        TestWallet.namedWallets.set(name, wallet);

        return wallet;
    }

    // Sign key
    public key: SignKey;

    // Address
    public address: string;

    // Complementary address (for mixed address computation)
    public complementaryAddress: string;

    /**
     * Builds a test wallet
     * @param key The wallet sign key
     * @param complementaryAddress The complementary address (defaults to zero)
     */
    constructor(key: SignKey, complementaryAddress?: string) {
        this.key = key;
        this.complementaryAddress = complementaryAddress || ZERO_ADDRESS;
        this.address = privateKeyToAddress(key);
    }

    /**
     * Gets the options to send transactions
     * @returns The transaction sending options
     */
    public getTxOptions(): TransactionSendingOptions {
        return BlockchainConfig.getInstance().getTransactionSendingOptions(this.key, this.complementaryAddress);
    }
}
