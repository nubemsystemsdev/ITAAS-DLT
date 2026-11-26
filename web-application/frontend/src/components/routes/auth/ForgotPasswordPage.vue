<template>
    <div
        class="modal-container modal-container-signup modal-container-opaque no-transition auth-page-shell forgot-page-shell"
        tabindex="-1"
    >
        <div class="auth-layout forgot-layout">
            <form @submit="submit" class="modal-dialog auth-card forgot-card">
                <div class="auth-card-header forgot-card-header">
                    <div class="auth-brand forgot-brand brand-in-card">
                        <div class="auth-brand-logo forgot-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>

                    <h1>{{ $t("Forgot your password?") }}</h1>
                    <p>{{ $t("Input the email of your account and we will send you an email to reset your password.") }}</p>
                </div>

                <div v-if="!success" class="form-group auth-input-group forgot-input-group">
                    <label for="forgot-email">{{ $t("Email") }}</label>
                    <div class="auth-field-wrapper form-control-accent-wrapper">
                        <input
                            id="forgot-email"
                            type="email"
                            name="email"
                            v-model="email"
                            :disabled="busy"
                            maxlength="255"
                            class="form-control form-control-full-width form-control-auth auto-focus"
                            autocomplete="email"
                            :placeholder="$t('your@company.com')"
                            :aria-invalid="error ? 'true' : undefined"
                            :aria-describedby="error ? 'forgot-email-error' : undefined"
                        />
                    </div>
                </div>

                <div v-if="error" id="forgot-email-error" class="form-error" role="alert">{{ error }}</div>

                <div class="form-group-buttons" v-if="!success">
                    <button type="submit" :disabled="busy" class="btn btn-primary">
                        {{ $t("Send") }}
                    </button>
                </div>

                <div class="auth-links-block forgot-success-block" v-if="success">
                    <p>{{ $t("We have sent an email with the instructions in order to reset your password.") }}</p>
                </div>

                <div class="auth-links-block forgot-links-block">
                    <p>
                        <router-link :to="{ name: 'login' }" class="form-link">{{ $t("Back to login form") }}</router-link>
                    </p>
                </div>

                <div class="auth-card-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        :title="$t('Select your language')"
                        :aria-label="$t('Select your language')"
                        @click="selectLanguage"
                    >
                        <i class="fas fa-language blue-icon" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        class="btn btn-secondary"
                        :title="$t('Change theme')"
                        :aria-label="$t('Change theme')"
                        @click="invertTheme"
                    >
                        <i v-if="theme === 'dark'" class="fas fa-sun blue-icon" aria-hidden="true"></i>
                        <i v-else class="fas fa-moon blue-icon" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        class="btn btn-secondary"
                        :title="$t('Change cookies preferences')"
                        :aria-label="$t('Change cookies preferences')"
                        @click="openCookiesModal"
                    >
                        <i class="fas fa-cookie blue-icon" aria-hidden="true"></i>
                    </button>
                </div>
            </form>
        </div>

        <ChangeLanguageModal v-if="displayLanguageModal" v-model:display="displayLanguageModal"></ChangeLanguageModal>
        <CookiesModal v-if="displayCookiesModal" v-model:display="displayCookiesModal"></CookiesModal>
    </div>
</template>

<script lang="ts">
import { ApiAuth } from "@/api/api-group-auth";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import CookiesModal from "@/components/modals/CookiesModal.vue";
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import nubemsystemsLogoLight from "@/assets/nubemsystem-logo-navy.png";
import nubemsystemsLogoDark from "@/assets/nubemsystem-logo-white.png";

export default defineComponent({
    name: "ForgotPasswordPage",
    components: {
        ChangeLanguageModal,
        CookiesModal,
    },
    data: function () {
        return {
            email: "",

            busy: false,
            success: false,
            error: "",

            theme: getTheme(),
            displayLanguageModal: false,
            displayCookiesModal: false,
        };
    },
    computed: {
        brandLogo(): string {
            return this.theme === "dark" ? nubemsystemsLogoDark : nubemsystemsLogoLight;
        },
    },
    methods: {
        submit: function (e) {
            if (e) {
                e.preventDefault();
            }
            if (this.busy) {
                return;
            }
            this.busy = true;
            this.error = "";
            this.$getCaptcha("forgot_password").then((captcha) => {
                Request.Do(ApiAuth.RequestPasswordReset({ email: this.email, captcha: captcha }))
                    .onSuccess(() => {
                        this.busy = false;
                        this.success = true;
                    })
                    .onCancel(() => {
                        this.busy = false;
                    })
                    .onRequestError((err, handleErr) => {
                        this.busy = false;
                        handleErr(err, {
                            badRequestCaptcha: () => {
                                this.error = this.$t("Please, prove you are not a robot by solving the captcha");
                            },
                            badRequestEmailInvalid: () => {
                                this.error = this.$t("Invalid email provided");
                            },
                            badRequest: () => {
                                this.error = this.$t("Invalid email provided");
                            },
                            notFound: () => {
                                this.error = this.$t("We did not find any account with the provided email");
                            },
                            serverError: () => {
                                this.error = this.$t("Internal server error");
                            },
                            networkError: () => {
                                this.error = this.$t("Could not connect to the server");
                            },
                            notFoundUserNotFound: () => {
                                this.error = this.$t("We did not find any account with the provided email");
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

        onAuthChanged: function () {
            if (AuthController.isAuthenticated()) {
                this.$goBackFromLogin();
            }
        },

        invertTheme: function () {
            setTheme(this.theme === "dark" ? "light" : "dark");
        },

        onThemeChanged: function (t: ColorThemeName) {
            this.theme = t;
        },

        selectLanguage: function () {
            this.displayLanguageModal = true;
        },

        openCookiesModal: function () {
            this.displayCookiesModal = true;
        },
    },
    mounted: function () {
        if (AuthController.redirectIfKeycloakBlocksNativeAuth()) {
            return;
        }
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
        this.onAuthChanged();
        this.$autoFocus();
    },
    beforeUnmount: function () {},
});
</script>

<style>
@import "@/style/auth.css";
</style>
