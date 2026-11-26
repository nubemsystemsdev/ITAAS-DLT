// IaPlatformMapping - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "ia_platform_mapping";
const PRIMARY_KEY = "id";

/* db-index: dltOrganizationId */
/* db-index: dltUserId */
/* db-index: iaWorkspaceId */

export class IaPlatformMapping extends DataModel {
    public static readonly finder = new DataFinder<IaPlatformMapping, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<IaPlatformMapping>) => new IaPlatformMapping(data));

    public static async findById(id: string): Promise<IaPlatformMapping> {
        return IaPlatformMapping.finder.findByKey(id);
    }

    public static async findByDltUserId(dltUserId: string): Promise<IaPlatformMapping | null> {
        const items = await IaPlatformMapping.finder.find(DataFilter.equals("dltUserId", dltUserId));
        return items[0] || null;
    }

    public static async findByDltOrganizationId(dltOrganizationId: string): Promise<IaPlatformMapping | null> {
        const items = await IaPlatformMapping.finder.find(DataFilter.equals("dltOrganizationId", dltOrganizationId));
        return items[0] || null;
    }

    public static async findByIaWorkspaceId(iaWorkspaceId: string): Promise<IaPlatformMapping | null> {
        const items = await IaPlatformMapping.finder.find(DataFilter.equals("iaWorkspaceId", iaWorkspaceId));
        return items[0] || null;
    }

    public static async createMapping(data: {
        dltOrganizationId?: string;
        dltUserId: string;
        iaOrganizationId: string;
        iaWorkspaceId: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
    }): Promise<IaPlatformMapping> {
        const now = Date.now();
        const mapping = new IaPlatformMapping({
            id: createRandomUID(),
            dltOrganizationId: data.dltOrganizationId || "",
            dltUserId: data.dltUserId,
            iaOrganizationId: data.iaOrganizationId,
            iaWorkspaceId: data.iaWorkspaceId,
            stripeCustomerId: data.stripeCustomerId || "",
            stripeSubscriptionId: data.stripeSubscriptionId || "",
            createdAt: now,
            updatedAt: now,
        });

        await mapping.insert();
        return mapping;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public dltOrganizationId: string;
    /* db-type: VARCHAR */
    public dltUserId: string;
    /* db-type: VARCHAR */
    public iaOrganizationId: string;
    /* db-type: VARCHAR */
    public iaWorkspaceId: string;
    /* db-type: VARCHAR */
    public stripeCustomerId: string;
    /* db-type: VARCHAR */
    public stripeSubscriptionId: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<IaPlatformMapping>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.dltOrganizationId = enforceType(data.dltOrganizationId, "string") || "";
        this.dltUserId = enforceType(data.dltUserId, "string") || "";
        this.iaOrganizationId = enforceType(data.iaOrganizationId, "string") || "";
        this.iaWorkspaceId = enforceType(data.iaWorkspaceId, "string") || "";
        this.stripeCustomerId = enforceType(data.stripeCustomerId, "string") || "";
        this.stripeSubscriptionId = enforceType(data.stripeSubscriptionId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
