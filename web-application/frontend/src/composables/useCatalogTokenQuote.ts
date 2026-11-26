import { computed, onBeforeUnmount, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiTokensNubem } from "@/api/api-group-tokens-nubem";
import type { PreviewCreateResponse, TokenRedeemQuoteResponse, TokensBalanceResponse } from "@/api/definitions";
import type { CatalogEntry, CatalogPricingOption } from "@/composables/catalog-domain";
import { getUniqueStringId } from "@/utils/unique-id";

interface UseCatalogTokenQuoteOptions {
    isAuthenticated: () => boolean;
    getSelectedPricingOption: (entry: CatalogEntry) => CatalogPricingOption | null;
    getSelectedEntryAmountCents: (entry: CatalogEntry) => number;
}

export function useCatalogTokenQuote(options: UseCatalogTokenQuoteOptions) {
    const catalogTokenBalance = ref<TokensBalanceResponse | null>(null);
    const redeemTokensByEntry = ref<Record<string, number>>({});
    const tokenQuotesByEntry = ref<Record<string, TokenRedeemQuoteResponse>>({});
    const tokenQuoteLoadingEntryId = ref("");

    const tokensBalanceRequestId = `nubem-tokens-balance-${getUniqueStringId()}`;
    const tokenQuoteRequestId = `nubem-tokens-quote-${getUniqueStringId()}`;

    const availableTokenBalance = computed(() => {
        return Math.max(0, Math.floor(Number(catalogTokenBalance.value?.available_tokens) || 0));
    });

    const runRequest = <T>(requestId: string, requestParams: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            Request.Abort(requestId);
            Request.Pending(requestId, requestParams)
                .onSuccess((response) => {
                    resolve(response as T);
                })
                .onCancel(() => {
                    reject(new Error("REQUEST_CANCELLED"));
                })
                .onRequestError((err) => {
                    reject(err instanceof Error ? err : new Error("REQUEST_ERROR"));
                })
                .onUnexpectedError((err) => {
                    reject(err instanceof Error ? err : new Error("UNEXPECTED_ERROR"));
                });
        });
    };

    const buildTokenQuote = (
        amountEurCents: number,
        requestedTokens: number,
        maxApplicableTokens?: number,
        tokenValueEurCents?: number,
    ): TokenRedeemQuoteResponse => {
        const availableTokens = availableTokenBalance.value;
        const normalizedRequestedTokens = Math.max(0, Math.floor(Number(requestedTokens) || 0));
        const resolvedTokenValue = Math.max(
            0,
            Math.floor(Number(tokenValueEurCents) || Number(catalogTokenBalance.value?.token_value_eur_cents) || 0),
        );
        const resolvedMaxApplicableTokens = Math.max(0, Math.floor(Number(maxApplicableTokens) || 0));
        const appliedTokens = Math.max(
            0,
            Math.min(normalizedRequestedTokens, availableTokens, resolvedMaxApplicableTokens || availableTokens),
        );
        const discountEurCents = Math.min(Math.max(appliedTokens * resolvedTokenValue, 0), Math.max(amountEurCents, 0));

        return {
            walletId: "",
            availableTokens,
            requestedTokens: normalizedRequestedTokens,
            appliedTokens,
            maxApplicableTokens: resolvedMaxApplicableTokens || availableTokens,
            discountEurCents,
            finalAmountEurCents: Math.max(Math.max(amountEurCents, 0) - discountEurCents, 0),
        };
    };

    const setTokenQuoteForEntry = (entryId: string, quote: TokenRedeemQuoteResponse): void => {
        tokenQuotesByEntry.value = {
            ...tokenQuotesByEntry.value,
            [entryId]: quote,
        };
    };

    const setRedeemTokensForEntry = (entryId: string, tokens: number): void => {
        redeemTokensByEntry.value = {
            ...redeemTokensByEntry.value,
            [entryId]: Math.max(0, Math.floor(Number(tokens) || 0)),
        };
    };

    const loadTokenBalance = async (): Promise<TokensBalanceResponse | null> => {
        if (!options.isAuthenticated()) {
            catalogTokenBalance.value = null;
            return null;
        }

        try {
            const balance = await runRequest<TokensBalanceResponse>(tokensBalanceRequestId, ApiTokensNubem.GetNubemTokenBalance());
            catalogTokenBalance.value = balance;
            return balance;
        } catch (error) {
            console.error(error);
            catalogTokenBalance.value = null;
            return null;
        }
    };

    const getRedeemTokensForEntry = (entry: CatalogEntry): number => {
        return Math.max(0, Math.floor(Number(redeemTokensByEntry.value[entry.id]) || 0));
    };

    const getTokenQuoteForEntry = (entry: CatalogEntry): TokenRedeemQuoteResponse | null => {
        return tokenQuotesByEntry.value[entry.id] || null;
    };

    const getMaxApplicableTokensForEntry = (entry: CatalogEntry): number => {
        return Math.max(0, Math.floor(Number(getTokenQuoteForEntry(entry)?.maxApplicableTokens) || 0));
    };

    const getAppliedTokensForEntry = (entry: CatalogEntry): number => {
        return Math.max(0, Math.floor(Number(getTokenQuoteForEntry(entry)?.appliedTokens) || 0));
    };

    const getTokenDiscountForEntry = (entry: CatalogEntry): number => {
        return Math.max(0, Math.floor(Number(getTokenQuoteForEntry(entry)?.discountEurCents) || 0));
    };

    const getFinalPayableAmountForEntry = (entry: CatalogEntry): number => {
        const quote = getTokenQuoteForEntry(entry);
        if (quote) {
            return Math.max(0, Math.floor(Number(quote.finalAmountEurCents) || 0));
        }
        return options.getSelectedEntryAmountCents(entry);
    };

    const refreshEntryTokenQuote = async (entry: CatalogEntry): Promise<void> => {
        if (!options.isAuthenticated()) {
            return;
        }

        const selectedOption = options.getSelectedPricingOption(entry);
        if (!selectedOption || !selectedOption.subscribableId) {
            return;
        }

        const amountEurCents = options.getSelectedEntryAmountCents(entry);
        const requestedTokens = getRedeemTokensForEntry(entry);
        tokenQuoteLoadingEntryId.value = entry.id;

        try {
            const quote = await runRequest<TokenRedeemQuoteResponse>(
                tokenQuoteRequestId,
                ApiTokensNubem.PostNubemTokenRedeemQuote({
                    amount_eur_cents: amountEurCents,
                    requested_tokens: requestedTokens,
                }),
            );
            setTokenQuoteForEntry(entry.id, quote);
        } catch (error) {
            console.error(error);
            setTokenQuoteForEntry(entry.id, buildTokenQuote(amountEurCents, requestedTokens));
        }

        if (tokenQuoteLoadingEntryId.value === entry.id) {
            tokenQuoteLoadingEntryId.value = "";
        }
    };

    const updateEntryQuoteFromPreview = (entry: CatalogEntry, preview: PreviewCreateResponse, requestedTokens: number): number => {
        const previewTokenQuote = preview?.token_quote || {};
        const maxApplicableTokens = Math.max(0, Math.floor(Number((previewTokenQuote as any).max_applicable_tokens) || 0));
        const tokenValueEurCents = Math.max(
            0,
            Math.floor(
                Number((previewTokenQuote as any).token_value_eur_cents) || Number(catalogTokenBalance.value?.token_value_eur_cents) || 0,
            ),
        );
        const amountEurCents = Math.max(
            0,
            Math.floor(Number((preview?.subscribable as any)?.price_cents) || options.getSelectedEntryAmountCents(entry)),
        );
        const normalizedTokens = Math.max(0, Math.min(Math.floor(Number(requestedTokens) || 0), maxApplicableTokens || requestedTokens));

        setTokenQuoteForEntry(entry.id, buildTokenQuote(amountEurCents, normalizedTokens, maxApplicableTokens, tokenValueEurCents));
        setRedeemTokensForEntry(entry.id, normalizedTokens);
        return normalizedTokens;
    };

    onBeforeUnmount(() => {
        Request.Abort(tokensBalanceRequestId);
        Request.Abort(tokenQuoteRequestId);
    });

    return {
        catalogTokenBalance,
        availableTokenBalance,
        tokenQuoteLoadingEntryId,
        loadTokenBalance,
        setRedeemTokensForEntry,
        getRedeemTokensForEntry,
        getMaxApplicableTokensForEntry,
        getAppliedTokensForEntry,
        getTokenDiscountForEntry,
        getFinalPayableAmountForEntry,
        refreshEntryTokenQuote,
        updateEntryQuoteFromPreview,
    };
}
