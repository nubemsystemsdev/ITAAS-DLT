// Reserved for license

"use strict";

import Express from "express";
import { UserSystemConfig } from "../../config/config-users";
import { ItaasFlowFavorite } from "../../models/itaas-flow-favorite";
import { Session } from "../../models/users/session";
import { User } from "../../models/users/user";
import { KeycloakAccountService } from "../../services/keycloak-account-service";
import { KeycloakAdminService } from "../../services/keycloak-admin-service";
import { TwoFactorAuthenticationService } from "../../services/tfa-service";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, noCache, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { isKeycloakAuthOnly, rejectNativeAuthIfKeycloak } from "../../utils/keycloak-auth-guard";
import { createRandomToken, validateEmail } from "../../utils/text-utils";
import { Controller } from "../controller";
import { InternationalizationService } from "../../services/i18n-service";
import { CaptchaConfig } from "../../config/config-captcha";
import { CaptchaService } from "../../services/captcha-service";

/**
 * Account API
 * @group account
 */
export class AccountController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        // Change username
        application.post(prefix + "/account/username", ensureObjectBody(this.changeUsername.bind(this)));

        // Change email
        application.post(prefix + "/account/email", ensureObjectBody(this.changeEmail.bind(this)));

        // Change password
        application.post(prefix + "/account/password", ensureObjectBody(this.changePassword.bind(this)));

        // TFA
        application.get(prefix + "/account/tfa/generate", ensureObjectBody(noCache(this.generateTFA.bind(this))));
        application.post(prefix + "/account/tfa/setup", ensureObjectBody(this.setupTFA.bind(this)));
        application.post(prefix + "/account/tfa/disable", ensureObjectBody(this.removeTFA.bind(this)));

        // Sessions
        application.get(prefix + "/account/sessions", ensureObjectBody(noCache(this.getSessions.bind(this))));
        application.delete(prefix + "/account/sessions/:id", ensureObjectBody(this.closeSession.bind(this)));
        application.post(prefix + "/account/sessions/close", ensureObjectBody(this.closeSessions.bind(this)));

        // Change locale
        application.post(prefix + "/account/locale", ensureObjectBody(this.changeLocale.bind(this)));

        // Delete account
        application.post(prefix + "/account/delete", ensureObjectBody(this.deleteAccount.bind(this)));
    }

    /**
     * @typedef UsernameChangeRequest
     * @property {string} username.required - New username
     * @property {string} password - Account password (required when Keycloak SSO is disabled)
     * @property {string} tfa_token - Two factor authentication code, if you have it enabled is required
     */

    /**
     * Changes username
     * Binding: ChangeUsername
     * @route POST /account/username
     * @group account
     * @param {UsernameChangeRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WRONG_PASSWORD, USERNAME_INVALID, USERNAME_IN_USE, INVALID_TFA_CODE, KEYCLOAK_UNAVAILABLE, NO_KEYCLOAK_SESSION
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async changeUsername(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;
        const keycloakSso = isKeycloakAuthOnly();

        if (!keycloakSso) {
            // Password

            const password = (request.body.password || "") + "";

            if (!user.checkPassword(password)) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "WRONG_PASSWORD",
                    "The client provided a wrong password",
                );
                return;
            }

            // Validate token

            if (user.tfa) {
                const token = (request.body.tfa_token || request.body.token || "") + "";
                if (!TwoFactorAuthenticationService.getInstance().check(token, user.tfaSecret)) {
                    sendApiError(
                        request,
                        response,
                        BAD_REQUEST,
                        "INVALID_TFA_CODE",
                        "The client provided an invalid TFA code",
                    );
                    return;
                }
            }
        }

        // Username
        const username = (request.body.username || "") + "";

        if (!username || !User.validateUserName(username)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_INVALID",
                "The client provided an invalid username",
            );
            return;
        }

        const existing = await User.findUser(username);
        if (existing !== null && existing.id !== user.id) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_IN_USE",
                "The client provided an username that is in use by another account",
            );
            return;
        }

        if (keycloakSso) {
            if (!user.keycloakSub || !auth.session) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "NO_KEYCLOAK_SESSION"
                );
                return;
            }

            const hasKcSession = await KeycloakAccountService.getInstance().hasLiveKeycloakSession(auth.session);
            if (!hasKcSession) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "NO_KEYCLOAK_SESSION"
                );
                return;
            }

            const previousUsername = user.username;
            const previousUsernameLowerCase = user.usernameLowerCase;

            const kcResult = await KeycloakAdminService.getInstance().updateUser(user.keycloakSub, { username });

            if (kcResult.ok === false) {
                const failureCode = kcResult.code;
                const code = failureCode === "USERNAME_IN_USE" || failureCode === "EMAIL_IN_USE"
                    ? "USERNAME_IN_USE"
                    : "KEYCLOAK_UNAVAILABLE";
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    code
                );
                return;
            }

            user.username = username;
            user.usernameLowerCase = username.toLowerCase();

            try {
                await user.save();
            } catch (ex) {
                request.logger.error(ex);
                const rollback = await KeycloakAdminService.getInstance().updateUser(user.keycloakSub, {
                    username: previousUsername,
                });
                if (rollback.ok === false) {
                    request.logger.error(
                        "[Account] Username rollback in Keycloak failed after local save error for user " + user.id,
                    );
                }
                user.username = previousUsername;
                user.usernameLowerCase = previousUsernameLowerCase;
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "KEYCLOAK_UNAVAILABLE"
                );
                return;
            }

            await UsersService.getInstance().clearProfileCache(user.id);

            sendApiSuccess(request, response);
            return;
        }

        user.username = username;
        user.usernameLowerCase = username.toLowerCase();

        await user.save();

        await UsersService.getInstance().clearProfileCache(user.id);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef EmailChangeRequest
     * @property {string} email.required - New email
     * @property {string} password - Account password (required when Keycloak SSO is disabled)
     * @property {string} tfa_token - Two factor authentication code, if you have it enabled is required
     * @property {string} captcha - Captcha (Action = "change_email")
     */

    /**
     * Changes email.
     * Binding: ChangeEmail
     * Warning: Requests the change and sends a Marketplace verification email. Competing unverified
     * accounts are not deleted at request time. The new email is applied (and synced to Keycloak when
     * SSO is enabled) only after the user confirms the link; reclaim happens in verifyEmail.
     * @route POST /account/email
     * @group account
     * @param {EmailChangeRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: CAPTCHA, WRONG_PASSWORD, EMAIL_INVALID, EMAIL_IN_USE, INVALID_TFA_CODE, KEYCLOAK_UNAVAILABLE, NO_KEYCLOAK_SESSION
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async changeEmail(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;
        const keycloakSso = isKeycloakAuthOnly();

        // Check captcha

        if (CaptchaConfig.getInstance().captchaMode !== "none") {
            const valid = await CaptchaService.getInstance().verifyCaptcha(request.body.captcha + "", "change_email");
            if (!valid) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "CAPTCHA",
                    "The client provided an invalid captcha code",
                );
                return;
            }
        }

        if (!keycloakSso) {
            // Password

            const password = (request.body.password || "") + "";

            if (!user.checkPassword(password)) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "WRONG_PASSWORD",
                    "The client provided a wrong password",
                );
                return;
            }

            // Validate token

            if (user.tfa) {
                const token = (request.body.tfa_token || request.body.token || "") + "";
                if (!TwoFactorAuthenticationService.getInstance().check(token, user.tfaSecret)) {
                    sendApiError(
                        request,
                        response,
                        BAD_REQUEST,
                        "INVALID_TFA_CODE",
                        "The client provided an invalid TFA code",
                    );
                    return;
                }
            }
        }

        const email = (request.body.email || "").toLowerCase();

        if (!email || !validateEmail(email)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "EMAIL_INVALID",
                "The client provided an invalid email",
            );
            return;
        }

        const otherAccount = (await User.findUser(email));
        if (otherAccount && otherAccount.id !== user.id && otherAccount.emailVerified) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "EMAIL_IN_USE",
                "The client provided an email being used by another account.",
            );
            return;
        }

        if (keycloakSso) {
            if (!user.keycloakSub || !auth.session) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "NO_KEYCLOAK_SESSION"
                );
                return;
            }

            // Step-up: require a live Keycloak OIDC session (not only Marketplace cookie).
            const hasKcSession = await KeycloakAccountService.getInstance().hasLiveKeycloakSession(auth.session);
            if (!hasKcSession) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "NO_KEYCLOAK_SESSION"
                );
                return;
            }
        }

        const emailValidationDisabled = UserSystemConfig.getInstance().emailValidationDisabled;

        if (!emailValidationDisabled) {
            // Pending change only: never delete another account until verifyEmail confirms.
            user.emailRequest = email;
            user.emailVerificationCode = createRandomToken();
            await UsersService.getInstance().sendVerificationChangeEmail(user, request);
        } else if (keycloakSso) {
            const previousEmail = user.email;
            const kcResult = await KeycloakAdminService.getInstance().updateUser(user.keycloakSub, {
                email,
                emailVerified: true,
            });

            if (kcResult.ok === false) {
                const failureCode = kcResult.code;
                const code = failureCode === "EMAIL_IN_USE" || failureCode === "USERNAME_IN_USE"
                    ? "EMAIL_IN_USE"
                    : "KEYCLOAK_UNAVAILABLE";
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    code
                );
                return;
            }

            if (otherAccount && otherAccount.id !== user.id && !otherAccount.emailVerified) {
                await otherAccount.delete();
            }

            user.email = email;
            user.emailRequest = "";
            user.emailVerificationCode = "";

            try {
                await user.save();
            } catch (ex) {
                request.logger.error(ex);
                const rollback = await KeycloakAdminService.getInstance().updateUser(user.keycloakSub, {
                    email: previousEmail,
                    emailVerified: true,
                });
                if (rollback.ok === false) {
                    request.logger.error(
                        "[Account] Email rollback in Keycloak failed after local save error for user " + user.id,
                    );
                }
                user.email = previousEmail;
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "KEYCLOAK_UNAVAILABLE"
                );
                return;
            }

            sendApiSuccess(request, response);
            return;
        } else {
            if (otherAccount && otherAccount.id !== user.id && !otherAccount.emailVerified) {
                await otherAccount.delete();
            }
            user.email = email;
        }

        await user.save();

        sendApiSuccess(request, response);
    }

    /**
     * @typedef PasswordChangeRequest
     * @property {string} old_password.required - Old password
     * @property {string} new_password.required - New password
     */

    /**
     * Changes password.
     * Binding: ChangePassword
     * Under Keycloak SSO use AIA UPDATE_PASSWORD (`GET /auth/keycloak/update-password`) instead.
     * @route POST /account/password
     * @group account
     * @param {PasswordChangeRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WRONG_PASSWORD, WEAK_PASSWORD, KEYCLOAK_UNAVAILABLE
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async changePassword(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (isKeycloakAuthOnly()) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "KEYCLOAK_UNAVAILABLE",
                "Password changes under SSO use Keycloak AIA UPDATE_PASSWORD",
            );
            return;
        }

        const user = auth.user;
        const password = (request.body.old_password || "") + "";
        const newPassword = (request.body.new_password || "") + "";

        if (!user.checkPassword(password)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WRONG_PASSWORD",
                "The client provided a wrong password",
            );
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too weak password",
            );
            return;
        }

        await user.changePassword(newPassword);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef TFAGenResponse
     * @property {string} secret.required - TFA secret
     * @property {string} uri.required - URL for QR code
     */

    /**
     * Generates two factor authentication secret
     * Binding: GenerateTFA
     * @route GET /account/tfa/generate
     * @group account
     * @returns {TFAGenResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: KEYCLOAK_ONLY
     * @security AuthToken
     */
    public async generateTFA(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        sendApiResult(request, response, TwoFactorAuthenticationService.getInstance().generateSecret(auth.user.username + ""));
    }

    /**
     * @typedef TFASetupRequest
     * @property {string} password.required - Account password
     * @property {string} secret.required - TFA secret
     * @property {string} token.required - Current TFA token to validate the secret
     */

    /**
     * Setup two factor authentication
     * Binding: SetupTFA
     * Warning: This closes all user sessions
     * @route POST /account/tfa/setup
     * @group account
     * @param {TFASetupRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WRONG_PASSWORD, ALREADY, INVALID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: KEYCLOAK_ONLY
     * @security AuthToken
     */
    public async setupTFA(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        if (user.tfa) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "ALREADY",
                "The user already has two factor authentication enabled",
            );
            return;
        }

        // Password

        const password = (request.body.password || "") + "";

        if (!user.checkPassword(password)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WRONG_PASSWORD",
                "The client provided a wrong password",
            );
            return;
        }

        // Validate token

        const secret = (request.body.secret || "") + "";
        const token = (request.body.token || "") + "";

        if (!TwoFactorAuthenticationService.getInstance().check(token, secret)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID",
                "The client provided an invalid TOTP secret-token pair",
            );
            return;
        }

        user.tfa = true;
        user.tfaSecret = secret;
        await user.save();

        await Session.closeSessions(user);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef TFARemoveRequest
     * @property {string} token.required - Current TFA token to validate the request
     */

    /**
     * Disables two factor authentication
     * Binding: RemoveTFA
     * @route POST /account/tfa/disable
     * @group account
     * @param {TFARemoveRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: NOT_ENABLED, INVALID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: KEYCLOAK_ONLY
     * @security AuthToken
     */
    public async removeTFA(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        if (!user.tfa) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "NOT_ENABLED",
                "The user does not have two factor authentication enabled",
            );
            return;
        }

        // Validate token

        const token = (request.body.token || "") + "";
        if (!TwoFactorAuthenticationService.getInstance().check(token, user.tfaSecret)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID",
                "The client provided an invalid TOTP secret-token pair",
            );
            return;
        }

        user.tfa = false;
        user.tfaSecret = "";
        await user.save();

        sendApiSuccess(request, response);
    }

    /**
     * @typedef SessionListItem
     * @property {string} session.required - Session Token
     * @property {number} created - Session creation timestamp
     * @property {string} remote - Remote address
     * @property {string} os - Operating system
     * @property {string} browser - Browser / Platform
     * @property {boolean} current - Is current Session?
     */

    /**
     * Gets all sessions open, so you can close them
     * This is a security feature
     * Binding: GetSessions
     * @route GET /account/sessions
     * @group account
     * @returns {Array.<SessionListItem>} 200 - Session List
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getSessions(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const sessions = await Session.findSessionsByUser(user.id);

        const result = sessions.map(session => {
            return {
                session: session.id,
                created: session.created,
                remote: session.remote,
                os: session.os,
                browser: session.browser,
                current: session.id === auth.session.id,
            };
        });

        sendApiResult(request, response, result);
    }

    /**
     * Closes an active session
     * Binding: CloseSession
     * @route DELETE /account/sessions/{id}
     * @group account
     * @param {string} id.path.required - Session ID
     * @returns {void} 200 - Success, the session was deleted or not found
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async closeSession(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const session = await Session.finder.findByKey((request.params.id || "") + "");

        if (session && session.uid === user.id) {
            await session.delete();
        }

        sendApiSuccess(request, response);
    }

    /**
     * Closes all user sessions
     * Binding: CloseAllSessions
     * @route POST /account/sessions/close
     * @group account
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async closeSessions(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        await Session.closeSessions(user);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef ChangeLocaleBody
     * @property {string} locale - Locale to use, If wrong, it will use the default locale.
     */

    /**
     * Changes user locale
     * The user locale is the language used for emails
     * Binding: ChangeLocale
     * @route POST /account/locale
     * @group account
     * @param {ChangeLocaleBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async changeLocale(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const locale = InternationalizationService.getInstance().normalizeLocale(request.body.locale || "");

        user.locale = locale;

        await user.save();

        sendApiSuccess(request, response);
    }

    /**
     * @typedef DeleteAccountRequest
     * @property {string} password.required - Account password
     * @property {string} tfa_token.required - Two factor authentication code, if you have it enabled is required
     */

    /**
     * Deletes account
     * Binding: DeleteAccount
     * @route POST /account/delete
     * @group account
     * @param {DeleteAccountRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WRONG_PASSWORD, INVALID_TFA_CODE
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async deleteAccount(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        // validate password

        const password = (request.body.password || "") + "";

        if (!user.checkPassword(password)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WRONG_PASSWORD",
                "The client provided a wrong password",
            );
            return;
        }

        // Validate token

        if (user.tfa) {
            const token = (request.body.tfa_token || request.body.token || "") + "";
            if (!TwoFactorAuthenticationService.getInstance().check(token, user.tfaSecret)) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "INVALID_TFA_CODE",
                    "The client provided an invalid TFA code",
                );
                return;
            }
        }

        // Close all sessions

        await Session.closeSessions(user);

        // Delete associated data with the account
        await ItaasFlowFavorite.deleteAllByUserId(user.id);

        await user.delete();

        await UsersService.getInstance().clearProfileCache(user.id);

        sendApiSuccess(request, response);
    }
}

