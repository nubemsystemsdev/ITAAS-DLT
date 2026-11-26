<template>
    <div tabindex="-1">
        <div v-if="keycloakSso" class="details-view-edit-form">
            <div class="details-view-edit-grid">
                <p class="details-view-edit-description details-view-edit-field--full">
                    {{
                        $t(
                            "Two-factor authentication is managed by your identity provider. Continue to set up or manage your mobile authenticator.",
                        )
                    }}
                </p>
            </div>
            <div class="details-view-edit-actions">
                <button type="button" class="btn btn-primary" :disabled="busyKeycloak" @click="openKeycloakTotpSetup">
                    <i class="fas fa-mobile-alt" aria-hidden="true"></i>
                    {{ $t("Set up mobile authenticator") }}
                </button>
            </div>
            <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        </div>

        <ComponentLoader v-else-if="loading"></ComponentLoader>

        <form v-else class="details-view-edit-form" @submit="submit">
            <div v-if="!tfa" class="details-view-edit-grid">
                <div class="details-view-edit-field details-view-edit-field--full">
                    <span class="details-view-label">
                        <i class="fas fa-qrcode details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Scan this QR code with your authentication app") }}
                    </span>
                    <div class="details-view-tfa-qr tfa-code-container">
                        <qrcode-vue :value="uri" :size="300" level="H" />
                    </div>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="tfa-enable-token">
                        <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Input your one-time password") }}
                    </label>
                    <input
                        id="tfa-enable-token"
                        v-model="token"
                        type="text"
                        name="tfa-token"
                        autocomplete="off"
                        :disabled="busy"
                        maxlength="6"
                        class="form-control form-control-full-width auto-focus"
                        :aria-invalid="errorToken ? 'true' : undefined"
                        :aria-describedby="errorToken ? 'tfa-enable-token-error' : undefined"
                    />
                    <div v-if="errorToken" id="tfa-enable-token-error" class="form-error" role="alert">{{ errorToken }}</div>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="tfa-enable-secret">
                        <i class="fas fa-key details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("This is the corresponding TOTP secret (for security backup)") }}
                    </label>
                    <input
                        id="tfa-enable-secret"
                        v-model="secret"
                        type="text"
                        name="secret"
                        readonly
                        :disabled="busy"
                        maxlength="255"
                        class="form-control form-control-full-width"
                    />
                </div>

                <div class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="tfa-enable-password">
                        <i class="fas fa-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Input your account password to confirm this action") }}
                    </label>
                    <PasswordInput
                        v-model:val="password"
                        id="tfa-enable-password"
                        :disabled="busy"
                        name="password"
                        :aria-invalid="errorPassword ? 'true' : undefined"
                        :aria-describedby="errorPassword ? 'tfa-enable-password-error' : undefined"
                    ></PasswordInput>
                    <div v-if="errorPassword" id="tfa-enable-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
                </div>

                <p class="details-view-edit-description details-view-edit-field--full">
                    {{ $t("Warning: By enabling two factor authentication, all your sessions will be closed.") }}
                </p>
            </div>

            <div v-else class="details-view-edit-grid">
                <p class="details-view-edit-description details-view-edit-field--full">
                    {{ $t("Two factor authentication is enabled for your account") }}
                </p>

                <div class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="tfa-disable-token">
                        <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Input your one-time password") }}
                    </label>
                    <input
                        id="tfa-disable-token"
                        v-model="token"
                        type="text"
                        name="tfa-token"
                        autocomplete="off"
                        :disabled="busy"
                        maxlength="6"
                        class="form-control form-control-full-width auto-focus"
                        :aria-invalid="errorToken ? 'true' : undefined"
                        :aria-describedby="errorToken ? 'tfa-disable-token-error' : undefined"
                    />
                    <div v-if="errorToken" id="tfa-disable-token-error" class="form-error" role="alert">{{ errorToken }}</div>
                </div>
            </div>

            <div class="details-view-edit-actions">
                <button v-if="!tfa" type="submit" :disabled="busy" class="btn btn-primary">
                    <i class="fas fa-lock" aria-hidden="true"></i>
                    {{ $t("Enable two factor authentication") }}
                </button>
                <button v-else type="submit" :disabled="busy" class="btn btn-secondary-danger">
                    <i class="fas fa-lock-open" aria-hidden="true"></i>
                    {{ $t("Disable two factor authentication") }}
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
import { Timeouts } from "@/utils/timeout";
import { ApiAccount } from "@/api/api-group-account";

import PasswordInput from "@/components/utils/PasswordInput.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";

import QrcodeVue from "qrcode.vue";

export default defineComponent({
    name: "TwoFactorAuthenticationPage",
    components: {
        PasswordInput,
        ComponentLoader,
        QrcodeVue,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,

            tfa: AuthController.RequiresTwoFactorAuthentication,

            secret: "",
            uri: "",

            token: "",
            errorToken: "",

            password: "",
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
        openKeycloakTotpSetup: function () {
            if (this.busyKeycloak) {
                return;
            }

            this.error = "";
            this.busyKeycloak = true;

            AuthController.ConfigureTotpWithKeycloak().catch(() => {
                this.busyKeycloak = false;
                this.error = this.$t("Could not open authenticator setup. Try again.");
            });
        },

        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }

            this.tfa = AuthController.RequiresTwoFactorAuthentication;

            if (this.keycloakSso) {
                this.loading = false;
                return;
            }

            this.loading = true;

            Request.Pending(this.loadRequestId, ApiAccount.GenerateTFA())
                .onSuccess((generatedTFA) => {
                    this.loading = false;
                    this.token = "";
                    this.secret = generatedTFA.secret;
                    this.uri = generatedTFA.uri;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.loading = false;
                            this.error = this.$t("Forbidden");
                        },
                        forbiddenKeycloakOnly: () => {
                            this.loading = false;
                            this.error = this.$t(
                                "Two-factor authentication is managed by your identity provider. Continue to set up or manage your mobile authenticator.",
                            );
                        },
                        temporalError: () => {
                            // Retry
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    // Retry
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },

        submit: function (e: Event) {
            if (e) {
                e.preventDefault();
            }

            if (this.keycloakSso || this.busy) {
                return;
            }

            this.error = "";
            this.errorPassword = "";
            this.errorToken = "";

            this.busy = true;

            if (!this.tfa) {
                Request.Pending(
                    this.saveRequestId,
                    ApiAccount.SetupTFA({ secret: this.secret, password: this.password, token: this.token }),
                )
                    .onSuccess(() => {
                        this.busy = false;
                        this.password = "";
                        this.token = "";
                        this.tfa = true;

                        AuthController.CheckAuthStatus();

                        this.$showSnackBar(this.$t("Two factor authentication successfully enabled"));
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
                            badRequestAlready: () => {
                                this.error = this.$t("Two factor authentication is already enabled for this account");
                                AuthController.CheckAuthStatus();
                            },
                            badRequestInvalid: () => {
                                this.errorToken = this.$t("Invalid one-time password");
                            },
                            forbidden: () => {
                                this.error = this.$t("Forbidden");
                            },
                            forbiddenKeycloakOnly: () => {
                                this.error = this.$t(
                                    "Two-factor authentication is managed by your identity provider. Continue to set up or manage your mobile authenticator.",
                                );
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
            } else {
                Request.Pending(this.saveRequestId, ApiAccount.RemoveTFA({ token: this.token }))
                    .onSuccess(() => {
                        this.busy = false;
                        this.password = "";
                        this.token = "";
                        this.tfa = false;

                        AuthController.CheckAuthStatus();

                        this.$showSnackBar(this.$t("Two factor authentication successfully disabled"));
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
                            badRequestNotEnabled: () => {
                                this.error = this.$t("Two factor authentication is not enabled for this account");
                                AuthController.CheckAuthStatus();
                            },
                            badRequestInvalid: () => {
                                this.errorToken = this.$t("Invalid one-time password");
                            },
                            forbidden: () => {
                                this.error = this.$t("Forbidden");
                            },
                            forbiddenKeycloakOnly: () => {
                                this.error = this.$t(
                                    "Two-factor authentication is managed by your identity provider. Continue to set up or manage your mobile authenticator.",
                                );
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
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));

        this.load();
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
    },
});
</script>

<style scoped>
.dark-theme .tfa-code-container canvas {
    border: solid 4px white;
}
</style>
