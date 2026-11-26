<template>
    <article class="history-card">
        <h2>{{ $t("Nubem Token History") }}</h2>

        <ComponentLoader v-if="historyLoading"></ComponentLoader>

        <template v-else>
            <p v-if="history.length === 0" class="table-feedback">{{ $t("No transaction history available") }}</p>

            <template v-else>
                <div class="table-responsive token-history-table-wrap">
                    <table class="table table-wide table-stack table-stack--single-col-mobile token-history-table">
                        <colgroup>
                            <col class="col-date" />
                            <col class="col-event" />
                            <col class="col-concept" />
                            <col class="col-amount" />
                            <col class="col-hash" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">{{ $t("Date") }}</th>
                                <th scope="col">{{ $t("Event") }}</th>
                                <th scope="col">{{ $t("Concept") }}</th>
                                <th scope="col">{{ $t("Amount") }}</th>
                                <th scope="col">{{ $t("TX Hash") }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in history" :key="entry.id">
                                <td :data-label="$t('Date')" class="date-cell table-stack-row-primary">
                                    {{ formatDate(entry.createdAt) }}
                                </td>
                                <td :data-label="$t('Event')" class="token-history-cell--event">
                                    <span :class="statusBadgeClass(entry.actionKind)">
                                        {{ getEventLabel(entry.actionKind) }}
                                    </span>
                                </td>
                                <td :data-label="$t('Concept')" class="concept-cell">
                                    <span class="token-history-concept" :title="getConceptLabel(entry)">{{ getConceptLabel(entry) }}</span>
                                </td>
                                <td :data-label="$t('Amount')" class="amount-cell">
                                    <span :class="getAmountClass(entry.amountTokens)">
                                        {{ getSignedAmount(entry.amountTokens) }}
                                    </span>
                                </td>
                                <td :data-label="$t('TX Hash')" class="hash-cell">
                                    <template v-if="entry.txHash">
                                        <code :title="entry.txHash">
                                            {{ truncateMiddle(entry.txHash, 30) }}
                                        </code>
                                        <CopyIconButton
                                            :text="entry.txHash"
                                            label="Copy transaction hash"
                                            success-message="Copied to clipboard!"
                                        />
                                    </template>
                                    <span v-else class="text-muted">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </template>

        <PaginationBar
            :page="page"
            :total-pages="totalPages"
            :can-go-prev="canGoPrev"
            :can-go-next="canGoNext"
            :visible="!historyLoading && paginationVisible"
            :aria-label="$t('Token history pagination')"
            @prev="$emit('prev')"
            @next="$emit('next')"
        />
    </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { TokenHistoryEntry } from "@/api/definitions";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { truncateMiddle } from "@/utils/text";

const ACTION_KIND_LABELS: Record<string, string> = {
    EARN: "Earn",
    REDEEM_HOLD: "Redeem hold",
    REDEEM_COMMIT: "Redeem",
    REDEEM_RELEASE: "Redeem release",
    REFUND_REVERT: "Refund",
};

const ACTION_KIND_TONES: Record<string, string> = {
    EARN: "success",
    REDEEM_HOLD: "info",
    REDEEM_COMMIT: "info",
    REDEEM_RELEASE: "warning",
    REFUND_REVERT: "error",
};

export default defineComponent({
    name: "TokenHistory",

    components: {
        CopyIconButton,
        ComponentLoader,
        PaginationBar,
    },

    emits: ["prev", "next"],

    props: {
        history: {
            type: Array as PropType<TokenHistoryEntry[]>,
            default: () => [],
        },

        historyLoading: {
            type: Boolean,
            default: false,
        },

        page: {
            type: Number,
            default: 1,
        },

        totalPages: {
            type: Number,
            default: 1,
        },

        canGoPrev: {
            type: Boolean,
            default: false,
        },

        canGoNext: {
            type: Boolean,
            default: false,
        },

        paginationVisible: {
            type: Boolean,
            default: false,
        },
    },

    methods: {
        truncateMiddle,

        formatDate: function (timestamp: number | string): string {
            if (!timestamp) return "—";
            const date = new Date(timestamp);
            const locale = (this as any).$i18n?.locale || undefined;

            return date
                .toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                })
                .replace(".", "");
        },

        getEventLabel: function (actionKind: string): string {
            if (!actionKind) return "—";
            return this.$t(ACTION_KIND_LABELS[actionKind] || actionKind);
        },

        statusBadgeClass: function (actionKind: string): string {
            if (!actionKind) return "status-badge status-badge--muted";
            const tone = ACTION_KIND_TONES[actionKind] || "muted";
            return `status-badge status-badge--${tone}`;
        },

        getAmountClass: function (amount: number): string {
            if (amount > 0) return "amount-positive";
            if (amount < 0) return "amount-negative";
            return "amount-neutral";
        },

        getSignedAmount: function (amount: number): string {
            const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
            return `${sign}${Math.abs(amount)}`;
        },

        getConceptLabel: function (entry: TokenHistoryEntry): string {
            if (entry.conceptName) return entry.conceptName;
            if (entry.operationId && entry.operationId.startsWith("redeem:")) return this.$t("Redeemed");
            return "—";
        },
    },
});
</script>
