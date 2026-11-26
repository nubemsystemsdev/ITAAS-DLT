<template>
    <div class="page-content tokens-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Fidelity and account')"
            :title="$t('Tokens')"
            :subtitle="$t('Balance and transaction history for your loyalty tokens.')"
        />

        <div class="tokens-grid">
            <TokenBalance :balance="balance" :balance-loading="balanceLoading" />

            <TokenActiveRules :rules-loading="rulesLoading" :rules="activeRules" />
        </div>

        <TokenHistory
            :history="history"
            :history-loading="historyLoading"
            :page="historyPage"
            :total-pages="historyTotalPages"
            :can-go-prev="historyCanGoPrev"
            :can-go-next="historyCanGoNext"
            :pagination-visible="historyPaginationVisible"
            @prev="onHistoryPrev"
            @next="onHistoryNext"
        />
    </div>
</template>

<script lang="ts">
import { ApiTokensNubem } from "@/api/api-group-tokens-nubem";
import { ApiTokenRules } from "@/api/api-group-token-rules";
import type { TokensBalanceResponse, TokensHistoryResponse, TokenHistoryEntry, TokenRulesConfig } from "@/api/definitions";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import TokenBalance from "@/components/routes/dashboard/tokens/TokenBalance.vue";
import TokenHistory from "@/components/routes/dashboard/tokens/TokenHistory.vue";
import TokenActiveRules from "@/components/routes/dashboard/tokens/TokenActiveRules.vue";
import { usePagination } from "@/composables/usePagination";
import { formatMoneyFromCents } from "@/utils/format-currency";

export default defineComponent({
    name: "TokensPage",

    components: {
        DashboardPageHeader,
        TokenBalance,
        TokenHistory,
        TokenActiveRules,
    },

    setup: function () {
        const historyLoading = ref(false);
        const pagination = usePagination({ loading: historyLoading });

        return {
            balanceRequestId: getUniqueStringId(),
            historyRequestId: getUniqueStringId(),
            rulesRequestId: getUniqueStringId(),
            historyLoading,
            historyPage: pagination.page,
            historyTotalPages: pagination.totalPages,
            historyPaginationVisible: pagination.visible,
            historyCanGoPrev: pagination.canGoPrev,
            historyCanGoNext: pagination.canGoNext,
            historyGoPrev: pagination.goPrev,
            historyGoNext: pagination.goNext,
            historyApplyListMeta: pagination.applyListMeta,
            historyReset: pagination.reset,
            historyPageSize: pagination.pageSize,
        };
    },

    data: function () {
        return {
            balanceLoading: false,
            rulesLoading: false,
            balance: null as TokensBalanceResponse | null,
            history: [] as TokenHistoryEntry[],
            rulesConfig: null as TokenRulesConfig | null,
        };
    },

    computed: {
        activeRules: function (): { id: string; name: string; description: string }[] {
            const config = this.rulesConfig;
            if (!config) return [];
            const rules: { id: string; name: string; description: string }[] = [];
            if (config.emissionRatePct > 0) {
                rules.push({
                    id: "emission",
                    name: `${config.emissionRatePct}% ${this.$t("tokens per validated purchase")}`,
                    description: this.$t("For every valid purchase in EUR or USDT"),
                });
            }
            rules.push({
                id: "min-earn",
                name: `${this.$t("Minimum eligible amount")} ${formatMoneyFromCents(config.minPurchaseEurCentsToEarn, "EUR")}`,
                description: this.$t("Below this amount, no tokens are issued"),
            });
            if (config.maxRedeemPct > 0) {
                rules.push({
                    id: "max-redeem",
                    name: `${this.$t("Max redeem")} ${config.maxRedeemPct}%`,
                    description: this.$t("Per single purchase"),
                });
            }
            if (config.minPurchaseEurCentsToRedeem > 0) {
                rules.push({
                    id: "min-purchase",
                    name: `${this.$t("Minimum amount to redeem")} ${formatMoneyFromCents(config.minPurchaseEurCentsToRedeem, "EUR")}`,
                    description: this.$t("To activate discount at checkout"),
                });
            }
            if (config.expirationMonths > 0) {
                rules.push({
                    id: "expiration",
                    name: `${config.expirationMonths} ${this.$t("months validity")}`,
                    description: this.$t("From the token emission date"),
                });
            }
            const productKind = String(config.allowedProductKinds || "").toLowerCase();
            if (productKind && productKind !== "all") {
                rules.push({
                    id: "product-kind",
                    name: `${this.$t("Applicable product type")}: ${this.$t(productKind.charAt(0).toUpperCase() + productKind.slice(1))}`,
                    description: this.$t("Tokens only issued for this product category"),
                });
            }
            return rules;
        },
    },

    methods: {
        loadBalance: function (): void {
            Request.Abort(this.balanceRequestId);
            this.balanceLoading = true;
            Request.Pending(this.balanceRequestId, ApiTokensNubem.GetNubemTokenBalance())
                .onSuccess((response: TokensBalanceResponse) => {
                    this.balance = response;
                    this.balanceLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.balanceLoading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.balanceLoading = false;
                        },
                        temporalError: () => {
                            this.balanceLoading = false;
                            this.$showSnackBar(this.$t("Could not load token balance. Please try again."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.balanceLoading = false;
                });
        },

        loadHistory: function (page?: number): void {
            if (typeof page === "number") {
                this.historyPage = page;
            }
            Request.Abort(this.historyRequestId);
            this.historyLoading = true;
            Request.Pending(
                this.historyRequestId,
                ApiTokensNubem.GetNubemTokenHistory({
                    page: this.historyPage,
                    pageSize: this.historyPageSize,
                }),
            )
                .onSuccess((response: TokensHistoryResponse) => {
                    this.history = Array.isArray(response.history) ? response.history : [];
                    this.historyApplyListMeta({ page: response.page, totalPages: response.totalPages });
                    this.historyLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.historyLoading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.historyLoading = false;
                        },
                        temporalError: () => {
                            this.history = [];
                            this.historyReset();
                            this.historyLoading = false;
                            this.$showSnackBar(this.$t("Could not load token history. Please try again."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.history = [];
                    this.historyReset();
                    this.historyLoading = false;
                })
                .onCancel(() => {
                    this.historyLoading = false;
                });
        },

        loadActiveRules: function (): void {
            Request.Abort(this.rulesRequestId);
            this.rulesLoading = true;
            Request.Pending(this.rulesRequestId, ApiTokenRules.GetTokenRules())
                .onSuccess((config: TokenRulesConfig) => {
                    this.rulesConfig = config;
                    this.rulesLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.rulesLoading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.rulesLoading = false;
                        },
                        temporalError: () => {
                            this.rulesLoading = false;
                            this.$showSnackBar(this.$t("Could not load token rules. Please try again."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.rulesLoading = false;
                });
        },

        onHistoryPrev: function (): void {
            if (this.historyGoPrev()) {
                this.loadHistory();
            }
        },

        onHistoryNext: function (): void {
            if (this.historyGoNext()) {
                this.loadHistory();
            }
        },
    },

    mounted: function () {
        this.loadBalance();
        this.loadHistory();
        this.loadActiveRules();
    },

    beforeUnmount: function () {
        Request.Abort(this.balanceRequestId);
        Request.Abort(this.historyRequestId);
        Request.Abort(this.rulesRequestId);
    },
});
</script>

<style>
@import "@/style/layout/tokens-page.css";
</style>
