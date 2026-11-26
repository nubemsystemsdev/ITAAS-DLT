<template>
    <div class="modal-container modal-container-login modal-container-opaque no-transition login-page-shell auth-page-shell" tabindex="-1">
        <div class="login-layout auth-layout">
            <div v-if="keycloakSso" class="modal-dialog login-card auth-card">
                <div class="login-card-header auth-card-header">
                    <div class="auth-brand login-brand brand-in-card">
                        <div class="auth-brand-logo login-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>
                    <h1>{{ $t("Log in") }}</h1>
                    <p><i class="fa fa-spinner fa-spin" aria-hidden="true"></i> {{ $t("Logging in") }}...</p>
                </div>

                <div class="form-error" v-if="error" role="alert">{{ error }}</div>
            </div>

            <form v-else @submit="submit" class="modal-dialog login-card auth-card">
                <div class="login-card-header auth-card-header">
                    <div class="auth-brand login-brand brand-in-card">
                        <div class="auth-brand-logo login-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>
                    <h1>{{ $t("Log in") }}</h1>
                    <p>{{ $t("Please authenticate to manage your digital assets.") }}</p>
                </div>

                <div class="form-group login-input-group auth-input-group">
                    <label for="login-username">{{ $t("Username") }}</label>
                    <div class="login-field-wrapper auth-field-wrapper form-control-accent-wrapper">
                        <input
                            id="login-username"
                            type="text"
                            name="username"
                            v-model="username"
                            :disabled="busy"
                            maxlength="255"
                            class="form-control form-control-full-width form-control-auth auto-focus login-field"
                            autocomplete="username"
                        />
                    </div>
                </div>

                <div class="form-group login-input-group auth-input-group">
                    <div class="login-password-head auth-password-head">
                        <label for="login-password">{{ $t("Password") }}</label>
                        <router-link :to="{ name: 'forgot-password' }" class="login-inline-link auth-inline-link form-link">{{
                            $t("Forgot your password?")
                        }}</router-link>
                    </div>
                    <div
                        class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
                    >
                        <PasswordInput
                            id="login-password"
                            :disabled="busy"
                            v-model:val="password"
                            name="password"
                            autocomplete="current-password"
                            :aria-invalid="errorCredentials ? 'true' : undefined"
                            :aria-describedby="errorCredentials ? 'login-password-error' : undefined"
                        ></PasswordInput>
                    </div>
                    <div v-if="errorCredentials" id="login-password-error" class="form-error" role="alert">{{ errorCredentials }}</div>
                </div>

                <label class="login-remember-row auth-remember-row" for="login-remember">
                    <input id="login-remember" type="checkbox" v-model="remember" :disabled="busy" />
                    <span>{{ $t("Remember me?") }}</span>
                </label>

                <div class="form-group-buttons">
                    <button type="submit" :disabled="busy" class="btn btn-primary">
                        {{ $t("Login") }}
                    </button>
                </div>

                <div class="form-error" v-if="error" role="alert">{{ error }}</div>

                <div class="tp-services-group" v-if="tpServices.length > 0">
                    <p v-for="tp of tpServices" :key="tp.id">
                        <a :href="tp.url" class="form-link">{{ $t("Login with") }} {{ tp.name }}</a>
                    </p>
                </div>

                <div class="login-links-block auth-links-block">
                    <p>
                        <router-link :to="{ name: 'signup' }" class="form-link">{{ $t("Create an account") }}</router-link>
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
import { defineComponent } from "vue";

import PasswordInput from "@/components/utils/PasswordInput.vue";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { ApiAuth } from "@/api/api-group-auth";
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import CookiesModal from "@/components/modals/CookiesModal.vue";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import nubemsystemsLogoLight from "@/assets/nubemsystem-logo-navy.png";
import nubemsystemsLogoDark from "@/assets/nubemsystem-logo-white.png";

export default defineComponent({
    name: "LoginPage",
    components: {
        ChangeLanguageModal,
        PasswordInput,
        CookiesModal,
    },
    setup: function () {
        return {
            requestId: getUniqueStringId(),
            tpLoadRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            username: "",
            password: "",

            errorCredentials: "",

            remember: true,

            busy: false,
            error: "",

            theme: getTheme(),
            displayLanguageModal: false,

            displayCookiesModal: false,

            tpServices: [],
        };
    },
    computed: {
        brandLogo(): string {
            return this.theme === "dark" ? nubemsystemsLogoDark : nubemsystemsLogoLight;
        },
        keycloakSso: function (): boolean {
            return AuthController.KeycloakSsoEnabled;
        },
    },
    methods: {
        loginWithKeycloak: function () {
            if (this.busy) {
                return;
            }
            this.busy = true;
            this.error = "";
            AuthController.LoginWithKeycloak().catch(() => {
                this.busy = false;
                this.error = this.$t("Could not connect to the server");
            });
        },

        loadTp: function () {
            Timeouts.Abort(this.tpLoadRequestId);

            Request.Pending(this.tpLoadRequestId, ApiAuth.ThirdPartyLoginDetails())
                .onSuccess((tpServices) => {
                    this.tpServices = tpServices;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        temporalError: () => {
                            Timeouts.Set(this.tpLoadRequestId, 1500, this.loadTp.bind(this));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    Timeouts.Set(this.tpLoadRequestId, 1500, this.loadTp.bind(this));
                });
        },

        submit: function (e: Event) {
            if (e) {
                e.preventDefault();
            }
            if (this.busy) {
                return;
            }
            this.busy = true;
            this.error = "";
            this.errorCredentials = "";
            this.$getCaptcha("login").then((captcha) => {
                Request.Pending(
                    this.requestId,
                    ApiAuth.Login({ username: this.username, password: this.password, captcha: captcha, remember: this.remember }),
                )
                    .onSuccess((response) => {
                        this.busy = false;
                        AuthController.SetSession(response.session_id);
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
                            badRequestInvalidCredentials: () => {
                                this.errorCredentials = this.$t("Invalid username or password");
                            },
                            badRequest: () => {
                                this.errorCredentials = this.$t("Invalid username or password");
                            },
                            forbiddenInvalidCredentials: () => {
                                this.errorCredentials = this.$t("Invalid username or password");
                            },
                            forbiddenUserBanned: () => {
                                this.error = this.$t("The user you are trying to log into is banned from the platform");
                            },
                            forbidden: () => {
                                this.errorCredentials = this.$t("Invalid username or password");
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

        onAuthChanged: function () {
            if (AuthController.isAuthenticated()) {
                this.$router.replace({ name: "dashboard" });
            } else if (AuthController.isAskingForTwoFactor()) {
                this.$router.push({ name: "tfa-login" });
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
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
        this.onAuthChanged();
        if (this.keycloakSso) {
            if (!AuthController.isAuthenticated()) {
                this.loginWithKeycloak();
            }
            return;
        }
        this.$autoFocus();
        this.loadTp();
    },
    beforeUnmount: function () {
        Request.Abort(this.requestId);
        Request.Abort(this.tpLoadRequestId);
        Timeouts.Abort(this.tpLoadRequestId);
    },
});
</script>

<style>
@import "@/style/auth.css";
</style>
