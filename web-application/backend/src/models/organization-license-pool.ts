// OrganizationLicensePool - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization_license_pool";
const PRIMARY_KEY = "id";

export enum OrganizationLicensePoolSourceType {
    PLAN = "plan",
    ITEM = "item",
}

/** No cap on seat assignments (services / platform items). */
export const UNLIMITED_POOL_SEAT_LIMIT = -1;

export function normalizePoolSeatLimit(raw: number): number {
    const rounded = Math.round(raw || 0);
    if (rounded < 0) {
        return UNLIMITED_POOL_SEAT_LIMIT;
    }
    return Math.max(0, rounded);
}

export function isUnlimitedPoolSeatLimit(seatLimit: number): boolean {
    return seatLimit < 0;
}

export function poolHasAvailableSeat(seatLimit: number, activeAssignmentCount: number): boolean {
    if (isUnlimitedPoolSeatLimit(seatLimit)) {
        return true;
    }
    return activeAssignmentCount < seatLimit;
}

export function computePoolAvailableCount(seatLimit: number, assignedCount: number): number | null {
    if (isUnlimitedPoolSeatLimit(seatLimit)) {
        return null;
    }
    return Math.max(0, seatLimit - assignedCount);
}

/* db-index: organizationId */
/* db-index: sourceSubscriptionId */
/* db-index: organizationId, catalogItemId */
/* db-index: sourceSubscriptionId, catalogItemId */
/* db-index: itemPlanId */
/* db-index: status */

/**
 * Seat pool for a catalog product derived from an organization subscription (plan bundle or single item).
 */
export class OrganizationLicensePool extends DataModel {
    public static readonly finder = new DataFinder<OrganizationLicensePool, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<OrganizationLicensePool>) => new OrganizationLicensePool(data),
    );

    public static async findById(id: string): Promise<OrganizationLicensePool> {
        return OrganizationLicensePool.finder.findByKey(id);
    }

    public static async findBySourceSubscriptionId(sourceSubscriptionId: string): Promise<OrganizationLicensePool[]> {
        if (!sourceSubscriptionId) {
            return [];
        }
        return OrganizationLicensePool.finder.find(
            DataFilter.equals("sourceSubscriptionId", sourceSubscriptionId),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findBySourceAndCatalogItem(
        sourceSubscriptionId: string,
        catalogItemId: string,
    ): Promise<OrganizationLicensePool> {
        const rows = await OrganizationLicensePool.finder.find(
            DataFilter.and(
                DataFilter.equals("sourceSubscriptionId", sourceSubscriptionId),
                DataFilter.equals("catalogItemId", catalogItemId),
            ),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
        return rows[0] || null;
    }

    public static async findByOrganization(organizationId: string): Promise<OrganizationLicensePool[]> {
        return OrganizationLicensePool.finder.find(
            DataFilter.equals("organizationId", organizationId),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findActiveByOrganization(organizationId: string): Promise<OrganizationLicensePool[]> {
        return OrganizationLicensePool.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("status", "Active"),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async createPool(data: {
        organizationId: string;
        catalogItemId: string;
        itemPlanId: string;
        sourceSubscriptionId: string;
        sourceType: OrganizationLicensePoolSourceType | string;
        seatLimit: number;
        status: string;
        billingCycle: string;
    }): Promise<OrganizationLicensePool> {
        const now = Date.now();
        const pool = new OrganizationLicensePool({
            id: createRandomUID(),
            organizationId: data.organizationId,
            catalogItemId: data.catalogItemId,
            itemPlanId: data.itemPlanId,
            sourceSubscriptionId: data.sourceSubscriptionId,
            sourceType: data.sourceType,
            seatLimit: normalizePoolSeatLimit(data.seatLimit),
            status: data.status,
            billingCycle: data.billingCycle,
            createdAt: now,
            updatedAt: now,
        });
        await pool.insert();
        return pool;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: VARCHAR */
    public catalogItemId: string;
    /* db-type: VARCHAR */
    public itemPlanId: string;
    /* db-type: VARCHAR */
    public sourceSubscriptionId: string;
    /* db-type: VARCHAR */
    public sourceType: string;
    /* db-type: INT */
    public seatLimit: number;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: VARCHAR */
    public billingCycle: string;
    /* db-type: BIGINT */
    public createdAt: number;
    /* db-type: BIGINT */
    public updatedAt: number;

    constructor(data: TypedRow<OrganizationLicensePool>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.catalogItemId = enforceType(data.catalogItemId, "string") || "";
        this.itemPlanId = enforceType(data.itemPlanId, "string") || "";
        this.sourceSubscriptionId = enforceType(data.sourceSubscriptionId, "string") || "";
        this.sourceType = enforceType(data.sourceType, "string") || "";
        this.seatLimit = normalizePoolSeatLimit(enforceType(data.seatLimit, "number") || 0);
        this.status = enforceType(data.status, "string") || "";
        this.billingCycle = enforceType(data.billingCycle, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
