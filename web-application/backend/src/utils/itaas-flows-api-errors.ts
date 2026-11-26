// Maps ItaasFlowsService error codes to HTTP API responses

"use strict";

import Express from "express";
import {
    BAD_GATEWAY,
    BAD_REQUEST,
    CONFLICT,
    FORBIDDEN,
    GATEWAY_TIMEOUT,
    NOT_FOUND,
    SERVICE_UNAVAILABLE,
    TOO_MANY_REQUESTS,
    UNAUTHORIZED,
    UNPROCESSABLE_ENTITY,
    sendApiError,
} from "./http-utils";
import { getItaasErrorDetails } from "./itaas-bff-error";

const ITAAS_FLOWS_SERVICE_ERRORS: Array<{
    message: string;
    status: number;
    code: string;
    reason: string;
}> = [
    { message: "ITAAS_ACCESS_REQUIRED", status: FORBIDDEN, code: "ITAAS_ACCESS_REQUIRED", reason: "Active ITAAS subscription or assigned organization license is required" },
    { message: "BFF_UNAVAILABLE", status: SERVICE_UNAVAILABLE, code: "BFF_UNAVAILABLE", reason: "BFF flows proxy is not configured" },
    { message: "KEYCLOAK_SESSION_EXPIRED", status: FORBIDDEN, code: "KEYCLOAK_SESSION_EXPIRED", reason: "Keycloak session has expired, re-authentication required" },
    { message: "KEYCLOAK_TOKEN_UNAVAILABLE", status: FORBIDDEN, code: "KEYCLOAK_TOKEN_UNAVAILABLE", reason: "Keycloak session is not available" },
    { message: "INVALID_FLOW_ID", status: BAD_REQUEST, code: "INVALID_FLOW_ID", reason: "Invalid flow id" },
    { message: "INVALID_CREDENTIAL_ID", status: BAD_REQUEST, code: "INVALID_CREDENTIAL_ID", reason: "Invalid credential id" },
    { message: "INVALID_QUESTION", status: BAD_REQUEST, code: "INVALID_QUESTION", reason: "Invalid question" },
    { message: "INVALID_CREDENTIAL_BODY", status: BAD_REQUEST, code: "INVALID_CREDENTIAL_BODY", reason: "Invalid credential payload" },
    { message: "BFF_BAD_REQUEST", status: BAD_REQUEST, code: "BFF_BAD_REQUEST", reason: "BFF rejected the request" },
    { message: "FLOW_INVALID", status: BAD_REQUEST, code: "FLOW_INVALID", reason: "Flow graph is invalid" },
    { message: "CREDENTIAL_MISSING", status: BAD_REQUEST, code: "CREDENTIAL_MISSING", reason: "Flow is missing a required credential" },
    { message: "CREDENTIAL_UNRESOLVED", status: BAD_REQUEST, code: "CREDENTIAL_UNRESOLVED", reason: "Flow credential secret could not be resolved" },
    { message: "CREDENTIAL_INVALID", status: BAD_REQUEST, code: "CREDENTIAL_INVALID", reason: "Flow credential was rejected" },
    { message: "BFF_UNAUTHORIZED", status: UNAUTHORIZED, code: "BFF_UNAUTHORIZED", reason: "BFF rejected the token" },
    { message: "BFF_FORBIDDEN", status: FORBIDDEN, code: "BFF_FORBIDDEN", reason: "BFF denied access" },
    { message: "FLOW_NOT_FOUND", status: NOT_FOUND, code: "FLOW_NOT_FOUND", reason: "Flow not found" },
    { message: "CREDENTIAL_NOT_FOUND", status: NOT_FOUND, code: "CREDENTIAL_NOT_FOUND", reason: "Credential not found" },
    { message: "FLOW_NOT_DEPLOYED", status: CONFLICT, code: "FLOW_NOT_DEPLOYED", reason: "Flow is not deployed" },
    { message: "EXECUTION_FAILED", status: UNPROCESSABLE_ENTITY, code: "EXECUTION_FAILED", reason: "Flow execution failed" },
    { message: "LLM_RATE_LIMITED", status: TOO_MANY_REQUESTS, code: "LLM_RATE_LIMITED", reason: "LLM provider rate limited the request" },
    { message: "LLM_UNAVAILABLE", status: SERVICE_UNAVAILABLE, code: "LLM_UNAVAILABLE", reason: "LLM provider is temporarily unavailable" },
    { message: "BFF_BAD_GATEWAY", status: BAD_GATEWAY, code: "BFF_BAD_GATEWAY", reason: "BFF is unreachable" },
    { message: "UPSTREAM_UNREACHABLE", status: BAD_GATEWAY, code: "UPSTREAM_UNREACHABLE", reason: "Flowise is unreachable" },
    { message: "UPSTREAM_UNAUTHORIZED", status: BAD_GATEWAY, code: "UPSTREAM_UNAUTHORIZED", reason: "Flowise rejected the BFF credential" },
    { message: "IDENTITY_RESOLVER_UNAVAILABLE", status: BAD_GATEWAY, code: "IDENTITY_RESOLVER_UNAVAILABLE", reason: "Identity resolver is unavailable" },
    { message: "UPSTREAM_TIMEOUT", status: GATEWAY_TIMEOUT, code: "UPSTREAM_TIMEOUT", reason: "Flowise did not respond in time" },
];

/**
 * Maps known ItaasFlowsService / BFF proxy error codes to API responses.
 * @returns true if the error was handled
 */
export function sendItaasFlowsServiceError(
    request: Express.Request,
    response: Express.Response,
    ex: unknown,
): boolean {
    for (const row of ITAAS_FLOWS_SERVICE_ERRORS) {
        if (ex instanceof Error && ex.message === row.message) {
            sendApiError(request, response, row.status, row.code, row.reason, getItaasErrorDetails(ex));
            return true;
        }
    }
    return false;
}
