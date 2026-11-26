import { Notifications } from "../models/notifications";
import { User } from "../models/users/user";
import { Monitor } from "../monitor";
import { createRandomUID } from "../utils/text-utils";
import { RedisService } from "./redis-service";
import { Config } from "../config/config";
import { MailService } from "./mail-service";
import { NotificationEmailView } from "../emails/notification.email.view";
import { InternationalizationService, Translator } from "./i18n-service";


export interface NotificationData_Purchase_Confirmation {
    type: "purchase_confirmation";
    ordenId: string;
    info: {
        productName: string;
        currency: string;
        amount: number;
    }
}

export interface NotificationData_Subscription_Renewed {
    type: "subscription_renewed";
    subscriptionId: string;
    info: {
        planName: string;
        nextRenewalDate: string;
    }
}

export interface NotificationData_Payment_Failed {
    type: "payment_failed";
    transactionId: string;
    info: {
        reason: string;
        retryUrl: string;
    }
}

export interface NotificationData_Seats_Reduced {
    type: "seats_reduced";
    subscriptionId: string;
    info: {
        revokedCount: number;
        maxSeats: number;
    }
}

export interface NotificationData_Token_Issue {
    type: "token_issue";
    info: {
        amount: number;
        walletAddress: string;
    }
}

export interface NotificationData_Unknown {
    type: "unknown";
}

export interface NotificationData_Login {
    type: "login";
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Request_Approved {
    type: "organization_request_approved";
    companyName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Request_Rejected {
    type: "organization_request_rejected";
    companyName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Invited {
    type: "organization_member_invited";
    organizationName: string;
    role: string;
    membershipId: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Invitation_Accepted {
    type: "organization_member_invitation_accepted";
    organizationName: string;
    memberName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Invitation_Rejected {
    type: "organization_member_invitation_rejected";
    organizationName: string;
    memberName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Activated {
    type: "organization_member_activated";
    organizationName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Deactivated {
    type: "organization_member_deactivated";
    organizationName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Member_Removed {
    type: "organization_member_removed";
    organizationName: string;
    info: {
        message: string;
        organizationName: string;
    }
}

export interface NotificationData_Organization_Member_Left {
    type: "organization_member_left";
    organizationName: string;
    info: {
        message?: string;
        organizationName: string;
        memberName: string;
    }
}
export interface NotificationData_Organization_Request {
    type: "organization_request";
    organizationName: string;
    memberName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Deletion_Request {
    type: "organization_deletion_request";
    organizationName: string;
    memberName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Deletion_Request_Approved {
    type: "organization_deletion_request_approved";
    organizationName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Deletion_Request_Rejected {
    type: "organization_deletion_request_rejected";
    organizationName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Deleted {
    type: "organization_deleted";
    organizationName: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Organization_Deletion_Scheduled {
    type: "organization_deletion_scheduled";
    organizationName: string;
    info: {
        message: string;
        scheduledDeletionAt: number;
    }
}

export interface NotificationData_Custom_Agent_Request_Created {
    type: "custom_agent_request_created";
    requestId: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Custom_Agent_Request_Accepted {
    type: "custom_agent_request_accepted";
    requestId: string;
    info: {
        message: string;
        depositPriceEur?: number;
        monthlyPriceEur?: number;
    }
}

export interface NotificationData_Custom_Agent_Request_Rejected {
    type: "custom_agent_request_rejected";
    requestId: string;
    info: {
        message: string;
        reason?: string;
    }
}

export interface NotificationData_Custom_Agent_Request_Cancelled {
    type: "custom_agent_request_cancelled";
    requestId: string;
    info: {
        message: string;
    }
}

export interface NotificationData_Custom_Agent_Request_Delivered {
    type: "custom_agent_request_delivered";
    requestId: string;
    info: {
        message: string;
        monthlyPriceEur?: number;
    }
}

export interface NotificationData_Custom_Agent_Request_Deposit_Paid {
    type: "custom_agent_request_deposit_paid";
    requestId: string;
    info: {
        message: string;
    }
}

export type NotificationData = NotificationData_Login | NotificationData_Purchase_Confirmation | NotificationData_Subscription_Renewed | NotificationData_Payment_Failed | NotificationData_Seats_Reduced | NotificationData_Token_Issue | NotificationData_Organization_Request | NotificationData_Organization_Deletion_Request | NotificationData_Organization_Deletion_Request_Approved | NotificationData_Organization_Deletion_Request_Rejected | NotificationData_Organization_Deleted | NotificationData_Organization_Deletion_Scheduled | NotificationData_Organization_Request_Approved | NotificationData_Organization_Request_Rejected | NotificationData_Organization_Member_Invited | NotificationData_Organization_Member_Invitation_Accepted | NotificationData_Organization_Member_Invitation_Rejected | NotificationData_Organization_Member_Activated | NotificationData_Organization_Member_Deactivated | NotificationData_Organization_Member_Removed | NotificationData_Organization_Member_Left | NotificationData_Custom_Agent_Request_Created | NotificationData_Custom_Agent_Request_Accepted | NotificationData_Custom_Agent_Request_Rejected | NotificationData_Custom_Agent_Request_Cancelled | NotificationData_Custom_Agent_Request_Delivered | NotificationData_Custom_Agent_Request_Deposit_Paid | NotificationData_Unknown;

export class NotificationService {

    public static instance: NotificationService | null = null;

    public static getInstance(): NotificationService {
        if (NotificationService.instance) {
            return NotificationService.instance;
        } else {
            NotificationService.instance = new NotificationService();
            return NotificationService.instance;
        }
    }

    public encodeNotificationData(data: NotificationData): string {
        return Buffer.from(JSON.stringify(data), "utf8").toString("base64");
    }

    public decodeNotificationData(data: string): NotificationData {
        if (!data) {
            return { type: "unknown" };
        }
        try {
            const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
            if (!decoded || typeof decoded !== "object") {
                return { type: "unknown" };
            }
            if (typeof decoded.type !== "string") {
                return { type: "unknown" };
            }
            return decoded;
        } catch (ex) {
            if (ex instanceof Error) {
                Monitor.debugException(ex);
            } else {
                Monitor.debugException(new Error(String(ex)));
            }
            return { type: "unknown" };
        }
    }


    private getNotificationTitle(type: string, translator: Translator): string {
        switch (type) {
            case "purchase_confirmation":
                return translator.__("Purchase Confirmation");
            case "subscription_renewed":
                return translator.__("Subscription Renewed");
            case "payment_failed":
                return translator.__("Payment Failed");
            case "seats_reduced":
                return translator.__("Organization seats reduced");
            case "token_issue":
                return translator.__("Tokens Issued");  
            case "login":
                return translator.__("New Login");
            case "organization_request_approved":
                return translator.__("Organization request approved");
            case "organization_request_rejected":
                return translator.__("Organization request rejected");
            case "organization_request":
                return translator.__("Organization creation request");
            case "organization_deletion_request":
                return translator.__("Organization deletion request");
            case "organization_deletion_request_approved":
                return translator.__("Organization deletion request approved");
            case "organization_deletion_request_rejected":
                return translator.__("Organization deletion request rejected");
            case "organization_deleted":
                return translator.__("Organization deleted");
            case "organization_deletion_scheduled":
                return translator.__("Organization deletion scheduled");
            case "organization_member_invited":
                return translator.__("Organization invitation");
            case "organization_member_invitation_accepted":
                return translator.__("Invitation accepted");
            case "organization_member_invitation_rejected":
                return translator.__("Invitation rejected");
            case "organization_member_activated":
                return translator.__("Membership activated");
            case "organization_member_deactivated":
                return translator.__("Membership deactivated");
            case "organization_member_removed":
                return translator.__("Membership removed");
            case "organization_member_left":
                return translator.__("A member left the organization");
            case "custom_agent_request_created":
                return translator.__("Custom agent request received");
            case "custom_agent_request_accepted":
                return translator.__("Custom agent request accepted");
            case "custom_agent_request_rejected":
                return translator.__("Custom agent request rejected");
            case "custom_agent_request_cancelled":
                return translator.__("Custom agent request cancelled");
            case "custom_agent_request_delivered":
                return translator.__("Custom agent delivered");
            case "custom_agent_request_deposit_paid":
                return translator.__("Custom agent deposit paid");
            default:
                return translator.__("New notification");
        }
    }


    private getNotificationDescription(type: string, data: any, translator: Translator): string {
        const info = data?.info || {};

        switch (type) {
            case "purchase_confirmation":
                return translator.__("The purchase was successful. Purchase completed.");
            case "subscription_renewed":
                return translator.__("Your subscription has been renewed.");
            case "payment_failed":
                return translator.__("The payment failed. Please try again.");
            case "seats_reduced": {
                const revokedCount = Math.max(0, Math.floor(Number(info?.revokedCount || 0)));
                const maxSeats = Math.max(1, Math.floor(Number(info?.maxSeats || 1)));
                if (revokedCount > 0) {
                    return translator
                        .__("Organization seat count was reduced to {0}. {1} license assignment(s) were revoked.")
                        .replace("{0}", String(maxSeats))
                        .replace("{1}", String(revokedCount));
                }
                return translator
                    .__("Organization seat count was reduced to {0}.")
                    .replace("{0}", String(maxSeats));
            }
            case "token_issue":
                return translator.__("Tokens have been issued to your wallet.");
            case "login":
                return translator.__("You have successfully logged in.");
            case "organization_request_approved":
                return translator.__("Your organization request for {0} has been approved.").replace("{0}", info.companyName || "");
            case "organization_request_rejected":
                return translator.__("Your organization request for {0} has been rejected.").replace("{0}", info.companyName || "");
            case "organization_request": {
                const memberName = data?.memberName || info.memberName || "";
                const organizationName = data?.organizationName || info.organizationName || "";
                return translator
                    .__("{0} has requested the creation of organization {1}.")
                    .replace("{0}", memberName)
                    .replace("{1}", organizationName);
            }
            case "organization_deletion_request": {
                const memberName = data?.memberName || info.memberName || "";
                const organizationName = data?.organizationName || info.organizationName || "";
                return translator
                    .__("{0} has requested deletion of organization {1}.")
                    .replace("{0}", memberName)
                    .replace("{1}", organizationName);
            }
            case "organization_deletion_request_approved":
                return translator
                    .__("Your organization deletion request for {0} has been approved.")
                    .replace("{0}", data?.organizationName || info.organizationName || "");
            case "organization_deletion_request_rejected":
                return translator
                    .__("Your organization deletion request for {0} has been rejected.")
                    .replace("{0}", data?.organizationName || info.organizationName || "");
            case "organization_deleted":
                return translator
                    .__("Organization {0} has been deleted from the platform.")
                    .replace("{0}", data?.organizationName || info.organizationName || "");
            case "organization_deletion_scheduled":
                return translator
                    .__("Organization {0} will be deleted after the current billing period ends.")
                    .replace("{0}", data?.organizationName || info.organizationName || "");
            case "organization_member_invited":
                return translator.__("You have been invited to join {0} as {1}.").replace("{0}", info.organizationName || "").replace("{1}", info.role || "");
            case "organization_member_invitation_accepted":
                return translator.__("{0} has accepted the invitation to join {1}.").replace("{0}", info.memberName || "").replace("{1}", info.organizationName || "");
            case "organization_member_invitation_rejected":
                return translator.__("{0} has rejected the invitation to join {1}.").replace("{0}", info.memberName || "").replace("{1}", info.organizationName || "");
            case "organization_member_activated":
                return translator.__("Your membership in {0} has been activated.").replace("{0}", info.organizationName || "");
            case "organization_member_deactivated":
                return translator.__("Your membership in {0} has been deactivated.").replace("{0}", info.organizationName || "");
            case "organization_member_removed":
                return translator.__("You have been removed from {0}.").replace("{0}", info.organizationName || "");
            case "organization_member_left":
                return translator.__("{0} has left {1}.").replace("{0}", info.memberName || "A member").replace("{1}", info.organizationName || "the organization");
            case "custom_agent_request_created":
                return translator.__("A new custom agent request has been received.");
            case "custom_agent_request_accepted": {
                const depositPriceEur = typeof info.depositPriceEur === "number" ? info.depositPriceEur : null;
                const monthlyPriceEur = typeof info.monthlyPriceEur === "number" ? info.monthlyPriceEur : null;
                if (depositPriceEur !== null && monthlyPriceEur !== null) {
                    return translator
                        .__("Your custom agent request was accepted. Pay the {0} deposit to start development. After delivery, a monthly fee of {1} applies.")
                        .replace("{0}", this.formatEurAmount(depositPriceEur))
                        .replace("{1}", this.formatEurAmount(monthlyPriceEur));
                }
                return translator.__("Your custom agent request was accepted. Please pay the deposit to start development.");
            }
            case "custom_agent_request_rejected": {
                const reason = ((info.reason || "") + "").trim();
                if (reason) {
                    return translator.__("Your custom agent request was rejected: {0}").replace("{0}", reason);
                }
                return translator.__("Your custom agent request was rejected.");
            }
            case "custom_agent_request_cancelled":
                return translator.__("Your custom agent request was cancelled by the platform.");
            case "custom_agent_request_delivered": {
                const monthlyPriceEur = typeof info.monthlyPriceEur === "number" ? info.monthlyPriceEur : null;
                if (monthlyPriceEur !== null) {
                    return translator
                        .__("Your custom agent flow has been delivered. The monthly subscription of {0} is now active.")
                        .replace("{0}", this.formatEurAmount(monthlyPriceEur));
                }
                return translator.__("Your custom agent flow has been delivered to your workspace.");
            }
            case "custom_agent_request_deposit_paid":
                return translator.__("A custom agent deposit was paid. Development can start.");
            default:
                return translator.__("Please check the notification details in the platform for more information.");
        }
    }

    private formatEurAmount(amountEur: number): string {
        const amount = Number.isFinite(amountEur) ? amountEur : 0;
        try {
            return new Intl.NumberFormat("en-EN", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch {
            return "€" + amount.toFixed(2);
        }
    }

    public async sendNotification(user: User, data: NotificationData) {
        const notification = new Notifications({
            id: createRandomUID(),
            date: Date.now(),
            uid: user.id,
            read: false,
            notificationContent: this.encodeNotificationData(data),
        });

        await notification.insert();

        RedisService.getInstance().publishUser(user.id, {
            event: "notification",
            id: notification.id,
            uid: user.id,
            date: notification.date,
            read: false,
            notificationContent: this.encodeNotificationData(data),
        });

        try {
            if (user && user.email) {
                const decoded = data;
                const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(null, user);
                const title = this.getNotificationTitle(decoded.type, translator);
                const description = this.getNotificationDescription(decoded.type, decoded as any, translator);
                const url = Config.getInstance().getFrontendURI("/notifications");

                const subject = NotificationEmailView.getSubject(null, user, title);
                const textBody = NotificationEmailView.renderText(null, user, url, title, description);
                const htmlBody = NotificationEmailView.render(null, user, url, title, description);

                await MailService.getInstance().sendMail(
                    user.email,
                    subject,
                    textBody,
                    htmlBody
                );
            }
        } catch (ex) {
            if (ex instanceof Error) {
                Monitor.debugException(ex);
            } else {
                Monitor.debugException(new Error(String(ex)));
            }
        }
    }

    public async markAsRead(notificationId: string): Promise<void> {
        await Notifications.markAsRead(notificationId);
    }

    public async markAllAsReadForUser(userId: string): Promise<void> {
        await Notifications.markAllAsReadByUser(userId);
    }

    public async getUnreadCount(userId: string): Promise<number> {
        return await Notifications.countByUserUnread(userId);
    }

    public async updateInvitationNotificationStatus(
        userId: string,
        status: "accepted" | "rejected",
        notificationId: string,
    ): Promise<void> {
        const notif = await Notifications.finder.findByKey(notificationId).catch(() => null);
        if (!notif || notif.uid !== userId) return;

        const data = this.decodeNotificationData(notif.notificationContent);
        const updatedData = { ...(data as unknown as Record<string, unknown>), invitationResolved: status };
        notif.notificationContent = this.encodeNotificationData(updatedData as unknown as NotificationData);
        notif.read = true;
        await notif.save();
    }

    public async resolveInvitationNotificationsAfterAcceptance(
        userId: string,
        acceptedMembershipId: string,
        acceptedNotificationId: string,
    ): Promise<void> {
        const notifications = await Notifications.findAllNotificationUser(userId);

        for (const notification of notifications) {
            const data = this.decodeNotificationData(notification.notificationContent);
            if (data.type !== "organization_member_invited") {
                continue;
            }

            const notificationData = data as unknown as Record<string, unknown>;
            if (notificationData.invitationResolved) {
                continue;
            }

            const membershipId = ((notificationData.membershipId || "") + "").trim();
            const nextStatus =
                notification.id === acceptedNotificationId || membershipId === acceptedMembershipId
                    ? "accepted"
                    : "rejected";

            const updatedData = { ...notificationData, invitationResolved: nextStatus };
            notification.notificationContent = this.encodeNotificationData(updatedData as unknown as NotificationData);
            if (nextStatus === "accepted") {
                notification.read = true;
            }
            await notification.save();
        }
    }

    public async removeAllNotificationsExceptPendingInvitations(userId: string): Promise<number> {
        const all = await Notifications.findAllNotificationUser(userId);
        const pendingInviteIds: string[] = [];
        for (const n of all) {
            try {
                const data = this.decodeNotificationData(n.notificationContent);
                if (data.type === "organization_member_invited" && !(data as unknown as Record<string, unknown>)?.invitationResolved) {
                    if (n.id) pendingInviteIds.push(n.id);
                }
            } catch {
                // skip malformed notifications
            }
        }
        return Notifications.removeAllByUserExcept(userId, pendingInviteIds);
    }
}
