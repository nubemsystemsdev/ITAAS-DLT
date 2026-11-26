// OrganizationRegistry and SubscriptionRegistry license tests

"use strict";

import assert from "assert";
import { DeployedContracts } from "../contracts";
import { OrganizationRegistryWrapper } from "../contract-wrappers/organization-registry";
import { SubscriptionRegistryWrapper } from "../contract-wrappers/subscription-registry";
import { assertEvent } from "../utils/assert-event";
import { assertRevert } from "../utils/test-utils";
import { runTest, runTestCase } from "../utils/test-utils";
import { TestWallet } from "../utils/test-wallet";

const ORG_ID = "0x0000000000000000000000000000000000000000000000000000000000000001";
const ADMIN_MEMBERSHIP_ID = "0x0000000000000000000000000000000000000000000000000000000000000002";
const MEMBER_MEMBERSHIP_ID = "0x0000000000000000000000000000000000000000000000000000000000000003";
const ADMIN_USER_ID = "0x0000000000000000000000000000000000000000000000000000000000000004";
const MEMBER_USER_ID = "0x0000000000000000000000000000000000000000000000000000000000000005";
const SUBSCRIPTION_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";
const SUBSCRIBER_ID = "0x0000000000000000000000000000000000000000000000000000000000000007";
const LICENSE_ID = "0x0000000000000000000000000000000000000000000000000000000000000008";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

const MEMBER_ROLE_ADMIN = 0;
const MEMBER_ROLE_MEMBER = 1;
const MEMBER_STATUS_ACTIVE = 0;
const MEMBER_STATUS_INACTIVE = 1;
const ORG_STATUS_ACTIVE = 0;
const ORG_STATUS_DEACTIVATED = 1;
const LICENSE_STATUS_ACTIVE = 0;
const LICENSE_STATUS_REVOKED = 1;
const SUBSCRIPTION_STATUS_ACTIVE = 0;
const SUBSCRIPTION_STATUS_SUSPENDED = 2;

export async function testOrganizationRegistry(contracts: DeployedContracts) {
    const deployerWallet = TestWallet.deployer();
    const orgRegistry = contracts.organizationRegistry;
    const subscriptionRegistry = contracts.subscriptionRegistry;

    await runTest("OrganizationRegistry", async () => {
        await runTestCase("registerOrganization + addMember admin", async () => {
            const registerResult = await orgRegistry.registerOrganization(ORG_ID, deployerWallet.getTxOptions());
            assertEvent(registerResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "OrganizationRegistered",
                parameters: [ORG_ID],
            });

            const addResult = await orgRegistry.addMember(
                ORG_ID,
                ADMIN_MEMBERSHIP_ID,
                ADMIN_USER_ID,
                MEMBER_ROLE_ADMIN,
                deployerWallet.getTxOptions(),
            );
            assertEvent(addResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "MemberAdded",
                parameters: [ORG_ID, ADMIN_MEMBERSHIP_ID, ADMIN_USER_ID, MEMBER_ROLE_ADMIN],
            });

            assert.equal(await orgRegistry.isOrgAdmin(ORG_ID, ADMIN_USER_ID), true);

            const membership = await orgRegistry.getMembership(ADMIN_MEMBERSHIP_ID);
            assert.equal(membership.status, BigInt(MEMBER_STATUS_ACTIVE));
            assert.equal(membership.role, BigInt(MEMBER_ROLE_ADMIN));
        });

        await runTestCase("addMember member + removeMember", async () => {
            await orgRegistry.addMember(
                ORG_ID,
                MEMBER_MEMBERSHIP_ID,
                MEMBER_USER_ID,
                MEMBER_ROLE_MEMBER,
                deployerWallet.getTxOptions(),
            );

            const removeResult = await orgRegistry.removeMember(MEMBER_MEMBERSHIP_ID, deployerWallet.getTxOptions());
            assertEvent(removeResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "MemberRemoved",
                parameters: [ORG_ID, MEMBER_MEMBERSHIP_ID, MEMBER_USER_ID],
            });

            const membership = await orgRegistry.getMembership(MEMBER_MEMBERSHIP_ID);
            assert.equal(membership.status, BigInt(MEMBER_STATUS_INACTIVE));
        });

        await runTestCase("removeMember + reactivateMember", async () => {
            const reactivateResult = await orgRegistry.reactivateMember(
                MEMBER_MEMBERSHIP_ID,
                MEMBER_ROLE_MEMBER,
                deployerWallet.getTxOptions(),
            );
            assertEvent(reactivateResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "MemberReactivated",
                parameters: [ORG_ID, MEMBER_MEMBERSHIP_ID, MEMBER_USER_ID, MEMBER_ROLE_MEMBER],
            });

            const membership = await orgRegistry.getMembership(MEMBER_MEMBERSHIP_ID);
            assert.equal(membership.status, BigInt(MEMBER_STATUS_ACTIVE));
        });

        await runTestCase("addMember fails for duplicated membershipId", async () => {
            await assertRevert(
                orgRegistry.addMember(
                    ORG_ID,
                    MEMBER_MEMBERSHIP_ID,
                    MEMBER_USER_ID,
                    MEMBER_ROLE_MEMBER,
                    deployerWallet.getTxOptions(),
                ),
                "Expected duplicated membershipId revert",
            );
        });

        await runTestCase("addMember fails when user already has active membership", async () => {
            const duplicateMembershipId = "0x000000000000000000000000000000000000000000000000000000000000000a";
            await assertRevert(
                orgRegistry.addMember(
                    ORG_ID,
                    duplicateMembershipId,
                    MEMBER_USER_ID,
                    MEMBER_ROLE_MEMBER,
                    deployerWallet.getTxOptions(),
                ),
                "Expected active membership exists for user revert",
            );
        });

        await runTestCase("removeMember clears org-user index and allows reactivation", async () => {
            await orgRegistry.removeMember(MEMBER_MEMBERSHIP_ID, deployerWallet.getTxOptions());
            assert.equal(await orgRegistry.isOrgAdmin(ORG_ID, MEMBER_USER_ID), false);

            const reactivateResult = await orgRegistry.reactivateMember(
                MEMBER_MEMBERSHIP_ID,
                MEMBER_ROLE_MEMBER,
                deployerWallet.getTxOptions(),
            );
            assertEvent(reactivateResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "MemberReactivated",
                parameters: [ORG_ID, MEMBER_MEMBERSHIP_ID, MEMBER_USER_ID, MEMBER_ROLE_MEMBER],
            });
        });

        await runTestCase("reactivateMember fails when membership is already active", async () => {
            await assertRevert(
                orgRegistry.reactivateMember(
                    MEMBER_MEMBERSHIP_ID,
                    MEMBER_ROLE_MEMBER,
                    deployerWallet.getTxOptions(),
                ),
                "Expected active membership revert on reactivate",
            );
        });

        await runTestCase("changeMemberRole ADMIN to MEMBER", async () => {
            const changeResult = await orgRegistry.changeMemberRole(
                ADMIN_MEMBERSHIP_ID,
                MEMBER_ROLE_MEMBER,
                deployerWallet.getTxOptions(),
            );
            assertEvent(changeResult, {
                contract: orgRegistry.address,
                abi: OrganizationRegistryWrapper.abi(),
                eventName: "MemberRoleChanged",
                parameters: [ORG_ID, ADMIN_MEMBERSHIP_ID, ADMIN_USER_ID, MEMBER_ROLE_MEMBER],
            });

            assert.equal(await orgRegistry.isOrgAdmin(ORG_ID, ADMIN_USER_ID), false);

            await orgRegistry.changeMemberRole(
                ADMIN_MEMBERSHIP_ID,
                MEMBER_ROLE_ADMIN,
                deployerWallet.getTxOptions(),
            );
        });

        await runTestCase("deactivateOrganization + reactivateOrganization", async () => {
            await orgRegistry.deactivateOrganization(ORG_ID, deployerWallet.getTxOptions());
            let org = await orgRegistry.getOrganization(ORG_ID);
            assert.equal(org.status, BigInt(ORG_STATUS_DEACTIVATED));

            await orgRegistry.reactivateOrganization(ORG_ID, deployerWallet.getTxOptions());
            org = await orgRegistry.getOrganization(ORG_ID);
            assert.equal(org.status, BigInt(ORG_STATUS_ACTIVE));
        });
    });

    await runTest("SubscriptionRegistry licenses", async () => {
        await runTestCase("createSubscription + assignLicense with organizationId and userId", async () => {
            await subscriptionRegistry.createSubscription(
                SUBSCRIPTION_ID,
                SUBSCRIBER_ID,
                deployerWallet.getTxOptions(),
            );

            const assignResult = await subscriptionRegistry.assignLicense(
                LICENSE_ID,
                SUBSCRIPTION_ID,
                ORG_ID,
                MEMBER_USER_ID,
                deployerWallet.getTxOptions(),
            );
            assertEvent(assignResult, {
                contract: subscriptionRegistry.address,
                abi: SubscriptionRegistryWrapper.abi(),
                eventName: "LicenseAssigned",
                parameters: [LICENSE_ID, SUBSCRIPTION_ID, ORG_ID, MEMBER_USER_ID],
            });

            const license = await subscriptionRegistry.getLicense(LICENSE_ID);
            assert.equal(license.status, BigInt(LICENSE_STATUS_ACTIVE));
        });

        await runTestCase("suspendSubscription + reactivateSubscription", async () => {
            const suspendResult = await subscriptionRegistry.suspendSubscription(
                SUBSCRIPTION_ID,
                deployerWallet.getTxOptions(),
            );
            assertEvent(suspendResult, {
                contract: subscriptionRegistry.address,
                abi: SubscriptionRegistryWrapper.abi(),
                eventName: "SubscriptionSuspended",
                parameters: [SUBSCRIPTION_ID],
            });

            let subscription = await subscriptionRegistry.getSubscription(SUBSCRIPTION_ID);
            assert.equal(subscription.status, BigInt(SUBSCRIPTION_STATUS_SUSPENDED));

            const reactivateResult = await subscriptionRegistry.reactivateSubscription(
                SUBSCRIPTION_ID,
                deployerWallet.getTxOptions(),
            );
            assertEvent(reactivateResult, {
                contract: subscriptionRegistry.address,
                abi: SubscriptionRegistryWrapper.abi(),
                eventName: "SubscriptionReactivated",
                parameters: [SUBSCRIPTION_ID],
            });

            subscription = await subscriptionRegistry.getSubscription(SUBSCRIPTION_ID);
            assert.equal(subscription.status, BigInt(SUBSCRIPTION_STATUS_ACTIVE));
        });

        await runTestCase("revokeLicense + reactivateLicense", async () => {
            const revokeResult = await subscriptionRegistry.revokeLicense(
                LICENSE_ID,
                ORG_ID,
                MEMBER_USER_ID,
                deployerWallet.getTxOptions(),
            );
            assertEvent(revokeResult, {
                contract: subscriptionRegistry.address,
                abi: SubscriptionRegistryWrapper.abi(),
                eventName: "LicenseRevoked",
                parameters: [LICENSE_ID, ORG_ID, MEMBER_USER_ID],
            });

            let license = await subscriptionRegistry.getLicense(LICENSE_ID);
            assert.equal(license.status, BigInt(LICENSE_STATUS_REVOKED));

            await subscriptionRegistry.reactivateLicense(
                LICENSE_ID,
                SUBSCRIPTION_ID,
                ORG_ID,
                MEMBER_USER_ID,
                deployerWallet.getTxOptions(),
            );

            license = await subscriptionRegistry.getLicense(LICENSE_ID);
            assert.equal(license.status, BigInt(LICENSE_STATUS_ACTIVE));
        });

        await runTestCase("assignLicense with zero organizationId for personal subscription", async () => {
            const personalLicenseId = "0x0000000000000000000000000000000000000000000000000000000000000009";
            const assignResult = await subscriptionRegistry.assignLicense(
                personalLicenseId,
                SUBSCRIPTION_ID,
                ZERO_BYTES32,
                SUBSCRIBER_ID,
                deployerWallet.getTxOptions(),
            );
            assertEvent(assignResult, {
                contract: subscriptionRegistry.address,
                abi: SubscriptionRegistryWrapper.abi(),
                eventName: "LicenseAssigned",
                parameters: [personalLicenseId, SUBSCRIPTION_ID, ZERO_BYTES32, SUBSCRIBER_ID],
            });
        });
    });
}
