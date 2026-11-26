// Keycloak Admin API — bootstrap realm users (initial admin)

"use strict";

import { KeycloakConfig } from "../config/config-keycloak";
import { Monitor } from "../monitor";
import { Request, RequestResponse } from "../utils/request";

interface KeycloakAdminUser {
    id: string;
    username?: string;
    email?: string;
}

interface KeycloakRealmRole {
    id: string;
    name: string;
}

export interface KeycloakInitialAdminOptions {
    username: string;
    email: string;
    password: string;
}

export interface KeycloakUserUpdateOptions {
    username?: string;
    email?: string;
    emailVerified?: boolean;
}

export type KeycloakUserUpdateErrorCode =
    | "NOT_FOUND"
    | "USERNAME_IN_USE"
    | "EMAIL_IN_USE"
    | "KEYCLOAK_UNAVAILABLE";

export type KeycloakUserUpdateResult =
    | { ok: true }
    | { ok: false; code: KeycloakUserUpdateErrorCode };

export type KeycloakPasswordResetErrorCode =
    | "NOT_FOUND"
    | "WEAK_PASSWORD"
    | "KEYCLOAK_UNAVAILABLE";

export type KeycloakPasswordResetResult =
    | { ok: true }
    | { ok: false; code: KeycloakPasswordResetErrorCode };

/**
 * Provisions users in Keycloak via the Admin REST API.
 */
export class KeycloakAdminService {
    public static instance: KeycloakAdminService = null;

    public static getInstance(): KeycloakAdminService {
        if (KeycloakAdminService.instance) {
            return KeycloakAdminService.instance;
        }

        KeycloakAdminService.instance = new KeycloakAdminService();
        return KeycloakAdminService.instance;
    }

    /**
     * Ensures the initial platform admin exists in Keycloak with realm role `admin`.
     * @returns Keycloak user id (`sub`) or null on failure / skip
     */
    public async ensureInitialAdminUser(options: KeycloakInitialAdminOptions): Promise<string | null> {
        const config = KeycloakConfig.getInstance();

        if (!config.isConfigured()) {
            return null;
        }

        if (!options.username || !options.password) {
            Monitor.warning(
                "[Keycloak Admin] INITIAL_USER_NAME / INITIAL_USER_PASSWORD are not set; skipping initial admin provisioning in Keycloak.",
            );
            return null;
        }

        const accessToken = await this.getServiceAccountAccessToken();

        if (!accessToken) {
            Monitor.error(
                "[Keycloak Admin] Could not obtain service account token (client_credentials on "
                + config.clientId
                + "). Ensure the realm client has serviceAccountsEnabled and realm-management roles; reimport Keycloak if the realm was created before this change.",
            );
            return null;
        }

        let userId = await this.findRealmUserIdByUsername(accessToken, options.username);

        if (!userId) {
            userId = await this.createRealmUser(accessToken, options);
        }

        if (!userId) {
            Monitor.error("[Keycloak Admin] Failed to create or resolve initial admin user in Keycloak.");
            return null;
        }

        const adminRoleAssigned = await this.assignRealmRole(accessToken, userId, "admin");

        if (!adminRoleAssigned) {
            Monitor.warning("[Keycloak Admin] Initial admin user exists in Keycloak but realm role 'admin' could not be assigned.");
        }

        Monitor.info(`[Keycloak Admin] Initial admin user '${options.username}' is available in realm '${config.realm}' (id=${userId}).`);
        return userId;
    }

    /**
     * Updates username and/or email for a realm user identified by Keycloak subject (`sub`).
     * Fetches the current representation, merges fields, then PUTs (Keycloak requires a full user body).
     */
    public async updateUser(keycloakSub: string, options: KeycloakUserUpdateOptions): Promise<KeycloakUserUpdateResult> {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        if (!keycloakSub) {
            return { ok: false, code: "NOT_FOUND" };
        }

        const hasUsername = options.username !== undefined && options.username !== null;
        const hasEmail = options.email !== undefined && options.email !== null;

        if (!hasUsername && !hasEmail && options.emailVerified === undefined) {
            return { ok: true };
        }

        const accessToken = await this.getServiceAccountAccessToken();

        if (!accessToken) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        const userUrl = this.getAdminBaseUrl() + "/users/" + encodeURIComponent(keycloakSub);
        const currentBody = await this.getJson(userUrl, this.authHeaders(accessToken));

        if (!currentBody) {
            return { ok: false, code: "NOT_FOUND" };
        }

        let current: KeycloakAdminUser & { [key: string]: unknown };

        try {
            current = JSON.parse(currentBody);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid user representation: " + ex.message);
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        if (!current || !current.id) {
            return { ok: false, code: "NOT_FOUND" };
        }

        const updated: { [key: string]: unknown } = { ...current };

        if (hasUsername) {
            updated.username = options.username;
        }

        if (hasEmail) {
            updated.email = options.email;
        }

        if (options.emailVerified !== undefined) {
            updated.emailVerified = options.emailVerified;
        }

        const response = await this.putJson(userUrl, this.authHeaders(accessToken), updated);

        if (!response) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        if (response.statusCode === 204 || response.statusCode === 200) {
            return { ok: true };
        }

        if (response.statusCode === 409) {
            const conflict = this.mapUserConflict(response.body, hasUsername, hasEmail);

            return { ok: false, code: conflict };
        }

        if (response.statusCode === 404) {
            return { ok: false, code: "NOT_FOUND" };
        }

        Monitor.error("[Keycloak Admin] Update user failed.", {
            statusCode: response.statusCode,
            body: response.body,
        });

        return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
    }

    /**
     * Sets a permanent password for a realm user via Admin API (`reset-password`).
     * Used when the Account self-service password endpoint is unavailable (Keycloak 26+).
     * Caller must have already proven the marketplace session owns the Keycloak identity.
     */
    public async resetPassword(keycloakSub: string, newPassword: string): Promise<KeycloakPasswordResetResult> {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        if (!keycloakSub) {
            return { ok: false, code: "NOT_FOUND" };
        }

        if (!newPassword || newPassword.length < 6) {
            return { ok: false, code: "WEAK_PASSWORD" };
        }

        const accessToken = await this.getServiceAccountAccessToken();

        if (!accessToken) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        const url = this.getAdminBaseUrl()
            + "/users/" + encodeURIComponent(keycloakSub)
            + "/reset-password";

        const response = await this.putJson(url, this.authHeaders(accessToken), {
            type: "password",
            value: newPassword,
            temporary: false,
        });

        if (!response) {
            return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
        }

        if (response.statusCode === 204 || response.statusCode === 200) {
            return { ok: true };
        }

        if (response.statusCode === 404) {
            return { ok: false, code: "NOT_FOUND" };
        }

        if (response.statusCode === 400) {
            const lower = (response.body || "").toLowerCase();

            if (
                lower.includes("passwordpolicy")
                || lower.includes("password_policy")
                || lower.includes("passwordpolicyerror")
                || lower.includes("weak")
                || lower.includes("insufficient")
                || lower.includes("invalid password")
            ) {
                return { ok: false, code: "WEAK_PASSWORD" };
            }

            Monitor.warning("[Keycloak Admin] reset-password rejected.", {
                statusCode: response.statusCode,
                body: response.body,
            });
            return { ok: false, code: "WEAK_PASSWORD" };
        }

        Monitor.error("[Keycloak Admin] reset-password failed.", {
            statusCode: response.statusCode,
            body: response.body,
        });

        return { ok: false, code: "KEYCLOAK_UNAVAILABLE" };
    }

    /**
     * Sends a Keycloak execute-actions email (e.g. VERIFY_EMAIL) to the user.
     * @returns true if Keycloak accepted the request
     */
    public async sendExecuteActionsEmail(keycloakSub: string, actions: string[]): Promise<boolean> {
        if (!KeycloakConfig.getInstance().isConfigured() || !keycloakSub || !actions || actions.length === 0) {
            return false;
        }

        const accessToken = await this.getServiceAccountAccessToken();

        if (!accessToken) {
            return false;
        }

        const url = this.getAdminBaseUrl()
            + "/users/" + encodeURIComponent(keycloakSub)
            + "/execute-actions-email";

        const response = await this.putJson(url, this.authHeaders(accessToken), actions);

        if (!response) {
            return false;
        }

        if (response.statusCode === 204 || response.statusCode === 200) {
            return true;
        }

        Monitor.warning("[Keycloak Admin] execute-actions-email failed.", {
            statusCode: response.statusCode,
            body: response.body,
        });

        return false;
    }

    private static readonly DENY_ACCOUNT_CONSOLE_FLOW_ALIAS = "deny-account-console";
    private static readonly ACCOUNT_CONSOLE_CLIENT_ID = "account-console";

    /**
     * Ensures Account Console UI is blocked on existing realms without a full reimport.
     * Creates authentication flow deny-account-console (Deny access) if missing and binds it
     * as the browser flow override on client account-console.
     * Requires service-account roles manage-realm + view-clients + manage-clients.
     * Throws when Keycloak is configured but the block cannot be applied (startup must not ignore this).
     */
    public async ensureAccountConsoleBlocked(): Promise<boolean> {
        if (!KeycloakConfig.getInstance().isConfigured()) {
            return false;
        }

        const accessToken = await this.getServiceAccountAccessToken();

        if (!accessToken) {
            const message = "Could not obtain Keycloak service account token to block Account Console UI. "
                + "Check KEYCLOAK_* client credentials. The backend will not start until Account Console is blocked.";
            Monitor.error("[Keycloak Admin] " + message);
            throw new Error(message);
        }

        const flowId = await this.ensureDenyAccountConsoleFlow(accessToken);

        if (!flowId) {
            const message = "Could not create or verify Keycloak authentication flow deny-account-console. "
                + "The itaas-dlt service account needs realm-management/manage-realm. "
                + "The backend will not start until Account Console is blocked.";
            Monitor.error("[Keycloak Admin] " + message);
            throw new Error(message);
        }

        const bound = await this.bindDenyFlowToAccountConsole(accessToken, flowId);

        if (!bound) {
            const message = "Could not block Keycloak Account Console UI on client account-console. "
                + "Grant the itaas-dlt service account the realm-management roles "
                + "view-clients and manage-clients (see web-application/keycloak/README.md), "
                + "then restart the backend. Fresh installs get these roles from realm-export.json. "
                + "The backend will not start until Account Console is blocked.";
            Monitor.error("[Keycloak Admin] " + message);
            throw new Error(message);
        }

        Monitor.info(
            "[Keycloak Admin] Account Console UI is blocked (browser flow override on account-console).",
        );

        return true;
    }

    private async ensureDenyAccountConsoleFlow(accessToken: string): Promise<string | null> {
        let flowId = await this.findAuthenticationFlowId(
            accessToken,
            KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS,
        );

        if (!flowId) {
            const createResponse = await this.postJson(
                this.getAdminBaseUrl() + "/authentication/flows",
                this.authHeaders(accessToken),
                {
                    alias: KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS,
                    description:
                        "Blocks Account Console UI. Marketplace self-service stays in-app; Account REST API remains available.",
                    providerId: "basic-flow",
                    topLevel: true,
                    builtIn: false,
                },
            );

            if (!createResponse || (createResponse.statusCode !== 201 && createResponse.statusCode !== 204)) {
                // Race: another instance may have created it
                flowId = await this.findAuthenticationFlowId(
                    accessToken,
                    KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS,
                );

                if (!flowId) {
                    Monitor.error("[Keycloak Admin] Failed to create deny-account-console authentication flow.", {
                        statusCode: createResponse ? createResponse.statusCode : 0,
                        body: createResponse ? createResponse.body : "",
                    });
                    return null;
                }
            } else {
                flowId = await this.findAuthenticationFlowId(
                    accessToken,
                    KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS,
                );

                if (!flowId) {
                    Monitor.error("[Keycloak Admin] deny-account-console flow missing after create.");
                    return null;
                }
            }
        }

        const ready = await this.ensureDenyAccessExecutionReady(accessToken);

        if (!ready) {
            Monitor.error(
                "[Keycloak Admin] deny-account-console flow is not ready (deny-access REQUIRED missing); refusing to bind.",
            );
            return null;
        }

        return flowId;
    }

    /**
     * Ensures the deny-account-console flow has a deny-access authenticator with requirement REQUIRED.
     * Repairs incomplete flows created by a previous failed ensure attempt.
     */
    private async ensureDenyAccessExecutionReady(accessToken: string): Promise<boolean> {
        let denyExec = await this.findDenyAccessExecution(accessToken);

        if (!denyExec) {
            const execResponse = await this.postJson(
                this.getAdminBaseUrl()
                    + "/authentication/flows/"
                    + encodeURIComponent(KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS)
                    + "/executions/execution",
                this.authHeaders(accessToken),
                { provider: "deny-access-authenticator" },
            );

            if (!execResponse || (execResponse.statusCode !== 201 && execResponse.statusCode !== 204)) {
                Monitor.error("[Keycloak Admin] Failed to add deny-access execution to deny-account-console.", {
                    statusCode: execResponse ? execResponse.statusCode : 0,
                    body: execResponse ? execResponse.body : "",
                });
                return false;
            }

            denyExec = await this.findDenyAccessExecution(accessToken);

            if (!denyExec || !denyExec.id) {
                Monitor.error("[Keycloak Admin] deny-access execution missing after create.");
                return false;
            }
        }

        if (denyExec.requirement === "REQUIRED") {
            return true;
        }

        const url = this.getAdminBaseUrl()
            + "/authentication/flows/"
            + encodeURIComponent(KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS)
            + "/executions";

        const updateResponse = await this.putJson(url, this.authHeaders(accessToken), {
            ...denyExec,
            requirement: "REQUIRED",
        });

        if (!updateResponse || (updateResponse.statusCode !== 204 && updateResponse.statusCode !== 200)) {
            Monitor.error("[Keycloak Admin] Could not set deny-access execution requirement to REQUIRED.", {
                statusCode: updateResponse ? updateResponse.statusCode : 0,
                body: updateResponse ? updateResponse.body : "",
            });
            return false;
        }

        const verified = await this.findDenyAccessExecution(accessToken);

        return !!(verified && verified.id && verified.requirement === "REQUIRED");
    }

    private async findDenyAccessExecution(
        accessToken: string,
    ): Promise<{ id?: string; providerId?: string; requirement?: string; displayName?: string } | null> {
        const url = this.getAdminBaseUrl()
            + "/authentication/flows/"
            + encodeURIComponent(KeycloakAdminService.DENY_ACCOUNT_CONSOLE_FLOW_ALIAS)
            + "/executions";

        const body = await this.getJson(url, this.authHeaders(accessToken));

        if (!body) {
            return null;
        }

        let executions: Array<{ id?: string; providerId?: string; requirement?: string; displayName?: string }>;

        try {
            executions = JSON.parse(body);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid authentication executions response: " + ex.message);
            return null;
        }

        return (executions || []).find(
            (e) => e.providerId === "deny-access-authenticator" || (e.displayName || "").toLowerCase().includes("deny"),
        ) || null;
    }

    private async findAuthenticationFlowId(accessToken: string, alias: string): Promise<string | null> {
        const body = await this.getJson(
            this.getAdminBaseUrl() + "/authentication/flows",
            this.authHeaders(accessToken),
        );

        if (!body) {
            return null;
        }

        let flows: Array<{ id?: string; alias?: string }>;

        try {
            flows = JSON.parse(body);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid authentication flows response: " + ex.message);
            return null;
        }

        const match = (flows || []).find((f) => f.alias === alias);

        return match && match.id ? match.id : null;
    }

    private async bindDenyFlowToAccountConsole(accessToken: string, flowId: string): Promise<boolean> {
        const clientsBody = await this.getJson(
            this.getAdminBaseUrl()
                + "/clients?clientId="
                + encodeURIComponent(KeycloakAdminService.ACCOUNT_CONSOLE_CLIENT_ID),
            this.authHeaders(accessToken),
        );

        if (!clientsBody) {
            return false;
        }

        let clients: Array<{ id?: string; clientId?: string; authenticationFlowBindingOverrides?: { [key: string]: string } }>;

        try {
            clients = JSON.parse(clientsBody);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid clients response: " + ex.message);
            return false;
        }

        const client = (clients || []).find(
            (c) => c.clientId === KeycloakAdminService.ACCOUNT_CONSOLE_CLIENT_ID,
        );

        if (!client || !client.id) {
            Monitor.warning(
                "[Keycloak Admin] Client account-console not found; cannot bind deny-account-console browser flow.",
            );
            return false;
        }

        const currentBrowser = client.authenticationFlowBindingOverrides
            && client.authenticationFlowBindingOverrides.browser;

        if (currentBrowser === flowId) {
            return true;
        }

        const clientUrl = this.getAdminBaseUrl() + "/clients/" + encodeURIComponent(client.id);
        const fullBody = await this.getJson(clientUrl, this.authHeaders(accessToken));

        if (!fullBody) {
            return false;
        }

        let fullClient: { [key: string]: unknown };

        try {
            fullClient = JSON.parse(fullBody);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid account-console client response: " + ex.message);
            return false;
        }

        const overrides = {
            ...((fullClient.authenticationFlowBindingOverrides as { [key: string]: string }) || {}),
            browser: flowId,
        };

        fullClient.authenticationFlowBindingOverrides = overrides;

        const putResponse = await this.putJson(clientUrl, this.authHeaders(accessToken), fullClient);

        if (!putResponse || (putResponse.statusCode !== 204 && putResponse.statusCode !== 200)) {
            const statusCode = putResponse ? putResponse.statusCode : 0;
            Monitor.error("[Keycloak Admin] Failed to bind deny-account-console on account-console client.", {
                statusCode,
                body: putResponse ? putResponse.body : "",
            });
            if (statusCode === 403) {
                Monitor.error(
                    "[Keycloak Admin] HTTP 403 updating account-console usually means the service account "
                    + "lacks realm-management/manage-clients (and view-clients).",
                );
            }
            return false;
        }

        return true;
    }

    private mapUserConflict(body: string, hasUsername: boolean, hasEmail: boolean): KeycloakUserUpdateErrorCode {
        const lower = (body || "").toLowerCase();

        if (lower.includes("email")) {
            return "EMAIL_IN_USE";
        }

        if (lower.includes("username") || lower.includes("user name")) {
            return "USERNAME_IN_USE";
        }

        if (hasEmail && !hasUsername) {
            return "EMAIL_IN_USE";
        }

        return "USERNAME_IN_USE";
    }

    private getAdminBaseUrl(): string {
        return KeycloakConfig.getInstance().baseUrl + "/admin/realms/" + encodeURIComponent(KeycloakConfig.getInstance().realm);
    }

    private async getServiceAccountAccessToken(): Promise<string | null> {
        const config = KeycloakConfig.getInstance();
        const tokenUrl = config.getOidcBasePath() + "/token";

        const body = await this.postForm(tokenUrl, {
            grant_type: "client_credentials",
            client_id: config.clientId,
            client_secret: config.clientSecret,
        });

        if (!body) {
            return null;
        }

        try {
            const parsed = JSON.parse(body);

            if (!parsed.access_token) {
                Monitor.error("[Keycloak Admin] Token response missing access_token.");
                return null;
            }

            return parsed.access_token;
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid admin token response: " + ex.message);
            return null;
        }
    }

    private async findRealmUserIdByUsername(accessToken: string, username: string): Promise<string | null> {
        const url = this.getAdminBaseUrl()
            + "/users?exact=true&username=" + encodeURIComponent(username);

        const body = await this.getJson(url, this.authHeaders(accessToken));

        if (!body) {
            return null;
        }

        try {
            const users: KeycloakAdminUser[] = JSON.parse(body);

            if (!users || users.length === 0 || !users[0].id) {
                return null;
            }

            return users[0].id;
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid users search response: " + ex.message);
            return null;
        }
    }

    private async createRealmUser(accessToken: string, options: KeycloakInitialAdminOptions): Promise<string | null> {
        const url = this.getAdminBaseUrl() + "/users";

        const response = await this.postJson(url, this.authHeaders(accessToken), {
            username: options.username,
            email: options.email,
            enabled: true,
            emailVerified: true,
            firstName: options.username,
            credentials: [
                {
                    type: "password",
                    value: options.password,
                    temporary: false,
                },
            ],
        });

        if (!response) {
            return null;
        }

        if (response.statusCode === 201) {
            const location = (response.headers.location || "") + "";
            const idFromLocation = location.split("/").filter(Boolean).pop();

            if (idFromLocation) {
                return idFromLocation;
            }

            return this.findRealmUserIdByUsername(accessToken, options.username);
        }

        if (response.statusCode === 409) {
            return this.findRealmUserIdByUsername(accessToken, options.username);
        }

        Monitor.error("[Keycloak Admin] Create user failed.", {
            statusCode: response.statusCode,
            body: response.body,
        });
        return null;
    }

    private async assignRealmRole(accessToken: string, userId: string, roleName: string): Promise<boolean> {
        const roleUrl = this.getAdminBaseUrl() + "/roles/" + encodeURIComponent(roleName);
        const roleBody = await this.getJson(roleUrl, this.authHeaders(accessToken));

        if (!roleBody) {
            return false;
        }

        let role: KeycloakRealmRole;

        try {
            role = JSON.parse(roleBody);
        } catch (ex) {
            Monitor.error("[Keycloak Admin] Invalid role response: " + ex.message);
            return false;
        }

        if (!role || !role.id) {
            return false;
        }

        const mappingUrl = this.getAdminBaseUrl()
            + "/users/" + encodeURIComponent(userId) + "/role-mappings/realm";

        const response = await this.postJson(mappingUrl, this.authHeaders(accessToken), [
            {
                id: role.id,
                name: role.name,
            },
        ]);

        return !!response && (response.statusCode === 204 || response.statusCode === 200);
    }

    private authHeaders(accessToken: string): { [key: string]: string } {
        return {
            Authorization: "Bearer " + accessToken,
            Accept: "application/json",
            "Content-Type": "application/json",
        };
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
                        Monitor.error("[Keycloak Admin] POST " + url + " failed.", {
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

    private getJson(url: string, headers: { [key: string]: string }): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            Request.get(url,
                {
                    headers,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error || response.statusCode !== 200) {
                        Monitor.error("[Keycloak Admin] GET " + url + " failed.", {
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

    private postJson(
        url: string,
        headers: { [key: string]: string },
        json: unknown,
    ): Promise<{ statusCode: number; body: string; headers: any } | null> {
        return new Promise((resolve) => {
            Request.post(url,
                {
                    headers,
                    json,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error) {
                        Monitor.error("[Keycloak Admin] POST " + url + " failed.", {
                            statusCode: 0,
                            body: body,
                        });
                        resolve(null);
                        return;
                    }

                    resolve({
                        statusCode: response.statusCode,
                        body: body || "",
                        headers: response.headers,
                    });
                },
            );
        });
    }

    private putJson(
        url: string,
        headers: { [key: string]: string },
        json: unknown,
    ): Promise<{ statusCode: number; body: string } | null> {
        return new Promise((resolve) => {
            Request.put(url,
                {
                    headers,
                    json,
                    timeout: 30000,
                },
                (error: Error, response: RequestResponse, body: string) => {
                    if (error) {
                        Monitor.error("[Keycloak Admin] PUT " + url + " failed.", {
                            statusCode: 0,
                            body: body,
                        });
                        resolve(null);
                        return;
                    }

                    resolve({
                        statusCode: response.statusCode,
                        body: body || "",
                    });
                },
            );
        });
    }
}
