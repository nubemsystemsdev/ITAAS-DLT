<template>
    <div class="modal-container modal-container-signup modal-container-opaque no-transition" tabindex="-1">
        <form @submit="submit" class="modal-dialog modal-md">
            <div class="modal-header">
                <div class="modal-title no-close">{{ $t("Reset your password") }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Select your language')"
                    :aria-label="$t('Select your language')"
                    @click="selectLanguage"
                >
                    <i class="fas fa-language" aria-hidden="true"></i>
                </button>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Change theme')"
                    :aria-label="$t('Change theme')"
                    @click="invertTheme"
                >
                    <i v-if="theme === 'dark'" class="fas fa-sun" aria-hidden="true"></i>
                    <i v-else class="fas fa-moon" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <p>{{ $t("Input a new password for your account. The old one will be discarded.") }}</p>
                </div>
                <div class="form-group">
                    <label for="reset-password">{{ $t("Password") }}:</label>
                    <PasswordInput
                        id="reset-password"
                        :disabled="busy || success"
                        v-model:val="password"
                        name="password"
                        :auto-focus="true"
                        :is-new-password="true"
                        :aria-invalid="error ? 'true' : undefined"
                        :aria-describedby="error ? 'reset-password-error' : undefined"
                    ></PasswordInput>
                </div>
                <div class="form-group">
                    <label for="reset-password-repeat">{{ $t("Repeat your password") }}:</label>
                    <PasswordInput
                        id="reset-password-repeat"
                        :disabled="busy || success"
                        v-model:val="password2"
                        name="password2"
                        :is-new-password="true"
                        :is-repeated-password="true"
                        :aria-invalid="error ? 'true' : undefined"
                        :aria-describedby="error ? 'reset-password-error' : undefined"
                    ></PasswordInput>
                </div>
            </div>
            <div class="modal-footer">
                <div class="form-group" v-if="!success">
                    <button type="submit" :disabled="busy" class="btn btn-login">
                        {{ $t("Reset password") }}
                    </button>
                </div>
                <div class="form-group" v-if="success">
                    <p>{{ $t("Your password was successfully reset. Now you may login with your new password.") }}</p>
                </div>
                <div class="form-group" v-if="success">
                    <router-link :to="{ name: 'login' }">
                        <button type="button" :disabled="busy" class="btn btn-login"><i class="fas fa-check"></i> {{ $t("Done") }}</button>
                    </router-link>
                </div>
                <div v-if="error" id="reset-password-error" class="form-error" role="alert">{{ error }}</div>
                <p>
                    <router-link :to="{ name: 'login' }">{{ $t("Back to login form") }}</router-link>
                </p>
            </div>
        </form>

        <ChangeLanguageModal v-if="displayLanguageModal" v-model:display="displayLanguageModal"></ChangeLanguageModal>
    </div>
</template>

<script lang="ts">
import { ApiAuth } from "@/api/api-group-auth";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import PasswordInput from "@/components/utils/PasswordInput.vue";

export default defineComponent({
    name: "ResetPasswordPage",
    components: {
        ChangeLanguageModal,
        PasswordInput,
    },
    data: function () {
        return {
            password: "",
            password2: "",

            success: false,

            busy: false,
            error: "",

            theme: getTheme(),
            displayLanguageModal: false,
        };
    },
    methods: {
        submit: function (e) {
            if (e) {
                e.preventDefault();
            }
            if (this.busy) {
                return;
            }

            if (!this.password) {
                this.error = this.$t("You must specify a password");
                return;
            }

            if (this.password !== this.password2) {
                this.error = this.$t("The passwords do not match");
                return;
            }

            this.busy = true;
            this.error = "";

            Request.Do(
                ApiAuth.ResetAccountPassword({
                    uid: this.$route.params.uid + "",
                    verification: this.$route.params.token + "",
                    password: this.password,
                }),
            )
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
                        badRequestWeakPassword: () => {
                            this.error = this.$t("The provided password is too short");
                        },
                        badRequest: () => {
                            this.error = this.$t("Invalid password provided");
                        },
                        notFound: () => {
                            this.error = this.$t("This verification link is either invalid or has expired");
                        },
                        notFoundInvalidResetCode: () => {
                            this.error = this.$t("This verification link is either invalid or has expired");
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
});
</script>

<style></style>
