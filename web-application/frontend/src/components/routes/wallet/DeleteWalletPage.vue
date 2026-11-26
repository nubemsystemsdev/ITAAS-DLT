<template>
    <div class="content-inner" tabindex="-1">
        <form @submit="submit">
            <h2>{{ $t("Delete wallet") }}</h2>
            <div class="form-group">
                <label for="delete-wallet-address">{{ $t("Wallet address") }}:</label>
                <input
                    id="delete-wallet-address"
                    type="text"
                    name="wallet-address"
                    readonly
                    :value="walletAddress"
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width"
                />
            </div>

            <div class="form-group">
                <label for="delete-wallet-confirmation">{{ $t("Input the wallet address to confirm this action") }}:</label>
                <input
                    id="delete-wallet-confirmation"
                    type="text"
                    name="wallet-address-confirmation"
                    autocomplete="off"
                    v-model="confirmation"
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width auto-focus"
                    :aria-invalid="error ? 'true' : undefined"
                    :aria-describedby="error ? 'delete-wallet-confirmation-error' : undefined"
                />
            </div>

            <div class="form-group">
                <button type="submit" :disabled="busy || confirmation !== walletAddress" class="btn btn-danger">
                    <i class="fas fa-trash-alt"></i> {{ $t("Delete wallet") }}
                </button>
                <div v-if="error" id="delete-wallet-confirmation-error" class="form-error" role="alert">{{ error }}</div>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { AuthController } from "@/control/auth";

export default defineComponent({
    name: "DeleteWalletPage",
    components: {},
    props: {
        walletId: String,
        walletAddress: String,
    },
    data: function () {
        return {
            confirmation: "",

            key: "",

            locked: true,

            error: "",
            busy: false,
        };
    },
    methods: {
        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },

        submit: function (e: Event) {
            if (e) {
                e.preventDefault();
            }

            this.$askUserConfirmation({
                title: this.$t("Delete wallet"),
                message: this.$t("Are you sure you want to delete the wallet from your account?"),
                danger: true,
                deleteAction: true,
                callback: () => {
                    this.doDeleteWallet();
                },
            });
        },

        doDeleteWallet: function () {
            if (this.busy) {
                return;
            }

            this.error = "";

            this.error = this.$t("Bad request");
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
    watch: {
        walletId: function () {
            this.key = "";
            this.locked = true;
        },
    },
});
</script>

<style></style>
