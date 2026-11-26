// HTTP client for BFF logical-tenant provisioning (service-to-service)

"use strict";

import { BffProvisioningConfig } from "../config/config-bff-provisioning";
import { Monitor } from "../monitor";
import { extractSanitizedItaasFlowGraph, ItaasFlowGraph } from "../utils/itaas-flow-graph";
import { Request, RequestResponse } from "../utils/request";

export type BffTenantSubjectType = "organization" | "user";

export interface BffTenantRef {
    subjectType: BffTenantSubjectType;
    subjectId: string;
}

export interface BffProvisionInput extends BffTenantRef {
    name?: string;
}

/** Subset of the BFF Tenant JSON we care about. */
export interface BffTenant {
    subjectKey: string;
    subjectType: BffTenantSubjectType;
    name?: string;
    status: "active" | "inactive";
    flowIds: string[];
    credentialIds: string[];
    createdAt: number;
    updatedAt: number;
}

export type BffProvisioningResult =
    | { skipped: true; reason: string }
    | { skipped: false; tenant: BffTenant };

export type BffTenantsListResult =
    | { skipped: true; reason: string }
    | { skipped: false; tenants: BffTenant[] };

/** Workspace or user assignment from GET /provisioning/flows/:flowId. */
export interface BffCatalogFlowAssignment {
    subjectType: BffTenantSubjectType;
    subjectId: string;
    name?: string;
    status: "active" | "inactive";
}

/** Public catalog item from GET /provisioning/flows (no flowData / secrets). */
export interface BffCatalogFlowItem {
    id: string;
    name: string;
    deployed: boolean;
    type?: string;
    category?: string;
    updatedAt?: string;
    isGlobal: boolean;
    /** Present on GET by id; list items omit this and only set `isGlobal`. */
    assignments?: BffCatalogFlowAssignment[];
    /** Sanitized preview when the BFF catalog GET includes graph/nodes. */
    graph?: ItaasFlowGraph;
}

export type BffCatalogFlowsListResult =
    | { skipped: true; reason: string }
    | { skipped: false; items: BffCatalogFlowItem[] };

export type BffCatalogFlowGetResult =
    | { skipped: true; reason: string }
    | { skipped: false; item: BffCatalogFlowItem };

export type BffGlobalFlowsListResult =
    | { skipped: true; reason: string }
    | { skipped: false; globalFlowIds: string[] };

function parseTenantStatus(value: unknown): "active" | "inactive" {
    return value === "inactive" ? "inactive" : "active";
}

function parseOptionalName(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    const name = String(value).trim();
    return name || undefined;
}

function parseAssignmentRows(
    rows: unknown,
    subjectType: BffTenantSubjectType,
): BffCatalogFlowAssignment[] {
    if (!Array.isArray(rows)) {
        return [];
    }
    const assignments: BffCatalogFlowAssignment[] = [];
    for (const row of rows) {
        if (!row || typeof row !== "object") {
            continue;
        }
        const raw = row as Record<string, unknown>;
        const subjectId = ((raw.id || "") + "").trim();
        if (!subjectId) {
            continue;
        }
        const assignment: BffCatalogFlowAssignment = {
            subjectType,
            subjectId,
            status: parseTenantStatus(raw.status),
        };
        const name = parseOptionalName(raw.name);
        if (name) {
            assignment.name = name;
        }
        assignments.push(assignment);
    }
    return assignments;
}

function parseCatalogFlowAssignments(source: Record<string, unknown>): BffCatalogFlowAssignment[] | undefined {
    const raw = source.assignments;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return undefined;
    }
    const payload = raw as Record<string, unknown>;
    if (!Array.isArray(payload.workspaces) || !Array.isArray(payload.users)) {
        return undefined;
    }
    return [
        ...parseAssignmentRows(payload.workspaces, "organization"),
        ...parseAssignmentRows(payload.users, "user"),
    ];
}

function parseCatalogFlowItem(body: unknown): BffCatalogFlowItem | null {
    if (!body || typeof body !== "object") {
        return null;
    }
    const raw = body as Record<string, unknown>;
    const source = (raw.item && typeof raw.item === "object")
        ? raw.item as Record<string, unknown>
        : raw;
    const id = ((source.id || "") + "").trim();
    if (!id) {
        return null;
    }
    const assignments = parseCatalogFlowAssignments(source);
    const nestedGlobal = !!(
        source.assignments
        && typeof source.assignments === "object"
        && !Array.isArray(source.assignments)
        && (source.assignments as Record<string, unknown>).isGlobal
    );
    const item: BffCatalogFlowItem = {
        id,
        name: ((source.name || "") + "").trim() || id,
        deployed: !!source.deployed,
        isGlobal: !!source.isGlobal || nestedGlobal,
    };
    if (source.type) {
        item.type = String(source.type);
    }
    if (source.category) {
        item.category = String(source.category);
    }
    if (source.updatedAt) {
        item.updatedAt = String(source.updatedAt);
    }
    if (assignments) {
        item.assignments = assignments;
    }
    const graph = extractSanitizedItaasFlowGraph(source);
    if (graph !== undefined) {
        item.graph = graph;
    }
    return item;
}

/**
 * Calls BFF /provisioning/* (workspaces, catalog flows, global flows).
 * When provisioning is disabled or misconfigured, methods no-op with skipped: true.
 */
export class BffProvisioningClient {
    private static instance: BffProvisioningClient | null = null;

    public static getInstance(): BffProvisioningClient {
        if (!BffProvisioningClient.instance) {
            BffProvisioningClient.instance = new BffProvisioningClient();
        }
        return BffProvisioningClient.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(client: BffProvisioningClient | null): void {
        BffProvisioningClient.instance = client;
    }

    public isEnabled(): boolean {
        return BffProvisioningConfig.getInstance().isEnabled();
    }

    /**
     * Creates or reactivates a logical tenant in the BFF (idempotent).
     */
    public async provision(input: BffProvisionInput): Promise<BffProvisioningResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        this.assertSubject(input);

        const body: BffProvisionInput = {
            subjectType: input.subjectType,
            subjectId: input.subjectId,
        };
        if (input.name) {
            body.name = input.name;
        }

        const tenant = await this.postJson<BffTenant>(
            "/provisioning/workspaces",
            body,
            [201],
        );
        return { skipped: false, tenant };
    }

    /**
     * Marks a logical tenant inactive without deleting flows/credentials.
     */
    public async deactivate(ref: BffTenantRef): Promise<BffProvisioningResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        this.assertSubject(ref);

        const tenant = await this.postJson<BffTenant>(
            "/provisioning/workspaces/deactivate",
            {
                subjectType: ref.subjectType,
                subjectId: ref.subjectId,
            },
            [200],
        );
        return { skipped: false, tenant };
    }

    /**
     * Assigns a Flowise chatflow id to a logical tenant.
     */
    public async assignFlow(ref: BffTenantRef, flowId: string): Promise<BffProvisioningResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        this.assertSubject(ref);
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("BFF_PROVISIONING_INVALID_FLOW_ID");
        }

        const tenant = await this.postJson<BffTenant>(
            "/provisioning/workspaces/flows",
            {
                subjectType: ref.subjectType,
                subjectId: ref.subjectId,
                flowId: id,
            },
            [200],
        );
        return { skipped: false, tenant };
    }

    /**
     * Removes a Flowise chatflow id from a logical tenant.
     */
    public async removeFlow(ref: BffTenantRef, flowId: string): Promise<BffProvisioningResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        this.assertSubject(ref);
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("BFF_PROVISIONING_INVALID_FLOW_ID");
        }

        const tenant = await this.postJson<BffTenant>(
            "/provisioning/workspaces/flows/remove",
            {
                subjectType: ref.subjectType,
                subjectId: ref.subjectId,
                flowId: id,
            },
            [200],
        );
        return { skipped: false, tenant };
    }

    /**
     * Lists logical tenants known to the BFF (ops / tests).
     */
    public async listTenants(): Promise<BffTenantsListResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        const body = await this.getJson<{ tenants?: BffTenant[] }>("/provisioning/workspaces", [200]);
        if (!Array.isArray(body.tenants)) {
            throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
        }
        return { skipped: false, tenants: body.tenants };
    }

    /**
     * Lists the full Flowise catalog for admin (GET /provisioning/flows).
     * Optional `q` filters by name substring on the BFF side.
     */
    public async listCatalogFlows(q?: string): Promise<BffCatalogFlowsListResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        let path = "/provisioning/flows";
        const needle = ((q || "") + "").trim();
        if (needle) {
            path += "?q=" + encodeURIComponent(needle);
        }

        const body = await this.getJson<{ items?: BffCatalogFlowItem[] }>(path, [200]);
        if (!Array.isArray(body.items)) {
            throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
        }
        return { skipped: false, items: body.items };
    }

    /**
     * Catalog flow by id (GET /provisioning/flows/:flowId), including
     * `assignments.isGlobal`, `assignments.workspaces` and `assignments.users`.
     * @throws Error BFF_PROVISIONING_INVALID_FLOW_ID | BFF_PROVISIONING_FLOW_NOT_FOUND | BFF_PROVISIONING_INVALID_RESPONSE
     */
    public async getCatalogFlow(flowId: string): Promise<BffCatalogFlowGetResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("BFF_PROVISIONING_INVALID_FLOW_ID");
        }

        try {
            const body = await this.getJson<unknown>(
                "/provisioning/flows/" + encodeURIComponent(id),
                [200],
            );
            const item = parseCatalogFlowItem(body);
            if (!item) {
                throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
            }
            return { skipped: false, item };
        } catch (ex) {
            if (ex instanceof Error && ex.message === "BFF_PROVISIONING_HTTP_404") {
                throw new Error("BFF_PROVISIONING_FLOW_NOT_FOUND");
            }
            throw ex;
        }
    }

    /**
     * Lists platform-global flow ids (GET /provisioning/global-flows).
     */
    public async listGlobalFlows(): Promise<BffGlobalFlowsListResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        const body = await this.getJson<{ globalFlowIds?: string[] }>("/provisioning/global-flows", [200]);
        if (!Array.isArray(body.globalFlowIds)) {
            throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
        }
        return { skipped: false, globalFlowIds: body.globalFlowIds };
    }

    /**
     * Publishes a flow as platform-global (idempotent).
     */
    public async addGlobalFlow(flowId: string): Promise<BffGlobalFlowsListResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("BFF_PROVISIONING_INVALID_FLOW_ID");
        }

        const body = await this.postJson<{ globalFlowIds?: string[] }>(
            "/provisioning/global-flows",
            { flowId: id },
            [200],
        );
        if (!Array.isArray(body.globalFlowIds)) {
            throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
        }
        return { skipped: false, globalFlowIds: body.globalFlowIds };
    }

    /**
     * Unpublishes a platform-global flow (idempotent).
     */
    public async removeGlobalFlow(flowId: string): Promise<BffGlobalFlowsListResult> {
        const config = BffProvisioningConfig.getInstance();
        if (!config.isEnabled()) {
            return { skipped: true, reason: "BFF provisioning disabled or not configured" };
        }

        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("BFF_PROVISIONING_INVALID_FLOW_ID");
        }

        const body = await this.postJson<{ globalFlowIds?: string[] }>(
            "/provisioning/global-flows/remove",
            { flowId: id },
            [200],
        );
        if (!Array.isArray(body.globalFlowIds)) {
            throw new Error("BFF_PROVISIONING_INVALID_RESPONSE");
        }
        return { skipped: false, globalFlowIds: body.globalFlowIds };
    }

    private assertSubject(ref: BffTenantRef): void {
        if (ref.subjectType !== "organization" && ref.subjectType !== "user") {
            throw new Error("BFF_PROVISIONING_INVALID_SUBJECT_TYPE");
        }
        if (!ref.subjectId || !String(ref.subjectId).trim()) {
            throw new Error("BFF_PROVISIONING_INVALID_SUBJECT_ID");
        }
    }

    private getJson<T>(path: string, okStatuses: number[]): Promise<T> {
        const config = BffProvisioningConfig.getInstance();
        const url = config.baseUrl + path;

        return new Promise<T>((resolve, reject) => {
            Request.get(url, {
                headers: {
                    Accept: "application/json",
                    "x-provisioning-key": config.apiKey,
                },
                timeout: config.timeoutMs,
            }, (error: Error, response: RequestResponse, body: string) => {
                if (error) {
                    Monitor.error("[BFF Provisioning] GET " + url + " failed.", {
                        message: error.message,
                    });
                    reject(new Error("BFF_PROVISIONING_NETWORK_ERROR"));
                    return;
                }

                const status = response ? response.statusCode : 0;
                if (!okStatuses.includes(status)) {
                    Monitor.error("[BFF Provisioning] GET " + url + " rejected.", {
                        statusCode: status,
                        body: body,
                    });
                    reject(new Error("BFF_PROVISIONING_HTTP_" + status));
                    return;
                }

                try {
                    resolve(JSON.parse(body || "{}") as T);
                } catch (ex) {
                    Monitor.error("[BFF Provisioning] Invalid JSON from " + url, {
                        body: body,
                    });
                    reject(new Error("BFF_PROVISIONING_INVALID_RESPONSE"));
                }
            });
        });
    }

    private postJson<T>(path: string, json: unknown, okStatuses: number[]): Promise<T> {
        const config = BffProvisioningConfig.getInstance();
        const url = config.baseUrl + path;

        return new Promise<T>((resolve, reject) => {
            Request.post(url, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "x-provisioning-key": config.apiKey,
                },
                json,
                timeout: config.timeoutMs,
            }, (error: Error, response: RequestResponse, body: string) => {
                if (error) {
                    Monitor.error("[BFF Provisioning] POST " + url + " failed.", {
                        message: error.message,
                    });
                    reject(new Error("BFF_PROVISIONING_NETWORK_ERROR"));
                    return;
                }

                const status = response ? response.statusCode : 0;
                if (!okStatuses.includes(status)) {
                    Monitor.error("[BFF Provisioning] POST " + url + " rejected.", {
                        statusCode: status,
                        body: body,
                    });
                    reject(new Error("BFF_PROVISIONING_HTTP_" + status));
                    return;
                }

                try {
                    resolve(JSON.parse(body || "{}") as T);
                } catch (ex) {
                    Monitor.error("[BFF Provisioning] Invalid JSON from " + url, {
                        body: body,
                    });
                    reject(new Error("BFF_PROVISIONING_INVALID_RESPONSE"));
                }
            });
        });
    }
}
