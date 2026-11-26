<template>
    <div class="page-content traceability-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Compliance - auditor')"
            :title="$t('Traceability')"
            :subtitle="$t('Verifiable event log with blockchain anchor for sensitive operations.')"
        />

        <section class="dashboard-kpis">
            <article class="kpi-card">
                <p class="kpi-label">{{ $t("Total events") }}</p>
                <p class="kpi-value">{{ totalEvents }}</p>
                <p class="kpi-hint">{{ $t("Current wallet history") }}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">{{ $t("Confirmed") }}</p>
                <p class="kpi-value">{{ confirmedEvents }}</p>
                <p class="kpi-hint">{{ $t("Anchored on-chain") }}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">{{ $t("Pending") }}</p>
                <p class="kpi-value">{{ pendingEvents }}</p>
                <p class="kpi-hint">{{ $t("Waiting confirmation") }}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">{{ $t("Failed") }}</p>
                <p class="kpi-value">{{ failedEvents }}</p>
                <p class="kpi-hint">{{ $t("Needs review") }}</p>
            </article>
        </section>

        <section class="dashboard-data-card">
            <TableCardToolbar
                :tabs="tabs"
                :active-tab="activeTab"
                :tablist-label="$t('Traceability tabs')"
                tab-panel-id="traceability-panel"
                @select="selectTab"
            >
                <template #actions>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn"
                        :aria-label="$t('Refresh')"
                        :title="$t('Refresh')"
                        :disabled="activeLoading"
                        @click="refreshAll"
                    >
                        <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
                    </button>
                </template>
            </TableCardToolbar>
            <div
                id="traceability-panel"
                class="traceability-events"
                role="tabpanel"
                :aria-labelledby="'traceability-panel-tab-' + activeTab"
            >
                <p v-if="activeLoading" class="table-feedback">{{ $t("Loading") }}...</p>
                <p v-else-if="activeRows.length === 0" class="table-feedback">{{ $t("No events found for this tab") }}</p>
                <template v-else>
                    <div class="table-responsive traceability-table-wrap">
                        <table class="table table-wide table-stack table-stack--single-col-mobile traceability-table">
                            <thead>
                                <tr>
                                    <th>{{ $t("Timestamp") }}</th>
                                    <th>{{ $t("Type") }}</th>
                                    <th>{{ $t("Status") }}</th>
                                    <th>{{ $t("Reference") }}</th>
                                    <th>{{ $t("Tx") }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in activeRows" :key="row.id">
                                    <td :data-label="$t('Timestamp')" class="table-stack-row-primary traceability-cell--timestamp">
                                        <span class="traceability-timestamp--desktop">{{ renderDate(row.createdAt) }}</span>
                                        <span class="traceability-timestamp--mobile">
                                            <span class="traceability-timestamp-date">{{ renderDateOnly(row.createdAt) }}</span>
                                            <span class="traceability-timestamp-time">{{ renderTimeOnly(row.createdAt) }}</span>
                                        </span>
                                    </td>
                                    <td :data-label="$t('Type')" class="traceability-cell--type">
                                        <span class="event-pill">{{ row.actionKind || "-" }}</span>
                                    </td>
                                    <td :data-label="$t('Status')" class="traceability-cell--status">
                                        <span :class="statusBadgeClass(row.status, traceabilityStatusToneMap)" role="status">
                                            {{ formatTraceabilityStatus(row.status) }}
                                        </span>
                                    </td>
                                    <td :data-label="$t('Reference')">
                                        <div class="traceability-hash-row">
                                            <span class="traceability-hash traceability-hash--desktop" :title="row.referenceCopyText">{{
                                                truncateMiddle(row.reference, 28)
                                            }}</span>
                                            <span class="traceability-hash traceability-hash--mobile" :title="row.referenceCopyText">{{
                                                truncateMiddle(row.reference, 28)
                                            }}</span>
                                            <CopyIconButton
                                                :text="row.referenceCopyText"
                                                label="Copy reference"
                                                success-message="Copied to clipboard!"
                                                :disabled="!canCopyTraceValue(row.referenceCopyText)"
                                            />
                                        </div>
                                    </td>
                                    <td :data-label="$t('Tx')">
                                        <div class="traceability-hash-row">
                                            <span class="traceability-hash traceability-hash--desktop" :title="row.txHash || '-'">{{
                                                truncateMiddle(row.txHash || "-", 20)
                                            }}</span>
                                            <span class="traceability-hash traceability-hash--mobile" :title="row.txHash || '-'">{{
                                                truncateMiddle(row.txHash || "-", 28)
                                            }}</span>
                                            <CopyIconButton
                                                :text="row.txHash"
                                                label="Copy transaction hash"
                                                success-message="Copied to clipboard!"
                                                :disabled="!canCopyTraceValue(row.txHash)"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </div>
            <PaginationBar
                :page="activePage"
                :total-pages="activeTotalPages"
                :can-go-prev="paginationCanGoPrev"
                :can-go-next="paginationCanGoNext"
                :visible="paginationVisible"
                :aria-label="$t('Traceability list pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>
    </div>
</template>

<script lang="ts">
import { ApiTraceability } from "@/api/api-group-traceability";
import {
    AgentTraceEventItem,
    AgentTraceEventsPageResponse,
    TokenTraceEventItem,
    TokenTraceEventsPageResponse,
    TraceEventItem,
    TraceEventsPageResponse,
    TraceOverviewResponse,
} from "@/api/definitions";
import { renderDate, renderDateAndTime } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { WalletsController } from "@/control/wallets";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { usePagination } from "@/composables/usePagination";
import { TRACEABILITY_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { truncateMiddle } from "@/utils/text";
import { formatTraceEventReference, TRACE_EVENT_TYPE_LABEL_KEYS } from "@/utils/traceability-events";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";

type TraceabilityTabId = "general" | "organization" | "token" | "agent";

const TRACEABILITY_TAB_IDS = ["general", "organization", "token", "agent"] as const;

type TraceabilityTabState = {
    rows: TraceabilityRow[];
    loaded: boolean;
    total: number;
};

type TraceabilityRow = {
    id: string;
    group: TraceabilityTabId;
    createdAt: number;
    actionKind: string;
    status: string;
    payloadHash: string;
    txHash: string;
    reference: string;
    referenceCopyText: string;
};

export default defineComponent({
    name: "TraceabilityPage",
    components: {
        CopyIconButton,
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbar,
    },
    setup: function () {
        const generalLoading = ref(false);
        const organizationLoading = ref(false);
        const tokenLoading = ref(false);
        const agentLoading = ref(false);
        const generalPagination = usePagination({ loading: generalLoading });
        const organizationPagination = usePagination({ loading: organizationLoading });
        const tokenPagination = usePagination({ loading: tokenLoading });
        const agentPagination = usePagination({ loading: agentLoading });

        return {
            generalLoadRequestId: getUniqueStringId(),
            organizationLoadRequestId: getUniqueStringId(),
            tokenLoadRequestId: getUniqueStringId(),
            agentLoadRequestId: getUniqueStringId(),
            overviewLoadRequestId: getUniqueStringId(),
            generalLoading,
            organizationLoading,
            tokenLoading,
            agentLoading,
            traceTabPagination: {
                general: {
                    page: generalPagination.page,
                    totalPages: generalPagination.totalPages,
                    visible: generalPagination.visible,
                    canGoPrev: generalPagination.canGoPrev,
                    canGoNext: generalPagination.canGoNext,
                    goPrev: generalPagination.goPrev,
                    goNext: generalPagination.goNext,
                    applyListMeta: generalPagination.applyListMeta,
                    reset: generalPagination.reset,
                    pageSize: generalPagination.pageSize,
                },
                organization: {
                    page: organizationPagination.page,
                    totalPages: organizationPagination.totalPages,
                    visible: organizationPagination.visible,
                    canGoPrev: organizationPagination.canGoPrev,
                    canGoNext: organizationPagination.canGoNext,
                    goPrev: organizationPagination.goPrev,
                    goNext: organizationPagination.goNext,
                    applyListMeta: organizationPagination.applyListMeta,
                    reset: organizationPagination.reset,
                    pageSize: organizationPagination.pageSize,
                },
                token: {
                    page: tokenPagination.page,
                    totalPages: tokenPagination.totalPages,
                    visible: tokenPagination.visible,
                    canGoPrev: tokenPagination.canGoPrev,
                    canGoNext: tokenPagination.canGoNext,
                    goPrev: tokenPagination.goPrev,
                    goNext: tokenPagination.goNext,
                    applyListMeta: tokenPagination.applyListMeta,
                    reset: tokenPagination.reset,
                    pageSize: tokenPagination.pageSize,
                },
                agent: {
                    page: agentPagination.page,
                    totalPages: agentPagination.totalPages,
                    visible: agentPagination.visible,
                    canGoPrev: agentPagination.canGoPrev,
                    canGoNext: agentPagination.canGoNext,
                    goPrev: agentPagination.goPrev,
                    goNext: agentPagination.goNext,
                    applyListMeta: agentPagination.applyListMeta,
                    reset: agentPagination.reset,
                    pageSize: agentPagination.pageSize,
                },
            },
        };
    },
    data: function () {
        return {
            traceabilityStatusToneMap: TRACEABILITY_STATUS_TONE_MAP,
            activeTab: "general" as TraceabilityTabId,
            walletAddress: "",
            overview: {
                total: 0,
                confirmed: 0,
                pending: 0,
                failed: 0,
            } as { total: number; confirmed: number; pending: number; failed: number },
            tabsState: {
                general: {
                    rows: [],
                    loaded: false,
                    total: 0,
                },
                organization: {
                    rows: [],
                    loaded: false,
                    total: 0,
                },
                token: {
                    rows: [],
                    loaded: false,
                    total: 0,
                },
                agent: {
                    rows: [],
                    loaded: false,
                    total: 0,
                },
            } as Record<TraceabilityTabId, TraceabilityTabState>,
        };
    },
    computed: {
        activeState(): TraceabilityTabState {
            return this.tabsState[this.activeTab];
        },
        activeTracePagination(): (typeof this.traceTabPagination)[TraceabilityTabId] {
            return this.traceTabPagination[this.activeTab];
        },
        activeRows(): TraceabilityRow[] {
            return this.activeState.rows;
        },
        activeLoading(): boolean {
            if (this.activeTab === "token") {
                return this.tokenLoading;
            }
            if (this.activeTab === "agent") {
                return this.agentLoading;
            }
            if (this.activeTab === "organization") {
                return this.organizationLoading;
            }
            return this.generalLoading;
        },
        activePage(): number {
            return this.activeTracePagination.page.value;
        },
        activePageSize(): number {
            return this.activeTracePagination.pageSize;
        },
        activeTotalPages(): number {
            return this.activeTracePagination.totalPages.value;
        },
        paginationVisible(): boolean {
            return !this.activeLoading && this.activeTracePagination.visible.value;
        },
        paginationCanGoPrev(): boolean {
            return this.activeTracePagination.canGoPrev.value;
        },
        paginationCanGoNext(): boolean {
            return this.activeTracePagination.canGoNext.value;
        },
        tabs(): Array<{ id: TraceabilityTabId; label: string; count: number }> {
            return [
                { id: "general", label: this.$t("General traceability"), count: this.tabsState.general.total },
                { id: "organization", label: this.$t("Organization traceability"), count: this.tabsState.organization.total },
                { id: "token", label: this.$t("Token traceability"), count: this.tabsState.token.total },
                { id: "agent", label: this.$t("Agent traceability"), count: this.tabsState.agent.total },
            ];
        },
        confirmedEvents(): number {
            return this.overview.confirmed;
        },
        pendingEvents(): number {
            return this.overview.pending;
        },
        failedEvents(): number {
            return this.overview.failed;
        },
        totalEvents(): number {
            return this.overview.total;
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        canCopyTraceValue: function (value: string): boolean {
            const normalized = (value || "").trim();
            return normalized.length > 0 && normalized !== "-";
        },
        formatTraceabilityStatus: function (status: string): string {
            if (!status) {
                return "-";
            }
            const normalized = status.toLowerCase();
            if (normalized === "confirmed") {
                return this.$t("Confirmed");
            }
            if (normalized === "pending") {
                return this.$t("Pending");
            }
            if (normalized === "failed") {
                return this.$t("Failed");
            }
            return status;
        },
        renderDate: function (ts: number): string {
            if (!ts) {
                return "-";
            }
            return renderDateAndTime(ts, this.$t);
        },
        renderDateOnly: function (ts: number): string {
            if (!ts) {
                return "-";
            }
            return renderDate(ts, this.$t);
        },
        renderTimeOnly: function (ts: number): string {
            if (!ts) {
                return "-";
            }
            const date = new Date(ts);
            const hh = String(date.getHours()).padStart(2, "0");
            const mm = String(date.getMinutes()).padStart(2, "0");
            const ss = String(date.getSeconds()).padStart(2, "0");
            return `${hh}:${mm}:${ss}`;
        },
        formatTraceEventType: function (eventType: string): string {
            const normalized = (eventType || "").trim();
            if (!normalized) {
                return "-";
            }
            const labelKey = TRACE_EVENT_TYPE_LABEL_KEYS[normalized];
            if (labelKey) {
                return this.$t(labelKey);
            }
            return normalized;
        },
        mapTraceEventRow: function (entry: TraceEventItem): TraceabilityRow {
            const referenceLabels = {
                organization: this.$t("Organization ID"),
                user: this.$t("User ID"),
                membership: this.$t("Membership ID"),
                license: this.$t("License ID"),
                subscription: this.$t("Subscription ID"),
            };

            return {
                id: `trace-${entry.id}`,
                group: "general",
                createdAt: entry.createdAt || entry.occurredAt || 0,
                actionKind: this.formatTraceEventType(entry.eventType || ""),
                status: entry.status || "",
                payloadHash: entry.payloadHash || "",
                txHash: entry.txHash || "",
                reference: formatTraceEventReference(entry, truncateMiddle, referenceLabels),
                referenceCopyText: formatTraceEventReference(entry, (value) => value, referenceLabels),
            };
        },
        mapOrganizationTraceEventRow: function (entry: TraceEventItem): TraceabilityRow {
            const row = this.mapTraceEventRow(entry);
            return {
                ...row,
                id: `org-trace-${entry.id}`,
                group: "organization",
            };
        },
        mapTokenTraceEventRow: function (entry: TokenTraceEventItem): TraceabilityRow {
            const paymentId = entry.paymentId || "";
            const operationId = entry.operationId || "";
            const checkoutSessionId = entry.checkoutSessionId || "";

            const reference = paymentId || operationId || checkoutSessionId || entry.scopeId || "-";

            return {
                id: `token-${entry.id}`,
                group: "token",
                createdAt: entry.createdAt || 0,
                actionKind: entry.actionKind || "",
                status: entry.status || "",
                payloadHash: entry.payloadHash || "",
                txHash: entry.txHash || "",
                reference,
                referenceCopyText: reference,
            };
        },
        mapAgentTraceEventRow: function (entry: AgentTraceEventItem): TraceabilityRow {
            const reference = entry.eventId || "-";

            return {
                id: `agent-${entry.id}`,
                group: "agent",
                createdAt: entry.occurredAt || entry.finishedAt || entry.startedAt || entry.createdAt || 0,
                actionKind: entry.eventType || "",
                status: entry.anchoredAt > 0 ? "confirmed" : "pending",
                payloadHash: "",
                txHash: entry.txHash || "",
                reference,
                referenceCopyText: reference,
            };
        },
        getTabRequestId: function (tabId: TraceabilityTabId): string {
            if (tabId === "token") {
                return this.tokenLoadRequestId;
            }
            if (tabId === "agent") {
                return this.agentLoadRequestId;
            }
            if (tabId === "organization") {
                return this.organizationLoadRequestId;
            }
            return this.generalLoadRequestId;
        },
        clearAllTabs: function () {
            this.tabsState.general.rows = [];
            this.tabsState.general.loaded = false;
            this.tabsState.general.total = 0;
            this.traceTabPagination.general.reset();

            this.tabsState.organization.rows = [];
            this.tabsState.organization.loaded = false;
            this.tabsState.organization.total = 0;
            this.traceTabPagination.organization.reset();

            this.tabsState.token.rows = [];
            this.tabsState.token.loaded = false;
            this.tabsState.token.total = 0;
            this.traceTabPagination.token.reset();

            this.tabsState.agent.rows = [];
            this.tabsState.agent.loaded = false;
            this.tabsState.agent.total = 0;
            this.traceTabPagination.agent.reset();
        },
        syncTabFromRoute: function (): void {
            const nextTab = normalizeRouteTabQuery(this.$route.query.tab, TRACEABILITY_TAB_IDS, "general");
            if (this.activeTab === nextTab) {
                return;
            }
            this.activeTab = nextTab;
            this.loadTab(nextTab);
        },
        selectTab: function (tabId: TraceabilityTabId) {
            if (this.activeTab === tabId) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, tabId, "general");
        },
        loadActiveTab: function () {
            this.loadTab(this.activeTab, true);
        },
        refreshAll: function () {
            this.loadOverview();
            this.loadActiveTab();
        },
        loadOverview: function () {
            this.walletAddress = WalletsController.CurrentWalletAddress || "";
            if (!this.walletAddress) {
                this.overview = { total: 0, confirmed: 0, pending: 0, failed: 0 };
                this.clearAllTabs();
                return;
            }

            const requestId = this.overviewLoadRequestId;
            Request.Abort(requestId);
            const request = ApiTraceability.GetTraceOverview();
            Request.Pending(requestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as TraceOverviewResponse;
                    this.overview = {
                        total: response.total || 0,
                        confirmed: response.confirmed || 0,
                        pending: response.pending || 0,
                        failed: response.failed || 0,
                    };
                    this.tabsState.general.total = response.generalTotal || 0;
                    this.tabsState.organization.total = response.organizationTotal || 0;
                    this.tabsState.token.total = response.tokenTotal || 0;
                    this.tabsState.agent.total = response.agentTotal || 0;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    this.overview = { total: 0, confirmed: 0, pending: 0, failed: 0 };
                    this.tabsState.general.total = 0;
                    this.tabsState.organization.total = 0;
                    this.tabsState.token.total = 0;
                    this.tabsState.agent.total = 0;
                })
                .onUnexpectedError(() => {
                    this.overview = { total: 0, confirmed: 0, pending: 0, failed: 0 };
                    this.tabsState.general.total = 0;
                    this.tabsState.organization.total = 0;
                    this.tabsState.token.total = 0;
                    this.tabsState.agent.total = 0;
                });
        },
        onPaginationPrev: function () {
            if (!this.activeTracePagination.goPrev()) {
                return;
            }
            this.loadTab(this.activeTab, true);
        },
        onPaginationNext: function () {
            if (!this.activeTracePagination.goNext()) {
                return;
            }
            this.loadTab(this.activeTab, true);
        },
        loadGeneralTab: function () {
            this.loadTraceEventsTab("general");
        },
        loadOrganizationTab: function () {
            this.loadTraceEventsTab("organization");
        },
        loadTraceEventsTab: function (tabId: "general" | "organization") {
            const state = this.tabsState[tabId];
            const pagination = this.traceTabPagination[tabId];
            const loadingRef = tabId === "organization" ? this.organizationLoading : this.generalLoading;
            const requestId = tabId === "organization" ? this.organizationLoadRequestId : this.generalLoadRequestId;

            if (loadingRef) {
                return;
            }

            Request.Abort(requestId);
            if (tabId === "organization") {
                this.organizationLoading = true;
            } else {
                this.generalLoading = true;
            }

            const queryParams: { page: number; pageSize: number; domain?: string } = {
                page: pagination.page.value,
                pageSize: pagination.pageSize,
            };
            if (tabId === "organization") {
                queryParams.domain = "organization";
            }

            const request = ApiTraceability.GetTraceEvents(queryParams);
            Request.Pending(requestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as TraceEventsPageResponse;
                    const mapRow = tabId === "organization" ? this.mapOrganizationTraceEventRow : this.mapTraceEventRow;
                    state.rows = (response.traceability_events || []).map(mapRow);
                    state.total = response.total || 0;
                    pagination.applyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                    state.loaded = true;
                    if (tabId === "organization") {
                        this.organizationLoading = false;
                    } else {
                        this.generalLoading = false;
                    }
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    state.rows = [];
                    if (tabId === "organization") {
                        this.organizationLoading = false;
                    } else {
                        this.generalLoading = false;
                    }
                })
                .onUnexpectedError(() => {
                    state.rows = [];
                    if (tabId === "organization") {
                        this.organizationLoading = false;
                    } else {
                        this.generalLoading = false;
                    }
                });
        },

        loadTab: function (tabId: TraceabilityTabId, force = false) {
            this.walletAddress = WalletsController.CurrentWalletAddress || "";
            if (!this.walletAddress) {
                this.clearAllTabs();
                return;
            }

            const state = this.tabsState[tabId];
            if (!force && state.loaded) {
                return;
            }

            if (tabId === "token") {
                this.loadTokenTab();
            } else if (tabId === "agent") {
                this.loadAgentTab();
            } else if (tabId === "organization") {
                this.loadOrganizationTab();
            } else {
                this.loadGeneralTab();
            }
        },

        loadTokenTab: function () {
            const state = this.tabsState.token;
            const pagination = this.traceTabPagination.token;
            if (this.tokenLoading) {
                return;
            }

            const requestId = this.tokenLoadRequestId;
            Request.Abort(requestId);
            this.tokenLoading = true;

            const queryParams = {
                page: pagination.page.value,
                pageSize: pagination.pageSize,
            };

            const request = ApiTraceability.GetTokenTraceEvents(queryParams);
            Request.Pending(requestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as TokenTraceEventsPageResponse;
                    state.rows = (response.token_traceability_events || []).map(this.mapTokenTraceEventRow);
                    state.total = response.total || 0;
                    pagination.applyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                    state.loaded = true;
                    this.tokenLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    state.rows = [];
                    this.tokenLoading = false;
                })
                .onUnexpectedError(() => {
                    state.rows = [];
                    this.tokenLoading = false;
                });
        },

        loadAgentTab: function () {
            const state = this.tabsState.agent;
            const pagination = this.traceTabPagination.agent;
            if (this.agentLoading) {
                return;
            }

            const requestId = this.agentLoadRequestId;
            Request.Abort(requestId);
            this.agentLoading = true;

            const queryParams = {
                page: pagination.page.value,
                pageSize: pagination.pageSize,
            };

            const request = ApiTraceability.GetAgentTraceEvents(queryParams);
            Request.Pending(requestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as AgentTraceEventsPageResponse;
                    state.rows = (response.agent_trace_events || []).map(this.mapAgentTraceEventRow);
                    state.total = response.total || 0;
                    pagination.applyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                    state.loaded = true;
                    this.agentLoading = false;
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
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                            this.redirectAwayFromAgentTab();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    state.rows = [];
                    this.agentLoading = false;
                })
                .onUnexpectedError(() => {
                    state.rows = [];
                    this.agentLoading = false;
                });
        },

        redirectAwayFromAgentTab: function () {
            this.tabsState.agent.rows = [];
            this.tabsState.agent.loaded = false;
            this.tabsState.agent.total = 0;
            this.traceTabPagination.agent.reset();
            if (this.activeTab === "agent") {
                replaceRouteTab(this.$router, this.$route, "general", "general");
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("current-wallet-changed", this.refreshAll.bind(this));
        this.$listenOnAppEvent("auth-status-changed", this.refreshAll.bind(this));
        this.$setSubTitle(this.$t("Traceability"));
        this.$autoFocus();
        this.syncTabFromRoute();
        this.loadOverview();
        this.loadActiveTab();
    },
    beforeUnmount: function () {
        Request.Abort(this.generalLoadRequestId);
        Request.Abort(this.organizationLoadRequestId);
        Request.Abort(this.tokenLoadRequestId);
        Request.Abort(this.agentLoadRequestId);
        Request.Abort(this.overviewLoadRequestId);
    },
    watch: {
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/traceability-page.css";

.traceability-hash-row :deep(.copy-icon-button) {
    min-height: 44px;
    padding: var(--space-4);
    flex: 0 0 auto;
}

.traceability-wallet {
    margin: 0 0 var(--space-12) 0;
    font-size: 14px;
    line-height: 20px;
}

.traceability-wallet-empty {
    color: var(--color-text-muted);
}
</style>
