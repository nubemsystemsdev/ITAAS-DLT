// API bindings: subscriptions (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl, generateURIQuery } from "./utils";
import { SubscriptionCheckoutResponse, SubscriptionCreateBody, SubscriptionRenewBody, ChangePlanResponse, SubscriptionChangePlanBody, SubscriptionCancelBody, PreviewChangeResponse, PreviewChangeBody, PreviewCancelResponse, PreviewCancelBody, PreviewCreateResponse, PreviewCreateBody, CompletePendingResponse, CompletePendingBody, SubscriptionStatusResponse, SubscriptionNoticesResponse, SubscriptionAllowanceResponse, SubscriptionAdminListResponse, SubscriptionAdminUserListResponse, SubscriptionAdminDetailResponse, SubscriptionAdminActionBody, SubscriptionAdminRefundResponse, SubscriptionAdminRefundBody } from "./definitions";

export class ApiSubscriptions {
    /**
     * Method: POST
     * Path: /subscriptions/create
     * Create subscription
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateSubscription(body: SubscriptionCreateBody): RequestParams<SubscriptionCheckoutResponse, CreateSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/create`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ORG_MEMBER_CANNOT_PURCHASE", handler.forbiddenOrgMemberCannotPurchase)
                    .add(403, "*", handler.forbidden)
                    .add(400, "TOKENS_EXCEED_LIMIT", handler.badRequestTokensExceedLimit)
                    .add(400, "INSUFFICIENT_TOKEN_BALANCE", handler.badRequestInsufficientTokenBalance)
                    .add(400, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", handler.badRequestOrgRequiredForMultiLicensePlan)
                    .add(400, "PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM", handler.badRequestPlanContainsAlreadySubscribedItem)
                    .add(400, "ITEM_COVERED_BY_ACTIVE_PLAN", handler.badRequestItemCoveredByActivePlan)
                    .add(400, "ALREADY_SUBSCRIBED_TO_PLAN", handler.badRequestAlreadySubscribedToPlan)
                    .add(400, "ALREADY_SUBSCRIBED_TO_ITEM", handler.badRequestAlreadySubscribedToItem)
                    .add(400, "ALREADY_SUBSCRIBED", handler.badRequestAlreadySubscribed)
                    .add(400, "ALREADY_FULL_ACCESS", handler.badRequestAlreadyFullAccess)
                    .add(400, "INVALID_QUANTITY", handler.badRequestInvalidQuantity)
                    .add(400, "INVALID_SUBSCRIBABLE_ID", handler.badRequestInvalidSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_TYPE", handler.badRequestInvalidSubscribableType)
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
     * Path: /subscriptions/renew
     * Renew subscription
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RenewSubscription(body: SubscriptionRenewBody): RequestParams<void, RenewSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/renew`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
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
     * Path: /subscriptions/change-plan
     * Change subscription plan
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeSubscriptionPlan(body: SubscriptionChangePlanBody): RequestParams<ChangePlanResponse, ChangeSubscriptionPlanErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/change-plan`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ORG_MEMBER_CANNOT_PURCHASE", handler.forbiddenOrgMemberCannotPurchase)
                    .add(403, "*", handler.forbidden)
                    .add(400, "TOKENS_EXCEED_LIMIT", handler.badRequestTokensExceedLimit)
                    .add(400, "INSUFFICIENT_TOKEN_BALANCE", handler.badRequestInsufficientTokenBalance)
                    .add(400, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", handler.badRequestOrgRequiredForMultiLicensePlan)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
                    .add(400, "PLAN_CHANGE_NOT_ALLOWED", handler.badRequestPlanChangeNotAllowed)
                    .add(400, "INVALID_EFFECTIVE", handler.badRequestInvalidEffective)
                    .add(400, "INVALID_METHOD", handler.badRequestInvalidMethod)
                    .add(400, "INVALID_TARGET_SUBSCRIBABLE_ID", handler.badRequestInvalidTargetSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_ID", handler.badRequestInvalidSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_TYPE", handler.badRequestInvalidSubscribableType)
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
     * Path: /subscriptions/cancel
     * Cancel subscription
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CancelSubscription(body: SubscriptionCancelBody): RequestParams<void, CancelSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/cancel`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /subscriptions/preview-change
     * Preview subscription plan change
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PreviewChangePlan(body: PreviewChangeBody): RequestParams<PreviewChangeResponse, PreviewChangePlanErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/preview-change`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", handler.badRequestOrgRequiredForMultiLicensePlan)
                    .add(400, "INVALID_TARGET_SUBSCRIBABLE_ID", handler.badRequestInvalidTargetSubscribableId)
                    .add(400, "INVALID_TARGET_SUBSCRIBABLE_TYPE", handler.badRequestInvalidTargetSubscribableType)
                    .add(400, "INVALID_SUBSCRIBABLE_ID", handler.badRequestInvalidSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_TYPE", handler.badRequestInvalidSubscribableType)
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
     * Path: /subscriptions/preview-cancel
     * Preview subscription cancellation
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PreviewCancelSubscription(body: PreviewCancelBody): RequestParams<PreviewCancelResponse, PreviewCancelSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/preview-cancel`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "INVALID_SUBSCRIPTION_ID", handler.badRequestInvalidSubscriptionId)
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
     * Path: /subscriptions/preview-create
     * Preview subscription creation
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PreviewCreateSubscription(body: PreviewCreateBody): RequestParams<PreviewCreateResponse, PreviewCreateSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/preview-create`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "ORG_MEMBER_CANNOT_PURCHASE", handler.forbiddenOrgMemberCannotPurchase)
                    .add(403, "*", handler.forbidden)
                    .add(400, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", handler.badRequestOrgRequiredForMultiLicensePlan)
                    .add(400, "PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM", handler.badRequestPlanContainsAlreadySubscribedItem)
                    .add(400, "ITEM_COVERED_BY_ACTIVE_PLAN", handler.badRequestItemCoveredByActivePlan)
                    .add(400, "ALREADY_SUBSCRIBED_TO_PLAN", handler.badRequestAlreadySubscribedToPlan)
                    .add(400, "ALREADY_SUBSCRIBED_TO_ITEM", handler.badRequestAlreadySubscribedToItem)
                    .add(400, "INVALID_SUBSCRIBABLE_ID", handler.badRequestInvalidSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_TYPE", handler.badRequestInvalidSubscribableType)
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
     * Path: /subscriptions/complete-pending
     * Complete a pending payment subscription
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CompletePendingSubscription(body: CompletePendingBody): RequestParams<CompletePendingResponse, CompletePendingSubscriptionErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/complete-pending`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ORG_MEMBER_CANNOT_PURCHASE", handler.forbiddenOrgMemberCannotPurchase)
                    .add(403, "*", handler.forbidden)
                    .add(400, "TOKENS_EXCEED_LIMIT", handler.badRequestTokensExceedLimit)
                    .add(400, "INSUFFICIENT_TOKEN_BALANCE", handler.badRequestInsufficientTokenBalance)
                    .add(400, "SUBSCRIPTION_NOT_PENDING", handler.badRequestSubscriptionNotPending)
                    .add(400, "INVALID_SUBSCRIPTION_ID", handler.badRequestInvalidSubscriptionId)
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
     * Path: /subscriptions/status
     * Get subscription status
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetSubscriptionStatus(queryParams: GetSubscriptionStatusQueryParameters): RequestParams<SubscriptionStatusResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/status` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /subscriptions/notices
     * Get upcoming notices
     * @returns The request parameters
     */
    public static GetSubscriptionNotices(): RequestParams<SubscriptionNoticesResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/notices`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /subscriptions/allowance
     * Get token allowance for a subscribable according to active subscription
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetSubscriptionAllowance(queryParams: GetSubscriptionAllowanceQueryParameters): RequestParams<SubscriptionAllowanceResponse, GetSubscriptionAllowanceErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/allowance` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_SUBSCRIBABLE_ID", handler.badRequestInvalidSubscribableId)
                    .add(400, "INVALID_SUBSCRIBABLE_TYPE", handler.badRequestInvalidSubscribableType)
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
     * Path: /subscriptions/admin
     * Lists subscriptions globally for platform administrators.
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListAdminSubscriptions(queryParams: ListAdminSubscriptionsQueryParameters): RequestParams<SubscriptionAdminListResponse, ListAdminSubscriptionsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/admin` + generateURIQuery(queryParams)),
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
     * Path: /subscriptions/admin/user/{uid}
     * Lists subscriptions for a specific user (admin view).
     * Requires permission: admin.users.manage
     * @param uid Target user id
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListAdminUserSubscriptions(uid: string, queryParams: ListAdminUserSubscriptionsQueryParameters): RequestParams<SubscriptionAdminUserListResponse, ListAdminUserSubscriptionsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/admin/user/${encodeURIComponent(uid)}` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
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
     * Path: /subscriptions/admin/{subscriptionId}
     * Gets subscription detail with payments and Stripe summary for administrators.
     * Requires permission: admin.users.manage
     * @param subscriptionId Subscription id
     * @returns The request parameters
     */
    public static GetAdminSubscriptionDetail(subscriptionId: string): RequestParams<SubscriptionAdminDetailResponse, GetAdminSubscriptionDetailErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/subscriptions/admin/${encodeURIComponent(subscriptionId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
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
     * Path: /subscriptions/admin/suspend
     * Suspends a subscription (Stripe pause + local suspended status).
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static SuspendSubscriptionAdmin(body: SubscriptionAdminActionBody): RequestParams<void, SuspendSubscriptionAdminErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/admin/suspend`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
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
     * Path: /subscriptions/admin/reactivate
     * Reactivates a subscription for administrators.
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ReactivateSubscriptionAdmin(body: SubscriptionAdminActionBody): RequestParams<void, ReactivateSubscriptionAdminErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/admin/reactivate`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
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
     * Path: /subscriptions/admin/refund
     * Refunds a subscription payment through Stripe.
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RefundSubscriptionAdmin(body: SubscriptionAdminRefundBody): RequestParams<SubscriptionAdminRefundResponse, RefundSubscriptionAdminErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/subscriptions/admin/refund`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "SUBSCRIPTION_NOT_FOUND", handler.notFoundSubscriptionNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "STRIPE_PAYMENT_NOT_FOUND", handler.badRequestStripePaymentNotFound)
                    .add(400, "PAYMENT_ALREADY_REFUNDED", handler.badRequestPaymentAlreadyRefunded)
                    .add(400, "PAYMENT_NOT_FOUND", handler.badRequestPaymentNotFound)
                    .add(400, "INVALID_REQUEST", handler.badRequestInvalidRequest)
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
 * Error handler for CreateSubscription
 */
export type CreateSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_ID
     */
    badRequestInvalidSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_QUANTITY
     */
    badRequestInvalidQuantity: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_FULL_ACCESS
     */
    badRequestAlreadyFullAccess: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_SUBSCRIBED
     */
    badRequestAlreadySubscribed: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_SUBSCRIBED_TO_ITEM
     */
    badRequestAlreadySubscribedToItem: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_SUBSCRIBED_TO_PLAN
     */
    badRequestAlreadySubscribedToPlan: () => void;

    /**
     * Handler for status = 400 and code = ITEM_COVERED_BY_ACTIVE_PLAN
     */
    badRequestItemCoveredByActivePlan: () => void;

    /**
     * Handler for status = 400 and code = PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM
     */
    badRequestPlanContainsAlreadySubscribedItem: () => void;

    /**
     * Handler for status = 400 and code = ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     */
    badRequestOrgRequiredForMultiLicensePlan: () => void;

    /**
     * Handler for status = 400 and code = INSUFFICIENT_TOKEN_BALANCE
     */
    badRequestInsufficientTokenBalance: () => void;

    /**
     * Handler for status = 400 and code = TOKENS_EXCEED_LIMIT
     */
    badRequestTokensExceedLimit: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ORG_MEMBER_CANNOT_PURCHASE
     */
    forbiddenOrgMemberCannotPurchase: () => void;
};

/**
 * Error handler for RenewSubscription
 */
export type RenewSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for ChangeSubscriptionPlan
 */
export type ChangeSubscriptionPlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_ID
     */
    badRequestInvalidSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TARGET_SUBSCRIBABLE_ID
     */
    badRequestInvalidTargetSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_METHOD
     */
    badRequestInvalidMethod: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EFFECTIVE
     */
    badRequestInvalidEffective: () => void;

    /**
     * Handler for status = 400 and code = PLAN_CHANGE_NOT_ALLOWED
     */
    badRequestPlanChangeNotAllowed: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * Handler for status = 400 and code = ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     */
    badRequestOrgRequiredForMultiLicensePlan: () => void;

    /**
     * Handler for status = 400 and code = INSUFFICIENT_TOKEN_BALANCE
     */
    badRequestInsufficientTokenBalance: () => void;

    /**
     * Handler for status = 400 and code = TOKENS_EXCEED_LIMIT
     */
    badRequestTokensExceedLimit: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ORG_MEMBER_CANNOT_PURCHASE
     */
    forbiddenOrgMemberCannotPurchase: () => void;
};

/**
 * Error handler for CancelSubscription
 */
export type CancelSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for PreviewChangePlan
 */
export type PreviewChangePlanErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_ID
     */
    badRequestInvalidSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TARGET_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidTargetSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TARGET_SUBSCRIBABLE_ID
     */
    badRequestInvalidTargetSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     */
    badRequestOrgRequiredForMultiLicensePlan: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for PreviewCancelSubscription
 */
export type PreviewCancelSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIPTION_ID
     */
    badRequestInvalidSubscriptionId: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for PreviewCreateSubscription
 */
export type PreviewCreateSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_ID
     */
    badRequestInvalidSubscribableId: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_SUBSCRIBED_TO_ITEM
     */
    badRequestAlreadySubscribedToItem: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_SUBSCRIBED_TO_PLAN
     */
    badRequestAlreadySubscribedToPlan: () => void;

    /**
     * Handler for status = 400 and code = ITEM_COVERED_BY_ACTIVE_PLAN
     */
    badRequestItemCoveredByActivePlan: () => void;

    /**
     * Handler for status = 400 and code = PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM
     */
    badRequestPlanContainsAlreadySubscribedItem: () => void;

    /**
     * Handler for status = 400 and code = ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     */
    badRequestOrgRequiredForMultiLicensePlan: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ORG_MEMBER_CANNOT_PURCHASE
     */
    forbiddenOrgMemberCannotPurchase: () => void;
};

/**
 * Error handler for CompletePendingSubscription
 */
export type CompletePendingSubscriptionErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIPTION_ID
     */
    badRequestInvalidSubscriptionId: () => void;

    /**
     * Handler for status = 400 and code = SUBSCRIPTION_NOT_PENDING
     */
    badRequestSubscriptionNotPending: () => void;

    /**
     * Handler for status = 400 and code = INSUFFICIENT_TOKEN_BALANCE
     */
    badRequestInsufficientTokenBalance: () => void;

    /**
     * Handler for status = 400 and code = TOKENS_EXCEED_LIMIT
     */
    badRequestTokensExceedLimit: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ORG_MEMBER_CANNOT_PURCHASE
     */
    forbiddenOrgMemberCannotPurchase: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Query parameters for GetSubscriptionStatus
 */
export interface GetSubscriptionStatusQueryParameters {
    /**
     * Filter by category (plan, service, product)
     */
    category?: string;

    /**
     * Filter by display status (active, pending, cancelled)
     */
    display_status?: string;

    /**
     * Filter by billing cycle (monthly, annual, complete)
     */
    billing_cycle?: string;

    /**
     * Page number
     */
    page?: string;

    /**
     * Page size
     */
    pageSize?: string;
}

/**
 * Error handler for GetSubscriptionAllowance
 */
export type GetSubscriptionAllowanceErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_TYPE
     */
    badRequestInvalidSubscribableType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIBABLE_ID
     */
    badRequestInvalidSubscribableId: () => void;
};

/**
 * Query parameters for GetSubscriptionAllowance
 */
export interface GetSubscriptionAllowanceQueryParameters {
    /**
     * Subscribable type
     */
    subscribable_type: string;

    /**
     * Subscribable id
     */
    subscribable_id: string;
}

/**
 * Error handler for ListAdminSubscriptions
 */
export type ListAdminSubscriptionsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for ListAdminSubscriptions
 */
export interface ListAdminSubscriptionsQueryParameters {
    /**
     * Filter by status
     */
    status?: string;

    /**
     * Filter by billing cycle
     */
    billing_cycle?: string;

    /**
     * Filter by category (plan, service, product)
     */
    category?: string;

    /**
     * Filter by createdAt from (Unix ms)
     */
    created_from?: string;

    /**
     * Filter by createdAt to (Unix ms)
     */
    created_to?: string;

    /**
     * Page number
     */
    page?: string;

    /**
     * Page size
     */
    pageSize?: string;
}

/**
 * Error handler for ListAdminUserSubscriptions
 */
export type ListAdminUserSubscriptionsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for ListAdminUserSubscriptions
 */
export interface ListAdminUserSubscriptionsQueryParameters {
    /**
     * Filter by category (plan, service, product)
     */
    category?: string;

    /**
     * Filter by display status (active, pending, cancelled)
     */
    display_status?: string;

    /**
     * Filter by billing cycle (monthly, annual, complete)
     */
    billing_cycle?: string;

    /**
     * Page number
     */
    page?: string;

    /**
     * Page size
     */
    pageSize?: string;
}

/**
 * Error handler for GetAdminSubscriptionDetail
 */
export type GetAdminSubscriptionDetailErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for SuspendSubscriptionAdmin
 */
export type SuspendSubscriptionAdminErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for ReactivateSubscriptionAdmin
 */
export type ReactivateSubscriptionAdminErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

/**
 * Error handler for RefundSubscriptionAdmin
 */
export type RefundSubscriptionAdminErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * Handler for status = 400 and code = PAYMENT_NOT_FOUND
     */
    badRequestPaymentNotFound: () => void;

    /**
     * Handler for status = 400 and code = PAYMENT_ALREADY_REFUNDED
     */
    badRequestPaymentAlreadyRefunded: () => void;

    /**
     * Handler for status = 400 and code = STRIPE_PAYMENT_NOT_FOUND
     */
    badRequestStripePaymentNotFound: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = SUBSCRIPTION_NOT_FOUND
     */
    notFoundSubscriptionNotFound: () => void;
};

