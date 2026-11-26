import { computed, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasFlowFavoritesListResponse } from "@/api/definitions";
import { getUniqueStringId } from "@/utils/unique-id";

export type ItaasFlowFavoritesErrorHandlers = {
    unauthorized: () => void;
    forbiddenItaasAccessRequired: () => void;
    temporalError: () => void;
};

export function useItaasFlowFavorites() {
    const favoriteIds = ref(new Set<string>());
    const pendingToggleIds = ref(new Set<string>());
    const listRequestId = getUniqueStringId();
    const toggleRequestIds = new Map<string, string>();

    const favoriteCount = computed((): number => {
        return favoriteIds.value.size;
    });

    const isFavorite = (flowId: string): boolean => {
        return favoriteIds.value.has(flowId);
    };

    const abortAll = (): void => {
        Request.Abort(listRequestId);
        for (const requestId of toggleRequestIds.values()) {
            Request.Abort(requestId);
        }
        toggleRequestIds.clear();
    };

    const loadFavorites = (handlers: ItaasFlowFavoritesErrorHandlers): void => {
        Request.Abort(listRequestId);
        Request.Pending(listRequestId, ApiItaasFlows.ListItaasFlowFavorites())
            .onSuccess((payload) => {
                const response = payload as ItaasFlowFavoritesListResponse;
                favoriteIds.value = new Set<string>(
                    (response.favorites || [])
                        .map(function (item) {
                            return (item.flowId || "").trim();
                        })
                        .filter(function (id) {
                            return !!id;
                        }),
                );
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    unauthorized: handlers.unauthorized,
                    forbidden: handlers.temporalError,
                    forbiddenItaasAccessRequired: handlers.forbiddenItaasAccessRequired,
                    temporalError: handlers.temporalError,
                });
            })
            .onUnexpectedError(() => {
                handlers.temporalError();
            });
    };

    const setPending = (flowId: string, pending: boolean): void => {
        const next = new Set<string>(pendingToggleIds.value);
        if (pending) {
            next.add(flowId);
        } else {
            next.delete(flowId);
        }
        pendingToggleIds.value = next;
    };

    const toggleFavorite = (flowId: string, handlers: ItaasFlowFavoritesErrorHandlers): void => {
        const id = (flowId || "").trim();
        if (!id || pendingToggleIds.value.has(id)) {
            return;
        }

        const wasFavorite = favoriteIds.value.has(id);
        const optimistic = new Set<string>(favoriteIds.value);
        if (wasFavorite) {
            optimistic.delete(id);
        } else {
            optimistic.add(id);
        }
        favoriteIds.value = optimistic;
        setPending(id, true);

        let requestId = toggleRequestIds.get(id);
        if (!requestId) {
            requestId = getUniqueStringId();
            toggleRequestIds.set(id, requestId);
        }

        Request.Abort(requestId);
        const request = wasFavorite ? ApiItaasFlows.RemoveItaasFlowFavorite(id) : ApiItaasFlows.AddItaasFlowFavorite(id);

        const rollback = (): void => {
            const rolled = new Set<string>(favoriteIds.value);
            if (wasFavorite) {
                rolled.add(id);
            } else {
                rolled.delete(id);
            }
            favoriteIds.value = rolled;
        };

        Request.Pending(requestId, request)
            .onSuccess(() => {
                setPending(id, false);
            })
            .onRequestError((err, handleErr) => {
                rollback();
                setPending(id, false);
                handleErr(err, {
                    unauthorized: handlers.unauthorized,
                    forbidden: handlers.temporalError,
                    forbiddenItaasAccessRequired: handlers.forbiddenItaasAccessRequired,
                    badRequest: handlers.temporalError,
                    badRequestInvalidFlowId: handlers.temporalError,
                    temporalError: handlers.temporalError,
                });
            })
            .onUnexpectedError(() => {
                rollback();
                setPending(id, false);
                handlers.temporalError();
            });
    };

    return {
        favoriteIds,
        favoriteCount,
        isFavorite,
        loadFavorites,
        toggleFavorite,
        abortAll,
    };
}
