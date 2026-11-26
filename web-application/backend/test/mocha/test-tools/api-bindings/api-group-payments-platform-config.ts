// API bindings: payments_platform_config (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { PaymentsPlatformConfig, PaymentsPlatformConfigUpdateBody } from "./definitions";

export class ApiPaymentsPlatformConfig {
    /**
     * Method: GET
     * Path: /admin/payments-platform-config
     * Get payments platform config for admin
     * @returns The request parameters
     */
    public static GetAdminPaymentsPlatformConfig(): RequestParams<PaymentsPlatformConfig, GetAdminPaymentsPlatformConfigErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/payments-platform-config`),
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
     * Path: /admin/payments-platform-config
     * Update payments platform config
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateAdminPaymentsPlatformConfig(body: PaymentsPlatformConfigUpdateBody): RequestParams<PaymentsPlatformConfig, UpdateAdminPaymentsPlatformConfigErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/admin/payments-platform-config`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_GRACE_PERIOD_DAYS", handler.badRequestInvalidGracePeriodDays)
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
 * Error handler for GetAdminPaymentsPlatformConfig
 */
export type GetAdminPaymentsPlatformConfigErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for UpdateAdminPaymentsPlatformConfig
 */
export type UpdateAdminPaymentsPlatformConfigErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_GRACE_PERIOD_DAYS
     */
    badRequestInvalidGracePeriodDays: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

