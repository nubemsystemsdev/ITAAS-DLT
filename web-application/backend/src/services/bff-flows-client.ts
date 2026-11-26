// HTTP client for BFF north-face flows API (user Bearer token)

"use strict";

import { BffFlowsConfig } from "../config/config-bff-flows";
import { Monitor } from "../monitor";
import { createItaasServiceError, mapBffHttpError, parseBffErrorDetails } from "../utils/itaas-bff-error";
import { Request, RequestResponse } from "../utils/request";

export interface BffFlowSummary {
    id: string;
    name: string;
    deployed: boolean;
    type?: string;
    category?: string;
    updatedAt?: string;
}

export interface BffFlowGraphNode {
    id: string;
    label: string;
    x: number;
    y: number;
}

export interface BffFlowGraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface BffFlowGraph {
    nodes: BffFlowGraphNode[];
    edges: BffFlowGraphEdge[];
}

export interface BffFlowDetail extends BffFlowSummary {
    createdAt?: string;
    graph?: BffFlowGraph;
    nodes?: unknown[];
    edges?: unknown[];
}

export type BffFlowsListScope = "all" | "global" | "tenant";

export interface BffFlowsListResponse {
    workspaceId: string;
    flows: BffFlowSummary[];
}

export interface BffRunFlowBody {
    question?: string;
    overrideConfig?: Record<string, unknown>;
}

export interface BffRunFlowResult {
    text?: string;
    json?: unknown;
    raw: unknown;
}

export interface BffCredentialField {
    name: string;
    label: string;
    type: string;
}

export interface BffCredentialRequirement {
    credentialType: string;
    label: string;
    fields: BffCredentialField[];
    assigned: boolean;
    credentialId: string | null;
    nodeIds: string[];
    available: Array<{ id: string; name: string }>;
}

export interface BffFlowCredentialsResponse {
    flowId: string;
    requirements: BffCredentialRequirement[];
}

/**
 * BFF POST /api/flows/:flowId/credentials payload (mutually exclusive modes).
 * Reuse: `credentialId` only. Create: `name` + `data` only.
 * Overwrites use PUT /api/credentials/:credentialId via {@link BffUpdateCredentialBody}.
 */
export interface BffStoreCredentialBody {
    credentialType: string;
    name?: string;
    data?: Record<string, unknown>;
    credentialId?: string;
}

export interface BffStoreCredentialResult {
    credentialId: string;
    assigned: boolean;
    reused: boolean;
    nodeIds: string[];
}

/**
 * BFF credential update payload (PUT /api/credentials/:credentialId).
 * Rename-only: `{ name }`. Secret overwrite: `{ data }` or `{ name, data }`.
 * Values `"unchanged"` are placeholders; the BFF must not persist them as secrets.
 */
export interface BffUpdateCredentialBody {
    name?: string;
    data?: Record<string, unknown>;
}

export interface BffUpdateCredentialResult {
    credentialId: string;
    updated: boolean;
}

/**
 * BFF POST /api/credentials payload. Creates a tenant credential without assigning it to a flow.
 */
export interface BffCreateCredentialBody {
    credentialType: string;
    name: string;
    data: Record<string, unknown>;
}

export interface BffCreateCredentialResult {
    credentialId: string;
    credentialType: string;
    name: string;
    assigned: boolean;
}

/**
 * Calls BFF GET/POST /api/flows*.
 * Caller must supply a Keycloak access token for Authorization: Bearer.
 */
export class BffFlowsClient {
    private static instance: BffFlowsClient | null = null;

    public static getInstance(): BffFlowsClient {
        if (!BffFlowsClient.instance) {
            BffFlowsClient.instance = new BffFlowsClient();
        }
        return BffFlowsClient.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(client: BffFlowsClient | null): void {
        BffFlowsClient.instance = client;
    }

    public isEnabled(): boolean {
        return BffFlowsConfig.getInstance().isEnabled();
    }

    public async listFlows(accessToken: string, scope: BffFlowsListScope): Promise<BffFlowsListResponse> {
        return this.getJson<BffFlowsListResponse>(
            "/api/flows?scope=" + encodeURIComponent(scope),
            accessToken,
            [200],
        );
    }

    public async getFlow(accessToken: string, flowId: string): Promise<BffFlowDetail> {
        return this.getJson<BffFlowDetail>(
            "/api/flows/" + encodeURIComponent(flowId),
            accessToken,
            [200],
        );
    }

    public async runFlow(accessToken: string, flowId: string, body: BffRunFlowBody): Promise<BffRunFlowResult> {
        return this.postJson<BffRunFlowResult>(
            "/api/flows/" + encodeURIComponent(flowId) + "/run",
            accessToken,
            body,
            [200],
        );
    }

    public async getCredentials(accessToken: string, flowId: string): Promise<BffFlowCredentialsResponse> {
        return this.getJson<BffFlowCredentialsResponse>(
            "/api/flows/" + encodeURIComponent(flowId) + "/credentials",
            accessToken,
            [200],
        );
    }

    public async storeCredentials(
        accessToken: string,
        flowId: string,
        body: BffStoreCredentialBody,
    ): Promise<BffStoreCredentialResult> {
        return this.postJson<BffStoreCredentialResult>(
            "/api/flows/" + encodeURIComponent(flowId) + "/credentials",
            accessToken,
            body,
            [201],
        );
    }

    public async disconnectCredential(accessToken: string, flowId: string, credentialId: string): Promise<void> {
        const config = BffFlowsConfig.getInstance();
        const url = config.baseUrl + "/api/flows/" + encodeURIComponent(flowId)
            + "/credentials/" + encodeURIComponent(credentialId);

        return new Promise<void>((resolve, reject) => {
            Request.delete(url, {
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer " + accessToken,
                },
                timeout: config.timeoutMs,
                maxSize: config.maxResponseBytes,
                skipDebugLog: true,
            }, (error: Error, response: RequestResponse, body: string) => {
                if (error) {
                    Monitor.error("[BFF Flows] DELETE " + url + " failed.", { message: error.message });
                    reject(new Error("BFF_BAD_GATEWAY"));
                    return;
                }

                const status = response ? response.statusCode : 0;
                if (status !== 200 && status !== 204) {
                    Monitor.error("[BFF Flows] DELETE " + url + " rejected.", {
                        statusCode: status,
                        bodyLength: body ? body.length : 0,
                    });
                    reject(this.mapHttpError(status, body || "", "CREDENTIAL_NOT_FOUND"));
                    return;
                }

                resolve();
            });
        });
    }

    public async updateCredential(
        accessToken: string,
        credentialId: string,
        body: BffUpdateCredentialBody,
    ): Promise<BffUpdateCredentialResult> {
        return this.putJson<BffUpdateCredentialResult>(
            "/api/credentials/" + encodeURIComponent(credentialId),
            accessToken,
            body,
            [200],
            "CREDENTIAL_NOT_FOUND",
        );
    }

    public async createCredential(
        accessToken: string,
        body: BffCreateCredentialBody,
    ): Promise<BffCreateCredentialResult> {
        return this.postJson<BffCreateCredentialResult>(
            "/api/credentials",
            accessToken,
            body,
            [201],
        );
    }

    private mapHttpError(status: number, body: string, notFoundCode = "FLOW_NOT_FOUND"): Error {
        return createItaasServiceError(mapBffHttpError(status, body, notFoundCode), parseBffErrorDetails(body));
    }

    private getJson<T>(path: string, accessToken: string, okStatuses: number[]): Promise<T> {
        const config = BffFlowsConfig.getInstance();
        const url = config.baseUrl + path;

        return new Promise<T>((resolve, reject) => {
            Request.get(url, {
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer " + accessToken,
                },
                timeout: config.timeoutMs,
                maxSize: config.maxResponseBytes,
                skipDebugLog: true,
            }, (error: Error, response: RequestResponse, body: string) => {
                if (error) {
                    Monitor.error("[BFF Flows] GET " + url + " failed.", {
                        message: error.message,
                    });
                    reject(new Error("BFF_BAD_GATEWAY"));
                    return;
                }

                const status = response ? response.statusCode : 0;
                if (!okStatuses.includes(status)) {
                    Monitor.error("[BFF Flows] GET " + url + " rejected.", {
                        statusCode: status,
                        bodyLength: body ? body.length : 0,
                    });
                    reject(this.mapHttpError(status, body || ""));
                    return;
                }

                try {
                    resolve(JSON.parse(body || "{}") as T);
                } catch (ex) {
                    Monitor.error("[BFF Flows] Invalid JSON from " + url, {
                        bodyLength: body ? body.length : 0,
                    });
                    reject(new Error("BFF_BAD_GATEWAY"));
                }
            });
        });
    }

    private postJson<T>(path: string, accessToken: string, json: unknown, okStatuses: number[]): Promise<T> {
        return this.writeJson<T>("POST", path, accessToken, json, okStatuses);
    }

    private putJson<T>(
        path: string,
        accessToken: string,
        json: unknown,
        okStatuses: number[],
        notFoundCode = "FLOW_NOT_FOUND",
    ): Promise<T> {
        return this.writeJson<T>("PUT", path, accessToken, json, okStatuses, notFoundCode);
    }

    private writeJson<T>(
        method: "POST" | "PUT",
        path: string,
        accessToken: string,
        json: unknown,
        okStatuses: number[],
        notFoundCode = "FLOW_NOT_FOUND",
    ): Promise<T> {
        const config = BffFlowsConfig.getInstance();
        const url = config.baseUrl + path;
        const requestFn = method === "POST" ? Request.post : Request.put;

        return new Promise<T>((resolve, reject) => {
            requestFn(url, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + accessToken,
                },
                json,
                timeout: config.timeoutMs,
                maxSize: config.maxResponseBytes,
                skipDebugLog: true,
            }, (error: Error, response: RequestResponse, body: string) => {
                if (error) {
                    Monitor.error("[BFF Flows] " + method + " " + url + " failed.", {
                        message: error.message,
                    });
                    reject(new Error("BFF_BAD_GATEWAY"));
                    return;
                }

                const status = response ? response.statusCode : 0;
                if (!okStatuses.includes(status)) {
                    Monitor.error("[BFF Flows] " + method + " " + url + " rejected.", {
                        statusCode: status,
                        bodyLength: body ? body.length : 0,
                    });
                    reject(this.mapHttpError(status, body || "", notFoundCode));
                    return;
                }

                try {
                    resolve(JSON.parse(body || "{}") as T);
                } catch (ex) {
                    Monitor.error("[BFF Flows] Invalid JSON from " + url, {
                        bodyLength: body ? body.length : 0,
                    });
                    reject(new Error("BFF_BAD_GATEWAY"));
                }
            });
        });
    }
}
