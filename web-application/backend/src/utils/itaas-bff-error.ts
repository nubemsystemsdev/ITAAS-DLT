// Maps BFF north-face HTTP errors to ItaasFlowsService error codes

"use strict";

const MAX_ERROR_ID_LENGTH = 128;
const MAX_CREDENTIAL_IDS = 20;

export interface ItaasRunErrorDetails {
    nodeId?: string;
    credentialId?: string;
    credentialIds?: string[];
    credentialType?: string;
}

export type ItaasServiceError = Error & { details?: ItaasRunErrorDetails };

const BFF_CODE_TO_DLT: Record<string, string> = {
    flow_not_found: "FLOW_NOT_FOUND",
    credential_not_found: "CREDENTIAL_NOT_FOUND",
    flow_not_deployed: "FLOW_NOT_DEPLOYED",
    credential_missing: "CREDENTIAL_MISSING",
    credential_unresolved: "CREDENTIAL_UNRESOLVED",
    credential_invalid: "CREDENTIAL_INVALID",
    flow_invalid: "FLOW_INVALID",
    llm_rate_limited: "LLM_RATE_LIMITED",
    llm_unavailable: "LLM_UNAVAILABLE",
    execution_failed: "EXECUTION_FAILED",
    upstream_timeout: "UPSTREAM_TIMEOUT",
    upstream_unreachable: "UPSTREAM_UNREACHABLE",
    upstream_unauthorized: "UPSTREAM_UNAUTHORIZED",
    identity_resolver_unavailable: "IDENTITY_RESOLVER_UNAVAILABLE",
    forbidden: "BFF_FORBIDDEN",
    unauthorized: "BFF_UNAUTHORIZED",
    bad_request: "BFF_BAD_REQUEST",
    validation_error: "BFF_BAD_REQUEST",
    upstream_error: "BFF_BAD_GATEWAY",
};

function parseBffErrorJson(body: string): { error?: { code?: unknown; details?: unknown } } | null {
    if (!body) {
        return null;
    }
    try {
        const parsed = JSON.parse(body) as { error?: { code?: unknown; details?: unknown } };
        if (!parsed || typeof parsed !== "object") {
            return null;
        }
        return parsed;
    } catch (_ex) {
        return null;
    }
}

function parseBffErrorCode(body: string): string {
    const parsed = parseBffErrorJson(body);
    const code = parsed && parsed.error ? parsed.error.code : undefined;
    return typeof code === "string" ? code : "";
}

export function sanitizeItaasErrorId(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, MAX_ERROR_ID_LENGTH);
}

export function sanitizeItaasRunErrorDetails(raw: unknown): ItaasRunErrorDetails | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return undefined;
    }
    const row = raw as Record<string, unknown>;
    const details: ItaasRunErrorDetails = {};
    const nodeId = sanitizeItaasErrorId(row.nodeId);
    if (nodeId) {
        details.nodeId = nodeId;
    }
    const credentialId = sanitizeItaasErrorId(row.credentialId);
    if (credentialId) {
        details.credentialId = credentialId;
    }
    if (Array.isArray(row.credentialIds)) {
        const ids: string[] = [];
        const seen = new Set<string>();
        for (const item of row.credentialIds) {
            if (ids.length >= MAX_CREDENTIAL_IDS) {
                break;
            }
            const id = sanitizeItaasErrorId(item);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            ids.push(id);
        }
        if (ids.length === 1 && !details.credentialId) {
            details.credentialId = ids[0];
        } else if (ids.length > 1) {
            details.credentialIds = ids;
            delete details.credentialId;
        }
    }
    const credentialType = sanitizeItaasErrorId(row.credentialType);
    if (credentialType) {
        details.credentialType = credentialType;
    }
    if (!details.nodeId && !details.credentialId && !details.credentialIds && !details.credentialType) {
        return undefined;
    }
    return details;
}

/**
 * Reads the BFF `error.details` object (nodeId / credential ids) without leaking extra keys.
 */
export function parseBffErrorDetails(body: string): ItaasRunErrorDetails | undefined {
    const parsed = parseBffErrorJson(body);
    if (!parsed || !parsed.error) {
        return undefined;
    }
    return sanitizeItaasRunErrorDetails(parsed.error.details);
}

export function getItaasErrorDetails(ex: unknown): ItaasRunErrorDetails | undefined {
    if (!ex || typeof ex !== "object") {
        return undefined;
    }
    return sanitizeItaasRunErrorDetails((ex as { details?: unknown }).details);
}

/**
 * True for BffProvisioningClient transport failures (network, invalid body, HTTP status).
 * Callers should map these to HTTP 503 `BFF_UNAVAILABLE` rather than 500 or 422.
 */
export function isBffProvisioningTransportError(message: string): boolean {
    return (
        message === "BFF_PROVISIONING_NETWORK_ERROR"
        || message === "BFF_PROVISIONING_INVALID_RESPONSE"
        || message.startsWith("BFF_PROVISIONING_HTTP_")
    );
}

export function createItaasServiceError(code: string, details?: ItaasRunErrorDetails): ItaasServiceError {
    const error = new Error(code) as ItaasServiceError;
    if (details) {
        error.details = details;
    }
    return error;
}

/**
 * Translates a BFF error response into the Error.message codes used by ItaasFlowsService.
 */
export function mapBffHttpError(status: number, body: string, notFoundCode = "FLOW_NOT_FOUND"): string {
    const bffCode = parseBffErrorCode(body);
    if (bffCode === "not_found") {
        return notFoundCode;
    }
    const mapped = BFF_CODE_TO_DLT[bffCode];
    if (mapped) {
        return mapped;
    }
    if (status === 400) {
        return "BFF_BAD_REQUEST";
    }
    if (status === 401) {
        return "BFF_UNAUTHORIZED";
    }
    if (status === 403) {
        return "BFF_FORBIDDEN";
    }
    if (status === 404) {
        return notFoundCode;
    }
    if (status === 409) {
        return "FLOW_NOT_DEPLOYED";
    }
    if (status === 422) {
        return "EXECUTION_FAILED";
    }
    if (status === 429) {
        return "LLM_RATE_LIMITED";
    }
    if (status === 504) {
        return "UPSTREAM_TIMEOUT";
    }
    return "BFF_BAD_GATEWAY";
}
