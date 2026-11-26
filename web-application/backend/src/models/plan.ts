// Plan - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "plan";
const PRIMARY_KEY = "id";

export enum PlanPricingMode {
    FIXED = "fixed",
    CALCULATED = "calculated",
}

export enum PlanStatus {
    DRAFT = "Draft",
    PUBLISHED = "Published",
    ARCHIVED = "Archived",
}

/* db-index: status */
/* db-index: name */
/* db-index: createdAt */
/* db-index: superiorPlanId */
/* db-index: status, createdAt DESC */

export class Plan extends DataModel {
    public static readonly finder = new DataFinder<Plan, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Plan>) => new Plan(data));

    public static async findById(id: string): Promise<Plan> {
        return Plan.finder.findByKey(id);
    }

    public static async findByPlanIndex(planIndex: number): Promise<Plan[]> {
        return Plan.finder.find(DataFilter.equals("planIndex", planIndex), OrderBy.nothing(), SelectOptions.configure());
    }

    public static async findByStatus(status: PlanStatus, skip = 0, limit?: number): Promise<Plan[]> {
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit !== undefined) { options.setMaxRows(limit); }
        return Plan.finder.find(DataFilter.equals("status", status), OrderBy.desc("createdAt"), options);
    }

    public static async findPublished(skip = 0, limit?: number): Promise<Plan[]> {
        return Plan.findByStatus(PlanStatus.PUBLISHED, skip, limit);
    }

    public static async countByStatus(status: PlanStatus): Promise<number> {
        return Plan.finder.count(DataFilter.equals("status", status));
    }

    public static async count(): Promise<number> {
        return Plan.finder.count(DataFilter.any());
    }

    public static async findAll(skip = 0, limit?: number): Promise<Plan[]> {
        const options = SelectOptions.configure();
        if (skip > 0) { options.setFirstRow(skip); }
        if (limit !== undefined) { options.setMaxRows(limit); }
        return Plan.finder.find(DataFilter.any(), OrderBy.desc("createdAt"), options);
    }

    public static async createPlan(data: {
        name: string;
        description?: string;
        status?: PlanStatus;
        pricingMode: PlanPricingMode;
        discountPercent?: number;
        supportConfig?: string;
        planIndex?: number;
        requiresOrganization?: boolean;
    }): Promise<Plan> {
        const now = Date.now();
        const plan = new Plan({
            id: createRandomUID(),
            name: data.name,
            description: data.description || "",
            status: data.status || PlanStatus.DRAFT,
            pricingMode: data.pricingMode,
            discountPercent: Math.min(100, Math.max(0, Math.round(data.discountPercent || 0))),
            supportConfig: data.supportConfig || "",
            planIndex: data.planIndex || 0,
            requiresOrganization: data.requiresOrganization || false,
            createdAt: now,
            updatedAt: now,
        });

        await plan.insert();
        return plan;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public name: string;
    /* db-type: VARCHAR */
    public description: string;
    /* db-type: VARCHAR */
    public status: PlanStatus;
    /* db-type: VARCHAR */
    public pricingMode: PlanPricingMode;
    /* db-type: INT */
    public discountPercent: number;
    /* db-type: TEXT */
    public supportConfig: string;
    /* db-type: INT */
    public planIndex: number;
    /* db-type: BOOLEAN */
    public requiresOrganization: boolean;
    /* db-type: BIGINT */
    public createdAt: number;
    /* db-type: BIGINT */
    public updatedAt: number;

    constructor(data: TypedRow<Plan>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.name = enforceType(data.name, "string") || "";
        this.description = enforceType(data.description, "string") || "";
        this.status = enforceType(data.status, "string") as PlanStatus || PlanStatus.DRAFT;
        this.pricingMode = enforceType(data.pricingMode, "string") as PlanPricingMode || PlanPricingMode.FIXED;
        this.discountPercent = Math.min(100, Math.max(0, Math.round(enforceType(data.discountPercent, "number") || 0)));
        this.supportConfig = enforceType(data.supportConfig, "string") || "";
        this.planIndex = enforceType(data.planIndex, "number") || 0;
        this.requiresOrganization = enforceType(data.requiresOrganization, "boolean") || false;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
