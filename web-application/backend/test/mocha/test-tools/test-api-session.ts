// Test API session: init server, login with session, and make requests that return { status, body }

"use strict";

import { getServerStatus } from "./server-setup";
import { APITester } from "./api-tester";
import { ApiAuth } from "./api-bindings/api-group-auth";
import { APIAuthentication } from "./authentication";

function getBaseUrl(): string {
    const { port } = getServerStatus();
    return `http://127.0.0.1:${port}`;
}

export interface SessionResponse {
    status: number;
    body: any;
}

/**
 * Session-based API tester: initializes server, logs in with username/password,
 * and provides post/get helpers that return { status, body }.
 */
export class TestAPISession {
    private sessionId: string = "";

    public async init(): Promise<void> {
        await APITester.Initialize();
    }

    public async login(username: string, password: string): Promise<void> {
        const loginRes = await APITester.Test(
            ApiAuth.Login({ username, password, remember: true }),
            APIAuthentication.Unauthenticated()
        );
        if (!loginRes.session_id) {
            throw new Error("Login did not return session_id");
        }
        this.sessionId = loginRes.session_id;
    }

    public async post(path: string, body: object): Promise<SessionResponse> {
        const url = path.startsWith("http") ? path : getBaseUrl() + path;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-session-id": this.sessionId,
            },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let data: any;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { raw: text };
        }
        return { status: res.status, body: data };
    }

    public async get(path: string, options?: { headers?: Record<string, string> }): Promise<SessionResponse> {
        const url = path.startsWith("http") ? path : getBaseUrl() + path;
        const headers: Record<string, string> = { "x-session-id": this.sessionId };
        if (options?.headers) {
            Object.assign(headers, options.headers);
        }
        const res = await fetch(url, { method: "GET", headers });
        const text = await res.text();
        let data: any;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { raw: text };
        }
        return { status: res.status, body: data };
    }
}
