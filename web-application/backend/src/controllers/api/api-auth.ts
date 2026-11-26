// Reserved for license

"use strict";

import Express from "express";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, getRequestRemoteAddress, getUserAgentInfo, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized, SERVICE_UNAVAILABLE } from "../../utils/http-utils";
import { secureStringCompare, validateEmail } from "../../utils/text-utils";
import { Controller } from "../controller";
import { TwoFactorAuthenticationService } from "../../services/tfa-service";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { CaptchaConfig } from "../../config/config-captcha";
import { User } from "../../models/users/user";
import { Session } from "../../models/users/session";
import { UserSystemConfig } from "../../config/config-users";
import { ThirdPartyUser } from "../../models/users/user-tp";
import { CaptchaService } from "../../services/captcha-service";
import { GLOBAL_PERMISSIONS, UserRole } from "../../models/users/user-role";
import { UserProfile } from "../../models/users/user-profile";
import { FileStorageService } from "../../services/file-storage";
import { InternationalizationService } from "../../services/i18n-service";
import { GoogleLoginService } from "../../services/google-login-service";
import { KeycloakConfig } from "../../config/config-keycloak";
import { KeycloakAdminService } from "../../services/keycloak-admin-service";
import { KeycloakLoginService } from "../../services/keycloak-login-service";
import { rejectNativeAuthIfKeycloak } from "../../utils/keycloak-auth-guard";

/**
 * Authentication API
 * @group auth - Authentication API
 */
export class AuthController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        // Context
        application.get(prefix + "/auth/context", noCache(this.context.bind(this)));

        // Login
        application.post(prefix + "/auth/login", ensureObjectBody(this.login.bind(this)));

        // Logout
        application.post(prefix + "/auth/logout", ensureObjectBody(this.logout.bind(this)));

        // Two factor authentication
        application.post(prefix + "/auth/tfa", ensureObjectBody(this.tfaLogin.bind(this)));

        // Signup
        application.post(prefix + "/auth/signup", ensureObjectBody(this.signup.bind(this)));

        // Email verification
        application.post(prefix + "/auth/email/verify", ensureObjectBody(this.verifyEmail.bind(this)));

        // Password recovery
        application.post(prefix + "/auth/password/forgot", ensureObjectBody(this.sendResetAccountPassword.bind(this)));
        application.post(prefix + "/auth/password/reset", ensureObjectBody(this.resetAccountPasswordAction.bind(this)));

        // Third-party login information
        application.get(prefix + "/auth/tp", ensureObjectBody(noCache(this.thirdPartyLoginDetails.bind(this))));
        application.post(prefix + "/auth/login/tp", ensureObjectBody(this.thirdPartyLogin.bind(this)));
        application.post(prefix + "/auth/signup/tp", ensureObjectBody(this.thirdPartyRegister.bind(this)));

        // Keycloak SSO
        application.get(prefix + "/auth/keycloak/login", noCache(this.keycloakLoginUrl.bind(this)));
        application.get(prefix + "/auth/keycloak/register", noCache(this.keycloakRegisterUrl.bind(this)));
        application.get(prefix + "/auth/keycloak/configure-totp", noCache(this.keycloakConfigureTotpUrl.bind(this)));
        application.get(prefix + "/auth/keycloak/update-password", noCache(this.keycloakUpdatePasswordUrl.bind(this)));
        application.get(prefix + "/auth/keycloak/return-path", noCache(this.keycloakReturnPath.bind(this)));
        application.post(prefix + "/auth/keycloak/callback", ensureObjectBody(this.keycloakCallback.bind(this)));
    }

    /**
     * @typedef AuthenticationContext
     * @property {enum} status.required - Auth status - eg: UNAUTHORIZED,TFA_REQUIRED,USER_NOT_FOUND,LOGGED_IN
     * @property {string} uid - User ID
     * @property {string} role - User role.
     * @property {Array.<string>} permissions - List of permissions
     * @property {string} username - Username
     * @property {string} email - User email
     * @property {boolean} tfa - Is the account protected by two factor authentication?
     * @property {string} locale - User locale
     * @property {string} profileName - Profile name
     * @property {string} profileImage - Profile image URL
     * @property {boolean} keycloakSso - Whether Keycloak SSO is the only auth method
     */

    /**
     * Authentication context
     * Binding: GetContext
     * @route GET /auth/context
     * @group auth
     * @returns {AuthenticationContext.model} 200 - Authentication context
     * @security AuthToken
     */
    public async context(request: Express.Request, response: Express.Response) {
        const session = await UsersService.getInstance().session(request, true);
        let user: User;
        let status = "UNAUTHORIZED";
        let permissions = [];
        let profile: UserProfile;

        if (session) {
            if (session.tfaPending) {
                status = "TFA_REQUIRED";
            } else {
                status = "LOGGED_IN";
            }

            user = await session.findUser();

            if (!user) {
                status = "USER_NOT_FOUND";
            } else {
                if (user.role === ADMIN_ROLE) {
                    permissions = Object.keys(GLOBAL_PERMISSIONS);
                } else {
                    const role = await UserRole.finder.findByKey(user.role);

                    if (role) {
                        permissions = role.getPermissionsList();
                    }
                }

                profile = await UserProfile.findByUser(user.id);
            }
        }

        response.json({
            status: status,
            uid: user ? user.id : "",
            role: user ? user.role : "",
            permissions: permissions,
            username: user ? user.username : "",
            email: user ? user.email : "",
            tfa: user ? user.tfa : false,
            locale: user ? user.locale : "",
            profileName: profile ? profile.name : "",
            profileImage: profile ? FileStorageService.getInstance().getStaticFileURL(profile.image) : "",
            keycloakSso: KeycloakConfig.getInstance().isConfigured(),
        });
    }

    /**
     * @typedef LoginRequest
     * @property {string} username.required - Username or email
     * @property {string} password.required - Password
     * @property {string} captcha - Captcha (Action = "login")
     * @property {boolean} remember - Send true to keep the session active until closed
     */

    /**
     * @typedef LoginResponse
     * @property {string} uid.required - User Id
     * @property {string} session_id.required - Session ID
     */

    /**
     * Login with username and password
     * Binding: Login
     * @route POST /auth/login
     * @group auth
     * @param {LoginRequest.model} request.body - Username or email
     * @returns {LoginResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: CAPTCHA, INVALID_CREDENTIALS
     * @returns {void} 403 - Access denied: INVALID_CREDENTIALS, USER_BANNED
     * @returns {void} 500 - Internal server error
     */
    public async login(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        // Check captcha
        if (CaptchaConfig.getInstance().captchaMode !== "none") {
            const valid = await CaptchaService.getInstance().verifyCaptcha(request.body.captcha + "", "login");
            if (!valid) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "CAPTCHA",
                    "The client provided an invalid captcha token",
                );
                return;
            }
        }

        const username = (request.body.username || "") + "";
        const password = (request.body.password || "") + "";
        const remember = (request.body.remember + "").toLowerCase() === "yes" || (request.body.remember + "").toLowerCase() === "true";

        if (!username || !password) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_CREDENTIALS",
                "The client provided empty credentials",
            );
            return;
        }

        const user = await User.findUser(username);

        if (!user) {
            request.logger.debug("User was not found.");
        }

        if (user && user.emailVerified && user.checkPassword(password)) {
            // Check user banned
            if (user.banned) {
                sendApiError(
                    request,
                    response,
                    FORBIDDEN,
                    "USER_BANNED",
                    "The user trying to log into is banned",
                );
                return;
            }
            // Login successful, create new session
            try {
                const session = await Session.createSession(user, !remember, getRequestRemoteAddress(request), getUserAgentInfo(request, "os"), getUserAgentInfo(request, "browser"));

                response.cookie("session_id", session.getSession(), { path: "/" });
                sendApiResult(request, response, { uid: user.id, session_id: session.getSession() });
 
            } catch (ex) {
                request.logger.error(ex);
                sendApiError(
                    request,
                    response,
                    INTERNAL_SERVER_ERROR,
                    "INTERNAL_SERVER_ERROR",
                    ex.message,
                );
                return;
            }
        } else {
            request.logger.warning("Failed login attempt", { user: username });
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "INVALID_CREDENTIALS",
                "The client provided invalid login credentials",
            );
            return;
        }
    }

    /**
     * @typedef ThirdPartyLoginService
     * @property {string} id.required - Service ID
     * @property {string} name.required - Service name
     * @property {string} client_id.required - App public client ID
     * @property {string} url.required - Login URL
     * @property {string} redirect_url.required - Redirect URL
     */

    /**
     * Get Third party login information
     * Binding: ThirdPartyLoginDetails
     * @route GET /auth/tp
     * @group auth
     * @returns {Array.<ThirdPartyLoginService>} 200 - Success
     */
    public async thirdPartyLoginDetails(request: Express.Request, response: Express.Response) {
        const result: {
            id: string;
            name: string;
            client_id: string;
            url: string;
            redirect_url: string;
        }[] = [];

        if (UserSystemConfig.getInstance().google.clientId) {
            result.push({
                id: "google",
                name: "Google",
                client_id: UserSystemConfig.getInstance().google.clientId,
                url: GoogleLoginService.getInstance().getLoginWithGoogleURL(),
                redirect_url: GoogleLoginService.getInstance().getRedirectUri(),
            });
        }

        response.json(result);
    }

    /**
     * @typedef ThirdPartyLoginBody
     * @property {string} service.required - Service ID
     */

    /**
     * @typedef ThirdPartyLoginResponse
     * @property {enum} result.required - Result. - eg: SESSION,MUST_REGISTER
     * @property {string} session_id - Session ID
     * @property {string} email - Email to register
     * @property {string} id - Third party user OD to register
     * @property {string} token - Token to register the user
     */

    /**
     * Login with a third party service
     * Binding: ThirdPartyLogin
     * @route POST /auth/login/tp
     * @group auth
     * @param {ThirdPartyLoginBody.model} request.body - Request body
     * @returns {ThirdPartyLoginResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: SERVICE_INVALID, NO_CODE, OAUTH_ERROR, BANNED
     */
    public async thirdPartyLogin(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const service = request.body.service + "";
        const code = (request.body.code || "") + "";

        if (!code) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "NO_CODE",
                "No code provided",
            );
            return;
        }

        let userTp: ThirdPartyUser;
        let user: User;

        switch (service) {
            case "google":
                {
                    const res = await GoogleLoginService.getInstance().loginWithOpenAuth2(code);
                    userTp = res.userTP;
                    user = res.user;
                }
                break;
            default:
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "SERVICE_INVALID",
                    "The service provided by the client was invalid: " + service,
                );
                return;
        }

        if (!userTp) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "OAUTH_ERROR",
                "Could not find the user entry in the database",
            );
            return;
        }

        if (!user) {
            // Must register
            sendApiResult(request, response, {
                result: "MUST_REGISTER",
                email: userTp.tpEmail,
                id: userTp.id,
                token: userTp.secret,
            });
            return;
        }

        if (user.banned) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "BANNED",
                "The user trying to log into is banned",
            );
            return;
        }

        // Create session
        const session = await Session.createSession(user, false, getRequestRemoteAddress(request), getUserAgentInfo(request, "os"), getUserAgentInfo(request, "browser"));
        response.cookie("session_id", session.getSession(), { path: "/" });

        sendApiResult(request, response, { result: "SESSION", session_id: session.getSession() });
    }

    /**
     * @typedef SignupTPRequest
     * @property {string} id.required - Third Party user ID
     * @property {string} username.required - Username
     * @property {string} password.required - Password
     * @property {string} token.required - Token received after authorizing (Oauth 2.0)
     * @property {string} locale - User locale
     */

    /**
     * @typedef SignupTPResponse
     * @property {string} uid.required - User ID of the new user
     * @property {string} session_id.required - Session ID
     */

    /**
     * Creates an account using a third party user provider
     * Binding: ThirdPartyRegister
     * @route POST /auth/signup/tp
     * @group auth
     * @param {SignupTPRequest.model} request.body - Request body
     * @returns {SignupTPResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: ID_INVALID, TOKEN_INVALID, USERNAME_INVALID, USERNAME_IN_USE, EMAIL_IN_USE, WEAK_PASSWORD
     * @returns {void} 500 - Internal server error
     */
    public async thirdPartyRegister(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const userTp = await ThirdPartyUser.finder.findByKey(request.body.id + "");
        if (!userTp) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "ID_INVALID",
                "Could not find the user entry in the database",
            );
            return;
        }

        if (!secureStringCompare(userTp.secret, request.body.token + "")) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "TOKEN_INVALID",
                "Invalid third-party authentication token",
            );
            return;
        }

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

        if (await User.findUser(username) !== null) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_IN_USE",
                "The username is already in use by another account",
            );
            return;
        }

        const otherAccount = (await User.findUser(userTp.tpEmail));
        if (otherAccount) {
            if (otherAccount.emailVerified) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "EMAIL_IN_USE",
                    "The email is already in use by another account",
                );
                return;
            } else {
                // Not verified account exists, we can remove it
                await otherAccount.delete();
            }
        }

        const password = (request.body.password || "") + "";

        if (!password || password.length < 6) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too-weak password",
            );
            return;
        }

        const locale = InternationalizationService.getInstance().normalizeLocale(request.body.locale || "");

        // Create the new user.
        let createdUser: User;

        try {
            createdUser = await User.registerUser(userTp.tpEmail, username, password, true, locale);
        } catch (ex) {
            request.logger.error(ex);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                ex.message,
            );
            return;
        }

        // Assign user to third party user
        userTp.uid = createdUser.id;
        await userTp.save();

        // Create session
        const session = await Session.createSession(createdUser, false, getRequestRemoteAddress(request), getUserAgentInfo(request, "os"), getUserAgentInfo(request, "browser"));
        response.cookie("session_id", session.getSession(), { path: "/" });

        sendApiResult(request, response, { uid: createdUser.id, session_id: session.getSession() });
    }

    /**
     * @typedef TFALoginRequest
     * @property {string} captcha.required - Captcha (action = "tfa")
     * @property {string} token.required - Two-factor authentication single-use code
     */

    /**
     * Two factor authentication login. Input the one-use code
     * Binding: LoginTFA
     * @route POST /auth/tfa
     * @group auth
     * @param {TFALoginRequest.model} request.body - Request body
     * @returns {void} 200 - Success, now the user is full logged in, use the same session ID
     * @returns {void} 400 - Bad request: CAPTCHA, INVALID_CODE
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async tfaLogin(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const session = await UsersService.getInstance().session(request, true);

        if (!session) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "",
                "Session not found",
            );
        }

        const user = await session.findUser();

        if (!user || !user.tfa) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "",
                "The user does not have TFA enabled",
            );
            return;
        }

        // Check captcha

        if (CaptchaConfig.getInstance().captchaMode !== "none") {
            const valid = await CaptchaService.getInstance().verifyCaptcha(request.body.captcha + "", "tfa");
            if (!valid) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "CAPTCHA",
                    "The client provided an invalid captcha token",
                );
                return;
            }
        }

        // Validate token

        const token = (request.body.token || "") + "";
        if (!TwoFactorAuthenticationService.getInstance().check(token, user.tfaSecret)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_CODE",
                "The client provided an invalid TFA code",
            );
            return;
        }

        session.tfaPending = false;
        await session.save();

        sendApiSuccess(request, response);
    }

    /**
     * @typedef LogoutResponse
     * @property {string} logout_url - Keycloak end-session URL (only when Keycloak SSO is enabled)
     */

    /**
     * Logout
     * Binding: Logout
     * @route POST /auth/logout
     * @group auth
     * @returns {LogoutResponse.model} 200 - Success, the session was deleted
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async logout(request: Express.Request, response: Express.Response) {
        const session = await UsersService.getInstance().session(request, true);
        let logoutUrl = "";

        if (KeycloakConfig.getInstance().isConfigured()) {
            const idTokenHint = session?.keycloakIdToken || undefined;
            logoutUrl = KeycloakLoginService.getInstance().getLogoutUrl(idTokenHint);
        }

        if (session) {
            try {
                await session.delete();
            } catch (ex) {
                request.logger.error(ex);
                sendApiError(
                    request,
                    response,
                    INTERNAL_SERVER_ERROR,
                    "INTERNAL_SERVER_ERROR",
                    ex.message,
                );
                return;
            }
        }

        if (logoutUrl) {
            sendApiResult(request, response, { logout_url: logoutUrl });
        } else {
            sendApiSuccess(request, response);
        }
    }

    /**
     * @typedef SignupRequest
     * @property {string} email.required - Email
     * @property {string} username.required - Username
     * @property {string} password.required - Password
     * @property {string} captcha - Captcha (action = "signup")
     * @property {string} locale - User locale
     */

    /**
     * @typedef SignupResponse
     * @property {string} uid.required - User ID of the new user
     * @property {string} session_id - Session ID (Only if email validation is disabled)
     */

    /**
     * Creates an account using email + password
     * Binding: Signup
     * @route POST /auth/signup
     * @group auth
     * @param {SignupRequest.model} request.body - Request body
     * @returns {SignupResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: CAPTCHA, EMAIL_INVALID, EMAIL_IN_USE, USERNAME_INVALID, USERNAME_IN_USE, WEAK_PASSWORD
     * @returns {void} 500 - Internal server error
     */
    public async signup(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        // Check captcha
        if (CaptchaConfig.getInstance().captchaMode !== "none") {
            const valid = await CaptchaService.getInstance().verifyCaptcha(request.body.captcha + "", "signup");
            if (!valid) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "CAPTCHA",
                    "The client provided an invalid captcha token",
                );
                return;
            }
        }

        // Check the parameters

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

        const otherAccount = await User.findUser(email);
        if (otherAccount) {
            if (otherAccount.emailVerified) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "EMAIL_IN_USE",
                    "The client provided an email already in use by another account",
                );
                return;
            } else {
                // Not verified account exists, we can remove it
                await otherAccount.delete();
            }
        }

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

        if (await User.findUser(username) !== null) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_IN_USE",
                "The client provided an username already in use by another account",
            );
            return;
        }

        const password = (request.body.password || "") + "";

        if (!password || password.length < 6) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too weak password",
            );
            return;
        }

        const locale = InternationalizationService.getInstance().normalizeLocale(request.body.locale || "");

        // Create the new user.

        let createdUser: User;

        try {
            createdUser = await User.registerUser(email, username, password, UserSystemConfig.getInstance().emailValidationDisabled, locale);
        } catch (ex) {
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                ex.message,
            );
            return;
        }

        // Send verification email

        if (!UserSystemConfig.getInstance().emailValidationDisabled) {
            await UsersService.getInstance().sendVerificationEmail(createdUser, request);

            sendApiResult(request, response, { uid: createdUser.id });
        } else {
            const session = await Session.createSession(createdUser, false, getRequestRemoteAddress(request), getUserAgentInfo(request, "os"), getUserAgentInfo(request, "browser"));
            response.cookie("session_id", session.getSession(), { path: "/" });

            sendApiResult(request, response, { uid: createdUser.id, session_id: session.getSession() });
        }
    }

    /**
     * @typedef EmailVerifyRequest
     * @property {string} uid.required - User ID
     * @property {string} verification.required - Verification code
     */

    /**
     * @typedef EmailVerifyResponse
     * @property {string} status.required - Status:
     *  - VERIFIED: Account was verified
     *  - ALREADY_VERIFIED: Account was already verified
     */

    /**
     * Verifies an account email or confirms a pending email change.
     * Binding: VerifyEmail
     * With Keycloak SSO this remains available so Marketplace verification links work;
     * after a successful email change the backend syncs email + emailVerified to Keycloak.
     * @route POST /auth/email/verify
     * @group auth
     * @param {EmailVerifyRequest.model} request.body - Request body
     * @returns {EmailVerifyResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: KEYCLOAK_UNAVAILABLE
     * @returns {void} 403 - Access denied: EMAIL_IN_USE
     * @returns {void} 404 - Not found: INVALID_VERIFICATION_CODE
     */
    public async verifyEmail(request: Express.Request, response: Express.Response) {
        const uid = (request.body.uid || "") + "";
        const verification = (request.body.verification || "") + "";

        const userToVerify = await User.findUserByUID(uid);

        if (userToVerify && userToVerify.email && !userToVerify.emailVerified && secureStringCompare(userToVerify.emailVerificationCode, verification)) {
            userToVerify.emailVerified = true;
            userToVerify.emailVerificationCode = "";

            await userToVerify.save();

            sendApiResult(request, response, { status: "VERIFIED" });
        } else if (userToVerify && userToVerify.emailVerified && userToVerify.emailRequest && secureStringCompare(userToVerify.emailVerificationCode, verification)) {
            const otherAccount = (await User.findUser(userToVerify.emailRequest));
            if (otherAccount && otherAccount.id !== userToVerify.id && otherAccount.emailVerified) {
                sendApiError(
                    request,
                    response,
                    FORBIDDEN,
                    "EMAIL_IN_USE",
                    "The email is already in use by another account",
                );
                return;
            }

            const newEmail = userToVerify.emailRequest;
            const previousEmail = userToVerify.email;

            // Sync Keycloak before reclaiming any local unverified account so a KC failure cannot orphan data.
            if (userToVerify.keycloakSub) {
                const kcResult = await KeycloakAdminService.getInstance().updateUser(userToVerify.keycloakSub, {
                    email: newEmail,
                    emailVerified: true,
                });

                if (kcResult.ok === false) {
                    const failureCode = kcResult.code;
                    if (failureCode === "EMAIL_IN_USE" || failureCode === "USERNAME_IN_USE") {
                        sendApiError(
                            request,
                            response,
                            FORBIDDEN,
                            "EMAIL_IN_USE",
                            "The email is already in use by another account",
                        );
                        return;
                    }

                    sendApiError(
                        request,
                        response,
                        BAD_REQUEST,
                        "KEYCLOAK_UNAVAILABLE",
                        "Could not sync the verified email to the identity provider",
                    );
                    return;
                }
            }

            if (otherAccount && otherAccount.id !== userToVerify.id && !otherAccount.emailVerified) {
                await otherAccount.delete();
            }

            userToVerify.email = newEmail;
            userToVerify.emailRequest = "";
            userToVerify.emailVerificationCode = "";

            try {
                await userToVerify.save();
            } catch (ex) {
                request.logger.error(ex);
                if (userToVerify.keycloakSub) {
                    const rollback = await KeycloakAdminService.getInstance().updateUser(userToVerify.keycloakSub, {
                        email: previousEmail,
                        emailVerified: true,
                    });
                    if (rollback.ok === false) {
                        request.logger.error(
                            "[Auth] Email rollback in Keycloak failed after local save error for user " + userToVerify.id,
                        );
                    }
                }
                userToVerify.email = previousEmail;
                userToVerify.emailRequest = newEmail;
                userToVerify.emailVerificationCode = verification;
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "KEYCLOAK_UNAVAILABLE",
                    "Could not persist the verified email",
                );
                return;
            }

            sendApiResult(request, response, { status: "VERIFIED" });
        } else if (userToVerify && userToVerify.emailVerified) {
            sendApiResult(request, response, { status: "ALREADY_VERIFIED" });
        } else {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "INVALID_VERIFICATION_CODE",
                "The client provided an invalid verification code",
            );
        }
    }

    /**
     * @typedef ForgotPasswordRequest
     * @property {string} email.required - User email
     * @property {string} captcha - Captcha (action = "forgot_password")
     */

    /**
     * @typedef ForgotPasswordResponse
     * @property {string} status.required - Status:
     *  - RESET_PASSWORD_EMAIL_SENT: Email sent
     *  - VERIFY_EMAIL_SENT: Account is not verified yet
     *  - ACCOUNT_VERIFIED: Account was verified, but no email was sent
     */

    /**
     * Request password reset email.
     * Note: if the account is not verified, a verification email will be send instead
     * Binding: RequestPasswordReset
     * @route POST /auth/password/forgot
     * @group auth
     * @param {ForgotPasswordRequest.model} request.body - Request body
     * @returns {ForgotPasswordResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: CAPTCHA, EMAIL_INVALID
     * @returns {void} 404 - Not found: USER_NOT_FOUND
     */
    public async sendResetAccountPassword(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
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

        const user: User = await User.findUser(email);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "USER_NOT_FOUND",
                "The user was not found in the database",
            );
            return;
        }

        // Check captcha

        if (CaptchaConfig.getInstance().captchaMode !== "none") {
            const valid = await CaptchaService.getInstance().verifyCaptcha(request.body.captcha + "", "forgot_password");
            if (!valid) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "CAPTCHA",
                    "The client provided an invalid captcha token",
                );
                return;
            }
        }

        if (user.emailVerified) {
            await user.generateResetCode();
            await UsersService.getInstance().sendResetPasswordEmail(user, request);
            sendApiResult(request, response, { status: "RESET_PASSWORD_EMAIL_SENT" });
        } else {
            if (!UserSystemConfig.getInstance().emailValidationDisabled) {
                await UsersService.getInstance().sendVerificationEmail(user, request);
                sendApiResult(request, response, { status: "VERIFY_EMAIL_SENT" });
            } else {
                user.emailVerified = true;
                user.emailVerificationCode = "";
                await user.save();
                sendApiResult(request, response, { status: "ACCOUNT_VERIFIED" });
            }
        }
    }

    /**
     * @typedef ResetPasswordRequest
     * @property {string} uid.required - User ID
     * @property {string} verification.required - Verification code
     * @property {string} password.required - New password
     */

    /**
     * Resets account password
     * Binding: ResetAccountPassword
     * @route POST /auth/password/reset
     * @group auth
     * @param {ResetPasswordRequest.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WEAK_PASSWORD
     * @returns {void} 404 - Not found: INVALID_RESET_CODE
     */
    public async resetAccountPasswordAction(request: Express.Request, response: Express.Response) {
        if (rejectNativeAuthIfKeycloak(request, response)) {
            return;
        }

        const uid = (request.body.uid || "") + "";
        const verification = (request.body.verification || "") + "";
        const password = (request.body.password || "") + "";

        if (!password || password.length < 6) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too-weak password",
            );
            return;
        }

        const userToVerify = await User.findUserByUID(uid);

        if (userToVerify && secureStringCompare(userToVerify.passwordResetCode, verification) && userToVerify.passwordResetExpiration > Date.now()) {
            await userToVerify.changePassword(password);
            sendApiSuccess(request, response);
        } else {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "INVALID_RESET_CODE",
                "The client provided an invalid password reset code",
            );
        }
    }
    /**
     * @typedef KeycloakAuthUrlResponse
     * @property {string} url.required - Keycloak authorization URL
     * @property {string} state.required - CSRF state token
     */

    /**
     * Get Keycloak login URL
     * Binding: KeycloakLoginUrl
     * @route GET /auth/keycloak/login
     * @group auth
     * @param {string} return_to.query - Relative in-app path to return to after a successful login
     * @returns {KeycloakAuthUrlResponse.model} 200 - Success
     * @returns {void} 403 - Access denied: KEYCLOAK_DISABLED
     * @returns {void} 503 - Service unavailable: KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    public async keycloakLoginUrl(request: Express.Request, response: Express.Response) {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "KEYCLOAK_DISABLED",
                "Keycloak SSO is not enabled",
            );
            return;
        }

        try {
            const returnTo = KeycloakLoginService.sanitizeReturnPath(((request.query.return_to as string) || "") + "");
            const state = await KeycloakLoginService.getInstance().issueOAuthState(returnTo || undefined);
            const url = KeycloakLoginService.getInstance().getAuthorizeUrl(state);

            sendApiResult(request, response, { url, state });
        } catch (ex) {
            sendApiError(
                request,
                response,
                SERVICE_UNAVAILABLE,
                "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS",
                ex.message || "Keycloak OAuth state store is not available",
            );
        }
    }

    /**
     * Get Keycloak registration URL
     * Binding: KeycloakRegisterUrl
     * @route GET /auth/keycloak/register
     * @group auth
     * @returns {KeycloakAuthUrlResponse.model} 200 - Success
     * @returns {void} 403 - Access denied: KEYCLOAK_DISABLED
     * @returns {void} 503 - Service unavailable: KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     */
    public async keycloakRegisterUrl(request: Express.Request, response: Express.Response) {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "KEYCLOAK_DISABLED",
                "Keycloak SSO is not enabled",
            );
            return;
        }

        try {
            const state = await KeycloakLoginService.getInstance().issueOAuthState();
            const url = KeycloakLoginService.getInstance().getRegisterUrl(state);

            sendApiResult(request, response, { url, state });
        } catch (ex) {
            sendApiError(
                request,
                response,
                SERVICE_UNAVAILABLE,
                "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS",
                ex.message || "Keycloak OAuth state store is not available",
            );
        }
    }

    /**
     * Get Keycloak Application Initiated Action URL for Mobile Authenticator Setup (CONFIGURE_TOTP)
     * Binding: KeycloakConfigureTotpUrl
     * @route GET /auth/keycloak/configure-totp
     * @group auth
     * @param {string} return_to.query - Relative in-app path to return to after Cancel / success
     * @returns {KeycloakAuthUrlResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: KEYCLOAK_DISABLED
     * @returns {void} 503 - Service unavailable: KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     * @security AuthToken
     */
    public async keycloakConfigureTotpUrl(request: Express.Request, response: Express.Response) {
        await respondKeycloakAiaUrl(request, response, "CONFIGURE_TOTP");
    }

    /**
     * Get Keycloak Application Initiated Action URL for Update Password (UPDATE_PASSWORD)
     * Binding: KeycloakUpdatePasswordUrl
     * @route GET /auth/keycloak/update-password
     * @group auth
     * @param {string} return_to.query - Relative in-app path to return to after Cancel / success
     * @returns {KeycloakAuthUrlResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: KEYCLOAK_DISABLED
     * @returns {void} 503 - Service unavailable: KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     * @security AuthToken
     */
    public async keycloakUpdatePasswordUrl(request: Express.Request, response: Express.Response) {
        await respondKeycloakAiaUrl(request, response, "UPDATE_PASSWORD");
    }

    /**
     * @typedef KeycloakReturnPathResponse
     * @property {string} return_path - Relative in-app path (empty if none)
     */

    /**
     * Consumes the return path stored with an OAuth state (used after Cancel / AIA without code exchange)
     * Binding: KeycloakReturnPath
     * @route GET /auth/keycloak/return-path
     * @group auth
     * @param {string} state.query.required - OAuth CSRF state token
     * @returns {KeycloakReturnPathResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_STATE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: KEYCLOAK_DISABLED
     * @returns {void} 503 - Service unavailable: KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS
     * @security AuthToken
     */
    public async keycloakReturnPath(request: Express.Request, response: Express.Response) {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "KEYCLOAK_DISABLED",
                "Keycloak SSO is not enabled",
            );
            return;
        }

        const auth = await UsersService.getInstance().auth(request);

        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const state = ((request.query.state as string) || "") + "";

        if (!state) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_STATE",
                "OAuth state is required",
            );
            return;
        }

        try {
            const returnPath = await KeycloakLoginService.getInstance().consumeReturnPath(
                state,
                auth.user.id,
            );

            sendApiResult(request, response, { return_path: returnPath || "" });
        } catch (ex) {
            sendApiError(
                request,
                response,
                SERVICE_UNAVAILABLE,
                "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS",
                ex.message || "Keycloak OAuth state store is not available",
            );
        }
    }

    /**
     * @typedef KeycloakCallbackRequest
     * @property {string} code.required - Authorization code
     * @property {string} state.required - CSRF state token
     */

    /**
     * @typedef KeycloakCallbackResponse
     * @property {string} uid.required - User ID
     * @property {string} session_id.required - Session ID
     */

    /**
     * Complete Keycloak OAuth callback
     * Binding: KeycloakCallback
     * @route POST /auth/keycloak/callback
     * @group auth
     * @param {KeycloakCallbackRequest.model} request.body - Request body
     * @returns {KeycloakCallbackResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: KEYCLOAK_DISABLED, INVALID_STATE, NO_CODE, OAUTH_ERROR, IDENTITY_MISMATCH, KEYCLOAK_EMAIL_NOT_VERIFIED, USER_BANNED
     * @returns {void} 500 - Internal server error
     */
    public async keycloakCallback(request: Express.Request, response: Express.Response) {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "KEYCLOAK_DISABLED",
                "Keycloak SSO is not enabled",
            );
            return;
        }

        const code = (request.body.code || "") + "";
        const state = (request.body.state || "") + "";

        if (!code) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "NO_CODE",
                "No authorization code provided",
            );
            return;
        }

        const stateInfo = await KeycloakLoginService.getInstance().resolveOAuthState(state);

        if (!stateInfo) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_STATE",
                "Invalid or expired OAuth state",
            );
            return;
        }

        const loginResult = await KeycloakLoginService.getInstance().exchangeCode(code);

        if (!loginResult) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "OAUTH_ERROR",
                "Could not complete Keycloak authentication",
            );
            return;
        }

        let user: User;

        try {
            user = await UsersService.getInstance().resolveUserFromKeycloakCallback(
                loginResult.userInfo,
                stateInfo.boundUserId,
            );
        } catch (ex) {
            const message = (ex && ex.message) ? ex.message : "Could not provision local user";

            if (message === "KEYCLOAK_EMAIL_NOT_VERIFIED") {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "KEYCLOAK_EMAIL_NOT_VERIFIED",
                    "Email address is not verified in Keycloak",
                );
                return;
            }

            if (message === "IDENTITY_MISMATCH") {
                await KeycloakLoginService.getInstance().consumeOAuthState(state);
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "IDENTITY_MISMATCH",
                    "Keycloak identity does not match the user that started this action",
                );
                return;
            }

            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "OAUTH_ERROR",
                message,
            );
            return;
        }

        if (user.banned) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USER_BANNED",
                "The user trying to log into is banned",
            );
            return;
        }

        try {
            const session = await Session.createSession(
                user,
                false,
                getRequestRemoteAddress(request),
                getUserAgentInfo(request, "os"),
                getUserAgentInfo(request, "browser"),
                loginResult.tokens.refresh_token || "",
                loginResult.tokens.id_token || "",
            );

            response.cookie("session_id", session.getSession(), { path: "/" });
            await KeycloakLoginService.getInstance().consumeOAuthState(state);
            sendApiResult(request, response, { uid: user.id, session_id: session.getSession() });
        } catch (ex) {
            request.logger.error(ex);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                ex.message,
            );
        }
    }

}

async function respondKeycloakAiaUrl(
    request: Express.Request,
    response: Express.Response,
    kcAction: "CONFIGURE_TOTP" | "UPDATE_PASSWORD",
): Promise<void> {
    if (!KeycloakConfig.getInstance().isConfigured()) {
        sendApiError(
            request,
            response,
            FORBIDDEN,
            "KEYCLOAK_DISABLED",
            "Keycloak SSO is not enabled",
        );
        return;
    }

    const auth = await UsersService.getInstance().auth(request);

    if (!auth.isRegisteredUser()) {
        sendUnauthorized(request, response);
        return;
    }

    try {
        const result = await KeycloakLoginService.getInstance().issueAiaUrl(
            auth.user.id,
            ((request.query.return_to as string) || "") + "",
            kcAction,
        );
        sendApiResult(request, response, result);
    } catch (ex) {
        sendApiError(
            request,
            response,
            SERVICE_UNAVAILABLE,
            "KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS",
            ex.message || "Keycloak OAuth state store is not available",
        );
    }
}
