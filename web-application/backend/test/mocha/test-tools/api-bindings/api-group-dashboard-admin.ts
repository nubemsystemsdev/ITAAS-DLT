// API bindings: dashboard_admin (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { AdminDashboardSummary } from "./definitions";

export class ApiDashboardAdmin {
    /**
     * Method: GET
     * Path: /admin/dashboard/summary
     * Gets admin dashboard summary
     * Requires permission: admin.users.manage
     * @returns The request parameters
     */
    public static GetDashboardSummary(): RequestParams<AdminDashboardSummary, GetDashboardSummaryErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/dashboard/summary`),
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
 * Error handler for GetDashboardSummary
 */
export type GetDashboardSummaryErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

