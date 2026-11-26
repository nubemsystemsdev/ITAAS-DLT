// Pending BFF workspace sync retries after failed provision/deactivate/assign/remove

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "itaas_workspace_sync_pending";
const PRIMARY_KEY = "id";
const FLUSH_BATCH_LIMIT = 100;

/** Pending workspace operation to retry. */
export type ItaasWorkspacePendingOperation = "sync" | "assign_flow" | "remove_flow";

/* db-index: subjectType, subjectId */
/* db-index: operation */

/** Subject waiting for a successful BFF workspace sync. */
export class ItaasWorkspaceSyncPending extends DataModel {
    public static readonly finder = new DataFinder<ItaasWorkspaceSyncPending, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<ItaasWorkspaceSyncPending>) => new ItaasWorkspaceSyncPending(data),
    );

    public static async findBySubject(subjectType: string, subjectId: string): Promise<ItaasWorkspaceSyncPending | null> {
        const rows = await ItaasWorkspaceSyncPending.findAllBySubject(subjectType, subjectId);
        return rows[0] || null;
    }

    public static async findAllBySubject(subjectType: string, subjectId: string): Promise<ItaasWorkspaceSyncPending[]> {
        if (!subjectType || !subjectId) {
            return [];
        }
        return ItaasWorkspaceSyncPending.finder.find(
            DataFilter.and(
                DataFilter.equals("subjectType", subjectType),
                DataFilter.equals("subjectId", subjectId),
            ),
            OrderBy.nothing(),
        );
    }

    public static async findBySubjectOperation(
        subjectType: string,
        subjectId: string,
        operation: ItaasWorkspacePendingOperation,
        flowId = "",
    ): Promise<ItaasWorkspaceSyncPending | null> {
        if (!subjectType || !subjectId) {
            return null;
        }
        const id = ((flowId || "") + "").trim();
        const rows = await ItaasWorkspaceSyncPending.finder.find(
            DataFilter.and(
                DataFilter.equals("subjectType", subjectType),
                DataFilter.equals("subjectId", subjectId),
                DataFilter.equals("operation", operation),
                DataFilter.equals("flowId", id),
            ),
            OrderBy.nothing(),
        );
        return rows[0] || null;
    }

    public static async findPending(limit = FLUSH_BATCH_LIMIT): Promise<ItaasWorkspaceSyncPending[]> {
        return ItaasWorkspaceSyncPending.finder.find(
            DataFilter.any(),
            OrderBy.asc("createdAt"),
            SelectOptions.configure().setMaxRows(limit),
        );
    }

    /** Insert if missing; no-op when the same subject+operation+flowId is already pending. */
    public static async enqueue(
        subjectType: string,
        subjectId: string,
        operation: ItaasWorkspacePendingOperation = "sync",
        flowId = "",
    ): Promise<void> {
        const op: ItaasWorkspacePendingOperation =
            operation === "assign_flow" || operation === "remove_flow" ? operation : "sync";
        const id = op === "sync" ? "" : ((flowId || "") + "").trim();
        if ((op === "assign_flow" || op === "remove_flow") && !id) {
            return;
        }
        const existing = await ItaasWorkspaceSyncPending.findBySubjectOperation(subjectType, subjectId, op, id);
        if (existing) {
            return;
        }
        // Legacy rows (pre-operation column / empty operation) count as sync for the subject.
        if (op === "sync") {
            const legacy = await ItaasWorkspaceSyncPending.findAllBySubject(subjectType, subjectId);
            if (legacy.some((row) => !row.operation || row.operation === "sync")) {
                return;
            }
        }
        const row = new ItaasWorkspaceSyncPending({
            id: createRandomUID(),
            subjectType,
            subjectId,
            operation: op,
            flowId: id,
            createdAt: Date.now(),
        });
        await row.insert();
    }

    /** Deletes every pending row for the subject (handles rare concurrent duplicates). */
    public static async clearBySubject(subjectType: string, subjectId: string): Promise<void> {
        const rows = await ItaasWorkspaceSyncPending.findAllBySubject(subjectType, subjectId);
        for (const row of rows) {
            await row.delete();
        }
    }

    /** Deletes pending rows matching subject + operation (+ flowId for flow ops). */
    public static async clearBySubjectOperation(
        subjectType: string,
        subjectId: string,
        operation: ItaasWorkspacePendingOperation,
        flowId = "",
    ): Promise<void> {
        const op: ItaasWorkspacePendingOperation =
            operation === "assign_flow" || operation === "remove_flow" ? operation : "sync";
        const id = op === "sync" ? "" : ((flowId || "") + "").trim();
        const rows = await ItaasWorkspaceSyncPending.findAllBySubject(subjectType, subjectId);
        for (const row of rows) {
            const rowOp = (row.operation || "sync") as ItaasWorkspacePendingOperation;
            const rowFlow = ((row.flowId || "") + "").trim();
            if (op === "sync") {
                if (rowOp === "sync" || !row.operation) {
                    await row.delete();
                }
                continue;
            }
            if (rowOp === op && rowFlow === id) {
                await row.delete();
            }
        }
    }

    /** Deletes every pending assign/remove for a flow across all subjects. */
    public static async clearByFlowId(flowId: string): Promise<void> {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            return;
        }
        const rows = await ItaasWorkspaceSyncPending.finder.find(
            DataFilter.equals("flowId", id),
            OrderBy.nothing(),
        );
        for (const row of rows) {
            const op = (row.operation || "") + "";
            if (op === "assign_flow" || op === "remove_flow") {
                await row.delete();
            }
        }
    }

    /* db-type: VARCHAR 80 */
    public id: string;
    /* db-type: VARCHAR 32 */
    public subjectType: string;
    /* db-type: VARCHAR 80 */
    public subjectId: string;
    /* db-type: VARCHAR 32 */
    public operation: string;
    /* db-type: VARCHAR 80 */
    public flowId: string;
    /* db-type: BIGINT */
    public createdAt: number;

    constructor(data: TypedRow<ItaasWorkspaceSyncPending>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);
        this.id = enforceType(data.id, "string") || "";
        this.subjectType = enforceType(data.subjectType, "string") || "";
        this.subjectId = enforceType(data.subjectId, "string") || "";
        this.operation = enforceType(data.operation, "string") || "sync";
        this.flowId = enforceType(data.flowId, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || 0;
        this.init();
    }
}
