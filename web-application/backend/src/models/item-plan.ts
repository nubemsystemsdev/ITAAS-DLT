// ItemPlan - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "item_plan";
const PRIMARY_KEY = "id";

export enum BillingCycle {
    MONTHLY = "monthly",
    ANNUAL = "annual"
}

/* db-index: itemId */
/* db-index: billingCycle */
/* db-index: priceCents */
/* db-index: itemId, billingCycle */
/* db-index: billingCycle, priceCents */

export class ItemPlan extends DataModel {
    public static readonly finder = new DataFinder<ItemPlan, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<ItemPlan>) => new ItemPlan(data));

    public static async findById(id: string): Promise<ItemPlan> {
        return ItemPlan.finder.findByKey(id);
    }

    public static async findByIds(ids: string[]): Promise<ItemPlan[]> {
        if (!ids.length) {
            return [];
        }

        return ItemPlan.finder.find(
            DataFilter.into("id", ids),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async findByItemId(itemId: string): Promise<ItemPlan[]> {
        return ItemPlan.finder.find(DataFilter.equals("itemId", itemId), OrderBy.nothing(), SelectOptions.configure());
    }

    public static async findByItemIds(itemIds: string[]): Promise<ItemPlan[]> {
        if (itemIds.length === 0) {
            return [];
        }
        return ItemPlan.finder.find(
            DataFilter.into("itemId", itemIds),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    public static async findByItemAndCycle(itemId: string, billingCycle: BillingCycle): Promise<ItemPlan> {
        const rows = await ItemPlan.finder.find(DataFilter.and(
            DataFilter.equals("itemId", itemId),
            DataFilter.equals("billingCycle", billingCycle),
        ), OrderBy.nothing(), SelectOptions.configure());
        return rows[0] || null;
    }

    public static async findIdsByItemIds(itemIds: string[]): Promise<string[]> {
        if (!itemIds.length) {
            return [];
        }

        const plans = await ItemPlan.finder.find(
            DataFilter.into("itemId", itemIds),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
        return plans.map((plan) => plan.id);
    }

    public static async createPlan(data: {
        itemId: string;
        billingCycle: BillingCycle;
        priceCents: number;
        stripePriceId: string;
    }): Promise<ItemPlan> {
        const now = Date.now();
        const plan = new ItemPlan({
            id: createRandomUID(),
            itemId: data.itemId,
            billingCycle: data.billingCycle,
            priceCents: data.priceCents,
            stripePriceId: data.stripePriceId,
            createdAt: now,
            updatedAt: now,
        });

        await plan.insert();
        return plan;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public itemId: string;
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

    constructor(data: TypedRow<ItemPlan>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.itemId = enforceType(data.itemId, "string") || "";
        this.billingCycle = enforceType(data.billingCycle, "string") as BillingCycle || BillingCycle.MONTHLY;
        const normalizedPriceCents = enforceType(data.priceCents, "number");
        const legacyPriceEurCents = enforceType((data as any).priceEur, "number");
        this.priceCents = Math.max(0, Math.round(normalizedPriceCents ?? legacyPriceEurCents ?? 0));
        this.stripePriceId = enforceType(data.stripePriceId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
