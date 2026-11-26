import { AuthController } from "@/control/auth";
import { OrganizationController } from "@/control/organization";

export const PLATFORM_ADMIN_ROLE = "admin";

export function isGlobalAdminRole(): boolean {
    return AuthController.Role === PLATFORM_ADMIN_ROLE;
}

export function hasPlatformOrganizationAccess(): boolean {
    return isGlobalAdminRole() || AuthController.hasPermission("admin.users.manage");
}

export function hasOrganizationAdminAccess(): boolean {
    return OrganizationController.isOrganizationAdmin();
}

export function hasAdministrationMenuAccess(): boolean {
    return (
        isGlobalAdminRole() ||
        AuthController.hasPermission("admin.roles") ||
        AuthController.hasPermission("admin.users.manage") ||
        AuthController.hasPermission("mod.users")
    );
}

export function shouldShowOrganizationRequestEntry(): boolean {
    if (hasPlatformOrganizationAccess() || hasOrganizationAdminAccess()) {
        return false;
    }

    return !OrganizationController.hasOrganization();
}

export function shouldShowOrganizationManagementMenu(): boolean {
    return hasOrganizationAdminAccess() && !hasPlatformOrganizationAccess();
}

export function resolveDefaultHomeRoute(): string {
    if (hasAdministrationMenuAccess() || hasOrganizationAdminAccess()) {
        return "dashboard";
    }
    if (OrganizationController.hasOrganization()) {
        return "org-my-membership";
    }
    return "subscriptions";
}
