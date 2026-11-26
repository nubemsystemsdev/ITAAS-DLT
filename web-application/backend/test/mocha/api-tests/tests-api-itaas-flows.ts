// API tests — ITAAS flows proxy

"use strict";

import { expect } from "chai";
import { Request } from "@asanrom/request-axios";
import { APITester } from "../test-tools/api-tester";
import { APIAuthentication } from "../test-tools/authentication";
import { ApiItaasFlows } from "../test-tools/api-bindings/api-group-itaas-flows";
import { PreparedUser, TestUsers } from "../test-tools/models/users";
import { ItaasFlowsService } from "../../../src/services/itaas-flows-service";
import { ItaasPlatformService } from "../../../src/services/itaas-platform-service";
import { createItaasServiceError } from "../../../src/utils/itaas-bff-error";

describe("API / ITAAS Flows", () => {
    let testUser: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        testUser = await TestUsers.NewRegularUser();
    });

    afterEach(() => {
        ItaasPlatformService.setInstance(null);
        ItaasFlowsService.setInstance(null);
    });

    function grantItaasAccess(): void {
        ItaasPlatformService.setInstance({
            assertItaasAccess: async () => ({ organizationId: "org-test" }),
        } as any);
    }

    it("ListItaasFlows returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.ListItaasFlows(),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("ListItaasWorkspaceCredentials returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.ListItaasWorkspaceCredentials(),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("ListItaasGlobalFlows returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.ListItaasGlobalFlows(),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("ListItaasTenantFlows returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.ListItaasTenantFlows(),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("RunItaasFlow returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: "hi" }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("GetItaasFlowCredentials returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.GetItaasFlowCredentials("flow-1"),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("DisconnectItaasFlowCredential returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.DisconnectItaasFlowCredential("flow-1", "cred-1"),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("GetItaasFlow returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.GetItaasFlow("flow-1"),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("StoreItaasFlowCredentials returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.StoreItaasFlowCredentials("flow-1", {
                credentialType: "openAI",
                credentialId: "cred-1",
            }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("CreateItaasWorkspaceCredential returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasFlows.CreateItaasWorkspaceCredential({
                credentialType: "openAIApi",
                name: "OpenAI producción",
                data: { openAIApiKey: "sk-secret" },
            }),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("ListItaasTenantFlows returns 403 ITAAS_ACCESS_REQUIRED without license", async () => {
        await APITester.TestError(
            ApiItaasFlows.ListItaasTenantFlows(),
            testUser.auth,
            403,
            "ITAAS_ACCESS_REQUIRED",
        );
    });

    it("ListItaasGlobalFlows returns flows when access and service succeed", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listGlobalFlows: async () => ({
                workspaceId: "ws-global",
                flows: [{ id: "g1", name: "Public Demo", deployed: true, updatedAt: "2026-01-01" }],
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.ListItaasGlobalFlows(), testUser.auth);
        expect(result.workspaceId).to.equal("ws-global");
        expect(result.flows).to.have.length(1);
        expect(result.flows[0].id).to.equal("g1");
        expect(result.flows[0].name).to.equal("Public Demo");
        expect(result.flows[0].deployed).to.equal(true);
    });

    it("ListItaasTenantFlows returns flows when access and service succeed", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listTenantFlows: async () => ({
                workspaceId: "ws-1",
                flows: [{ id: "f1", name: "Demo", deployed: true, updatedAt: "2026-01-01" }],
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.ListItaasTenantFlows(), testUser.auth);
        expect(result.workspaceId).to.equal("ws-1");
        expect(result.flows).to.have.length(1);
        expect(result.flows[0].id).to.equal("f1");
        expect(result.flows[0].name).to.equal("Demo");
        expect(result.flows[0].deployed).to.equal(true);
    });

    it("ListItaasFlows returns tenant and global flows when access and service succeed", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listAllFlows: async () => ({
                workspaceId: "ws-1",
                flows: [
                    { id: "f1", name: "Tenant", deployed: true },
                    { id: "g1", name: "Global", deployed: true },
                ],
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.ListItaasFlows(), testUser.auth);
        expect(result.workspaceId).to.equal("ws-1");
        expect(result.flows).to.have.length(2);
        expect(result.flows[0].id).to.equal("f1");
        expect(result.flows[1].id).to.equal("g1");
    });

    it("ListItaasWorkspaceCredentials returns catalog when access and service succeed", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listWorkspaceCredentials: async () => ({
                workspaceId: "ws-1",
                flows: [{ id: "f1", name: "Tenant", deployed: true }],
                credentials: [{
                    id: "cred-1",
                    name: "My OpenAI",
                    credentialType: "openAI",
                    label: "OpenAI",
                    fields: [{ name: "openAIApiKey", label: "API Key", type: "password" }],
                    hostFlowId: "f1",
                    assignedFlowIds: ["f1"],
                }],
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.ListItaasWorkspaceCredentials(), testUser.auth);
        expect(result.workspaceId).to.equal("ws-1");
        expect(result.flows).to.have.length(1);
        expect(result.credentials).to.have.length(1);
        expect(result.credentials[0].id).to.equal("cred-1");
        expect(result.credentials[0].name).to.equal("My OpenAI");
    });

    it("CreateItaasWorkspaceCredential returns created unassigned credential", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            createCredential: async (
                _session: unknown,
                body: { credentialType: string; name: string; data?: Record<string, unknown> },
            ) => {
                expect(body.credentialType).to.equal("openAIApi");
                expect(body.name).to.equal("OpenAI producción");
                expect(body.data).to.deep.equal({ openAIApiKey: "sk-secret" });
                return {
                    credentialId: "cred-new",
                    credentialType: "openAIApi",
                    name: "OpenAI producción",
                    assigned: false,
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.CreateItaasWorkspaceCredential({
                credentialType: "openAIApi",
                name: "OpenAI producción",
                data: { openAIApiKey: "sk-secret" },
            }),
            testUser.auth,
        );
        expect(result.credentialId).to.equal("cred-new");
        expect(result.credentialType).to.equal("openAIApi");
        expect(result.name).to.equal("OpenAI producción");
        expect(result.assigned).to.equal(false);
    });

    it("CreateItaasWorkspaceCredential returns 400 INVALID_CREDENTIAL_BODY", async () => {
        grantItaasAccess();
        await APITester.TestError(
            ApiItaasFlows.CreateItaasWorkspaceCredential({
                credentialType: "openAIApi",
                name: "",
                data: {},
            }),
            testUser.auth,
            400,
            "INVALID_CREDENTIAL_BODY",
        );
    });

    it("RunItaasFlow returns run result", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            runFlow: async (_session: unknown, flowId: string, body: { question: string }) => {
                expect(flowId).to.equal("flow-1");
                expect(body.question).to.equal("hello");
                return { text: "answer", json: { a: 1 }, raw: { text: "answer" } };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: "hello" }),
            testUser.auth,
        );
        expect(result.text).to.equal("answer");
        expect(result.json).to.deep.equal({ a: 1 });
    });

    it("RunItaasFlow accepts empty body without question", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            runFlow: async (_session: unknown, flowId: string, body: { question?: string }) => {
                expect(flowId).to.equal("flow-1");
                expect(body.question).to.equal(undefined);
                return { text: "ok", raw: {} };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.RunItaasFlow("flow-1", {}),
            testUser.auth,
        );
        expect(result.text).to.equal("ok");
    });

    it("GetItaasFlow returns flow detail", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getFlow: async (_session: unknown, flowId: string) => ({
                id: flowId,
                name: "Demo",
                deployed: true,
                type: "CHATFLOW",
                category: "demo",
                createdAt: "2026-01-01T00:00:00.000Z",
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.GetItaasFlow("flow-1"), testUser.auth);
        expect(result.id).to.equal("flow-1");
        expect(result.name).to.equal("Demo");
        expect(result.deployed).to.equal(true);
        expect(result.type).to.equal("CHATFLOW");
        expect(result.category).to.equal("demo");
    });

    it("GetItaasFlow returns sanitized graph when present", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getFlow: async (_session: unknown, flowId: string) => ({
                id: flowId,
                name: "Demo",
                deployed: true,
                graph: {
                    nodes: [{ id: "n1", label: "Start", x: 10, y: 20 }],
                    edges: [{ id: "e1", source: "n1", target: "n1" }],
                },
            }),
        } as any);

        const result = await APITester.Test(ApiItaasFlows.GetItaasFlow("flow-1"), testUser.auth);
        expect(result.graph).to.deep.equal({
            nodes: [{ id: "n1", label: "Start", x: 10, y: 20 }],
            edges: [{ id: "e1", source: "n1", target: "n1" }],
        });
        expect(result).to.not.have.property("flowData");
    });

    it("GetItaasFlow maps FLOW_NOT_FOUND to 404", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getFlow: async () => {
                throw new Error("FLOW_NOT_FOUND");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.GetItaasFlow("missing"),
            testUser.auth,
            404,
            "FLOW_NOT_FOUND",
        );
    });

    it("RunItaasFlow returns 400 INVALID_QUESTION for empty question", async () => {
        grantItaasAccess();
        await APITester.TestError(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: "   " }),
            testUser.auth,
            400,
            "INVALID_QUESTION",
        );
    });

    it("RunItaasFlow returns 400 INVALID_QUESTION for non-string question", async () => {
        grantItaasAccess();
        await APITester.TestError(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: 42 } as any),
            testUser.auth,
            400,
            "INVALID_QUESTION",
        );
    });

    it("GetItaasFlowCredentials returns requirements", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getCredentials: async (_session: unknown, flowId: string) => ({
                flowId,
                requirements: [{
                    credentialType: "openAI",
                    label: "OpenAI",
                    fields: [{ name: "apiKey", label: "API Key", type: "password" }],
                    assigned: false,
                    credentialId: null,
                    nodeIds: ["n1"],
                    available: [],
                }],
            }),
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.GetItaasFlowCredentials("flow-1"),
            testUser.auth,
        );
        expect(result.flowId).to.equal("flow-1");
        expect(result.requirements).to.have.length(1);
        expect(result.requirements[0].credentialType).to.equal("openAI");
    });

    it("StoreItaasFlowCredentials returns stored credential result", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            storeCredentials: async (
                _session: unknown,
                flowId: string,
                body: { credentialType: string; credentialId?: string },
            ) => {
                expect(flowId).to.equal("flow-1");
                expect(body.credentialType).to.equal("openAI");
                expect(body.credentialId).to.equal("cred-1");
                return {
                    credentialId: "cred-1",
                    assigned: true,
                    reused: true,
                    nodeIds: ["n1"],
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.StoreItaasFlowCredentials("flow-1", {
                credentialType: "openAI",
                credentialId: "cred-1",
            }),
            testUser.auth,
        );
        expect(result.credentialId).to.equal("cred-1");
        expect(result.reused).to.equal(true);
        expect(result.assigned).to.equal(true);
        expect(result.nodeIds).to.deep.equal(["n1"]);
    });

    it("DisconnectItaasFlowCredential disconnects the requested credential", async () => {
        grantItaasAccess();
        let received: { flowId: string; credentialId: string } | null = null;
        ItaasFlowsService.setInstance({
            disconnectCredential: async (_session: unknown, flowId: string, credentialId: string) => {
                received = { flowId, credentialId };
            },
        } as any);

        await APITester.Test(
            ApiItaasFlows.DisconnectItaasFlowCredential("flow-1", "cred-1"),
            testUser.auth,
        );
        expect(received).to.deep.equal({ flowId: "flow-1", credentialId: "cred-1" });
    });

    it("StoreItaasFlowCredentials returns 400 INVALID_CREDENTIAL_BODY", async () => {
        grantItaasAccess();
        await APITester.TestError(
            ApiItaasFlows.StoreItaasFlowCredentials("flow-1", {
                credentialType: "openAI",
            } as any),
            testUser.auth,
            400,
            "INVALID_CREDENTIAL_BODY",
        );
    });

    it("StoreItaasFlowCredentials accepts overwrite (update) payload", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            storeCredentials: async (
                _session: unknown,
                flowId: string,
                body: {
                    credentialType: string;
                    credentialId?: string;
                    name?: string;
                    data?: Record<string, unknown>;
                },
            ) => {
                expect(flowId).to.equal("flow-1");
                expect(body.credentialType).to.equal("openAI");
                expect(body.credentialId).to.equal("cred-1");
                expect(body.name).to.equal("Renamed");
                expect(body.data).to.deep.equal({ apiKey: "new-secret" });
                return {
                    credentialId: "cred-1",
                    assigned: true,
                    reused: true,
                    nodeIds: [],
                };
            },
        } as any);

        const result = await APITester.Test(
            ApiItaasFlows.StoreItaasFlowCredentials("flow-1", {
                credentialType: "openAI",
                credentialId: "cred-1",
                name: "Renamed",
                data: { apiKey: "new-secret" },
            }),
            testUser.auth,
        );
        expect(result.credentialId).to.equal("cred-1");
        expect(result.reused).to.equal(true);
        expect(result.assigned).to.equal(true);
    });

    it("ListItaasFlows maps KEYCLOAK_TOKEN_UNAVAILABLE to 403", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listTenantFlows: async () => {
                throw new Error("KEYCLOAK_TOKEN_UNAVAILABLE");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.ListItaasTenantFlows(),
            testUser.auth,
            403,
            "KEYCLOAK_TOKEN_UNAVAILABLE",
        );
    });

    it("ListItaasFlows maps KEYCLOAK_SESSION_EXPIRED to 403", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listTenantFlows: async () => {
                throw new Error("KEYCLOAK_SESSION_EXPIRED");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.ListItaasTenantFlows(),
            testUser.auth,
            403,
            "KEYCLOAK_SESSION_EXPIRED",
        );
    });

    it("GetItaasFlowCredentials maps FLOW_NOT_FOUND to 404", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getCredentials: async () => {
                throw new Error("FLOW_NOT_FOUND");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.GetItaasFlowCredentials("missing"),
            testUser.auth,
            404,
            "FLOW_NOT_FOUND",
        );
    });

    it("RunItaasFlow maps FLOW_NOT_DEPLOYED to 409", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            runFlow: async () => {
                throw new Error("FLOW_NOT_DEPLOYED");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: "hi" }),
            testUser.auth,
            409,
            "FLOW_NOT_DEPLOYED",
        );
    });

    it("RunItaasFlow maps BFF_BAD_GATEWAY to 502", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            runFlow: async () => {
                throw new Error("BFF_BAD_GATEWAY");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.RunItaasFlow("flow-1", { question: "hi" }),
            testUser.auth,
            502,
            "BFF_BAD_GATEWAY",
        );
    });

    const runFlowTypedErrors: Array<{ code: string; status: number }> = [
        { code: "FLOW_INVALID", status: 400 },
        { code: "CREDENTIAL_MISSING", status: 400 },
        { code: "CREDENTIAL_UNRESOLVED", status: 400 },
        { code: "CREDENTIAL_INVALID", status: 400 },
        { code: "EXECUTION_FAILED", status: 422 },
        { code: "LLM_RATE_LIMITED", status: 429 },
        { code: "LLM_UNAVAILABLE", status: 503 },
        { code: "UPSTREAM_UNREACHABLE", status: 502 },
        { code: "UPSTREAM_UNAUTHORIZED", status: 502 },
        { code: "IDENTITY_RESOLVER_UNAVAILABLE", status: 502 },
        { code: "UPSTREAM_TIMEOUT", status: 504 },
    ];

    for (const row of runFlowTypedErrors) {
        it("RunItaasFlow maps " + row.code + " to " + row.status, async () => {
            grantItaasAccess();
            ItaasFlowsService.setInstance({
                runFlow: async () => {
                    throw new Error(row.code);
                },
            } as any);

            await APITester.TestError(
                ApiItaasFlows.RunItaasFlow("flow-1", { question: "hi" }),
                testUser.auth,
                row.status,
                row.code,
            );
        });
    }

    it("RunItaasFlow reexpone nodeId and credentialId in error details", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            runFlow: async () => {
                throw createItaasServiceError("CREDENTIAL_INVALID", {
                    nodeId: "llm-gemini<script>",
                    credentialId: "cred-gemini",
                });
            },
        } as any);

        const payload = await new Promise<{ code?: string; details?: { nodeId?: string; credentialId?: string } }>((resolve, reject) => {
            const apiDefinition = testUser.auth.applyToRequestParams(ApiItaasFlows.RunItaasFlow("flow-1", { question: "hi" }));
            Request.Do(apiDefinition)
                .onSuccess(() => {
                    reject(new Error("Request ended with 200 OK, but was expected to fail"));
                })
                .onRequestError((err) => {
                    try {
                        const body = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
                        resolve(body || {});
                    } catch (ex) {
                        reject(ex);
                    }
                })
                .onUnexpectedError(reject);
        });

        expect(payload.code).to.equal("CREDENTIAL_INVALID");
        expect(payload.details).to.deep.equal({ nodeId: "llm-geminiscript", credentialId: "cred-gemini" });
    });

    it("GetItaasFlow maps FLOW_INVALID to 400", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            getFlow: async () => {
                throw new Error("FLOW_INVALID");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.GetItaasFlow("flow-1"),
            testUser.auth,
            400,
            "FLOW_INVALID",
        );
    });

    it("ListItaasGlobalFlows maps BFF_UNAVAILABLE to 503", async () => {
        grantItaasAccess();
        ItaasFlowsService.setInstance({
            listGlobalFlows: async () => {
                throw new Error("BFF_UNAVAILABLE");
            },
        } as any);

        await APITester.TestError(
            ApiItaasFlows.ListItaasGlobalFlows(),
            testUser.auth,
            503,
            "BFF_UNAVAILABLE",
        );
    });
});
