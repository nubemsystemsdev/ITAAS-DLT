// API bindings: traceability (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { TraceEventIngestResponse, TraceEventIngestBody, TraceEventsPageResponse, TraceOverviewResponse, TokenTraceEventsPageResponse, AgentTraceEventsPageResponse, AgentTraceExecutionTimelineResponse } from "./definitions";

export class ApiTraceability {
    /**
     * Method: POST
     * Path: /trace/events
     * Ingest a traceability business event and anchor it on-chain.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static IngestTraceEvent(body: TraceEventIngestBody): RequestParams<TraceEventIngestResponse, IngestTraceEventErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/trace/events`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "TRACE_EVENT_REJECTED", handler.badRequestTraceEventRejected)
                    .add(400, "INVALID_EVENT_TYPE", handler.badRequestInvalidEventType)
                    .add(400, "INVALID_PAYLOAD", handler.badRequestInvalidPayload)
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
     * Path: /trace/events
     * Get traceability events visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetTraceEvents(queryParams: GetTraceEventsQueryParameters): RequestParams<TraceEventsPageResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/trace/events` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /trace/overview
     * Get combined traceability overview counts visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * @returns The request parameters
     */
    public static GetTraceOverview(): RequestParams<TraceOverviewResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/trace/overview`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /trace/token-events
     * Get token trace events visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetTokenTraceEvents(queryParams: GetTokenTraceEventsQueryParameters): RequestParams<TokenTraceEventsPageResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/trace/token-events` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /trace/agent-events
     * Get agent trace events visible to the caller (Flowise / BFF execution audit).
     * Non-admin users need an active personal ITAAS subscription or an assigned org ITAAS license.
     * Personal users see their own events (actor = Keycloak sub); org-licensed users see their organization's events.
     * Requires permission: admin.users.manage to see all events
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAgentTraceEvents(queryParams: GetAgentTraceEventsQueryParameters): RequestParams<AgentTraceEventsPageResponse, GetAgentTraceEventsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/trace/agent-events` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_TIME_RANGE", handler.badRequestInvalidTimeRange)
                    .add(400, "INVALID_EVENT_TYPE", handler.badRequestInvalidEventType)
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
     * Path: /trace/agent-events/by-execution/{executionId}
     * Get the timeline of agent trace events for one Flowise / BFF execution.
     * Non-admin users need an active personal ITAAS subscription or an assigned org ITAAS license.
     * Personal users see their own events (actor = Keycloak sub); org-licensed users see their organization's events.
     * Requires permission: admin.users.manage to see all events
     * Timeline is capped (oldest first); use list filters for large executions.
     * @param executionId Execution identifier
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAgentTraceEventsByExecution(executionId: string, queryParams: GetAgentTraceEventsByExecutionQueryParameters): RequestParams<AgentTraceExecutionTimelineResponse, GetAgentTraceEventsByExecutionErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/trace/agent-events/by-execution/${encodeURIComponent(executionId)}` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "EXECUTION_NOT_FOUND", handler.notFoundExecutionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_EXECUTION_ID", handler.badRequestInvalidExecutionId)
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
 * Error handler for IngestTraceEvent
 */
export type IngestTraceEventErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PAYLOAD
     */
    badRequestInvalidPayload: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EVENT_TYPE
     */
    badRequestInvalidEventType: () => void;

    /**
     * Handler for status = 400 and code = TRACE_EVENT_REJECTED
     */
    badRequestTraceEventRejected: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetTraceEvents
 */
export interface GetTraceEventsQueryParameters {
    /**
     * Page number (starting by 1)
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;

    /**
     * Optional domain filter (e.g. organization, subscription)
     */
    domain?: string;
}

/**
 * Query parameters for GetTokenTraceEvents
 */
export interface GetTokenTraceEventsQueryParameters {
    /**
     * Page number (starting by 1)
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for GetAgentTraceEvents
 */
export type GetAgentTraceEventsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EVENT_TYPE
     */
    badRequestInvalidEventType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TIME_RANGE
     */
    badRequestInvalidTimeRange: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;
};

/**
 * Query parameters for GetAgentTraceEvents
 */
export interface GetAgentTraceEventsQueryParameters {
    /**
     * Page number (starting by 1)
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;

    /**
     * Optional flow identifier filter
     */
    flowId?: string;

    /**
     * Optional execution identifier filter
     */
    executionId?: string;

    /**
     * Optional organization / tenant filter
     */
    organizationId?: string;

    /**
     * Optional canonical event type filter (comma-separated for multiple types)
     */
    eventType?: string;

    /**
     * Optional lower bound on createdAt (epoch ms)
     */
    since?: number;

    /**
     * Optional upper bound on createdAt (epoch ms)
     */
    until?: number;
}

/**
 * Error handler for GetAgentTraceEventsByExecution
 */
export type GetAgentTraceEventsByExecutionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EXECUTION_ID
     */
    badRequestInvalidExecutionId: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = EXECUTION_NOT_FOUND
     */
    notFoundExecutionNotFound: () => void;
};

/**
 * Query parameters for GetAgentTraceEventsByExecution
 */
export interface GetAgentTraceEventsByExecutionQueryParameters {
    /**
     * Optional flow identifier (cross-check)
     */
    flowId?: string;
}

