// Function tests — ItaasWorkspaceProvisioningService (flow assign/remove helpers)

"use strict";

import assert from "assert";
import { BffProvisioningConfig } from "../../../src/config/config-bff-provisioning";
import { RedisConfig } from "../../../src/config/config-redis";
import { CustomAgentRequest } from "../../../src/models/custom-agent-request";
import { ItaasFlowSetting } from "../../../src/models/itaas-flow-setting";
import { ItaasWorkspaceSyncPending } from "../../../src/models/itaas-workspace-sync-pending";
import { Subscription, SubscriptionStatus } from "../../../src/models/subscription";
import { BffProvisioningClient } from "../../../src/services/bff-provisioning-client";
import { ItaasWorkspaceProvisioningService } from "../../../src/services/itaas-workspace-provisioning-service";
import { RedisService } from "../../../src/services/redis-service";

describe("ItaasWorkspaceProvisioningService flow assign helpers", () => {
    let originalEnqueue: typeof ItaasWorkspaceSyncPending.enqueue;
    let originalClearOp: typeof ItaasWorkspaceSyncPending.clearBySubjectOperation;
    let originalFindExclusive: typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
    let enqueueCalls: Array<{ subjectType: string; subjectId: string; operation?: string; flowId?: string }>;
    let clearCalls: Array<{ subjectType: string; subjectId: string; operation?: string; flowId?: string }>;
    let redisWasEnabled: boolean;

    beforeEach(() => {
        redisWasEnabled = RedisConfig.getInstance().enabled;
        RedisConfig.getInstance().enabled = false;
        enqueueCalls = [];
        clearCalls = [];
        originalEnqueue = ItaasWorkspaceSyncPending.enqueue;
        originalClearOp = ItaasWorkspaceSyncPending.clearBySubjectOperation;
        originalFindExclusive = CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = (async () => null) as typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        ItaasWorkspaceSyncPending.enqueue = (async (
            subjectType: string,
            subjectId: string,
            operation = "sync",
            flowId = "",
        ) => {
            enqueueCalls.push({ subjectType, subjectId, operation, flowId });
        }) as any;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = (async (
            subjectType: string,
            subjectId: string,
            operation = "sync",
            flowId = "",
        ) => {
            clearCalls.push({ subjectType, subjectId, operation, flowId });
        }) as any;
    });

    afterEach(() => {
        ItaasWorkspaceSyncPending.enqueue = originalEnqueue;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = originalClearOp;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = originalFindExclusive;
        ItaasWorkspaceProvisioningService.setInstance(null);
        BffProvisioningClient.setInstance(null);
        BffProvisioningConfig.setInstance(null);
        RedisConfig.getInstance().enabled = redisWasEnabled;
    });

    it("assignFlowToSubject returns flow_assigned on success", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            assignFlow: async () => ({
                skipped: false,
                tenant: {
                    subjectKey: "org-1",
                    subjectType: "organization",
                    status: "active",
                    flowIds: ["flow-x"],
                    credentialIds: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
            }),
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );

        assert.strictEqual(result.action, "provision");
        assert.strictEqual(result.reason, "flow_assigned");
        assert.deepStrictEqual(clearCalls, [
            {
                subjectType: "organization",
                subjectId: "org-1",
                operation: "assign_flow",
                flowId: "flow-x",
            },
            {
                subjectType: "organization",
                subjectId: "org-1",
                operation: "remove_flow",
                flowId: "flow-x",
            },
        ]);
    });

    it("assignFlowToSubject throws FLOW_ALREADY_ASSIGNED for a custom-agent flow owned by another workspace", async () => {
        const originalFind = CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = (async () => {
            return {
                organizationId: "org-owner",
                requesterUserId: "user-1",
            } as CustomAgentRequest;
        }) as typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;

        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign a custom-agent flow to another workspace");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
                { subjectType: "organization", subjectId: "org-other" },
                "flow-custom-exclusive",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_ALREADY_ASSIGNED");
        } finally {
            CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = originalFind;
        }

        assert.strictEqual(assignCalls, 0);
        assert.strictEqual(enqueueCalls.length, 0);
    });

    it("assignFlowToSubject skips missing flow id", async () => {
        const result = await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "  ",
        );
        assert.strictEqual(result.action, "skip");
        assert.strictEqual(result.reason, "missing_flow_id");
    });

    it("assignFlowToSubject enqueues pending on error with operation and flowId", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            assignFlow: async () => {
                throw new Error("BFF_PROVISIONING_HTTP_500");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
            { subjectType: "user", subjectId: "user-1" },
            "flow-1",
        );

        assert.strictEqual(result.reason, "error");
        assert.deepStrictEqual(enqueueCalls, [{
            subjectType: "user",
            subjectId: "user-1",
            operation: "assign_flow",
            flowId: "flow-1",
        }]);
    });

    it("removeFlowFromSubject returns flow_removed on success", async () => {
        BffProvisioningClient.setInstance({
            removeFlow: async () => ({
                skipped: false,
                tenant: {
                    subjectKey: "org-1",
                    subjectType: "organization",
                    status: "active",
                    flowIds: [],
                    credentialIds: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
            }),
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().removeFlowFromSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );

        assert.strictEqual(result.action, "provision");
        assert.strictEqual(result.reason, "flow_removed");
        assert.deepStrictEqual(clearCalls, [
            {
                subjectType: "organization",
                subjectId: "org-1",
                operation: "remove_flow",
                flowId: "flow-x",
            },
            {
                subjectType: "organization",
                subjectId: "org-1",
                operation: "assign_flow",
                flowId: "flow-x",
            },
        ]);
    });

    it("removeFlowFromSubject enqueues pending on error with operation and flowId", async () => {
        BffProvisioningClient.setInstance({
            removeFlow: async () => {
                throw new Error("BFF_PROVISIONING_HTTP_500");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().removeFlowFromSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-2",
        );

        assert.strictEqual(result.reason, "error");
        assert.deepStrictEqual(enqueueCalls, [{
            subjectType: "organization",
            subjectId: "org-1",
            operation: "remove_flow",
            flowId: "flow-2",
        }]);
    });

    it("flushPendingWorkspaceSyncs replays assign_flow with stored flowId", async () => {
        const assignCalls: Array<{ subjectId: string; flowId: string }> = [];
        const originalFindPending = ItaasWorkspaceSyncPending.findPending;
        ItaasWorkspaceSyncPending.findPending = (async () => ([{
            subjectType: "user",
            subjectId: "user-9",
            operation: "assign_flow",
            flowId: "flow-replay",
        }] as any)) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            assignFlow: async (ref: { subjectId: string }, flowId: string) => {
                assignCalls.push({ subjectId: ref.subjectId, flowId });
                return {
                    skipped: false,
                    tenant: {
                        subjectKey: ref.subjectId,
                        subjectType: "user",
                        status: "active",
                        flowIds: [flowId],
                        credentialIds: [],
                        createdAt: 1,
                        updatedAt: 1,
                    },
                };
            },
        } as any);

        try {
            const processed = await ItaasWorkspaceProvisioningService.getInstance().flushPendingWorkspaceSyncs();
            assert.strictEqual(processed, 1);
            assert.deepStrictEqual(assignCalls, [{ subjectId: "user-9", flowId: "flow-replay" }]);
            assert.deepStrictEqual(clearCalls, [
                {
                    subjectType: "user",
                    subjectId: "user-9",
                    operation: "assign_flow",
                    flowId: "flow-replay",
                },
                {
                    subjectType: "user",
                    subjectId: "user-9",
                    operation: "remove_flow",
                    flowId: "flow-replay",
                },
            ]);
        } finally {
            ItaasWorkspaceSyncPending.findPending = originalFindPending;
        }
    });
});

describe("ItaasWorkspaceProvisioningService admin flow helpers", () => {
    let originalEnqueue: typeof ItaasWorkspaceSyncPending.enqueue;
    let originalClearOp: typeof ItaasWorkspaceSyncPending.clearBySubjectOperation;
    let originalClearByFlow: typeof ItaasWorkspaceSyncPending.clearByFlowId;
    let originalFindExclusive: typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
    let originalFindByFlowIds: typeof ItaasFlowSetting.findByFlowIds;
    let originalFindAll: typeof ItaasFlowSetting.findAll;
    let originalIsGraphVisible: typeof ItaasFlowSetting.isGraphVisibleToUsers;
    let originalSetGraphVisible: typeof ItaasFlowSetting.setGraphVisibleToUsers;
    let originalSetGraphVisibleForFlowIds: typeof ItaasFlowSetting.setGraphVisibleToUsersForFlowIds;
    let originalDeleteByFlowIds: typeof ItaasFlowSetting.deleteByFlowIds;
    let graphVisibleByFlow: Map<string, boolean>;
    let deletedFlowIds: string[];
    let enqueueCalls: Array<{ subjectType: string; subjectId: string; operation?: string; flowId?: string }>;
    let clearByFlowCalls: string[];
    let redisWasEnabled: boolean;

    beforeEach(() => {
        redisWasEnabled = RedisConfig.getInstance().enabled;
        RedisConfig.getInstance().enabled = false;
        enqueueCalls = [];
        clearByFlowCalls = [];
        graphVisibleByFlow = new Map();
        originalEnqueue = ItaasWorkspaceSyncPending.enqueue;
        originalClearOp = ItaasWorkspaceSyncPending.clearBySubjectOperation;
        originalClearByFlow = ItaasWorkspaceSyncPending.clearByFlowId;
        originalFindExclusive = CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        originalFindByFlowIds = ItaasFlowSetting.findByFlowIds;
        originalFindAll = ItaasFlowSetting.findAll;
        originalIsGraphVisible = ItaasFlowSetting.isGraphVisibleToUsers;
        originalSetGraphVisible = ItaasFlowSetting.setGraphVisibleToUsers;
        originalSetGraphVisibleForFlowIds = ItaasFlowSetting.setGraphVisibleToUsersForFlowIds;
        originalDeleteByFlowIds = ItaasFlowSetting.deleteByFlowIds;
        deletedFlowIds = [];
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = (async () => null) as typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        ItaasFlowSetting.findByFlowIds = (async (flowIds: string[]) => {
            return flowIds
                .filter((flowId) => graphVisibleByFlow.has(flowId))
                .map((flowId) => ({
                    flowId,
                    graphVisibleToUsers: graphVisibleByFlow.get(flowId) === true,
                })) as any;
        }) as typeof ItaasFlowSetting.findByFlowIds;
        ItaasFlowSetting.isGraphVisibleToUsers = (async (flowId: string) => {
            return graphVisibleByFlow.get(flowId) === true;
        }) as typeof ItaasFlowSetting.isGraphVisibleToUsers;
        ItaasFlowSetting.setGraphVisibleToUsers = (async (flowId: string, visible: boolean) => {
            graphVisibleByFlow.set(flowId, !!visible);
            return {
                flowId,
                graphVisibleToUsers: !!visible,
            } as any;
        }) as typeof ItaasFlowSetting.setGraphVisibleToUsers;
        ItaasFlowSetting.setGraphVisibleToUsersForFlowIds = (async (flowIds: string[], visible: boolean) => {
            const ids = Array.from(new Set((flowIds || []).map((flowId) => ((flowId || "") + "").trim()).filter(Boolean)));
            for (const flowId of ids) {
                graphVisibleByFlow.set(flowId, !!visible);
            }
            return ids;
        }) as typeof ItaasFlowSetting.setGraphVisibleToUsersForFlowIds;
        ItaasFlowSetting.findAll = (async () => {
            return Array.from(graphVisibleByFlow.keys()).map((flowId) => ({
                flowId,
                graphVisibleToUsers: graphVisibleByFlow.get(flowId) === true,
            })) as any;
        }) as typeof ItaasFlowSetting.findAll;
        ItaasFlowSetting.deleteByFlowIds = (async (flowIds: string[]) => {
            let deleted = 0;
            for (const flowId of flowIds) {
                if (graphVisibleByFlow.delete(flowId)) {
                    deletedFlowIds.push(flowId);
                    deleted++;
                }
            }
            return deleted;
        }) as typeof ItaasFlowSetting.deleteByFlowIds;
        ItaasWorkspaceSyncPending.enqueue = (async (
            subjectType: string,
            subjectId: string,
            operation = "sync",
            flowId = "",
        ) => {
            enqueueCalls.push({ subjectType, subjectId, operation, flowId });
        }) as any;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = (async () => undefined) as any;
        ItaasWorkspaceSyncPending.clearByFlowId = (async (flowId: string) => {
            clearByFlowCalls.push(flowId);
        }) as any;
    });

    afterEach(() => {
        ItaasWorkspaceSyncPending.enqueue = originalEnqueue;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = originalClearOp;
        ItaasWorkspaceSyncPending.clearByFlowId = originalClearByFlow;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = originalFindExclusive;
        ItaasFlowSetting.findByFlowIds = originalFindByFlowIds;
        ItaasFlowSetting.findAll = originalFindAll;
        ItaasFlowSetting.isGraphVisibleToUsers = originalIsGraphVisible;
        ItaasFlowSetting.setGraphVisibleToUsers = originalSetGraphVisible;
        ItaasFlowSetting.setGraphVisibleToUsersForFlowIds = originalSetGraphVisibleForFlowIds;
        ItaasFlowSetting.deleteByFlowIds = originalDeleteByFlowIds;
        ItaasWorkspaceProvisioningService.setInstance(null);
        BffProvisioningClient.setInstance(null);
        BffProvisioningConfig.setInstance(null);
        RedisConfig.getInstance().enabled = redisWasEnabled;
    });

    function sampleTenant(overrides?: Partial<{
        subjectKey: string;
        subjectType: "organization" | "user";
        name: string;
        status: "active" | "inactive";
        flowIds: string[];
    }>) {
        return {
            subjectKey: overrides?.subjectKey || "org-1",
            subjectType: overrides?.subjectType || "organization" as const,
            name: overrides?.name || "Org 1",
            status: overrides?.status || "active" as const,
            flowIds: overrides?.flowIds || [],
            credentialIds: [] as string[],
            createdAt: 1,
            updatedAt: 2,
        };
    }

    it("listAdminFlows enriches catalog with assignments and visibility", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listCatalogFlows: async (q?: string) => {
                assert.strictEqual(q, "legal");
                return {
                    skipped: false,
                    items: [
                        {
                            id: "flow-global",
                            name: "Global Flow",
                            deployed: true,
                            isGlobal: true,
                        },
                        {
                            id: "flow-assigned",
                            name: "Assigned Flow",
                            deployed: false,
                            type: "CHATFLOW",
                            isGlobal: false,
                        },
                        {
                            id: "flow-free",
                            name: "Free Flow",
                            deployed: true,
                            isGlobal: false,
                        },
                    ],
                };
            },
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({
                        subjectKey: "org-1",
                        subjectType: "organization",
                        name: "Acme",
                        flowIds: ["flow-assigned", "flow-global"],
                    }),
                    sampleTenant({
                        subjectKey: "user:u-9",
                        subjectType: "user",
                        name: "Ana",
                        flowIds: ["flow-assigned"],
                    }),
                ],
            }),
        } as any);

        const items = await ItaasWorkspaceProvisioningService.getInstance().listAdminFlows("legal");
        assert.strictEqual(items.length, 3);

        assert.strictEqual(items[0].visibility, "global");
        assert.strictEqual(items[0].graphVisibleToUsers, false);
        assert.deepStrictEqual(items[0].assignments, [
            { subjectType: "organization", subjectId: "org-1", name: "Acme", status: "active" },
        ]);

        assert.strictEqual(items[1].visibility, "workspace");
        assert.deepStrictEqual(items[1].assignments, [
            { subjectType: "organization", subjectId: "org-1", name: "Acme", status: "active" },
            { subjectType: "user", subjectId: "u-9", name: "Ana", status: "active" },
        ]);

        assert.strictEqual(items[2].visibility, "unassigned");
        assert.deepStrictEqual(items[2].assignments, []);
    });

    it("getAdminFlow returns a catalog flow enriched with assignments", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async (flowId: string) => {
                assert.strictEqual(flowId, "flow-assigned");
                return {
                    skipped: false,
                    item: {
                        id: "flow-assigned",
                        name: "Assigned Flow",
                        deployed: false,
                        type: "CHATFLOW",
                        isGlobal: false,
                    },
                };
            },
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({
                        subjectKey: "org-1",
                        name: "Acme",
                        flowIds: ["flow-assigned"],
                    }),
                ],
            }),
        } as any);

        const item = await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("flow-assigned");
        assert.strictEqual(item.id, "flow-assigned");
        assert.strictEqual(item.visibility, "workspace");
        assert.deepStrictEqual(item.assignments, [
            { subjectType: "organization", subjectId: "org-1", name: "Acme", status: "active" },
        ]);
        assert.strictEqual("graph" in item, false);
    });

    it("getAdminFlow uses BFF assignment snapshot without listing tenants", async () => {
        let listTenantsCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => ({
                skipped: false,
                item: {
                    id: "flow-assigned",
                    name: "Assigned Flow",
                    deployed: true,
                    isGlobal: false,
                    assignments: [
                        { subjectType: "organization", subjectId: "org-1", name: "Acme", status: "active" },
                        { subjectType: "user", subjectId: "u-9", name: "Ana", status: "inactive" },
                    ],
                },
            }),
            listTenants: async () => {
                listTenantsCalls += 1;
                throw new Error("should not list tenants");
            },
        } as any);

        const item = await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("flow-assigned");
        assert.strictEqual(item.visibility, "workspace");
        assert.strictEqual(item.isGlobal, false);
        assert.deepStrictEqual(item.assignments, [
            { subjectType: "organization", subjectId: "org-1", name: "Acme", status: "active" },
            { subjectType: "user", subjectId: "u-9", name: "Ana", status: "inactive" },
        ]);
        assert.strictEqual(listTenantsCalls, 0);
    });

    it("getAdminFlow includes a sanitized graph when the catalog item has one", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => ({
                skipped: false,
                item: {
                    id: "flow-graph",
                    name: "Graph Flow",
                    deployed: true,
                    isGlobal: false,
                    assignments: [],
                    graph: {
                        nodes: [{ id: "n1", label: "Start", x: 10, y: 20 }],
                        edges: [{ id: "e1", source: "n1", target: "n1" }],
                    },
                },
            }),
            listTenants: async () => {
                throw new Error("should not list tenants");
            },
        } as any);

        const item = await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("flow-graph");
        assert.strictEqual(item.graphVisibleToUsers, false);
        assert.deepStrictEqual(item.graph, {
            nodes: [{ id: "n1", label: "Start", x: 10, y: 20 }],
            edges: [{ id: "e1", source: "n1", target: "n1" }],
        });
    });

    it("listAdminFlows includes graphVisibleToUsers from stored settings", async () => {
        graphVisibleByFlow.set("flow-global", true);
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listCatalogFlows: async () => ({
                skipped: false,
                items: [
                    { id: "flow-global", name: "Global Flow", deployed: true, isGlobal: true },
                    { id: "flow-free", name: "Free Flow", deployed: true, isGlobal: false },
                ],
            }),
            listTenants: async () => ({ skipped: false, tenants: [] }),
        } as any);

        const items = await ItaasWorkspaceProvisioningService.getInstance().listAdminFlows();
        assert.strictEqual(items[0].graphVisibleToUsers, true);
        assert.strictEqual(items[1].graphVisibleToUsers, false);
    });

    it("setAdminFlowGraphVisibility upserts the flag for a catalog flow", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async (flowId: string) => {
                assert.strictEqual(flowId, "flow-1");
                return {
                    skipped: false,
                    item: {
                        id: "flow-1",
                        name: "Demo",
                        deployed: true,
                        isGlobal: false,
                    },
                };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowGraphVisibility("flow-1", true);
        assert.deepStrictEqual(result, { flowId: "flow-1", graphVisibleToUsers: true });
        assert.strictEqual(graphVisibleByFlow.get("flow-1"), true);
    });

    it("setAdminFlowGraphVisibility throws FLOW_NOT_FOUND when the BFF has no such flow", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                throw new Error("BFF_PROVISIONING_FLOW_NOT_FOUND");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowGraphVisibility("missing", true);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_NOT_FOUND");
        }
    });

    it("setAdminFlowGraphVisibility throws INVALID_FLOW_ID when flowId is empty", async () => {
        try {
            await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowGraphVisibility("  ", true);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("setAdminFlowsGraphVisibility upserts local settings without calling the BFF", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                throw new Error("getCatalogFlow should not be called for bulk visibility");
            },
            listCatalogFlows: async () => {
                throw new Error("listCatalogFlows should not be called for bulk visibility");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowsGraphVisibility(
            ["flow-1", " flow-2 ", "flow-1", ""],
            true,
        );
        assert.deepStrictEqual(result, { flowIds: ["flow-1", "flow-2"], graphVisibleToUsers: true });
        assert.strictEqual(graphVisibleByFlow.get("flow-1"), true);
        assert.strictEqual(graphVisibleByFlow.get("flow-2"), true);
    });

    it("setAdminFlowsGraphVisibility throws INVALID_BODY when no flow ids remain", async () => {
        try {
            await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowsGraphVisibility(["  ", ""], false);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_BODY");
        }
    });

    it("setAdminFlowsGraphVisibility returns the ids that were written when some fail", async () => {
        ItaasFlowSetting.setGraphVisibleToUsersForFlowIds = (async (flowIds: string[], visible: boolean) => {
            const ids = Array.from(new Set((flowIds || []).map((flowId) => ((flowId || "") + "").trim()).filter(Boolean)));
            const kept = ids.filter((flowId) => flowId !== "flow-2");
            for (const flowId of kept) {
                graphVisibleByFlow.set(flowId, !!visible);
            }
            return kept;
        }) as typeof ItaasFlowSetting.setGraphVisibleToUsersForFlowIds;

        const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowsGraphVisibility(
            ["flow-1", "flow-2"],
            true,
        );
        assert.deepStrictEqual(result, { flowIds: ["flow-1"], graphVisibleToUsers: true });
        assert.strictEqual(graphVisibleByFlow.get("flow-1"), true);
        assert.strictEqual(graphVisibleByFlow.has("flow-2"), false);
    });

    it("setAdminFlowsGraphVisibility returns empty ids when every write fails", async () => {
        ItaasFlowSetting.setGraphVisibleToUsersForFlowIds = (async () => []) as typeof ItaasFlowSetting.setGraphVisibleToUsersForFlowIds;
        const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowsGraphVisibility(
            ["flow-1"],
            true,
        );
        assert.deepStrictEqual(result, { flowIds: [], graphVisibleToUsers: true });
        assert.strictEqual(graphVisibleByFlow.has("flow-1"), false);
    });

    it("lookupAdminFlowsGraphVisibility returns stored flags without calling the BFF", async () => {
        graphVisibleByFlow.set("flow-1", true);
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                throw new Error("getCatalogFlow should not be called for visibility lookup");
            },
            listCatalogFlows: async () => {
                throw new Error("listCatalogFlows should not be called for visibility lookup");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().lookupAdminFlowsGraphVisibility(
            ["flow-1", " flow-2 ", "flow-1", ""],
        );
        assert.deepStrictEqual(result, {
            items: [
                { flowId: "flow-1", graphVisibleToUsers: true },
                { flowId: "flow-2", graphVisibleToUsers: false },
            ],
        });
    });

    it("lookupAdminFlowsGraphVisibility throws INVALID_BODY when no flow ids remain", async () => {
        try {
            await ItaasWorkspaceProvisioningService.getInstance().lookupAdminFlowsGraphVisibility(["  ", ""]);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_BODY");
        }
    });

    it("purgeOrphanedFlowSettings deletes settings missing from the BFF catalog", async () => {
        graphVisibleByFlow.set("flow-live", true);
        graphVisibleByFlow.set("flow-gone", false);
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listCatalogFlows: async () => ({
                skipped: false,
                items: [{ id: "flow-live", name: "Live", deployed: true, isGlobal: false }],
            }),
            getCatalogFlow: async () => {
                throw new Error("getCatalogFlow should not be called for orphan cleanup");
            },
        } as any);

        const deleted = await ItaasWorkspaceProvisioningService.getInstance().purgeOrphanedFlowSettings();
        assert.strictEqual(deleted, 1);
        assert.deepStrictEqual(deletedFlowIds, ["flow-gone"]);
        assert.strictEqual(graphVisibleByFlow.has("flow-live"), true);
        assert.strictEqual(graphVisibleByFlow.has("flow-gone"), false);
    });

    it("purgeOrphanedFlowSettings does not delete when the BFF is unavailable", async () => {
        graphVisibleByFlow.set("flow-1", true);
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listCatalogFlows: async () => {
                throw new Error("BFF_PROVISIONING_HTTP_500");
            },
        } as any);

        const deleted = await ItaasWorkspaceProvisioningService.getInstance().purgeOrphanedFlowSettings();
        assert.strictEqual(deleted, 0);
        assert.strictEqual(graphVisibleByFlow.has("flow-1"), true);
        assert.deepStrictEqual(deletedFlowIds, []);
    });

    it("purgeOrphanedFlowSettings does not delete when provisioning is disabled", async () => {
        graphVisibleByFlow.set("flow-1", true);
        BffProvisioningClient.setInstance({
            isEnabled: () => false,
            listCatalogFlows: async () => {
                throw new Error("listCatalogFlows should not be called when disabled");
            },
        } as any);

        const deleted = await ItaasWorkspaceProvisioningService.getInstance().purgeOrphanedFlowSettings();
        assert.strictEqual(deleted, 0);
        assert.strictEqual(graphVisibleByFlow.has("flow-1"), true);
    });

    it("getAdminFlow marks a flow global from the BFF assignment snapshot", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => ({
                skipped: false,
                item: {
                    id: "flow-global",
                    name: "Global Flow",
                    deployed: true,
                    isGlobal: true,
                    assignments: [],
                },
            }),
            listTenants: async () => {
                throw new Error("should not list tenants");
            },
        } as any);

        const item = await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("flow-global");
        assert.strictEqual(item.visibility, "global");
        assert.strictEqual(item.isGlobal, true);
        assert.deepStrictEqual(item.assignments, []);
    });

    it("getAdminFlow throws FLOW_NOT_FOUND when the BFF has no such flow", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                throw new Error("BFF_PROVISIONING_FLOW_NOT_FOUND");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("missing");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_NOT_FOUND");
        }
    });

    it("getAdminFlow throws INVALID_FLOW_ID when flowId is empty", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow("  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("listAdminFlows throws BFF_UNAVAILABLE when disabled", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => false,
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().listAdminFlows();
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_UNAVAILABLE");
        }
    });

    it("listAdminWorkspaces derives subjectId from subjectKey", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({ subjectKey: "org-abc", subjectType: "organization", flowIds: ["f1"] }),
                    sampleTenant({
                        subjectKey: "user:usr-1",
                        subjectType: "user",
                        name: "User One",
                        status: "inactive",
                        flowIds: [],
                    }),
                ],
            }),
        } as any);

        const workspaces = await ItaasWorkspaceProvisioningService.getInstance().listAdminWorkspaces();
        assert.deepStrictEqual(workspaces, [
            {
                subjectType: "organization",
                subjectId: "org-abc",
                subjectKey: "org-abc",
                name: "Org 1",
                status: "active",
                flowIds: ["f1"],
            },
            {
                subjectType: "user",
                subjectId: "usr-1",
                subjectKey: "user:usr-1",
                name: "User One",
                status: "inactive",
                flowIds: [],
            },
        ]);
    });

    it("makeFlowGlobal throws FLOW_ALREADY_ASSIGNED for an exclusive custom-agent flow", async () => {
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = (async () => ({
            id: "req-1",
            organizationId: "org-1",
            requesterUserId: "user-1",
        })) as unknown as typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;

        let listTenantsCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => {
                listTenantsCalls += 1;
                throw new Error("should not list tenants");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_ALREADY_ASSIGNED");
        }
        assert.strictEqual(listTenantsCalls, 0);
    });

    it("makeFlowGlobal clears assignments then publishes", async () => {
        const removeCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];
        let addCalled = false;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x", "other"] }),
                    sampleTenant({
                        subjectKey: "user:u-1",
                        subjectType: "user",
                        flowIds: ["flow-x"],
                    }),
                    sampleTenant({ subjectKey: "org-2", name: "Other", flowIds: ["other"] }),
                ],
            }),
            removeFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                removeCalls.push({ subjectType: ref.subjectType, subjectId: ref.subjectId, flowId });
                return {
                    skipped: false,
                    tenant: sampleTenant({
                        subjectKey: ref.subjectType === "user" ? `user:${ref.subjectId}` : ref.subjectId,
                        subjectType: ref.subjectType as "organization" | "user",
                        flowIds: [],
                    }),
                };
            },
            addGlobalFlow: async (flowId: string) => {
                assert.strictEqual(flowId, "flow-x");
                addCalled = true;
                return { skipped: false, globalFlowIds: ["flow-x"] };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
        assert.strictEqual(result.clearedAssignments, 2);
        assert.deepStrictEqual(result.globalFlowIds, ["flow-x"]);
        assert.strictEqual(addCalled, true);
        assert.deepStrictEqual(removeCalls, [
            { subjectType: "organization", subjectId: "org-1", flowId: "flow-x" },
            { subjectType: "user", subjectId: "u-1", flowId: "flow-x" },
        ]);
        assert.deepStrictEqual(clearByFlowCalls, ["flow-x"]);
    });

    it("makeFlowGlobal rolls back cleared assignments when a remove fails", async () => {
        let addCalled = false;
        const assignCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] }),
                    sampleTenant({ subjectKey: "org-2", name: "Org 2", flowIds: ["flow-x"] }),
                ],
            }),
            removeFlow: async (ref: { subjectId: string }) => {
                if (ref.subjectId === "org-2") {
                    throw new Error("BFF_PROVISIONING_HTTP_500");
                }
                return {
                    skipped: false,
                    tenant: sampleTenant({ subjectKey: ref.subjectId, flowIds: [] }),
                };
            },
            assignFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls.push({
                    subjectType: ref.subjectType,
                    subjectId: ref.subjectId,
                    flowId,
                });
                return {
                    skipped: false,
                    tenant: sampleTenant({
                        subjectKey: ref.subjectId,
                        flowIds: [flowId],
                    }),
                };
            },
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            addGlobalFlow: async () => {
                addCalled = true;
                return { skipped: false, globalFlowIds: ["flow-x"] };
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_GLOBAL_SYNC_FAILED");
        }
        assert.strictEqual(addCalled, false);
        assert.deepStrictEqual(assignCalls, [
            { subjectType: "organization", subjectId: "org-1", flowId: "flow-x" },
        ]);
    });

    it("makeFlowGlobal rolls back cleared assignments when publish fails", async () => {
        const assignCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [
                    sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] }),
                    sampleTenant({ subjectKey: "org-2", name: "Org 2", flowIds: ["flow-x"] }),
                ],
            }),
            removeFlow: async (ref: { subjectType: string; subjectId: string }) => ({
                skipped: false,
                tenant: sampleTenant({
                    subjectKey: ref.subjectType === "user" ? `user:${ref.subjectId}` : ref.subjectId,
                    subjectType: ref.subjectType as "organization" | "user",
                    flowIds: [],
                }),
            }),
            assignFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls.push({
                    subjectType: ref.subjectType,
                    subjectId: ref.subjectId,
                    flowId,
                });
                return {
                    skipped: false,
                    tenant: sampleTenant({
                        subjectKey: ref.subjectId,
                        flowIds: [flowId],
                    }),
                };
            },
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            addGlobalFlow: async () => {
                throw new Error("BFF_PROVISIONING_NETWORK_ERROR");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_GLOBAL_SYNC_FAILED");
        }
        assert.deepStrictEqual(assignCalls, [
            { subjectType: "organization", subjectId: "org-1", flowId: "flow-x" },
            { subjectType: "organization", subjectId: "org-2", flowId: "flow-x" },
        ]);
    });

    it("makeFlowGlobal treats lost publish response as success when BFF already has the flow", async () => {
        const assignCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] })],
            }),
            removeFlow: async (ref: { subjectId: string }) => ({
                skipped: false,
                tenant: sampleTenant({ subjectKey: ref.subjectId, flowIds: [] }),
            }),
            assignFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls.push({
                    subjectType: ref.subjectType,
                    subjectId: ref.subjectId,
                    flowId,
                });
                return {
                    skipped: false,
                    tenant: sampleTenant({ subjectKey: ref.subjectId, flowIds: [flowId] }),
                };
            },
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: ["flow-x"] }),
            addGlobalFlow: async () => {
                throw new Error("BFF_PROVISIONING_NETWORK_ERROR");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
        assert.deepStrictEqual(result.globalFlowIds, ["flow-x"]);
        assert.strictEqual(result.clearedAssignments, 1);
        assert.deepStrictEqual(assignCalls, []);
        assert.deepStrictEqual(clearByFlowCalls, ["flow-x"]);
    });

    it("makeFlowGlobal clears pending for subjects that never held the assignment", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] })],
            }),
            removeFlow: async (ref: { subjectId: string }) => ({
                skipped: false,
                tenant: sampleTenant({ subjectKey: ref.subjectId, flowIds: [] }),
            }),
            addGlobalFlow: async () => ({ skipped: false, globalFlowIds: ["flow-x"] }),
        } as any);

        await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
        // Must clear by flowId globally (not only cleared subjects), so a prior failed
        // assign_flow for org-other cannot resurrect after unpublish.
        assert.deepStrictEqual(clearByFlowCalls, ["flow-x"]);
    });

    it("makeFlowGlobal enqueues pending assign when rollback assign fails", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] })],
            }),
            removeFlow: async () => ({
                skipped: false,
                tenant: sampleTenant({ subjectKey: "org-1", flowIds: [] }),
            }),
            assignFlow: async () => {
                throw new Error("BFF_PROVISIONING_HTTP_500");
            },
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            addGlobalFlow: async () => {
                throw new Error("BFF_PROVISIONING_NETWORK_ERROR");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("flow-x");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_GLOBAL_SYNC_FAILED");
        }
        assert.deepStrictEqual(enqueueCalls, [{
            subjectType: "organization",
            subjectId: "org-1",
            operation: "assign_flow",
            flowId: "flow-x",
        }]);
    });

    it("makeFlowGlobal throws INVALID_FLOW_ID when empty", async () => {
        BffProvisioningClient.setInstance({ isEnabled: () => true } as any);
        try {
            await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal("  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("unpublishGlobalFlow removes from global list", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            removeGlobalFlow: async (flowId: string) => {
                assert.strictEqual(flowId, "flow-x");
                return { skipped: false, globalFlowIds: [] };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().unpublishGlobalFlow("flow-x");
        assert.deepStrictEqual(result.globalFlowIds, []);
        assert.strictEqual(result.clearedAssignments, 0);
        assert.deepStrictEqual(clearByFlowCalls, ["flow-x"]);
    });

    it("assignFlowToSubject throws FLOW_IS_GLOBAL without enqueue", async () => {
        const originalEnqueue = ItaasWorkspaceSyncPending.enqueue;
        const enqueueCalls: unknown[] = [];
        ItaasWorkspaceSyncPending.enqueue = (async (...args: unknown[]) => {
            enqueueCalls.push(args);
        }) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: ["flow-global"] }),
            assignFlow: async () => {
                throw new Error("should not assign");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "flow-global",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_IS_GLOBAL");
        } finally {
            ItaasWorkspaceSyncPending.enqueue = originalEnqueue;
        }

        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignFlowToSubject waits for makeFlowGlobal lock and then rejects FLOW_IS_GLOBAL", async () => {
        let releaseRemove!: () => void;
        const removeGate = new Promise<void>((resolve) => {
            releaseRemove = resolve;
        });
        let assignStartedAfterPublish = false;
        let published = false;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] })],
            }),
            removeFlow: async () => {
                await removeGate;
                return {
                    skipped: false,
                    tenant: sampleTenant({ subjectKey: "org-1", flowIds: [] }),
                };
            },
            addGlobalFlow: async () => {
                published = true;
                return { skipped: false, globalFlowIds: ["flow-x"] };
            },
            listGlobalFlows: async () => ({
                skipped: false,
                globalFlowIds: published ? ["flow-x"] : [],
            }),
            assignFlow: async () => {
                assignStartedAfterPublish = published;
                throw new Error("should not assign after publish");
            },
        } as any);

        const service = ItaasWorkspaceProvisioningService.getInstance();
        const makePromise = service.makeFlowGlobal("flow-x");
        const assignPromise = service.assignFlowToSubject(
            { subjectType: "organization", subjectId: "org-2" },
            "flow-x",
        );

        // Let assign queue behind makeFlowGlobal before releasing the remove step.
        await new Promise((resolve) => setTimeout(resolve, 20));
        releaseRemove();

        const makeResult = await makePromise;
        assert.deepStrictEqual(makeResult.globalFlowIds, ["flow-x"]);

        try {
            await assignPromise;
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_IS_GLOBAL");
        }
        assert.strictEqual(assignStartedAfterPublish, false);
    });

    it("assignExclusiveCatalogFlowToSubject assigns a free catalog flow", async () => {
        const tenants: ReturnType<typeof sampleTenant>[] = [];
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-x", name: "Custom", deployed: true, isGlobal: false },
            }),
            listTenants: async () => ({ skipped: false, tenants }),
            assignFlow: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                const tenant = sampleTenant({
                    subjectKey: subject.subjectId,
                    subjectType: subject.subjectType as "organization" | "user",
                    flowIds: [flowId],
                });
                tenants.push(tenant);
                return { skipped: false, tenant };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );

        assert.strictEqual(result.reason, "flow_assigned");
        assert.strictEqual(tenants.length, 1);
    });

    it("assignExclusiveCatalogFlowToSubject throws INVALID_FLOW_ID when the BFF has no such flow", async () => {
        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                throw new Error("BFF_PROVISIONING_FLOW_NOT_FOUND");
            },
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "missing",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
        assert.strictEqual(assignCalls, 0);
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject throws FLOW_IS_GLOBAL from catalog flow info", async () => {
        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-global", name: "Global", deployed: true, isGlobal: true },
            }),
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "flow-global",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_IS_GLOBAL");
        }
        assert.strictEqual(assignCalls, 0);
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject throws FLOW_ALREADY_ASSIGNED from BFF assignments", async () => {
        let assignCalls = 0;
        let listTenantsCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => ({
                skipped: false,
                item: {
                    id: "flow-x",
                    name: "Custom",
                    deployed: true,
                    isGlobal: false,
                    assignments: [
                        { subjectType: "organization", subjectId: "org-other", name: "Other", status: "active" },
                    ],
                },
            }),
            listTenants: async () => {
                listTenantsCalls += 1;
                throw new Error("should not list tenants");
            },
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "flow-x",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_ALREADY_ASSIGNED");
        }
        assert.strictEqual(assignCalls, 0);
        assert.strictEqual(listTenantsCalls, 0);
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject throws FLOW_ALREADY_ASSIGNED for another workspace", async () => {
        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-x", name: "Custom", deployed: true, isGlobal: false },
            }),
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-other", flowIds: ["flow-x"] })],
            }),
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "flow-x",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_ALREADY_ASSIGNED");
        }
        assert.strictEqual(assignCalls, 0);
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject does not enqueue pending when assign fails", async () => {
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-x", name: "Custom", deployed: true, isGlobal: false },
            }),
            listTenants: async () => ({ skipped: false, tenants: [] }),
            assignFlow: async () => {
                throw new Error("BFF_PROVISIONING_HTTP_500");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );

        assert.strictEqual(result.reason, "error");
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject is idempotent when the same subject already owns the flow", async () => {
        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-x", name: "Custom", deployed: true, isGlobal: false },
            }),
            listTenants: async () => ({
                skipped: false,
                tenants: [sampleTenant({ subjectKey: "org-1", flowIds: ["flow-x"] })],
            }),
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not re-assign");
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );

        assert.strictEqual(result.reason, "flow_assigned");
        assert.strictEqual(assignCalls, 0);
        assert.deepStrictEqual(enqueueCalls, []);
    });

    it("assignExclusiveCatalogFlowToSubject serializes concurrent assigns and rejects the second subject", async () => {
        const tenants: ReturnType<typeof sampleTenant>[] = [];
        let assignCalls = 0;
        let markAssignStarted!: () => void;
        const assignStarted = new Promise<void>((resolve) => {
            markAssignStarted = resolve;
        });
        let releaseFirst!: () => void;
        const firstAssignGate = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            getCatalogFlow: async () => ({
                skipped: false,
                item: { id: "flow-x", name: "Custom", deployed: true, isGlobal: false },
            }),
            listTenants: async () => ({
                skipped: false,
                tenants: tenants.map((tenant) => ({ ...tenant, flowIds: [...tenant.flowIds] })),
            }),
            assignFlow: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls += 1;
                markAssignStarted();
                if (assignCalls === 1) {
                    await firstAssignGate;
                }
                const tenant = sampleTenant({
                    subjectKey: subject.subjectId,
                    subjectType: subject.subjectType as "organization" | "user",
                    flowIds: [flowId],
                });
                const existing = tenants.findIndex((row) => row.subjectKey === tenant.subjectKey);
                if (existing >= 0) {
                    tenants[existing] = tenant;
                } else {
                    tenants.push(tenant);
                }
                return { skipped: false, tenant };
            },
        } as any);

        const service = ItaasWorkspaceProvisioningService.getInstance();
        const first = service.assignExclusiveCatalogFlowToSubject(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-x",
        );
        await assignStarted;
        const second = service.assignExclusiveCatalogFlowToSubject(
            { subjectType: "organization", subjectId: "org-2" },
            "flow-x",
        );
        releaseFirst();

        const firstResult = await first;
        assert.strictEqual(firstResult.reason, "flow_assigned");
        try {
            await second;
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_ALREADY_ASSIGNED");
        }
        assert.strictEqual(assignCalls, 1);
    });

    it("assignExclusiveCatalogFlowToSubject throws FLOW_OP_BUSY when Redis is enabled but the lock cannot be acquired", async () => {
        RedisConfig.getInstance().enabled = true;
        const originalRedis = RedisService.instance;
        RedisService.instance = {
            tryAcquireLock: async () => {
                throw new Error("ECONNREFUSED");
            },
            releaseLock: async () => undefined,
        } as any;

        let assignCalls = 0;
        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            getCatalogFlow: async () => {
                assignCalls += 1;
                throw new Error("should not read catalog without a distributed lock");
            },
            assignFlow: async () => {
                assignCalls += 1;
                throw new Error("should not assign without a distributed lock");
            },
        } as any);

        try {
            await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(
                { subjectType: "organization", subjectId: "org-1" },
                "flow-x",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_OP_BUSY");
        } finally {
            RedisService.instance = originalRedis;
            RedisConfig.getInstance().enabled = false;
        }

        assert.strictEqual(assignCalls, 0);
    });
});

describe("ItaasWorkspaceProvisioningService custom-agent monthly flow sync", () => {
    let originalFindByMonthlySubscriptionId: typeof CustomAgentRequest.findByMonthlySubscriptionId;
    let originalFindExclusive: typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
    let originalEnqueue: typeof ItaasWorkspaceSyncPending.enqueue;
    let originalClearOp: typeof ItaasWorkspaceSyncPending.clearBySubjectOperation;
    let redisWasEnabled: boolean;

    beforeEach(() => {
        redisWasEnabled = RedisConfig.getInstance().enabled;
        RedisConfig.getInstance().enabled = false;
        originalFindByMonthlySubscriptionId = CustomAgentRequest.findByMonthlySubscriptionId;
        originalFindExclusive = CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        originalEnqueue = ItaasWorkspaceSyncPending.enqueue;
        originalClearOp = ItaasWorkspaceSyncPending.clearBySubjectOperation;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = (async () => null) as typeof CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId;
        ItaasWorkspaceSyncPending.enqueue = (async () => undefined) as any;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = (async () => undefined) as any;
    });

    afterEach(() => {
        CustomAgentRequest.findByMonthlySubscriptionId = originalFindByMonthlySubscriptionId;
        CustomAgentRequest.findExclusiveByDeliveredFlowiseFlowId = originalFindExclusive;
        ItaasWorkspaceSyncPending.enqueue = originalEnqueue;
        ItaasWorkspaceSyncPending.clearBySubjectOperation = originalClearOp;
        ItaasWorkspaceProvisioningService.setInstance(null);
        BffProvisioningClient.setInstance(null);
        BffProvisioningConfig.setInstance(null);
        RedisConfig.getInstance().enabled = redisWasEnabled;
    });

    it("syncCustomAgentDeliveredFlow removes the delivered flow when monthly subscription is cancelled", async () => {
        const removeCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];
        CustomAgentRequest.findByMonthlySubscriptionId = (async (subscriptionId: string) => {
            assert.strictEqual(subscriptionId, "sub-custom-1");
            return {
                organizationId: "",
                requesterUserId: "user-1",
                deliveredFlowiseFlowId: "flow-custom-1",
            } as CustomAgentRequest;
        }) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            removeFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                removeCalls.push({ subjectType: ref.subjectType, subjectId: ref.subjectId, flowId });
                return {
                    skipped: false,
                    tenant: {
                        subjectKey: "user-1",
                        subjectType: "user",
                        status: "active",
                        flowIds: [],
                        credentialIds: [],
                        createdAt: 1,
                        updatedAt: 1,
                    },
                };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().syncCustomAgentDeliveredFlow({
            id: "sub-custom-1",
            status: SubscriptionStatus.CANCELLED,
        } as Subscription);

        assert.strictEqual(result.action, "provision");
        assert.strictEqual(result.reason, "flow_removed");
        assert.deepStrictEqual(removeCalls, [{
            subjectType: "user",
            subjectId: "user-1",
            flowId: "flow-custom-1",
        }]);
    });

    it("syncCustomAgentDeliveredFlow re-assigns the delivered flow when monthly subscription is active", async () => {
        const assignCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];
        CustomAgentRequest.findByMonthlySubscriptionId = (async () => {
            return {
                organizationId: "org-1",
                requesterUserId: "user-1",
                deliveredFlowiseFlowId: "flow-org-custom",
            } as CustomAgentRequest;
        }) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            listGlobalFlows: async () => ({ skipped: false, globalFlowIds: [] }),
            assignFlow: async (ref: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls.push({ subjectType: ref.subjectType, subjectId: ref.subjectId, flowId });
                return {
                    skipped: false,
                    tenant: {
                        subjectKey: "org-1",
                        subjectType: "organization",
                        status: "active",
                        flowIds: [flowId],
                        credentialIds: [],
                        createdAt: 1,
                        updatedAt: 1,
                    },
                };
            },
        } as any);

        const result = await ItaasWorkspaceProvisioningService.getInstance().syncCustomAgentDeliveredFlow({
            id: "sub-custom-2",
            status: SubscriptionStatus.ACTIVE,
        } as Subscription);

        assert.strictEqual(result.action, "provision");
        assert.strictEqual(result.reason, "flow_assigned");
        assert.deepStrictEqual(assignCalls, [{
            subjectType: "organization",
            subjectId: "org-1",
            flowId: "flow-org-custom",
        }]);
    });

    it("syncCustomAgentDeliveredFlow removes the flow on past_due and suspended", async () => {
        const removeCalls: string[] = [];
        CustomAgentRequest.findByMonthlySubscriptionId = (async () => {
            return {
                organizationId: "",
                requesterUserId: "user-1",
                deliveredFlowiseFlowId: "flow-x",
            } as CustomAgentRequest;
        }) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            removeFlow: async (_ref: unknown, flowId: string) => {
                removeCalls.push(flowId);
                return {
                    skipped: false,
                    tenant: {
                        subjectKey: "user-1",
                        subjectType: "user",
                        status: "active",
                        flowIds: [],
                        credentialIds: [],
                        createdAt: 1,
                        updatedAt: 1,
                    },
                };
            },
        } as any);

        for (const status of [SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED]) {
            const result = await ItaasWorkspaceProvisioningService.getInstance().syncCustomAgentDeliveredFlow({
                id: "sub-unpaid",
                status,
            } as Subscription);
            assert.strictEqual(result.reason, "flow_removed", status);
        }

        assert.deepStrictEqual(removeCalls, ["flow-x", "flow-x"]);
    });

    it("syncWorkspaceForSubscription still revokes custom-agent flow when ITAAS workspace stays entitled", async () => {
        const removeCalls: Array<{ subjectId: string; flowId: string }> = [];
        CustomAgentRequest.findByMonthlySubscriptionId = (async () => {
            return {
                organizationId: "",
                requesterUserId: "user-keep-itaas",
                deliveredFlowiseFlowId: "flow-keep-workspace",
            } as CustomAgentRequest;
        }) as any;

        BffProvisioningClient.setInstance({
            isEnabled: () => true,
            removeFlow: async (ref: { subjectId: string }, flowId: string) => {
                removeCalls.push({ subjectId: ref.subjectId, flowId });
                return {
                    skipped: false,
                    tenant: {
                        subjectKey: ref.subjectId,
                        subjectType: "user",
                        status: "active",
                        flowIds: [],
                        credentialIds: [],
                        createdAt: 1,
                        updatedAt: 1,
                    },
                };
            },
            // Workspace sync would provision if ITAAS entitled; we stub subjectHasItaas via empty candidates path
            // by making syncWorkspaceForSubject skip through deactivated entitlement — stub ensureProvisioned/Deactivated
            // indirectly: subjectHasItaasEntitlement queries DB. Force skip by clearing uid/org so resolveSubject fails
            // after custom-agent sync — use a subscription that has uid so workspace sync runs.
            provision: async () => ({ skipped: true, reason: "test" }),
            deactivate: async () => ({ skipped: true, reason: "test" }),
        } as any);

        // Avoid DB entitlement lookup by stubbing subjectHasItaasEntitlement on the instance after creation.
        const service = ItaasWorkspaceProvisioningService.getInstance();
        (service as any).subjectHasItaasEntitlement = async () => true;
        (service as any).ensureProvisioned = async () => ({ action: "provision", reason: "ok" });

        const result = await service.syncWorkspaceForSubscription({
            id: "sub-custom-cancelled",
            uid: "user-keep-itaas",
            organizationId: "",
            status: SubscriptionStatus.CANCELLED,
        } as Subscription);

        assert.strictEqual(result.action, "provision");
        assert.deepStrictEqual(removeCalls, [{
            subjectId: "user-keep-itaas",
            flowId: "flow-keep-workspace",
        }]);
    });
});
