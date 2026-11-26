// API bindings: plans (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonErrorHandler, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { PlanPublicList, PlanPublicDetailResponse, PlanCreateBody } from "./definitions";

export class ApiPlans {
    /**
     * Method: GET
     * Path: /plans
     * Get published plans (public)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetPublicPlans(queryParams: GetPublicPlansQueryParameters): RequestParams<PlanPublicList, CommonErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/plans` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /plans/{id}
     * Get a single published plan detail (public)
     * @param id Plan ID
     * @returns The request parameters
     */
    public static GetPublicPlan(id: string): RequestParams<PlanPublicDetailResponse, GetPublicPlanErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/plans/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /admin/plans
     * Get all plans (admin, all statuses)
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAdminPlans(queryParams: GetAdminPlansQueryParameters): RequestParams<PlanPublicList, GetAdminPlansErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/plans` + generateURIQuery(queryParams)),
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
     * Method: POST
     * Path: /admin/plans
     * Create a plan
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreatePlan(body: PlanCreateBody): RequestParams<void, CreatePlanErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/plans`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_ANNUAL_PRICE", handler.badRequestInvalidAnnualPrice)
                    .add(400, "INVALID_MONTHLY_PRICE", handler.badRequestInvalidMonthlyPrice)
                    .add(400, "COMPONENT_NOT_PUBLISHABLE", handler.badRequestComponentNotPublishable)
                    .add(400, "INVALID_COMPONENT", handler.badRequestInvalidComponent)
                    .add(400, "INVALID_COMPONENTS", handler.badRequestInvalidComponents)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "DUPLICATE_PLAN_INDEX", handler.badRequestDuplicatePlanIndex)
                    .add(400, "INVALID_PLAN_INDEX", handler.badRequestInvalidPlanIndex)
                    .add(400, "INVALID_DISCOUNT_PERCENT", handler.badRequestInvalidDiscountPercent)
                    .add(400, "INVALID_PRICING_MODE", handler.badRequestInvalidPricingMode)
                    .add(400, "INVALID_DESCRIPTION", handler.badRequestInvalidDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
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
     * Path: /admin/plans/{id}
     * Get plan detail (admin)
     * Requires permission: admin.users.manage
     * @param id Plan ID
     * @returns The request parameters
     */
    public static GetAdminPlan(id: string): RequestParams<void, GetAdminPlanErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/plans/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
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
     * Path: /admin/plans/{id}
     * Update a plan
     * Requires permission: admin.users.manage
     * @param id Plan ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdatePlan(id: string, body: PlanCreateBody): RequestParams<void, UpdatePlanErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/admin/plans/${encodeURIComponent(id)}`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "COMPONENT_NOT_PUBLISHABLE", handler.badRequestComponentNotPublishable)
                    .add(400, "INVALID_COMPONENT", handler.badRequestInvalidComponent)
                    .add(400, "INVALID_COMPONENTS", handler.badRequestInvalidComponents)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "DUPLICATE_PLAN_INDEX", handler.badRequestDuplicatePlanIndex)
                    .add(400, "INVALID_PLAN_INDEX", handler.badRequestInvalidPlanIndex)
                    .add(400, "INVALID_DISCOUNT_PERCENT", handler.badRequestInvalidDiscountPercent)
                    .add(400, "INVALID_PRICING_MODE", handler.badRequestInvalidPricingMode)
                    .add(400, "INVALID_DESCRIPTION", handler.badRequestInvalidDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
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
     * Path: /admin/plans/{id}
     * Delete a plan
     * Requires permission: admin.users.manage
     * @param id Plan ID
     * @returns The request parameters
     */
    public static DeletePlan(id: string): RequestParams<void, DeletePlanErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/admin/plans/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
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
     * Path: /admin/plans/{id}/archive
     * Archive a plan
     * Requires permission: admin.users.manage
     * @param id Plan ID
     * @returns The request parameters
     */
    public static ArchivePlan(id: string): RequestParams<void, ArchivePlanErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/plans/${encodeURIComponent(id)}/archive`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
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
 * Query parameters for GetPublicPlans
 */
export interface GetPublicPlansQueryParameters {
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
 * Error handler for GetPublicPlan
 */
export type GetPublicPlanErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for GetAdminPlans
 */
export type GetAdminPlansErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetAdminPlans
 */
export interface GetAdminPlansQueryParameters {
    /**
     * Page number
     */
    page?: number;

    /**
     * Page size
     */
    pageSize?: number;
}

/**
 * Error handler for CreatePlan
 */
export type CreatePlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DESCRIPTION
     */
    badRequestInvalidDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRICING_MODE
     */
    badRequestInvalidPricingMode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DISCOUNT_PERCENT
     */
    badRequestInvalidDiscountPercent: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PLAN_INDEX
     */
    badRequestInvalidPlanIndex: () => void;

    /**
     * Handler for status = 400 and code = DUPLICATE_PLAN_INDEX
     */
    badRequestDuplicatePlanIndex: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPONENTS
     */
    badRequestInvalidComponents: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPONENT
     */
    badRequestInvalidComponent: () => void;

    /**
     * Handler for status = 400 and code = COMPONENT_NOT_PUBLISHABLE
     */
    badRequestComponentNotPublishable: () => void;

    /**
     * Handler for status = 400 and code = INVALID_MONTHLY_PRICE
     */
    badRequestInvalidMonthlyPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ANNUAL_PRICE
     */
    badRequestInvalidAnnualPrice: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetAdminPlan
 */
export type GetAdminPlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for UpdatePlan
 */
export type UpdatePlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DESCRIPTION
     */
    badRequestInvalidDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRICING_MODE
     */
    badRequestInvalidPricingMode: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DISCOUNT_PERCENT
     */
    badRequestInvalidDiscountPercent: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PLAN_INDEX
     */
    badRequestInvalidPlanIndex: () => void;

    /**
     * Handler for status = 400 and code = DUPLICATE_PLAN_INDEX
     */
    badRequestDuplicatePlanIndex: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPONENTS
     */
    badRequestInvalidComponents: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPONENT
     */
    badRequestInvalidComponent: () => void;

    /**
     * Handler for status = 400 and code = COMPONENT_NOT_PUBLISHABLE
     */
    badRequestComponentNotPublishable: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for DeletePlan
 */
export type DeletePlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for ArchivePlan
 */
export type ArchivePlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

