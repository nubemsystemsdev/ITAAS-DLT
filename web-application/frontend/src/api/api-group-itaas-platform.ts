// API bindings: itaas_platform (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { ItaasCustomAgentRequestListResponse, ItaasCustomAgentRequestItem, ItaasCustomAgentRequestCreateBody, ItaasCustomAgentRequestCheckoutResponse, ItaasCustomAgentRequestCheckoutBody, ItaasAdminCustomAgentRequestList, ItaasCustomAgentRequestRejectBody, ItaasCustomAgentRequestDeliverBody } from "./definitions";

export class ApiItaasPlatform {
    /**
     * Method: GET
     * Path: /itaas/custom-agent-requests
     * Lists custom agent requests for the billing subject of the authenticated user.
     * @returns The request parameters
     */
    public static GetItaasCustomAgentRequests(): RequestParams<ItaasCustomAgentRequestListResponse, GetItaasCustomAgentRequestsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/custom-agent-requests`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ORG_ADMIN_REQUIRED", handler.forbiddenOrgAdminRequired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/custom-agent-requests
     * Creates a custom agent request for review by the platform team.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateItaasCustomAgentRequest(body: ItaasCustomAgentRequestCreateBody): RequestParams<ItaasCustomAgentRequestItem, CreateItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/custom-agent-requests`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ORG_ADMIN_REQUIRED", handler.forbiddenOrgAdminRequired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "PENDING_REQUEST_LIMIT_REACHED", handler.badRequestPendingRequestLimitReached)
                    .add(400, "INVALID_BASE_AGENT_ID", handler.badRequestInvalidBaseAgentId)
                    .add(400, "INVALID_BASE_FLOW_ID", handler.badRequestInvalidBaseFlowId)
                    .add(400, "INVALID_DESCRIPTION", handler.badRequestInvalidDescription)
                    .add(400, "INVALID_REQUEST_TYPE", handler.badRequestInvalidRequestType)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/custom-agent-requests/{id}
     * Gets a custom agent request for the authenticated requester.
     * @param id Request ID
     * @returns The request parameters
     */
    public static GetItaasCustomAgentRequest(id: string): RequestParams<ItaasCustomAgentRequestItem, GetItaasCustomAgentRequestErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/custom-agent-requests/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ORG_ADMIN_REQUIRED", handler.forbiddenOrgAdminRequired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/custom-agent-requests/{id}/cancel
     * Cancels a custom agent request in `pending_review` or `pending_payment`.
     * @param id Request ID
     * @returns The request parameters
     */
    public static CancelItaasCustomAgentRequest(id: string): RequestParams<ItaasCustomAgentRequestItem, CancelItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/custom-agent-requests/${encodeURIComponent(id)}/cancel`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ORG_ADMIN_REQUIRED", handler.forbiddenOrgAdminRequired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/custom-agent-requests/{id}/checkout-deposit
     * Starts a Stripe checkout for the custom-agent deposit.
     * @param id Request ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CheckoutItaasCustomAgentRequestDeposit(id: string, body: ItaasCustomAgentRequestCheckoutBody): RequestParams<ItaasCustomAgentRequestCheckoutResponse, CheckoutItaasCustomAgentRequestDepositErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/custom-agent-requests/${encodeURIComponent(id)}/checkout-deposit`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "DEPOSIT_CHECKOUT_UNAVAILABLE", handler.status503DepositCheckoutUnavailable)
                    .add(503, "*", handler.status503)
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ORG_ADMIN_REQUIRED", handler.forbiddenOrgAdminRequired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "TOKENS_EXCEED_LIMIT", handler.badRequestTokensExceedLimit)
                    .add(400, "INSUFFICIENT_TOKEN_BALANCE", handler.badRequestInsufficientTokenBalance)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/admin/custom-agent-requests
     * Lists custom agent requests for platform admins.
     * Requires permission: admin.users.manage (platform admin role)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static AdminListItaasCustomAgentRequests(queryParams: AdminListItaasCustomAgentRequestsQueryParameters): RequestParams<ItaasAdminCustomAgentRequestList, AdminListItaasCustomAgentRequestsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/admin/custom-agent-requests` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/admin/custom-agent-requests/{id}
     * Gets a custom agent request for platform admins.
     * Requires permission: admin.users.manage (platform admin role)
     * @param id Request ID
     * @returns The request parameters
     */
    public static AdminGetItaasCustomAgentRequest(id: string): RequestParams<ItaasCustomAgentRequestItem, AdminGetItaasCustomAgentRequestErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/admin/custom-agent-requests/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/admin/custom-agent-requests/{id}/reject
     * Rejects a custom agent request in `pending_review`.
     * Requires permission: admin.users.manage (platform admin role)
     * @param id Request ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminRejectItaasCustomAgentRequest(id: string, body: ItaasCustomAgentRequestRejectBody): RequestParams<ItaasCustomAgentRequestItem, AdminRejectItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/custom-agent-requests/${encodeURIComponent(id)}/reject`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REJECTION_REASON", handler.badRequestInvalidRejectionReason)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/admin/custom-agent-requests/{id}/accept
     * Accepts a custom agent request and moves it to `pending_payment`.
     * Requires permission: admin.users.manage (platform admin role)
     * @param id Request ID
     * @returns The request parameters
     */
    public static AdminAcceptItaasCustomAgentRequest(id: string): RequestParams<ItaasCustomAgentRequestItem, AdminAcceptItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/custom-agent-requests/${encodeURIComponent(id)}/accept`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/admin/custom-agent-requests/{id}/cancel
     * Cancels a custom agent request in `pending_payment`. During `pending_review` the admin must reject instead.
     * Requires permission: admin.users.manage (platform admin role)
     * @param id Request ID
     * @returns The request parameters
     */
    public static AdminCancelItaasCustomAgentRequest(id: string): RequestParams<ItaasCustomAgentRequestItem, AdminCancelItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/custom-agent-requests/${encodeURIComponent(id)}/cancel`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/admin/custom-agent-requests/{id}/deliver
     * Delivers a custom agent request in `in_development`.
     * Requires permission: admin.users.manage (platform admin role)
     * @param id Request ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminDeliverItaasCustomAgentRequest(id: string, body: ItaasCustomAgentRequestDeliverBody): RequestParams<ItaasCustomAgentRequestItem, AdminDeliverItaasCustomAgentRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/custom-agent-requests/${encodeURIComponent(id)}/deliver`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "FLOW_OP_BUSY", handler.status503FlowOpBusy)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(422, "PAYMENT_METHOD_REQUIRED", handler.status422PaymentMethodRequired)
                    .add(422, "DELIVERY_FAILED", handler.status422DeliveryFailed)
                    .add(422, "*", handler.status422)
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "FLOW_ALREADY_DELIVERED", handler.badRequestFlowAlreadyDelivered)
                    .add(400, "FLOW_ALREADY_ASSIGNED", handler.badRequestFlowAlreadyAssigned)
                    .add(400, "FLOW_IS_GLOBAL", handler.badRequestFlowIsGlobal)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for GetItaasCustomAgentRequests
 */
export type GetItaasCustomAgentRequestsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = ORG_ADMIN_REQUIRED
     */
    forbiddenOrgAdminRequired: () => void;
};

/**
 * Error handler for CreateItaasCustomAgentRequest
 */
export type CreateItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST_TYPE
     */
    badRequestInvalidRequestType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DESCRIPTION
     */
    badRequestInvalidDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BASE_FLOW_ID
     */
    badRequestInvalidBaseFlowId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BASE_AGENT_ID
     */
    badRequestInvalidBaseAgentId: () => void;

    /**
     * Handler for status = 400 and code = PENDING_REQUEST_LIMIT_REACHED
     */
    badRequestPendingRequestLimitReached: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = ORG_ADMIN_REQUIRED
     */
    forbiddenOrgAdminRequired: () => void;
};

/**
 * Error handler for GetItaasCustomAgentRequest
 */
export type GetItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = ORG_ADMIN_REQUIRED
     */
    forbiddenOrgAdminRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for CancelItaasCustomAgentRequest
 */
export type CancelItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = ORG_ADMIN_REQUIRED
     */
    forbiddenOrgAdminRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for CheckoutItaasCustomAgentRequestDeposit
 */
export type CheckoutItaasCustomAgentRequestDepositErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INSUFFICIENT_TOKEN_BALANCE
     */
    badRequestInsufficientTokenBalance: () => void;

    /**
     * Handler for status = 400 and code = TOKENS_EXCEED_LIMIT
     */
    badRequestTokensExceedLimit: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = ORG_ADMIN_REQUIRED
     */
    forbiddenOrgAdminRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = DEPOSIT_CHECKOUT_UNAVAILABLE
     */
    status503DepositCheckoutUnavailable: () => void;
};

/**
 * Error handler for AdminListItaasCustomAgentRequests
 */
export type AdminListItaasCustomAgentRequestsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for AdminListItaasCustomAgentRequests
 */
export interface AdminListItaasCustomAgentRequestsQueryParameters {
    /**
     * Search query
     */
    q?: string;

    /**
     * Filter by status
     */
    status?: string;

    /**
     * Page number
     */
    page?: number;

    /**
     * Page size
     */
    pageSize?: number;
}

/**
 * Error handler for AdminGetItaasCustomAgentRequest
 */
export type AdminGetItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for AdminRejectItaasCustomAgentRequest
 */
export type AdminRejectItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REJECTION_REASON
     */
    badRequestInvalidRejectionReason: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for AdminAcceptItaasCustomAgentRequest
 */
export type AdminAcceptItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for AdminCancelItaasCustomAgentRequest
 */
export type AdminCancelItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for AdminDeliverItaasCustomAgentRequest
 */
export type AdminDeliverItaasCustomAgentRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = FLOW_IS_GLOBAL
     */
    badRequestFlowIsGlobal: () => void;

    /**
     * Handler for status = 400 and code = FLOW_ALREADY_ASSIGNED
     */
    badRequestFlowAlreadyAssigned: () => void;

    /**
     * Handler for status = 400 and code = FLOW_ALREADY_DELIVERED
     */
    badRequestFlowAlreadyDelivered: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;

    /**
     * General handler for status = 422
     */
    status422: () => void;

    /**
     * Handler for status = 422 and code = DELIVERY_FAILED
     */
    status422DeliveryFailed: () => void;

    /**
     * Handler for status = 422 and code = PAYMENT_METHOD_REQUIRED
     */
    status422PaymentMethodRequired: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * Handler for status = 503 and code = FLOW_OP_BUSY
     */
    status503FlowOpBusy: () => void;
};

