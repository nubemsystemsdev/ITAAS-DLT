<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="processing">
        <div class="modal-dialog modal-md manage-subscription-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Manage subscription") }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    :disabled="processing"
                    @click="close"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="subscription" class="modal-body manage-modal-body">
                <div class="manage-summary">
                    <div class="manage-summary-text">
                        <p class="manage-agent">{{ subscription.agent }}</p>
                        <p class="manage-version">{{ subscription.version }}</p>
                    </div>
                    <span :class="statusBadgeClass(subscription.status, subscriptionStatusToneMap)" role="status">
                        {{ $t(statusLabel(subscription.status, isCancellationScheduled)) }}
                    </span>
                </div>

                <div class="manage-current-plan">
                    <p class="manage-current-plan-label">{{ $t("Current plan") }}</p>
                    <p class="manage-current-plan-name">{{ $t(subscription.plan) }}</p>
                    <p class="manage-current-plan-meta">
                        {{ formatPrice(subscription.amount) }} | {{ periodStatusLabel }}:
                        {{ subscription.renewalDate ? formatDate(subscription.renewalDate) : "-" }}
                    </p>
                </div>

                <div v-if="paymentSummary" class="manage-payment-summary">
                    <p class="manage-payment-title">{{ $t("Latest payment") }}</p>
                    <p class="manage-payment-text">
                        {{ formatPriceFromCents(paymentSummary.amountCents, paymentSummary.currency) }} ·
                        {{ paymentSummary.provider || $t("Provider") }} ·
                        {{ formatPaymentStatus(paymentSummary.status) }}
                    </p>
                    <p class="manage-payment-text">{{ formatPaymentDate(paymentSummary.createdAt) }}</p>
                    <button type="button" class="btn btn-tertiary manage-payment-action" :disabled="processing" @click="requestViewPayment">
                        {{ $t("View latest payment") }}
                    </button>
                </div>

                <div class="manage-plan-options" role="region" :aria-label="$t('Select plan (upgrade/downgrade)')">
                    <p class="manage-label">{{ $t("Select plan (upgrade/downgrade)") }}</p>
                    <div class="manage-plan-grid" role="radiogroup" :aria-label="$t('Select plan')">
                        <button
                            v-for="plan in subscription.availablePlans"
                            :key="plan.id"
                            type="button"
                            class="manage-plan-option"
                            :class="{ selected: selectedPlanId === plan.id }"
                            :aria-pressed="selectedPlanId === plan.id"
                            :disabled="processing"
                            @click="selectPlan(plan.id)"
                        >
                            <span class="manage-plan-option-name">{{ $t(plan.label) }}</span>
                            <span class="manage-plan-option-price">{{ formatPrice(plan.amount) }}</span>
                        </button>
                    </div>
                </div>

                <div v-if="showPlanChangeSummary" class="manage-change-summary" role="status" aria-live="polite">
                    <p class="manage-change-title">{{ $t("Plan change summary") }}</p>
                    <p class="manage-change-text">{{ resolvedPlanChangeSummaryText }}</p>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="processing" @click="close">
                    {{ $t("Close") }}
                </button>
                <button
                    v-if="hasPrimaryAction"
                    type="button"
                    class="btn btn-primary"
                    :disabled="processing || !subscription"
                    @click="requestPrimaryAction"
                >
                    <i v-if="isPrimaryActionProcessing" class="fas fa-spinner fa-spin"></i>
                    {{ primaryActionLabel }}
                </button>

                <button
                    v-else
                    type="button"
                    class="btn btn-primary"
                    :disabled="processing || !canApplyPlanChange"
                    @click="requestPlanChange"
                >
                    <i v-if="isPlanChangeProcessing" class="fas fa-spinner fa-spin"></i>
                    {{ planChangeActionLabel }}
                </button>

                <button
                    v-if="!hasPrimaryAction && canCancel"
                    type="button"
                    class="btn btn-danger"
                    :disabled="processing"
                    @click="requestCancel"
                >
                    <i v-if="isCancelActionProcessing" class="fas fa-spinner fa-spin"></i>
                    {{ $t("Cancel subscription") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { SUBSCRIPTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { useVModel } from "@/utils/v-model";
import { formatPrice } from "@/utils/format-currency";
import { formatDateLongIntl } from "@/utils/time-utils";

type ManageSubscriptionStatus = "active" | "pending" | "cancelled";
type ManagePlanChangeMode = "immediate" | "period_end";
type ManageActionIndicator = "" | "cancel" | "reactivate" | "change-plan";

interface ManagePlanOption {
    id: string;
    label: string;
    amount: number | null;
    planIndex: number | null;
}

interface ManageSubscription {
    id: string;
    agent: string;
    version: string;
    subscribableType: string;
    planId: string;
    plan: string;
    planIndex: number | null;
    status: ManageSubscriptionStatus;
    cancelAtPeriodEnd?: boolean;
    renewalDate: string;
    amount: number | null;
    availablePlans: ManagePlanOption[];
}

interface ManagePaymentSummary {
    id: string;
    type: string;
    provider: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: number;
}

export default defineComponent({
    name: "ManageSubscriptionModal",
    components: {
        ModalDialogContainer,
    },
    emits: [
        "update:display",
        "cancel-subscription",
        "reactivate-subscription",
        "change-plan",
        "plan-selection-change",
        "update-redeem-tokens",
        "view-payment",
    ],
    props: {
        display: Boolean,
        processing: Boolean,
        subscription: {
            type: Object as PropType<ManageSubscription | null>,
            default: null,
        },
        paymentSummary: {
            type: Object as PropType<ManagePaymentSummary | null>,
            default: null,
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
        previewSummaryText: {
            type: String,
            default: "",
        },
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            subscriptionStatusToneMap: SUBSCRIPTION_STATUS_TONE_MAP,
            selectedPlanId: "",
            showTokensDropdown: false,
            activeAction: "" as ManageActionIndicator,
        };
    },
    computed: {
        canApplyPlanChange(): boolean {
            if (!this.subscription) {
                return false;
            }
            if (this.subscription.status === "cancelled" || this.subscription.cancelAtPeriodEnd) {
                return false;
            }

            const hasTargetOption = this.subscription.availablePlans.some((plan) => plan.id !== this.subscription.planId);
            return hasTargetOption && !!this.selectedPlanId && this.selectedPlanId !== this.subscription.planId;
        },
        canCancel(): boolean {
            return !!this.subscription && this.subscription.status === "active" && !this.subscription.cancelAtPeriodEnd;
        },
        canReactivate(): boolean {
            return !!this.subscription && (this.subscription.status === "cancelled" || !!this.subscription.cancelAtPeriodEnd);
        },
        hasPrimaryAction(): boolean {
            return this.canReactivate;
        },
        isPrimaryActionProcessing(): boolean {
            return this.processing && this.activeAction === "reactivate";
        },
        isPlanChangeProcessing(): boolean {
            return this.processing && this.activeAction === "change-plan";
        },
        isCancelActionProcessing(): boolean {
            return this.processing && this.activeAction === "cancel";
        },
        isCancellationScheduled(): boolean {
            return !!this.subscription && !!this.subscription.cancelAtPeriodEnd && this.subscription.status !== "cancelled";
        },
        periodStatusLabel(): string {
            return this.isCancellationScheduled ? String(this.$t("Cancellation date")) : String(this.$t("Next renewal"));
        },
        reactivateActionLabel(): string {
            return this.isCancellationScheduled ? String(this.$t("Cancel cancellation")) : String(this.$t("Reactivate plan"));
        },
        primaryActionLabel(): string {
            return this.reactivateActionLabel;
        },
        currentPlanOption(): ManagePlanOption | null {
            if (!this.subscription) {
                return null;
            }

            const matchingPlan = this.subscription.availablePlans.find((plan) => plan.id === this.subscription.planId);
            if (matchingPlan) {
                return matchingPlan;
            }

            return {
                id: this.subscription.planId,
                label: this.subscription.plan,
                amount: this.subscription.amount,
                planIndex: this.subscription.planIndex,
            };
        },
        selectedPlanOption(): ManagePlanOption | null {
            if (!this.subscription) {
                return null;
            }

            return this.subscription.availablePlans.find((plan) => plan.id === this.selectedPlanId) || this.currentPlanOption;
        },
        selectedPlanChangeMode(): ManagePlanChangeMode | null {
            if (!this.subscription || !this.currentPlanOption || !this.selectedPlanOption) {
                return null;
            }

            const normalizedType = (this.subscription.subscribableType || "").trim().toLowerCase();
            if (normalizedType === "plan") {
                if (this.subscription.planIndex === null || this.selectedPlanOption.planIndex === null) {
                    return "period_end";
                }

                return this.selectedPlanOption.planIndex > this.subscription.planIndex ? "immediate" : "period_end";
            }

            const currentAmount = this.currentPlanOption.amount;
            const targetAmount = this.selectedPlanOption.amount;
            if (currentAmount === null || currentAmount === undefined || targetAmount === null || targetAmount === undefined) {
                return "period_end";
            }

            return targetAmount > currentAmount ? "immediate" : "period_end";
        },
        showPlanChangeSummary(): boolean {
            return !!this.subscription && !!this.selectedPlanOption && this.selectedPlanId !== this.subscription.planId;
        },
        showTokenPanel(): boolean {
            return false;
        },
        planChangeActionLabel(): string {
            if (this.selectedPlanChangeMode === "immediate") {
                return String(this.$t("Apply upgrade now"));
            }
            if (this.selectedPlanChangeMode === "period_end") {
                return String(this.$t("Schedule plan change"));
            }
            return String(this.$t("Apply plan change"));
        },
        planChangeSummaryText(): string {
            if (!this.subscription || !this.currentPlanOption || !this.selectedPlanOption) {
                return "";
            }

            const fromLabel = String(this.$t("You will move from"));
            const toLabel = String(this.$t("to"));

            const currentPrice = this.formatPrice(this.currentPlanOption.amount);
            const targetPrice = this.formatPrice(this.selectedPlanOption.amount);
            const baseText = `${fromLabel} ${currentPrice} ${toLabel} ${targetPrice}.`;

            if (this.selectedPlanChangeMode === "immediate") {
                return `${baseText} ${String(this.$t("This upgrade will be applied immediately."))}`;
            }

            if (this.subscription.renewalDate) {
                return `${baseText} ${String(this.$t("Your current access will remain active until"))} ${this.formatDate(
                    this.subscription.renewalDate,
                )}. ${String(this.$t("The selected plan will start at the end of the current billing cycle."))}`;
            }

            return `${baseText} ${String(this.$t("The selected plan will start at the end of the current billing cycle."))}`;
        },
        resolvedPlanChangeSummaryText(): string {
            return this.previewSummaryText || this.planChangeSummaryText;
        },
        normalizedRedeemTokens(): number {
            return Math.max(0, Math.floor(Number(this.redeemTokens) || 0));
        },
        normalizedAvailableTokenBalance(): number {
            return Math.max(0, Math.floor(Number(this.availableTokenBalance) || 0));
        },
        normalizedMaxApplicableTokens(): number {
            return Math.max(0, Math.floor(Number(this.maxApplicableTokens) || 0));
        },
        normalizedAppliedTokens(): number {
            return Math.max(0, Math.floor(Number(this.appliedTokens) || 0));
        },
        formattedTokenDiscount(): string {
            return this.formatPriceFromCents(Math.max(Number(this.tokenDiscountEurCents) || 0, 0), "EUR");
        },
        formattedFinalPayableAmount(): string {
            return this.formatPriceFromCents(Math.max(Number(this.finalPayableAmountEurCents) || 0, 0), "EUR");
        },
    },
    methods: {
        statusBadgeClass,
        close: function (): void {
            this.$closeModal();
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
        toggleTokensDropdown: function (): void {
            this.showTokensDropdown = !this.showTokensDropdown;
        },
        syncFromSubscription: function (): void {
            this.selectedPlanId = this.subscription?.planId || "";
            this.showTokensDropdown = false;
            this.activeAction = "";
        },
        selectPlan: function (planId: string): void {
            if (this.processing) {
                return;
            }

            this.selectedPlanId = planId;
            this.$emit("plan-selection-change", {
                subscriptionId: this.subscription?.id || "",
                planId: this.selectedPlanId,
                effective: this.selectedPlanChangeMode || "period_end",
            });
        },
        formatDate: function (dateIso: string): string {
            return formatDateLongIntl(dateIso, "en-ES");
        },
        formatPrice: function (amount: number | null): string {
            return formatPrice(amount, { locale: "en-EN", minimumFractionDigits: 2 });
        },
        formatPriceFromCents: function (amountCents: number, currency = "EUR"): string {
            return new Intl.NumberFormat("en-EN", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
            }).format((Number(amountCents) || 0) / 100);
        },
        formatPaymentStatus: function (status: string): string {
            const normalized = ((status || "") + "").replace(/_/g, " ");
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        },
        formatPaymentDate: function (timestamp: number): string {
            if (!timestamp) {
                return "-";
            }
            return new Intl.DateTimeFormat("en-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(new Date(timestamp));
        },
        statusLabel: function (status: ManageSubscriptionStatus, cancellationScheduled = false): string {
            if (status === "active") {
                return "Active";
            }
            if (status === "pending") {
                return cancellationScheduled ? "Cancellation scheduled" : "Pending";
            }
            return "Cancelled";
        },
        requestCancel: function (): void {
            if (!this.subscription || !this.canCancel) {
                return;
            }
            this.activeAction = "cancel";
            this.$emit("cancel-subscription", {
                subscriptionId: this.subscription.id,
            });
        },
        requestReactivate: function (): void {
            if (!this.subscription || !this.canReactivate) {
                return;
            }
            this.activeAction = "reactivate";
            this.$emit("reactivate-subscription", {
                subscriptionId: this.subscription.id,
            });
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
        requestViewPayment: function (): void {
            if (!this.subscription || !this.paymentSummary) {
                return;
            }
            this.$emit("view-payment", {
                subscriptionId: this.subscription.id,
                paymentId: this.paymentSummary.id,
            });
        },
        requestPrimaryAction: function (): void {
            this.requestReactivate();
        },
        requestPlanChange: function (): void {
            if (!this.subscription || !this.canApplyPlanChange) {
                return;
            }
            this.activeAction = "change-plan";
            this.$emit("change-plan", {
                subscriptionId: this.subscription.id,
                planId: this.selectedPlanId,
                effective: this.selectedPlanChangeMode || "period_end",
            });
        },
    },
    mounted: function () {
        this.syncFromSubscription();
    },
    watch: {
        display: function () {
            if (this.display) {
                this.syncFromSubscription();
            }
        },
        subscription: function () {
            this.syncFromSubscription();
        },
    },
});
</script>

<style scoped>
.manage-modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.manage-summary {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-12);
}

.manage-summary-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.manage-agent {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.manage-version {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.manage-current-plan {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
}

.manage-current-plan-label,
.manage-current-plan-name,
.manage-current-plan-meta {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-primary);
}

.manage-current-plan-label {
    font-weight: 600;
    color: var(--color-text-muted);
}

.manage-current-plan-name {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
}

.manage-current-plan-meta {
    color: var(--color-text-muted);
}

.manage-plan-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.manage-label {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.manage-plan-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
}

.manage-plan-option {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: flex-start;
    min-height: 44px;
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    padding: var(--space-12);
    text-align: left;
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.manage-plan-option.selected {
    border-color: var(--color-brand-secondary);
    background: var(--color-bg-surface);
    box-shadow: var(--elevation-1);
}

.manage-plan-option-name {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.manage-plan-option-price {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.manage-change-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
}

.manage-change-title,
.manage-change-text {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.manage-change-title {
    font-weight: 600;
    color: var(--color-text-primary);
}

.manage-change-text {
    color: var(--color-text-muted);
}

.manage-payment-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
}

.manage-payment-title,
.manage-payment-text {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.manage-payment-title {
    color: var(--color-text-primary);
    font-weight: 600;
}

.manage-payment-text {
    color: var(--color-text-muted);
}

.manage-payment-action {
    align-self: flex-start;
    min-height: 44px;
}

.manage-token-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
}

.manage-token-toggle {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: var(--space-8) var(--space-12);
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
}

.manage-token-panel-title,
.manage-token-panel-hint,
.manage-token-input-label,
.manage-token-summary-line,
.manage-token-total-amount {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.manage-token-panel-title,
.manage-token-input-label {
    color: var(--color-text-primary);
    font-weight: 600;
}

.manage-token-panel-hint {
    color: var(--color-text-muted);
}

.manage-discount-text {
    color: var(--color-discount);
    font-weight: 600;
}

.manage-token-toggle-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.manage-token-toggle-icon {
    color: var(--color-text-muted);
    transition: transform 0.2s ease;
}

.manage-token-toggle-icon.is-open {
    transform: rotate(180deg);
}

.manage-token-panel-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: 0 var(--space-12) var(--space-12);
}

.manage-token-input-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.manage-token-input {
    min-height: 44px;
    width: 100%;
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 20px;
    padding: var(--space-8) var(--space-12);
}

.manage-token-input:focus {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.manage-token-toggle:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.manage-token-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.manage-token-status {
    min-height: 20px;
}

.manage-token-status:not(.is-visible) {
    visibility: hidden;
}

.manage-token-summary-line {
    display: flex;
    justify-content: space-between;
    gap: var(--space-8);
    color: var(--color-text-primary);
}

.manage-token-total {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: var(--space-12);
    padding-top: var(--space-16);
    border-top: 1px solid var(--color-neutral-light);
}

.manage-token-total-price {
    display: flex;
    align-items: baseline;
    gap: var(--space-8);
}

.manage-token-total-amount {
    color: var(--color-text-primary);
    font-size: 24px;
    line-height: 32px;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.manage-plan-option:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

@media (max-width: 640px) {
    .manage-modal-body {
        gap: var(--space-12);
    }

    .manage-summary {
        flex-direction: column;
        align-items: flex-start;
    }

    .manage-current-plan-meta {
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .manage-payment-action {
        align-self: stretch;
        width: 100%;
    }
}
</style>
