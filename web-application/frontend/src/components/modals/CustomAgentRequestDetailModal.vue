<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg custom-agent-request-detail-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Custom agent request details") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="request" class="modal-body modal-detail-body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <div class="custom-agent-request-detail-meta-row">
                            <p class="modal-detail-meta">{{ formatRequestType(request.requestType) }}</p>
                            <span :class="statusBadgeClass(request.status, requestStatusToneMap)" role="status">
                                {{ formatStatus(request.status) }}
                            </span>
                        </div>
                        <p class="modal-detail-amount">{{ requestTitle }}</p>
                        <div class="custom-agent-request-detail-id-row">
                            <p class="modal-detail-meta custom-agent-request-detail-id" :title="request.id">
                                {{ truncateMiddle(request.id, 20) }}
                            </p>
                            <CopyIconButton :text="request.id" label="Copy request ID" success-message="Copied to clipboard!" />
                        </div>
                    </div>
                </div>

                <p v-if="request.adminRejectionReason" class="itaas-platform-request-note">
                    <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
                    <span>
                        <strong>{{ $t("Rejection reason") }}:</strong>
                        {{ request.adminRejectionReason }}
                    </span>
                </p>

                <section class="custom-agent-request-detail-section" :aria-label="$t('Request description')">
                    <dl class="custom-agent-request-detail-fields">
                        <div class="custom-agent-request-detail-field">
                            <dt>{{ $t("Description") }}</dt>
                            <dd class="custom-agent-request-detail-description">{{ requestDescription }}</dd>
                        </div>
                        <div v-for="row in metadataRows" :key="row.id" class="custom-agent-request-detail-field">
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.value }}</dd>
                        </div>
                    </dl>
                </section>

                <div class="modal-message-grid" role="table" :aria-label="$t('Custom agent request details')">
                    <div v-for="row in detailRows" :key="row.id" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <div class="modal-message-value custom-agent-request-detail-value" role="cell">
                            <p class="custom-agent-request-detail-value-text" :title="row.copyText || row.linkTitle || row.value">
                                <router-link
                                    v-if="row.linkTo"
                                    class="link-deco"
                                    :to="row.linkTo"
                                    :title="row.linkTitle || row.value"
                                    :aria-label="$t('Clients view client details')"
                                >
                                    {{ row.value }}
                                </router-link>
                                <template v-else>{{ row.value }}</template>
                            </p>
                            <CopyIconButton
                                v-if="row.copyText"
                                :text="row.copyText"
                                :label="row.copyLabel || 'Copy'"
                                success-message="Copied to clipboard!"
                            />
                        </div>
                    </div>
                </div>

                <section class="custom-agent-request-detail-section" :aria-label="$t('Request phase history')">
                    <h3 class="custom-agent-request-detail-section-title">{{ $t("Request tracking") }}</h3>
                    <ol class="itaas-platform-request-timeline">
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
                </section>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="busy" @click="close">{{ $t("Close") }}</button>
                <div v-if="canCancel || canReject || canAccept || canDeliver" class="custom-agent-request-detail-footer-actions">
                    <button v-if="canCancel" type="button" class="btn btn-danger" :disabled="busy" @click="emitCancel">
                        <i :class="actionLoading === 'cancel' ? 'fas fa-spinner fa-spin' : 'fas fa-ban'" aria-hidden="true"></i>
                        {{ $t("Cancel") }}
                    </button>
                    <button v-if="canReject" type="button" class="btn btn-danger" :disabled="busy" @click="emitReject">
                        <i :class="actionLoading === 'reject' ? 'fas fa-spinner fa-spin' : 'fas fa-times'" aria-hidden="true"></i>
                        {{ $t("Reject") }}
                    </button>
                    <button v-if="canAccept" type="button" class="btn btn-primary" :disabled="busy" @click="emitAccept">
                        <i :class="actionLoading === 'accept' ? 'fas fa-spinner fa-spin' : 'fas fa-check'" aria-hidden="true"></i>
                        {{ $t("Accept") }}
                    </button>
                    <button v-if="canDeliver" type="button" class="btn btn-primary" :disabled="busy" @click="emitDeliver">
                        <i :class="actionLoading === 'deliver' ? 'fas fa-spinner fa-spin' : 'fas fa-truck'" aria-hidden="true"></i>
                        {{ $t("Deliver") }}
                    </button>
                </div>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import type { ItaasCustomAgentRequestItem } from "@/api/definitions";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { statusBadgeClass } from "@/utils/status-badge";
import { truncateMiddle } from "@/utils/text";
import { renderDateAndTime } from "@/utils/time-utils";
import { useVModel } from "@/utils/v-model";
import { defineComponent, type PropType } from "vue";

type DetailRow = {
    id: string;
    label: string;
    value: string;
    linkTo?: { name: string; params: { clientId: string } };
    linkTitle?: string;
    copyText?: string;
    copyLabel?: string;
};

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

const REQUEST_FIELD_LABELS = {
    pattern: ["desired pattern", "patrón deseado"],
    integrations: ["integrations / credentials", "integraciones / credenciales"],
    priority: ["priority", "prioridad"],
} as const;

export default defineComponent({
    name: "CustomAgentRequestDetailModal",
    components: {
        CopyIconButton,
        ModalDialogContainer,
    },
    emits: ["update:display", "accept", "reject", "deliver", "cancel"],
    props: {
        display: Boolean,
        busy: Boolean,
        actionLoading: {
            type: String as PropType<"" | "accept" | "cancel" | "reject" | "deliver">,
            default: "",
        },
        request: {
            type: Object as PropType<ItaasCustomAgentRequestItem | null>,
            default: null,
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
        requestTitle: function (): string {
            if (!this.request) {
                return "";
            }
            return this.getRequestTitle(this.request.description);
        },
        requestDescription: function (): string {
            if (!this.request) {
                return "";
            }
            return this.getRequestDescription(this.request.description);
        },
        requesterDisplayName: function (): string {
            if (!this.request) {
                return "—";
            }
            const username = (this.request.requesterUsername || "").trim();
            if (username) {
                return username;
            }
            const userId = (this.request.requesterUserId || "").trim();
            return userId || "—";
        },
        metadataRows: function (): DetailRow[] {
            if (!this.request) {
                return [];
            }
            const rows: DetailRow[] = [];
            const pattern = this.getRequestField(this.request.description, "pattern");
            const integrations = this.getRequestField(this.request.description, "integrations");
            const priority = this.getRequestField(this.request.description, "priority");
            if (pattern) {
                rows.push({ id: "pattern", label: String(this.$t("Desired pattern")), value: pattern });
            }
            if (integrations) {
                rows.push({ id: "integrations", label: String(this.$t("Integrations / credentials")), value: integrations });
            }
            if (priority) {
                rows.push({ id: "priority", label: String(this.$t("Priority")), value: priority });
            }
            return rows;
        },
        detailRows: function (): DetailRow[] {
            if (!this.request) {
                return [];
            }
            const rows: DetailRow[] = [
                {
                    id: "request-id",
                    label: String(this.$t("Request ID")),
                    value: truncateMiddle(this.request.id, 20),
                    copyText: this.request.id,
                    copyLabel: "Copy request ID",
                },
                {
                    id: "type",
                    label: String(this.$t("Type")),
                    value: this.formatRequestType(this.request.requestType),
                },
                {
                    id: "requester",
                    label: String(this.$t("Requester")),
                    value: this.requesterDisplayName,
                    linkTo: this.request.requesterUserId
                        ? { name: "clients-client-detail", params: { clientId: this.request.requesterUserId } }
                        : undefined,
                    linkTitle: this.request.requesterUsername || this.request.requesterUserId || undefined,
                },
            ];
            if ((this.request.organizationId || "").trim()) {
                rows.push({
                    id: "organization",
                    label: String(this.$t("Organization")),
                    value: truncateMiddle(this.request.organizationId, 20),
                    copyText: this.request.organizationId,
                    copyLabel: "Copy organization ID",
                });
            }
            if ((this.request.baseAgentId || "").trim()) {
                rows.push({
                    id: "base-agent",
                    label: String(this.$t("Base agent ID")),
                    value: truncateMiddle(this.request.baseAgentId, 20),
                    copyText: this.request.baseAgentId,
                    copyLabel: "Copy base agent ID",
                });
            }
            if ((this.request.baseFlowiseFlowId || "").trim()) {
                rows.push({
                    id: "base-flow",
                    label: String(this.$t("Base flow ID")),
                    value: truncateMiddle(this.request.baseFlowiseFlowId, 20),
                    copyText: this.request.baseFlowiseFlowId,
                    copyLabel: "Copy flow ID",
                });
            }
            if ((this.request.paymentId || "").trim()) {
                rows.push({
                    id: "payment",
                    label: String(this.$t("Payment ID")),
                    value: truncateMiddle(this.request.paymentId, 20),
                    copyText: this.request.paymentId,
                    copyLabel: "Copy payment ID",
                });
            }
            if ((this.request.deliveredFlowiseFlowId || "").trim()) {
                rows.push({
                    id: "delivered-flow",
                    label: String(this.$t("Delivered flow ID")),
                    value: truncateMiddle(this.request.deliveredFlowiseFlowId, 20),
                    copyText: this.request.deliveredFlowiseFlowId,
                    copyLabel: "Copy flow ID",
                });
            }
            if ((this.request.monthlySubscriptionId || "").trim()) {
                rows.push({
                    id: "subscription",
                    label: String(this.$t("Monthly subscription ID")),
                    value: truncateMiddle(this.request.monthlySubscriptionId, 20),
                    copyText: this.request.monthlySubscriptionId,
                    copyLabel: "Copy subscription ID",
                });
            }
            rows.push(
                {
                    id: "requested",
                    label: String(this.$t("Requested")),
                    value: this.formatTimestamp(this.request.createdAt),
                },
                {
                    id: "updated",
                    label: String(this.$t("Last update")),
                    value: this.formatTimestamp(this.request.updatedAt),
                },
            );
            if (this.request.closedFromStatus) {
                rows.push({
                    id: "closed-from",
                    label: String(this.$t("Closed from status")),
                    value: this.formatStatus(this.request.closedFromStatus),
                });
            }
            return rows;
        },
        trackingSteps: function (): TrackingStep[] {
            const submitted: TrackingStep = {
                id: "submitted",
                label: this.$t("Request submitted"),
                description: this.$t("The request was received and is awaiting admin review."),
            };
            const review: TrackingStep = {
                id: "review",
                label: this.$t("Under review"),
                description: this.$t("The ITAAS team is reviewing this custom agent request."),
            };
            const payment: TrackingStep = {
                id: "payment",
                label: this.$t("Deposit payment"),
                description: this.$t("Waiting for the requester to pay the deposit."),
            };
            const development: TrackingStep = {
                id: "development",
                label: this.$t("In development"),
                description: this.$t("The custom agent is being configured for the requester."),
            };
            const delivered: TrackingStep = {
                id: "delivered",
                label: this.$t("Delivered"),
                description: this.$t("The flow was assigned and the monthly subscription is active."),
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
            return [submitted, review, payment, development, delivered];
        },
        isTerminalStatus: function (): boolean {
            return this.requestStatus === "rejected" || this.requestStatus === "cancelled";
        },
        canAccept: function (): boolean {
            return this.requestStatus === "pending_review";
        },
        canReject: function (): boolean {
            return this.requestStatus === "pending_review";
        },
        canDeliver: function (): boolean {
            return this.requestStatus === "in_development";
        },
        canCancel: function (): boolean {
            return this.requestStatus === "pending_payment";
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
                    return this.$t("The ITAAS team rejected this request.");
                case "cancelled":
                    return this.$t("This request was cancelled.");
                default:
                    return this.$t("This request will not continue through the implementation process.");
            }
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        getRequestTitle: function (description: string): string {
            const firstLine = (description || "").split(/\r?\n/)[0].trim();
            const separatorIndex = firstLine.indexOf(":");
            if (separatorIndex > 0) {
                const key = firstLine.substring(0, separatorIndex).trim().toLowerCase();
                if (key === "title" || key === "título" || key === "titre" || key === "titel") {
                    return firstLine.substring(separatorIndex + 1).trim() || this.$t("Untitled request");
                }
            }
            return firstLine || this.$t("Untitled request");
        },
        getRequestDescription: function (description: string): string {
            const lines = (description || "").split(/\r?\n/);
            const firstLine = (lines[0] || "").trim().toLowerCase();
            const titlePrefixes = ["title:", "título:", "titre:", "titel:"];
            const metadataPrefixes = Object.values(REQUEST_FIELD_LABELS).flatMap((labels) => labels.map((label) => `${label}:`));
            if (titlePrefixes.some((prefix) => firstLine.startsWith(prefix))) {
                lines.shift();
            }
            return (
                lines
                    .filter((line) => !metadataPrefixes.some((prefix) => line.trim().toLowerCase().startsWith(prefix)))
                    .join("\n")
                    .trim() || this.$t("No additional details")
            );
        },
        getRequestField: function (description: string, field: keyof typeof REQUEST_FIELD_LABELS): string {
            const labels = REQUEST_FIELD_LABELS[field];
            const line = (description || "").split(/\r?\n/).find((item) => {
                const normalized = item.trim().toLowerCase();
                return labels.some((label) => normalized.startsWith(`${label}:`));
            });
            if (!line) {
                return "";
            }
            return line.substring(line.indexOf(":") + 1).trim();
        },
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
        emitAccept: function (): void {
            if (this.busy || !this.canAccept) {
                return;
            }
            this.$emit("accept");
        },
        emitReject: function (): void {
            if (this.busy || !this.canReject) {
                return;
            }
            this.$emit("reject");
        },
        emitDeliver: function (): void {
            if (this.busy || !this.canDeliver) {
                return;
            }
            this.$emit("deliver");
        },
        emitCancel: function (): void {
            if (this.busy || !this.canCancel) {
                return;
            }
            this.$emit("cancel");
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
    },
});
</script>

<style scoped>
.custom-agent-request-detail-modal .modal-detail-summary-text {
    flex: 1 1 auto;
    width: 100%;
}

.custom-agent-request-detail-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
}

.custom-agent-request-detail-meta-row .modal-detail-meta {
    min-width: 0;
    flex: 1 1 auto;
}

.custom-agent-request-detail-meta-row .status-badge {
    flex: 0 0 auto;
    white-space: nowrap;
    min-height: 24px;
    padding: var(--space-4) var(--space-8);
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
}

.custom-agent-request-detail-id-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
}

.custom-agent-request-detail-id {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.custom-agent-request-detail-id-row :deep(.copy-icon-button),
.custom-agent-request-detail-value :deep(.copy-icon-button) {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    margin: 0;
}

.custom-agent-request-detail-value {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    width: 100%;
}

.custom-agent-request-detail-value-text {
    margin: 0;
    min-width: 0;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.custom-agent-request-detail-value:has(.copy-icon-button) .custom-agent-request-detail-value-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: normal;
    overflow-wrap: normal;
}

.custom-agent-request-detail-section-title {
    margin: 0 0 var(--space-12);
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.custom-agent-request-detail-fields {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.custom-agent-request-detail-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.custom-agent-request-detail-fields dt {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--color-text-muted);
}

.custom-agent-request-detail-fields dd {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;
    color: var(--color-text-primary);
    white-space: pre-wrap;
    word-break: break-word;
}

.custom-agent-request-detail-description {
    color: var(--color-text-primary);
}

.custom-agent-request-detail-modal .modal-footer {
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-12);
}

.custom-agent-request-detail-modal .modal-footer .btn {
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
}

.custom-agent-request-detail-footer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-12);
    margin-left: auto;
}
</style>

<style>
@import "@/style/layout/itaas-platform.css";
</style>
