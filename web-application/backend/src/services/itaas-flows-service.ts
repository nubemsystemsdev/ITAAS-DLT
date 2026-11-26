// ITAAS flows orchestration (Marketplace → BFF /api/flows*)

"use strict";

import { AsyncSemaphore } from "@asanrom/async-tools";
import { ItaasFlowSetting } from "../models/itaas-flow-setting";
import { Session } from "../models/users/session";
import { toPublicFlowDetail } from "../utils/itaas-flow-graph";
import {
    mergeFlowCredentialRequirements,
    mergeUniqueFlows,
    sortWorkspaceCredentials,
    type CatalogTypeMeta,
    type ItaasWorkspaceCredential,
    type ItaasWorkspaceCredentialsCatalog,
} from "../utils/itaas-workspace-credential-catalog";
import { BffCreateCredentialBody, BffCreateCredentialResult, BffFlowsClient, BffRunFlowBody, BffStoreCredentialBody } from "./bff-flows-client";
import { KeycloakAccountService } from "./keycloak-account-service";

const WORKSPACE_CREDENTIAL_FETCH_CONCURRENCY = 5;

const RESERVED_OVERRIDE_CONFIG_KEYS = new Set(["sessionId"]);

const CREDENTIAL_DATA_UNCHANGED_SENTINEL = "unchanged";

/**
 * True when a credential field value means “leave existing secret unchanged” (client placeholder).
 */
function isCredentialDataUnchanged(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value !== "string") {
        return false;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return true;
    }
    return trimmed.toLowerCase() === CREDENTIAL_DATA_UNCHANGED_SENTINEL;
}

/**
 * Keeps only non-sentinel credential field values for BFF PUT /api/credentials/:id.
 */
function sanitizeCredentialUpdateData(data: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return {};
    }
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
        const value = data[key];
        if (isCredentialDataUnchanged(value)) {
            continue;
        }
        sanitized[key] = value;
    }
    return sanitized;
}

/**
 * BFF PUT /api/credentials/:id payload data: only real (non-sentinel) secret values.
 * A rename-only edit returns `undefined` so the call is `{ name }`, never forwarding
 * `unchanged` placeholders that could overwrite the stored secret with the literal string.
 */
function buildBffCredentialUpdateData(
    sanitized: Record<string, unknown>,
): Record<string, unknown> | undefined {
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Strips reserved overrideConfig keys so the client cannot override BFF-injected values
 * (e.g. sessionId for conversation isolation).
 */
export function sanitizeOverrideConfig(
    overrideConfig: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    if (!overrideConfig || typeof overrideConfig !== "object" || Array.isArray(overrideConfig)) {
        return undefined;
    }
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(overrideConfig)) {
        if (RESERVED_OVERRIDE_CONFIG_KEYS.has(key)) {
            continue;
        }
        sanitized[key] = overrideConfig[key];
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Orchestrates ITAAS flow operations against the BFF.
 * Obtains a Keycloak access token from the marketplace session and forwards calls.
 */
export class ItaasFlowsService {
    public static instance: ItaasFlowsService = null;

    public static getInstance(): ItaasFlowsService {
        if (ItaasFlowsService.instance) {
            return ItaasFlowsService.instance;
        }
        ItaasFlowsService.instance = new ItaasFlowsService();
        return ItaasFlowsService.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(service: ItaasFlowsService | null): void {
        ItaasFlowsService.instance = service;
    }

    private async requireAccessToken(session: Session): Promise<string> {
        const client = BffFlowsClient.getInstance();
        if (!client.isEnabled()) {
            throw new Error("BFF_UNAVAILABLE");
        }
        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(session);
        if (result.status === "ok") {
            return result.token;
        }
        // Transient failure (Keycloak unreachable): the client should retry.
        if (result.status === "error") {
            throw new Error("KEYCLOAK_TOKEN_UNAVAILABLE");
        }
        // "expired" or "missing": the marketplace session outlived its Keycloak SSO session.
        // Retrying is pointless — the client must re-authenticate against Keycloak.
        throw new Error("KEYCLOAK_SESSION_EXPIRED");
    }

    public async listAllFlows(session: Session) {
        const token = await this.requireAccessToken(session);
        return BffFlowsClient.getInstance().listFlows(token, "all");
    }

    public async listGlobalFlows(session: Session) {
        const token = await this.requireAccessToken(session);
        return BffFlowsClient.getInstance().listFlows(token, "global");
    }

    public async listTenantFlows(session: Session) {
        const token = await this.requireAccessToken(session);
        return BffFlowsClient.getInstance().listFlows(token, "tenant");
    }

    /**
     * Workspace credential catalog: one BFF `scope=all` list plus bounded-concurrency
     * GET /api/flows/:id/credentials, merged so the UI does not N+1 from the browser.
     */
    public async listWorkspaceCredentials(session: Session): Promise<ItaasWorkspaceCredentialsCatalog> {
        const token = await this.requireAccessToken(session);
        const client = BffFlowsClient.getInstance();
        const listed = await client.listFlows(token, "all");
        const flows = mergeUniqueFlows(listed.flows || []);
        const typeMap = new Map<string, CatalogTypeMeta>();
        const credentialMap = new Map<string, ItaasWorkspaceCredential>();
        const semaphore = new AsyncSemaphore(WORKSPACE_CREDENTIAL_FETCH_CONCURRENCY);
        let sawSuccess = false;
        let sawHardError = false;
        let fatalError: Error | null = null;

        await Promise.all(flows.map(async (flow) => {
            const flowId = (flow.id || "").trim();
            if (!flowId) {
                return;
            }
            await semaphore.acquire();
            try {
                if (fatalError) {
                    return;
                }
                const response = await client.getCredentials(token, flowId);
                mergeFlowCredentialRequirements(typeMap, credentialMap, flowId, response.requirements || []);
                sawSuccess = true;
            } catch (ex) {
                const code = ex instanceof Error ? ex.message : "";
                if (code === "FLOW_NOT_FOUND") {
                    return;
                }
                if (code === "BFF_UNAUTHORIZED" || code === "KEYCLOAK_TOKEN_UNAVAILABLE" || code === "BFF_FORBIDDEN") {
                    fatalError = ex instanceof Error ? ex : new Error(code || "BFF_BAD_GATEWAY");
                    return;
                }
                sawHardError = true;
            } finally {
                semaphore.release();
            }
        }));

        if (fatalError) {
            throw fatalError;
        }

        if (sawHardError && !sawSuccess && credentialMap.size === 0 && flows.length > 0) {
            throw new Error("BFF_BAD_GATEWAY");
        }

        const credentials = Array.from(credentialMap.values()).map((credential) => {
            const typeMeta = typeMap.get(credential.credentialType);
            return typeMeta ? { ...credential, fields: typeMeta.fields.slice() } : credential;
        });

        return {
            workspaceId: listed.workspaceId || "",
            flows,
            credentials: sortWorkspaceCredentials(credentials),
            credentialTypes: Array.from(typeMap.values())
                .map(({ credentialType, label, fields, schemaConflict }) => ({ credentialType, label, fields: fields.slice(), schemaConflict }))
                .sort((a, b) => (a.label || a.credentialType).localeCompare(b.label || b.credentialType, undefined, { sensitivity: "base" })),
        };
    }

    public async getFlow(session: Session, flowId: string) {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        const token = await this.requireAccessToken(session);
        const raw = await BffFlowsClient.getInstance().getFlow(token, id);
        const detail = toPublicFlowDetail(raw);
        if (!(await ItaasFlowSetting.isGraphVisibleToUsers(id))) {
            delete detail.graph;
        }
        return detail;
    }

    public async runFlow(session: Session, flowId: string, body: BffRunFlowBody) {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        if (body && body.question !== undefined) {
            const question = (body.question || "") + "";
            if (!question.trim()) {
                throw new Error("INVALID_QUESTION");
            }
        }
        const token = await this.requireAccessToken(session);
        const sanitizedBody: BffRunFlowBody = {
            overrideConfig: sanitizeOverrideConfig(body && body.overrideConfig),
        };
        if (body && body.question !== undefined) {
            sanitizedBody.question = body.question;
        }
        return BffFlowsClient.getInstance().runFlow(token, id, sanitizedBody);
    }

    public async getCredentials(session: Session, flowId: string) {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        const token = await this.requireAccessToken(session);
        return BffFlowsClient.getInstance().getCredentials(token, id);
    }

    public async disconnectCredential(session: Session, flowId: string, credentialId: string): Promise<void> {
        const id = ((flowId || "") + "").trim();
        const assignedCredentialId = ((credentialId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        if (!assignedCredentialId) {
            throw new Error("INVALID_CREDENTIAL_ID");
        }
        const token = await this.requireAccessToken(session);
        await BffFlowsClient.getInstance().disconnectCredential(token, id, assignedCredentialId);
    }

    public async storeCredentials(session: Session, flowId: string, body: BffStoreCredentialBody) {
        const id = ((flowId || "") + "").trim();
        if (!id) {
            throw new Error("INVALID_FLOW_ID");
        }
        const credentialType = ((body && body.credentialType) || "") + "";
        if (!credentialType.trim()) {
            throw new Error("INVALID_CREDENTIAL_BODY");
        }
        const credentialId = String((body && body.credentialId) || "").trim();
        const hasCredentialId = body.credentialId !== undefined;
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const hasName = body.name !== undefined;
        const hasData = body.data !== undefined;
        const hasCreateFields = hasName || hasData;
        const isReuse = hasCredentialId && !hasCreateFields;
        const isCreate = !hasCredentialId && hasName && hasData;
        const isUpdate = hasCredentialId && hasCreateFields;
        if (!isReuse && !isCreate && !isUpdate) {
            throw new Error("INVALID_CREDENTIAL_BODY");
        }
        if ((isReuse || isUpdate) && !credentialId) {
            throw new Error("INVALID_CREDENTIAL_BODY");
        }
        if (isCreate && (!name || !hasData)) {
            throw new Error("INVALID_CREDENTIAL_BODY");
        }
        let credentialUpdateBody: { name?: string; data?: Record<string, unknown> } | null = null;
        if (isUpdate) {
            const rawUpdateData = body.data && typeof body.data === "object" && !Array.isArray(body.data)
                ? (body.data as Record<string, unknown>)
                : undefined;
            const updateData = sanitizeCredentialUpdateData(rawUpdateData);
            const updateName = hasName ? name : "";
            const bffUpdateData = buildBffCredentialUpdateData(updateData);
            if (!updateName && !bffUpdateData) {
                throw new Error("INVALID_CREDENTIAL_BODY");
            }
            credentialUpdateBody = {};
            if (updateName) {
                credentialUpdateBody.name = updateName;
            }
            if (bffUpdateData && Object.keys(bffUpdateData).length > 0) {
                credentialUpdateBody.data = bffUpdateData;
            }
        }
        const token = await this.requireAccessToken(session);
        // Overwrite mode: the BFF store endpoint only accepts reuse or create; overwriting the
        // secret of an already-assigned credential goes through PUT /api/credentials/:credentialId.
        if (isUpdate && credentialUpdateBody) {
            const updated = await BffFlowsClient.getInstance().updateCredential(token, credentialId, credentialUpdateBody);
            return {
                credentialId: updated.credentialId,
                assigned: true,
                reused: true,
                nodeIds: [],
            };
        }
        if (isCreate) {
            return BffFlowsClient.getInstance().storeCredentials(token, id, {
                credentialType,
                name,
                data: body.data as Record<string, unknown>,
            });
        }
        return BffFlowsClient.getInstance().storeCredentials(token, id, {
            credentialType,
            credentialId,
        });
    }

    /**
     * Creates a workspace credential without assigning it to any flow (BFF POST /api/credentials).
     */
    public async createCredential(session: Session, body: BffCreateCredentialBody): Promise<BffCreateCredentialResult> {
        const credentialType = ((body && body.credentialType) || "").trim();
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const rawData = body && body.data && typeof body.data === "object" && !Array.isArray(body.data)
            ? body.data
            : undefined;
        const data = sanitizeCredentialUpdateData(rawData);
        if (!credentialType || !name || Object.keys(data).length === 0) {
            throw new Error("INVALID_CREDENTIAL_BODY");
        }
        const token = await this.requireAccessToken(session);
        const created = await BffFlowsClient.getInstance().createCredential(token, {
            credentialType,
            name,
            data,
        });
        const credentialId = typeof created?.credentialId === "string" ? created.credentialId.trim() : "";
        if (!credentialId || typeof created.assigned !== "boolean") {
            throw new Error("BFF_BAD_GATEWAY");
        }
        return {
            credentialId,
            credentialType: ((created && created.credentialType) || credentialType).trim(),
            name: ((created && created.name) || name).trim(),
            assigned: created.assigned,
        };
    }
}
