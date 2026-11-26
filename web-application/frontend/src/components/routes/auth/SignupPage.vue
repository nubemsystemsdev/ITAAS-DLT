<template>
    <div
        class="modal-container modal-container-signup modal-container-opaque no-transition auth-page-shell signup-page-shell"
        tabindex="-1"
    >
        <div class="auth-layout signup-layout">
            <div v-if="keycloakSso" class="modal-dialog auth-card signup-card">
                <div class="auth-card-header signup-card-header">
                    <div class="auth-brand signup-brand brand-in-card">
                        <div class="auth-brand-logo signup-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>
                    <h1>{{ $t("Create account") }}</h1>
                    <p><i class="fa fa-spinner fa-spin" aria-hidden="true"></i> {{ $t("Loading") }}...</p>
                </div>

                <div class="form-error" v-if="error" role="alert">{{ error }}</div>
            </div>

            <form v-else @submit="submit" class="modal-dialog auth-card signup-card">
                <div class="auth-card-header signup-card-header">
                    <div class="auth-brand signup-brand brand-in-card">
                        <div class="auth-brand-logo signup-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>
                    <h1>{{ $t("Create account") }}</h1>
                    <p>{{ $t("Sign up to NubemMarket") }}</p>
                </div>

                <div class="form-group auth-input-group signup-input-group">
                    <label for="signup-username">{{ $t("Name") }}</label>
                    <div class="auth-field-wrapper form-control-accent-wrapper">
                        <input
                            id="signup-username"
                            type="text"
                            name="username"
                            v-model="username"
                            :disabled="busy"
                            maxlength="255"
                            class="form-control form-control-full-width form-control-auth auto-focus"
                            autocomplete="username"
                            :placeholder="$t('Your name')"
                            :aria-invalid="errorUsername ? 'true' : undefined"
                            :aria-describedby="errorUsername ? 'signup-username-error' : undefined"
                        />
                    </div>
                    <div v-if="errorUsername" id="signup-username-error" class="form-error" role="alert">{{ errorUsername }}</div>
                </div>

                <div class="form-group auth-input-group signup-input-group">
                    <label for="signup-email">{{ $t("Email") }}</label>
                    <div class="auth-field-wrapper form-control-accent-wrapper">
                        <input
                            id="signup-email"
                            type="email"
                            name="email"
                            v-model="email"
                            :disabled="busy"
                            maxlength="255"
                            class="form-control form-control-full-width form-control-auth"
                            autocomplete="email"
                            :placeholder="$t('your@company.com')"
                            :aria-invalid="errorEmail ? 'true' : undefined"
                            :aria-describedby="errorEmail ? 'signup-email-error' : undefined"
                        />
                    </div>
                    <div v-if="errorEmail" id="signup-email-error" class="form-error" role="alert">{{ errorEmail }}</div>
                </div>

                <div class="form-group auth-input-group signup-input-group">
                    <label for="signup-password">{{ $t("Password") }}</label>
                    <div class="auth-password-wrapper form-control-accent-wrapper form-control-auth-password">
                        <PasswordInput
                            id="signup-password"
                            :disabled="busy"
                            v-model:val="password"
                            name="password"
                            :is-new-password="true"
                            :aria-invalid="errorPassword ? 'true' : undefined"
                            :aria-describedby="errorPassword ? 'signup-password-error' : undefined"
                        ></PasswordInput>
                    </div>
                    <div v-if="errorPassword" id="signup-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
                </div>

                <div class="form-group auth-input-group signup-input-group">
                    <label for="signup-password-repeat">{{ $t("Repeat your password") }}</label>
                    <div class="auth-password-wrapper form-control-accent-wrapper form-control-auth-password">
                        <PasswordInput
                            id="signup-password-repeat"
                            :disabled="busy"
                            v-model:val="password2"
                            name="password2"
                            :is-new-password="true"
                            :is-repeated-password="true"
                            :aria-invalid="errorPasswordRepeat ? 'true' : undefined"
                            :aria-describedby="errorPasswordRepeat ? 'signup-password-repeat-error' : undefined"
                        ></PasswordInput>
                    </div>
                    <div v-if="errorPasswordRepeat" id="signup-password-repeat-error" class="form-error" role="alert">
                        {{ errorPasswordRepeat }}
                    </div>
                </div>

                <div class="form-group-buttons">
                    <button :disabled="busy" class="btn btn-primary">
                        {{ $t("Create account") }}
                    </button>
                </div>

                <div class="form-error" v-if="error" role="alert">{{ error }}</div>

                <div class="tp-services-group" v-if="tpServices.length > 0">
                    <p v-for="tp of tpServices" :key="tp.id">
                        <a :href="tp.url" class="form-link">{{ $t("Sign up with") }} {{ tp.name }}</a>
                    </p>
                </div>

                <div class="auth-links-block signup-links-block">
                    <p>
                        {{ $t("Already have an account?") }}
                        <router-link :to="{ name: 'login' }" class="form-link">{{ $t("Log in") }}</router-link>
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
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import CookiesModal from "@/components/modals/CookiesModal.vue";
import PasswordInput from "@/components/utils/PasswordInput.vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { getLanguage } from "@/i18n";
import nubemsystemsLogoLight from "@/assets/nubemsystem-logo-navy.png";
import nubemsystemsLogoDark from "@/assets/nubemsystem-logo-white.png";

export default defineComponent({
    name: "SignupPage",
    components: {
        ChangeLanguageModal,
        CookiesModal,
        PasswordInput,
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
            errorUsername: "",

            password: "",
            password2: "",
            errorPassword: "",
            errorPasswordRepeat: "",

            email: "",
            errorEmail: "",

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
        registerWithKeycloak: function () {
            if (this.busy) {
                return;
            }
            this.busy = true;
            this.error = "";
            AuthController.RegisterWithKeycloak().catch(() => {
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

            this.error = "";
            this.errorEmail = "";
            this.errorUsername = "";
            this.errorPassword = "";
            this.errorPasswordRepeat = "";

            if (!this.password) {
                this.errorPassword = this.$t("You must specify a password");
                return;
            }

            if (this.password !== this.password2) {
                this.errorPasswordRepeat = this.$t("The passwords do not match");
                return;
            }

            this.busy = true;

            this.$getCaptcha("signup").then((captcha) => {
                Request.Do(
                    ApiAuth.Signup({
                        email: this.email,
                        username: this.username,
                        password: this.password,
                        captcha: captcha,
                        locale: getLanguage(),
                    }),
                )
                    .onSuccess((response) => {
                        this.busy = false;
                        if (response.session_id) {
                            AuthController.PageToGo = { name: "create-wallet" };
                            AuthController.SetSession(response.session_id);
                        } else {
                            this.$router.push({ name: "signup-success" });
                        }
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
                            badRequestUsernameInvalid: () => {
                                this.errorUsername = this.$t("Invalid username provided");
                            },
                            badRequestUsernameInUse: () => {
                                this.errorUsername = this.$t("The provided username is already in use");
                            },
                            badRequestWeakPassword: () => {
                                this.errorPassword = this.$t("The provided password is too short");
                            },
                            badRequestEmailInvalid: () => {
                                this.errorEmail = this.$t("Invalid email provided");
                            },
                            badRequestEmailInUse: () => {
                                this.errorEmail = this.$t("The provided email is already in use");
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
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
        this.onAuthChanged();
        if (this.keycloakSso) {
            if (!AuthController.isAuthenticated()) {
                this.registerWithKeycloak();
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
