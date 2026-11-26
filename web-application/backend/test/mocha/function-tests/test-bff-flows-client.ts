// Function tests — BffFlowsClient

"use strict";

import assert from "assert";
import HTTP from "http";
import { AddressInfo } from "net";
import { BffFlowsConfig } from "../../../src/config/config-bff-flows";
import { BffFlowsClient } from "../../../src/services/bff-flows-client";

describe("BffFlowsClient", () => {
    const previousBaseUrl = process.env.BFF_BASE_URL;
    const previousTimeout = process.env.BFF_FLOWS_TIMEOUT_MS;
    const previousMaxResponse = process.env.BFF_FLOWS_MAX_RESPONSE_BYTES;

    afterEach(() => {
        BffFlowsClient.setInstance(null);
        BffFlowsConfig.setInstance(null);

        if (previousBaseUrl === undefined) {
            delete process.env.BFF_BASE_URL;
        } else {
            process.env.BFF_BASE_URL = previousBaseUrl;
        }

        if (previousTimeout === undefined) {
            delete process.env.BFF_FLOWS_TIMEOUT_MS;
        } else {
            process.env.BFF_FLOWS_TIMEOUT_MS = previousTimeout;
        }

        if (previousMaxResponse === undefined) {
            delete process.env.BFF_FLOWS_MAX_RESPONSE_BYTES;
        } else {
            process.env.BFF_FLOWS_MAX_RESPONSE_BYTES = previousMaxResponse;
        }
    });

    it("isEnabled is false when url missing", () => {
        delete process.env.BFF_BASE_URL;
        BffFlowsConfig.setInstance(null);
        assert.strictEqual(BffFlowsClient.getInstance().isEnabled(), false);
    });

    it("isEnabled is true when url set", () => {
        process.env.BFF_BASE_URL = "http://127.0.0.1:4000";
        BffFlowsConfig.setInstance(null);
        assert.strictEqual(BffFlowsClient.getInstance().isEnabled(), true);
    });

    it("isEnabled strips trailing slash from baseUrl", () => {
        process.env.BFF_BASE_URL = "http://127.0.0.1:4000/";
        BffFlowsConfig.setInstance(null);
        const config = BffFlowsConfig.getInstance();
        assert.strictEqual(config.baseUrl, "http://127.0.0.1:4000");
        assert.strictEqual(config.isEnabled(), true);
    });

    it("maxResponseBytes defaults to 32 MiB", () => {
        delete process.env.BFF_FLOWS_MAX_RESPONSE_BYTES;
        BffFlowsConfig.setInstance(null);
        assert.strictEqual(BffFlowsConfig.getInstance().maxResponseBytes, 32 * 1024 * 1024);
    });

    it("maxResponseBytes respects env override", () => {
        process.env.BFF_FLOWS_MAX_RESPONSE_BYTES = "1048576";
        BffFlowsConfig.setInstance(null);
        assert.strictEqual(BffFlowsConfig.getInstance().maxResponseBytes, 1048576);
    });

    it("maxResponseBytes falls back when env is invalid", () => {
        process.env.BFF_FLOWS_MAX_RESPONSE_BYTES = "0";
        BffFlowsConfig.setInstance(null);
        assert.strictEqual(BffFlowsConfig.getInstance().maxResponseBytes, 32 * 1024 * 1024);
    });
});

describe("BffFlowsClient HTTP", () => {
    let server: HTTP.Server;
    let baseUrl: string;
    let handler: (req: HTTP.IncomingMessage, res: HTTP.ServerResponse, body: string) => void;

    before(async () => {
        await new Promise<void>((resolve) => {
            server = HTTP.createServer((req, res) => {
                let body = "";
                req.on("data", (chunk) => {
                    body += chunk;
                });
                req.on("end", () => {
                    handler(req, res, body);
                });
            });
            server.listen(0, "127.0.0.1", () => {
                const port = (server.address() as AddressInfo).port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) {
            server.close();
        }
    });

    afterEach(() => {
        BffFlowsClient.setInstance(null);
        BffFlowsConfig.setInstance(null);
    });

    function useConfig(overrides?: Partial<{ maxResponseBytes: number; timeoutMs: number }>): void {
        const config = new BffFlowsConfig();
        config.baseUrl = baseUrl;
        config.timeoutMs = overrides?.timeoutMs ?? 5000;
        config.maxResponseBytes = overrides?.maxResponseBytes ?? 32 * 1024 * 1024;
        BffFlowsConfig.setInstance(config);
        BffFlowsClient.setInstance(null);
    }

    it("listFlows GETs /api/flows?scope=tenant with Bearer and parses JSON", async () => {
        useConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers.authorization || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/api/flows?scope=tenant");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                workspaceId: "ws-1",
                flows: [{ id: "f1", name: "Demo", deployed: true }],
            }));
        };

        const result = await BffFlowsClient.getInstance().listFlows("access-token", "tenant");
        assert.strictEqual(seenAuth, "Bearer access-token");
        assert.strictEqual(result.workspaceId, "ws-1");
        assert.strictEqual(result.flows.length, 1);
        assert.strictEqual(result.flows[0].id, "f1");
    });

    it("listFlows GETs /api/flows?scope=all with Bearer", async () => {
        useConfig();
        handler = (req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/api/flows?scope=all");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                workspaceId: "ws-all",
                flows: [{ id: "a1", name: "Any", deployed: true }],
            }));
        };

        const result = await BffFlowsClient.getInstance().listFlows("access-token", "all");
        assert.strictEqual(result.workspaceId, "ws-all");
        assert.strictEqual(result.flows[0].id, "a1");
    });

    it("listFlows GETs /api/flows?scope=global with Bearer", async () => {
        useConfig();
        handler = (req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/api/flows?scope=global");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                workspaceId: "ws-global",
                flows: [{ id: "g1", name: "Public", deployed: true }],
            }));
        };

        const result = await BffFlowsClient.getInstance().listFlows("access-token", "global");
        assert.strictEqual(result.workspaceId, "ws-global");
        assert.strictEqual(result.flows[0].id, "g1");
    });

    it("getFlow GETs /api/flows/:id with Bearer", async () => {
        useConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers.authorization || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/api/flows/flow-1");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-1",
                name: "Demo",
                deployed: true,
                type: "CHATFLOW",
                category: "demo",
                createdAt: "2026-01-01T00:00:00.000Z",
            }));
        };

        const result = await BffFlowsClient.getInstance().getFlow("tok", "flow-1");
        assert.strictEqual(seenAuth, "Bearer tok");
        assert.strictEqual(result.id, "flow-1");
        assert.strictEqual(result.type, "CHATFLOW");
        assert.strictEqual(result.category, "demo");
    });

    it("runFlow POSTs body and returns result", async () => {
        useConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/api/flows/flow%2F1/run");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ text: "hello", raw: { ok: true } }));
        };

        const result = await BffFlowsClient.getInstance().runFlow("tok", "flow/1", {
            question: "hi",
            overrideConfig: { temperature: 0.1 },
        });
        assert.deepStrictEqual(JSON.parse(seenBody), {
            question: "hi",
            overrideConfig: { temperature: 0.1 },
        });
        assert.strictEqual(result.text, "hello");
    });

    it("runFlow allows body without question", async () => {
        useConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ text: "ok", raw: {} }));
        };

        await BffFlowsClient.getInstance().runFlow("tok", "flow-1", { overrideConfig: { a: 1 } });
        assert.deepStrictEqual(JSON.parse(seenBody), { overrideConfig: { a: 1 } });
    });

    it("getCredentials GETs credentials path", async () => {
        useConfig();
        handler = (req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/api/flows/flow-1/credentials");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                flowId: "flow-1",
                requirements: [],
            }));
        };

        const result = await BffFlowsClient.getInstance().getCredentials("tok", "flow-1");
        assert.strictEqual(result.flowId, "flow-1");
        assert.deepStrictEqual(result.requirements, []);
    });

    it("storeCredentials POSTs and accepts 201", async () => {
        useConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/api/flows/flow-1/credentials");
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                credentialId: "cred-1",
                assigned: true,
                reused: false,
                nodeIds: ["n1"],
            }));
        };

        const result = await BffFlowsClient.getInstance().storeCredentials("tok", "flow-1", {
            credentialType: "openAI",
            name: "My key",
            data: { apiKey: "secret" },
        });
        assert.strictEqual(JSON.parse(seenBody).credentialType, "openAI");
        assert.strictEqual(result.credentialId, "cred-1");
        assert.strictEqual(result.assigned, true);
    });

    it("disconnectCredential DELETEs the flow assignment and accepts an empty 204", async () => {
        useConfig();
        handler = (req, res, body) => {
            assert.strictEqual(req.method, "DELETE");
            assert.strictEqual(req.url, "/api/flows/flow%2F1/credentials/cred%2F1");
            assert.strictEqual(req.headers.authorization, "Bearer tok");
            assert.strictEqual(body, "");
            res.writeHead(204);
            res.end();
        };

        await BffFlowsClient.getInstance().disconnectCredential("tok", "flow/1", "cred/1");
    });

    it("disconnectCredential maps a missing credential to CREDENTIAL_NOT_FOUND", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: { code: "not_found" } }));
        };

        await assert.rejects(
            BffFlowsClient.getInstance().disconnectCredential("tok", "flow-1", "cred-missing"),
            { message: "CREDENTIAL_NOT_FOUND" },
        );
    });

    it("updateCredential PUTs /api/credentials/:id and accepts 200", async () => {
        useConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "PUT");
            assert.strictEqual(req.url, "/api/credentials/cred-1");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ credentialId: "cred-1", updated: true }));
        };

        const result = await BffFlowsClient.getInstance().updateCredential("tok", "cred-1", {
            name: "My key",
            data: { apiKey: "secret" },
        });
        assert.strictEqual(JSON.parse(seenBody).name, "My key");
        assert.deepStrictEqual(JSON.parse(seenBody).data, { apiKey: "secret" });
        assert.strictEqual(result.credentialId, "cred-1");
        assert.strictEqual(result.updated, true);
    });

    it("createCredential POSTs /api/credentials and accepts 201", async () => {
        useConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/api/credentials");
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                credentialId: "cred-new",
                credentialType: "openAIApi",
                name: "OpenAI producción",
                assigned: false,
            }));
        };

        const result = await BffFlowsClient.getInstance().createCredential("tok", {
            credentialType: "openAIApi",
            name: "OpenAI producción",
            data: { openAIApiKey: "sk-secret" },
        });
        assert.strictEqual(JSON.parse(seenBody).credentialType, "openAIApi");
        assert.strictEqual(JSON.parse(seenBody).name, "OpenAI producción");
        assert.deepStrictEqual(JSON.parse(seenBody).data, { openAIApiKey: "sk-secret" });
        assert.strictEqual(result.credentialId, "cred-new");
        assert.strictEqual(result.assigned, false);
    });

    it("maps 400 to BFF_BAD_REQUEST", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "bad" }));
        };

        try {
            await BffFlowsClient.getInstance().listFlows("tok", "tenant");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_BAD_REQUEST");
        }
    });

    it("maps 401 to BFF_UNAUTHORIZED", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(401);
            res.end("unauthorized");
        };

        try {
            await BffFlowsClient.getInstance().listFlows("tok", "tenant");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_UNAUTHORIZED");
        }
    });

    it("maps 403 to BFF_FORBIDDEN", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(403);
            res.end("forbidden");
        };

        try {
            await BffFlowsClient.getInstance().getCredentials("tok", "flow-1");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_FORBIDDEN");
        }
    });

    it("maps 404 to FLOW_NOT_FOUND", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(404);
            res.end("missing");
        };

        try {
            await BffFlowsClient.getInstance().runFlow("tok", "missing", { question: "x" });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_NOT_FOUND");
        }
    });

    it("maps updateCredential 404 to CREDENTIAL_NOT_FOUND", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(404);
            res.end("missing");
        };

        try {
            await BffFlowsClient.getInstance().updateCredential("tok", "cred-missing", { name: "x" });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "CREDENTIAL_NOT_FOUND");
        }
    });

    it("maps BFF typed JSON errors instead of collapsing to BFF_BAD_GATEWAY", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: { code: "flow_not_deployed", message: "El flujo no esta desplegado" },
            }));
        };

        try {
            await BffFlowsClient.getInstance().runFlow("tok", "flow-1", { question: "hi" });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "FLOW_NOT_DEPLOYED");
        }

        handler = (_req, res) => {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: {
                    code: "credential_invalid",
                    details: { nodeId: "llm-gemini", credentialId: "cred-gemini", internal: "nope" },
                },
            }));
        };

        try {
            await BffFlowsClient.getInstance().runFlow("tok", "flow-1", { question: "hi" });
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "CREDENTIAL_INVALID");
            assert.deepStrictEqual((ex as { details?: unknown }).details, {
                nodeId: "llm-gemini",
                credentialId: "cred-gemini",
            });
        }

        handler = (_req, res) => {
            res.writeHead(504, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                error: { code: "upstream_timeout", message: "timeout" },
            }));
        };

        try {
            await BffFlowsClient.getInstance().getFlow("tok", "flow-1");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "UPSTREAM_TIMEOUT");
        }
    });

    it("maps 500 and invalid JSON to BFF_BAD_GATEWAY", async () => {
        useConfig();
        handler = (_req, res) => {
            res.writeHead(500);
            res.end("boom");
        };

        try {
            await BffFlowsClient.getInstance().listFlows("tok", "global");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_BAD_GATEWAY");
        }

        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("{not-json");
        };

        try {
            await BffFlowsClient.getInstance().listFlows("tok", "tenant");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_BAD_GATEWAY");
        }
    });

    it("rejects oversized responses as BFF_BAD_GATEWAY", async () => {
        useConfig({ maxResponseBytes: 64 });
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ workspaceId: "ws", flows: [], pad: "x".repeat(200) }));
        };

        try {
            await BffFlowsClient.getInstance().listFlows("tok", "tenant");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_BAD_GATEWAY");
        }
    });
});
