// Function tests — KeycloakAccountService

"use strict";

import assert from "assert";
import { Session } from "../../../src/models/users/session";
import { KeycloakAccountService } from "../../../src/services/keycloak-account-service";
import { KeycloakLoginService } from "../../../src/services/keycloak-login-service";

function makeSession(overrides: Partial<{
    id: string;
    keycloakRefreshToken: string;
    keycloakIdToken: string;
}> = {}): Session {
    const session = {
        id: overrides.id || "session-1",
        keycloakRefreshToken: overrides.keycloakRefreshToken ?? "refresh-t1",
        keycloakIdToken: overrides.keycloakIdToken ?? "id-t1",
        save: async () => undefined,
    } as unknown as Session;
    return session;
}

function okTokens(accessToken: string, refreshToken?: string, expiresIn = 300) {
    return {
        status: "ok" as const,
        tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: "id-new",
            expires_in: expiresIn,
            token_type: "Bearer",
        },
    };
}

describe("KeycloakAccountService", () => {
    const originalLoginService = KeycloakLoginService.instance;
    const originalFindByKey = Session.finder.findByKey;

    afterEach(() => {
        KeycloakAccountService.setInstance(null);
        KeycloakLoginService.instance = originalLoginService;
        Session.finder.findByKey = originalFindByKey;
    });

    it("returns missing when the session has no Keycloak refresh token", async () => {
        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(
            makeSession({ keycloakRefreshToken: "" }),
        );
        assert.deepStrictEqual(result, { status: "missing" });
    });

    it("persists rotated refresh token on a successful refresh", async () => {
        const session = makeSession();
        let saved = false;
        (session as { save: () => Promise<boolean> }).save = async () => {
            saved = true;
            return true;
        };

        KeycloakLoginService.instance = {
            refresh: async () => okTokens("access-1", "refresh-t2"),
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => null;

        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(session);

        assert.deepStrictEqual(result, { status: "ok", token: "access-1" });
        assert.strictEqual(session.keycloakRefreshToken, "refresh-t2");
        assert.strictEqual(session.keycloakIdToken, "id-new");
        assert.strictEqual(saved, true);
    });

    it("uses the rotated refresh token from DB before refreshing", async () => {
        const session = makeSession();
        const refreshCalls: string[] = [];

        KeycloakLoginService.instance = {
            refresh: async (token: string) => {
                refreshCalls.push(token);
                return okTokens("access-2", "refresh-t3");
            },
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => makeSession({
            id: "session-1",
            keycloakRefreshToken: "refresh-t2",
            keycloakIdToken: "id-t2",
        });

        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(session);

        assert.deepStrictEqual(result, { status: "ok", token: "access-2" });
        assert.deepStrictEqual(refreshCalls, ["refresh-t2"]);
        assert.strictEqual(session.keycloakRefreshToken, "refresh-t3");
    });

    it("retries after invalid_grant when reload after failure finds a rotated refresh token", async () => {
        const session = makeSession();
        const refreshCalls: string[] = [];
        let findByKeyCalls = 0;

        KeycloakLoginService.instance = {
            refresh: async (token: string) => {
                refreshCalls.push(token);
                if (token === "refresh-t1") {
                    return { status: "expired" };
                }
                if (token === "refresh-t2") {
                    return okTokens("access-2", "refresh-t3");
                }
                return { status: "error" };
            },
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => {
            findByKeyCalls += 1;
            if (findByKeyCalls === 1) {
                return makeSession({
                    id: "session-1",
                    keycloakRefreshToken: "refresh-t1",
                    keycloakIdToken: "id-t1",
                });
            }
            return makeSession({
                id: "session-1",
                keycloakRefreshToken: "refresh-t2",
                keycloakIdToken: "id-t2",
            });
        };

        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(session);

        assert.deepStrictEqual(result, { status: "ok", token: "access-2" });
        assert.deepStrictEqual(refreshCalls, ["refresh-t1", "refresh-t2"]);
        assert.strictEqual(session.keycloakRefreshToken, "refresh-t3");
    });

    it("returns expired when invalid_grant happens and the refresh token did not rotate", async () => {
        KeycloakLoginService.instance = {
            refresh: async () => ({ status: "expired" }),
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => makeSession({
            id: "session-1",
            keycloakRefreshToken: "refresh-t1",
        });

        const result = await KeycloakAccountService.getInstance().getAccessTokenResultForSession(makeSession());

        assert.deepStrictEqual(result, { status: "expired" });
    });

    it("serves concurrent requests with at most one Keycloak refresh", async () => {
        const sessionA = makeSession();
        const sessionB = makeSession();
        let refreshCount = 0;
        let releaseFirstRefresh: () => void;
        const firstRefreshStarted = new Promise<void>((resolve) => {
            releaseFirstRefresh = resolve;
        });

        KeycloakLoginService.instance = {
            refresh: async (token: string) => {
                refreshCount += 1;
                if (refreshCount === 1) {
                    releaseFirstRefresh();
                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, 30);
                    });
                    return okTokens("access-shared", "refresh-t2");
                }
                assert.fail(`unexpected refresh with token ${token}`);
            },
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => null;

        const service = KeycloakAccountService.getInstance();
        const pendingA = service.getAccessTokenResultForSession(sessionA);
        await firstRefreshStarted;
        const pendingB = service.getAccessTokenResultForSession(sessionB);

        const [resultA, resultB] = await Promise.all([pendingA, pendingB]);

        assert.deepStrictEqual(resultA, { status: "ok", token: "access-shared" });
        assert.deepStrictEqual(resultB, { status: "ok", token: "access-shared" });
        assert.strictEqual(refreshCount, 1);
    });

    it("reuses the in-memory access token cache without calling refresh again", async () => {
        const session = makeSession();
        let refreshCount = 0;

        KeycloakLoginService.instance = {
            refresh: async () => {
                refreshCount += 1;
                return okTokens("access-cached", "refresh-t2");
            },
        } as unknown as KeycloakLoginService;

        Session.finder.findByKey = async () => null;

        const service = KeycloakAccountService.getInstance();
        const first = await service.getAccessTokenResultForSession(session);
        const second = await service.getAccessTokenResultForSession(session);

        assert.deepStrictEqual(first, { status: "ok", token: "access-cached" });
        assert.deepStrictEqual(second, { status: "ok", token: "access-cached" });
        assert.strictEqual(refreshCount, 1);
    });
});
