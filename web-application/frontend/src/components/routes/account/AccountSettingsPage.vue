<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Profile not found')"
        :not-found-description="$t('We could not load your profile. Try again or sign in again.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--with-media details-view-card">
                <div>
                    <div class="details-view-avatar">
                        <img v-if="image" class="details-view-avatar-image" :src="image" :alt="$t('User profile image')" />
                        <img v-else class="details-view-avatar-image" src="@/assets/user.png" :alt="$t('User profile image')" />
                    </div>
                </div>

                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Profile and security") }}</p>
                    <h1 class="details-view-title">{{ displayName }}</h1>
                    <p v-if="username" class="details-view-handle">{{ "@" + username }}</p>
                    <p class="details-view-subtitle">
                        {{ $t("Review your identity, account status and profile information.") }}
                    </p>
                </div>
            </header>
        </template>

        <DetailsViewTabs :tabs="visibleTabs" :active-tab="activeTab" :tablist-label="$t('Profile sections')" @select="selectTab" />

        <div
            v-if="activeTab === 'details'"
            id="details-view-panel-details"
            key="details"
            ref="activeTabPanel"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-details"
            tabindex="-1"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Profile details") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review your account records and profile information.") }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel details-view-panel--wide">
                    <h3 class="details-view-panel-title">{{ $t("Account overview") }}</h3>
                    <dl class="details-view-summary-grid">
                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-at details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Username") }}
                            </dt>
                            <dd class="details-view-value">{{ username || "—" }}</dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Email") }}
                            </dt>
                            <dd class="details-view-value">
                                <a v-if="email" class="link-deco" :href="'mailto:' + email">{{ email }}</a>
                                <span v-else>—</span>
                            </dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-briefcase details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Role") }}
                            </dt>
                            <dd class="details-view-value">{{ roleLabel }}</dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Two factor authentication") }}
                            </dt>
                            <dd class="details-view-value">{{ tfa ? $t("Enabled") : $t("Disabled") }}</dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Join date") }}
                            </dt>
                            <dd class="details-view-value">{{ joinDateLabel }}</dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-language details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Locale") }}
                            </dt>
                            <dd class="details-view-value">{{ localeLabel }}</dd>
                        </div>

                        <div class="details-view-summary-item">
                            <dt class="details-view-label">
                                <i class="fas fa-id-card details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("User ID") }}
                            </dt>
                            <dd class="details-view-value" :title="id">{{ id || "—" }}</dd>
                        </div>
                    </dl>
                </article>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'credentials'"
            id="details-view-panel-credentials"
            key="credentials"
            ref="activeTabPanel"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-credentials"
            tabindex="-1"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Account credentials") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Update your username, email address and password.") }}
                </p>
            </div>

            <AccountCredentialsPage />
        </div>

        <div
            v-else-if="activeTab === 'delete-account'"
            id="details-view-panel-delete-account"
            key="delete-account"
            ref="activeTabPanel"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-delete-account"
            tabindex="-1"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Delete account") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Permanently delete your account and all associated data.") }}
                </p>
            </div>

            <DeleteAccountPage />
        </div>

        <div
            v-else-if="activeSettingsTab"
            :id="'details-view-panel-' + activeTab"
            :key="activeTab"
            ref="activeTabPanel"
            class="details-view-tab-panel"
            role="tabpanel"
            :aria-labelledby="'details-view-tab-' + activeTab"
            tabindex="-1"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t(activeSettingsTab.label) }}</h2>
                <p class="details-view-content-description">{{ $t(activeSettingsTab.description) }}</p>
            </div>

            <article class="details-view-panel account-settings-action-panel">
                <component :is="activeSettingsTab.component"></component>
            </article>
        </div>
    </DetailsViewLayout>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, nextTick, type Component } from "vue";
import type { RouteLocationRaw } from "vue-router";

import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import DetailsViewTabs from "@/components/layout/DetailsViewTabs.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { AuthController } from "@/control/auth";
import { ApiProfile } from "@/api/api-group-profile";
import { AVAILABLE_LANGUAGES } from "@/i18n";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { Request } from "@asanrom/request-browser";
import { renderDate } from "@/utils/time-utils";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";
import { ASYNC_COMPONENT_LOADER_DELAY_MS } from "@/constants/ui";
import type { UserProfile } from "@/api/definitions";

const EditProfilePage = defineAsyncComponent({
    loader: () => import("./EditProfilePage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const TwoFactorAuthenticationPage = defineAsyncComponent({
    loader: () => import("./TwoFactorAuthenticationPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const ActiveSessionsPage = defineAsyncComponent({
    loader: () => import("./ActiveSessionsPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const MyWalletPage = defineAsyncComponent({
    loader: () => import("./MyWalletPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const DeleteAccountPage = defineAsyncComponent({
    loader: () => import("./DeleteAccountPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const AccountCredentialsPage = defineAsyncComponent({
    loader: () => import("./AccountCredentialsPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

type AccountSettingsTabId = "details" | "edit-profile" | "credentials" | "tfa" | "devices" | "wallet" | "delete-account";

interface AccountSettingsTabConfig {
    id: AccountSettingsTabId;
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
    variant?: "danger";
    component?: Component;
}

const ACCOUNT_SETTINGS_TABS: AccountSettingsTabConfig[] = [
    {
        id: "details",
        label: "Profile details",
        shortLabel: "Details",
        icon: "fas fa-user",
        description: "Review your account records and profile information.",
    },
    {
        id: "edit-profile",
        label: "Edit profile",
        shortLabel: "Edit",
        icon: "fas fa-user-edit",
        description: "Update your display name, image, bio, location and website.",
        component: EditProfilePage,
    },
    {
        id: "credentials",
        label: "Account credentials",
        shortLabel: "Account",
        icon: "fas fa-id-card",
        description: "Update your username, email address and password.",
    },
    {
        id: "tfa",
        label: "Two factor authentication",
        shortLabel: "Security",
        icon: "fas fa-user-lock",
        description: "Add an extra layer of security to your account.",
        component: TwoFactorAuthenticationPage,
    },
    {
        id: "devices",
        label: "Active sessions",
        shortLabel: "Sessions",
        icon: "fas fa-desktop",
        description: "Review and close sessions signed in to your account.",
        component: ActiveSessionsPage,
    },
    {
        id: "wallet",
        label: "Wallet details",
        shortLabel: "Wallet",
        icon: "fas fa-wallet",
        description: "Review your wallet address and identifier.",
        component: MyWalletPage,
    },
    {
        id: "delete-account",
        label: "Delete account",
        shortLabel: "Delete",
        icon: "fas fa-trash-alt",
        description: "Permanently delete your account and all associated data.",
        variant: "danger",
        component: DeleteAccountPage,
    },
];

const ACCOUNT_SETTINGS_TAB_IDS = ACCOUNT_SETTINGS_TABS.map((tab) => tab.id);

const LEGACY_TAB_ALIASES: Record<string, AccountSettingsTabId> = {
    account: "credentials",
    profile: "edit-profile",
    username: "credentials",
    email: "credentials",
    password: "credentials",
    security: "credentials",
    danger: "delete-account",
    language: "details",
    wallets: "wallet",
    "create-wallet": "wallet",
};

function normalizeTabQuery(raw: unknown): AccountSettingsTabId {
    return normalizeRouteTabQuery(raw, ACCOUNT_SETTINGS_TAB_IDS, "details", {
        aliases: LEGACY_TAB_ALIASES,
    });
}

const backRoute: RouteLocationRaw = { name: "dashboard" };

export default defineComponent({
    name: "AccountSettingsPage",
    components: {
        DetailsViewLayout,
        DetailsViewTabs,
        EditProfilePage,
        AccountCredentialsPage,
        TwoFactorAuthenticationPage,
        ActiveSessionsPage,
        MyWalletPage,
        DeleteAccountPage,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
            refreshRequestId: getUniqueStringId(),
            backRoute,
        };
    },
    data: function () {
        return {
            loading: true,
            notFound: false,
            activeTab: "details" as AccountSettingsTabId,

            id: AuthController.UID,
            role: AuthController.Role,
            username: AuthController.Username,
            email: AuthController.Email,
            locale: AuthController.Locale,
            tfa: AuthController.RequiresTwoFactorAuthentication,

            joinDate: "",
            name: "",
            bio: "",
            image: "",
            location: "",
            website: "",
        };
    },
    computed: {
        visibleTabs: function (): Array<{ id: AccountSettingsTabId; label: string; shortLabel: string; icon: string; variant?: "danger" }> {
            return ACCOUNT_SETTINGS_TABS.map((tab) => {
                return {
                    id: tab.id,
                    label: tab.label,
                    shortLabel: tab.shortLabel,
                    icon: tab.icon,
                    variant: tab.variant,
                };
            });
        },
        activeSettingsTab: function (): AccountSettingsTabConfig | null {
            if (this.activeTab === "details" || this.activeTab === "credentials" || this.activeTab === "delete-account") {
                return null;
            }
            return ACCOUNT_SETTINGS_TABS.find((tab) => tab.id === this.activeTab) || null;
        },
        displayName: function (): string {
            return this.name || this.username || this.$t("My profile");
        },
        roleLabel: function (): string {
            return this.role || "(" + this.$t("Default role") + ")";
        },
        localeLabel: function (): string {
            for (const language of AVAILABLE_LANGUAGES) {
                if (language.id === this.locale) {
                    return language.name;
                }
            }
            return this.locale || "—";
        },
        joinDateLabel: function (): string {
            if (!this.joinDate) {
                return "—";
            }
            return renderDate(this.joinDate, this.$t);
        },
    },
    methods: {
        syncAuthFields: function () {
            this.id = AuthController.UID;
            this.role = AuthController.Role;
            this.username = AuthController.Username;
            this.email = AuthController.Email;
            this.locale = AuthController.Locale;
            this.tfa = AuthController.RequiresTwoFactorAuthentication;
            if (!this.name) {
                this.name = AuthController.ProfileName;
            }
            if (!this.image) {
                this.image = AuthController.ProfileImage;
            }
        },

        applyProfile: function (profile: UserProfile) {
            this.id = profile.id || AuthController.UID;
            this.username = profile.username || AuthController.Username;
            this.joinDate = profile.joinDate || "";
            this.name = profile.name || "";
            this.bio = profile.bio || "";
            this.image = profile.image || AuthController.ProfileImage || "";
            this.location = profile.location || "";
            this.website = profile.website || "";
            this.$setSubTitle(this.$t("Profile and security"));
        },

        syncTabFromRoute: function () {
            this.activeTab = normalizeTabQuery(this.$route.query.tab);
        },

        selectTab: function (tabId: AccountSettingsTabId) {
            if (this.activeTab === tabId) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, tabId, "details");
        },

        scrollToActiveTabContent: function () {
            nextTick(() => {
                const panel = this.$refs.activeTabPanel as HTMLElement | undefined;
                if (!panel) {
                    return;
                }
                const header = panel.querySelector(".details-view-content-header");
                const target = (header || panel) as HTMLElement;
                target.scrollIntoView({ block: "start" });
                panel.focus({ preventScroll: true });
            });
        },

        loadProfile: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            if (!AuthController.isAuthenticated()) {
                this.loading = false;
                this.$requireLogin();
                return;
            }

            this.loading = true;
            this.syncAuthFields();

            Request.Pending(this.loadRequestId, ApiProfile.GetProfile(AuthController.UID))
                .onSuccess((profile) => {
                    this.loading = false;
                    this.notFound = false;
                    this.applyProfile(profile);
                    this.syncTabFromRoute();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.$setSubTitle(this.$t("Profile not found"));
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadRequestId, 1500, this.loadProfile.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.loadRequestId, 1500, this.loadProfile.bind(this));
                });
        },

        refreshProfileDetails: function () {
            if (!AuthController.isAuthenticated() || this.loading) {
                return;
            }

            this.syncAuthFields();

            Request.Pending(this.refreshRequestId, ApiProfile.GetProfile(AuthController.UID))
                .onSuccess((profile) => {
                    this.applyProfile(profile);
                })
                .onCancel(() => {})
                .onRequestError(() => {})
                .onUnexpectedError(() => {});
        },

        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }
            this.refreshProfileDetails();
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$setSubTitle(this.$t("Profile and security"));
        this.syncTabFromRoute();
        this.loadProfile();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
        Request.Abort(this.refreshRequestId);
    },
    watch: {
        activeTab: function (newTab: AccountSettingsTabId, oldTab: AccountSettingsTabId) {
            if (newTab !== oldTab) {
                this.scrollToActiveTabContent();
            }
        },
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/details-view.css";

.details-view-tab-panel {
    min-width: 0;
    max-width: 100%;
}

.account-settings-action-panel {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

@media (max-width: 1024px) {
    .account-settings-action-panel {
        padding: var(--space-16);
    }
}

@media (max-width: 640px) {
    .details-view-tab-panel {
        gap: var(--space-16);
    }

    .account-settings-action-panel {
        padding: var(--space-16);
    }
}
</style>
