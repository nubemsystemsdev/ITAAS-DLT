export type TranslateFn = (key: string) => string;

export function formatSubscriptionPreference(value: string, t: TranslateFn): string {
    if (value === "ImmediateProratedRefund") {
        return String(t("Immediate prorated refund and subscription cancellation"));
    }
    if (value === "AtPeriodEnd") {
        return String(t("Cancel subscriptions at the end of the billing period (no refund)"));
    }
    return value || "—";
}

export function formatDeletionStatus(value: string, t: TranslateFn): string {
    if (value === "Pending") {
        return String(t("Pending"));
    }
    if (value === "ApprovedPendingPeriodEnd") {
        return String(t("Closing at period end"));
    }
    if (value === "Approved") {
        return String(t("Approved"));
    }
    if (value === "Rejected") {
        return String(t("Rejected"));
    }
    return value || "—";
}
