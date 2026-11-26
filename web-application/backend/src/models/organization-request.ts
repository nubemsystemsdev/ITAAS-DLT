// OrganizationRequest - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization_request";
const PRIMARY_KEY = "id";

export enum OrganizationRequestStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    REJECTED = "Rejected"
}

/* db-index: status */
/* db-index: requestedAt */

export class OrganizationRequest extends DataModel {
    public static readonly finder = new DataFinder<OrganizationRequest, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<OrganizationRequest>) => new OrganizationRequest(data));

    public static async findById(id: string): Promise<OrganizationRequest> {
        return OrganizationRequest.finder.findByKey(id);
    }

    public static async findPendingByUid(uid: string): Promise<OrganizationRequest[]> {
        return OrganizationRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("uid", uid),
                DataFilter.equals("status", OrganizationRequestStatus.PENDING),
            ),
        );
    }

    public static async findLatestByUid(uid: string): Promise<OrganizationRequest | null> {
        const items = await OrganizationRequest.finder.find(
            DataFilter.equals("uid", uid),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setMaxRows(1),
        );
        return items.length > 0 ? items[0] : null;
    }

    public static makeFilter(q?: string, status?: string): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("companyName", q, true),
                DataFilter.startsWith("cifNif", q, true),
                DataFilter.startsWith("applicantEmail", q, true),
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
        return OrganizationRequest.finder.count(OrganizationRequest.makeFilter(q, status));
    }

    public static async findFiltered(skip: number, limit: number, q?: string, status?: string): Promise<OrganizationRequest[]> {
        return OrganizationRequest.finder.find(
            OrganizationRequest.makeFilter(q, status),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findPending(): Promise<OrganizationRequest[]> {
        return OrganizationRequest.finder.find(
            DataFilter.equals("status", OrganizationRequestStatus.PENDING),
            OrderBy.desc("requestedAt"),
            SelectOptions.configure(),
        );
    }

    /**
     * Deletes approved creation requests that match the organization creator and CIF/NIF.
     * @returns Number of deleted requests
     */
    public static async deleteApprovedByCreatorAndCifNif(creatorUid: string, cifNif: string): Promise<number> {
        const uid = (creatorUid || "").trim();
        const taxId = (cifNif || "").trim();
        if (!uid || !taxId) {
            return 0;
        }

        const items = await OrganizationRequest.finder.find(
            DataFilter.and(
                DataFilter.equals("uid", uid),
                DataFilter.equals("cifNif", taxId),
                DataFilter.equals("status", OrganizationRequestStatus.APPROVED),
            ),
        );

        for (const item of items) {
            await item.delete();
        }

        return items.length;
    }

    public static async createRequest(data: {
        uid: string;
        companyName: string;
        cifNif: string;
        country: string;
        fiscalAddress: string;
        applicantEmail: string;
    }): Promise<OrganizationRequest> {
        const request = new OrganizationRequest({
            id: createRandomUID(),
            uid: data.uid,
            companyName: data.companyName,
            cifNif: data.cifNif,
            country: data.country,
            fiscalAddress: data.fiscalAddress,
            applicantEmail: data.applicantEmail,
            status: OrganizationRequestStatus.PENDING,
            requestedAt: Date.now(),
            resolvedAt: 0,
        });

        await request.insert();
        return request;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public uid: string;
    /* db-type: VARCHAR */
    public companyName: string;
    /* db-type: VARCHAR */
    public cifNif: string;
    /* db-type: VARCHAR */
    public country: string;
    /* db-type: VARCHAR */
    public fiscalAddress: string;
    /* db-type: VARCHAR */
    public applicantEmail: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: INT */
    public requestedAt: number;
    /* db-type: INT */
    public resolvedAt: number;

    constructor(data: TypedRow<OrganizationRequest>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.companyName = enforceType(data.companyName, "string") || "";
        this.cifNif = enforceType(data.cifNif, "string") || "";
        this.country = enforceType(data.country, "string") || "";
        this.fiscalAddress = enforceType(data.fiscalAddress, "string") || "";
        this.applicantEmail = enforceType(data.applicantEmail, "string") || "";
        this.uid = enforceType(data.uid, "string") || "";
        this.status = enforceType(data.status, "string") || OrganizationRequestStatus.PENDING;
        this.requestedAt = enforceType(data.requestedAt, "number") || Date.now();
        this.resolvedAt = enforceType(data.resolvedAt, "number") || 0;

        this.init();
    }
}
