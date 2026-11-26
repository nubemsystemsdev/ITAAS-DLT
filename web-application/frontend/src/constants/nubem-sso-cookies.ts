/**
 * Shared SSO UI cookie names and helpers (Marketplace frontend).
 * Keep in sync with web-application/shared/nubem-sso-cookies.js
 */

"use strict";

export const KEYCLOAK_UI_THEME_COOKIE = "nubem-theme";
export const KEYCLOAK_UI_LOCALE_COOKIE = "nubem-locale";
export const KEYCLOAK_COOKIE_PREF_COOKIE = "nubem-cookie-pref";
export const KEYCLOAK_LS_COOKIE_PREF = "app-pref-cookies";

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\]|(\d{1,3}\.){3}\d{1,3})$/;

/**
 * Optional override (e.g. `.example.com`). Empty = auto-detect parent domain.
 */
function configuredCookieDomain(): string {
    const fromEnv = (import.meta.env.VITE__COOKIE_DOMAIN || "").trim();
    return fromEnv;
}

function isLocalHost(hostname: string): boolean {
    return LOCAL_HOST_PATTERN.test(hostname);
}

/**
 * Parent domain for cross-subdomain cookies. Empty on localhost/IP (host-only, shared across ports).
 */
export function getSharedCookieDomain(): string {
    const configured = configuredCookieDomain();
    if (configured) {
        return configured.startsWith(".") ? configured : "." + configured;
    }
    const host = window.location.hostname;
    if (!host || isLocalHost(host)) {
        return "";
    }
    const parts = host.split(".");
    if (parts.length < 2) {
        return "";
    }
    return "." + parts.slice(-2).join(".");
}

function isSecureContext(): boolean {
    return window.location.protocol === "https:";
}

export function buildSharedCookieString(name: string, value: string): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const parts = [name + "=" + encodeURIComponent(value), "expires=" + date.toUTCString(), "path=/", "SameSite=Lax"];
    const domain = getSharedCookieDomain();
    if (domain) {
        parts.push("domain=" + domain);
    }
    if (isSecureContext()) {
        parts.push("Secure");
    }
    return parts.join("; ");
}

export function readSharedCookie(name: string): string {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
        const raw = parts.pop().split(";").shift();
        try {
            return decodeURIComponent(raw);
        } catch {
            return raw;
        }
    }
    return "";
}

export function writeSharedCookie(name: string, value: string): void {
    document.cookie = buildSharedCookieString(name, value);
}

export function clearSharedCookie(name: string): void {
    const date = new Date(0);
    const parts = [name + "=", "expires=" + date.toUTCString(), "path=/", "SameSite=Lax"];
    const domain = getSharedCookieDomain();
    if (domain) {
        parts.push("domain=" + domain);
    }
    if (isSecureContext()) {
        parts.push("Secure");
    }
    document.cookie = parts.join("; ");
}
