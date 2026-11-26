// SubscriptionRegistry authorization tests

"use strict";

import assert from "assert";
import { SmartContractInterface } from "@cyberchain/smart-contract-wrapper";
import { DeployedContracts } from "../contracts";
import { SubscriptionRegistryWrapper } from "../contract-wrappers/subscription-registry";
import { assertEvent } from "../utils/assert-event";
import { randomBytes32 } from "../utils/blockchain";
import { runTest, runTestCase } from "../utils/test-utils";
import { TestWallet } from "../utils/test-wallet";

const SUBSCRIPTION_STATUS_ACTIVE = BigInt(0);
const SUBSCRIPTION_STATUS_CANCELLED = BigInt(1);
const SUBSCRIPTION_STATUS_SUSPENDED = BigInt(2);

export async function testSubscriptionRegistry(contracts: DeployedContracts) {
    const adminWallet = TestWallet.deployer();
    const nonAdminWallet = TestWallet.random();
    const registry = contracts.subscriptionRegistry;
    const contractInterface = new SmartContractInterface(registry.address, SubscriptionRegistryWrapper.abi(), adminWallet.getTxOptions());
    const subscriptionId = randomBytes32();
    const changedSubscriptionId = randomBytes32();
    const subscriberId = randomBytes32();

    await runTest("SubscriptionRegistry authorization", async () => {
        assert.equal(await contracts.roleManager.isAdmin(adminWallet.address), true);
        assert.equal(await contracts.roleManager.isAdmin(nonAdminWallet.address), false);

        async function checkMutation(
            name: string,
            id: string,
            args: string[],
            eventName: string,
            expectedStatus: bigint,
            parameters: string[] = [id],
        ) {
            await runTestCase(`${name} rejects non-admin calls and allows admin transactions`, async () => {
                const before = await registry.getSubscription(id);

                // Check contract authorization independently of Cyberchain's transaction permissions.
                await assert.rejects(
                    () => contractInterface.callViewMethod(name, args, { from: nonAdminWallet.address }),
                    /Must be ADMIN/,
                );
                assert.deepStrictEqual(await registry.getSubscription(id), before);

                // Leave gas headroom for proxied calls on the test node.
                const result = await contractInterface.callMutableMethod(name, args, {
                    ...adminWallet.getTxOptions(),
                    gasLimit: 1000000,
                });
                assertEvent(result, {
                    contract: registry.address,
                    abi: SubscriptionRegistryWrapper.abi(),
                    eventName,
                    parameters,
                });

                const subscription = await registry.getSubscription(id);
                assert.equal(subscription.exists, true);
                assert.equal(subscription.subscriberId.toLowerCase(), subscriberId.toLowerCase());
                assert.equal(subscription.status, expectedStatus);
            });
        }

        await checkMutation(
            "createSubscription", subscriptionId, [subscriptionId, subscriberId],
            "SubscriptionCreated", SUBSCRIPTION_STATUS_ACTIVE, [subscriptionId, subscriberId],
        );

        await checkMutation(
            "changeSubscription", changedSubscriptionId, [changedSubscriptionId, subscriberId],
            "SubscriptionChanged", SUBSCRIPTION_STATUS_ACTIVE,
        );

        await checkMutation(
            "renewSubscription", subscriptionId, [subscriptionId],
            "SubscriptionRenewed", SUBSCRIPTION_STATUS_ACTIVE,
        );

        await checkMutation(
            "suspendSubscription", subscriptionId, [subscriptionId],
            "SubscriptionSuspended", SUBSCRIPTION_STATUS_SUSPENDED,
        );

        await checkMutation(
            "reactivateSubscription", subscriptionId, [subscriptionId],
            "SubscriptionReactivated", SUBSCRIPTION_STATUS_ACTIVE,
        );

        await checkMutation(
            "cancelSubscription", subscriptionId, [subscriptionId],
            "SubscriptionCancelled", SUBSCRIPTION_STATUS_CANCELLED,
        );
    });
}
