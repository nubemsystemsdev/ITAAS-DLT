import type { Notification } from "@/api/definitions";
import { hasOrganizationAdminAccess, hasPlatformOrganizationAccess } from "@/control/organization-admin-access";
import type { RouteLocationRaw } from "vue-router";

export interface NotificationRouteOptions {
    invitationResolved?: "accepted" | "rejected";
}

function getContentStringField(notification: Notification, fieldName: string): string {
    const content = notification.notificationContent as Record<string, unknown> | undefined;
    const value = content?.[fieldName];
    return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function getNotificationRoute(notification: Notification, options?: NotificationRouteOptions): RouteLocationRaw | null {
    const type = (notification.notificationContent?.type || "").toLowerCase();
    const isPlatformAdmin = hasPlatformOrganizationAccess();
    const isOrganizationAdmin = hasOrganizationAdminAccess();

    switch (type) {
        case "purchase_confirmation":
            return isPlatformAdmin ? { name: "payments" } : { name: "payment-history" };

        case "subscription_renewed": {
            const subscriptionId = getContentStringField(notification, "subscriptionId");
            if (isPlatformAdmin && subscriptionId) {
                return { name: "admin-subscription-detail", params: { subscriptionId } };
            }
            return { name: "subscriptions" };
        }

        case "payment_failed":
            return isPlatformAdmin ? { name: "payments" } : { name: "subscriptions" };

        case "seats_reduced": {
            const subscriptionId = getContentStringField(notification, "subscriptionId");
            if (isOrganizationAdmin && !isPlatformAdmin) {
                return { name: "org-licenses" };
            }
            if (isPlatformAdmin && subscriptionId) {
                return { name: "admin-subscription-detail", params: { subscriptionId } };
            }
            return { name: "subscriptions" };
        }

        case "token_issue":
            return { name: "tokens" };

        case "login":
            return { name: "account-settings", query: { tab: "devices" } };

        case "organization_request":
            return { name: "orgs-requests", query: { tab: "creation" } };

        case "organization_request_approved":
            return isOrganizationAdmin ? { name: "org-configuration" } : { name: "org-my-membership" };

        case "organization_request_rejected":
            return { name: "organization-request" };

        case "organization_deletion_request":
            if (isPlatformAdmin) {
                return { name: "orgs-requests", query: { tab: "deletion" } };
            }
            if (isOrganizationAdmin) {
                return { name: "org-configuration" };
            }
            return null;

        case "organization_deletion_request_approved":
        case "organization_deletion_request_rejected":
            return isOrganizationAdmin ? { name: "org-configuration" } : null;

        case "organization_deletion_scheduled":
            return isOrganizationAdmin ? { name: "org-configuration" } : { name: "org-my-membership" };

        case "organization_deleted":
            return { name: "organization-request" };

        case "organization_member_invited": {
            if (options?.invitationResolved === "accepted") {
                return { name: "org-my-membership" };
            }
            return null;
        }

        case "organization_member_invitation_accepted":
            return { name: "org-members", query: { tab: "active" } };

        case "organization_member_invitation_rejected":
            return { name: "org-members", query: { tab: "invited" } };

        case "organization_member_activated":
        case "organization_member_deactivated":
            return { name: "org-my-membership" };

        case "organization_member_removed":
            return { name: "organization-request" };

        case "organization_member_left":
            return { name: "org-members", query: { tab: "active" } };

        case "custom_agent_request_created": {
            if (!isPlatformAdmin) {
                return null;
            }
            const createdRequestId = getContentStringField(notification, "requestId");
            return createdRequestId
                ? { name: "custom-agent-requests", query: { id: createdRequestId } }
                : { name: "custom-agent-requests" };
        }

        case "custom_agent_request_deposit_paid": {
            if (isPlatformAdmin) {
                const paidRequestId = getContentStringField(notification, "requestId");
                return paidRequestId ? { name: "custom-agent-requests", query: { id: paidRequestId } } : { name: "custom-agent-requests" };
            }
            return { name: "itaas-platform", query: { tab: "custom-request" } };
        }

        case "custom_agent_request_accepted":
        case "custom_agent_request_rejected":
        case "custom_agent_request_cancelled":
        case "custom_agent_request_delivered":
            return { name: "itaas-platform", query: { tab: "custom-request" } };

        default:
            return null;
    }
}

export function hasNotificationRoute(notification: Notification, options?: NotificationRouteOptions): boolean {
    return getNotificationRoute(notification, options) !== null;
}
