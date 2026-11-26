// Keycloak OIDC login service

"use strict";

import { KeycloakConfig } from "../config/config-keycloak";
import { Monitor } from "../monitor";
import { RedisService } from "./redis-service";
import { Request, RequestResponse } from "../utils/request";
import { createRandomToken } from "../utils/text-utils";

const SCOPE = ["openid", "email", "profile"];

export interface KeycloakTokenResponse {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
    token_type: string;
}

export interface KeycloakUserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    preferred_username?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    locale?: string;
    realm_access?: {
        roles: string[];
    };
}

export interface KeycloakLoginResult {
    tokens: KeycloakTokenResponse;
    userInfo: KeycloakUserInfo;
}

/**
 * Outcome of a refresh-token exchange:
 * - "ok": a fresh access token was obtained.
 * - "expired": Keycloak rejected the refresh token (invalid_grant) — the SSO session is gone and
 *   the user must re-authenticate; retrying is pointless.
 * - "error": transient failure (Keycloak unreachable / unexpected response) — retrying may succeed.
 */
export type KeycloakRefreshOutcome =
    | { status: "ok"; tokens: KeycloakTokenResponse }
    | { status: "expired" }
    | { status: "error" };

export class KeycloakLoginService {
    public static instance: KeycloakLoginService = null;

    private static readonly STATE_TTL_MS = 10 * 60 * 1000;
    private static readonly STATE_CACHE_PREFIX = "keycloak:oauth:state:";
    private static readonly RETURN_CACHE_PREFIX = "keycloak:oauth:return:";

    public static getInstance(): KeycloakLoginService {
        if (KeycloakLoginService.instance) {
            return KeycloakLoginService.instance;
        } else {
            KeycloakLoginService.instance = new KeycloakLoginService();
            return KeycloakLoginService.instance;
        }
    }

    constructor() {

    }

    /**
     * Issues an OAuth CSRF state token, optionally storing a post-SSO return path.
     * @param returnTo Safe in-app relative path (e.g. /account-settings?tab=tfa)
     * @param boundUserId When set (e.g. CONFIGURE_TOTP), return-path consumption requires the same user
     */
    public async issueOAuthState(returnTo?: string, boundUserId?: string): Promise<string> {
        KeycloakConfig.getInstance().assertOAuthStateStoreReady();

        const state = createRandomToken();
        const ttlSec = Math.floor(KeycloakLoginService.STATE_TTL_MS / 1000);
        const stateMarker = boundUserId ? ("uid:" + boundUserId) : "1";

        await RedisService.getInstance().setCache(
            KeycloakLoginService.STATE_CACHE_PREFIX + state,
            stateMarker,
            ttlSec,
        );

        const safeReturnTo = KeycloakLoginService.sanitizeReturnPath(returnTo || "");

        if (safeReturnTo) {
            const payload = JSON.stringify({
                path: safeReturnTo,
                uid: boundUserId || "",
            });

            await RedisService.getInstance().setCache(
                KeycloakLoginService.RETURN_CACHE_PREFIX + state,
                payload,
                ttlSec,
            );
        }

        return state;
    }

    /**
     * Validates OAuth CSRF state and returns any Marketplace user id bound at issue time (AIA).
     * @returns null if invalid/expired; boundUserId is set only for AIA-issued states
     */
    public async resolveOAuthState(state: string): Promise<{ boundUserId: string | null } | null> {
        if (!state) {
            return null;
        }

        KeycloakConfig.getInstance().assertOAuthStateStoreReady();

        const key = KeycloakLoginService.STATE_CACHE_PREFIX + state;
        const value = await RedisService.getInstance().getFromCache(key);

        if (!value) {
            return null;
        }

        if (value.indexOf("uid:") === 0) {
            const boundUserId = value.substring(4);
            return { boundUserId: boundUserId || null };
        }

        return { boundUserId: null };
    }

    public async validateOAuthState(state: string): Promise<boolean> {
        return !!(await this.resolveOAuthState(state));
    }

    public async consumeOAuthState(state: string): Promise<void> {
        if (!state) {
            return;
        }

        KeycloakConfig.getInstance().assertOAuthStateStoreReady();

        const key = KeycloakLoginService.STATE_CACHE_PREFIX + state;
        await RedisService.getInstance().delCache(key);
    }

    /**
     * Reads and deletes the return path stored with an OAuth state (Cancel / AIA complete).
     * Requires the state to have been issued (STATE and/or RETURN cache entry).
     * When the return payload was bound to a user id, `expectedUserId` must match.
     */
    public async consumeReturnPath(state: string, expectedUserId?: string): Promise<string | null> {
        if (!state) {
            return null;
        }

        KeycloakConfig.getInstance().assertOAuthStateStoreReady();

        const stateKey = KeycloakLoginService.STATE_CACHE_PREFIX + state;
        const returnKey = KeycloakLoginService.RETURN_CACHE_PREFIX + state;
        const stateMarker = await RedisService.getInstance().getFromCache(stateKey);
        const rawReturn = await RedisService.getInstance().getFromCache(returnKey);

        if (!stateMarker && !rawReturn) {
            return null;
        }

        if (stateMarker) {
            await RedisService.getInstance().delCache(stateKey);
        }

        if (!rawReturn) {
            return null;
        }

        await RedisService.getInstance().delCache(returnKey);

        let path = "";
        let boundUid = "";

        try {
            const parsed = JSON.parse(rawReturn);

            if (parsed && typeof parsed === "object") {
                path = (parsed.path || "") + "";
                boundUid = (parsed.uid || "") + "";
            } else {
                path = rawReturn;
            }
        } catch (_ex) {
            path = rawReturn;
        }

        if (boundUid && expectedUserId && boundUid !== expectedUserId) {
            return null;
        }

        if (boundUid && !expectedUserId) {
            return null;
        }

        return KeycloakLoginService.sanitizeReturnPath(path);
    }

    /**
     * Only allow same-app relative paths (blocks open redirects).
     */
    public static sanitizeReturnPath(raw: string): string | null {
        if (!raw || typeof raw !== "string") {
            return null;
        }

        const path = raw.trim();

        if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
            return null;
        }

        return path;
    }

    public getRedirectUri(): string {
        return KeycloakConfig.getInstance().redirectUri;
    }

    public getAuthorizeUrl(state: string): string {
        return this.buildAuthorizeUrl("auth", state);
    }

    public getRegisterUrl(state: string): string {
        return this.buildAuthorizeUrl("registrations", state);
    }

    /**
     * Issues OAuth state + AIA authorize URL for an authenticated Marketplace user.
     * UPDATE_PASSWORD always uses prompt=login so an existing SSO cookie cannot skip entering the current password.
     */
    public async issueAiaUrl(
        userId: string,
        returnToRaw: string,
        kcAction: "CONFIGURE_TOTP" | "UPDATE_PASSWORD",
    ): Promise<{ url: string; state: string }> {
        const returnTo = KeycloakLoginService.sanitizeReturnPath(returnToRaw || "");
        const state = await this.issueOAuthState(returnTo || undefined, userId);
        const forceLogin = kcAction === "UPDATE_PASSWORD";
        const url = this.buildAuthorizeUrl("auth", state, kcAction, forceLogin);
        return { url, state };
    }

    public async exchangeCode(code: string): Promise<KeycloakLoginResult | null> {
        if (!code) {
            return null;
        }

        const config = KeycloakConfig.getInstance();
        const body = await this.postForm(config.getOidcBasePath() + "/token", {
            grant_type: "authorization_code",
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: this.getRedirectUri(),
            code,
        });

        if (!body) {
            return null;
        }

        let tokens: KeycloakTokenResponse;

        try {
            tokens = JSON.parse(body);
        } catch (ex) {
            Monitor.error("[Keycloak OIDC] Invalid token response: " + ex.message);
            return null;
        }

        if (!tokens.access_token) {
            Monitor.error("[Keycloak OIDC] Token response missing access_token.");
            return null;
        }

        const userInfo = await this.getUserInfo(tokens.access_token);

        if (!userInfo) {
            return null;
        }

        return { tokens, userInfo };
    }

    public async getUserInfo(accessToken: string): Promise<KeycloakUserInfo | null> {
        if (!accessToken) {
            return null;
        }

        const config = KeycloakConfig.getInstance();
        const body = await this.getJson(config.getOidcBasePath() + "/userinfo", {
            Authorization: "Bearer " + accessToken,
            Accept: "application/json",
        });

        if (!body) {
            return null;
        }

        try {
            const userInfo: KeycloakUserInfo = JSON.parse(body);

            if (!userInfo.sub) {
                Monitor.error("[Keycloak OIDC] Userinfo response missing sub.");
                return null;
            }

            return userInfo;
        } catch (ex) {
            Monitor.error("[Keycloak OIDC] Invalid userinfo response: " + ex.message);
            return null;
        }
    }

    /**
     * Exchanges a refresh token for a fresh access token.
     * Distinguishes a definitively expired/revoked refresh token (invalid_grant → must re-authenticate)
     * from a transient failure (Keycloak unreachable → may retry).
     */
    public async refresh(refreshToken: string): Promise<KeycloakRefreshOutcome> {
        if (!refreshToken) {
            return { status: "error" };
        }

        const config = KeycloakConfig.getInstance();
        const res = await this.postFormRaw(config.getOidcBasePath() + "/token", {
            grant_type: "refresh_token",
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
        });

        if (res.statusCode === 200 && res.body) {
            try {
                const tokens: KeycloakTokenResponse = JSON.parse(res.body);

                if (!tokens.access_token) {
                    Monitor.error("[Keycloak OIDC] Refresh response missing access_token.");
                    return { status: "error" };
                }

                return { status: "ok", tokens };
            } catch (ex) {
                Monitor.error("[Keycloak OIDC] Invalid refresh response: " + ex.message);
                return { status: "error" };
            }
        }

        // Keycloak answers 400 invalid_grant when the refresh token is expired/revoked: the SSO
        // session no longer exists, so the caller must re-authenticate instead of retrying.
        if (res.statusCode === 400 && KeycloakLoginService.isInvalidGrant(res.body)) {
            return { status: "expired" };
        }

        Monitor.error("[Keycloak OIDC] Refresh failed.", { statusCode: res.statusCode });
        return { status: "error" };
    }

    private static isInvalidGrant(body: string | null): boolean {
        if (!body) {
            return false;
        }

        try {
            const parsed = JSON.parse(body);
            return !!parsed && parsed.error === "invalid_grant";
        } catch (_ex) {
            return body.indexOf("invalid_grant") >= 0;
        }
    }

    public getLogoutUrl(idTokenHint?: string): string {
        const config = KeycloakConfig.getInstance();
        const params = new URLSearchParams();

        params.set("client_id", config.clientId);
        params.set("post_logout_redirect_uri", config.postLogoutRedirectUri);

        if (idTokenHint) {
            params.set("id_token_hint", idTokenHint);
        }

        return config.getOidcBasePath() + "/logout?" + params.toString();
    }

    private buildAuthorizeUrl(
        endpoint: "auth" | "registrations",
        state: string,
        kcAction?: string,
        forceLogin?: boolean,
    ): string {
        const config = KeycloakConfig.getInstance();
        const params = new URLSearchParams();

        params.set("client_id", config.clientId);
        params.set("response_type", "code");
        params.set("scope", SCOPE.join(" "));
        params.set("redirect_uri", this.getRedirectUri());
        params.set("state", state);

        if (kcAction) {
            params.set("kc_action", kcAction);
        }

        // OIDC prompt=login: ignore SSO cookie and require credentials before the action.
        if (forceLogin) {
            params.set("prompt", "login");
        }

        return config.getOidcBasePath() + "/" + endpoint + "?" + params.toString();
    }

    private postForm(url: string, form: { [key: string]: string }): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            Request.post(url,
                {
                    headers: {
                        Accept: "application/json",
                    },
                    form,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error || response.statusCode !== 200) {
                        Monitor.error("[Keycloak OIDC] POST " + url + " failed.", {
                            statusCode: response ? response.statusCode : 0,
                            body: body,
                        });
                        resolve(null);
                        return;
                    }

                    resolve(body);
                },
            );
        });
    }

    /**
     * Like postForm but surfaces the HTTP status and raw body (including error responses),
     * so callers can tell an expired refresh token (400 invalid_grant) from a transient failure.
     */
    private postFormRaw(url: string, form: { [key: string]: string }): Promise<{ statusCode: number; body: string | null }> {
        return new Promise<{ statusCode: number; body: string | null }>((resolve) => {
            Request.post(url,
                {
                    headers: {
                        Accept: "application/json",
                    },
                    form,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error) {
                        Monitor.error("[Keycloak OIDC] POST " + url + " failed: " + error.message);
                        resolve({ statusCode: 0, body: null });
                        return;
                    }

                    resolve({ statusCode: response ? response.statusCode : 0, body: body || null });
                },
            );
        });
    }

    private getJson(url: string, headers: { [key: string]: string }): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            Request.get(url,
                {
                    headers,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error || response.statusCode !== 200) {
                        Monitor.error("[Keycloak OIDC] GET " + url + " failed.", {
                            statusCode: response ? response.statusCode : 0,
                            body: body,
                        });
                        resolve(null);
                        return;
                    }

                    resolve(body);
                },
            );
        });
    }
}
