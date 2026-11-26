// API bindings: vc (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonErrorHandler, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { CredentialRevocationStatusResponse, RevokeCredentialResponse, RevokeCredentialBody, DidVerifyBody } from "./definitions";

export class ApiVc {
    /**
     * Method: GET
     * Path: /vc-request/credentials/{credentialId}/revoked
     * Check whether a credential is revoked on-chain or locally
     * @param credentialId Credential ID to check
     * @returns The request parameters
     */
    public static GetVcrequestCredentialsCredentialidRevoked(credentialId: string): RequestParams<CredentialRevocationStatusResponse, GetVcrequestCredentialsCredentialidRevokedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/vc-request/credentials/${encodeURIComponent(credentialId)}/revoked`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_ID", handler.badRequestInvalidId)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /vc-request/credentials/{credentialId}/revoke
     * Revokes a verifiable credential (admin or credential owner)
     * @param credentialId Credential ID to revoke
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostVcrequestCredentialsCredentialidRevoke(credentialId: string, body: RevokeCredentialBody): RequestParams<RevokeCredentialResponse, PostVcrequestCredentialsCredentialidRevokeErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/vc-request/credentials/${encodeURIComponent(credentialId)}/revoke`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "CREDENTIAL_NOT_FOUND", handler.notFoundCredentialNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "NOT_AUTHORIZED", handler.forbiddenNotAuthorized)
                    .add(403, "*", handler.forbidden)
                    .add(400, "ALREADY_REVOKED", handler.badRequestAlreadyRevoked)
                    .add(400, "REASON_REQUIRED", handler.badRequestReasonRequired)
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
     * Path: /vc-request/credentials/verify
     * Verifies a Verifiable Credential (VC) JWT
     * @param body Body parameters
     * @returns The request parameters
     */
    public static PostVcrequestCredentialsVerify(body: DidVerifyBody): RequestParams<void, PostVcrequestCredentialsVerifyErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/vc-request/credentials/verify`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "VCJWT_REQUIRED", handler.badRequestVcjwtRequired)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for GetVcrequestCredentialsCredentialidRevoked
 */
export type GetVcrequestCredentialsCredentialidRevokedErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ID
     */
    badRequestInvalidId: () => void;
};

/**
 * Error handler for PostVcrequestCredentialsCredentialidRevoke
 */
export type PostVcrequestCredentialsCredentialidRevokeErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = REASON_REQUIRED
     */
    badRequestReasonRequired: () => void;

    /**
     * Handler for status = 400 and code = ALREADY_REVOKED
     */
    badRequestAlreadyRevoked: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = NOT_AUTHORIZED
     */
    forbiddenNotAuthorized: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = CREDENTIAL_NOT_FOUND
     */
    notFoundCredentialNotFound: () => void;
};

/**
 * Error handler for PostVcrequestCredentialsVerify
 */
export type PostVcrequestCredentialsVerifyErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = VCJWT_REQUIRED
     */
    badRequestVcjwtRequired: () => void;
};

