// Reserved for license

"use strict";

import { Quantity, RPCProvider, RPC_HTTP_Provider, RPC_WebSocket_Provider, SignKey, hexNoPrefix, privateKeyToAddress } from "@cyberchain/smart-contract-wrapper";

const TIMEOUT_MS = 30000;
import { ZERO_ADDRESS } from "../utils/blockchain";
import { EthereumDIDRegistryWrapper } from "../contracts/ethereum-didregistry";
import { NubemTokenWrapper } from "../contracts/nubem-token";
import { PaymentRouterWrapper } from "../contracts/payment-router";
import { UnifiedVCManagerWrapper } from "../contracts/unified-vcmanager";
import { AgentEventTraceabilityWrapper } from "../contracts/agent-event-traceability";
import { SubscriptionRegistryWrapper } from "../contracts/subscription-registry";
import { CatalogRegistryWrapper } from "../contracts/catalog-registry";
import { OrganizationRegistryWrapper } from "../contracts/organization-registry";

/**
 * Mailer configuration.
 */
export class BlockchainConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): BlockchainConfig {
        if (BlockchainConfig.instance) {
            return BlockchainConfig.instance;
        }

        const config: BlockchainConfig = new BlockchainConfig();

        switch (process.env.BLOCKCHAIN_NODE_PROTOCOL || "http") {
            case "http":
            case "https":
                config.protocol = "http";
                config.url = process.env.BLOCKCHAIN_NODE_RPC_URL || "http://localhost:8545";
                config.provider = new RPC_HTTP_Provider(config.url);
                break;
            case "ws":
                config.protocol = "ws";
                config.url = process.env.BLOCKCHAIN_NODE_RPC_URL || "ws://localhost:8546";
                config.provider = new RPC_WebSocket_Provider(config.url);
                break;
            default:
                throw new Error("Invalid protocol: " + config.protocol + " | Allowed protocols for blockchain connections: http, ws");
        }

        
        config.contracts = {
            ethereumDidRegistry: new EthereumDIDRegistryWrapper(
                process.env.CONTRACT_ETHEREUM_DIDREGISTRY || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            nubemToken: new NubemTokenWrapper(
                process.env.CONTRACT_NUBEM_TOKEN || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            paymentRouter: new PaymentRouterWrapper(
                process.env.CONTRACT_PAYMENT_ROUTER || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            agentEventTraceability: new AgentEventTraceabilityWrapper(
                process.env.CONTRACT_AGENT_EVENT_TRACEABILITY || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            vcManager: new UnifiedVCManagerWrapper(
                process.env.CONTRACT_VC_MANAGER || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            subscriptionRegistry: new SubscriptionRegistryWrapper(
                process.env.CONTRACT_SUBSCRIPTION_REGISTRY || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            catalogRegistry: new CatalogRegistryWrapper(
                process.env.CONTRACT_CATALOG_REGISTRY || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),

            organizationRegistry: new OrganizationRegistryWrapper(
                process.env.CONTRACT_ORGANIZATION_REGISTRY || ZERO_ADDRESS,
                { provider: config.provider, timeout: TIMEOUT_MS },
            ),
        };

        const mlDsaLevel = parseInt(process.env.ML_DSA_LEVEL, 10);

        if ([44, 65, 87].includes(mlDsaLevel)) {
            config.mlDsaLevel = mlDsaLevel as any;
        }

        const adminPkType = process.env.BLOCKCHAIN_PK_ADMIN_TYPE || "ec";
        const adminEcPk = process.env.BLOCKCHAIN_PK_ADMIN_EC || process.env.BLOCKCHAIN_PK_ADMIN || "";

        switch (adminPkType) {
            case "ec":
            case "ec-dsa":
                config.privateKeys.admin = {
                    type: "ec-dsa",
                    key: new Uint8Array(Buffer.from(hexNoPrefix(adminEcPk || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                };
                config.privateKeys.adminComplementaryAddress = process.env.BLOCKCHAIN_PK_ADMIN_ML ? privateKeyToAddress({
                    type: "ml-dsa",
                    secretKey: new Uint8Array(Buffer.from(hexNoPrefix(process.env.BLOCKCHAIN_PK_ADMIN_ML || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                    publicKey: new Uint8Array(Buffer.from(hexNoPrefix(process.env.BLOCKCHAIN_PK_ADMIN_ML_PUB || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                    spec: config.mlDsaLevel,
                }) : ZERO_ADDRESS;
                break;
            case "ml":
            case "ml-dsa":
                config.privateKeys.admin = {
                    type: "ml-dsa",
                    secretKey: new Uint8Array(Buffer.from(hexNoPrefix(process.env.BLOCKCHAIN_PK_ADMIN_ML || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                    publicKey: new Uint8Array(Buffer.from(hexNoPrefix(process.env.BLOCKCHAIN_PK_ADMIN_ML_PUB || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                    spec: config.mlDsaLevel,
                };
                config.privateKeys.adminComplementaryAddress = adminEcPk ? privateKeyToAddress({
                    type: "ec-dsa",
                    key: new Uint8Array(Buffer.from(hexNoPrefix(adminEcPk || "0000000000000000000000000000000000000000000000000000000000000000"), "hex")),
                }) : ZERO_ADDRESS;
                break;
            default:
                throw new Error("Invalid private key type: " + adminPkType + " | Allowed types: ec, ml-dsa");
        }

        config.sync = process.env.BLOCKCHAIN_SYNC === "YES";

        config.firstBlock = BigInt(process.env.BLOCKCHAIN_SYNC_FIRST_BLOCK || 0);

        config.eventSyncRange = parseInt(process.env.BLOCKCHAIN_SYNC_RANGE || "1", 10) || 1;

        config.blockTime = parseInt(process.env.BLOCKCHAIN_SYNC_TIME || "1000", 10) || 1000;

        config.networkId = process.env.BLOCKCHAIN_NETWORK_ID || "1212";

        BlockchainConfig.instance = config;

        return config;
    }

    private static instance: BlockchainConfig = null;

    public mlDsaLevel: 44 | 65 | 87;

    public protocol: "http" | "ws";
    public url: string;

    public provider: RPCProvider;

    public firstBlock: Quantity;

    public sync: boolean;
    public eventSyncRange: number;
    public blockTime: number;

    public contracts: {
        ethereumDidRegistry: EthereumDIDRegistryWrapper;
        nubemToken: NubemTokenWrapper;
        paymentRouter: PaymentRouterWrapper;
        agentEventTraceability: AgentEventTraceabilityWrapper;
        vcManager: UnifiedVCManagerWrapper;
        subscriptionRegistry: SubscriptionRegistryWrapper;
        catalogRegistry: CatalogRegistryWrapper;
        organizationRegistry: OrganizationRegistryWrapper;
    };

    public privateKeys: {
        admin: SignKey,
        adminComplementaryAddress: string;
    };

    public networkId: string;

    constructor() {
        this.protocol = "http";
        this.url = "http://localhost:8545";
        this.provider = null;
        this.contracts = Object.create(null);
        this.privateKeys = Object.create(null);
        this.firstBlock = BigInt(0);
        this.eventSyncRange = 1;
        this.blockTime = 1000;
        this.sync = true;
        this.mlDsaLevel = 44;
    }

    public getMlDsaSize(): { publicKey: number, secretKey: number } {
        switch (this.mlDsaLevel) {
            case 87:
                return {
                    secretKey: 4896,
                    publicKey: 2592,
                };
            case 65:
                return {
                    secretKey: 4032,
                    publicKey: 1952,
                };
            default:
                return {
                    secretKey: 2560,
                    publicKey: 1312,
                };
        }
    }
}
