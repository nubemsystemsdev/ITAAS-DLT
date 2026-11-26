<template>
    <div class="page-content notifications-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Activity center')"
            :title="$t('Notifications')"
            :subtitle="$t('Review transactional alerts, account activity and organization updates in one place.')"
        />

        <section class="notifications-card">
            <div class="notifications-toolbar">
                <div class="notifications-toolbar-actions">
                    <button
                        type="button"
                        class="btn btn-tertiary btn-sm"
                        :aria-label="$t('Mark all as read')"
                        :title="$t('Mark all as read')"
                        :disabled="toolbarAction !== '' || unreadCount === 0"
                        @click="markAllAsRead"
                    >
                        <i
                            :class="
                                toolbarAction === 'mark-all-read' ? 'fas fa-spinner fa-spin no-margin' : 'fas fa-check-double no-margin'
                            "
                            aria-hidden="true"
                        ></i>
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        :aria-label="$t('Delete all')"
                        :title="$t('Delete all')"
                        :disabled="toolbarAction !== '' || totalNotifications === 0"
                        @click="askDeleteAllNotifications"
                    >
                        <i
                            :class="toolbarAction === 'delete-all' ? 'fas fa-spinner fa-spin no-margin' : 'fas fa-trash-alt no-margin'"
                            aria-hidden="true"
                        ></i>
                    </button>
                </div>
            </div>

            <div v-if="loading" class="notifications-state">{{ $t("Loading notifications") }}...</div>

            <div v-else-if="notifications.length === 0" class="notifications-empty">
                <div class="notifications-empty-icon">
                    <i class="fas fa-bell-slash"></i>
                </div>
                <h2 class="notifications-empty-title">{{ $t("No notifications yet") }}</h2>
                <p class="notifications-empty-copy">
                    {{ $t("When there is relevant activity in your account, it will appear here automatically.") }}
                </p>
            </div>

            <div v-else class="notifications-list">
                <article
                    v-for="notification in notifications"
                    :key="notification.id || String(notification.date || '')"
                    class="notification-item"
                    :class="{
                        unread: !notification.read,
                        'notification-item--clickable': hasNotificationRoute(notification),
                    }"
                >
                    <div
                        class="notification-body"
                        :role="hasNotificationRoute(notification) ? 'button' : undefined"
                        :tabindex="hasNotificationRoute(notification) ? 0 : undefined"
                        @click="onNotificationClick(notification)"
                        @keydown.enter="onNotificationClick(notification)"
                        @keydown.space.prevent="onNotificationClick(notification)"
                    >
                        <div class="notification-topline">
                            <div class="notification-icon" :class="notificationToneClass(notification)">
                                <i :class="notificationIcon(notification)"></i>
                            </div>
                            <p class="notification-title">{{ notificationTitle(notification) }}</p>
                        </div>

                        <p class="notification-message">{{ notificationMessage(notification) }}</p>
                        <p class="notification-date">{{ renderNotificationDate(notification.date || 0) }}</p>
                    </div>

                    <div class="notification-actions" @click.stop>
                        <div v-if="isOrganizationInvitation(notification)" class="notification-invitation-actions">
                            <template v-if="hasInvitationMembershipId(notification) && !processedInvitations[notification.id || '']">
                                <button
                                    type="button"
                                    class="btn btn-primary btn-sm"
                                    :aria-label="$t('Accept invitation')"
                                    :title="$t('Accept invitation')"
                                    :disabled="isNotificationBusy(notification.id || '')"
                                    @click="acceptInvitation(notification)"
                                >
                                    <i
                                        :class="
                                            isNotificationActionLoading(notification.id || '', 'accept')
                                                ? 'fas fa-spinner fa-spin no-margin'
                                                : 'fas fa-check no-margin'
                                        "
                                        aria-hidden="true"
                                    ></i>
                                    <span>{{ $t("Accept") }}</span>
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-tertiary btn-sm"
                                    :aria-label="$t('Reject invitation')"
                                    :title="$t('Reject invitation')"
                                    :disabled="isNotificationBusy(notification.id || '')"
                                    @click="rejectInvitation(notification)"
                                >
                                    <i
                                        :class="
                                            isNotificationActionLoading(notification.id || '', 'reject')
                                                ? 'fas fa-spinner fa-spin no-margin'
                                                : 'fas fa-times no-margin'
                                        "
                                        aria-hidden="true"
                                    ></i>
                                    <span>{{ $t("Reject") }}</span>
                                </button>
                            </template>
                        </div>

                        <button
                            v-if="notification.id && !notification.read && !isOrganizationInvitation(notification)"
                            type="button"
                            class="btn btn-tertiary btn-sm"
                            :aria-label="$t('Mark as read')"
                            :title="$t('Mark as read')"
                            :disabled="isNotificationBusy(notification.id || '')"
                            @click="markAsRead(notification)"
                        >
                            <i
                                :class="
                                    isNotificationActionLoading(notification.id || '', 'read')
                                        ? 'fas fa-spinner fa-spin no-margin'
                                        : 'fas fa-check no-margin'
                                "
                                aria-hidden="true"
                            ></i>
                        </button>

                        <button
                            v-if="notification.id && !isUnresolvedInvitation(notification)"
                            type="button"
                            class="btn btn-danger btn-sm"
                            :aria-label="$t('Delete notification')"
                            :title="$t('Delete notification')"
                            :disabled="isNotificationBusy(notification.id || '')"
                            @click="askDeleteNotification(notification)"
                        >
                            <i
                                :class="
                                    isNotificationActionLoading(notification.id || '', 'delete')
                                        ? 'fas fa-spinner fa-spin no-margin'
                                        : 'fas fa-trash-alt no-margin'
                                "
                                aria-hidden="true"
                            ></i>
                        </button>
                    </div>
                </article>
            </div>

            <PaginationBar
                :page="currentPage"
                :total-pages="totalPages"
                :can-go-prev="paginationCanGoPrev"
                :can-go-next="paginationCanGoNext"
                :visible="!loading && paginationVisible"
                :aria-label="$t('Notifications pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>
    </div>
</template>

<script lang="ts">
import { ApiNotifications } from "@/api/api-group-notifications";
import { ApiOrganizations } from "@/api/api-group-organizations";
import { Notification as ApiNotification } from "@/api/definitions";
import { OrganizationController } from "@/control/organization";
import { NotificationsController } from "@/control/notifications";
import { getInfoField, getNumberField, parseNotificationInfo } from "@/utils/notification-info";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { getNotificationRoute, hasNotificationRoute as resolveHasNotificationRoute } from "@/utils/notification-route";
import { routeTo } from "@/utils/route-to";
import { renderDateAndTime } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import { usePagination } from "@/composables/usePagination";

export default defineComponent({
    name: "NotificationsPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
    },
    setup: function () {
        const loading = ref(false);
        const pagination = usePagination({ loading });

        return {
            loading,
            loadRequestId: getUniqueStringId(),
            markReadRequestId: getUniqueStringId(),
            deleteRequestId: getUniqueStringId(),
            markAllReadRequestId: getUniqueStringId(),
            deleteAllRequestId: getUniqueStringId(),
            acceptInvitationRequestId: getUniqueStringId(),
            rejectInvitationRequestId: getUniqueStringId(),
            pageSize: pagination.pageSize,
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
            paginationSetPage: pagination.setPage,
        };
    },
    data: function () {
        return {
            notifications: [] as ApiNotification[],
            unreadCount: 0,
            knownUnreadCount: NotificationsController.UnreadCount,
            totalNotifications: 0,
            busyNotificationId: "",
            toolbarAction: "",
            processedInvitations: {} as Record<string, "accepted" | "rejected">,
        };
    },
    methods: {
        load: function (page?: number) {
            if (typeof page === "number") {
                this.paginationSetPage(page);
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;

            Request.Pending(
                this.loadRequestId,
                ApiNotifications.ListNotifications({
                    page: this.currentPage,
                    pageSize: this.pageSize,
                }),
            )
                .onSuccess((response) => {
                    this.notifications = response.notifications || [];
                    this.processedInvitations = {};
                    for (const notif of this.notifications) {
                        if (notif.id) {
                            const content = notif.notificationContent as Record<string, unknown>;
                            const resolved = content?.invitationResolved as string | undefined;
                            if (resolved === "accepted" || resolved === "rejected") {
                                this.processedInvitations[notif.id] = resolved;
                            }
                        }
                    }
                    this.unreadCount = this.notifications.filter((notification) => !notification.read).length;
                    this.knownUnreadCount = Math.max(NotificationsController.UnreadCount, this.unreadCount);
                    this.totalNotifications = response.total || 0;
                    this.paginationApplyListMeta({ page: response.page, totalPages: response.totalPages });
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to load notifications."));
                        },
                        badRequestInvalidOffset: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("The selected page is not valid."));
                        },
                        badRequestInvalidLimit: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("The page size is not valid."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load notifications. Please try again."));
                        },
                    });

                    this.notifications = [];
                    this.totalNotifications = 0;
                    this.paginationReset();
                    this.loading = false;
                })
                .onUnexpectedError(() => {
                    this.notifications = [];
                    this.totalNotifications = 0;
                    this.paginationReset();
                    this.loading = false;
                });
        },
        onPaginationPrev: function () {
            if (this.paginationGoPrev()) {
                this.load();
            }
        },
        onPaginationNext: function () {
            if (this.paginationGoNext()) {
                this.load();
            }
        },
        notificationTitle: function (notification: ApiNotification): string {
            const type = (notification.notificationContent?.type || "").toLowerCase();

            switch (type) {
                case "purchase_confirmation":
                    return this.$t("Purchase confirmed");
                case "subscription_renewed":
                    return this.$t("Subscription renewed");
                case "payment_failed":
                    return this.$t("Payment failed");
                case "seats_reduced":
                    return this.$t("Organization seats reduced");
                case "token_issue":
                    return this.$t("Tokens issued");
                case "login":
                    return this.$t("New sign in");
                case "organization_request":
                    return this.$t("Organization creation request");
                case "organization_deletion_request":
                    return this.$t("Organization deletion request");
                case "organization_deletion_request_approved":
                    return this.$t("Organization deletion request approved");
                case "organization_deletion_request_rejected":
                    return this.$t("Organization deletion request rejected");
                case "organization_deletion_scheduled":
                    return this.$t("Organization deletion scheduled");
                case "organization_deleted":
                    return this.$t("Organization deleted");
                case "organization_request_approved":
                    return this.$t("Organization request approved");
                case "organization_request_rejected":
                    return this.$t("Organization request rejected");
                case "organization_member_invited": {
                    const invitationResolved = this.processedInvitations[notification.id || ""];
                    if (invitationResolved === "accepted") return this.$t("Organization invitation accepted");
                    if (invitationResolved === "rejected") return this.$t("Organization invitation rejected");
                    return this.$t("Organization invitation");
                }
                case "organization_member_invitation_accepted":
                    return this.$t("Invitation accepted");
                case "organization_member_invitation_rejected":
                    return this.$t("Invitation rejected");
                case "organization_member_activated":
                    return this.$t("Member activated");
                case "organization_member_deactivated":
                    return this.$t("Member deactivated");
                case "organization_member_removed":
                    return this.$t("Member removed");
                case "organization_member_left":
                    return this.$t("A member left the organization");
                case "custom_agent_request_created":
                    return this.$t("Custom agent request received");
                case "custom_agent_request_accepted":
                    return this.$t("Custom agent request accepted");
                case "custom_agent_request_rejected":
                    return this.$t("Custom agent request rejected");
                case "custom_agent_request_cancelled":
                    return this.$t("Custom agent request cancelled");
                case "custom_agent_request_delivered":
                    return this.$t("Custom agent delivered");
                case "custom_agent_request_deposit_paid":
                    return this.$t("Custom agent deposit paid");
                default:
                    return this.$t("Notification");
            }
        },
        notificationMessage: function (notification: ApiNotification): string {
            const type = (notification.notificationContent?.type || "").toLowerCase();
            const info = parseNotificationInfo(notification.notificationContent?.info);

            if (typeof info === "string") {
                return this.$t(info);
            }

            if (type === "custom_agent_request_created") {
                return this.$t("A new custom agent request has been received.");
            }

            if (type === "custom_agent_request_rejected") {
                const reason = getInfoField(info, "reason");
                if (reason) {
                    return this.$t("Your custom agent request was rejected: {0}").replace("{0}", reason);
                }
            }

            if (type === "custom_agent_request_accepted") {
                const depositPriceEur = getNumberField(info, "depositPriceEur");
                const monthlyPriceEur = getNumberField(info, "monthlyPriceEur");
                if (depositPriceEur !== null && monthlyPriceEur !== null) {
                    return this.$t(
                        "Your custom agent request was accepted. Pay the {0} deposit to start development. After delivery, a monthly fee of {1} applies.",
                    )
                        .replace("{0}", formatMoneyFromCents(Math.round(depositPriceEur * 100), "EUR"))
                        .replace("{1}", formatMoneyFromCents(Math.round(monthlyPriceEur * 100), "EUR"));
                }
                return this.$t("Your custom agent request was accepted. Please pay the deposit to start development.");
            }

            if (type === "custom_agent_request_delivered") {
                const monthlyPriceEur = getNumberField(info, "monthlyPriceEur");
                if (monthlyPriceEur !== null) {
                    return this.$t("Your custom agent flow has been delivered. The monthly subscription of {0} is now active.").replace(
                        "{0}",
                        formatMoneyFromCents(Math.round(monthlyPriceEur * 100), "EUR"),
                    );
                }
                return this.$t("Your custom agent flow has been delivered to your workspace.");
            }

            if (type === "organization_request") {
                const notifContent = notification.notificationContent as Record<string, unknown> | undefined;
                const orgName = typeof notifContent?.organizationName === "string" ? notifContent.organizationName : "";
                const memberName = typeof notifContent?.memberName === "string" ? notifContent.memberName : "";

                if (memberName && orgName) {
                    return this.$t("{0} has requested the creation of organization {1}.")
                        .replace("{0}", memberName)
                        .replace("{1}", orgName);
                }
            }

            if (type === "organization_deletion_request") {
                const notifContent = notification.notificationContent as Record<string, unknown> | undefined;
                const orgName = typeof notifContent?.organizationName === "string" ? notifContent.organizationName : "";
                const memberName = typeof notifContent?.memberName === "string" ? notifContent.memberName : "";

                if (memberName && orgName) {
                    return this.$t("{0} has requested deletion of organization {1}.").replace("{0}", memberName).replace("{1}", orgName);
                }
                if (orgName) {
                    return this.$t("An organization deletion request has been submitted for {0}.").replace("{0}", orgName);
                }
                return this.$t("An organization deletion request has been submitted.");
            }

            if (type === "organization_deletion_scheduled") {
                const notifContent = notification.notificationContent as Record<string, unknown> | undefined;
                const orgName = typeof notifContent?.organizationName === "string" ? notifContent.organizationName : "";

                if (orgName) {
                    return this.$t(
                        "Deletion of organization {0} has been approved. It will remain active until the billing period ends.",
                    ).replace("{0}", orgName);
                }
                return this.$t(
                    "Your organization deletion has been approved. The organization will remain active until the billing period ends.",
                );
            }

            if (type === "organization_deleted") {
                const notifContent = notification.notificationContent as Record<string, unknown> | undefined;
                const orgName = typeof notifContent?.organizationName === "string" ? notifContent.organizationName : "";

                if (orgName) {
                    return this.$t("Organization {0} has been deleted from the platform.").replace("{0}", orgName);
                }
                return this.$t("Your organization has been deleted from the platform.");
            }

            const message = getInfoField(info, "message");
            if (message) {
                return this.$t(message);
            }

            switch (type) {
                case "purchase_confirmation": {
                    const productName = getInfoField(info, "productName");
                    const currency = getInfoField(info, "currency") || "EUR";
                    const amount = getNumberField(info, "amount");

                    if (productName && amount !== null) {
                        let formattedAmount = "";

                        try {
                            formattedAmount = new Intl.NumberFormat("en-EN", {
                                style: "currency",
                                currency,
                                minimumFractionDigits: 2,
                            }).format(amount);
                        } catch {
                            formattedAmount = amount.toFixed(2) + " " + currency;
                        }

                        return this.$t("Purchase completed for") + " " + productName + " (" + formattedAmount + ")";
                    }
                    if (productName) {
                        return this.$t("Purchase completed for") + " " + productName;
                    }
                    return this.$t("Your purchase has been completed successfully.");
                }
                case "subscription_renewed": {
                    const planName = getInfoField(info, "planName");
                    const nextRenewalDate = getInfoField(info, "nextRenewalDate");

                    if (planName && nextRenewalDate) {
                        return (
                            this.$t("The plan") +
                            " " +
                            planName +
                            " " +
                            this.$t("has been renewed. Next renewal") +
                            ": " +
                            this.renderNotificationDate(nextRenewalDate)
                        );
                    }
                    if (planName) {
                        return this.$t("The plan") + " " + planName + " " + this.$t("has been renewed successfully.");
                    }
                    return this.$t("A subscription has been renewed successfully.");
                }
                case "payment_failed": {
                    const reason = getInfoField(info, "reason");

                    if (reason) {
                        return this.$t("The payment could not be completed") + ": " + reason;
                    }
                    return this.$t("A payment could not be completed. Please review the operation.");
                }
                case "seats_reduced": {
                    const revokedCount = getNumberField(info, "revokedCount");
                    const maxSeats = getNumberField(info, "maxSeats");

                    if (revokedCount !== null && revokedCount > 0 && maxSeats !== null) {
                        return (
                            this.$t("Seat count was reduced to") +
                            " " +
                            maxSeats +
                            ". " +
                            revokedCount +
                            " " +
                            this.$t("license assignment(s) were revoked.")
                        );
                    }
                    if (maxSeats !== null) {
                        return this.$t("Seat count was reduced to") + " " + maxSeats + ".";
                    }
                    return this.$t("Organization seat count was reduced and licenses may have been revoked.");
                }
                case "token_issue": {
                    const amount = getNumberField(info, "amount");
                    const walletAddress = getInfoField(info, "walletAddress");

                    if (amount !== null && walletAddress) {
                        return this.$t("Issued") + " " + amount + " " + this.$t("tokens to wallet") + " " + walletAddress;
                    }
                    if (amount !== null) {
                        return this.$t("Issued") + " " + amount + " " + this.$t("tokens.");
                    }
                    return this.$t("A token issuance event has been registered.");
                }
                case "login":
                    return this.$t("A new login has been detected for your account.");
                case "organization_request":
                    return this.$t("A new organization request has been submitted.");
                case "organization_request_approved":
                    return this.$t("Your organization request has been approved.");
                case "organization_request_rejected":
                    return this.$t("Your organization request has been rejected.");
                case "organization_deletion_request":
                    return this.$t("An organization deletion request has been submitted.");
                case "organization_deletion_request_approved":
                    return this.$t("Your organization deletion request has been approved by a platform administrator.");
                case "organization_deletion_request_rejected":
                    return this.$t("Your organization deletion request has been rejected by a platform administrator.");
                case "organization_deletion_scheduled":
                    return this.$t(
                        "Your organization deletion has been approved. The organization will remain active until the billing period ends.",
                    );
                case "organization_deleted":
                    return this.$t("Your organization has been deleted from the platform.");
                case "organization_member_invited": {
                    const notifContent = notification.notificationContent as Record<string, unknown> | undefined;
                    const orgName = typeof notifContent?.organizationName === "string" ? notifContent.organizationName : "";
                    const role = typeof notifContent?.role === "string" ? notifContent.role : "";
                    if (orgName) {
                        return this.$t("You have been invited to join {0} as {1}.")
                            .replace("{0}", orgName)
                            .replace("{1}", role ? this.$t(role) : "");
                    }
                    return this.$t("You have received a new organization invitation.");
                }
                case "organization_member_invitation_accepted":
                    return this.$t("An invitation has been accepted.");
                case "organization_member_invitation_rejected":
                    return this.$t("An invitation has been rejected.");
                case "organization_member_activated":
                    return this.$t("A member has been activated.");
                case "organization_member_deactivated":
                    return this.$t("A member has been deactivated.");
                case "organization_member_removed":
                    return this.$t("A member has been removed from the organization.");
                case "organization_member_left": {
                    const memberName = getInfoField(info, "memberName");
                    if (memberName) {
                        return this.$t("{0} has left the organization.").replace("{0}", memberName);
                    }
                    return this.$t("A member has left the organization.");
                }
                case "custom_agent_request_created":
                    return this.$t("A new custom agent request has been received.");
                case "custom_agent_request_accepted":
                    return this.$t("Your custom agent request was accepted. Please pay the deposit to start development.");
                case "custom_agent_request_rejected":
                    return this.$t("Your custom agent request was rejected.");
                case "custom_agent_request_cancelled":
                    return this.$t("Your custom agent request was cancelled by the platform.");
                case "custom_agent_request_delivered":
                    return this.$t("Your custom agent flow has been delivered to your workspace.");
                case "custom_agent_request_deposit_paid":
                    return this.$t("A custom agent deposit was paid. Development can start.");
                default:
                    return this.$t("You have a new notification pending review.");
            }
        },
        notificationIcon: function (notification: ApiNotification): string {
            const type = (notification.notificationContent?.type || "").toLowerCase();

            switch (type) {
                case "purchase_confirmation":
                    return "fas fa-bag-shopping";
                case "subscription_renewed":
                    return "fas fa-file-contract";
                case "payment_failed":
                    return "fas fa-credit-card";
                case "seats_reduced":
                    return "fas fa-users";
                case "token_issue":
                    return "fas fa-coins";
                case "login":
                    return "fas fa-user-shield";
                case "organization_request":
                    return "fas fa-user-group";
                case "organization_deletion_request":
                    return "fas fa-trash-can";
                case "organization_deletion_scheduled":
                    return "fas fa-calendar-xmark";
                case "organization_deleted":
                    return "fas fa-building-circle-xmark";
                case "organization_request_approved":
                case "organization_deletion_request_approved":
                case "organization_member_invitation_accepted":
                case "organization_member_activated":
                case "custom_agent_request_accepted":
                case "custom_agent_request_delivered":
                case "custom_agent_request_deposit_paid":
                    return "fas fa-circle-check";
                case "organization_request_rejected":
                case "organization_deletion_request_rejected":
                case "organization_member_invitation_rejected":
                case "organization_member_deactivated":
                case "organization_member_removed":
                case "custom_agent_request_rejected":
                case "custom_agent_request_cancelled":
                    return "fas fa-circle-xmark";
                case "organization_member_left":
                    return "fas fa-user-minus";
                case "custom_agent_request_created":
                    return "fas fa-robot";
                case "organization_member_invited": {
                    const invitationResolved = this.processedInvitations[notification.id || ""];
                    if (invitationResolved === "accepted") return "fas fa-circle-check";
                    if (invitationResolved === "rejected") return "fas fa-circle-xmark";
                    return "fas fa-user-plus";
                }
                default:
                    return "fas fa-bell";
            }
        },
        notificationToneClass: function (notification: ApiNotification): string {
            const type = (notification.notificationContent?.type || "").toLowerCase();

            switch (type) {
                case "payment_failed":
                case "organization_request_rejected":
                case "organization_deletion_request_rejected":
                case "organization_member_invitation_rejected":
                case "organization_member_deactivated":
                case "organization_member_removed":
                case "organization_member_left":
                case "organization_deleted":
                case "custom_agent_request_rejected":
                case "custom_agent_request_cancelled":
                    return "notification-icon-danger";
                case "seats_reduced":
                case "organization_request":
                case "organization_deletion_request":
                case "organization_deletion_scheduled":
                case "custom_agent_request_created":
                    return "notification-icon-secondary";
                case "purchase_confirmation":
                case "subscription_renewed":
                case "organization_request_approved":
                case "organization_deletion_request_approved":
                case "organization_member_invitation_accepted":
                case "organization_member_activated":
                case "custom_agent_request_accepted":
                case "custom_agent_request_delivered":
                case "custom_agent_request_deposit_paid":
                    return "notification-icon-success";
                case "token_issue":
                    return "notification-icon-secondary";
                case "organization_member_invited": {
                    const invitationResolved = this.processedInvitations[notification.id || ""];
                    if (invitationResolved === "accepted") return "notification-icon-success";
                    if (invitationResolved === "rejected") return "notification-icon-danger";
                    return "notification-icon-secondary";
                }
                default:
                    return "notification-icon-default";
            }
        },
        hasNotificationRoute: function (notification: ApiNotification): boolean {
            return resolveHasNotificationRoute(notification, {
                invitationResolved: this.processedInvitations[notification.id || ""],
            });
        },
        onNotificationClick: function (notification: ApiNotification) {
            const targetRoute = getNotificationRoute(notification, {
                invitationResolved: this.processedInvitations[notification.id || ""],
            });

            if (!targetRoute) {
                return;
            }

            if (notification.id && !notification.read) {
                this.markAsRead(notification);
            }

            routeTo(this, targetRoute);
        },
        renderNotificationDate: function (date: Date | string | number): string {
            if (!date) {
                return this.$t("Date unavailable");
            }

            return renderDateAndTime(date, this.$t);
        },
        onUnreadNotificationsChanged: function (unreadCount: number) {
            const nextUnreadCount = Math.max(0, unreadCount || 0);
            const shouldReload = nextUnreadCount > this.knownUnreadCount && !this.loading;

            this.knownUnreadCount = nextUnreadCount;

            if (shouldReload) {
                this.load(this.currentPage);
            }
        },
        isNotificationBusy: function (notificationId: string): boolean {
            return !!notificationId && this.busyNotificationId.startsWith(notificationId + ":");
        },
        isNotificationActionLoading: function (notificationId: string, kind: "accept" | "reject" | "read" | "delete"): boolean {
            return this.busyNotificationId === notificationId + ":" + kind;
        },
        markAsRead: function (notification: ApiNotification) {
            if (!notification.id) {
                return;
            }

            this.busyNotificationId = notification.id + ":read";
            Request.Abort(this.markReadRequestId);

            Request.Pending(this.markReadRequestId, ApiNotifications.MarkNotificationAsRead(notification.id))
                .onSuccess(() => {
                    this.busyNotificationId = "";
                    this.applyReadState(notification.id || "");
                    const nextUnreadCount = Math.max(0, Math.max(NotificationsController.UnreadCount, this.knownUnreadCount) - 1);
                    this.knownUnreadCount = nextUnreadCount;
                    NotificationsController.SetUnreadCount(nextUnreadCount);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("The notification no longer exists.")),
                        notFoundNotificationNotFound: () => {
                            this.$showMessageModal(this.$t("Not found"), this.$t("The notification no longer exists."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to update the notification."));
                        },
                    });

                    this.busyNotificationId = "";
                })
                .onUnexpectedError(() => {
                    this.busyNotificationId = "";
                });
        },
        askDeleteNotification: function (notification: ApiNotification) {
            this.$askUserConfirmation({
                title: this.$t("Delete notification"),
                message: this.$t("This action will remove the selected notification permanently."),
                danger: true,
                deleteAction: true,
                callback: () => this.deleteNotification(notification),
            });
        },
        deleteNotification: function (notification: ApiNotification) {
            if (!notification.id) {
                return;
            }

            this.busyNotificationId = notification.id + ":delete";
            Request.Abort(this.deleteRequestId);

            Request.Pending(this.deleteRequestId, ApiNotifications.DeleteNotification(notification.id))
                .onSuccess(() => {
                    this.busyNotificationId = "";
                    this.removeNotification(notification);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => this.$showMessageModal(this.$t("Access denied"), this.$t("You cannot delete this notification.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("The notification no longer exists.")),
                        notFoundNotificationNotFound: () => {
                            this.$showMessageModal(this.$t("Not found"), this.$t("The notification no longer exists."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to delete the notification."));
                        },
                    });

                    this.busyNotificationId = "";
                })
                .onUnexpectedError(() => {
                    this.busyNotificationId = "";
                });
        },
        markAllAsRead: function () {
            this.toolbarAction = "mark-all-read";
            Request.Abort(this.markAllReadRequestId);

            Request.Pending(this.markAllReadRequestId, ApiNotifications.MarkAllNotificationsAsRead())
                .onSuccess(() => {
                    this.toolbarAction = "";
                    this.notifications = this.notifications.map((notification) => ({ ...notification, read: true }));
                    this.unreadCount = 0;
                    this.knownUnreadCount = 0;
                    NotificationsController.SetUnreadCount(0);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to mark notifications as read."));
                        },
                    });

                    this.toolbarAction = "";
                })
                .onUnexpectedError(() => {
                    this.toolbarAction = "";
                });
        },
        askDeleteAllNotifications: function () {
            this.$askUserConfirmation({
                title: this.$t("Delete all notifications"),
                message: this.$t("This action will permanently remove all notifications from your account."),
                danger: true,
                deleteAction: true,
                callback: this.deleteAllNotifications.bind(this),
            });
        },
        deleteAllNotifications: function () {
            this.toolbarAction = "delete-all";
            Request.Abort(this.deleteAllRequestId);
            Request.Abort(this.acceptInvitationRequestId);
            Request.Abort(this.rejectInvitationRequestId);

            Request.Pending(this.deleteAllRequestId, ApiNotifications.DeleteAllNotifications())
                .onSuccess(() => {
                    this.toolbarAction = "";
                    const kept = this.notifications.filter((n) => this.isUnresolvedInvitation(n));
                    this.notifications = kept;
                    this.totalNotifications = kept.length;
                    const nextTotalPages = Math.max(1, Math.ceil(this.totalNotifications / this.pageSize));
                    this.paginationApplyListMeta({
                        page: Math.min(this.currentPage, nextTotalPages),
                        totalPages: nextTotalPages,
                    });
                    this.unreadCount = kept.filter((n) => !n.read).length;
                    this.knownUnreadCount = Math.max(NotificationsController.UnreadCount, this.unreadCount);
                    NotificationsController.SetUnreadCount(this.knownUnreadCount);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to delete notifications."));
                        },
                    });

                    this.toolbarAction = "";
                })
                .onUnexpectedError(() => {
                    this.toolbarAction = "";
                });
        },
        applyReadState: function (notificationId: string) {
            this.notifications = this.notifications.map((notification) => {
                if (notification.id !== notificationId || notification.read) {
                    return notification;
                }

                return {
                    ...notification,
                    read: true,
                };
            });

            const nextUnreadCount = Math.max(0, this.unreadCount - 1);
            this.unreadCount = nextUnreadCount;
        },
        removeNotification: function (notification: ApiNotification) {
            const removingUnread = !notification.read;
            this.notifications = this.notifications.filter((item) => item.id !== notification.id);
            this.totalNotifications = Math.max(0, this.totalNotifications - 1);
            const nextTotalPages = Math.max(1, Math.ceil(this.totalNotifications / this.pageSize));
            this.paginationApplyListMeta({
                page: Math.min(this.currentPage, nextTotalPages),
                totalPages: nextTotalPages,
            });

            if (removingUnread) {
                const nextUnreadCount = Math.max(0, this.unreadCount - 1);
                this.unreadCount = nextUnreadCount;
                const nextGlobalUnreadCount = Math.max(0, Math.max(NotificationsController.UnreadCount, this.knownUnreadCount) - 1);
                this.knownUnreadCount = nextGlobalUnreadCount;
                NotificationsController.SetUnreadCount(nextGlobalUnreadCount);
            }

            if (this.notifications.length === 0 && this.totalNotifications > 0) {
                this.load(this.currentPage);
            }
        },
        isOrganizationInvitation: function (notification: ApiNotification): boolean {
            const type = (notification.notificationContent?.type || "").toLowerCase();
            return type === "organization_member_invited";
        },
        isUnresolvedInvitation: function (notification: ApiNotification): boolean {
            return this.isOrganizationInvitation(notification) && !this.processedInvitations[notification.id || ""];
        },
        getInvitationMembershipId: function (notification: ApiNotification): string {
            return ((notification.notificationContent as Record<string, unknown>)?.membershipId as string) || "";
        },
        hasInvitationMembershipId: function (notification: ApiNotification): boolean {
            return !!this.getInvitationMembershipId(notification);
        },
        acceptInvitation: function (notification: ApiNotification) {
            const membershipId = this.getInvitationMembershipId(notification);
            if (!membershipId) {
                return;
            }

            this.$askUserConfirmation({
                title: this.$t("Accept invitation"),
                message: this.$t(
                    "If you accept this invitation, your other pending organization invitations will be rejected automatically. Do you want to continue?",
                ),
                callback: () => {
                    this.busyNotificationId = (notification.id || "") + ":accept";
                    Request.Abort(this.acceptInvitationRequestId);

                    Request.Pending(
                        this.acceptInvitationRequestId,
                        ApiOrganizations.AcceptOrganizationInvitation(membershipId, { notificationId: notification.id || "" }),
                    )
                        .onSuccess(() => {
                            this.busyNotificationId = "";
                            if (notification.id) {
                                this.processedInvitations[notification.id] = "accepted";
                            }
                            void OrganizationController.Refresh();
                            this.load(this.currentPage);
                            NotificationsController.RefreshUnreadCount();
                            this.$showMessageModal(
                                this.$t("Invitation accepted"),
                                this.$t("You have joined the organization. Other pending invitations were rejected automatically."),
                            );
                        })
                        .onRequestError((err, handleErr) => {
                            handleErr(err, {
                                unauthorized: () => this.$requireLogin(),

                                badRequest: () => {
                                    this.$showMessageModal(
                                        this.$t("Action failed"),
                                        this.$t("Unable to accept the invitation at this time."),
                                    );
                                },
                                badRequestMembershipNotInvited: () => {
                                    if (notification.id) {
                                        this.processedInvitations[notification.id] = "accepted";
                                    }
                                    this.$showMessageModal(
                                        this.$t("Already processed"),
                                        this.$t("This invitation has already been processed."),
                                    );
                                },
                                badRequestUserHasActiveSubscriptions: () => {
                                    this.$showMessageModal(
                                        this.$t("Action failed"),
                                        this.$t("You have active subscriptions and cannot accept an organization invitation."),
                                    );
                                },
                                badRequestUserAlreadyInOrganization: () => {
                                    this.$showMessageModal(
                                        this.$t("Already in an organization"),
                                        this.$t("You already belong to an organization and cannot accept this invitation."),
                                    );
                                },
                                notFound: () => {
                                    this.$showMessageModal(this.$t("Not found"), this.$t("The invitation no longer exists."));
                                    this.removeNotification(notification);
                                },
                                notFoundMembershipNotFound: () => {
                                    this.$showMessageModal(this.$t("Not found"), this.$t("The invitation no longer exists."));
                                    this.removeNotification(notification);
                                },
                                temporalError: () => {
                                    this.$showMessageModal(
                                        this.$t("Temporal error"),
                                        this.$t("Unable to accept the invitation. Please try again."),
                                    );
                                },
                            });

                            this.busyNotificationId = "";
                        })
                        .onUnexpectedError(() => {
                            this.busyNotificationId = "";
                        });
                },
            });
        },
        rejectInvitation: function (notification: ApiNotification) {
            const membershipId = this.getInvitationMembershipId(notification);
            if (!membershipId) {
                return;
            }

            this.$askUserConfirmation({
                title: this.$t("Reject invitation"),
                message: this.$t("Are you sure you want to reject this organization invitation?"),
                danger: true,
                rejectAction: true,
                callback: () => {
                    this.busyNotificationId = (notification.id || "") + ":reject";
                    Request.Abort(this.rejectInvitationRequestId);

                    Request.Pending(
                        this.rejectInvitationRequestId,
                        ApiOrganizations.RejectOrganizationInvitation(membershipId, { notificationId: notification.id || "" }),
                    )
                        .onSuccess(() => {
                            this.busyNotificationId = "";
                            if (notification.id) {
                                this.processedInvitations[notification.id] = "rejected";
                            }
                            this.load(this.currentPage);
                            NotificationsController.RefreshUnreadCount();
                        })
                        .onRequestError((err, handleErr) => {
                            handleErr(err, {
                                unauthorized: () => this.$requireLogin(),
                                badRequest: () => {
                                    this.$showMessageModal(
                                        this.$t("Action failed"),
                                        this.$t("Unable to reject the invitation at this time."),
                                    );
                                },
                                badRequestMembershipNotInvited: () => {
                                    if (notification.id) {
                                        this.processedInvitations[notification.id] = "rejected";
                                    }
                                    this.$showMessageModal(
                                        this.$t("Already processed"),
                                        this.$t("This invitation has already been processed."),
                                    );
                                },
                                notFound: () => {
                                    this.$showMessageModal(this.$t("Not found"), this.$t("The invitation no longer exists."));
                                    this.removeNotification(notification);
                                },
                                notFoundMembershipNotFound: () => {
                                    this.$showMessageModal(this.$t("Not found"), this.$t("The invitation no longer exists."));
                                    this.removeNotification(notification);
                                },
                                temporalError: () => {
                                    this.$showMessageModal(
                                        this.$t("Temporal error"),
                                        this.$t("Unable to reject the invitation. Please try again."),
                                    );
                                },
                            });

                            this.busyNotificationId = "";
                        })
                        .onUnexpectedError(() => {
                            this.busyNotificationId = "";
                        });
                },
            });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Notifications"));
        this.$autoFocus();
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));
        this.$listenOnAppEvent("notifications-unread-count-changed", this.onUnreadNotificationsChanged.bind(this));
        this.load(1);
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.markReadRequestId);
        Request.Abort(this.deleteRequestId);
        Request.Abort(this.markAllReadRequestId);
        Request.Abort(this.deleteAllRequestId);
        Request.Abort(this.acceptInvitationRequestId);
        Request.Abort(this.rejectInvitationRequestId);
    },
});
</script>

<style>
@import "@/style/layout/notifications.css";
</style>
