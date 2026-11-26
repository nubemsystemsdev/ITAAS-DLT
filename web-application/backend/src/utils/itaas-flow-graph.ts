// Public ITAAS flow detail mapping (never forward flowData / node inputs)

"use strict";

export interface ItaasFlowGraphNode {
    id: string;
    label: string;
    x: number;
    y: number;
}

export interface ItaasFlowGraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface ItaasFlowGraph {
    nodes: ItaasFlowGraphNode[];
    edges: ItaasFlowGraphEdge[];
}

export interface ItaasPublicFlowDetail {
    id: string;
    name: string;
    deployed: boolean;
    type?: string;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
    graph?: ItaasFlowGraph;
}

function asTrimmedString(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return "";
}

function asFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function sanitizeNode(raw: unknown): ItaasFlowGraphNode | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const row = raw as Record<string, unknown>;
    const id = asTrimmedString(row.id);
    if (!id) {
        return null;
    }
    const position = asRecord(row.position);
    const data = asRecord(row.data);
    const x = asFiniteNumber(row.x) ?? (position ? asFiniteNumber(position.x) : null);
    const y = asFiniteNumber(row.y) ?? (position ? asFiniteNumber(position.y) : null);
    if (x === null || y === null) {
        return null;
    }
    const label = asTrimmedString(row.label)
        || (data ? asTrimmedString(data.label) : "")
        || (data ? asTrimmedString(data.name) : "")
        || id;
    return { id, label, x, y };
}

function sanitizeEdge(raw: unknown, nodeIds: Set<string>): ItaasFlowGraphEdge | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const row = raw as Record<string, unknown>;
    const source = asTrimmedString(row.source);
    const target = asTrimmedString(row.target);
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
        return null;
    }
    const id = asTrimmedString(row.id) || (source + "->" + target);
    return { id, source, target };
}

/**
 * Whitelist a BFF graph payload. Missing key → undefined. Invalid value → empty graph.
 */
export function sanitizeItaasFlowGraph(raw: unknown): ItaasFlowGraph | undefined {
    if (raw === undefined) {
        return undefined;
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        return { nodes: [], edges: [] };
    }
    const obj = raw as Record<string, unknown>;
    const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
    const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];
    const nodes: ItaasFlowGraphNode[] = [];
    for (const item of rawNodes) {
        const node = sanitizeNode(item);
        if (node) {
            nodes.push(node);
        }
    }
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges: ItaasFlowGraphEdge[] = [];
    for (const item of rawEdges) {
        const edge = sanitizeEdge(item, nodeIds);
        if (edge) {
            edges.push(edge);
        }
    }
    return { nodes, edges };
}

function optionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    return value;
}

function resolveBffGraphPayload(row: Record<string, unknown>): unknown {
    if (Object.prototype.hasOwnProperty.call(row, "graph")) {
        return row.graph;
    }
    if (!Object.prototype.hasOwnProperty.call(row, "nodes")
        && !Object.prototype.hasOwnProperty.call(row, "edges")) {
        return undefined;
    }
    return { nodes: row.nodes, edges: row.edges };
}

/**
 * Sanitizes a graph from a BFF flow JSON object (`graph` or root nodes/edges).
 */
export function extractSanitizedItaasFlowGraph(raw: unknown): ItaasFlowGraph | undefined {
    const row = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : null;
    if (!row) {
        return undefined;
    }
    return sanitizeItaasFlowGraph(resolveBffGraphPayload(row));
}

/**
 * Maps a BFF flow detail JSON object to the public Marketplace DTO.
 */
export function toPublicFlowDetail(raw: unknown): ItaasPublicFlowDetail {
    const row = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};
    const detail: ItaasPublicFlowDetail = {
        id: asTrimmedString(row.id),
        name: typeof row.name === "string" ? row.name : asTrimmedString(row.name),
        deployed: !!row.deployed,
    };
    const type = optionalString(row.type);
    if (type !== undefined) {
        detail.type = type;
    }
    const category = optionalString(row.category);
    if (category !== undefined) {
        detail.category = category;
    }
    const createdAt = optionalString(row.createdAt);
    if (createdAt !== undefined) {
        detail.createdAt = createdAt;
    }
    const updatedAt = optionalString(row.updatedAt);
    if (updatedAt !== undefined) {
        detail.updatedAt = updatedAt;
    }
    const graph = extractSanitizedItaasFlowGraph(row);
    if (graph !== undefined) {
        detail.graph = graph;
    }
    return detail;
}
