// Payment - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions, TypedRow, enforceType } from "tsbean-orm";
import { SubscribableType, SubscriptionBillingCycle } from "./subscription";
import { CatalogItemType } from "./catalog-item";
import { createRandomUID } from "../utils/text-utils";
import { Monitor } from "../monitor";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "payment";
const PRIMARY_KEY = "id";
const AGGREGATE_FALLBACK_LIMIT = 10000;

export interface PaymentAmountSummary {
    revenueCents: number;
    transactionCount: number;
    truncated: boolean;
}

export interface PaymentMonthlyRevenueRow {
    month: string;
    revenueCents: number;
    transactionCount: number;
}

export enum PaymentStatus {
    CREATED = "created",
    PENDING_PAYMENT = "pending_payment",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded"
}

export enum PaymentType {
    SUBSCRIPTION_CREATE = "subscription_create",
    SUBSCRIPTION_RENEW = "subscription_renew",
    SUBSCRIPTION_CHANGE_PLAN = "subscription_change_plan",
    CUSTOM_AGENT_DEPOSIT = "custom_agent_deposit",
}

export interface PaymentFilterOptions {
    dateFrom?: number;
    dateTo?: number;
    type?: string;
    productType?: string;
    status?: string;
}

/* db-index: uid */
/* db-index: status */
/* db-index: providerSessionId */
/* db-index: providerEventId */
/* db-index: createdAt */

export class Payment extends DataModel {
    public static readonly finder = new DataFinder<Payment, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Payment>) => new Payment(data));

    private static buildFilterConditions(filters: PaymentFilterOptions = {}): DataFilter<Payment>[] {
        const conditions: DataFilter<Payment>[] = [];

        if (typeof filters.dateFrom === "number" && Number.isFinite(filters.dateFrom)) {
            conditions.push(DataFilter.greaterOrEquals("createdAt", Math.floor(filters.dateFrom)));
        }

        if (typeof filters.dateTo === "number" && Number.isFinite(filters.dateTo)) {
            conditions.push(DataFilter.lessOrEquals("createdAt", Math.floor(filters.dateTo)));
        }

        if (filters.type) {
            conditions.push(DataFilter.equals("type", filters.type));
        }

        if (filters.productType) {
            conditions.push(DataFilter.equals("subscribableType", filters.productType));
        }

        if (filters.status) {
            const normalizedStatus = (filters.status + "").trim().toLowerCase();
            if (normalizedStatus === "paid") {
                conditions.push(DataFilter.into("status", [PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED]));
            } else {
                conditions.push(DataFilter.equals("status", normalizedStatus));
            }
        }

        return conditions;
    }

    private static makeUserFilter(uid: string, filters: PaymentFilterOptions = {}): DataFilter<Payment> {
        return DataFilter.and(
            DataFilter.equals("uid", uid),
            ...Payment.buildFilterConditions(filters),
        );
    }

    private static makeAllFilter(filters: PaymentFilterOptions = {}): DataFilter<Payment> {
        const conditions = Payment.buildFilterConditions(filters);
        if (conditions.length === 0) {
            return DataFilter.any();
        }
        return DataFilter.and(...conditions);
    }

    private static makeSubscriptionIdsFilter(subscriptionIds: string[], filters: PaymentFilterOptions = {}): DataFilter<Payment> {
        const filterConditions = Payment.buildFilterConditions(filters);
        if (subscriptionIds.length === 0) {
            return DataFilter.equals("subscriptionId", "");
        }
        if (filterConditions.length === 0) {
            return DataFilter.into("subscriptionId", subscriptionIds);
        }
        return DataFilter.and(DataFilter.into("subscriptionId", subscriptionIds), ...filterConditions);
    }

    public static async findById(id: string): Promise<Payment> {
        return Payment.finder.findByKey(id);
    }

    public static async findByProviderSession(sessionId: string): Promise<Payment> {
        const res = await Payment.finder.find(DataFilter.equals("providerSessionId", sessionId));
        return res[0] || null;
    }

    public static async findByPaymentIntentId(paymentIntentId: string): Promise<Payment> {
        const res = await Payment.finder.find(DataFilter.equals("stripePaymentIntentId", paymentIntentId));
        return res[0] || null;
    }

    public static async countByUser(uid: string): Promise<number> {
        return Payment.finder.count(DataFilter.equals("uid", uid));
    }

    public static async countByUserWithFilters(uid: string, filters: PaymentFilterOptions = {}): Promise<number> {
        return Payment.finder.count(Payment.makeUserFilter(uid, filters));
    }

    public static async findByUser(uid: string, skip: number, limit: number): Promise<Payment[]> {
        return Payment.findByUserWithFilters(uid, skip, limit, {});
    }

    public static async findByUserWithFilters(uid: string, skip: number, limit: number, filters: PaymentFilterOptions = {}): Promise<Payment[]> {
        const safeSkip = Math.max(0, Math.floor(skip || 0));
        const safeLimit = Math.max(1, Math.floor(limit || 1));

        return Payment.finder.find(
            Payment.makeUserFilter(uid, filters),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(safeSkip).setMaxRows(safeLimit),
        );
    }

    public static async countBySubscriptionId(subscriptionId: string): Promise<number> {
        return Payment.finder.count(DataFilter.equals("subscriptionId", subscriptionId));
    }

    public static async findBySubscriptionId(subscriptionId: string, skip: number, limit: number): Promise<Payment[]> {
        return Payment.finder.find(
            DataFilter.equals("subscriptionId", subscriptionId),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findConfirmedBySubscriptionIdAndType(subscriptionId: string, type: PaymentType): Promise<Payment | null> {
        const rows = await Payment.finder.find(
            DataFilter.and(
                DataFilter.equals("subscriptionId", subscriptionId),
                DataFilter.equals("type", type),
                DataFilter.into("status", [PaymentStatus.CONFIRMED, PaymentStatus.COMPLETED]),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return rows[0] || null;
    }

    public static async countBySubscriptionIdsWithFilters(subscriptionIds: string[], filters: PaymentFilterOptions = {}): Promise<number> {
        if (subscriptionIds.length === 0) {
            return 0;
        }
        return Payment.finder.count(Payment.makeSubscriptionIdsFilter(subscriptionIds, filters));
    }

    public static async findBySubscriptionIdsWithFilters(
        subscriptionIds: string[],
        skip: number,
        limit: number,
        filters: PaymentFilterOptions = {},
    ): Promise<Payment[]> {
        if (subscriptionIds.length === 0) {
            return [];
        }

        const safeSkip = Math.max(0, Math.floor(skip || 0));
        const safeLimit = Math.max(1, Math.floor(limit || 1));

        return Payment.finder.find(
            Payment.makeSubscriptionIdsFilter(subscriptionIds, filters),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(safeSkip).setMaxRows(safeLimit),
        );
    }

    public static async countAll(): Promise<number> {
        return Payment.finder.count(DataFilter.any());
    }

    public static async countAllWithFilters(filters: PaymentFilterOptions = {}): Promise<number> {
        return Payment.finder.count(Payment.makeAllFilter(filters));
    }

    public static async findAll(skip: number, limit: number): Promise<Payment[]> {
        return Payment.finder.find(
            DataFilter.any(),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findAllWithFilters(skip: number, limit: number, filters: PaymentFilterOptions = {}): Promise<Payment[]> {
        const safeSkip = Math.max(0, Math.floor(skip || 0));
        const safeLimit = Math.max(1, Math.floor(limit || 1));

        return Payment.finder.find(
            Payment.makeAllFilter(filters),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(safeSkip).setMaxRows(safeLimit),
        );
    }

    private static monthLabelFromTimestamp(timestamp: number): string {
        const date = new Date(timestamp || 0);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
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
                month: Payment.monthLabelFromTimestamp(dateFrom),
                dateFrom,
                dateTo,
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        return months;
    }

    public static async sumPaidAmountInRange(dateFrom: number, dateTo: number): Promise<PaymentAmountSummary> {
        const filters = { status: "paid", dateFrom, dateTo };
        const totalCount = await Payment.countAllWithFilters(filters);
        const payments = await Payment.findAllWithFilters(0, AGGREGATE_FALLBACK_LIMIT, filters);
        const truncated = totalCount > payments.length;
        if (truncated) {
            Monitor.warning(`[DASHBOARD] Payment.sumPaidAmountInRange: truncated at ${AGGREGATE_FALLBACK_LIMIT} rows (total ${totalCount})`);
        }
        const confirmed = payments.filter(p => (p.amountCents || 0) > 0);
        return {
            revenueCents: confirmed.reduce((sum, p) => sum + (p.amountCents || 0), 0),
            transactionCount: confirmed.length,
            truncated,
        };
    }

    public static async aggregatePaidRevenueMonthly(rangeStart: number, rangeEnd: number): Promise<PaymentMonthlyRevenueRow[]> {
        const monthRanges = Payment.enumerateMonthRanges(rangeStart, rangeEnd);
        return Promise.all(monthRanges.map(async ({ month, dateFrom, dateTo }) => {
            const summary = await Payment.sumPaidAmountInRange(dateFrom, dateTo);
            return {
                month,
                revenueCents: summary.revenueCents,
                transactionCount: summary.transactionCount,
            };
        }));
    }

    public static async create(
        uid: string,
        type: PaymentType,
        provider: string,
        providerSessionId: string,
        providerEventId: string,
        amountCents: number,
        currency: string,
        subscribableType: SubscribableType,
        subscribableId: string,
        billingCycle: SubscriptionBillingCycle,
        catalogItemType?: string,
    ): Promise<Payment> {
        const payment = new Payment({
            id: createRandomUID(),
            uid: uid,
            type: type,
            provider: provider,
            subscribableType: subscribableType,
            subscribableId: subscribableId,
            catalogItemType: catalogItemType || "",
            billingCycle: billingCycle,
            providerSessionId: providerSessionId,
            providerEventId: providerEventId,
            amountCents: amountCents,
            currency: currency,
            status: PaymentStatus.CREATED,
            txHash: "",
            subscriptionId: "",
            stripePaymentIntentId: "",
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        await payment.insert();
        return payment;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public uid: string;
    /* db-type: VARCHAR */
    public type: string;
    /* db-type: VARCHAR */
    public provider: string;
    /* db-type: VARCHAR */
    public providerSessionId: string;
    /* db-type: VARCHAR */
    public providerEventId: string;
    /* db-type: INT */
    public amountCents: number;
    /* db-type: VARCHAR */
    public currency: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: VARCHAR */
    public txHash: string;
    /* db-type: VARCHAR */
    public subscribableType: SubscribableType;
    /* db-type: VARCHAR */
    public subscribableId: string;
    /* db-type: VARCHAR */
    public catalogItemType: string;
    /* db-type: VARCHAR */
    public billingCycle: string;
    /* db-type: VARCHAR */
    public subscriptionId: string;
    /* db-type: VARCHAR */
    public stripePaymentIntentId: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<Payment>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.uid = enforceType(data.uid, "string") || "";
        this.type = enforceType(data.type, "string") || "";
        this.provider = enforceType(data.provider, "string") || "";
        this.providerSessionId = enforceType(data.providerSessionId, "string") || "";
        this.providerEventId = enforceType(data.providerEventId, "string") || "";
        this.amountCents = enforceType(data.amountCents, "number") || 0;
        this.currency = enforceType(data.currency, "string") || "";
        this.status = enforceType(data.status, "string") || "created";
        this.txHash = enforceType(data.txHash, "string") || "";
        this.subscribableType = enforceType(data.subscribableType, "string") as SubscribableType || SubscribableType.ITEM;
        this.subscribableId = enforceType(data.subscribableId, "string") || "";
        this.catalogItemType = enforceType(data.catalogItemType, "string") || "";
        this.billingCycle = enforceType(data.billingCycle, "string") || "";
        this.subscriptionId = enforceType(data.subscriptionId, "string") || "";
        this.stripePaymentIntentId = enforceType(data.stripePaymentIntentId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
