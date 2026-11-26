// Reserved for license

"use strict";

import { OrganizationLicenseAssignment } from "../models/organization-license-assignment";
import { CatalogItem, CatalogItemType } from "../models/catalog-item";
import {
    OrganizationLicensePool,
    OrganizationLicensePoolSourceType,
    UNLIMITED_POOL_SEAT_LIMIT,
    isUnlimitedPoolSeatLimit,
    normalizePoolSeatLimit,
} from "../models/organization-license-pool";
import { BillingCycle, ItemPlan } from "../models/item-plan";
import { PlanComponent } from "../models/plan-component";
import { PlanPricing } from "../models/plan-pricing";
import { SubscribableType, Subscription, SubscriptionStatus } from "../models/subscription";
import { Monitor } from "../monitor";
import { OrganizationService } from "./organization-service";
import { SubscriptionService } from "./subscription-service";

/**
 * Derives and maintains organization license pools from billing subscriptions.
 */
export class OrganizationLicensePoolService {
    private static instance: OrganizationLicensePoolService | null = null;

    public static getInstance(): OrganizationLicensePoolService {
        if (!OrganizationLicensePoolService.instance) {
            OrganizationLicensePoolService.instance = new OrganizationLicensePoolService();
        }
        return OrganizationLicensePoolService.instance;
    }

    /** Pool and source subscription must both be Active. */
    public async isPoolAssignable(pool: OrganizationLicensePool): Promise<boolean> {
        if (!pool || pool.status !== SubscriptionStatus.ACTIVE) {
            return false;
        }
        const source = await Subscription.findById(pool.sourceSubscriptionId);
        return !!source && source.status === SubscriptionStatus.ACTIVE;
    }

    /**
     * Upserts pools from a billing subscription and reconciles seat counts.
     * @returns Assignments deactivated when over limit
     */
    public async syncPoolsForSubscription(source: Subscription): Promise<number> {
        if (!source?.organizationId || !source.id) {
            return 0;
        }

        if (source.status !== SubscriptionStatus.ACTIVE) {
            await this.tearDownPoolsForSubscription(source);
            return 0;
        }

        if (source.subscribableType === SubscribableType.ITEM) {
            await this.syncItemPool(source);
        } else if (source.subscribableType === SubscribableType.PLAN) {
            await this.syncPlanPools(source);
        }

        return this.reconcilePoolsForSubscription(source.id);
    }

    public async tearDownPoolsForSubscription(source: Subscription): Promise<void> {
        if (!source?.id) {
            return;
        }

        const pools = await OrganizationLicensePool.findBySourceSubscriptionId(source.id);
        for (const pool of pools) {
            await this.cancelPool(pool);
        }
    }

    /**
     * Deactivates the newest assignments first when over the pool seat limit.
     */
    public async reconcilePoolAssignments(pool: OrganizationLicensePool): Promise<number> {
        if (!pool?.id || isUnlimitedPoolSeatLimit(pool.seatLimit)) {
            return 0;
        }

        const assignments = await OrganizationLicenseAssignment.findActiveByPool(pool.id);
        const excess = assignments.length - pool.seatLimit;
        if (excess <= 0) {
            return 0;
        }

        let revoked = 0;
        for (let i = 0; i < excess; i++) {
            assignments[i].isActive = false;
            await assignments[i].save();
            revoked++;
        }

        if (revoked > 0 && pool.organizationId) {
            Monitor.warning(
                `[LicensePool] Deactivated ${revoked} excess assignment(s) for pool ${pool.id} (${pool.seatLimit} seats)`,
            );
            try {
                await OrganizationService.getInstance().notifyOrganizationAdmins(pool.organizationId, {
                    type: "seats_reduced",
                    subscriptionId: pool.sourceSubscriptionId,
                    info: { revokedCount: revoked, maxSeats: pool.seatLimit },
                });
            } catch (ex) {
                Monitor.warning(
                    `[LicensePool] Error notifying org admins: ${ex instanceof Error ? ex.message : ex}`,
                );
            }
        }

        return revoked;
    }

    public async backfillOrganization(organizationId: string): Promise<{
        poolsCreated: number;
        assignmentsLinked: number;
        skipped: number;
    }> {
        let poolsCreated = 0;
        let assignmentsLinked = 0;
        let skipped = 0;

        const subs = await Subscription.findActiveByOrganization(organizationId);
        for (const sub of subs) {
            if (sub.subscribableType !== SubscribableType.ITEM && sub.subscribableType !== SubscribableType.PLAN) {
                continue;
            }
            const beforeCount = (await OrganizationLicensePool.findBySourceSubscriptionId(sub.id)).length;
            await this.syncPoolsForSubscription(sub);
            const afterCount = (await OrganizationLicensePool.findBySourceSubscriptionId(sub.id)).length;
            if (afterCount > beforeCount) {
                poolsCreated += afterCount - beforeCount;
            }
        }

        const assignments = await OrganizationLicenseAssignment.findByOrganization(organizationId);
        for (const assignment of assignments) {
            if (assignment.licensePoolId) {
                continue;
            }
            const sub = await Subscription.findById(assignment.subscriptionId);
            if (!sub || sub.organizationId !== organizationId) {
                skipped++;
                continue;
            }
            if (sub.subscribableType !== SubscribableType.ITEM) {
                Monitor.warning(
                    `[LicensePool] Skipped legacy plan-level assignment ${assignment.id} (subscription ${sub.id})`,
                );
                skipped++;
                continue;
            }

            const pools = await OrganizationLicensePool.findBySourceSubscriptionId(sub.id);
            const pool = pools.find((p) => p.sourceType === OrganizationLicensePoolSourceType.ITEM) || pools[0];
            if (!pool) {
                skipped++;
                continue;
            }

            assignment.licensePoolId = pool.id;
            assignment.subscriptionId = pool.sourceSubscriptionId;
            await assignment.save();
            assignmentsLinked++;
        }

        return { poolsCreated, assignmentsLinked, skipped };
    }

    private async reconcilePoolsForSubscription(sourceSubscriptionId: string): Promise<number> {
        const pools = await OrganizationLicensePool.findBySourceSubscriptionId(sourceSubscriptionId);
        let total = 0;
        for (const pool of pools) {
            if (pool.status === SubscriptionStatus.ACTIVE) {
                total += await this.reconcilePoolAssignments(pool);
            }
        }
        return total;
    }

    private async syncItemPool(source: Subscription): Promise<void> {
        const itemPlan = await ItemPlan.findById(source.subscribableId);
        if (!itemPlan) {
            Monitor.warning(`[LicensePool] ItemPlan ${source.subscribableId} not found for subscription ${source.id}`);
            return;
        }

        await this.upsertPool({
            organizationId: source.organizationId,
            catalogItemId: itemPlan.itemId,
            itemPlanId: itemPlan.id,
            sourceSubscriptionId: source.id,
            sourceType: OrganizationLicensePoolSourceType.ITEM,
            seatLimit: await this.resolveSeatLimitForCatalogItem(itemPlan.itemId, source.getCurrentSeatLimit()),
            status: source.status,
            billingCycle: (source.billingCycle || itemPlan.billingCycle) as BillingCycle,
        });
    }

    private async syncPlanPools(source: Subscription): Promise<void> {
        const pricing = await PlanPricing.findById(source.subscribableId);
        if (!pricing) {
            Monitor.warning(`[LicensePool] PlanPricing ${source.subscribableId} not found for subscription ${source.id}`);
            return;
        }

        const billingCycle = (source.billingCycle || pricing.billingCycle) as BillingCycle;
        const planQuantity = source.getCurrentSeatLimit();
        const components = await PlanComponent.findByPlanId(pricing.planId);
        const activeCatalogIds = new Set<string>();

        for (const component of components) {
            if (!component.catalogItemId) {
                continue;
            }
            activeCatalogIds.add(component.catalogItemId);

            const itemPlan = await ItemPlan.findByItemAndCycle(component.catalogItemId, billingCycle);
            if (!itemPlan) {
                Monitor.warning(
                    `[LicensePool] No ItemPlan for item ${component.catalogItemId} cycle ${billingCycle} (subscription ${source.id})`,
                );
                continue;
            }

            const billedSeatLimit = (component.quantity || 1) * planQuantity;
            await this.upsertPool({
                organizationId: source.organizationId,
                catalogItemId: component.catalogItemId,
                itemPlanId: itemPlan.id,
                sourceSubscriptionId: source.id,
                sourceType: OrganizationLicensePoolSourceType.PLAN,
                seatLimit: await this.resolveSeatLimitForCatalogItem(component.catalogItemId, billedSeatLimit),
                status: source.status,
                billingCycle,
            });
        }

        const existingPools = await OrganizationLicensePool.findBySourceSubscriptionId(source.id);
        for (const pool of existingPools) {
            if (pool.sourceType !== OrganizationLicensePoolSourceType.PLAN || activeCatalogIds.has(pool.catalogItemId)) {
                continue;
            }
            await this.cancelPool(pool);
        }
    }

    private async upsertPool(data: {
        organizationId: string;
        catalogItemId: string;
        itemPlanId: string;
        sourceSubscriptionId: string;
        sourceType: OrganizationLicensePoolSourceType | string;
        seatLimit: number;
        status: string;
        billingCycle: string;
    }): Promise<OrganizationLicensePool> {
        const now = Date.now();
        let pool = await OrganizationLicensePool.findBySourceAndCatalogItem(
            data.sourceSubscriptionId,
            data.catalogItemId,
        );

        if (pool) {
            pool.itemPlanId = data.itemPlanId;
            pool.sourceType = data.sourceType;
            pool.seatLimit = normalizePoolSeatLimit(data.seatLimit);
            pool.status = data.status;
            pool.billingCycle = data.billingCycle;
            pool.updatedAt = now;
            await pool.save();
        } else {
            pool = await OrganizationLicensePool.createPool(data);
        }

        return pool;
    }

    private async resolveSeatLimitForCatalogItem(catalogItemId: string, billedSeatLimit: number): Promise<number> {
        const catalogItem = await CatalogItem.findById(catalogItemId);
        if (!catalogItem) {
            return normalizePoolSeatLimit(billedSeatLimit);
        }
        if (
            catalogItem.type === CatalogItemType.RECURRING_SERVICE ||
            catalogItem.type === CatalogItemType.ITAAS_PLATFORM
        ) {
            return UNLIMITED_POOL_SEAT_LIMIT;
        }
        return normalizePoolSeatLimit(billedSeatLimit);
    }

    private async cancelPool(pool: OrganizationLicensePool): Promise<void> {
        if (pool.status !== SubscriptionStatus.CANCELLED) {
            pool.status = SubscriptionStatus.CANCELLED;
            pool.updatedAt = Date.now();
            await pool.save();
        }

        const assignments = await OrganizationLicenseAssignment.findActiveByPool(pool.id);
        for (const assignment of assignments) {
            assignment.isActive = false;
            await assignment.save();
        }
    }

    /**
     * Adds productName to license assignment API rows (catalog item via pool, else billing subscription).
     */
    public async toLicenseAssignmentApiRows(
        assignments: OrganizationLicenseAssignment[],
    ): Promise<Record<string, unknown>[]> {
        if (!assignments.length) {
            return [];
        }

        const poolIds = Array.from(new Set(
            assignments.map((assignment) => assignment.licensePoolId).filter((id) => !!id),
        ));
        const pools = (await Promise.all(poolIds.map((id) => OrganizationLicensePool.findById(id))))
            .filter((pool): pool is OrganizationLicensePool => !!pool);
        const poolById = new Map(pools.map((pool) => [pool.id, pool]));

        const catalogItemIds = Array.from(new Set(pools.map((pool) => pool.catalogItemId).filter((id) => !!id)));
        const catalogItems = await CatalogItem.findByIds(catalogItemIds);
        const catalogNameById = new Map(catalogItems.map((item) => [item.id, (item.name || "").trim()]));

        const subscriptionIdsForFallback = Array.from(new Set(
            assignments
                .filter((assignment) => {
                    const pool = assignment.licensePoolId ? poolById.get(assignment.licensePoolId) : undefined;
                    const fromPool = pool ? (catalogNameById.get(pool.catalogItemId) || "") : "";
                    return !fromPool && !!assignment.subscriptionId;
                })
                .map((assignment) => assignment.subscriptionId),
        ));
        const subscriptionNameById = new Map<string, string>();
        if (subscriptionIdsForFallback.length > 0) {
            const subscriptions = (
                await Promise.all(subscriptionIdsForFallback.map((id) => Subscription.findById(id)))
            ).filter((sub): sub is Subscription => !!sub);
            const enriched = await SubscriptionService.getInstance().attachSubscribableNames(subscriptions);
            for (const row of enriched) {
                if (row.id) {
                    subscriptionNameById.set(row.id, (row.subscribableName || "").trim());
                }
            }
        }

        return assignments.map((assignment) => {
            const data = assignment.toObject() as Record<string, unknown>;
            const pool = assignment.licensePoolId ? poolById.get(assignment.licensePoolId) : undefined;
            let productName = pool ? (catalogNameById.get(pool.catalogItemId) || "") : "";
            if (!productName && assignment.subscriptionId) {
                productName = subscriptionNameById.get(assignment.subscriptionId) || "";
            }
            data.productName = productName;
            return data;
        });
    }
}
