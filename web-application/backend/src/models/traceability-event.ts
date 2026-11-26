// TraceabilityEvent - tsbean-orm class

"use strict";

import { createHash } from "crypto";
import { DataModel, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions, TypedRow, enforceType } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";
import { Organization } from "./organization";
import { OrganizationMembership } from "./organization-membership";
import { toChainTraceabilityEntityId } from "../utils/traceability-id";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "traceability_event";
const PRIMARY_KEY = "id";

export enum TraceabilityDomain {
    SUBSCRIPTION = "subscription",
    CATALOG = "catalog",
    PAYMENT = "payment",
    PURCHASE = "purchase",
    TOKEN = "token",
    ADMIN = "admin",
    ORGANIZATION = "organization",
}

export enum TraceabilityEventType {
    CATALOG_CREATED = "catalog.created",
    SUBSCRIPTION_CREATED = "subscription.created",
    SUBSCRIPTION_RENEWED = "subscription.renewed",
    SUBSCRIPTION_CHANGED = "subscription.changed",
    SUBSCRIPTION_SUSPENDED = "subscription.suspended",
    SUBSCRIPTION_REACTIVATED = "subscription.reactivated",
    SUBSCRIPTION_CANCELLED = "subscription.cancelled",
    LICENSE_ASSIGNED = "license.assigned",
    LICENSE_REVOKED = "license.revoked",
    LICENSE_REACTIVATED = "license.reactivated",
    ORGANIZATION_REGISTERED = "organization.registered",
    ORGANIZATION_DEACTIVATED = "organization.deactivated",
    ORGANIZATION_REACTIVATED = "organization.reactivated",
    ORGANIZATION_MEMBER_ADDED = "organization.member.added",
    ORGANIZATION_MEMBER_REACTIVATED = "organization.member.reactivated",
    ORGANIZATION_MEMBER_REMOVED = "organization.member.removed",
    ORGANIZATION_MEMBER_ROLE_CHANGED = "organization.member.role.changed",
    CATALOG_PUBLISHED = "catalog.published",
    CATALOG_UPDATED = "catalog.updated",
    CATALOG_WITHDRAWN = "catalog.withdrawn",
    CATALOG_DELETED = "catalog.deleted",
    CATALOG_VISIBILITY_CHANGED = "catalog.visibility.changed",
    PAYMENT_CONFIRMED = "payment.confirmed",
    PURCHASE_RECORDED = "purchase.recorded",
    PURCHASE_ITEM_RECORDED = "purchase.item.recorded",
    TOKEN_EARNED = "token.earned",
    TOKEN_REDEEMED = "token.redeemed",
    TOKEN_REVERTED = "token.reverted",
    ADMIN_ROLE_ASSIGNED = "admin.role.assigned",
    ADMIN_ROLE_REVOKED = "admin.role.revoked",
    ADMIN_SENSITIVE_OPERATION = "admin.sensitive.operation",
}

export enum TraceabilityStatus {
    PENDING = "pending",
    SENT = "sent",
    CONFIRMED = "confirmed",
    FAILED = "failed",
}

export interface TraceStatusCounts {
    pending: number;
    sent: number;
    confirmed: number;
    failed: number;
}

export const TRACEABILITY_EVENT_TYPE_VALUES: ReadonlySet<string> = new Set<string>(Object.values(TraceabilityEventType));

export function isTraceabilityEventType(value: string): value is TraceabilityEventType {
    return TRACEABILITY_EVENT_TYPE_VALUES.has(((value || "") + "").trim());
}

/* db-index: eventId */
/* db-index: eventType */
/* db-index: domain */
/* db-index: subjectId */
/* db-index: correlationId */
/* db-index: actorIdHash */
/* db-index: subjectUserIdHash */
/* db-index: status */
/* db-index: createdAt */

export class TraceabilityEvent extends DataModel {
    public static readonly finder = new DataFinder<TraceabilityEvent, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<TraceabilityEvent>) => new TraceabilityEvent(data));

    public static async findById(id: string): Promise<TraceabilityEvent> {
        return TraceabilityEvent.finder.findByKey(id);
    }

    public static async findByEventId(eventId: string): Promise<TraceabilityEvent> {
        const res = await TraceabilityEvent.finder.find(DataFilter.equals("eventId", eventId));
        return res[0] || null;
    }

    public static async findBySubjectId(subjectId: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(DataFilter.equals("subjectId", subjectId), OrderBy.desc("createdAt"));
    }

    public static async findByCorrelationId(correlationId: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(DataFilter.equals("correlationId", correlationId), OrderBy.asc("createdAt"));
    }

    public static async findByDomain(domain: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(DataFilter.equals("domain", domain), OrderBy.desc("createdAt"));
    }

    public static async findByEventType(eventType: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(DataFilter.equals("eventType", eventType), OrderBy.desc("createdAt"));
    }

    public static async findByTxHashEventAndSubject(txHash: string, eventType: string, subjectId: string): Promise<TraceabilityEvent | null> {
        if (!txHash || !eventType || !subjectId) {
            return null;
        }
        const rows = await TraceabilityEvent.finder.find(
            DataFilter.and(
                DataFilter.equals("txHash", txHash),
                DataFilter.equals("eventType", eventType),
                DataFilter.equals("subjectId", subjectId),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return rows[0] || null;
    }

    public static async findAll(): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(DataFilter.any(), OrderBy.desc("createdAt"));
    }

    public static async countAll(domain?: string): Promise<number> {
        return TraceabilityEvent.finder.count(
            TraceabilityEvent.withOptionalDomainFilter(DataFilter.any(), domain),
        );
    }

    public static async findAllPaginated(skip: number, limit: number, domain?: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(
            TraceabilityEvent.withOptionalDomainFilter(DataFilter.any(), domain),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static async findByUid(uid: string): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(
            await TraceabilityEvent.makeUserVisibilityFilter(uid),
            OrderBy.desc("createdAt"),
        );
    }

    public static async countByUid(uid: string, domain?: string): Promise<number> {
        const visibility = await TraceabilityEvent.makeUserVisibilityFilter(uid);
        return TraceabilityEvent.finder.count(TraceabilityEvent.withOptionalDomainFilter(visibility, domain));
    }

    public static async findByUidPaginated(uid: string, skip: number, limit: number, domain?: string): Promise<TraceabilityEvent[]> {
        const visibility = await TraceabilityEvent.makeUserVisibilityFilter(uid);
        return TraceabilityEvent.finder.find(
            TraceabilityEvent.withOptionalDomainFilter(visibility, domain),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static isTraceabilityDomain(value: string): value is TraceabilityDomain {
        return Object.values(TraceabilityDomain).includes(value as TraceabilityDomain);
    }

    public static withOptionalDomainFilter(base: DataFilter, domain?: string): DataFilter {
        const normalized = (domain || "").trim();
        if (!normalized || !TraceabilityEvent.isTraceabilityDomain(normalized)) {
            return base;
        }
        return DataFilter.and(base, DataFilter.equals("domain", normalized));
    }

    private static async makeUserVisibilityFilter(uid: string): Promise<DataFilter> {
        const userHash = TraceabilityEvent.hashActorId(uid);
        const conditions: DataFilter[] = [
            DataFilter.equals("actorIdHash", userHash),
            DataFilter.equals("subjectUserIdHash", userHash),
        ];

        const adminOrgLocalIds = new Set<string>();
        const adminOrgs = await Organization.findByAdminUid(uid);
        for (const org of adminOrgs) {
            if (org.id) {
                adminOrgLocalIds.add(org.id);
            }
        }
        const adminMemberships = await OrganizationMembership.findActiveAdminByUser(uid);
        for (const membership of adminMemberships) {
            if (membership.organizationId) {
                adminOrgLocalIds.add(membership.organizationId);
            }
        }

        const chainOrgIds = [...adminOrgLocalIds].map(orgId => toChainTraceabilityEntityId(orgId));
        if (chainOrgIds.length === 1) {
            conditions.push(DataFilter.and(
                DataFilter.equals("domain", TraceabilityDomain.ORGANIZATION),
                DataFilter.equals("correlationId", chainOrgIds[0]),
            ));
        } else if (chainOrgIds.length > 1) {
            conditions.push(DataFilter.and(
                DataFilter.equals("domain", TraceabilityDomain.ORGANIZATION),
                DataFilter.into("correlationId", chainOrgIds),
            ));
        }

        return DataFilter.or(...conditions);
    }

    public static async findPending(limit = 100): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(
            DataFilter.equals("status", TraceabilityStatus.PENDING),
            OrderBy.asc("createdAt"),
        ).then(rows => rows.slice(0, limit));
    }

    public static async countByStatus(status: TraceabilityStatus): Promise<number> {
        return TraceabilityEvent.finder.count(DataFilter.equals("status", status));
    }

    public static async countByStatusForAdmin(domain?: string): Promise<TraceStatusCounts> {
        const base = TraceabilityEvent.withOptionalDomainFilter(DataFilter.any(), domain);
        return TraceabilityEvent.countByStatusGrouped(base);
    }

    public static async countByStatusForUid(uid: string, domain?: string): Promise<TraceStatusCounts> {
        const visibility = await TraceabilityEvent.makeUserVisibilityFilter(uid);
        const base = TraceabilityEvent.withOptionalDomainFilter(visibility, domain);
        return TraceabilityEvent.countByStatusGrouped(base);
    }

    private static async countByStatusGrouped(base: DataFilter): Promise<TraceStatusCounts> {
        const statuses: TraceabilityStatus[] = [
            TraceabilityStatus.PENDING,
            TraceabilityStatus.SENT,
            TraceabilityStatus.CONFIRMED,
            TraceabilityStatus.FAILED,
        ];
        const counts = await Promise.all(
            statuses.map((status) =>
                TraceabilityEvent.finder.count(DataFilter.and(base, DataFilter.equals("status", status))),
            ),
        );
        return {
            pending: counts[0],
            sent: counts[1],
            confirmed: counts[2],
            failed: counts[3],
        };
    }

    public static async findCreatedSince(sinceTimestamp: number, limit = 10000): Promise<TraceabilityEvent[]> {
        return TraceabilityEvent.finder.find(
            DataFilter.greaterOrEquals("createdAt", Math.floor(sinceTimestamp)),
            OrderBy.asc("createdAt"),
            SelectOptions.configure().setMaxRows(Math.max(1, Math.min(limit, 10000))),
        );
    }

    public static async findByFilters(filters: {
        domain?: string;
        eventType?: string;
        subjectId?: string;
        correlationId?: string;
        status?: string;
    }, skip: number, limit: number): Promise<{ total: number; events: TraceabilityEvent[] }> {
        const conditions: DataFilter[] = [];

        if (filters.domain) {
            conditions.push(DataFilter.equals("domain", filters.domain));
        }
        if (filters.eventType) {
            conditions.push(DataFilter.equals("eventType", filters.eventType));
        }
        if (filters.subjectId) {
            conditions.push(DataFilter.equals("subjectId", filters.subjectId));
        }
        if (filters.correlationId) {
            conditions.push(DataFilter.equals("correlationId", filters.correlationId));
        }
        if (filters.status) {
            conditions.push(DataFilter.equals("status", filters.status));
        }

        const filter = conditions.length > 0 ? DataFilter.and(...conditions) : DataFilter.any();
        const total = await TraceabilityEvent.finder.count(filter);
        const events = await TraceabilityEvent.finder.find(
            filter,
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );

        return { total, events };
    }

    public static async create(input: {
        eventId: string;
        eventType: string;
        domain: string;
        subjectId: string;
        correlationId: string;
        actorIdHash: string;
        subjectUserIdHash?: string;
        status: string;
        txHash: string;
        blockNumber: number;
    }): Promise<TraceabilityEvent> {
        const now = Date.now();
        const evt = new TraceabilityEvent({
            id: createRandomUID(),
            eventId: input.eventId,
            eventType: input.eventType,
            domain: input.domain,
            subjectId: input.subjectId,
            correlationId: input.correlationId,
            actorIdHash: input.actorIdHash,
            subjectUserIdHash: input.subjectUserIdHash || "",
            status: input.status,
            txHash: input.txHash,
            blockNumber: input.blockNumber,
            createdAt: now,
        });
        await evt.insert();
        return evt;
    }

    private static hashActorId(actorId: string): string {
        return createHash("sha256").update(actorId).digest("hex");
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public eventId: string;
    /* db-type: VARCHAR */
    public eventType: string;
    /* db-type: VARCHAR */
    public domain: string;
    /* db-type: VARCHAR */
    public subjectId: string;
    /* db-type: VARCHAR */
    public correlationId: string;
    /* db-type: VARCHAR */
    public actorIdHash: string;
    /* db-type: VARCHAR */
    public subjectUserIdHash: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: VARCHAR */
    public txHash: string;
    /* db-type: INT */
    public blockNumber: number;
    /* db-type: INT */
    public createdAt: number;

    constructor(data: TypedRow<TraceabilityEvent>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.eventId = enforceType(data.eventId, "string") || "";
        this.eventType = enforceType(data.eventType, "string") || "";
        this.domain = enforceType(data.domain, "string") || "";
        this.subjectId = enforceType(data.subjectId, "string") || "";
        this.correlationId = enforceType(data.correlationId, "string") || "";
        this.actorIdHash = enforceType(data.actorIdHash, "string") || "";
        this.subjectUserIdHash = enforceType(data.subjectUserIdHash, "string") || "";
        this.status = enforceType(data.status, "string") || TraceabilityStatus.PENDING;
        this.txHash = enforceType(data.txHash, "string") || "";
        this.blockNumber = enforceType(data.blockNumber, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();

        this.init();
    }
}
