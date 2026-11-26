<template>
    <div class="content-inner" tabindex="-1">
        <div>
            <h2>{{ $t("Wallet details") }}</h2>
            <div class="table-responsive">
                <table class="table">
                    <tr>
                        <td class="bold td-shrink one-line">{{ $t("Wallet ID") }}:</td>
                        <td>{{ walletId }}</td>
                        <td class="td-shrink text-right">
                            <CopyIconButton :text="walletId" success-message="Copied to clipboard!" />
                        </td>
                    </tr>
                    <tr v-if="walletDid">
                        <td class="bold td-shrink one-line">{{ $t("User DID") }}:</td>
                        <td>{{ walletDid }}</td>
                        <td class="td-shrink text-right">
                            <CopyIconButton :text="walletDid" success-message="Copied to clipboard!" />
                        </td>
                    </tr>
                    <tr>
                        <td class="bold td-shrink one-line">{{ $t("Wallet address") }}:</td>
                        <td>{{ walletAddress }}</td>
                        <td class="td-shrink text-right">
                            <CopyIconButton :text="walletAddress" label="Copy wallet address" />
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { AuthController } from "@/control/auth";

export default defineComponent({
    name: "WalletDetailsPage",
    components: {
        CopyIconButton,
    },
    props: {
        walletId: String,
        walletAddress: String,
        walletDid: String,
    },
    methods: {
        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));

        if (AuthController.isAuthenticated()) {
            this.$autoFocus();
        } else {
            this.$requireLogin();
        }
    },
});
</script>

<style></style>
