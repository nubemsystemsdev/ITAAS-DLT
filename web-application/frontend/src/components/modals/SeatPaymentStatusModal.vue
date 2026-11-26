<template>
    <ModalDialogContainer v-model:display="displayStatus" :lock-close="isProcessing">
        <div class="modal-dialog modal-md seat-payment-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ titleText }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    :disabled="isProcessing"
                    @click="$emit('close')"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="status === 'ready'" class="modal-body seat-management-body">
                <p class="seat-payment-product">{{ productName }}</p>

                <div class="seat-management-current">
                    <div>
                        <span>{{ $t("Current seats") }}</span>
                        <strong>{{ baselineQuantity }}</strong>
                    </div>
                    <div>
                        <span>{{ $t("Assigned seats") }}</span>
                        <strong>{{ assignedQuantity }}</strong>
                    </div>
                </div>

                <div class="seat-management-field">
                    <span>{{ $t("Seats") }}</span>
                    <div class="seat-management-quantity-control" role="group" :aria-label="$t('Seats')">
                        <button
                            type="button"
                            class="seat-management-quantity-btn"
                            :title="$t('Decrease quantity')"
                            :aria-label="$t('Decrease quantity')"
                            :disabled="isProcessing || !canDecreaseDraftQuantity"
                            @click="decreaseDraftQuantity"
                        >
                            <i class="fas fa-minus" aria-hidden="true"></i>
                        </button>

                        <input
                            v-model="draftQuantityText"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            class="seat-management-quantity-input"
                            :disabled="isProcessing"
                            :aria-label="$t('Seats')"
                            @blur="commitDraftQuantity"
                            @keydown.enter.prevent="commitDraftQuantity"
                        />

                        <button
                            type="button"
                            class="seat-management-quantity-btn"
                            :title="$t('Increase quantity')"
                            :aria-label="$t('Increase quantity')"
                            :disabled="isProcessing"
                            @click="increaseDraftQuantity"
                        >
                            <i class="fas fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <p v-if="isDecrease" class="seat-management-note">
                    {{ $t("The seat reduction will be applied on your next billing cycle.") }}
                    {{ renewalText }}
                </p>
                <p v-else-if="isIncrease" class="seat-management-note">
                    {{ $t("The payment will be processed before the new seats become active.") }}
                </p>
            </div>

            <div v-else class="modal-body seat-payment-body" role="status" aria-live="polite">
                <div class="seat-payment-icon" :class="statusClass">
                    <i :class="statusIconClass" aria-hidden="true"></i>
                </div>
                <div class="seat-payment-copy">
                    <p class="seat-payment-product">{{ productName }}</p>
                    <p>{{ bodyText }}</p>
                    <p class="seat-payment-meta">{{ baselineQuantity }} -> {{ targetQuantity }} {{ $t("seats") }}</p>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="$emit('close')">
                    {{ status === "ready" || isProcessing ? $t("Cancel") : $t("Close") }}
                </button>
                <button
                    v-if="status === 'ready'"
                    type="button"
                    class="btn btn-primary"
                    :disabled="!canSubmit"
                    @click="$emit('submit', normalizedDraftQuantity)"
                >
                    {{ $t("Save") }}
                </button>
                <button v-else-if="!isProcessing && canRetry" type="button" class="btn btn-primary" @click="$emit('retry')">
                    {{ $t("Retry") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { useVModel } from "@/utils/v-model";

type SeatPaymentModalStatus = "ready" | "processing" | "success" | "scheduled" | "failed" | "timeout" | "error";

export default defineComponent({
    name: "SeatPaymentStatusModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "close", "retry", "submit"],
    props: {
        display: Boolean,
        status: {
            type: String as PropType<SeatPaymentModalStatus>,
            default: "ready",
        },
        productName: {
            type: String,
            default: "",
        },
        assignedQuantity: {
            type: Number,
            default: 0,
        },
        baselineQuantity: {
            type: Number,
            default: 0,
        },
        targetQuantity: {
            type: Number,
            default: 0,
        },
        scheduledQuantity: {
            type: Number,
            default: 0,
        },
        billingCycle: {
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
            draftQuantityText: "1",
        };
    },
    computed: {
        isProcessing(): boolean {
            return this.status === "processing";
        },
        minQuantity(): number {
            return 1;
        },
        parsedDraftQuantity(): number | null {
            const trimmed = (this.draftQuantityText || "").trim();
            if (!trimmed) {
                return null;
            }
            const numeric = Number.parseInt(trimmed, 10);
            if (!Number.isFinite(numeric)) {
                return null;
            }
            return Math.floor(numeric);
        },
        normalizedDraftQuantity(): number {
            const parsed = this.parsedDraftQuantity;
            if (parsed === null) {
                return this.minQuantity;
            }
            return Math.max(this.minQuantity, parsed);
        },
        isDraftQuantityValid(): boolean {
            const parsed = this.parsedDraftQuantity;
            return parsed !== null && parsed >= this.minQuantity;
        },
        canDecreaseDraftQuantity(): boolean {
            return this.normalizedDraftQuantity > this.minQuantity;
        },
        isIncrease(): boolean {
            return this.isDraftQuantityValid && this.normalizedDraftQuantity > this.baselineQuantity;
        },
        isDecrease(): boolean {
            return this.isDraftQuantityValid && this.normalizedDraftQuantity < this.baselineQuantity;
        },
        canSubmit(): boolean {
            if (!this.isDraftQuantityValid) {
                return false;
            }
            if (this.scheduledQuantity > 0) {
                return this.normalizedDraftQuantity !== this.scheduledQuantity;
            }
            return this.normalizedDraftQuantity !== this.baselineQuantity;
        },
        renewalText(): string {
            const normalizedCycle = (this.billingCycle || "").trim().toLowerCase();
            if (normalizedCycle === "annual") {
                return String(this.$t("Your annual payment will be updated next year."));
            }
            return String(this.$t("Your monthly payment will be updated next month."));
        },
        canRetry(): boolean {
            return this.status === "failed" || this.status === "timeout" || this.status === "error";
        },
        titleText(): string {
            if (this.status === "ready") {
                return String(this.$t("Manage seats"));
            }
            if (this.status === "success") {
                return String(this.$t("Seats updated"));
            }
            if (this.status === "scheduled") {
                return String(this.$t("Seat change scheduled"));
            }
            if (this.status === "failed") {
                return String(this.$t("Payment failed"));
            }
            if (this.status === "timeout") {
                return String(this.$t("Payment still pending"));
            }
            if (this.status === "error") {
                return String(this.$t("Could not update seats"));
            }
            return String(this.$t("Processing payment"));
        },
        bodyText(): string {
            if (this.status === "success") {
                return String(this.$t("The new seat quantity is active."));
            }
            if (this.status === "scheduled") {
                return String(this.$t("The seat reduction has been scheduled for the next billing cycle."));
            }
            if (this.status === "failed") {
                return String(this.$t("The payment was not completed and the seat quantity was not changed."));
            }
            if (this.status === "timeout") {
                return String(this.$t("The payment is taking longer than expected. You can retry the status check in a moment."));
            }
            if (this.status === "error") {
                return String(this.$t("The seat update could not be processed right now."));
            }
            if (this.targetQuantity < this.baselineQuantity) {
                return String(this.$t("Processing seat reduction..."));
            } else if (this.targetQuantity > this.baselineQuantity) {
                return String(this.$t("Processing payment..."));
            }
            return String(this.$t("Reverting seat changes..."));
        },
        statusClass(): string {
            return `seat-payment-icon--${this.status}`;
        },
        statusIconClass(): string {
            if (this.status === "success" || this.status === "scheduled") {
                return "fas fa-check";
            }
            if (this.status === "processing") {
                return "fas fa-spinner fa-spin";
            }
            return "fas fa-exclamation";
        },
    },
    methods: {
        resetDraftQuantity: function (): void {
            const nextQuantity = Math.max(
                this.minQuantity,
                Math.floor(Number(this.scheduledQuantity || this.targetQuantity || this.baselineQuantity || this.minQuantity)),
            );
            this.draftQuantityText = String(nextQuantity);
        },
        commitDraftQuantity: function (): void {
            this.draftQuantityText = String(this.normalizedDraftQuantity);
        },
        decreaseDraftQuantity: function (): void {
            this.draftQuantityText = String(Math.max(this.minQuantity, this.normalizedDraftQuantity - 1));
        },
        increaseDraftQuantity: function (): void {
            this.draftQuantityText = String(this.normalizedDraftQuantity + 1);
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
    },
    watch: {
        display: function (): void {
            if (this.display) {
                this.resetDraftQuantity();
            }
        },
        targetQuantity: function (): void {
            if (this.status === "ready") {
                this.resetDraftQuantity();
            }
        },
        status: function (): void {
            if (this.status === "ready") {
                this.resetDraftQuantity();
            }
        },
    },
});
</script>

<style>
@import "@/style/layout/organization-license-page.css";
</style>
