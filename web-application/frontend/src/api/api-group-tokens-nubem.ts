// API bindings: tokens_nubem (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { TokensBalanceResponse, TokensHistoryResponse, TokenRedeemQuoteResponse, TokenRedeemQuoteBody, TokensOnChainBalanceResponse } from "./definitions";

export class ApiTokensNubem {
    /**
     * Method: GET
     * Path: /tokens/balance
     * Get NubemToken balance
     * @returns The request parameters
     */
    public static GetNubemTokenBalance(): RequestParams<TokensBalanceResponse, GetNubemTokenBalanceErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/tokens/balance`),
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
     * Path: /tokens/history
     * Get NubemToken history
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetNubemTokenHistory(queryParams: GetNubemTokenHistoryQueryParameters): RequestParams<TokensHistoryResponse, GetNubemTokenHistoryErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/tokens/history` + generateURIQuery(queryParams)),
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
     * Path: /tokens/redeem/quote
     * Quote token redeem
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostNubemTokenRedeemQuote(body: TokenRedeemQuoteBody): RequestParams<TokenRedeemQuoteResponse, PostNubemTokenRedeemQuoteErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/tokens/redeem/quote`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_AMOUNT", handler.badRequestInvalidAmount)
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
     * Path: /tokens/onchain/balance/own
     * Get user's own on-chain balance
     * @returns The request parameters
     */
    public static GetOwnOnChainTokenBalance(): RequestParams<TokensOnChainBalanceResponse, GetOwnOnChainTokenBalanceErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/tokens/onchain/balance/own`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "WALLET_NOT_FOUND", handler.forbiddenWalletNotFound)
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
     * Path: /tokens/onchain/balance
     * Get on-chain balance for a specific wallet address (admin only)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static GetOnChainTokenBalance(queryParams: GetOnChainTokenBalanceQueryParameters): RequestParams<TokensOnChainBalanceResponse, GetOnChainTokenBalanceErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/tokens/onchain/balance` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "WALLET_NOT_FOUND", handler.forbiddenWalletNotFound)
                    .add(403, "ACCESS_DENIED", handler.forbiddenAccessDenied)
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
 * Error handler for GetNubemTokenBalance
 */
export type GetNubemTokenBalanceErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetNubemTokenHistory
 */
export type GetNubemTokenHistoryErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for GetNubemTokenHistory
 */
export interface GetNubemTokenHistoryQueryParameters {
    /**
     * Page number (1-based)
     */
    page?: number;

    /**
     * Page size
     */
    pageSize?: number;
}

/**
 * Error handler for PostNubemTokenRedeemQuote
 */
export type PostNubemTokenRedeemQuoteErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_AMOUNT
     */
    badRequestInvalidAmount: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Error handler for GetOwnOnChainTokenBalance
 */
export type GetOwnOnChainTokenBalanceErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = WALLET_NOT_FOUND
     */
    forbiddenWalletNotFound: () => void;
};

/**
 * Error handler for GetOnChainTokenBalance
 */
export type GetOnChainTokenBalanceErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ACCESS_DENIED
     */
    forbiddenAccessDenied: () => void;

    /**
     * Handler for status = 403 and code = WALLET_NOT_FOUND
     */
    forbiddenWalletNotFound: () => void;
};

/**
 * Query parameters for GetOnChainTokenBalance
 */
export interface GetOnChainTokenBalanceQueryParameters {
    /**
     * Wallet address to query
     */
    address: string;
}

