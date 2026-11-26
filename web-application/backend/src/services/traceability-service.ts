"use strict";

import { MethodTransactionOptions } from "@cyberchain/smart-contract-wrapper";
import { BlockchainConfig } from "../config/config-blockchain";
import { Monitor } from "../monitor";
import { ZERO_ADDRESS, normalizeBytes32, validateBytes32 } from "../utils/blockchain";
import { sha256 } from "../utils/hash";
import { CatalogItemStatus } from "../models/catalog-item";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const CATALOG_REGISTRY_STATUS_PUBLISHED = 0;
const CATALOG_REGISTRY_STATUS_WITHDRAWN = 1;

/** ISubscriptionRegistry.SUBSCRIPTION_STATUS */
const SUBSCRIPTION_REGISTRY_STATUS_ACTIVE = 0;
const SUBSCRIPTION_REGISTRY_STATUS_CANCELLED = 1;
const SUBSCRIPTION_REGISTRY_STATUS_SUSPENDED = 2;

/** OrganizationRegistry.MEMBER_ROLE */
const ORG_MEMBER_ROLE_ADMIN = BigInt(0);
const ORG_MEMBER_ROLE_MEMBER = BigInt(1);

export class TraceabilityService {
    private static instance: TraceabilityService | null = null;

    public static getInstance(): TraceabilityService {
        if (TraceabilityService.instance) {
            return TraceabilityService.instance;
        }
        TraceabilityService.instance = new TraceabilityService();
        return TraceabilityService.instance;
    }

    private getAdminTxOptions(): MethodTransactionOptions {
        const config = BlockchainConfig.getInstance();
        return {
            signKey: config.privateKeys.admin,
            complementaryAddress: config.privateKeys.adminComplementaryAddress,
            logFunction: msg => { Monitor.debug(msg); },
        };
    }

    private normalizeOrHashToBytes32(value: string): string {
        const trimmed = (value || "").trim();

        if (!trimmed) {
            return ZERO_BYTES32;
        }

        if (validateBytes32(trimmed)) {
            return normalizeBytes32(trimmed);
        }

        const hexNoPrefix = trimmed.startsWith("0x") || trimmed.startsWith("0X")
            ? trimmed.slice(2)
            : trimmed;

        if ((/^[0-9a-fA-F]{1,64}$/).test(hexNoPrefix)) {
            return normalizeBytes32(`0x${hexNoPrefix.padStart(64, "0")}`);
        }

        return normalizeBytes32(`0x${sha256(trimmed)}`);
    }

    private isPublishedCatalogStatus(status: string): boolean {
        return status === CatalogItemStatus.PUBLISHED;
    }

    public async syncCatalogItemState(
        itemId: string,
        status: string,
        visibility: bigint,
        recordPublishedUpdate = false,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        const chainItemId = this.normalizeOrHashToBytes32(itemId);
        const exists = await contract.itemExists(chainItemId);
        const wantsPublished = this.isPublishedCatalogStatus(status);

        if (!exists) {
            if (wantsPublished) {
                await this.recordCatalogPublished(itemId, visibility);
            } else {
                await this.recordCatalogCreated(itemId, visibility);
            }
            return;
        }

        const onChainItem = await contract.getItem(chainItemId);
        const onChainStatus = Number(onChainItem.status);
        const onChainVisibility = Number(onChainItem.visibility);
        const desiredVisibility = Number(visibility);

        if (wantsPublished) {
            if (onChainStatus !== CATALOG_REGISTRY_STATUS_PUBLISHED || onChainVisibility !== desiredVisibility) {
                await this.recordCatalogPublished(itemId, visibility);
                return;
            }

            if (recordPublishedUpdate) {
                await this.recordCatalogUpdated(itemId, visibility);
            }
            return;
        }

        if (onChainStatus === CATALOG_REGISTRY_STATUS_PUBLISHED) {
            await this.recordCatalogWithdrawn(itemId);
            return;
        }

        if (onChainStatus !== CATALOG_REGISTRY_STATUS_WITHDRAWN) {
            throw new Error(`Unsupported on-chain catalog item status: ${onChainStatus}`);
        }
    }

    async recordCatalogPublished(itemId: string, visibility: bigint): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainItemId = this.normalizeOrHashToBytes32(itemId);
            await contract.publishItem(chainItemId, visibility, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemPublished: ${chainItemId}`);
        } catch (ex) {
            Monitor.debug("CatalogRegistry.publishItem failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record catalog item published: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordCatalogCreated(itemId: string, visibility: bigint): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainItemId = this.normalizeOrHashToBytes32(itemId);
            await contract.createItem(chainItemId, visibility, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemCreated: ${chainItemId}`);
        } catch (ex) {
            Monitor.debug("CatalogRegistry.createItem failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record catalog item creation: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    /**
     * Ensures a catalog item is registered on-chain in Published state.
     * Used for seeded items (e.g. ITAAS Platform) that exist in DB but were never created via admin API.
     * @param itemId - Catalog item identifier
     * @param visibility - On-chain visibility flag (0 = public, 1 = hidden)
     */
    async ensureCatalogItemOnChain(itemId: string, visibility: bigint): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        const chainItemId = this.normalizeOrHashToBytes32(itemId);
        const exists = await contract.itemExists(chainItemId);

        if (!exists) {
            await contract.publishItem(chainItemId, visibility, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemPublished (on-chain bootstrap): ${chainItemId}`);
            return;
        }

        const onChainItem = await contract.getItem(chainItemId);
        if (Number(onChainItem.status) !== CATALOG_REGISTRY_STATUS_PUBLISHED) {
            await contract.publishItem(chainItemId, visibility, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemPublished (re-publish): ${chainItemId}`);
        }
    }

    async recordCatalogUpdated(itemId: string, visibility: bigint = BigInt(0)): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainItemId = this.normalizeOrHashToBytes32(itemId);
            await this.ensureCatalogItemOnChain(itemId, visibility);
            await contract.updateItem(chainItemId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemUpdated: ${chainItemId}`);
        } catch (ex) {
            Monitor.debug("CatalogRegistry.updateItem failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record catalog item updated: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordCatalogWithdrawn(itemId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainItemId = this.normalizeOrHashToBytes32(itemId);
            await contract.withdrawItem(chainItemId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemWithdrawn: ${chainItemId}`);
        } catch (ex) {
            Monitor.debug("CatalogRegistry.withdrawItem failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record catalog item withdrawn: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordCatalogDeleted(itemId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("CatalogRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainItemId = this.normalizeOrHashToBytes32(itemId);
            await contract.deleteItem(chainItemId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] CatalogItemDeleted: ${chainItemId}`);
        } catch (ex) {
            Monitor.debug("CatalogRegistry.deleteItem failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record catalog item deletion: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionCreated(subscriptionId: string, subscriberId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const txOptions = this.getAdminTxOptions();
            const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
            const chainSubscriberId = this.normalizeOrHashToBytes32(subscriberId);
            await contract.createSubscription(chainSubscriptionId, chainSubscriberId, txOptions);
            Monitor.debug(`[Traceability] SubscriptionCreated: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.createSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to create subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionRenewed(subscriptionId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const txOptions = this.getAdminTxOptions();
            const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
            await contract.renewSubscription(chainSubscriptionId, txOptions);
            Monitor.debug(`[Traceability] SubscriptionRenewed: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.renewSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to renew subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionChanged(subscriptionId: string, subscriberId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }
        try {
            const txOptions = this.getAdminTxOptions();
            const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
            const chainSubscriberId = this.normalizeOrHashToBytes32(subscriberId);
            await contract.changeSubscription(chainSubscriptionId, chainSubscriberId, txOptions);
            Monitor.debug(`[Traceability] SubscriptionChanged: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.changeSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to change subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionCancelled(subscriptionId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
        const onChain = await this.getOnChainSubscriptionStatus(subscriptionId);

        if (!onChain.exists) {
            Monitor.debug(`[Traceability] SubscriptionCancelled skipped (not on-chain): ${chainSubscriptionId}`);
            return;
        }

        if (onChain.status === SUBSCRIPTION_REGISTRY_STATUS_CANCELLED) {
            Monitor.debug(`[Traceability] SubscriptionCancelled skipped (already cancelled): ${chainSubscriptionId}`);
            return;
        }

        if (
            onChain.status !== SUBSCRIPTION_REGISTRY_STATUS_ACTIVE
            && onChain.status !== SUBSCRIPTION_REGISTRY_STATUS_SUSPENDED
        ) {
            Monitor.debug(
                `[Traceability] SubscriptionCancelled skipped (unsupported on-chain status ${onChain.status}): ${chainSubscriptionId}`,
            );
            return;
        }

        try {
            await contract.cancelSubscription(chainSubscriptionId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] SubscriptionCancelled: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.cancelSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to cancel subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    private async getOnChainSubscriptionStatus(
        subscriptionId: string,
    ): Promise<{ exists: boolean; status: number }> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
        const onChain = await contract.getSubscription(chainSubscriptionId);
        return {
            exists: Boolean(onChain.exists),
            status: Number(onChain.status),
        };
    }

    async recordSubscriptionSuspended(subscriptionId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
        const onChain = await this.getOnChainSubscriptionStatus(subscriptionId);

        if (!onChain.exists) {
            Monitor.debug(`[Traceability] SubscriptionSuspended skipped (not on-chain): ${chainSubscriptionId}`);
            return;
        }

        if (onChain.status === SUBSCRIPTION_REGISTRY_STATUS_SUSPENDED) {
            Monitor.debug(`[Traceability] SubscriptionSuspended skipped (already suspended): ${chainSubscriptionId}`);
            return;
        }

        if (onChain.status !== SUBSCRIPTION_REGISTRY_STATUS_ACTIVE) {
            Monitor.debug(
                `[Traceability] SubscriptionSuspended skipped (unsupported on-chain status ${onChain.status}): ${chainSubscriptionId}`,
            );
            return;
        }

        try {
            await contract.suspendSubscription(chainSubscriptionId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] SubscriptionSuspended: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.suspendSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to suspend subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionReactivated(subscriptionId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        const chainSubscriptionId = this.normalizeOrHashToBytes32(subscriptionId);
        const onChain = await this.getOnChainSubscriptionStatus(subscriptionId);

        if (!onChain.exists) {
            Monitor.debug(`[Traceability] SubscriptionReactivated skipped (not on-chain): ${chainSubscriptionId}`);
            return;
        }

        if (onChain.status === SUBSCRIPTION_REGISTRY_STATUS_ACTIVE) {
            Monitor.debug(`[Traceability] SubscriptionReactivated skipped (already active): ${chainSubscriptionId}`);
            return;
        }

        if (onChain.status !== SUBSCRIPTION_REGISTRY_STATUS_SUSPENDED) {
            Monitor.debug(
                `[Traceability] SubscriptionReactivated skipped (unsupported on-chain status ${onChain.status}): ${chainSubscriptionId}`,
            );
            return;
        }

        try {
            await contract.reactivateSubscription(chainSubscriptionId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] SubscriptionReactivated: ${chainSubscriptionId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.reactivateSubscription failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to reactivate subscription: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordSubscriptionSuspendedBestEffort(subscriptionId: string): Promise<void> {
        try {
            await this.recordSubscriptionSuspended(subscriptionId);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    async recordSubscriptionCancelledBestEffort(subscriptionId: string): Promise<void> {
        try {
            await this.recordSubscriptionCancelled(subscriptionId);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    async recordSubscriptionReactivatedBestEffort(subscriptionId: string): Promise<void> {
        try {
            await this.recordSubscriptionReactivated(subscriptionId);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    async recordOrganizationRegistered(organizationId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainOrganizationId = this.normalizeOrHashToBytes32(organizationId);
            await contract.registerOrganization(chainOrganizationId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] OrganizationRegistered: ${chainOrganizationId}`);
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.registerOrganization failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record organization registered: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordOrganizationDeactivated(organizationId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainOrganizationId = this.normalizeOrHashToBytes32(organizationId);
            await contract.deactivateOrganization(chainOrganizationId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] OrganizationDeactivated: ${chainOrganizationId}`);
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.deactivateOrganization failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record organization deactivated: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordOrganizationReactivated(organizationId: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            const chainOrganizationId = this.normalizeOrHashToBytes32(organizationId);
            await contract.reactivateOrganization(chainOrganizationId, this.getAdminTxOptions());
            Monitor.debug(`[Traceability] OrganizationReactivated: ${chainOrganizationId}`);
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.reactivateOrganization failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record organization reactivated: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordMemberAdded(
        organizationId: string,
        membershipId: string,
        userId: string,
        role: bigint,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.addMember(
                this.normalizeOrHashToBytes32(organizationId),
                this.normalizeOrHashToBytes32(membershipId),
                this.normalizeOrHashToBytes32(userId),
                role,
                this.getAdminTxOptions(),
            );
            Monitor.debug(`[Traceability] MemberAdded: org=${organizationId} membership=${membershipId}`);
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.addMember failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record member added: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordMemberReactivated(
        membershipId: string,
        role: bigint,
        organizationId?: string,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.reactivateMember(
                this.normalizeOrHashToBytes32(membershipId),
                role,
                this.getAdminTxOptions(),
            );
            Monitor.debug(
                `[Traceability] MemberReactivated: org=${organizationId || "?"} membership=${membershipId}`,
            );
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.reactivateMember failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record member reactivated: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordMemberRemoved(membershipId: string, organizationId?: string): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.removeMember(
                this.normalizeOrHashToBytes32(membershipId),
                this.getAdminTxOptions(),
            );
            Monitor.debug(
                `[Traceability] MemberRemoved: org=${organizationId || "?"} membership=${membershipId}`,
            );
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.removeMember failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record member removed: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordMemberRoleChanged(
        membershipId: string,
        role: bigint,
        organizationId?: string,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("OrganizationRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.changeMemberRole(
                this.normalizeOrHashToBytes32(membershipId),
                role,
                this.getAdminTxOptions(),
            );
            Monitor.debug(
                `[Traceability] MemberRoleChanged: org=${organizationId || "?"} membership=${membershipId}`,
            );
        } catch (ex) {
            Monitor.debug("OrganizationRegistry.changeMemberRole failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record member role changed: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    /** Maps off-chain organization membership role to on-chain MEMBER_ROLE enum. */
    public mapOrganizationMembershipRole(isAdmin: boolean): bigint {
        return isAdmin ? ORG_MEMBER_ROLE_ADMIN : ORG_MEMBER_ROLE_MEMBER;
    }

    async recordLicenseAssigned(
        licenseId: string,
        subscriptionId: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.assignLicense(
                this.normalizeOrHashToBytes32(licenseId),
                this.normalizeOrHashToBytes32(subscriptionId),
                this.normalizeOrHashToBytes32(organizationId),
                this.normalizeOrHashToBytes32(userId),
                this.getAdminTxOptions(),
            );
            Monitor.debug(`[Traceability] LicenseAssigned: ${licenseId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.assignLicense failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record license assigned: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordLicenseRevoked(
        licenseId: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.revokeLicense(
                this.normalizeOrHashToBytes32(licenseId),
                this.normalizeOrHashToBytes32(organizationId),
                this.normalizeOrHashToBytes32(userId),
                this.getAdminTxOptions(),
            );
            Monitor.debug(`[Traceability] LicenseRevoked: ${licenseId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.revokeLicense failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record license revoked: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordLicenseReactivated(
        licenseId: string,
        subscriptionId: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            throw new Error("SubscriptionRegistry contract address is ZERO_ADDRESS");
        }

        try {
            await contract.reactivateLicense(
                this.normalizeOrHashToBytes32(licenseId),
                this.normalizeOrHashToBytes32(subscriptionId),
                this.normalizeOrHashToBytes32(organizationId),
                this.normalizeOrHashToBytes32(userId),
                this.getAdminTxOptions(),
            );
            Monitor.debug(`[Traceability] LicenseReactivated: ${licenseId}`);
        } catch (ex) {
            Monitor.debug("SubscriptionRegistry.reactivateLicense failed: " + (ex instanceof Error ? ex.message : ex));
            throw new Error("Failed to record license reactivated: " + (ex instanceof Error ? ex.message : ex));
        }
    }

    async recordLicenseRevokedBestEffort(
        licenseId: string,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        try {
            await this.recordLicenseRevoked(licenseId, organizationId, userId);
        } catch (ex) {
            Monitor.error(
                "[Traceability] Best-effort license revoke failed: "
                + `licenseId=${licenseId} organizationId=${organizationId} userId=${userId} `
                + (ex instanceof Error ? ex.message : ex),
            );
        }
    }
}
