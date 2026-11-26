<template>
    <div class="side-bar" :class="{ hidden: !expanded, collapsed: collapsed && expanded }">
        <nav id="sidebar-navigation" class="side-bar-body" :aria-label="$t('Sidebar navigation')">
            <section class="sidebar-profile-block" :class="{ collapsed: collapsed }">
                <div v-if="!collapsed" class="sidebar-brand">
                    <img src="@/assets/nubemsystems-logo-white.png" draggable="false" class="sidebar-logo" :alt="$t('Nubemsystems logo')" />
                </div>
                <div v-else class="sidebar-brand-collapsed" aria-hidden="true">
                    <img :src="collapsedLogo" draggable="false" class="sidebar-logo-collapsed" alt="" />
                </div>
            </section>

            <div class="sidebar-scroll-sections">
                <section v-if="showAdminSections" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'dashboard' }"
                        :aria-current="sidebarCurrent(page === 'dashboard')"
                        :title="$t('Dashboard')"
                        :aria-label="$t('Dashboard')"
                        :to="resolveSidebarRoute('dashboard')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-border-all" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Dashboard") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'catalog' || page === 'catalog-admin' }"
                        :aria-current="sidebarCurrent(page === 'catalog' || page === 'catalog-admin')"
                        :title="$t('Catalog')"
                        :aria-label="$t('Catalog')"
                        :to="resolveSidebarRoute('catalog')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-list" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Catalog") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'subscriptions' || page === 'admin-subscription-detail' }"
                        :aria-current="sidebarCurrent(page === 'subscriptions' || page === 'admin-subscription-detail')"
                        :title="subscriptionsLabel"
                        :aria-label="subscriptionsLabel"
                        :to="resolveSidebarRoute('subscriptions')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-file-contract" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ subscriptionsLabel }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'itaas-flow-management' || page === 'itaas-admin-flow-detail' }"
                        :aria-current="sidebarCurrent(page === 'itaas-flow-management' || page === 'itaas-admin-flow-detail')"
                        :title="$t('ITAAS flow management')"
                        :aria-label="$t('ITAAS flow management')"
                        :to="resolveSidebarRoute('itaas-flow-management')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-diagram-project" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("ITAAS flow management") }}</div>
                    </router-link>
                </section>

                <section v-if="showAdminSections" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'clients-orgs' || page === 'clients-org-detail' || page === 'clients-client-detail' }"
                        :aria-current="
                            sidebarCurrent(page === 'clients-orgs' || page === 'clients-org-detail' || page === 'clients-client-detail')
                        "
                        :title="$t('Clients/Orgs')"
                        :aria-label="$t('Clients/Orgs')"
                        :to="resolveSidebarRoute('clients-orgs')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-user-group" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Clients/Orgs") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'orgs-requests' }"
                        :aria-current="sidebarCurrent(page === 'orgs-requests')"
                        :title="$t('Orgs requests')"
                        :aria-label="$t('Orgs requests')"
                        :to="resolveSidebarRoute('orgs-requests')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-clipboard-list" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Orgs requests") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'custom-agent-requests' }"
                        :aria-current="sidebarCurrent(page === 'custom-agent-requests')"
                        :title="$t('Agent requests')"
                        :aria-label="$t('Agent requests')"
                        :to="resolveSidebarRoute('custom-agent-requests')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-robot" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Agent requests") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'payments' }"
                        :aria-current="sidebarCurrent(page === 'payments')"
                        :title="$t('Payments')"
                        :aria-label="$t('Payments')"
                        :to="resolveSidebarRoute('payments')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-credit-card" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Payments") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'token-rules' }"
                        :aria-current="sidebarCurrent(page === 'token-rules')"
                        :title="$t('Tokens rules')"
                        :aria-label="$t('Tokens rules')"
                        :to="resolveSidebarRoute('token-rules')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-coins" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Tokens rules") }}</div>
                    </router-link>
                </section>

                <section v-if="showAdminSections" class="sidebar-group">
                    <!-- <router-link
                    class="side-bar-option"
                    :class="{ selected: page === 'configuration' }"
                    :title="$t('Organization settings')"
                    :aria-label="$t('Organization settings')"
                    :to="resolveSidebarRoute('configuration')"
                >
                    <div class="side-bar-option-icon"><i class="fas fa-gear" aria-hidden="true"></i></div>
                    <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Organization settings") }}</div>
                </router-link> -->

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'traceability' }"
                        :aria-current="sidebarCurrent(page === 'traceability')"
                        :title="$t('Traceability')"
                        :aria-label="$t('Traceability')"
                        :to="resolveSidebarRoute('traceability')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-shield" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Traceability") }}</div>
                    </router-link>
                </section>

                <section v-if="!showAdminSections && isRegularOrgMember" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'org-my-membership' }"
                        :aria-current="sidebarCurrent(page === 'org-my-membership')"
                        :title="$t('My membership')"
                        :aria-label="$t('My membership')"
                        :to="resolveSidebarRoute('org-my-membership')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-building" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("My membership") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: isItaasPlatformPage }"
                        :aria-current="sidebarCurrent(isItaasPlatformPage)"
                        :title="$t('ITAAS Platform')"
                        :aria-label="$t('ITAAS Platform')"
                        :to="resolveSidebarRoute('itaas-platform')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-code-fork" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("ITAAS Platform") }}</div>
                    </router-link>
                </section>

                <section v-if="!showAdminSections && isRegularOrgMember" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'account-settings' }"
                        :aria-current="sidebarCurrent(page === 'account-settings')"
                        :title="$t('Profile and security')"
                        :aria-label="$t('Profile and security')"
                        :to="resolveSidebarRoute('account-settings')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-user-shield" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Profile and security") }}</div>
                    </router-link>
                </section>

                <section v-if="!showAdminSections && !isRegularOrgMember" class="sidebar-group">
                    <router-link
                        v-if="isOrganizationAdmin"
                        class="side-bar-option"
                        :class="{ selected: page === 'dashboard' }"
                        :aria-current="sidebarCurrent(page === 'dashboard')"
                        :title="$t('Dashboard')"
                        :aria-label="$t('Dashboard')"
                        :to="resolveSidebarRoute('dashboard')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-border-all" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Dashboard") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'subscriptions' || page === 'admin-subscription-detail' }"
                        :aria-current="sidebarCurrent(page === 'subscriptions' || page === 'admin-subscription-detail')"
                        :title="subscriptionsLabel"
                        :aria-label="subscriptionsLabel"
                        :to="resolveSidebarRoute('subscriptions')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-file-contract" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ subscriptionsLabel }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'catalog' }"
                        :aria-current="sidebarCurrent(page === 'catalog')"
                        :title="$t('Catalog')"
                        :aria-label="$t('Catalog')"
                        :to="resolveSidebarRoute('catalog')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-list" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Catalog") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: isItaasPlatformPage }"
                        :aria-current="sidebarCurrent(isItaasPlatformPage)"
                        :title="$t('ITAAS Platform')"
                        :aria-label="$t('ITAAS Platform')"
                        :to="resolveSidebarRoute('itaas-platform')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-code-fork" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("ITAAS Platform") }}</div>
                    </router-link>
                </section>

                <section v-if="!showAdminSections && !isRegularOrgMember" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'tokens' }"
                        :aria-current="sidebarCurrent(page === 'tokens')"
                        :title="$t('Tokens')"
                        :aria-label="$t('Tokens')"
                        :to="resolveSidebarRoute('tokens')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-coins" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Tokens") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'payment-history' }"
                        :aria-current="sidebarCurrent(page === 'payment-history')"
                        :title="$t('Payment history')"
                        :aria-label="$t('Payment history')"
                        :to="resolveSidebarRoute('payment-history')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-file-invoice-dollar" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Payment history") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'account-settings' }"
                        :aria-current="sidebarCurrent(page === 'account-settings')"
                        :title="$t('Profile and security')"
                        :aria-label="$t('Profile and security')"
                        :to="resolveSidebarRoute('account-settings')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-user-shield" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Profile and security") }}</div>
                    </router-link>
                </section>

                <section v-if="!showAdminSections && !isRegularOrgMember" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'traceability' }"
                        :aria-current="sidebarCurrent(page === 'traceability')"
                        :title="$t('Traceability')"
                        :aria-label="$t('Traceability')"
                        :to="resolveSidebarRoute('traceability')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-shield" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Traceability") }}</div>
                    </router-link>
                </section>

                <section v-if="showOrganizationManagement" class="sidebar-group">
                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'org-members' }"
                        :aria-current="sidebarCurrent(page === 'org-members')"
                        :title="$t('Organization members')"
                        :aria-label="$t('Organization members')"
                        :to="resolveSidebarRoute('org-members')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-users" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Organization members") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'org-licenses' }"
                        :aria-current="sidebarCurrent(page === 'org-licenses')"
                        :title="$t('Licenses')"
                        :aria-label="$t('Licenses')"
                        :to="resolveSidebarRoute('org-licenses')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-id-card" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Licenses") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'org-billing' }"
                        :aria-current="sidebarCurrent(page === 'org-billing')"
                        :title="$t('Billing')"
                        :aria-label="$t('Billing')"
                        :to="resolveSidebarRoute('org-billing')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-file-invoice-dollar" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Billing") }}</div>
                    </router-link>

                    <router-link
                        class="side-bar-option"
                        :class="{ selected: page === 'org-configuration' }"
                        :aria-current="sidebarCurrent(page === 'org-configuration')"
                        :title="$t('Organization settings')"
                        :aria-label="$t('Organization settings')"
                        :to="resolveSidebarRoute('org-configuration')"
                    >
                        <div class="side-bar-option-icon"><i class="fas fa-gear" aria-hidden="true"></i></div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Organization settings") }}</div>
                    </router-link>
                </section>
                <section class="sidebar-group">
                    <router-link
                        class="side-bar-option side-bar-option-notifications"
                        :class="{ selected: page === 'notifications', 'has-unread-notifications': hasUnreadNotifications }"
                        :aria-current="sidebarCurrent(page === 'notifications')"
                        :title="notificationsSidebarTitle"
                        :aria-label="notificationsSidebarTitle"
                        :to="resolveSidebarRoute('notifications')"
                    >
                        <div class="side-bar-option-icon">
                            <i class="fas fa-bell" aria-hidden="true"></i>
                        </div>
                        <div v-if="!collapsed" class="side-bar-option-text">{{ $t("Notifications") }}</div>
                        <span v-if="hasUnreadNotifications" class="sidebar-notification-count" aria-hidden="true">
                            {{ notificationsBadgeCount }}
                        </span>
                    </router-link>
                </section>
            </div>
        </nav>

        <div class="sidebar-footer">
            <div class="sidebar-footer-actions">
                <button
                    type="button"
                    id="sidebar-account-settings-button"
                    class="sidebar-user-button"
                    :title="$t('Open account settings')"
                    :aria-label="$t('Open account settings')"
                    :aria-expanded="accountSettingsOpen"
                    aria-haspopup="dialog"
                    aria-controls="account-settings-dropdown"
                    @click="$emit('openModal', 'account-settings-sidebar')"
                >
                    <span class="sidebar-user-avatar">
                        <img v-if="profileImage" class="sidebar-user-avatar-image" :src="profileImage" alt="" />
                        <span v-else>{{ userInitials }}</span>
                    </span>
                    <span v-if="!collapsed" class="sidebar-user-data">
                        <span class="sidebar-user-name">{{ userName }}</span>
                        <span class="sidebar-user-email">{{ userEmail }}</span>
                    </span>
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { AuthController } from "@/control/auth";
import nubemsystemLogoWhite from "@/assets/nubemsystem-logo-white.png";
import { NotificationsController } from "@/control/notifications";
import {
    hasAdministrationMenuAccess,
    hasOrganizationAdminAccess,
    hasPlatformOrganizationAccess,
    shouldShowOrganizationManagementMenu,
} from "@/control/organization-admin-access";
import { OrganizationController } from "@/control/organization";

export default defineComponent({
    name: "MenuSideBar",
    components: {},
    emits: ["openModal"],
    props: {
        expanded: Boolean,
        collapsed: Boolean,
        accountSettingsOpen: Boolean,
    },
    data: function () {
        return {
            page: "",
            userName: "",
            userEmail: "",
            profileImage: "",
            userRole: "",
            unreadNotificationsCount: NotificationsController.UnreadCount,
            organizationContextVersion: 0,
        };
    },
    computed: {
        userInitials(): string {
            const source = this.userName || this.userEmail || "User";
            const chunks = source
                .trim()
                .split(/\s+/)
                .filter((chunk) => !!chunk);
            if (chunks.length === 1) {
                return chunks[0].slice(0, 2).toUpperCase();
            }
            return (chunks[0][0] + chunks[1][0]).toUpperCase();
        },
        isOrganizationAdmin(): boolean {
            void this.organizationContextVersion;
            void OrganizationController.Loaded;
            return hasOrganizationAdminAccess();
        },
        showAdminSections(): boolean {
            return hasAdministrationMenuAccess();
        },
        showOrganizationManagement(): boolean {
            void this.organizationContextVersion;
            return shouldShowOrganizationManagementMenu();
        },
        isRegularOrgMember(): boolean {
            void this.organizationContextVersion;
            void OrganizationController.Loaded;
            if (hasPlatformOrganizationAccess()) {
                return false;
            }
            if (hasOrganizationAdminAccess()) {
                return false;
            }
            return OrganizationController.hasOrganization();
        },
        isItaasPlatformPage(): boolean {
            return (
                this.page === "itaas-platform" ||
                this.page === "itaas-platform-execution-detail" ||
                this.page === "itaas-platform-flow-detail"
            );
        },
        subscriptionsLabel(): string {
            return hasPlatformOrganizationAccess() ? this.$t("Manage subscriptions") : this.$t("My subscriptions");
        },
        collapsedLogo(): string {
            return nubemsystemLogoWhite;
        },
        hasUnreadNotifications(): boolean {
            return this.unreadNotificationsCount > 0;
        },
        notificationsBadgeCount(): string {
            return this.collapsed && this.unreadNotificationsCount > 99 ? "99+" : String(this.unreadNotificationsCount);
        },
        notificationsSidebarTitle(): string {
            if (!this.hasUnreadNotifications) {
                return this.$t("Notifications");
            }

            return this.$t("Notifications") + " (" + this.unreadNotificationsCount + ")";
        },
    },
    methods: {
        sidebarCurrent: function (selected: boolean): "page" | undefined {
            return selected ? "page" : undefined;
        },

        updatePage: function () {
            const routeName = this.$route ? (this.$route.name as string) : "";
            if (routeName === "nubem-catalog" || routeName === "nubem-detail") {
                this.page = "catalog";
                return;
            }
            this.page = routeName;
        },

        onAuthChanged: function () {
            this.userName = AuthController.ProfileName || AuthController.Username || "User";
            this.userEmail = AuthController.Email || "user@example.com";
            this.profileImage = AuthController.ProfileImage || "";
            this.userRole = AuthController.Role || "default";
            this.unreadNotificationsCount = NotificationsController.UnreadCount;
        },

        onUnreadNotificationsChanged: function (unreadCount: number) {
            this.unreadNotificationsCount = Math.max(0, unreadCount || 0);
        },

        onOrganizationContextChanged: function () {
            this.organizationContextVersion += 1;
        },

        resolveSidebarRoute: function (routeName) {
            if (routeName === "catalog") {
                const preferred = hasPlatformOrganizationAccess() ? "catalog-admin" : "catalog";
                if (this.$router && typeof this.$router.hasRoute === "function" && this.$router.hasRoute(preferred)) {
                    return { name: preferred };
                }
                if (this.$router && typeof this.$router.hasRoute === "function" && this.$router.hasRoute("catalog")) {
                    return { name: "catalog" };
                }
            }
            if (this.$router && typeof this.$router.hasRoute === "function" && this.$router.hasRoute(routeName)) {
                return { name: routeName };
            }
            return { name: "about" };
        },
    },
    mounted: function () {
        this.updatePage();
        this.onAuthChanged();

        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("notifications-unread-count-changed", this.onUnreadNotificationsChanged.bind(this));
        this.$listenOnAppEvent("organization-context-changed", this.onOrganizationContextChanged.bind(this));
    },
    watch: {
        $route: function () {
            this.updatePage();
        },
    },
});
</script>

<style></style>
