// Keycloak SSO (OIDC) configuration

"use strict";

import { Config } from "./config";
import { RedisConfig } from "./config-redis";
import { Monitor } from "../monitor";

/**
 * Frontend route where Keycloak redirects after authorization.
 */
export const KEYCLOAK_CALLBACK_ROUTE = "/callbacks/keycloak";

/**
 * Keycloak OIDC configuration.
 */
export class KeycloakConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): KeycloakConfig {
        if (KeycloakConfig.instance) {
            return KeycloakConfig.instance;
        }

        const config: KeycloakConfig = new KeycloakConfig();

        config.enabled = process.env.KEYCLOAK_SSO_ENABLED === "YES";
        config.baseUrl = (process.env.KEYCLOAK_BASE_URL || "").replace(/\/+$/, "");
        config.realm = process.env.KEYCLOAK_REALM || "";
        config.clientId = process.env.KEYCLOAK_CLIENT_ID || "";
        config.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "";
        config.redirectUri = process.env.KEYCLOAK_REDIRECT_URI || Config.getInstance().getFrontendURI(KEYCLOAK_CALLBACK_ROUTE);
        config.postLogoutRedirectUri = process.env.KEYCLOAK_POST_LOGOUT_REDIRECT_URI || Config.getInstance().getFrontendURI("/login");

        KeycloakConfig.instance = config;

        return config;
    }
    private static instance: KeycloakConfig = null;

    public enabled: boolean;
    public baseUrl: string;
    public realm: string;
    public clientId: string;
    public clientSecret: string;
    public redirectUri: string;
    public postLogoutRedirectUri: string;

    constructor() {
        this.enabled = false;
        this.baseUrl = "";
        this.realm = "";
        this.clientId = "";
        this.clientSecret = "";
        this.redirectUri = "";
        this.postLogoutRedirectUri = "";
    }

    /**
     * Whether Keycloak SSO is enabled and minimally configured.
     */
    public isConfigured(): boolean {
        return this.enabled
            && !!this.baseUrl
            && !!this.realm
            && !!this.clientId
            && !!this.clientSecret
            && !!this.redirectUri;
    }

    /**
     * Keycloak SSO requires Redis for OAuth CSRF state (shared across workers).
     * Logs an error and throws so the backend does not start.
     */
    public assertOAuthStateStoreReady(): void {
        if (!this.isConfigured()) {
            return;
        }

        if (!RedisConfig.getInstance().enabled) {
            const message = "Keycloak SSO is enabled but Redis is not configured. "
                + "Set REDIS_ENABLED=YES and configure REDIS_HOST / REDIS_PORT. "
                + "OAuth CSRF state requires Redis across backend workers. "
                + "The backend will not start until Redis is configured.";

            Monitor.error("[Keycloak] " + message);
            throw new Error(message);
        }
    }

    /**
     * OpenID Connect issuer URL.
     */
    public getIssuer(): string {
        return this.baseUrl + "/realms/" + encodeURIComponent(this.realm);
    }

    /**
     * OpenID Connect base path for this realm.
     */
    public getOidcBasePath(): string {
        return this.getIssuer() + "/protocol/openid-connect";
    }
}
