// ItaasFlowFavorite - associates a user with a global Flowise flow as favorite

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "itaas_flow_favorite";
const PRIMARY_KEY = "id";

/* db-index: userId */
/* db-index: flowId */
/* db-index: userId, flowId */
/* db-index: createdAt DESC */

/**
 * Persists a user's favorite global ITAAS/Flowise flow for the Public agents favorites tab.
 */
export class ItaasFlowFavorite extends DataModel {
    public static readonly finder = new DataFinder<ItaasFlowFavorite, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<ItaasFlowFavorite>) => new ItaasFlowFavorite(data),
    );

    public static async findById(id: string): Promise<ItaasFlowFavorite> {
        return ItaasFlowFavorite.finder.findByKey(id);
    }

    public static async findByUserId(userId: string): Promise<ItaasFlowFavorite[]> {
        const uid = ((userId || "") + "").trim();
        if (!uid) {
            return [];
        }
        return ItaasFlowFavorite.finder.find(
            DataFilter.equals("userId", uid),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByUserAndFlow(userId: string, flowId: string): Promise<ItaasFlowFavorite | null> {
        const uid = ((userId || "") + "").trim();
        const fid = ((flowId || "") + "").trim();
        if (!uid || !fid) {
            return null;
        }
        const rows = await ItaasFlowFavorite.finder.find(
            DataFilter.and(
                DataFilter.equals("userId", uid),
                DataFilter.equals("flowId", fid),
            ),
            OrderBy.nothing(),
        );
        return rows[0] || null;
    }

    public static async countByUserId(userId: string): Promise<number> {
        const uid = ((userId || "") + "").trim();
        if (!uid) {
            return 0;
        }
        return ItaasFlowFavorite.finder.count(DataFilter.equals("userId", uid));
    }

    /**
     * Inserts a favorite for the user+flow pair. Returns the existing row if already present.
     */
    public static async createFavorite(data: { userId: string; flowId: string }): Promise<ItaasFlowFavorite> {
        const uid = ((data.userId || "") + "").trim();
        const fid = ((data.flowId || "") + "").trim();
        if (!uid || !fid) {
            throw new Error("INVALID_FLOW_ID");
        }

        const existing = await ItaasFlowFavorite.findByUserAndFlow(uid, fid);
        if (existing) {
            return existing;
        }

        const favorite = new ItaasFlowFavorite({
            id: createRandomUID(),
            userId: uid,
            flowId: fid,
            createdAt: Date.now(),
        });
        await favorite.insert();
        return favorite;
    }

    /**
     * Deletes the favorite for the user+flow pair. No-op when missing.
     * @returns true if a row was deleted
     */
    public static async deleteByUserAndFlow(userId: string, flowId: string): Promise<boolean> {
        const existing = await ItaasFlowFavorite.findByUserAndFlow(userId, flowId);
        if (!existing) {
            return false;
        }
        await existing.delete();
        return true;
    }

    public static async deleteAllByUserId(userId: string): Promise<void> {
        const uid = ((userId || "") + "").trim();
        if (!uid) {
            return;
        }
        await ItaasFlowFavorite.finder.delete(DataFilter.equals("userId", uid));
    }

    /* db-type: VARCHAR 80 */
    public id: string;
    /* db-type: VARCHAR 80 */
    public userId: string;
    /* db-type: VARCHAR 80 */
    public flowId: string;
    /* db-type: BIGINT */
    public createdAt: number;

    constructor(data: TypedRow<ItaasFlowFavorite>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);
        this.id = enforceType(data.id, "string") || "";
        this.userId = enforceType(data.userId, "string") || "";
        this.flowId = enforceType(data.flowId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || 0;
        this.init();
    }
}
