<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg itaas-platform-request-tracking-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Request tracking") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="request" class="modal-body">
                <div class="itaas-platform-request-tracking-summary">
                    <div class="itaas-platform-request-tracking-summary-text">
                        <div class="itaas-platform-request-tracking-meta-row">
                            <p class="itaas-platform-request-type">{{ formatRequestType(request.requestType) }}</p>
                            <span class="status-badge" :class="statusBadgeClass(request.status, requestStatusToneMap)" role="status">
                                {{ formatStatus(request.status) }}
                            </span>
                        </div>
                        <h2 class="itaas-platform-request-tracking-title">{{ requestTitle }}</h2>
                        <p class="itaas-platform-request-tracking-id" :title="request.id">
                            {{ truncateMiddle(request.id, 20) }}
                        </p>
                    </div>
                </div>

                <p v-if="request.adminRejectionReason" class="itaas-platform-request-note itaas-platform-request-tracking-rejection">
                    <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
                    <span>
                        <strong>{{ $t("Rejection reason") }}:</strong>
                        {{ request.adminRejectionReason }}
                    </span>
                </p>

                <ol class="itaas-platform-request-timeline" :aria-label="$t('Request phase history')">
                    <li
                        v-for="(step, index) in trackingSteps"
                        :key="step.id"
                        class="itaas-platform-request-timeline-item"
                        :class="{
                            done: currentStepIndex > index,
                            current: !isTerminalStatus && currentStepIndex === index,
                            terminal: isTerminalStatus && step.id === 'closed',
                        }"
                    >
                        <span class="itaas-platform-request-timeline-marker" aria-hidden="true">
                            <i v-if="isTerminalStatus && step.id === 'closed'" class="fas fa-xmark"></i>
                            <i v-else-if="currentStepIndex > index" class="fas fa-check"></i>
                            <span v-else>{{ index + 1 }}</span>
                        </span>
                        <div class="itaas-platform-request-timeline-content">
                            <p class="itaas-platform-request-timeline-title">{{ step.label }}</p>
                            <p class="itaas-platform-request-timeline-description">{{ step.description }}</p>
                            <p v-if="index === 0" class="itaas-platform-request-timeline-meta">
                                {{ $t("Submitted") }}: {{ formatTimestamp(request.createdAt) }}
                            </p>
                            <p v-else-if="currentStepIndex === index" class="itaas-platform-request-timeline-meta">
                                {{ $t("Last update") }}: {{ formatTimestamp(request.updatedAt) }}
                            </p>
                        </div>
                    </li>
                </ol>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">{{ $t("Close") }}</button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import type { ItaasCustomAgentRequestItem } from "@/api/definitions";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { statusBadgeClass } from "@/utils/status-badge";
import { truncateMiddle } from "@/utils/text";
import { renderDateAndTime } from "@/utils/time-utils";
import { useVModel } from "@/utils/v-model";
import { defineComponent, type PropType } from "vue";

type TrackingStep = {
    id: string;
    label: string;
    description: string;
};

const REQUEST_STATUS_TONE_MAP: Record<string, "success" | "warning" | "error" | "muted"> = {
    pending_review: "warning",
    rejected: "error",
    pending_payment: "warning",
    in_development: "warning",
    delivered: "success",
    cancelled: "muted",
};

const ACTIVE_STATUS_STEP_ID: Record<string, string> = {
    pending_review: "review",
    pending_payment: "payment",
    in_development: "development",
    delivered: "delivered",
};

export default defineComponent({
    name: "ItaasPlatformRequestTrackingModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display"],
    props: {
        display: Boolean,
        request: {
            type: Object as PropType<ItaasCustomAgentRequestItem | null>,
            default: null,
        },
        depositFormatted: {
            type: String,
            default: "",
        },
        monthlyFormatted: {
            type: String,
            default: "",
        },
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            requestStatusToneMap: REQUEST_STATUS_TONE_MAP,
        };
    },
    computed: {
        requestStatus: function (): string {
            return (this.request?.status || "").trim().toLowerCase();
        },
        closedFromStatus: function (): string {
            return (this.request?.closedFromStatus || "").trim().toLowerCase();
        },
        trackingSteps: function (): TrackingStep[] {
            const submitted: TrackingStep = {
                id: "submitted",
                label: this.$t("Request submitted"),
                description: this.$t("Your request has been received by the team."),
            };
            const review: TrackingStep = {
                id: "review",
                label: this.$t("Under review"),
                description: this.$t("The team is reviewing your custom agent request."),
            };
            const payment: TrackingStep = {
                id: "payment",
                label: this.$t("Deposit payment"),
                description: this.depositFormatted
                    ? this.$t("Pay the {0} deposit to start development of your custom agent.").replace("{0}", this.depositFormatted)
                    : this.$t("Pay the deposit to start development of your custom agent."),
            };
            const development: TrackingStep = {
                id: "development",
                label: this.$t("In development"),
                description: this.$t("The flow is being configured and tested for your organization."),
            };
            const delivered: TrackingStep = {
                id: "delivered",
                label: this.$t("Delivered"),
                description: this.monthlyFormatted
                    ? this.$t("The flow is ready to use. The monthly fee of {0} is now active.").replace("{0}", this.monthlyFormatted)
                    : this.$t("The flow is ready to use in your Flowise workspace."),
            };
            const closed: TrackingStep = {
                id: "closed",
                label: this.terminalStepLabel,
                description: this.terminalStepDescription,
            };

            if (this.requestStatus === "cancelled") {
                if (this.closedFromStatus === "pending_payment") {
                    return [submitted, review, closed];
                }
                return [submitted, closed];
            }

            if (this.requestStatus === "rejected") {
                return [submitted, review, closed];
            }

            return [submitted, review, payment, development, delivered, closed];
        },
        isTerminalStatus: function (): boolean {
            return this.requestStatus === "rejected" || this.requestStatus === "cancelled";
        },
        currentStepIndex: function (): number {
            if (!this.request) {
                return 0;
            }
            if (this.isTerminalStatus) {
                return Math.max(0, this.trackingSteps.length - 1);
            }
            const stepId = ACTIVE_STATUS_STEP_ID[this.requestStatus];
            const index = this.trackingSteps.findIndex((step) => step.id === stepId);
            return index >= 0 ? index : 0;
        },
        terminalStepLabel: function (): string {
            switch (this.requestStatus) {
                case "rejected":
                    return this.$t("Rejected");
                case "cancelled":
                    return this.$t("Cancelled");
                default:
                    return this.$t("Request closed");
            }
        },
        terminalStepDescription: function (): string {
            switch (this.requestStatus) {
                case "rejected":
                    return this.$t("The team rejected this request.");
                case "cancelled":
                    return this.$t("This request was cancelled.");
                default:
                    return this.$t("This request will not continue through the implementation process.");
            }
        },
        requestTitle: function (): string {
            if (!this.request) {
                return "";
            }
            const firstLine = (this.request.description || "").split(/\r?\n/)[0].trim();
            const separatorIndex = firstLine.indexOf(":");
            if (separatorIndex > 0 && ["title", "título"].includes(firstLine.substring(0, separatorIndex).trim().toLowerCase())) {
                return firstLine.substring(separatorIndex + 1).trim() || this.$t("Untitled request");
            }
            return firstLine || this.$t("Untitled request");
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        formatRequestType: function (requestType: string): string {
            return (requestType || "").trim().toLowerCase() === "adaptation"
                ? this.$t("Adaptation of existing flow")
                : this.$t("Custom flow");
        },
        formatStatus: function (status: string): string {
            switch ((status || "").trim().toLowerCase()) {
                case "pending_review":
                    return this.$t("Pending review");
                case "rejected":
                    return this.$t("Rejected");
                case "pending_payment":
                    return this.$t("Payment pending");
                case "in_development":
                    return this.$t("In development");
                case "delivered":
                    return this.$t("Delivered");
                case "cancelled":
                    return this.$t("Cancelled");
                default:
                    return this.$t("Request status");
            }
        },
        formatTimestamp: function (timestamp: number): string {
            return timestamp ? renderDateAndTime(timestamp, this.$t) : this.$t("Not available");
        },
        close: function (): void {
            this.displayStatus = false;
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
    },
});
</script>

<style>
@import "@/style/layout/itaas-platform.css";
</style>
