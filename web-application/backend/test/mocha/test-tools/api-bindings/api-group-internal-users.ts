// API bindings: internal_users (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { InternalUserInfoResponse } from "./definitions";

export class ApiInternalUsers {
    /**
     * Method: GET
     * Path: /internal/users/{keycloakSub}
     * Get marketplace user info by Keycloak subject
     * @param keycloakSub Keycloak subject (`sub` claim)
     * @returns The request parameters
     */
    public static GetInternalUserByKeycloakSub(keycloakSub: string): RequestParams<InternalUserInfoResponse, GetInternalUserByKeycloakSubErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/internal/users/${encodeURIComponent(keycloakSub)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "USER_NOT_FOUND", handler.notFoundUserNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "INTERNAL_SERVICE_DISABLED", handler.forbiddenInternalServiceDisabled)
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
 * Error handler for GetInternalUserByKeycloakSub
 */
export type GetInternalUserByKeycloakSubErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 401
     */
    unauthorized: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = INTERNAL_SERVICE_DISABLED
     */
    forbiddenInternalServiceDisabled: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = USER_NOT_FOUND
     */
    notFoundUserNotFound: () => void;
};

