// Reserved for license

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { parsePageParameters } from "../../utils/api-utils";
import { secureStringCompare } from "../../utils/text-utils";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { AgentTraceabilityService } from "../../services/agent-traceability-service";
import { isAgentTraceEventType } from "../../models/agent-trace-event";
import { TraceabilityEvent, TraceabilityDomain } from "../../models/traceability-event";
import { TokenTraceability } from "../../models/token-traceability";
import { Monitor } from "../../monitor";

/**
 * Traceability API
 * @group traceability
 */
export class TraceabilityController extends Controller {
    private static readonly TRACE_EVENTS_PAGE_LIMIT = 25;

    public registerAPI(prefix: string, application: Express.Express): any {
        application.post(prefix + "/trace/events", ensureObjectBody(this.ingestTraceEvent.bind(this)));
        application.get(prefix + "/trace/events", noCache(this.getTraceEvents.bind(this)));
        application.get(prefix + "/trace/overview", noCache(this.getTraceOverview.bind(this)));
        application.get(prefix + "/trace/token-events", noCache(this.getTokenTraceEvents.bind(this)));
        application.get(prefix + "/trace/agent-events/by-execution/:executionId", noCache(this.getAgentTraceEventsByExecution.bind(this)));
        application.get(prefix + "/trace/agent-events", noCache(this.getAgentTraceEvents.bind(this)));
    }

    /**
     * @typedef TraceEventIngestBody
     * @property {string} eventId.required - Event identifier (UUID or bytes32)
     * @property {string} organizationId - Organization / tenant identifier
     * @property {string} actor.required - Actor Keycloak subject (`sub`); alias: userSub
     * @property {string} userSub - Alias of actor (Keycloak subject)
     * @property {string} flowId - Flow / agent flow identifier
     * @property {string} executionId - Execution identifier
     * @property {string} event_type.required - Canonical business event type
     * @property {string} status - Execution status (`success` or `error`)
     * @property {number} startedAt - Execution start timestamp in ms
     * @property {number} finishedAt - Execution finish timestamp in ms
     * @property {string} output - Execution output / result payload
     */

    /**
     * @typedef TraceEventIngestResponse
     * @property {boolean} accepted.required - True if event was accepted
     * @property {boolean} duplicated.required - True if event was duplicated
     * @property {string} event_id.required - Event identifier
     * @property {string} event_type.required - Event type
     * @property {string} actor.required - Actor identifier
     * @property {string} tx_hash.required - Blockchain transaction hash
     * @property {number} anchored_at.required - On-chain anchor timestamp
     */

    /**
     * Ingest a traceability business event and anchor it on-chain.
     * Binding: IngestTraceEvent
     * @route POST /trace/events
     * @group traceability
     * @param {TraceEventIngestBody.model} request.body - Event payload
     * @returns {TraceEventIngestResponse.model} 200 - Ingested and anchored event
     * @returns {void} 400 - Bad request: INVALID_PAYLOAD, INVALID_EVENT_TYPE, TRACE_EVENT_REJECTED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async ingestTraceEvent(request: Express.Request, response: Express.Response) {
        const ingestKeyConfigured = ((process.env.TRACE_INGEST_API_KEY || "") + "").trim();
        const ingestKeyHeader = ((request.headers["x-trace-ingest-key"] || "") + "").trim();

        let authorizedByIngestKey = false;

        if (ingestKeyConfigured) {
            authorizedByIngestKey = secureStringCompare(ingestKeyHeader, ingestKeyConfigured);
        }

        if (!authorizedByIngestKey) {
            const auth = await UsersService.getInstance().auth(request);

            if (!auth.isRegisteredUser()) {
                sendUnauthorized(request, response);
                return;
            }

            if (!auth.hasPermission("admin.users.manage")) {
                sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Missing permission admin.users.manage");
                return;
            }
        }

        const body = request.body || {};
        const eventId = ((body.eventId || body.event_id || "") + "").trim();
        const actor = ((body.actor || body.userSub || "") + "").trim();
        const status = ((body.status || "") + "").trim().toLowerCase();
        let eventType = ((body.event_type || body.eventType || "") + "").trim();

        if (!eventType && status === "success") {
            eventType = "execution.completed";
        } else if (!eventType && status === "error") {
            eventType = "execution.stopped.error";
        }

        const startedAt = Number(body.startedAt || 0);
        const finishedAt = Number(body.finishedAt || 0);
        const occurredAt = finishedAt > 0 ? finishedAt : startedAt;

        if (!eventId || !eventType || !actor || !Number.isFinite(occurredAt) || occurredAt <= 0) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_PAYLOAD",
                "eventId, event_type (or status), actor (or userSub) and startedAt or finishedAt are required. Timestamps must be positive epoch milliseconds",
            );
            return;
        }

        if (!isAgentTraceEventType(eventType)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_EVENT_TYPE",
                "event_type is not supported",
            );
            return;
        }

        const organizationId = ((body.organizationId || "") + "").trim();
        const flowId = ((body.flowId || "") + "").trim();
        const executionId = ((body.executionId || "") + "").trim();
        const output = body.output === undefined || body.output === null ? "" : (body.output + "");

        try {
            const result = await AgentTraceabilityService.getInstance().ingestAndAnchor({
                eventId,
                organizationId,
                actor,
                flowId,
                executionId,
                eventType,
                status,
                startedAt: startedAt > 0 ? startedAt : undefined,
                finishedAt: finishedAt > 0 ? finishedAt : undefined,
                output,
            });

            sendApiResult(request, response, {
                accepted: true,
                duplicated: result.duplicated,
                event_id: result.stored.eventId,
                event_type: result.stored.eventType,
                actor: result.stored.actor,
                tx_hash: result.stored.txHash,
                anchored_at: result.stored.anchoredAt,
            });
        } catch (ex) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "TRACE_EVENT_REJECTED",
                ex instanceof Error ? ex.message : "Could not ingest trace event",
            );
        }
    }

    /**
     * @typedef TraceEventItem
     * @property {string} id.required - Trace row identifier
     * @property {string} eventId.required - Event identifier
     * @property {string} eventType.required - Event type
     * @property {string} domain.required - Event domain
     * @property {string} subjectId.required - Subject identifier
     * @property {string} correlationId.required - Correlation identifier
     * @property {string} actorIdHash.required - Actor identifier hash
     * @property {string} payloadHash.required - Payload hash
     * @property {string} payloadJson.required - Serialized payload
     * @property {number} occurredAt.required - Event timestamp
     * @property {number} emittedAt.required - Emitted timestamp
     * @property {string} status.required - Trace status
     * @property {string} txHash.required - Blockchain transaction hash
     * @property {number} blockNumber.required - Blockchain block number
     * @property {number} retries.required - Retry count
     * @property {string} errorMessage.required - Error message
     * @property {number} createdAt.required - Creation timestamp
     * @property {number} updatedAt.required - Update timestamp
     */

    /**
     * @typedef TokenTraceEventItem
     * @property {string} id.required - Trace row identifier
     * @property {string} operationId.required - Operation identifier
     * @property {string} actionKind.required - Token action kind
     * @property {string} walletId.required - Wallet identifier
     * @property {string} scopeType.required - Scope type
     * @property {string} scopeId.required - Scope identifier
     * @property {string} actorUid.required - Actor user identifier
     * @property {string} paymentId.required - Payment identifier
     * @property {string} checkoutSessionId.required - Checkout session identifier
     * @property {number} amountTokens.required - Token amount
     * @property {number} amountEurCents.required - Amount in euro cents
     * @property {string} payloadHash.required - Payload hash
     * @property {string} chainName.required - Chain name
     * @property {string} txHash.required - Blockchain transaction hash
     * @property {string} status.required - Trace status
     * @property {number} retries.required - Retry count
     * @property {string} errorMessage.required - Error message
     * @property {string} payloadJson.required - Serialized payload
     * @property {number} createdAt.required - Creation timestamp
     * @property {number} updatedAt.required - Update timestamp
     */

    /**
     * @typedef AgentTraceEventItem
     * @property {string} id.required - Trace row identifier
     * @property {string} eventId.required - Event identifier
     * @property {string} organizationId.required - Organization / tenant identifier
     * @property {string} actor.required - Actor Keycloak subject
     * @property {string} flowId.required - Flow / agent flow identifier
     * @property {string} executionId.required - Execution identifier
     * @property {string} eventType.required - Event type
     * @property {string} status.required - Execution status
     * @property {number} startedAt.required - Execution start timestamp in ms
     * @property {number} finishedAt.required - Execution finish timestamp in ms
     * @property {number} occurredAt.required - Effective occurrence timestamp (`finishedAt` or `startedAt`)
     * @property {string} output.required - Execution output / result payload
     * @property {number} anchoredAt.required - On-chain anchor timestamp
     * @property {string} txHash.required - Blockchain transaction hash
     * @property {number} createdAt.required - Creation timestamp
     * @property {number} updatedAt.required - Update timestamp
     */

    /**
     * @typedef TraceEventsPageResponse
     * @property {Array.<TraceEventItem>} traceability_events.required - Subscription/catalog traceability events
     * @property {number} total.required - Total number of traceability events
     * @property {number} totalPages.required - Total number of pages
     * @property {number} page.required - Current page number
     * @property {number} pageSize.required - Items per page
     */

    /**
     * @typedef TokenTraceEventsPageResponse
     * @property {Array.<TokenTraceEventItem>} token_traceability_events.required - Token traceability events
     * @property {number} total.required - Total number of token traceability events
     * @property {number} totalPages.required - Total number of pages
     * @property {number} page.required - Current page number
     * @property {number} pageSize.required - Items per page
     */

    /**
     * @typedef AgentTraceEventsPageResponse
     * @property {Array.<AgentTraceEventItem>} agent_trace_events.required - Agent trace events
     * @property {number} total.required - Total number of agent trace events
     * @property {number} totalPages.required - Total number of pages
     * @property {number} page.required - Current page number
     * @property {number} pageSize.required - Items per page
     */

    /**
     * @typedef AgentTraceExecutionTimelineResponse
     * @property {string} execution_id.required - Execution identifier
     * @property {string} flow_id.required - Flow / agent flow identifier
     * @property {Array.<AgentTraceEventItem>} events.required - Timeline events (oldest first)
     * @property {number} total.required - Number of events in the timeline
     */

    /**
     * @typedef TraceOverviewResponse
     * @property {number} total.required - Combined total events across general, token and agent traceability (organization is a subset of general)
     * @property {number} confirmed.required - Combined events anchored on-chain
     * @property {number} pending.required - Combined events waiting for on-chain confirmation
     * @property {number} failed.required - Combined events that failed anchoring
     * @property {number} generalTotal.required - General traceability total (all domains)
     * @property {number} organizationTotal.required - Organization-domain traceability total
     * @property {number} tokenTotal.required - Token traceability total
     * @property {number} agentTotal.required - Agent trace events total
     */

    /**
     * Get combined traceability overview counts visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * Binding: GetTraceOverview
     * @route GET /trace/overview
     * @group traceability
     * @returns {TraceOverviewResponse.model} 200 - Combined traceability overview counts
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getTraceOverview(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.hasPermission("admin.users.manage") && auth.user.role === ADMIN_ROLE;

        const generalTotal = isAdmin
            ? await TraceabilityEvent.countAll()
            : await TraceabilityEvent.countByUid(auth.user.id);
        const organizationTotal = isAdmin
            ? await TraceabilityEvent.countAll(TraceabilityDomain.ORGANIZATION)
            : await TraceabilityEvent.countByUid(auth.user.id, TraceabilityDomain.ORGANIZATION);
        const traceStatusCounts = isAdmin
            ? await TraceabilityEvent.countByStatusForAdmin()
            : await TraceabilityEvent.countByStatusForUid(auth.user.id);

        const tokenTotal = isAdmin
            ? await TokenTraceability.countAll()
            : await TokenTraceability.countByUid(auth.user.id);
        const tokenStatusCounts = isAdmin
            ? await TokenTraceability.countByStatusForAdmin()
            : await TokenTraceability.countByStatusForUid(auth.user.id);

        let agentTotal = 0;
        let agentConfirmed = 0;
        let agentPending = 0;
        try {
            const agentCounts = await AgentTraceabilityService.getInstance().getAgentTraceOverviewCounts({
                isAdmin,
                userId: auth.user.id,
                keycloakSub: auth.user.keycloakSub,
            });
            agentTotal = agentCounts.total;
            agentConfirmed = agentCounts.anchored;
            agentPending = agentCounts.unanchored;
        } catch (ex) {
            const code = ex instanceof Error ? ex.message : "";
            // Non-admin callers without ITAAS entitlement have no agent trace access: report 0.
            if (code !== "ITAAS_ACCESS_REQUIRED") {
                if (ex instanceof Error) {
                    Monitor.exception(ex);
                } else {
                    Monitor.error("[AGENT_TRACE] Unexpected error reading agent trace total for overview");
                }
                throw ex;
            }
        }

        sendApiResult(request, response, {
            total: generalTotal + tokenTotal + agentTotal,
            confirmed: traceStatusCounts.confirmed + tokenStatusCounts.sent + agentConfirmed,
            pending: traceStatusCounts.pending + traceStatusCounts.sent + tokenStatusCounts.pending + agentPending,
            failed: traceStatusCounts.failed + tokenStatusCounts.failed,
            generalTotal,
            organizationTotal,
            tokenTotal,
            agentTotal,
        });
    }

    /**
     * Get traceability events visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * Binding: GetTraceEvents
     * @route GET /trace/events
     * @group traceability
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @param {string} domain.query - Optional domain filter (e.g. organization, subscription)
     * @returns {TraceEventsPageResponse.model} 200 - Traceability events grouped by source
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getTraceEvents(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.hasPermission("admin.users.manage") && auth.user.role === ADMIN_ROLE;
        const domain = typeof request.query.domain === "string" ? request.query.domain.trim() : "";
        const domainFilter = domain && TraceabilityEvent.isTraceabilityDomain(domain) ? domain : undefined;

        const total = isAdmin
            ? await TraceabilityEvent.countAll(domainFilter)
            : await TraceabilityEvent.countByUid(auth.user.id, domainFilter);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, TraceabilityController.TRACE_EVENTS_PAGE_LIMIT);
        const traceabilityEvents = isAdmin
            ? await TraceabilityEvent.findAllPaginated(skip, pageSize, domainFilter)
            : await TraceabilityEvent.findByUidPaginated(auth.user.id, skip, pageSize, domainFilter);

        sendApiResult(request, response, {
            traceability_events: traceabilityEvents.map(event => event.toObject()),
            total,
            totalPages,
            page,
            pageSize,
        });
    }

    /**
     * Get token trace events visible to the caller.
     * Requires permission: admin.users.manage to see all events
     * Binding: GetTokenTraceEvents
     * @route GET /trace/token-events
     * @group traceability
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {TokenTraceEventsPageResponse.model} 200 - Token trace events grouped by source
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getTokenTraceEvents(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.hasPermission("admin.users.manage") && auth.user.role === ADMIN_ROLE;

        const total = isAdmin ? await TokenTraceability.countAll() : await TokenTraceability.countByUid(auth.user.id);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, TraceabilityController.TRACE_EVENTS_PAGE_LIMIT);
        const tokenTraceabilityEvents = isAdmin
            ? await TokenTraceability.findAllPaginated(skip, pageSize)
            : await TokenTraceability.findByUidPaginated(auth.user.id, skip, pageSize);

        sendApiResult(request, response, {
            token_traceability_events: tokenTraceabilityEvents.map(event => event.toObject()),
            total,
            totalPages,
            page,
            pageSize,
        });
    }

    /**
     * Get agent trace events visible to the caller (Flowise / BFF execution audit).
     * Non-admin users need an active personal ITAAS subscription or an assigned org ITAAS license.
     * Personal users see their own events (actor = Keycloak sub); org-licensed users see their organization's events.
     * Requires permission: admin.users.manage to see all events
     * Binding: GetAgentTraceEvents
     * @route GET /trace/agent-events
     * @group traceability
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @param {string} flowId.query - Optional flow identifier filter
     * @param {string} executionId.query - Optional execution identifier filter
     * @param {string} organizationId.query - Optional organization / tenant filter
     * @param {string} eventType.query - Optional canonical event type filter (comma-separated for multiple types)
     * @param {number} since.query - Optional lower bound on createdAt (epoch ms)
     * @param {number} until.query - Optional upper bound on createdAt (epoch ms)
     * @returns {AgentTraceEventsPageResponse.model} 200 - Agent trace events page
     * @returns {void} 400 - Bad request: INVALID_EVENT_TYPE, INVALID_TIME_RANGE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED
     * @returns {void} 500 - Unexpected server error
     * @security AuthToken
     */
    public async getAgentTraceEvents(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.hasPermission("admin.users.manage") && auth.user.role === ADMIN_ROLE;
        const page = Number.parseInt((request.query.page as string) || "1", 10) || 1;
        const pageSize = Number.parseInt((request.query.pageSize as string) || "", 10) || TraceabilityController.TRACE_EVENTS_PAGE_LIMIT;
        const sinceRaw = request.query.since;
        const untilRaw = request.query.until;
        const since = sinceRaw === undefined || sinceRaw === null || sinceRaw === ""
            ? undefined
            : Number(sinceRaw);
        const until = untilRaw === undefined || untilRaw === null || untilRaw === ""
            ? undefined
            : Number(untilRaw);

        try {
            const result = await AgentTraceabilityService.getInstance().listAgentTraceEvents(
                {
                    isAdmin,
                    userId: auth.user.id,
                    keycloakSub: auth.user.keycloakSub,
                },
                {
                    flowId: typeof request.query.flowId === "string" ? request.query.flowId : "",
                    executionId: typeof request.query.executionId === "string" ? request.query.executionId : "",
                    organizationId: typeof request.query.organizationId === "string" ? request.query.organizationId : "",
                    eventType: typeof request.query.eventType === "string" ? request.query.eventType : "",
                    since,
                    until,
                },
                {
                    page,
                    pageSize,
                    pageLimit: TraceabilityController.TRACE_EVENTS_PAGE_LIMIT,
                },
            );

            sendApiResult(request, response, {
                agent_trace_events: result.events,
                total: result.total,
                totalPages: result.totalPages,
                page: result.page,
                pageSize: result.pageSize,
            });
        } catch (ex) {
            const code = ex instanceof Error ? ex.message : "";
            if (code === "ITAAS_ACCESS_REQUIRED") {
                sendApiError(
                    request,
                    response,
                    FORBIDDEN,
                    "ITAAS_ACCESS_REQUIRED",
                    "Active ITAAS subscription or assigned organization license is required",
                );
                return;
            }
            if (code === "INVALID_EVENT_TYPE" || code === "INVALID_TIME_RANGE") {
                sendApiError(request, response, BAD_REQUEST, code, code === "INVALID_EVENT_TYPE"
                    ? "eventType is not supported"
                    : "since/until must be non-negative epoch milliseconds and since must be <= until");
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            } else {
                Monitor.error("[AGENT_TRACE] Unexpected error listing agent trace events");
            }
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "",
                "Could not list agent trace events",
            );
        }
    }

    /**
     * Get the timeline of agent trace events for one Flowise / BFF execution.
     * Non-admin users need an active personal ITAAS subscription or an assigned org ITAAS license.
     * Personal users see their own events (actor = Keycloak sub); org-licensed users see their organization's events.
     * Requires permission: admin.users.manage to see all events
     * Timeline is capped (oldest first); use list filters for large executions.
     * Binding: GetAgentTraceEventsByExecution
     * @route GET /trace/agent-events/by-execution/{executionId}
     * @group traceability
     * @param {string} executionId.path.required - Execution identifier
     * @param {string} flowId.query - Optional flow identifier (cross-check)
     * @returns {AgentTraceExecutionTimelineResponse.model} 200 - Execution timeline
     * @returns {void} 400 - Bad request: INVALID_EXECUTION_ID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED
     * @returns {void} 404 - Not found: EXECUTION_NOT_FOUND
     * @returns {void} 500 - Unexpected server error
     * @security AuthToken
     */
    public async getAgentTraceEventsByExecution(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.hasPermission("admin.users.manage") && auth.user.role === ADMIN_ROLE;
        const executionId = ((request.params.executionId || "") + "").trim();
        const flowId = typeof request.query.flowId === "string" ? request.query.flowId : "";

        try {
            const timeline = await AgentTraceabilityService.getInstance().getExecutionTimeline(
                {
                    isAdmin,
                    userId: auth.user.id,
                    keycloakSub: auth.user.keycloakSub,
                },
                executionId,
                { flowId },
            );

            if (!timeline) {
                sendApiError(request, response, NOT_FOUND, "EXECUTION_NOT_FOUND", "Execution not found");
                return;
            }

            sendApiResult(request, response, timeline);
        } catch (ex) {
            const code = ex instanceof Error ? ex.message : "";
            if (code === "ITAAS_ACCESS_REQUIRED") {
                sendApiError(
                    request,
                    response,
                    FORBIDDEN,
                    "ITAAS_ACCESS_REQUIRED",
                    "Active ITAAS subscription or assigned organization license is required",
                );
                return;
            }
            if (code === "INVALID_EXECUTION_ID") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_EXECUTION_ID", "executionId is required");
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            } else {
                Monitor.error("[AGENT_TRACE] Unexpected error loading execution timeline");
            }
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "",
                "Could not load execution timeline",
            );
        }
    }

}
