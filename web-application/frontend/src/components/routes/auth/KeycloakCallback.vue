<template>
    <div class="modal-container modal-container-signup modal-container-opaque no-transition" tabindex="-1">
        <div class="modal-dialog modal-md">
            <div class="modal-header">
                <div class="modal-title no-close">{{ $t("Logging in") }}</div>
            </div>
            <div class="modal-body">
                <div class="">
                    <p><i class="fa fa-spinner fa-spin" aria-hidden="true"></i> {{ $t("Logging in") }}...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { ApiAuth } from "@/api/api-group-auth";
import { AuthController } from "@/control/auth";
import { fetchFromLocalStorage } from "@/utils/local-storage";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

export default defineComponent({
    name: "KeycloakCallback",
    components: {},
    setup: function () {
        return {
            requestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            done: false,
            returnHandled: false,
        };
    },
    methods: {
        onAuthChanged: function () {
            const code = (this.$route.query.code || "") + "";

            if (code && !this.done) {
                this.done = true;
                this.completeLogin();
                return;
            }

            if (AuthController.isAuthenticated()) {
                this.finishKeycloakReturn();
            } else if (AuthController.isAskingForTwoFactor()) {
                this.$router.push({ name: "tfa-login" });
            } else if (AuthController.FirstTimeLoaded && !this.done) {
                this.done = true;
                this.completeLogin();
            }
        },

        clearSavedOAuthState: function () {
            localStorage.removeItem(AuthController.KEYCLOAK_OAUTH_STATE_KEY);
        },

        finishKeycloakReturn: function () {
            if (this.returnHandled) {
                return;
            }

            this.returnHandled = true;

            const urlState = (this.$route.query.state || "") + "";
            const savedState = fetchFromLocalStorage(AuthController.KEYCLOAK_OAUTH_STATE_KEY, "");

            if (!urlState || !savedState || urlState !== savedState) {
                this.clearSavedOAuthState();
                this.$goBackFromLogin();
                return;
            }

            this.clearSavedOAuthState();

            AuthController.ResolveKeycloakReturnPath(urlState).then((returnPath) => {
                if (returnPath) {
                    void AuthController.CheckAuthStatus().finally(() => {
                        void this.$router.push(returnPath);
                    });
                    return;
                }

                this.$goBackFromLogin();
            });
        },

        completeLogin: function () {
            const code = (this.$route.query.code || "") + "";
            const state = (this.$route.query.state || "") + "";
            const savedState = fetchFromLocalStorage(AuthController.KEYCLOAK_OAUTH_STATE_KEY, "");

            if (!code) {
                void this.finishKeycloakReturn();
                return;
            }

            if (!state || !savedState || state !== savedState) {
                this.handleCallbackFailure();
                return;
            }

            Timeouts.Abort(this.requestId);
            Request.Abort(this.requestId);

            Request.Pending(this.requestId, ApiAuth.KeycloakCallback({ code, state }))
                .onSuccess((res) => {
                    AuthController.SetSession(res.session_id);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        badRequestUserBanned: () => {
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("The user you are trying to log into is banned from the platform"),
                            );
                            this.redirectToLoginAfterFailure();
                        },
                        badRequestOauthError: () => {
                            this.handleCallbackFailure(this.$t("Could not complete sign in with Keycloak. Please try again."));
                        },
                        badRequestIdentityMismatch: () => {
                            this.handleCallbackFailure(
                                this.$t(
                                    "The Keycloak account does not match the signed-in user. Please try again without switching accounts.",
                                ),
                            );
                        },
                        badRequestInvalidState: () => {
                            this.handleCallbackFailure();
                        },
                        badRequestNoCode: () => {
                            this.handleCallbackFailure();
                        },
                        badRequestKeycloakDisabled: () => {
                            this.redirectToLoginAfterFailure();
                        },
                        badRequest: () => {
                            this.handleCallbackFailure();
                        },
                        temporalError: () => {
                            Timeouts.Set(this.requestId, 1500, () => {
                                this.done = false;
                                this.completeLogin();
                            });
                        },
                        badRequestKeycloakEmailNotVerified: () => {
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("Your email address is not verified. Please verify your email address to continue."),
                            );
                            this.redirectToLoginAfterFailure();
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.requestId, 1500, () => {
                        this.done = false;
                        this.completeLogin();
                    });
                });
        },

        /**
         * After AIA (e.g. UPDATE_PASSWORD), prefer returning in-app if a marketplace session remains
         * instead of pushing /login (SSO beforeEach would start another authorize → redirect loop).
         */
        handleCallbackFailure: function (message?: string) {
            if (AuthController.Session) {
                if (message) {
                    this.$showMessageModal(this.$t("Error"), message);
                }

                void AuthController.CheckAuthStatus().finally(() => {
                    if (AuthController.isAuthenticated()) {
                        void this.finishKeycloakReturn();
                    } else {
                        this.redirectToLoginAfterFailure();
                    }
                });
                return;
            }

            this.clearSavedOAuthState();
            this.$showMessageModal(this.$t("Error"), message || this.$t("Invalid or expired login session. Please try again."));
            this.redirectToLoginAfterFailure();
        },

        redirectToLoginAfterFailure: function () {
            this.clearSavedOAuthState();
            this.$router.push({ name: "login" });
        },
    },
    mounted: function () {
        AuthController.ApplyUiPreferencesFromKeycloak();
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.onAuthChanged();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.requestId);
        Request.Abort(this.requestId);
    },
});
</script>

<style></style>
