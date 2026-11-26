// OrganizationMembership - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization_membership";
const PRIMARY_KEY = "id";

export enum OrganizationMembershipRole {
    ADMIN = "Admin",
    MEMBER = "Member",
}

export enum OrganizationMembershipStatus {
    ACTIVE = "Active",
    INVITED = "Invited",
    INACTIVE = "Inactive",
}

/* db-index: userId */
/* db-index: organizationId */
/* db-index: organizationRole */
/* db-index: status */
/* db-index: joinedAt */

export class OrganizationMembership extends DataModel {
    public static readonly finder = new DataFinder<OrganizationMembership, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<OrganizationMembership>) => new OrganizationMembership(data));

    private static makeOrganizationFilter(organizationId: string, status?: OrganizationMembershipStatus): DataFilter {
        if (status) {
            return DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("status", status),
            );
        }

        return DataFilter.and(
            DataFilter.equals("organizationId", organizationId),
            DataFilter.notEquals("status", OrganizationMembershipStatus.INVITED),
        );
    }

    public static async findById(id: string): Promise<OrganizationMembership> {
        return OrganizationMembership.finder.findByKey(id);
    }

    public static async findByUserId(userId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.equals("userId", userId),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByOrganizationId(organizationId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            OrganizationMembership.makeOrganizationFilter(organizationId),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByUserIdAndOrganizationId(userId: string, organizationId: string): Promise<OrganizationMembership> {
        const result = await OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("organizationId", organizationId),
            ),
        );
        return result[0] || null;
    }

    public static async findInvitedByOrganizationId(organizationId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            OrganizationMembership.makeOrganizationFilter(organizationId, OrganizationMembershipStatus.INVITED),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure(),
        );
    }

    public static async countByOrganizationId(organizationId: string, status?: OrganizationMembershipStatus): Promise<number> {
        return OrganizationMembership.finder.count(OrganizationMembership.makeOrganizationFilter(organizationId, status));
    }

    public static async countActiveMembers(): Promise<number> {
        return OrganizationMembership.finder.count(DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE));
    }

    public static async findByOrganizationIdPaginated(
        organizationId: string,
        skip: number,
        limit: number,
        status?: OrganizationMembershipStatus,
    ): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            OrganizationMembership.makeOrganizationFilter(organizationId, status),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMembership> {
        const result = await OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("organizationId", organizationId),
            ),
        );
        return result[0] || null;
    }

    public static makeFilter(q?: string, organizationRole?: string, status?: string): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("userId", q, true),
                DataFilter.startsWith("organizationId", q, true),
            ));
        }

        if (organizationRole) {
            filters.push(DataFilter.equals("organizationRole", organizationRole));
        }

        if (status) {
            filters.push(DataFilter.equals("status", status));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(q?: string, organizationRole?: string, status?: string): Promise<number> {
        return OrganizationMembership.finder.count(OrganizationMembership.makeFilter(q, organizationRole, status));
    }

    public static async findFiltered(skip: number, limit: number, q?: string, organizationRole?: string, status?: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            OrganizationMembership.makeFilter(q, organizationRole, status),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findActiveByOrganization(organizationId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE),
            ),
            OrderBy.desc("joinedAt"),
            SelectOptions.configure(),
        );
    }

    public static async findActiveAdminByUser(userId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("organizationRole", OrganizationMembershipRole.ADMIN),
                DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE),
            ),
        );
    }

    public static async findActiveMemberByUser(userId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("organizationRole", OrganizationMembershipRole.MEMBER),
                DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE),
            ),
        );
    }

    public static async findActiveByUser(userId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", userId),
                DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE),
            ),
        );
    }

    /**
     * Returns the user's single active membership, if any.
     * Platform policy: a user can belong to at most one organization.
     */
    public static async findActiveMembershipForUser(userId: string): Promise<OrganizationMembership | null> {
        const rows = await OrganizationMembership.findActiveByUser(userId);
        return rows[0] || null;
    }

    /**
     * Returns the user's active admin membership, if any.
     */
    public static async findActiveAdminMembershipForUser(userId: string): Promise<OrganizationMembership | null> {
        const rows = await OrganizationMembership.findActiveAdminByUser(userId);
        return rows[0] || null;
    }

    public static async findActiveAdminByOrganization(organizationId: string): Promise<OrganizationMembership[]> {
        return OrganizationMembership.finder.find(
            DataFilter.and(
                DataFilter.equals("organizationId", organizationId),
                DataFilter.equals("organizationRole", OrganizationMembershipRole.ADMIN),
                DataFilter.equals("status", OrganizationMembershipStatus.ACTIVE),
            ),
        );
    }

    public static async isAdminMember(userId: string, organizationId: string): Promise<boolean> {
        const membership = await OrganizationMembership.findByUserAndOrganization(userId, organizationId);
        return !!membership
            && membership.status === OrganizationMembershipStatus.ACTIVE
            && membership.organizationRole === OrganizationMembershipRole.ADMIN;
    }

    public static async isActiveMember(userId: string, organizationId: string): Promise<boolean> {
        const membership = await OrganizationMembership.findByUserAndOrganization(userId, organizationId);
        return !!membership && membership.status === OrganizationMembershipStatus.ACTIVE;
    }

    public static async createMembership(data: {
        userId: string;
        organizationId: string;
        organizationRole?: OrganizationMembershipRole;
        status?: OrganizationMembershipStatus;
    }): Promise<OrganizationMembership> {
        const membership = new OrganizationMembership({
            id: createRandomUID(),
            userId: data.userId,
            organizationId: data.organizationId,
            organizationRole: data.organizationRole || OrganizationMembershipRole.MEMBER,
            status: data.status || OrganizationMembershipStatus.INVITED,
            joinedAt: Date.now(),
        });

        await membership.insert();
        return membership;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public userId: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: VARCHAR */
    public organizationRole: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: INT */
    public joinedAt: number;

    constructor(data: TypedRow<OrganizationMembership>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.userId = enforceType(data.userId, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.organizationRole = enforceType(data.organizationRole, "string") || OrganizationMembershipRole.MEMBER;
        this.status = enforceType(data.status, "string") || OrganizationMembershipStatus.INVITED;
        this.joinedAt = enforceType(data.joinedAt, "number") || Date.now();

        this.init();
    }
}
