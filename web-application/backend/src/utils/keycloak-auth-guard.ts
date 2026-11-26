// Keycloak-only auth guard helpers

"use strict";

import Express from "express";
import { FORBIDDEN, sendApiError } from "./http-utils";
import { KeycloakConfig } from "../config/config-keycloak";

/**
 * True when Keycloak SSO is the configured authentication provider.
 */
export function isKeycloakAuthOnly(): boolean {
    return KeycloakConfig.getInstance().isConfigured();
}

/**
 * Rejects native auth endpoints when Keycloak SSO is enabled.
 * @returns True if the request was rejected
 */
export function rejectNativeAuthIfKeycloak(request: Express.Request, response: Express.Response): boolean {
    if (!isKeycloakAuthOnly()) {
        return false;
    }

    sendApiError(
        request,
        response,
        FORBIDDEN,
        "KEYCLOAK_ONLY",
        "Authentication is managed by Keycloak",
    );
    return true;
}
