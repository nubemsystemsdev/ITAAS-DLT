/* Cookies */

"use strict";

import { buildSharedCookieString, readSharedCookie, writeSharedCookie } from "@/constants/nubem-sso-cookies";

export function getCookie(name: string): string {
    return readSharedCookie(name);
}

export function setCookie(name: string, value: string) {
    writeSharedCookie(name, value);
}

export function getParameterByName(name: string, url?: string): string {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export { buildSharedCookieString };
