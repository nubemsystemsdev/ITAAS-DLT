<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Execution not found')"
        :not-found-description="$t('The execution you are looking for does not exist or you do not have access to it.')"
        :error-message="loadError"
        :error-title="$t('Unable to load execution detail.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--simple details-view-card">
                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Execution detail") }}</p>
                    <div class="details-view-title-row">
                        <h1 class="details-view-title" :title="flowId || flowLabel">{{ flowLabel }}</h1>
                        <span v-if="summaryStatus" :class="statusBadgeClass(summaryStatus, agentExecutionStatusToneMap)" role="status">
                            {{ formatExecutionStatus(summaryStatus) }}
                        </span>
                    </div>
                    <p class="details-view-subtitle">
                        {{ $t("Review the trace events recorded for this execution.") }}
                    </p>
                </div>
            </header>
        </template>

        <div class="details-view-content-header">
            <h2 class="details-view-content-title">{{ $t("Execution timeline") }}</h2>
            <p class="details-view-content-description">
                {{ $t("Events are shown in chronological order from start to finish.") }}
            </p>
        </div>

        <article class="details-view-panel">
            <h3 class="details-view-panel-title">{{ $t("Identity") }}</h3>
            <dl class="details-view-list">
                <div class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-fingerprint details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Execution ID") }}
                    </dt>
                    <dd class="details-view-value" :title="executionId">{{ executionId || "-" }}</dd>
                </div>

                <div class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-diagram-project details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Flow ID") }}
                    </dt>
                    <dd class="details-view-value" :title="flowId">{{ flowId || "-" }}</dd>
                </div>

                <div class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-list-ol details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Events") }}
                    </dt>
                    <dd class="details-view-value">{{ timelineEvents.length }}</dd>
                </div>
            </dl>
        </article>

        <p v-if="timelineEvents.length === 0" class="table-feedback">{{ $t("No events found for this execution") }}</p>

        <ol v-else class="itaas-platform-timeline" :aria-label="$t('Execution timeline')">
            <li v-for="(event, index) in timelineEvents" :key="event.id" class="itaas-platform-timeline-item">
                <div class="itaas-platform-timeline-marker" aria-hidden="true">
                    <span class="itaas-platform-timeline-dot"></span>
                    <span v-if="index < timelineEvents.length - 1" class="itaas-platform-timeline-line"></span>
                </div>

                <button
                    type="button"
                    class="itaas-platform-timeline-body itaas-platform-timeline-body--clickable"
                    :aria-label="$t('View event details')"
                    @click="openEventDetail(event)"
                >
                    <p class="itaas-platform-timeline-title">{{ event.eventLabel }}</p>
                    <p class="itaas-platform-timeline-meta">
                        {{ renderEventTimestamp(event.timestamp) }}
                        <template v-if="event.eventId"> · {{ truncateMiddle(event.eventId, 12) }}</template>
                    </p>
                </button>

                <div class="itaas-platform-timeline-side">
                    <span v-if="event.status" :class="statusBadgeClass(event.status, agentExecutionStatusToneMap)" role="status">
                        {{ formatExecutionStatus(event.status) }}
                    </span>
                    <div v-if="canCopyHash(event.txHash)" class="itaas-platform-execution-hash-row">
                        <span class="traceability-hash" :title="event.txHash">
                            {{ truncateMiddle(event.txHash, 20) }}
                        </span>
                        <CopyIconButton :text="event.txHash" label="Copy transaction hash" success-message="Copied to clipboard!" />
                    </div>
                </div>
            </li>
        </ol>

        <ItaasPlatformEventDetailModal
            v-if="displayEventDetailModal"
            v-model:display="displayEventDetailModal"
            :event="selectedEventDetail"
        />
    </DetailsViewLayout>
</template>

<script lang="ts">
import { ApiTraceability } from "@/api/api-group-traceability";
import type { AgentTraceEventItem, AgentTraceExecutionTimelineResponse } from "@/api/definitions";
import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import ItaasPlatformEventDetailModal, { type ItaasPlatformEventDetailView } from "@/components/modals/ItaasPlatformEventDetailModal.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { useItaasFlowLabelLookup } from "@/composables/useItaasFlowLabelLookup";
import { AGENT_EXECUTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import {
    mapAgentTraceEventToTimelineRow,
    resolveExecutionStatus,
    resolveFlowLabelFromTimelineEvents,
    resolveAgentTraceEventLabel,
    resolveTimelineSummaryStatus,
    type ItaasPlatformTimelineEventRow,
} from "@/utils/itaas-platform-execution-domain";
import { truncateMiddle } from "@/utils/text";
import { renderDateAndTime } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { computed, defineComponent, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

function normalizeRouteParam(raw: unknown): string {
    if (typeof raw === "string") {
        return raw.trim();
    }

    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" ? firstValue.trim() : "";
    }

    return "";
}

function normalizeRouteQuery(raw: unknown): string {
    if (typeof raw === "string") {
        return raw.trim();
    }

    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" ? firstValue.trim() : "";
    }

    return "";
}

export default defineComponent({
    name: "ItaasPlatformExecutionDetailsPage",
    components: {
        CopyIconButton,
        DetailsViewLayout,
        ItaasPlatformEventDetailModal,
    },
    setup: function () {
        const loading = ref(false);
        const flowLabels = useItaasFlowLabelLookup();

        const backRoute = computed<RouteLocationRaw>(() => {
            return {
                name: "itaas-platform",
                query: { tab: "executions" },
            };
        });

        return {
            loading,
            backRoute,
            flowLabelLookup: flowLabels.flowLabelLookup,
            loadFlowLabelLookup: flowLabels.loadFlowLabelLookup,
            abortFlowLabelLookup: flowLabels.abortFlowLabelLookup,
        };
    },
    data: function () {
        return {
            notFound: false,
            loadError: "",
            executionId: "",
            flowId: "",
            flowLabel: "-",
            summaryStatus: "",
            rawTimelineEvents: [] as AgentTraceEventItem[],
            timelineEvents: [] as ItaasPlatformTimelineEventRow[],
            loadRequestId: getUniqueStringId(),
            agentExecutionStatusToneMap: AGENT_EXECUTION_STATUS_TONE_MAP,
            displayEventDetailModal: false,
            selectedEventDetail: null as ItaasPlatformEventDetailView | null,
        };
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        canCopyHash: function (txHash: string): boolean {
            const normalized = (txHash || "").trim();
            return normalized.length > 0 && normalized !== "-";
        },
        formatExecutionStatus: function (status: string): string {
            const normalized = (status || "").trim().toLowerCase();
            if (!normalized) {
                return "-";
            }
            return normalized;
        },
        renderEventTimestamp: function (timestamp: number): string {
            if (!timestamp) {
                return "-";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        translateAgentTraceEventType: function (labelKey: string): string {
            return this.$t(labelKey);
        },
        buildEventDetailView: function (entry: AgentTraceEventItem): ItaasPlatformEventDetailView {
            const translate = this.translateAgentTraceEventType.bind(this);
            return {
                id: entry.id || "",
                eventId: entry.eventId || "",
                eventType: entry.eventType || "",
                eventLabel: resolveAgentTraceEventLabel(entry.eventType || "", translate),
                status: resolveExecutionStatus(entry) || (entry.status || "").trim().toLowerCase(),
                flowId: entry.flowId || "",
                executionId: entry.executionId || "",
                organizationId: entry.organizationId || "",
                actor: entry.actor || "",
                startedAt: entry.startedAt || 0,
                finishedAt: entry.finishedAt || 0,
                occurredAt: entry.occurredAt || 0,
                createdAt: entry.createdAt || 0,
                anchoredAt: entry.anchoredAt || 0,
                txHash: entry.txHash || "",
                output: entry.output || "",
            };
        },
        openEventDetail: function (event: ItaasPlatformTimelineEventRow): void {
            const rawEvent = this.rawTimelineEvents.find(function (entry) {
                return entry.id === event.id;
            });
            if (!rawEvent) {
                return;
            }

            this.selectedEventDetail = this.buildEventDetailView(rawEvent);
            this.displayEventDetailModal = true;
        },
        applyTimelinePresentation: function (): void {
            const translate = this.translateAgentTraceEventType.bind(this);

            this.timelineEvents = this.rawTimelineEvents.map(function (entry) {
                return mapAgentTraceEventToTimelineRow(entry, translate);
            });

            this.flowLabel = resolveFlowLabelFromTimelineEvents(this.flowId, this.rawTimelineEvents, this.flowLabelLookup, translate);
            this.summaryStatus = resolveTimelineSummaryStatus(this.rawTimelineEvents);
        },
        loadExecutionDetail: function (): void {
            const executionId = normalizeRouteParam(this.$route.params.executionId);
            if (!executionId) {
                this.notFound = true;
                return;
            }

            if (this.loading) {
                return;
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.notFound = false;
            this.loadError = "";
            this.executionId = executionId;
            this.displayEventDetailModal = false;
            this.selectedEventDetail = null;

            const flowIdQuery = normalizeRouteQuery(this.$route.query.flowId);
            const queryParams = flowIdQuery ? { flowId: flowIdQuery } : {};

            const request = ApiTraceability.GetAgentTraceEventsByExecution(executionId, queryParams);

            Request.Pending(this.loadRequestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as AgentTraceExecutionTimelineResponse;
                    this.executionId = (response.execution_id || executionId).trim();
                    this.flowId = (response.flow_id || flowIdQuery || "").trim();
                    this.rawTimelineEvents = response.events || [];
                    this.applyTimelinePresentation();
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestInvalidExecutionId: () => {
                            this.notFound = true;
                        },
                        forbidden: () => {
                            this.loadError = this.$t("Access denied");
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.loadError = this.$t("Active ITAAS subscription or assigned organization license is required");
                        },
                        notFound: () => {
                            this.notFound = true;
                        },
                        notFoundExecutionNotFound: () => {
                            this.notFound = true;
                        },
                        temporalError: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                    });
                    if (!this.notFound && !this.loadError) {
                        this.loadError = this.$t("Temporal error occurred. Please try again later.");
                    }
                    this.rawTimelineEvents = [];
                    this.timelineEvents = [];
                    this.loading = false;
                })
                .onUnexpectedError(() => {
                    this.loadError = this.$t("Temporal error occurred. Please try again later.");
                    this.rawTimelineEvents = [];
                    this.timelineEvents = [];
                    this.loading = false;
                });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Execution detail"));
        this.$autoFocus();
        this.loadFlowLabelLookup();
        this.loadExecutionDetail();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        this.abortFlowLabelLookup();
    },
    watch: {
        "$route.params.executionId": function (): void {
            this.loadExecutionDetail();
        },
        "$route.query.flowId": function (): void {
            if (this.rawTimelineEvents.length > 0) {
                this.loadExecutionDetail();
            }
        },
        flowLabelLookup: {
            deep: true,
            handler: function (): void {
                if (this.rawTimelineEvents.length === 0) {
                    return;
                }
                this.applyTimelinePresentation();
            },
        },
    },
});
</script>

<style>
@import "@/style/layout/traceability-page.css";
@import "@/style/layout/itaas-platform.css";
</style>
