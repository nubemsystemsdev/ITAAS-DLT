<template>
    <Teleport to="body">
        <div
            ref="modalRoot"
            class="modal-container modal-container-cookies modal-container-opaque no-transition auth-page-shell"
            :class="theme === 'dark' ? 'dark-theme' : 'light-theme'"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookies-preferences-title"
        >
            <div class="modal-dialog modal-lgb">
                <div class="modal-header">
                    <div id="cookies-preferences-title" class="modal-title no-close">{{ $t("Cookies preferences") }}</div>
                </div>
                <div class="modal-body modal-cookies-body">
                    <div class="modal-cookie-option">
                        <h3 class="modal-cookie-option-title">{{ $t("Accept only essential cookies") }}</h3>
                        <p class="modal-cookie-option-lead">
                            {{ $t("We will only use the cookies required for this website to function") }}:
                        </p>
                        <ul class="modal-cookie-purposes">
                            <li>
                                <i class="fas fa-key" aria-hidden="true"></i>
                                {{ $t("For authentication purposes (in order to keep you logged in)") }}
                            </li>
                            <li>
                                <i class="fas fa-hand" aria-hidden="true"></i> {{ $t("In order to prevent spam or abuse of our services") }}
                            </li>
                        </ul>
                        <div class="modal-cookie-option-actions">
                            <button @click="acceptOnlyEssentialCookies" type="button" class="btn btn-primary">
                                <i class="fas fa-check" aria-hidden="true"></i> {{ $t("Accept only essential cookies") }}
                            </button>
                        </div>
                    </div>
                    <div class="modal-cookie-option">
                        <h3 class="modal-cookie-option-title">{{ $t("Accept all cookies") }}</h3>
                        <p class="modal-cookie-option-lead">{{ $t("We will also use cookies for the following purposes") }}:</p>
                        <ul class="modal-cookie-purposes">
                            <li>
                                <i class="fas fa-chart-column" aria-hidden="true"></i>
                                {{ $t("Improving our services by collecting usage data") }}
                            </li>
                            <li>
                                <i class="fas fa-user-plus" aria-hidden="true"></i>
                                {{ $t("Customizing the experience based on your preferences") }}
                            </li>
                            <li>
                                <i class="fas fa-rectangle-ad" aria-hidden="true"></i>
                                {{ $t("Showing you advertisements based on your preferences") }}
                            </li>
                        </ul>
                        <div class="modal-cookie-option-actions">
                            <button @click="acceptAllCookies" type="button" class="btn btn-primary">
                                <i class="fas fa-check" aria-hidden="true"></i> {{ $t("Accept all cookies") }}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer modal-cookies-footer">
                    <div class="modal-cookies-footer-links">
                        <router-link target="_blank" rel="noopener noreferrer" class="link-deco" :to="{ name: 'terms' }">
                            {{ $t("Terms of use") }}
                        </router-link>
                        <span class="modal-cookies-footer-sep" aria-hidden="true">|</span>
                        <router-link target="_blank" rel="noopener noreferrer" class="link-deco" :to="{ name: 'cookies' }">
                            {{ $t("Cookies policy") }}
                        </router-link>
                        <span class="modal-cookies-footer-sep" aria-hidden="true">|</span>
                        <router-link target="_blank" rel="noopener noreferrer" class="link-deco" :to="{ name: 'privacy' }">
                            {{ $t("Privacy policy") }}
                        </router-link>
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
                    </div>
                </div>
            </div>

            <ChangeLanguageModal v-if="displayLanguageModal" v-model:display="displayLanguageModal"></ChangeLanguageModal>
        </div>
    </Teleport>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ColorThemeName, getTheme, setCookiePreference, setTheme } from "@/control/app-preferences";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import { FocusTrap } from "@/utils/focus-trap";
import { useVModel } from "@/utils/v-model";

export default defineComponent({
    name: "CookiesModal",
    components: {
        ChangeLanguageModal,
    },
    props: {
        display: Boolean,
    },
    setup(props) {
        return {
            focusTrap: null as FocusTrap,
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            theme: getTheme(),
            displayLanguageModal: false,
        };
    },
    methods: {
        close: function () {
            this.displayStatus = false;
        },

        focusLost: function () {
            if (this.display) {
                const modalRoot = this.$refs.modalRoot as HTMLElement | undefined;
                if (modalRoot) {
                    modalRoot.focus();
                }
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

        acceptAllCookies: function () {
            setCookiePreference("all");
            this.close();
        },

        acceptOnlyEssentialCookies: function () {
            setCookiePreference("essential");
            this.close();
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));

        const modalRoot = this.$refs.modalRoot as HTMLElement;
        this.focusTrap = new FocusTrap(modalRoot, this.focusLost.bind(this));

        if (this.display) {
            this.focusTrap.activate();
        }

        this.$autoFocus();
    },
    beforeUnmount: function () {
        if (this.focusTrap) {
            this.focusTrap.destroy();
        }
    },
    watch: {
        display: function () {
            if (this.display) {
                if (this.focusTrap) {
                    this.focusTrap.activate();
                }
            } else {
                if (this.focusTrap) {
                    this.focusTrap.deactivate();
                }
            }
        },
    },
});
</script>

<style>
@import "@/style/auth.css";
</style>
