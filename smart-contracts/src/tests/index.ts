// Entry point of the tests

"use strict";

import { BlockchainConfig } from "../config/config-blockchain";
import { deploySmartContracts } from "../contract-deployment";
import { markPassed } from "../utils/test-utils";
import { testSubscriptionRegistry } from "./test-subscription-registry";
import { testUpgradeSmartContract } from "./test-upgrade";

/**
 * Run the tests
 */
export async function runContractTests() {
    BlockchainConfig.IS_TEST = true;

    // Deploy smart contracts
    const contracts = await deploySmartContracts();

    markPassed("Contracts deployed" + "\n");

    // Run tests

    await testUpgradeSmartContract(contracts);
    await testSubscriptionRegistry(contracts);


    // Finalize

    markPassed("All tests passed");
}
