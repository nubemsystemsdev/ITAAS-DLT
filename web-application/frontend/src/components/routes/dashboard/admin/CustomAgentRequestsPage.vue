<template>
    <div class="page-content custom-agent-requests-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Operation')"
            :title="$t('Agent requests')"
            :subtitle="$t('Review, accept, reject or deliver custom agent requests.')"
        />

        <section class="dashboard-section-card">
            <TableCardToolbar
                :tabs="statusTabs"
                :active-tab="statusFilter"
                :tablist-label="$t('Custom agent request status filters')"
                tab-panel-id="custom-agent-requests-panel"
                :tabs-disabled="loading"
                :filters-collapsed="filtersCollapsed"
                show-filters-toggle
                :filters-toggle-disabled="loading"
                @select="selectStatusFilter"
                @update:filtersCollapsed="onFiltersCollapsedUpdate"
            >
                <template #actions>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn"
                        :disabled="loading"
                        :title="$t('Refresh')"
                        :aria-label="$t('Refresh')"
                        @click="load"
                    >
                        <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
                    </button>
                </template>
                <template #filters>
                    <label class="toolbar-plan-filter" for="custom-agent-requests-search">
                        <span class="toolbar-plan-label">{{ $t("Search") }}</span>
                        <input
                            id="custom-agent-requests-search"
                            v-model="draftSearchQuery"
                            type="search"
                            class="toolbar-plan-select"
                            :placeholder="$t('Search by id, requester or description')"
                            :disabled="loading"
                            :aria-label="$t('Search custom agent requests')"
                            @keydown.enter.prevent="applySearchFilter"
                        />
                    </label>
                    <button
                        type="button"
                        class="btn btn-primary toolbar-action-btn toolbar-apply-btn"
                        :disabled="loading"
                        @click="applySearchFilter"
                    >
                        <i class="fas fa-check" aria-hidden="true"></i>
                        {{ $t("Apply filters") }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn"
                        :disabled="loading"
                        @click="clearSearchFilter"
                    >
                        <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                        {{ $t("Clear filters") }}
                    </button>
                </template>
            </TableCardToolbar>

            <div
                id="custom-agent-requests-panel"
                class="table-responsive"
                role="tabpanel"
                :aria-labelledby="'custom-agent-requests-panel-tab-' + statusFilter"
            >
                <table class="table table-wide table-stack table-stack--single-col-mobile custom-agent-requests-table">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Title") }}</th>
                            <th scope="col">{{ $t("Type") }}</th>
                            <th scope="col" class="td-shrink">{{ $t("Status") }}</th>
                            <th scope="col">{{ $t("Requester") }}</th>
                            <th scope="col">{{ $t("Organization") }}</th>
                            <th scope="col">{{ $t("Requested") }}</th>
                            <th scope="col" class="text-right td-shrink">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="loading">
                        <tr>
                            <td colspan="7" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-if="requests.length === 0">
                            <td colspan="7" class="table-feedback">{{ $t("No custom agent requests found") }}</td>
                        </tr>
                        <tr v-for="requestItem in requests" :key="requestItem.id">
                            <td :data-label="$t('Title')" class="table-stack-row-primary">
                                <span class="cell-strong" :title="getRequestTitle(requestItem.description)">
                                    {{ getRequestTitle(requestItem.description) }}
                                </span>
                            </td>
                            <td :data-label="$t('Type')">{{ formatRequestType(requestItem.requestType) }}</td>
                            <td :data-label="$t('Status')" class="td-shrink">
                                <span :class="statusBadgeClass(requestItem.status, customRequestStatusToneMap)" role="status">
                                    {{ formatRequestStatus(requestItem.status) }}
                                </span>
                            </td>
                            <td :data-label="$t('Requester')">
                                <router-link
                                    v-if="requestItem.requesterUserId"
                                    class="link-deco"
                                    :to="clientDetailRoute(requestItem.requesterUserId)"
                                    :title="requestItem.requesterUsername || requestItem.requesterUserId"
                                    :aria-label="$t('Clients view client details')"
                                >
                                    {{ requesterDisplayName(requestItem) }}
                                </router-link>
                                <span v-else class="custom-agent-requests-cell-muted">—</span>
                            </td>
                            <td :data-label="$t('Organization')">
                                <span
                                    v-if="requestItem.organizationId"
                                    class="custom-agent-requests-id"
                                    :title="requestItem.organizationId"
                                >
                                    {{ truncateId(requestItem.organizationId) }}
                                </span>
                                <span v-else class="custom-agent-requests-cell-muted">—</span>
                            </td>
                            <td :data-label="$t('Requested')">{{ renderTimestamp(requestItem.createdAt) }}</td>
                            <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                <div class="dashboard-actions-inline">
                                    <button
                                        type="button"
                                        class="btn btn-tertiary btn-xs"
                                        :disabled="isRequestBusy(requestItem.id)"
                                        :title="$t('View details')"
                                        :aria-label="$t('View custom agent request details')"
                                        @click="openDetailModal(requestItem)"
                                    >
                                        <i class="fas fa-eye no-margin" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <PaginationBar
                :page="page"
                :total-pages="totalPages"
                :can-go-prev="paginationCanGoPrev"
                :can-go-next="paginationCanGoNext"
                :visible="paginationVisible"
                :aria-label="$t('Custom agent requests pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>

        <CustomAgentRequestDetailModal
            v-if="detailModalOpen"
            v-model:display="detailModalOpen"
            :request="detailRequest"
            :busy="isDetailRequestBusy"
            :action-loading="detailActionLoading"
            @accept="onDetailAccept"
            @reject="onDetailReject"
            @deliver="onDetailDeliver"
            @cancel="onDetailCancel"
        />
        <CustomAgentRequestRejectModal
            v-if="rejectModalOpen"
            v-model:display="rejectModalOpen"
            :submitting="isActionLoading(rejectRequestTargetId, 'reject')"
            @confirm="rejectRequest"
        />
        <CustomAgentRequestDeliverModal
            v-if="deliverModalOpen"
            v-model:display="deliverModalOpen"
            :submitting="isActionLoading(deliverRequestTargetId, 'deliver')"
            :validation-error="deliverValidationError"
            @confirm="deliverRequest"
            @clear-validation="deliverValidationError = ''"
        />
    </div>
</template>

<script lang="ts">
import { ApiItaasPlatform } from "@/api/api-group-itaas-platform";
import { ApiItaasWorkspaceAdmin } from "@/api/api-group-itaas-workspace-admin";
import type { ItaasAdminFlowItem, ItaasCustomAgentRequestItem } from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import CustomAgentRequestDeliverModal from "@/components/modals/CustomAgentRequestDeliverModal.vue";
import CustomAgentRequestDetailModal from "@/components/modals/CustomAgentRequestDetailModal.vue";
import CustomAgentRequestRejectModal from "@/components/modals/CustomAgentRequestRejectModal.vue";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import { usePagination } from "@/composables/usePagination";
import { AuthController } from "@/control/auth";
import { statusBadgeClass } from "@/utils/status-badge";
import { renderDateAndTime } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";

const STATUS_FILTER_ALL = "all";
const STATUS_FILTER_IDS = [
    STATUS_FILTER_ALL,
    "pending_review",
    "pending_payment",
    "in_development",
    "delivered",
    "rejected",
    "cancelled",
] as const;

type StatusFilterId = (typeof STATUS_FILTER_IDS)[number];

const CUSTOM_REQUEST_STATUS_TONE_MAP: Record<string, "success" | "warning" | "error" | "muted"> = {
    pending_review: "warning",
    rejected: "error",
    pending_payment: "warning",
    in_development: "warning",
    delivered: "success",
    cancelled: "muted",
};

const SEARCH_DEBOUNCE_MS = 350;

export default defineComponent({
    name: "CustomAgentRequestsPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbar,
        CustomAgentRequestDeliverModal,
        CustomAgentRequestDetailModal,
        CustomAgentRequestRejectModal,
    },
    setup: function () {
        const loading = ref(true);
        const pagination = usePagination({ loading });
        const collapsibleFilters = useCollapsibleFilters(true);

        return {
            loading,
            loadRequestId: getUniqueStringId(),
            searchDebounceId: getUniqueStringId(),
            acceptRequestId: getUniqueStringId(),
            cancelRequestId: getUniqueStringId(),
            rejectRequestId: getUniqueStringId(),
            deliverRequestId: getUniqueStringId(),
            validateFlowRequestId: getUniqueStringId(),
            detailRequestId: getUniqueStringId(),
            pageSize: pagination.pageSize,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            filtersCollapsed: collapsibleFilters.filtersCollapsed,
            setFiltersCollapsed: collapsibleFilters.setFiltersCollapsed,
        };
    },
    data: function () {
        return {
            requests: [] as ItaasCustomAgentRequestItem[],
            statusFilter: STATUS_FILTER_ALL as StatusFilterId,
            draftSearchQuery: "",
            appliedSearchQuery: "",
            actionLoadingId: "",
            rejectModalOpen: false,
            rejectRequestTargetId: "",
            deliverModalOpen: false,
            deliverRequestTargetId: "",
            deliverRequestTarget: null as ItaasCustomAgentRequestItem | null,
            deliverValidationError: "",
            detailModalOpen: false,
            detailRequest: null as ItaasCustomAgentRequestItem | null,
            pendingDetailRequestId: "",
            customRequestStatusToneMap: CUSTOM_REQUEST_STATUS_TONE_MAP,
        };
    },
    computed: {
        statusTabs: function (): Array<{ id: StatusFilterId; label: string }> {
            return STATUS_FILTER_IDS.map((id) => ({
                id,
                label: id === STATUS_FILTER_ALL ? this.$t("All") : this.formatRequestStatus(id),
            }));
        },
        isDetailRequestBusy: function (): boolean {
            return this.detailRequest ? this.isRequestBusy(this.detailRequest.id) : false;
        },
        detailActionLoading: function (): "accept" | "cancel" | "reject" | "deliver" | "" {
            if (!this.detailRequest) {
                return "";
            }
            if (this.isActionLoading(this.detailRequest.id, "accept")) {
                return "accept";
            }
            if (this.isActionLoading(this.detailRequest.id, "reject")) {
                return "reject";
            }
            if (this.isActionLoading(this.detailRequest.id, "deliver")) {
                return "deliver";
            }
            if (this.isActionLoading(this.detailRequest.id, "cancel")) {
                return "cancel";
            }
            return "";
        },
    },
    methods: {
        statusBadgeClass,
        hasAdminAccess: function (): boolean {
            return AuthController.hasPermission("admin.users.manage");
        },
        truncateId: function (value: string): string {
            const normalized = (value || "").trim();
            if (!normalized) {
                return "—";
            }
            if (normalized.length <= 12) {
                return normalized;
            }
            return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
        },
        requesterDisplayName: function (requestItem: ItaasCustomAgentRequestItem): string {
            const username = (requestItem.requesterUsername || "").trim();
            if (username) {
                return username;
            }
            return this.truncateId(requestItem.requesterUserId);
        },
        clientDetailRoute: function (clientId: string): { name: string; params: { clientId: string } } {
            return {
                name: "clients-client-detail",
                params: { clientId },
            };
        },
        getRequestTitle: function (description: string): string {
            const firstLine = (description || "").split(/\r?\n/)[0].trim();
            const separatorIndex = firstLine.indexOf(":");
            if (separatorIndex > 0) {
                const key = firstLine.substring(0, separatorIndex).trim().toLowerCase();
                if (key === "title" || key === "título" || key === "titre" || key === "titel") {
                    return firstLine.substring(separatorIndex + 1).trim() || this.$t("Untitled request");
                }
            }
            return firstLine || this.$t("Untitled request");
        },
        formatRequestType: function (requestType: string): string {
            const normalized = (requestType || "").trim().toLowerCase();
            if (normalized === "adaptation") {
                return this.$t("Adaptation of existing flow");
            }
            return this.$t("Custom flow");
        },
        formatRequestStatus: function (status: string): string {
            const normalized = (status || "").trim().toLowerCase();
            switch (normalized) {
                case "pending_review":
                    return this.$t("Pending review");
                case "rejected":
                    return this.$t("Rejected");
                case "pending_payment":
                    return this.$t("Payment pending");
                case "in_development":
                    return this.$t("In development");
                case "delivered":
                    return this.$t("Delivered");
                case "cancelled":
                    return this.$t("Cancelled");
                default:
                    return this.$t("Request status");
            }
        },
        renderTimestamp: function (timestamp: number): string {
            if (!timestamp) {
                return "—";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        normalizedStatus: function (status: string): string {
            return (status || "").trim().toLowerCase();
        },
        canAcceptRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return this.normalizedStatus(requestItem.status) === "pending_review";
        },
        canRejectRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return this.normalizedStatus(requestItem.status) === "pending_review";
        },
        canDeliverRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return this.normalizedStatus(requestItem.status) === "in_development";
        },
        canCancelRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return this.normalizedStatus(requestItem.status) === "pending_payment";
        },
        isFlowAssignedToAnotherSubject: function (flow: ItaasAdminFlowItem, requestItem: ItaasCustomAgentRequestItem | null): boolean {
            const assignments = flow.assignments || [];
            if (!requestItem) {
                return false;
            }
            const organizationId = (requestItem.organizationId || "").trim();
            const subjectType = organizationId ? "organization" : "user";
            const subjectId = organizationId || (requestItem.requesterUserId || "").trim();
            if (!subjectId) {
                return flow.visibility === "workspace" || assignments.length > 0;
            }
            if (assignments.length === 0) {
                return flow.visibility === "workspace";
            }
            return assignments.some((row) => row.subjectType !== subjectType || row.subjectId !== subjectId);
        },
        clearActionLoading: function (): void {
            this.actionLoadingId = "";
        },
        isRequestBusy: function (requestId: string): boolean {
            return this.actionLoadingId.startsWith(requestId + ":");
        },
        isActionLoading: function (requestId: string, kind: "accept" | "cancel" | "reject" | "deliver"): boolean {
            return this.actionLoadingId === requestId + ":" + kind;
        },
        openDetailModal: function (requestItem: ItaasCustomAgentRequestItem): void {
            this.detailRequest = requestItem;
            this.detailModalOpen = true;
            this.pendingDetailRequestId = "";
        },
        syncOpenDetailFromList: function (): void {
            if (!this.detailModalOpen || !this.detailRequest) {
                return;
            }
            const updated = this.requests.find((item) => item.id === this.detailRequest?.id);
            if (updated) {
                this.detailRequest = updated;
            }
        },
        syncDetailFromRoute: function (): void {
            const rawId = this.$route.query.id;
            const requestId = Array.isArray(rawId) ? (rawId[0] || "") + "" : (rawId || "") + "";
            const normalized = requestId.trim();
            if (!normalized) {
                return;
            }
            this.pendingDetailRequestId = normalized;
            this.tryOpenPendingDetail();
        },
        tryOpenPendingDetail: function (): void {
            const requestId = (this.pendingDetailRequestId || "").trim();
            if (!requestId) {
                return;
            }
            const fromList = this.requests.find((item) => item.id === requestId);
            if (fromList) {
                this.openDetailModal(fromList);
                return;
            }
            this.fetchDetailRequest(requestId);
        },
        fetchDetailRequest: function (requestId: string): void {
            Request.Abort(this.detailRequestId);
            Request.Pending(this.detailRequestId, ApiItaasPlatform.AdminGetItaasCustomAgentRequest(requestId))
                .onSuccess((item) => {
                    if ((this.pendingDetailRequestId || "").trim() !== requestId) {
                        return;
                    }
                    this.openDetailModal(item);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        notFoundRequestNotFound: () => {
                            this.pendingDetailRequestId = "";
                            this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                        },
                        notFound: () => {
                            this.pendingDetailRequestId = "";
                            this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                        },
                        temporalError: () => {
                            Timeouts.Set(this.detailRequestId, 1500, () => {
                                this.fetchDetailRequest(requestId);
                            });
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                });
        },
        openRejectModal: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (this.isRequestBusy(requestItem.id) || !this.canRejectRequest(requestItem)) {
                return;
            }
            this.rejectRequestTargetId = requestItem.id;
            this.rejectModalOpen = true;
        },
        closeRejectModal: function (): void {
            if (this.isActionLoading(this.rejectRequestTargetId, "reject")) {
                return;
            }
            this.rejectModalOpen = false;
            this.rejectRequestTargetId = "";
        },
        openDeliverModal: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (this.isRequestBusy(requestItem.id) || !this.canDeliverRequest(requestItem)) {
                return;
            }
            this.deliverRequestTargetId = requestItem.id;
            this.deliverRequestTarget = requestItem;
            this.deliverValidationError = "";
            this.deliverModalOpen = true;
        },
        onDetailAccept: function (): void {
            this.startDetailAction((requestItem) => {
                this.askAcceptRequest(requestItem);
            });
        },
        onDetailReject: function (): void {
            this.startDetailAction((requestItem) => {
                this.openRejectModal(requestItem);
            });
        },
        onDetailDeliver: function (): void {
            this.startDetailAction((requestItem) => {
                this.openDeliverModal(requestItem);
            });
        },
        onDetailCancel: function (): void {
            this.startDetailAction((requestItem) => {
                this.askCancelRequest(requestItem);
            });
        },
        startDetailAction: function (action: (requestItem: ItaasCustomAgentRequestItem) => void): void {
            const requestItem = this.detailRequest;
            if (!requestItem) {
                return;
            }
            this.closeDetailModal();
            this.$nextTick(() => {
                action(requestItem);
            });
        },
        closeDetailModal: function (): void {
            this.detailModalOpen = false;
            this.detailRequest = null;
        },
        finishRequestMutation: function (): void {
            this.clearActionLoading();
            this.rejectModalOpen = false;
            this.rejectRequestTargetId = "";
            this.deliverModalOpen = false;
            this.deliverRequestTargetId = "";
            this.deliverRequestTarget = null;
            this.deliverValidationError = "";
            this.closeDetailModal();
        },
        closeDeliverModal: function (): void {
            if (this.isActionLoading(this.deliverRequestTargetId, "deliver")) {
                return;
            }
            this.deliverModalOpen = false;
            this.deliverRequestTargetId = "";
            this.deliverRequestTarget = null;
            this.deliverValidationError = "";
        },
        askAcceptRequest: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (this.isRequestBusy(requestItem.id) || !this.canAcceptRequest(requestItem)) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Accept custom agent request"),
                message: this.$t("Do you want to accept this custom agent request? The requester will be asked to pay the deposit."),
                callback: () => this.acceptRequest(requestItem.id),
            });
        },
        askCancelRequest: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (this.isRequestBusy(requestItem.id) || !this.canCancelRequest(requestItem)) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Cancel custom agent request"),
                message: this.$t("Do you want to cancel this custom agent request?"),
                rejectAction: true,
                callback: () => this.cancelRequest(requestItem.id),
            });
        },
        acceptRequest: function (requestId: string): void {
            this.actionLoadingId = requestId + ":accept";
            Request.Abort(this.acceptRequestId);
            Request.Pending(this.acceptRequestId, ApiItaasPlatform.AdminAcceptItaasCustomAgentRequest(requestId))
                .onSuccess(() => {
                    this.finishRequestMutation();
                    this.$showSnackBar(this.$t("Custom agent request accepted"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleAcceptError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.clearActionLoading();
                    this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                    this.load();
                });
        },
        cancelRequest: function (requestId: string): void {
            this.actionLoadingId = requestId + ":cancel";
            Request.Abort(this.cancelRequestId);
            Request.Pending(this.cancelRequestId, ApiItaasPlatform.AdminCancelItaasCustomAgentRequest(requestId))
                .onSuccess(() => {
                    this.finishRequestMutation();
                    this.$showSnackBar(this.$t("Custom agent request cancelled"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleCancelError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.clearActionLoading();
                    this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                    this.load();
                });
        },
        rejectRequest: function (reason: string): void {
            const requestId = this.rejectRequestTargetId;
            if (!requestId) {
                return;
            }
            this.actionLoadingId = requestId + ":reject";
            Request.Abort(this.rejectRequestId);
            Request.Pending(this.rejectRequestId, ApiItaasPlatform.AdminRejectItaasCustomAgentRequest(requestId, { reason }))
                .onSuccess(() => {
                    this.finishRequestMutation();
                    this.$showSnackBar(this.$t("Custom agent request rejected"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleRejectError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.clearActionLoading();
                    this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                    this.load();
                });
        },
        deliverRequest: function (flowId: string): void {
            const requestId = this.deliverRequestTargetId;
            if (!requestId) {
                return;
            }
            this.deliverValidationError = "";
            this.actionLoadingId = requestId + ":deliver";
            Request.Abort(this.validateFlowRequestId);
            Request.Abort(this.deliverRequestId);
            Request.Pending(this.validateFlowRequestId, ApiItaasWorkspaceAdmin.AdminGetItaasFlow(flowId))
                .onSuccess((flow) => {
                    if (flow.isGlobal) {
                        this.clearActionLoading();
                        this.deliverValidationError = this.$t("Global flows cannot be delivered as custom agent requests.");
                        return;
                    }
                    const requestItem =
                        this.deliverRequestTarget || this.requests.find((row) => row.id === requestId) || this.detailRequest;
                    if (this.isFlowAssignedToAnotherSubject(flow, requestItem)) {
                        this.clearActionLoading();
                        this.deliverValidationError = this.$t("This flow is already assigned to a workspace.");
                        return;
                    }
                    this.executeDeliverRequest(requestId, flowId);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.clearActionLoading();
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.clearActionLoading();
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidFlowId: () => {
                            this.clearActionLoading();
                            this.deliverValidationError = this.$t("No Flowise flow found with this ID");
                        },
                        badRequest: () => {
                            this.clearActionLoading();
                            this.deliverValidationError = this.$t("No Flowise flow found with this ID");
                        },
                        notFoundFlowNotFound: () => {
                            this.clearActionLoading();
                            this.deliverValidationError = this.$t("No Flowise flow found with this ID");
                        },
                        notFound: () => {
                            this.clearActionLoading();
                            this.deliverValidationError = this.$t("No Flowise flow found with this ID");
                        },
                        status503BffUnavailable: () => {
                            this.clearActionLoading();
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.clearActionLoading();
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.clearActionLoading();
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.clearActionLoading();
                    this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                });
        },
        executeDeliverRequest: function (requestId: string, flowId: string): void {
            Request.Abort(this.deliverRequestId);
            Request.Pending(this.deliverRequestId, ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(requestId, { flowId }))
                .onSuccess(() => {
                    this.finishRequestMutation();
                    this.$showSnackBar(this.$t("Custom agent request delivered"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleDeliverError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.clearActionLoading();
                    this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                    this.load();
                });
        },
        handleAcceptError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => {
                    this.$requireLogin();
                },
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequestInvalidStatus: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending review."));
                },
                badRequest: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("This request cannot be accepted."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
        handleCancelError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => {
                    this.$requireLogin();
                },
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequestInvalidStatus: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request can no longer be cancelled."));
                },
                badRequest: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("This request cannot be cancelled."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
        handleRejectError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => {
                    this.$requireLogin();
                },
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequestInvalidStatus: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending review."));
                    this.closeRejectModal();
                },
                badRequestInvalidRejectionReason: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("A rejection reason is required"));
                },
                badRequest: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("This request cannot be rejected."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                    this.closeRejectModal();
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                    this.closeRejectModal();
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
        handleDeliverError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => {
                    this.$requireLogin();
                },
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequestInvalidStatus: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer in development."));
                    this.closeDeliverModal();
                },
                badRequestFlowAlreadyDelivered: () => {
                    this.deliverValidationError = this.$t("This request already has a delivered flow. Use the existing Flowise flow ID.");
                },
                badRequestInvalidFlowId: () => {
                    this.deliverValidationError = this.$t("No Flowise flow found with this ID");
                },
                badRequestFlowIsGlobal: () => {
                    this.deliverValidationError = this.$t("Global flows cannot be delivered as custom agent requests.");
                },
                badRequestFlowAlreadyAssigned: () => {
                    this.deliverValidationError = this.$t("This flow is already assigned to a workspace.");
                },
                badRequest: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("This request cannot be delivered."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                    this.closeDeliverModal();
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Request not found"));
                    this.closeDeliverModal();
                },
                status422PaymentMethodRequired: () => {
                    this.$showMessageModal(
                        this.$t("Payment method required"),
                        this.$t("The requester needs a saved payment method before delivery."),
                    );
                },
                status422DeliveryFailed: () => {
                    this.$showMessageModal(this.$t("Delivery failed"), this.$t("Could not deliver the custom agent flow."));
                },
                status422: () => {
                    this.$showMessageModal(this.$t("Delivery failed"), this.$t("Could not deliver the custom agent flow."));
                },
                status503FlowOpBusy: () => {
                    this.$showMessageModal(
                        this.$t("Action failed"),
                        this.$t("Another operation is in progress for this request. Please try again."),
                    );
                },
                status503BffUnavailable: () => {
                    this.$showMessageModal(this.$t("Service unavailable"), this.$t("Could not reach the flow provisioning service."));
                },
                status503: () => {
                    this.$showMessageModal(this.$t("Service unavailable"), this.$t("Could not reach the flow provisioning service."));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
        onFiltersCollapsedUpdate: function (collapsed: boolean): void {
            this.setFiltersCollapsed(collapsed);
        },
        selectStatusFilter: function (tabId: string): void {
            const next = (STATUS_FILTER_IDS as readonly string[]).includes(tabId) ? (tabId as StatusFilterId) : STATUS_FILTER_ALL;
            if (this.statusFilter === next) {
                return;
            }
            this.statusFilter = next;
            this.paginationReset();
            this.load();
        },
        scheduleSearchFilter: function (): void {
            Timeouts.Set(this.searchDebounceId, SEARCH_DEBOUNCE_MS, () => {
                this.applySearchFilter();
            });
        },
        applySearchFilter: function (): void {
            Timeouts.Abort(this.searchDebounceId);
            const nextQuery = (this.draftSearchQuery || "").trim();
            if (this.appliedSearchQuery === nextQuery) {
                return;
            }
            this.appliedSearchQuery = nextQuery;
            this.draftSearchQuery = nextQuery;
            this.paginationReset();
            this.load();
        },
        clearSearchFilter: function (): void {
            Timeouts.Abort(this.searchDebounceId);
            if (!this.draftSearchQuery && !this.appliedSearchQuery) {
                return;
            }
            this.draftSearchQuery = "";
            this.appliedSearchQuery = "";
            this.paginationReset();
            this.load();
        },
        onPaginationPrev: function (): void {
            if (this.paginationGoPrev()) {
                this.load();
            }
        },
        onPaginationNext: function (): void {
            if (this.paginationGoNext()) {
                this.load();
            }
        },
        load: function (): void {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            if (!AuthController.isAuthenticated()) {
                this.loading = false;
                this.$requireLogin();
                return;
            }

            if (!this.hasAdminAccess()) {
                this.loading = false;
                this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                this.$router.push({ name: HOME_ROUTE });
                return;
            }

            this.loading = true;

            const queryParams: {
                q?: string;
                status?: string;
                page: number;
                pageSize: number;
            } = {
                page: this.page,
                pageSize: this.pageSize,
            };

            if (this.appliedSearchQuery) {
                queryParams.q = this.appliedSearchQuery;
            }
            if (this.statusFilter !== STATUS_FILTER_ALL) {
                queryParams.status = this.statusFilter;
            }

            Request.Pending(this.loadRequestId, ApiItaasPlatform.AdminListItaasCustomAgentRequests(queryParams))
                .onSuccess((list) => {
                    const items = list.items || [];
                    const totalPages = list.totalPages || 1;
                    if (items.length === 0 && this.page > 1 && totalPages > 0) {
                        this.page = Math.min(this.page - 1, totalPages);
                        this.load();
                        return;
                    }
                    this.requests = items;
                    this.paginationApplyListMeta({ page: list.page, totalPages });
                    this.loading = false;
                    this.syncOpenDetailFromList();
                    this.tryOpenPendingDetail();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.loading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.loading = false;
                            this.requests = [];
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        temporalError: () => {
                            this.loading = false;
                            this.requests = [];
                            Timeouts.Set(this.loadRequestId, 1500, () => {
                                this.load();
                            });
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.loading = false;
                    this.requests = [];
                    Timeouts.Set(this.loadRequestId, 1500, () => {
                        this.load();
                    });
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));
        this.syncDetailFromRoute();
        this.load();
        this.$setSubTitle(this.$t("Agent requests"));
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Timeouts.Abort(this.searchDebounceId);
        Timeouts.Abort(this.detailRequestId);
        Request.Abort(this.loadRequestId);
        Request.Abort(this.acceptRequestId);
        Request.Abort(this.cancelRequestId);
        Request.Abort(this.rejectRequestId);
        Request.Abort(this.deliverRequestId);
        Request.Abort(this.validateFlowRequestId);
        Request.Abort(this.detailRequestId);
    },
    watch: {
        draftSearchQuery: function (): void {
            this.scheduleSearchFilter();
        },
        "$route.query.id": function (): void {
            this.syncDetailFromRoute();
        },
    },
});
</script>

<style scoped>
@media (max-width: 1024px) {
    .custom-agent-requests-table.table-stack .table-stack-row-primary,
    .custom-agent-requests-table.table-stack .actions-cell {
        align-self: center;
    }

    .custom-agent-requests-table.table-stack .table-stack-row-primary {
        flex: 1 1 auto;
        max-width: calc(100% - 60px);
        min-width: 0;
    }

    .custom-agent-requests-table.table-stack .table-stack-row-primary .cell-strong {
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: bottom;
    }
}

.custom-agent-requests-id {
    word-break: break-all;
    color: var(--color-text-muted);
}

.custom-agent-requests-cell-muted {
    color: var(--color-text-muted);
}
</style>
