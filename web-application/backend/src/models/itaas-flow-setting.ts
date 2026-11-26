// ItaasFlowSetting - marketplace UI flags per Flowise catalog flow

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy } from "tsbean-orm";
import { Monitor } from "../monitor";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "itaas_flow_setting";
const PRIMARY_KEY = "flowId";

/**
 * Persists marketplace UI settings for a catalog flow (graph preview for users, etc.).
 */
export class ItaasFlowSetting extends DataModel {
    public static readonly finder = new DataFinder<ItaasFlowSetting, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<ItaasFlowSetting>) => new ItaasFlowSetting(data),
    );

    public static async findByFlowId(flowId: string): Promise<ItaasFlowSetting | null> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return null;
        }
        return ItaasFlowSetting.finder.findByKey(id);
    }

    public static async findByFlowIds(flowIds: string[]): Promise<ItaasFlowSetting[]> {
        const ids = ItaasFlowSetting.normalizeFlowIds(flowIds);
        if (ids.length === 0) {
            return [];
        }
        return ItaasFlowSetting.finder.find(
            DataFilter.into("flowId", ids),
            OrderBy.nothing(),
        );
    }

    public static async findAll(): Promise<ItaasFlowSetting[]> {
        return ItaasFlowSetting.finder.find(DataFilter.any(), OrderBy.nothing());
    }

    public static async isGraphVisibleToUsers(flowId: string): Promise<boolean> {
        const row = await ItaasFlowSetting.findByFlowId(flowId);
        return !!(row && row.graphVisibleToUsers);
    }

    /**
     * Local graph-visibility flags for catalog flow ids. Missing rows are hidden.
     */
    public static async graphVisibleToUsersByFlowIds(flowIds: string[]): Promise<Map<string, boolean>> {
        const ids = ItaasFlowSetting.normalizeFlowIds(flowIds);
        const map = new Map<string, boolean>();
        for (const id of ids) {
            map.set(id, false);
        }
        if (ids.length === 0) {
            return map;
        }
        const rows = await ItaasFlowSetting.findByFlowIds(ids);
        for (const row of rows) {
            map.set(row.flowId, !!row.graphVisibleToUsers);
        }
        return map;
    }

    public static async createSetting(data: { flowId: string; graphVisibleToUsers: boolean }): Promise<ItaasFlowSetting> {
        const id = ((data.flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        const setting = new ItaasFlowSetting({
            flowId: id,
            graphVisibleToUsers: !!data.graphVisibleToUsers,
            updatedAt: Date.now(),
        });
        await setting.insert();
        return setting;
    }

    /**
     * Upserts graph visibility for users. Missing rows are treated as hidden until created.
     */
    public static async setGraphVisibleToUsers(flowId: string, visible: boolean): Promise<ItaasFlowSetting> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        const existing = await ItaasFlowSetting.findByFlowId(id);
        if (existing) {
            existing.graphVisibleToUsers = !!visible;
            existing.updatedAt = Date.now();
            await existing.save();
            return existing;
        }
        return ItaasFlowSetting.createSetting({ flowId: id, graphVisibleToUsers: visible });
    }

    /**
     * Upserts graph visibility for many catalog flows. Empty or blank ids are ignored.
     * Writes run independently: a failed save is logged and never aborts the rest.
     */
    public static async setGraphVisibleToUsersForFlowIds(flowIds: string[], visible: boolean): Promise<string[]> {
        const ids = ItaasFlowSetting.normalizeFlowIds(flowIds);
        const results = await Promise.allSettled(
            ids.map((id) => ItaasFlowSetting.setGraphVisibleToUsers(id, visible).then(() => id)),
        );
        const updated: string[] = [];
        for (const [index, result] of results.entries()) {
            if (result.status === "fulfilled") {
                updated.push(result.value);
                continue;
            }
            const id = ids[index];
            const reason = result.reason instanceof Error ? result.reason.message : result.reason;
            Monitor.warning(`[ITAAS FlowSetting] Could not update graph visibility for ${id}: ${reason}`);
        }
        return updated;
    }

    /**
     * Deletes settings for the given catalog flow ids. Missing rows are ignored.
     */
    public static async deleteByFlowIds(flowIds: string[]): Promise<number> {
        const rows = await ItaasFlowSetting.findByFlowIds(flowIds);
        let deleted = 0;
        for (const row of rows) {
            await row.delete();
            deleted++;
        }
        return deleted;
    }

    private static normalizeFlowIds(flowIds: string[]): string[] {
        return Array.from(new Set((flowIds || []).map((flowId) => ((flowId || "") + "").trim()).filter(Boolean)));
    }

    /* db-type: VARCHAR 80 */
    public flowId: string;
    /* db-type: BOOLEAN */
    public graphVisibleToUsers: boolean;
    /* db-type: BIGINT */
    public updatedAt: number;

    constructor(data: TypedRow<ItaasFlowSetting>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);
        this.flowId = enforceType(data.flowId, "string") || "";
        this.graphVisibleToUsers = enforceType(data.graphVisibleToUsers, "boolean") ?? false;
        this.updatedAt = enforceType(data.updatedAt, "number") || 0;
        this.init();
    }
}
