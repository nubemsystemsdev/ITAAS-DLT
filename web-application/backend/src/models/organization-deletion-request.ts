// OrganizationDeletionRequest - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization_deletion_request";
const PRIMARY_KEY = "id";

export enum OrganizationDeletionRequestStatus {
    PENDING = "Pending",
    APPROVED_PENDING_PERIOD_END = "ApprovedPendingPeriodEnd",
    APPROVED = "Approved",
    REJECTED = "Rejected",
}

export enum OrganizationDeletionSubscriptionPreference {
    IMMEDIATE_PRORATED_REFUND = "ImmediateProratedRefund",
    AT_PERIOD_END = "AtPeriodEnd",
}

/* db-index: organizationId */
/* db-index: status */
/* db-index: requestedAt */

export class OrganizationDeletionRequest extends DataModel {
    public static readonly finder = new DataFinder<OrganizationDeletionRequest, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<OrganizationDeletionRequest>) => new OrganizationDeletionRequest(data),
    );

    public static async findById(id: string): Promise<OrganizationDeletionRequest> {
        return OrganizationDeletionRequest.finder.findByKey(id);
    }

    public static async findPendingByOrganizationId(organizationId: string): Promise<OrganizationDeletionRequest | null> {
        const items = await OrganizationDeletionRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("status", OrganizationDeletionRequestStatus.PENDING),
            ),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return items[0] || null;
    }

    /** Pending approval or approved but waiting for subscriptions to end. */
    public static async findActiveClosureByOrganizationId(organizationId: string): Promise<OrganizationDeletionRequest | null> {
        const items = await OrganizationDeletionRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.into("status", [
                    OrganizationDeletionRequestStatus.PENDING,
                    OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END,
                ]),
            ),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return items[0] || null;
    }

    public static async findApprovedPendingPeriodEndByOrganizationId(organizationId: string): Promise<OrganizationDeletionRequest | null> {
        const items = await OrganizationDeletionRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("status", OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END),
            ),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return items[0] || null;
    }

    public static async findLatestByOrganizationId(organizationId: string): Promise<OrganizationDeletionRequest | null> {
        const items = await OrganizationDeletionRequest.finder.find(
            DataFilter.equals("organizationId", organizationId),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return items[0] || null;
    }

    public static makeFilter(q?: string, status?: string): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.equals("organizationId", q),
                DataFilter.startsWith("requestedByUserId", q, true),
            ));
        }

        if (status) {
            filters.push(DataFilter.equals("status", status));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(q?: string, status?: string): Promise<number> {
        return OrganizationDeletionRequest.finder.count(OrganizationDeletionRequest.makeFilter(q, status));
    }

    public static async findFiltered(skip: number, limit: number, q?: string, status?: string): Promise<OrganizationDeletionRequest[]> {
        return OrganizationDeletionRequest.finder.find(
            OrganizationDeletionRequest.makeFilter(q, status),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async createRequest(data: {
        organizationId: string;
        requestedByUserId: string;
        subscriptionPreference: OrganizationDeletionSubscriptionPreference;
    }): Promise<OrganizationDeletionRequest> {
        const request = new OrganizationDeletionRequest({
            id: createRandomUID(),
            organizationId: data.organizationId,
            requestedByUserId: data.requestedByUserId,
            subscriptionPreference: data.subscriptionPreference,
            resolvedSubscriptionHandling: "",
            status: OrganizationDeletionRequestStatus.PENDING,
            requestedAt: Date.now(),
            resolvedAt: 0,
            resolvedByUserId: "",
            rejectionReason: "",
        });

        await request.insert();
        return request;
    }

    /** Platform direct delete deferred until subscriptions end. */
    public static async createApprovedPendingPeriodEnd(data: {
        organizationId: string;
        requestedByUserId: string;
        subscriptionPreference: OrganizationDeletionSubscriptionPreference;
        resolvedByUserId: string;
        resolvedSubscriptionHandling: OrganizationDeletionSubscriptionPreference;
    }): Promise<OrganizationDeletionRequest> {
        const now = Date.now();
        const request = new OrganizationDeletionRequest({
            id: createRandomUID(),
            organizationId: data.organizationId,
            requestedByUserId: data.requestedByUserId,
            subscriptionPreference: data.subscriptionPreference,
            resolvedSubscriptionHandling: data.resolvedSubscriptionHandling,
            status: OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END,
            requestedAt: now,
            resolvedAt: now,
            resolvedByUserId: data.resolvedByUserId,
            rejectionReason: "",
        });

        await request.insert();
        return request;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: VARCHAR */
    public requestedByUserId: string;
    /* db-type: VARCHAR */
    public subscriptionPreference: string;
    /* db-type: VARCHAR */
    public resolvedSubscriptionHandling: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: INT */
    public requestedAt: number;
    /* db-type: INT */
    public resolvedAt: number;
    /* db-type: VARCHAR */
    public resolvedByUserId: string;
    /* db-type: TEXT */
    public rejectionReason: string;

    constructor(data: TypedRow<OrganizationDeletionRequest>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.requestedByUserId = enforceType(data.requestedByUserId, "string") || "";
        this.subscriptionPreference = enforceType(data.subscriptionPreference, "string") || "";
        this.resolvedSubscriptionHandling = enforceType(data.resolvedSubscriptionHandling, "string") || "";
        this.status = enforceType(data.status, "string") || OrganizationDeletionRequestStatus.PENDING;
        this.requestedAt = enforceType(data.requestedAt, "number") || Date.now();
        this.resolvedAt = enforceType(data.resolvedAt, "number") || 0;
        this.resolvedByUserId = enforceType(data.resolvedByUserId, "string") || "";
        this.rejectionReason = enforceType(data.rejectionReason, "string") || "";

        this.init();
    }
}
