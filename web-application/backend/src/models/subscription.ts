// Subscription - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { CatalogItem, CatalogItemType } from "./catalog-item";
import { ItemPlan } from "./item-plan";
import { PlanPricing } from "./plan-pricing";
import { createRandomUID } from "../utils/text-utils";

const DASHBOARD_SUBSCRIPTION_SCAN_LIMIT = 10000;

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "subscription";
const PRIMARY_KEY = "id";

export interface SubscriptionTrendMonthlyRow {
    month: string;
    created: number;
    cancelled: number;
}

export interface TopSubscribedCatalogItemRow {
    catalogItemId: string;
    name: string;
    type: string;
    status: string;
    subscriptionCount: number;
}

export interface TopSubscribedCatalogItemsResult {
    items: TopSubscribedCatalogItemRow[];
    total: number;
}

export enum SubscriptionBillingCycle {
    MONTHLY = "monthly",
    ANNUAL = "annual",
    COMPLETE = "complete"
}

export enum SubscriptionStatus {
    ACTIVE = "Active",
    SCHEDULED_CANCELLATION = "Scheduled Cancellation",
    SUSPENDED = "Suspended",
    PAST_DUE = "Past Due",
    CANCELLED = "Cancelled",
    COMPLETE = "Complete",
    PENDING = "Pending",
    PENDING_PAYMENT = "Pending Payment",
}

export enum SubscribableType {
    ITEM = "item",
    PLAN = "plan",
}

export type SubscriptionCategoryFilter = "plan" | "service" | "product";

export type SubscriptionDisplayStatusFilter = "active" | "pending" | "cancelled";

export const SUBSCRIPTION_MRR_ELIGIBLE_STATUSES: SubscriptionStatus[] = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.SCHEDULED_CANCELLATION,
];

export interface SubscriptionUserListFilters {
    category?: SubscriptionCategoryFilter;
    billingCycle?: string;
    displayStatus?: SubscriptionDisplayStatusFilter;
}

export interface SubscriptionAdminListFilters {
    status?: string;
    statuses?: SubscriptionStatus[];
    billingCycle?: string;
    createdFrom?: number;
    createdTo?: number;
    category?: SubscriptionCategoryFilter;
}

export interface SubscriptionStatusCategoryCounts {
    all: number;
    plan: number;
    service: number;
    product: number;
}

const NO_MATCH_SUBSCRIBABLE_ID = "__no_match__";

async function buildCategoryFilter(category: SubscriptionCategoryFilter): Promise<DataFilter> {
    if (category === "plan") {
        return DataFilter.equals("subscribableType", SubscribableType.PLAN);
    }

    const catalogTypes = category === "service"
        ? [CatalogItemType.RECURRING_SERVICE, CatalogItemType.ITAAS_PLATFORM]
        : [CatalogItemType.DIGITAL_PRODUCT];
    const itemIds = await CatalogItem.findIdsByTypes(catalogTypes);
    const itemPlanIds = await ItemPlan.findIdsByItemIds(itemIds);

    if (!itemPlanIds.length) {
        return DataFilter.equals("subscribableId", NO_MATCH_SUBSCRIBABLE_ID);
    }

    return DataFilter.and(
        DataFilter.equals("subscribableType", SubscribableType.ITEM),
        DataFilter.into("subscribableId", itemPlanIds),
    );
}

function buildDisplayStatusFilter(displayStatus: SubscriptionDisplayStatusFilter): DataFilter {
    switch (displayStatus) {
        case "active":
            return DataFilter.or(
                DataFilter.and(
                    DataFilter.into("status", [SubscriptionStatus.ACTIVE, SubscriptionStatus.COMPLETE]),
                    DataFilter.equals("cancelAtPeriodEnd", false),
                ),
                DataFilter.equals("status", SubscriptionStatus.SCHEDULED_CANCELLATION),
                DataFilter.equals("cancelAtPeriodEnd", true),
            );
        case "pending":
            return DataFilter.or(
                DataFilter.into("status", [
                    SubscriptionStatus.PENDING,
                    SubscriptionStatus.PENDING_PAYMENT,
                    SubscriptionStatus.PAST_DUE,
                    SubscriptionStatus.SCHEDULED_CANCELLATION,
                ]),
                DataFilter.equals("cancelAtPeriodEnd", true),
            );
        case "cancelled":
            return DataFilter.equals("status", SubscriptionStatus.CANCELLED);
        default:
            return DataFilter.any();
    }
}

async function buildUserListFilter(uid: string, filters: SubscriptionUserListFilters): Promise<DataFilter> {
    const parts: DataFilter[] = [DataFilter.equals("uid", uid)];

    if (filters.category) {
        parts.push(await buildCategoryFilter(filters.category));
    }

    if (filters.billingCycle) {
        parts.push(DataFilter.equals("billingCycle", filters.billingCycle));
    }

    if (filters.displayStatus) {
        parts.push(buildDisplayStatusFilter(filters.displayStatus));
    }

    if (parts.length === 1) {
        return parts[0];
    }

    return DataFilter.and(...parts);
}

async function buildAdminListFilter(filters: SubscriptionAdminListFilters): Promise<DataFilter> {
    const parts: DataFilter[] = [];

    if (filters.statuses && filters.statuses.length > 0) {
        parts.push(DataFilter.into("status", filters.statuses));
    } else if (filters.status) {
        parts.push(DataFilter.equals("status", filters.status));
    }
    if (filters.billingCycle) {
        parts.push(DataFilter.equals("billingCycle", filters.billingCycle));
    }
    if (filters.createdFrom && filters.createdFrom > 0) {
        parts.push(DataFilter.greaterOrEquals("createdAt", filters.createdFrom));
    }
    if (filters.createdTo && filters.createdTo > 0) {
        parts.push(DataFilter.lessOrEquals("createdAt", filters.createdTo));
    }
    if (filters.category) {
        parts.push(await buildCategoryFilter(filters.category));
    }

    if (parts.length === 0) {
        return DataFilter.any();
    }
    if (parts.length === 1) {
        return parts[0];
    }
    return DataFilter.and(...parts);
}

/* db-index: uid */
/* db-index: organizationId */
/* db-index: subscribableId */
/* db-index: status */
/* db-index: stripeSubscriptionId */
/* db-index: succeedingSubscriptionId */

export class Subscription extends DataModel {
    public static readonly finder = new DataFinder<Subscription, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Subscription>) => new Subscription(data));

    public static async findById(id: string): Promise<Subscription> {
        return Subscription.finder.findByKey(id);
    }

    public static async countByUser(uid: string, filters: SubscriptionUserListFilters = {}): Promise<number> {
        return Subscription.finder.count(await buildUserListFilter(uid, filters));
    }

    public static async findByUser(uid: string, skip = 0, limit?: number, filters: SubscriptionUserListFilters = {}): Promise<Subscription[]> {
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit !== undefined) { options.setMaxRows(limit); }
        return Subscription.finder.find(await buildUserListFilter(uid, filters), OrderBy.desc("createdAt"), options);
    }

    public static async findByStatus(status: SubscriptionStatus): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.equals("status", status));
    }

    /**
     * Finds active subscriptions for a user by subscribable type and id.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type (item or plan)
     * @param subscribableId - Subscribable identifier (ItemPlan.id or PlanPricing.id)
     * @returns Active subscriptions matching the criteria
     */
    public static async findActiveByUserAndSubscribable(uid: string, subscribableType: SubscribableType, subscribableId: string): Promise<Subscription[]> {
        const res = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.equals("subscribableId", subscribableId),
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
        ));
        return res || [];
    }

    /**
     * Returns all non-cancelled (active or pending) subscriptions for a user and subscribable.
     * Used to prevent duplicate subscriptions, including those awaiting checkout completion.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type (item or plan)
     * @param subscribableId - Subscribable identifier (ItemPlan.id or PlanPricing.id)
     * @returns Non-cancelled subscriptions matching the criteria
     */
    public static async findNonCancelledByUserAndSubscribable(uid: string, subscribableType: SubscribableType, subscribableId: string): Promise<Subscription[]> {
        const res = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.equals("subscribableId", subscribableId),
            DataFilter.into("status", [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]),
        ));
        return res || [];
    }

    /**
     * Returns all non-cancelled org subscriptions (active, pending, or pending payment).
     */
    public static async findNonCancelledByOrganization(organizationId: string): Promise<Subscription[]> {
        return Subscription.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.into("status", [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PENDING,
                    SubscriptionStatus.PENDING_PAYMENT,
                ]),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findNonCancelledByOrganizationAndSubscribable(
        organizationId: string,
        subscribableType: SubscribableType,
        subscribableId: string,
    ): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("organizationId", organizationId),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.equals("subscribableId", subscribableId),
            DataFilter.into("status", [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PENDING,
                SubscriptionStatus.PENDING_PAYMENT,
            ]),
        ));
    }

    public static async hasNonCancelledByOrganizationAndSubscribableIds(
        organizationId: string,
        subscribableType: SubscribableType,
        subscribableIds: string[],
    ): Promise<boolean> {
        if (subscribableIds.length === 0) {
            return false;
        }
        const rows = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("organizationId", organizationId),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.into("subscribableId", subscribableIds),
            DataFilter.into("status", [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PENDING,
                SubscriptionStatus.PENDING_PAYMENT,
            ]),
        ));
        return rows.length > 0;
    }

    public static async hasActiveByUserAndSubscribableIds(uid: string, subscribableType: SubscribableType, subscribableIds: string[]): Promise<boolean> {
        if (subscribableIds.length === 0) {
            return false;
        }
        const rows = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.into("subscribableId", subscribableIds),
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
        ));
        return rows.length > 0;
    }

    /**
     * Returns true when the user has an active personal subscription (no organizationId)
     * for any of the given subscribable identifiers.
     * Organizational subscriptions owned by the same uid are excluded.
     */
    public static async hasActivePersonalByUserAndSubscribableIds(
        uid: string,
        subscribableType: SubscribableType,
        subscribableIds: string[],
    ): Promise<boolean> {
        if (subscribableIds.length === 0) {
            return false;
        }
        const rows = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.into("subscribableId", subscribableIds),
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
            DataFilter.isNull("organizationId"),
        ));
        return rows.length > 0;
    }

    /**
     * Returns true when the user has at least one non-cancelled (active or pending)
     * subscription for any of the given subscribable identifiers.
     * Used to prevent subscribing to a different pricing of an already-subscribed plan.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type (item or plan)
     * @param subscribableIds - List of subscribable identifiers to check
     * @returns True if a matching non-cancelled subscription exists
     */
    public static async hasNonCancelledByUserAndSubscribableIds(uid: string, subscribableType: SubscribableType, subscribableIds: string[]): Promise<boolean> {
        if (subscribableIds.length === 0) {
            return false;
        }
        const rows = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableType", subscribableType),
            DataFilter.into("subscribableId", subscribableIds),
            DataFilter.into("status", [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]),
        ));
        return rows.length > 0;
    }

    /**
     * Finds pending subscriptions for a user by subscribable identifier.
     * @param uid - User identifier
     * @param subscribableId - Subscribable identifier
     * @returns Pending subscriptions matching the criteria
     */
    public static async findPendingByUserAndSubscribable(uid: string, subscribableId: string): Promise<Subscription[]> {
        const res = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableId", subscribableId),
            DataFilter.equals("status", SubscriptionStatus.PENDING),
        ));
        return res || [];
    }

    /**
     * Finds pending subscriptions for a user where subscribableId matches either of two values.
     * Used when scheduling a plan change to detect existing pending records for current or target plan.
     * @param uid - User identifier
     * @param subscribableIdA - First subscribable identifier
     * @param subscribableIdB - Second subscribable identifier
     * @returns Pending subscriptions matching either subscribable
     */
    public static async findPendingByUserAndEitherSubscribable(uid: string, subscribableIdA: string, subscribableIdB: string): Promise<Subscription[]> {
        const res = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.or(
                DataFilter.equals("subscribableId", subscribableIdA),
                DataFilter.equals("subscribableId", subscribableIdB),
            ),
            DataFilter.equals("status", SubscriptionStatus.PENDING),
        ));
        return res || [];
    }

    /**
     * Finds all subscriptions for a user by subscribable identifier, regardless of status.
     * @param uid - User identifier
     * @param subscribableId - Subscribable identifier
     * @returns All subscriptions matching the criteria
     */
    public static async findByUserAndSubscribable(uid: string, subscribableId: string): Promise<Subscription[]> {
        const res = await Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.equals("subscribableId", subscribableId),
        ));
        return res || [];
    }

    public static async findRenewalNoticesDue(): Promise<Subscription[]> {
        const now = Date.now();
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
            DataFilter.greaterThan("nextNoticeAt", 0),
            DataFilter.lessOrEquals("nextNoticeAt", now),
        ));
    }

    public static async findAutoRenewableSubscriptions(): Promise<Subscription[]> {
        const now = Date.now();
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
            DataFilter.notEquals("billingCycle", "complete"),
            DataFilter.equals("stripeSubscriptionId", ""),
            DataFilter.greaterThan("currentPeriodEnd", 0),
            DataFilter.lessOrEquals("currentPeriodEnd", now),
        ));
    }

    /**
     * Returns checkout-abandoned subscriptions without a Stripe reference,
     * still in PENDING or PENDING_PAYMENT and older than the cutoff timestamp.
     */
    public static async findAbandonedCheckoutSubscriptions(cutoffTimestamp: number): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.and(
            DataFilter.into("status", [SubscriptionStatus.PENDING, SubscriptionStatus.PENDING_PAYMENT]),
            DataFilter.equals("stripeSubscriptionId", ""),
            DataFilter.greaterThan("updatedAt", 0),
            DataFilter.lessOrEquals("updatedAt", cutoffTimestamp),
        ));
    }

    /**
     * Returns all SUSPENDED subscriptions with an active grace period that has already expired.
     * Used by the periodic grace period expiration task to cancel them.
     */
    public static async findExpiredGracePeriodSuspendedSubscriptions(): Promise<Subscription[]> {
        const now = Date.now();
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("status", SubscriptionStatus.SUSPENDED),
            DataFilter.greaterThan("gracePeriodEnd", 0),
            DataFilter.lessOrEquals("gracePeriodEnd", now),
        ));
    }

    /**
     * Returns all subscriptions eligible for Stripe state synchronization:
     * those with a stripeSubscriptionId in an active-ish status.
     * Used by the periodic Stripe sync task.
     */
    public static async findSyncableWithStripe(): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.and(
            DataFilter.into("status", [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.SCHEDULED_CANCELLATION,
                SubscriptionStatus.PAST_DUE,
            ]),
            DataFilter.notEquals("stripeSubscriptionId", ""),
        ));
    }

    public static async countByOrganization(organizationId: string): Promise<number> {
        return Subscription.finder.count(DataFilter.equals("organizationId", organizationId));
    }

    public static async findByOrganizationPaginated(organizationId: string, skip: number, limit: number): Promise<Subscription[]> {
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit > 0) { options.setMaxRows(limit); }
        return Subscription.finder.find(DataFilter.equals("organizationId", organizationId), OrderBy.desc("createdAt"), options);
    }

    public static async findByOrganization(organizationId: string): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.equals("organizationId", organizationId), OrderBy.nothing(), SelectOptions.configure());
    }

    public static async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription> {
        const rows = await Subscription.finder.find(
            DataFilter.equals("stripeSubscriptionId", stripeSubscriptionId),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
        return rows[0] || null;
    }

    public static async findActiveByUser(userId: string): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", userId),
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
        ));
    }

    public static async findActiveByOrganization(organizationId: string): Promise<Subscription[]> {
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("organizationId", organizationId),
            DataFilter.equals("status", SubscriptionStatus.ACTIVE),
        ));
    }

    /**
     * Personal subscriptions (no organizationId) for a user in any of the given statuses.
     * Used for subject-level entitlement checks (e.g. ITAAS workspace sync).
     */
    public static async findPersonalByUserAndStatuses(uid: string, statuses: SubscriptionStatus[]): Promise<Subscription[]> {
        if (!uid || statuses.length === 0) {
            return [];
        }
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("uid", uid),
            DataFilter.isNull("organizationId"),
            DataFilter.into("status", statuses),
        ));
    }

    /**
     * Organization subscriptions in any of the given statuses.
     * Used for subject-level entitlement checks (e.g. ITAAS workspace sync).
     */
    public static async findByOrganizationAndStatuses(
        organizationId: string,
        statuses: SubscriptionStatus[],
    ): Promise<Subscription[]> {
        if (!organizationId || statuses.length === 0) {
            return [];
        }
        return Subscription.finder.find(DataFilter.and(
            DataFilter.equals("organizationId", organizationId),
            DataFilter.into("status", statuses),
        ));
    }

    public static async countForAdmin(filters: SubscriptionAdminListFilters): Promise<number> {
        return Subscription.finder.count(await buildAdminListFilter(filters));
    }

    public static async findForAdmin(filters: SubscriptionAdminListFilters, skip: number, limit: number): Promise<Subscription[]> {
        const options = SelectOptions.configure();
        if (skip > 0) {
            options.setFirstRow(skip);
        }
        if (limit > 0) {
            options.setMaxRows(limit);
        }
        return Subscription.finder.find(await buildAdminListFilter(filters), OrderBy.desc("createdAt"), options);
    }

    public static async countStatusDistributionForAdmin(): Promise<Record<string, number>> {
        const distribution: Record<string, number> = {};
        const statuses = Object.values(SubscriptionStatus);
        await Promise.all(statuses.map(async status => {
            distribution[status] = await Subscription.finder.count(DataFilter.equals("status", status));
        }));
        return distribution;
    }

    public static async findMrrEligible(limit = DASHBOARD_SUBSCRIPTION_SCAN_LIMIT): Promise<Subscription[]> {
        return Subscription.finder.find(
            DataFilter.and(
                DataFilter.into("status", SUBSCRIPTION_MRR_ELIGIBLE_STATUSES),
            ),
            OrderBy.nothing(),
            SelectOptions.configure().setMaxRows(limit),
        );
    }

    public static async findByIds(ids: string[]): Promise<Subscription[]> {
        if (!ids.length) {
            return [];
        }
        return Subscription.finder.find(
            DataFilter.into("id", ids),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async countByStatuses(statuses: SubscriptionStatus[]): Promise<number> {
        if (!statuses.length) {
            return 0;
        }
        return Subscription.finder.count(DataFilter.into("status", statuses));
    }

    public static async calculateCurrentMrrCents(): Promise<number> {
        const activeSubscriptions = await Subscription.findMrrEligible();

        const itemPlanIds = activeSubscriptions
            .filter(s => s.subscribableType === SubscribableType.ITEM)
            .map(s => s.subscribableId)
            .filter((v, i, a) => a.indexOf(v) === i);
        const planPricingIds = activeSubscriptions
            .filter(s => s.subscribableType === SubscribableType.PLAN)
            .map(s => s.subscribableId)
            .filter((v, i, a) => a.indexOf(v) === i);

        const [itemPlans, planPricings] = await Promise.all([
            itemPlanIds.length > 0 ? ItemPlan.findByIds(itemPlanIds) : Promise.resolve([]),
            planPricingIds.length > 0 ? PlanPricing.findByIds(planPricingIds) : Promise.resolve([]),
        ]);

        const itemPriceMap = new Map<string, { monthly: number; annual: number }>();
        for (const ip of itemPlans) {
            const existing = itemPriceMap.get(ip.id) || { monthly: 0, annual: 0 };
            if (ip.billingCycle === "monthly") {
                existing.monthly = ip.priceCents;
            } else if (ip.billingCycle === "annual") {
                existing.annual = ip.priceCents;
            }
            itemPriceMap.set(ip.id, existing);
        }

        const planPriceMap = new Map<string, { monthly: number; annual: number }>();
        for (const pp of planPricings) {
            const existing = planPriceMap.get(pp.id) || { monthly: 0, annual: 0 };
            if (pp.billingCycle === "monthly") {
                existing.monthly = pp.priceCents;
            } else if (pp.billingCycle === "annual") {
                existing.annual = pp.priceCents;
            }
            planPriceMap.set(pp.id, existing);
        }

        let currentMrr = 0;
        for (const sub of activeSubscriptions) {
            const quantity = sub.quantity || 1;
            let monthlyValue = 0;

            if (sub.subscribableType === SubscribableType.ITEM) {
                const prices = itemPriceMap.get(sub.subscribableId);
                if (!prices) { continue; }
                if (sub.billingCycle === "monthly") {
                    monthlyValue = prices.monthly * quantity;
                } else if (sub.billingCycle === "annual") {
                    monthlyValue = Math.round((prices.annual * quantity) / 12);
                }
            } else if (sub.subscribableType === SubscribableType.PLAN) {
                const prices = planPriceMap.get(sub.subscribableId);
                if (!prices) { continue; }
                if (sub.billingCycle === "monthly") {
                    monthlyValue = prices.monthly * quantity;
                } else if (sub.billingCycle === "annual") {
                    monthlyValue = Math.round((prices.annual * quantity) / 12);
                }
            }

            currentMrr += monthlyValue;
        }

        return currentMrr;
    }

    public static async findTopSubscribedCatalogItems(displayLimit: number): Promise<TopSubscribedCatalogItemsResult> {
        const subscriptions = await Subscription.finder.find(
            DataFilter.and(
                DataFilter.equals("subscribableType", SubscribableType.ITEM),
                DataFilter.into("status", SUBSCRIPTION_MRR_ELIGIBLE_STATUSES),
            ),
            OrderBy.nothing(),
            SelectOptions.configure().setMaxRows(DASHBOARD_SUBSCRIPTION_SCAN_LIMIT),
        );

        const countByItemPlanId = new Map<string, number>();
        for (const sub of subscriptions) {
            const planId = sub.subscribableId;
            countByItemPlanId.set(planId, (countByItemPlanId.get(planId) || 0) + (sub.quantity || 1));
        }

        const itemPlanIds = Array.from(countByItemPlanId.keys());
        const itemPlans = itemPlanIds.length > 0 ? await ItemPlan.findByIds(itemPlanIds) : [];

        const countByCatalogItemId = new Map<string, number>();
        for (const plan of itemPlans) {
            const planCount = countByItemPlanId.get(plan.id) || 0;
            countByCatalogItemId.set(plan.itemId, (countByCatalogItemId.get(plan.itemId) || 0) + planCount);
        }

        const sorted = Array.from(countByCatalogItemId.entries())
            .sort((a, b) => b[1] - a[1]);
        const total = sorted.length;
        const topEntries = sorted.slice(0, Math.max(0, displayLimit));
        const catalogItemIds = topEntries.map(([catalogItemId]) => catalogItemId);
        const catalogItems = catalogItemIds.length > 0 ? await CatalogItem.findByIds(catalogItemIds) : [];
        const catalogMap = new Map(catalogItems.map(item => [item.id, item]));

        const items = topEntries.map(([catalogItemId, subscriptionCount]) => {
            const catalogItem = catalogMap.get(catalogItemId);
            return {
                catalogItemId,
                name: catalogItem?.name || catalogItemId,
                type: catalogItem?.type || "",
                status: catalogItem?.status || "",
                subscriptionCount,
            };
        });

        return { items, total };
    }

    private static async countCancelledUpdatedInRange(dateFrom: number, dateTo: number): Promise<number> {
        return Subscription.finder.count(DataFilter.and(
            DataFilter.equals("status", SubscriptionStatus.CANCELLED),
            DataFilter.greaterOrEquals("updatedAt", Math.floor(dateFrom)),
            DataFilter.lessThan("updatedAt", Math.floor(dateTo)),
        ));
    }

    public static async aggregateTrendMonthly(rangeStart: number, rangeEnd: number): Promise<SubscriptionTrendMonthlyRow[]> {
        const monthRanges = Subscription.enumerateMonthRanges(rangeStart, rangeEnd);
        return Promise.all(monthRanges.map(async ({ month, dateFrom, dateTo }) => {
            const createdTo = dateTo > dateFrom ? dateTo - 1 : dateFrom;
            const [created, cancelled] = await Promise.all([
                Subscription.countForAdmin({ createdFrom: dateFrom, createdTo }),
                Subscription.countCancelledUpdatedInRange(dateFrom, dateTo),
            ]);
            return { month, created, cancelled };
        }));
    }

    private static enumerateMonthRanges(
        rangeStart: number,
        rangeEnd: number,
    ): Array<{ month: string; dateFrom: number; dateTo: number }> {
        const months: Array<{ month: string; dateFrom: number; dateTo: number }> = [];
        const cursor = new Date(rangeStart);
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);

        while (cursor.getTime() < rangeEnd) {
            const dateFrom = Math.max(cursor.getTime(), rangeStart);
            const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            const dateTo = Math.min(nextMonth.getTime(), rangeEnd);
            months.push({
                month: Subscription.monthLabelFromTimestamp(dateFrom),
                dateFrom,
                dateTo,
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        return months;
    }

    private static monthLabelFromTimestamp(timestamp: number): string {
        const date = new Date(timestamp || 0);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    }

    public static async countCategoryCountsByUser(
        uid: string,
        baseFilters: SubscriptionUserListFilters,
    ): Promise<SubscriptionStatusCategoryCounts> {
        const [all, plan, service, product] = await Promise.all([
            Subscription.countByUser(uid, baseFilters),
            Subscription.countByUser(uid, { ...baseFilters, category: "plan" }),
            Subscription.countByUser(uid, { ...baseFilters, category: "service" }),
            Subscription.countByUser(uid, { ...baseFilters, category: "product" }),
        ]);
        return { all, plan, service, product };
    }

    public static async countCategoryCountsForAdmin(
        baseFilters: Omit<SubscriptionAdminListFilters, "category">,
    ): Promise<SubscriptionStatusCategoryCounts> {
        const [all, plan, service, product] = await Promise.all([
            Subscription.countForAdmin({ ...baseFilters }),
            Subscription.countForAdmin({ ...baseFilters, category: "plan" }),
            Subscription.countForAdmin({ ...baseFilters, category: "service" }),
            Subscription.countForAdmin({ ...baseFilters, category: "product" }),
        ]);
        return { all, plan, service, product };
    }

    public static async createSubscription(data: {
        uid?: string;
        userId?: string;
        organizationId?: string;
        subscribableType: SubscribableType;
        subscribableId: string;
        billingCycle?: string;
        status?: SubscriptionStatus;
        stripeSubscriptionId?: string;
        succeedingSubscriptionId?: string;
        nextRenewalDate?: number;
        quantity?: number;
    }): Promise<Subscription> {
        const now = Date.now();
        const subscription = new Subscription({
            id: createRandomUID(),
            uid: data.uid || "",
            organizationId: data.organizationId || null,
            subscribableType: data.subscribableType,
            subscribableId: data.subscribableId,
            billingCycle: data.billingCycle || SubscriptionBillingCycle.MONTHLY,
            status: data.status || SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: 0,
            cancelAtPeriodEnd: false,
            renewals: 0,
            lastPaymentId: "",
            nextNoticeAt: 0,
            nextRenewalDate: data.nextRenewalDate || 0,
            gracePeriodEnd: 0,
            stripeSubscriptionId: data.stripeSubscriptionId || "",
            succeedingSubscriptionId: data.succeedingSubscriptionId || "",
            quantity: data.quantity || 1,
            scheduledQuantity: 0,
            scheduledQuantityEffectiveAt: 0,
            pendingQuantity: 0,
            seatIncreaseInvoiceId: "",
            createdAt: now,
            updatedAt: now,
        });

        await subscription.insert();
        return subscription;
    }

    /**
     * Current seat limit for license assignment (unchanged until a scheduled reduction takes effect).
     */
    public getCurrentSeatLimit(): number {
        return Math.max(1, this.quantity || 1);
    }

    /**
     * True when a seat reduction is scheduled for a future billing period boundary.
     */
    public hasScheduledQuantityDecrease(): boolean {
        return (this.scheduledQuantity || 0) > 0 && (this.scheduledQuantityEffectiveAt || 0) > 0;
    }

    /**
     * True when a seat increase was requested and is awaiting payment (invoice.paid).
     */
    public hasPendingSeatIncrease(): boolean {
        return (this.pendingQuantity || 0) > this.getCurrentSeatLimit();
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public uid: string;
    /* db-type: VARCHAR */
    public organizationId: string | null;
    /* db-type: VARCHAR */
    public subscribableType: SubscribableType;
    /* db-type: VARCHAR */
    public subscribableId: string;
    /* db-type: VARCHAR */
    public billingCycle: string;
    /* db-type: VARCHAR */
    public status: SubscriptionStatus;
    /* db-type: INT */
    public currentPeriodStart: number;
    /* db-type: INT */
    public currentPeriodEnd: number;
    /* db-type: BOOLEAN */
    public cancelAtPeriodEnd: boolean;
    /* db-type: INT */
    public renewals: number;
    /* db-type: VARCHAR */
    public lastPaymentId: string;
    /* db-type: INT */
    public nextNoticeAt: number;
    /* db-type: INT */
    public nextRenewalDate: number;
    /* db-type: INT */
    public gracePeriodEnd: number;
    /* db-type: VARCHAR */
    public stripeSubscriptionId: string;
    /* db-type: VARCHAR */
    public succeedingSubscriptionId: string;
    /* db-type: INT */
    public quantity: number;
    /* db-type: INT */
    public scheduledQuantity: number;
    /* db-type: INT */
    public scheduledQuantityEffectiveAt: number;
    /* db-type: INT */
    public pendingQuantity: number;
    /* db-type: VARCHAR */
    public seatIncreaseInvoiceId: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<Subscription>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.uid = enforceType(data.uid, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || null;
        this.subscribableType = enforceType(data.subscribableType, "string") as SubscribableType || SubscribableType.ITEM;
        this.subscribableId = enforceType(data.subscribableId, "string") || "";
        this.billingCycle = enforceType(data.billingCycle, "string") || SubscriptionBillingCycle.MONTHLY;
        this.status = enforceType(data.status, "string") as SubscriptionStatus || SubscriptionStatus.ACTIVE;
        this.currentPeriodStart = enforceType(data.currentPeriodStart, "number") || 0;
        this.currentPeriodEnd = enforceType(data.currentPeriodEnd, "number") || 0;
        this.cancelAtPeriodEnd = enforceType(data.cancelAtPeriodEnd, "boolean") || false;
        this.renewals = enforceType(data.renewals, "number") || 0;
        this.lastPaymentId = enforceType(data.lastPaymentId, "string") || "";
        this.nextNoticeAt = enforceType(data.nextNoticeAt, "number") || 0;
        this.nextRenewalDate = enforceType(data.nextRenewalDate, "number") || 0;
        this.gracePeriodEnd = enforceType(data.gracePeriodEnd, "number") || 0;
        this.stripeSubscriptionId = enforceType(data.stripeSubscriptionId, "string") || "";
        this.succeedingSubscriptionId = enforceType(data.succeedingSubscriptionId, "string") || "";
        this.quantity = enforceType(data.quantity, "number") || 1;
        this.scheduledQuantity = enforceType(data.scheduledQuantity, "number") || 0;
        this.scheduledQuantityEffectiveAt = enforceType(data.scheduledQuantityEffectiveAt, "number") || 0;
        this.pendingQuantity = enforceType(data.pendingQuantity, "number") || 0;
        this.seatIncreaseInvoiceId = enforceType(data.seatIncreaseInvoiceId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
