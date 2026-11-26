// Auth controller

import { Request } from "@asanrom/request-browser";
import { Timeouts } from "@/utils/timeout";
import { AppEvents } from "./app-events";
import { addRequestAuthenticationHandler } from "@asanrom/request-browser";
import { fetchFromLocalStorage, saveIntoLocalStorage } from "@/utils/local-storage";
import { ApiAuth } from "@/api/api-group-auth";
import { HOME_ROUTE } from "@/app-events-plugin";
import { getCookie, setCookie } from "@/utils/cookie";
import { KEYCLOAK_UI_THEME_COOKIE, KEYCLOAK_UI_LOCALE_COOKIE, KEYCLOAK_COOKIE_PREF_COOKIE } from "@/constants/nubem-sso-cookies";
import { getTheme, setTheme, ColorThemeName, getCookiePreference, setCookiePreference } from "./app-preferences";
import { getLanguage, setLanguage, SUPPORTED_LOCALES } from "@/i18n";

export { KEYCLOAK_UI_THEME_COOKIE, KEYCLOAK_UI_LOCALE_COOKIE };

const SESSION_TOKEN_HEADER_NAME = "x-session-id";

export const KEYCLOAK_OAUTH_STATE_KEY = "keycloak-oauth-state";

export class AuthController {
    public static KEYCLOAK_OAUTH_STATE_KEY = KEYCLOAK_OAUTH_STATE_KEY;
    public static Status: "UNAUTHORIZED" | "LOGGED_IN" | "USER_NOT_FOUND" | "TFA_REQUIRED" = "UNAUTHORIZED";

    public static UID = "";
    public static Role = "";
    public static Permissions = [];
    public static Username = "";
    public static Email = "";

    public static PageToGo: { name: string; params?: any; query?: any } = { name: HOME_ROUTE };

    public static RequiresTwoFactorAuthentication = false;

    public static Session = "";

    public static Locale = "";

    public static KeycloakSsoEnabled = false;

    /** Guards against firing several concurrent Keycloak redirects (e.g. multiple sections re-authenticating at once). */
    private static redirectingToKeycloak = false;

    public static ProfileName = "";
    public static ProfileImage = "";

    public static Loading = true;

    public static FirstTimeLoaded = false;

    public static Initialize(): Promise<void> {
        addRequestAuthenticationHandler(() => {
            const authHeaders = Object.create(null);
            authHeaders[SESSION_TOKEN_HEADER_NAME] = AuthController.Session;

            return authHeaders;
        });

        AppEvents.AddEventListener("unauthorized", AuthController.ClearSession);
        AuthController.Session = fetchFromLocalStorage("x-session-token", "");
        return AuthController.CheckAuthStatus();
    }

    public static isAuthenticated(): boolean {
        return AuthController.Status === "LOGGED_IN";
    }

    public static isAskingForTwoFactor(): boolean {
        return AuthController.Status === "TFA_REQUIRED";
    }

    public static hasPermission(permission: string): boolean {
        return AuthController.Permissions.includes(permission);
    }

    public static CheckAuthStatus(): Promise<void> {
        return new Promise((resolve) => {
            AuthController.Loading = true;
            AppEvents.Emit("auth-status-loading", true);
            Timeouts.Abort("auth-control-check");
            Request.Pending("auth-control-check", ApiAuth.GetContext())
                .onSuccess((response) => {
                    AuthController.Status = response.status;
                    AuthController.UID = response.uid;
                    AuthController.Role = response.role;
                    AuthController.Permissions = response.permissions.slice();
                    AuthController.Username = response.username;
                    AuthController.Email = response.email;
                    AuthController.RequiresTwoFactorAuthentication = response.tfa;
                    AuthController.Loading = false;
                    AuthController.ProfileName = response.profileName;
                    AuthController.ProfileImage = response.profileImage;
                    AuthController.Locale = response.locale;
                    if (
                        AuthController.isAuthenticated() &&
                        SUPPORTED_LOCALES.includes(AuthController.Locale) &&
                        getLanguage() !== AuthController.Locale
                    ) {
                        setLanguage(AuthController.Locale);
                    }
                    AuthController.KeycloakSsoEnabled = !!response.keycloakSso;
                    AuthController.FirstTimeLoaded = true;
                    AppEvents.Emit("auth-status-changed");
                    AppEvents.Emit("auth-status-loading", false);
                    resolve();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            AuthController.Status = "UNAUTHORIZED";
                            AuthController.UID = "";
                            AuthController.Username = "";
                            AuthController.Loading = false;
                            AuthController.FirstTimeLoaded = true;
                            AppEvents.Emit("auth-status-changed");
                            AppEvents.Emit("auth-status-loading", false);
                            resolve();
                        },
                        temporalError: () => {
                            // Retry
                            Timeouts.Set("auth-control-check", 1500, () => {
                                AuthController.CheckAuthStatus().finally(resolve);
                            });
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    // We assume the credentials are invalid
                    AuthController.Status = "UNAUTHORIZED";
                    AuthController.UID = "";
                    AuthController.Username = "";
                    AuthController.Loading = false;
                    AuthController.FirstTimeLoaded = true;
                    AppEvents.Emit("auth-status-changed");
                    AppEvents.Emit("auth-status-loading", false);
                    resolve();
                });
        });
    }

    public static ClearSession() {
        if (!AuthController.Session) {
            return;
        }

        AuthController.Status = "UNAUTHORIZED";
        AuthController.Session = "";

        saveIntoLocalStorage("x-session-token", "");

        AuthController.UID = "";
        AuthController.Username = "";

        AppEvents.Emit("auth-status-changed");
    }

    public static SetSession(session: string) {
        AuthController.Status = "UNAUTHORIZED";
        AuthController.Session = session;
        AuthController.UID = "";
        AuthController.Username = "";
        saveIntoLocalStorage("x-session-token", session);
        AppEvents.Emit("auth-status-changed");
        AuthController.CheckAuthStatus();
    }

    public static LoginWithKeycloak(returnTo?: string): Promise<void> {
        return AuthController.redirectToKeycloak(ApiAuth.KeycloakLoginUrl({ return_to: returnTo || "" }));
    }

    /**
     * Re-establishes the Keycloak SSO session when it expired while the marketplace session is still
     * alive (e.g. ITAAS features returning KEYCLOAK_SESSION_EXPIRED), returning to the current page.
     * When the Keycloak SSO cookie is still valid this is transparent (no credentials re-entered).
     */
    public static ReauthenticateWithKeycloak(): Promise<void> {
        const returnPath = window.location.pathname + window.location.search + window.location.hash;
        return AuthController.LoginWithKeycloak(returnPath);
    }

    public static RegisterWithKeycloak(): Promise<void> {
        return AuthController.redirectToKeycloak(ApiAuth.KeycloakRegisterUrl());
    }

    /**
     * Opens Keycloak Mobile Authenticator Setup (Application Initiated Action CONFIGURE_TOTP).
     * Stores the current app route server-side with the OAuth state for Cancel / success.
     */
    public static ConfigureTotpWithKeycloak(): Promise<void> {
        return AuthController.redirectToKeycloakWithReturnTo(ApiAuth.KeycloakConfigureTotpUrl);
    }

    /**
     * Opens Keycloak Update Password (AIA UPDATE_PASSWORD with prompt=login).
     * Forces re-auth so an existing SSO session cannot change the password without the current one.
     */
    public static UpdatePasswordWithKeycloak(): Promise<void> {
        return AuthController.redirectToKeycloakWithReturnTo(ApiAuth.KeycloakUpdatePasswordUrl);
    }

    /**
     * Resolves and consumes the return path stored with an OAuth state (Redis).
     * @returns Safe in-app path, or null
     */
    public static ResolveKeycloakReturnPath(state: string): Promise<string | null> {
        return new Promise((resolve) => {
            if (!state) {
                resolve(null);
                return;
            }

            Request.Do(ApiAuth.KeycloakReturnPath({ state }))
                .onSuccess((response) => {
                    const path = response.return_path;

                    if (typeof path !== "string" || !path) {
                        resolve(null);
                        return;
                    }

                    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
                        resolve(null);
                        return;
                    }

                    resolve(path);
                })
                .onRequestError(() => {
                    resolve(null);
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    resolve(null);
                });
        });
    }

    /**
     * Redirects away from native auth flows when Keycloak SSO is enabled.
     * @returns true if a redirect was started
     */
    public static redirectIfKeycloakBlocksNativeAuth(): boolean {
        if (!AuthController.KeycloakSsoEnabled) {
            return false;
        }

        void AuthController.LoginWithKeycloak();
        return true;
    }

    public static Logout(): Promise<string> {
        const currentSession = AuthController.Session;
        return new Promise<string>((resolve) => {
            Request.Do(ApiAuth.Logout())
                .onSuccess((response) => {
                    if (AuthController.Session === currentSession) {
                        AuthController.ClearSession();
                    }
                    resolve(response && response.logout_url ? response.logout_url : "");
                })
                .onRequestError(() => {
                    if (AuthController.Session === currentSession) {
                        AuthController.ClearSession();
                    }
                    resolve("");
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    if (AuthController.Session === currentSession) {
                        AuthController.ClearSession();
                    }
                    resolve("");
                });
        });
    }

    /**
     * Reads the theme and language chosen inside Keycloak (via shared cookies)
     * and applies them to the app. Call this when returning from the SSO flow.
     */
    public static ApplyUiPreferencesFromKeycloak() {
        const theme = getCookie(KEYCLOAK_UI_THEME_COOKIE);
        if (theme === "dark" || theme === "light") {
            if (getTheme() !== theme) {
                setTheme(theme as ColorThemeName);
            }
        }

        const locale = getCookie(KEYCLOAK_UI_LOCALE_COOKIE);
        if (locale && SUPPORTED_LOCALES.includes(locale)) {
            if (getLanguage() !== locale) {
                setLanguage(locale);
            }
        }

        const cookiePref = getCookie(KEYCLOAK_COOKIE_PREF_COOKIE);
        if (cookiePref === "all" || cookiePref === "essential") {
            if (getCookiePreference() !== cookiePref) {
                setCookiePreference(cookiePref);
            }
        }
    }

    /**
     * Adds the current theme and language to a Keycloak authorization URL and
     * mirrors them into the shared cookies so Keycloak can render accordingly.
     */
    private static decorateKeycloakUrl(url: string): string {
        const theme = getTheme();
        const locale = getLanguage();

        setCookie(KEYCLOAK_UI_THEME_COOKIE, theme);
        setCookie(KEYCLOAK_UI_LOCALE_COOKIE, locale);

        try {
            const parsed = new URL(url);
            parsed.searchParams.set("theme", theme);
            parsed.searchParams.set("ui_locales", locale);
            return parsed.toString();
        } catch (ex) {
            console.error(ex);
            return url;
        }
    }

    private static redirectToKeycloakWithReturnTo(
        buildRequest: (query: { return_to: string }) => ReturnType<typeof ApiAuth.KeycloakConfigureTotpUrl>,
    ): Promise<void> {
        const returnPath = window.location.pathname + window.location.search + window.location.hash;
        return AuthController.redirectToKeycloak(buildRequest({ return_to: returnPath }));
    }

    private static redirectToKeycloak(request: ReturnType<typeof ApiAuth.KeycloakLoginUrl>): Promise<void> {
        if (AuthController.redirectingToKeycloak) {
            return Promise.resolve();
        }
        AuthController.redirectingToKeycloak = true;
        return new Promise<void>((resolve, reject) => {
            Request.Do(request)
                .onSuccess((response) => {
                    saveIntoLocalStorage(KEYCLOAK_OAUTH_STATE_KEY, response.state, true);
                    window.location.href = AuthController.decorateKeycloakUrl(response.url);
                    resolve();
                })
                .onRequestError((err, handleErr) => {
                    AuthController.redirectingToKeycloak = false;
                    handleErr(err, {
                        forbiddenKeycloakDisabled: () => {
                            reject(new Error("KEYCLOAK_DISABLED"));
                        },
                        status503KeycloakOauthStateRequiresRedis: () => {
                            reject(new Error("KEYCLOAK_OAUTH_STATE_REQUIRES_REDIS"));
                        },
                        status503: () => {
                            reject(new Error("TEMPORAL_ERROR"));
                        },
                        temporalError: () => {
                            reject(new Error("TEMPORAL_ERROR"));
                        },
                        forbidden: () => {
                            reject(new Error("FORBIDDEN"));
                        },
                        serverError: () => {
                            reject(new Error("SERVER_ERROR"));
                        },
                        networkError: () => {
                            reject(new Error("NETWORK_ERROR"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    AuthController.redirectingToKeycloak = false;
                    console.error(err);
                    reject(err);
                });
        });
    }
}
