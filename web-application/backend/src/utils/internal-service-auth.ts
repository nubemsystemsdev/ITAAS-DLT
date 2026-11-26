// Internal service API key authentication

"use strict";

import Express from "express";
import { FORBIDDEN, sendApiError, sendUnauthorized } from "./http-utils";
import { InternalServiceConfig } from "../config/config-internal";
import { secureStringCompare } from "./text-utils";

const INTERNAL_SERVICE_API_KEY_HEADER = "x-internal-service-api-key";

/**
 * Extracts the internal service API key from the request.
 */
export function getInternalServiceApiKeyFromRequest(request: Express.Request): string {
    const headerKey = (request.headers[INTERNAL_SERVICE_API_KEY_HEADER] || "") + "";

    if (headerKey) {
        return headerKey;
    }

    const authorization = (request.headers.authorization || "") + "";

    if (authorization.toLowerCase().startsWith("bearer ")) {
        return authorization.substring(7).trim();
    }

    return "";
}

/**
 * Rejects the request when internal service auth is missing or invalid.
 * @returns True if the request was rejected
 */
export function rejectUnauthorizedInternalService(request: Express.Request, response: Express.Response): boolean {
    if (!InternalServiceConfig.getInstance().isConfigured()) {
        sendApiError(
            request,
            response,
            FORBIDDEN,
            "INTERNAL_SERVICE_DISABLED",
            "Internal service API is not configured",
        );
        return true;
    }

    const providedKey = getInternalServiceApiKeyFromRequest(request);

    if (!providedKey || !secureStringCompare(InternalServiceConfig.getInstance().apiKey, providedKey)) {
        sendUnauthorized(request, response);
        return true;
    }

    return false;
}
