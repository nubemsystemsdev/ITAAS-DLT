// API bindings: agents_admin (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl, generateURIQuery } from "./utils";
import { AgentAdminList, AgentCreateBody, AgentAdminItem, AgentUpdateBody } from "./definitions";

export class ApiAgentsAdmin {
    /**
     * Method: GET
     * Path: /admin/agents
     * Gets list of agents
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAgents(queryParams: GetAgentsQueryParameters): RequestParams<AgentAdminList, GetAgentsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/agents` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_IS_ACTIVE", handler.badRequestInvalidIsActive)
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
     * Path: /admin/agents
     * Creates an agent
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateAgent(body: AgentCreateBody): RequestParams<void, CreateAgentErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/agents`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
                    .add(400, "DUPLICATED_CODE", handler.badRequestDuplicatedCode)
                    .add(400, "INVALID_NUM_TOKENS", handler.badRequestInvalidNumTokens)
                    .add(400, "INVALID_PRICE", handler.badRequestInvalidPrice)
                    .add(400, "INVALID_CATEGORY", handler.badRequestInvalidCategory)
                    .add(400, "INVALID_TYPE", handler.badRequestInvalidType)
                    .add(400, "INVALID_DESCRIPTION", handler.badRequestInvalidDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
                    .add(400, "INVALID_CODE", handler.badRequestInvalidCode)
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
     * Path: /admin/agents/{id}
     * Gets details of an agent
     * Requires permission: admin.users.manage
     * @param id Agent ID
     * @returns The request parameters
     */
    public static GetAgent(id: string): RequestParams<AgentAdminItem, GetAgentErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/agents/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
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
     * Method: PUT
     * Path: /admin/agents/{id}
     * Updates an agent
     * Requires permission: admin.users.manage
     * @param id Agent ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateAgent(id: string, body: AgentUpdateBody): RequestParams<AgentAdminItem, UpdateAgentErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/admin/agents/${encodeURIComponent(id)}`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
                    .add(400, "DUPLICATED_CODE", handler.badRequestDuplicatedCode)
                    .add(400, "INVALID_NUM_TOKENS", handler.badRequestInvalidNumTokens)
                    .add(400, "INVALID_PRICE", handler.badRequestInvalidPrice)
                    .add(400, "INVALID_CATEGORY", handler.badRequestInvalidCategory)
                    .add(400, "INVALID_TYPE", handler.badRequestInvalidType)
                    .add(400, "INVALID_DESCRIPTION", handler.badRequestInvalidDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
                    .add(400, "INVALID_CODE", handler.badRequestInvalidCode)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /admin/agents/{id}
     * Deletes an agent
     * Requires permission: admin.users.manage
     * @param id Agent ID
     * @returns The request parameters
     */
    public static DeleteAgent(id: string): RequestParams<void, DeleteAgentErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/admin/agents/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
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
     * Path: /admin/agents/{id}/activate
     * Activates an agent
     * Requires permission: admin.users.manage
     * @param id Agent ID
     * @returns The request parameters
     */
    public static ActivateAgent(id: string): RequestParams<void, ActivateAgentErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/agents/${encodeURIComponent(id)}/activate`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
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
     * Path: /admin/agents/{id}/deactivate
     * Deactivates an agent
     * Requires permission: admin.users.manage
     * @param id Agent ID
     * @returns The request parameters
     */
    public static DeactivateAgent(id: string): RequestParams<void, DeactivateAgentErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/agents/${encodeURIComponent(id)}/deactivate`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for GetAgents
 */
export type GetAgentsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_IS_ACTIVE
     */
    badRequestInvalidIsActive: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetAgents
 */
export interface GetAgentsQueryParameters {
    /**
     * Search query. Can be id, code or name.
     */
    q?: string;

    /**
     * Type to filter by.
     */
    type?: string;

    /**
     * Category to filter by.
     */
    category?: string;

    /**
     * Filter by active status.
     */
    isActive?: boolean;

    /**
     * Page. Starting by 1.
     */
    page?: number;

    /**
     * Page size. Max 25.
     */
    pageSize?: number;
}

/**
 * Error handler for CreateAgent
 */
export type CreateAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CODE
     */
    badRequestInvalidCode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DESCRIPTION
     */
    badRequestInvalidDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TYPE
     */
    badRequestInvalidType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CATEGORY
     */
    badRequestInvalidCategory: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRICE
     */
    badRequestInvalidPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NUM_TOKENS
     */
    badRequestInvalidNumTokens: () => void;

    /**
     * Handler for status = 400 and code = DUPLICATED_CODE
     */
    badRequestDuplicatedCode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetAgent
 */
export type GetAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for UpdateAgent
 */
export type UpdateAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CODE
     */
    badRequestInvalidCode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DESCRIPTION
     */
    badRequestInvalidDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TYPE
     */
    badRequestInvalidType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CATEGORY
     */
    badRequestInvalidCategory: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRICE
     */
    badRequestInvalidPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NUM_TOKENS
     */
    badRequestInvalidNumTokens: () => void;

    /**
     * Handler for status = 400 and code = DUPLICATED_CODE
     */
    badRequestDuplicatedCode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for DeleteAgent
 */
export type DeleteAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for ActivateAgent
 */
export type ActivateAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for DeactivateAgent
 */
export type DeactivateAgentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

