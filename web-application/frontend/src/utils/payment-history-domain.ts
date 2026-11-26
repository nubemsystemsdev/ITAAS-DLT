/**
 * Payment history UI domain helpers.
 * Centralizes payment status and type constants and simple formatters
 * so UI code can use consistent keys for later translation.
 */

/** Backend payment statuses (must match backend `PaymentStatus` enum values). */
export const BACKEND_PAYMENT_STATUSES = [
    "created",
    "pending_payment",
    "confirmed",
    "completed",
    "failed",
    "cancelled",
    "refunded",
    "partially_refunded",
] as const;
export type BackendPaymentStatus = (typeof BACKEND_PAYMENT_STATUSES)[number];

/** Backend statuses that are shown in the UI as "Paid". */
export const SUCCESSFUL_PAYMENT_BACKEND_STATUSES = ["completed", "confirmed"] as const;

export function isSuccessfulPaymentStatus(status: string | undefined): boolean {
    const normalized = (status || "").trim().toLowerCase();
    return (SUCCESSFUL_PAYMENT_BACKEND_STATUSES as readonly string[]).includes(normalized);
}

/**
 * Values for payment history status filters (UI).
 * `paid` is sent to the API and resolved server-side as `completed` + `confirmed`.
 */
export const PAYMENT_HISTORY_FILTER_STATUSES = [
    "paid",
    "pending_payment",
    "failed",
    "cancelled",
    "refunded",
    "partially_refunded",
    "created",
] as const;

export function paymentHistoryFilterStatusLabelKey(status: string): string {
    const key = (status || "").trim().toLowerCase();
    switch (key) {
        case "paid":
            return "Paid";
        case "pending_payment":
            return "Pending payment";
        case "failed":
            return "Failed";
        case "cancelled":
            return "Cancelled";
        case "refunded":
            return "Refunded";
        case "partially_refunded":
            return "Partially refunded";
        case "created":
            return "Created";
        default:
            if (isSuccessfulPaymentStatus(key)) {
                return "Paid";
            }
            return paymentStatusLabelKey(key as BackendPaymentStatus) || key;
    }
}

/** Status query param for the API, or undefined when the UI filter is `all`. */
export function resolvePaymentHistoryApiStatus(filterStatus: string | undefined): string | undefined {
    const status = (filterStatus || "").trim().toLowerCase();
    if (!status || status === "all") {
        return undefined;
    }
    return status;
}

/** Common payment method categories used in filters / dropdowns. */
export const PAYMENT_METHOD_TYPES = ["card", "bank_transfer", "invoice", "paypal", "crypto", "wallet", "other"] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

/** Map of backend/raw status strings to normalized `PaymentStatus`.
 * Includes the backend enum values used in backend `payment.ts` (lowercased).
 */
const BACKEND_PAYMENT_STATUS_SET: Record<string, boolean> = BACKEND_PAYMENT_STATUSES.reduce(
    (acc, s) => {
        acc[s] = true;
        return acc;
    },
    {} as Record<string, boolean>,
);

/**
 * Resolve a raw backend payment status into a normalized `PaymentStatus`.
 * Defaults to `pending` when unknown to be safe for UI flows.
 */
export function resolvePaymentStatus(rawStatus: string | undefined): BackendPaymentStatus | null {
    const key = (rawStatus || "").toString().trim().toLowerCase();
    if (!key) return null;
    return BACKEND_PAYMENT_STATUS_SET[key] ? (key as BackendPaymentStatus) : null;
}

export function paymentStatusLabelKey(status: BackendPaymentStatus): string {
    // Return the literal i18n key for a given backend status so callers
    // can translate it in the component context using `$t(key)`.
    switch (status) {
        case "created":
            return "Created";
        case "pending_payment":
            return "Pending payment";
        case "confirmed":
            return "Confirmed";
        case "completed":
            return "Completed";
        case "failed":
            return "Failed";
        case "cancelled":
            return "Cancelled";
        case "refunded":
            return "Refunded";
        case "partially_refunded":
            return "Partially refunded";
        default:
            return String(status || "");
    }
}

/**
 * Return a consistent label key for payment method strings so the UI can translate them.
 * Examples: "stripe - annual" -> "Stripe (annual)", "card" -> "Card".
 */
/** Backend payment types (must match backend `PaymentType` enum values). */
export const BACKEND_PAYMENT_TYPES = ["subscription_create", "subscription_renew", "subscription_change_plan"] as const;
export type BackendPaymentType = (typeof BACKEND_PAYMENT_TYPES)[number];

export function paymentTypeLabelKey(type: string | undefined): string {
    const key = (type || "").trim().toLowerCase();
    switch (key) {
        case "subscription_create":
            return "Subscription creation";
        case "subscription_renew":
            return "Subscription renewal";
        case "subscription_change_plan":
            return "Subscription plan change";
        default:
            return key || "";
    }
}

export const PAYMENT_METHOD_LABEL_KEYS = {
    STRIPE_ANNUAL: "Stripe (annual)",
    STRIPE_MONTHLY: "Stripe (monthly)",
    CARD: "Card",
    BANK_TRANSFER: "Bank transfer",
    INVOICE: "Invoice",
    PAYPAL: "PayPal",
    CRYPTO: "Crypto",
    WALLET: "Wallet",
    PAYMENT: "Payment",
} as const;

export const PRODUCT_TYPE_LABEL_KEYS = {
    PLAN: "Plan",
    ITEM: "Item",
    RECURRING_SERVICE: "Recurring Service",
    DIGITAL_PRODUCT: "Digital Product",
    ITAAS_PLATFORM: "ITAAS Platform",
    PRODUCT: "Product",
} as const;

export function productTypeLabelKey(productType: string | undefined, catalogItemType?: string | null): string {
    const type = (productType || "").trim().toLowerCase();

    if (type === "plan") {
        return PRODUCT_TYPE_LABEL_KEYS.PLAN;
    }

    if (type === "item") {
        const normalizedItemType = (catalogItemType || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        if (!normalizedItemType) {
            return PRODUCT_TYPE_LABEL_KEYS.ITEM;
        }

        switch (normalizedItemType) {
            case "recurring_service":
                return PRODUCT_TYPE_LABEL_KEYS.RECURRING_SERVICE;
            case "digital_product":
                return PRODUCT_TYPE_LABEL_KEYS.DIGITAL_PRODUCT;
            case "itaas_platform":
                return PRODUCT_TYPE_LABEL_KEYS.ITAAS_PLATFORM;
            default:
                return PRODUCT_TYPE_LABEL_KEYS.ITEM;
        }
    }

    if (!type) {
        return PRODUCT_TYPE_LABEL_KEYS.PRODUCT;
    }

    return type
        .split(/[_\s-]+/g)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
}

export function paymentMethodLabelKey(method: string | undefined): string {
    const raw = (method || "").trim();
    if (!raw) return PAYMENT_METHOD_LABEL_KEYS.PAYMENT;

    const lower = raw.toLowerCase();
    switch (lower) {
        case "stripe - annual":
        case "stripe - yearly":
        case "stripe (annual)":
        case "stripe (yearly)":
            return PAYMENT_METHOD_LABEL_KEYS.STRIPE_ANNUAL;
        case "stripe - monthly":
        case "stripe (monthly)":
            return PAYMENT_METHOD_LABEL_KEYS.STRIPE_MONTHLY;
        case "card":
            return PAYMENT_METHOD_LABEL_KEYS.CARD;
        case "bank_transfer":
        case "bank transfer":
        case "bank_transfer - monthly":
        case "bank_transfer - annual":
            return PAYMENT_METHOD_LABEL_KEYS.BANK_TRANSFER;
        case "invoice":
            return PAYMENT_METHOD_LABEL_KEYS.INVOICE;
        case "paypal":
            return PAYMENT_METHOD_LABEL_KEYS.PAYPAL;
        case "crypto":
            return PAYMENT_METHOD_LABEL_KEYS.CRYPTO;
        case "wallet":
            return PAYMENT_METHOD_LABEL_KEYS.WALLET;
        default: {
            // Generic title-case fallback - not an i18n key, displayed as-is
            return raw
                .split(/[_\s-]+/g)
                .filter(Boolean)
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
                .join(" ");
        }
    }
}
