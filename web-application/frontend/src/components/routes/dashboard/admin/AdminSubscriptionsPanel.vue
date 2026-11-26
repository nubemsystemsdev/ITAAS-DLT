<template>
    <DashboardPageHeader
        :eyebrow="$t('Subscription area')"
        :title="$t('Manage subscriptions')"
        :subtitle="$t('Global subscription list with filters. Suspend, reactivate, refund and review Stripe details.')"
    />

    <SubscriptionsListSection
        mode="admin"
        id-prefix="admin-subscriptions"
        :loading="loading"
        :list-error-message="listErrorMessage"
        :subscriptions="subscriptions"
        :subscription-toolbar-tabs="subscriptionToolbarTabs"
        :active-category-tab="activeCategoryTab"
        v-model:filters-collapsed="filtersCollapsed"
        :status-filter="statusFilter"
        :plan-filter-admin="planFilterAdmin"
        :date-from="dateFrom"
        :date-to="dateTo"
        :page="page"
        :total-pages="totalPages"
        :can-go-prev="paginationCanGoPrev"
        :can-go-next="paginationCanGoNext"
        :pagination-visible="!loading && paginationVisible"
        :action-loading-id="actionLoadingId"
        @select-category-tab="onSelectCategoryTab"
        @apply-filters="onApplyFilters"
        @reset-filters="onResetFilters"
        @prev="onPaginationPrev"
        @next="onPaginationNext"
        @view-detail="openDetail"
        @suspend="confirmSuspendSubscription"
        @reactivate="confirmReactivateSubscription"
    />
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import type { SubscriptionAdminListItem } from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import SubscriptionsListSection from "@/components/routes/dashboard/SubscriptionsListSection.vue";
import { useSubscriptionListFilters } from "@/composables/useSubscriptionListFilters";
import { usePagination } from "@/composables/usePagination";
import type { SubscriptionCategoryTab } from "@/utils/subscription-domain";
import { SUBSCRIPTION_CATEGORY_TABS, SUBSCRIPTIONS_LIST_PAGE_SIZE } from "@/utils/subscription-domain";
import { getUniqueStringId } from "@/utils/unique-id";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";
import { Request } from "@asanrom/request-browser";

export default defineComponent({
    name: "AdminSubscriptionsPanel",
    components: {
        DashboardPageHeader,
        SubscriptionsListSection,
    },
    setup: function () {
        const loading = ref(false);
        const pagination = usePagination({ loading, pageSize: SUBSCRIPTIONS_LIST_PAGE_SIZE });
        const listFilters = useSubscriptionListFilters({
            mode: "admin",
            page: pagination.page,
            pageSize: ref(SUBSCRIPTIONS_LIST_PAGE_SIZE),
            paginationReset: pagination.reset,
        });

        return {
            listRequestId: getUniqueStringId(),
            suspendRequestId: getUniqueStringId(),
            reactivateRequestId: getUniqueStringId(),
            loading,
            subscriptions: [] as SubscriptionAdminListItem[],
            listErrorMessage: "",
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            filtersCollapsed: listFilters.filtersCollapsed,
            activeCategoryTab: listFilters.activeCategoryTab,
            subscriptionToolbarTabs: listFilters.subscriptionToolbarTabs,
            statusFilter: listFilters.statusFilter,
            planFilterAdmin: listFilters.planFilterAdmin,
            dateFrom: listFilters.dateFrom,
            dateTo: listFilters.dateTo,
            setCategoryTab: listFilters.setCategoryTab,
            onFilterFieldChange: listFilters.onFilterFieldChange,
            resetListFilters: listFilters.resetFilters,
            setCategoryCounts: listFilters.setCategoryCounts,
            buildAdminQueryParams: listFilters.buildAdminQueryParams,
        };
    },
    data: function () {
        return {
            actionLoadingId: "",
        };
    },
    methods: {
        onSelectCategoryTab: function (tab: SubscriptionCategoryTab): void {
            if (this.activeCategoryTab === tab) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, tab, "all");
        },
        syncTabFromRoute: function (): void {
            const nextTab = normalizeRouteTabQuery(this.$route.query.tab, SUBSCRIPTION_CATEGORY_TABS, "all");
            this.setCategoryTab(nextTab);
        },
        onRouteTabChanged: function (): void {
            const previousTab = this.activeCategoryTab;
            this.syncTabFromRoute();
            if (previousTab === this.activeCategoryTab) {
                return;
            }
            this.loadSubscriptions();
        },
        onApplyFilters: function (payload: { status: string; plan: string; dateFrom: string; dateTo: string }): void {
            this.statusFilter = payload.status;
            this.planFilterAdmin = payload.plan;
            this.dateFrom = payload.dateFrom;
            this.dateTo = payload.dateTo;
            this.onFilterFieldChange();
            this.loadSubscriptions();
        },
        onResetFilters: function (): void {
            this.resetListFilters();
            this.loadSubscriptions();
        },
        onPaginationPrev: function (): void {
            if (!this.paginationGoPrev()) {
                return;
            }
            this.loadSubscriptions();
        },
        onPaginationNext: function (): void {
            if (!this.paginationGoNext()) {
                return;
            }
            this.loadSubscriptions();
        },
        loadSubscriptions: function (): void {
            this.loading = true;
            this.listErrorMessage = "";
            Request.Abort(this.listRequestId);
            Request.Pending(this.listRequestId, ApiSubscriptions.ListAdminSubscriptions(this.buildAdminQueryParams()))
                .onSuccess((response) => {
                    this.loading = false;
                    this.subscriptions = response.subscriptions || [];
                    this.paginationApplyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                    this.setCategoryCounts(response.categoryCounts || {});
                })
                .onRequestError((err, handleErr) => {
                    this.loading = false;
                    this.subscriptions = [];
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.listErrorMessage = String(this.$t("Access denied"));
                        },
                        temporalError: () => {
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                        networkError: () => {
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                        serverError: () => {
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                });
        },
        openDetail: function (subscriptionId: string): void {
            if (!subscriptionId) {
                return;
            }
            void this.$router.push({
                name: "admin-subscription-detail",
                params: { subscriptionId },
            });
        },
        refreshAfterAction: function (): void {
            this.loadSubscriptions();
        },
        confirmSuspendSubscription: function (subscriptionId: string): void {
            if (this.actionLoadingId) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Suspend subscription"),
                message: this.$t("Do you want to suspend this subscription? The customer will lose access until it is reactivated."),
                danger: true,
                suspendAction: true,
                callback: () => {
                    this.doSuspendSubscription(subscriptionId);
                },
            });
        },
        doSuspendSubscription: function (subscriptionId: string): void {
            if (this.actionLoadingId) {
                return;
            }
            this.actionLoadingId = subscriptionId + ":suspend";
            Request.Abort(this.suspendRequestId);
            Request.Pending(this.suspendRequestId, ApiSubscriptions.SuspendSubscriptionAdmin({ subscription_id: subscriptionId }))
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    this.$showSnackBar(this.$t("Subscription suspended"));
                    this.refreshAfterAction();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to suspend the subscription.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        badRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to suspend the subscription.")),
                        badRequestInvalidRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to suspend the subscription.")),
                        temporalError: () =>
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to suspend the subscription.")),
                        networkError: () =>
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to suspend the subscription.")),
                        serverError: () => this.$showMessageModal(this.$t("Server error"), this.$t("Unable to suspend the subscription.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to suspend the subscription."));
                });
        },
        confirmReactivateSubscription: function (subscriptionId: string): void {
            if (this.actionLoadingId) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Reactivate subscription"),
                message: this.$t("Do you want to reactivate this subscription?"),
                danger: false,
                callback: () => {
                    this.doReactivateSubscription(subscriptionId);
                },
            });
        },
        doReactivateSubscription: function (subscriptionId: string): void {
            if (this.actionLoadingId) {
                return;
            }
            this.actionLoadingId = subscriptionId + ":reactivate";
            Request.Abort(this.reactivateRequestId);
            Request.Pending(this.reactivateRequestId, ApiSubscriptions.ReactivateSubscriptionAdmin({ subscription_id: subscriptionId }))
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    this.$showSnackBar(this.$t("Subscription reactivated"));
                    this.refreshAfterAction();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () =>
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to reactivate the subscription.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        badRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to reactivate the subscription.")),
                        badRequestInvalidRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to reactivate the subscription.")),
                        temporalError: () =>
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to reactivate the subscription.")),
                        networkError: () =>
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to reactivate the subscription.")),
                        serverError: () =>
                            this.$showMessageModal(this.$t("Server error"), this.$t("Unable to reactivate the subscription.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to reactivate the subscription."));
                });
        },
    },
    mounted: function () {
        this.syncTabFromRoute();
        this.loadSubscriptions();
    },
    watch: {
        "$route.query.tab": function () {
            this.onRouteTabChanged();
        },
    },
});
</script>
