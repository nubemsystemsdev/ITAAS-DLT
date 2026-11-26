<template>
    <div class="content-inner" tabindex="-1">
        <form @submit="submit">
            <h2>{{ $t("Export wallet key") }}</h2>
            <div class="form-group login-input-group auth-input-group">
                <label for="export-wallet-address">{{ $t("Wallet address") }}</label>
                <input
                    id="export-wallet-address"
                    type="text"
                    name="wallet-address"
                    readonly
                    :value="walletAddress"
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width"
                />
            </div>
            <div class="form-group login-input-group auth-input-group" v-if="locked">
                <label for="export-wallet-password">{{ $t("Wallet password") }}</label>
                <div
                    class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
                >
                    <PasswordInput
                        id="export-wallet-password"
                        :disabled="busy"
                        v-model:val="password"
                        name="wallet-password"
                        :auto-focus="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'export-wallet-password-error' : undefined"
                    ></PasswordInput>
                </div>
                <div v-if="errorPassword" id="export-wallet-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
            </div>
            <div class="form-group login-input-group auth-input-group" v-if="!locked">
                <label for="export-wallet-private-key">{{ $t("Wallet private key") }}</label>
                <textarea
                    id="export-wallet-private-key"
                    class="form-control form-control-full-width form-textarea"
                    rows="3"
                    v-model="key"
                    readonly
                ></textarea>
            </div>

            <div class="form-group" v-if="locked">
                <button type="submit" :disabled="busy" class="btn btn-primary"><i class="fas fa-key"></i> {{ $t("Export key") }}</button>
                <div class="form-error" v-if="error" role="alert">{{ error }}</div>
            </div>

            <div class="form-group" v-if="!locked">
                <button type="button" :disabled="busy" class="btn btn-primary" @click="copyKey(key)">
                    <i class="fas fa-clone"></i> {{ $t("Copy key to clipboard") }}
                </button>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { getUniqueStringId } from "@/utils/unique-id";

import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";

import PasswordInput from "@/components/utils/PasswordInput.vue";
import { ApiWallet } from "@/api/api-group-wallet";

export default defineComponent({
    name: "ExportKeyPage",
    components: {
        PasswordInput,
    },
    props: {
        walletId: String,
        walletAddress: String,
    },
    setup: function () {
        return {
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            password: "",
            errorPassword: "",

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

            if (this.busy) {
                return;
            }

            this.error = "";
            this.errorPassword = "";

            if (!this.password) {
                this.errorPassword = this.$t("You must specify a password");
                return;
            }

            this.busy = true;

            Request.Pending(this.saveRequestId, ApiWallet.ExportPrivatekey({ password: this.password }))
                .onSuccess((result) => {
                    this.busy = false;
                    this.password = "";
                    this.key = result.privateKeyEc || result.privateKeyMl || "";
                    this.locked = false;

                    this.$showSnackBar(this.$t("Wallet key successfully exported!"));
                })
                .onCancel(() => {
                    this.busy = false;
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequestWrongPassword: () => {
                            this.errorPassword = this.$t("Wrong password");
                        },
                        badRequest: () => {
                            this.error = this.$t("Bad request");
                        },
                        notFound: () => {
                            this.error = this.$t("Wallet not found");
                        },
                        serverError: () => {
                            this.error = this.$t("Internal server error");
                        },
                        networkError: () => {
                            this.error = this.$t("Could not connect to the server");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.error = err.message;
                    console.error(err);
                    this.busy = false;
                });
        },

        copyKey: function (key: string) {
            navigator.clipboard.writeText(key);
            this.$showSnackBar(this.$t("Private key copied to clipboard!"));
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
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
    watch: {
        walletId: function () {
            this.key = "";
            this.locked = true;
        },
    },
});
</script>
