import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from "vue-router";

/** Reads the `tab` query param as a single trimmed string. */
export function readRouteTabQuery(raw: unknown): string {
    if (typeof raw === "string") {
        return raw.trim();
    }
    if (Array.isArray(raw)) {
        const first = raw[0];
        return typeof first === "string" ? first.trim() : "";
    }
    return "";
}

/** Maps a route `tab` query value to a known tab id, with optional aliases. */
export function normalizeRouteTabQuery<T extends string>(
    raw: unknown,
    validTabs: readonly T[],
    defaultTab: T,
    options?: {
        aliases?: Record<string, T>;
    },
): T {
    const value = readRouteTabQuery(raw);
    if (!value || value === defaultTab) {
        return defaultTab;
    }

    const alias = options?.aliases?.[value];
    if (alias) {
        return alias;
    }

    if ((validTabs as readonly string[]).includes(value)) {
        return value as T;
    }

    return defaultTab;
}

/** Builds the next route query, omitting `tab` when it matches the default. */
export function buildRouteTabQuery<T extends string>(currentQuery: LocationQuery, tabId: T, defaultTab: T): LocationQuery {
    const nextQuery: LocationQuery = { ...currentQuery };
    if (tabId === defaultTab) {
        delete nextQuery.tab;
    } else {
        nextQuery.tab = tabId;
    }
    return nextQuery;
}

/** Replaces the current route, persisting the selected tab in the query string. */
export function replaceRouteTab<T extends string>(router: Router, route: RouteLocationNormalizedLoaded, tabId: T, defaultTab: T): void {
    void router.replace({
        name: route.name as string,
        params: route.params,
        query: buildRouteTabQuery(route.query, tabId, defaultTab),
    });
}
