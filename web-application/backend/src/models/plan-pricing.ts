// PlanPricing - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";
import { BillingCycle } from "./item-plan";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "plan_pricing";
const PRIMARY_KEY = "id";

/* db-index: planId */
/* db-index: billingCycle */
/* db-index: priceCents */
/* db-index: planId, billingCycle */
/* db-index: billingCycle, priceCents */

export class PlanPricing extends DataModel {
    public static readonly finder = new DataFinder<PlanPricing, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<PlanPricing>) => new PlanPricing(data));

    public static async findById(id: string): Promise<PlanPricing> {
        return PlanPricing.finder.findByKey(id);
    }

    public static async findByPlanId(planId: string): Promise<PlanPricing[]> {
        return PlanPricing.finder.find(
            DataFilter.equals("planId", planId),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async findByPlanIds(planIds: string[]): Promise<PlanPricing[]> {
        if (planIds.length === 0) {
            return [];
        }
        return PlanPricing.finder.find(
            DataFilter.into("planId", planIds),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async findByIds(ids: string[]): Promise<PlanPricing[]> {
        if (!ids.length) {
            return [];
        }
        return PlanPricing.finder.find(
            DataFilter.into("id", ids),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async findByPlanAndCycle(planId: string, billingCycle: BillingCycle): Promise<PlanPricing> {
        const rows = await PlanPricing.finder.find(DataFilter.and(
            DataFilter.equals("planId", planId),
            DataFilter.equals("billingCycle", billingCycle),
        ), OrderBy.nothing(), SelectOptions.configure());
        return rows[0] || null;
    }

    public static async createPricing(data: {
        planId: string;
        billingCycle: BillingCycle;
        priceCents: number;
        stripePriceId: string;
    }): Promise<PlanPricing> {
        const now = Date.now();
        const pricing = new PlanPricing({
            id: createRandomUID(),
            planId: data.planId,
            billingCycle: data.billingCycle,
            priceCents: Math.max(0, Math.round(data.priceCents || 0)),
            stripePriceId: data.stripePriceId,
            createdAt: now,
            updatedAt: now,
        });

        await pricing.insert();
        return pricing;
    }

    public static async deleteByPlanId(planId: string): Promise<void> {
        const pricings = await PlanPricing.findByPlanId(planId);
        for (const pricing of pricings) {
            await pricing.delete();
        }
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public planId: string;
    /* db-type: VARCHAR */
    public billingCycle: BillingCycle;
    /* db-type: INT */
    public priceCents: number;
    /* db-type: VARCHAR */
    public stripePriceId: string;
    /* db-type: BIGINT */
    public createdAt: number;
    /* db-type: BIGINT */
    public updatedAt: number;

    constructor(data: TypedRow<PlanPricing>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.planId = enforceType(data.planId, "string") || "";
        this.billingCycle = enforceType(data.billingCycle, "string") as BillingCycle || BillingCycle.MONTHLY;
        this.priceCents = Math.max(0, Math.round(enforceType(data.priceCents, "number") || 0));
        this.stripePriceId = enforceType(data.stripePriceId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
