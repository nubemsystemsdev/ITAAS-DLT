// App preferences

import { fetchFromLocalStorage, fetchFromLocalStorageCache, saveIntoLocalStorage } from "@/utils/local-storage";
import { getCookie, setCookie } from "@/utils/cookie";
import { clearSharedCookie, KEYCLOAK_COOKIE_PREF_COOKIE, KEYCLOAK_UI_THEME_COOKIE } from "@/constants/nubem-sso-cookies";
import { AppEvents } from "./app-events";

export { KEYCLOAK_COOKIE_PREF_COOKIE };

export type ColorThemeName = "light" | "dark";

/**
 * Gets default theme, by checking the browser settings
 * @returns The theme name
 */
function defaultBrowserTheme(): ColorThemeName {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    } else if (window.matchMedia) {
        return "light";
    } else {
        return "dark";
    }
}

const LS_KEY_THEME = "app-pref-theme";

/**
 * Event triggered when the theme changes
 */
export const EVENT_NAME_THEME_CHANGED = "theme-changed";

/**
 * Gets color theme
 * @returns The theme name
 */
export function getTheme(): ColorThemeName {
    return fetchFromLocalStorageCache(LS_KEY_THEME, defaultBrowserTheme());
}

/**
 * Sets color theme
 * @param theme The theme name
 */
export function setTheme(theme: ColorThemeName) {
    saveIntoLocalStorage(LS_KEY_THEME, theme, true);
    setCookie(KEYCLOAK_UI_THEME_COOKIE, theme);
    AppEvents.Emit(EVENT_NAME_THEME_CHANGED, theme);
}

/**
 * Gets default wallet ID
 * @param uid The user ID
 * @returns The default wallet id
 */
export function getDefaultWallet(uid: string) {
    return fetchFromLocalStorage("app-pref-default-wallet-" + uid, "");
}

/**
 * Sets default wallet
 * @param uid The user ID
 * @param wallet The wallet ID
 */
export function setDefaultWallet(uid: string, wallet: string) {
    saveIntoLocalStorage("app-pref-default-wallet-" + uid, wallet);
}

const LS_KEY_SIDEBAR_COLLAPSED = "app-pref-sidebar-collapsed";

/**
 * Gets whether the desktop sidebar is collapsed
 * @returns True if collapsed
 */
export function getSidebarCollapsed(): boolean {
    return fetchFromLocalStorageCache(LS_KEY_SIDEBAR_COLLAPSED, false);
}

/**
 * Sets whether the desktop sidebar is collapsed
 * @param collapsed True to collapse the sidebar
 */
export function setSidebarCollapsed(collapsed: boolean) {
    saveIntoLocalStorage(LS_KEY_SIDEBAR_COLLAPSED, collapsed, true);
}

const LS_KEY_COOKIES_PREFERENCE = "app-pref-cookies";

/**
 * Cookies preferences value
 */
export type CookiesPreference = "all" | "essential" | "";

/**
 * Gets cookie preference value set by the user
 * @returns The cookie preference
 */
export function getCookiePreference(): CookiesPreference {
    const stored = fetchFromLocalStorageCache(LS_KEY_COOKIES_PREFERENCE, "") as CookiesPreference;
    if (stored === "all" || stored === "essential") {
        return stored;
    }
    const fromCookie = getCookie(KEYCLOAK_COOKIE_PREF_COOKIE);
    if (fromCookie === "all" || fromCookie === "essential") {
        return fromCookie;
    }
    return "";
}

/**
 * Sets cookie preference
 * @param preference The cookie preference
 */
export function setCookiePreference(preference: CookiesPreference) {
    saveIntoLocalStorage(LS_KEY_COOKIES_PREFERENCE, preference);
    if (preference === "all" || preference === "essential") {
        setCookie(KEYCLOAK_COOKIE_PREF_COOKIE, preference);
    } else {
        clearSharedCookie(KEYCLOAK_COOKIE_PREF_COOKIE);
    }
}
