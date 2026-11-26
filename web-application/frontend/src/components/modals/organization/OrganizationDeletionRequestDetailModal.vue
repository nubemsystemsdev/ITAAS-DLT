<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg org-deletion-request-detail-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Deletion request details") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="request" class="modal-body modal-detail-body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <p class="modal-detail-amount">{{ request.organizationName }}</p>
                        <p class="modal-detail-meta">{{ request.requestedByUsername }}</p>
                    </div>
                    <span :class="statusBadgeClass(request.status, orgDeletionRequestStatusToneMap)" role="status">
                        {{ formatDeletionStatus(request.status, $t) }}
                    </span>
                </div>

                <div class="modal-message-grid" role="table" :aria-label="$t('Deletion request details')">
                    <div v-for="row in detailRows" :key="row.id" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <p class="modal-message-value" role="cell">{{ row.value }}</p>
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
import { OrgDeletionRequestItem } from "@/api/definitions";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { formatDeletionStatus, formatSubscriptionPreference } from "@/utils/organization-deletion";
import { ORG_DELETION_REQUEST_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { renderDate } from "@/utils/time-utils";
import { useVModel } from "@/utils/v-model";

type DetailRow = {
    id: string;
    label: string;
    value: string;
};

export default defineComponent({
    name: "OrganizationDeletionRequestDetailModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display"],
    props: {
        display: Boolean,
        request: {
            type: Object as PropType<OrgDeletionRequestItem | null>,
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
            orgDeletionRequestStatusToneMap: ORG_DELETION_REQUEST_STATUS_TONE_MAP,
        };
    },
    computed: {
        detailRows: function (): DetailRow[] {
            if (!this.request) {
                return [];
            }

            const rows: DetailRow[] = [
                {
                    id: "request-id",
                    label: String(this.$t("Request ID")),
                    value: this.request.id,
                },
                {
                    id: "organization",
                    label: String(this.$t("Organization")),
                    value: this.request.organizationName,
                },
                {
                    id: "requested-by",
                    label: String(this.$t("Requested by")),
                    value: this.request.requestedByUsername,
                },
                {
                    id: "subscription-preference",
                    label: String(this.$t("Subscription handling preference")),
                    value: formatSubscriptionPreference(this.request.subscriptionPreference, this.$t),
                },
                {
                    id: "requested-at",
                    label: String(this.$t("Requested")),
                    value: this.formatTimestamp(this.request.requestedAt),
                },
            ];

            const resolvedHandling = (this.request.resolvedSubscriptionHandling || "").trim();
            if (resolvedHandling) {
                rows.push({
                    id: "resolved-handling",
                    label: String(this.$t("Applied subscription handling")),
                    value: formatSubscriptionPreference(resolvedHandling, this.$t),
                });
            }

            const resolvedAt = this.request.resolvedAt || 0;
            if (resolvedAt > 0) {
                rows.push({
                    id: "resolved-at",
                    label: String(this.$t("Resolved")),
                    value: this.formatTimestamp(resolvedAt),
                });
            }

            const resolvedByUserId = (this.request.resolvedByUserId || "").trim();
            const resolvedByUsername = (this.request.resolvedByUsername || "").trim();
            if (resolvedByUserId) {
                rows.push({
                    id: "resolved-by",
                    label: String(this.$t("Resolved by")),
                    value: resolvedByUsername || resolvedByUserId,
                });
            }

            const scheduledDeletionAt = this.request.scheduledDeletionAt || 0;
            if (scheduledDeletionAt > 0) {
                rows.push({
                    id: "scheduled-deletion-at",
                    label: String(this.$t("Estimated closure")),
                    value: this.formatTimestamp(scheduledDeletionAt),
                });
            }

            const rejectionReason = (this.request.rejectionReason || "").trim();
            if (rejectionReason) {
                rows.push({
                    id: "rejection-reason",
                    label: String(this.$t("Rejection reason")),
                    value: rejectionReason,
                });
            }

            return rows;
        },
    },
    methods: {
        statusBadgeClass,
        formatTimestamp: function (ts: number): string {
            if (!ts) {
                return "—";
            }
            return renderDate(ts, this.$t);
        },
        formatDeletionStatus: formatDeletionStatus,
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
        display: function (isOpen: boolean) {
            if (isOpen) {
                this.$autoFocus();
            }
        },
    },
});
</script>

<style scoped>
.org-deletion-request-detail-modal {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--space-32));
    box-sizing: border-box;
    overflow: hidden;
}

.org-deletion-request-detail-modal .modal-header,
.org-deletion-request-detail-modal .modal-footer {
    flex-shrink: 0;
}

.org-deletion-request-detail-modal .modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

@media (max-width: 640px) {
    .org-deletion-request-detail-modal {
        max-height: calc(100vh - var(--space-16));
    }
}
</style>
