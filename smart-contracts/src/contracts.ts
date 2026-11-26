// Smart contracts
// Add in this file the smart contracts that need to be deployed
// and also their initialization logic

"use strict";

import { SignKey, TransactionSendingOptions } from "@cyberchain/smart-contract-wrapper";
import { RoleManagerWrapper } from "./contract-wrappers/role-manager";
import { UpgradeControlWrapper } from "./contract-wrappers/upgrade-control";
import { GenericWrapper } from "./utils/proxy";
import { AsyncProvider } from "@asanrom/async-tools";
import { EthereumDIDRegistryWrapper } from "./contract-wrappers/ethereum-didregistry";
import { NubemTokenWrapper } from "./contract-wrappers/nubem-token";
import { PaymentRouterWrapper } from "./contract-wrappers/payment-router";
import { AgentEventTraceabilityWrapper } from "./contract-wrappers/agent-event-traceability";
import { UnifiedVCManagerWrapper } from "./contract-wrappers/unified-vcmanager";
import { CatalogRegistryWrapper } from "./contract-wrappers/catalog-registry";
import { SubscriptionRegistryWrapper } from "./contract-wrappers/subscription-registry";
import { OrganizationRegistryWrapper } from "./contract-wrappers/organization-registry";
import { BlockchainConfig } from "./config/config-blockchain";

/**
 * Object to contain the deployed contracts, as contract wrappers 
 */
export type DeployedContracts = {
    // UpgradeControl
    upgradeControl: UpgradeControlWrapper,

    // RoleManager
    roleManager: RoleManagerWrapper,

    // EthereumDIDRegistry
    ethereumDIDRegistry: EthereumDIDRegistryWrapper,

    // NubemToken
    nubemToken: NubemTokenWrapper,

    // PaymentRouter
    paymentRouter: PaymentRouterWrapper,

    // AgentEventTraceability
    agentEventTraceability: AgentEventTraceabilityWrapper,

    // CatalogRegistry
    catalogRegistry: CatalogRegistryWrapper,

    // SubscriptionRegistry
    subscriptionRegistry: SubscriptionRegistryWrapper,

    // OrganizationRegistry
    organizationRegistry: OrganizationRegistryWrapper,

    // UnifiedVCManager
    vcManager: UnifiedVCManagerWrapper,
};

/**
 * Configuration for smart contracts in order
 * to deploy, initialize and upgrade them
 */
export const SMART_CONTRACTS: DeployedContractsConfig = {
    upgradeControl: {
        contractName: "UpgradeControl",
        wrapper: UpgradeControlWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.upgradeControl.initialize(contracts.roleManager.address, getTxOptions());
        },
    },
    roleManager: {
        contractName: "RoleManager",
        wrapper: RoleManagerWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.roleManager.initialize(contracts.upgradeControl.address, getTxOptions());
        },
    },

    // EthereumDIDRegistry
    ethereumDIDRegistry: {
        contractName: "EthereumDIDRegistry",
        wrapper: EthereumDIDRegistryWrapper,
        notUpgradeable: true,
        initialize: async (contracts, getTxOptions) => {
            await contracts.ethereumDIDRegistry.initialize(getTxOptions());
        },
    },

    // NubemToken
    nubemToken: {
        contractName: "NubemToken",
        wrapper: NubemTokenWrapper,
        notUpgradeable: true,
        initialize: async (contracts, getTxOptions) => {
            await contracts.nubemToken.initialize(getTxOptions());
        },
    },

    // PaymentRouter
    paymentRouter: {
        contractName: "PaymentRouter",
        wrapper: PaymentRouterWrapper,
        notUpgradeable: true,
        initialize: async (contracts, getTxOptions) => {
            await contracts.paymentRouter.initialize(getTxOptions());
        },
    },

    // AgentEventTraceability
    agentEventTraceability: {
        contractName: "AgentEventTraceability",
        wrapper: AgentEventTraceabilityWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.agentEventTraceability.initialize(
                contracts.roleManager.address,
                contracts.upgradeControl.address,
                getTxOptions()
            );
        },
    },

    // CatalogRegistry
    catalogRegistry: {
        contractName: "CatalogRegistry",
        wrapper: CatalogRegistryWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.catalogRegistry.initialize(
                contracts.roleManager.address,
                contracts.upgradeControl.address,
                getTxOptions()
            );
        },
    },

    // SubscriptionRegistry
    subscriptionRegistry: {
        contractName: "SubscriptionRegistry",
        wrapper: SubscriptionRegistryWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.subscriptionRegistry.initialize(
                contracts.roleManager.address,
                contracts.upgradeControl.address,
                getTxOptions()
            );
        },
    },

    // OrganizationRegistry
    organizationRegistry: {
        contractName: "OrganizationRegistry",
        wrapper: OrganizationRegistryWrapper,
        initialize: async (contracts, getTxOptions) => {
            await contracts.organizationRegistry.initialize(
                contracts.roleManager.address,
                contracts.upgradeControl.address,
                getTxOptions()
            );
        },
    },

    // UnifiedVCManager
    vcManager: {
        contractName: "UnifiedVCManager",
        wrapper: UnifiedVCManagerWrapper,
        notUpgradeable: true,
        initialize: async (contracts, getTxOptions) => {
            await contracts.vcManager.initialize(BlockchainConfig.getInstance().deployAccountAddress, getTxOptions());
        },
    },
};


/**
 * Type to include async providers in the deployment phase
 */
export type PendingDeployedContracts = { [K in keyof DeployedContracts]: AsyncProvider<DeployedContracts[K]> };

/**
 * Configuration for a smart contract
 */
export type DeployedContractsConfig = {
    [K in keyof DeployedContracts]: {
        /**
         * The name of the contract
         */
        contractName: string,

        /**
         * The wrapper of the contract
         */
        wrapper: GenericWrapper<DeployedContracts[K]>,

        /**
         * A function to deploy the smart contract (optional)
         * If not provided, a generic function will be used instead
         * @param pendingContracts The pending deploying contracts. You can wait for the values if you contract has a dependency on other contract in the constructor parameters.
         * @param getTxOptions Function you can call to obtain the transaction options, when sending transactions
         * @returns The wrapper of the deployed smart contract
         */
        deploy?: (pendingContracts: PendingDeployedContracts, getTxOptions: (signKey?: SignKey) => TransactionSendingOptions) => Promise<DeployedContracts[K]>,

        /**
         * A function to initialize the smart contract (optional)
         * @param contracts The deployed contracts
         * @param getTxOptions Function you can call to obtain the transaction options, when sending transactions
         */
        initialize?: (contracts: DeployedContracts, getTxOptions: (signKey?: SignKey) => TransactionSendingOptions) => Promise<void>,

        /**
         * True if the smart contract cannot be upgraded (so it is skipped when upgrading)
         */
        notUpgradeable?: boolean,

        /**
         * A function to upgrade the smart contract (optional)
         * If not provided, a generic function will be used instead
         * @param contracts The deployed contracts
         * @param getTxOptions Function you can call to obtain the transaction options, when sending transactions
         */
        upgrade?: (contracts: DeployedContracts, getTxOptions: (signKey?: SignKey) => TransactionSendingOptions) => Promise<void>,

        /**
         * Set it to true in order to skip the contract from the generated documentation
         */
        skipFromDocumentation?: boolean,

        /**
         * Set it to true in order to generate a bytecode file in the backend
         * The bytecode file is necessary to deploy instances of the smart contract in the backend
         */
        generateBytecodeFile?: boolean;
    }
}
