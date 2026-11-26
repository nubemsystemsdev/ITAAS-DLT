<template>
    <div class="page-content catalog-page catalog-user-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Subscription area')"
            :title="$t('Catalog')"
            :subtitle="
                $t(
                    'Explore products, services and plans in one place, and subscribe or complete pending payments with a simple dashboard flow.',
                )
            "
        />

        <CatalogUserListSection
            :loading="loading"
            :has-error="hasError"
            :catalog-entries-count="totalCatalogEntries"
            :selected-type="selectedType"
            :search-query="searchQuery"
            :locale="locale"
            :catalog-notice="catalogNotice"
            :is-authenticated="isAuthenticated"
            :empty-state-title="emptyStateTitle"
            :empty-state-message="emptyStateMessage"
            :entries="catalogListCards"
            :action-in-progress="!!actionInProgressEntryId"
            v-model:filters-collapsed="filtersCollapsed"
            :subscription-mode="subscriptionMode"
            :min-price="minPrice"
            :max-price="maxPrice"
            :sort-by="sortBy"
            :sort-dir="sortDir"
            :current-page="page"
            :total-pages="totalPages"
            :can-go-prev="paginationCanGoPrev"
            :can-go-next="paginationCanGoNext"
            @search-change="onSearchChanged"
            @search-submit="onSearchSubmit"
            @select-suggestion="onSuggestionSelected"
            @retry-load="loadCatalog"
            @view-entry="openDetailModalById"
            @prev-page="prevPage"
            @next-page="nextPage"
            @apply-filters="onApplyFilters"
            @reset-filters="onCatalogResetFilters"
        />

        <CatalogEntryDetailModal
            v-model:display="isDetailModalOpen"
            :entry="selectedEntry"
            :quantity="selectedQuantity"
            :selected-cycle="selectedEntry ? getSelectedCycle(selectedEntry) : 'monthly'"
            :is-authenticated="isAuthenticated"
            :is-organization-admin="isOrganizationAdmin"
            :action-disabled="selectedEntry ? isPrimaryActionDisabled(selectedEntry) : true"
            :action-running="selectedEntry ? isEntryActionRunning(selectedEntry) : false"
            :primary-action-type="selectedEntry ? getPrimaryActionType(selectedEntry) : 'subscribe'"
            :primary-action-label="selectedEntry ? $t(getPrimaryActionLabel(selectedEntry)) : $t('Subscribe')"
            :redeem-tokens="selectedEntry ? getRedeemTokensForEntry(selectedEntry) : 0"
            :available-token-balance="availableTokenBalance"
            :max-applicable-tokens="selectedEntry ? getMaxApplicableTokensForEntry(selectedEntry) : 0"
            :applied-tokens="selectedEntry ? getAppliedTokensForEntry(selectedEntry) : 0"
            :token-discount-eur-cents="selectedEntry ? getTokenDiscountForEntry(selectedEntry) : 0"
            :final-payable-amount-eur-cents="selectedEntry ? getFinalPayableAmountForEntry(selectedEntry) : 0"
            :quote-loading="selectedEntry ? tokenQuoteLoadingEntryId === selectedEntry.id : false"
            @select-cycle="onModalSelectCycle"
            @update:quantity="onModalQuantityUpdated"
            @update-redeem-tokens="onModalRedeemTokensUpdated"
            @primary-action="onModalPrimaryAction"
        />

        <ModalDialogContainer v-model:display="displayPurchaseResultModal">
            <div class="modal-dialog modal-md purchase-result-modal" @click="stopPurchaseResultEvent">
                <div class="modal-header">
                    <div class="modal-title">{{ purchaseResultModalTitle }}</div>
                    <button
                        type="button"
                        class="modal-close-btn"
                        :title="$t('Close')"
                        :aria-label="$t('Close')"
                        @click="closePurchaseResultModal"
                    >
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="modal-body purchase-result-modal-body">
                    <div class="purchase-result-icon-wrap" :class="purchaseResultModalToneClass">
                        <i :class="purchaseResultModalIconClass" aria-hidden="true"></i>
                    </div>
                    <p class="purchase-result-message">{{ purchaseResultModalMessage }}</p>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary purchase-result-close-btn" @click="closePurchaseResultModal">
                        {{ $t("Close") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, getCurrentInstance, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import CatalogEntryDetailModal from "@/components/modals/CatalogEntryDetailModal.vue";
import CatalogUserListSection, { type CatalogUserListCardItem } from "@/components/routes/dashboard/CatalogUserListSection.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { AppEvents } from "@/control/app-events";
import { AuthController } from "@/control/auth";
import { OrganizationController } from "@/control/organization";
import {
    ensureCatalogCycleSelection,
    getListCatalogPricingOption,
    getSelectedCatalogCycle,
    getSelectedCatalogPricingOption,
    type CatalogBillingCycle,
    type CatalogEntry,
    type CatalogKindFilter,
} from "@/composables/catalog-domain";
import { useCatalogCheckout } from "@/composables/useCatalogCheckout";
import { useCatalogEntries } from "@/composables/useCatalogEntries";
import { useCatalogTokenQuote } from "@/composables/useCatalogTokenQuote";
import { formatEur as formatCurrencyEur } from "@/utils/format-currency";
const CARD_TEXT_MAX_LENGTH = 45;

export default defineComponent({
    name: "CatalogUserPage",
    components: {
        CatalogUserListSection,
        CatalogEntryDetailModal,
        DashboardPageHeader,
        ModalDialogContainer,
    },
    setup: function () {
        const route = useRoute();
        const router = useRouter();
        const instance = getCurrentInstance();
        const proxy = instance?.proxy;
        const selectedEntry = ref<CatalogEntry | null>(null);
        const isDetailModalOpen = ref(false);
        const organizationContextVersion = ref(0);
        const selectedQuantity = ref(1);
        const selectedCycleByEntry = ref<Record<string, CatalogBillingCycle>>({});

        const {
            catalogNotice: entriesCatalogNotice,
            loadCatalog: loadCatalogEntries,
            subscriptionMode,
            ...catalogEntriesState
        } = useCatalogEntries({
            route,
            router,
        });

        const getSelectedCycle = (entry: CatalogEntry): CatalogBillingCycle => {
            return getSelectedCatalogCycle(entry, selectedCycleByEntry.value);
        };

        const setSelectedCycle = (entryId: string, cycle: CatalogBillingCycle): void => {
            selectedCycleByEntry.value = {
                ...selectedCycleByEntry.value,
                [entryId]: cycle,
            };
        };

        const getSelectedPricingOption = (entry: CatalogEntry) => {
            return getSelectedCatalogPricingOption(entry, selectedCycleByEntry.value);
        };

        const getListPricingOption = (entry: CatalogEntry) => {
            const mode = subscriptionMode.value;
            if (mode === "annual") {
                return entry.pricingOptions.find((option) => option.cycle === "annual") || getListCatalogPricingOption(entry);
            }
            return getListCatalogPricingOption(entry);
        };

        const getSelectedDisplayedPriceAmount = (entry: CatalogEntry): number => {
            const selectedOption = getSelectedPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }
            return Math.max(Number(selectedOption.price || 0), 0);
        };

        const getSelectedEntryAmountCents = (entry: CatalogEntry): number => {
            return Math.max(0, Math.round(getSelectedDisplayedPriceAmount(entry) * getSelectedQuantity(entry) * 100));
        };

        const getSelectedQuantity = (entry: CatalogEntry): number => {
            if (!OrganizationController.isOrganizationAdmin() || entry.kind !== "product") {
                return 1;
            }
            if (selectedEntry.value?.id !== entry.id) {
                return 1;
            }
            return Math.max(1, Math.floor(Number(selectedQuantity.value) || 1));
        };

        const tokenQuoteState = useCatalogTokenQuote({
            isAuthenticated: () => AuthController.isAuthenticated(),
            getSelectedPricingOption,
            getSelectedEntryAmountCents,
        });

        const failActionWithMessage = (title: string, message: string): void => {
            if (!proxy) {
                return;
            }
            proxy.$showMessageModal(proxy.$t(title), proxy.$t(message));
        };

        const { catalogNotice: checkoutCatalogNotice, ...checkoutState } = useCatalogCheckout({
            isAuthenticated: () => AuthController.isAuthenticated(),
            loading: catalogEntriesState.loading,
            route,
            router,
            selectedEntry,
            getSelectedPricingOption,
            getSelectedQuantity,
            getRedeemTokensForEntry: tokenQuoteState.getRedeemTokensForEntry,
            updateEntryQuoteFromPreview: tokenQuoteState.updateEntryQuoteFromPreview,
            loadTokenBalance: tokenQuoteState.loadTokenBalance,
            refreshEntryTokenQuote: tokenQuoteState.refreshEntryTokenQuote,
            failActionWithMessage,
            openCheckoutPage: (checkoutUrl: string) => {
                window.location.href = checkoutUrl;
            },
            requireLogin: () => {
                proxy?.$requireLogin();
            },
            showSnackBar: (message: string) => {
                proxy?.$showSnackBar(message);
            },
            goToSubscriptions: () => {
                isDetailModalOpen.value = false;
                void router.push({ name: "subscriptions" });
            },
            translate: (key: string) => {
                return String(proxy?.$t(key) ?? key);
            },
        });

        const catalogNotice = computed(() => {
            return entriesCatalogNotice.value || checkoutCatalogNotice.value;
        });

        watch(
            catalogEntriesState.catalogEntries,
            (nextEntries) => {
                selectedCycleByEntry.value = ensureCatalogCycleSelection(nextEntries, selectedCycleByEntry.value);
            },
            { immediate: true },
        );

        watch(isDetailModalOpen, (isOpen) => {
            if (!isOpen) {
                selectedEntry.value = null;
                selectedQuantity.value = 1;
            }
        });

        return {
            ...catalogEntriesState,
            loadCatalogEntries,
            subscriptionMode,
            ...tokenQuoteState,
            ...checkoutState,
            catalogNotice,
            organizationContextVersion,
            selectedEntry,
            selectedQuantity,
            isDetailModalOpen,
            selectedCycleByEntry,
            getSelectedCycle,
            setSelectedCycle,
            getSelectedPricingOption,
            getListPricingOption,
            getSelectedDisplayedPriceAmount,
            getSelectedEntryAmountCents,
            getSelectedQuantity,
        };
    },
    computed: {
        isAuthenticated(): boolean {
            return AuthController.isAuthenticated();
        },
        isOrganizationAdmin(): boolean {
            void this.organizationContextVersion;
            void OrganizationController.Loaded;
            return OrganizationController.isOrganizationAdmin();
        },
        locale(): string {
            return String(this.$locale?.value || "en");
        },
        catalogListCards(): CatalogUserListCardItem[] {
            return this.catalogEntries.map((entry) => ({
                id: entry.id,
                initials: entry.initials,
                kindLabel: entry.kindLabel,
                typeLabel: entry.typeLabel,
                name: this.truncateCardText(entry.name),
                description: this.truncateCardText(entry.shortDescription || this.$t("No description available") + ""),
                showOriginalPrice: this.shouldShowOriginalListPrice(entry),
                originalPriceLabel: this.getListOriginalPriceLabel(entry),
                cycleLabel: this.getListCycleLabel(entry),
                priceLabel: this.getListPriceLabel(entry),
                hasCycleLabel: this.hasAvailableListPricing(entry),
                hasDiscount: this.hasListDiscount(entry),
                discountPercent: this.getListDiscountPercent(entry),
            }));
        },
    },
    methods: {
        truncateCardText: function (text: string): string {
            return this.truncateText(text, CARD_TEXT_MAX_LENGTH);
        },
        truncateText: function (text: string, maxLength: number): string {
            const normalizedText = (text || "").trim();
            if (!normalizedText) {
                return "";
            }

            if (normalizedText.length <= maxLength) {
                return normalizedText;
            }

            return `${normalizedText.substring(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
        },
        formatEur: function (amount: number): string {
            return formatCurrencyEur(Math.max(amount || 0, 0), String(this.$locale?.value || "en"));
        },
        loadCatalog: async function (): Promise<void> {
            await Promise.all([
                this.loadCatalogEntries(),
                this.loadTokenBalance(),
                this.loadSubscriptionStatuses().catch((error) => {
                    console.error(error);
                    return {};
                }),
            ]);
        },
        hasAvailableSelectedPricing: function (entry: CatalogEntry): boolean {
            const selectedOption = this.getSelectedPricingOption(entry);
            return !!selectedOption && !!selectedOption.subscribableId;
        },
        hasAvailableListPricing: function (entry: CatalogEntry): boolean {
            const selectedOption = this.getListPricingOption(entry);
            return !!selectedOption && !!selectedOption.subscribableId;
        },
        getSelectedCycleLabel: function (entry: CatalogEntry): string {
            const selectedOption = this.getSelectedPricingOption(entry);
            if (!selectedOption) {
                return "month";
            }
            return selectedOption.cycle === "annual" ? "year" : "month";
        },
        getListCycleLabel: function (entry: CatalogEntry): string {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return "month";
            }
            return selectedOption.cycle === "annual" ? "year" : "month";
        },
        getSelectedDiscountPercent: function (entry: CatalogEntry): number {
            const selectedOption = this.getSelectedPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Number(selectedOption.discountPercent || 0) || 0;
        },
        getListDiscountPercent: function (entry: CatalogEntry): number {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Number(selectedOption.discountPercent || 0) || 0;
        },
        getListDisplayedPriceAmount: function (entry: CatalogEntry): number {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Math.max(Number(selectedOption.price || 0), 0);
        },
        getSelectedOriginalPriceAmount: function (entry: CatalogEntry): number {
            const selectedOption = this.getSelectedPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Math.max(Number(selectedOption.basePrice || selectedOption.price || 0), 0);
        },
        getListOriginalPriceAmount: function (entry: CatalogEntry): number {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Math.max(Number(selectedOption.basePrice || selectedOption.price || 0), 0);
        },
        getSelectedDiscountAmount: function (entry: CatalogEntry): number {
            const selectedOption = this.getSelectedPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Math.max(Number(selectedOption.discountAmount || 0), 0);
        },
        getListDiscountAmount: function (entry: CatalogEntry): number {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return 0;
            }

            return Math.max(Number(selectedOption.discountAmount || 0), 0);
        },
        hasSelectedDiscount: function (entry: CatalogEntry): boolean {
            return this.hasAvailableSelectedPricing(entry) && this.getSelectedDiscountAmount(entry) > 0;
        },
        hasListDiscount: function (entry: CatalogEntry): boolean {
            return this.hasAvailableListPricing(entry) && this.getListDiscountAmount(entry) > 0;
        },
        shouldShowOriginalSelectedPrice: function (entry: CatalogEntry): boolean {
            if (!this.hasSelectedDiscount(entry)) {
                return false;
            }

            return this.getSelectedOriginalPriceAmount(entry) > this.getSelectedDisplayedPriceAmount(entry);
        },
        shouldShowOriginalListPrice: function (entry: CatalogEntry): boolean {
            if (!this.hasListDiscount(entry)) {
                return false;
            }

            return this.getListOriginalPriceAmount(entry) > this.getListDisplayedPriceAmount(entry);
        },
        getSelectedOriginalPriceLabel: function (entry: CatalogEntry): string {
            return this.formatEur(this.getSelectedOriginalPriceAmount(entry));
        },
        getListOriginalPriceLabel: function (entry: CatalogEntry): string {
            return this.formatEur(this.getListOriginalPriceAmount(entry));
        },
        getSelectedPriceLabel: function (entry: CatalogEntry): string {
            const selectedOption = this.getSelectedPricingOption(entry);
            if (!selectedOption) {
                return this.$t("Unavailable") + "";
            }

            if (!selectedOption.subscribableId) {
                return this.$t("Pricing pending") + "";
            }

            return this.formatEur(this.getSelectedDisplayedPriceAmount(entry));
        },
        getListPriceLabel: function (entry: CatalogEntry): string {
            const selectedOption = this.getListPricingOption(entry);
            if (!selectedOption) {
                return this.$t("Unavailable") + "";
            }

            if (!selectedOption.subscribableId) {
                return this.$t("Pricing pending") + "";
            }

            return this.formatEur(this.getListDisplayedPriceAmount(entry));
        },
        openDetailModalById: function (entryId: string): void {
            const entry = this.catalogEntries.find((catalogEntry) => catalogEntry.id === entryId);
            if (!entry) {
                return;
            }

            this.openDetailModal(entry);
        },
        openDetailModal: function (entry: CatalogEntry): void {
            this.selectedEntry = entry;
            this.selectedQuantity = 1;
            this.isDetailModalOpen = true;

            if (this.isAuthenticated) {
                void this.loadTokenBalance();
                void this.refreshEntryTokenQuote(entry);
            }
        },
        onModalSelectCycle: function (cycle: CatalogBillingCycle): void {
            if (!this.selectedEntry) {
                return;
            }

            this.setSelectedCycle(this.selectedEntry.id, cycle);
            if (this.isAuthenticated) {
                void this.refreshEntryTokenQuote(this.selectedEntry);
            }
        },
        onModalRedeemTokensUpdated: function (tokens: number): void {
            if (!this.selectedEntry) {
                return;
            }

            this.setRedeemTokensForEntry(this.selectedEntry.id, tokens);
            if (this.isAuthenticated) {
                void this.refreshEntryTokenQuote(this.selectedEntry);
            }
        },
        onModalQuantityUpdated: function (quantity: number): void {
            if (!this.selectedEntry) {
                return;
            }

            this.selectedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
            if (this.isAuthenticated) {
                void this.refreshEntryTokenQuote(this.selectedEntry);
            }
        },
        onOrganizationContextChanged: function (): void {
            this.organizationContextVersion += 1;
            if (!this.isOrganizationAdmin) {
                this.selectedQuantity = 1;
            }
        },
        onModalPrimaryAction: function (): void {
            if (!this.selectedEntry) {
                return;
            }

            this.onPrimaryAction(this.selectedEntry);
        },
        onApplyFilters: function (payload: {
            selectedType: string;
            subscriptionMode: string;
            minPrice: number | null;
            maxPrice: number | null;
            sortBy: string;
            sortDir: string;
        }): void {
            this.selectedType = payload.selectedType as CatalogKindFilter;
            this.subscriptionMode = payload.subscriptionMode;
            this.minPrice = payload.minPrice;
            this.maxPrice = payload.maxPrice;
            this.sortBy = payload.sortBy;
            this.sortDir = payload.sortDir;

            this.onFilterFieldChange();
        },
        onCatalogResetFilters: function (): void {
            this.resetFilters();
        },
        onSuggestionSelected: function (entry: any): void {
            const catalogEntry = this.catalogEntries.find((e: any) => e.id === entry.id);
            if (catalogEntry) {
                this.openDetailModal(catalogEntry);
            }
        },
        onSearchSubmit: function (): void {
            this.submitSearch();
        },
    },
    mounted: function () {
        AppEvents.AddEventListener("organization-context-changed", this.onOrganizationContextChanged);
        void OrganizationController.ensureReady();
        this.handleCheckoutReturnResult();
        void this.loadCatalog();
    },
    beforeUnmount: function () {
        AppEvents.RemoveEventListener("organization-context-changed", this.onOrganizationContextChanged);
    },
});
</script>

<style scoped>
.purchase-result-modal {
    overflow: hidden;
}

.purchase-result-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-16);
    padding: var(--space-24);
    text-align: center;
}

.purchase-result-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 100px;
    background: var(--color-bg-surface);
    font-size: 40px;
    line-height: 48px;
}

.purchase-result-icon-wrap.is-success {
    color: var(--color-feedback-success);
}

.purchase-result-icon-wrap.is-error {
    color: var(--color-feedback-error);
}

.purchase-result-icon-wrap.is-warning {
    color: var(--color-feedback-warning);
}

.purchase-result-message {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 16px;
    line-height: 24px;
    max-width: 360px;
}

.purchase-result-close-btn {
    min-height: 44px;
}
</style>
