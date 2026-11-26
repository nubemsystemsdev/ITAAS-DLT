export type StatusBadgeTone = "success" | "warning" | "error" | "muted" | "info";

export type OrganizationStatusKind = "approved" | "pending" | "rejected";

export interface OrganizationStatusInput {
    isActive?: boolean;
    status?: string;
    approvalStatus?: string;
    verificationStatus?: string;
}

const SUCCESS_KEYS = new Set(["active", "approved", "confirmed", "published", "public", "success", "completed", "paid", "succeeded"]);

const WARNING_KEYS = new Set([
    "pending",
    "warning",
    "in_review",
    "inreview",
    "submitted",
    "awaiting",
    "awaiting_approval",
    "draft",
    "processing",
]);

const ERROR_KEYS = new Set(["rejected", "failed", "error", "denied", "declined", "inactive"]);

const MUTED_KEYS = new Set(["archived", "private", "refund", "refunded", "cancelled", "canceled", "muted", "unknown"]);

/** Catalog item visibility (API: Public | Hidden). */
export const CATALOG_VISIBILITY_TONE_MAP: Record<string, StatusBadgeTone> = {
    public: "success",
    hidden: "muted",
    private: "muted",
};

/** Catalog item lifecycle (API: Published | Draft | Archived). */
export const CATALOG_ITEM_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    published: "success",
    active: "success",
    archived: "muted",
    draft: "warning",
};

/** Business plan lifecycle — same values as catalog items. */
export const CATALOG_PLAN_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = CATALOG_ITEM_STATUS_TONE_MAP;

export const SUBSCRIPTION_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    active: "success",
    complete: "success",
    pending: "warning",
    past_due: "warning",
    scheduled_cancellation: "warning",
    cancelled: "muted",
    canceled: "muted",
    suspended: "muted",
};

export const ORG_DELETION_REQUEST_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    approved: "success",
    approvedpendingperiodend: "warning",
    rejected: "error",
    pending: "warning",
};

export const ORG_REQUEST_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    approved: "success",
    rejected: "error",
    pending: "warning",
};

export const ORG_MEMBER_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    active: "success",
    invited: "warning",
    inactive: "muted",
};

export const TRACEABILITY_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    confirmed: "success",
    failed: "error",
    pending: "warning",
};

export const AGENT_EXECUTION_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    success: "success",
    completed: "success",
    error: "error",
    failed: "error",
};

export const PAYMENT_STATUS_TONE_MAP: Record<string, StatusBadgeTone> = {
    confirmed: "success",
    confirm: "success",
    succeeded: "success",
    succeed: "success",
    paid: "success",
    failed: "error",
    fail: "error",
    error: "error",
    pending: "warning",
    refund: "muted",
    refunded: "muted",
};

const ORGANIZATION_STATUS_KIND_TONE: Record<OrganizationStatusKind, StatusBadgeTone> = {
    approved: "success",
    pending: "warning",
    rejected: "error",
};

export function normalizeStatusKey(value: string): string {
    return (value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

export function resolveStatusBadgeTone(status: string, customMap?: Record<string, StatusBadgeTone>): StatusBadgeTone {
    const key = normalizeStatusKey(status);

    if (customMap && customMap[key]) {
        return customMap[key];
    }

    if (SUCCESS_KEYS.has(key)) {
        return "success";
    }

    if (WARNING_KEYS.has(key)) {
        return "warning";
    }

    if (ERROR_KEYS.has(key)) {
        return "error";
    }

    if (MUTED_KEYS.has(key)) {
        return "muted";
    }

    return "muted";
}

export function statusBadgeToneClass(tone: StatusBadgeTone): string {
    return `status-badge--${tone}`;
}

export function statusBadgeClass(status: string, customMap?: Record<string, StatusBadgeTone>): string {
    const tone = resolveStatusBadgeTone(status, customMap);
    return statusBadgeClassFromTone(tone);
}

/**
 * Badge for catalog items in plan component picker (published + public = success; published hidden = warning).
 */
export function catalogComponentStatusBadgeClass(status: string, visibility: string): string {
    const normalizedStatus = normalizeStatusKey(status);
    const normalizedVisibility = normalizeStatusKey(visibility);

    if (normalizedStatus === "archived") {
        return statusBadgeClass(status, CATALOG_ITEM_STATUS_TONE_MAP);
    }
    if (normalizedStatus === "published" && normalizedVisibility === "public") {
        return statusBadgeClass(status, CATALOG_ITEM_STATUS_TONE_MAP);
    }
    if (normalizedStatus === "published") {
        return statusBadgeClassFromTone("warning");
    }
    return statusBadgeClass(status, CATALOG_ITEM_STATUS_TONE_MAP);
}

export function statusBadgeClassFromTone(tone: StatusBadgeTone): string {
    return `status-badge ${statusBadgeToneClass(tone)}`;
}

export function resolveOrganizationStatusKind(org: OrganizationStatusInput): OrganizationStatusKind {
    const rawStatus = (org.status || org.approvalStatus || org.verificationStatus || "").toLowerCase().trim();

    if (rawStatus === "rejected" || rawStatus === "denied" || rawStatus === "declined") {
        return "rejected";
    }

    if (org.isActive) {
        return "approved";
    }

    if (
        rawStatus === "pending" ||
        rawStatus === "submitted" ||
        rawStatus === "in_review" ||
        rawStatus === "awaiting" ||
        rawStatus === "awaiting_approval"
    ) {
        return "pending";
    }

    if (rawStatus === "approved" || rawStatus === "active") {
        return "approved";
    }

    return "rejected";
}

export function organizationStatusTone(kind: OrganizationStatusKind): StatusBadgeTone {
    return ORGANIZATION_STATUS_KIND_TONE[kind];
}
