<template>
    <div class="page-content org-requests-page" tabindex="-1">
        <DashboardPageHeader :eyebrow="$t('Operation')" :title="$t('Orgs requests')" :subtitle="pageSubtitle" />

        <section class="org-requests-card">
            <TableCardToolbarTabs
                class="org-requests-tabs"
                :tabs="viewTabs"
                :active-tab="activeViewTab"
                panel-id="org-requests-panel"
                :tablist-label="$t('Organization request types')"
                @select="selectViewTab"
            />

            <div id="org-requests-panel" role="tabpanel" :aria-labelledby="'org-requests-panel-tab-' + activeViewTab">
                <div v-if="activeViewTab === 'creation'" class="table-responsive">
                    <table class="table table-stack table-stack--single-col-mobile org-requests-table">
                        <thead>
                            <tr>
                                <th>{{ $t("Organization") }}</th>
                                <th>{{ $t("CIF/NIF") }}</th>
                                <th>{{ $t("Applicant") }}</th>
                                <th>{{ $t("Status") }}</th>
                                <th>{{ $t("Requested") }}</th>
                                <th class="text-right td-shrink">{{ $t("Actions") }}</th>
                            </tr>
                        </thead>
                        <tbody v-if="loading">
                            <tr>
                                <td colspan="6" class="table-feedback">{{ $t("Loading") }}...</td>
                            </tr>
                        </tbody>
                        <tbody v-else>
                            <tr v-if="requests.length === 0">
                                <td colspan="6" class="table-feedback">{{ $t("No organization requests found") }}</td>
                            </tr>
                            <tr v-for="request in requests" :key="request.id">
                                <td :data-label="$t('Organization')" class="table-stack-row-primary">{{ request.companyName }}</td>
                                <td :data-label="$t('CIF/NIF')">{{ request.cifNif }}</td>
                                <td :data-label="$t('Applicant')">{{ request.applicantEmail }}</td>
                                <td :data-label="$t('Status')">
                                    <span :class="statusBadgeClass(request.status, orgRequestStatusToneMap)" role="status">
                                        {{ request.status }}
                                    </span>
                                </td>
                                <td :data-label="$t('Requested')">{{ renderDate(request.requestedAt) }}</td>
                                <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                    <div v-if="isPending(request.status)" class="dashboard-actions-inline">
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-xs"
                                            :disabled="isRequestBusy(request.id)"
                                            :title="$t('Approve organization request')"
                                            :aria-label="$t('Approve organization request')"
                                            @click="askApproveCreationRequest(request.id)"
                                        >
                                            <i
                                                :class="
                                                    isActionLoading(request.id, 'approve')
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-check no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-danger btn-xs"
                                            :disabled="isRequestBusy(request.id)"
                                            :title="$t('Reject organization request')"
                                            :aria-label="$t('Reject organization request')"
                                            @click="askRejectCreationRequest(request.id)"
                                        >
                                            <i
                                                :class="
                                                    isActionLoading(request.id, 'reject')
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-times no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                    </div>
                                    <span v-else>—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else class="table-responsive">
                    <table class="table table-stack table-stack--single-col-mobile org-requests-table">
                        <thead>
                            <tr>
                                <th>{{ $t("Organization") }}</th>
                                <th>{{ $t("Requested by") }}</th>
                                <th>{{ $t("Subscription handling preference") }}</th>
                                <th>{{ $t("Status") }}</th>
                                <th>{{ $t("Requested") }}</th>
                                <th class="text-right td-shrink">{{ $t("Actions") }}</th>
                            </tr>
                        </thead>
                        <tbody v-if="loading">
                            <tr>
                                <td colspan="6" class="table-feedback">{{ $t("Loading") }}...</td>
                            </tr>
                        </tbody>
                        <tbody v-else>
                            <tr v-if="deletionRequests.length === 0">
                                <td colspan="6" class="table-feedback">{{ $t("No organization deletion requests found") }}</td>
                            </tr>
                            <tr v-for="request in deletionRequests" :key="request.id">
                                <td :data-label="$t('Organization')" class="table-stack-row-primary">{{ request.organizationName }}</td>
                                <td :data-label="$t('Requested by')">{{ request.requestedByUsername }}</td>
                                <td :data-label="$t('Subscription handling preference')">
                                    {{ formatSubscriptionPreference(request.subscriptionPreference, $t) }}
                                </td>
                                <td :data-label="$t('Status')">
                                    <span :class="statusBadgeClass(request.status, orgDeletionRequestStatusToneMap)" role="status">
                                        {{ formatDeletionStatus(request.status, $t) }}
                                    </span>
                                </td>
                                <td :data-label="$t('Requested')">{{ renderDate(request.requestedAt) }}</td>
                                <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                    <div v-if="isPending(request.status)" class="dashboard-actions-inline">
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-xs"
                                            :disabled="isRequestBusy(request.id)"
                                            :title="$t('Approve deletion request')"
                                            :aria-label="$t('Approve deletion request')"
                                            @click="askApproveDeletionRequest(request.id)"
                                        >
                                            <i
                                                :class="
                                                    isActionLoading(request.id, 'approve')
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-check no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-danger btn-xs"
                                            :disabled="isRequestBusy(request.id)"
                                            :title="$t('Reject deletion request')"
                                            :aria-label="$t('Reject deletion request')"
                                            @click="askRejectDeletionRequest(request.id)"
                                        >
                                            <i
                                                :class="
                                                    isActionLoading(request.id, 'reject')
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-times no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                    </div>
                                    <div v-else-if="isResolvedDeletionRequest(request.status)" class="dashboard-actions-inline">
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-xs"
                                            :aria-label="$t('View details')"
                                            :title="$t('View details')"
                                            @click="openDeletionRequestDetail(request)"
                                        >
                                            <i class="fas fa-eye no-margin" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <span v-else>—</span>
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
                    :aria-label="paginationAriaLabel"
                    @prev="onPaginationPrev"
                    @next="onPaginationNext"
                />
            </div>
        </section>

        <ModalDialogContainer v-model:display="rejectDeletionModalOpen">
            <div class="modal-dialog modal-md org-requests-reject-modal" @click.stop>
                <div class="modal-header">
                    <div class="modal-title">{{ $t("Reject deletion request") }}</div>
                    <button
                        type="button"
                        class="modal-close-btn"
                        :title="$t('Close')"
                        :aria-label="$t('Close')"
                        @click="closeRejectDeletionModal"
                    >
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>{{ $t("Do you want to reject this organization deletion request?") }}</p>
                    <label class="org-requests-reject-label" for="org-deletion-reject-reason">{{ $t("Rejection reason") }}</label>
                    <textarea
                        id="org-deletion-reject-reason"
                        v-model="rejectDeletionReason"
                        rows="4"
                        maxlength="2000"
                        class="form-control form-control-full-width form-textarea"
                        :disabled="!!actionLoadingId"
                    ></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary" :disabled="!!actionLoadingId" @click="closeRejectDeletionModal">
                        {{ $t("Cancel") }}
                    </button>
                    <button type="button" class="btn btn-danger" :disabled="!!actionLoadingId" @click="confirmRejectDeletionRequest">
                        <i
                            :class="isActionLoading(rejectDeletionRequestId, 'reject') ? 'fas fa-spinner fa-spin' : 'fas fa-xmark'"
                            aria-hidden="true"
                        ></i>
                        {{ $t("Reject") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>

        <OrganizationDeletionRequestDetailModal v-model:display="deletionRequestDetailModalOpen" :request="deletionRequestDetail" />
    </div>
</template>

<script lang="ts">
import { ApiOrganizations } from "@/api/api-group-organizations";
import { OrgDeletionRequestItem, OrgRequestItem } from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import { formatDeletionStatus, formatSubscriptionPreference } from "@/utils/organization-deletion";
import { renderDate } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbarTabs from "@/components/layout/TableCardToolbarTabs.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import OrganizationDeletionRequestDetailModal from "@/components/modals/organization/OrganizationDeletionRequestDetailModal.vue";
import { ORG_DELETION_REQUEST_STATUS_TONE_MAP, ORG_REQUEST_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";
import { usePagination } from "@/composables/usePagination";

const PENDING_STATUS = "Pending";
const ORG_REQUESTS_TAB_IDS = ["creation", "deletion"] as const;

type OrgRequestsViewTab = (typeof ORG_REQUESTS_TAB_IDS)[number];

export default defineComponent({
    name: "OrgsRequestsPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbarTabs,
        ModalDialogContainer,
        OrganizationDeletionRequestDetailModal,
    },
    setup: function () {
        const loading = ref(true);
        const pagination = usePagination({ loading });

        return {
            loading,
            loadRequestId: getUniqueStringId(),
            approveCreationRequestId: getUniqueStringId(),
            rejectCreationRequestId: getUniqueStringId(),
            approveDeletionRequestId: getUniqueStringId(),
            rejectDeletionAbortId: getUniqueStringId(),
            pageSize: pagination.pageSize,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
        };
    },
    data: function () {
        return {
            activeViewTab: "creation" as OrgRequestsViewTab,
            orgRequestStatusToneMap: ORG_REQUEST_STATUS_TONE_MAP,
            orgDeletionRequestStatusToneMap: ORG_DELETION_REQUEST_STATUS_TONE_MAP,
            actionLoadingId: "",
            requests: [] as OrgRequestItem[],
            deletionRequests: [] as OrgDeletionRequestItem[],
            rejectDeletionModalOpen: false,
            rejectDeletionRequestId: "",
            rejectDeletionReason: "",
            deletionRequestDetailModalOpen: false,
            deletionRequestDetail: null as OrgDeletionRequestItem | null,
        };
    },
    computed: {
        viewTabs: function (): Array<{ id: OrgRequestsViewTab; label: string }> {
            return [
                { id: "creation", label: "Creation requests" },
                { id: "deletion", label: "Deletion requests" },
            ];
        },
        pageSubtitle: function (): string {
            if (this.activeViewTab === "deletion") {
                return String(
                    this.$t(
                        "Review, approve or reject organization deletion requests. At period end keeps the org active until subscriptions end.",
                    ),
                );
            }
            return String(this.$t("Review, approve or reject organization onboarding requests from companies."));
        },
        paginationAriaLabel: function (): string {
            if (this.activeViewTab === "deletion") {
                return String(this.$t("Organization deletion requests pagination"));
            }
            return String(this.$t("Organization requests pagination"));
        },
    },
    methods: {
        statusBadgeClass,
        isPending: function (status: string): boolean {
            return (status || "").toLowerCase() === "pending";
        },
        isResolvedDeletionRequest: function (status: string): boolean {
            const normalized = (status || "").trim();
            return normalized === "Approved" || normalized === "ApprovedPendingPeriodEnd" || normalized === "Rejected";
        },
        openDeletionRequestDetail: function (request: OrgDeletionRequestItem): void {
            this.deletionRequestDetail = request;
            this.deletionRequestDetailModalOpen = true;
        },
        renderDate: function (ts: number): string {
            return renderDate(ts, this.$t);
        },
        formatDeletionStatus: formatDeletionStatus,
        formatSubscriptionPreference: formatSubscriptionPreference,
        syncTabFromRoute: function (): void {
            this.activeViewTab = normalizeRouteTabQuery(this.$route.query.tab, ORG_REQUESTS_TAB_IDS, "creation");
        },
        selectViewTab: function (tabId: string): void {
            const nextTab = tabId === "deletion" ? "deletion" : "creation";
            if (this.activeViewTab === nextTab) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, nextTab, "creation");
        },
        load: function () {
            if (this.activeViewTab === "deletion") {
                this.loadDeletionRequests();
                return;
            }
            this.loadCreationRequests();
        },
        loadCreationRequests: function () {
            Request.Abort(this.loadRequestId);
            this.loading = true;

            Request.Pending(
                this.loadRequestId,
                ApiOrganizations.ListOrganizationRequests({
                    page: this.page,
                    pageSize: this.pageSize,
                    status: PENDING_STATUS,
                }),
            )
                .onSuccess((list) => {
                    const items = list.items || [];
                    const totalPages = list.totalPages || 1;
                    if (items.length === 0 && this.page > 1 && totalPages > 0) {
                        this.page = Math.min(this.page - 1, totalPages);
                        this.loadCreationRequests();
                        return;
                    }
                    this.requests = items;
                    this.paginationApplyListMeta({ page: list.page, totalPages });
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.handleListRequestError(err, handleErr);
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.requests = [];
                });
        },
        loadDeletionRequests: function () {
            Request.Abort(this.loadRequestId);
            this.loading = true;

            Request.Pending(
                this.loadRequestId,
                ApiOrganizations.ListOrganizationDeletionRequests({
                    page: this.page,
                    pageSize: this.pageSize,
                }),
            )
                .onSuccess((list) => {
                    const items = list.items || [];
                    const totalPages = list.totalPages || 1;
                    if (items.length === 0 && this.page > 1 && totalPages > 0) {
                        this.page = Math.min(this.page - 1, totalPages);
                        this.loadDeletionRequests();
                        return;
                    }
                    this.deletionRequests = items;
                    this.paginationApplyListMeta({ page: list.page, totalPages });
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.handleListRequestError(err, handleErr);
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.deletionRequests = [];
                });
        },
        handleListRequestError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                    this.$router.push({ name: HOME_ROUTE });
                },
                badRequest: () => {
                    this.loading = false;
                    this.requests = [];
                    this.deletionRequests = [];
                    this.paginationReset();
                },
                badRequestInvalidStatus: () => {
                    this.loading = false;
                    this.requests = [];
                    this.deletionRequests = [];
                    this.paginationReset();
                },
                temporalError: () => {
                    this.loading = false;
                    this.requests = [];
                    this.deletionRequests = [];
                },
            });
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
        clearActionLoading: function (): void {
            this.actionLoadingId = "";
        },
        isRequestBusy: function (requestId: string): boolean {
            return this.actionLoadingId.startsWith(requestId + ":");
        },
        isActionLoading: function (requestId: string, kind: "approve" | "reject"): boolean {
            return this.actionLoadingId === requestId + ":" + kind;
        },
        askApproveCreationRequest: function (requestId: string): void {
            if (this.isRequestBusy(requestId)) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Approve organization request"),
                message: this.$t("Do you want to approve this organization request?"),
                callback: () => this.approveCreationRequest(requestId),
            });
        },
        askRejectCreationRequest: function (requestId: string): void {
            if (this.isRequestBusy(requestId)) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Reject organization request"),
                message: this.$t("Do you want to reject this organization request?"),
                rejectAction: true,
                callback: () => this.rejectCreationRequest(requestId),
            });
        },
        approveCreationRequest: function (requestId: string) {
            this.actionLoadingId = requestId + ":approve";
            Request.Abort(this.approveCreationRequestId);
            Request.Pending(this.approveCreationRequestId, ApiOrganizations.ApproveOrganizationRequest(requestId))
                .onSuccess(() => {
                    this.clearActionLoading();
                    this.$showSnackBar(this.$t("Organization creation request approved"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleCreationActionError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError(() => {
                    this.clearActionLoading();
                    this.load();
                });
        },
        rejectCreationRequest: function (requestId: string) {
            this.actionLoadingId = requestId + ":reject";
            Request.Abort(this.rejectCreationRequestId);
            Request.Pending(this.rejectCreationRequestId, ApiOrganizations.RejectOrganizationRequest(requestId))
                .onSuccess(() => {
                    this.clearActionLoading();
                    this.$showSnackBar(this.$t("Organization creation request rejected"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleCreationRejectError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError(() => {
                    this.clearActionLoading();
                    this.load();
                });
        },
        askApproveDeletionRequest: function (requestId: string): void {
            if (this.isRequestBusy(requestId)) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Approve deletion request"),
                message: this.$t("Do you want to approve this organization deletion request?"),
                deleteAction: true,
                callback: () => this.approveDeletionRequest(requestId),
            });
        },
        askRejectDeletionRequest: function (requestId: string): void {
            if (this.isRequestBusy(requestId)) {
                return;
            }
            this.rejectDeletionRequestId = requestId;
            this.rejectDeletionReason = "";
            this.rejectDeletionModalOpen = true;
        },
        closeRejectDeletionModal: function (): void {
            if (this.actionLoadingId) {
                return;
            }
            this.rejectDeletionModalOpen = false;
            this.rejectDeletionRequestId = "";
            this.rejectDeletionReason = "";
        },
        confirmRejectDeletionRequest: function (): void {
            if (!this.rejectDeletionRequestId) {
                return;
            }
            this.rejectDeletionRequest(this.rejectDeletionRequestId, this.rejectDeletionReason);
        },
        approveDeletionRequest: function (requestId: string) {
            this.actionLoadingId = requestId + ":approve";
            Request.Abort(this.approveDeletionRequestId);
            Request.Pending(this.approveDeletionRequestId, ApiOrganizations.ApproveOrganizationDeletionRequest(requestId))
                .onSuccess(() => {
                    this.clearActionLoading();
                    this.$showSnackBar(this.$t("Organization deletion request approved"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleDeletionActionError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError(() => {
                    this.clearActionLoading();
                    this.load();
                });
        },
        rejectDeletionRequest: function (requestId: string, reason: string) {
            this.actionLoadingId = requestId + ":reject";
            Request.Abort(this.rejectDeletionAbortId);
            Request.Pending(
                this.rejectDeletionAbortId,
                ApiOrganizations.RejectOrganizationDeletionRequest(requestId, { reason: (reason || "").trim() }),
            )
                .onSuccess(() => {
                    this.clearActionLoading();
                    this.closeRejectDeletionModal();
                    this.$showSnackBar(this.$t("Organization deletion request rejected"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.handleDeletionRejectError(err, handleErr);
                    this.clearActionLoading();
                    this.load();
                })
                .onUnexpectedError(() => {
                    this.clearActionLoading();
                    this.load();
                });
        },
        handleCreationActionError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequest: () => {
                    this.$showMessageModal(
                        this.$t("Cannot approve request"),
                        this.$t("The request cannot be approved in its current state."),
                    );
                },
                badRequestRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                badRequestRequestNotPending: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending."));
                },
                badRequestApplicantUserNotFound: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("Applicant user was not found."));
                },
                badRequestAdminAlreadyHasOrganization: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("Applicant already has an organization."));
                },
                badRequestCifNifAlreadyExists: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("CIF/NIF already belongs to an existing organization."));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
                serverErrorBlockchainRegistrationFailed: () => {
                    this.$showMessageModal(this.$t("Error"), this.$t("Blockchain registration failed"));
                },
            });
        },
        handleCreationRejectError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequest: () => {
                    this.$showMessageModal(
                        this.$t("Cannot reject request"),
                        this.$t("The request cannot be rejected in its current state."),
                    );
                },
                badRequestRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                badRequestRequestNotPending: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending."));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                notFoundRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization request was not found."));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
        handleDeletionActionError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequest: () => {
                    this.$showMessageModal(
                        this.$t("Cannot approve request"),
                        this.$t("The deletion request cannot be approved in its current state."),
                    );
                },
                badRequestDeletionRequestNotPending: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending."));
                },
                badRequestInvalidSubscriptionPreference: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid subscription preference."));
                },
                badRequestOrganizationNotActive: () => {
                    this.$showMessageModal(this.$t("Invalid request"), this.$t("Organization is not active."));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization deletion request was not found."));
                },
                notFoundDeletionRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization deletion request was not found."));
                },
                notFoundOrganizationNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Organization not found"));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
                serverErrorStripeNotConfigured: () => {
                    this.$showMessageModal(this.$t("Error"), this.$t("Stripe is not configured"));
                },
                serverErrorRefundFailed: () => {
                    this.$showMessageModal(this.$t("Error"), this.$t("Refund failed"));
                },
                serverErrorBlockchainRegistrationFailed: () => {
                    this.$showMessageModal(this.$t("Error"), this.$t("Blockchain registration failed"));
                },
            });
        },
        handleDeletionRejectError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void): void {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequest: () => {
                    this.$showMessageModal(
                        this.$t("Cannot reject request"),
                        this.$t("The deletion request cannot be rejected in its current state."),
                    );
                },
                badRequestDeletionRequestNotPending: () => {
                    this.$showMessageModal(this.$t("Already processed"), this.$t("This request is no longer pending."));
                },
                notFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization deletion request was not found."));
                },
                notFoundDeletionRequestNotFound: () => {
                    this.$showMessageModal(this.$t("Not found"), this.$t("The organization deletion request was not found."));
                },
                temporalError: () => {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                },
            });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));
        this.syncTabFromRoute();
        this.load();
        this.$setSubTitle(this.$t("Orgs requests"));
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.approveCreationRequestId);
        Request.Abort(this.rejectCreationRequestId);
        Request.Abort(this.approveDeletionRequestId);
        Request.Abort(this.rejectDeletionAbortId);
    },
    watch: {
        "$route.query.tab": function () {
            const previousTab = this.activeViewTab;
            this.syncTabFromRoute();
            if (previousTab !== this.activeViewTab) {
                this.paginationReset();
                this.load();
            }
        },
    },
});
</script>

<style scoped>
.org-requests-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-1);
    padding: var(--space-16);
}

.org-requests-tabs {
    margin-bottom: var(--space-16);
}

.org-requests-reject-modal {
    max-width: 520px;
    box-sizing: border-box;
}

.org-requests-reject-label {
    display: block;
    margin-top: var(--space-16);
    margin-bottom: var(--space-8);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
}

@media (max-width: 640px) {
    .org-requests-table .dashboard-actions-inline {
        flex-wrap: wrap;
        justify-content: flex-end;
    }
}
</style>
