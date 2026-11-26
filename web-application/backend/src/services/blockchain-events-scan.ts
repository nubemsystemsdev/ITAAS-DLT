// Blockchain event scanner

"use strict";

import { createHash } from "node:crypto";
import { AsyncInterval } from "@asanrom/async-tools";
import { Quantity, SmartContractEvent, Web3RPCClient } from "@cyberchain/smart-contract-wrapper";
import { Config } from "../config/config";
import { BlockchainConfig } from "../config/config-blockchain";
import { DynamicConfiguration } from "../models/dynconf";
import { Monitor } from "../monitor";
import { Subscription } from "../models/subscription";
import { Organization } from "../models/organization";
import { OrganizationLicenseAssignment } from "../models/organization-license-assignment";
import { TraceabilityDomain, TraceabilityEvent, TraceabilityEventType, TraceabilityStatus } from "../models/traceability-event";
import { Wallet } from "../models/wallet";
import { User } from "../models/users/user";
import { VerifiableCredential } from "../models/verifiable-credential";
import { ZERO_ADDRESS, normalizeBytes32, validateBytes32 } from "../utils/blockchain";
import { createRandomUID } from "../utils/text-utils";
import { DataFilter, OrderBy } from "tsbean-orm";
import { TokenTraceability, TokenTraceabilityActionKind, TokenTraceabilityStatus } from "../models/token-traceability";

export const DYN_CONF_CURRENT_BLOCK = "event_sync_current_block";

/**
 * Extracts the on-chain correlation suffix from a Nubem deposit details string.
 * For `nubem:earn:*` this is the internal payment id; for `nubem:subscription:*`
 * it is the Stripe subscription id used in the earn operation id.
 * @param details On-chain deposit details payload
 * @returns Correlation suffix or empty string
 */
export function extractPaymentIdFromDepositDetails(details: string): string {
    if (!details) {
        return "";
    }

    if (details.startsWith("nubem:earn:")) {
        return (details.slice("nubem:earn:".length) || "").trim();
    }

    if (details.startsWith("nubem:subscription:")) {
        return (details.slice("nubem:subscription:".length) || "").trim();
    }

    return "";
}

/**
 * Maps on-chain deposit details to the token traceability operation id.
 * @param details On-chain deposit details payload
 * @returns Operation id or empty string
 */
export function earnOperationIdFromDepositDetails(details: string): string {
    const correlationId = extractPaymentIdFromDepositDetails(details);
    if (!correlationId) {
        return "";
    }

    if (details.startsWith("nubem:earn:")) {
        return `earn:${correlationId}`;
    }

    if (details.startsWith("nubem:subscription:")) {
        return `earn:subscription:${correlationId}`;
    }

    return "";
}

export class BlockchainEventsScanner {
    public static instance: BlockchainEventsScanner | null = null;

    public static getInstance(): BlockchainEventsScanner {
        if (BlockchainEventsScanner.instance) {
            return BlockchainEventsScanner.instance;
        } else {
            BlockchainEventsScanner.instance = new BlockchainEventsScanner();
            return BlockchainEventsScanner.instance;
        }
    }

    public currentBlock: Quantity;
    public maxRange: number;

    private interval: AsyncInterval | null = null;

    constructor() {
        this.currentBlock = BlockchainConfig.getInstance().firstBlock;
        this.maxRange = BlockchainConfig.getInstance().eventSyncRange;
    }

    public async reset() {
        await DynamicConfiguration.setConfiguration(DYN_CONF_CURRENT_BLOCK, "");
    }

    public async start() {
        const currentBlock = await DynamicConfiguration.getStringConfiguration(DYN_CONF_CURRENT_BLOCK, "");

        if (currentBlock) {
            const blockQ = BigInt(currentBlock);
            if (blockQ > this.currentBlock) {
                this.currentBlock = blockQ;
            }
        }

        this.interval = new AsyncInterval(this.scan.bind(this), BlockchainConfig.getInstance().blockTime);
        this.interval.on("error", err => {
            Monitor.exception(err);
            Monitor.error("Error syncing the blockchain");
        });
        this.interval.start(true);
    }

    private async storeCurrentBlock() {
        const currentBlockHex = "0x" + this.currentBlock.toString(16);
        await DynamicConfiguration.setConfiguration(DYN_CONF_CURRENT_BLOCK, currentBlockHex);
    }

    private async scan() {
        const lastBlock = await Web3RPCClient.getInstance().getBlockByNumber("latest", { provider: BlockchainConfig.getInstance().provider });
        if (lastBlock?.number === null) {
            Monitor.info("[EVENTS SYNC] Latest block is not available yet. Skipping this cycle.");
            return;
        }
        const lastBlockNumber = lastBlock.number;

        if (this.currentBlock >= lastBlockNumber) {
            return; // Nothing to sync
        }

        while (this.currentBlock < lastBlockNumber) {
            const rangeStart = this.currentBlock + BigInt(1);
            let rangeEnd = rangeStart + BigInt(this.maxRange);

            if (rangeEnd > lastBlockNumber) {
                rangeEnd = lastBlockNumber;
            }

            // Add scanning methods below this line
            
            // await this.scanEventsExampleContract(rangeStart, rangeEnd);
            await this.scanVCManagerContractEvents(rangeStart, rangeEnd);
            await this.scanNubemTokenContractEvents(rangeStart, rangeEnd);
            await this.scanCatalogRegistryContractEvents(rangeStart, rangeEnd);
            await this.scanSubscriptionRegistryContractEvents(rangeStart, rangeEnd);
            await this.scanOrganizationRegistryContractEvents(rangeStart, rangeEnd);

            this.currentBlock = rangeEnd;
            await this.storeCurrentBlock();
            Monitor.debug("[EVENTS SYNC] Sync block event / Block: 0x" + this.currentBlock.toString(16));
        }
    }


    public async scanVCManagerContractEvents(fromBlock: bigint, toBlock: bigint) {
        const events = await BlockchainConfig.getInstance().contracts.vcManager.findEvents(fromBlock, toBlock);

        this.logEvents(events.events);

        for (let i = 0; i < events.length(); i++) {
            const eventType = events.getEventType(i);
            switch (eventType) {
                case "CredentialIssued":
                    {
                        const ev = events.getCredentialIssuedEvent(i);
                        const timestamp = await this.getBlockTimestamp(ev.event.log.blockNumber);
                        const tx = ev.event.log.transactionHash.toString('hex');

                        // Log VC issuance event
                        Monitor.debug(`VC Issued: CredentialID=${ev.data.credentialId}, Owner=${ev.data.owner}, Issuer=${ev.data.admin}, Tx=${tx}, Timestamp=${new Date(timestamp).toISOString()}`);
                    }
                    break;
                case "CredentialRevoked":
                    {
                        const ev = events.getCredentialRevokedEvent(i);
                        const timestamp = await this.getBlockTimestamp(ev.event.log.blockNumber);
                        const tx = ev.event.log.transactionHash.toString('hex');

                        // Find and update VC revocation in database
                        const credentialIdHex = ev.data.credentialId;
                        const credentialId = Number(BigInt(credentialIdHex));
                        const vc = await VerifiableCredential.findByCredentialId(credentialId);
                        if (vc) {
                            vc.isRevoked = true;
                            vc.revokedAt = timestamp;
                            await vc.save();
                            Monitor.debug(`VC Revoked: CredentialID=${credentialId}, Revoker=${ev.data.admin}, Tx=${tx}, Timestamp=${new Date(timestamp).toISOString()}`);
                        } else {
                            Monitor.warning(`VC Revoked event received for unknown credential: ${credentialIdHex}`);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    }

    public async scanNubemTokenContractEvents(fromBlock: bigint, toBlock: bigint) {
        const events = await BlockchainConfig.getInstance().contracts.nubemToken.findEvents(fromBlock, toBlock);
        const walletAddressCache: Record<string, string> = Object.create(null);

        for (let i = 0; i < events.length(); i++) {
            const eventType = events.getEventType(i);
            const txHash = this.toTxHash(events.events[i]?.log?.transactionHash);
            if (!txHash) {
                continue;
            }

            switch (eventType) {
                case "UserDeposit": {
                    const ev = events.getUserDepositEvent(i);
                    const details = (ev.data.details || "").trim();
                    const trace = await this.findPendingEarnTraceFromDepositDetails(details);
                    if (!trace) {
                        break;
                    }

                    trace.txHash = txHash;
                    trace.status = TokenTraceabilityStatus.SENT;
                    trace.errorMessage = "";
                    trace.updatedAt = Date.now();
                    await trace.save();
                    break;
                }
                case "TokensReclaimed": {
                    const ev = events.getTokensReclaimedEvent(i);
                    const fromAddress = ((ev.data.from || "") + "").toLowerCase();
                    const amount = Number(BigInt(ev.data.amount || 0));
                    if (!fromAddress || !Number.isFinite(amount) || amount <= 0) {
                        break;
                    }

                    const trace = await this.findPendingReclaimTrace(fromAddress, amount, walletAddressCache);
                    if (!trace) {
                        break;
                    }

                    trace.txHash = txHash;
                    trace.status = TokenTraceabilityStatus.SENT;
                    trace.errorMessage = "";
                    trace.updatedAt = Date.now();
                    await trace.save();
                    break;
                }
                default:
                    break;
            }
        }
    }

    public async scanCatalogRegistryContractEvents(fromBlock: bigint, toBlock: bigint) {
        const contract = BlockchainConfig.getInstance().contracts.catalogRegistry;
        if (contract.address === ZERO_ADDRESS) {
            return;
        }

        const events = await contract.findEvents(fromBlock, toBlock);
        for (let i = 0; i < events.length(); i++) {
            const eventType = events.getEventType(i);
            switch (eventType) {
                case "CatalogItemCreated": {
                    const ev = events.getCatalogItemCreatedEvent(i);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.CATALOG_CREATED,
                        domain: TraceabilityDomain.CATALOG,
                        subjectId: ev.data.itemId,
                        correlationId: ev.data.itemId,
                        actorId: "",
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            itemId: ev.data.itemId,
                            visibility: ev.data.visibility?.toString?.() || `${ev.data.visibility}`,
                        },
                    });
                    break;
                }
                case "CatalogItemPublished": {
                    const ev = events.getCatalogItemPublishedEvent(i);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.CATALOG_PUBLISHED,
                        domain: TraceabilityDomain.CATALOG,
                        subjectId: ev.data.itemId,
                        correlationId: ev.data.itemId,
                        actorId: "",
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            itemId: ev.data.itemId,
                            visibility: ev.data.visibility?.toString?.() || `${ev.data.visibility}`,
                        },
                    });
                    break;
                }
                case "CatalogItemUpdated": {
                    const ev = events.getCatalogItemUpdatedEvent(i);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.CATALOG_UPDATED,
                        domain: TraceabilityDomain.CATALOG,
                        subjectId: ev.data.itemId,
                        correlationId: ev.data.itemId,
                        actorId: "",
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            itemId: ev.data.itemId,
                        },
                    });
                    break;
                }
                case "CatalogItemWithdrawn": {
                    const ev = events.getCatalogItemWithdrawnEvent(i);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.CATALOG_WITHDRAWN,
                        domain: TraceabilityDomain.CATALOG,
                        subjectId: ev.data.itemId,
                        correlationId: ev.data.itemId,
                        actorId: "",
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            itemId: ev.data.itemId,
                        },
                    });
                    break;
                }
                case "CatalogItemDeleted": {
                    const ev = events.getCatalogItemDeletedEvent(i);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.CATALOG_DELETED,
                        domain: TraceabilityDomain.CATALOG,
                        subjectId: ev.data.itemId,
                        correlationId: ev.data.itemId,
                        actorId: "",
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            itemId: ev.data.itemId,
                        },
                    });
                    break;
                }
                default:
                    break;
            }
        }
    }

    public async scanSubscriptionRegistryContractEvents(fromBlock: bigint, toBlock: bigint) {
        const contract = BlockchainConfig.getInstance().contracts.subscriptionRegistry;
        if (contract.address === ZERO_ADDRESS) {
            return;
        }

        const events = await contract.findEvents(fromBlock, toBlock);
        for (let i = 0; i < events.length(); i++) {
            const eventType = events.getEventType(i);
            switch (eventType) {
                case "SubscriptionCreated": {
                    const ev = events.getSubscriptionCreatedEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_CREATED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: ev.data.subscriberId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                            subscriberId: ev.data.subscriberId,
                        },
                    });
                    break;
                }
                case "SubscriptionRenewed": {
                    const ev = events.getSubscriptionRenewedEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_RENEWED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                        },
                    });
                    break;
                }
                case "SubscriptionChanged": {
                    const ev = events.getSubscriptionChangedEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_CHANGED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: actorId || ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                        },
                    });
                    break;
                }
                case "SubscriptionCancelled": {
                    const ev = events.getSubscriptionCancelledEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_CANCELLED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                        },
                    });
                    break;
                }
                case "SubscriptionSuspended": {
                    const ev = events.getSubscriptionSuspendedEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_SUSPENDED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                        },
                    });
                    break;
                }
                case "SubscriptionReactivated": {
                    const ev = events.getSubscriptionReactivatedEvent(i);
                    const actorId = await this.resolveSubscriptionActorId(ev.data.subscriptionId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.SUBSCRIPTION_REACTIVATED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.subscriptionId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            subscriptionId: ev.data.subscriptionId,
                        },
                    });
                    break;
                }
                case "LicenseAssigned": {
                    const ev = events.getLicenseAssignedEvent(i);
                    const actorId = await this.resolveLicenseActorId(ev.data.licenseId, ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.LICENSE_ASSIGNED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.licenseId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            licenseId: ev.data.licenseId,
                            subscriptionId: ev.data.subscriptionId,
                            organizationId: ev.data.organizationId,
                            userId: ev.data.userId,
                        },
                    });
                    break;
                }
                case "LicenseRevoked": {
                    const ev = events.getLicenseRevokedEvent(i);
                    const actorId = await this.resolveLicenseActorId(ev.data.licenseId, ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.LICENSE_REVOKED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.licenseId,
                        correlationId: ev.data.organizationId || ev.data.licenseId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            licenseId: ev.data.licenseId,
                            organizationId: ev.data.organizationId,
                            userId: ev.data.userId,
                        },
                    });
                    break;
                }
                case "LicenseReactivated": {
                    const ev = events.getLicenseReactivatedEvent(i);
                    const actorId = await this.resolveLicenseActorId(ev.data.licenseId, ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.LICENSE_REACTIVATED,
                        domain: TraceabilityDomain.SUBSCRIPTION,
                        subjectId: ev.data.licenseId,
                        correlationId: ev.data.subscriptionId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            licenseId: ev.data.licenseId,
                            subscriptionId: ev.data.subscriptionId,
                            organizationId: ev.data.organizationId,
                            userId: ev.data.userId,
                        },
                    });
                    break;
                }
                default:
                    break;
            }
        }
    }

    public async scanOrganizationRegistryContractEvents(fromBlock: bigint, toBlock: bigint) {
        const contract = BlockchainConfig.getInstance().contracts.organizationRegistry;
        if (contract.address === ZERO_ADDRESS) {
            return;
        }

        const events = await contract.findEvents(fromBlock, toBlock);
        for (let i = 0; i < events.length(); i++) {
            const eventType = events.getEventType(i);
            switch (eventType) {
                case "OrganizationRegistered": {
                    const ev = events.getOrganizationRegisteredEvent(i);
                    const actorId = await this.resolveOrganizationAdminActorId(ev.data.organizationId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_REGISTERED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.organizationId,
                        correlationId: ev.data.organizationId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                        },
                    });
                    break;
                }
                case "OrganizationDeactivated": {
                    const ev = events.getOrganizationDeactivatedEvent(i);
                    const actorId = await this.resolveOrganizationAdminActorId(ev.data.organizationId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_DEACTIVATED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.organizationId,
                        correlationId: ev.data.organizationId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                        },
                    });
                    break;
                }
                case "OrganizationReactivated": {
                    const ev = events.getOrganizationReactivatedEvent(i);
                    const actorId = await this.resolveOrganizationAdminActorId(ev.data.organizationId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_REACTIVATED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.organizationId,
                        correlationId: ev.data.organizationId,
                        actorId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                        },
                    });
                    break;
                }
                case "MemberAdded": {
                    const ev = events.getMemberAddedEvent(i);
                    const subjectUserId = await this.resolveChainUserIdActor(ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_MEMBER_ADDED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.membershipId,
                        correlationId: ev.data.organizationId,
                        actorId: "",
                        subjectUserId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                            membershipId: ev.data.membershipId,
                            userId: ev.data.userId,
                            role: ev.data.role?.toString?.() || `${ev.data.role}`,
                        },
                    });
                    break;
                }
                case "MemberReactivated": {
                    const ev = events.getMemberReactivatedEvent(i);
                    const subjectUserId = await this.resolveChainUserIdActor(ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_MEMBER_REACTIVATED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.membershipId,
                        correlationId: ev.data.organizationId,
                        actorId: "",
                        subjectUserId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                            membershipId: ev.data.membershipId,
                            userId: ev.data.userId,
                            role: ev.data.role?.toString?.() || `${ev.data.role}`,
                        },
                    });
                    break;
                }
                case "MemberRemoved": {
                    const ev = events.getMemberRemovedEvent(i);
                    const subjectUserId = await this.resolveChainUserIdActor(ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_MEMBER_REMOVED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.membershipId,
                        correlationId: ev.data.organizationId,
                        actorId: "",
                        subjectUserId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                            membershipId: ev.data.membershipId,
                            userId: ev.data.userId,
                        },
                    });
                    break;
                }
                case "MemberRoleChanged": {
                    const ev = events.getMemberRoleChangedEvent(i);
                    const subjectUserId = await this.resolveChainUserIdActor(ev.data.userId);
                    await this.createTraceabilityEventFromChain({
                        eventType: TraceabilityEventType.ORGANIZATION_MEMBER_ROLE_CHANGED,
                        domain: TraceabilityDomain.ORGANIZATION,
                        subjectId: ev.data.membershipId,
                        correlationId: ev.data.organizationId,
                        actorId: "",
                        subjectUserId,
                        txHash: this.toTxHash(ev.event.log.transactionHash),
                        blockNumber: this.toBlockNumber(ev.event.log.blockNumber),
                        occurredAt: await this.getBlockTimestamp(ev.event.log.blockNumber),
                        payload: {
                            organizationId: ev.data.organizationId,
                            membershipId: ev.data.membershipId,
                            userId: ev.data.userId,
                            newRole: ev.data.newRole?.toString?.() || `${ev.data.newRole}`,
                        },
                    });
                    break;
                }
                default:
                    break;
            }
        }
    }

    private async findPendingEarnTraceFromDepositDetails(details: string): Promise<TokenTraceability | null> {
        const operationId = earnOperationIdFromDepositDetails(details);
        if (operationId) {
            const byOperation = await TokenTraceability.findPendingEarnTraceByOperation(operationId);
            if (byOperation) {
                return byOperation;
            }
        }

        const paymentId = extractPaymentIdFromDepositDetails(details);
        if (!paymentId) {
            return null;
        }

        return this.findPendingTokenTraceByPayment(TokenTraceabilityActionKind.EARN, paymentId);
    }

    private async findPendingTokenTraceByPayment(actionKind: string, paymentId: string): Promise<TokenTraceability | null> {
        const pending = await TokenTraceability.findPendingTokenTraceByPayment(TokenTraceabilityStatus.PENDING, actionKind, paymentId);
        return pending[0] || null;
    }

    private async findPendingReclaimTrace(fromAddress: string, amount: number, walletAddressCache: Record<string, string>): Promise<TokenTraceability | null> {
        const pending = await TokenTraceability.findPendingReclaimTrace(amount);

        for (const trace of pending) {
            const actorUid = trace.actorUid || "";
            if (!actorUid) {
                continue;
            }

            if (!walletAddressCache[actorUid]) {
                const wallet = await Wallet.findByUser(actorUid);
                walletAddressCache[actorUid] = ((wallet?.address || "") + "").toLowerCase();
            }

            if (walletAddressCache[actorUid] && walletAddressCache[actorUid] === fromAddress) {
                return trace;
            }
        }

        return null;
    }

    private toTxHash(raw: unknown): string {
        if (!raw) {
            return "";
        }
        if (typeof raw === "string") {
            return raw;
        }
        return `0x${(raw as Buffer).toString("hex")}`;
    }

    private toBlockNumber(raw: unknown): number {
        if (typeof raw === "bigint") {
            return Number(raw);
        }
        if (typeof raw === "number") {
            return raw;
        }
        if (typeof raw === "string") {
            return raw.startsWith("0x") ? Number(BigInt(raw)) : (parseInt(raw, 10) || 0);
        }
        return 0;
    }

    private hashActor(actorId: string): string {
        return createHash("sha256").update(actorId).digest("hex");
    }

    private async resolveSubscriptionActorId(subscriptionId: string): Promise<string> {
        if (!subscriptionId) {
            return "";
        }

        let subscription = await Subscription.findById(subscriptionId);

        // Local IDs are 32-hex chars, while chain IDs are bytes32.
        // Try mapping bytes32 IDs back to local format using the lower 16-byte suffix.
        if (!subscription && validateBytes32(subscriptionId)) {
            const normalized = normalizeBytes32(subscriptionId);
            const localSubscriptionId = normalized.slice(-32);
            subscription = await Subscription.findById(localSubscriptionId);
        }

        return subscription?.uid || "";
    }

    private async resolveLocalIdFromChain(
        chainId: string,
        findById: (id: string) => Promise<{ id: string } | null>,
    ): Promise<string> {
        if (!chainId) {
            return "";
        }

        let row = await findById(chainId);
        if (!row && validateBytes32(chainId)) {
            const normalized = normalizeBytes32(chainId);
            row = await findById(normalized.slice(-32));
        }

        return row?.id || "";
    }

    private async resolveOrganizationAdminActorId(organizationId: string): Promise<string> {
        const localOrganizationId = await this.resolveLocalIdFromChain(
            organizationId,
            id => Organization.findById(id),
        );
        if (!localOrganizationId) {
            return "";
        }

        const organization = await Organization.findById(localOrganizationId);
        return organization?.adminUid || "";
    }

    private async resolveLicenseActorId(licenseId: string, chainUserId: string): Promise<string> {
        const localLicenseId = await this.resolveLocalIdFromChain(
            licenseId,
            id => OrganizationLicenseAssignment.findById(id),
        );
        if (localLicenseId) {
            const assignment = await OrganizationLicenseAssignment.findById(localLicenseId);
            if (assignment?.userId) {
                return assignment.userId;
            }
        }

        return this.resolveChainUserIdActor(chainUserId);
    }

    private async resolveChainUserIdActor(chainUserId: string): Promise<string> {
        if (!chainUserId || !validateBytes32(chainUserId)) {
            return "";
        }

        const normalized = normalizeBytes32(chainUserId);
        if (/^0x0{64}$/i.test(normalized)) {
            return "";
        }

        const localUserId = normalized.slice(-32);
        const user = await User.findUserByUID(localUserId);
        return user?.id || "";
    }

    private async createTraceabilityEventFromChain(input: {
        eventType: TraceabilityEventType;
        domain: TraceabilityDomain;
        subjectId: string;
        correlationId: string;
        actorId: string;
        subjectUserId?: string;
        txHash: string;
        blockNumber: number;
        occurredAt: number;
        payload?: unknown;
    }): Promise<void> {
        if (!input.subjectId || !input.txHash) {
            return;
        }

        const duplicated = await TraceabilityEvent.findByTxHashEventAndSubject(
            input.txHash,
            input.eventType,
            input.subjectId,
        );
        if (duplicated) {
            return;
        }

        await TraceabilityEvent.create({
            eventId: createRandomUID(),
            eventType: input.eventType,
            domain: input.domain,
            subjectId: input.subjectId,
            correlationId: input.correlationId,
            actorIdHash: input.actorId ? this.hashActor(input.actorId) : "",
            subjectUserIdHash: input.subjectUserId ? this.hashActor(input.subjectUserId) : "",
            status: TraceabilityStatus.CONFIRMED,
            txHash: input.txHash,
            blockNumber: Math.max(0, Math.floor(input.blockNumber || 0)),
        });
    }

    private logEvents(events: SmartContractEvent[]) {
        if (!Config.getInstance().isProduction) {
            for (const event of events) {
                Monitor.debug("[EVENT] " + event.signature + " | Data: " + event.parameters.map(p => {
                    if (typeof p === "bigint") {
                        return "0x" + p.toString(16);
                    } else if (typeof p === "string") {
                        return JSON.stringify(p);
                    } else if (p instanceof Buffer) {
                        return JSON.stringify(p.toString("hex"));
                    } else {
                        return "" + p;
                    }
                }).join(","));
            }
        }
    }

    private async getBlockTimestamp(blockNumber: Quantity): Promise<number> {
        const block = await Web3RPCClient.getInstance().getBlockByNumber(blockNumber, {
            provider: BlockchainConfig.getInstance().provider,
        });
        if (block?.timestamp === null) {
            throw new Error("Could not retrieve timestamp for block " + blockNumber.toString());
        }

        return parseInt(block.timestamp.toString(10), 10) * 1000;
    }
}
