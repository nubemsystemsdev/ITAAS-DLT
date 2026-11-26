// API bindings: notifications (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl, generateURIQuery } from "./utils";
import { NotificationList, NotificationCountResponse, UnreadNotificationCountResponse } from "./definitions";

export class ApiNotifications {
    /**
     * Method: GET
     * Path: /notifications
     * Lists notifications
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListNotifications(queryParams: ListNotificationsQueryParameters): RequestParams<NotificationList, ListNotificationsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/notifications` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_OFFSET", handler.badRequestInvalidOffset)
                    .add(400, "INVALID_LIMIT", handler.badRequestInvalidLimit)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /notifications
     * Deletes all notifications
     * @returns The request parameters
     */
    public static DeleteAllNotifications(): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/notifications`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /notifications-count
     * Count notifications
     * @returns The request parameters
     */
    public static CountNotifications(): RequestParams<NotificationCountResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/notifications-count`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /notifications-unread-count
     * Count unread notifications
     * @returns The request parameters
     */
    public static CountUnreadNotifications(): RequestParams<UnreadNotificationCountResponse, CommonAuthenticatedErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/notifications-unread-count`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /notifications/{id}
     * Deletes notification
     * @param id Notification ID
     * @returns The request parameters
     */
    public static DeleteNotification(id: string): RequestParams<void, DeleteNotificationErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/notifications/${encodeURIComponent(id)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "NOTIFICATION_NOT_FOUND", handler.notFoundNotificationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /notifications/{id}/read
     * Mark notification as read
     * @param id Notification ID
     * @returns The request parameters
     */
    public static MarkNotificationAsRead(id: string): RequestParams<void, MarkNotificationAsReadErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/notifications/${encodeURIComponent(id)}/read`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "NOTIFICATION_NOT_FOUND", handler.notFoundNotificationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /notifications/mark-all-read
     * Mark all notifications as read
     * @returns The request parameters
     */
    public static MarkAllNotificationsAsRead(): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/notifications/mark-all-read`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for ListNotifications
 */
export type ListNotificationsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_LIMIT
     */
    badRequestInvalidLimit: () => void;

    /**
     * Handler for status = 400 and code = INVALID_OFFSET
     */
    badRequestInvalidOffset: () => void;
};

/**
 * Query parameters for ListNotifications
 */
export interface ListNotificationsQueryParameters {
    /**
     * Page number for pagination (default: 1)
     */
    page?: number;

    /**
     * Items per page (default: 25, max: 100)
     */
    pageSize?: number;
}

/**
 * Error handler for DeleteNotification
 */
export type DeleteNotificationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = NOTIFICATION_NOT_FOUND
     */
    notFoundNotificationNotFound: () => void;
};

/**
 * Error handler for MarkNotificationAsRead
 */
export type MarkNotificationAsReadErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = NOTIFICATION_NOT_FOUND
     */
    notFoundNotificationNotFound: () => void;
};

