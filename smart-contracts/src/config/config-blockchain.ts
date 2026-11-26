// Reserved for license

"use strict";

import { RPCOptions, RPCProvider, RPC_HTTP_Provider, RPC_WebSocket_Provider, TransactionSendingOptions, hexNoPrefix, privateKeyToAddress, privateKeyToMixedAddress, SignKey } from "@cyberchain/smart-contract-wrapper";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Blockchain configuration.
 */
export class BlockchainConfig {
    /**
     * Set it to true for test
     */
    public static IS_TEST = false;


    /**
     * Gets the configuration instance.
     */
    public static getInstance(): BlockchainConfig {
        if (BlockchainConfig.instance) {
            return BlockchainConfig.instance;
        }

        const config: BlockchainConfig = new BlockchainConfig();

        const protocol = BlockchainConfig.IS_TEST ? (process.env.TEST_BLOCKCHAIN_NODE_PROTOCOL || "http") : (process.env.BLOCKCHAIN_NODE_PROTOCOL || "http");
        const urlEnv = BlockchainConfig.IS_TEST ? process.env.TEST_BLOCKCHAIN_NODE_RPC_URL : process.env.BLOCKCHAIN_NODE_RPC_URL;

        switch (protocol) {
            case "http":
            case "https":
                config.protocol = "http";
                config.url = urlEnv || "http://localhost:8545";
                config.provider = new RPC_HTTP_Provider(config.url);
                break;
            case "ws":
            case "wss":
                config.protocol = "ws";
                config.url = urlEnv || "ws://localhost:8546";
                config.provider = new RPC_WebSocket_Provider(config.url);
                break;
            default:
                throw new Error("Invalid protocol: " + config.protocol + " | Allowed protocols for blockchain connections: http, ws");
        }

        // Configure ML-DSA level
        const mlDsaLevelEnv = BlockchainConfig.IS_TEST ? process.env.TEST_ML_DSA_LEVEL : process.env.ML_DSA_LEVEL;
        const mlDsaLevel = parseInt(mlDsaLevelEnv || "44", 10);
        config.mlDsaLevel = [44, 65, 87].includes(mlDsaLevel) ? mlDsaLevel as 44 | 65 | 87 : 44;

        // Configure deploy keys
        const adminPkType = BlockchainConfig.IS_TEST
            ? (process.env.TEST_BLOCKCHAIN_PK_ADMIN_TYPE || "ec")
            : (process.env.BLOCKCHAIN_PK_ADMIN_TYPE || "ec");

        const ecKeyEnv = BlockchainConfig.IS_TEST ? (process.env.TEST_BLOCKCHAIN_PK_ADMIN_EC || "C4A8594C99969B387242AEC34C6033911D9FB66E3E6882C81401B06A51964569") : (process.env.BLOCKCHAIN_PK_ADMIN_EC || "C4A8594C99969B387242AEC34C6033911D9FB66E3E6882C81401B06A51964569");
        const mlKeyEnv = BlockchainConfig.IS_TEST ? process.env.TEST_BLOCKCHAIN_PK_ADMIN_ML : process.env.BLOCKCHAIN_PK_ADMIN_ML;
        const mlPubKeyEnv = BlockchainConfig.IS_TEST ? process.env.TEST_BLOCKCHAIN_PK_ADMIN_ML_PUB : process.env.BLOCKCHAIN_PK_ADMIN_ML_PUB;

        switch (adminPkType) {
            case "ec":
            case "ec-dsa":
                config.deploySignKey = {
                    type: "ec-dsa",
                    key: new Uint8Array(Buffer.from(hexNoPrefix(ecKeyEnv), "hex")),
                };
                config.complementaryAddress = mlKeyEnv && mlPubKeyEnv ? privateKeyToAddress({
                    type: "ml-dsa",
                    secretKey: new Uint8Array(Buffer.from(hexNoPrefix(mlKeyEnv), "hex")),
                    publicKey: new Uint8Array(Buffer.from(hexNoPrefix(mlPubKeyEnv), "hex")),
                    spec: config.mlDsaLevel,
                }) : ZERO_ADDRESS;
                break;
            case "ml":
            case "ml-dsa":
                config.deploySignKey = {
                    type: "ml-dsa",
                    secretKey: new Uint8Array(Buffer.from(hexNoPrefix(mlKeyEnv), "hex")),
                    publicKey: new Uint8Array(Buffer.from(hexNoPrefix(mlPubKeyEnv), "hex")),
                    spec: config.mlDsaLevel,
                };
                config.complementaryAddress = ecKeyEnv ? privateKeyToAddress({
                    type: "ec-dsa",
                    key: new Uint8Array(Buffer.from(hexNoPrefix(ecKeyEnv), "hex")),
                }) : ZERO_ADDRESS;
                break;
            default:
                throw new Error("Invalid BLOCKCHAIN_PK_ADMIN_TYPE: " + adminPkType + " | Allowed types: ec, ml-dsa");
        }

        if (config.complementaryAddress && config.complementaryAddress !== ZERO_ADDRESS) {
            config.deployAccountAddress = privateKeyToMixedAddress(config.deploySignKey, config.complementaryAddress);
        } else {
            config.deployAccountAddress = privateKeyToAddress(config.deploySignKey);
        }

        config.logDebug = process.env.LOG_DEBUG === "YES";

        BlockchainConfig.instance = config;

        return config;
    }
    private static instance: BlockchainConfig = null;

    public protocol: "http" | "ws";
    public url: string;

    public provider: RPCProvider;

    public deploySignKey: SignKey;
    public complementaryAddress: string;
    public mlDsaLevel: 44 | 65 | 87;

    public deployAccountAddress: string;

    public logDebug: boolean;

    /**
     * Gets options for transaction sending
     * @param signKey Sign key (defaults to deploy key)
     * @returns The options
     */
    public getTransactionSendingOptions(signKey?: SignKey, complementaryAddress?: string): TransactionSendingOptions {
        return {
            provider: this.provider,
            signKey: signKey || this.deploySignKey,
            complementaryAddress: complementaryAddress !== undefined ? complementaryAddress : this.complementaryAddress,
            logFunction: msg => {
                if (!this.logDebug) {
                    return;
                }
                console.log("[TX] " + msg);
            },
        } as any;
    }

    /**
     * Gets options for RPC
     * @returns The options
     */
    public getRpcOptions(): RPCOptions {
        return {
            provider: this.provider,
        };
    }
}
