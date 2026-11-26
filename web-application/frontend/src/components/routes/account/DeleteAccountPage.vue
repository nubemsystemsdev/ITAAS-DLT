<template>
    <article class="details-view-danger-panel" tabindex="-1">
        <h3 class="details-view-danger-title">{{ $t("Danger zone") }}</h3>
        <p class="details-view-danger-description">
            {{ $t("Permanently delete your account and all associated data. This action cannot be undone.") }}
        </p>

        <form class="details-view-edit-form" @submit="submit">
            <div class="details-view-edit-grid">
                <div class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="delete-account-password">
                        <i class="fas fa-key details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Input your account password to confirm this action") }}
                    </label>
                    <PasswordInput
                        v-model:val="password"
                        id="delete-account-password"
                        :disabled="busy"
                        name="password"
                        :is-new-password="true"
                        :auto-focus="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'delete-account-password-error' : undefined"
                    ></PasswordInput>
                    <div v-if="errorPassword" id="delete-account-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
                </div>

                <div v-if="tfa" class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="delete-account-tfa">
                        <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Input your one-time password to confirm this action") }}
                    </label>
                    <input
                        id="delete-account-tfa"
                        v-model="token"
                        type="text"
                        name="tfa-token"
                        autocomplete="off"
                        :disabled="busy"
                        maxlength="6"
                        :placeholder="$t('012345')"
                        class="form-control form-control-full-width"
                        :aria-invalid="errorToken ? 'true' : undefined"
                        :aria-describedby="errorToken ? 'delete-account-tfa-error' : undefined"
                    />
                    <div v-if="errorToken" id="delete-account-tfa-error" class="form-error" role="alert">{{ errorToken }}</div>
                </div>
            </div>

            <div class="details-view-danger-actions">
                <button type="submit" :disabled="busy" class="btn btn-secondary-danger">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    {{ $t("Delete account") }}
                </button>
            </div>
            <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        </form>
    </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { getUniqueStringId } from "@/utils/unique-id";

import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { ApiAccount } from "@/api/api-group-account";

import PasswordInput from "@/components/utils/PasswordInput.vue";

export default defineComponent({
    name: "DeleteAccountPage",
    components: {
        PasswordInput,
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

            tfa: AuthController.RequiresTwoFactorAuthentication,
            token: "",
            errorToken: "",

            error: "",
            busy: false,
        };
    },
    methods: {
        onAuthChanged: function () {
            this.tfa = AuthController.RequiresTwoFactorAuthentication;
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },

        submit: function (e: Event) {
            if (e) {
                e.preventDefault();
            }

            this.$askUserConfirmation({
                title: this.$t("Delete account"),
                message: this.$t("Are you sure you want to delete your account?"),
                danger: true,
                deleteAction: true,
                callback: () => {
                    this.doDeleteAccount();
                },
            });
        },

        doDeleteAccount: function () {
            if (this.busy) {
                return;
            }

            this.error = "";
            this.errorPassword = "";
            this.errorToken = "";

            this.busy = true;

            Request.Pending(this.saveRequestId, ApiAccount.DeleteAccount({ tfa_token: this.token, password: this.password }))
                .onSuccess(() => {
                    this.busy = false;
                    this.password = "";
                    this.token = "";

                    AuthController.CheckAuthStatus();
                    this.$showSnackBar(this.$t("Account deleted"));
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
                        badRequestInvalidTfaCode: () => {
                            this.errorToken = this.$t("Invalid one-time password");
                        },
                        badRequestWrongPassword: () => {
                            this.errorPassword = this.$t("Wrong password");
                        },
                        badRequest: () => {
                            this.error = this.$t("Bad request");
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
            return;
        }
        this.$requireLogin();
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped></style>
