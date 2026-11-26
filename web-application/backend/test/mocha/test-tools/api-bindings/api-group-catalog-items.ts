// API bindings: catalog_items (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonErrorHandler, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl, generateURIQuery } from "./utils";
import { CatalogPublicEntryList, CatalogPublicList, CatalogPublicItemDetail, CatalogAdminList, CatalogBody, CatalogAdminEntryList, CatalogAdminItem } from "./definitions";

export class ApiCatalogItems {
    /**
     * Method: GET
     * Path: /catalog/entries
     * Get public catalog entries (items and plans) in one paginated response
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetPublicCatalogEntries(queryParams: GetPublicCatalogEntriesQueryParameters): RequestParams<CatalogPublicEntryList, CommonErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/catalog/entries` + generateURIQuery(queryParams)),
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
     * Path: /catalog/items
     * Get public catalog items (Published + Public only)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetPublicCatalogItems(queryParams: GetPublicCatalogItemsQueryParameters): RequestParams<CatalogPublicList, CommonErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/catalog/items` + generateURIQuery(queryParams)),
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
     * Path: /catalog/items/{id}
     * Get a public catalog item (Published + Public, or the Hidden custom-agent-service pricing item)
     * @param id Item ID
     * @returns The request parameters
     */
    public static GetPublicCatalogItem(id: string): RequestParams<CatalogPublicItemDetail, GetPublicCatalogItemErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/catalog/items/${encodeURIComponent(id)}`),
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
     * Path: /admin/catalog/items
     * Get all catalog items (admin, all statuses)
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAdminCatalogItems(queryParams: GetAdminCatalogItemsQueryParameters): RequestParams<CatalogAdminList, GetAdminCatalogItemsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/catalog/items` + generateURIQuery(queryParams)),
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
     * Path: /admin/catalog/items
     * Create a catalog item
     * Requires permission: admin.users.manage
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateCatalogItem(body: CatalogBody): RequestParams<void, CreateCatalogItemErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/catalog/items`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "PROTECTED", handler.badRequestProtected)
                    .add(400, "INVALID_VISIBILITY", handler.badRequestInvalidVisibility)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "INVALID_ANNUAL_PRICE", handler.badRequestInvalidAnnualPrice)
                    .add(400, "INVALID_MONTHLY_PRICE", handler.badRequestInvalidMonthlyPrice)
                    .add(400, "INVALID_LONG_DESCRIPTION", handler.badRequestInvalidLongDescription)
                    .add(400, "INVALID_SHORT_DESCRIPTION", handler.badRequestInvalidShortDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
                    .add(400, "INVALID_TYPE", handler.badRequestInvalidType)
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
     * Path: /admin/catalog/entries
     * Get all catalog items and plans (admin, all statuses) in one paginated response
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetAdminCatalogEntries(queryParams: GetAdminCatalogEntriesQueryParameters): RequestParams<CatalogAdminEntryList, GetAdminCatalogEntriesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/catalog/entries` + generateURIQuery(queryParams)),
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
     * Path: /admin/catalog/items/{id}
     * Get a single catalog item (admin)
     * Requires permission: admin.users.manage
     * @param id Item ID
     * @returns The request parameters
     */
    public static GetAdminCatalogItem(id: string): RequestParams<CatalogAdminItem, GetAdminCatalogItemErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/admin/catalog/items/${encodeURIComponent(id)}`),
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
     * Path: /admin/catalog/items/{id}
     * Update a catalog item
     * Requires permission: admin.users.manage
     * @param id Item ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateCatalogItem(id: string, body: CatalogBody): RequestParams<CatalogAdminItem, UpdateCatalogItemErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/admin/catalog/items/${encodeURIComponent(id)}`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "UPDATE_TRACEABILITY_ROLLBACK_FAILED", handler.serverErrorUpdateTraceabilityRollbackFailed)
                    .add(500, "UPDATE_TRACEABILITY_FAILED", handler.serverErrorUpdateTraceabilityFailed)
                    .add(500, "UPDATE_FAILED", handler.serverErrorUpdateFailed)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "PROTECTED", handler.badRequestProtected)
                    .add(400, "INVALID_VISIBILITY", handler.badRequestInvalidVisibility)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "INVALID_DEPOSIT_PRICE", handler.badRequestInvalidDepositPrice)
                    .add(400, "INVALID_ANNUAL_PRICE", handler.badRequestInvalidAnnualPrice)
                    .add(400, "INVALID_MONTHLY_PRICE", handler.badRequestInvalidMonthlyPrice)
                    .add(400, "INVALID_LONG_DESCRIPTION", handler.badRequestInvalidLongDescription)
                    .add(400, "INVALID_SHORT_DESCRIPTION", handler.badRequestInvalidShortDescription)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
                    .add(400, "INVALID_TYPE", handler.badRequestInvalidType)
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
     * Method: DELETE
     * Path: /admin/catalog/items/{id}
     * Delete a catalog item
     * Requires permission: admin.users.manage
     * @param id Item ID
     * @returns The request parameters
     */
    public static DeleteCatalogItem(id: string): RequestParams<void, DeleteCatalogItemErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/admin/catalog/items/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "PROTECTED", handler.badRequestProtected)
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
     * Path: /admin/catalog/items/{id}/archive
     * Archive a catalog item
     * Requires permission: admin.users.manage
     * @param id Item ID
     * @returns The request parameters
     */
    public static ArchiveCatalogItem(id: string): RequestParams<void, ArchiveCatalogItemErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/admin/catalog/items/${encodeURIComponent(id)}/archive`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "PROTECTED", handler.badRequestProtected)
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
 * Query parameters for GetPublicCatalogEntries
 */
export interface GetPublicCatalogEntriesQueryParameters {
    /**
     * Search query
     */
    q?: string;

    /**
     * Legacy filter by product, service, plan or all
     */
    filter?: string;

    /**
     * Filter by product, service, plan or all
     */
    type?: string;

    /**
     * Subscription mode: monthly, annual or any
     */
    subscriptionMode?: string;

    /**
     * Minimum price in EUR (uses selected subscriptionMode)
     */
    minPrice?: number;

    /**
     * Maximum price in EUR (uses selected subscriptionMode)
     */
    maxPrice?: number;

    /**
     * Sort field: relevance, name, price, createdAt
     */
    sortBy?: string;

    /**
     * Sort direction: asc or desc
     */
    sortDir?: string;

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
 * Query parameters for GetPublicCatalogItems
 */
export interface GetPublicCatalogItemsQueryParameters {
    /**
     * Search query
     */
    q?: string;

    /**
     * Filter by type
     */
    type?: string;

    /**
     * Filter by kind: service (includes ITAAS Platform) or product
     */
    catalogKind?: string;

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
 * Error handler for GetPublicCatalogItem
 */
export type GetPublicCatalogItemErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for GetAdminCatalogItems
 */
export type GetAdminCatalogItemsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetAdminCatalogItems
 */
export interface GetAdminCatalogItemsQueryParameters {
    /**
     * Search query
     */
    q?: string;

    /**
     * Filter by type
     */
    type?: string;

    /**
     * Filter by kind: service (includes ITAAS Platform) or product
     */
    catalogKind?: string;

    /**
     * Filter by status
     */
    status?: string;

    /**
     * Filter by visibility
     */
    visibility?: string;

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
 * Error handler for CreateCatalogItem
 */
export type CreateCatalogItemErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TYPE
     */
    badRequestInvalidType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SHORT_DESCRIPTION
     */
    badRequestInvalidShortDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_LONG_DESCRIPTION
     */
    badRequestInvalidLongDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_MONTHLY_PRICE
     */
    badRequestInvalidMonthlyPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ANNUAL_PRICE
     */
    badRequestInvalidAnnualPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_VISIBILITY
     */
    badRequestInvalidVisibility: () => void;

    /**
     * Handler for status = 400 and code = PROTECTED
     */
    badRequestProtected: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetAdminCatalogEntries
 */
export type GetAdminCatalogEntriesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetAdminCatalogEntries
 */
export interface GetAdminCatalogEntriesQueryParameters {
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
 * Error handler for GetAdminCatalogItem
 */
export type GetAdminCatalogItemErrorHandler = CommonAuthenticatedErrorHandler & {
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
 * Error handler for UpdateCatalogItem
 */
export type UpdateCatalogItemErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_REQUEST
     */
    badRequestInvalidRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TYPE
     */
    badRequestInvalidType: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SHORT_DESCRIPTION
     */
    badRequestInvalidShortDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_LONG_DESCRIPTION
     */
    badRequestInvalidLongDescription: () => void;

    /**
     * Handler for status = 400 and code = INVALID_MONTHLY_PRICE
     */
    badRequestInvalidMonthlyPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ANNUAL_PRICE
     */
    badRequestInvalidAnnualPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DEPOSIT_PRICE
     */
    badRequestInvalidDepositPrice: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * Handler for status = 400 and code = INVALID_VISIBILITY
     */
    badRequestInvalidVisibility: () => void;

    /**
     * Handler for status = 400 and code = PROTECTED
     */
    badRequestProtected: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 500 and code = UPDATE_FAILED
     */
    serverErrorUpdateFailed: () => void;

    /**
     * Handler for status = 500 and code = UPDATE_TRACEABILITY_FAILED
     */
    serverErrorUpdateTraceabilityFailed: () => void;

    /**
     * Handler for status = 500 and code = UPDATE_TRACEABILITY_ROLLBACK_FAILED
     */
    serverErrorUpdateTraceabilityRollbackFailed: () => void;
};

/**
 * Error handler for DeleteCatalogItem
 */
export type DeleteCatalogItemErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = PROTECTED
     */
    badRequestProtected: () => void;

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
 * Error handler for ArchiveCatalogItem
 */
export type ArchiveCatalogItemErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = PROTECTED
     */
    badRequestProtected: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

