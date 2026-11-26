import type { Notification } from "@/api/definitions";

export type TranslateFn = (key: string) => string;

export function getNotificationTitle(notification: Notification, t: TranslateFn): string {
    const type = (notification.notificationContent?.type || "").toLowerCase();

    switch (type) {
        case "purchase_confirmation":
            return t("Purchase confirmed");
        case "subscription_renewed":
            return t("Subscription renewed");
        case "payment_failed":
            return t("Payment failed");
        case "seats_reduced":
            return t("Organization seats reduced");
        case "token_issue":
            return t("Tokens issued");
        case "login":
            return t("New sign in");
        case "organization_request":
            return t("Organization creation request");
        case "organization_request_approved":
            return t("Organization request approved");
        case "organization_request_rejected":
            return t("Organization request rejected");
        case "organization_member_invited":
            return t("Organization invitation");
        case "organization_member_invitation_accepted":
            return t("Invitation accepted");
        case "organization_member_invitation_rejected":
            return t("Invitation rejected");
        case "organization_member_activated":
            return t("Member activated");
        case "organization_member_deactivated":
            return t("Member deactivated");
        case "organization_member_removed":
            return t("Member removed");
        case "organization_member_left":
            return t("A member left the organization");
        case "organization_deletion_request":
            return t("Organization deletion request");
        case "organization_deletion_request_approved":
            return t("Organization deletion request approved");
        case "organization_deletion_request_rejected":
            return t("Organization deletion request rejected");
        case "organization_deletion_scheduled":
            return t("Organization deletion scheduled");
        case "organization_deleted":
            return t("Organization deleted");
        case "custom_agent_request_created":
            return t("Custom agent request received");
        case "custom_agent_request_accepted":
            return t("Custom agent request accepted");
        case "custom_agent_request_rejected":
            return t("Custom agent request rejected");
        case "custom_agent_request_cancelled":
            return t("Custom agent request cancelled");
        case "custom_agent_request_delivered":
            return t("Custom agent delivered");
        case "custom_agent_request_deposit_paid":
            return t("Custom agent deposit paid");
        default:
            return t("Notification");
    }
}

export function getNotificationActivityDotClass(notification: Notification): string {
    if (!notification.read) {
        return "activity-dot-warning";
    }

    const type = (notification.notificationContent?.type || "").toLowerCase();

    switch (type) {
        case "payment_failed":
        case "organization_request_rejected":
        case "organization_deletion_request_rejected":
        case "organization_member_invitation_rejected":
        case "organization_member_deactivated":
        case "organization_member_removed":
        case "organization_member_left":
        case "custom_agent_request_rejected":
        case "custom_agent_request_cancelled":
            return "activity-dot-error";
        case "purchase_confirmation":
        case "subscription_renewed":
        case "organization_request_approved":
        case "organization_deletion_request_approved":
        case "organization_member_invitation_accepted":
        case "organization_member_activated":
        case "custom_agent_request_accepted":
        case "custom_agent_request_delivered":
        case "custom_agent_request_deposit_paid":
            return "activity-dot-success";
        case "seats_reduced":
        case "token_issue":
        case "organization_request":
        case "organization_member_invited":
        case "organization_deletion_request":
        case "organization_deletion_scheduled":
        case "custom_agent_request_created":
        case "login":
            return "activity-dot-primary";
        case "organization_deleted":
            return "activity-dot-error";
        default:
            return "activity-dot-muted";
    }
}
