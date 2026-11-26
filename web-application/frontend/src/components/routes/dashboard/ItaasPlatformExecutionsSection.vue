<template>
    <div class="itaas-platform-executions">
        <TableCardToolbar
            :tabs="[]"
            :filters-collapsed="filtersCollapsed"
            show-filters-toggle
            @update:filtersCollapsed="onFiltersCollapsedUpdate"
        >
            <template #actions>
                <button
                    type="button"
                    class="btn btn-tertiary toolbar-action-btn"
                    :aria-label="$t('Refresh')"
                    :title="$t('Refresh')"
                    :disabled="loading"
                    @click="loadExecutions"
                >
                    <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
                </button>
            </template>

            <template #filters>
                <label class="toolbar-plan-filter" for="itaas-execution-filter-flow-id">
                    <span class="toolbar-plan-label">{{ $t("Flow ID") }}</span>
                    <input id="itaas-execution-filter-flow-id" v-model="draftFilters.flowId" type="text" class="toolbar-plan-select" />
                </label>

                <label class="toolbar-plan-filter" for="itaas-execution-filter-date-from">
                    <span class="toolbar-plan-label">{{ $t("From") }}</span>
                    <input
                        id="itaas-execution-filter-date-from"
                        v-model="draftFilters.dateFrom"
                        :max="draftFilters.dateTo || undefined"
                        type="date"
                        class="toolbar-plan-select"
                    />
                </label>

                <label class="toolbar-plan-filter" for="itaas-execution-filter-date-to">
                    <span class="toolbar-plan-label">{{ $t("To") }}</span>
                    <input
                        id="itaas-execution-filter-date-to"
                        v-model="draftFilters.dateTo"
                        :min="draftFilters.dateFrom || undefined"
                        type="date"
                        class="toolbar-plan-select"
                    />
                </label>

                <label class="toolbar-plan-filter" for="itaas-execution-filter-outcome">
                    <span class="toolbar-plan-label">{{ $t("Outcome") }}</span>
                    <select id="itaas-execution-filter-outcome" v-model="draftFilters.outcome" class="toolbar-plan-select">
                        <option v-for="option in outcomeOptions" :key="option.value" :value="option.value">
                            {{ $t(option.labelKey) }}
                        </option>
                    </select>
                </label>

                <button
                    type="button"
                    class="btn btn-primary toolbar-action-btn toolbar-apply-btn"
                    :disabled="loading"
                    @click="onApplyFilters"
                >
                    <i class="fas fa-check" aria-hidden="true"></i>
                    {{ $t("Apply filters") }}
                </button>

                <button
                    type="button"
                    class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn"
                    :disabled="loading"
                    @click="onResetFilters"
                >
                    <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                    {{ $t("Clear filters") }}
                </button>
            </template>
        </TableCardToolbar>

        <header class="itaas-platform-panel-header">
            <div class="itaas-platform-panel-header__content">
                <h2 class="details-view-panel-title">{{ $t("Execution history") }}</h2>
            </div>
        </header>

        <p v-if="loading" class="table-feedback">{{ $t("Loading") }}...</p>
        <p v-else-if="accessDenied" class="table-feedback">
            {{ $t("Active ITAAS subscription or assigned organization license is required") }}
        </p>
        <p v-else-if="executions.length === 0" class="table-feedback">{{ $t("No executions found") }}</p>
        <template v-else>
            <ul class="itaas-platform-execution-list">
                <li v-for="execution in executions" :key="execution.id" class="itaas-platform-execution-row">
                    <button
                        type="button"
                        class="itaas-platform-execution-body itaas-platform-execution-body--clickable"
                        :aria-label="$t('View event details')"
                        @click="openExecutionDetail(execution)"
                    >
                        <div class="itaas-platform-execution-title-row">
                            <p class="itaas-platform-execution-title" :title="execution.flowId || execution.flowLabel">
                                {{ execution.flowLabel }}
                            </p>
                            <span :class="statusBadgeClass(execution.status, agentExecutionStatusToneMap)" role="status">
                                {{ formatExecutionStatus(execution.status) }}
                            </span>
                        </div>
                        <p class="itaas-platform-execution-meta">
                            {{ renderExecutionTimestamp(execution.timestamp) }}
                            <template v-if="execution.executionId"> · {{ truncateMiddle(execution.executionId, 16) }} </template>
                        </p>
                    </button>
                    <div class="itaas-platform-execution-hash-row">
                        <span class="traceability-hash" :title="execution.txHash || '-'">
                            {{ truncateMiddle(execution.txHash || "-", 20) }}
                        </span>
                        <CopyIconButton
                            :text="execution.txHash"
                            label="Copy transaction hash"
                            success-message="Copied to clipboard!"
                            :disabled="!canCopyHash(execution.txHash)"
                        />
                    </div>
                </li>
            </ul>

            <PaginationBar
                :page="pagination.page.value"
                :total-pages="pagination.totalPages.value"
                :show-bar="pagination.visible.value"
                :can-go-prev="pagination.canGoPrev.value"
                :can-go-next="pagination.canGoNext.value"
                @prev="onPrevPage"
                @next="onNextPage"
            />
        </template>

        <ItaasPlatformEventDetailModal
            v-if="displayEventDetailModal"
            v-model:display="displayEventDetailModal"
            :event="selectedEventDetail"
        />
    </div>
</template>

<script lang="ts">
import { ApiTraceability } from "@/api/api-group-traceability";
import { AgentTraceEventItem, AgentTraceEventsPageResponse } from "@/api/definitions";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import ItaasPlatformEventDetailModal, { type ItaasPlatformEventDetailView } from "@/components/modals/ItaasPlatformEventDetailModal.vue";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import { useItaasFlowLabelLookup } from "@/composables/useItaasFlowLabelLookup";
import { usePagination } from "@/composables/usePagination";
import { AGENT_EXECUTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import {
    buildAgentTraceEventsQuery,
    EMPTY_ITAAS_EXECUTION_FILTERS,
    EXECUTION_OUTCOME_FILTER_OPTIONS,
    mapAgentTraceEventToExecutionRow,
    resolveAgentTraceEventLabel,
    resolveExecutionStatus,
    type ExecutionOutcomeFilterValue,
    type ItaasPlatformExecutionFilters,
    type ItaasPlatformExecutionRow,
} from "@/utils/itaas-platform-execution-domain";
import { truncateMiddle } from "@/utils/text";
import { renderDateAndTime } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";

export type { ItaasPlatformExecutionRow };

const OUTCOME_LABEL_KEYS: Record<ExecutionOutcomeFilterValue, string> = {
    all: "All outcomes",
    completed: "Execution completed",
    stopped_error: "Execution stopped with error",
    stopped_manual: "Execution stopped manually",
};

function normalizeOutcomeFilter(raw: unknown): ExecutionOutcomeFilterValue {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value === "completed" || value === "stopped_error" || value === "stopped_manual") {
        return value;
    }
    return "all";
}

function readRouteFilterValue(raw: unknown): string {
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
    name: "ItaasPlatformExecutionsSection",
    components: {
        CopyIconButton,
        ItaasPlatformEventDetailModal,
        PaginationBar,
        TableCardToolbar,
    },
    setup: function () {
        const loading = ref(false);
        const pagination = usePagination({ loading: loading });
        const flowLabels = useItaasFlowLabelLookup();
        const filtersUi = useCollapsibleFilters(true);

        return {
            loading,
            pagination,
            flowLabelLookup: flowLabels.flowLabelLookup,
            loadFlowLabelLookup: flowLabels.loadFlowLabelLookup,
            abortFlowLabelLookup: flowLabels.abortFlowLabelLookup,
            filtersCollapsed: filtersUi.filtersCollapsed,
            setFiltersCollapsed: filtersUi.setFiltersCollapsed,
        };
    },
    data: function () {
        return {
            executions: [] as ItaasPlatformExecutionRow[],
            rawHistoryEvents: [] as AgentTraceEventItem[],
            accessDenied: false,
            loadRequestId: getUniqueStringId(),
            agentExecutionStatusToneMap: AGENT_EXECUTION_STATUS_TONE_MAP,
            appliedFilters: { ...EMPTY_ITAAS_EXECUTION_FILTERS } as ItaasPlatformExecutionFilters,
            draftFilters: { ...EMPTY_ITAAS_EXECUTION_FILTERS } as ItaasPlatformExecutionFilters,
            displayEventDetailModal: false,
            selectedEventDetail: null as ItaasPlatformEventDetailView | null,
        };
    },
    computed: {
        outcomeOptions: function (): Array<{ value: ExecutionOutcomeFilterValue; labelKey: string }> {
            return EXECUTION_OUTCOME_FILTER_OPTIONS.map(function (option) {
                return {
                    value: option.value,
                    labelKey: OUTCOME_LABEL_KEYS[option.value],
                };
            });
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        onFiltersCollapsedUpdate: function (collapsed: boolean): void {
            this.setFiltersCollapsed(collapsed);
        },
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
        renderExecutionTimestamp: function (timestamp: number): string {
            if (!timestamp) {
                return "-";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        translateAgentTraceEventType: function (labelKey: string): string {
            return this.$t(labelKey);
        },
        syncFiltersFromRoute: function (): void {
            const nextFilters: ItaasPlatformExecutionFilters = {
                flowId: readRouteFilterValue(this.$route.query.flowId),
                dateFrom: readRouteFilterValue(this.$route.query.dateFrom),
                dateTo: readRouteFilterValue(this.$route.query.dateTo),
                outcome: normalizeOutcomeFilter(this.$route.query.outcome),
            };
            this.appliedFilters = nextFilters;
            this.draftFilters = { ...nextFilters };
        },
        syncRouteFromFilters: function (): void {
            const query: Record<string, string> = {
                tab: "executions",
            };

            if (this.appliedFilters.flowId) {
                query.flowId = this.appliedFilters.flowId;
            }
            if (this.appliedFilters.dateFrom) {
                query.dateFrom = this.appliedFilters.dateFrom;
            }
            if (this.appliedFilters.dateTo) {
                query.dateTo = this.appliedFilters.dateTo;
            }
            if (this.appliedFilters.outcome !== "all") {
                query.outcome = this.appliedFilters.outcome;
            }

            void this.$router.replace({
                name: "itaas-platform",
                query: query,
            });
        },
        mapExecutionRows: function (entries: AgentTraceEventItem[]): ItaasPlatformExecutionRow[] {
            const lookup = this.flowLabelLookup;
            const translate = this.translateAgentTraceEventType.bind(this);

            return entries.map(function (entry) {
                return mapAgentTraceEventToExecutionRow(entry, {
                    lookup: lookup,
                    translateEventType: translate,
                });
            });
        },
        applyExecutionRows: function (): void {
            this.executions = this.mapExecutionRows(this.rawHistoryEvents);
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
        loadExecutions: function (): void {
            if (this.loading) {
                return;
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.accessDenied = false;

            const request = ApiTraceability.GetAgentTraceEvents({
                page: this.pagination.page.value,
                pageSize: this.pagination.pageSize,
                ...buildAgentTraceEventsQuery(this.appliedFilters),
            });

            Request.Pending(this.loadRequestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as AgentTraceEventsPageResponse;
                    this.rawHistoryEvents = response.agent_trace_events || [];
                    this.applyExecutionRows();
                    this.pagination.applyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                        badRequestInvalidEventType: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid event type"));
                        },
                        badRequestInvalidTimeRange: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid time range"));
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.executions = [];
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    if (!this.accessDenied) {
                        this.executions = [];
                        this.rawHistoryEvents = [];
                    }
                    this.loading = false;
                })
                .onUnexpectedError(() => {
                    this.executions = [];
                    this.rawHistoryEvents = [];
                    this.loading = false;
                });
        },
        onApplyFilters: function (): void {
            this.appliedFilters = {
                flowId: (this.draftFilters.flowId || "").trim(),
                dateFrom: (this.draftFilters.dateFrom || "").trim(),
                dateTo: (this.draftFilters.dateTo || "").trim(),
                outcome: this.draftFilters.outcome,
            };
            this.pagination.reset();
            this.syncRouteFromFilters();
            this.loadExecutions();
        },
        onResetFilters: function (): void {
            this.draftFilters = { ...EMPTY_ITAAS_EXECUTION_FILTERS };
            this.appliedFilters = { ...EMPTY_ITAAS_EXECUTION_FILTERS };
            this.pagination.reset();
            this.syncRouteFromFilters();
            this.loadExecutions();
        },
        onPrevPage: function (): void {
            if (this.pagination.goPrev()) {
                this.loadExecutions();
            }
        },
        onNextPage: function (): void {
            if (this.pagination.goNext()) {
                this.loadExecutions();
            }
        },
        openExecutionDetail: function (execution: ItaasPlatformExecutionRow): void {
            const rawEvent = this.rawHistoryEvents.find(function (entry) {
                return entry.id === execution.id;
            });
            if (!rawEvent) {
                return;
            }

            this.selectedEventDetail = this.buildEventDetailView(rawEvent);
            this.displayEventDetailModal = true;
        },
    },
    mounted: function () {
        this.syncFiltersFromRoute();
        this.loadFlowLabelLookup();
        this.loadExecutions();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        this.abortFlowLabelLookup();
    },
    watch: {
        flowLabelLookup: {
            deep: true,
            handler: function (): void {
                if (this.rawHistoryEvents.length === 0) {
                    return;
                }
                this.applyExecutionRows();
            },
        },
        "$route.query": {
            deep: true,
            handler: function (): void {
                const previous = JSON.stringify(this.appliedFilters);
                this.syncFiltersFromRoute();
                if (previous === JSON.stringify(this.appliedFilters)) {
                    return;
                }
                this.pagination.reset();
                this.loadExecutions();
            },
        },
    },
});
</script>
