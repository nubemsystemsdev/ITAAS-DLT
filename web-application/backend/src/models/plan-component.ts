// PlanComponent - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "plan_component";
const PRIMARY_KEY = "id";

/* db-index: planId */
/* db-index: catalogItemId */

export class PlanComponent extends DataModel {
    public static readonly finder = new DataFinder<PlanComponent, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<PlanComponent>) => new PlanComponent(data));

    public static async findById(id: string): Promise<PlanComponent> {
        return PlanComponent.finder.findByKey(id);
    }

    public static async findByPlanId(planId: string): Promise<PlanComponent[]> {
        return PlanComponent.finder.find(
            DataFilter.equals("planId", planId),
            OrderBy.asc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByPlanIds(planIds: string[]): Promise<PlanComponent[]> {
        if (planIds.length === 0) {
            return [];
        }
        return PlanComponent.finder.find(
            DataFilter.into("planId", planIds),
            OrderBy.asc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByCatalogItemId(catalogItemId: string): Promise<PlanComponent[]> {
        return PlanComponent.finder.find(
            DataFilter.equals("catalogItemId", catalogItemId),
            OrderBy.asc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async createComponent(data: {
        planId: string;
        catalogItemId: string;
        usageLimits?: string;
        quantity?: number;
    }): Promise<PlanComponent> {
        const component = new PlanComponent({
            id: createRandomUID(),
            planId: data.planId,
            catalogItemId: data.catalogItemId,
            usageLimits: data.usageLimits || "",
            quantity: Math.max(1, Math.round(data.quantity || 1)),
            createdAt: Date.now(),
        });

        await component.insert();
        return component;
    }

    public static async deleteByPlanId(planId: string): Promise<void> {
        const components = await PlanComponent.findByPlanId(planId);
        for (const component of components) {
            await component.delete();
        }
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public planId: string;
    /* db-type: VARCHAR */
    public catalogItemId: string;
    /* db-type: TEXT */
    public usageLimits: string;
    /* db-type: INT */
    public quantity: number;
    /* db-type: BIGINT */
    public createdAt: number;

    constructor(data: TypedRow<PlanComponent>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.planId = enforceType(data.planId, "string") || "";
        this.catalogItemId = enforceType(data.catalogItemId, "string") || "";
        this.usageLimits = enforceType(data.usageLimits, "string") || "";
        this.quantity = Math.max(1, Math.round(enforceType(data.quantity, "number") || 1));
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();

        this.init();
    }
}
