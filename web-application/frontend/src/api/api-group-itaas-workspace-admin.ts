// API bindings: itaas_workspace_admin (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { ItaasAdminFlowsList, ItaasAdminFlowItem, ItaasAdminFlowGraphVisibilityResult, ItaasAdminFlowGraphVisibilityBody, ItaasAdminFlowsGraphVisibilityResult, ItaasAdminFlowsGraphVisibilityBody, ItaasAdminFlowsGraphVisibilityLookupResult, ItaasAdminFlowsGraphVisibilityLookupBody, ItaasAdminWorkspacesList, ItaasAdminGlobalFlowResult, ItaasAdminGlobalFlowBody, ItaasWorkspaceFlowSyncResult, ItaasWorkspaceFlowBody } from "./definitions";

export class ApiItaasWorkspaceAdmin {
    /**
     * Method: GET
     * Path: /itaas/admin/flows
     * Lists the Flowise catalog enriched with visibility and workspace assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static AdminListItaasFlows(queryParams: AdminListItaasFlowsQueryParameters): RequestParams<ItaasAdminFlowsList, AdminListItaasFlowsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/admin/flows` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
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
     * Path: /itaas/admin/flows/{flowId}
     * Returns a Flowise catalog flow by id, enriched with visibility, assignments and sanitized graph preview.
     * Requires permission: admin.users.manage (platform admin role)
     * @param flowId Flowise chatflow id
     * @returns The request parameters
     */
    public static AdminGetItaasFlow(flowId: string): RequestParams<ItaasAdminFlowItem, AdminGetItaasFlowErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/admin/flows/${encodeURIComponent(flowId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
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
     * Path: /itaas/admin/flows/{flowId}/graph-visibility
     * Sets whether end users can see the sanitized graph preview for a catalog flow.
     * Requires permission: admin.users.manage (platform admin role)
     * @param flowId Flowise chatflow id
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminSetItaasFlowGraphVisibility(flowId: string, body: ItaasAdminFlowGraphVisibilityBody): RequestParams<ItaasAdminFlowGraphVisibilityResult, AdminSetItaasFlowGraphVisibilityErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/flows/${encodeURIComponent(flowId)}/graph-visibility`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_BODY", handler.badRequestInvalidBody)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
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
     * Path: /itaas/admin/flows/graph-visibility
     * Sets graph visibility for many catalog flows in local settings only (no BFF).
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminSetItaasFlowsGraphVisibility(body: ItaasAdminFlowsGraphVisibilityBody): RequestParams<ItaasAdminFlowsGraphVisibilityResult, AdminSetItaasFlowsGraphVisibilityErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/flows/graph-visibility`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_BODY", handler.badRequestInvalidBody)
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
     * Path: /itaas/admin/flows/graph-visibility/lookup
     * Reads local graph visibility for catalog flows (no BFF).
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminLookupItaasFlowsGraphVisibility(body: ItaasAdminFlowsGraphVisibilityLookupBody): RequestParams<ItaasAdminFlowsGraphVisibilityLookupResult, AdminLookupItaasFlowsGraphVisibilityErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/flows/graph-visibility/lookup`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_BODY", handler.badRequestInvalidBody)
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
     * Path: /itaas/admin/workspaces
     * Lists BFF logical tenants for workspace assignment.
     * Requires permission: admin.users.manage (platform admin role)
     * @returns The request parameters
     */
    public static AdminListItaasWorkspaces(): RequestParams<ItaasAdminWorkspacesList, AdminListItaasWorkspacesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/admin/workspaces`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
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
     * Path: /itaas/admin/flows/global
     * Publishes a flow as platform-global after clearing private assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminMakeItaasFlowGlobal(body: ItaasAdminGlobalFlowBody): RequestParams<ItaasAdminGlobalFlowResult, AdminMakeItaasFlowGlobalErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/flows/global`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "FLOW_OP_BUSY", handler.status503FlowOpBusy)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(403, "*", handler.forbidden)
                    .add(400, "FLOW_ALREADY_ASSIGNED", handler.badRequestFlowAlreadyAssigned)
                    .add(400, "FLOW_GLOBAL_SYNC_FAILED", handler.badRequestFlowGlobalSyncFailed)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
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
     * Path: /itaas/admin/flows/global/remove
     * Unpublishes a platform-global flow without restoring previous assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminUnpublishItaasFlowGlobal(body: ItaasAdminGlobalFlowBody): RequestParams<ItaasAdminGlobalFlowResult, AdminUnpublishItaasFlowGlobalErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/flows/global/remove`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "FLOW_OP_BUSY", handler.status503FlowOpBusy)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
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
     * Path: /itaas/admin/workspaces/flows
     * Assigns a Flowise flow to a BFF logical tenant.
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminAssignItaasWorkspaceFlow(body: ItaasWorkspaceFlowBody): RequestParams<ItaasWorkspaceFlowSyncResult, AdminAssignItaasWorkspaceFlowErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/workspaces/flows`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "FLOW_OP_BUSY", handler.status503FlowOpBusy)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(403, "*", handler.forbidden)
                    .add(400, "FLOW_ALREADY_ASSIGNED", handler.badRequestFlowAlreadyAssigned)
                    .add(400, "FLOW_IS_GLOBAL", handler.badRequestFlowIsGlobal)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
                    .add(400, "INVALID_SUBJECT", handler.badRequestInvalidSubject)
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
     * Path: /itaas/admin/workspaces/flows/remove
     * Removes a Flowise flow from a BFF logical tenant.
     * Requires permission: admin.users.manage (platform admin role)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AdminRemoveItaasWorkspaceFlow(body: ItaasWorkspaceFlowBody): RequestParams<ItaasWorkspaceFlowSyncResult, AdminRemoveItaasWorkspaceFlowErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/admin/workspaces/flows/remove`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "FLOW_OP_BUSY", handler.status503FlowOpBusy)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_FLOW_ID", handler.badRequestInvalidFlowId)
                    .add(400, "INVALID_SUBJECT", handler.badRequestInvalidSubject)
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
 * Error handler for AdminListItaasFlows
 */
export type AdminListItaasFlowsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;
};

/**
 * Query parameters for AdminListItaasFlows
 */
export interface AdminListItaasFlowsQueryParameters {
    /**
     * Optional name filter forwarded to the BFF
     */
    q?: string;
}

/**
 * Error handler for AdminGetItaasFlow
 */
export type AdminGetItaasFlowErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;
};

/**
 * Error handler for AdminSetItaasFlowGraphVisibility
 */
export type AdminSetItaasFlowGraphVisibilityErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BODY
     */
    badRequestInvalidBody: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;
};

/**
 * Error handler for AdminSetItaasFlowsGraphVisibility
 */
export type AdminSetItaasFlowsGraphVisibilityErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BODY
     */
    badRequestInvalidBody: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for AdminLookupItaasFlowsGraphVisibility
 */
export type AdminLookupItaasFlowsGraphVisibilityErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BODY
     */
    badRequestInvalidBody: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for AdminListItaasWorkspaces
 */
export type AdminListItaasWorkspacesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;
};

/**
 * Error handler for AdminMakeItaasFlowGlobal
 */
export type AdminMakeItaasFlowGlobalErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = FLOW_GLOBAL_SYNC_FAILED
     */
    badRequestFlowGlobalSyncFailed: () => void;

    /**
     * Handler for status = 400 and code = FLOW_ALREADY_ASSIGNED
     */
    badRequestFlowAlreadyAssigned: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

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

/**
 * Error handler for AdminUnpublishItaasFlowGlobal
 */
export type AdminUnpublishItaasFlowGlobalErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

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

/**
 * Error handler for AdminAssignItaasWorkspaceFlow
 */
export type AdminAssignItaasWorkspaceFlowErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBJECT
     */
    badRequestInvalidSubject: () => void;

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
     * General handler for status = 403
     */
    forbidden: () => void;

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

/**
 * Error handler for AdminRemoveItaasWorkspaceFlow
 */
export type AdminRemoveItaasWorkspaceFlowErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBJECT
     */
    badRequestInvalidSubject: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

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

