// Maps ItaasWorkspaceProvisioningService admin error codes to HTTP API responses

"use strict";

import Express from "express";
import { BAD_REQUEST, NOT_FOUND, SERVICE_UNAVAILABLE, sendApiError, sendApiErrorOnMessage } from "./http-utils";
import { isBffProvisioningTransportError } from "./itaas-bff-error";

/**
 * Maps known admin workspace/flow service error codes to API responses.
 * @returns true if the error was handled
 */
export function sendItaasWorkspaceAdminServiceError(
    request: Express.Request,
    response: Express.Response,
    ex: unknown,
): boolean {
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "BFF_UNAVAILABLE",
        SERVICE_UNAVAILABLE,
        "BFF_UNAVAILABLE",
        "BFF provisioning is not configured",
    )) {
        return true;
    }
    // Upstream BFF transport / HTTP failures from BffProvisioningClient
    const message = ex instanceof Error ? ex.message : "";
    if (isBffProvisioningTransportError(message)) {
        sendApiError(
            request,
            response,
            SERVICE_UNAVAILABLE,
            "BFF_UNAVAILABLE",
            "BFF provisioning is unavailable",
        );
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "INVALID_BODY",
        BAD_REQUEST,
        "INVALID_BODY",
        "Invalid visibility",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "INVALID_FLOW_ID",
        BAD_REQUEST,
        "INVALID_FLOW_ID",
        "Invalid flow id",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "FLOW_NOT_FOUND",
        NOT_FOUND,
        "FLOW_NOT_FOUND",
        "Flow not found",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "FLOW_IS_GLOBAL",
        BAD_REQUEST,
        "FLOW_IS_GLOBAL",
        "Flow is global and cannot be assigned to a workspace",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "FLOW_ALREADY_ASSIGNED",
        BAD_REQUEST,
        "FLOW_ALREADY_ASSIGNED",
        "The flow is already assigned to a workspace",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "FLOW_GLOBAL_SYNC_FAILED",
        BAD_REQUEST,
        "FLOW_GLOBAL_SYNC_FAILED",
        "Could not clear workspace assignments before publishing the flow",
    )) {
        return true;
    }
    if (sendApiErrorOnMessage(
        request,
        response,
        ex,
        "FLOW_OP_BUSY",
        SERVICE_UNAVAILABLE,
        "FLOW_OP_BUSY",
        "Another admin operation is in progress for this flow",
    )) {
        return true;
    }
    return false;
}

/**
 * Rejects admin assign/remove soft-fail results (`skipped` / `error`) as HTTP 503.
 * Background sync callers may still consume those reasons without throwing.
 * @returns true if an error response was sent
 */
export function sendItaasWorkspaceAdminMutationFailure(
    request: Express.Request,
    response: Express.Response,
    result: { reason: string },
): boolean {
    if (result.reason === "flow_assigned" || result.reason === "flow_removed") {
        return false;
    }
    if (result.reason === "missing_flow_id" || result.reason === "missing_subject") {
        sendApiError(
            request,
            response,
            BAD_REQUEST,
            result.reason === "missing_flow_id" ? "INVALID_FLOW_ID" : "INVALID_SUBJECT",
            result.reason === "missing_flow_id" ? "Invalid flowId" : "Invalid subject",
        );
        return true;
    }
    sendApiError(
        request,
        response,
        SERVICE_UNAVAILABLE,
        "BFF_UNAVAILABLE",
        "BFF provisioning is unavailable",
    );
    return true;
}
