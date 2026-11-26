// Function tests — BffProvisioningClient

"use strict";

import assert from "assert";
import HTTP from "http";
import { AddressInfo } from "net";
import { BffProvisioningConfig } from "../../../src/config/config-bff-provisioning";
import { BffProvisioningClient } from "../../../src/services/bff-provisioning-client";

function sampleTenant(overrides?: Partial<{ flowIds: string[]; status: "active" | "inactive" }>) {
    return {
        subjectKey: "org-1",
        subjectType: "organization" as const,
        name: "Org 1",
        status: overrides?.status || "active" as const,
        flowIds: overrides?.flowIds || [],
        credentialIds: [] as string[],
        createdAt: 1,
        updatedAt: 2,
    };
}

describe("BffProvisioningClient", () => {
    afterEach(() => {
        BffProvisioningClient.setInstance(null);
        BffProvisioningConfig.setInstance(null);
    });

    it("isEnabled is false when disabled", () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = false;
        config.baseUrl = "http://127.0.0.1:4000";
        config.apiKey = "key";
        BffProvisioningConfig.setInstance(config);
        assert.strictEqual(BffProvisioningClient.getInstance().isEnabled(), false);
    });

    it("assignFlow returns skipped when disabled", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = false;
        BffProvisioningConfig.setInstance(config);

        const result = await BffProvisioningClient.getInstance().assignFlow(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-1",
        );
        assert.strictEqual(result.skipped, true);
    });

    it("assignFlow throws BFF_PROVISIONING_INVALID_FLOW_ID when flowId empty", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = true;
        config.baseUrl = "http://127.0.0.1:4000";
        config.apiKey = "key";
        BffProvisioningConfig.setInstance(config);

        try {
            await BffProvisioningClient.getInstance().assignFlow(
                { subjectType: "organization", subjectId: "org-1" },
                "  ",
            );
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_FLOW_ID");
        }
    });

    it("listCatalogFlows returns skipped when disabled", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = false;
        BffProvisioningConfig.setInstance(config);

        const result = await BffProvisioningClient.getInstance().listCatalogFlows("legal");
        assert.strictEqual(result.skipped, true);
    });

    it("getCatalogFlow returns skipped when disabled", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = false;
        BffProvisioningConfig.setInstance(config);

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-1");
        assert.strictEqual(result.skipped, true);
    });

    it("addGlobalFlow throws BFF_PROVISIONING_INVALID_FLOW_ID when flowId empty", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = true;
        config.baseUrl = "http://127.0.0.1:4000";
        config.apiKey = "key";
        BffProvisioningConfig.setInstance(config);

        try {
            await BffProvisioningClient.getInstance().addGlobalFlow("  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_FLOW_ID");
        }
    });

    it("removeGlobalFlow throws BFF_PROVISIONING_INVALID_FLOW_ID when flowId empty", async () => {
        const config = new BffProvisioningConfig();
        config.enabledFlag = true;
        config.baseUrl = "http://127.0.0.1:4000";
        config.apiKey = "key";
        BffProvisioningConfig.setInstance(config);

        try {
            await BffProvisioningClient.getInstance().removeGlobalFlow("");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_FLOW_ID");
        }
    });
});

describe("BffProvisioningClient HTTP", () => {
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
        BffProvisioningClient.setInstance(null);
        BffProvisioningConfig.setInstance(null);
    });

    function useEnabledConfig(): void {
        const config = new BffProvisioningConfig();
        config.enabledFlag = true;
        config.baseUrl = baseUrl;
        config.apiKey = "test-key";
        config.timeoutMs = 5000;
        BffProvisioningConfig.setInstance(config);
        BffProvisioningClient.setInstance(null);
    }

    it("assignFlow POSTs body with provisioning key", async () => {
        useEnabledConfig();
        let seenAuth = "";
        let seenBody = "";
        handler = (req, res, body) => {
            seenAuth = (req.headers["x-provisioning-key"] || "") + "";
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/provisioning/workspaces/flows");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(sampleTenant({ flowIds: ["flow-1"] })));
        };

        const result = await BffProvisioningClient.getInstance().assignFlow(
            { subjectType: "organization", subjectId: "org-1" },
            "flow-1",
        );

        assert.strictEqual(seenAuth, "test-key");
        assert.deepStrictEqual(JSON.parse(seenBody), {
            subjectType: "organization",
            subjectId: "org-1",
            flowId: "flow-1",
        });
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.tenant.flowIds, ["flow-1"]);
        }
    });

    it("removeFlow POSTs to flows/remove", async () => {
        useEnabledConfig();
        handler = (req, res) => {
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/provisioning/workspaces/flows/remove");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(sampleTenant({ flowIds: [] })));
        };

        const result = await BffProvisioningClient.getInstance().removeFlow(
            { subjectType: "user", subjectId: "user-1" },
            "flow-1",
        );
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.tenant.flowIds, []);
        }
    });

    it("listTenants GETs /provisioning/workspaces", async () => {
        useEnabledConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers["x-provisioning-key"] || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/provisioning/workspaces");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ tenants: [sampleTenant()] }));
        };

        const result = await BffProvisioningClient.getInstance().listTenants();
        assert.strictEqual(seenAuth, "test-key");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.tenants.length, 1);
            assert.strictEqual(result.tenants[0].subjectKey, "org-1");
        }
    });

    it("listTenants throws when tenants missing", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({}));
        };

        try {
            await BffProvisioningClient.getInstance().listTenants();
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_RESPONSE");
        }
    });

    it("listCatalogFlows GETs /provisioning/flows with provisioning key", async () => {
        useEnabledConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers["x-provisioning-key"] || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/provisioning/flows");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                items: [
                    {
                        id: "flow-legal",
                        name: "Asistente Legal",
                        deployed: true,
                        type: "CHATFLOW",
                        category: "Legal",
                        updatedAt: "2026-08-04T10:30:00.000Z",
                        isGlobal: true,
                    },
                ],
            }));
        };

        const result = await BffProvisioningClient.getInstance().listCatalogFlows();
        assert.strictEqual(seenAuth, "test-key");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.items.length, 1);
            assert.strictEqual(result.items[0].id, "flow-legal");
            assert.strictEqual(result.items[0].isGlobal, true);
            assert.strictEqual(result.items[0].name, "Asistente Legal");
        }
    });

    it("listCatalogFlows appends encoded q query", async () => {
        useEnabledConfig();
        handler = (req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/provisioning/flows?q=" + encodeURIComponent("legal RRHH"));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ items: [] }));
        };

        const result = await BffProvisioningClient.getInstance().listCatalogFlows("legal RRHH");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.items, []);
        }
    });

    it("listCatalogFlows throws when body.items missing", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({}));
        };

        try {
            await BffProvisioningClient.getInstance().listCatalogFlows();
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_RESPONSE");
        }
    });

    it("getCatalogFlow GETs /provisioning/flows/:flowId with provisioning key", async () => {
        useEnabledConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers["x-provisioning-key"] || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/provisioning/flows/flow-legal");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-legal",
                name: "Asistente Legal",
                deployed: true,
                type: "CHATFLOW",
                category: "Legal",
                updatedAt: "2026-08-04T10:30:00.000Z",
                assignments: {
                    isGlobal: true,
                    workspaces: [{ id: "org-acme", name: "ACME", status: "active" }],
                    users: [{ id: "user-1", name: "Ada", status: "inactive" }],
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-legal");
        assert.strictEqual(seenAuth, "test-key");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.item.id, "flow-legal");
            assert.strictEqual(result.item.isGlobal, true);
            assert.strictEqual(result.item.name, "Asistente Legal");
            assert.deepStrictEqual(result.item.assignments, [
                { subjectType: "organization", subjectId: "org-acme", name: "ACME", status: "active" },
                { subjectType: "user", subjectId: "user-1", name: "Ada", status: "inactive" },
            ]);
            assert.strictEqual(result.item.graph, undefined);
        }
    });

    it("getCatalogFlow sanitizes graph when present", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-graph",
                name: "Graph Flow",
                deployed: true,
                isGlobal: false,
                graph: {
                    nodes: [{ id: "n1", label: "Start", x: 12, y: 8, inputs: { apiKey: "secret" } }],
                    edges: [{ id: "e1", source: "n1", target: "n1" }],
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-graph");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.item.graph, {
                nodes: [{ id: "n1", label: "Start", x: 12, y: 8 }],
                edges: [{ id: "e1", source: "n1", target: "n1" }],
            });
        }
    });

    it("getCatalogFlow treats an empty assignments snapshot as unassigned", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-free",
                name: "Free",
                deployed: true,
                assignments: {
                    isGlobal: false,
                    workspaces: [],
                    users: [],
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-free");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.item.isGlobal, false);
            assert.deepStrictEqual(result.item.assignments, []);
        }
    });

    it("getCatalogFlow omits assignments when snapshot arrays are missing", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-incomplete",
                name: "Incomplete",
                deployed: true,
                assignments: {
                    isGlobal: false,
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-incomplete");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.item.id, "flow-incomplete");
            assert.strictEqual(result.item.assignments, undefined);
        }
    });

    it("getCatalogFlow omits assignments when workspaces is not an array", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                id: "flow-bad-snapshot",
                name: "Bad snapshot",
                deployed: true,
                assignments: {
                    isGlobal: false,
                    workspaces: { id: "org-1" },
                    users: [],
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-bad-snapshot");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.item.assignments, undefined);
        }
    });

    it("getCatalogFlow accepts a wrapped item payload", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                item: {
                    id: "flow-wrapped",
                    name: "Wrapped",
                    deployed: true,
                    isGlobal: true,
                },
            }));
        };

        const result = await BffProvisioningClient.getInstance().getCatalogFlow("flow-wrapped");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.strictEqual(result.item.id, "flow-wrapped");
            assert.strictEqual(result.item.isGlobal, true);
        }
    });

    it("getCatalogFlow throws BFF_PROVISIONING_FLOW_NOT_FOUND on 404", async () => {
        useEnabledConfig();
        handler = (_req, res) => {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "not found" }));
        };

        try {
            await BffProvisioningClient.getInstance().getCatalogFlow("missing");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_FLOW_NOT_FOUND");
        }
    });

    it("getCatalogFlow throws BFF_PROVISIONING_INVALID_FLOW_ID when flowId empty", async () => {
        useEnabledConfig();
        try {
            await BffProvisioningClient.getInstance().getCatalogFlow("  ");
            assert.fail("expected throw");
        } catch (ex) {
            assert.strictEqual((ex as Error).message, "BFF_PROVISIONING_INVALID_FLOW_ID");
        }
    });

    it("listGlobalFlows GETs /provisioning/global-flows", async () => {
        useEnabledConfig();
        let seenAuth = "";
        handler = (req, res) => {
            seenAuth = (req.headers["x-provisioning-key"] || "") + "";
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/provisioning/global-flows");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ globalFlowIds: ["flow-legal", "flow-rrhh"] }));
        };

        const result = await BffProvisioningClient.getInstance().listGlobalFlows();
        assert.strictEqual(seenAuth, "test-key");
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.globalFlowIds, ["flow-legal", "flow-rrhh"]);
        }
    });

    it("addGlobalFlow POSTs flowId to /provisioning/global-flows", async () => {
        useEnabledConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/provisioning/global-flows");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ globalFlowIds: ["flow-legal"] }));
        };

        const result = await BffProvisioningClient.getInstance().addGlobalFlow("flow-legal");
        assert.deepStrictEqual(JSON.parse(seenBody), { flowId: "flow-legal" });
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.globalFlowIds, ["flow-legal"]);
        }
    });

    it("removeGlobalFlow POSTs to /provisioning/global-flows/remove", async () => {
        useEnabledConfig();
        let seenBody = "";
        handler = (req, res, body) => {
            seenBody = body;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/provisioning/global-flows/remove");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ globalFlowIds: [] }));
        };

        const result = await BffProvisioningClient.getInstance().removeGlobalFlow("flow-legal");
        assert.deepStrictEqual(JSON.parse(seenBody), { flowId: "flow-legal" });
        assert.strictEqual(result.skipped, false);
        if (!result.skipped) {
            assert.deepStrictEqual(result.globalFlowIds, []);
        }
    });
});
