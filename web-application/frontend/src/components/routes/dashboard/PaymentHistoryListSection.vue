<template>
    <section class="payment-history-card dashboard-list-card">
        <TableCardToolbar
            :tabs="[]"
            :filters-collapsed="filtersCollapsed"
            show-filters-toggle
            @update:filtersCollapsed="onFiltersCollapsedUpdate"
        >
            <template #filters>
                <label class="toolbar-plan-filter" for="payment-history-date-from">
                    <span class="toolbar-plan-label">{{ $t("From") }}</span>
                    <input
                        id="payment-history-date-from"
                        v-model="draftDateFrom"
                        :max="draftDateTo || undefined"
                        type="date"
                        class="toolbar-plan-select"
                    />
                </label>

                <label class="toolbar-plan-filter" for="payment-history-date-to">
                    <span class="toolbar-plan-label">{{ $t("To") }}</span>
                    <input
                        id="payment-history-date-to"
                        v-model="draftDateTo"
                        :min="draftDateFrom || undefined"
                        type="date"
                        class="toolbar-plan-select"
                    />
                </label>

                <label class="toolbar-plan-filter" for="payment-history-payment-type">
                    <span class="toolbar-plan-label">{{ $t("Payment type") }}</span>
                    <select id="payment-history-payment-type" v-model="draftPaymentType" class="toolbar-plan-select">
                        <option value="all">{{ $t("All") }}</option>
                        <option v-for="type in availablePaymentTypes" :key="type" :value="type">
                            {{ translatePaymentType(type) }}
                        </option>
                    </select>
                </label>

                <label class="toolbar-plan-filter" for="payment-history-product-type">
                    <span class="toolbar-plan-label">{{ $t("Product type") }}</span>
                    <select id="payment-history-product-type" v-model="draftProductType" class="toolbar-plan-select">
                        <option value="all">{{ $t("All") }}</option>
                        <option value="item">{{ $t("Item") }}</option>
                        <option value="plan">{{ $t("Plan") }}</option>
                    </select>
                </label>

                <label class="toolbar-plan-filter" for="payment-history-status">
                    <span class="toolbar-plan-label">{{ $t("Status") }}</span>
                    <select id="payment-history-status" v-model="draftStatus" class="toolbar-plan-select">
                        <option value="all">{{ $t("All") }}</option>
                        <option v-for="status in availableStatuses" :key="status" :value="status">
                            {{ translatePaymentStatus(status) }}
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

        <div class="table-responsive payment-history-table-wrapper">
            <table class="table table-wide table-stack table-stack--single-col-mobile payment-history-table">
                <colgroup>
                    <col class="payment-col-concept" />
                    <col class="payment-col-type" />
                    <col class="payment-col-date" />
                    <col class="payment-col-method" />
                    <col class="payment-col-product-type" />
                    <col class="payment-col-amount" />
                    <col class="payment-col-status" />
                    <col class="payment-col-actions" />
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">{{ $t("Name") }}</th>
                        <th scope="col">{{ $t("Type") }}</th>
                        <th scope="col">{{ $t("Date") }}</th>
                        <th scope="col">{{ $t("Method") }}</th>
                        <th scope="col">{{ $t("Product") }}</th>
                        <th scope="col" class="text-right">{{ $t("Amount") }}</th>
                        <th scope="col">{{ $t("Status") }}</th>
                        <th scope="col" class="text-center">{{ $t("Actions") }}</th>
                    </tr>
                </thead>
                <tbody v-if="loading">
                    <tr>
                        <td colspan="8" class="table-feedback">{{ $t("Loading") }}...</td>
                    </tr>
                </tbody>
                <tbody v-else-if="!payments.length">
                    <tr>
                        <td colspan="8" class="table-feedback">{{ $t("No payments found") }}</td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr v-for="payment in payments" :key="payment.id">
                        <td :data-label="$t('Name')" class="table-stack-row-primary">
                            <p class="payment-cell-concept" :title="resolveConcept(payment)">{{ resolveConcept(payment) }}</p>
                        </td>
                        <td :data-label="$t('Type')" class="payment-cell-nowrap">{{ translatePaymentType(payment.paymentType) }}</td>
                        <td :data-label="$t('Date')" class="payment-cell-nowrap">{{ formatDate(payment.createdAt) }}</td>
                        <td :data-label="$t('Method')" class="payment-cell-nowrap">{{ translatePaymentMethod(payment.method) }}</td>
                        <td :data-label="$t('Product')" class="payment-cell-nowrap">{{ resolveProductTypeLabel(payment) }}</td>
                        <td :data-label="$t('Amount')" class="text-left payment-cell-amount">
                            {{ formatAmount(payment.amountCents, payment.currency) }}
                        </td>
                        <td :data-label="$t('Status')" class="payment-cell-nowrap">
                            <span :class="statusBadgeClass(payment.status)" role="status">
                                {{ translatePaymentStatus(payment.status) }}
                            </span>
                        </td>
                        <td :data-label="$t('Actions')" class="actions-cell text-center td-shrink">
                            <div class="dashboard-actions-inline payment-actions-inline">
                                <TooltipPortal :content="$t('Download invoice')">
                                    <button
                                        type="button"
                                        class="btn btn-primary payment-action-btn"
                                        :disabled="isGeneratedButtonDisabled(payment.id)"
                                        :aria-label="
                                            isGeneratedDownloadLoading(payment.id) ? `${$t('Downloading')}...` : $t('Download invoice')
                                        "
                                        @click="$emit('download-generated', payment.id)"
                                    >
                                        <i
                                            :class="
                                                isGeneratedDownloadLoading(payment.id)
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
            :visible="paginationVisible"
            :aria-label="$t('Payment history pagination')"
            @prev="$emit('prev')"
            @next="$emit('next')"
        />
    </section>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import type { MyPaymentHistoryItem } from "@/api/definitions";
import type { PaymentHistoryFiltersState, ProductTypeFilter } from "@/composables/usePaymentHistory";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { PAYMENT_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import {
    isSuccessfulPaymentStatus,
    paymentHistoryFilterStatusLabelKey,
    paymentTypeLabelKey,
    paymentMethodLabelKey,
    productTypeLabelKey,
} from "@/utils/payment-history-domain";
import TooltipPortal from "@/components/ui/TooltipPortal.vue";

export default defineComponent({
    name: "PaymentHistoryListSection",
    components: {
        PaginationBar,
        TableCardToolbar,
        TooltipPortal,
    },
    emits: ["update:filtersCollapsed", "apply-filters", "reset-filters", "prev", "next", "download-generated"],
    props: {
        loading: {
            type: Boolean,
            default: false,
        },
        payments: {
            type: Array as PropType<MyPaymentHistoryItem[]>,
            default: () => [],
        },
        page: {
            type: Number,
            required: true,
        },
        totalPages: {
            type: Number,
            required: true,
        },
        filtersCollapsed: {
            type: Boolean,
            default: true,
        },
        filters: {
            type: Object as PropType<PaymentHistoryFiltersState>,
            required: true,
        },
        availablePaymentTypes: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        availableStatuses: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        canGoPrev: {
            type: Boolean,
            default: false,
        },
        canGoNext: {
            type: Boolean,
            default: false,
        },
        paginationVisible: {
            type: Boolean,
            default: false,
        },
        isGeneratedButtonDisabled: {
            type: Function as PropType<(paymentId: string) => boolean>,
            required: true,
        },
        isGeneratedDownloadLoading: {
            type: Function as PropType<(paymentId: string) => boolean>,
            required: true,
        },
    },
    data: function () {
        return {
            draftDateFrom: this.filters.dateFrom || "",
            draftDateTo: this.filters.dateTo || "",
            draftPaymentType: this.filters.paymentType || "all",
            draftProductType: this.filters.productType || "all",
            draftStatus: this.filters.status || "all",
        };
    },
    computed: {
        paymentStatusToneMap: function (): Record<string, "success" | "warning" | "error" | "muted" | "info"> {
            return PAYMENT_STATUS_TONE_MAP;
        },
    },
    methods: {
        toTitle: function (value: string): string {
            return ((value || "") + "")
                .split(/[_\s-]+/g)
                .filter((part) => !!part)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(" ");
        },
        translatePaymentStatus: function (status: string): string {
            if (isSuccessfulPaymentStatus(status)) {
                return String(this.$t("Paid"));
            }
            const key = paymentHistoryFilterStatusLabelKey(status) || this.toTitle(status);
            return String(this.$t(key));
        },
        translatePaymentType: function (paymentType: string): string {
            const key = paymentTypeLabelKey(paymentType);
            if (!key) {
                return this.toTitle(paymentType);
            }
            return String(this.$t(key));
        },
        translatePaymentMethod: function (method: string): string {
            if (!method) {
                return "-";
            }
            const key = paymentMethodLabelKey(method);
            if (!key) {
                return this.toTitle(method);
            }
            return String(this.$t(key));
        },
        getIntlLocale: function (): string {
            const locale = String(this.$locale?.value || "")
                .trim()
                .toLowerCase();

            if (locale.startsWith("es")) {
                return "es-ES";
            }

            return "en-US";
        },
        formatDate: function (timestamp: number): string {
            if (!Number.isFinite(timestamp) || timestamp <= 0) {
                return "-";
            }

            try {
                return new Intl.DateTimeFormat(this.getIntlLocale(), {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }).format(new Date(timestamp));
            } catch (_ex) {
                return new Date(timestamp).toLocaleString();
            }
        },
        formatAmount: function (amountCents: number, currency: string): string {
            return formatMoneyFromCents(amountCents, currency);
        },
        resolveProductTypeLabel: function (payment: MyPaymentHistoryItem): string {
            const key = productTypeLabelKey(payment.productType, payment.catalogItemType);
            return String(this.$t(key));
        },
        resolveConcept: function (payment: MyPaymentHistoryItem): string {
            const rawConcept = ((payment.concept || "") + "").trim();
            const productLabel = this.toTitle(payment.productType || String(this.$t("Product")));

            if (!rawConcept) {
                return productLabel || String(this.$t("Payment"));
            }

            if (/^\d+$/.test(rawConcept)) {
                return productLabel ? `${productLabel} ${rawConcept}` : rawConcept;
            }

            if (rawConcept.toLowerCase() === "payment") {
                return productLabel || String(this.$t("Payment"));
            }

            const paymentTypeKey = paymentTypeLabelKey(rawConcept);
            if (paymentTypeKey && paymentTypeKey !== rawConcept.toLowerCase()) {
                return String(this.$t(paymentTypeKey));
            }

            return rawConcept;
        },
        statusBadgeClass: function (status: string): string {
            return statusBadgeClass(status, this.paymentStatusToneMap);
        },
        onFiltersCollapsedUpdate: function (collapsed: boolean): void {
            this.$emit("update:filtersCollapsed", collapsed);
        },
        onApplyFilters: function (): void {
            const payload: PaymentHistoryFiltersState = {
                dateFrom: this.draftDateFrom,
                dateTo: this.draftDateTo,
                paymentType: this.draftPaymentType,
                productType: this.draftProductType as ProductTypeFilter,
                status: this.draftStatus,
            };
            this.$emit("apply-filters", payload);
        },
        onResetFilters: function (): void {
            this.draftDateFrom = "";
            this.draftDateTo = "";
            this.draftPaymentType = "all";
            this.draftProductType = "all";
            this.draftStatus = "all";
            this.$emit("reset-filters");
        },
    },
    watch: {
        "filters.dateFrom": function (val: string): void {
            this.draftDateFrom = val || "";
        },
        "filters.dateTo": function (val: string): void {
            this.draftDateTo = val || "";
        },
        "filters.paymentType": function (val: string): void {
            this.draftPaymentType = val || "all";
        },
        "filters.productType": function (val: ProductTypeFilter): void {
            this.draftProductType = val || "all";
        },
        "filters.status": function (val: string): void {
            this.draftStatus = val || "all";
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/payment-history-list-section.css";
</style>
