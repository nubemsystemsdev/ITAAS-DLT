"use strict";

import { TraceEventItem } from "@/api/definitions";

export const TRACE_EVENT_TYPE_LABEL_KEYS: Record<string, string> = {
    "catalog.created": "Trace event: catalog created",
    "catalog.published": "Trace event: catalog published",
    "catalog.updated": "Trace event: catalog updated",
    "catalog.withdrawn": "Trace event: catalog withdrawn",
    "catalog.deleted": "Trace event: catalog deleted",
    "catalog.visibility.changed": "Trace event: catalog visibility changed",
    "subscription.created": "Trace event: subscription created",
    "subscription.renewed": "Trace event: subscription renewed",
    "subscription.changed": "Trace event: subscription changed",
    "subscription.suspended": "Trace event: subscription suspended",
    "subscription.reactivated": "Trace event: subscription reactivated",
    "subscription.cancelled": "Trace event: subscription cancelled",
    "license.assigned": "Trace event: license assigned",
    "license.revoked": "Trace event: license revoked",
    "license.reactivated": "Trace event: license reactivated",
    "organization.registered": "Trace event: organization registered",
    "organization.deactivated": "Trace event: organization deactivated",
    "organization.reactivated": "Trace event: organization reactivated",
    "organization.member.added": "Trace event: organization member added",
    "organization.member.reactivated": "Trace event: organization member reactivated",
    "organization.member.removed": "Trace event: organization member removed",
    "organization.member.role.changed": "Trace event: organization member role changed",
    "payment.confirmed": "Trace event: payment confirmed",
    "purchase.recorded": "Trace event: purchase recorded",
    "purchase.item.recorded": "Trace event: purchase item recorded",
    "token.earned": "Trace event: token earned",
    "token.redeemed": "Trace event: token redeemed",
    "token.reverted": "Trace event: token reverted",
    "admin.role.assigned": "Trace event: admin role assigned",
    "admin.role.revoked": "Trace event: admin role revoked",
    "admin.sensitive.operation": "Trace event: admin sensitive operation",
};

type TraceReferenceLabels = {
    organization: string;
    user: string;
    membership: string;
    license: string;
    subscription: string;
};

export function parseTraceEventPayload(payloadJson: string | undefined): Record<string, unknown> {
    if (!payloadJson) {
        return {};
    }

    try {
        const parsed: unknown = JSON.parse(payloadJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return {};
    }

    return {};
}

function payloadString(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];
    if (typeof value === "string") {
        return value.trim();
    }
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}

export function formatTraceEventReference(
    entry: Pick<TraceEventItem, "eventType" | "subjectId" | "correlationId" | "payloadJson">,
    truncate: (value: string, maxLength: number) => string,
    labels: TraceReferenceLabels,
): string {
    const payload = parseTraceEventPayload(entry.payloadJson);
    const organizationId = payloadString(payload, "organizationId");
    const userId = payloadString(payload, "userId");
    const eventType = (entry.eventType || "").trim();

    if (eventType.startsWith("license.")) {
        const parts: string[] = [];

        if (organizationId) {
            parts.push(`${labels.organization}: ${truncate(organizationId, 16)}`);
        } else if (eventType === "license.revoked" && entry.correlationId) {
            parts.push(`${labels.organization}: ${truncate(entry.correlationId, 16)}`);
        }

        if (userId) {
            parts.push(`${labels.user}: ${truncate(userId, 16)}`);
        }

        if (entry.subjectId) {
            parts.push(`${labels.license}: ${truncate(entry.subjectId, 16)}`);
        }

        if (eventType !== "license.revoked" && entry.correlationId) {
            parts.push(`${labels.subscription}: ${truncate(entry.correlationId, 16)}`);
        }

        if (parts.length > 0) {
            return parts.join(" · ");
        }
    }

    if (eventType.startsWith("organization.member.")) {
        const parts: string[] = [];

        if (entry.correlationId) {
            parts.push(`${labels.organization}: ${truncate(entry.correlationId, 16)}`);
        }

        if (userId) {
            parts.push(`${labels.user}: ${truncate(userId, 16)}`);
        }

        if (entry.subjectId) {
            parts.push(`${labels.membership}: ${truncate(entry.subjectId, 16)}`);
        }

        if (parts.length > 0) {
            return parts.join(" · ");
        }
    }

    if (eventType.startsWith("organization.")) {
        return truncate(entry.subjectId || entry.correlationId || "-", 20);
    }

    return truncate(entry.subjectId || entry.correlationId || "-", 20);
}
