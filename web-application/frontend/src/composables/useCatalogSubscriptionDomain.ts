import type { SubscriptionStatusItem } from "@/api/definitions";
import type { CatalogActionType, CatalogPricingOption, CatalogSubscriptionInfo } from "@/composables/catalog-domain";

export type { CatalogActionType, CatalogBillingCycle, CatalogPricingOption, CatalogSubscriptionInfo } from "@/composables/catalog-domain";

export function normalizeCatalogSubscriptionState(rawStatus: string, cancelAtPeriodEnd: boolean): CatalogSubscriptionInfo["state"] {
    if (cancelAtPeriodEnd) {
        return "pending";
    }

    const normalizedStatus = (rawStatus || "").trim().toLowerCase();
    if (normalizedStatus.includes("cancel") || normalizedStatus.includes("suspend") || normalizedStatus.includes("inactive")) {
        return "cancelled";
    }
    if (normalizedStatus.includes("pending") || normalizedStatus.includes("past due") || normalizedStatus.includes("trial")) {
        return "pending";
    }
    if (normalizedStatus.includes("active") || normalizedStatus.includes("complete")) {
        return "active";
    }
    return "none";
}

export function isPendingCheckoutSubscription(rawStatus: string, cancelAtPeriodEnd: boolean): boolean {
    if (cancelAtPeriodEnd) {
        return false;
    }
    const normalizedStatus = (rawStatus || "").trim().toLowerCase();
    return normalizedStatus.includes("pending");
}

export function getCatalogSubscriptionPriority(subscription: CatalogSubscriptionInfo): number {
    if (subscription.state === "active") {
        return 4;
    }
    if (isPendingCheckoutSubscription(subscription.rawStatus, subscription.cancelAtPeriodEnd)) {
        return 3;
    }
    if (subscription.state === "pending") {
        return 2;
    }
    if (subscription.state === "cancelled") {
        return 1;
    }
    return 0;
}

export function buildCatalogSubscriptionsMap(subscriptions: SubscriptionStatusItem[] = []): Record<string, CatalogSubscriptionInfo> {
    const subscriptionsMap: Record<string, CatalogSubscriptionInfo> = {};

    for (const subscription of subscriptions) {
        const rawSubscription = subscription as SubscriptionStatusItem & {
            cancelAtPeriodEnd?: boolean;
            currentPeriodEnd?: number;
            subscribableId?: string;
        };
        const subscribableId = rawSubscription.subscribableId || "";
        if (!subscribableId) {
            continue;
        }

        const nextSubscription: CatalogSubscriptionInfo = {
            id: rawSubscription.id,
            rawStatus: rawSubscription.status || "",
            state: normalizeCatalogSubscriptionState(rawSubscription.status || "", !!rawSubscription.cancelAtPeriodEnd),
            cancelAtPeriodEnd: !!rawSubscription.cancelAtPeriodEnd,
            currentPeriodEnd: rawSubscription.currentPeriodEnd || 0,
        };

        const previousSubscription = subscriptionsMap[subscribableId];
        if (!previousSubscription) {
            subscriptionsMap[subscribableId] = nextSubscription;
            continue;
        }

        const previousPriority = getCatalogSubscriptionPriority(previousSubscription);
        const nextPriority = getCatalogSubscriptionPriority(nextSubscription);
        if (
            nextPriority > previousPriority ||
            (nextPriority === previousPriority && nextSubscription.currentPeriodEnd > previousSubscription.currentPeriodEnd)
        ) {
            subscriptionsMap[subscribableId] = nextSubscription;
        }
    }

    return subscriptionsMap;
}

export function resolveCatalogStatusLabel(subscription: CatalogSubscriptionInfo | null): string {
    if (!subscription) {
        return "Available";
    }
    if (subscription.cancelAtPeriodEnd) {
        return "Cancellation scheduled";
    }
    if (isPendingCheckoutSubscription(subscription.rawStatus, subscription.cancelAtPeriodEnd)) {
        return "Pending payment";
    }
    if (subscription.state === "active") {
        return "Subscribed";
    }
    if (subscription.state === "pending") {
        return "Pending";
    }
    if (subscription.state === "cancelled") {
        return "Cancelled";
    }
    return "Available";
}

export function resolveCatalogStatusClass(subscription: CatalogSubscriptionInfo | null): string {
    if (!subscription) {
        return "state-none";
    }
    if (subscription.cancelAtPeriodEnd) {
        return "state-pending";
    }
    if (isPendingCheckoutSubscription(subscription.rawStatus, subscription.cancelAtPeriodEnd)) {
        return "state-pending";
    }
    if (subscription.state === "active") {
        return "state-active";
    }
    if (subscription.state === "pending") {
        return "state-pending";
    }
    if (subscription.state === "cancelled") {
        return "state-cancelled";
    }
    return "state-none";
}

interface ResolveCatalogPrimaryActionTypeParams {
    selectedOption: CatalogPricingOption | null;
    selectedSubscription: CatalogSubscriptionInfo | null;
    isAuthenticated: boolean;
}

export function resolveCatalogPrimaryActionType(params: ResolveCatalogPrimaryActionTypeParams): CatalogActionType {
    if (!params.selectedOption || !params.selectedOption.subscribableId) {
        return "unavailable";
    }

    if (!params.isAuthenticated) {
        return "subscribe";
    }

    if (
        params.selectedSubscription &&
        isPendingCheckoutSubscription(params.selectedSubscription.rawStatus, params.selectedSubscription.cancelAtPeriodEnd)
    ) {
        return "complete_pending";
    }

    if (
        params.selectedSubscription &&
        (params.selectedSubscription.cancelAtPeriodEnd || params.selectedSubscription.state === "cancelled")
    ) {
        return "subscribe";
    }

    if (params.selectedSubscription && params.selectedSubscription.state !== "none") {
        return "manage";
    }

    return "subscribe";
}

export function resolveCatalogPrimaryActionLabel(actionType: CatalogActionType): string {
    if (actionType === "complete_pending") {
        return "Complete payment";
    }
    if (actionType === "manage") {
        return "Manage";
    }
    if (actionType === "unavailable") {
        return "Unavailable";
    }
    return "Subscribe";
}
