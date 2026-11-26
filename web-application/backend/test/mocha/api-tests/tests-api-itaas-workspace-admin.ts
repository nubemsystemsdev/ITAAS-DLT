// API tests — ITAAS workspace admin (catalog, global flows, assign/remove)

"use strict";

import { expect } from "chai";
import { APITester } from "../test-tools/api-tester";
import { APIAuthentication } from "../test-tools/authentication";
import { ApiItaasWorkspaceAdmin } from "../test-tools/api-bindings/api-group-itaas-workspace-admin";
import { PreparedUser, TestUsers } from "../test-tools/models/users";
import { ItaasWorkspaceProvisioningService } from "../../../src/services/itaas-workspace-provisioning-service";

describe("API / ITAAS Workspace Admin", () => {
    let testAdmin: PreparedUser;
    let testUser: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        testAdmin = await TestUsers.NewAdministrator();
        testUser = await TestUsers.NewRegularUser();
    });

    afterEach(() => {
        ItaasWorkspaceProvisioningService.setInstance(null);
    });

    it("AdminListItaasFlows returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminListItaasFlows({}),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminListItaasFlows returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminListItaasFlows({}),
            testUser.auth,
            403,
        );
    });

    it("AdminListItaasFlows returns enriched catalog for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            listAdminFlows: async (q?: string) => {
                expect(q).to.equal("legal");
                return [
                    {
                        id: "flow-1",
                        name: "Asistente Legal",
                        deployed: true,
                        isGlobal: false,
                        visibility: "workspace",
                        graphVisibleToUsers: false,
                        assignments: [
                            {
                                subjectType: "organization",
                                subjectId: "org-1",
                                name: "Acme",
                                status: "active",
                            },
                        ],
                    },
                ];
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminListItaasFlows({ q: "legal" }),
            testAdmin.auth,
        );

        expect(result.items).to.have.length(1);
        expect(result.items[0].id).to.equal("flow-1");
        expect(result.items[0].visibility).to.equal("workspace");
        expect(result.items[0].graphVisibleToUsers).to.equal(false);
        expect(result.items[0].assignments[0].subjectId).to.equal("org-1");
    });

    it("AdminGetItaasFlow returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminGetItaasFlow("flow-1"),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminGetItaasFlow returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminGetItaasFlow("flow-1"),
            testUser.auth,
            403,
        );
    });

    it("AdminGetItaasFlow returns the catalog flow for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            getAdminFlow: async (flowId: string) => {
                expect(flowId).to.equal("flow-1");
                return {
                    id: "flow-1",
                    name: "Asistente Legal",
                    deployed: true,
                    isGlobal: false,
                    visibility: "unassigned",
                    graphVisibleToUsers: false,
                    assignments: [],
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminGetItaasFlow("flow-1"),
            testAdmin.auth,
        );

        expect(result.id).to.equal("flow-1");
        expect(result.visibility).to.equal("unassigned");
    });

    it("AdminGetItaasFlow returns sanitized graph when present", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            getAdminFlow: async (flowId: string) => {
                expect(flowId).to.equal("flow-1");
                return {
                    id: "flow-1",
                    name: "Asistente Legal",
                    deployed: true,
                    isGlobal: false,
                    visibility: "unassigned",
                    graphVisibleToUsers: true,
                    assignments: [],
                    graph: {
                        nodes: [{ id: "n1", label: "Start", x: 1, y: 2 }],
                        edges: [],
                    },
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminGetItaasFlow("flow-1"),
            testAdmin.auth,
        );

        expect(result.graph).to.deep.equal({
            nodes: [{ id: "n1", label: "Start", x: 1, y: 2 }],
            edges: [],
        });
    });

    it("AdminGetItaasFlow returns 404 FLOW_NOT_FOUND", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            getAdminFlow: async () => {
                throw new Error("FLOW_NOT_FOUND");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminGetItaasFlow("missing"),
            testAdmin.auth,
            404,
            "FLOW_NOT_FOUND",
        );
    });

    it("AdminSetItaasFlowGraphVisibility returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility("flow-1", { visible: true }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminSetItaasFlowGraphVisibility returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility("flow-1", { visible: true }),
            testUser.auth,
            403,
        );
    });

    it("AdminSetItaasFlowGraphVisibility returns 400 INVALID_BODY", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility("flow-1", {} as any),
            testAdmin.auth,
            400,
            "INVALID_BODY",
        );
    });

    it("AdminSetItaasFlowGraphVisibility returns 404 FLOW_NOT_FOUND", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            setAdminFlowGraphVisibility: async () => {
                throw new Error("FLOW_NOT_FOUND");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility("missing", { visible: true }),
            testAdmin.auth,
            404,
            "FLOW_NOT_FOUND",
        );
    });

    it("AdminSetItaasFlowGraphVisibility returns updated visibility for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            setAdminFlowGraphVisibility: async (flowId: string, visible: boolean) => {
                expect(flowId).to.equal("flow-1");
                expect(visible).to.equal(true);
                return { flowId, graphVisibleToUsers: true };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility("flow-1", { visible: true }),
            testAdmin.auth,
        );

        expect(result.flowId).to.equal("flow-1");
        expect(result.graphVisibleToUsers).to.equal(true);
    });

    it("AdminSetItaasFlowsGraphVisibility returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({ visible: true, flowIds: ["flow-1"] }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminSetItaasFlowsGraphVisibility returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({ visible: true, flowIds: ["flow-1"] }),
            testUser.auth,
            403,
        );
    });

    it("AdminSetItaasFlowsGraphVisibility returns 400 INVALID_BODY", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({ visible: true } as any),
            testAdmin.auth,
            400,
            "INVALID_BODY",
        );
    });

    it("AdminSetItaasFlowsGraphVisibility returns 400 INVALID_BODY for an empty id list", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({ visible: false, flowIds: [] }),
            testAdmin.auth,
            400,
            "INVALID_BODY",
        );
    });

    it("AdminSetItaasFlowsGraphVisibility returns updated visibility for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            setAdminFlowsGraphVisibility: async (flowIds: string[], visible: boolean) => {
                expect(flowIds).to.deep.equal(["flow-1", "flow-2"]);
                expect(visible).to.equal(true);
                return { flowIds, graphVisibleToUsers: true };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({
                visible: true,
                flowIds: ["flow-1", "flow-2"],
            }),
            testAdmin.auth,
        );

        expect(result.flowIds).to.deep.equal(["flow-1", "flow-2"]);
        expect(result.graphVisibleToUsers).to.equal(true);
    });

    it("AdminLookupItaasFlowsGraphVisibility returns current visibility for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            lookupAdminFlowsGraphVisibility: async (flowIds: string[]) => {
                expect(flowIds).to.deep.equal(["flow-1", "flow-2"]);
                return {
                    items: [
                        { flowId: "flow-1", graphVisibleToUsers: true },
                        { flowId: "flow-2", graphVisibleToUsers: false },
                    ],
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminLookupItaasFlowsGraphVisibility({
                flowIds: ["flow-1", "flow-2"],
            }),
            testAdmin.auth,
        );

        expect(result.items).to.deep.equal([
            { flowId: "flow-1", graphVisibleToUsers: true },
            { flowId: "flow-2", graphVisibleToUsers: false },
        ]);
    });

    it("AdminListItaasFlows returns 503 BFF_UNAVAILABLE", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            listAdminFlows: async () => {
                throw new Error("BFF_UNAVAILABLE");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminListItaasFlows({}),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );
    });

    it("AdminListItaasWorkspaces returns workspaces for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            listAdminWorkspaces: async () => ([
                {
                    subjectType: "user",
                    subjectId: "u-1",
                    subjectKey: "user:u-1",
                    name: "Ana",
                    status: "active",
                    flowIds: ["flow-1"],
                },
            ]),
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminListItaasWorkspaces(),
            testAdmin.auth,
        );

        expect(result.items).to.have.length(1);
        expect(result.items[0].subjectKey).to.equal("user:u-1");
        expect(result.items[0].subjectId).to.equal("u-1");
    });

    it("AdminMakeItaasFlowGlobal returns global ids for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            makeFlowGlobal: async (flowId: string) => {
                expect(flowId).to.equal("flow-1");
                return { globalFlowIds: ["flow-1"], clearedAssignments: 2 };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminMakeItaasFlowGlobal({ flowId: "flow-1" }),
            testAdmin.auth,
        );

        expect(result.globalFlowIds).to.deep.equal(["flow-1"]);
        expect(result.clearedAssignments).to.equal(2);
    });

    it("AdminMakeItaasFlowGlobal returns 400 INVALID_FLOW_ID", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminMakeItaasFlowGlobal({ flowId: "" } as any),
            testAdmin.auth,
            400,
            "INVALID_FLOW_ID",
        );
    });

    it("AdminMakeItaasFlowGlobal returns 400 FLOW_GLOBAL_SYNC_FAILED", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            makeFlowGlobal: async () => {
                throw new Error("FLOW_GLOBAL_SYNC_FAILED");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminMakeItaasFlowGlobal({ flowId: "flow-1" }),
            testAdmin.auth,
            400,
            "FLOW_GLOBAL_SYNC_FAILED",
        );
    });

    it("AdminMakeItaasFlowGlobal returns 400 FLOW_ALREADY_ASSIGNED", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            makeFlowGlobal: async () => {
                throw new Error("FLOW_ALREADY_ASSIGNED");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminMakeItaasFlowGlobal({ flowId: "flow-custom-exclusive" }),
            testAdmin.auth,
            400,
            "FLOW_ALREADY_ASSIGNED",
        );
    });

    it("AdminUnpublishItaasFlowGlobal returns updated global ids", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            unpublishGlobalFlow: async (flowId: string) => {
                expect(flowId).to.equal("flow-1");
                return { globalFlowIds: [], clearedAssignments: 0 };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminUnpublishItaasFlowGlobal({ flowId: "flow-1" }),
            testAdmin.auth,
        );

        expect(result.globalFlowIds).to.deep.equal([]);
        expect(result.clearedAssignments).to.equal(0);
    });

    it("AdminAssignItaasWorkspaceFlow returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-1",
            }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-1",
            }),
            testUser.auth,
            403,
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 400 INVALID_FLOW_ID", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "",
            } as any),
            testAdmin.auth,
            400,
            "INVALID_FLOW_ID",
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 400 INVALID_SUBJECT", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "team",
                subjectId: "org-1",
                flowId: "flow-1",
            } as any),
            testAdmin.auth,
            400,
            "INVALID_SUBJECT",
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 400 FLOW_IS_GLOBAL", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignFlowToSubject: async () => {
                throw new Error("FLOW_IS_GLOBAL");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-global",
            }),
            testAdmin.auth,
            400,
            "FLOW_IS_GLOBAL",
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 400 FLOW_ALREADY_ASSIGNED", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignFlowToSubject: async () => {
                throw new Error("FLOW_ALREADY_ASSIGNED");
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-other",
                flowId: "flow-custom-exclusive",
            }),
            testAdmin.auth,
            400,
            "FLOW_ALREADY_ASSIGNED",
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns sync result for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                expect(subject.subjectType).to.equal("organization");
                expect(subject.subjectId).to.equal("org-1");
                expect(flowId).to.equal("flow-1");
                return {
                    action: "provision",
                    reason: "flow_assigned",
                    subject,
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-1",
            }),
            testAdmin.auth,
        );

        expect(result.action).to.equal("provision");
        expect(result.reason).to.equal("flow_assigned");
        expect(result.subject).to.deep.equal({
            subjectType: "organization",
            subjectId: "org-1",
        });
    });

    it("AdminAssignItaasWorkspaceFlow returns 503 when BFF soft-fails with reason error", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignFlowToSubject: async (subject: { subjectType: string; subjectId: string }) => {
                return {
                    action: "provision",
                    reason: "error",
                    subject,
                };
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-1",
            }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );
    });

    it("AdminAssignItaasWorkspaceFlow returns 503 when BFF soft-fails with reason skipped", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignFlowToSubject: async (subject: { subjectType: string; subjectId: string }) => {
                return {
                    action: "provision",
                    reason: "skipped",
                    subject,
                };
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                subjectType: "organization",
                subjectId: "org-1",
                flowId: "flow-1",
            }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );
    });

    it("AdminRemoveItaasWorkspaceFlow returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminRemoveItaasWorkspaceFlow({
                subjectType: "user",
                subjectId: "user-1",
                flowId: "flow-1",
            }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminRemoveItaasWorkspaceFlow returns sync result for admin", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                expect(subject.subjectType).to.equal("user");
                expect(subject.subjectId).to.equal("user-1");
                expect(flowId).to.equal("flow-1");
                return {
                    action: "provision",
                    reason: "flow_removed",
                    subject,
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasWorkspaceAdmin.AdminRemoveItaasWorkspaceFlow({
                subjectType: "user",
                subjectId: "user-1",
                flowId: "flow-1",
            }),
            testAdmin.auth,
        );

        expect(result.action).to.equal("provision");
        expect(result.reason).to.equal("flow_removed");
    });

    it("AdminRemoveItaasWorkspaceFlow returns 503 when BFF soft-fails with reason error", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }) => {
                return {
                    action: "provision",
                    reason: "error",
                    subject,
                };
            },
        } as any);

        await APITester.TestError(
            ApiItaasWorkspaceAdmin.AdminRemoveItaasWorkspaceFlow({
                subjectType: "user",
                subjectId: "user-1",
                flowId: "flow-1",
            }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );
    });
});
