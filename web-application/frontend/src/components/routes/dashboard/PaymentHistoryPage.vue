<template>
    <div class="page-content payment-history-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Billing area')"
            :title="$t('Payment history')"
            :subtitle="$t('Review your transactions and download your invoices.')"
        />

        <PaymentHistoryListSection
            :loading="loading"
            :payments="payments"
            :page="page"
            :total-pages="totalPages"
            v-model:filters-collapsed="filtersCollapsed"
            :filters="filters"
            :available-payment-types="availablePaymentTypes"
            :available-statuses="availableStatuses"
            :can-go-prev="paginationCanGoPrev"
            :can-go-next="paginationCanGoNext"
            :pagination-visible="!loading && paginationVisible"
            :is-generated-button-disabled="isGeneratedButtonDisabled"
            :is-generated-download-loading="isGeneratedDownloadLoading"
            @apply-filters="onApplyFilters"
            @reset-filters="clearFilters"
            @prev="goToPreviousPage"
            @next="goToNextPage"
            @download-generated="downloadGeneratedInvoice"
        />
    </div>
</template>

<script lang="ts">
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaymentHistoryListSection from "@/components/routes/dashboard/PaymentHistoryListSection.vue";
import { usePaymentHistory } from "@/composables/usePaymentHistory";
import { defineComponent } from "vue";

export default defineComponent({
    name: "PaymentHistoryPage",
    components: {
        DashboardPageHeader,
        PaymentHistoryListSection,
    },
    setup: function () {
        return usePaymentHistory();
    },
});
</script>
