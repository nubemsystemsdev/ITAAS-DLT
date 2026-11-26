/**
 * Shared SSO UI cookie helpers for Keycloak theme and Marketplace frontend.
 * Keep in sync with frontend/src/constants/nubem-sso-cookies.ts (names + domain logic).
 */
(function (global) {
    "use strict";

    var NAMES = {
        THEME: "nubem-theme",
        LOCALE: "nubem-locale",
        COOKIE_PREF: "nubem-cookie-pref",
    };

    var LS_COOKIE_PREF = "app-pref-cookies";
    var SUPPORTED_LOCALES = ["en", "es"];

    function isLocalHost(hostname) {
        return (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "[::1]" ||
            /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
        );
    }

    /**
     * Parent domain for cross-subdomain cookies (e.g. app + auth).
     * Empty on localhost/IP so host-only cookies are shared across ports.
     */
    function getCookieDomain() {
        var host = global.location && global.location.hostname ? global.location.hostname : "";
        if (!host || isLocalHost(host)) {
            return "";
        }
        var parts = host.split(".");
        if (parts.length < 2) {
            return "";
        }
        return "." + parts.slice(-2).join(".");
    }

    function isSecureContext() {
        return !!(global.location && global.location.protocol === "https:");
    }

    function buildCookieString(name, value) {
        var d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        var parts = [
            name + "=" + encodeURIComponent(value),
            "expires=" + d.toUTCString(),
            "path=/",
            "SameSite=Lax",
        ];
        var domain = getCookieDomain();
        if (domain) {
            parts.push("domain=" + domain);
        }
        if (isSecureContext()) {
            parts.push("Secure");
        }
        return parts.join("; ");
    }

    function readCookie(name) {
        var m = ("; " + (global.document ? global.document.cookie : "")).split("; " + name + "=");
        if (m.length === 2) {
            var raw = m.pop().split(";").shift();
            try {
                return decodeURIComponent(raw);
            } catch (e) {
                return raw;
            }
        }
        return "";
    }

    function writeCookie(name, value) {
        if (!global.document) {
            return;
        }
        global.document.cookie = buildCookieString(name, value);
    }

    function readParam(name) {
        if (!global.location) {
            return "";
        }
        var r = new RegExp("[?&]" + name + "=([^&#]*)").exec(global.location.search);
        return r ? decodeURIComponent(r[1]) : "";
    }

    function resolveTheme() {
        var theme = readCookie(NAMES.THEME) || readParam("theme");
        if (theme !== "dark" && theme !== "light") {
            theme =
                global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return theme;
    }

    function applyThemeClass(theme) {
        var DARK = "pf-v5-theme-dark";
        if (global.document && global.document.documentElement) {
            global.document.documentElement.classList.toggle(DARK, theme === "dark");
        }
    }

    function applyTheme(theme) {
        applyThemeClass(theme);
        writeCookie(NAMES.THEME, theme);
    }

    /**
     * Redirect to Keycloak locale URL when nubem-locale cookie differs from current page.
     */
    function syncLocaleFromCookie() {
        if (!global.location || !global.document) {
            return;
        }
        var locale = readCookie(NAMES.LOCALE) || readParam("ui_locales");
        if (!locale || SUPPORTED_LOCALES.indexOf(locale) === -1) {
            return;
        }
        var current = (global.document.documentElement.lang || "").split("-")[0];
        if (current === locale) {
            return;
        }
        var url = new URL(global.location.href);
        if (url.searchParams.get("kc_locale") === locale) {
            return;
        }
        url.searchParams.set("kc_locale", locale);
        global.location.replace(url.toString());
    }

    function setLocale(tag) {
        if (SUPPORTED_LOCALES.indexOf(tag) === -1) {
            return;
        }
        writeCookie(NAMES.LOCALE, tag);
    }

    function getAppBaseUrl() {
        if (!global.location) {
            return null;
        }
        var params = new URLSearchParams(global.location.search);
        var redirect = params.get("redirect_uri");
        if (redirect) {
            try {
                return new URL(redirect).origin;
            } catch (e) {
                /* ignore */
            }
        }
        return null;
    }

    var api = {
        NAMES: NAMES,
        LS_COOKIE_PREF: LS_COOKIE_PREF,
        SUPPORTED_LOCALES: SUPPORTED_LOCALES,
        getCookieDomain: getCookieDomain,
        isSecureContext: isSecureContext,
        buildCookieString: buildCookieString,
        readCookie: readCookie,
        writeCookie: writeCookie,
        readParam: readParam,
        resolveTheme: resolveTheme,
        applyThemeClass: applyThemeClass,
        applyTheme: applyTheme,
        syncLocaleFromCookie: syncLocaleFromCookie,
        setLocale: setLocale,
        getAppBaseUrl: getAppBaseUrl,
    };

    global.NubemSsoCookies = api;
})(typeof window !== "undefined" ? window : global);
