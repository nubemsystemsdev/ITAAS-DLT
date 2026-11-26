// API bindings: auth (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler, CommonErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { AuthenticationContext, LoginResponse, LoginRequest, ThirdPartyLoginService, ThirdPartyLoginResponse, ThirdPartyLoginBody, SignupTPResponse, SignupTPRequest, TFALoginRequest, LogoutResponse, SignupResponse, SignupRequest, EmailVerifyResponse, EmailVerifyRequest, ForgotPasswordResponse, ForgotPasswordRequest, ResetPasswordRequest, KeycloakAuthUrlResponse, KeycloakReturnPathResponse, KeycloakCallbackResponse, KeycloakCallbackRequest } from "./definitions";

export class ApiAuth {
    /**
     * Method: GET
     * Path: /auth/context
     * Authentication context
     * @returns The request parameters
     */
    public static GetContext(): RequestParams<AuthenticationContext, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/context`),
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
     * Path: /auth/login
     * Login with username and password
     * @param body Body parameters
     * @returns The request parameters
     */
    public static Login(body: LoginRequest): RequestParams<LoginResponse, LoginErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/login`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "USER_BANNED", handler.forbiddenUserBanned)
                    .add(403, "INVALID_CREDENTIALS", handler.forbiddenInvalidCredentials)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_CREDENTIALS", handler.badRequestInvalidCredentials)
                    .add(400, "CAPTCHA", handler.badRequestCaptcha)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /auth/tp
     * Get Third party login information
     * @returns The request parameters
     */
    public static ThirdPartyLoginDetails(): RequestParams<ThirdPartyLoginService[], CommonErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/tp`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/login/tp
     * Login with a third party service
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ThirdPartyLogin(body: ThirdPartyLoginBody): RequestParams<ThirdPartyLoginResponse, ThirdPartyLoginErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/login/tp`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "BANNED", handler.badRequestBanned)
                    .add(400, "OAUTH_ERROR", handler.badRequestOauthError)
                    .add(400, "NO_CODE", handler.badRequestNoCode)
                    .add(400, "SERVICE_INVALID", handler.badRequestServiceInvalid)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/signup/tp
     * Creates an account using a third party user provider
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ThirdPartyRegister(body: SignupTPRequest): RequestParams<SignupTPResponse, ThirdPartyRegisterErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/signup/tp`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
                    .add(400, "EMAIL_IN_USE", handler.badRequestEmailInUse)
                    .add(400, "USERNAME_IN_USE", handler.badRequestUsernameInUse)
                    .add(400, "USERNAME_INVALID", handler.badRequestUsernameInvalid)
                    .add(400, "TOKEN_INVALID", handler.badRequestTokenInvalid)
                    .add(400, "ID_INVALID", handler.badRequestIdInvalid)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/tfa
     * Two factor authentication login. Input the one-use code
     * @param body Body parameters
     * @returns The request parameters
     */
    public static LoginTFA(body: TFALoginRequest): RequestParams<void, LoginTFAErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/tfa`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_CODE", handler.badRequestInvalidCode)
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
     * Path: /auth/logout
     * Logout
     * @returns The request parameters
     */
    public static Logout(): RequestParams<LogoutResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/logout`),
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
     * Path: /auth/signup
     * Creates an account using email + password
     * @param body Body parameters
     * @returns The request parameters
     */
    public static Signup(body: SignupRequest): RequestParams<SignupResponse, SignupErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/signup`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
                    .add(400, "USERNAME_IN_USE", handler.badRequestUsernameInUse)
                    .add(400, "USERNAME_INVALID", handler.badRequestUsernameInvalid)
                    .add(400, "EMAIL_IN_USE", handler.badRequestEmailInUse)
                    .add(400, "EMAIL_INVALID", handler.badRequestEmailInvalid)
                    .add(400, "CAPTCHA", handler.badRequestCaptcha)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/email/verify
     * Verifies an account email or confirms a pending email change.
     * With Keycloak SSO this remains available so Marketplace verification links work;
     * after a successful email change the backend syncs email + emailVerified to Keycloak.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static VerifyEmail(body: EmailVerifyRequest): RequestParams<EmailVerifyResponse, VerifyEmailErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/email/verify`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "INVALID_VERIFICATION_CODE", handler.notFoundInvalidVerificationCode)
                    .add(404, "*", handler.notFound)
                    .add(403, "EMAIL_IN_USE", handler.forbiddenEmailInUse)
                    .add(403, "*", handler.forbidden)
                    .add(400, "KEYCLOAK_UNAVAILABLE", handler.badRequestKeycloakUnavailable)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/password/forgot
     * Request password reset email.
     * Note: if the account is not verified, a verification email will be send instead
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RequestPasswordReset(body: ForgotPasswordRequest): RequestParams<ForgotPasswordResponse, RequestPasswordResetErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/password/forgot`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "USER_NOT_FOUND", handler.notFoundUserNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "EMAIL_INVALID", handler.badRequestEmailInvalid)
                    .add(400, "CAPTCHA", handler.badRequestCaptcha)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /auth/password/reset
     * Resets account password
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ResetAccountPassword(body: ResetPasswordRequest): RequestParams<void, ResetAccountPasswordErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/password/reset`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "INVALID_RESET_CODE", handler.notFoundInvalidResetCode)
                    .add(404, "*", handler.notFound)
                    .add(400, "WEAK_PASSWORD", handler.badRequestWeakPassword)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /auth/keycloak/login
     * Get Keycloak login URL
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static KeycloakLoginUrl(queryParams: KeycloakLoginUrlQueryParameters): RequestParams<KeycloakAuthUrlResponse, KeycloakLoginUrlErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/keycloak/login` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS", handler.status503KeycloakOauthStateRequiresRedis)
                    .add(503, "*", handler.status503)
                    .add(403, "KEYCLOAK_DISABLED", handler.forbiddenKeycloakDisabled)
                    .add(403, "*", handler.forbidden)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /auth/keycloak/register
     * Get Keycloak registration URL
     * @returns The request parameters
     */
    public static KeycloakRegisterUrl(): RequestParams<KeycloakAuthUrlResponse, KeycloakRegisterUrlErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/keycloak/register`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS", handler.status503KeycloakOauthStateRequiresRedis)
                    .add(503, "*", handler.status503)
                    .add(403, "KEYCLOAK_DISABLED", handler.forbiddenKeycloakDisabled)
                    .add(403, "*", handler.forbidden)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /auth/keycloak/configure-totp
     * Get Keycloak Application Initiated Action URL for Mobile Authenticator Setup (CONFIGURE_TOTP)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static KeycloakConfigureTotpUrl(queryParams: KeycloakConfigureTotpUrlQueryParameters): RequestParams<KeycloakAuthUrlResponse, KeycloakConfigureTotpUrlErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/keycloak/configure-totp` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS", handler.status503KeycloakOauthStateRequiresRedis)
                    .add(503, "*", handler.status503)
                    .add(403, "KEYCLOAK_DISABLED", handler.forbiddenKeycloakDisabled)
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
     * Path: /auth/keycloak/update-password
     * Get Keycloak Application Initiated Action URL for Update Password (UPDATE_PASSWORD)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static KeycloakUpdatePasswordUrl(queryParams: KeycloakUpdatePasswordUrlQueryParameters): RequestParams<KeycloakAuthUrlResponse, KeycloakUpdatePasswordUrlErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/keycloak/update-password` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS", handler.status503KeycloakOauthStateRequiresRedis)
                    .add(503, "*", handler.status503)
                    .add(403, "KEYCLOAK_DISABLED", handler.forbiddenKeycloakDisabled)
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
     * Path: /auth/keycloak/return-path
     * Consumes the return path stored with an OAuth state (used after Cancel / AIA without code exchange)
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static KeycloakReturnPath(queryParams: KeycloakReturnPathQueryParameters): RequestParams<KeycloakReturnPathResponse, KeycloakReturnPathErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/auth/keycloak/return-path` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(503, "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS", handler.status503KeycloakOauthStateRequiresRedis)
                    .add(503, "*", handler.status503)
                    .add(403, "KEYCLOAK_DISABLED", handler.forbiddenKeycloakDisabled)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATE", handler.badRequestInvalidState)
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
     * Path: /auth/keycloak/callback
     * Complete Keycloak OAuth callback
     * @param body Body parameters
     * @returns The request parameters
     */
    public static KeycloakCallback(body: KeycloakCallbackRequest): RequestParams<KeycloakCallbackResponse, KeycloakCallbackErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/auth/keycloak/callback`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "USER_BANNED", handler.badRequestUserBanned)
                    .add(400, "KEYCLOAK_EMAIL_NOT_VERIFIED", handler.badRequestKeycloakEmailNotVerified)
                    .add(400, "IDENTITY_MISMATCH", handler.badRequestIdentityMismatch)
                    .add(400, "OAUTH_ERROR", handler.badRequestOauthError)
                    .add(400, "NO_CODE", handler.badRequestNoCode)
                    .add(400, "INVALID_STATE", handler.badRequestInvalidState)
                    .add(400, "KEYCLOAK_DISABLED", handler.badRequestKeycloakDisabled)
                    .add(400, "*", handler.badRequest)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for Login
 */
export type LoginErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CAPTCHA
     */
    badRequestCaptcha: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CREDENTIALS
     */
    badRequestInvalidCredentials: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = INVALID_CREDENTIALS
     */
    forbiddenInvalidCredentials: () => void;

    /**
     * Handler for status = 403 and code = USER_BANNED
     */
    forbiddenUserBanned: () => void;
};

/**
 * Error handler for ThirdPartyLogin
 */
export type ThirdPartyLoginErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = SERVICE_INVALID
     */
    badRequestServiceInvalid: () => void;

    /**
     * Handler for status = 400 and code = NO_CODE
     */
    badRequestNoCode: () => void;

    /**
     * Handler for status = 400 and code = OAUTH_ERROR
     */
    badRequestOauthError: () => void;

    /**
     * Handler for status = 400 and code = BANNED
     */
    badRequestBanned: () => void;
};

/**
 * Error handler for ThirdPartyRegister
 */
export type ThirdPartyRegisterErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = ID_INVALID
     */
    badRequestIdInvalid: () => void;

    /**
     * Handler for status = 400 and code = TOKEN_INVALID
     */
    badRequestTokenInvalid: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_INVALID
     */
    badRequestUsernameInvalid: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_IN_USE
     */
    badRequestUsernameInUse: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_IN_USE
     */
    badRequestEmailInUse: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;
};

/**
 * Error handler for LoginTFA
 */
export type LoginTFAErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CAPTCHA
     */
    badRequestCaptcha: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CODE
     */
    badRequestInvalidCode: () => void;

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
 * Error handler for Signup
 */
export type SignupErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CAPTCHA
     */
    badRequestCaptcha: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_INVALID
     */
    badRequestEmailInvalid: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_IN_USE
     */
    badRequestEmailInUse: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_INVALID
     */
    badRequestUsernameInvalid: () => void;

    /**
     * Handler for status = 400 and code = USERNAME_IN_USE
     */
    badRequestUsernameInUse: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;
};

/**
 * Error handler for VerifyEmail
 */
export type VerifyEmailErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_UNAVAILABLE
     */
    badRequestKeycloakUnavailable: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = EMAIL_IN_USE
     */
    forbiddenEmailInUse: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = INVALID_VERIFICATION_CODE
     */
    notFoundInvalidVerificationCode: () => void;
};

/**
 * Error handler for RequestPasswordReset
 */
export type RequestPasswordResetErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CAPTCHA
     */
    badRequestCaptcha: () => void;

    /**
     * Handler for status = 400 and code = EMAIL_INVALID
     */
    badRequestEmailInvalid: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = USER_NOT_FOUND
     */
    notFoundUserNotFound: () => void;
};

/**
 * Error handler for ResetAccountPassword
 */
export type ResetAccountPasswordErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = WEAK_PASSWORD
     */
    badRequestWeakPassword: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = INVALID_RESET_CODE
     */
    notFoundInvalidResetCode: () => void;
};

/**
 * Error handler for KeycloakLoginUrl
 */
export type KeycloakLoginUrlErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_DISABLED
     */
    forbiddenKeycloakDisabled: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    status503KeycloakOauthStateRequiresRedis: () => void;
};

/**
 * Query parameters for KeycloakLoginUrl
 */
export interface KeycloakLoginUrlQueryParameters {
    /**
     * Relative in-app path to return to after a successful login
     */
    return_to?: string;
}

/**
 * Error handler for KeycloakRegisterUrl
 */
export type KeycloakRegisterUrlErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_DISABLED
     */
    forbiddenKeycloakDisabled: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    status503KeycloakOauthStateRequiresRedis: () => void;
};

/**
 * Error handler for KeycloakConfigureTotpUrl
 */
export type KeycloakConfigureTotpUrlErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_DISABLED
     */
    forbiddenKeycloakDisabled: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    status503KeycloakOauthStateRequiresRedis: () => void;
};

/**
 * Query parameters for KeycloakConfigureTotpUrl
 */
export interface KeycloakConfigureTotpUrlQueryParameters {
    /**
     * Relative in-app path to return to after Cancel / success
     */
    return_to?: string;
}

/**
 * Error handler for KeycloakUpdatePasswordUrl
 */
export type KeycloakUpdatePasswordUrlErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_DISABLED
     */
    forbiddenKeycloakDisabled: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    status503KeycloakOauthStateRequiresRedis: () => void;
};

/**
 * Query parameters for KeycloakUpdatePasswordUrl
 */
export interface KeycloakUpdatePasswordUrlQueryParameters {
    /**
     * Relative in-app path to return to after Cancel / success
     */
    return_to?: string;
}

/**
 * Error handler for KeycloakReturnPath
 */
export type KeycloakReturnPathErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATE
     */
    badRequestInvalidState: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = KEYCLOAK_DISABLED
     */
    forbiddenKeycloakDisabled: () => void;

    /**
     * General handler for status = 503
     */
    status503: () => void;

    /**
     * Handler for status = 503 and code = KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    status503KeycloakOauthStateRequiresRedis: () => void;
};

/**
 * Query parameters for KeycloakReturnPath
 */
export interface KeycloakReturnPathQueryParameters {
    /**
     * OAuth CSRF state token
     */
    state: string;
}

/**
 * Error handler for KeycloakCallback
 */
export type KeycloakCallbackErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_DISABLED
     */
    badRequestKeycloakDisabled: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATE
     */
    badRequestInvalidState: () => void;

    /**
     * Handler for status = 400 and code = NO_CODE
     */
    badRequestNoCode: () => void;

    /**
     * Handler for status = 400 and code = OAUTH_ERROR
     */
    badRequestOauthError: () => void;

    /**
     * Handler for status = 400 and code = IDENTITY_MISMATCH
     */
    badRequestIdentityMismatch: () => void;

    /**
     * Handler for status = 400 and code = KEYCLOAK_EMAIL_NOT_VERIFIED
     */
    badRequestKeycloakEmailNotVerified: () => void;

    /**
     * Handler for status = 400 and code = USER_BANNED
     */
    badRequestUserBanned: () => void;
};

