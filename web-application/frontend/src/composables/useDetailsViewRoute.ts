import { computed } from "vue";
import type { ComputedRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

interface UseDetailsViewRouteResult {
    backRoute: ComputedRef<RouteLocationRaw>;
    routeTargetId: ComputedRef<string>;
    routeEditRequested: ComputedRef<boolean>;
    clearEditQuery: () => void;
}

function normalizeRouteParam(raw: unknown): string {
    if (typeof raw === "string") {
        return raw;
    }

    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" ? firstValue : "";
    }

    return "";
}

function normalizeEditQuery(raw: unknown): boolean {
    if (typeof raw === "string") {
        return raw === "1" || raw.toLowerCase() === "true";
    }

    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" && (firstValue === "1" || firstValue.toLowerCase() === "true");
    }

    return false;
}

export function useDetailsViewRoute(routeParamKey: string, backRouteName: string): UseDetailsViewRouteResult {
    const route = useRoute();
    const router = useRouter();

    const backRoute = computed<RouteLocationRaw>(() => {
        return { name: backRouteName };
    });

    const routeTargetId = computed<string>(() => {
        return normalizeRouteParam(route.params[routeParamKey]);
    });

    const routeEditRequested = computed<boolean>(() => {
        return normalizeEditQuery(route.query.edit);
    });

    const clearEditQuery = () => {
        void router.replace({
            query: {
                ...route.query,
                edit: undefined,
            },
        });
    };

    return {
        backRoute,
        routeTargetId,
        routeEditRequested,
        clearEditQuery,
    };
}
