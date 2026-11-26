<template>
    <div class="page-content organization-billing-page" tabindex="-1">
        <div class="organization-billing-top">
            <DashboardPageHeader
                :eyebrow="$t('Organization')"
                :title="$t('Billing')"
                :subtitle="$t('Payments and renewals for the organization.')"
            />
            <button
                type="button"
                class="btn btn-primary organization-billing-download-all"
                :disabled="loading || exportingAll || paymentRows.length === 0"
                :aria-label="$t('Download all')"
                @click="downloadAllInvoices"
            >
                <i class="fas fa-file-arrow-down" aria-hidden="true"></i>
                <span>{{ $t("Download all") }}</span>
            </button>
        </div>

        <p v-if="loading" class="organization-billing-state">{{ $t("Loading") }}...</p>
        <p v-else-if="errorMessage" class="organization-billing-state">{{ $t(errorMessage) }}</p>

        <template v-else>
            <section class="dashboard-section-card organization-billing-card" :aria-label="$t('Payment history')">
                <div class="organization-billing-toolbar">
                    <TableCardToolbar :tabs="[]" v-model:filters-collapsed="filtersCollapsed" show-filters-toggle>
                        <template #filters>
                            <label class="toolbar-plan-filter" for="org-billing-date-from">
                                <span class="toolbar-plan-label">{{ $t("From") }}</span>
                                <input
                                    id="org-billing-date-from"
                                    v-model="draftDateFrom"
                                    :max="draftDateTo || undefined"
                                    type="date"
                                    class="toolbar-plan-select"
                                />
                            </label>

                            <label class="toolbar-plan-filter" for="org-billing-date-to">
                                <span class="toolbar-plan-label">{{ $t("To") }}</span>
                                <input
                                    id="org-billing-date-to"
                                    v-model="draftDateTo"
                                    :min="draftDateFrom || undefined"
                                    type="date"
                                    class="toolbar-plan-select"
                                />
                            </label>

                            <label class="toolbar-plan-filter" for="org-billing-payment-type">
                                <span class="toolbar-plan-label">{{ $t("Payment type") }}</span>
                                <select id="org-billing-payment-type" v-model="draftPaymentType" class="toolbar-plan-select">
                                    <option value="all">{{ $t("All") }}</option>
                                    <option v-for="type in availablePaymentTypes" :key="type" :value="type">
                                        {{ translateFilterPaymentType(type) }}
                                    </option>
                                </select>
                            </label>

                            <label class="toolbar-plan-filter" for="org-billing-product-type">
                                <span class="toolbar-plan-label">{{ $t("Product type") }}</span>
                                <select id="org-billing-product-type" v-model="draftProductType" class="toolbar-plan-select">
                                    <option value="all">{{ $t("All") }}</option>
                                    <option value="item">{{ $t("Item") }}</option>
                                    <option value="plan">{{ $t("Plan") }}</option>
                                </select>
                            </label>

                            <label class="toolbar-plan-filter" for="org-billing-status">
                                <span class="toolbar-plan-label">{{ $t("Status") }}</span>
                                <select id="org-billing-status" v-model="draftStatus" class="toolbar-plan-select">
                                    <option value="all">{{ $t("All") }}</option>
                                    <option v-for="status in availableStatuses" :key="status" :value="status">
                                        {{ translateFilterPaymentStatus(status) }}
                                    </option>
                                </select>
                            </label>

                            <button
                                type="button"
                                class="btn btn-primary toolbar-action-btn toolbar-apply-btn"
                                :disabled="paymentsLoading"
                                @click="onApplyFilters"
                            >
                                <i class="fas fa-check" aria-hidden="true"></i>
                                {{ $t("Apply filters") }}
                            </button>

                            <button
                                type="button"
                                class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn"
                                :disabled="paymentsLoading"
                                @click="clearFilters"
                            >
                                <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                                {{ $t("Clear filters") }}
                            </button>
                        </template>
                    </TableCardToolbar>
                </div>

                <div class="table-responsive payment-history-table-wrapper">
                    <table
                        class="table table-wide table-stack table-stack--single-col-mobile payment-history-table organization-billing-table"
                    >
                        <colgroup>
                            <col class="org-billing-col-concept" />
                            <col class="org-billing-col-name" />
                            <col class="org-billing-col-date" />
                            <col class="org-billing-col-payment" />
                            <col class="org-billing-col-amount" />
                            <col class="org-billing-col-status" />
                            <col class="org-billing-col-actions" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">{{ $t("Concept") }}</th>
                                <th scope="col">{{ $t("Name") }}</th>
                                <th scope="col">{{ $t("Date") }}</th>
                                <th scope="col">{{ $t("Payment") }}</th>
                                <th scope="col" class="text-right">{{ $t("Amount") }}</th>
                                <th scope="col">{{ $t("Status") }}</th>
                                <th scope="col" class="text-center">{{ $t("Actions") }}</th>
                            </tr>
                        </thead>
                        <tbody v-if="paymentsLoading">
                            <tr>
                                <td colspan="7" class="table-feedback">{{ $t("Loading") }}...</td>
                            </tr>
                        </tbody>
                        <tbody v-else-if="paymentRows.length === 0">
                            <tr>
                                <td colspan="7" class="table-feedback">{{ $t("No payments found") }}</td>
                            </tr>
                        </tbody>
                        <tbody v-else>
                            <tr v-for="row in paymentRows" :key="row.id">
                                <td :data-label="$t('Concept')" class="table-stack-row-primary">
                                    <p class="payment-cell-concept" :title="row.concept">{{ row.concept }}</p>
                                </td>
                                <td :data-label="$t('Name')">
                                    <p class="payment-cell-name" :title="row.nameLabel">{{ row.nameLabel }}</p>
                                </td>
                                <td :data-label="$t('Date')" class="payment-cell-nowrap">{{ row.dateLabel }}</td>
                                <td :data-label="$t('Payment')">
                                    <a
                                        class="link-deco cursor-pointer"
                                        :title="row.payment"
                                        :aria-label="row.payment"
                                        @click="viewPayment(row.id)"
                                    >
                                        {{ row.payment }}
                                    </a>
                                </td>
                                <td :data-label="$t('Amount')" class="text-left payment-cell-amount">{{ row.amountLabel }}</td>
                                <td :data-label="$t('Status')" class="payment-cell-nowrap">
                                    <span :class="statusBadgeClass(row.statusVariant, paymentStatusToneMap)" role="status">
                                        {{ row.statusLabel }}
                                    </span>
                                </td>
                                <td :data-label="$t('Actions')" class="actions-cell text-center td-shrink">
                                    <div class="dashboard-actions-inline payment-actions-inline">
                                        <TooltipPortal :content="$t('Download payment')">
                                            <button
                                                type="button"
                                                class="btn btn-primary payment-action-btn"
                                                :disabled="isGeneratedButtonDisabled(row.id)"
                                                :aria-label="
                                                    isGeneratedDownloadLoading(row.id) ? `${$t('Downloading')}...` : $t('Download payment')
                                                "
                                                @click="downloadGeneratedInvoice(row.id)"
                                            >
                                                <i
                                                    :class="
                                                        isGeneratedDownloadLoading(row.id)
                                                            ? 'fas fa-spinner fa-invoice'
                                                            : 'fa-solid fa-file-invoice'
                                                    "
                                                    aria-hidden="true"
                                                ></i>
                                            </button>
                                        </TooltipPortal>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <PaginationBar
                    :page="page"
                    :total-pages="totalPages"
                    :can-go-prev="canGoPrev"
                    :can-go-next="canGoNext"
                    :visible="!paymentsLoading && visible"
                    :aria-label="$t('Payment history pagination')"
                    @prev="onPaginationPrev"
                    @next="onPaginationNext"
                />
            </section>
        </template>

        <PaymentDetailModal v-if="displayPaymentDetailModal" v-model:display="displayPaymentDetailModal" :payment="paymentDetailView" />
    </div>
</template>

<script lang="ts">
import { ApiOrganizations, ListOrganizationPaymentsQueryParameters } from "@/api/api-group-organizations";
import { ApiPayments } from "@/api/api-group-payments";
import { OrgPaymentItem, OrgPaymentsListResponse } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import PaymentDetailModal, { type PaymentDetailView } from "@/components/modals/PaymentDetailModal.vue";
import TooltipPortal from "@/components/ui/TooltipPortal.vue";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import type { PaymentHistoryFiltersState, ProductTypeFilter } from "@/composables/usePaymentHistory";
import { usePagination } from "@/composables/usePagination";
import { LIST_PAGE_SIZE } from "@/constants/ui";
import { OrganizationController } from "@/control/organization";
import { ensureSubscribableLookup, resolveSubscribableDisplay } from "@/services/subscribable-lookup";
import { formatMoneyFromCents } from "@/utils/format-currency";
import {
    BACKEND_PAYMENT_TYPES,
    isSuccessfulPaymentStatus,
    PAYMENT_HISTORY_FILTER_STATUSES,
    paymentHistoryFilterStatusLabelKey,
    paymentTypeLabelKey,
    resolvePaymentHistoryApiStatus,
} from "@/utils/payment-history-domain";
import { PAYMENT_STATUS_TONE_MAP, statusBadgeClass, type StatusBadgeTone } from "@/utils/status-badge";
import { toTitleCase } from "@/utils/text";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";

const ORG_PAYMENTS_PAGE_SIZE = LIST_PAGE_SIZE;
const ORG_PAYMENTS_UNAUTHORIZED = "unauthorized";

type OrgPaymentRecord = OrgPaymentItem & {
    subscribableId?: string;
    subscribableType?: string;
    provider?: string;
    providerSessionId?: string;
    stripePaymentIntentId?: string;
};

type PaymentRow = {
    id: string;
    payment: string;
    dateLabel: string;
    concept: string;
    nameLabel: string;
    amountLabel: string;
    statusLabel: string;
    statusVariant: StatusBadgeTone;
};

type PaymentsListQuery = ListOrganizationPaymentsQueryParameters & {
    page?: string;
    pageSize?: string;
};

function getStatusVariant(status: string, type: string): StatusBadgeTone {
    const statusKey = (status || "").toLowerCase();
    const typeKey = (type || "").toLowerCase();
    if (typeKey.includes("refund") || statusKey.includes("refund")) {
        return "muted";
    }
    if (isSuccessfulPaymentStatus(status)) {
        return "success";
    }
    if (statusKey.includes("fail") || statusKey.includes("cancel")) {
        return "error";
    }
    if (statusKey.includes("pending")) {
        return "warning";
    }
    return "muted";
}

function formatPaymentReference(paymentId: string, createdAt: number): string {
    const date = new Date(createdAt || 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const suffix = (paymentId || "").replace(/\D/g, "").slice(-4).padStart(4, "0") || "0000";
    return `${year}-${month}-${suffix}`;
}

function formatShortDate(timestamp: number, locale: string): string {
    if (!timestamp) {
        return "—";
    }
    return new Date(timestamp).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function resolveStripePaymentId(payment: OrgPaymentRecord): string | undefined {
    const candidates = [payment.stripePaymentIntentId, payment.providerSessionId];
    return candidates.map((candidate) => (candidate || "").trim()).find((candidate) => /^(pi_|cs_)/.test(candidate));
}

function createDefaultFilters(): PaymentHistoryFiltersState {
    return {
        dateFrom: "",
        dateTo: "",
        paymentType: "all",
        productType: "all",
        status: "all",
    };
}

function normalizeDateStart(dateValue: string): number | null {
    if (!dateValue) {
        return null;
    }

    const value = Date.parse(`${dateValue}T00:00:00.000`);
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.floor(value);
}

function normalizeDateEnd(dateValue: string): number | null {
    if (!dateValue) {
        return null;
    }

    const value = Date.parse(`${dateValue}T23:59:59.999`);
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.floor(value);
}

function buildPaymentsQuery(page: number, pageSize: number, filters: PaymentHistoryFiltersState, apiStatus?: string): PaymentsListQuery {
    const query: PaymentsListQuery = {
        page: String(page),
        pageSize: String(pageSize),
    };

    const dateFrom = normalizeDateStart(filters.dateFrom);
    if (dateFrom !== null) {
        query.dateFrom = String(dateFrom);
    }

    const dateTo = normalizeDateEnd(filters.dateTo);
    if (dateTo !== null) {
        query.dateTo = String(dateTo);
    }

    if (filters.paymentType !== "all") {
        query.paymentType = filters.paymentType;
    }

    if (filters.productType !== "all") {
        query.productType = filters.productType;
    }

    const status = apiStatus ?? resolvePaymentHistoryApiStatus(filters.status);
    if (status) {
        query.status = status;
    }

    return query;
}

export default defineComponent({
    name: "OrganizationBillingPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbar,
        PaymentDetailModal,
        TooltipPortal,
    },
    setup() {
        const { filtersCollapsed } = useCollapsibleFilters(true);
        const loading = ref(true);
        const paymentsLoading = ref(false);
        const exportingAll = ref(false);
        const errorMessage = ref("");
        const organizationId = ref("");
        const organizationName = ref("");
        const payments = ref<OrgPaymentRecord[]>([]);
        const displayPaymentDetailModal = ref(false);
        const paymentDetailView = ref<PaymentDetailView | null>(null);
        const generatedDownloadLoadingByPaymentId = ref<Record<string, boolean>>({});

        const pagination = usePagination({
            pageSize: ORG_PAYMENTS_PAGE_SIZE,
            loading: paymentsLoading,
        });

        return {
            filtersCollapsed,
            availablePaymentTypes: [...BACKEND_PAYMENT_TYPES],
            availableStatuses: [...PAYMENT_HISTORY_FILTER_STATUSES],
            loading,
            paymentsLoading,
            exportingAll,
            errorMessage,
            organizationId,
            organizationName,
            payments,
            displayPaymentDetailModal,
            paymentDetailView,
            generatedDownloadLoadingByPaymentId,
            paymentStatusToneMap: PAYMENT_STATUS_TONE_MAP,
            statusBadgeClass,
            page: pagination.page,
            totalPages: pagination.totalPages,
            visible: pagination.visible,
            canGoPrev: pagination.canGoPrev,
            canGoNext: pagination.canGoNext,
            applyListMeta: pagination.applyListMeta,
            goPrev: pagination.goPrev,
            goNext: pagination.goNext,
            setPage: pagination.setPage,
            reset: pagination.reset,
            dataRequestId: getUniqueStringId(),
            paymentsRequestId: getUniqueStringId(),
        };
    },
    computed: {
        paymentRows: function (): PaymentRow[] {
            return (this.payments || []).map((payment) => {
                const statusVariant = getStatusVariant(payment.status, payment.type);
                return {
                    id: payment.id,
                    payment: formatPaymentReference(payment.id, payment.createdAt),
                    dateLabel: formatShortDate(payment.createdAt, this.getIntlLocale()),
                    concept: this.formatPaymentConcept(payment),
                    nameLabel: this.formatPaymentName(payment),
                    amountLabel: formatMoneyFromCents(payment.amountCents || 0, payment.currency || "EUR"),
                    statusLabel: this.formatPaymentStatus(payment.status),
                    statusVariant,
                };
            });
        },
    },
    data: function () {
        return {
            subscribableLookup: null as Map<string, import("@/services/subscribable-lookup").SubscribableLookupEntry> | null,
            paymentsRequestSequence: 0,
            filters: createDefaultFilters(),
            draftDateFrom: "",
            draftDateTo: "",
            draftPaymentType: "all",
            draftProductType: "all",
            draftStatus: "all",
        };
    },
    methods: {
        getIntlLocale: function (): string {
            const locale = String(this.$locale?.value || "")
                .trim()
                .toLowerCase();
            if (locale.startsWith("es")) {
                return "es-ES";
            }
            return "en-US";
        },
        formatPaymentStatus: function (status: string): string {
            const normalized = (status || "").toLowerCase();
            if (isSuccessfulPaymentStatus(status)) {
                return String(this.$t("Paid"));
            }
            const labelKey = paymentHistoryFilterStatusLabelKey(normalized);
            return labelKey ? String(this.$t(labelKey)) : toTitleCase(status || "—");
        },
        translatePaymentType: function (type: string): string {
            const key = paymentTypeLabelKey(type);
            if (key) {
                return String(this.$t(key));
            }
            return toTitleCase(type);
        },
        translateFilterPaymentType: function (type: string): string {
            return this.translatePaymentType(type);
        },
        translateFilterPaymentStatus: function (status: string): string {
            const key = paymentHistoryFilterStatusLabelKey(status);
            return key ? String(this.$t(key)) : toTitleCase(status);
        },
        buildDraftFiltersPayload: function (): PaymentHistoryFiltersState {
            return {
                dateFrom: this.draftDateFrom,
                dateTo: this.draftDateTo,
                paymentType: this.draftPaymentType,
                productType: this.draftProductType as ProductTypeFilter,
                status: this.draftStatus,
            };
        },
        onApplyFilters: function (): void {
            const nextFilters = this.buildDraftFiltersPayload();
            Object.assign(this.filters, nextFilters);
            this.setPage(1);
            this.loadPaymentsPage(nextFilters);
        },
        clearFilters: function (): void {
            const defaultFilters = createDefaultFilters();
            this.draftDateFrom = defaultFilters.dateFrom;
            this.draftDateTo = defaultFilters.dateTo;
            this.draftPaymentType = defaultFilters.paymentType;
            this.draftProductType = defaultFilters.productType;
            this.draftStatus = defaultFilters.status;
            Object.assign(this.filters, defaultFilters);
            this.setPage(1);
            this.loadPaymentsPage(defaultFilters);
        },
        formatPaymentConcept: function (payment: OrgPaymentRecord): string {
            return this.translatePaymentType(payment.type || "");
        },
        formatPaymentName: function (payment: OrgPaymentRecord): string {
            const subscribableId = (payment.subscribableId || payment.agentId || "").trim();
            const subscribableType = (payment.subscribableType || "").trim();
            const billingCycle = (payment.billingCycle || "").trim();

            if (!subscribableId) {
                return "—";
            }

            const lookup = this.subscribableLookup;
            if (!lookup) {
                return "—";
            }

            const display = resolveSubscribableDisplay(lookup, subscribableId, subscribableType, billingCycle);
            const name = (display.name || "").trim();
            return name || "—";
        },
        setPaymentsEmptyState: function (): void {
            this.payments = [];
            this.reset();
            this.paymentsLoading = false;
        },
        abortPaymentsRequests: function (): void {
            Request.Abort(this.paymentsRequestId);
        },
        abortDataRequests: function (): void {
            Request.Abort(this.dataRequestId);
        },
        nextPaymentsRequestSequence: function (): number {
            this.paymentsRequestSequence += 1;
            return this.paymentsRequestSequence;
        },
        isCurrentPaymentsRequest: function (requestSequence: number): boolean {
            return requestSequence === this.paymentsRequestSequence;
        },
        loadBillingPage: function (): void {
            this.loading = true;
            this.errorMessage = "";

            void OrganizationController.ensureReady()
                .then(() => {
                    const org = OrganizationController.MyOrganization;
                    const orgId = org?.id || "";

                    if (!orgId) {
                        this.loading = false;
                        this.errorMessage = "No data available";
                        return;
                    }

                    this.organizationId = orgId;
                    this.organizationName = org?.companyName || String(this.$t("Organization"));
                    this.loading = false;
                    this.reset();
                    this.loadPaymentsPage();
                })
                .catch(() => {
                    this.loading = false;
                    this.errorMessage = "No data available";
                });
        },
        loadPaymentsPage: function (filtersOverride?: PaymentHistoryFiltersState): void {
            if (!this.organizationId) {
                return;
            }

            const activeFilters = filtersOverride || this.filters;
            const requestSequence = this.nextPaymentsRequestSequence();
            const page = Math.max(1, Math.trunc(Number(this.page) || 1));
            this.paymentsLoading = true;
            this.abortPaymentsRequests();

            const query = buildPaymentsQuery(page, ORG_PAYMENTS_PAGE_SIZE, activeFilters);
            Request.Pending(this.paymentsRequestId, ApiOrganizations.ListOrganizationPayments(this.organizationId, query))
                .onSuccess((response) => {
                    if (!this.isCurrentPaymentsRequest(requestSequence)) {
                        return;
                    }

                    this.payments = (response.payments || []) as OrgPaymentRecord[];
                    this.applyListMeta(response);
                    this.paymentsLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentPaymentsRequest(requestSequence)) {
                        return;
                    }

                    handleErr(err, {
                        unauthorized: () => {
                            this.setPaymentsEmptyState();
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.setPaymentsEmptyState();
                        },
                        notFound: () => {
                            this.setPaymentsEmptyState();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.setPaymentsEmptyState();
                        },
                        temporalError: () => {
                            this.setPaymentsEmptyState();
                        },
                    });
                })
                .onUnexpectedError(() => {
                    if (!this.isCurrentPaymentsRequest(requestSequence)) {
                        return;
                    }

                    this.setPaymentsEmptyState();
                });
        },
        fetchOrganizationPaymentsByApiStatus: async function (
            orgId: string,
            apiStatus?: string,
            filtersSnapshot?: PaymentHistoryFiltersState,
        ): Promise<OrgPaymentRecord[]> {
            const pageSize = 256;
            const requestId = apiStatus ? `${this.dataRequestId}-${apiStatus}` : this.dataRequestId;
            const collected: OrgPaymentRecord[] = [];
            const activeFilters = filtersSnapshot || { ...this.filters };

            const loadPage = (page: number): Promise<OrgPaymentsListResponse> =>
                new Promise((resolve, reject) => {
                    Request.Pending(
                        requestId,
                        ApiOrganizations.ListOrganizationPayments(orgId, buildPaymentsQuery(page, pageSize, activeFilters, apiStatus)),
                    )
                        .onSuccess((response) => resolve(response))
                        .onRequestError((err, handleErr) => {
                            handleErr(err, {
                                unauthorized: () => {
                                    this.$requireLogin();
                                    reject(ORG_PAYMENTS_UNAUTHORIZED);
                                },
                                forbidden: () => reject(err),
                                notFound: () => reject(err),
                                notFoundOrganizationNotFound: () => reject(err),
                                temporalError: () => reject(err),
                            });
                        })
                        .onUnexpectedError((err) => reject(err));
                });

            const firstPage = await loadPage(1);
            collected.push(...((firstPage.payments || []) as OrgPaymentRecord[]));

            const pages = firstPage.totalPages || 1;
            for (let nextPage = 2; nextPage <= pages; nextPage += 1) {
                const result = await loadPage(nextPage);
                collected.push(...((result.payments || []) as OrgPaymentRecord[]));
            }

            return collected;
        },
        fetchAllOrganizationPayments: function (orgId: string): Promise<OrgPaymentRecord[]> {
            const filtersSnapshot: PaymentHistoryFiltersState = { ...this.filters };
            return this.fetchOrganizationPaymentsByApiStatus(orgId, undefined, filtersSnapshot);
        },
        onPaginationPrev: function (): void {
            if (!this.goPrev()) {
                return;
            }
            this.loadPaymentsPage();
        },
        onPaginationNext: function (): void {
            if (!this.goNext()) {
                return;
            }
            this.loadPaymentsPage();
        },
        buildPaymentDetailView: function (payment: OrgPaymentRecord): PaymentDetailView {
            const statusVariant = getStatusVariant(payment.status, payment.type);
            return {
                paymentId: payment.id,
                stripeId: resolveStripePaymentId(payment),
                statusDisplay: this.formatPaymentStatus(payment.status),
                statusVariant,
                amount: formatMoneyFromCents(payment.amountCents || 0, payment.currency || "EUR"),
                client: this.organizationName,
                method: this.translatePaymentType(payment.type || "") || "—",
                date: new Date(payment.createdAt || 0).toLocaleString(this.getIntlLocale()),
                reference: (payment.subscribableId || payment.agentId || "").trim() || undefined,
                provider: payment.provider ? toTitleCase(payment.provider) : undefined,
            };
        },
        viewPayment: function (paymentId: string): void {
            const payment = (this.payments || []).find((row) => row.id === paymentId);
            if (!payment) {
                return;
            }
            this.paymentDetailView = this.buildPaymentDetailView(payment);
            this.displayPaymentDetailModal = true;
        },
        isGeneratedDownloadLoading: function (paymentId: string): boolean {
            return !!this.generatedDownloadLoadingByPaymentId[paymentId];
        },
        isGeneratedButtonDisabled: function (paymentId: string): boolean {
            return this.isGeneratedDownloadLoading(paymentId);
        },
        downloadGeneratedInvoice: async function (paymentId: string): Promise<void> {
            if (this.generatedDownloadLoadingByPaymentId[paymentId]) {
                return;
            }

            this.generatedDownloadLoadingByPaymentId[paymentId] = true;

            try {
                const request = ApiPayments.DownloadPaymentInvoice(paymentId);
                const response = await fetch(request.url, {
                    method: request.method,
                    headers: {
                        "x-session-id": AuthController.Session,
                    },
                });

                if (response.status === 401) {
                    this.$requireLogin();
                    return;
                }

                if (response.status === 403) {
                    this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to download this payment."));
                    return;
                }

                if (response.status === 404) {
                    this.$showMessageModal(this.$t("Not found"), this.$t("Payment not found."));
                    return;
                }

                if (!response.ok) {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to download payment."));
                    return;
                }

                const pdfBlob = await response.blob();
                const blobUrl = URL.createObjectURL(pdfBlob);
                const anchor = document.createElement("a");
                anchor.href = blobUrl;
                anchor.download = `payment-${paymentId}.pdf`;
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
            } catch (_error) {
                this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to download payment."));
            } finally {
                this.generatedDownloadLoadingByPaymentId[paymentId] = false;
            }
        },
        downloadAllInvoices: async function (): Promise<void> {
            if (!this.organizationId || this.exportingAll) {
                return;
            }

            this.exportingAll = true;
            try {
                const payments = await this.fetchAllOrganizationPayments(this.organizationId);
                if (!payments.length) {
                    this.$showSnackBar(this.$t("No payments found"));
                    return;
                }

                const lookup = await new Promise<Map<string, import("@/services/subscribable-lookup").SubscribableLookupEntry>>(
                    (resolve) => {
                        ensureSubscribableLookup(
                            (key) => this.$t(key),
                            (map) => resolve(map),
                        );
                    },
                );

                const header = [
                    this.$t("Concept"),
                    this.$t("Name"),
                    this.$t("Date"),
                    this.$t("Payment"),
                    this.$t("Amount"),
                    this.$t("Status"),
                ];
                const rows = payments.map((payment) => {
                    const subscribableId = (payment.subscribableId || payment.agentId || "").trim();
                    const display = lookup
                        ? resolveSubscribableDisplay(
                              lookup,
                              subscribableId,
                              (payment.subscribableType || "").trim(),
                              (payment.billingCycle || "").trim(),
                          )
                        : { name: "", planLabel: "" };
                    const nameLabel = (display.name || "").trim() || "—";
                    return [
                        this.translatePaymentType(payment.type || ""),
                        subscribableId ? nameLabel : "—",
                        formatShortDate(payment.createdAt, this.getIntlLocale()),
                        formatPaymentReference(payment.id, payment.createdAt),
                        formatMoneyFromCents(payment.amountCents || 0, payment.currency || "EUR"),
                        this.formatPaymentStatus(payment.status),
                    ];
                });

                const csvContent = [header, ...rows]
                    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
                    .join("\n");

                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `organization-billing-${this.organizationId}.csv`;
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 0);
            } catch (error) {
                if (error !== ORG_PAYMENTS_UNAUTHORIZED) {
                    this.$showSnackBar(this.$t("Could not export billing history."));
                }
            } finally {
                this.exportingAll = false;
            }
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Billing"));
        ensureSubscribableLookup(
            (key) => this.$t(key),
            (lookup) => {
                this.subscribableLookup = lookup;
            },
        );
        this.loadBillingPage();
    },
    beforeUnmount: function () {
        this.nextPaymentsRequestSequence();
        this.abortDataRequests();
        this.abortPaymentsRequests();
    },
});
</script>

<style scoped>
@import "@/style/layout/payment-history-list-section.css";
@import "@/style/layout/organization-billing-page.css";
</style>
