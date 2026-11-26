// API bindings: did (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler, CommonErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { DidRegisterUserResponse, DidRegisterUserBody, DidRegisterAIResponse, DidRegisterAIBody, DidMeResponse, DidMyCredentialsResponse, DidCreatePresentationResponse, DidCreatePresentationBody, DidVerifyPresentationResponse, DidVerifyPresentationBody } from "./definitions";

export class ApiDid {
    /**
     * Method: POST
     * Path: /did/register/user
     * Creates DID for the authenticated user and registers it on blockchain (EthereumDIDRegistry)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostDidRegisterUser(body: DidRegisterUserBody): RequestParams<DidRegisterUserResponse, PostDidRegisterUserErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/did/register/user`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "DID_CREATE_FAILED", handler.serverErrorDidCreateFailed)
                    .add(404, "WALLET_NOT_FOUND", handler.notFoundWalletNotFound)
                    .add(404, "*", handler.notFound)
                    .add(401, "AUTH_REQUIRED", handler.unauthorizedAuthRequired)
                    .add(400, "WALLET_PASSWORD_REQUIRED", handler.badRequestWalletPasswordRequired)
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
     * Path: /did/register/ai
     * Creates DID for an AI agent (admins only)
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostDidRegisterAi(body: DidRegisterAIBody): RequestParams<DidRegisterAIResponse, PostDidRegisterAiErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/did/register/ai`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "WALLET_NOT_FOUND", handler.notFoundWalletNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "ADMIN_REQUIRED", handler.forbiddenAdminRequired)
                    .add(403, "*", handler.forbidden)
                    .add(400, "WALLET_PASSWORD_REQUIRED", handler.badRequestWalletPasswordRequired)
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
     * Path: /did/resolve/{did}
     * Resolves a DID and returns the identity document
     * @param did DID to resolve (e.g. did:ethr:...)
     * @returns The request parameters
     */
    public static GetDidResolveDid(did: string): RequestParams<void, GetDidResolveDidErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/did/resolve/${encodeURIComponent(did)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_DID_FORMAT", handler.badRequestInvalidDidFormat)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /did/me
     * Returns the authenticated DID info (Bearer vcJwt)
     * @returns The request parameters
     */
    public static GetDidMe(): RequestParams<DidMeResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/did/me`),
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
     * Path: /did/my-credentials
     * Lists the verifiable credentials of the authenticated user
     * @returns The request parameters
     */
    public static GetDidMycredentials(): RequestParams<DidMyCredentialsResponse, GetDidMycredentialsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/did/my-credentials`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "AUTH_REQUIRED", handler.unauthorizedAuthRequired)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /did/create-presentation
     * Creates a Verifiable Presentation grouping multiple VCs
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostDidCreatepresentation(body: DidCreatePresentationBody): RequestParams<DidCreatePresentationResponse, PostDidCreatepresentationErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/did/create-presentation`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "WALLET_NOT_FOUND", handler.notFoundWalletNotFound)
                    .add(404, "NO_CREDENTIALS_FOUND", handler.notFoundNoCredentialsFound)
                    .add(404, "USER_NOT_FOUND", handler.notFoundUserNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "INVALID_PASSWORD", handler.badRequestInvalidPassword)
                    .add(400, "PASSWORD_REQUIRED", handler.badRequestPasswordRequired)
                    .add(400, "NONCE_REQUIRED", handler.badRequestNonceRequired)
                    .add(400, "CREDENTIAL_IDS_REQUIRED", handler.badRequestCredentialIdsRequired)
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
     * Path: /did/verify-presentation
     * Verifies a Verifiable Presentation
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostDidVerifypresentation(body: DidVerifyPresentationBody): RequestParams<DidVerifyPresentationResponse, PostDidVerifypresentationErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/did/verify-presentation`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "VPJWT_REQUIRED", handler.badRequestVpjwtRequired)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for PostDidRegisterUser
 */
export type PostDidRegisterUserErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WALLET_PASSWORD_REQUIRED
     */
    badRequestWalletPasswordRequired: () => void;

    /**
     * Handler for status = 401 and code = AUTH_REQUIRED
     */
    unauthorizedAuthRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = WALLET_NOT_FOUND
     */
    notFoundWalletNotFound: () => void;

    /**
     * Handler for status = 500 and code = DID_CREATE_FAILED
     */
    serverErrorDidCreateFailed: () => void;
};

/**
 * Error handler for PostDidRegisterAi
 */
export type PostDidRegisterAiErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = WALLET_PASSWORD_REQUIRED
     */
    badRequestWalletPasswordRequired: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = ADMIN_REQUIRED
     */
    forbiddenAdminRequired: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = WALLET_NOT_FOUND
     */
    notFoundWalletNotFound: () => void;
};

/**
 * Error handler for GetDidResolveDid
 */
export type GetDidResolveDidErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_DID_FORMAT
     */
    badRequestInvalidDidFormat: () => void;
};

/**
 * Error handler for GetDidMycredentials
 */
export type GetDidMycredentialsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * Handler for status = 401 and code = AUTH_REQUIRED
     */
    unauthorizedAuthRequired: () => void;
};

/**
 * Error handler for PostDidCreatepresentation
 */
export type PostDidCreatepresentationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CREDENTIAL_IDS_REQUIRED
     */
    badRequestCredentialIdsRequired: () => void;

    /**
     * Handler for status = 400 and code = NONCE_REQUIRED
     */
    badRequestNonceRequired: () => void;

    /**
     * Handler for status = 400 and code = PASSWORD_REQUIRED
     */
    badRequestPasswordRequired: () => void;

    /**
     * Handler for status = 400 and code = INVALID_PASSWORD
     */
    badRequestInvalidPassword: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = USER_NOT_FOUND
     */
    notFoundUserNotFound: () => void;

    /**
     * Handler for status = 404 and code = NO_CREDENTIALS_FOUND
     */
    notFoundNoCredentialsFound: () => void;

    /**
     * Handler for status = 404 and code = WALLET_NOT_FOUND
     */
    notFoundWalletNotFound: () => void;
};

/**
 * Error handler for PostDidVerifypresentation
 */
export type PostDidVerifypresentationErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = VPJWT_REQUIRED
     */
    badRequestVpjwtRequired: () => void;
};

