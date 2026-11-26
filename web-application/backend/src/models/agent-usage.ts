// AgentUsage - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "agent_usage";
const PRIMARY_KEY = "id";

/* db-index: subscriptionId */
/* db-index: referenceMonthYear */

export class AgentUsage extends DataModel {
    public static readonly finder = new DataFinder<AgentUsage, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<AgentUsage>) => new AgentUsage(data));

    public static async findById(id: string): Promise<AgentUsage> {
        return AgentUsage.finder.findByKey(id);
    }

    public static async findBySubscription(subscriptionId: string): Promise<AgentUsage[]> {
        return AgentUsage.finder.find(DataFilter.equals("subscriptionId", subscriptionId), OrderBy.desc("referenceMonthYear"), SelectOptions.configure());
    }

    public static async findBySubscriptionAndMonth(subscriptionId: string, referenceMonthYear: number): Promise<AgentUsage> {
        const res = await AgentUsage.finder.find(DataFilter.and(
            DataFilter.equals("subscriptionId", subscriptionId),
            DataFilter.equals("referenceMonthYear", referenceMonthYear),
        ));
        return res[0] || null;
    }

    public static async findTopByCurrentConsumption(limit: number): Promise<AgentUsage[]> {
        if (limit <= 0) {
            return [];
        }
        return AgentUsage.finder.find(
            DataFilter.any(),
            OrderBy.desc("currentConsumption"),
            SelectOptions.configure().setMaxRows(limit),
        );
    }

    public static async createUsage(data: {
        subscriptionId: string;
        currentConsumption: number;
        memberUserId?: string | null;
        referenceMonthYear: number;
    }): Promise<AgentUsage> {
        const now = Date.now();
        const usage = new AgentUsage({
            id: createRandomUID(),
            subscriptionId: data.subscriptionId,
            currentConsumption: data.currentConsumption,
            memberUserId: data.memberUserId,
            referenceMonthYear: data.referenceMonthYear,
            createdAt: now,
            updatedAt: now,
        });

        await usage.insert();
        return usage;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public subscriptionId: string;
    /* db-type: VARCHAR */
    public memberUserId: string | null;
    /* db-type: INT */
    public currentConsumption: number;
    /* db-type: INT */
    public referenceMonthYear: number;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<AgentUsage>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.subscriptionId = enforceType(data.subscriptionId, "string") || "";
        this.memberUserId = enforceType(data.memberUserId, "string") || null;
        this.currentConsumption = enforceType(data.currentConsumption, "number") || 0;
        this.referenceMonthYear = enforceType(data.referenceMonthYear, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
