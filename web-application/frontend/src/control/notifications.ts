import { Request } from "@asanrom/request-browser";
import { ApiNotifications } from "@/api/api-group-notifications";
import { Timeouts } from "@/utils/timeout";
import { AppEvents } from "./app-events";
import { AuthController } from "./auth";

const UNREAD_COUNT_REQUEST_KEY = "notifications-unread-count";
const POLL_TIMEOUT_KEY = "notifications-unread-poll";
const POLL_INTERVAL_MS = 15000;

export class NotificationsController {
    public static Initialized = false;
    public static UnreadCount = 0;

    public static Initialize() {
        if (NotificationsController.Initialized) {
            return;
        }

        NotificationsController.Initialized = true;

        AppEvents.AddEventListener("auth-status-changed", NotificationsController.onAuthStatusChanged);
        document.addEventListener("visibilitychange", NotificationsController.onVisibilityChanged);
        window.addEventListener("focus", NotificationsController.onWindowFocus);

        NotificationsController.onAuthStatusChanged();
    }

    public static RefreshUnreadCount() {
        if (!AuthController.isAuthenticated()) {
            NotificationsController.StopPolling();
            NotificationsController.SetUnreadCount(0);
            return;
        }

        Request.Abort(UNREAD_COUNT_REQUEST_KEY);

        Request.Pending(UNREAD_COUNT_REQUEST_KEY, ApiNotifications.CountUnreadNotifications())
            .onSuccess((response) => {
                NotificationsController.SetUnreadCount(response.unreadCount || 0);
                NotificationsController.ScheduleNextPoll();
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    unauthorized: () => {
                        NotificationsController.StopPolling();
                        NotificationsController.SetUnreadCount(0);
                        AppEvents.Emit("unauthorized");
                    },
                    temporalError: () => null,
                });

                if (AuthController.isAuthenticated()) {
                    NotificationsController.ScheduleNextPoll();
                }
            })
            .onUnexpectedError((err) => {
                console.error(err);
                if (AuthController.isAuthenticated()) {
                    NotificationsController.ScheduleNextPoll();
                }
            });
    }

    public static SetUnreadCount(count: number) {
        const normalizedCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

        if (NotificationsController.UnreadCount === normalizedCount) {
            return;
        }

        NotificationsController.UnreadCount = normalizedCount;
        AppEvents.Emit("notifications-unread-count-changed", normalizedCount);
    }

    public static StopPolling() {
        Timeouts.Abort(POLL_TIMEOUT_KEY);
        Request.Abort(UNREAD_COUNT_REQUEST_KEY);
    }

    private static ScheduleNextPoll() {
        if (!AuthController.isAuthenticated()) {
            NotificationsController.StopPolling();
            return;
        }

        Timeouts.Set(POLL_TIMEOUT_KEY, POLL_INTERVAL_MS, () => {
            if (document.visibilityState === "hidden") {
                NotificationsController.ScheduleNextPoll();
                return;
            }

            NotificationsController.RefreshUnreadCount();
        });
    }

    private static onAuthStatusChanged = () => {
        if (!AuthController.isAuthenticated()) {
            NotificationsController.StopPolling();
            NotificationsController.SetUnreadCount(0);
            return;
        }

        NotificationsController.RefreshUnreadCount();
    };

    private static onVisibilityChanged = () => {
        if (document.visibilityState === "visible" && AuthController.isAuthenticated()) {
            NotificationsController.RefreshUnreadCount();
        }
    };

    private static onWindowFocus = () => {
        if (AuthController.isAuthenticated()) {
            NotificationsController.RefreshUnreadCount();
        }
    };
}
