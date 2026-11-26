<template>
    <div class="page-content organization-settings-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Organization')"
            :title="$t('Organization settings')"
            :subtitle="$t('Manage your organization billing and fiscal information in one place.')"
        />

        <section class="organization-settings-panel card">
            <div class="organization-settings-panel-content">
                <OrganizationFiscalDataPage></OrganizationFiscalDataPage>
            </div>
        </section>

        <section v-if="isOrgAdmin" class="organization-settings-panel card">
            <div class="organization-settings-panel-content">
                <article class="details-view-danger-panel organization-settings-danger-panel">
                    <h3 class="details-view-danger-title">{{ $t("Danger zone") }}</h3>

                    <p v-if="deletionLoading" class="organization-settings-state-message">{{ $t("Loading") }}...</p>

                    <template v-else-if="hasApprovedPendingPeriodEnd">
                        <p class="details-view-danger-description">
                            {{
                                $t(
                                    "Your organization deletion has been approved. The organization will remain active until the last subscription billing period ends.",
                                )
                            }}
                        </p>
                        <dl class="organization-settings-deletion-meta">
                            <div>
                                <dt>{{ $t("Status") }}</dt>
                                <dd>{{ formatDeletionStatus(deletionRequest?.status || "", $t) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Subscription handling preference") }}</dt>
                                <dd>
                                    {{
                                        formatSubscriptionPreference(
                                            deletionRequest?.resolvedSubscriptionHandling || deletionRequest?.subscriptionPreference || "",
                                            $t,
                                        )
                                    }}
                                </dd>
                            </div>
                            <div v-if="scheduledDeletionAt > 0">
                                <dt>{{ $t("Estimated closure") }}</dt>
                                <dd>{{ renderDate(scheduledDeletionAt, $t) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Approved") }}</dt>
                                <dd>{{ renderDate(deletionRequest?.resolvedAt || 0, $t) }}</dd>
                            </div>
                        </dl>
                    </template>

                    <template v-else-if="hasPendingDeletionRequest">
                        <p class="details-view-danger-description">
                            {{ $t("Your organization deletion request is awaiting platform admin approval.") }}
                        </p>
                        <dl class="organization-settings-deletion-meta">
                            <div>
                                <dt>{{ $t("Status") }}</dt>
                                <dd>{{ deletionRequest?.status || "" }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Subscription handling preference") }}</dt>
                                <dd>{{ formatSubscriptionPreference(deletionRequest?.subscriptionPreference || "", $t) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Requested") }}</dt>
                                <dd>{{ renderDate(deletionRequest?.requestedAt || 0, $t) }}</dd>
                            </div>
                        </dl>
                        <div class="details-view-danger-actions">
                            <button type="button" class="btn btn-tertiary" :disabled="cancellingDeletion" @click="askCancelDeletionRequest">
                                {{ $t("Cancel deletion request") }}
                            </button>
                        </div>
                    </template>

                    <template v-else-if="hasRejectedDeletionRequest">
                        <p class="details-view-danger-description">
                            {{ $t("Your organization deletion request has been rejected by a platform administrator.") }}
                        </p>
                        <dl class="organization-settings-deletion-meta">
                            <div>
                                <dt>{{ $t("Status") }}</dt>
                                <dd>{{ formatDeletionStatus(deletionRequest?.status || "", $t) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Rejection reason") }}</dt>
                                <dd>{{ deletionRequest?.rejectionReason || "—" }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Rejected") }}</dt>
                                <dd>{{ renderDate(deletionRequest?.resolvedAt || 0, $t) }}</dd>
                            </div>
                        </dl>
                        <div class="details-view-danger-actions">
                            <button type="button" class="btn btn-danger" @click="openDeletionRequestModal">
                                <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                {{ $t("Request deletion again") }}
                            </button>
                        </div>
                    </template>

                    <template v-else>
                        <p class="details-view-danger-description">
                            {{
                                $t(
                                    "Submit a deletion request for platform admin approval. Organization admins are notified when you submit; members are notified only if approved.",
                                )
                            }}
                        </p>
                        <div class="details-view-danger-actions">
                            <button type="button" class="btn btn-danger" @click="openDeletionRequestModal">
                                <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                {{ $t("Request organization deletion") }}
                            </button>
                        </div>
                    </template>
                </article>
            </div>
        </section>

        <OrganizationDeletionRequestModal
            ref="deletionRequestModal"
            v-model:display="deletionRequestModalOpen"
            :submitting="submittingDeletion"
            @submit="onDeletionRequestModalSubmit"
        ></OrganizationDeletionRequestModal>
    </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import { OrgDeletionRequestItem } from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import OrganizationDeletionRequestModal from "@/components/modals/organization/OrganizationDeletionRequestModal.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { ASYNC_COMPONENT_LOADER_DELAY_MS } from "@/constants/ui";
import { AppEvents } from "@/control/app-events";
import { OrganizationController } from "@/control/organization";
import { getUniqueStringId } from "@/utils/unique-id";
import { formatDeletionStatus, formatSubscriptionPreference } from "@/utils/organization-deletion";
import { renderDate } from "@/utils/time-utils";

const OrganizationFiscalDataPage = defineAsyncComponent({
    loader: () => import("./OrganizationFiscalDataPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

export default defineComponent({
    name: "OrganizationSettingsPage",
    components: {
        DashboardPageHeader,
        OrganizationFiscalDataPage,
        OrganizationDeletionRequestModal,
    },
    data: function () {
        return {
            loadDeletionRequestId: getUniqueStringId(),
            submitDeletionRequestId: getUniqueStringId(),
            cancelDeletionRequestId: getUniqueStringId(),
            organizationContextVersion: 0,
            deletionLoading: false,
            submittingDeletion: false,
            cancellingDeletion: false,
            deletionRequestModalOpen: false,
            deletionRequest: null as OrgDeletionRequestItem | null,
        };
    },
    computed: {
        isOrgAdmin: function (): boolean {
            void this.organizationContextVersion;
            return OrganizationController.isOrganizationAdmin();
        },
        orgId: function (): string {
            void this.organizationContextVersion;
            return OrganizationController.MyOrganization?.id || "";
        },
        hasPendingDeletionRequest: function (): boolean {
            return (this.deletionRequest?.status || "") === "Pending";
        },
        hasApprovedPendingPeriodEnd: function (): boolean {
            return (this.deletionRequest?.status || "") === "ApprovedPendingPeriodEnd";
        },
        hasRejectedDeletionRequest: function (): boolean {
            return (this.deletionRequest?.status || "") === "Rejected";
        },
        scheduledDeletionAt: function (): number {
            return this.deletionRequest?.scheduledDeletionAt || 0;
        },
    },
    methods: {
        renderDate: renderDate,
        formatDeletionStatus: formatDeletionStatus,
        formatSubscriptionPreference: formatSubscriptionPreference,

        onOrganizationContextChanged: function (): void {
            this.organizationContextVersion += 1;
            if (!this.isOrgAdmin) {
                this.deletionRequest = null;
                this.deletionLoading = false;
                return;
            }
            this.loadDeletionRequest();
        },

        loadDeletionRequest: function (): void {
            if (!this.orgId) {
                this.deletionRequest = null;
                this.deletionLoading = false;
                return;
            }

            Request.Abort(this.loadDeletionRequestId);
            this.deletionLoading = true;

            Request.Pending(this.loadDeletionRequestId, ApiOrganizations.GetOrganizationDeletionRequest(this.orgId))
                .onSuccess((item) => {
                    this.deletionLoading = false;
                    this.deletionRequest = item;
                })
                .onCancel(() => {
                    this.deletionLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.deletionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFoundDeletionRequestNotFound: () => {
                            this.deletionRequest = null;
                        },
                        notFound: () => {
                            this.deletionRequest = null;
                        },
                        forbidden: () => {
                            this.deletionRequest = null;
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not load the deletion request."));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.deletionRequest = null;
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.deletionLoading = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },

        openDeletionRequestModal: function (): void {
            if (this.hasPendingDeletionRequest || this.hasApprovedPendingPeriodEnd || this.deletionLoading) {
                return;
            }
            this.deletionRequestModalOpen = true;
        },

        closeDeletionRequestModal: function (): void {
            this.deletionRequestModalOpen = false;
            const modal = this.$refs.deletionRequestModal as { $closeModal?: (forced?: boolean) => void } | undefined;
            modal?.$closeModal?.(true);
        },

        onDeletionRequestModalSubmit: function (subscriptionPreference: string): void {
            this.submitDeletionRequest(subscriptionPreference);
        },

        submitDeletionRequest: function (subscriptionPreference: string): void {
            if (!this.orgId || this.submittingDeletion) {
                return;
            }

            Request.Abort(this.submitDeletionRequestId);
            this.submittingDeletion = true;

            Request.Pending(
                this.submitDeletionRequestId,
                ApiOrganizations.SubmitOrganizationDeletionRequest(this.orgId, {
                    subscriptionPreference,
                }),
            )
                .onSuccess((item) => {
                    this.submittingDeletion = false;
                    this.deletionRequest = item;
                    this.closeDeletionRequestModal();
                    this.$showSnackBar(this.$t("Organization deletion request submitted"));
                })
                .onCancel(() => {
                    this.submittingDeletion = false;
                    this.closeDeletionRequestModal();
                })
                .onRequestError((err, handleErr) => {
                    this.submittingDeletion = false;
                    this.closeDeletionRequestModal();
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestPendingDeletionRequestExists: () =>
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("A pending deletion request already exists for this organization."),
                            ),
                        badRequestOrganizationNotActive: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization is not active.")),
                        badRequestInvalidSubscriptionPreference: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid subscription preference.")),
                        badRequest: () => this.$showMessageModal(this.$t("Error"), this.$t("Could not submit the deletion request.")),
                        forbidden: () => this.$showMessageModal(this.$t("Error"), this.$t("You are not the admin of this organization.")),
                        notFoundOrganizationNotFound: () => this.$showMessageModal(this.$t("Error"), this.$t("Organization not found")),
                        notFound: () => this.$showMessageModal(this.$t("Error"), this.$t("Organization not found")),
                        temporalError: () => this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server")),
                        badRequestNotOrganizationAdmin: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("You are not the admin of this organization.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.submittingDeletion = false;
                    this.closeDeletionRequestModal();
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },

        askCancelDeletionRequest: function (): void {
            this.$askUserConfirmation({
                title: this.$t("Cancel deletion request"),
                message: this.$t("Do you want to cancel the organization deletion request?"),
                danger: true,
                callback: () => this.cancelDeletionRequest(),
            });
        },

        cancelDeletionRequest: function (): void {
            if (!this.orgId || this.cancellingDeletion) {
                return;
            }

            Request.Abort(this.cancelDeletionRequestId);
            this.cancellingDeletion = true;

            Request.Pending(this.cancelDeletionRequestId, ApiOrganizations.CancelOrganizationDeletionRequest(this.orgId))
                .onSuccess(() => {
                    this.cancellingDeletion = false;
                    this.deletionRequest = null;
                    this.$showSnackBar(this.$t("Organization deletion request cancelled"));
                })
                .onRequestError((err, handleErr) => {
                    this.cancellingDeletion = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestDeletionRequestNotPending: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("Only a pending deletion request can be cancelled.")),
                        badRequest: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("Only a pending deletion request can be cancelled.")),
                        notFoundDeletionRequestNotFound: () => {
                            this.deletionRequest = null;
                        },
                        notFound: () => {
                            this.deletionRequest = null;
                        },
                        forbidden: () => this.$showMessageModal(this.$t("Error"), this.$t("You are not the admin of this organization.")),
                        temporalError: () => this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server")),
                        forbiddenNotOrganizationAdmin: () =>
                            this.$showMessageModal(this.$t("Error"), this.$t("You are not the admin of this organization.")),
                        notFoundOrganizationNotFound: () => this.$showMessageModal(this.$t("Error"), this.$t("Organization not found")),
                    });
                })
                .onUnexpectedError(() => {
                    this.cancellingDeletion = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Organization settings"));
        AppEvents.AddEventListener("organization-context-changed", this.onOrganizationContextChanged);
        OrganizationController.ensureReady().then(() => {
            this.organizationContextVersion += 1;
            if (this.isOrgAdmin) {
                this.loadDeletionRequest();
            } else {
                this.deletionLoading = false;
            }
        });
    },
    beforeUnmount: function () {
        AppEvents.RemoveEventListener("organization-context-changed", this.onOrganizationContextChanged);
        Request.Abort(this.loadDeletionRequestId);
        Request.Abort(this.submitDeletionRequestId);
        Request.Abort(this.cancelDeletionRequestId);
    },
});
</script>

<style scoped>
@import "@/style/layout/details-view.css";

.card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--theme-border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--elevation-1);
}

.organization-settings-panel-content {
    padding: var(--space-24);
}

.organization-settings-danger-panel {
    margin: 0;
}

.organization-settings-state-message {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
}

.organization-settings-deletion-meta {
    display: grid;
    gap: var(--space-12);
    margin: 0 0 var(--space-16);
}

.organization-settings-deletion-meta dt {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
}

.organization-settings-deletion-meta dd {
    margin: var(--space-4) 0 0;
    font-size: 14px;
    color: var(--color-text-primary);
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}

@media (max-width: 640px) {
    .organization-settings-panel-content {
        padding: var(--space-16);
    }
}
</style>
