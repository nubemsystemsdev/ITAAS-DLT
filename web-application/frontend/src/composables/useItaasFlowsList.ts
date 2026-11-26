import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasFlowSummary } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { ref, type Ref } from "vue";

export type UseItaasFlowsListResult = {
    flows: Ref<ItaasFlowSummary[]>;
    loading: Ref<boolean>;
    accessDenied: Ref<boolean>;
    loadFlowsList: (options?: { onUnauthorized?: () => void }) => void;
    abortFlowsList: () => void;
};

export function useItaasFlowsList(): UseItaasFlowsListResult {
    const flows = ref<ItaasFlowSummary[]>([]);
    const loading = ref(false);
    const accessDenied = ref(false);
    const loadRequestId = getUniqueStringId();

    const loadFlowsList = function (options?: { onUnauthorized?: () => void }): void {
        if (loading.value) {
            return;
        }

        Request.Abort(loadRequestId);
        loading.value = true;
        accessDenied.value = false;

        Request.Pending(loadRequestId, ApiItaasFlows.ListItaasFlows())
            .onSuccess((response) => {
                flows.value = (response.flows || []).slice().sort(function (a, b) {
                    return (a.name || a.id || "").localeCompare(b.name || b.id || "", undefined, { sensitivity: "base" });
                });
                loading.value = false;
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    unauthorized: function () {
                        if (options?.onUnauthorized) {
                            options.onUnauthorized();
                        }
                        loading.value = false;
                    },
                    unauthorizedBffUnauthorized: function () {
                        if (options?.onUnauthorized) {
                            options.onUnauthorized();
                        }
                        loading.value = false;
                    },
                    forbidden: function () {
                        flows.value = [];
                        loading.value = false;
                    },
                    forbiddenItaasAccessRequired: function () {
                        accessDenied.value = true;
                        flows.value = [];
                        loading.value = false;
                    },
                    forbiddenKeycloakSessionExpired: function () {
                        flows.value = [];
                        loading.value = false;
                        void AuthController.ReauthenticateWithKeycloak();
                    },
                    forbiddenKeycloakTokenUnavailable: function () {
                        flows.value = [];
                        loading.value = false;
                    },
                    forbiddenBffForbidden: function () {
                        flows.value = [];
                        loading.value = false;
                    },
                    ...itaasBffUpstreamErrorHandlers(function () {
                        flows.value = [];
                        loading.value = false;
                    }),
                    temporalError: function () {
                        flows.value = [];
                        loading.value = false;
                    },
                });
                if (!accessDenied.value) {
                    flows.value = [];
                }
                loading.value = false;
            })
            .onUnexpectedError(function () {
                flows.value = [];
                loading.value = false;
            });
    };

    const abortFlowsList = function (): void {
        Request.Abort(loadRequestId);
    };

    return {
        flows,
        loading,
        accessDenied,
        loadFlowsList,
        abortFlowsList,
    };
}
