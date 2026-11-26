// API bindings: payments (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { PaymentListResponse, PaymentCheckoutResponse } from "./definitions";

export class ApiPayments {
    /**
     * Method: GET
     * Path: /payments
     * List payments for authenticated user (or all payments for admins)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListPayments(queryParams: ListPaymentsQueryParameters): RequestParams<PaymentListResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/payments` + generateURIQuery(queryParams)),
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
     * Path: /payments/admin/user/{uid}
     * Lists payments for a specific user (admin view).
     * Requires permission: admin.users.manage
     * @param uid Target user id
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListAdminUserPayments(uid: string, queryParams: ListAdminUserPaymentsQueryParameters): RequestParams<PaymentListResponse, ListAdminUserPaymentsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/payments/admin/user/${encodeURIComponent(uid)}` + generateURIQuery(queryParams)),
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
     * Path: /payments/{id}
     * Get payment by id
     * @param id Payment id
     * @returns The request parameters
     */
    public static GetPayment(id: string): RequestParams<PaymentCheckoutResponse, GetPaymentErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/payments/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "PAYMENT_NOT_FOUND", handler.notFoundPaymentNotFound)
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
     * Method: GET
     * Path: /payments/{id}/invoice
     * Downloads invoice PDF for a payment.
     * @param id Payment ID
     * @returns The request parameters
     */
    public static DownloadPaymentInvoice(id: string): RequestParams<void, DownloadPaymentInvoiceErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/payments/${encodeURIComponent(id)}/invoice`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "PAYMENT_NOT_FOUND", handler.notFoundPaymentNotFound)
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
 * Query parameters for ListPayments
 */
export interface ListPaymentsQueryParameters {
    /**
     * Page number
     */
    page?: string;

    /**
     * Page size
     */
    pageSize?: string;

    /**
     * Filter by date from (Unix ms timestamp)
     */
    dateFrom?: string;

    /**
     * Filter by date to (Unix ms timestamp)
     */
    dateTo?: string;

    /**
     * Filter by payment type
     */
    paymentType?: string;

    /**
     * Filter by product type (item or plan)
     */
    productType?: string;

    /**
     * Filter by payment status (`paid` matches completed and confirmed)
     */
    status?: string;
}

/**
 * Error handler for ListAdminUserPayments
 */
export type ListAdminUserPaymentsErrorHandler = CommonAuthenticatedErrorHandler & {
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
 * Query parameters for ListAdminUserPayments
 */
export interface ListAdminUserPaymentsQueryParameters {
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
 * Error handler for GetPayment
 */
export type GetPaymentErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = PAYMENT_NOT_FOUND
     */
    notFoundPaymentNotFound: () => void;
};

/**
 * Error handler for DownloadPaymentInvoice
 */
export type DownloadPaymentInvoiceErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = PAYMENT_NOT_FOUND
     */
    notFoundPaymentNotFound: () => void;
};

