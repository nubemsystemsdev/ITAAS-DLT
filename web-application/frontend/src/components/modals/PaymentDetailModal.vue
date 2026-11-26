<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Payment details") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="payment" class="modal-body modal-detail-body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <p class="modal-detail-amount">{{ payment.amount }}</p>
                        <p class="modal-detail-meta">{{ payment.client }}</p>
                    </div>
                    <span :class="statusBadgeClass(payment.statusVariant, paymentStatusToneMap)" role="status">
                        {{ payment.statusDisplay }}
                    </span>
                </div>

                <div class="modal-message-grid" role="table" :aria-label="$t('Payment details')">
                    <div v-for="row in detailRows" :key="row.id" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <p class="modal-message-value" role="cell">
                            {{ row.value }}
                        </p>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Close") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { PAYMENT_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { useVModel } from "@/utils/v-model";

export type PaymentDetailView = {
    paymentId: string;
    stripeId?: string;
    statusDisplay: string;
    statusVariant: string;
    amount: string;
    client: string;
    method: string;
    date: string;
    reference?: string;
    provider?: string;
};

type PaymentDetailRow = {
    id: string;
    label: string;
    value: string;
    mono?: boolean;
};

export default defineComponent({
    name: "PaymentDetailModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display"],
    props: {
        display: Boolean,
        payment: {
            type: Object as PropType<PaymentDetailView | null>,
            default: null,
        },
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            paymentStatusToneMap: PAYMENT_STATUS_TONE_MAP,
        };
    },
    computed: {
        detailRows: function (): PaymentDetailRow[] {
            if (!this.payment) {
                return [];
            }

            const provider = (this.payment.provider || "").trim().toLowerCase();
            const stripeId = (this.payment.stripeId || "").trim();

            const rows: PaymentDetailRow[] = [
                {
                    id: "payment-id",
                    label: String(this.$t("Payment id")),
                    value: this.payment.paymentId,
                    mono: true,
                },
                {
                    id: "method",
                    label: String(this.$t("Method")),
                    value: this.payment.method,
                },
                {
                    id: "date",
                    label: String(this.$t("Date")),
                    value: this.payment.date,
                },
            ];

            if (provider === "stripe" && /^(pi_|cs_)/.test(stripeId)) {
                rows.push({
                    id: "stripe-id",
                    label: String(this.$t("Stripe id")),
                    value: stripeId,
                    mono: true,
                });
            }

            if (this.payment.reference) {
                rows.push({
                    id: "reference",
                    label: String(this.$t("Reference")),
                    value: this.payment.reference,
                    mono: true,
                });
            }

            if (this.payment.provider) {
                rows.push({
                    id: "provider",
                    label: String(this.$t("Provider")),
                    value: this.payment.provider,
                });
            }

            return rows;
        },
    },
    methods: {
        statusBadgeClass,
        close: function () {
            this.$closeModal();
        },
        escapeToClose: function (event: KeyboardEvent) {
            if (event.key === "Escape") {
                this.close();
            }
        },
        stopPropagationEvent: function (e: Event) {
            e.stopPropagation();
        },
    },
    mounted: function () {
        if (this.display) {
            this.$autoFocus();
        }
    },
    watch: {
        display: function () {
            if (this.display) {
                this.$autoFocus();
            }
        },
    },
});
</script>
