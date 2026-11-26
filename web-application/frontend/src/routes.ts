// Routes

"use strict";

import { createRouter, createWebHistory, Router, RouteRecordRaw } from "vue-router";

// Router
// https://router.vuejs.org/guide/#javascript

// List of forbidden routes:
//
//    - /api/*  - This is reserved for the API
//    - /static/* - This is reserved for static assets
//    - /webhooks*/ - Reserved for webhooks

const routes: (RouteRecordRaw & {
    meta?: {
        /**
         * Set it to true for sticky sidebar
         */
        sidebarSticky?: boolean;

        /**
         * Set to false to hide the top bar in this route
         */
        showTopBar?: boolean;

        /**
         * Set to true to keep sidebar visible at all times
         */
        sidebarAlwaysVisible?: boolean;

        /**
         * Keep route component alive when navigating away (restores state on back).
         */
        keepAlive?: boolean;

        /**
         * Detail screen using DetailsViewLayout (hides the floating sidebar menu trigger on mobile).
         */
        detailsView?: boolean;
    };
})[] = [
    /* General / Home */

    {
        name: "home",
        path: "/",
        component: () => import("@/components/routes/HomePage.vue"),
        meta: {
            sidebarSticky: false,
        },
    },
    {
        name: "about",
        path: "/about",
        component: () => import("@/components/routes/AboutPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "plans",
        path: "/plans",
        component: () => import("@/components/routes/PlansPage.vue"),
        meta: {
            sidebarSticky: false,
        },
    },

    {
        name: "contact",
        path: "/contact",
        component: () => import("@/components/routes/ContactPage.vue"),
        meta: {
            sidebarSticky: false,
        },
    },
    {
        name: "dashboard",
        path: "/dashboard",
        component: () => import("@/components/routes/dashboard/DashboardPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "catalog",
        path: "/catalog",
        component: () => import("@/components/routes/dashboard/CatalogUserPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "agent-marketplace",
        path: "/agent-marketplace",
        redirect: { name: "itaas-platform", query: { tab: "public-agents" } },
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "catalog-admin",
        path: "/admin/catalog",
        component: () => import("@/components/routes/dashboard/CatalogPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "catalog-detail",
        path: "/catalog/:id",
        component: () => import("@/components/routes/catalog/NubemItemPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "subscriptions",
        path: "/subscriptions",
        component: () => import("@/components/routes/dashboard/user/SubscriptionsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "admin-subscription-detail",
        path: "/subscriptions/:subscriptionId",
        component: () => import("@/components/routes/dashboard/admin/SubscriptionDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
            detailsView: true,
        },
    },
    {
        name: "payment-history",
        path: "/payment-history",
        component: () => import("@/components/routes/dashboard/PaymentHistoryPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "notifications",
        path: "/notifications",
        component: () => import("@/components/routes/dashboard/NotificationsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "clients-orgs",
        path: "/clients-orgs",
        component: () => import("@/components/routes/dashboard/admin/ClientsOrganizationsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "clients-client-detail",
        path: "/clients-orgs/client/:clientId",
        component: () => import("@/components/routes/dashboard/admin/ClientDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
            detailsView: true,
        },
    },
    {
        name: "clients-org-detail",
        path: "/clients-orgs/:organizationId",
        component: () => import("@/components/routes/dashboard/admin/ClientOrganizationDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
            detailsView: true,
        },
    },
    {
        name: "orgs-requests",
        path: "/orgs-requests",
        component: () => import("@/components/routes/dashboard/admin/OrgsRequestsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "custom-agent-requests",
        path: "/custom-agent-requests",
        component: () => import("@/components/routes/dashboard/admin/CustomAgentRequestsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "itaas-flow-management",
        path: "/admin/itaas-flows",
        component: () => import("@/components/routes/dashboard/admin/ItaasFlowManagementPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "itaas-admin-flow-detail",
        path: "/admin/itaas-flows/:flowId",
        component: () => import("@/components/routes/dashboard/ItaasPlatformFlowDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            detailsView: true,
        },
    },
    {
        name: "organization-request",
        path: "/organization-request",
        component: () => import("@/components/routes/dashboard/OrganizationRequestPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "payments",
        path: "/payments",
        component: () => import("@/components/routes/dashboard/PaymentsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "tokens",
        path: "/tokens",
        component: () => import("@/components/routes/dashboard/TokensPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "token-rules",
        path: "/token-rules",
        component: () => import("@/components/routes/dashboard/TokenRulesPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "traceability",
        path: "/traceability",
        component: () => import("@/components/routes/dashboard/TraceabilityPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "itaas-platform",
        path: "/itaas-platform",
        component: () => import("@/components/routes/dashboard/ItaasPlatformPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
        },
    },
    {
        name: "itaas-platform-execution-detail",
        path: "/itaas-platform/executions/:executionId",
        component: () => import("@/components/routes/dashboard/ItaasPlatformExecutionDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
            detailsView: true,
        },
    },
    {
        name: "itaas-platform-flow-detail",
        path: "/itaas-platform/flows/:flowId",
        component: () => import("@/components/routes/dashboard/ItaasPlatformFlowDetailsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            detailsView: true,
        },
    },
    {
        name: "configuration",
        path: "/configuration",
        component: () => import("@/components/routes/dashboard/ConfigurationPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },

    /* Organization management */

    {
        name: "org-my-membership",
        path: "/organization/my-membership",
        component: () => import("@/components/routes/organization/OrganizationMemberPage.vue"),
        meta: {
            pageTitleKey: "My membership",
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "org-members",
        path: "/organization/members",
        component: () => import("@/components/routes/organization/OrganizationMembersPage.vue"),
        meta: {
            pageTitleKey: "Organization members",
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "org-licenses",
        path: "/organization/licenses",
        component: () => import("@/components/routes/organization/OrganizationLicensePage.vue"),
        meta: {
            pageTitleKey: "Licenses",
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "org-configuration",
        path: "/organization/configuration",
        component: () => import("@/components/routes/organization/OrganizationSettingsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },
    {
        name: "org-billing",
        path: "/organization/billing",
        component: () => import("@/components/routes/organization/OrganizationBillingPage.vue"),
        meta: {
            pageTitleKey: "Billing",
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },

    {
        name: "nubem-catalog",
        path: "/nubem-catalog",
        component: () => import("@/components/routes/catalog/NubemCatalogPage.vue"),
        meta: {
            sidebarSticky: false,
            keepAlive: true,
        },
    },

    {
        name: "nubem-detail",
        path: "/nubem-catalog/:id",
        component: () => import("@/components/routes/catalog/NubemItemPage.vue"),
        meta: {
            sidebarSticky: false,
            keepAlive: true,
        },
    },

    {
        name: "terms",
        path: "/terms",
        component: () => import("@/components/routes/TermsOfUsePage.vue"),
        meta: {
            sidebarSticky: true,
        },
    },

    {
        name: "cookies",
        path: "/cookies",
        component: () => import("@/components/routes/CookiePolicyPage.vue"),
        meta: {
            sidebarSticky: true,
        },
    },

    {
        name: "privacy",
        path: "/privacy",
        component: () => import("@/components/routes/PrivacyPolicyPage.vue"),
        meta: {
            sidebarSticky: true,
        },
    },

    /* Auth */

    {
        name: "login",
        path: "/login",
        component: () => import("@/components/routes/auth/LoginPage.vue"),
        meta: {
            showTopBar: false,
        },
    },

    {
        name: "tfa-login",
        path: "/login/tfa",
        component: () => import("@/components/routes/auth/TwoFactorLoginPage.vue"),
    },

    {
        name: "signup",
        path: "/signup",
        component: () => import("@/components/routes/auth/SignupPage.vue"),
        meta: {
            showTopBar: false,
        },
    },
    {
        name: "signup-success",
        path: "/signup/success",
        component: () => import("@/components/routes/auth/SignupSuccessPage.vue"),
    },

    {
        name: "forgot-password",
        path: "/password/forgot",
        component: () => import("@/components/routes/auth/ForgotPasswordPage.vue"),
        meta: {
            showTopBar: false,
        },
    },
    {
        name: "reset-password",
        path: "/password/reset/:uid/:token",
        component: () => import("@/components/routes/auth/ResetPasswordPage.vue"),
    },

    {
        name: "verify-email",
        path: "/email/verify/:uid/:token",
        component: () => import("@/components/routes/auth/EmailVerifyPage.vue"),
    },

    {
        name: "tp-login",
        path: "/login/tp/:service",
        component: () => import("@/components/routes/auth/ThirdPartyLogin.vue"),
    },

    {
        name: "tp-signup",
        path: "/signup/tp",
        component: () => import("@/components/routes/auth/ThirdPartySignupPage.vue"),
    },

    {
        name: "keycloak-callback",
        path: "/callbacks/keycloak",
        component: () => import("@/components/routes/auth/KeycloakCallback.vue"),
        meta: {
            showTopBar: false,
        },
    },

    /* Agents */

    {
        name: "agents",
        path: "/agents",
        redirect: { name: "itaas-platform", query: { tab: "public-agents" } },
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
        },
    },

    /* Profile */

    {
        name: "profile",
        path: "/user/:username",
        component: () => import("@/components/routes/profile/ProfilePage.vue"),
    },

    /* Account */

    {
        name: "account-settings",
        path: "/account-settings",
        component: () => import("@/components/routes/account/AccountSettingsPage.vue"),
        meta: {
            sidebarSticky: true,
            showTopBar: false,
            sidebarAlwaysVisible: true,
            keepAlive: true,
            detailsView: true,
        },
    },

    /* Wallet */

    {
        name: "wallet",
        path: "/wallet/:id?",
        redirect: { name: "account-settings", query: { tab: "wallet" } },
    },
    {
        name: "create-wallet",
        path: "/wallet/create",
        component: () => import("@/components/routes/account/CreateWalletPage.vue"),
        meta: {
            showTopBar: false,
        },
    },

    /* Admin */

    // {
    //     name: "admin",
    //     path: "/admin",
    //     component: () => import("@/components/routes/admin/AdministrationPage.vue"),
    //     meta: {
    //         keepAlive: true,
    //     },
    // },

    // {
    //     name: "admin-user",
    //     path: "/admin/users/:id",
    //     component: () => import("@/components/routes/admin/UserPage.vue"),
    //     meta: {
    //         keepAlive: true,
    //     },
    // },

    /* Default */

    {
        path: "/:catchAll(.*)",
        component: () => import("@/components/routes/NotFoundPage.vue"),
    },
];

export function makeApplicationRouter(): Router {
    return createRouter({
        history: createWebHistory(),
        routes,
    });
}
