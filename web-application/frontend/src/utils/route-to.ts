/*
 * Navigation helpers for Options API components.
 */
import type { RouteLocationRaw, Router } from "vue-router";

interface GoBackOptions {
    preferHistory?: boolean;
}

/**
 * Goes to the previous history entry when enabled and Vue Router recorded one
 * (`history.state.back`); otherwise navigates to `fallback` (direct links, new tab, etc.).
 */
export function goBack(router: Router, fallback: RouteLocationRaw, options?: GoBackOptions): void {
    const preferHistory = options?.preferHistory !== false;

    if (preferHistory && typeof window !== "undefined" && window.history.state?.back != null) {
        router.back();
        return;
    }

    void router.push(fallback).catch(() => {});
}

/** Options API wrapper: uses `this.$router` when available. */
export function goBackFromContext(ctx: unknown, fallback: RouteLocationRaw, options?: GoBackOptions): void {
    const router = (ctx as { $router?: Router } | null)?.$router;
    if (router && typeof router.push === "function") {
        goBack(router, fallback, options);
        return;
    }

    const path = typeof fallback === "string" ? fallback : (fallback as { path?: string }).path || "/";
    window.location.href = String(path);
}

export function routeTo(ctx: any, target: string | RouteLocationRaw) {
    try {
        if (ctx && ctx.$router && typeof ctx.$router.push === "function") {
            void ctx.$router.push(target).catch(() => {});
            return;
        }
    } catch {
        // ignore and fallback
    }

    const path = typeof target === "string" ? target : (target as any).path || "/";
    window.location.href = String(path);
}

export default routeTo;
