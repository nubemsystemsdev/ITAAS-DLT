// Orchestrates BFF logical-tenant provision/deactivate from ITAAS subscriptions

"use strict";

import { CatalogItem, ITAAS_PLATFORM_ITEM_ID } from "../models/catalog-item";
import { CustomAgentRequest } from "../models/custom-agent-request";
import { ItemPlan } from "../models/item-plan";
import { ItaasFlowSetting } from "../models/itaas-flow-setting";
import { ItaasWorkspacePendingOperation, ItaasWorkspaceSyncPending } from "../models/itaas-workspace-sync-pending";
import { Organization } from "../models/organization";
import { PlanComponent } from "../models/plan-component";
import { PlanPricing } from "../models/plan-pricing";
import { SubscribableType, Subscription, SubscriptionStatus } from "../models/subscription";
import { User } from "../models/users/user";
import { Monitor } from "../monitor";
import { createRandomUID } from "../utils/text-utils";
import { RedisConfig } from "../config/config-redis";
import { ItaasFlowGraph } from "../utils/itaas-flow-graph";
import { BffCatalogFlowItem, BffProvisioningClient, BffProvisioningResult, BffTenant, BffTenantRef, BffTenantSubjectType } from "./bff-provisioning-client";
import { RedisService } from "./redis-service";

/** Statuses that keep the BFF tenant active (still entitled). */
const ITAAS_WORKSPACE_ACTIVE_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.SCHEDULED_CANCELLATION,
];

/** Statuses that keep a delivered custom-agent flow assigned (paid monthly entitlement). */
const CUSTOM_AGENT_FLOW_ACTIVE_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.SCHEDULED_CANCELLATION,
];

/** Distributed lock for admin flow mutations (cross-worker). */
const FLOW_OP_LOCK_PREFIX = "itaas:flow-op:";
const FLOW_OP_LOCK_TTL_MS = 60_000;
const FLOW_OP_LOCK_WAIT_MS = 30_000;
const FLOW_OP_LOCK_RETRY_MS = 100;

export type ItaasWorkspaceSyncAction = "provision" | "deactivate" | "skip";

export interface ItaasWorkspaceSyncResult {
    action: ItaasWorkspaceSyncAction;
    reason: string;
    subject?: BffTenantRef;
    result?: BffProvisioningResult;
}

export type ItaasAdminFlowVisibility = "global" | "workspace" | "unassigned";

export interface ItaasAdminFlowAssignment {
    subjectType: BffTenantSubjectType;
    subjectId: string;
    name?: string;
    status: "active" | "inactive";
}

export interface ItaasAdminFlowItem {
    id: string;
    name: string;
    deployed: boolean;
    type?: string;
    category?: string;
    updatedAt?: string;
    isGlobal: boolean;
    visibility: ItaasAdminFlowVisibility;
    assignments: ItaasAdminFlowAssignment[];
    graphVisibleToUsers: boolean;
    graph?: ItaasFlowGraph;
}

export interface ItaasAdminWorkspaceItem {
    subjectType: BffTenantSubjectType;
    subjectId: string;
    subjectKey: string;
    name?: string;
    status: "active" | "inactive";
    flowIds: string[];
}

export interface ItaasAdminGlobalFlowResult {
    globalFlowIds: string[];
    clearedAssignments: number;
}

/**
 * Maps ITAAS Platform subscription lifecycle to BFF logical tenants.
 * HTTP failures are logged and enqueued for retry so Stripe webhooks are not blocked.
 */
export class ItaasWorkspaceProvisioningService {
    private static instance: ItaasWorkspaceProvisioningService | null = null;

    private readonly flowOpChains = new Map<string, Promise<unknown>>();

    public static getInstance(): ItaasWorkspaceProvisioningService {
        if (!ItaasWorkspaceProvisioningService.instance) {
            ItaasWorkspaceProvisioningService.instance = new ItaasWorkspaceProvisioningService();
        }
        return ItaasWorkspaceProvisioningService.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(service: ItaasWorkspaceProvisioningService | null): void {
        ItaasWorkspaceProvisioningService.instance = service;
    }

    /**
     * Provision or deactivate according to the subject's total ITAAS entitlement.
     * Triggered by a single subscription lifecycle event, but does not activate/deactivate
     * based on that subscription alone (user/org may still have another valid ITAAS source:
     * direct item plan or a plan that includes the ITAAS platform item).
     *
     * Always re-evaluates the subject — including when this subscription is no longer ITAAS
     * (e.g. plan change away from ITAAS). Skipping non-ITAAS events would leave the workspace
     * active after entitlement is lost.
     */
    public async syncWorkspaceForSubscription(subscription: Subscription): Promise<ItaasWorkspaceSyncResult> {
        if (!subscription) {
            return { action: "skip", reason: "missing_subscription" };
        }

        // Custom-agent monthly fee is independent of ITAAS platform entitlement:
        // cancel/unpaid must revoke the delivered flow even while the workspace stays active.
        await this.syncCustomAgentDeliveredFlowBestEffort(subscription);

        const subject = this.resolveSubject(subscription);
        if (!subject) {
            return { action: "skip", reason: "missing_subject" };
        }

        return this.syncWorkspaceForSubject(subject);
    }

    /**
     * Assigns or removes the custom-agent delivered flow based on the monthly subscription status.
     * Looks up the request via monthlySubscriptionId (set at delivery).
     */
    public async syncCustomAgentDeliveredFlow(subscription: Subscription): Promise<ItaasWorkspaceSyncResult> {
        if (!subscription?.id) {
            return { action: "skip", reason: "missing_subscription" };
        }

        const request = await CustomAgentRequest.findByMonthlySubscriptionId(subscription.id);
        if (!request) {
            return { action: "skip", reason: "no_custom_agent_request" };
        }

        const flowId = ((request.deliveredFlowiseFlowId || "") + "").trim();
        if (!flowId) {
            return { action: "skip", reason: "missing_flow_id" };
        }

        const subject: BffTenantRef = request.organizationId
            ? { subjectType: "organization", subjectId: request.organizationId }
            : { subjectType: "user", subjectId: request.requesterUserId };

        if (!subject.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }

        const entitled = CUSTOM_AGENT_FLOW_ACTIVE_STATUSES.indexOf(subscription.status) >= 0;
        if (entitled) {
            return this.assignFlowToSubject(subject, flowId);
        }

        return this.removeFlowFromSubject(subject, flowId);
    }

    private async syncCustomAgentDeliveredFlowBestEffort(subscription: Subscription): Promise<void> {
        try {
            await this.syncCustomAgentDeliveredFlow(subscription);
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Custom-agent flow sync failed for subscription ${subscription.id}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    /**
     * Re-evaluates entitlement for a subject and provisions or deactivates accordingly.
     */
    public async syncWorkspaceForSubject(subject: BffTenantRef): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }

        const entitled = await this.subjectHasItaasEntitlement(subject);
        if (entitled) {
            return this.ensureProvisioned(subject);
        }

        return this.ensureDeactivated(subject);
    }

    /**
     * Retries pending BFF ops.
     * `sync` re-derives desired state from entitlement; assign/remove replay the stored flowId.
     */
    public async flushPendingWorkspaceSyncs(): Promise<number> {
        if (!BffProvisioningClient.getInstance().isEnabled()) {
            Monitor.info("[ITAAS Workspace] Pending flush skipped: BFF provisioning disabled or not configured");
            return 0;
        }

        const pending = await ItaasWorkspaceSyncPending.findPending();
        let processed = 0;

        for (const row of pending) {
            const subject: BffTenantRef = {
                subjectType: row.subjectType === "organization" ? "organization" : "user",
                subjectId: row.subjectId,
            };
            const operation = this.resolvePendingOperation(row.operation);
            const flowId = ((row.flowId || "") + "").trim();
            try {
                if (operation === "assign_flow" || operation === "remove_flow") {
                    if (!flowId) {
                        Monitor.warning(
                            `[ITAAS Workspace] Dropping invalid pending ${operation} for ${subject.subjectType}:${subject.subjectId}: missing flowId`,
                        );
                        await this.clearPending(subject, operation, "");
                        processed++;
                        continue;
                    }
                    if (operation === "assign_flow") {
                        await this.assignFlowToSubject(subject, flowId);
                    } else {
                        await this.removeFlowFromSubject(subject, flowId);
                    }
                } else {
                    await this.syncWorkspaceForSubject(subject);
                }
            } catch (ex) {
                if (
                    operation === "assign_flow"
                    && ex instanceof Error
                    && ex.message === "FLOW_IS_GLOBAL"
                ) {
                    await this.clearPending(subject, "assign_flow", flowId);
                    processed++;
                    continue;
                }
                Monitor.error(
                    `[ITAAS Workspace] Pending flush exception for ${subject.subjectType}:${subject.subjectId} op=${operation}: ${ex instanceof Error ? ex.message : ex}`,
                );
                await this.enqueuePending(subject, operation, flowId);
            }
            processed++;
        }

        return processed;
    }

    /** Creates or reactivates the BFF tenant. */
    public async ensureProvisioned(subject: BffTenantRef): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }

        const name = await this.resolveDisplayName(subject);
        const client = BffProvisioningClient.getInstance();

        try {
            const result = await client.provision({
                subjectType: subject.subjectType,
                subjectId: subject.subjectId,
                name,
            });

            if ("tenant" in result) {
                Monitor.info(
                    `[ITAAS Workspace] Provisioned ${subject.subjectType}:${subject.subjectId} (status=${result.tenant.status})`,
                );
                await this.clearPending(subject);
                return { action: "provision", reason: "ok", subject, result };
            }

            Monitor.info(
                `[ITAAS Workspace] Provision skipped for ${subject.subjectType}:${subject.subjectId}: ${result.reason}`,
            );
            return { action: "provision", reason: "skipped", subject, result };
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : String(ex);
            Monitor.error(
                `[ITAAS Workspace] Provision failed for ${subject.subjectType}:${subject.subjectId}: ${message}`,
            );
            await this.enqueuePending(subject);
            return { action: "provision", reason: "error", subject };
        }
    }

    /** 
     * Deactivates the BFF tenant (keeps flows/credentials). Does not delete. 
     */
    public async ensureDeactivated(subject: BffTenantRef): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }

        const client = BffProvisioningClient.getInstance();

        try {
            const result = await client.deactivate({
                subjectType: subject.subjectType,
                subjectId: subject.subjectId,
            });

            if ("tenant" in result) {
                Monitor.info(
                    `[ITAAS Workspace] Deactivated ${subject.subjectType}:${subject.subjectId} (status=${result.tenant.status})`,
                );
                await this.clearPending(subject);
                return { action: "deactivate", reason: "ok", subject, result };
            }

            Monitor.info(
                `[ITAAS Workspace] Deactivate skipped for ${subject.subjectType}:${subject.subjectId}: ${result.reason}`,
            );
            return { action: "deactivate", reason: "skipped", subject, result };
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : String(ex);
            Monitor.error(
                `[ITAAS Workspace] Deactivate failed for ${subject.subjectType}:${subject.subjectId}: ${message}`,
            );
            await this.enqueuePending(subject);
            return { action: "deactivate", reason: "error", subject };
        }
    }

    /**
     * Explicit assign for admin / future agent wiring.
     * Rejects assigning a custom-agent delivered flow to a different workspace.
     * @throws Error FLOW_IS_GLOBAL | FLOW_ALREADY_ASSIGNED | FLOW_OP_BUSY
     */
    public async assignFlowToSubject(subject: BffTenantRef, flowId: string): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return { action: "skip", reason: "missing_flow_id" };
        }
        return this.withFlowLock(id, async () => {
            await this.assertNotExclusiveCustomAgentFlowForOtherSubject(subject, id);
            return this.assignFlowToSubjectLocked(subject, id);
        });
    }

    /**
     * Assigns a catalog flow exclusively to one workspace.
     * Check + assign run under the same flow lock so concurrent deliveries cannot both pass.
     * If the flow is already on this subject only, the assign is treated as idempotent success
     * (covers BFF assign succeeding and then failing to persist deliveredFlowiseFlowId).
     * @throws Error INVALID_FLOW_ID | FLOW_IS_GLOBAL | FLOW_ALREADY_ASSIGNED | BFF_UNAVAILABLE | FLOW_OP_BUSY
     */
    public async assignExclusiveCatalogFlowToSubject(subject: BffTenantRef, flowId: string): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return { action: "skip", reason: "missing_flow_id" };
        }
        return this.withFlowLock(id, async () => {
            const ownership = await this.resolveExclusiveCatalogFlowOwnership(id, subject);
            if (ownership === "owned") {
                return { action: "provision", reason: "flow_assigned", subject };
            }
            return this.assignFlowToSubjectLocked(subject, id, false);
        });
    }

    /** Explicit remove for admin / future agent wiring. */
    public async removeFlowFromSubject(subject: BffTenantRef, flowId: string, retryOnFailure = true): Promise<ItaasWorkspaceSyncResult> {
        if (!subject?.subjectId) {
            return { action: "skip", reason: "missing_subject" };
        }
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return { action: "skip", reason: "missing_flow_id" };
        }
        return this.withFlowLock(id, async () => {
            const client = BffProvisioningClient.getInstance();
            try {
                const result = await client.removeFlow(subject, id);
                if ("tenant" in result) {
                    await this.clearPending(subject, "remove_flow", id);
                    await this.clearPending(subject, "assign_flow", id);
                    return { action: "provision", reason: "flow_removed", subject, result };
                }
                return { action: "provision", reason: "skipped", subject, result };
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : String(ex);
                Monitor.error(
                    `[ITAAS Workspace] Remove flow ${id} failed for ${subject.subjectType}:${subject.subjectId}: ${message}`,
                );
                if (retryOnFailure) {
                    await this.enqueuePending(subject, "remove_flow", id);
                }
                return { action: "provision", reason: "error", subject };
            }
        });
    }

    /**
     * Admin catalog: BFF flow list enriched with assignments and visibility.
     * Throws BFF_UNAVAILABLE when provisioning is disabled or the BFF skips.
     */
    public async listAdminFlows(q?: string): Promise<ItaasAdminFlowItem[]> {
        const client = this.requireProvisioningClient();
        const catalog = await client.listCatalogFlows(q);
        if (!("items" in catalog)) {
            throw new Error("BFF_UNAVAILABLE");
        }
        const tenantsResult = await client.listTenants();
        if (!("tenants" in tenantsResult)) {
            throw new Error("BFF_UNAVAILABLE");
        }

        const assignmentsByFlow = this.buildAssignmentsByFlow(tenantsResult.tenants);
        const visibleByFlow = await this.graphVisibilityByFlowIds(catalog.items.map((item) => item.id));
        return catalog.items.map((item) => this.toAdminFlowItem(
            item,
            assignmentsByFlow.get(item.id) || [],
            false,
            visibleByFlow.get(item.id) === true,
        ));
    }

    /**
     * Admin catalog item by id, enriched with assignments and visibility.
     * @throws Error INVALID_FLOW_ID | FLOW_NOT_FOUND | BFF_UNAVAILABLE
     */
    public async getAdminFlow(flowId: string): Promise<ItaasAdminFlowItem> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }

        let item: BffCatalogFlowItem;
        try {
            item = await this.requireCatalogFlow(id);
        } catch (ex) {
            if (ex instanceof Error && ex.message === "INVALID_FLOW_ID") {
                throw new Error("FLOW_NOT_FOUND");
            }
            throw ex;
        }

        return this.toAdminFlowItem(
            item,
            await this.resolveCatalogFlowAssignments(item),
            true,
            await ItaasFlowSetting.isGraphVisibleToUsers(id),
        );
    }

    /**
     * Sets whether end users can see the sanitized graph preview for a catalog flow.
     * @throws Error INVALID_FLOW_ID | FLOW_NOT_FOUND | BFF_UNAVAILABLE
     */
    public async setAdminFlowGraphVisibility(
        flowId: string,
        visible: boolean,
    ): Promise<{ flowId: string; graphVisibleToUsers: boolean }> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }

        try {
            await this.requireCatalogFlow(id);
        } catch (ex) {
            if (ex instanceof Error && ex.message === "INVALID_FLOW_ID") {
                throw new Error("FLOW_NOT_FOUND");
            }
            throw ex;
        }

        const setting = await ItaasFlowSetting.setGraphVisibleToUsers(id, visible);
        return {
            flowId: setting.flowId,
            graphVisibleToUsers: !!setting.graphVisibleToUsers,
        };
    }

    /**
     * Sets graph visibility for many catalog flows in local settings only (no BFF).
     * Per-flow save errors are skipped; `flowIds` are the ones persisted.
     * @throws Error INVALID_BODY
     */
    public async setAdminFlowsGraphVisibility(
        flowIds: string[],
        visible: boolean,
    ): Promise<{ flowIds: string[]; graphVisibleToUsers: boolean }> {
        const requested = Array.from(
            new Set((flowIds || []).map((flowId) => ((flowId || "") + "").trim()).filter(Boolean)),
        );
        if (requested.length === 0) {
            throw new Error("INVALID_BODY");
        }

        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(requested, visible);
        if (ids.length < requested.length) {
            Monitor.warning(
                `[ITAAS Workspace] Graph visibility updated for ${ids.length}/${requested.length} flow(s)`,
            );
        }
        return {
            flowIds: ids,
            graphVisibleToUsers: !!visible,
        };
    }

    /**
     * Reads local graph visibility for catalog flows (no BFF). Missing rows are hidden.
     * @throws Error INVALID_BODY
     */
    public async lookupAdminFlowsGraphVisibility(
        flowIds: string[],
    ): Promise<{ items: Array<{ flowId: string; graphVisibleToUsers: boolean }> }> {
        const requested = Array.from(
            new Set((flowIds || []).map((flowId) => ((flowId || "") + "").trim()).filter(Boolean)),
        );
        if (requested.length === 0) {
            throw new Error("INVALID_BODY");
        }

        const visibleByFlow = await ItaasFlowSetting.graphVisibleToUsersByFlowIds(requested);
        return {
            items: requested.map((flowId) => ({
                flowId,
                graphVisibleToUsers: visibleByFlow.get(flowId) === true,
            })),
        };
    }

    /**
     * Deletes local flow settings whose catalog flow no longer exists in the BFF.
     * Fail-closed: if the BFF is unavailable, nothing is deleted.
     */
    public async purgeOrphanedFlowSettings(): Promise<number> {
        const client = BffProvisioningClient.getInstance();
        if (!client.isEnabled()) {
            return 0;
        }

        let catalog: Awaited<ReturnType<BffProvisioningClient["listCatalogFlows"]>>;
        try {
            catalog = await client.listCatalogFlows();
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Orphan flow-setting cleanup skipped: ${ex instanceof Error ? ex.message : ex}`,
            );
            return 0;
        }
        if (!("items" in catalog)) {
            return 0;
        }

        const liveIds = new Set(
            catalog.items.map((item) => ((item.id || "") + "").trim()).filter(Boolean),
        );
        const rows = await ItaasFlowSetting.findAll();
        const orphanIds = rows
            .map((row) => row.flowId)
            .filter((flowId) => flowId && !liveIds.has(flowId));
        if (orphanIds.length === 0) {
            return 0;
        }
        return ItaasFlowSetting.deleteByFlowIds(orphanIds);
    }

    /**
     * Admin workspace selector: BFF logical tenants with subjectId derived from subjectKey.
     */
    public async listAdminWorkspaces(): Promise<ItaasAdminWorkspaceItem[]> {
        const client = this.requireProvisioningClient();
        const tenantsResult = await client.listTenants();
        if (!("tenants" in tenantsResult)) {
            throw new Error("BFF_UNAVAILABLE");
        }

        const items: ItaasAdminWorkspaceItem[] = [];
        for (const tenant of tenantsResult.tenants) {
            const ref = this.subjectRefFromTenant(tenant);
            if (!ref) {
                Monitor.warning(
                    `[ITAAS Workspace] Skipping tenant with invalid subject mapping: key=${tenant.subjectKey} type=${tenant.subjectType}`,
                );
                continue;
            }
            items.push({
                subjectType: ref.subjectType,
                subjectId: ref.subjectId,
                subjectKey: tenant.subjectKey,
                name: tenant.name,
                status: tenant.status,
                flowIds: Array.isArray(tenant.flowIds) ? tenant.flowIds : [],
            });
        }
        return items;
    }

    /**
     * Makes a flow platform-global after clearing private assignments.
     * Rejects flows owned by an in-progress or delivered custom-agent request.
     * On failure, restores cleared assignments (with pending retry) unless the flow
     * is already global (avoids private+global after a lost publish response).
     * @throws Error INVALID_FLOW_ID | FLOW_ALREADY_ASSIGNED | FLOW_GLOBAL_SYNC_FAILED | BFF_UNAVAILABLE | FLOW_OP_BUSY
     */
    public async makeFlowGlobal(flowId: string): Promise<ItaasAdminGlobalFlowResult> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }

        return this.withFlowLock(id, async () => {
            const exclusive = await CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId(id);
            if (exclusive) {
                throw new Error("FLOW_ALREADY_ASSIGNED");
            }

            const client = this.requireProvisioningClient();
            const tenantsResult = await client.listTenants();
            if (!("tenants" in tenantsResult)) {
                throw new Error("BFF_UNAVAILABLE");
            }

            const cleared: BffTenantRef[] = [];
            try {
                for (const tenant of tenantsResult.tenants) {
                    if (!Array.isArray(tenant.flowIds) || !tenant.flowIds.includes(id)) {
                        continue;
                    }
                    const ref = this.subjectRefFromTenant(tenant);
                    if (!ref) {
                        throw new Error("FLOW_GLOBAL_SYNC_FAILED");
                    }
                    const removeResult = await client.removeFlow(ref, id);
                    if (!("tenant" in removeResult)) {
                        throw new Error("FLOW_GLOBAL_SYNC_FAILED");
                    }
                    cleared.push(ref);
                }

                const globalResult = await client.addGlobalFlow(id);
                if (!("globalFlowIds" in globalResult)) {
                    throw new Error("BFF_UNAVAILABLE");
                }

                await this.clearFlowPendingIntents(id);
                return {
                    globalFlowIds: globalResult.globalFlowIds,
                    clearedAssignments: cleared.length,
                };
            } catch (ex) {
                const confirmedGlobal = await this.readGlobalFlowIdsIfPresent(client, id);
                if (confirmedGlobal) {
                    const finished = await this.clearRemainingPrivateAssignments(client, id, cleared);
                    await this.clearFlowPendingIntents(id);
                    return {
                        globalFlowIds: confirmedGlobal,
                        clearedAssignments: finished.length,
                    };
                }
                if (cleared.length > 0) {
                    await this.restoreClearedAssignments(client, cleared, id);
                }
                if (
                    ex instanceof Error
                    && (
                        ex.message === "FLOW_GLOBAL_SYNC_FAILED"
                        || ex.message === "BFF_UNAVAILABLE"
                        || ex.message === "INVALID_FLOW_ID"
                    )
                ) {
                    throw ex;
                }
                Monitor.error(
                    `[ITAAS Workspace] makeFlowGlobal failed for flow=${id}: ${ex instanceof Error ? ex.message : ex}`,
                );
                throw new Error("FLOW_GLOBAL_SYNC_FAILED");
            }
        });
    }

    /** Unpublishes a platform-global flow. Does not restore previous assignments. */
    public async unpublishGlobalFlow(flowId: string): Promise<ItaasAdminGlobalFlowResult> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }

        return this.withFlowLock(id, async () => {
            const client = this.requireProvisioningClient();
            const globalResult = await client.removeGlobalFlow(id);
            if (!("globalFlowIds" in globalResult)) {
                throw new Error("BFF_UNAVAILABLE");
            }

            await this.clearFlowPendingIntents(id);

            return {
                globalFlowIds: globalResult.globalFlowIds,
                clearedAssignments: 0,
            };
        });
    }

    /**
     * True when the subscription is (or includes) ITAAS Platform.
     */
    public async isItaasPlatformSubscription(subscription: Subscription): Promise<boolean> {
        if (!subscription?.subscribableId) {
            return false;
        }

        if (subscription.subscribableType === SubscribableType.ITEM) {
            const itemPlan = await ItemPlan.findById(subscription.subscribableId);
            if (!itemPlan?.itemId) {
                return false;
            }
            if (itemPlan.itemId === ITAAS_PLATFORM_ITEM_ID) {
                return true;
            }
            const item = await CatalogItem.findById(itemPlan.itemId);
            return !!item && CatalogItem.isItaasPlatformItem(item);
        }

        if (subscription.subscribableType === SubscribableType.PLAN) {
            const pricing = await PlanPricing.findById(subscription.subscribableId);
            if (!pricing?.planId) {
                return false;
            }
            const components = await PlanComponent.findByPlanId(pricing.planId);
            return components.some((c) => c.catalogItemId === ITAAS_PLATFORM_ITEM_ID);
        }

        return false;
    }

    /**
     * True when the subject (user or organization) still has at least one
     * ITAAS-bearing subscription in an entitled status (item or plan component).
     */
    public async subjectHasItaasEntitlement(subject: BffTenantRef): Promise<boolean> {
        if (!subject?.subjectId) {
            return false;
        }

        const candidates = subject.subjectType === "organization"
            ? await Subscription.findByOrganizationAndStatuses(subject.subjectId, ITAAS_WORKSPACE_ACTIVE_STATUSES)
            : await Subscription.findPersonalByUserAndStatuses(subject.subjectId, ITAAS_WORKSPACE_ACTIVE_STATUSES);

        for (const candidate of candidates) {
            if (await this.isItaasPlatformSubscription(candidate)) {
                return true;
            }
        }

        return false;
    }

    private resolveSubject(subscription: Subscription): BffTenantRef | null {
        if (subscription.organizationId) {
            return {
                subjectType: "organization",
                subjectId: subscription.organizationId,
            };
        }

        if (subscription.uid) {
            return {
                subjectType: "user",
                subjectId: subscription.uid,
            };
        }

        return null;
    }

    private requireProvisioningClient(): BffProvisioningClient {
        const client = BffProvisioningClient.getInstance();
        if (!client.isEnabled()) {
            throw new Error("BFF_UNAVAILABLE");
        }
        return client;
    }

    /**
     * Must run while the caller already holds the flow lock.
     */
    private async assignFlowToSubjectLocked(
        subject: BffTenantRef,
        id: string,
        retryOnFailure = true,
    ): Promise<ItaasWorkspaceSyncResult> {
        const client = BffProvisioningClient.getInstance();
        try {
            await this.assertFlowNotGlobal(id);
            const result = await client.assignFlow(subject, id);
            if ("tenant" in result) {
                try {
                    await this.assertFlowNotGlobal(id);
                } catch (raceEx) {
                    if (raceEx instanceof Error && raceEx.message === "FLOW_IS_GLOBAL") {
                        try {
                            await client.removeFlow(subject, id);
                        } catch (rollbackEx) {
                            Monitor.error(
                                `[ITAAS Workspace] Undo assign after global race failed for ${subject.subjectType}:${subject.subjectId} flow=${id}: ${rollbackEx instanceof Error ? rollbackEx.message : rollbackEx}`,
                            );
                        }
                        throw raceEx;
                    }
                    throw raceEx;
                }
                await this.clearPending(subject, "assign_flow", id);
                await this.clearPending(subject, "remove_flow", id);
                return { action: "provision", reason: "flow_assigned", subject, result };
            }
            return { action: "provision", reason: "skipped", subject, result };
        } catch (ex) {
            if (ex instanceof Error && ex.message === "FLOW_IS_GLOBAL") {
                throw ex;
            }
            const message = ex instanceof Error ? ex.message : String(ex);
            Monitor.error(
                `[ITAAS Workspace] Assign flow ${id} failed for ${subject.subjectType}:${subject.subjectId}: ${message}`,
            );
            if (retryOnFailure) {
                await this.enqueuePending(subject, "assign_flow", id);
            }
            return { action: "provision", reason: "error", subject };
        }
    }

    /**
     * Blocks assigning a custom-agent delivered flow to a different workspace.
     * @throws Error FLOW_ALREADY_ASSIGNED
     */
    private async assertNotExclusiveCustomAgentFlowForOtherSubject(subject: BffTenantRef, flowId: string): Promise<void> {
        const request = await CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId(flowId);
        if (!request) {
            return;
        }

        const owner: BffTenantRef = request.organizationId
            ? { subjectType: "organization", subjectId: request.organizationId }
            : { subjectType: "user", subjectId: request.requesterUserId };
        if (owner.subjectType !== subject.subjectType || owner.subjectId !== subject.subjectId) {
            throw new Error("FLOW_ALREADY_ASSIGNED");
        }
    }

    /**
     * Catalog + assignment snapshot for exclusive delivery.
     * When `subject` is omitted, any assignment is rejected.
     * When provided, assignment to that subject only is `owned` (idempotent retry).
     * @throws Error INVALID_FLOW_ID | FLOW_IS_GLOBAL | FLOW_ALREADY_ASSIGNED | BFF_UNAVAILABLE
     */
    private async resolveExclusiveCatalogFlowOwnership(
        flowId: string,
        subject?: BffTenantRef,
    ): Promise<"free" | "owned"> {
        const item = await this.requireCatalogFlow(flowId);
        if (item.isGlobal) {
            throw new Error("FLOW_IS_GLOBAL");
        }

        const assignments = await this.resolveCatalogFlowAssignments(item);
        const ownedByOther = subject
            ? assignments.some((row) => row.subjectType !== subject.subjectType || row.subjectId !== subject.subjectId)
            : assignments.length > 0;
        if (ownedByOther) {
            throw new Error("FLOW_ALREADY_ASSIGNED");
        }
        if (!subject) {
            return "free";
        }
        const ownedBySubject = assignments.some(
            (row) => row.subjectType === subject.subjectType && row.subjectId === subject.subjectId,
        );
        return ownedBySubject ? "owned" : "free";
    }

    /**
     * Loads a catalog flow by id from the BFF admin GET.
     * @throws Error INVALID_FLOW_ID | BFF_UNAVAILABLE
     */
    private async requireCatalogFlow(flowId: string): Promise<BffCatalogFlowItem> {
        const client = this.requireProvisioningClient();

        try {
            const result = await client.getCatalogFlow(flowId);
            if (!("item" in result)) {
                throw new Error("BFF_UNAVAILABLE");
            }
            return result.item;
        } catch (ex) {
            if (
                ex instanceof Error
                && (
                    ex.message === "BFF_PROVISIONING_FLOW_NOT_FOUND"
                    || ex.message === "BFF_PROVISIONING_HTTP_404"
                    || ex.message === "BFF_PROVISIONING_INVALID_FLOW_ID"
                    || ex.message === "FLOW_NOT_FOUND"
                )
            ) {
                throw new Error("INVALID_FLOW_ID");
            }
            throw ex;
        }
    }

    /**
     * Serializes admin mutations for the same flowId across workers (Redis).
     * If Redis is enabled but the lock cannot be acquired, fail closed (`FLOW_OP_BUSY`)
     * instead of falling back to a per-process chain.
     */
    private async withFlowLock<T>(flowId: string, fn: () => Promise<T>): Promise<T> {
        if (!RedisConfig.getInstance().enabled) {
            return this.withLocalFlowChain(flowId, fn);
        }

        let token: string | null = null;
        try {
            token = await this.acquireFlowRedisLock(flowId);
        } catch (ex) {
            if (ex instanceof Error && ex.message === "FLOW_OP_BUSY") {
                throw ex;
            }
            Monitor.warning(
                `[ITAAS Workspace] Redis flow lock unavailable for flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
            );
            throw new Error("FLOW_OP_BUSY");
        }

        try {
            return await fn();
        } finally {
            await this.releaseFlowRedisLock(flowId, token);
        }
    }

    private withLocalFlowChain<T>(flowId: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.flowOpChains.get(flowId) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(fn);
        const tail = run.then(
            () => undefined,
            () => undefined,
        );
        this.flowOpChains.set(flowId, tail);
        return run.finally(() => {
            if (this.flowOpChains.get(flowId) === tail) {
                this.flowOpChains.delete(flowId);
            }
        });
    }

    private async acquireFlowRedisLock(flowId: string): Promise<string> {
        const key = FLOW_OP_LOCK_PREFIX + flowId;
        const token = createRandomUID();
        const redis = RedisService.getInstance();
        const deadline = Date.now() + FLOW_OP_LOCK_WAIT_MS;

        while (Date.now() <= deadline) {
            const acquired = await redis.tryAcquireLock(key, token, FLOW_OP_LOCK_TTL_MS);
            if (acquired) {
                return token;
            }
            await new Promise((resolve) => setTimeout(resolve, FLOW_OP_LOCK_RETRY_MS));
        }

        throw new Error("FLOW_OP_BUSY");
    }

    private async releaseFlowRedisLock(flowId: string, token: string): Promise<void> {
        try {
            await RedisService.getInstance().releaseLock(FLOW_OP_LOCK_PREFIX + flowId, token);
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Failed to release Redis flow lock for flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    private async restoreClearedAssignments(
        client: BffProvisioningClient,
        cleared: BffTenantRef[],
        flowId: string,
    ): Promise<void> {
        for (const ref of cleared) {
            try {
                const result = await client.assignFlow(ref, flowId);
                if (!("tenant" in result)) {
                    Monitor.error(
                        `[ITAAS Workspace] Rollback assign skipped for ${ref.subjectType}:${ref.subjectId} flow=${flowId}: ${result.reason}`,
                    );
                    await this.enqueuePending(ref, "assign_flow", flowId);
                }
            } catch (ex) {
                Monitor.error(
                    `[ITAAS Workspace] Rollback assign failed for ${ref.subjectType}:${ref.subjectId} flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
                );
                await this.enqueuePending(ref, "assign_flow", flowId);
            }
        }
    }

    /** Clears leftover private assignments after a confirmed global publish. Throws on failure. */
    private async clearRemainingPrivateAssignments(
        client: BffProvisioningClient,
        flowId: string,
        alreadyCleared: BffTenantRef[],
    ): Promise<BffTenantRef[]> {
        const cleared = [...alreadyCleared];
        const tenantsResult = await client.listTenants();
        if (!("tenants" in tenantsResult)) {
            throw new Error("FLOW_GLOBAL_SYNC_FAILED");
        }
        for (const tenant of tenantsResult.tenants) {
            if (!Array.isArray(tenant.flowIds) || !tenant.flowIds.includes(flowId)) {
                continue;
            }
            const ref = this.subjectRefFromTenant(tenant);
            if (!ref) {
                throw new Error("FLOW_GLOBAL_SYNC_FAILED");
            }
            const removeResult = await client.removeFlow(ref, flowId);
            if (!("tenant" in removeResult)) {
                throw new Error("FLOW_GLOBAL_SYNC_FAILED");
            }
            if (!cleared.some((c) => c.subjectType === ref.subjectType && c.subjectId === ref.subjectId)) {
                cleared.push(ref);
            }
        }
        return cleared;
    }

    /** Clears all pending assign/remove for this flowId (any subject). */
    private async clearFlowPendingIntents(flowId: string): Promise<void> {
        try {
            await ItaasWorkspaceSyncPending.clearByFlowId(flowId);
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Failed to clear pending intents for flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    /**
     * Returns current globalFlowIds when the flow is confirmed global; null when unknown/unavailable.
     */
    private async readGlobalFlowIdsIfPresent(
        client: BffProvisioningClient,
        flowId: string,
    ): Promise<string[] | null> {
        try {
            if (typeof (client as any).listGlobalFlows !== "function") {
                return null;
            }
            const globals = await client.listGlobalFlows();
            if (!("globalFlowIds" in globals) || !Array.isArray(globals.globalFlowIds)) {
                return null;
            }
            if (!globals.globalFlowIds.includes(flowId)) {
                return null;
            }
            return globals.globalFlowIds;
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Could not confirm global status for flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
            );
            return null;
        }
    }

    private async assertFlowNotGlobal(flowId: string): Promise<void> {
        const client = BffProvisioningClient.getInstance();
        if (typeof (client as any).isEnabled !== "function" || !client.isEnabled()) {
            return;
        }
        if (typeof (client as any).listGlobalFlows !== "function") {
            throw new Error("BFF_UNAVAILABLE");
        }
        const globals = await client.listGlobalFlows();
        if (!("globalFlowIds" in globals) || !Array.isArray(globals.globalFlowIds)) {
            throw new Error("BFF_UNAVAILABLE");
        }
        if (globals.globalFlowIds.includes(flowId)) {
            throw new Error("FLOW_IS_GLOBAL");
        }
    }

    private subjectRefFromTenant(tenant: BffTenant): BffTenantRef | null {
        if (tenant.subjectType !== "user" && tenant.subjectType !== "organization") {
            return null;
        }
        const subjectType: BffTenantSubjectType = tenant.subjectType;
        if (subjectType === "user") {
            const key = (tenant.subjectKey || "") + "";
            const subjectId = key.startsWith("user:") ? key.slice("user:".length) : key;
            if (!subjectId) {
                return null;
            }
            return { subjectType, subjectId };
        }
        const subjectId = ((tenant.subjectKey || "") + "").trim();
        if (!subjectId) {
            return null;
        }
        return { subjectType: "organization", subjectId };
    }

    /**
     * Prefer GET-by-id `assignments` from the BFF; fall back to scanning tenants
     * when the catalog item has no assignment snapshot (older BFF or list items).
     */
    private async resolveCatalogFlowAssignments(item: BffCatalogFlowItem): Promise<ItaasAdminFlowAssignment[]> {
        if (item.assignments) {
            return item.assignments;
        }

        const client = this.requireProvisioningClient();
        const tenantsResult = await client.listTenants();
        if (!("tenants" in tenantsResult)) {
            throw new Error("BFF_UNAVAILABLE");
        }
        return this.buildAssignmentsByFlow(tenantsResult.tenants).get(item.id) || [];
    }

    private buildAssignmentsByFlow(tenants: BffTenant[]): Map<string, ItaasAdminFlowAssignment[]> {
        const map = new Map<string, ItaasAdminFlowAssignment[]>();
        for (const tenant of tenants) {
            const ref = this.subjectRefFromTenant(tenant);
            if (!ref) {
                continue;
            }
            const assignment: ItaasAdminFlowAssignment = {
                subjectType: ref.subjectType,
                subjectId: ref.subjectId,
                name: tenant.name,
                status: tenant.status,
            };
            for (const flowId of tenant.flowIds || []) {
                const list = map.get(flowId) || [];
                list.push(assignment);
                map.set(flowId, list);
            }
        }
        return map;
    }

    private async graphVisibilityByFlowIds(flowIds: string[]): Promise<Map<string, boolean>> {
        const rows = await ItaasFlowSetting.findByFlowIds(flowIds);
        const map = new Map<string, boolean>();
        for (const row of rows) {
            map.set(row.flowId, !!row.graphVisibleToUsers);
        }
        return map;
    }

    private toAdminFlowItem(
        item: BffCatalogFlowItem,
        assignments: ItaasAdminFlowAssignment[],
        includeGraph = false,
        graphVisibleToUsers = false,
    ): ItaasAdminFlowItem {
        const isGlobal = !!item.isGlobal;
        let visibility: ItaasAdminFlowVisibility = "unassigned";
        if (isGlobal) {
            visibility = "global";
        } else if (assignments.length > 0) {
            visibility = "workspace";
        }

        const result: ItaasAdminFlowItem = {
            id: item.id,
            name: item.name,
            deployed: !!item.deployed,
            type: item.type,
            category: item.category,
            updatedAt: item.updatedAt,
            isGlobal,
            visibility,
            assignments,
            graphVisibleToUsers: !!graphVisibleToUsers,
        };
        if (includeGraph && item.graph !== undefined) {
            result.graph = item.graph;
        }
        return result;
    }

    private resolvePendingOperation(raw: string): ItaasWorkspacePendingOperation {
        if (raw === "assign_flow" || raw === "remove_flow") {
            return raw;
        }
        return "sync";
    }

    private async enqueuePending(
        subject: BffTenantRef,
        operation: ItaasWorkspacePendingOperation = "sync",
        flowId = "",
    ): Promise<void> {
        try {
            await ItaasWorkspaceSyncPending.enqueue(subject.subjectType, subject.subjectId, operation, flowId);
        } catch (ex) {
            Monitor.error(
                `[ITAAS Workspace] Failed to enqueue pending ${operation} for ${subject.subjectType}:${subject.subjectId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    private async clearPending(
        subject: BffTenantRef,
        operation: ItaasWorkspacePendingOperation = "sync",
        flowId = "",
    ): Promise<void> {
        try {
            await ItaasWorkspaceSyncPending.clearBySubjectOperation(
                subject.subjectType,
                subject.subjectId,
                operation,
                flowId,
            );
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Failed to clear pending ${operation} for ${subject.subjectType}:${subject.subjectId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    private async resolveDisplayName(subject: BffTenantRef): Promise<string | undefined> {
        try {
            if (subject.subjectType === "organization") {
                const org = await Organization.findById(subject.subjectId);
                return org?.companyName || undefined;
            }

            const user = await User.findUserByUID(subject.subjectId);
            if (!user) {
                return undefined;
            }
            return user.username || user.email || undefined;
        } catch (ex) {
            Monitor.warning(
                `[ITAAS Workspace] Could not resolve display name for ${subject.subjectType}:${subject.subjectId}: ${ex instanceof Error ? ex.message : ex}`,
            );
            return undefined;
        }
    }
}
