<template>
    <article class="balance-card">
        <ComponentLoader v-if="balanceLoading" />

        <div v-else class="balance-card-inner">
            <p class="balance-card-label">
                <i class="fas fa-wallet" aria-hidden="true"></i>
                {{ $t("Wallet · NubemTokens") }}
            </p>

            <div class="balance-amount-row">
                <span class="balance-amount">{{ balance ? balance.available_tokens : "—" }} </span>
            </div>

            <p class="balance-eur">
                <template v-if="balance">
                    {{ $t("≈") }} {{ formatMoneyFromCents(balance.equivalent_eur_cents, "EUR") }} {{ $t("redeemable") }}
                </template>
            </p>

            <div v-if="balance && balance.available_tokens > 0" class="balance-actions">
                <button type="button" class="btn btn-secondary" @click="useInPurchase">
                    <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    {{ $t("Use in purchase") }}
                </button>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { TokensBalanceResponse } from "@/api/definitions";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { routeTo } from "@/utils/route-to";

export default defineComponent({
    name: "TokenBalance",

    components: {
        ComponentLoader,
    },

    props: {
        balance: {
            type: Object as PropType<TokensBalanceResponse | null>,
            default: null,
        },

        balanceLoading: {
            type: Boolean,
            default: false,
        },
    },

    methods: {
        formatMoneyFromCents,

        useInPurchase: function (): void {
            routeTo(this, "/catalog");
        },
    },
});
</script>
