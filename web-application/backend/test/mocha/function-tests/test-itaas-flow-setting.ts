// Function tests — ItaasFlowSetting defaults (no DB)

"use strict";

import assert from "assert";
import { ItaasFlowSetting } from "../../../src/models/itaas-flow-setting";

describe("ItaasFlowSetting", () => {
    let originalFindByFlowId: typeof ItaasFlowSetting.findByFlowId;
    let originalFindByFlowIds: typeof ItaasFlowSetting.findByFlowIds;
    let originalCreateSetting: typeof ItaasFlowSetting.createSetting;

    beforeEach(() => {
        originalFindByFlowId = ItaasFlowSetting.findByFlowId;
        originalFindByFlowIds = ItaasFlowSetting.findByFlowIds;
        originalCreateSetting = ItaasFlowSetting.createSetting;
    });

    afterEach(() => {
        ItaasFlowSetting.findByFlowId = originalFindByFlowId;
        ItaasFlowSetting.findByFlowIds = originalFindByFlowIds;
        ItaasFlowSetting.createSetting = originalCreateSetting;
    });

    it("isGraphVisibleToUsers is false when no row exists", async () => {
        ItaasFlowSetting.findByFlowId = (async () => null) as any;
        assert.strictEqual(await ItaasFlowSetting.isGraphVisibleToUsers("flow-1"), false);
    });

    it("isGraphVisibleToUsers is false when the stored flag is off", async () => {
        ItaasFlowSetting.findByFlowId = (async () => ({
            graphVisibleToUsers: false,
        })) as any;
        assert.strictEqual(await ItaasFlowSetting.isGraphVisibleToUsers("flow-1"), false);
    });

    it("isGraphVisibleToUsers is true when the stored flag is on", async () => {
        ItaasFlowSetting.findByFlowId = (async () => ({
            graphVisibleToUsers: true,
        })) as any;
        assert.strictEqual(await ItaasFlowSetting.isGraphVisibleToUsers("flow-1"), true);
    });

    it("findByFlowIds returns an empty list when ids are missing", async () => {
        const rows = await ItaasFlowSetting.findByFlowIds(["", "  "]);
        assert.deepStrictEqual(rows, []);
    });

    it("graphVisibleToUsersByFlowIds defaults missing rows to hidden", async () => {
        ItaasFlowSetting.findByFlowIds = (async () => ([{
            flowId: "flow-1",
            graphVisibleToUsers: true,
        }])) as any;

        const map = await ItaasFlowSetting.graphVisibleToUsersByFlowIds(["flow-1", "flow-2", "flow-1"]);
        assert.strictEqual(map.get("flow-1"), true);
        assert.strictEqual(map.get("flow-2"), false);
        assert.strictEqual(map.size, 2);
    });

    it("setGraphVisibleToUsers creates a row when missing", async () => {
        let created: { flowId: string; graphVisibleToUsers: boolean } | null = null;
        ItaasFlowSetting.findByFlowId = (async () => null) as any;
        ItaasFlowSetting.createSetting = (async (data) => {
            created = { flowId: data.flowId, graphVisibleToUsers: data.graphVisibleToUsers };
            return created as any;
        }) as any;

        const result = await ItaasFlowSetting.setGraphVisibleToUsers("flow-1", true);
        assert.deepStrictEqual(created, { flowId: "flow-1", graphVisibleToUsers: true });
        assert.strictEqual(result.graphVisibleToUsers, true);
    });

    it("setGraphVisibleToUsers updates an existing row", async () => {
        const existing: { graphVisibleToUsers: boolean; updatedAt: number; save: () => Promise<void> } = {
            graphVisibleToUsers: false,
            updatedAt: 1,
            save: async () => undefined,
        };
        ItaasFlowSetting.findByFlowId = (async () => existing) as any;

        const result = await ItaasFlowSetting.setGraphVisibleToUsers("flow-1", true);
        assert.strictEqual(existing.graphVisibleToUsers, true);
        assert.ok(existing.updatedAt > 1);
        assert.strictEqual(result.graphVisibleToUsers, true);
    });

    it("setGraphVisibleToUsers throws INVALID_FLOW_ID when empty", async () => {
        try {
            await ItaasFlowSetting.setGraphVisibleToUsers("  ", true);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("setGraphVisibleToUsersForFlowIds returns empty when ids are missing", async () => {
        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(["", "  "], true);
        assert.deepStrictEqual(ids, []);
    });

    it("setGraphVisibleToUsersForFlowIds creates missing rows and updates existing ones", async () => {
        const existing: { flowId: string; graphVisibleToUsers: boolean; updatedAt: number; save: () => Promise<void> } = {
            flowId: "flow-1",
            graphVisibleToUsers: false,
            updatedAt: 1,
            save: async () => undefined,
        };
        const created: Array<{ flowId: string; graphVisibleToUsers: boolean }> = [];
        ItaasFlowSetting.findByFlowId = (async (id) => (id === "flow-1" ? existing : null)) as any;
        ItaasFlowSetting.createSetting = (async (data) => {
            created.push({ flowId: data.flowId, graphVisibleToUsers: data.graphVisibleToUsers });
            return data as any;
        }) as any;

        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(["flow-1", "flow-2", "flow-1"], true);
        assert.deepStrictEqual(ids, ["flow-1", "flow-2"]);
        assert.strictEqual(existing.graphVisibleToUsers, true);
        assert.ok(existing.updatedAt > 1);
        assert.deepStrictEqual(created, [{ flowId: "flow-2", graphVisibleToUsers: true }]);
    });

    it("setGraphVisibleToUsersForFlowIds keeps going when one write fails", async () => {
        const existing: { flowId: string; graphVisibleToUsers: boolean; updatedAt: number; save: () => Promise<void> } = {
            flowId: "flow-1",
            graphVisibleToUsers: false,
            updatedAt: 1,
            save: async () => {
                throw new Error("DB_WRITE_FAILED");
            },
        };
        const created: Array<{ flowId: string; graphVisibleToUsers: boolean }> = [];
        ItaasFlowSetting.findByFlowId = (async (id) => (id === "flow-1" ? existing : null)) as any;
        ItaasFlowSetting.createSetting = (async (data) => {
            created.push({ flowId: data.flowId, graphVisibleToUsers: data.graphVisibleToUsers });
            return data as any;
        }) as any;

        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(["flow-1", "flow-2"], true);
        assert.deepStrictEqual(ids, ["flow-2"]);
        assert.deepStrictEqual(created, [{ flowId: "flow-2", graphVisibleToUsers: true }]);
    });

    it("setGraphVisibleToUsersForFlowIds keeps going when create fails", async () => {
        const existing: { flowId: string; graphVisibleToUsers: boolean; updatedAt: number; save: () => Promise<void> } = {
            flowId: "flow-2",
            graphVisibleToUsers: false,
            updatedAt: 1,
            save: async () => undefined,
        };
        ItaasFlowSetting.findByFlowId = (async (id) => (id === "flow-2" ? existing : null)) as any;
        ItaasFlowSetting.createSetting = (async () => {
            throw new Error("DB_INSERT_FAILED");
        }) as any;

        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(["flow-1", "flow-2"], true);
        assert.deepStrictEqual(ids, ["flow-2"]);
        assert.strictEqual(existing.graphVisibleToUsers, true);
    });

    it("setGraphVisibleToUsersForFlowIds does not throw when a write fails", async () => {
        ItaasFlowSetting.findByFlowId = (async () => {
            throw new Error("DB_LOOKUP_FAILED");
        }) as any;

        const ids = await ItaasFlowSetting.setGraphVisibleToUsersForFlowIds(["flow-1", "flow-2"], true);
        assert.deepStrictEqual(ids, []);
    });

    it("deleteByFlowIds deletes matching rows", async () => {
        const deleted: string[] = [];
        ItaasFlowSetting.findByFlowIds = (async () => ([
            { flowId: "flow-1", delete: async () => { deleted.push("flow-1"); } },
            { flowId: "flow-2", delete: async () => { deleted.push("flow-2"); } },
        ])) as any;

        const count = await ItaasFlowSetting.deleteByFlowIds(["flow-1", "flow-2"]);
        assert.strictEqual(count, 2);
        assert.deepStrictEqual(deleted, ["flow-1", "flow-2"]);
    });

    it("deleteByFlowIds returns 0 when ids are missing", async () => {
        const count = await ItaasFlowSetting.deleteByFlowIds(["", "  "]);
        assert.strictEqual(count, 0);
    });
});
