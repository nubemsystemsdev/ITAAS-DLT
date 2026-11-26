// CustomAgentRequest - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "custom_agent_request";
const PRIMARY_KEY = "id";

export enum CustomAgentRequestStatus {
    PENDING_REVIEW = "pending_review",
    REJECTED = "rejected",
    PENDING_PAYMENT = "pending_payment",
    IN_DEVELOPMENT = "in_development",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
}

export enum CustomAgentRequestType {
    ADAPTATION = "adaptation",
    CUSTOM = "custom",
}

export const CUSTOM_AGENT_REQUEST_TRANSITIONS: Record<CustomAgentRequestStatus, CustomAgentRequestStatus[]> = {
    [CustomAgentRequestStatus.PENDING_REVIEW]: [
        CustomAgentRequestStatus.REJECTED,
        CustomAgentRequestStatus.PENDING_PAYMENT,
        CustomAgentRequestStatus.CANCELLED,
    ],
    [CustomAgentRequestStatus.REJECTED]: [],
    [CustomAgentRequestStatus.PENDING_PAYMENT]: [
        CustomAgentRequestStatus.IN_DEVELOPMENT,
        CustomAgentRequestStatus.CANCELLED,
    ],
    [CustomAgentRequestStatus.IN_DEVELOPMENT]: [
        CustomAgentRequestStatus.DELIVERED,
    ],
    [CustomAgentRequestStatus.DELIVERED]: [],
    [CustomAgentRequestStatus.CANCELLED]: [],
};

/* db-index: status */
/* db-index: requesterUserId */
/* db-index: organizationId */
/* db-index: createdAt */
/* db-index: paymentId */
/* db-index: monthlySubscriptionId */

export class CustomAgentRequest extends DataModel {
    public static readonly finder = new DataFinder<CustomAgentRequest, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<CustomAgentRequest>) => new CustomAgentRequest(data));

    public static async findById(id: string): Promise<CustomAgentRequest> {
        return CustomAgentRequest.finder.findByKey(id);
    }

    public static async findByRequesterUserId(requesterUserId: string): Promise<CustomAgentRequest[]> {
        return CustomAgentRequest.finder.find(
            DataFilter.equals("requesterUserId", requesterUserId),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByOrganizationId(organizationId: string): Promise<CustomAgentRequest[]> {
        return CustomAgentRequest.finder.find(
            DataFilter.equals("organizationId", organizationId),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByPaymentId(paymentId: string): Promise<CustomAgentRequest | null> {
        const id = ((paymentId || "") + "").trim();
        if (!id) {
            return null;
        }

        const rows = await CustomAgentRequest.finder.find(
            DataFilter.equals("paymentId", id),
            OrderBy.desc("updatedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return rows[0] || null;
    }

    public static async findByMonthlySubscriptionId(monthlySubscriptionId: string): Promise<CustomAgentRequest | null> {
        const id = ((monthlySubscriptionId || "") + "").trim();
        if (!id) {
            return null;
        }

        const rows = await CustomAgentRequest.finder.find(
            DataFilter.equals("monthlySubscriptionId", id),
            OrderBy.desc("updatedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return rows[0] || null;
    }

    /**
     * Finds an in-progress or delivered custom-agent request that owns this Flowise flow.
     */
    public static async findExclusiveByDeliveredFlowiseFlowId(flowId: string): Promise<CustomAgentRequest | null> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return null;
        }

        const rows = await CustomAgentRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("deliveredFlowiseFlowId", id),
                DataFilter.into("status", [
                    CustomAgentRequestStatus.IN_DEVELOPMENT,
                    CustomAgentRequestStatus.DELIVERED,
                ]),
            ),
            OrderBy.desc("updatedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return rows[0] || null;
    }

    /**
     * Counts open requests for a billing subject (organization or personal user).
     * Open = pending_review, pending_payment, or in_development.
     */
    public static async countOpenBySubject(requesterUserId: string, organizationId?: string): Promise<number> {
        const openStatuses = [
            CustomAgentRequestStatus.PENDING_REVIEW,
            CustomAgentRequestStatus.PENDING_PAYMENT,
            CustomAgentRequestStatus.IN_DEVELOPMENT,
        ];
        const orgId = ((organizationId || "") + "").trim();
        if (orgId) {
            return CustomAgentRequest.finder.count(DataFilter.and(
                DataFilter.equals("organizationId", orgId),
                DataFilter.into("status", openStatuses),
            ));
        }

        const uid = ((requesterUserId || "") + "").trim();
        if (!uid) {
            return 0;
        }

        return CustomAgentRequest.finder.count(DataFilter.and(
            DataFilter.equals("requesterUserId", uid),
            DataFilter.equals("organizationId", ""),
            DataFilter.into("status", openStatuses),
        ));
    }

    public static makeFilter(q?: string, status?: string, requesterUserIds?: string[]): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            if (requesterUserIds && requesterUserIds.length > 0) {
                filters.push(DataFilter.or(
                    DataFilter.equals("id", q),
                    DataFilter.equals("requesterUserId", q),
                    DataFilter.equals("organizationId", q),
                    DataFilter.startsWith("description", q, true),
                    DataFilter.into("requesterUserId", requesterUserIds),
                ));
            } else {
                filters.push(DataFilter.or(
                    DataFilter.equals("id", q),
                    DataFilter.equals("requesterUserId", q),
                    DataFilter.equals("organizationId", q),
                    DataFilter.startsWith("description", q, true),
                ));
            }
        }

        if (status) {
            filters.push(DataFilter.equals("status", status));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(q?: string, status?: string, requesterUserIds?: string[]): Promise<number> {
        return CustomAgentRequest.finder.count(CustomAgentRequest.makeFilter(q, status, requesterUserIds));
    }

    public static async findFiltered(
        skip: number,
        limit: number,
        q?: string,
        status?: string,
        requesterUserIds?: string[],
    ): Promise<CustomAgentRequest[]> {
        return CustomAgentRequest.finder.find(
            CustomAgentRequest.makeFilter(q, status, requesterUserIds),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static canTransition(from: string, to: string): boolean {
        const allowed = CUSTOM_AGENT_REQUEST_TRANSITIONS[from as CustomAgentRequestStatus];
        if (!allowed) {
            return false;
        }
        return allowed.indexOf(to as CustomAgentRequestStatus) >= 0;
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public static assertTransition(from: string, to: string): void {
        if (!CustomAgentRequest.canTransition(from, to)) {
            throw new Error("INVALID_STATUS");
        }
    }

    public static async createRequest(data: {
        requestType: CustomAgentRequestType;
        description: string;
        requesterUserId: string;
        organizationId?: string;
        baseAgentId?: string;
        baseFlowiseFlowId?: string;
        status?: CustomAgentRequestStatus;
    }): Promise<CustomAgentRequest> {
        const now = Date.now();
        const request = new CustomAgentRequest({
            id: createRandomUID(),
            status: data.status || CustomAgentRequestStatus.PENDING_REVIEW,
            requestType: data.requestType,
            description: data.description,
            baseAgentId: data.baseAgentId || "",
            baseFlowiseFlowId: data.baseFlowiseFlowId || "",
            requesterUserId: data.requesterUserId,
            organizationId: data.organizationId || "",
            adminRejectionReason: "",
            paymentId: "",
            deliveredAgentId: "",
            deliveredFlowiseFlowId: "",
            monthlySubscriptionId: "",
            closedFromStatus: "",
            createdAt: now,
            updatedAt: now,
        });

        await request.insert();
        return request;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: VARCHAR */
    public requestType: string;
    /* db-type: TEXT */
    public description: string;
    /* db-type: VARCHAR */
    public baseAgentId: string;
    /* db-type: VARCHAR */
    public baseFlowiseFlowId: string;
    /* db-type: VARCHAR */
    public requesterUserId: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: TEXT */
    public adminRejectionReason: string;
    /* db-type: VARCHAR */
    public paymentId: string;
    /* db-type: VARCHAR */
    public deliveredAgentId: string;
    /* db-type: VARCHAR */
    public deliveredFlowiseFlowId: string;
    /* db-type: VARCHAR */
    public monthlySubscriptionId: string;
    /* db-type: VARCHAR */
    public closedFromStatus: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<CustomAgentRequest>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.status = enforceType(data.status, "string") || CustomAgentRequestStatus.PENDING_REVIEW;
        this.requestType = enforceType(data.requestType, "string") || CustomAgentRequestType.CUSTOM;
        this.description = enforceType(data.description, "string") || "";
        this.baseAgentId = enforceType(data.baseAgentId, "string") || "";
        this.baseFlowiseFlowId = enforceType(data.baseFlowiseFlowId, "string") || "";
        this.requesterUserId = enforceType(data.requesterUserId, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.adminRejectionReason = enforceType(data.adminRejectionReason, "string") || "";
        this.paymentId = enforceType(data.paymentId, "string") || "";
        this.deliveredAgentId = enforceType(data.deliveredAgentId, "string") || "";
        this.deliveredFlowiseFlowId = enforceType(data.deliveredFlowiseFlowId, "string") || "";
        this.monthlySubscriptionId = enforceType(data.monthlySubscriptionId, "string") || "";
        this.closedFromStatus = enforceType(data.closedFromStatus, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public transitionTo(next: CustomAgentRequestStatus): void {
        CustomAgentRequest.assertTransition(this.status, next);
        this.status = next;
        this.updatedAt = Date.now();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public async reject(reason: string): Promise<void> {
        this.closedFromStatus = this.status;
        this.transitionTo(CustomAgentRequestStatus.REJECTED);
        this.adminRejectionReason = ((reason || "") + "").trim();
        await this.save();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public async accept(): Promise<void> {
        this.transitionTo(CustomAgentRequestStatus.PENDING_PAYMENT);
        await this.save();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public async cancel(): Promise<void> {
        this.closedFromStatus = this.status;
        this.transitionTo(CustomAgentRequestStatus.CANCELLED);
        await this.save();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public async markDepositPaid(paymentId: string): Promise<void> {
        this.transitionTo(CustomAgentRequestStatus.IN_DEVELOPMENT);
        this.paymentId = ((paymentId || "") + "").trim() || this.paymentId;
        await this.save();
    }

    /**
     * @throws Error INVALID_STATUS
     */
    public async markDelivered(flowId: string, monthlySubscriptionId: string): Promise<void> {
        this.transitionTo(CustomAgentRequestStatus.DELIVERED);
        this.deliveredFlowiseFlowId = ((flowId || "") + "").trim();
        this.monthlySubscriptionId = ((monthlySubscriptionId || "") + "").trim();
        await this.save();
    }
}
