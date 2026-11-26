<template>
    <div tabindex="-1">
        <div v-if="keycloakSso" class="details-view-edit-form">
            <div class="details-view-edit-grid">
                <p class="details-view-edit-description details-view-edit-field--full">
                    {{ $t("Password changes are managed by your identity provider. Continue to update your password securely.") }}
                </p>
            </div>
            <div class="details-view-edit-actions">
                <button type="button" class="btn btn-primary" :disabled="busyKeycloak" @click="openKeycloakUpdatePassword">
                    <i class="fas fa-key" aria-hidden="true"></i>
                    {{ $t("Change password") }}
                </button>
            </div>
            <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        </div>

        <form v-else class="details-view-edit-form" tabindex="-1" @submit="submit">
            <div class="details-view-edit-grid">
                <div class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="change-password-current">
                        <i class="fas fa-key details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Current password") }}
                    </label>
                    <PasswordInput
                        v-model:val="oldPassword"
                        id="change-password-current"
                        :disabled="busy"
                        name="old-password"
                        :auto-focus="true"
                        :aria-invalid="errorOldPassword ? 'true' : undefined"
                        :aria-describedby="errorOldPassword ? 'change-password-current-error' : undefined"
                    ></PasswordInput>
                    <div v-if="errorOldPassword" id="change-password-current-error" class="form-error" role="alert">
                        {{ errorOldPassword }}
                    </div>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="change-password-new">
                        <i class="fas fa-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("New password") }}
                    </label>
                    <PasswordInput
                        v-model:val="password"
                        id="change-password-new"
                        :disabled="busy"
                        name="password"
                        :is-new-password="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'change-password-new-error' : undefined"
                    ></PasswordInput>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="change-password-repeat">
                        <i class="fas fa-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Repeat the new password") }}
                    </label>
                    <PasswordInput
                        v-model:val="password2"
                        id="change-password-repeat"
                        :disabled="busy"
                        name="password2"
                        :is-new-password="true"
                        :is-repeated-password="true"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'change-password-new-error' : undefined"
                    ></PasswordInput>
                    <div v-if="errorPassword" id="change-password-new-error" class="form-error" role="alert">{{ errorPassword }}</div>
                </div>
            </div>

            <div class="details-view-edit-actions">
                <button type="submit" :disabled="busy" class="btn btn-primary">
                    <i class="fas fa-key" aria-hidden="true"></i>
                    {{ $t("Change password") }}
                </button>
            </div>
            <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { getUniqueStringId } from "@/utils/unique-id";

import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { ApiAccount } from "@/api/api-group-account";

import PasswordInput from "@/components/utils/PasswordInput.vue";

export default defineComponent({
    name: "ChangePasswordPage",
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
            oldPassword: "",
            errorOldPassword: "",

            password: "",
            password2: "",
            errorPassword: "",

            error: "",
            busy: false,
            busyKeycloak: false,
        };
    },
    computed: {
        keycloakSso: function (): boolean {
            return AuthController.KeycloakSsoEnabled;
        },
    },
    methods: {
        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },

        openKeycloakUpdatePassword: function () {
            if (this.busyKeycloak) {
                return;
            }

            this.error = "";
            this.busyKeycloak = true;

            AuthController.UpdatePasswordWithKeycloak().catch(() => {
                this.busyKeycloak = false;
                this.error = this.$t("Could not open password change. Try again.");
            });
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

            Request.Pending(this.saveRequestId, ApiAccount.ChangePassword({ old_password: this.oldPassword, new_password: this.password }))
                .onSuccess(() => {
                    this.busy = false;
                    this.password = "";
                    this.password2 = "";
                    this.oldPassword = "";

                    AuthController.CheckAuthStatus();

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
                        badRequestKeycloakUnavailable: () => {
                            this.error = this.$t("Could not change your password. Please try again.");
                        },
                        badRequest: () => {
                            this.error = this.$t("Could not change your password. Please try again.");
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
            return;
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped></style>
