<template>
    <div
        class="main-layout"
        :class="{
            'sidebar-hidden': !sidebarExpanded,
            'sidebar-collapsed': sidebarExpanded && sidebarDesktopCollapsed,
            'sidebar-non-sticky': !sidebarSticky,
            'drawer-open': showSidebarOverlay,
            'without-top-bar': !showTopBar,
            'mobile-scrolled-down': isMobileScrolled,
            'landing-top-bar-hidden': hideLandingTopBar,
            'dark-theme': isDarkTheme,
            'light-theme': !isDarkTheme,
        }"
    >
        <a href="#main-content" class="skip-main-content" @click="skipMainContent">
            <span>{{ $t("Skip to main content") }}</span>
        </a>
        <div v-if="showSidebarOverlay" class="side-bar-overlay" @click="closeSideBar"></div>
        <TopBar
            v-if="showTopBar"
            :menu-expanded="sidebarExpanded"
            :has-sidebar="showSideBar"
            :collapse-mobile-chrome="hideLandingTopBar"
            :account-settings-open="displayDropdownAccountSettings && accountSettingsSource === 'topbar'"
            @toggle-menu="toggleMenu"
            @openModal="openModal"
        />
        <MenuSideBar
            v-if="showSideBar"
            :expanded="sidebarExpanded"
            :collapsed="sidebarDesktopCollapsed"
            :account-settings-open="displayDropdownAccountSettings && accountSettingsSource === 'sidebar'"
            @openModal="openModal"
        />
        <button
            v-if="showDesktopSidebarToggle"
            id="sidebar-collapse-toggle-button"
            type="button"
            class="sidebar-edge-toggle"
            :title="sidebarDesktopCollapsed ? $t('Expand menu') : $t('Collapse menu')"
            :aria-label="sidebarDesktopCollapsed ? $t('Expand menu') : $t('Collapse menu')"
            :aria-expanded="!sidebarDesktopCollapsed"
            aria-controls="sidebar-navigation"
            @click="toggleSidebarCollapsed"
        >
            <i :class="sidebarDesktopCollapsed ? 'fas fa-angle-right' : 'fas fa-angle-left'" aria-hidden="true"></i>
        </button>
        <button
            v-if="showFloatingMenuButton"
            type="button"
            class="sidebar-floating-toggle"
            :title="$t('Open menu')"
            :aria-label="$t('Open menu')"
            :aria-expanded="sidebarExpanded"
            aria-controls="sidebar-navigation"
            @click="toggleMenu"
        >
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
        <button
            v-if="showScrollToTopButton"
            type="button"
            class="scroll-to-top-button"
            :title="$t('Scroll to top')"
            :aria-label="$t('Scroll to top')"
            @click="scrollToTop"
        >
            <i class="fas fa-arrow-up" aria-hidden="true"></i>
        </button>
        <AuthLoadingOverlay :display="loadingAuth"></AuthLoadingOverlay>
        <main id="main-content" class="app-main" tabindex="-1">
            <router-view v-if="!loadingAuth" v-slot="{ Component, route }">
                <template v-if="Component">
                    <KeepAlive :max="routeViewCacheMax">
                        <component v-if="route.meta.keepAlive" :is="Component" :key="routeViewKey(route)" />
                    </KeepAlive>
                    <component v-if="!route.meta.keepAlive" :is="Component" :key="routeViewKey(route)" />
                </template>
            </router-view>
        </main>
        <LoadingOverlay :display="loadingRoute"></LoadingOverlay>

        <AccountSettingsDropdown
            v-if="displayDropdownAccountSettings"
            v-model:display="displayDropdownAccountSettings"
            :source="accountSettingsSource"
            :focus-return-id="accountSettingsFocusReturnId"
            @openModal="openModal"
        ></AccountSettingsDropdown>

        <ChangeLanguageModal v-if="displayModalLanguage" v-model:display="displayModalLanguage"></ChangeLanguageModal>

        <SelectWalletDropdown
            v-if="displayDropdownSelectWallet"
            v-model:display="displayDropdownSelectWallet"
            @openModal="openModal"
        ></SelectWalletDropdown>

        <ProfileModal v-if="displayProfileModal" v-model:display="displayProfileModal" :uid="profileModalUser"></ProfileModal>

        <LogoutModal v-if="displayModalLogout" v-model:display="displayModalLogout"></LogoutModal>

        <MessageModal
            v-if="displayModalMessage"
            v-model:display="displayModalMessage"
            :title="messageModalTitle"
            :message="messageModalMessage"
        ></MessageModal>

        <ConfirmationModal
            v-if="displayConfirmationModal"
            v-model:display="displayConfirmationModal"
            :title="confirmationTitle"
            :message="confirmationMessage"
            :danger="confirmationDanger"
            :delete-action="confirmationDeleteAction"
            :suspend-action="confirmationSuspendAction"
            :deactivate-action="confirmationDeactivateAction"
            :reject-action="confirmationRejectAction"
            @confirm="onConfirm"
        >
        </ConfirmationModal>

        <CookiesModal v-if="displayModalCookies" v-model:display="displayModalCookies"></CookiesModal>

        <SnackBar></SnackBar>
    </div>
</template>

<script lang="ts">
import { defineComponent, nextTick } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";

import { FocusTrap } from "@/utils/focus-trap";

/** Max cached screens when `route.meta.keepAlive` is set (see routes.ts). */
const ROUTE_VIEW_CACHE_MAX = 16;

import TopBar from "@/components/layout/TopBar.vue";
import MenuSideBar from "@/components/layout/MenuSideBar.vue";
import LoadingOverlay from "@/components/layout/LoadingOverlay.vue";
import AuthLoadingOverlay from "@/components/layout/AuthLoadingOverlay.vue";
import SnackBar from "@/components/layout/SnackBar.vue";

import LogoutModal from "@/components/modals/auth/LogoutModal.vue";

import AccountSettingsDropdown from "@/components/dropdowns/account/AccountSettingsDropdown.vue";

import SelectWalletDropdown from "@/components/dropdowns/wallet/SelectWalletDropdown.vue";

import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";

import ProfileModal from "@/components/modals/ProfileModal.vue";

import MessageModal from "@/components/modals/MessageModal.vue";

import ConfirmationModal from "@/components/modals/ConfirmationModal.vue";

import CookiesModal from "@/components/modals/CookiesModal.vue";

import { AuthController } from "@/control/auth";
import { getCookiePreference, getSidebarCollapsed, getTheme, setSidebarCollapsed } from "@/control/app-preferences";

const SIDEBAR_DESKTOP_BREAKPOINT = 1024;
const MOBILE_SCROLL_THRESHOLD = 80;

export default defineComponent({
    name: "MainLayout",
    components: {
        TopBar,
        MenuSideBar,
        LoadingOverlay,
        AuthLoadingOverlay,
        SnackBar,
        LogoutModal,
        AccountSettingsDropdown,
        MessageModal,
        SelectWalletDropdown,
        ChangeLanguageModal,
        ConfirmationModal,
        ProfileModal,
        CookiesModal,
    },
    setup: function () {
        return {
            confirmationCallback: null,
            resizeObserver: null as ResizeObserver,
            keydownHandler: null as (event: KeyboardEvent) => void,
            focusTrap: null as FocusTrap,
            pageScrollHandler: null as (() => void) | null,
            pageScrollTarget: null as HTMLElement | null,
        };
    },
    data: function () {
        return {
            loadingRoute: false,

            sidebarExpanded: window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT,
            sidebarCollapsed: getSidebarCollapsed(),
            sidebarSticky: true,
            sidebarAlwaysVisible: false,
            isDesktopSidebarViewport: window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT,
            showTopBar: true,
            showSideBar: false,

            isDarkTheme: false,
            loadingAuth: AuthController.Loading && !AuthController.FirstTimeLoaded,

            displayModalLogout: false,
            displayDropdownAccountSettings: false,
            accountSettingsSource: "topbar",
            accountSettingsFocusReturnId: "top-bar-button-img",

            displayDropdownSelectWallet: false,

            displayModalLanguage: false,

            displayModalMessage: false,
            messageModalTitle: "",
            messageModalMessage: "",

            displayConfirmationModal: false,
            confirmationTitle: "",
            confirmationMessage: "",
            confirmationDanger: false,
            confirmationDeleteAction: false,
            confirmationSuspendAction: false,
            confirmationDeactivateAction: false,
            confirmationRejectAction: false,

            displayProfileModal: false,
            profileModalUser: "",

            displayModalCookies: false,

            routeCacheAuthKey: AuthController.UID,

            pageScrolledDown: false,

            modalDialogOpenCount: 0,
        };
    },
    computed: {
        routeViewCacheMax: function (): number {
            return ROUTE_VIEW_CACHE_MAX;
        },
        showSidebarOverlay(): boolean {
            return this.sidebarExpanded && this.showSideBar && !this.isDesktopSidebarViewport;
        },
        showDesktopSidebarToggle(): boolean {
            return this.showSideBar && this.sidebarExpanded && this.isDesktopSidebarViewport && !this.loadingAuth && !this.loadingRoute;
        },
        sidebarDesktopCollapsed(): boolean {
            return this.sidebarCollapsed && this.isDesktopSidebarViewport;
        },
        isDetailsViewRoute(): boolean {
            return !!(this.$route?.meta && (this.$route.meta as { detailsView?: boolean }).detailsView);
        },
        showFloatingMenuButton(): boolean {
            return (
                this.showSideBar &&
                !this.showTopBar &&
                !this.isDesktopSidebarViewport &&
                !this.sidebarExpanded &&
                !this.isDetailsViewRoute &&
                !this.loadingAuth &&
                !this.loadingRoute &&
                this.modalDialogOpenCount === 0
            );
        },
        showScrollToTopButton(): boolean {
            return this.isMobileScrolled && this.modalDialogOpenCount === 0;
        },
        isMobileScrolled(): boolean {
            return this.pageScrolledDown && !this.isDesktopSidebarViewport;
        },
        isLandingPage(): boolean {
            return this.$route?.name === "home";
        },
        hideLandingTopBar(): boolean {
            return this.isLandingPage && this.isMobileScrolled;
        },
    },
    methods: {
        routeViewKey: function (route: RouteLocationNormalizedLoaded) {
            const query = { ...route.query };
            delete query.tab;
            delete query.edit;
            delete query.refresh;
            delete query.checkout_result;
            delete query.checkout_flow;
            delete query.subscription;
            delete query.session_id;

            const stableQuery = Object.keys(query)
                .sort()
                .map((key) => [key, query[key]]);

            return `${this.routeCacheAuthKey}:${String(route.name || route.path)}:${JSON.stringify(route.params)}:${JSON.stringify(
                stableQuery,
            )}`;
        },

        onAuthStatusUpdate: function () {
            this.routeCacheAuthKey = AuthController.UID;
            this.displayDropdownAccountSettings = false;

            this.displayModalLogout = false;

            this.displayModalLanguage = false;

            this.displayDropdownSelectWallet = false;

            this.onRouteChanged();
        },

        closeSideBar: function () {
            this.sidebarExpanded = false;
            this.displayDropdownAccountSettings = false;
        },

        onGlobalKeyDown: function (event: KeyboardEvent) {
            if (event.key === "Escape" && this.showSidebarOverlay && !this.displayDropdownAccountSettings) {
                this.closeSideBar();
            }
        },

        pauseDrawerFocusTrap: function () {
            if (this.focusTrap) {
                this.focusTrap.deactivate();
            }
        },

        resumeDrawerFocusTrap: function () {
            if (!this.showSidebarOverlay) {
                return;
            }
            if (this.focusTrap) {
                this.focusTrap.activate();
                return;
            }
            this.activateDrawerFocusTrap();
        },

        activateDrawerFocusTrap: function () {
            const sidebarEl = this.$el ? (this.$el.querySelector(".side-bar") as HTMLElement | null) : null;
            if (!sidebarEl) {
                return;
            }
            if (this.focusTrap) {
                this.focusTrap.destroy();
            }
            this.focusTrap = new FocusTrap(sidebarEl, this.closeSideBar.bind(this), "top-bar-menu-button");
            void nextTick(() => {
                const focusable = sidebarEl.querySelector("a, button, [tabindex]") as HTMLElement | null;
                (focusable || sidebarEl).focus();
                this.focusTrap.activate();
            });
        },

        deactivateDrawerFocusTrap: function () {
            if (this.focusTrap) {
                this.focusTrap.deactivate();
            }
            if (this.displayDropdownAccountSettings) {
                return;
            }
            if (!this.isDesktopSidebarViewport) {
                void nextTick(() => {
                    const trigger = document.querySelector(".top-bar-menu-button, .sidebar-floating-toggle") as HTMLElement | null;
                    if (trigger) {
                        trigger.focus();
                    }
                });
            }
        },

        onAuthLoadingChanged: function () {
            this.loadingAuth = AuthController.Loading && !AuthController.FirstTimeLoaded;
        },

        onThemeChanged: function () {
            this.isDarkTheme = getTheme() === "dark";
        },

        toggleMenu: function () {
            this.sidebarExpanded = !this.sidebarExpanded;
        },

        toggleSidebarCollapsed: function () {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            setSidebarCollapsed(this.sidebarCollapsed);
        },

        updateSidebarViewport: function () {
            this.isDesktopSidebarViewport = window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT;
        },

        skipMainContent: function (event) {
            if (event) {
                event.preventDefault();
            }
            const content = document.getElementById("main-content");
            if (content instanceof HTMLElement) {
                const focusOptions: FocusOptions & { focusVisible?: boolean } = { focusVisible: true };
                content.focus(focusOptions);
            }
        },

        showMessage: function (title: string, msg: string) {
            this.messageModalTitle = title;
            this.messageModalMessage = msg;
            this.displayModalMessage = true;
        },

        openModal: function (name: string) {
            switch (name) {
                case "account-settings":
                    this.accountSettingsSource = "topbar";
                    this.accountSettingsFocusReturnId = "top-bar-button-img";
                    this.displayDropdownAccountSettings = !this.displayDropdownAccountSettings;
                    break;
                case "account-settings-sidebar": {
                    this.accountSettingsSource = "sidebar";
                    this.accountSettingsFocusReturnId = "sidebar-account-settings-button";
                    const willOpenAccountSettings = !this.displayDropdownAccountSettings;
                    if (willOpenAccountSettings) {
                        this.pauseDrawerFocusTrap();
                    }
                    this.displayDropdownAccountSettings = !this.displayDropdownAccountSettings;
                    if (!willOpenAccountSettings) {
                        this.resumeDrawerFocusTrap();
                    }
                    break;
                }
                case "change-language-modal":
                    this.displayModalLanguage = true;
                    break;
                case "logout":
                    this.displayModalLogout = true;
                    break;
                case "profile":
                    this.onShowProfile(AuthController.UID);
                    break;
                case "select-wallet":
                    this.displayDropdownSelectWallet = !this.displayDropdownSelectWallet;
                    break;
            }
        },

        onRouterLoading: function (l: boolean) {
            this.loadingRoute = l;
        },

        onRouteChanged: function () {
            const isAuthenticated = AuthController.isAuthenticated();
            this.updateSidebarViewport();

            if (this.$route && this.$route.meta && typeof this.$route.meta === "object") {
                this.sidebarSticky = !!this.$route.meta.sidebarSticky;
                this.sidebarAlwaysVisible = !!this.$route.meta.sidebarAlwaysVisible;
                this.showSideBar = isAuthenticated && (this.sidebarAlwaysVisible || this.sidebarSticky);
                this.showTopBar = this.$route.meta.showTopBar !== false;

                if (!this.showSideBar) {
                    this.sidebarExpanded = false;
                } else if (this.sidebarAlwaysVisible || this.sidebarSticky) {
                    this.sidebarExpanded = this.isDesktopSidebarViewport;
                } else {
                    this.sidebarExpanded = false;
                }
            } else {
                this.sidebarExpanded = false;
                this.sidebarSticky = false;
                this.sidebarAlwaysVisible = false;
                this.showSideBar = false;
                this.showTopBar = true;
            }

            const cookiePref = getCookiePreference();

            if (!cookiePref && (!this.$route || !(this.$route.name in { terms: 1, privacy: 1, cookies: 1 }))) {
                this.displayModalCookies = true;
            } else {
                this.displayModalCookies = false;
            }
        },

        showConfirmationModal: function (options: {
            title: string;
            message: string;
            danger?: boolean;
            deleteAction?: boolean;
            suspendAction?: boolean;
            deactivateAction?: boolean;
            rejectAction?: boolean;
            callback: () => void;
        }) {
            this.displayConfirmationModal = true;
            this.confirmationTitle = options.title;
            this.confirmationMessage = options.message;
            this.confirmationDanger = !!options.danger;
            this.confirmationDeleteAction = !!options.deleteAction;
            this.confirmationSuspendAction = !!options.suspendAction;
            this.confirmationDeactivateAction = !!options.deactivateAction;
            this.confirmationRejectAction = !!options.rejectAction;
            this.confirmationCallback = options.callback;
        },

        onConfirm: function () {
            if (this.confirmationCallback) {
                this.confirmationCallback();
            }
        },

        onShowProfile: function (uid: string) {
            if (uid && uid === AuthController.UID) {
                void this.$router.push({ name: "account-settings" });
                return;
            }
            this.profileModalUser = uid;
            this.displayProfileModal = true;
        },

        onPageResize: function () {
            this.updateSidebarViewport();
            if (!this.showSideBar) {
                this.sidebarExpanded = false;
            } else {
                this.sidebarExpanded = this.isDesktopSidebarViewport;
            }
            this.bindPageContentScroll();
        },

        unbindPageContentScroll: function () {
            if (this.pageScrollTarget && this.pageScrollHandler) {
                this.pageScrollTarget.removeEventListener("scroll", this.pageScrollHandler);
            }
            this.pageScrollTarget = null;
            this.pageScrollHandler = null;
        },

        bindPageContentScroll: function () {
            this.unbindPageContentScroll();

            if (this.isDesktopSidebarViewport || this.loadingAuth) {
                this.pageScrolledDown = false;
                return;
            }

            void nextTick(() => {
                const pageContent = document.querySelector(".page-content") as HTMLElement | null;
                if (!pageContent) {
                    this.pageScrolledDown = false;
                    return;
                }

                this.pageScrollTarget = pageContent;
                this.pageScrollHandler = this.onPageContentScroll.bind(this);
                pageContent.addEventListener("scroll", this.pageScrollHandler, { passive: true });
                this.onPageContentScroll();
            });
        },

        onPageContentScroll: function () {
            const pageContent = this.pageScrollTarget;
            if (!pageContent || this.isDesktopSidebarViewport) {
                this.pageScrolledDown = false;
                return;
            }

            this.pageScrolledDown = pageContent.scrollTop > MOBILE_SCROLL_THRESHOLD;
        },

        scrollToTop: function () {
            const pageContent = this.pageScrollTarget || (document.querySelector(".page-content") as HTMLElement | null);
            if (pageContent) {
                pageContent.scrollTo({ top: 0, behavior: "smooth" });
            }
        },

        onModalDialogOpenCountChanged: function (openCount: number) {
            this.modalDialogOpenCount = openCount;
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthStatusUpdate.bind(this));

        this.$listenOnAppEvent("auth-status-loading", this.onAuthLoadingChanged.bind(this));

        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
        this.onThemeChanged();

        this.$listenOnAppEvent("msg-modal", this.showMessage.bind(this));
        this.$listenOnAppEvent("ask-confirmation", this.showConfirmationModal.bind(this));
        this.$listenOnAppEvent("show-profile", this.onShowProfile.bind(this));

        this.$listenOnAppEvent("router-load-state-change", this.onRouterLoading.bind(this));
        this.$listenOnAppEvent("modal-dialog-open-count-changed", this.onModalDialogOpenCountChanged.bind(this));

        this.onAuthStatusUpdate();

        this.onRouteChanged();
        this.bindPageContentScroll();

        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.onPageResize.bind(this));
            this.resizeObserver.observe(this.$el);
        }

        this.keydownHandler = this.onGlobalKeyDown.bind(this);
        document.addEventListener("keydown", this.keydownHandler);
    },
    beforeUnmount: function () {
        this.unbindPageContentScroll();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
        if (this.focusTrap) {
            this.focusTrap.destroy();
        }
    },
    watch: {
        $route: function () {
            if (this.sidebarExpanded && !this.isDesktopSidebarViewport) {
                this.closeSideBar();
            }
            this.onRouteChanged();
            this.pageScrolledDown = false;
            this.bindPageContentScroll();
        },
        loadingAuth: function (loading: boolean) {
            if (!loading) {
                this.bindPageContentScroll();
            }
        },
        showSidebarOverlay: function (open: boolean) {
            if (open) {
                this.activateDrawerFocusTrap();
            } else {
                this.deactivateDrawerFocusTrap();
            }
        },
        displayDropdownAccountSettings: function (open: boolean) {
            if (!open && this.accountSettingsSource === "sidebar") {
                this.resumeDrawerFocusTrap();
            }
        },
    },
});
</script>

<style></style>
