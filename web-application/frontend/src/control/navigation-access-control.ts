import { Router } from "vue-router";
import { Timeouts } from "@/utils/timeout";
import { AppEvents } from "@/control/app-events";
import { AuthController } from "@/control/auth";
import { OrganizationController } from "@/control/organization";
import { hasOrganizationAdminAccess, hasPlatformOrganizationAccess, resolveDefaultHomeRoute } from "@/control/organization-admin-access";
import { WalletsController } from "@/control/wallets";

const ROUTER_LOADING_INDICATOR_DELAY_MS = 600;

const UNAUTHORIZED_ONLY_ROUTES = new Set([
    "login",
    "tfa-login",
    "signup",
    "signup-success",
    "forgot-password",
    "reset-password",
    "verify-email",
    "tp-login",
    "tp-signup",
    "keycloak-callback",
]);

const ROUTE_ACCESS_CONTROL = {
    public: new Set(["home", "about", "terms", "cookies", "privacy", "contact", "create-wallet", "nubem-catalog", "plans"]),
    guestOnly: UNAUTHORIZED_ONLY_ROUTES,
    noWalletRequired: new Set(["home", "about", "terms", "cookies", "privacy", "contact", "create-wallet", "nubem-catalog", "plans"]),
    organizationAdminOnly: new Set(["org-members", "org-licenses", "org-configuration", "org-billing"]),
    organizationMemberOnly: new Set(["org-my-membership"]),
};

/** Routes regular org members may keep when organization context refreshes. */
const ORGANIZATION_MEMBER_ALLOWED_ROUTES = new Set([
    "org-my-membership",
    "account-settings",
    "notifications",
    "itaas-platform",
    "itaas-platform-execution-detail",
    "itaas-platform-flow-detail",
]);

/** Public marketing / landing routes (excludes onboarding such as create-wallet). */
const LANDING_NAVIGATION_ROUTES = new Set([
    "home",
    "about",
    "terms",
    "cookies",
    "privacy",
    "contact",
    "plans",
    "nubem-catalog",
    "nubem-detail",
]);

export function isOnLandingNavigationRoute(routeName: string | symbol | null | undefined): boolean {
    return LANDING_NAVIGATION_ROUTES.has(String(routeName || ""));
}

export function applyNavigationAccessControl(router: Router) {
    // When a user enters an organization, keep them on member-allowed routes (or send to my-membership)
    AppEvents.AddEventListener("organization-context-changed", () => {
        const routeName = router.currentRoute.value.name as string;
        if (
            !hasOrganizationAdminAccess() &&
            !hasPlatformOrganizationAccess() &&
            OrganizationController.hasOrganization() &&
            !ORGANIZATION_MEMBER_ALLOWED_ROUTES.has(routeName) &&
            !UNAUTHORIZED_ONLY_ROUTES.has(routeName)
        ) {
            void router.push({ name: "org-my-membership" });
        }
    });

    router.beforeEach(async (to) => {
        const targetRouteName = String(to.name || "");
        const isAuthenticated = AuthController.isAuthenticated();

        if (!isAuthenticated && AuthController.KeycloakSsoEnabled) {
            if (targetRouteName === "login") {
                void AuthController.LoginWithKeycloak();
                return false;
            }
            if (targetRouteName === "signup") {
                void AuthController.RegisterWithKeycloak();
                return false;
            }
        }

        const isPublicRoute = ROUTE_ACCESS_CONTROL.public.has(targetRouteName) || ROUTE_ACCESS_CONTROL.guestOnly.has(targetRouteName);

        if (!isAuthenticated && !isPublicRoute) {
            if (AuthController.KeycloakSsoEnabled) {
                AuthController.PageToGo = {
                    name: targetRouteName || "home",
                    params: { ...to.params },
                    query: { ...to.query },
                };
                void AuthController.LoginWithKeycloak();
                return false;
            }
            return { name: "home" };
        }

        if (isAuthenticated) {
            if (ROUTE_ACCESS_CONTROL.guestOnly.has(targetRouteName)) {
                // OAuth callback must run for logged-in users too (e.g. CONFIGURE_TOTP / UPDATE_PASSWORD cancel/success).
                if (targetRouteName !== "keycloak-callback" && targetRouteName !== "verify-email") {
                    const hasWallet = await WalletsController.resolveUserHasWallet();
                    return { name: hasWallet ? "dashboard" : "create-wallet" };
                }
            }

            if (!ROUTE_ACCESS_CONTROL.noWalletRequired.has(targetRouteName)) {
                const hasWallet = await WalletsController.resolveUserHasWallet();

                if (!hasWallet) {
                    return { name: "create-wallet" };
                }
            }

            if (targetRouteName === "dashboard") {
                await OrganizationController.ensureReady();
                const correctedRoute = resolveDefaultHomeRoute();
                if (correctedRoute !== "dashboard") {
                    return { name: correctedRoute };
                }
            }

            if (ROUTE_ACCESS_CONTROL.organizationAdminOnly.has(targetRouteName)) {
                await OrganizationController.ensureReady();

                const canAccessOrganizationRoutes = hasOrganizationAdminAccess() && !hasPlatformOrganizationAccess();
                if (!canAccessOrganizationRoutes) {
                    return { name: "dashboard" };
                }
            }

            if (ROUTE_ACCESS_CONTROL.organizationMemberOnly.has(targetRouteName)) {
                await OrganizationController.ensureReady();

                if (hasPlatformOrganizationAccess()) {
                    return { name: "dashboard" };
                }

                if (!OrganizationController.hasOrganization()) {
                    return { name: "dashboard" };
                }
            }
        }

        Timeouts.Set("router-load-state", ROUTER_LOADING_INDICATOR_DELAY_MS, () => {
            AppEvents.Emit("router-load-state-change", true);
        });
    });

    router.afterEach(() => {
        Timeouts.Abort("router-load-state");
        AppEvents.Emit("router-load-state-change", false);
    });
}
