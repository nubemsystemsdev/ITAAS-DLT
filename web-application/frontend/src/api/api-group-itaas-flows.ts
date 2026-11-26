// API bindings: itaas_flows (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl } from "./utils";
import { ItaasFlowsListResponse, ItaasWorkspaceCredentialsResponse, ItaasCreateCredentialResult, ItaasCreateCredentialBody, ItaasFlowDetail, ItaasRunFlowResult, ItaasRunFlowBody, ItaasFlowCredentialsResponse, ItaasStoreCredentialResult, ItaasStoreCredentialBody, ItaasFlowFavoritesListResponse, ItaasFlowFavoriteItem } from "./definitions";

export class ApiItaasFlows {
    /**
     * Method: GET
     * Path: /itaas/flows
     * Lists Flowise flows accessible to the tenant (BFF scope=all: tenant + global).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @returns The request parameters
     */
    public static ListItaasFlows(): RequestParams<ItaasFlowsListResponse, ListItaasFlowsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/flows/global
     * Lists global/public Flowise flows via the BFF (scope=global).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @returns The request parameters
     */
    public static ListItaasGlobalFlows(): RequestParams<ItaasFlowsListResponse, ListItaasGlobalFlowsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows/global`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/flows/tenant
     * Lists Flowise flows assigned to the authenticated ITAAS tenant via the BFF (scope=tenant).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @returns The request parameters
     */
    public static ListItaasTenantFlows(): RequestParams<ItaasFlowsListResponse, ListItaasTenantFlowsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows/tenant`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /itaas/credentials
     * Lists saved workspace credentials by merging tenant and global flows (BFF scope=all).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @returns The request parameters
     */
    public static ListItaasWorkspaceCredentials(): RequestParams<ItaasWorkspaceCredentialsResponse, ListItaasWorkspaceCredentialsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/credentials`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /itaas/credentials
     * Creates a workspace credential without assigning it to a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateItaasWorkspaceCredential(body: ItaasCreateCredentialBody): RequestParams<ItaasCreateCredentialResult, CreateItaasWorkspaceCredentialErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/credentials`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
                    .add(400, "INVALID_CREDENTIAL_BODY", handler.badRequestInvalidCredentialBody)
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
     * Path: /itaas/flows/{flowId}
     * Returns public flow detail via the BFF (no flowData).
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @returns The request parameters
     */
    public static GetItaasFlow(flowId: string): RequestParams<ItaasFlowDetail, GetItaasFlowErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "FLOW_INVALID", handler.badRequestFlowInvalid)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
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
     * Path: /itaas/flows/{flowId}/run
     * Runs a Flowise flow through the BFF for the authenticated ITAAS tenant.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RunItaasFlow(flowId: string, body: ItaasRunFlowBody): RequestParams<ItaasRunFlowResult, RunItaasFlowErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/run`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "LLM_UNAVAILABLE", handler.status503LlmUnavailable)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(429, "LLM_RATE_LIMITED", handler.tooManyRequestsLlmRateLimited)
                    .add(429, "*", handler.tooManyRequests)
                    .add(422, "EXECUTION_FAILED", handler.status422ExecutionFailed)
                    .add(422, "*", handler.status422)
                    .add(409, "FLOW_NOT_DEPLOYED", handler.status409FlowNotDeployed)
                    .add(409, "*", handler.status409)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "CREDENTIAL_INVALID", handler.badRequestCredentialInvalid)
                    .add(400, "CREDENTIAL_UNRESOLVED", handler.badRequestCredentialUnresolved)
                    .add(400, "CREDENTIAL_MISSING", handler.badRequestCredentialMissing)
                    .add(400, "FLOW_INVALID", handler.badRequestFlowInvalid)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
                    .add(400, "INVALID_QUESTION", handler.badRequestInvalidQuestion)
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
     * Method: GET
     * Path: /itaas/flows/{flowId}/credentials
     * Returns credential requirements for a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @returns The request parameters
     */
    public static GetItaasFlowCredentials(flowId: string): RequestParams<ItaasFlowCredentialsResponse, GetItaasFlowCredentialsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/credentials`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "FLOW_INVALID", handler.badRequestFlowInvalid)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
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
     * Path: /itaas/flows/{flowId}/credentials
     * Creates or reuses a credential and assigns it to a flow via the BFF.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static StoreItaasFlowCredentials(flowId: string, body: ItaasStoreCredentialBody): RequestParams<ItaasStoreCredentialResult, StoreItaasFlowCredentialsErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/credentials`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(404, "CREDENTIAL_NOT_FOUND", handler.notFoundCredentialNotFound)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
                    .add(400, "INVALID_CREDENTIAL_BODY", handler.badRequestInvalidCredentialBody)
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
     * Method: DELETE
     * Path: /itaas/flows/{flowId}/credentials/{credentialId}
     * Disconnects a credential from a flow without deleting the saved credential.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @param credentialId Credential ID
     * @returns The request parameters
     */
    public static DisconnectItaasFlowCredential(flowId: string, credentialId: string): RequestParams<void, DisconnectItaasFlowCredentialErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/credentials/${encodeURIComponent(credentialId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(504, "UPSTREAM_TIMEOUT", handler.status504UpstreamTimeout)
                    .add(504, "*", handler.status504)
                    .add(503, "BFF_UNAVAILABLE", handler.status503BffUnavailable)
                    .add(503, "*", handler.status503)
                    .add(502, "IDENTITY_RESOLVER_UNAVAILABLE", handler.status502IdentityResolverUnavailable)
                    .add(502, "UPSTREAM_UNAUTHORIZED", handler.status502UpstreamUnauthorized)
                    .add(502, "UPSTREAM_UNREACHABLE", handler.status502UpstreamUnreachable)
                    .add(502, "BFF_BAD_GATEWAY", handler.status502BffBadGateway)
                    .add(502, "*", handler.status502)
                    .add(404, "CREDENTIAL_NOT_FOUND", handler.notFoundCredentialNotFound)
                    .add(404, "FLOW_NOT_FOUND", handler.notFoundFlowNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "BFF_FORBIDDEN", handler.forbiddenBffForbidden)
                    .add(403, "KEYCLOAK_TOKEN_UNAVAILABLE", handler.forbiddenKeycloakTokenUnavailable)
                    .add(403, "KEYCLOAK_SESSION_EXPIRED", handler.forbiddenKeycloakSessionExpired)
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
                    .add(403, "*", handler.forbidden)
                    .add(401, "BFF_UNAUTHORIZED", handler.unauthorizedBffUnauthorized)
                    .add(400, "BFF_BAD_REQUEST", handler.badRequestBffBadRequest)
                    .add(400, "INVALID_CREDENTIAL_ID", handler.badRequestInvalidCredentialId)
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
     * Method: GET
     * Path: /itaas/flows/favorites
     * Lists the authenticated user's favorite global flows.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @returns The request parameters
     */
    public static ListItaasFlowFavorites(): RequestParams<ItaasFlowFavoritesListResponse, ListItaasFlowFavoritesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/itaas/flows/favorites`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
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
     * Path: /itaas/flows/{flowId}/favorite
     * Marks a global flow as favorite for the authenticated user.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @returns The request parameters
     */
    public static AddItaasFlowFavorite(flowId: string): RequestParams<ItaasFlowFavoriteItem, AddItaasFlowFavoriteErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/favorite`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
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
     * Method: DELETE
     * Path: /itaas/flows/{flowId}/favorite
     * Removes a global flow from the authenticated user's favorites.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * @param flowId Flow ID
     * @returns The request parameters
     */
    public static RemoveItaasFlowFavorite(flowId: string): RequestParams<void, RemoveItaasFlowFavoriteErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/itaas/flows/${encodeURIComponent(flowId)}/favorite`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ITAAS_ACCESS_REQUIRED", handler.forbiddenItaasAccessRequired)
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
}

/**
 * Error handler for ListItaasFlows
 */
export type ListItaasFlowsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for ListItaasGlobalFlows
 */
export type ListItaasGlobalFlowsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for ListItaasTenantFlows
 */
export type ListItaasTenantFlowsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for ListItaasWorkspaceCredentials
 */
export type ListItaasWorkspaceCredentialsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for CreateItaasWorkspaceCredential
 */
export type CreateItaasWorkspaceCredentialErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CREDENTIAL_BODY
     */
    badRequestInvalidCredentialBody: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for GetItaasFlow
 */
export type GetItaasFlowErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 400 and code = FLOW_INVALID
     */
    badRequestFlowInvalid: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for RunItaasFlow
 */
export type RunItaasFlowErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_QUESTION
     */
    badRequestInvalidQuestion: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 400 and code = FLOW_INVALID
     */
    badRequestFlowInvalid: () => void;

    /**
     * Handler for status = 400 and code = CREDENTIAL_MISSING
     */
    badRequestCredentialMissing: () => void;

    /**
     * Handler for status = 400 and code = CREDENTIAL_UNRESOLVED
     */
    badRequestCredentialUnresolved: () => void;

    /**
     * Handler for status = 400 and code = CREDENTIAL_INVALID
     */
    badRequestCredentialInvalid: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * General handler for status = 409
     */
    status409: () => void;

    /**
     * Handler for status = 409 and code = FLOW_NOT_DEPLOYED
     */
    status409FlowNotDeployed: () => void;

    /**
     * General handler for status = 422
     */
    status422: () => void;

    /**
     * Handler for status = 422 and code = EXECUTION_FAILED
     */
    status422ExecutionFailed: () => void;

    /**
     * General handler for status = 429
     */
    tooManyRequests: () => void;

    /**
     * Handler for status = 429 and code = LLM_RATE_LIMITED
     */
    tooManyRequestsLlmRateLimited: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * Handler for status = 503 and code = LLM_UNAVAILABLE
     */
    status503LlmUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for GetItaasFlowCredentials
 */
export type GetItaasFlowCredentialsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 400 and code = FLOW_INVALID
     */
    badRequestFlowInvalid: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for StoreItaasFlowCredentials
 */
export type StoreItaasFlowCredentialsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CREDENTIAL_BODY
     */
    badRequestInvalidCredentialBody: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * Handler for status = 404 and code = CREDENTIAL_NOT_FOUND
     */
    notFoundCredentialNotFound: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for DisconnectItaasFlowCredential
 */
export type DisconnectItaasFlowCredentialErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FLOW_ID
     */
    badRequestInvalidFlowId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CREDENTIAL_ID
     */
    badRequestInvalidCredentialId: () => void;

    /**
     * Handler for status = 400 and code = BFF_BAD_REQUEST
     */
    badRequestBffBadRequest: () => void;

    /**
     * Handler for status = 401 and code = BFF_UNAUTHORIZED
     */
    unauthorizedBffUnauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_SESSION_EXPIRED
     */
    forbiddenKeycloakSessionExpired: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_TOKEN_UNAVAILABLE
     */
    forbiddenKeycloakTokenUnavailable: () => void;

    /**
     * Handler for status = 403 and code = BFF_FORBIDDEN
     */
    forbiddenBffForbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = FLOW_NOT_FOUND
     */
    notFoundFlowNotFound: () => void;

    /**
     * Handler for status = 404 and code = CREDENTIAL_NOT_FOUND
     */
    notFoundCredentialNotFound: () => void;

    /**
     * General handler for status = 502
     */
    status502: () => void;

    /**
     * Handler for status = 502 and code = BFF_BAD_GATEWAY
     */
    status502BffBadGateway: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNREACHABLE
     */
    status502UpstreamUnreachable: () => void;

    /**
     * Handler for status = 502 and code = UPSTREAM_UNAUTHORIZED
     */
    status502UpstreamUnauthorized: () => void;

    /**
     * Handler for status = 502 and code = IDENTITY_RESOLVER_UNAVAILABLE
     */
    status502IdentityResolverUnavailable: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = BFF_UNAVAILABLE
     */
    status503BffUnavailable: () => void;

    /**
     * General handler for status = 504
     */
    status504: () => void;

    /**
     * Handler for status = 504 and code = UPSTREAM_TIMEOUT
     */
    status504UpstreamTimeout: () => void;
};

/**
 * Error handler for ListItaasFlowFavorites
 */
export type ListItaasFlowFavoritesErrorHandler = CommonAuthenticatedErrorHandler & {
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
 * Error handler for AddItaasFlowFavorite
 */
export type AddItaasFlowFavoriteErrorHandler = CommonAuthenticatedErrorHandler & {
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
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;
};

/**
 * Error handler for RemoveItaasFlowFavorite
 */
export type RemoveItaasFlowFavoriteErrorHandler = CommonAuthenticatedErrorHandler & {
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
     * Handler for status = 403 and code = ITAAS_ACCESS_REQUIRED
     */
    forbiddenItaasAccessRequired: () => void;
};

