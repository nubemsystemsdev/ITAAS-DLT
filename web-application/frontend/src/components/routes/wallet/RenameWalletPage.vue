<template>
    <div class="content-inner" tabindex="-1">
        <form @submit="submit">
            <h2>{{ $t("Change wallet name") }}</h2>
            <div class="form-group">
                <label for="rename-wallet-old-name">{{ $t("Current wallet name") }}:</label>
                <input
                    id="rename-wallet-old-name"
                    type="text"
                    name="old-username"
                    readonly
                    :value="oldName"
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width"
                />
            </div>
            <div class="form-group">
                <label for="rename-wallet-name">{{ $t("New wallet name") }}:</label>
                <input
                    id="rename-wallet-name"
                    type="text"
                    name="wallet-name"
                    v-model="name"
                    :disabled="busy"
                    maxlength="80"
                    class="form-control form-control-full-width auto-focus"
                    :aria-invalid="error ? 'true' : undefined"
                    :aria-describedby="error ? 'rename-wallet-name-error' : undefined"
                />
            </div>
            <div class="form-group">
                <button type="submit" :disabled="busy || !name || name === oldName" class="btn btn-primary">
                    <i class="fas fa-pencil"></i> {{ $t("Change wallet name") }}
                </button>
                <div v-if="error" id="rename-wallet-name-error" class="form-error" role="alert">{{ error }}</div>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { AuthController } from "@/control/auth";

export default defineComponent({
    name: "RenameWalletPage",
    components: {},
    emits: ["mustReload"],
    props: {
        walletId: String,
        oldName: String,
    },
    data: function () {
        return {
            name: "",
            errorName: "",

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

            if (this.busy) {
                return;
            }

            this.error = "";
            this.errorName = "";

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
});
</script>

<style></style>
