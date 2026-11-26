// Keycloak session helpers — live OIDC step-up for Marketplace account flows

"use strict";

import { AsyncSemaphore } from "@asanrom/async-tools";
import { Session } from "../models/users/session";
import { Monitor } from "../monitor";
import { KeycloakLoginService, KeycloakTokenResponse } from "./keycloak-login-service";

/** Safety margin before treating a cached access token as expired. */
const ACCESS_TOKEN_CACHE_BUFFER_MS = 30_000;

type CachedAccessToken = {
    token: string;
    expiresAtMs: number;
};

/**
 * Result of resolving a Keycloak access token from a marketplace session:
 * - "ok": a live access token is available.
 * - "expired": the session had a Keycloak refresh token but Keycloak rejected it (SSO session
 *   ended) — the user must re-authenticate.
 * - "missing": the session never carried a Keycloak refresh token.
 * - "error": a transient failure prevented refreshing (may retry).
 */
export type SessionKeycloakTokenResult =
    | { status: "ok"; token: string }
    | { status: "expired" }
    | { status: "missing" }
    | { status: "error" };

/**
 * Keycloak OIDC session helpers for Marketplace account mutations.
 * Password changes under SSO use AIA UPDATE_PASSWORD (not Account REST).
 */
export class KeycloakAccountService {
    public static instance: KeycloakAccountService = null;

    private readonly refreshSemaphores = new Map<string, AsyncSemaphore>();
    private readonly accessTokenCache = new Map<string, CachedAccessToken>();

    public static getInstance(): KeycloakAccountService {
        if (KeycloakAccountService.instance) {
            return KeycloakAccountService.instance;
        }

        KeycloakAccountService.instance = new KeycloakAccountService();
        return KeycloakAccountService.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(service: KeycloakAccountService | null): void {
        KeycloakAccountService.instance = service;
    }

    /**
     * Whether the marketplace session has a live Keycloak OIDC session (refresh succeeds).
     * Also persists rotated refresh/id tokens when Keycloak rotates them.
     */
    public async hasLiveKeycloakSession(session: Session): Promise<boolean> {
        return !!(await this.getAccessTokenForSession(session));
    }

    /**
     * Refreshes the Keycloak access token for a marketplace session and persists rotated tokens.
     * @returns Access token, or null if the session has no Keycloak refresh token / refresh failed
     */
    public async getAccessTokenForSession(session: Session): Promise<string | null> {
        const result = await this.getAccessTokenResultForSession(session);
        return result.status === "ok" ? result.token : null;
    }

    /**
     * Like getAccessTokenForSession but reports why no token is available, so callers can tell an
     * expired SSO session (re-authenticate) from a transient failure (retry).
     *
     * Concurrent requests for the same session are serialized and share a short-lived in-memory
     * access-token cache so refresh-token rotation does not surface spurious invalid_grant errors.
     * An expired refresh token is NOT cleared from the session — a genuine re-auth creates a new
     * session anyway.
     */
    public async getAccessTokenResultForSession(session: Session): Promise<SessionKeycloakTokenResult> {
        if (!session || !session.keycloakRefreshToken) {
            return { status: "missing" };
        }

        const cached = this.getCachedAccessToken(session.id);
        if (cached) {
            return { status: "ok", token: cached };
        }

        const sem = this.getRefreshSemaphore(session.id);
        await sem.acquire();
        try {
            const cachedAfterWait = this.getCachedAccessToken(session.id);
            if (cachedAfterWait) {
                return { status: "ok", token: cachedAfterWait };
            }

            await this.reloadSessionTokens(session);
            if (!session.keycloakRefreshToken) {
                return { status: "missing" };
            }

            return await this.refreshAndPersist(session, session.keycloakRefreshToken);
        } finally {
            sem.release();
        }
    }

    private getRefreshSemaphore(sessionId: string): AsyncSemaphore {
        let sem = this.refreshSemaphores.get(sessionId);
        if (!sem) {
            sem = new AsyncSemaphore(1);
            this.refreshSemaphores.set(sessionId, sem);
        }
        return sem;
    }

    private getCachedAccessToken(sessionId: string): string | null {
        const entry = this.accessTokenCache.get(sessionId);
        if (!entry) {
            return null;
        }
        if (Date.now() >= entry.expiresAtMs) {
            this.accessTokenCache.delete(sessionId);
            return null;
        }
        return entry.token;
    }

    private cacheAccessToken(sessionId: string, accessToken: string, expiresInSec: number): void {
        const ttlMs = Math.max(0, (expiresInSec || 300) * 1000 - ACCESS_TOKEN_CACHE_BUFFER_MS);
        this.accessTokenCache.set(sessionId, {
            token: accessToken,
            expiresAtMs: Date.now() + ttlMs,
        });
    }

    private async reloadSessionTokens(session: Session): Promise<void> {
        try {
            const fresh = await Session.finder.findByKey(session.id);
            if (fresh) {
                session.keycloakRefreshToken = fresh.keycloakRefreshToken;
                session.keycloakIdToken = fresh.keycloakIdToken;
            }
        } catch (ex) {
            Monitor.error("[Keycloak Account] Failed to reload session tokens: " + ex.message);
        }
    }

    private async persistRotatedTokens(session: Session, tokens: KeycloakTokenResponse): Promise<void> {
        let dirty = false;

        if (tokens.refresh_token && tokens.refresh_token !== session.keycloakRefreshToken) {
            session.keycloakRefreshToken = tokens.refresh_token;
            dirty = true;
        }

        if (tokens.id_token && tokens.id_token !== session.keycloakIdToken) {
            session.keycloakIdToken = tokens.id_token;
            dirty = true;
        }

        if (dirty) {
            try {
                await session.save();
            } catch (ex) {
                Monitor.error("[Keycloak Account] Failed to persist rotated Keycloak tokens on session: " + ex.message);
            }
        }
    }

    private async refreshAndPersist(session: Session, refreshToken: string): Promise<SessionKeycloakTokenResult> {
        const outcome = await KeycloakLoginService.getInstance().refresh(refreshToken);

        if (outcome.status === "expired") {
            const attemptedToken = refreshToken;
            await this.reloadSessionTokens(session);
            if (session.keycloakRefreshToken && session.keycloakRefreshToken !== attemptedToken) {
                const retry = await KeycloakLoginService.getInstance().refresh(session.keycloakRefreshToken);
                if (retry.status === "ok") {
                    await this.persistRotatedTokens(session, retry.tokens);
                    this.cacheAccessToken(session.id, retry.tokens.access_token, retry.tokens.expires_in);
                    return { status: "ok", token: retry.tokens.access_token };
                }
                if (retry.status === "expired") {
                    return { status: "expired" };
                }
                return { status: "error" };
            }
            return { status: "expired" };
        }

        if (outcome.status !== "ok") {
            return { status: "error" };
        }

        await this.persistRotatedTokens(session, outcome.tokens);
        this.cacheAccessToken(session.id, outcome.tokens.access_token, outcome.tokens.expires_in);
        return { status: "ok", token: outcome.tokens.access_token };
    }
}
