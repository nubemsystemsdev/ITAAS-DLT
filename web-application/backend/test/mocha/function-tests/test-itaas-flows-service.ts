// Function tests — ItaasFlowsService

"use strict";

import assert from "assert";
import { ItaasFlowSetting } from "../../../src/models/itaas-flow-setting";
import { BffFlowsClient } from "../../../src/services/bff-flows-client";
import { ItaasFlowsService, sanitizeOverrideConfig } from "../../../src/services/itaas-flows-service";
import { KeycloakAccountService } from "../../../src/services/keycloak-account-service";

describe("ItaasFlowsService", () => {
    let originalIsGraphVisible: typeof ItaasFlowSetting.isGraphVisibleToUsers;
    let graphVisibleToUsers: boolean;

    beforeEach(() => {
        graphVisibleToUsers = false;
        originalIsGraphVisible = ItaasFlowSetting.isGraphVisibleToUsers;
        ItaasFlowSetting.isGraphVisibleToUsers = (async () => graphVisibleToUsers) as typeof ItaasFlowSetting.isGraphVisibleToUsers;
    });

    afterEach(() => {
        ItaasFlowSetting.isGraphVisibleToUsers = originalIsGraphVisible;
        ItaasFlowsService.setInstance(null);
        BffFlowsClient.setInstance(null);
        KeycloakAccountService.setInstance(null);
    });

    it("listGlobalFlows throws BFF_UNAVAILABLE when client disabled", async () => {
        BffFlowsClient.setInstance({
            isEnabled: () => false,
        } as any);

        const session = { keycloakRefreshToken: "x" } as any;

        try {
            await ItaasFlowsService.getInstance().listGlobalFlows(session);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_UNAVAILABLE");
        }
    });

    it("listTenantFlows throws KEYCLOAK_TOKEN_UNAVAILABLE on a transient token failure", async () => {
        BffFlowsClient.setInstance({
            isEnabled: () => true,
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "error" }),
        } as any);

        const session = { keycloakRefreshToken: "x" } as any;

        try {
            await ItaasFlowsService.getInstance().listTenantFlows(session);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "KEYCLOAK_TOKEN_UNAVAILABLE");
        }
    });

    it("listTenantFlows throws KEYCLOAK_SESSION_EXPIRED when the Keycloak session is gone", async () => {
        BffFlowsClient.setInstance({
            isEnabled: () => true,
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "expired" }),
        } as any);

        const session = { keycloakRefreshToken: "x" } as any;

        try {
            await ItaasFlowsService.getInstance().listTenantFlows(session);
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "KEYCLOAK_SESSION_EXPIRED");
        }
    });

    it("listGlobalFlows forwards access token with scope=global", async () => {
        let received: { token: string; scope: string } = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            listFlows: async (token: string, scope: string) => {
                received = { token, scope };
                return { workspaceId: "ws-global", flows: [] };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "kc-access-token" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().listGlobalFlows({} as any);

        assert.deepStrictEqual(received, { token: "kc-access-token", scope: "global" });
        assert.strictEqual(result.workspaceId, "ws-global");
        assert.deepStrictEqual(result.flows, []);
    });

    it("listTenantFlows forwards access token with scope=tenant", async () => {
        let received: { token: string; scope: string } = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            listFlows: async (token: string, scope: string) => {
                received = { token, scope };
                return { workspaceId: "ws-1", flows: [] };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "kc-access-token" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().listTenantFlows({} as any);

        assert.deepStrictEqual(received, { token: "kc-access-token", scope: "tenant" });
        assert.strictEqual(result.workspaceId, "ws-1");
        assert.deepStrictEqual(result.flows, []);
    });

    it("runFlow throws INVALID_FLOW_ID when flowId empty", async () => {
        try {
            await ItaasFlowsService.getInstance().runFlow({} as any, "  ", { question: "hi" });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("runFlow throws INVALID_QUESTION when question empty", async () => {
        try {
            await ItaasFlowsService.getInstance().runFlow({} as any, "flow-1", { question: "  " });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_QUESTION");
        }
    });

    it("runFlow allows omitted question", async () => {
        let receivedBody: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            runFlow: async (_token: string, _flowId: string, body: any) => {
                receivedBody = body;
                return { text: "ok", raw: {} };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        await ItaasFlowsService.getInstance().runFlow({} as any, "flow-1", {
            overrideConfig: { vars: { a: 1 } },
        });

        assert.deepStrictEqual(receivedBody, {
            overrideConfig: { vars: { a: 1 } },
        });
    });

    it("getFlow throws INVALID_FLOW_ID when flowId empty", async () => {
        try {
            await ItaasFlowsService.getInstance().getFlow({} as any, "  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("getFlow forwards access token to client", async () => {
        let received: { token: string; flowId: string } = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getFlow: async (token: string, flowId: string) => {
                received = { token, flowId };
                return { id: flowId, name: "Demo", deployed: true, type: "CHATFLOW" };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getFlow({} as any, "flow-1");
        assert.deepStrictEqual(received, { token: "tok", flowId: "flow-1" });
        assert.strictEqual(result.id, "flow-1");
        assert.strictEqual(result.type, "CHATFLOW");
        assert.strictEqual("graph" in result, false);
    });

    it("getFlow maps BFF root nodes and edges and drops node data", async () => {
        graphVisibleToUsers = true;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getFlow: async () => {
                return {
                    id: "flow-1",
                    name: "Demo",
                    deployed: true,
                    nodes: [{
                        id: "agent-1",
                        label: "Start",
                        x: 120.5,
                        y: 80,
                        position: { x: 120.5, y: 80 },
                        data: {
                            name: "agentAgentflow",
                            inputs: { credential: "secret" },
                        },
                    }],
                    edges: [{ id: "edge-1", source: "agent-1", target: "agent-1" }],
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getFlow({} as any, "flow-1");
        assert.deepStrictEqual(result, {
            id: "flow-1",
            name: "Demo",
            deployed: true,
            graph: {
                nodes: [{ id: "agent-1", label: "Start", x: 120.5, y: 80 }],
                edges: [{ id: "edge-1", source: "agent-1", target: "agent-1" }],
            },
        });
        assert.strictEqual("data" in result.graph.nodes[0], false);
        assert.strictEqual("inputs" in result.graph.nodes[0], false);
    });

    it("getFlow maps BFF detail and drops flowData and node inputs", async () => {
        graphVisibleToUsers = true;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getFlow: async () => {
                return {
                    id: "flow-1",
                    name: "Demo",
                    deployed: true,
                    flowData: "{\"nodes\":[]}",
                    graph: {
                        nodes: [{ id: "n1", label: "A", x: 0, y: 0, inputs: { token: "secret" } }],
                        edges: [{ id: "e1", source: "n1", target: "missing" }],
                    },
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getFlow({} as any, "flow-1");
        assert.deepStrictEqual(result, {
            id: "flow-1",
            name: "Demo",
            deployed: true,
            graph: {
                nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
                edges: [],
            },
        });
        assert.strictEqual("flowData" in result, false);
    });

    it("getFlow omits graph when the admin setting is off", async () => {
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getFlow: async () => {
                return {
                    id: "flow-1",
                    name: "Demo",
                    deployed: true,
                    graph: {
                        nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
                        edges: [{ id: "e1", source: "n1", target: "n1" }],
                    },
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getFlow({} as any, "flow-1");
        assert.strictEqual("graph" in result, false);
    });

    it("getFlow keeps sanitized graph when the admin setting is on", async () => {
        graphVisibleToUsers = true;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getFlow: async () => {
                return {
                    id: "flow-1",
                    name: "Demo",
                    deployed: true,
                    graph: {
                        nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
                        edges: [{ id: "e1", source: "n1", target: "n1" }],
                    },
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getFlow({} as any, "flow-1");
        assert.deepStrictEqual(result.graph, {
            nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
            edges: [{ id: "e1", source: "n1", target: "n1" }],
        });
    });

    it("sanitizeOverrideConfig strips sessionId", () => {
        assert.deepStrictEqual(
            sanitizeOverrideConfig({ sessionId: "evil", temperature: 0.2 }),
            { temperature: 0.2 },
        );
        assert.strictEqual(sanitizeOverrideConfig({ sessionId: "evil" }), undefined);
        assert.strictEqual(sanitizeOverrideConfig(undefined), undefined);
    });

    it("runFlow strips reserved overrideConfig keys before forwarding", async () => {
        let receivedBody: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            runFlow: async (_token: string, _flowId: string, body: any) => {
                receivedBody = body;
                return { text: "ok", raw: {} };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        await ItaasFlowsService.getInstance().runFlow({} as any, "flow-1", {
            question: "hi",
            overrideConfig: { sessionId: "attacker", vars: { a: 1 } },
        });

        assert.deepStrictEqual(receivedBody, {
            question: "hi",
            overrideConfig: { vars: { a: 1 } },
        });
    });

    it("getCredentials throws INVALID_FLOW_ID when flowId empty", async () => {
        try {
            await ItaasFlowsService.getInstance().getCredentials({} as any, "  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_FLOW_ID");
        }
    });

    it("getCredentials forwards access token to client", async () => {
        let received: { token: string; flowId: string } = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            getCredentials: async (token: string, flowId: string) => {
                received = { token, flowId };
                return { flowId, requirements: [] };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().getCredentials({} as any, "flow-1");
        assert.deepStrictEqual(received, { token: "tok", flowId: "flow-1" });
        assert.strictEqual(result.flowId, "flow-1");
    });

    it("disconnectCredential validates both IDs", async () => {
        await assert.rejects(
            ItaasFlowsService.getInstance().disconnectCredential({} as any, " ", "cred-1"),
            { message: "INVALID_FLOW_ID" },
        );
        await assert.rejects(
            ItaasFlowsService.getInstance().disconnectCredential({} as any, "flow-1", " "),
            { message: "INVALID_CREDENTIAL_ID" },
        );
    });

    it("disconnectCredential forwards the access token and IDs to the BFF", async () => {
        let received: { token: string; flowId: string; credentialId: string } | null = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            disconnectCredential: async (token: string, flowId: string, credentialId: string) => {
                received = { token, flowId, credentialId };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        await ItaasFlowsService.getInstance().disconnectCredential({} as any, " flow-1 ", " cred-1 ");
        assert.deepStrictEqual(received, { token: "tok", flowId: "flow-1", credentialId: "cred-1" });
    });

    it("storeCredentials throws INVALID_CREDENTIAL_BODY when shape invalid", async () => {
        try {
            await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
                credentialType: "openAI",
            });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_CREDENTIAL_BODY");
        }
    });

    it("storeCredentials rename-only sends only name, never the unchanged sentinel", async () => {
        let received: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            updateCredential: async (_token: string, credentialId: string, body: any) => {
                received = { credentialId, body };
                return { credentialId, updated: true };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
            credentialType: "openAI",
            credentialId: "cred-1",
            name: "Renamed",
            data: { openAIApiKey: "unchanged" },
        });

        assert.strictEqual(received.credentialId, "cred-1");
        assert.strictEqual(received.body.name, "Renamed");
        assert.strictEqual(received.body.data, undefined);
    });

    it("storeCredentials update strips unchanged sentinels from data", async () => {
        let received: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            updateCredential: async (_token: string, credentialId: string, body: any) => {
                received = { credentialId, body };
                return { credentialId, updated: true };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
            credentialType: "openAI",
            credentialId: "cred-1",
            name: "My key",
            data: { apiKey: "secret", other: "unchanged", blank: "   " },
        });

        assert.deepStrictEqual(received.body.data, { apiKey: "secret" });
    });

    it("storeCredentials throws INVALID_CREDENTIAL_BODY when update has no effective fields", async () => {
        try {
            await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
                credentialType: "openAI",
                credentialId: "cred-1",
                data: { apiKey: "unchanged" },
            });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_CREDENTIAL_BODY");
        }
    });

    it("storeCredentials throws INVALID_CREDENTIAL_BODY when create missing data", async () => {
        try {
            await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
                credentialType: "openAI",
                name: "My key",
            });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_CREDENTIAL_BODY");
        }
    });

    it("storeCredentials accepts reuse mode", async () => {
        let received: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            storeCredentials: async (_token: string, flowId: string, body: any) => {
                received = { flowId, body };
                return { credentialId: body.credentialId, assigned: true, reused: true, nodeIds: ["n1"] };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
            credentialType: "openAI",
            credentialId: "cred-1",
        });

        assert.strictEqual(received.flowId, "flow-1");
        assert.strictEqual(result.reused, true);
        assert.strictEqual(result.credentialId, "cred-1");
    });

    it("storeCredentials update mode overwrites via updateCredential (PUT)", async () => {
        let received: any = null;
        let storeCalled = false;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            storeCredentials: async () => {
                storeCalled = true;
                return { credentialId: "x", assigned: true, reused: false, nodeIds: [] };
            },
            updateCredential: async (_token: string, credentialId: string, body: any) => {
                received = { credentialId, body };
                return { credentialId, updated: true };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().storeCredentials({} as any, "flow-1", {
            credentialType: "openAI",
            credentialId: "cred-1",
            name: "My key",
            data: { apiKey: "secret" },
        });

        assert.strictEqual(storeCalled, false, "update must not hit the store endpoint");
        assert.strictEqual(received.credentialId, "cred-1");
        assert.strictEqual(received.body.name, "My key");
        assert.deepStrictEqual(received.body.data, { apiKey: "secret" });
        assert.strictEqual(result.credentialId, "cred-1");
        assert.strictEqual(result.assigned, true);
        assert.strictEqual(result.reused, true);
    });

    it("createCredential throws INVALID_CREDENTIAL_BODY when name is empty", async () => {
        try {
            await ItaasFlowsService.getInstance().createCredential({} as any, {
                credentialType: "openAIApi",
                name: "   ",
                data: { openAIApiKey: "sk-secret" },
            });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_CREDENTIAL_BODY");
        }
    });

    it("createCredential throws INVALID_CREDENTIAL_BODY when data has no secrets", async () => {
        try {
            await ItaasFlowsService.getInstance().createCredential({} as any, {
                credentialType: "openAIApi",
                name: "OpenAI producción",
                data: {},
            });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "INVALID_CREDENTIAL_BODY");
        }
    });

    it("createCredential POSTs to BFF without a flow id", async () => {
        let received: any = null;
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            createCredential: async (_token: string, body: any) => {
                received = body;
                return {
                    credentialId: "cred-new",
                    credentialType: body.credentialType,
                    name: body.name,
                    assigned: false,
                };
            },
            storeCredentials: async () => {
                assert.fail("create must not hit the flow store endpoint");
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().createCredential({} as any, {
            credentialType: "openAIApi",
            name: "OpenAI producción",
            data: { openAIApiKey: "sk-secret", blank: "   " },
        });

        assert.strictEqual(received.credentialType, "openAIApi");
        assert.strictEqual(received.name, "OpenAI producción");
        assert.deepStrictEqual(received.data, { openAIApiKey: "sk-secret" });
        assert.strictEqual(result.credentialId, "cred-new");
        assert.strictEqual(result.assigned, false);
    });

    it("listWorkspaceCredentials merges tenant and global flow credentials without N+1 from caller", async () => {
        const credentialCalls: string[] = [];
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            listFlows: async (_token: string, scope: string) => {
                assert.strictEqual(scope, "all");
                return {
                    workspaceId: "ws-1",
                    flows: [
                        { id: "tenant-flow", name: "Tenant", deployed: true },
                        { id: "global-flow", name: "Global", deployed: true },
                    ],
                };
            },
            getCredentials: async (_token: string, flowId: string) => {
                credentialCalls.push(flowId);
                if (flowId === "tenant-flow") {
                    return {
                        flowId,
                        requirements: [{
                            credentialType: "openAI",
                            label: "OpenAI",
                            fields: [{ name: "openAIApiKey", label: "API Key", type: "password" }],
                            assigned: true,
                            credentialId: "cred-1",
                            nodeIds: ["n1"],
                            available: [{ id: "cred-1", name: "My OpenAI" }],
                        }],
                    };
                }
                return {
                    flowId,
                    requirements: [{
                        credentialType: "openAI",
                        label: "OpenAI",
                        fields: [{ name: "openAIApiKey", label: "API Key", type: "password" }],
                        assigned: false,
                        credentialId: null,
                        nodeIds: ["n2"],
                        available: [{ id: "cred-1", name: "My OpenAI" }, { id: "cred-2", name: "Global key" }],
                    }],
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().listWorkspaceCredentials({} as any);

        assert.deepStrictEqual(credentialCalls.sort(), ["global-flow", "tenant-flow"]);
        assert.strictEqual(result.workspaceId, "ws-1");
        assert.strictEqual(result.flows.length, 2);
        assert.strictEqual(result.credentials.length, 2);
        const named = result.credentials.find((item) => item.id === "cred-1");
        assert.strictEqual(named && named.name, "My OpenAI");
        assert.deepStrictEqual(named && named.assignedFlowIds, ["tenant-flow"]);
        const extra = result.credentials.find((item) => item.id === "cred-2");
        assert.strictEqual(extra && extra.name, "Global key");
        assert.deepStrictEqual(extra && extra.assignedFlowIds, []);
    });

    it("listWorkspaceCredentials blocks conflicting credential fields without treating field order as a conflict", async () => {
        const firstFields = [
            { name: "apiKey", label: "API key", type: "password" },
            { name: "organization", label: "Organization", type: "string" },
        ];
        let secondFields = firstFields.slice().reverse();
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            listFlows: async () => ({
                workspaceId: "ws-1",
                flows: [
                    { id: "flow-1", name: "First", deployed: true },
                    { id: "flow-2", name: "Second", deployed: true },
                ],
            }),
            getCredentials: async (_token: string, flowId: string) => ({
                flowId,
                requirements: [{
                    credentialType: "openAI",
                    label: "OpenAI",
                    fields: flowId === "flow-1" ? firstFields : secondFields,
                    assigned: false,
                    credentialId: null,
                    nodeIds: [],
                    available: [{ id: "cred-1", name: "Saved key" }],
                }],
            }),
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const consistent = await ItaasFlowsService.getInstance().listWorkspaceCredentials({} as any);
        assert.strictEqual(consistent.credentialTypes[0].schemaConflict, false);
        assert.strictEqual(consistent.credentialTypes[0].fields.length, 2);

        secondFields = [{ name: "differentKey", label: "Other key", type: "password" }];
        const conflicting = await ItaasFlowsService.getInstance().listWorkspaceCredentials({} as any);
        assert.strictEqual(conflicting.credentialTypes[0].schemaConflict, true);
        assert.deepStrictEqual(conflicting.credentialTypes[0].fields, []);
        assert.deepStrictEqual(conflicting.credentials[0].fields, []);
    });

    it("listWorkspaceCredentials skips FLOW_NOT_FOUND for individual flows", async () => {
        BffFlowsClient.setInstance({
            isEnabled: () => true,
            listFlows: async () => ({
                workspaceId: "ws-1",
                flows: [
                    { id: "missing", name: "Gone", deployed: false },
                    { id: "ok", name: "Ok", deployed: true },
                ],
            }),
            getCredentials: async (_token: string, flowId: string) => {
                if (flowId === "missing") {
                    throw new Error("FLOW_NOT_FOUND");
                }
                return {
                    flowId,
                    requirements: [{
                        credentialType: "openAI",
                        label: "OpenAI",
                        fields: [{ name: "openAIApiKey", label: "API Key", type: "password" }],
                        assigned: false,
                        credentialId: null,
                        nodeIds: [],
                        available: [{ id: "cred-ok", name: "Kept" }],
                    }],
                };
            },
        } as any);
        KeycloakAccountService.setInstance({
            getAccessTokenResultForSession: async () => ({ status: "ok", token: "tok" }),
        } as any);

        const result = await ItaasFlowsService.getInstance().listWorkspaceCredentials({} as any);
        assert.strictEqual(result.credentials.length, 1);
        assert.strictEqual(result.credentials[0].id, "cred-ok");
    });
});
