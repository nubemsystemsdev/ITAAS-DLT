"use strict";

import Express from "express";
import { Controller } from "../controller";
import { ItaasFlowFavorite } from "../../models/itaas-flow-favorite";
import { ItaasFlowsService } from "../../services/itaas-flows-service";
import { ItaasPlatformService } from "../../services/itaas-platform-service";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, INTERNAL_SERVER_ERROR, noCache, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { sendItaasFlowsServiceError } from "../../utils/itaas-flows-api-errors";
import { Monitor } from "../../monitor";

/**
 * ITAAS flows proxy API (Marketplace → BFF /api/flows*)
 * @group itaas_flows
 */
export class ItaasFlowsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/itaas/flows", noCache(this.listAllFlows.bind(this)));
        application.get(prefix + "/itaas/flows/global", noCache(this.listGlobalFlows.bind(this)));
        application.get(prefix + "/itaas/flows/tenant", noCache(this.listTenantFlows.bind(this)));
        application.get(prefix + "/itaas/credentials", noCache(this.listWorkspaceCredentials.bind(this)));
        application.post(prefix + "/itaas/credentials", ensureObjectBody(this.createWorkspaceCredential.bind(this)));
        application.get(prefix + "/itaas/flows/favorites", noCache(this.listFlowFavorites.bind(this)));
        application.get(prefix + "/itaas/flows/:flowId", noCache(this.getFlow.bind(this)));
        application.post(prefix + "/itaas/flows/:flowId/run", ensureObjectBody(this.runFlow.bind(this)));
        application.get(prefix + "/itaas/flows/:flowId/credentials", noCache(this.getCredentials.bind(this)));
        application.post(prefix + "/itaas/flows/:flowId/credentials", ensureObjectBody(this.storeCredentials.bind(this)));
        application.delete(prefix + "/itaas/flows/:flowId/credentials/:credentialId", this.disconnectCredential.bind(this));
        application.post(prefix + "/itaas/flows/:flowId/favorite", ensureObjectBody(this.addFlowFavorite.bind(this)));
        application.delete(prefix + "/itaas/flows/:flowId/favorite", this.removeFlowFavorite.bind(this));
    }

    /**
     * @typedef ItaasFlowSummary
     * @property {string} id.required - Flow ID
     * @property {string} name.required - Flow name
     * @property {boolean} deployed.required - Whether the flow is deployed
     * @property {string} type - Flowise flow type when present
     * @property {string} category - Flow category when present
     * @property {string} updatedAt - Last update timestamp
     */

    /**
     * @typedef ItaasFlowGraphNode
     * @property {string} id.required - Node ID
     * @property {string} label.required - Display label
     * @property {number} x.required - Canvas X position
     * @property {number} y.required - Canvas Y position
     */

    /**
     * @typedef ItaasFlowGraphEdge
     * @property {string} id.required - Edge ID
     * @property {string} source.required - Source node ID
     * @property {string} target.required - Target node ID
     */

    /**
     * @typedef ItaasFlowGraph
     * @property {Array.<ItaasFlowGraphNode>} nodes.required - Sanitized preview nodes
     * @property {Array.<ItaasFlowGraphEdge>} edges.required - Sanitized preview edges
     */

    /**
     * @typedef ItaasFlowDetail
     * @property {string} id.required - Flow ID
     * @property {string} name.required - Flow name
     * @property {boolean} deployed.required - Whether the flow is deployed
     * @property {string} type - Flowise flow type when present
     * @property {string} category - Flow category when present
     * @property {string} createdAt - Creation timestamp when present
     * @property {string} updatedAt - Last update timestamp
     * @property {ItaasFlowGraph.model} graph - Sanitized node/edge preview when present
     */

    /**
     * @typedef ItaasFlowsListResponse
     * @property {string} workspaceId.required - BFF workspace id for the tenant
     * @property {Array.<ItaasFlowSummary>} flows.required - Flows for the requested scope
     */

    /**
     * @typedef ItaasRunFlowBody
     * @property {string} question - Optional user question / prompt
     * @property {object} overrideConfig - Optional Flowise overrideConfig
     */

    /**
     * @typedef ItaasRunFlowResult
     * @property {string} text - Textual output when present
     * @property {object} json - Structured output when present
     * @property {object} raw.required - Raw BFF/Flowise payload
     */

    /**
     * @typedef ItaasCredentialField
     * @property {string} name.required - Field name
     * @property {string} label.required - Field label
     * @property {string} type.required - Field type
     */

    /**
     * @typedef ItaasCredentialAvailable
     * @property {string} id.required - Existing credential ID
     * @property {string} name.required - Existing credential name
     */

    /**
     * @typedef ItaasCredentialRequirement
     * @property {string} credentialType.required - Credential type key
     * @property {string} label.required - Human-readable label
     * @property {Array.<ItaasCredentialField>} fields.required - Input fields for the credential form
     * @property {boolean} assigned.required - Whether a credential is already assigned
     * @property {string} credentialId - Assigned credential ID when present
     * @property {Array.<string>} nodeIds.required - Node IDs that need this credential
     * @property {Array.<ItaasCredentialAvailable>} available.required - Reusable credentials of this type
     */

    /**
     * @typedef ItaasFlowCredentialsResponse
     * @property {string} flowId.required - Flow ID
     * @property {Array.<ItaasCredentialRequirement>} requirements.required - Credential requirements
     */

    /**
     * @typedef ItaasStoreCredentialBody
     * @property {string} credentialType.required - Credential type key
     * @property {string} name - Name when creating or overwriting a credential
     * @property {object} data - Secret field values when creating or overwriting a credential
     * @property {string} credentialId - Existing credential ID when reusing or overwriting
     */

    /**
     * @typedef ItaasStoreCredentialResult
     * @property {string} credentialId.required - Created or reused credential ID
     * @property {boolean} assigned.required - Whether it was assigned to flow nodes
     * @property {boolean} reused.required - Whether an existing credential was reused
     * @property {Array.<string>} nodeIds.required - Node IDs that received the credential
     */

    /**
     * @typedef ItaasCreateCredentialBody
     * @property {string} credentialType.required - Credential type key
     * @property {string} name.required - Display name
     * @property {object} data.required - Secret field values
     */

    /**
     * @typedef ItaasCreateCredentialResult
     * @property {string} credentialId.required - Created credential ID
     * @property {string} credentialType.required - Credential type key
     * @property {string} name.required - Display name
     * @property {boolean} assigned.required - Whether the BFF reports the credential as assigned
     */

    /**
     * @typedef ItaasWorkspaceCredential
     * @property {string} id.required - Credential ID
     * @property {string} name.required - Display name
     * @property {string} credentialType.required - Credential type key
     * @property {string} label.required - Human-readable type label
     * @property {Array.<ItaasCredentialField>} fields.required - Input fields for overwrite/rename
     * @property {string} hostFlowId.required - Flow used as store/update host
     * @property {Array.<string>} assignedFlowIds.required - Flow IDs currently using this credential
     */

    /**
     * @typedef ItaasWorkspaceCredentialType
     * @property {string} credentialType.required - Credential type key declared by a flow
     * @property {string} label.required - Human-readable type label
     * @property {Array.<ItaasCredentialField>} fields.required - Fields needed to create a credential; empty when schemas conflict
     * @property {boolean} schemaConflict.required - Whether accessible flows disagree on the fields for this type
     */

    /**
     * @typedef ItaasWorkspaceCredentialsResponse
     * @property {string} workspaceId.required - BFF workspace id for the tenant
     * @property {Array.<ItaasFlowSummary>} flows.required - Tenant and global flows
     * @property {Array.<ItaasWorkspaceCredential>} credentials.required - Deduplicated workspace credentials
     * @property {Array.<ItaasWorkspaceCredentialType>} credentialTypes.required - Types required by accessible flows, including types without saved credentials
     */

    /**
     * @typedef ItaasFlowFavoriteItem
     * @property {string} flowId.required - Favorited flow ID
     * @property {number} createdAt.required - Favorite creation timestamp (Unix ms)
     */

    /**
     * @typedef ItaasFlowFavoritesListResponse
     * @property {Array.<ItaasFlowFavoriteItem>} favorites.required - Favorites for the authenticated user
     * @property {number} total.required - Total favorites count
     */

    /**
     * Lists Flowise flows accessible to the tenant (BFF scope=all: tenant + global).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: ListItaasFlows
     * @route GET /itaas/flows
     * @group itaas_flows
     * @returns {ItaasFlowsListResponse.model} 200 - Tenant and global flows
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async listAllFlows(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().listAllFlows(auth.session);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list flows");
        }
    }

    /**
     * Lists global/public Flowise flows via the BFF (scope=global).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: ListItaasGlobalFlows
     * @route GET /itaas/flows/global
     * @group itaas_flows
     * @returns {ItaasFlowsListResponse.model} 200 - Global flows
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async listGlobalFlows(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().listGlobalFlows(auth.session);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list global flows");
        }
    }

    /**
     * Lists Flowise flows assigned to the authenticated ITAAS tenant via the BFF (scope=tenant).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: ListItaasTenantFlows
     * @route GET /itaas/flows/tenant
     * @group itaas_flows
     * @returns {ItaasFlowsListResponse.model} 200 - Tenant flows
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async listTenantFlows(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().listTenantFlows(auth.session);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list tenant flows");
        }
    }

    /**
     * Lists saved workspace credentials by merging tenant and global flows (BFF scope=all).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: ListItaasWorkspaceCredentials
     * @route GET /itaas/credentials
     * @group itaas_flows
     * @returns {ItaasWorkspaceCredentialsResponse.model} 200 - Workspace credential catalog
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async listWorkspaceCredentials(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().listWorkspaceCredentials(auth.session);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list workspace credentials");
        }
    }

    /**
     * Creates a workspace credential without assigning it to a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: CreateItaasWorkspaceCredential
     * @route POST /itaas/credentials
     * @group itaas_flows
     * @param {ItaasCreateCredentialBody.model} request.body.required - Create credential payload
     * @returns {ItaasCreateCredentialResult.model} 200 - Credential created
     * @returns {void} 400 - Bad request: INVALID_CREDENTIAL_BODY, BFF_BAD_REQUEST
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async createWorkspaceCredential(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const credentialType = typeof body.credentialType === "string" ? body.credentialType : "";
        const name = typeof body.name === "string" ? body.name : "";
        const data = (body.data && typeof body.data === "object" && !Array.isArray(body.data))
            ? body.data as Record<string, unknown>
            : undefined;

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().createCredential(auth.session, {
                credentialType,
                name,
                data: data || {},
            });
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not create workspace credential");
        }
    }

    /**
     * Returns public flow detail via the BFF (no flowData).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: GetItaasFlow
     * @route GET /itaas/flows/{flowId}
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @returns {ItaasFlowDetail.model} 200 - Flow detail
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, BFF_BAD_REQUEST, FLOW_INVALID
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async getFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().getFlow(auth.session, flowId);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load flow");
        }
    }

    /**
     * Runs a Flowise flow through the BFF for the authenticated ITAAS tenant.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: RunItaasFlow
     * @route POST /itaas/flows/{flowId}/run
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @param {ItaasRunFlowBody.model} request.body.required - Run payload
     * @returns {ItaasRunFlowResult.model} 200 - Flow run result
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, INVALID_QUESTION, BFF_BAD_REQUEST, FLOW_INVALID, CREDENTIAL_MISSING, CREDENTIAL_UNRESOLVED, CREDENTIAL_INVALID
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND
     * @returns {void} 409 - Conflict: FLOW_NOT_DEPLOYED
     * @returns {void} 422 - Unprocessable entity: EXECUTION_FAILED
     * @returns {void} 429 - Too many requests: LLM_RATE_LIMITED
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, LLM_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async runFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";
        const body = (request.body || {}) as Record<string, unknown>;
        const runBody: { question?: string; overrideConfig?: Record<string, unknown> } = {};
        if (body.question !== undefined) {
            if (typeof body.question !== "string") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_QUESTION", "Invalid question");
                return;
            }
            runBody.question = body.question;
        }
        if (body.overrideConfig && typeof body.overrideConfig === "object") {
            runBody.overrideConfig = body.overrideConfig as Record<string, unknown>;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().runFlow(auth.session, flowId, runBody);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not run flow");
        }
    }

    /**
     * Returns credential requirements for a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: GetItaasFlowCredentials
     * @route GET /itaas/flows/{flowId}/credentials
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @returns {ItaasFlowCredentialsResponse.model} 200 - Credential requirements
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, BFF_BAD_REQUEST, FLOW_INVALID
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async getCredentials(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().getCredentials(auth.session, flowId);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load flow credentials");
        }
    }

    /**
     * Creates or reuses a credential and assigns it to a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: StoreItaasFlowCredentials
     * @route POST /itaas/flows/{flowId}/credentials
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @param {ItaasStoreCredentialBody.model} request.body.required - Create or reuse credential payload
     * @returns {ItaasStoreCredentialResult.model} 200 - Credential stored and assigned
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, INVALID_CREDENTIAL_BODY, BFF_BAD_REQUEST
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND, CREDENTIAL_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async storeCredentials(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";
        const body = (request.body || {}) as Record<string, unknown>;
        const credentialType = typeof body.credentialType === "string" ? body.credentialType : "";
        const name = typeof body.name === "string" ? body.name : undefined;
        const credentialId = typeof body.credentialId === "string" ? body.credentialId : undefined;
        const data = (body.data && typeof body.data === "object")
            ? body.data as Record<string, unknown>
            : undefined;

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const result = await ItaasFlowsService.getInstance().storeCredentials(auth.session, flowId, {
                credentialType,
                name,
                data,
                credentialId,
            });
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not store flow credentials");
        }
    }

    /**
     * Disconnects a credential from a flow without deleting the saved credential.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: DisconnectItaasFlowCredential
     * @route DELETE /itaas/flows/{flowId}/credentials/{credentialId}
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @param {string} credentialId.path.required - Credential ID
     * @returns {void} 200 - Credential disconnected from the flow
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, INVALID_CREDENTIAL_ID, BFF_BAD_REQUEST
     * @returns {void} 401 - Unauthorized: BFF_UNAUTHORIZED
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, KEYCLOAK_SESSION_EXPIRED, KEYCLOAK_TOKEN_UNAVAILABLE, BFF_FORBIDDEN
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND, CREDENTIAL_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @returns {void} 502 - Bad gateway: BFF_BAD_GATEWAY, UPSTREAM_UNREACHABLE, UPSTREAM_UNAUTHORIZED, IDENTITY_RESOLVER_UNAVAILABLE
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 504 - Gateway timeout: UPSTREAM_TIMEOUT
     * @security AuthToken
     */
    public async disconnectCredential(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";
        const credentialId = ((request.params && request.params.credentialId) || "") + "";

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            await ItaasFlowsService.getInstance().disconnectCredential(auth.session, flowId, credentialId);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not disconnect flow credential");
        }
    }

    /**
     * Lists the authenticated user's favorite global flows.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: ListItaasFlowFavorites
     * @route GET /itaas/flows/favorites
     * @group itaas_flows
     * @returns {ItaasFlowFavoritesListResponse.model} 200 - Favorite flows
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async listFlowFavorites(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const rows = await ItaasFlowFavorite.findByUserId(auth.user.id);
            sendApiResult(request, response, {
                favorites: rows.map((row) => ({
                    flowId: row.flowId,
                    createdAt: row.createdAt,
                })),
                total: rows.length,
            });
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list flow favorites");
        }
    }

    /**
     * Marks a global flow as favorite for the authenticated user.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: AddItaasFlowFavorite
     * @route POST /itaas/flows/{flowId}/favorite
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @returns {ItaasFlowFavoriteItem.model} 200 - Favorite created or already present
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async addFlowFavorite(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = (((request.params && request.params.flowId) || "") + "").trim();
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flow id");
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            const favorite = await ItaasFlowFavorite.createFavorite({
                userId: auth.user.id,
                flowId,
            });
            sendApiResult(request, response, {
                flowId: favorite.flowId,
                createdAt: favorite.createdAt,
            });
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not add flow favorite");
        }
    }

    /**
     * Removes a global flow from the authenticated user's favorites.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: RemoveItaasFlowFavorite
     * @route DELETE /itaas/flows/{flowId}/favorite
     * @group itaas_flows
     * @param {string} flowId.path.required - Flow ID
     * @returns {void} 200 - Favorite removed (or already absent)
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async removeFlowFavorite(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const flowId = (((request.params && request.params.flowId) || "") + "").trim();
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flow id");
            return;
        }

        try {
            await ItaasPlatformService.getInstance().assertItaasAccess(auth.user.id);
            await ItaasFlowFavorite.deleteByUserAndFlow(auth.user.id, flowId);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendItaasFlowsServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not remove flow favorite");
        }
    }
}
