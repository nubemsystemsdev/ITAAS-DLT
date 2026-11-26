<template>
    <div class="page-content payments-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Finance - billing')"
            :title="$t('Payments')"
            :subtitle="$t('Stripe, SEPA and stablecoins. Renewals, failed payments and refunds.')"
        >
        </DashboardPageHeader>

        <section class="dashboard-kpis">
            <article class="kpi-card" v-for="kpi in kpis" :key="kpi.id">
                <p class="kpi-label">{{ $t(kpi.label) }}</p>
                <p class="kpi-value">{{ kpi.value }}</p>
                <p class="kpi-hint">{{ kpi.hint }}</p>
            </article>
        </section>

        <section class="dashboard-data-card">
            <div v-if="isGlobalAdmin" class="payments-card-toolbar">
                <button type="button" class="btn btn-tertiary" @click="openGracePeriodConfigModal">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    {{ $t("Grace period settings") }}
                </button>
            </div>

            <div class="table-responsive">
                <table class="table table-wide table-stack table-stack--single-col-mobile">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Client / Org") }}</th>
                            <th scope="col">{{ $t("Type") }}</th>
                            <th scope="col">{{ $t("Billing") }}</th>
                            <th scope="col">{{ $t("Date") }}</th>
                            <th scope="col">{{ $t("Amount") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col" class="text-right">{{ $t("Action") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="loading">
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
                        <tr v-for="payment in paymentRows" :key="payment.id">
                            <td :data-label="$t('Client / Org')" class="table-stack-row-primary">{{ payment.client }}</td>
                            <td :data-label="$t('Type')">{{ payment.type }}</td>
                            <td :data-label="$t('Billing')">{{ payment.billing }}</td>
                            <td :data-label="$t('Date')">{{ payment.date }}</td>
                            <td :data-label="$t('Amount')">{{ payment.amount }}</td>
                            <td :data-label="$t('Status')">
                                <span :class="statusBadgeClass(payment.statusVariant, paymentStatusToneMap)" role="status">
                                    {{ payment.statusDisplay }}
                                </span>
                            </td>
                            <td :data-label="$t('Action')" class="actions-cell text-right td-shrink">
                                <div class="dashboard-actions-inline">
                                    <button
                                        v-if="payment.actionType === 'retry'"
                                        type="button"
                                        class="btn btn-danger btn-xs payments-row-action-btn"
                                        :disabled="actionLoadingId === payment.id"
                                        :aria-label="$t('Retry')"
                                        :title="$t('Retry')"
                                        @click="retryPayment(payment.id)"
                                    >
                                        <i
                                            :class="
                                                actionLoadingId === payment.id
                                                    ? 'fas fa-spinner fa-spin no-margin'
                                                    : 'fas fa-rotate-right no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                    <button
                                        v-else
                                        type="button"
                                        class="btn btn-primary btn-xs payments-row-action-btn"
                                        :disabled="actionLoadingId === payment.id"
                                        :aria-label="$t('View')"
                                        :title="$t('View')"
                                        @click="viewPayment(payment.id)"
                                    >
                                        <i
                                            :class="
                                                actionLoadingId === payment.id ? 'fas fa-spinner fa-spin no-margin' : 'fas fa-eye no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
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
                :visible="!loading && paginationVisible"
                :aria-label="$t('Payments list pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>

        <PaymentDetailModal v-if="displayPaymentDetailModal" v-model:display="displayPaymentDetailModal" :payment="paymentDetailView" />

        <PaymentsGracePeriodConfigModal v-if="displayGracePeriodConfigModal" v-model:display="displayGracePeriodConfigModal" />
    </div>
</template>

<script lang="ts">
import { ApiPayments, ListPaymentsQueryParameters } from "@/api/api-group-payments";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import { PaymentListItem, PaymentCheckoutResponse } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { isGlobalAdminRole } from "@/control/organization-admin-access";
import { OrganizationController } from "@/control/organization";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { formatInteger } from "@/utils/format-number";
import { getUniqueStringId } from "@/utils/unique-id";
import { toTitleCase } from "@/utils/text";
import { renderDate } from "@/utils/time-utils";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import PaymentDetailModal, { type PaymentDetailView } from "@/components/modals/PaymentDetailModal.vue";
import PaymentsGracePeriodConfigModal from "@/components/modals/PaymentsGracePeriodConfigModal.vue";
import { usePagination } from "@/composables/usePagination";
import { PAYMENT_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { badRequestOrgRequiredForMultiLicensePlanHandler } from "@/utils/subscription-domain";

type KpiCard = {
    id: string;
    label: string;
    value: string;
    hint: string;
};

type StatusVariant = "confirmed" | "pending" | "failed" | "refund";

type PaymentRecord = PaymentListItem & {
    providerSessionId?: string;
    stripePaymentIntentId?: string;
};

type PaymentRow = {
    id: string;
    client: string;
    type: string;
    billing: string;
    date: string;
    amount: string;
    statusDisplay: string;
    statusVariant: StatusVariant;
    actionType: "view" | "retry";
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const PAYMENTS_KPI_FETCH_PAGE_SIZE = 25;

type PaymentsListQuery = ListPaymentsQueryParameters & {
    page?: string;
    pageSize?: string;
};

function buildPaymentsListQuery(page: number, pageSize: number): PaymentsListQuery {
    return {
        page: String(page),
        pageSize: String(pageSize),
    };
}

function isSuccessfulPayment(status: string): boolean {
    const s = (status || "").toLowerCase();
    return s === "completed" || s === "confirmed";
}

function isFailedPayment(status: string): boolean {
    const s = (status || "").toLowerCase();
    return s === "failed" || s === "cancelled";
}

function isRefundPayment(payment: PaymentRecord): boolean {
    const status = (payment.status || "").toLowerCase();
    const type = (payment.type || "").toLowerCase();
    return (payment.amountCents || 0) < 0 || type.includes("refund") || status.includes("refund");
}

function getPaymentSubscribableId(payment: PaymentRecord): string {
    return (payment.subscribableId || "").trim();
}

function canRetryPayment(payment: PaymentRecord): boolean {
    if (!isFailedPayment(payment.status)) {
        return false;
    }
    const type = (payment.type || "").toLowerCase();
    const subscriptionId = (payment.subscriptionId || "").trim();
    const subscribableId = getPaymentSubscribableId(payment);
    const subscribableType = (payment.subscribableType || "").trim();
    if (type.includes("renew") && subscriptionId) {
        return true;
    }
    return !!(subscribableType && subscribableId && type.includes("create"));
}

function getStatusVariant(status: string, type: string): StatusVariant {
    const t = (type || "").toLowerCase();
    const s = (status || "").toLowerCase();
    if (t.includes("refund") || s.includes("refund")) {
        return "refund";
    }
    if (isSuccessfulPayment(status)) {
        return "confirmed";
    }
    if (isFailedPayment(status)) {
        return "failed";
    }
    return "pending";
}

function translatePaymentStatus(status: string, translate: (key: string) => string): string {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
        case "completed":
        case "confirmed":
            return translate("Confirmed");
        case "pending":
            return translate("Pending");
        case "failed":
        case "cancelled":
            return translate("Failed");
        default:
            if (normalized.includes("refund")) {
                return translate("Refund");
            }
            return status ? toTitleCase(status) : "—";
    }
}

export default defineComponent({
    name: "PaymentsPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
        PaymentDetailModal,
        PaymentsGracePeriodConfigModal,
    },
    setup: function () {
        const loading = ref(true);
        const pagination = usePagination({ loading });

        return {
            loading,
            paymentsKpisRequestId: getUniqueStringId(),
            paymentsPageRequestId: getUniqueStringId(),
            viewPaymentRequestId: getUniqueStringId(),
            retryPaymentRequestId: getUniqueStringId(),
            listPageSize: pagination.pageSize,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
        };
    },
    data: function () {
        return {
            paymentStatusToneMap: PAYMENT_STATUS_TONE_MAP,
            organizationName: "",
            payments: [] as PaymentRecord[],
            paymentsForKpis: [] as PaymentRecord[],
            actionLoadingId: "",
            displayPaymentDetailModal: false,
            displayGracePeriodConfigModal: false,
            paymentDetailView: null as PaymentDetailView | null,
        };
    },
    computed: {
        isGlobalAdmin: function (): boolean {
            return isGlobalAdminRole();
        },
        kpis: function (): KpiCard[] {
            const emptyHint = this.$t("No data available");
            if (!this.paymentsForKpis.length) {
                return [
                    { id: "charges", label: "Charges (30 days)", value: "—", hint: emptyHint },
                    { id: "success", label: "Successful payments ratio", value: "—", hint: emptyHint },
                    { id: "failed", label: "Failed", value: "—", hint: emptyHint },
                    { id: "refunds", label: "Refunds", value: "—", hint: emptyHint },
                ];
            }

            const now = Date.now();
            const start30 = now - THIRTY_DAYS_MS;
            const start90 = now - NINETY_DAYS_MS;

            const in30 = this.paymentsForKpis.filter((p) => p.createdAt >= start30);
            const successful30 = in30.filter((p) => isSuccessfulPayment(p.status) && (p.amountCents || 0) >= 0);
            const chargesSum = successful30.reduce((sum, p) => sum + (p.amountCents || 0), 0);

            const in90 = this.paymentsForKpis.filter((p) => p.createdAt >= start90 && (p.amountCents || 0) >= 0);
            const successful90 = in90.filter((p) => isSuccessfulPayment(p.status)).length;
            const attempted90 = in90.length;
            const ratioPct = attempted90 > 0 ? Math.round((successful90 / attempted90) * 1000) / 10 : 0;

            const failedCount = this.paymentsForKpis.filter((p) => isFailedPayment(p.status)).length;

            const refundItems = this.paymentsForKpis.filter((p) => isRefundPayment(p));
            const refundSum = refundItems.reduce((sum, p) => sum + Math.abs(p.amountCents || 0), 0);
            const refundCurrency = refundItems.length ? refundItems[0].currency || "EUR" : "EUR";

            const primaryCurrency = successful30.length ? successful30[0].currency || "EUR" : "EUR";

            return [
                {
                    id: "charges",
                    label: "Charges (30 days)",
                    value: formatMoneyFromCents(chargesSum, primaryCurrency),
                    hint: `${formatInteger(successful30.length)} ${this.$t("transactions")}`,
                },
                {
                    id: "success",
                    label: "Successful payments ratio",
                    value: `${ratioPct}%`,
                    hint: `${formatInteger(successful90)} / ${formatInteger(attempted90)} ${this.$t("(90 days)")}`,
                },
                {
                    id: "failed",
                    label: "Failed",
                    value: formatInteger(failedCount),
                    hint: failedCount ? this.$t("Require attention") : emptyHint,
                },
                {
                    id: "refunds",
                    label: "Refunds",
                    value: formatMoneyFromCents(refundSum, refundCurrency),
                    hint: `${formatInteger(refundItems.length)} ${this.$t("recorded refunds")}`,
                },
            ];
        },
        paymentRows: function (): PaymentRow[] {
            return this.payments.map((p) => {
                const variant = getStatusVariant(p.status, p.type);
                return {
                    id: p.id,
                    client: this.resolvePaymentClientLabel(p),
                    type: this.formatPaymentType(p.type),
                    billing: this.formatPaymentBilling(p.billingCycle),
                    date: renderDate(p.createdAt, this.$t),
                    amount: formatMoneyFromCents(p.amountCents || 0, p.currency || "EUR"),
                    statusDisplay: this.formatPaymentStatus(p.status),
                    statusVariant: variant,
                    actionType: canRetryPayment(p) ? "retry" : "view",
                };
            });
        },
    },
    methods: {
        statusBadgeClass,
        formatPaymentStatus: function (status: string): string {
            return translatePaymentStatus(status, (key) => String(this.$t(key)));
        },
        translatePaymentType: function (type: string): string {
            const normalized = (type || "").toLowerCase();
            const mapping: Record<string, string> = {
                subscription_create: String(this.$t("Subscription creation")),
                subscription_renew: String(this.$t("Subscription renewal")),
                subscription_renewed: String(this.$t("Subscription renewal")),
                subscription_cancel: String(this.$t("Subscription cancellation")),
                refund: String(this.$t("Refund")),
                charge: String(this.$t("Charge")),
                payment: String(this.$t("Payment")),
            };
            return mapping[normalized] || toTitleCase(type);
        },
        translateBillingCycle: function (billingCycle: string): string {
            const normalized = (billingCycle || "").toLowerCase();
            const mapping: Record<string, string> = {
                monthly: String(this.$t("Monthly")),
                annual: String(this.$t("Annual")),
                yearly: String(this.$t("Annual")),
                one_time: String(this.$t("One-time")),
            };
            return mapping[normalized] || toTitleCase(billingCycle);
        },
        formatPaymentType: function (type: string): string {
            return type ? this.translatePaymentType(type) : "—";
        },
        formatPaymentBilling: function (billingCycle: string): string {
            return billingCycle ? this.translateBillingCycle(billingCycle) : "—";
        },
        resolvePaymentClientLabel: function (payment?: PaymentRecord): string {
            const paymentUsername = ((payment?.username || "") + "").trim();
            if (paymentUsername) {
                return paymentUsername;
            }

            const paymentUid = ((payment?.uid || "") + "").trim();
            if (paymentUid) {
                return paymentUid;
            }

            if (this.organizationName) {
                return this.organizationName;
            }

            const profile = AuthController.ProfileName || AuthController.Username;
            return profile || String(this.$t("Account"));
        },
        findPaymentById: function (paymentId: string): PaymentRecord | undefined {
            return (
                this.payments.find((payment) => payment.id === paymentId) ||
                this.paymentsForKpis.find((payment) => payment.id === paymentId)
            );
        },
        buildPaymentDetailView: function (detail: PaymentCheckoutResponse, payment: PaymentRecord | undefined): PaymentDetailView {
            const listPayment = payment;
            const statusSource = listPayment?.status || detail.status;
            const typeSource = listPayment?.type || "";
            const statusVariant = getStatusVariant(statusSource, typeSource);

            const subscribableId = listPayment ? getPaymentSubscribableId(listPayment) : "";
            const provider = (listPayment?.provider || "").trim();
            const providerSessionId = (listPayment?.providerSessionId || "").trim();
            const stripePaymentIntentId = (listPayment?.stripePaymentIntentId || "").trim();
            const stripeId = /^(pi_|cs_)/.test(stripePaymentIntentId)
                ? stripePaymentIntentId
                : /^(pi_|cs_)/.test(providerSessionId)
                ? providerSessionId
                : /^(pi_|cs_)/.test(detail.payment_id)
                ? detail.payment_id
                : undefined;

            return {
                paymentId: detail.payment_id,
                stripeId,
                statusDisplay: this.formatPaymentStatus(detail.status),
                statusVariant,
                amount: listPayment ? formatMoneyFromCents(listPayment.amountCents || 0, listPayment.currency || "EUR") : "—",
                client: this.resolvePaymentClientLabel(listPayment),
                method: listPayment
                    ? [this.formatPaymentType(listPayment.type || ""), this.formatPaymentBilling(listPayment.billingCycle || "")]
                          .filter((value) => value !== "—")
                          .join(" · ") || "—"
                    : "—",
                date: listPayment ? new Date(listPayment.createdAt).toLocaleString() : "—",
                reference: subscribableId || undefined,
                provider: provider ? toTitleCase(provider) : undefined,
            };
        },
        onPaginationPrev: function (): void {
            if (!this.paginationGoPrev()) {
                return;
            }
            this.loadPaymentsPage();
        },
        onPaginationNext: function (): void {
            if (!this.paginationGoNext()) {
                return;
            }
            this.loadPaymentsPage();
        },
        load: function () {
            this.loading = true;
            Request.Abort(this.paymentsKpisRequestId);
            Request.Abort(this.paymentsPageRequestId);
            this.organizationName = "";
            this.payments = [];
            this.paymentsForKpis = [];
            this.paginationReset();
            this.loadOrganizationName();
            this.fetchAllPaymentsForKpis(1, []);
            this.loadPaymentsPage();
        },
        loadOrganizationName: function (): void {
            void OrganizationController.ensureReady().then(() => {
                this.organizationName = OrganizationController.MyOrganization?.companyName || "";
            });
        },
        fetchAllPaymentsForKpis: function (page: number, accumulated: PaymentRecord[]): void {
            Request.Pending(
                this.paymentsKpisRequestId + "-kpi-" + page,
                ApiPayments.ListPayments(buildPaymentsListQuery(page, PAYMENTS_KPI_FETCH_PAGE_SIZE)),
            )
                .onSuccess((response) => {
                    const merged = accumulated.concat(response.payments || []);
                    if (response.page < response.totalPages) {
                        this.fetchAllPaymentsForKpis(page + 1, merged);
                        return;
                    }
                    this.paymentsForKpis = merged;
                })
                .onRequestError((err, handleErr) => {
                    this.paymentsForKpis = [];
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payments."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.paymentsForKpis = [];
                });
        },
        loadPaymentsPage: function (): void {
            Request.Abort(this.paymentsPageRequestId);
            this.loading = true;
            Request.Pending(this.paymentsPageRequestId, ApiPayments.ListPayments(buildPaymentsListQuery(this.page, this.listPageSize)))
                .onSuccess((response) => {
                    this.loading = false;
                    this.payments = response.payments || [];
                    this.paginationApplyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                })
                .onRequestError((err, handleErr) => {
                    this.loading = false;
                    this.payments = [];
                    this.paginationReset();
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payments.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.payments = [];
                    this.paginationReset();
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payments."));
                });
        },
        openGracePeriodConfigModal: function () {
            this.displayGracePeriodConfigModal = true;
        },
        viewPayment: function (paymentId: string) {
            this.actionLoadingId = paymentId;
            const payment = this.findPaymentById(paymentId);
            Request.Abort(this.viewPaymentRequestId);
            Request.Pending(this.viewPaymentRequestId, ApiPayments.GetPayment(paymentId))
                .onSuccess((detail) => {
                    this.actionLoadingId = "";
                    this.paymentDetailView = this.buildPaymentDetailView(detail, payment);
                    this.displayPaymentDetailModal = true;
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to load payment details.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Payment not found.")),
                        notFoundPaymentNotFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Payment not found.")),
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payment details.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payment details."));
                });
        },
        retryPayment: function (paymentId: string) {
            const payment = this.findPaymentById(paymentId);
            if (!payment || !canRetryPayment(payment)) {
                this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment."));
                return;
            }

            this.actionLoadingId = paymentId;
            Request.Abort(this.retryPaymentRequestId);

            const paymentType = (payment.type || "").toLowerCase();
            const subscriptionId = (payment.subscriptionId || "").trim();

            if (paymentType.includes("renew") && subscriptionId) {
                Request.Pending(this.retryPaymentRequestId, ApiSubscriptions.RenewSubscription({ subscription_id: subscriptionId }))
                    .onSuccess(() => {
                        this.actionLoadingId = "";
                        this.$showSnackBar(this.$t("Payment retry started"));
                        this.load();
                    })
                    .onRequestError((err, handleErr) => {
                        this.actionLoadingId = "";
                        handleErr(err, {
                            unauthorized: () => this.$requireLogin(),
                            badRequest: () => this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                            badRequestInvalidRequest: () =>
                                this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                            notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Unable to retry payment.")),
                            notFoundSubscriptionNotFound: () =>
                                this.$showMessageModal(this.$t("Not found"), this.$t("Unable to retry payment.")),
                            temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to retry payment.")),
                        });
                    })
                    .onUnexpectedError(() => {
                        this.actionLoadingId = "";
                        this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to retry payment."));
                    });
                return;
            }

            const subscribableId = getPaymentSubscribableId(payment);
            const subscribableType = (payment.subscribableType || "").trim();
            if (!subscribableType || !subscribableId) {
                this.actionLoadingId = "";
                this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment."));
                return;
            }

            Request.Pending(
                this.retryPaymentRequestId,
                ApiSubscriptions.CreateSubscription({
                    subscribable_type: subscribableType,
                    subscribable_id: subscribableId,
                }),
            )
                .onSuccess((response) => {
                    this.actionLoadingId = "";
                    if (response.checkout_url) {
                        location.href = response.checkout_url;
                        return;
                    }
                    this.$showSnackBar(this.$t("Payment retry started"));
                    this.load();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestAlreadyFullAccess: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("This subscription already has full access.")),
                        badRequestInvalidSubscribableId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestInvalidSubscribableType: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestAlreadySubscribedToItem: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestAlreadySubscribedToPlan: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestItemCoveredByActivePlan: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestPlanContainsAlreadySubscribedItem: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestInsufficientTokenBalance: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Not enough tokens in your wallet.")),
                        badRequestTokensExceedLimit: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Too many tokens applied to this plan change.")),
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to retry payment.")),
                        badRequestAlreadySubscribed: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestInvalidQuantity: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to retry payment.")),
                        badRequestOrgRequiredForMultiLicensePlan: badRequestOrgRequiredForMultiLicensePlanHandler(
                            (title, message) => this.$showMessageModal(title, message),
                            (key) => this.$t(key),
                        ),
                        forbidden: () => this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to retry payment.")),
                        forbiddenOrgMemberCannotPurchase: () =>
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to retry payment.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to retry payment."));
                });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Payments"));
        this.$autoFocus();
        this.load();
    },
    beforeUnmount: function () {
        Request.Abort(this.paymentsKpisRequestId);
        Request.Abort(this.paymentsPageRequestId);
        Request.Abort(this.viewPaymentRequestId);
        Request.Abort(this.retryPaymentRequestId);
    },
});
</script>

<style scoped>
.payments-card-toolbar {
    display: flex;
    justify-content: flex-end;
}

.payments-row-action-btn {
    min-width: 44px;
    min-height: 44px;
    padding: var(--space-8) var(--space-12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
</style>
