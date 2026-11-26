<template>
    <form class="details-view-edit-form" tabindex="-1" @submit="submit">
        <div class="details-view-edit-grid">
            <div class="details-view-edit-field">
                <label class="details-view-label" for="change-username-current">
                    <i class="fas fa-user details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Current username") }}
                </label>
                <input
                    id="change-username-current"
                    v-model="username"
                    type="text"
                    name="old-username"
                    readonly
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width"
                />
            </div>

            <div class="details-view-edit-field">
                <label class="details-view-label" for="change-username-new">
                    <i class="fas fa-user-tag details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("New username") }}
                </label>
                <input
                    id="change-username-new"
                    v-model="newUsername"
                    type="text"
                    name="username"
                    :disabled="busy"
                    maxlength="80"
                    class="form-control form-control-full-width auto-focus"
                    :aria-invalid="errorUsername ? 'true' : undefined"
                    :aria-describedby="errorUsername ? 'change-username-new-error' : undefined"
                />
                <div v-if="errorUsername" id="change-username-new-error" class="form-error" role="alert">{{ errorUsername }}</div>
            </div>

            <div v-if="!keycloakSso" class="details-view-edit-field details-view-edit-field--full">
                <label class="details-view-label" for="change-username-password">
                    <i class="fas fa-key details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Input your account password to confirm this action") }}
                </label>
                <PasswordInput
                    id="change-username-password"
                    v-model:val="password"
                    :disabled="busy"
                    name="password"
                    :aria-invalid="errorPassword ? 'true' : undefined"
                    :aria-describedby="errorPassword ? 'change-username-password-error' : undefined"
                ></PasswordInput>
                <div v-if="errorPassword" id="change-username-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
            </div>

            <div v-if="!keycloakSso && tfa" class="details-view-edit-field details-view-edit-field--full">
                <label class="details-view-label" for="change-username-tfa">
                    <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Input your one-time password to confirm this action") }}
                </label>
                <input
                    id="change-username-tfa"
                    v-model="token"
                    type="text"
                    name="tfa-token"
                    autocomplete="off"
                    :disabled="busy"
                    maxlength="6"
                    :placeholder="$t('012345')"
                    class="form-control form-control-full-width"
                    :aria-invalid="errorToken ? 'true' : undefined"
                    :aria-describedby="errorToken ? 'change-username-tfa-error' : undefined"
                />
                <div v-if="errorToken" id="change-username-tfa-error" class="form-error" role="alert">{{ errorToken }}</div>
            </div>
        </div>

        <div class="details-view-edit-actions">
            <button type="submit" :disabled="busy || !newUsername || username === newUsername" class="btn btn-primary">
                <i class="fas fa-user-tag" aria-hidden="true"></i>
                {{ $t("Change username") }}
            </button>
        </div>
        <div v-if="error" class="form-error" role="alert">{{ error }}</div>
    </form>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { getUniqueStringId } from "@/utils/unique-id";

import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { ApiAccount } from "@/api/api-group-account";

import PasswordInput from "@/components/utils/PasswordInput.vue";

export default defineComponent({
    name: "ChangeUsernamePage",
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
            username: AuthController.Username,
            newUsername: "",
            errorUsername: "",

            password: "",
            errorPassword: "",

            tfa: AuthController.RequiresTwoFactorAuthentication,
            token: "",
            errorToken: "",

            error: "",
            busy: false,
        };
    },
    computed: {
        keycloakSso: function (): boolean {
            return AuthController.KeycloakSsoEnabled;
        },
    },
    methods: {
        onAuthChanged: function () {
            this.username = AuthController.Username;
            this.tfa = AuthController.RequiresTwoFactorAuthentication;
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
            this.errorUsername = "";
            this.errorPassword = "";
            this.errorToken = "";

            this.busy = true;

            const password = this.keycloakSso ? "" : this.password;
            const tfaToken = this.keycloakSso ? "" : this.token;

            Request.Pending(
                this.saveRequestId,
                ApiAccount.ChangeUsername({ username: this.newUsername, password: password, tfa_token: tfaToken }),
            )
                .onSuccess(() => {
                    this.busy = false;
                    this.password = "";
                    this.token = "";
                    AuthController.CheckAuthStatus();
                    this.$showSnackBar(this.$t("Username successfully changed"));
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
                        badRequestUsernameInvalid: () => {
                            this.errorUsername = this.$t("Invalid username provided");
                        },
                        badRequestUsernameInUse: () => {
                            this.errorUsername = this.$t("The provided username is already in use");
                        },
                        badRequestWrongPassword: () => {
                            this.errorPassword = this.$t("Wrong password");
                        },
                        badRequestKeycloakUnavailable: () => {
                            this.error = this.$t("Could not change your username. Please try again.");
                        },
                        badRequestNoKeycloakSession: () => {
                            this.error = this.$t("Your session has expired. Sign in again to continue.");
                            void AuthController.ReauthenticateWithKeycloak();
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

        if (!AuthController.isAuthenticated()) {
            this.$requireLogin();
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped></style>
