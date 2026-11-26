// OrganizationLicenseAssignment - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization_license_assignments";
const PRIMARY_KEY = "id";

/* db-index: organizationId */
/* db-index: userId */
/* db-index: subscriptionId */
/* db-index: subscriptionId, userId */
/* db-index: licensePoolId */
/* db-index: licensePoolId, userId */
/* db-index: isActive */

/**
 * Tracks the assignment of an organization license pool seat to a specific member.
 */
export class OrganizationLicenseAssignment extends DataModel {
    public static readonly finder = new DataFinder<OrganizationLicenseAssignment, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<OrganizationLicenseAssignment>) => new OrganizationLicenseAssignment(data));

    public static async findById(id: string): Promise<OrganizationLicenseAssignment> {
        return OrganizationLicenseAssignment.finder.findByKey(id);
    }

    public static async findByOrganization(organizationId: string): Promise<OrganizationLicenseAssignment[]> {
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.equals("organizationId", organizationId),
            OrderBy.desc("assignedAt"),
            SelectOptions.configure(),
        );
    }

    public static async countActiveByOrganization(organizationId: string): Promise<number> {
        return OrganizationLicenseAssignment.finder.count(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("isActive", true),
            ),
        );
    }

    public static async countActiveBySubscription(subscriptionId: string): Promise<number> {
        return OrganizationLicenseAssignment.finder.count(
            DataFilter.and(
                DataFilter.equals("subscriptionId", subscriptionId),
                DataFilter.equals("isActive", true),
            ),
        );
    }

    public static async countActiveByPool(licensePoolId: string): Promise<number> {
        return OrganizationLicenseAssignment.finder.count(
            DataFilter.and(
                DataFilter.equals("licensePoolId", licensePoolId),
                DataFilter.equals("isActive", true),
            ),
        );
    }

    public static async findActiveByOrganization(organizationId: string, skip = 0, limit?: number): Promise<OrganizationLicenseAssignment[]> {
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit !== undefined) { options.setMaxRows(limit); }
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("isActive", true),
            ),
            OrderBy.desc("assignedAt"),
            options,
        );
    }

    public static async countActiveByOrganizationAndUser(organizationId: string, userId: string): Promise<number> {
        if (!organizationId || !userId) {
            return 0;
        }
        return OrganizationLicenseAssignment.finder.count(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("userId", userId),
                DataFilter.equals("isActive", true),
            ),
        );
    }

    public static async findActiveByOrganizationAndUser(
        organizationId: string,
        userId: string,
        skip = 0,
        limit?: number,
    ): Promise<OrganizationLicenseAssignment[]> {
        if (!organizationId || !userId) {
            return [];
        }
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit !== undefined) { options.setMaxRows(limit); }
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("userId", userId),
                DataFilter.equals("isActive", true),
            ),
            OrderBy.desc("assignedAt"),
            options,
        );
    }

    public static async findActiveByUser(userId: string): Promise<OrganizationLicenseAssignment[]> {
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("isActive", true),
            ),
            OrderBy.desc("assignedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationLicenseAssignment[]> {
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("userId", userId),
            ),
            OrderBy.desc("assignedAt"),
            SelectOptions.configure(),
        );
    }

    /**
     * Deletes every license assignment for a member in an organization.
     * @returns Number of deleted assignments
     */
    public static async deleteAllByOrganizationAndUser(organizationId: string, userId: string): Promise<number> {
        const assignments = await OrganizationLicenseAssignment.findByOrganizationAndUser(organizationId, userId);
        for (const assignment of assignments) {
            await assignment.delete();
        }
        return assignments.length;
    }

    public static async findActiveBySubscription(subscriptionId: string): Promise<OrganizationLicenseAssignment[]> {
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("subscriptionId", subscriptionId),
                DataFilter.equals("isActive", true),
            ),
            OrderBy.desc("assignedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findActiveByPool(licensePoolId: string): Promise<OrganizationLicenseAssignment[]> {
        return OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("licensePoolId", licensePoolId),
                DataFilter.equals("isActive", true),
            ),
            OrderBy.desc("assignedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findBySubscriptionAndUser(subscriptionId: string, userId: string): Promise<OrganizationLicenseAssignment> {
        const result = await OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("subscriptionId", subscriptionId),
                DataFilter.equals("userId", userId),
            ),
        );
        return result[0] || null;
    }

    public static async findByPoolAndUser(licensePoolId: string, userId: string): Promise<OrganizationLicenseAssignment> {
        const result = await OrganizationLicenseAssignment.finder.find(
            DataFilter.and(
                DataFilter.equals("licensePoolId", licensePoolId),
                DataFilter.equals("userId", userId),
            ),
        );
        return result[0] || null;
    }

    public static async create(data: {
        organizationId: string;
        userId: string;
        licensePoolId: string;
        subscriptionId: string;
    }): Promise<OrganizationLicenseAssignment> {
        const assignment = new OrganizationLicenseAssignment({
            id: createRandomUID(),
            organizationId: data.organizationId,
            userId: data.userId,
            licensePoolId: data.licensePoolId,
            subscriptionId: data.subscriptionId,
            isActive: true,
            assignedAt: Date.now(),
        });
        await assignment.insert();
        return assignment;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: VARCHAR */
    public userId: string;
    /* db-type: VARCHAR */
    public licensePoolId: string;
    /* db-type: VARCHAR */
    public subscriptionId: string;
    /* db-type: BOOLEAN */
    public isActive: boolean;
    /* db-type: INT */
    public assignedAt: number;

    constructor(data: TypedRow<OrganizationLicenseAssignment>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.userId = enforceType(data.userId, "string") || "";
        this.licensePoolId = enforceType(data.licensePoolId, "string") || "";
        this.subscriptionId = enforceType(data.subscriptionId, "string") || "";
        this.isActive = enforceType(data.isActive, "boolean") !== false;
        this.assignedAt = enforceType(data.assignedAt, "number") || Date.now();

        this.init();
    }
}
