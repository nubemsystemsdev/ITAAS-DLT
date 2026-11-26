<template>
    <div class="itaas-platform-flows">
        <header class="itaas-platform-panel-header itaas-platform-panel-header--with-actions">
            <div class="itaas-platform-panel-header__content">
                <h2 class="details-view-panel-title">{{ $t("Flows") }}</h2>
                <p class="dashboard-page-header__subtitle">
                    {{ $t("Flows available in your ITAAS workspace.") }}
                </p>
            </div>
            <button
                type="button"
                class="btn btn-tertiary toolbar-action-btn"
                :aria-label="$t('Refresh')"
                :title="$t('Refresh')"
                :disabled="loading"
                @click="reloadFlows"
            >
                <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
            </button>
        </header>

        <p v-if="loading" class="table-feedback">{{ $t("Loading") }}...</p>
        <p v-else-if="accessDenied" class="table-feedback">
            {{ $t("Active ITAAS subscription or assigned organization license is required") }}
        </p>
        <p v-else-if="flows.length === 0" class="table-feedback">{{ $t("No flows found") }}</p>

        <ul v-else class="itaas-platform-flow-list">
            <li v-for="flow in flows" :key="flow.flowId" class="itaas-platform-flow-row">
                <div class="itaas-platform-flow-body">
                    <div class="itaas-platform-flow-title-row">
                        <p class="itaas-platform-flow-title" :title="flow.flowId">
                            {{ flow.flowLabel }}
                        </p>
                        <span :class="statusBadgeClass(flow.deployed ? 'deployed' : 'not_deployed', flowDeployedToneMap)" role="status">
                            {{ flow.deployed ? $t("Deployed") : $t("Not deployed") }}
                        </span>
                    </div>
                    <div class="itaas-platform-flow-meta-row">
                        <template v-if="flow.type">
                            <span class="itaas-platform-flow-type">{{ flow.type }}</span>
                            <span class="itaas-platform-flow-meta-separator" aria-hidden="true">·</span>
                        </template>
                        <span class="itaas-platform-flow-id" :title="flow.flowId">{{ truncateMiddle(flow.flowId, 20) }}</span>
                        <CopyIconButton
                            :text="flow.flowId"
                            label="Copy flow ID"
                            success-message="Copied to clipboard!"
                            :disabled="!flow.flowId"
                        />
                    </div>
                    <p v-if="flow.updatedAt" class="itaas-platform-flow-meta">{{ $t("Updated") }}: {{ renderTimestamp(flow.updatedAt) }}</p>
                </div>
                <div class="itaas-platform-flow-actions">
                    <button
                        type="button"
                        class="btn btn-tertiary btn-sm itaas-platform-flow-action-btn"
                        :aria-label="$t('View details') + ': ' + flow.flowLabel"
                        :title="$t('View details')"
                        @click="openFlowDetail(flow.flowId)"
                    >
                        {{ $t("View details") }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary btn-sm itaas-platform-flow-action-btn"
                        :aria-label="$t('View executions') + ': ' + flow.flowLabel"
                        :title="$t('View executions')"
                        @click="openExecutionsForFlow(flow.flowId)"
                    >
                        {{ $t("View executions") }}
                    </button>
                </div>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasFlowsListResponse } from "@/api/definitions";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { AuthController } from "@/control/auth";
import { mapItaasFlowSummariesToPlatformFlows, type ItaasPlatformFlowSummary } from "@/utils/itaas-platform-execution-domain";
import { statusBadgeClass, type StatusBadgeTone } from "@/utils/status-badge";
import { truncateMiddle } from "@/utils/text";
import { renderDateAndTime } from "@/utils/time-utils";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

const FLOW_DEPLOYED_TONE_MAP: Record<string, StatusBadgeTone> = {
    deployed: "success",
    not_deployed: "muted",
};

export default defineComponent({
    name: "ItaasPlatformFlowsSection",
    components: {
        CopyIconButton,
    },
    data: function () {
        return {
            flows: [] as ItaasPlatformFlowSummary[],
            loading: false,
            accessDenied: false,
            loadRequestId: getUniqueStringId(),
            flowDeployedToneMap: FLOW_DEPLOYED_TONE_MAP,
        };
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        renderTimestamp: function (timestamp: string): string {
            if (!timestamp) {
                return "-";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        reloadFlows: function (): void {
            if (this.loading) {
                return;
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.accessDenied = false;

            Request.Pending(this.loadRequestId, ApiItaasFlows.ListItaasTenantFlows())
                .onSuccess((payload) => {
                    const response = payload as ItaasFlowsListResponse;
                    this.flows = mapItaasFlowSummariesToPlatformFlows(response.flows || []);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.flows = [];
                            this.loading = false;
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        forbiddenBffForbidden: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        }),
                        temporalError: () => {
                            this.flows = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.flows = [];
                    this.loading = false;
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                });
        },
        openFlowDetail: function (flowId: string): void {
            const normalizedFlowId = (flowId || "").trim();
            if (!normalizedFlowId) {
                return;
            }

            void this.$router
                .push({
                    name: "itaas-platform-flow-detail",
                    params: { flowId: normalizedFlowId },
                })
                .catch(() => {
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                });
        },
        openExecutionsForFlow: function (flowId: string): void {
            const normalizedFlowId = (flowId || "").trim();
            if (!normalizedFlowId) {
                return;
            }

            void this.$router.push({
                name: "itaas-platform",
                query: {
                    tab: "executions",
                    flowId: normalizedFlowId,
                },
            });
        },
    },
    mounted: function () {
        this.reloadFlows();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
    },
});
</script>
