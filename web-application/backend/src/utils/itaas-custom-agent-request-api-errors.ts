"use strict";

import Express from "express";
import { ADMIN_ROLE } from "../services/users-service";
import {
    BAD_REQUEST,
    FORBIDDEN,
    NOT_FOUND,
    SERVICE_UNAVAILABLE,
    UNPROCESSABLE_ENTITY,
    sendApiError,
} from "./http-utils";
import { isBffProvisioningTransportError } from "./itaas-bff-error";

const CUSTOM_AGENT_REQUEST_SERVICE_ERRORS: Array<{
    message: string;
    status: number;
    code: string;
    reason: string;
}> = [
    { message: "ITAAS_ACCESS_REQUIRED", status: FORBIDDEN, code: "ITAAS_ACCESS_REQUIRED", reason: "Active ITAAS subscription or assigned organization license is required" },
    { message: "ORG_ADMIN_REQUIRED", status: FORBIDDEN, code: "ORG_ADMIN_REQUIRED", reason: "Only the organization admin can manage custom agent requests" },
    { message: "INVALID_REQUEST_TYPE", status: BAD_REQUEST, code: "INVALID_REQUEST_TYPE", reason: "Invalid custom agent request payload" },
    { message: "INVALID_DESCRIPTION", status: BAD_REQUEST, code: "INVALID_DESCRIPTION", reason: "Invalid custom agent request payload" },
    { message: "INVALID_BASE_FLOW_ID", status: BAD_REQUEST, code: "INVALID_BASE_FLOW_ID", reason: "Invalid custom agent request payload" },
    { message: "INVALID_BASE_AGENT_ID", status: BAD_REQUEST, code: "INVALID_BASE_AGENT_ID", reason: "Invalid custom agent request payload" },
    { message: "PENDING_REQUEST_LIMIT_REACHED", status: BAD_REQUEST, code: "PENDING_REQUEST_LIMIT_REACHED", reason: "You already have the maximum number of open custom agent requests" },
    { message: "INVALID_STATUS", status: BAD_REQUEST, code: "INVALID_STATUS", reason: "The request cannot be updated in its current status" },
    { message: "INVALID_REJECTION_REASON", status: BAD_REQUEST, code: "INVALID_REJECTION_REASON", reason: "A rejection reason is required" },
    { message: "REQUEST_NOT_FOUND", status: NOT_FOUND, code: "REQUEST_NOT_FOUND", reason: "Custom agent request not found" },
    { message: "DEPOSIT_CHECKOUT_UNAVAILABLE", status: SERVICE_UNAVAILABLE, code: "DEPOSIT_CHECKOUT_UNAVAILABLE", reason: "Deposit checkout is unavailable" },
    { message: "INSUFFICIENT_TOKEN_BALANCE", status: BAD_REQUEST, code: "INSUFFICIENT_TOKEN_BALANCE", reason: "Not enough tokens in your wallet" },
    { message: "TOKENS_EXCEED_LIMIT", status: BAD_REQUEST, code: "TOKENS_EXCEED_LIMIT", reason: "You can apply at most the allowed number of tokens to this purchase" },
    { message: "INVALID_FLOW_ID", status: BAD_REQUEST, code: "INVALID_FLOW_ID", reason: "Invalid or unknown Flowise flow identifier" },
    { message: "FLOW_IS_GLOBAL", status: BAD_REQUEST, code: "FLOW_IS_GLOBAL", reason: "A global flow cannot be delivered as a custom agent" },
    { message: "FLOW_ALREADY_ASSIGNED", status: BAD_REQUEST, code: "FLOW_ALREADY_ASSIGNED", reason: "The flow is already assigned to a workspace" },
    { message: "FLOW_ALREADY_DELIVERED", status: BAD_REQUEST, code: "FLOW_ALREADY_DELIVERED", reason: "A different flow is already associated with this request" },
    { message: "PAYMENT_METHOD_REQUIRED", status: UNPROCESSABLE_ENTITY, code: "PAYMENT_METHOD_REQUIRED", reason: "A saved payment method is required to start the monthly subscription" },
    { message: "DELIVERY_FAILED", status: UNPROCESSABLE_ENTITY, code: "DELIVERY_FAILED", reason: "The custom agent could not be delivered" },
    { message: "FLOW_OP_BUSY", status: SERVICE_UNAVAILABLE, code: "FLOW_OP_BUSY", reason: "Another admin operation is in progress for this request" },
    { message: "BFF_UNAVAILABLE", status: SERVICE_UNAVAILABLE, code: "BFF_UNAVAILABLE", reason: "BFF provisioning is unavailable" },
];

/**
 * @returns true if the error was handled
 */
export function sendItaasCustomAgentRequestError(
    request: Express.Request,
    response: Express.Response,
    ex: unknown,
): boolean {
    for (const row of CUSTOM_AGENT_REQUEST_SERVICE_ERRORS) {
        if (ex instanceof Error && ex.message === row.message) {
            sendApiError(request, response, row.status, row.code, row.reason);
            return true;
        }
    }
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
    return false;
}

/**
 * @returns true if the response was sent
 */
export function sendForbiddenUnlessPlatformItaasAdmin(
    auth: { hasPermission: (permission: string) => boolean; user: { role: string } },
    request: Express.Request,
    response: Express.Response,
): boolean {
    if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
        sendApiError(
            request,
            response,
            FORBIDDEN,
            "",
            "The user lacks the required permission: admin.users.manage",
        );
        return true;
    }
    return false;
}
