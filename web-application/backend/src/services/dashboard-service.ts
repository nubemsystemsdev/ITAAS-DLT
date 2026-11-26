"use strict";

import { Payment, PaymentStatus } from "../models/payment";
import { Subscription, SubscriptionStatus, SUBSCRIPTION_MRR_ELIGIBLE_STATUSES } from "../models/subscription";
import { User } from "../models/users/user";
import { Organization } from "../models/organization";
import { OrganizationMembership } from "../models/organization-membership";
import { OrganizationRequest } from "../models/organization-request";
import { TokenWallet } from "../models/token-wallet";
import { TokenRuleConfig } from "../models/token-rule-config";
import { TraceabilityEvent, TraceabilityStatus } from "../models/traceability-event";
import { Identitycredentials } from "../models/identity-credentials";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
const TWELVE_MONTHS = 12;
const BLOCKCHAIN_MAX_DAILY_DAYS = 30;
const BLOCKCHAIN_EVENTS_FETCH_LIMIT = 10000;
const TOP_SUBSCRIBED_CATALOG_ITEMS_DISPLAY = 3;

export interface DashboardMrr {
    currentCents: number;
    previousCents: number | null;
    variationPct: number | null;
}

export interface DashboardArr {
    currentCents: number;
}

export interface DashboardActiveSubscriptions {
    total: number;
    plan: number;
    service: number;
    product: number;
}

export interface DashboardTotalUsers {
    total: number;
    newLast30Days: number;
}

export interface DashboardActiveOrganizations {
    total: number;
    totalMembers: number;
}

export interface DashboardCurrentMonthRevenue {
    cents: number;
    previousMonthCents: number;
    variationPct: number;
}

export interface DashboardRevenueMonthlyPoint {
    month: string;
    revenueCents: number;
    transactionCount: number;
}

export interface DashboardSubscriptionTrendPoint {
    month: string;
    created: number;
    cancelled: number;
}

export interface DashboardTokenCirculation {
    availableTokens: number;
    lockedTokens: number;
    equivalentEurCents: number;
}

export interface DashboardTopSubscribedCatalogItem {
    catalogItemId: string;
    name: string;
    type: string;
    status: string;
    subscriptionCount: number;
}

export interface DashboardTopSubscribedCatalogItems {
    items: DashboardTopSubscribedCatalogItem[];
    total: number;
}

export interface DashboardPaymentHealth {
    failedPaymentsCount: number;
    suspendedSubscriptions: number;
}

export interface DashboardBlockchainDailyPoint {
    day: string;
    eventCount: number;
}

export interface DashboardRecentActivityItem {
    type: string;
    title: string;
    timestamp: number;
    severity: string;
    referenceId: string;
}

export interface AdminDashboardSummary {
    mrr: DashboardMrr;
    arr: DashboardArr;
    activeSubscriptions: DashboardActiveSubscriptions;
    totalUsers: DashboardTotalUsers;
    activeOrganizations: DashboardActiveOrganizations;
    currentMonthRevenue: DashboardCurrentMonthRevenue;
    revenueMonthly: DashboardRevenueMonthlyPoint[];
    subscriptionStatusDistribution: Record<string, number>;
    subscriptionTrend: DashboardSubscriptionTrendPoint[];
    tokenCirculation: DashboardTokenCirculation;
    topSubscribedCatalogItems: DashboardTopSubscribedCatalogItems;
    paymentHealth: DashboardPaymentHealth;
    traceabilityFailedCount: number;
    blockchainEventsDaily: DashboardBlockchainDailyPoint[];
    pendingOrgRequests: number;
    pendingVCRequests: number;
    recentActivity: DashboardRecentActivityItem[];
}

function getMonthStart(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function getNextMonthStart(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
}

function getMonthLabel(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function getLastMonths(count: number): Date[] {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
        return new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    });
}

function getLastDays(count: number, now: number): Date[] {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: count }, (_, i) => {
        const day = new Date(today);
        day.setDate(day.getDate() - (count - 1 - i));
        return day;
    });
}

function getDayLabel(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function computeVariation(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

export class DashboardService {
    private static instance: DashboardService;

    public static getInstance(): DashboardService {
        if (!DashboardService.instance) {
            DashboardService.instance = new DashboardService();
        }
        return DashboardService.instance;
    }

    public async getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
        const now = Date.now();

        const [
            mrrData,
            activeSubscriptions,
            totalUsers,
            activeOrgs,
            currentMonthRevenue,
            revenueMonthly,
            subscriptionDistribution,
            subscriptionTrend,
            tokenCirculation,
            topSubscribedCatalogItems,
            paymentHealth,
            traceabilityFailedCount,
            blockchainEventsDaily,
            pendingOrgRequests,
            pendingVCRequests,
            recentActivity,
        ] = await Promise.all([
            this.computeMrr(),
            this.computeActiveSubscriptions(),
            this.computeTotalUsers(now),
            this.computeActiveOrganizations(),
            this.computeCurrentMonthRevenue(now),
            this.computeRevenueMonthly(),
            this.computeSubscriptionStatusDistribution(),
            this.computeSubscriptionTrend(),
            this.computeTokenCirculation(),
            this.computeTopSubscribedCatalogItems(),
            this.computePaymentHealth(now),
            TraceabilityEvent.countByStatus(TraceabilityStatus.FAILED),
            this.computeBlockchainEventsDaily(now),
            this.computePendingOrgRequests(),
            this.computePendingVCRequests(),
            this.computeRecentActivity(now),
        ]);

        return {
            mrr: mrrData,
            arr: { currentCents: mrrData.currentCents * 12 },
            activeSubscriptions,
            totalUsers,
            activeOrganizations: activeOrgs,
            currentMonthRevenue,
            revenueMonthly,
            subscriptionStatusDistribution: subscriptionDistribution,
            subscriptionTrend,
            tokenCirculation,
            topSubscribedCatalogItems,
            paymentHealth,
            traceabilityFailedCount,
            blockchainEventsDaily,
            pendingOrgRequests,
            pendingVCRequests,
            recentActivity,
        };
    }

    private async computeMrr(): Promise<DashboardMrr> {
        const currentMrr = await Subscription.calculateCurrentMrrCents();

        return {
            currentCents: currentMrr,
            previousCents: null,
            variationPct: null,
        };
    }

    private async computeActiveSubscriptions(): Promise<DashboardActiveSubscriptions> {
        const counts = await Subscription.countCategoryCountsForAdmin({
            statuses: SUBSCRIPTION_MRR_ELIGIBLE_STATUSES,
        });
        return {
            total: counts.all,
            plan: counts.plan,
            service: counts.service,
            product: counts.product,
        };
    }

    private async computeTotalUsers(now: number): Promise<DashboardTotalUsers> {
        const [total, newUsers] = await Promise.all([
            User.countAll(),
            User.countCreatedSince(now - THIRTY_DAYS),
        ]);
        return { total, newLast30Days: newUsers };
    }

    private async computeActiveOrganizations(): Promise<DashboardActiveOrganizations> {
        const [totalOrgs, totalMembers] = await Promise.all([
            Organization.countActive(),
            OrganizationMembership.countActiveMembers(),
        ]);
        return { total: totalOrgs, totalMembers };
    }

    private async computeCurrentMonthRevenue(now: number): Promise<DashboardCurrentMonthRevenue> {
        const currentDate = new Date(now);
        const currentMonthStart = getMonthStart(currentDate);
        const nextMonthStart = getNextMonthStart(currentDate);
        const previousMonthStart = getMonthStart(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

        const [currentSummary, previousSummary] = await Promise.all([
            Payment.sumPaidAmountInRange(currentMonthStart, nextMonthStart),
            Payment.sumPaidAmountInRange(previousMonthStart, currentMonthStart),
        ]);

        return {
            cents: currentSummary.revenueCents,
            previousMonthCents: previousSummary.revenueCents,
            variationPct: computeVariation(currentSummary.revenueCents, previousSummary.revenueCents),
        };
    }

    private async computeRevenueMonthly(): Promise<DashboardRevenueMonthlyPoint[]> {
        const months = getLastMonths(TWELVE_MONTHS);
        const rangeStart = months[0].getTime();
        const lastMonth = months[months.length - 1];
        const rangeEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1).getTime();
        const aggregated = await Payment.aggregatePaidRevenueMonthly(rangeStart, rangeEnd);
        const byMonth = new Map(aggregated.map(row => [row.month, row]));

        return months.map(month => {
            const label = getMonthLabel(month);
            const row = byMonth.get(label);
            return {
                month: label,
                revenueCents: row?.revenueCents ?? 0,
                transactionCount: row?.transactionCount ?? 0,
            };
        });
    }

    private async computeSubscriptionStatusDistribution(): Promise<Record<string, number>> {
        return Subscription.countStatusDistributionForAdmin();
    }

    private async computeSubscriptionTrend(): Promise<DashboardSubscriptionTrendPoint[]> {
        const months = getLastMonths(TWELVE_MONTHS);
        const rangeStart = months[0].getTime();
        const lastMonth = months[months.length - 1];
        const rangeEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1).getTime();
        const aggregated = await Subscription.aggregateTrendMonthly(rangeStart, rangeEnd);
        const byMonth = new Map(aggregated.map(row => [row.month, row]));

        return months.map(month => {
            const label = getMonthLabel(month);
            const row = byMonth.get(label);
            return {
                month: label,
                created: row?.created ?? 0,
                cancelled: row?.cancelled ?? 0,
            };
        });
    }

    private async computeTokenCirculation(): Promise<DashboardTokenCirculation> {
        const [circulation, tokenConfig] = await Promise.all([
            TokenWallet.sumCirculation(),
            TokenRuleConfig.getDefault(),
        ]);

        const tokenValueEurCents = tokenConfig?.tokenValueEurCents || 1;

        return {
            availableTokens: circulation.availableTokens,
            lockedTokens: circulation.lockedTokens,
            equivalentEurCents: circulation.availableTokens * tokenValueEurCents,
        };
    }

    private async computeTopSubscribedCatalogItems(): Promise<DashboardTopSubscribedCatalogItems> {
        return Subscription.findTopSubscribedCatalogItems(TOP_SUBSCRIBED_CATALOG_ITEMS_DISPLAY);
    }

    private async computePaymentHealth(now: number): Promise<DashboardPaymentHealth> {
        const ninetyDaysAgo = now - NINETY_DAYS;
        const [failedCount, suspendedCount] = await Promise.all([
            Payment.countAllWithFilters({ dateFrom: ninetyDaysAgo, status: PaymentStatus.FAILED }),
            Subscription.countByStatuses([SubscriptionStatus.SUSPENDED, SubscriptionStatus.PAST_DUE]),
        ]);

        return {
            failedPaymentsCount: failedCount,
            suspendedSubscriptions: suspendedCount,
        };
    }

    private buildBlockchainDailyPoints(
        days: Date[],
        events: Array<{ createdAt: number }>,
    ): DashboardBlockchainDailyPoint[] {
        return days.map(day => {
            const dayStart = day.getTime();
            const nextDayStart = dayStart + 24 * 60 * 60 * 1000;
            const eventCount = events.filter(event => {
                const createdAt = event.createdAt || 0;
                return createdAt >= dayStart && createdAt < nextDayStart;
            }).length;

            return {
                day: getDayLabel(day),
                eventCount,
            };
        });
    }

    private async computeBlockchainEventsDaily(now: number): Promise<DashboardBlockchainDailyPoint[]> {
        const days = getLastDays(BLOCKCHAIN_MAX_DAILY_DAYS, now);
        const rangeStart = days[0].getTime();
        const events = await TraceabilityEvent.findCreatedSince(rangeStart, BLOCKCHAIN_EVENTS_FETCH_LIMIT);

        return this.buildBlockchainDailyPoints(days, events);
    }

    private async computePendingOrgRequests(): Promise<number> {
        const pending = await OrganizationRequest.findPending();
        return pending.length;
    }

    private async computePendingVCRequests(): Promise<number> {
        return Identitycredentials.countPendingRequests();
    }

    private async computeRecentActivity(now: number): Promise<DashboardRecentActivityItem[]> {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const activity: DashboardRecentActivityItem[] = [];

        const recentPayments = await Payment.findAllWithFilters(0, 10, { dateFrom: sevenDaysAgo });
        for (const payment of recentPayments.slice(0, 5)) {
            const status = (payment.status || "").toLowerCase();
            const severity = status === "completed" || status === "confirmed" ? "success" :
                status === "failed" || status === "cancelled" ? "error" : "info";
            const amountEur = ((payment.amountCents || 0) / 100).toFixed(2);
            activity.push({
                type: "payment",
                title: `${payment.type || "Payment"} - ${amountEur} ${payment.currency || "EUR"}`,
                timestamp: payment.createdAt || 0,
                severity,
                referenceId: payment.id,
            });
        }

        const recentSubscriptions = await Subscription.findForAdmin({ createdFrom: sevenDaysAgo }, 0, 5);
        for (const sub of recentSubscriptions) {
            const isNew = sub.createdAt >= sevenDaysAgo;
            const isCancelled = sub.status === SubscriptionStatus.CANCELLED;
            activity.push({
                type: "subscription",
                title: isNew && !isCancelled ? "New subscription created" : "Subscription " + (sub.status || "updated"),
                timestamp: sub.createdAt || sub.updatedAt || 0,
                severity: isCancelled ? "warning" : "info",
                referenceId: sub.id,
            });
        }

        activity.sort((a, b) => b.timestamp - a.timestamp);

        return activity.slice(0, 15);
    }
}
