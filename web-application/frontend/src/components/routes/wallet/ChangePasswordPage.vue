<template>
    <div class="content-inner" tabindex="-1">
        <form @submit="submit">
            <h2>{{ $t("Change wallet password") }}</h2>
            <div class="form-group login-input-group auth-input-group">
                <label for="change-wallet-old-password">{{ $t("Current password") }}</label>
                <div
                    class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
                >
                    <PasswordInput
                        id="change-wallet-old-password"
                        :disabled="busy"
                        v-model:val="oldPassword"
                        name="old-password"
                        :auto-focus="true"
                        :aria-invalid="errorOldPassword ? 'true' : undefined"
                        :aria-describedby="errorOldPassword ? 'change-wallet-old-password-error' : undefined"
                    ></PasswordInput>
                </div>
                <div v-if="errorOldPassword" id="change-wallet-old-password-error" class="form-error" role="alert">
                    {{ errorOldPassword }}
                </div>
            </div>
            <div class="form-group login-input-group auth-input-group">
                <label for="change-wallet-password">{{ $t("New password") }}</label>
                <div
                    class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
                >
                    <PasswordInput
                        id="change-wallet-password"
                        :disabled="busy"
                        v-model:val="password"
                        name="wallet-password"
                        :is-new-password="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'change-wallet-password-error' : undefined"
                    ></PasswordInput>
                </div>
                <div v-if="errorPassword" id="change-wallet-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
            </div>
            <div class="form-group login-input-group auth-input-group">
                <label for="change-wallet-password-2">{{ $t("Repeat the new password") }}</label>
                <div
                    class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
                >
                    <PasswordInput
                        id="change-wallet-password-2"
                        :disabled="busy"
                        v-model:val="password2"
                        name="wallet-password-2"
                        :is-new-password="true"
                        :is-repeated-password="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'change-wallet-password-error' : undefined"
                    ></PasswordInput>
                </div>
            </div>
            <div class="form-group">
                <button type="submit" :disabled="busy" class="btn btn-primary">
                    <i class="fas fa-key"></i> {{ $t("Change wallet password") }}
                </button>
                <div class="form-error" v-if="error" role="alert">{{ error }}</div>
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
    name: "ChangePasswordPage",
    components: {
        PasswordInput,
    },
    props: {
        walletId: String,
    },
    setup: function () {
        return {
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            oldPassword: "",
            errorOldPassword: "",

            password: "",
            password2: "",
            errorPassword: "",

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
            this.errorOldPassword = "";
            this.errorPassword = "";

            if (!this.password) {
                this.errorPassword = this.$t("You must specify a password");
                return;
            }

            if (this.password !== this.password2) {
                this.errorPassword = this.$t("The passwords do not match");
                return;
            }

            this.busy = true;

            Request.Pending(this.saveRequestId, ApiWallet.ChangeWalletPassword({ password: this.oldPassword, new_password: this.password }))
                .onSuccess(() => {
                    this.busy = false;
                    this.password = "";
                    this.password2 = "";
                    this.oldPassword = "";

                    this.$showSnackBar(this.$t("Password successfully changed"));
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
                            this.errorOldPassword = this.$t("Wrong password");
                        },
                        badRequestWeakPassword: () => {
                            this.errorPassword = this.$t("The provided password is too short");
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
});
</script>
