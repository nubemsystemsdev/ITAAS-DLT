<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg catalog-detail-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ entry ? entry.name : $t("Catalog detail") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="entry" class="modal-body catalog-detail-modal-body">
                <div class="catalog-detail-grid">
                    <div class="catalog-detail-left">
                        <article class="catalog-product-card">
                            <div class="catalog-detail-visual">
                                <span class="catalog-detail-visual-icon">
                                    {{ entry.initials || "NS" }}
                                </span>
                            </div>

                            <div class="catalog-product-copy">
                                <p class="catalog-product-description">
                                    {{ entryDescription }}
                                </p>
                            </div>

                            <div v-if="hasPlanItems" class="catalog-detail-includes">
                                <h3 class="catalog-detail-includes-title">{{ $t("Included in this purchase") }}</h3>
                                <ul class="catalog-detail-includes-list">
                                    <li v-for="planItem in entry.planItems" :key="planItem" class="catalog-detail-includes-item">
                                        <i class="fas fa-check" aria-hidden="true"></i>
                                        <span>{{ planItem }}</span>
                                    </li>
                                </ul>
                            </div>
                        </article>
                    </div>

                    <div class="catalog-detail-right">
                        <aside class="catalog-summary-card" :class="{ 'is-unavailable': !hasAvailableSelectedPricing }">
                            <div class="catalog-detail-cycle-picker">
                                <div class="catalog-detail-cycle-header">
                                    <p class="catalog-detail-cycle-label">{{ $t("Billing cycle") }}</p>
                                    <span v-if="sharedDiscountPercent > 0" class="catalog-detail-cycle-discount catalog-discount-text">
                                        -{{ sharedDiscountPercent }}%
                                    </span>
                                </div>
                                <div class="catalog-pricing-options" role="radiogroup" :aria-label="$t('Billing cycle')">
                                    <button
                                        v-for="option in orderedPricingOptions"
                                        :key="option.cycle"
                                        type="button"
                                        class="catalog-pricing-option"
                                        :class="{ 'is-active': option.cycle === selectedCycle }"
                                        :aria-pressed="option.cycle === selectedCycle"
                                        :disabled="actionRunning"
                                        @click="requestSelectCycle(option.cycle)"
                                    >
                                        <span class="catalog-pricing-cycle">{{ $t(option.label) }}</span>
                                        <span
                                            v-if="showPerOptionDiscounts && option.discountPercent && option.discountPercent > 0"
                                            class="catalog-pricing-discount catalog-discount-text"
                                        >
                                            -{{ option.discountPercent }}%
                                        </span>
                                    </button>
                                </div>
                                <div v-if="showQuantitySelector" class="catalog-detail-quantity">
                                    <p class="catalog-detail-quantity-label">{{ $t("Quantity") }}</p>
                                    <div class="catalog-detail-quantity-control" role="group" :aria-label="$t('Quantity')">
                                        <button
                                            type="button"
                                            class="catalog-detail-quantity-btn"
                                            :title="$t('Decrease quantity')"
                                            :aria-label="$t('Decrease quantity')"
                                            :disabled="actionRunning || normalizedQuantity <= 1"
                                            @click="decreaseQuantity"
                                        >
                                            <i class="fas fa-minus" aria-hidden="true"></i>
                                        </button>

                                        <span class="catalog-detail-quantity-value" aria-live="polite">
                                            {{ normalizedQuantity }}
                                        </span>

                                        <button
                                            type="button"
                                            class="catalog-detail-quantity-btn"
                                            :title="$t('Increase quantity')"
                                            :aria-label="$t('Increase quantity')"
                                            :disabled="actionRunning"
                                            @click="increaseQuantity"
                                        >
                                            <i class="fas fa-plus" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="catalog-summary-lines">
                                <div class="catalog-summary-row">
                                    <span>{{ $t("Base price") }}</span>
                                    <span v-if="hasAvailableSelectedPricing" class="catalog-summary-value">
                                        {{ formatEur(selectedPricingBaseAmount) }} /{{ $t(selectedPricingUnitLabel) }}
                                    </span>
                                    <span v-else class="catalog-summary-value">{{ $t("Pricing pending") }}</span>
                                </div>
                                <div v-if="selectedPricingSavingsAmount > 0 && hasAvailableSelectedPricing" class="catalog-summary-row">
                                    <span>{{ $t("Plan discount") }}</span>
                                    <span class="catalog-summary-value catalog-discount-text"
                                        >-{{ formatEur(selectedPricingSavingsAmount) }}</span
                                    >
                                </div>
                            </div>

                            <div v-if="showCartNotice" class="catalog-summary-notice" role="status" aria-live="polite">
                                {{ cartNoticeMessage }}
                            </div>

                            <div v-if="isAuthenticated && hasAvailableSelectedPricing" class="catalog-token-panel">
                                <button
                                    type="button"
                                    class="catalog-token-toggle"
                                    :aria-expanded="showTokensDropdown"
                                    :disabled="actionRunning"
                                    @click="toggleTokensDropdown"
                                >
                                    <span class="catalog-token-toggle-copy">
                                        <span class="catalog-token-panel-title">{{ $t("Use Nubem tokens") }}</span>
                                        <span class="catalog-token-panel-hint">
                                            {{
                                                normalizedAppliedTokens > 0
                                                    ? `${normalizedAppliedTokens} ${$t("applied")}`
                                                    : `${$t("Available")}: ${normalizedTokenBalance}`
                                            }}
                                        </span>
                                    </span>
                                    <i
                                        class="fas fa-chevron-down catalog-token-toggle-icon"
                                        :class="{ 'is-open': showTokensDropdown }"
                                        aria-hidden="true"
                                    ></i>
                                </button>

                                <div v-if="showTokensDropdown" class="catalog-token-panel-body">
                                    <label class="catalog-token-input-wrap" for="catalog-detail-token-input">
                                        <span class="catalog-token-input-label">{{ $t("Tokens to redeem") }}</span>
                                        <input
                                            id="catalog-detail-token-input"
                                            :value="normalizedRedeemTokens"
                                            type="number"
                                            min="0"
                                            :max="normalizedMaxApplicableTokens"
                                            step="1"
                                            inputmode="numeric"
                                            class="catalog-token-input"
                                            :disabled="actionRunning"
                                            @input="requestRedeemTokensUpdate"
                                            @change="requestRedeemTokensUpdate"
                                        />
                                    </label>

                                    <p v-if="normalizedMaxApplicableTokens > 0" class="catalog-token-panel-hint">
                                        {{ $t("Maximum applicable") }}: {{ normalizedMaxApplicableTokens }}
                                    </p>
                                    <p v-else class="catalog-token-panel-hint">
                                        {{ $t("No tokens can be applied to this pricing right now.") }}
                                    </p>

                                    <div class="catalog-token-summary">
                                        <p class="catalog-token-summary-line">
                                            <span>{{ $t("Applied tokens") }}</span>
                                            <span>{{ normalizedAppliedTokens }}</span>
                                        </p>
                                        <p class="catalog-token-summary-line">
                                            <span>{{ $t("Token discount") }}</span>
                                            <span class="catalog-discount-text">-{{ formattedTokenDiscount }}</span>
                                        </p>
                                    </div>

                                    <p
                                        class="catalog-token-panel-hint catalog-token-status"
                                        :class="{ 'is-visible': quoteLoading }"
                                        aria-live="polite"
                                    >
                                        {{ quoteLoading ? $t("Calculating token quote...") : "" }}
                                    </p>
                                </div>
                            </div>

                            <div class="catalog-summary-total">
                                <div class="catalog-summary-total-price">
                                    <p v-if="hasAvailableSelectedPricing" class="catalog-summary-total-amount">
                                        {{ formattedFinalPayableAmount }}
                                    </p>
                                    <p v-else class="catalog-summary-total-amount">
                                        {{ $t("Pricing pending") }}
                                    </p>
                                    <p v-if="hasAvailableSelectedPricing" class="catalog-summary-total-unit">
                                        /{{ $t(selectedPricingUnitLabel) }}
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary catalog-detail-footer-btn" @click="close">
                    {{ $t("Close") }}
                </button>
                <button
                    type="button"
                    class="btn btn-primary catalog-detail-footer-btn"
                    :disabled="actionDisabled"
                    @click="requestPrimaryAction"
                >
                    <i v-if="actionRunning" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <i v-else-if="primaryActionIconClass" :class="primaryActionIconClass" aria-hidden="true"></i>
                    {{ primaryActionLabel }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { useVModel } from "@/utils/v-model";
import { formatEur } from "@/utils/format-currency";

type CatalogBillingCycle = "monthly" | "annual";
type CatalogPrimaryActionType = "subscribe" | "manage" | "complete_pending" | "unavailable";

interface CatalogEntryDetailPricing {
    cycle: CatalogBillingCycle;
    label: string;
    price: number;
    basePrice?: number;
    discountAmount?: number;
    subscribableId: string;
    discountPercent?: number;
    priceIncludesDiscount?: boolean;
}

interface CatalogEntryDetail {
    initials?: string;
    kind?: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    planItems: string[];
    kindLabel: string;
    typeLabel: string;
    pricingOptions: CatalogEntryDetailPricing[];
}

export default defineComponent({
    name: "CatalogEntryDetailModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "update:quantity", "select-cycle", "primary-action", "update-redeem-tokens"],
    props: {
        display: Boolean,
        entry: {
            type: Object as PropType<CatalogEntryDetail | null>,
            default: null,
        },
        selectedCycle: {
            type: String as PropType<CatalogBillingCycle>,
            default: "monthly",
        },
        isAuthenticated: {
            type: Boolean,
            default: false,
        },
        isOrganizationAdmin: {
            type: Boolean,
            default: false,
        },
        actionDisabled: {
            type: Boolean,
            default: true,
        },
        actionRunning: {
            type: Boolean,
            default: false,
        },
        primaryActionType: {
            type: String as PropType<CatalogPrimaryActionType>,
            default: "subscribe",
        },
        primaryActionLabel: {
            type: String,
            default: "Subscribe",
        },
        quantity: {
            type: Number,
            default: 1,
        },
        redeemTokens: {
            type: Number,
            default: 0,
        },
        availableTokenBalance: {
            type: Number,
            default: 0,
        },
        maxApplicableTokens: {
            type: Number,
            default: 0,
        },
        appliedTokens: {
            type: Number,
            default: 0,
        },
        tokenDiscountEurCents: {
            type: Number,
            default: 0,
        },
        finalPayableAmountEurCents: {
            type: Number,
            default: 0,
        },
        quoteLoading: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            showTokensDropdown: false,
        };
    },
    computed: {
        entryDescription(): string {
            if (!this.entry) {
                return this.$t("No description available") + "";
            }

            return this.entry.longDescription || this.entry.shortDescription || this.$t("No description available") + "";
        },
        hasPlanItems(): boolean {
            return !!this.entry && Array.isArray(this.entry.planItems) && this.entry.planItems.length > 0;
        },
        orderedPricingOptions(): CatalogEntryDetailPricing[] {
            if (!this.entry || !this.entry.pricingOptions.length) {
                return [];
            }

            const options = [...this.entry.pricingOptions];
            const cyclePriority: Record<CatalogBillingCycle, number> = {
                monthly: 0,
                annual: 1,
            };

            options.sort((a, b) => {
                return (cyclePriority[a.cycle] ?? 99) - (cyclePriority[b.cycle] ?? 99);
            });

            return options;
        },
        sharedDiscountPercent(): number {
            if (!this.orderedPricingOptions.length) {
                return 0;
            }

            const normalizedDiscounts = this.orderedPricingOptions.map((option) => {
                const discount = Number(option.discountPercent || 0);
                if (!Number.isFinite(discount)) {
                    return 0;
                }

                return Math.max(0, Math.min(100, Math.round(discount)));
            });

            const firstDiscount = normalizedDiscounts[0] || 0;
            if (firstDiscount <= 0) {
                return 0;
            }

            return normalizedDiscounts.every((discount) => discount === firstDiscount) ? firstDiscount : 0;
        },
        showPerOptionDiscounts(): boolean {
            return this.sharedDiscountPercent <= 0;
        },
        showQuantitySelector(): boolean {
            return (this.entry?.kind || "").trim().toLowerCase() === "product" && this.isOrganizationAdmin;
        },
        selectedPricingOption(): CatalogEntryDetailPricing | null {
            if (!this.entry || !this.entry.pricingOptions.length) {
                return null;
            }

            const selectedOption = this.entry.pricingOptions.find((option) => option.cycle === this.selectedCycle);
            return selectedOption || this.entry.pricingOptions[0] || null;
        },
        selectedPricingUnitLabel(): string {
            if (!this.selectedPricingOption) {
                return "month";
            }

            return this.selectedPricingOption.cycle === "annual" ? "year" : "month";
        },
        hasAvailableSelectedPricing(): boolean {
            return !!this.selectedPricingOption && !!this.selectedPricingOption.subscribableId;
        },
        selectedDiscountPercent(): number {
            if (!this.selectedPricingOption) {
                return 0;
            }

            const discount = Number(this.selectedPricingOption.discountPercent || 0);
            if (!Number.isFinite(discount)) {
                return 0;
            }

            return Math.max(0, Math.min(100, Math.round(discount)));
        },
        selectedPricingDisplayedAmount(): number {
            if (!this.selectedPricingOption) {
                return 0;
            }

            return Math.max(Number(this.selectedPricingOption.price || 0), 0) * this.normalizedQuantity;
        },
        selectedPricingBaseAmount(): number {
            if (!this.hasAvailableSelectedPricing) {
                return 0;
            }

            return (
                Math.max(Number(this.selectedPricingOption?.basePrice || this.selectedPricingOption?.price || 0), 0) *
                this.normalizedQuantity
            );
        },
        selectedPricingSavingsAmount(): number {
            if (!this.hasAvailableSelectedPricing) {
                return 0;
            }

            return Math.max(Number(this.selectedPricingOption?.discountAmount || 0), 0) * this.normalizedQuantity;
        },
        normalizedQuantity(): number {
            return Math.max(1, Math.floor(Number(this.quantity) || 1));
        },
        normalizedRedeemTokens(): number {
            return Math.max(0, Math.floor(Number(this.redeemTokens) || 0));
        },
        normalizedTokenBalance(): number {
            return Math.max(0, Math.floor(Number(this.availableTokenBalance) || 0));
        },
        normalizedMaxApplicableTokens(): number {
            return Math.max(0, Math.floor(Number(this.maxApplicableTokens) || 0));
        },
        normalizedAppliedTokens(): number {
            return Math.max(0, Math.floor(Number(this.appliedTokens) || 0));
        },
        formattedTokenDiscount(): string {
            return this.formatEur(Math.max(Number(this.tokenDiscountEurCents) || 0, 0) / 100);
        },
        formattedFinalPayableAmount(): string {
            const fallbackAmount = this.getSelectedPricingFallbackAmount();
            const finalAmount = Math.max(Number(this.finalPayableAmountEurCents) || 0, 0) / 100;
            return this.formatEur(finalAmount > 0 || this.normalizedAppliedTokens > 0 ? finalAmount : fallbackAmount);
        },
        cartNoticeMessage(): string {
            if (!this.hasAvailableSelectedPricing) {
                return this.$t("This entry does not have active pricing yet.") + "";
            }

            if (!this.isAuthenticated) {
                return this.$t("Sign in to subscribe or complete pending payments.") + "";
            }

            return "";
        },
        showCartNotice(): boolean {
            return !!this.cartNoticeMessage;
        },
        primaryActionIconClass(): string {
            if (this.primaryActionType === "subscribe") {
                return "fas fa-plus-circle";
            }

            if (this.primaryActionType === "complete_pending") {
                return "fas fa-credit-card";
            }

            return "";
        },
    },
    methods: {
        close: function (): void {
            this.$closeModal();
        },
        decreaseQuantity: function (): void {
            this.$emit("update:quantity", Math.max(1, this.normalizedQuantity - 1));
        },
        increaseQuantity: function (): void {
            this.$emit("update:quantity", Math.min(999, this.normalizedQuantity + 1));
        },
        toggleTokensDropdown: function (): void {
            this.showTokensDropdown = !this.showTokensDropdown;
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
        requestSelectCycle: function (cycle: CatalogBillingCycle): void {
            this.$emit("select-cycle", cycle);
        },
        requestPrimaryAction: function (): void {
            this.$emit("primary-action");
        },
        requestRedeemTokensUpdate: function (event: Event): void {
            const target = event.target as HTMLInputElement | null;
            const rawValue = Number(target?.value || 0);
            const normalizedValue = Math.max(
                0,
                Math.min(this.normalizedMaxApplicableTokens, Math.floor(Number.isFinite(rawValue) ? rawValue : 0)),
            );

            if (target && target.value !== String(normalizedValue)) {
                target.value = String(normalizedValue);
            }

            this.$emit("update-redeem-tokens", normalizedValue);
        },
        getSelectedPricingFallbackAmount: function (): number {
            if (!this.hasAvailableSelectedPricing) {
                return 0;
            }

            return this.selectedPricingDisplayedAmount;
        },
        formatEur: function (amount: number): string {
            return formatEur(Math.max(amount || 0, 0), String(this.$locale?.value || "en"));
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-detail-modal.css";
</style>
