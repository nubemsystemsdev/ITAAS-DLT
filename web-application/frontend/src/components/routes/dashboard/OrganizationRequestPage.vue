<template>
    <div class="page-content organization-request-page" tabindex="-1">
        <DashboardPageHeader :eyebrow="$t('Organization')" :title="pageTitle" :subtitle="pageSubtitle" />

        <section v-if="loading" class="organization-request-loading dashboard-section-card" aria-live="polite">
            <p>{{ $t("Loading") }}...</p>
        </section>

        <section v-else-if="viewMode === 'status' && currentRequest" class="organization-request-layout">
            <article class="dashboard-section-card organization-request-status-card">
                <header class="organization-request-status-header">
                    <div class="organization-request-status-heading">
                        <h2 class="details-view-panel-title">{{ $t("Request status") }}</h2>
                        <span :class="statusBadgeClass(currentRequest.status, orgRequestStatusToneMap)" role="status">
                            {{ statusLabel(currentRequest.status) }}
                        </span>
                    </div>
                    <p class="organization-request-status-message">{{ statusMessage }}</p>
                </header>

                <dl class="details-view-list">
                    <div class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("Company name") }}</dt>
                        <dd class="details-view-value">{{ currentRequest.companyName }}</dd>
                    </div>
                    <div class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("CIF/NIF") }}</dt>
                        <dd class="details-view-value">{{ currentRequest.cifNif }}</dd>
                    </div>
                    <div class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("Country") }}</dt>
                        <dd class="details-view-value">{{ currentRequest.country }}</dd>
                    </div>
                    <div class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("Fiscal address") }}</dt>
                        <dd class="details-view-value">{{ currentRequest.fiscalAddress }}</dd>
                    </div>
                    <div class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("Requested") }}</dt>
                        <dd class="details-view-value">{{ formatDate(currentRequest.requestedAt) }}</dd>
                    </div>
                    <div v-if="currentRequest.resolvedAt > 0" class="details-view-list-item">
                        <dt class="details-view-label">{{ $t("Resolved") }}</dt>
                        <dd class="details-view-value">{{ formatDate(currentRequest.resolvedAt) }}</dd>
                    </div>
                </dl>

                <div v-if="canSubmitNewRequest || canCancelRequest" class="details-view-edit-actions">
                    <button v-if="canCancelRequest" type="button" class="btn btn-danger" :disabled="cancelling" @click="askCancelRequest">
                        <i v-if="cancelling" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                        <i v-else class="fas fa-times" aria-hidden="true"></i>
                        {{ cancelling ? $t("Cancelling request...") : $t("Cancel request") }}
                    </button>
                    <button v-if="canSubmitNewRequest" type="button" class="btn btn-primary" @click="showRequestForm">
                        {{ $t("Submit new request") }}
                    </button>
                </div>
            </article>

            <aside class="dashboard-section-card" :aria-label="$t('What happens next')">
                <p class="organization-request-aside-title">{{ $t("What happens next") }}</p>
                <ul class="organization-request-checklist">
                    <li v-if="isPendingStatus">{{ $t("Our team reviews legal and tax data before approval.") }}</li>
                    <li v-if="isPendingStatus">{{ $t("You will receive a notification when the status changes.") }}</li>
                    <li v-if="isPendingStatus">{{ $t("You can cancel the request while it is pending review.") }}</li>
                    <li v-if="isApprovedStatus">{{ $t("After approval, your organization profile is activated.") }}</li>
                    <li v-if="isRejectedStatus">{{ $t("You can submit a new request with updated company details.") }}</li>
                </ul>
            </aside>
        </section>

        <section v-else class="organization-request-layout organization-request-form-layout">
            <article class="dashboard-section-card">
                <header class="details-view-edit-header">
                    <h2 class="details-view-panel-title">{{ $t("Company data") }}</h2>
                    <p class="details-view-edit-description">
                        {{ $t("Complete this form to start your organization onboarding process.") }}
                    </p>
                </header>

                <p class="organization-request-hint">
                    <i class="fas fa-circle-info" aria-hidden="true"></i>
                    {{ $t("Review the information before sending. You can only keep one request pending at a time.") }}
                </p>

                <form class="details-view-edit-form" @submit.prevent="submitRequest">
                    <div class="details-view-edit-field">
                        <label class="details-view-label" for="org-request-company-name">{{ $t("Company name") }}</label>
                        <input
                            id="org-request-company-name"
                            v-model.trim="form.companyName"
                            class="form-control form-control-full-width"
                            type="text"
                            maxlength="120"
                            autocomplete="organization"
                            :placeholder="$t('Company name placeholder example')"
                            :disabled="submitting"
                            :aria-invalid="companyNameError ? 'true' : undefined"
                            :aria-describedby="companyNameError ? 'org-request-company-name-error' : undefined"
                            required
                            @input="clearFieldError('companyName')"
                        />
                        <div v-if="companyNameError" id="org-request-company-name-error" class="form-error" role="alert">
                            {{ companyNameError }}
                        </div>
                    </div>

                    <div class="details-view-edit-field">
                        <label class="details-view-label" for="org-request-cif-nif">{{ $t("CIF/NIF") }}</label>
                        <input
                            id="org-request-cif-nif"
                            v-model.trim="form.cifNif"
                            class="form-control form-control-full-width"
                            type="text"
                            maxlength="30"
                            autocomplete="off"
                            :placeholder="$t('CIF/NIF placeholder example')"
                            :disabled="submitting"
                            :aria-invalid="cifNifError ? 'true' : undefined"
                            :aria-describedby="cifNifError ? 'org-request-cif-nif-error' : undefined"
                            required
                            @input="clearFieldError('cifNif')"
                        />
                        <div v-if="cifNifError" id="org-request-cif-nif-error" class="form-error" role="alert">
                            {{ cifNifError }}
                        </div>
                    </div>

                    <div class="details-view-edit-field">
                        <label class="details-view-label" for="org-request-country">{{ $t("Country") }}</label>
                        <input
                            id="org-request-country"
                            v-model.trim="form.country"
                            class="form-control form-control-full-width"
                            type="text"
                            maxlength="80"
                            autocomplete="country-name"
                            :placeholder="$t('Country placeholder example')"
                            :disabled="submitting"
                            :aria-invalid="countryError ? 'true' : undefined"
                            :aria-describedby="countryError ? 'org-request-country-error' : undefined"
                            required
                            @input="clearFieldError('country')"
                        />
                        <div v-if="countryError" id="org-request-country-error" class="form-error" role="alert">
                            {{ countryError }}
                        </div>
                    </div>

                    <div class="details-view-edit-field">
                        <label class="details-view-label" for="org-request-fiscal-address">{{ $t("Fiscal address") }}</label>
                        <textarea
                            id="org-request-fiscal-address"
                            v-model.trim="form.fiscalAddress"
                            class="form-control form-control-full-width form-textarea"
                            rows="3"
                            maxlength="240"
                            autocomplete="street-address"
                            :placeholder="$t('Fiscal address placeholder example')"
                            :disabled="submitting"
                            :aria-invalid="fiscalAddressError ? 'true' : undefined"
                            :aria-describedby="fiscalAddressError ? 'org-request-fiscal-address-error' : undefined"
                            required
                            @input="clearFieldError('fiscalAddress')"
                        ></textarea>
                        <div v-if="fiscalAddressError" id="org-request-fiscal-address-error" class="form-error" role="alert">
                            {{ fiscalAddressError }}
                        </div>
                    </div>

                    <div class="details-view-edit-actions">
                        <button
                            v-if="currentRequest && isRejectedStatus"
                            type="button"
                            class="btn btn-secondary"
                            :disabled="submitting"
                            @click="viewMode = 'status'"
                        >
                            {{ $t("Back to request status") }}
                        </button>
                        <button type="submit" class="btn btn-primary" :disabled="submitting">
                            <i v-if="submitting" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                            <i v-else class="fas fa-paper-plane" aria-hidden="true"></i>
                            {{ submitting ? $t("Sending request...") : $t("Send request") }}
                        </button>
                    </div>
                </form>
            </article>

            <aside class="dashboard-section-card" :aria-label="$t('Onboarding details')">
                <p class="organization-request-aside-title">{{ $t("Before sending") }}</p>
                <ul class="organization-request-checklist">
                    <li>{{ $t("Use your official registered company name.") }}</li>
                    <li>{{ $t("Make sure CIF/NIF matches your fiscal documents.") }}</li>
                    <li>{{ $t("Indicate the country as it appears on your fiscal documentation.") }}</li>
                    <li>{{ $t("Include the complete fiscal address (street, postal code, city).") }}</li>
                </ul>
                <p class="organization-request-aside-title">{{ $t("What happens next") }}</p>
                <ul class="organization-request-checklist">
                    <li>{{ $t("Our team reviews legal and tax data before approval.") }}</li>
                    <li>{{ $t("You will receive a notification when the status changes.") }}</li>
                    <li>{{ $t("After approval, your organization profile is activated.") }}</li>
                </ul>
            </aside>
        </section>
    </div>
</template>

<script lang="ts">
import { ApiOrganizations } from "@/api/api-group-organizations";
import { OrgRequestCreateBody, OrgRequestItem } from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import { hasOrganizationAdminAccess, shouldShowOrganizationRequestEntry } from "@/control/organization-admin-access";
import { OrganizationController } from "@/control/organization";
import { ORG_REQUEST_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { renderDate } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

type OrgRequestForm = {
    companyName: string;
    cifNif: string;
    country: string;
    fiscalAddress: string;
};

type OrgRequestField = keyof OrgRequestForm;

type ViewMode = "form" | "status";

const EMPTY_FORM: OrgRequestForm = {
    companyName: "",
    cifNif: "",
    country: "",
    fiscalAddress: "",
};

const PENDING_STATUS = "Pending";
const APPROVED_STATUS = "Approved";
const REJECTED_STATUS = "Rejected";

export default defineComponent({
    name: "OrganizationRequestPage",
    components: {
        DashboardPageHeader,
    },
    setup: function () {
        return {
            cancelRequestId: getUniqueStringId(),
            createRequestId: getUniqueStringId(),
            loadRequestId: getUniqueStringId(),
            orgRequestStatusToneMap: ORG_REQUEST_STATUS_TONE_MAP,
            statusBadgeClass,
        };
    },
    data: function () {
        return {
            loading: true,
            submitting: false,
            cancelling: false,
            viewMode: "form" as ViewMode,
            currentRequest: null as OrgRequestItem | null,
            form: { ...EMPTY_FORM } as OrgRequestForm,
            companyNameError: "",
            cifNifError: "",
            countryError: "",
            fiscalAddressError: "",
        };
    },
    computed: {
        pageTitle: function (): string {
            if (this.viewMode === "status" && this.currentRequest) {
                return this.$t("Your organization request");
            }
            return this.$t("Request organization");
        },
        pageSubtitle: function (): string {
            if (this.viewMode === "status" && this.currentRequest) {
                return this.$t("Track the status of your organization onboarding request.");
            }
            return this.$t("Submit your company details for platform admin approval.");
        },
        isPendingStatus: function (): boolean {
            return (this.currentRequest?.status || "") === PENDING_STATUS;
        },
        isApprovedStatus: function (): boolean {
            return (this.currentRequest?.status || "") === APPROVED_STATUS;
        },
        isRejectedStatus: function (): boolean {
            return (this.currentRequest?.status || "") === REJECTED_STATUS;
        },
        canSubmitNewRequest: function (): boolean {
            return this.isRejectedStatus;
        },
        canCancelRequest: function (): boolean {
            return this.isPendingStatus;
        },
        statusMessage: function (): string {
            if (this.isPendingStatus) {
                return this.$t("Your organization request is pending review.");
            }
            if (this.isApprovedStatus) {
                return this.$t("Your organization request has been approved.");
            }
            if (this.isRejectedStatus) {
                return this.$t("Your organization request has been rejected.");
            }
            return "";
        },
    },
    methods: {
        canAccessAsUser: function (): boolean {
            return shouldShowOrganizationRequestEntry();
        },
        redirectAwayFromRequestPage: function (): void {
            const target = hasOrganizationAdminAccess() ? "org-configuration" : "dashboard";
            void this.$router.replace({ name: target });
        },
        handleApprovedRequestContext: function (): void {
            void OrganizationController.Refresh().then(() => {
                if (OrganizationController.hasOrganization()) {
                    this.redirectAwayFromRequestPage();
                }
            });
        },
        formatDate: function (ts: number): string {
            return renderDate(ts, this.$t);
        },
        statusLabel: function (status: string): string {
            if (status === PENDING_STATUS) {
                return this.$t("Pending");
            }
            if (status === APPROVED_STATUS) {
                return this.$t("Approved");
            }
            if (status === REJECTED_STATUS) {
                return this.$t("Rejected");
            }
            return status;
        },
        applyRequestView: function (request: OrgRequestItem | null): void {
            this.currentRequest = request;
            if (!request) {
                this.viewMode = "form";
                return;
            }
            if (request.status === REJECTED_STATUS) {
                this.viewMode = "status";
                return;
            }
            this.viewMode = "status";
        },
        loadMyRequest: function (): void {
            Request.Abort(this.loadRequestId);
            this.loading = true;

            Request.Pending(this.loadRequestId, ApiOrganizations.GetMyOrganizationRequest())
                .onSuccess((request) => {
                    this.loading = false;
                    this.applyRequestView(request);
                    if ((request.status || "") === APPROVED_STATUS) {
                        this.handleApprovedRequestContext();
                    }
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFoundOrganizationRequestNotFound: () => {
                            this.loading = false;
                            this.applyRequestView(null);
                        },
                        notFound: () => {
                            this.loading = false;
                            this.applyRequestView(null);
                        },
                        temporalError: () => {
                            this.loading = false;
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },
        showRequestForm: function (): void {
            this.form = { ...EMPTY_FORM };
            this.clearFieldErrors();
            this.viewMode = "form";
        },
        clearFieldErrors: function (): void {
            this.companyNameError = "";
            this.cifNifError = "";
            this.countryError = "";
            this.fiscalAddressError = "";
        },
        clearFieldError: function (field: OrgRequestField): void {
            if (field === "companyName") {
                this.companyNameError = "";
            } else if (field === "cifNif") {
                this.cifNifError = "";
            } else if (field === "country") {
                this.countryError = "";
            } else if (field === "fiscalAddress") {
                this.fiscalAddressError = "";
            }
        },
        buildPayload: function (): OrgRequestCreateBody {
            return {
                companyName: (this.form.companyName || "").trim(),
                cifNif: (this.form.cifNif || "").trim(),
                country: (this.form.country || "").trim(),
                fiscalAddress: (this.form.fiscalAddress || "").trim(),
            };
        },
        validateForm: function (): boolean {
            this.clearFieldErrors();
            const payload = this.buildPayload();
            const requiredMessage = this.$t("Please complete all required fields.");
            let valid = true;

            if (!payload.companyName) {
                this.companyNameError = requiredMessage;
                valid = false;
            }
            if (!payload.cifNif) {
                this.cifNifError = requiredMessage;
                valid = false;
            }
            if (!payload.country) {
                this.countryError = requiredMessage;
                valid = false;
            }
            if (!payload.fiscalAddress) {
                this.fiscalAddressError = requiredMessage;
                valid = false;
            }

            return valid;
        },
        focusFirstInvalidField: function (): void {
            if (this.companyNameError) {
                document.getElementById("org-request-company-name")?.focus();
            } else if (this.cifNifError) {
                document.getElementById("org-request-cif-nif")?.focus();
            } else if (this.countryError) {
                document.getElementById("org-request-country")?.focus();
            } else if (this.fiscalAddressError) {
                document.getElementById("org-request-fiscal-address")?.focus();
            }
        },
        askCancelRequest: function (): void {
            this.$askUserConfirmation({
                title: this.$t("Cancel organization request"),
                message: this.$t("This action will permanently delete your pending organization request."),
                danger: true,
                callback: () => this.cancelRequest(),
            });
        },
        cancelRequest: function (): void {
            Request.Abort(this.cancelRequestId);
            this.cancelling = true;

            Request.Pending(this.cancelRequestId, ApiOrganizations.CancelMyOrganizationRequest())
                .onSuccess(() => {
                    this.cancelling = false;
                    this.$showSnackBar(this.$t("Your organization request has been cancelled."));
                    this.applyRequestView(null);
                })
                .onRequestError((err, handleErr) => {
                    this.cancelling = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestRequestNotPending: () =>
                            this.$showMessageModal(
                                this.$t("Invalid request"),
                                this.$t("Only a pending organization request can be cancelled."),
                            ),
                        badRequest: () =>
                            this.$showMessageModal(
                                this.$t("Invalid request"),
                                this.$t("Only a pending organization request can be cancelled."),
                            ),
                        notFoundOrganizationRequestNotFound: () => {
                            this.applyRequestView(null);
                        },
                        notFound: () => {
                            this.applyRequestView(null);
                        },
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.cancelling = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },
        submitRequest: function () {
            if (!this.validateForm()) {
                this.focusFirstInvalidField();
                return;
            }

            const payload = this.buildPayload();
            Request.Abort(this.createRequestId);
            this.submitting = true;
            this.clearFieldErrors();

            Request.Pending(this.createRequestId, ApiOrganizations.CreateOrganizationRequest(payload))
                .onSuccess(() => {
                    this.submitting = false;
                    this.form = { ...EMPTY_FORM };
                    this.clearFieldErrors();
                    this.$showSnackBar(this.$t("Your organization request has been submitted."));
                    this.loadMyRequest();
                })
                .onRequestError((err, handleErr) => {
                    this.submitting = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestPendingRequestAlreadyExists: () => {
                            this.loadMyRequest();
                        },
                        badRequestCifNifAlreadyExists: () => {
                            this.cifNifError = this.$t("CIF/NIF already belongs to an existing organization.");
                            document.getElementById("org-request-cif-nif")?.focus();
                        },
                        badRequestAdminAlreadyHasOrganization: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("You already belong to an organization.")),
                        badRequestInvalidCompanyName: () => {
                            this.companyNameError = this.$t("Company name is invalid.");
                            document.getElementById("org-request-company-name")?.focus();
                        },
                        badRequestInvalidCifNif: () => {
                            this.cifNifError = this.$t("CIF/NIF format is invalid.");
                            document.getElementById("org-request-cif-nif")?.focus();
                        },
                        badRequestInvalidCountry: () => {
                            this.countryError = this.$t("Country is invalid.");
                            document.getElementById("org-request-country")?.focus();
                        },
                        badRequestInvalidFiscalAddress: () => {
                            this.fiscalAddressError = this.$t("Fiscal address is invalid.");
                            document.getElementById("org-request-fiscal-address")?.focus();
                        },
                        badRequest: () => {
                            this.companyNameError = this.$t("Please review the form fields and try again.");
                            document.getElementById("org-request-company-name")?.focus();
                        },
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.submitting = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unexpected error"));
                });
        },
    },
    mounted: async function () {
        await OrganizationController.Refresh();

        if (!this.canAccessAsUser()) {
            this.redirectAwayFromRequestPage();
            return;
        }

        this.$setSubTitle(this.$t("Request organization"));
        this.loadMyRequest();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Request.Abort(this.cancelRequestId);
        Request.Abort(this.createRequestId);
        Request.Abort(this.loadRequestId);
    },
});
</script>

<style scoped>
.organization-request-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: var(--space-24);
    align-items: start;
}

.organization-request-loading {
    padding: var(--space-24);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

.organization-request-status-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
}

.organization-request-status-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
}

.organization-request-status-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-12);
}

.organization-request-status-message {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

.organization-request-hint {
    margin: 0 0 var(--space-16);
    padding: var(--space-12);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
}

.organization-request-aside-title {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.organization-request-checklist {
    margin: 0;
    padding-left: var(--space-24);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

.organization-request-checklist + .organization-request-aside-title {
    margin-top: var(--space-24);
}

@media (max-width: 1024px) {
    .organization-request-layout {
        grid-template-columns: minmax(0, 1fr);
    }

    .organization-request-form-layout > aside {
        order: -1;
    }
}

@media (max-width: 640px) {
    .organization-request-layout {
        gap: var(--space-16);
    }
}
</style>
