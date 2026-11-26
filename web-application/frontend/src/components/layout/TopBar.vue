<template>
    <header class="top-bar" :class="{ 'has-sidebar': hasSidebar }" tabindex="-1">
        <div class="top-bar-logo-td">
            <button
                ref="menuButton"
                type="button"
                class="top-bar-menu-button"
                :title="menuButtonExpanded ? $t('Close menu') : $t('Open menu')"
                :aria-label="menuButtonExpanded ? $t('Close menu') : $t('Open menu')"
                :aria-expanded="menuButtonExpanded"
                :aria-controls="hasSidebar ? 'sidebar-navigation' : 'top-bar-mobile-menu'"
                @click="clickMenu"
            >
                <i class="fas fa-bars" aria-hidden="true"></i>
            </button>
            <router-link :to="{ name: brandRouteName }" class="top-bar-brand">
                <img class="top-bar-logo top-bar-logo-full" :src="nubemsystemsLogo" :alt="platformName" />
                <img class="top-bar-logo top-bar-logo-iso" :src="nubemsystemsLogoIso" alt="" aria-hidden="true" />
            </router-link>
        </div>

        <nav class="top-bar-nav" :aria-label="$t('Main navigation')">
            <router-link :to="{ name: 'nubem-catalog' }" class="top-bar-nav-link">{{ $t("Catalog") }}</router-link>
            <router-link :to="{ name: 'plans' }" class="top-bar-nav-link">{{ $t("Plans") }}</router-link>
            <router-link :to="{ name: 'contact' }" class="top-bar-nav-link">{{ $t("Contact") }}</router-link>
        </nav>

        <div class="top-bar-user-td top-bar-user-td-auth" v-if="loggedIn">
            <button
                type="button"
                id="top-bar-button-img"
                class="top-bar-avatar-btn"
                :title="$t('User settings')"
                :aria-label="$t('User settings')"
                :aria-expanded="accountSettingsOpen"
                aria-haspopup="dialog"
                aria-controls="account-settings-dropdown"
                @click="openUserSettings"
            >
                <img v-if="profileImage" class="top-bar-avatar-img" :src="profileImage" alt="" />
                <img v-else class="top-bar-avatar-img" src="@/assets/user.png" alt="" />
            </button>
        </div>

        <div class="top-bar-user-td top-bar-user-td-guest" v-if="!loggedIn">
            <button
                type="button"
                class="top-bar-button top-bar-language-button"
                :title="$t('Select your language')"
                :aria-label="$t('Select your language')"
                @click="selectLanguage"
            >
                <i class="fas fa-language" aria-hidden="true"></i>
            </button>
            <button
                type="button"
                class="top-bar-button top-bar-theme-button"
                :title="theme === 'dark' ? $t('Switch to light theme') : $t('Switch to dark theme')"
                :aria-label="theme === 'dark' ? $t('Switch to light theme') : $t('Switch to dark theme')"
                @click="invertTheme"
            >
                <i :class="theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'" aria-hidden="true"></i>
            </button>
            <button type="button" class="top-bar-link-button" @click="login">
                {{ $t("Sign in") }}
            </button>
            <router-link :to="{ name: 'signup' }" class="top-bar-cta">
                {{ $t("Create account") }}
            </router-link>
        </div>

        <div v-if="mobileMenuOpen" class="top-bar-mobile-overlay" @click="closeMobileMenu"></div>
        <nav
            v-if="mobileMenuOpen"
            id="top-bar-mobile-menu"
            class="top-bar-mobile-menu"
            :aria-label="$t('Main navigation')"
            @keydown="onMobileMenuKeydown"
        >
            <router-link :to="{ name: 'nubem-catalog' }" class="top-bar-mobile-link" @click="closeMobileMenu">
                {{ $t("Catalog") }}
            </router-link>
            <router-link :to="{ name: 'plans' }" class="top-bar-mobile-link" @click="closeMobileMenu">
                {{ $t("Plans") }}
            </router-link>
            <router-link :to="{ name: 'contact' }" class="top-bar-mobile-link" @click="closeMobileMenu">
                {{ $t("Contact") }}
            </router-link>
            <template v-if="!loggedIn">
                <span class="top-bar-mobile-divider" aria-hidden="true"></span>
                <button type="button" class="top-bar-mobile-login" @click="login">
                    {{ $t("Sign in") }}
                </button>
                <router-link :to="{ name: 'signup' }" class="top-bar-mobile-cta" @click="closeMobileMenu">
                    {{ $t("Create account") }}
                </router-link>
            </template>
        </nav>
    </header>
</template>

<script lang="ts">
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import { AuthController } from "@/control/auth";
import { defineComponent, nextTick } from "vue";
import nubemsystemLogoNavy from "@/assets/nubemsystem-logo-navy.png";
import nubemsystemLogoWhite from "@/assets/nubemsystem-logo-white.png";
import nubemsystemsLogoNavy from "@/assets/nubemsystems-logo-navy.png";
import nubemsystemsLogoWhite from "@/assets/nubemsystems-logo-white.png";

export default defineComponent({
    name: "TopBar",
    components: {},
    emits: ["toggle-menu", "openModal"],
    props: {
        menuExpanded: Boolean,
        hasSidebar: Boolean,
        collapseMobileChrome: Boolean,
        accountSettingsOpen: Boolean,
    },
    data: function () {
        return {
            platformName: import.meta.env.VITE__PLATFORM_NAME || "Platform",
            loggedIn: AuthController.isAuthenticated(),
            profileImage: AuthController.ProfileImage,
            theme: getTheme(),
            profileName: AuthController.ProfileName || AuthController.Username || "",
            mobileMenuOpen: false,
        };
    },
    computed: {
        brandRouteName(): string {
            return this.loggedIn ? "dashboard" : "home";
        },
        nubemsystemsLogo(): string {
            return this.theme === "dark" ? nubemsystemsLogoWhite : nubemsystemsLogoNavy;
        },
        nubemsystemsLogoIso(): string {
            return this.theme === "dark" ? nubemsystemLogoWhite : nubemsystemLogoNavy;
        },
        menuButtonExpanded(): boolean {
            return this.hasSidebar ? this.menuExpanded : this.mobileMenuOpen;
        },
    },
    methods: {
        openWalletSettings: function () {
            this.$emit("openModal", "select-wallet");
        },

        openUserSettings: function () {
            this.$emit("openModal", "account-settings");
        },

        selectLanguage: function () {
            this.closeMobileMenu();
            this.$emit("openModal", "change-language-modal");
        },

        invertTheme: function () {
            setTheme(this.theme === "dark" ? "light" : "dark");
        },

        login: function () {
            this.closeMobileMenu();
            this.$requireLogin();
        },

        clickMenu: function () {
            if (this.hasSidebar) {
                this.$emit("toggle-menu");
            } else {
                this.mobileMenuOpen = !this.mobileMenuOpen;
            }
        },

        closeMobileMenu: function () {
            this.mobileMenuOpen = false;
        },

        onMobileMenuKeydown: function (event: KeyboardEvent) {
            if (event.key === "Escape") {
                this.closeMobileMenu();
                const button = this.$refs.menuButton as HTMLElement;
                if (button) {
                    button.focus();
                }
            }
        },

        onAuthChanged: function () {
            this.loggedIn = AuthController.isAuthenticated();
            this.profileName = AuthController.ProfileName || AuthController.Username || "";
            this.profileImage = AuthController.ProfileImage;
        },

        onThemeChanged: function (t: ColorThemeName) {
            this.theme = t;
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
    },
    beforeUnmount: function () {},
    watch: {
        mobileMenuOpen: function (open: boolean) {
            if (open) {
                void nextTick(() => {
                    const firstLink = this.$el.querySelector(".top-bar-mobile-link") as HTMLElement;
                    if (firstLink) {
                        firstLink.focus();
                    }
                });
            }
        },
        $route: function () {
            this.mobileMenuOpen = false;
        },
        collapseMobileChrome: function (collapse: boolean) {
            if (collapse) {
                this.mobileMenuOpen = false;
            }
        },
    },
});
</script>

<style></style>
