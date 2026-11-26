// Function tests — ITAAS flow graph whitelist

"use strict";

import assert from "assert";
import { sanitizeItaasFlowGraph, toPublicFlowDetail, extractSanitizedItaasFlowGraph } from "../../../src/utils/itaas-flow-graph";

describe("itaas-flow-graph", () => {
    it("sanitizeItaasFlowGraph returns undefined when graph key is absent", () => {
        assert.strictEqual(sanitizeItaasFlowGraph(undefined), undefined);
    });

    it("sanitizeItaasFlowGraph returns empty graph when payload is not an object", () => {
        assert.deepStrictEqual(sanitizeItaasFlowGraph(null), { nodes: [], edges: [] });
        assert.deepStrictEqual(sanitizeItaasFlowGraph("nope"), { nodes: [], edges: [] });
        assert.deepStrictEqual(sanitizeItaasFlowGraph(1), { nodes: [], edges: [] });
        assert.deepStrictEqual(sanitizeItaasFlowGraph([]), { nodes: [], edges: [] });
    });

    it("sanitizeItaasFlowGraph copies only id, label, x, y / id, source, target", () => {
        const graph = sanitizeItaasFlowGraph({
            nodes: [{
                id: "start_0",
                label: "Start",
                x: 120.5,
                y: 80,
                inputs: { apiKey: "secret" },
                data: { prompt: "ignore" },
            }],
            edges: [{
                id: "e1",
                source: "start_0",
                target: "agent_0",
                data: { extra: true },
            }],
            flowData: { nodes: [] },
        });

        assert.deepStrictEqual(graph, {
            nodes: [{ id: "start_0", label: "Start", x: 120.5, y: 80 }],
            edges: [],
        });
    });

    it("sanitizeItaasFlowGraph flattens Flowise position and data.label", () => {
        const graph = sanitizeItaasFlowGraph({
            nodes: [{
                id: "start_0",
                position: { x: 120.5, y: 80 },
                data: { label: "Start", name: "startAgentflow", inputs: { token: "secret" } },
            }],
            edges: [{ id: "e1", source: "start_0", target: "start_0", sourceHandle: "a" }],
        });

        assert.deepStrictEqual(graph, {
            nodes: [{ id: "start_0", label: "Start", x: 120.5, y: 80 }],
            edges: [{ id: "e1", source: "start_0", target: "start_0" }],
        });
    });

    it("sanitizeItaasFlowGraph uses data.name then id when label is missing", () => {
        const graph = sanitizeItaasFlowGraph({
            nodes: [
                { id: "n1", x: 1, y: 2, data: { name: "chatModel" } },
                { id: "n2", x: 3, y: 4 },
            ],
            edges: [],
        });

        assert.deepStrictEqual(graph.nodes, [
            { id: "n1", label: "chatModel", x: 1, y: 2 },
            { id: "n2", label: "n2", x: 3, y: 4 },
        ]);
    });

    it("sanitizeItaasFlowGraph drops nodes without id or finite x,y and uses id when label is empty", () => {
        const graph = sanitizeItaasFlowGraph({
            nodes: [
                { id: "ok", label: "  ", x: 1, y: 2 },
                { id: "", label: "Nope", x: 1, y: 2 },
                { id: "bad-pos", label: "X", x: "1", y: 2 },
                { id: "nan", label: "X", x: Number.NaN, y: 0 },
                { id: "agent_0", label: "Agent", x: 10, y: 20 },
            ],
            edges: [
                { id: "e1", source: "ok", target: "agent_0" },
                { id: "orphan", source: "ok", target: "missing" },
                { source: "agent_0", target: "ok" },
            ],
        });

        assert.deepStrictEqual(graph, {
            nodes: [
                { id: "ok", label: "ok", x: 1, y: 2 },
                { id: "agent_0", label: "Agent", x: 10, y: 20 },
            ],
            edges: [
                { id: "e1", source: "ok", target: "agent_0" },
                { id: "agent_0->ok", source: "agent_0", target: "ok" },
            ],
        });
    });

    it("toPublicFlowDetail copies known fields and strips flowData and extra keys", () => {
        const detail = toPublicFlowDetail({
            id: "flow-1",
            name: "Demo",
            deployed: true,
            type: "CHATFLOW",
            category: "demo",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            flowData: "{\"nodes\":[]}",
            secret: "nope",
            graph: {
                nodes: [{ id: "n1", label: "A", x: 0, y: 0, inputs: { k: "v" } }],
                edges: [],
            },
        });

        assert.deepStrictEqual(detail, {
            id: "flow-1",
            name: "Demo",
            deployed: true,
            type: "CHATFLOW",
            category: "demo",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            graph: {
                nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
                edges: [],
            },
        });
        assert.strictEqual("flowData" in detail, false);
        assert.strictEqual("secret" in detail, false);
    });

    it("toPublicFlowDetail maps BFF root nodes and edges to sanitized graph", () => {
        const detail = toPublicFlowDetail({
            id: "flow-1",
            name: "Demo",
            deployed: true,
            flowData: "{\"nodes\":[]}",
            nodes: [{
                id: "agent-1",
                label: "Start",
                x: 120.5,
                y: 80,
                position: { x: 120.5, y: 80 },
                data: {
                    name: "agentAgentflow",
                    label: "Start",
                    inputs: { credential: "secret" },
                },
            }],
            edges: [{ id: "edge-1", source: "agent-1", target: "agent-1" }],
        });

        assert.deepStrictEqual(detail, {
            id: "flow-1",
            name: "Demo",
            deployed: true,
            graph: {
                nodes: [{ id: "agent-1", label: "Start", x: 120.5, y: 80 }],
                edges: [{ id: "edge-1", source: "agent-1", target: "agent-1" }],
            },
        });
        assert.strictEqual("nodes" in detail, false);
        assert.strictEqual("edges" in detail, false);
        assert.strictEqual("flowData" in detail, false);
    });

    it("toPublicFlowDetail prefers graph over root nodes when both are present", () => {
        const detail = toPublicFlowDetail({
            id: "flow-1",
            name: "Demo",
            deployed: true,
            nodes: [{ id: "ignored", label: "Nope", x: 9, y: 9 }],
            edges: [],
            graph: {
                nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
                edges: [],
            },
        });

        assert.deepStrictEqual(detail.graph, {
            nodes: [{ id: "n1", label: "A", x: 0, y: 0 }],
            edges: [],
        });
    });

    it("toPublicFlowDetail omits graph when BFF does not send it", () => {
        const detail = toPublicFlowDetail({
            id: "flow-1",
            name: "Demo",
            deployed: false,
        });

        assert.strictEqual("graph" in detail, false);
        assert.strictEqual(detail.deployed, false);
    });

    it("extractSanitizedItaasFlowGraph maps graph and strips extra node fields", () => {
        const graph = extractSanitizedItaasFlowGraph({
            graph: {
                nodes: [{ id: "n1", label: "Start", x: 1, y: 2, inputs: { secret: "x" } }],
                edges: [{ id: "e1", source: "n1", target: "n1" }],
            },
        });

        assert.deepStrictEqual(graph, {
            nodes: [{ id: "n1", label: "Start", x: 1, y: 2 }],
            edges: [{ id: "e1", source: "n1", target: "n1" }],
        });
    });

    it("extractSanitizedItaasFlowGraph returns undefined when graph is absent", () => {
        const graph = extractSanitizedItaasFlowGraph({
            id: "flow-1",
            name: "Demo",
        });

        assert.strictEqual(graph, undefined);
    });
});
