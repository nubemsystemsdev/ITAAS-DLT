<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="busy">
        <div class="modal-dialog modal-md custom-agent-deposit-checkout-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Pay deposit") }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    :disabled="busy"
                    @click="close"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="modal-body">
                <p class="custom-agent-deposit-checkout-intro">
                    {{ $t("You can apply Nubem tokens before paying the custom agent deposit.") }}
                </p>

                <div class="catalog-summary-lines">
                    <div class="catalog-summary-row">
                        <span>{{ $t("One-time deposit") }}</span>
                        <span>{{ formattedDepositAmount }}</span>
                    </div>
                </div>

                <div class="catalog-token-panel">
                    <button
                        type="button"
                        class="catalog-token-toggle"
                        :aria-expanded="showTokensDropdown"
                        :disabled="busy"
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
                        <label class="catalog-token-input-wrap" for="custom-agent-deposit-token-input">
                            <span class="catalog-token-input-label">{{ $t("Tokens to redeem") }}</span>
                            <input
                                id="custom-agent-deposit-token-input"
                                :value="redeemTokens"
                                type="number"
                                min="0"
                                :max="normalizedMaxApplicableTokens"
                                step="1"
                                inputmode="numeric"
                                class="catalog-token-input"
                                :disabled="busy || (!tokenQuote && quoteLoading)"
                                @input="onRedeemTokensInput"
                                @change="onRedeemTokensInput"
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

                        <p class="catalog-token-panel-hint catalog-token-status" :class="{ 'is-visible': quoteLoading }" aria-live="polite">
                            {{ quoteLoading ? $t("Calculating token quote...") : "" }}
                        </p>
                    </div>
                </div>

                <div class="catalog-summary-total">
                    <div class="catalog-summary-total-price">
                        <p class="catalog-summary-total-amount">{{ formattedFinalPayableAmount }}</p>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="busy" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-primary" :disabled="busy || quoteLoading" @click="confirm">
                    <i :class="busy ? 'fas fa-spinner fa-spin' : 'fas fa-credit-card'" aria-hidden="true"></i>
                    {{ $t("Continue to payment") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

import { ApiTokensNubem } from "@/api/api-group-tokens-nubem";
import type { TokenRedeemQuoteResponse, TokensBalanceResponse } from "@/api/definitions";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { formatEur } from "@/utils/format-currency";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";
import { useVModel } from "@/utils/v-model";

export default defineComponent({
    name: "CustomAgentDepositCheckoutModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "confirm"],
    props: {
        display: Boolean,
        busy: {
            type: Boolean,
            default: false,
        },
        depositAmountCents: {
            type: Number,
            default: 0,
        },
        depositFormatted: {
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
            showTokensDropdown: true,
            redeemTokens: 0,
            quoteLoading: false,
            tokenBalance: null as TokensBalanceResponse | null,
            tokenQuote: null as TokenRedeemQuoteResponse | null,
            balanceRequestId: getUniqueStringId(),
            quoteRequestId: getUniqueStringId(),
            quoteDebounceId: getUniqueStringId(),
        };
    },
    computed: {
        normalizedTokenBalance: function (): number {
            return Math.max(0, Math.floor(Number(this.tokenBalance?.available_tokens) || 0));
        },
        normalizedMaxApplicableTokens: function (): number {
            return Math.max(0, Math.floor(Number(this.tokenQuote?.maxApplicableTokens) || 0));
        },
        normalizedAppliedTokens: function (): number {
            return Math.max(0, Math.floor(Number(this.tokenQuote?.appliedTokens) || 0));
        },
        formattedDepositAmount: function (): string {
            if (this.depositFormatted) {
                return this.depositFormatted;
            }
            return this.formatEur(Math.max(this.depositAmountCents, 0) / 100);
        },
        formattedTokenDiscount: function (): string {
            return this.formatEur(Math.max(Number(this.tokenQuote?.discountEurCents) || 0, 0) / 100);
        },
        formattedFinalPayableAmount: function (): string {
            const quotedAmount = Math.max(Number(this.tokenQuote?.finalAmountEurCents) || 0, 0) / 100;
            if (this.tokenQuote && (quotedAmount > 0 || this.normalizedAppliedTokens > 0)) {
                return this.formatEur(quotedAmount);
            }
            return this.formattedDepositAmount;
        },
    },
    methods: {
        formatEur: function (amount: number): string {
            return formatEur(Math.max(amount || 0, 0), String(this.$locale?.value || "en"));
        },
        reset: function (): void {
            this.showTokensDropdown = true;
            this.redeemTokens = 0;
            this.quoteLoading = false;
            this.tokenBalance = null;
            this.tokenQuote = null;
        },
        abortRequests: function (): void {
            Timeouts.Abort(this.quoteDebounceId);
            Request.Abort(this.balanceRequestId);
            Request.Abort(this.quoteRequestId);
        },
        close: function (): void {
            if (this.busy) {
                return;
            }
            this.displayStatus = false;
        },
        confirm: function (): void {
            if (this.busy || this.quoteLoading) {
                return;
            }
            this.$emit("confirm", this.redeemTokens);
        },
        toggleTokensDropdown: function (): void {
            this.showTokensDropdown = !this.showTokensDropdown;
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
        onRedeemTokensInput: function (event: Event): void {
            const target = event.target as HTMLInputElement | null;
            const rawValue = Number(target?.value || 0);
            const normalizedValue = Math.max(
                0,
                Math.min(this.normalizedMaxApplicableTokens, Math.floor(Number.isFinite(rawValue) ? rawValue : 0)),
            );

            if (target && target.value !== String(normalizedValue)) {
                target.value = String(normalizedValue);
            }

            this.redeemTokens = normalizedValue;
            Timeouts.Set(this.quoteDebounceId, 250, () => {
                this.loadTokenQuote();
            });
        },
        loadTokenBalance: function (): Promise<number> {
            return new Promise((resolve) => {
                Request.Abort(this.balanceRequestId);
                Request.Pending(this.balanceRequestId, ApiTokensNubem.GetNubemTokenBalance())
                    .onSuccess((balance: TokensBalanceResponse) => {
                        this.tokenBalance = balance;
                        resolve(Math.max(0, Math.floor(Number(balance.available_tokens) || 0)));
                    })
                    .onRequestError(() => {
                        this.tokenBalance = null;
                        resolve(0);
                    })
                    .onUnexpectedError(() => {
                        this.tokenBalance = null;
                        resolve(0);
                    });
            });
        },
        applyFallbackQuote: function (): void {
            this.redeemTokens = 0;
            const amountEurCents = Math.max(0, Math.floor(Number(this.depositAmountCents) || 0));
            this.tokenQuote = {
                walletId: "",
                availableTokens: this.normalizedTokenBalance,
                requestedTokens: 0,
                appliedTokens: 0,
                maxApplicableTokens: 0,
                discountEurCents: 0,
                finalAmountEurCents: amountEurCents,
            };
        },
        loadTokenQuote: function (): void {
            const amountEurCents = Math.max(0, Math.floor(Number(this.depositAmountCents) || 0));
            if (amountEurCents <= 0) {
                this.applyFallbackQuote();
                this.quoteLoading = false;
                return;
            }

            this.quoteLoading = true;
            Request.Abort(this.quoteRequestId);
            Request.Pending(
                this.quoteRequestId,
                ApiTokensNubem.PostNubemTokenRedeemQuote({
                    amount_eur_cents: amountEurCents,
                    requested_tokens: this.redeemTokens,
                }),
            )
                .onSuccess((quote: TokenRedeemQuoteResponse) => {
                    this.tokenQuote = quote;
                    const maxApplicable = Math.max(0, Math.floor(Number(quote.maxApplicableTokens) || 0));
                    if (this.redeemTokens > maxApplicable) {
                        this.redeemTokens = maxApplicable;
                    }
                    this.quoteLoading = false;
                })
                .onRequestError(() => {
                    this.applyFallbackQuote();
                    this.quoteLoading = false;
                })
                .onUnexpectedError(() => {
                    this.applyFallbackQuote();
                    this.quoteLoading = false;
                });
        },
        loadQuoteState: function (): void {
            this.abortRequests();
            this.quoteLoading = true;
            void this.loadTokenBalance().then(() => {
                if (!this.displayStatus) {
                    return;
                }
                this.loadTokenQuote();
            });
        },
    },
    beforeUnmount: function () {
        this.abortRequests();
    },
    watch: {
        display: function (isOpen: boolean): void {
            if (isOpen) {
                this.reset();
                this.loadQuoteState();
                return;
            }
            this.abortRequests();
        },
        depositAmountCents: function (): void {
            if (this.displayStatus) {
                this.loadTokenQuote();
            }
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-detail-modal.css";

.custom-agent-deposit-checkout-intro {
    margin: 0 0 var(--space-16);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

.custom-agent-deposit-checkout-modal .catalog-token-panel {
    margin-top: var(--space-16);
}

.custom-agent-deposit-checkout-modal .modal-footer .btn {
    min-height: 44px;
}
</style>
