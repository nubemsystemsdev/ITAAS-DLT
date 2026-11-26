<template>
    <div
        id="account-settings-dropdown"
        class="modal-container modal-container-corner no-transition"
        :class="{ hidden: !display, 'modal-container-sidebar': source === 'sidebar' }"
        tabindex="-1"
        role="dialog"
        :aria-modal="display ? 'true' : undefined"
        :aria-label="$t('Account settings')"
        :aria-hidden="display ? undefined : 'true'"
        @click="close"
        @keydown="escapeToClose"
    >
        <div class="modal-dialog modal-md" :style="sidebarDialogStyle" @click="stopPropagationEvent">
            <!-- <div class="modal-header-user-settings-dd">
                <div class="user-settings-dd-image">
                    <img v-if="profileImage" class="usr-image" :src="profileImage" />
                    <img v-else class="usr-image" src="@/assets/user.png" />
                </div>
                <div class="user-settings-dd-names">
                    <div class="user-settings-dd-name">
                        {{ profileName || username }}
                    </div>
                    <div class="user-settings-dd-username">{{ "@" + username }}</div>
                </div>
            </div> -->

            <div class="modal-body no-padding border-top">
                <div class="settings-list">
                    <RouterLink :to="{ name: 'account-settings' }" class="settings-list-item" @click="close">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-user" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("My profile") }}
                        </div>
                    </RouterLink>
                    <RouterLink
                        v-if="showOrganizationRequestLink"
                        :to="{ name: 'organization-request' }"
                        class="settings-list-item"
                        @click="close"
                    >
                        <div class="settings-list-item-icon">
                            <i class="fas fa-building" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Request organization") }}
                        </div>
                    </RouterLink>
                    <RouterLink
                        :to="{ name: navigationOption.routeName }"
                        class="settings-list-item settings-list-item-navigation"
                        @click="close"
                    >
                        <div class="settings-list-item-icon">
                            <i :class="navigationOption.icon" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t(navigationOption.label) }}
                        </div>
                    </RouterLink>
                </div>
            </div>

            <div class="modal-body no-padding border-top">
                <div class="settings-list">
                    <div class="settings-list-item settings-list-item-language">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-language" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">{{ $t("Language") }}</div>
                        <div class="language-inline-select-wrap">
                            <select
                                class="form-select language-inline-select"
                                :value="lang"
                                :aria-label="$t('Language')"
                                @click.stop
                                @change="onLanguageChange"
                            >
                                <option v-for="l in languages" :key="l.id" :value="l.id">
                                    {{ l.name }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="settings-list-item settings-list-item-theme" tabindex="0" @keydown="clickOnEnter" @click="toggleTheme">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-sun" v-if="!isDarkTheme" aria-hidden="true"></i>
                            <i class="fas fa-moon" v-if="isDarkTheme" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">{{ $t("Theme") }}: {{ renderTheme(isDarkTheme) }}</div>
                        <div class="settings-theme-toggle" :class="{ 'settings-theme-toggle-active': isDarkTheme }" aria-hidden="true">
                            <span class="settings-theme-toggle-knob"></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- <div class="modal-body no-padding border-top">
                <div class="settings-list">
                    <RouterLink :to="{ name: 'account-settings' }" class="settings-list-item" @click="close">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-cog"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Account settings") }}
                        </div>
                    </RouterLink>
                </div>
            </div> -->

            <!--<div class="modal-body no-padding border-top" v-if="canAdmin">
                <div class="settings-list">
                    <RouterLink :to="{ name: 'admin' }" class="settings-list-item" @click="close">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-hammer"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Administration and moderation") }}
                        </div>
                    </RouterLink>
                </div>
            </div>-->

            <div class="modal-body no-padding border-top">
                <div class="settings-list">
                    <div class="settings-list-item" tabindex="0" @keydown="clickOnEnter" @click="logout">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-sign-out" aria-hidden="true"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Log out") }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { AuthController } from "@/control/auth";
import { defineComponent, nextTick } from "vue";
import { useVModel } from "@/utils/v-model";
import { FocusTrap } from "@/utils/focus-trap";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { ApiAccount } from "@/api/api-group-account";
import { AVAILABLE_LANGUAGES, getLanguage, setLanguage } from "@/i18n";
import { getTheme, setTheme } from "@/control/app-preferences";
import { shouldShowOrganizationRequestEntry } from "@/control/organization-admin-access";
import { OrganizationController } from "@/control/organization";
import { isOnLandingNavigationRoute } from "@/control/navigation-access-control";

const REQUIRED_ADMIN_PERMISSIONS = ["mod.users", "admin.roles"];
const SIDEBAR_OVERLAY_BREAKPOINT = 1024;

export default defineComponent({
    name: "AccountSettingsDropdown",
    emits: ["update:display", "openModal"],

    props: {
        display: Boolean,
        source: {
            type: String,
            default: "topbar",
        },
        focusReturnId: {
            type: String,
            default: "top-bar-button-img",
        },
    },
    setup: function (props) {
        return {
            focusTrap: null as FocusTrap,
            displayStatus: useVModel(props, "display"),
            localeRequestId: getUniqueStringId(),
            sidebarPositionHandler: null as (() => void) | null,
        };
    },
    data: function () {
        return {
            profileName: AuthController.ProfileName,
            profileImage: AuthController.ProfileImage,
            username: AuthController.Username,
            tfa: AuthController.RequiresTwoFactorAuthentication,
            languages: AVAILABLE_LANGUAGES.map((l) => {
                return { id: l.id, name: l.name };
            }),
            lang: getLanguage(),
            isDarkTheme: getTheme() === "dark",

            canAdmin: REQUIRED_ADMIN_PERMISSIONS.filter((p) => AuthController.hasPermission(p)).length > 0,
            organizationContextVersion: 0,
            sidebarDialogStyle: {} as Record<string, string>,
        };
    },
    computed: {
        showOrganizationRequestLink(): boolean {
            void this.organizationContextVersion;
            void OrganizationController.Loaded;
            return shouldShowOrganizationRequestEntry();
        },
        navigationOption(): { routeName: string; label: string; icon: string } {
            void this.$route.fullPath;

            if (isOnLandingNavigationRoute(this.$route.name)) {
                return {
                    routeName: "dashboard",
                    label: "Dashboard",
                    icon: "fas fa-table-cells-large",
                };
            }

            return {
                routeName: "home",
                label: "Landing page",
                icon: "fas fa-home",
            };
        },
    },
    methods: {
        open: function () {
            this.displayStatus = true;
            this.syncLanguageSelection();
            this.isDarkTheme = getTheme() === "dark";
            void OrganizationController.Refresh();
        },

        syncLanguageSelection: function () {
            this.lang = getLanguage();
        },

        close: function () {
            this.displayStatus = false;
        },

        escapeToClose: function (event) {
            if (event.key === "Escape") {
                this.close();
            }
        },

        logout: function () {
            this.$emit("openModal", "logout");
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },

        onAuthChanged: function () {
            this.username = AuthController.Username;
            this.tfa = AuthController.RequiresTwoFactorAuthentication;
            this.profileImage = AuthController.ProfileImage;
            this.profileName = AuthController.ProfileName;
            this.canAdmin = REQUIRED_ADMIN_PERMISSIONS.filter((p) => AuthController.hasPermission(p)).length > 0;
            this.syncLanguageSelection();
        },

        onOrganizationContextChanged: function () {
            this.organizationContextVersion += 1;
        },

        clickOnEnter: function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                event.target.click();
            }
        },

        onLanguageChange: function (event) {
            const nextLanguage = (event.target as HTMLSelectElement).value;
            this.lang = nextLanguage;
            setLanguage(nextLanguage);

            if (!AuthController.isAuthenticated()) {
                return;
            }

            Request.Pending(this.localeRequestId, ApiAccount.ChangeLocale({ locale: nextLanguage }))
                .onSuccess(() => {
                    AuthController.CheckAuthStatus();
                })
                .onCancel(() => {})
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {},
                        serverError: () => {
                            this.$showSnackBar(this.$t("Error") + ": " + this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showSnackBar(this.$t("Error") + ": " + this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                });
        },

        renderTheme: function (isDark) {
            if (isDark) {
                return this.$t("Dark");
            } else {
                return this.$t("Light");
            }
        },

        toggleTheme: function () {
            const nextTheme = this.isDarkTheme ? "light" : "dark";
            this.isDarkTheme = nextTheme === "dark";
            setTheme(nextTheme);
        },

        isSidebarOverlayViewport: function () {
            return window.innerWidth <= SIDEBAR_OVERLAY_BREAKPOINT;
        },

        updateSidebarDialogPosition: function () {
            if (this.source !== "sidebar") {
                this.sidebarDialogStyle = {};
                return;
            }

            if (!this.isSidebarOverlayViewport()) {
                this.sidebarDialogStyle = {};
                return;
            }

            const trigger = document.getElementById(this.focusReturnId);
            const sidebar = document.querySelector(".side-bar:not(.hidden)") as HTMLElement | null;
            if (!trigger || !sidebar) {
                this.sidebarDialogStyle = {};
                return;
            }

            const triggerRect = trigger.getBoundingClientRect();
            const sidebarRect = sidebar.getBoundingClientRect();
            const padding = 16;
            const gap = 8;
            const width = Math.max(0, sidebarRect.width - padding * 2);
            const left = sidebarRect.left + padding;
            const bottom = window.innerHeight - triggerRect.top + gap;
            const maxHeight = Math.max(120, triggerRect.top - sidebarRect.top - gap);

            this.sidebarDialogStyle = {
                left: `${left}px`,
                bottom: `${bottom}px`,
                width: `${width}px`,
                maxWidth: `${width}px`,
                maxHeight: `${maxHeight}px`,
            };
        },

        bindSidebarPositionListener: function () {
            this.unbindSidebarPositionListener();
            if (this.source !== "sidebar") {
                return;
            }
            this.sidebarPositionHandler = this.updateSidebarDialogPosition.bind(this);
            window.addEventListener("resize", this.sidebarPositionHandler, { passive: true });
        },

        unbindSidebarPositionListener: function () {
            if (this.sidebarPositionHandler) {
                window.removeEventListener("resize", this.sidebarPositionHandler);
                this.sidebarPositionHandler = null;
            }
        },

        activateDropdown: function () {
            this.onAuthChanged();
            this.focusTrap.activate();
            void nextTick(() => {
                if (this.source === "sidebar") {
                    this.updateSidebarDialogPosition();
                    this.bindSidebarPositionListener();
                }
                this.$el.focus();
            });
        },
    },
    mounted: function () {
        this.focusTrap = new FocusTrap(this.$el, this.close.bind(this), this.focusReturnId);
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("organization-context-changed", this.onOrganizationContextChanged.bind(this));

        if (this.display) {
            this.activateDropdown();
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.localeRequestId);
        this.unbindSidebarPositionListener();
        this.focusTrap.destroy();
    },
    watch: {
        display: function () {
            if (this.display) {
                this.activateDropdown();
            } else {
                this.unbindSidebarPositionListener();
                this.sidebarDialogStyle = {};
                this.focusTrap.deactivate();
            }
        },
        focusReturnId: function () {
            this.focusTrap.destroy();
            this.focusTrap = new FocusTrap(this.$el, this.close.bind(this), this.focusReturnId);
            if (this.display) {
                this.focusTrap.activate();
            }
        },
    },
});
</script>

<style>
@import "@/style/layout/account-settings-dropdown.css";
</style>
