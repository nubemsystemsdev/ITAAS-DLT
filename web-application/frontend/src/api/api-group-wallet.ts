// API bindings: wallet (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl } from "./utils";
import { WalletInfo, WalletCreateBody, WalletChangePasswordBody, WalletExportResponse, WalletExportBody } from "./definitions";

export class ApiWallet {
    /**
     * Method: GET
     * Path: /wallet
     * Get wallet
     * @returns The request parameters
     */
    public static GetWallet(): RequestParams<WalletInfo, GetWalletErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/wallet`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
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
     * Path: /wallet
     * Create wallet
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateWallet(body: WalletCreateBody): RequestParams<WalletInfo, CreateWalletErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/wallet`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "ERROR_CREATING_WALLET", handler.badRequestErrorCreatingWallet)
                    .add(400, "INVALID_PUBLIC_KEY_ML", handler.badRequestInvalidPublicKeyMl)
                    .add(400, "INVALID_PRIVATE_KEY_ML", handler.badRequestInvalidPrivateKeyMl)
                    .add(400, "INVALID_PRIVATE_KEY_EC", handler.badRequestInvalidPrivateKeyEc)
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
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
     * Path: /wallet/password
     * Change wallet password
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeWalletPassword(body: WalletChangePasswordBody): RequestParams<void, ChangeWalletPasswordErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/wallet/password`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
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
     * Path: /wallet/export
     * Export wallet private key
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ExportPrivatekey(body: WalletExportBody): RequestParams<WalletExportResponse, ExportPrivatekeyErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/wallet/export`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
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
 * Error handler for GetWallet
 */
export type GetWalletErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for CreateWallet
 */
export type CreateWalletErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRIVATE_KEY_EC
     */
    badRequestInvalidPrivateKeyEc: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PRIVATE_KEY_ML
     */
    badRequestInvalidPrivateKeyMl: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PUBLIC_KEY_ML
     */
    badRequestInvalidPublicKeyMl: () => void;

    /**
     * Handler for status = 400 and code = ERROR_CREATING_WALLET
     */
    badRequestErrorCreatingWallet: () => void;
};

/**
 * Error handler for ChangeWalletPassword
 */
export type ChangeWalletPasswordErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for ExportPrivatekey
 */
export type ExportPrivatekeyErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

