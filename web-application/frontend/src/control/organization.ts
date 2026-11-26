import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type { OrgItem } from "@/api/definitions";
import { AppEvents } from "./app-events";
import { AuthController } from "./auth";

const CONTEXT_REQUEST_KEY = "organization-context";

export class OrganizationController {
    public static Initialized = false;
    public static Loading = false;
    public static Loaded = false;
    public static MyOrganization: OrgItem | null = null;
    private static RefreshPromise: Promise<void> | null = null;
    private static RefreshToken = 0;

    public static Initialize(): void {
        if (OrganizationController.Initialized) {
            return;
        }

        OrganizationController.Initialized = true;
        AppEvents.AddEventListener("auth-status-changed", OrganizationController.onAuthStatusChanged);
        document.addEventListener("visibilitychange", OrganizationController.onVisibilityChanged);
        window.addEventListener("focus", OrganizationController.onWindowFocus);
        OrganizationController.onAuthStatusChanged();
    }

    public static hasOrganization(): boolean {
        return !!OrganizationController.MyOrganization?.id;
    }

    public static isOrganizationAdmin(): boolean {
        const org = OrganizationController.MyOrganization;
        if (!org?.id) {
            return false;
        }
        if (typeof org.currentUserIsOrganizationAdmin === "boolean") {
            return org.currentUserIsOrganizationAdmin;
        }
        return org.adminUid === AuthController.UID;
    }

    /** True when the given user is the organization creator (`adminUid`). */
    public static isOrganizationCreator(userId: string): boolean {
        const org = OrganizationController.MyOrganization;
        const creatorUid = ((org?.adminUid || "") + "").trim();
        const targetUid = ((userId || "") + "").trim();
        return !!creatorUid && creatorUid === targetUid;
    }

    public static ensureReady(): Promise<void> {
        if (!AuthController.isAuthenticated()) {
            return Promise.resolve();
        }
        if (OrganizationController.Loaded && !OrganizationController.Loading) {
            return Promise.resolve();
        }
        return OrganizationController.Refresh();
    }

    public static Refresh(): Promise<void> {
        if (!AuthController.isAuthenticated()) {
            OrganizationController.clear();
            return Promise.resolve();
        }

        if (OrganizationController.Loading && OrganizationController.RefreshPromise) {
            return OrganizationController.RefreshPromise;
        }

        OrganizationController.Loading = true;
        const refreshToken = ++OrganizationController.RefreshToken;

        const refreshPromise = new Promise<void>((resolve) => {
            Request.Abort(CONTEXT_REQUEST_KEY);

            Request.Pending(CONTEXT_REQUEST_KEY, ApiOrganizations.GetMyOrganization())
                .onSuccess((org) => {
                    if (OrganizationController.isCurrentRefresh(refreshToken)) {
                        OrganizationController.applyOrganization(org);
                    }
                    resolve();
                })
                .onCancel(() => {
                    if (OrganizationController.isCurrentRefresh(refreshToken)) {
                        OrganizationController.Loading = false;
                    }
                    resolve();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            if (OrganizationController.isCurrentRefresh(refreshToken)) {
                                OrganizationController.clear();
                                AppEvents.Emit("unauthorized");
                            }
                            resolve();
                        },
                        notFoundOrganizationNotFound: () => {
                            if (OrganizationController.isCurrentRefresh(refreshToken)) {
                                OrganizationController.applyOrganization(null);
                            }
                            resolve();
                        },
                        notFound: () => {
                            if (OrganizationController.isCurrentRefresh(refreshToken)) {
                                OrganizationController.applyOrganization(null);
                            }
                            resolve();
                        },
                        temporalError: () => {
                            if (OrganizationController.isCurrentRefresh(refreshToken)) {
                                OrganizationController.Loading = false;
                            }
                            resolve();
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    if (OrganizationController.isCurrentRefresh(refreshToken)) {
                        OrganizationController.Loading = false;
                    }
                    resolve();
                });
        });

        OrganizationController.RefreshPromise = refreshPromise;
        void refreshPromise.finally(() => {
            if (OrganizationController.RefreshPromise === refreshPromise) {
                OrganizationController.RefreshPromise = null;
            }
        });

        return refreshPromise;
    }

    private static isCurrentRefresh(refreshToken: number): boolean {
        return refreshToken === OrganizationController.RefreshToken;
    }

    private static applyOrganization(org: OrgItem | null): void {
        const previousId = OrganizationController.MyOrganization?.id || "";
        const nextId = org?.id || "";
        const previousAdmin = OrganizationController.isOrganizationAdmin();

        OrganizationController.MyOrganization = org;
        OrganizationController.Loading = false;
        OrganizationController.Loaded = true;

        const nextAdmin = OrganizationController.isOrganizationAdmin();
        if (previousId !== nextId || previousAdmin !== nextAdmin) {
            AppEvents.Emit("organization-context-changed");
        }
    }

    private static clear(): void {
        const hadOrganization = OrganizationController.hasOrganization();
        OrganizationController.RefreshToken += 1;
        OrganizationController.RefreshPromise = null;
        OrganizationController.Loading = false;
        OrganizationController.Loaded = false;
        OrganizationController.MyOrganization = null;
        Request.Abort(CONTEXT_REQUEST_KEY);

        if (hadOrganization) {
            AppEvents.Emit("organization-context-changed");
        }
    }

    private static onAuthStatusChanged = (): void => {
        if (!AuthController.isAuthenticated()) {
            OrganizationController.clear();
            return;
        }

        void OrganizationController.Refresh();
    };

    private static onVisibilityChanged = (): void => {
        if (document.visibilityState === "visible" && AuthController.isAuthenticated()) {
            void OrganizationController.Refresh();
        }
    };

    private static onWindowFocus = (): void => {
        if (AuthController.isAuthenticated()) {
            void OrganizationController.Refresh();
        }
    };
}
