<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Event details") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="event" class="modal-body modal-detail-body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <p class="modal-detail-amount">{{ event.eventLabel }}</p>
                        <p class="modal-detail-meta">{{ occurredLabel }}</p>
                    </div>
                    <span v-if="event.status" :class="statusBadgeClass(event.status, agentExecutionStatusToneMap)" role="status">
                        {{ formatStatus(event.status) }}
                    </span>
                </div>

                <div class="modal-message-grid itaas-event-detail-grid" role="table" :aria-label="$t('Event details')">
                    <div v-for="row in detailRows" :key="row.id" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <div class="modal-message-value itaas-event-detail-value" role="cell">
                            <p class="itaas-event-detail-value-text itaas-event-detail-value-text--mono">{{ row.value }}</p>
                            <CopyIconButton
                                v-if="row.copyText"
                                :text="row.copyText"
                                :label="row.copyLabel || 'Copy'"
                                success-message="Copied to clipboard!"
                            />
                        </div>
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
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { AGENT_EXECUTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { renderDateAndTime } from "@/utils/time-utils";
import { useVModel } from "@/utils/v-model";

export type ItaasPlatformEventDetailView = {
    id: string;
    eventId: string;
    eventType: string;
    eventLabel: string;
    status: string;
    flowId: string;
    executionId: string;
    organizationId: string;
    actor: string;
    startedAt: number;
    finishedAt: number;
    occurredAt: number;
    createdAt: number;
    anchoredAt: number;
    txHash: string;
    output: string;
};

type DetailRow = {
    id: string;
    label: string;
    value: string;
    copyText?: string;
    copyLabel?: string;
};

function displayValue(value: string | undefined | null): string {
    return (value || "").trim();
}

export default defineComponent({
    name: "ItaasPlatformEventDetailModal",
    components: {
        CopyIconButton,
        ModalDialogContainer,
    },
    emits: ["update:display"],
    props: {
        display: Boolean,
        event: {
            type: Object as PropType<ItaasPlatformEventDetailView | null>,
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
            agentExecutionStatusToneMap: AGENT_EXECUTION_STATUS_TONE_MAP,
        };
    },
    computed: {
        occurredLabel: function (): string {
            if (!this.event) {
                return "-";
            }
            return this.formatTimestamp(this.event.occurredAt || this.event.finishedAt || this.event.createdAt) || "-";
        },
        detailRows: function (): DetailRow[] {
            if (!this.event) {
                return [];
            }

            const rows: DetailRow[] = [];
            const pushRow = function (row: DetailRow): void {
                if (!row.value) {
                    return;
                }
                rows.push(row);
            };

            const executionId = displayValue(this.event.executionId);
            pushRow({
                id: "execution-id",
                label: String(this.$t("Execution ID")),
                value: executionId,
                copyText: executionId || undefined,
                copyLabel: "Copy execution ID",
            });

            const flowId = displayValue(this.event.flowId);
            pushRow({
                id: "flow-id",
                label: String(this.$t("Flow ID")),
                value: flowId,
                copyText: flowId || undefined,
                copyLabel: "Copy flow ID",
            });

            const txHash = displayValue(this.event.txHash);
            if (txHash && txHash !== "-") {
                pushRow({
                    id: "tx-hash",
                    label: String(this.$t("Transaction hash")),
                    value: txHash,
                    copyText: txHash,
                    copyLabel: "Copy transaction hash",
                });
            }

            return rows;
        },
    },
    methods: {
        statusBadgeClass,
        formatStatus: function (status: string): string {
            const normalized = (status || "").trim().toLowerCase();
            return normalized || "-";
        },
        formatTimestamp: function (timestamp: number): string {
            if (!timestamp) {
                return "";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        close: function (): void {
            this.$closeModal();
        },
        stopPropagationEvent: function (e: Event): void {
            e.stopPropagation();
        },
    },
    mounted: function () {
        if (this.display) {
            this.$autoFocus();
        }
    },
    watch: {
        display: function (): void {
            if (this.display) {
                this.$autoFocus();
            }
        },
    },
});
</script>

<style scoped>
.itaas-event-detail-grid :deep(.modal-message-row) {
    align-items: center;
}

.itaas-event-detail-value {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px;
    align-items: center;
    column-gap: var(--space-8);
    min-width: 0;
    width: 100%;
}

.itaas-event-detail-value-text {
    margin: 0;
    min-width: 0;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.itaas-event-detail-value-text--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 14px;
    line-height: 20px;
}

.itaas-event-detail-value :deep(.copy-icon-button) {
    justify-self: end;
    align-self: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    margin: 0;
}
</style>
