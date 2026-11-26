"use strict";

import { Notifications } from "../../models/notifications";
import { NotificationService } from "../../services/notification-service";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, noCache, NOT_FOUND, sendApiSuccess, FORBIDDEN, sendApiError, sendUnauthorized } from "../../utils/http-utils";
import { parsePageParameters } from "../../utils/api-utils";
import { Controller } from "../controller";
import Express from "express";

const NOTIFICATIONS_LIST_PAGE_LENGTH = 25;

/**
 * Notifications API
 * @group notifications
 */
export class NotificationsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/notifications", noCache(this.listNotifications.bind(this)));
        application.get(prefix + "/notifications-count", noCache(this.countNotifications.bind(this)));
        application.get(prefix + "/notifications-unread-count", noCache(this.countUnreadNotifications.bind(this)));
        application.post(prefix + "/notifications/:id/read", ensureObjectBody(this.markNotificationAsRead.bind(this)));
        application.post(prefix + "/notifications/mark-all-read", ensureObjectBody(this.markAllNotificationsAsRead.bind(this)));
        application.delete(prefix + "/notifications/:id", ensureObjectBody(this.deleteNotification.bind(this)));
        application.delete(prefix + "/notifications", ensureObjectBody(this.deleteAllNotifications.bind(this)));
    }

    /**
     * Notification data content structure
     * @typedef NotificationData
     * @property {string} type - The notification type identifier (e.g., "purchase_confirmation", "login")
     * @property {string} info - Metadata and additional information specific to the notification type
     */

    /**
     * @typedef Notification
     * @property {string} id - Notification ID
     * @property {number} date - Notification timestamp (Unix Milliseconds)
     * @property {boolean} read - Whether notification has been read
     * @property {NotificationData.model} notificationContent - Notification data
     */
    
    /**
     * @typedef NotificationCountResponse
     * @property {number} notificationsCount.required - Total notifications count
     */

    /**
     * @typedef UnreadNotificationCountResponse
     * @property {number} unreadCount.required - Unread notifications count
     */

    /**
     * @typedef NotificationList
     * @property {Array.<Notification>} notifications.required - List of notifications
     * @property {number} total.required - Total number of notifications
     * @property {number} totalPages.required - Total number of pages
     * @property {number} page.required - Current page number
     * @property {number} pageSize.required - Items per page
     */

    /**
     * Notification data for purchase confirmation info
     * @typedef NotificationData_Purchase_Confirmation_Info
     * @property {string} productName.required - Product name
     * @property {string} currency.required - Currency
     * @property {number} amount.required - Amount
     */

    /**
     * Notification data for purchase confirmation
     * @typedef NotificationData_Purchase_Confirmation
     * @property {string} type - "purchase_confirmation"
     * @property {string} ordenId - Order ID
     * @property {NotificationData_Purchase_Confirmation_Info} info - Additional info
     */

    /**
     * Notification data for subscription renewed info
     * @typedef NotificationData_Subscription_Renewed_Info
     * @property {string} planName - Plan name
     * @property {string} nextRenewalDate - Next renewal date
     */

    /**
     * Notification data for subscription renewed
     * @typedef NotificationData_Subscription_Renewed
     * @property {string} type - "subscription_renewed"
     * @property {string} subscriptionId - Subscription ID
     * @property {NotificationData_Subscription_Renewed_Info} info - Additional info
     */

    /**
     * Notification data for payment failed info
     * @typedef NotificationData_Payment_Failed_Info
     * @property {string} reason.required - Reason for failure
     * @property {string} retryUrl.required - Retry URL
     */

    /**
     * Notification data for payment failed
     * @typedef NotificationData_Payment_Failed
     * @property {string} type - "payment_failed"
     * @property {string} transactionId - Transaction ID
     * @property {NotificationData_Payment_Failed_Info} info - Additional info
     */

    /**
     * Notification data for organization seats reduced info
     * @typedef NotificationData_Seats_Reduced_Info
     * @property {number} revokedCount.required - Number of license assignments revoked
     * @property {number} maxSeats.required - New seat limit after reduction
     */

    /**
     * Notification data for organization seats reduced
     * @typedef NotificationData_Seats_Reduced
     * @property {string} type - "seats_reduced"
     * @property {string} subscriptionId - Subscription ID
     * @property {NotificationData_Seats_Reduced_Info} info - Additional info
     */

    /**
     * Notification data for token issue info
     * @typedef NotificationData_Token_Issue_Info
     * @property {number} amount.required - Amount
     * @property {string} walletAddress.required - Wallet address
     */

    /**
     * Notification data for token issue
     * @typedef NotificationData_Token_Issue
     * @property {string} type - "token_issue"
     * @property {NotificationData_Token_Issue_Info} info - Additional info
     */

    /**
     * Notification data for login info
     * @typedef NotificationData_Login_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for login
     * @typedef NotificationData_Login
     * @property {string} type - "login"
     * @property {NotificationData_Login_Info} info - Additional info
     */

    /**
     * Notification data for organization request approved info
     * @typedef NotificationData_Organization_Request_Approved_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization request approved
     * @typedef NotificationData_Organization_Request_Approved
     * @property {string} type - "organization_request_approved"
     * @property {string} companyName - Company name
     * @property {NotificationData_Organization_Request_Approved_Info} info - Additional info
     */

    /**
     * Notification data for organization request rejected info
     * @typedef NotificationData_Organization_Request_Rejected_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization request rejected
     * @typedef NotificationData_Organization_Request_Rejected
     * @property {string} type - "organization_request_rejected"
     * @property {string} companyName - Company name
     * @property {NotificationData_Organization_Request_Rejected_Info} info - Additional info
     */

    /**
     * Notification data for organization member invited info
     * @typedef NotificationData_Organization_Member_Invited_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member invited
     * @typedef NotificationData_Organization_Member_Invited
     * @property {string} type - "organization_member_invited"
 * @property {string} organizationName - Organization name
 * @property {string} role - Role
 * @property {string} membershipId - Membership ID for accept/reject actions
 * @property {NotificationData_Organization_Member_Invited_Info} info - Additional info
     */

    /**
     * Notification data for organization member invitation accepted info
     * @typedef NotificationData_Organization_Member_Invitation_Accepted_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member invitation accepted
     * @typedef NotificationData_Organization_Member_Invitation_Accepted
     * @property {string} type - "organization_member_invitation_accepted"
     * @property {string} organizationName - Organization name
     * @property {string} memberName - Member name
     * @property {NotificationData_Organization_Member_Invitation_Accepted_Info} info - Additional info
     */

    /**
     * Notification data for organization member invitation rejected info
     * @typedef NotificationData_Organization_Member_Invitation_Rejected_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member invitation rejected
     * @typedef NotificationData_Organization_Member_Invitation_Rejected
     * @property {string} type - "organization_member_invitation_rejected"
     * @property {string} organizationName - Organization name
     * @property {string} memberName - Member name
     * @property {NotificationData_Organization_Member_Invitation_Rejected_Info} info - Additional info
     */

    /**
     * Notification data for organization member activated info
     * @typedef NotificationData_Organization_Member_Activated_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member activated
     * @typedef NotificationData_Organization_Member_Activated
     * @property {string} type - "organization_member_activated"
     * @property {string} organizationName - Organization name
     * @property {NotificationData_Organization_Member_Activated_Info} info - Additional info
     */

    /**
     * Notification data for organization member deactivated info
     * @typedef NotificationData_Organization_Member_Deactivated_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member deactivated
     * @typedef NotificationData_Organization_Member_Deactivated
     * @property {string} type - "organization_member_deactivated"
     * @property {string} organizationName - Organization name
     * @property {NotificationData_Organization_Member_Deactivated_Info} info - Additional info
     */

    /**
     * Notification data for organization member removed info
     * @typedef NotificationData_Organization_Member_Removed_Info
     * @property {string} message.required - Message
     */

    /**
     * Notification data for organization member removed
     * @typedef NotificationData_Organization_Member_Removed
     * @property {string} type - "organization_member_removed"
     * @property {string} organizationName - Organization name
     * @property {NotificationData_Organization_Member_Removed_Info} info - Additional info
     */

    /**
     * Notification data for unknown
     * @typedef NotificationData_Unknown
     * @property {string} type - "unknown"
     */

    /**
     * Lists notifications
     * Binding: ListNotifications
     * @route GET /notifications
     * @group notifications
     * @param {number} page.query - Page number for pagination (default: 1)
     * @param {number} pageSize.query - Items per page (default: 25, max: 100)
     * @returns {NotificationList.model} 200 - List of notifications
     * @returns {void} 400 - Bad request: INVALID_LIMIT, INVALID_OFFSET
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async listNotifications(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;
        const maxPageSize = 100;
        const parsedPageSize = parseInt(((request.query.pageSize ?? request.query.limit) || NOTIFICATIONS_LIST_PAGE_LENGTH.toString()) + "", 10) || NOTIFICATIONS_LIST_PAGE_LENGTH;
        if (parsedPageSize < 1) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_LIMIT");
            return;
        }

        request.query.pageSize = Math.min(parsedPageSize, maxPageSize).toString();

        if (!request.query.page && typeof request.query.offset !== "undefined") {
            const legacyOffset = parseInt((request.query.offset || "0") + "", 10) || 0;
            if (legacyOffset < 0) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_OFFSET");
                return;
            }

            const effectivePageSize = Math.min(parsedPageSize, maxPageSize);
            request.query.page = (Math.floor(legacyOffset / effectivePageSize) + 1).toString();
        }

        const totalCount = await Notifications.countByUser(user.id);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, totalCount, maxPageSize);

        const items = await Notifications.findAllPaginatedNotificationUserWithOffset(user.id, skip, pageSize);
        const notifications = items.map((item) => {
            return {
                id: item.id,
                date: item.date,
                read: item.read,
                notificationContent: NotificationService.getInstance().decodeNotificationData(item.notificationContent),
            };
        });

        response.json({
            notifications,
            total: totalCount,
            totalPages,
            page,
            pageSize,
        });
    }

    /**
     * Count notifications
     * Binding: CountNotifications
     * @route GET /notifications-count
     * @group notifications
     * @returns {NotificationCountResponse.model} 200 - Total notifications count
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async countNotifications(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const itemsCount = await Notifications.countByUser(user.id);

        response.json({
            notificationsCount: itemsCount,
        });
    }

    /**
     * Count unread notifications
     * Binding: CountUnreadNotifications
     * @route GET /notifications-unread-count
     * @group notifications
     * @returns {UnreadNotificationCountResponse.model} 200 - Unread notifications count
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async countUnreadNotifications(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;
        const unreadCount = await Notifications.countByUserUnread(user.id);

        response.json({
            unreadCount: unreadCount,
        });
    }

    /**
     * Deletes notification
     * Binding: DeleteNotification
     * @route DELETE /notifications/{id}
     * @group notifications
     * @param {string} id.path.required - Notification ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: NOTIFICATION_NOT_FOUND
     * @security AuthToken
     */
    public async deleteNotification(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const notification = await Notifications.finder.findByKey(request.params.id);

        if (!notification) {
            sendApiError(request, response, NOT_FOUND, "NOTIFICATION_NOT_FOUND");
            return;
        }

        if (notification.uid !== auth.user.id) {
            sendApiError(request, response, FORBIDDEN, "NOT_YOUR_NOTIFICATION");
            return;
        }

        await notification.delete();

        sendApiSuccess(request, response);
    }

    /**
     * Deletes all notifications
     * Binding: DeleteAllNotifications
     * @route DELETE /notifications
     * @group notifications
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async deleteAllNotifications(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        const user = auth.user;

        await NotificationService.getInstance().removeAllNotificationsExceptPendingInvitations(user.id);

        sendApiSuccess(request, response);
    }

    /**
     * Mark notification as read
     * Binding: MarkNotificationAsRead
     * @route POST /notifications/{id}/read
     * @group notifications
     * @param {string} id.path.required - Notification ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: NOTIFICATION_NOT_FOUND
     * @security AuthToken
     */
    public async markNotificationAsRead(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const notification = await Notifications.finder.findByKey(request.params.id);

        if (!notification || notification.uid !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "NOTIFICATION_NOT_FOUND");
            return;
        }

        notification.read = true;
        await notification.save();

        sendApiSuccess(request, response);
    }

    /**
     * Mark all notifications as read
     * Binding: MarkAllNotificationsAsRead
     * @route POST /notifications/mark-all-read
     * @group notifications
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async markAllNotificationsAsRead(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;
        await Notifications.markAllAsReadByUser(user.id);

        sendApiSuccess(request, response);
    }

}
