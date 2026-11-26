<template>
    <form class="details-view-edit-form" tabindex="-1" @submit="submit">
        <div class="details-view-edit-grid">
            <div class="details-view-edit-field">
                <label class="details-view-label" for="change-email-current">
                    <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Current email") }}
                </label>
                <input
                    id="change-email-current"
                    v-model="email"
                    type="text"
                    name="old-email"
                    readonly
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width"
                />
            </div>

            <div class="details-view-edit-field">
                <label class="details-view-label" for="change-email-new">
                    <i class="fas fa-envelope-open-text details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("New email") }}
                </label>
                <input
                    id="change-email-new"
                    v-model="newEmail"
                    type="text"
                    name="email"
                    :disabled="busy"
                    maxlength="255"
                    class="form-control form-control-full-width auto-focus"
                    :aria-invalid="errorEmail ? 'true' : undefined"
                    :aria-describedby="errorEmail ? 'change-email-new-error' : undefined"
                />
                <div v-if="errorEmail" id="change-email-new-error" class="form-error" role="alert">{{ errorEmail }}</div>
            </div>

            <div v-if="!keycloakSso" class="details-view-edit-field details-view-edit-field--full">
                <label class="details-view-label" for="change-email-password">
                    <i class="fas fa-key details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Input your account password to confirm this action") }}
                </label>
                <PasswordInput
                    id="change-email-password"
                    v-model:val="password"
                    :disabled="busy"
                    name="password"
                    :aria-invalid="errorPassword ? 'true' : undefined"
                    :aria-describedby="errorPassword ? 'change-email-password-error' : undefined"
                ></PasswordInput>
                <div v-if="errorPassword" id="change-email-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
            </div>

            <div v-if="!keycloakSso && tfa" class="details-view-edit-field details-view-edit-field--full">
                <label class="details-view-label" for="change-email-tfa">
                    <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                    {{ $t("Input your one-time password to confirm this action") }}
                </label>
                <input
                    id="change-email-tfa"
                    v-model="token"
                    type="text"
                    name="tfa-token"
                    autocomplete="off"
                    :disabled="busy"
                    maxlength="6"
                    :placeholder="$t('012345')"
                    class="form-control form-control-full-width"
                    :aria-invalid="errorToken ? 'true' : undefined"
                    :aria-describedby="errorToken ? 'change-email-tfa-error' : undefined"
                />
                <div v-if="errorToken" id="change-email-tfa-error" class="form-error" role="alert">{{ errorToken }}</div>
            </div>
        </div>

        <div class="details-view-edit-actions">
            <button type="submit" :disabled="busy || !newEmail || email === newEmail" class="btn btn-primary">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                {{ $t("Change email") }}
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
    name: "ChangeEmailPage",
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
            email: AuthController.Email,
            newEmail: "",
            errorEmail: "",

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
            this.email = AuthController.Email;
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
            this.errorEmail = "";
            this.errorPassword = "";
            this.errorToken = "";

            this.busy = true;

            const password = this.keycloakSso ? "" : this.password;
            const tfaToken = this.keycloakSso ? "" : this.token;

            this.$getCaptcha("change_email").then((captcha) => {
                Request.Pending(
                    this.saveRequestId,
                    ApiAccount.ChangeEmail({ email: this.newEmail, tfa_token: tfaToken, password: password, captcha: captcha }),
                )
                    .onSuccess(() => {
                        this.busy = false;
                        this.password = "";
                        this.token = "";

                        AuthController.CheckAuthStatus();

                        this.$showMessageModal(
                            this.$t("Email change requested"),
                            this.$t(
                                "Check your inbox for an email we have sent to your new email in order to verify it and complete the change",
                            ),
                        );
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
                            badRequestEmailInvalid: () => {
                                this.errorEmail = this.$t("Invalid email provided");
                            },
                            badRequestEmailInUse: () => {
                                this.errorEmail = this.$t("The provided email is already in use");
                            },
                            badRequestCaptcha: () => {
                                this.error = this.$t("Please, prove you are not a robot by solving the captcha");
                            },
                            badRequestWrongPassword: () => {
                                this.errorPassword = this.$t("Wrong password");
                            },
                            badRequestKeycloakUnavailable: () => {
                                this.error = this.$t("Could not complete the email change. Please try again.");
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
