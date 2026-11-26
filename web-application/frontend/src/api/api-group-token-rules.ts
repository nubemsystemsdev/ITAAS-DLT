// API bindings: token_rules (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl } from "./utils";
import { TokenRulesConfig, TokenRulesUpdateBody } from "./definitions";

export class ApiTokenRules {
    /**
     * Method: GET
     * Path: /token-rules
     * Get public effective token rules
     * @returns The request parameters
     */
    public static GetTokenRules(): RequestParams<TokenRulesConfig, GetTokenRulesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/token-rules`),
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
     * Path: /admin/token-rules
     * Get token rules for admin
     * @returns The request parameters
     */
    public static GetAdminTokenRules(): RequestParams<TokenRulesConfig, GetAdminTokenRulesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/token-rules`),
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
     * Method: PUT
     * Path: /admin/token-rules
     * Update token rules
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateAdminTokenRules(body: TokenRulesUpdateBody): RequestParams<TokenRulesConfig, UpdateAdminTokenRulesErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/admin/token-rules`),
            json: body,
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
}

/**
 * Error handler for GetTokenRules
 */
export type GetTokenRulesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetAdminTokenRules
 */
export type GetAdminTokenRulesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for UpdateAdminTokenRules
 */
export type UpdateAdminTokenRulesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

