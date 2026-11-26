/** Shared subscription UI types and helpers (aligned with backend subscription model). */

export const CATALOG_ITEM_TYPE_RECURRING_SERVICE = "Recurring Service";
export const CATALOG_ITEM_TYPE_ITAAS_PLATFORM = "ITAAS Platform";
export const CATALOG_ITEM_TYPE_CUSTOM_AGENT_SERVICE = "Custom Agent Service";
export const CUSTOM_AGENT_SERVICE_ITEM_ID = "custom-agent-service";

/** Page size for catalog/plan lookup list requests (subscription UI). */
export const CATALOG_PLAN_LOOKUP_PAGE_SIZE = 8;

export const SUBSCRIPTIONS_LIST_PAGE_SIZE = 8;

export const PLAN_LOOKUP_CYCLE_KEY_PREFIX = "__plan-cycle__";
export const PLAN_LOOKUP_SINGLE_KEY = "__plan-single__";

export const SUBSCRIPTION_DISPLAY_STATUSES = ["active", "pending", "cancelled"] as const;
export type SubscriptionDisplayStatus = (typeof SUBSCRIPTION_DISPLAY_STATUSES)[number];

export const SUBSCRIPTION_CATEGORY_TABS = ["all", "plan", "service", "product"] as const;
export type SubscriptionCategoryTab = (typeof SUBSCRIPTION_CATEGORY_TABS)[number];
export type SubscriptionAgentCategory = Exclude<SubscriptionCategoryTab, "all">;

export const SUBSCRIPTION_CHANGE_MODES = ["immediate", "period_end"] as const;
export type SubscriptionChangeMode = (typeof SUBSCRIPTION_CHANGE_MODES)[number];

export type SubscriptionFilterStatus = SubscriptionDisplayStatus | "all";

export const SUBSCRIPTION_BILLING_CYCLE_FILTERS = ["monthly", "annual"] as const;
export type SubscriptionBillingCycleFilter = (typeof SUBSCRIPTION_BILLING_CYCLE_FILTERS)[number];
export type SubscriptionFilterPlan = "all" | SubscriptionBillingCycleFilter;

export const SUBSCRIPTION_BACKEND_STATUS_OPTIONS = [
    "Active",
    "Pending",
    "Pending Payment",
    "Past Due",
    "Scheduled Cancellation",
    "Cancelled",
    "Suspended",
    "Complete",
] as const;

const BACKEND_STATUS_DISPLAY_MAP: Record<string, SubscriptionDisplayStatus> = {
    Active: "active",
    Complete: "active",
    Pending: "pending",
    "Pending Payment": "pending",
    "Past Due": "pending",
    "Scheduled Cancellation": "pending",
    Cancelled: "cancelled",
    Suspended: "cancelled",
};

export function resolveSubscriptionDisplayStatus(rawStatus: string, cancelAtPeriodEnd = false): SubscriptionDisplayStatus {
    if (cancelAtPeriodEnd) {
        return "pending";
    }
    return BACKEND_STATUS_DISPLAY_MAP[rawStatus] ?? "active";
}

export function planLookupCycleKey(billingCycle: string): string {
    return `${PLAN_LOOKUP_CYCLE_KEY_PREFIX}${billingCycle || ""}`;
}

export type SubscriptionListTranslator = (key: string) => string;

export const SUBSCRIPTION_CATEGORY_TAB_DEFS: ReadonlyArray<{ key: SubscriptionCategoryTab; label: string }> = [
    { key: "all", label: "All" },
    { key: "plan", label: "Plans" },
    { key: "service", label: "Services" },
    { key: "product", label: "Products" },
];

export const SUBSCRIPTION_ADMIN_STATUS_OPTIONS = [
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Complete", label: "Complete" },
    { key: "Past Due", label: "Past Due" },
    { key: "Scheduled Cancellation", label: "Scheduled Cancellation" },
    { key: "Cancelled", label: "Cancelled" },
    { key: "Suspended", label: "Suspended" },
] as const;

export type SubscriptionStatusCategoryCountsLike = {
    all?: number;
    plan?: number;
    service?: number;
    product?: number;
};

export function getSubscriptionCategoryCount(counts: SubscriptionStatusCategoryCountsLike, filter: SubscriptionCategoryTab): number {
    if (filter === "all") {
        return counts.all || 0;
    }
    return counts[filter] || 0;
}

export function formatSubscriptionCategory(category: string | undefined, t: SubscriptionListTranslator): string {
    const normalized = (category || "").trim().toLowerCase();
    if (normalized === "plan") {
        return t("Plan");
    }
    if (normalized === "service") {
        return t("Service");
    }
    if (normalized === "product") {
        return t("Product");
    }
    return "—";
}

/** Table/detail label for billing cycle (Monthly, Annual, Complete, …). */
export function formatBillingCycle(cycle: string, t: SubscriptionListTranslator): string {
    const normalized = (cycle || "").trim().toLowerCase();
    if (normalized === "monthly") {
        return t("Monthly");
    }
    if (normalized === "annual" || normalized === "yearly") {
        return t("Annual");
    }
    if (normalized === "complete") {
        return t("Complete");
    }
    return cycle || "—";
}

/** Internal English label for plan lookup keys (not translated). */
export function normalizeBillingCyclePlanLabel(billingCycle: string): string {
    if (billingCycle === "monthly") {
        return "Monthly";
    }
    if (billingCycle === "annual") {
        return "Annual";
    }
    if (billingCycle === "complete") {
        return "Complete";
    }
    return billingCycle || "Plan";
}

/** Short period suffix for amount display (e.g. “/ month”). */
export function formatBillingCyclePeriod(cycle: string, t: SubscriptionListTranslator): string {
    const normalized = (cycle || "").trim().toLowerCase();
    if (normalized === "monthly") {
        return t("month");
    }
    if (normalized === "annual" || normalized === "yearly") {
        return t("Annual").toLowerCase();
    }
    return "";
}

export function dateFilterToTimestamp(dateValue: string, endOfDay: boolean): number {
    if (!dateValue) {
        return 0;
    }
    const parts = dateValue.split("-").map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
        return 0;
    }
    return Date.UTC(parts[0], parts[1] - 1, parts[2], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

export function canAdminSuspendSubscription(subscription: { status?: string }): boolean {
    const status = (subscription.status || "").toLowerCase();
    return status === "active" || status === "past due";
}

export function canAdminReactivateSubscription(subscription: { status?: string; cancelAtPeriodEnd?: boolean }): boolean {
    const status = (subscription.status || "").toLowerCase();
    if (status === "scheduled cancellation") {
        return true;
    }
    if (status.includes("suspend")) {
        return true;
    }
    if (status === "cancelled" || status === "canceled") {
        return true;
    }
    return !!subscription.cancelAtPeriodEnd && (status === "active" || status === "past due");
}

/** i18n key for user-facing subscription status badge text. */
export function userSubscriptionStatusLabelKey(status: SubscriptionDisplayStatus, cancelAtPeriodEnd = false): string {
    if (status === "active") {
        return "Active";
    }
    if (status === "pending") {
        return cancelAtPeriodEnd ? "Cancellation scheduled" : "Pending";
    }
    return "Cancelled";
}

export function formatSubscriptionItemDisplayName(resolvedName: string | undefined, subscribableId: string | undefined): string {
    const name = (resolvedName || "").trim();
    if (name) {
        return name;
    }
    const id = (subscribableId || "").trim();
    return id || "—";
}

/** API handler for `ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN`. */
export function badRequestOrgRequiredForMultiLicensePlanHandler(
    show: (title: string, message: string) => void,
    t: (key: string) => string = (key) => key,
): () => void {
    return () => show(t("Invalid request"), t("Multi-license plans require an organization."));
}

export interface UserSubscriptionListRow {
    id: string;
    agent: string;
    version: string;
    billingCycle: string;
    status: SubscriptionDisplayStatus;
    cancelAtPeriodEnd: boolean;
    renewalDate: string;
    amount: number | null;
}
