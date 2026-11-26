// API bindings: account (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl } from "./utils";
import { UsernameChangeRequest, EmailChangeRequest, PasswordChangeRequest, TFAGenResponse, TFASetupRequest, TFARemoveRequest, SessionListItem, ChangeLocaleBody, DeleteAccountRequest } from "./definitions";

export class ApiAccount {
    /**
     * Method: POST
     * Path: /account/username
     * Changes username
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeUsername(body: UsernameChangeRequest): RequestParams<void, ChangeUsernameErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/username`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "NO_KEYCLOAK_SESSION", handler.badRequestNoKeycloakSession)
                    .add(400, "KEYCLOAK_UNAVAILABLE", handler.badRequestKeycloakUnavailable)
                    .add(400, "INVALID_TFA_CODE", handler.badRequestInvalidTfaCode)
                    .add(400, "USERNAME_IN_USE", handler.badRequestUsernameInUse)
                    .add(400, "USERNAME_INVALID", handler.badRequestUsernameInvalid)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
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
     * Path: /account/email
     * Changes email.
     * Warning: Requests the change and sends a Marketplace verification email. Competing unverified
     * accounts are not deleted at request time. The new email is applied (and synced to Keycloak when
     * SSO is enabled) only after the user confirms the link; reclaim happens in verifyEmail.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeEmail(body: EmailChangeRequest): RequestParams<void, ChangeEmailErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/email`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "NO_KEYCLOAK_SESSION", handler.badRequestNoKeycloakSession)
                    .add(400, "KEYCLOAK_UNAVAILABLE", handler.badRequestKeycloakUnavailable)
                    .add(400, "INVALID_TFA_CODE", handler.badRequestInvalidTfaCode)
                    .add(400, "EMAIL_IN_USE", handler.badRequestEmailInUse)
                    .add(400, "EMAIL_INVALID", handler.badRequestEmailInvalid)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
                    .add(400, "CAPTCHA", handler.badRequestCaptcha)
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
     * Path: /account/password
     * Changes password.
     * Under Keycloak SSO use AIA UPDATE_PASSWORD (`GET /auth/keycloak/update-password`) instead.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangePassword(body: PasswordChangeRequest): RequestParams<void, ChangePasswordErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/password`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "KEYCLOAK_UNAVAILABLE", handler.badRequestKeycloakUnavailable)
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
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
     * Path: /account/tfa/generate
     * Generates two factor authentication secret
     * @returns The request parameters
     */
    public static GenerateTFA(): RequestParams<TFAGenResponse, GenerateTFAErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/account/tfa/generate`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "KEYCLOAK_ONLY", handler.forbiddenKeycloakOnly)
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
     * Path: /account/tfa/setup
     * Setup two factor authentication
     * Warning: This closes all user sessions
     * @param body Body parameters
     * @returns The request parameters
     */
    public static SetupTFA(body: TFASetupRequest): RequestParams<void, SetupTFAErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/tfa/setup`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "KEYCLOAK_ONLY", handler.forbiddenKeycloakOnly)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID", handler.badRequestInvalid)
                    .add(400, "ALREADY", handler.badRequestAlready)
                    .add(400, "WRONG_PASSWORD", handler.badRequestWrongPassword)
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
     * Path: /account/tfa/disable
     * Disables two factor authentication
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RemoveTFA(body: TFARemoveRequest): RequestParams<void, RemoveTFAErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/tfa/disable`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "KEYCLOAK_ONLY", handler.forbiddenKeycloakOnly)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID", handler.badRequestInvalid)
                    .add(400, "NOT_ENABLED", handler.badRequestNotEnabled)
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
     * Path: /account/sessions
     * Gets all sessions open, so you can close them
     * This is a security feature
     * @returns The request parameters
     */
    public static GetSessions(): RequestParams<SessionListItem[], CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/account/sessions`),
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
     * Method: DELETE
     * Path: /account/sessions/{id}
     * Closes an active session
     * @param id Session ID
     * @returns The request parameters
     */
    public static CloseSession(id: string): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/account/sessions/${encodeURIComponent(id)}`),
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
     * Method: POST
     * Path: /account/sessions/close
     * Closes all user sessions
     * @returns The request parameters
     */
    public static CloseAllSessions(): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/sessions/close`),
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
     * Method: POST
     * Path: /account/locale
     * Changes user locale
     * The user locale is the language used for emails
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeLocale(body: ChangeLocaleBody): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/locale`),
            json: body,
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
     * Method: POST
     * Path: /account/delete
     * Deletes account
     * @param body Body parameters
     * @returns The request parameters
     */
    public static DeleteAccount(body: DeleteAccountRequest): RequestParams<void, DeleteAccountErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/account/delete`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_TFA_CODE", handler.badRequestInvalidTfaCode)
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
 * Error handler for ChangeUsername
 */
export type ChangeUsernameErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_INVALID
     */
    badRequestUsernameInvalid: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_IN_USE
     */
    badRequestUsernameInUse: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TFA_CODE
     */
    badRequestInvalidTfaCode: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_UNAVAILABLE
     */
    badRequestKeycloakUnavailable: () => void;

    /**
     * Handler for status = 400 and code = NO_KEYCLOAK_SESSION
     */
    badRequestNoKeycloakSession: () => void;
};

/**
 * Error handler for ChangeEmail
 */
export type ChangeEmailErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CAPTCHA
     */
    badRequestCaptcha: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_INVALID
     */
    badRequestEmailInvalid: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_IN_USE
     */
    badRequestEmailInUse: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TFA_CODE
     */
    badRequestInvalidTfaCode: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_UNAVAILABLE
     */
    badRequestKeycloakUnavailable: () => void;

    /**
     * Handler for status = 400 and code = NO_KEYCLOAK_SESSION
     */
    badRequestNoKeycloakSession: () => void;
};

/**
 * Error handler for ChangePassword
 */
export type ChangePasswordErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_UNAVAILABLE
     */
    badRequestKeycloakUnavailable: () => void;
};

/**
 * Error handler for GenerateTFA
 */
export type GenerateTFAErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_ONLY
     */
    forbiddenKeycloakOnly: () => void;
};

/**
 * Error handler for SetupTFA
 */
export type SetupTFAErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * Handler for status = 400 and code = ALREADY
     */
    badRequestAlready: () => void;

    /**
     * Handler for status = 400 and code = INVALID
     */
    badRequestInvalid: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_ONLY
     */
    forbiddenKeycloakOnly: () => void;
};

/**
 * Error handler for RemoveTFA
 */
export type RemoveTFAErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = NOT_ENABLED
     */
    badRequestNotEnabled: () => void;

    /**
     * Handler for status = 400 and code = INVALID
     */
    badRequestInvalid: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_ONLY
     */
    forbiddenKeycloakOnly: () => void;
};

/**
 * Error handler for DeleteAccount
 */
export type DeleteAccountErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WRONG_PASSWORD
     */
    badRequestWrongPassword: () => void;

    /**
     * Handler for status = 400 and code = INVALID_TFA_CODE
     */
    badRequestInvalidTfaCode: () => void;
};

