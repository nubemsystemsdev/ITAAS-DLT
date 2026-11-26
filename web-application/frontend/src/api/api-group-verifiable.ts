// API bindings: verifiable (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { RequestVCRequest, RoleRequestListResponse, VCRequest } from "./definitions";

export class ApiVerifiable {
    /**
     * Method: POST
     * Path: /vc-request
     * Request Verifiable Credential
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostVcrequest(body: RequestVCRequest): RequestParams<void, PostVcrequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/vc-request`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "WALLET_NOT_FOUND", handler.badRequestWalletNotFound)
                    .add(400, "DID_MISMATCH", handler.badRequestDidMismatch)
                    .add(400, "INVALID_DID_FORMAT", handler.badRequestInvalidDidFormat)
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
     * Path: /vc-request/{id}/accept
     * Accept VC Request
     * @param id Request ID
     * @returns The request parameters
     */
    public static AcceptVC(id: string): RequestParams<void, AcceptVCErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/vc-request/${encodeURIComponent(id)}/accept`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "VC_REQUEST_NOT_FOUND", handler.notFoundVcRequestNotFound)
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
     * Path: /vc-request/{id}/reject
     * Reject VC
     * @param id Credential ID to reject
     * @returns The request parameters
     */
    public static RejectVC(id: string): RequestParams<void, RejectVCErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/vc-request/${encodeURIComponent(id)}/reject`),
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
     * Path: /vc-request/list
     * Get all vc requests with pagination (admin only)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetVCRequestList(queryParams: GetVCRequestListQueryParameters): RequestParams<RoleRequestListResponse, GetVCRequestListErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/vc-request/list` + generateURIQuery(queryParams)),
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
     * Path: /vc-request/{id}
     * Get a vc request by ID
     * @param id VC request identifier
     * @returns The request parameters
     */
    public static GetVCRequest(id: string): RequestParams<VCRequest, GetVCRequestErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/vc-request/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "VC_REQUEST_NOT_FOUND", handler.notFoundVcRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_ID", handler.badRequestInvalidId)
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
 * Error handler for PostVcrequest
 */
export type PostVcrequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DID_FORMAT
     */
    badRequestInvalidDidFormat: () => void;

    /**
     * Handler for status = 400 and code = DID_MISMATCH
     */
    badRequestDidMismatch: () => void;

    /**
     * Handler for status = 400 and code = WALLET_NOT_FOUND
     */
    badRequestWalletNotFound: () => void;
};

/**
 * Error handler for AcceptVC
 */
export type AcceptVCErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = VC_REQUEST_NOT_FOUND
     */
    notFoundVcRequestNotFound: () => void;
};

/**
 * Error handler for RejectVC
 */
export type RejectVCErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetVCRequestList
 */
export type GetVCRequestListErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetVCRequestList
 */
export interface GetVCRequestListQueryParameters {
    /**
     * Page number for pagination (default: 1)
     */
    page?: number;
}

/**
 * Error handler for GetVCRequest
 */
export type GetVCRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ID
     */
    badRequestInvalidId: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = VC_REQUEST_NOT_FOUND
     */
    notFoundVcRequestNotFound: () => void;
};

