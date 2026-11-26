import { computed, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { ListAdminSubscriptionsQueryParameters } from "@/api/api-group-subscriptions";
import type { GetSubscriptionStatusQueryParameters } from "@/api/api-group-subscriptions";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import type { TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import {
    SUBSCRIPTION_CATEGORY_TAB_DEFS,
    SUBSCRIPTIONS_LIST_PAGE_SIZE,
    type SubscriptionCategoryTab,
    type SubscriptionFilterStatus,
    type SubscriptionStatusCategoryCountsLike,
    dateFilterToTimestamp,
    getSubscriptionCategoryCount,
} from "@/utils/subscription-domain";

export type SubscriptionListMode = "user" | "admin";

/** User plan filter values sent to the API via `buildUserStatusQueryParams`. */
export type UserPlanFilterValue = "all" | "Monthly" | "Annual";

export interface UseSubscriptionListFiltersOptions {
    mode: SubscriptionListMode;
    page: Ref<number>;
    pageSize?: Ref<number>;
    paginationReset: () => void;
}

export interface UseSubscriptionListFiltersResult {
    filtersCollapsed: Ref<boolean>;
    activeCategoryTab: Ref<SubscriptionCategoryTab>;
    categoryCounts: Ref<SubscriptionStatusCategoryCountsLike>;
    subscriptionToolbarTabs: ComputedRef<TableCardToolbarTabItem[]>;
    activeStatusTab: Ref<SubscriptionFilterStatus>;
    planFilterUser: Ref<UserPlanFilterValue>;
    statusFilter: Ref<string>;
    planFilterAdmin: Ref<string>;
    dateFrom: Ref<string>;
    dateTo: Ref<string>;
    setCategoryTab: (tab: SubscriptionCategoryTab) => boolean;
    onFilterFieldChange: () => void;
    resetFilters: () => void;
    setCategoryCounts: (counts: SubscriptionStatusCategoryCountsLike) => void;
    buildUserStatusQueryParams: () => GetSubscriptionStatusQueryParameters;
    buildAdminQueryParams: () => ListAdminSubscriptionsQueryParameters;
}

export function useSubscriptionListFilters(options: UseSubscriptionListFiltersOptions): UseSubscriptionListFiltersResult {
    const { filtersCollapsed } = useCollapsibleFilters(true);
    const activeCategoryTab = ref<SubscriptionCategoryTab>("all");
    const categoryCounts = ref<SubscriptionStatusCategoryCountsLike>({
        all: 0,
        plan: 0,
        service: 0,
        product: 0,
    });

    const activeStatusTab = ref<SubscriptionFilterStatus>("all");
    const planFilterUser = ref<UserPlanFilterValue>("all");

    const statusFilter = ref("");
    const planFilterAdmin = ref("");
    const dateFrom = ref("");
    const dateTo = ref("");

    const subscriptionToolbarTabs = computed<TableCardToolbarTabItem[]>(() =>
        SUBSCRIPTION_CATEGORY_TAB_DEFS.map((tab) => ({
            id: tab.key,
            label: tab.label,
            count: getSubscriptionCategoryCount(categoryCounts.value, tab.key),
        })),
    );

    const applyPaginationReset = () => {
        options.paginationReset();
    };

    const setCategoryTab = (tab: SubscriptionCategoryTab): boolean => {
        if (activeCategoryTab.value === tab) {
            return false;
        }
        activeCategoryTab.value = tab;
        applyPaginationReset();
        return true;
    };

    const onFilterFieldChange = () => {
        applyPaginationReset();
    };

    const resetFilters = () => {
        activeCategoryTab.value = "all";
        if (options.mode === "user") {
            activeStatusTab.value = "all";
            planFilterUser.value = "all";
        } else {
            statusFilter.value = "";
            planFilterAdmin.value = "";
            dateFrom.value = "";
            dateTo.value = "";
        }
        applyPaginationReset();
    };

    const setCategoryCounts = (counts: SubscriptionStatusCategoryCountsLike) => {
        categoryCounts.value = counts;
    };

    const buildUserStatusQueryParams = (): GetSubscriptionStatusQueryParameters => {
        const params: GetSubscriptionStatusQueryParameters = {
            page: String(options.page.value),
            pageSize: String(options.pageSize?.value ?? SUBSCRIPTIONS_LIST_PAGE_SIZE),
        };

        if (activeCategoryTab.value !== "all") {
            params.category = activeCategoryTab.value;
        }
        params.display_status = activeStatusTab.value !== "all" ? activeStatusTab.value : "active";
        if (planFilterUser.value === "Monthly") {
            params.billing_cycle = "monthly";
        } else if (planFilterUser.value === "Annual") {
            params.billing_cycle = "annual";
        }

        return params;
    };

    const buildAdminQueryParams = (): ListAdminSubscriptionsQueryParameters => {
        const params: ListAdminSubscriptionsQueryParameters = {
            page: String(options.page.value),
            pageSize: String(options.pageSize?.value ?? SUBSCRIPTIONS_LIST_PAGE_SIZE),
        };

        if (statusFilter.value) {
            params.status = statusFilter.value;
        }
        if (planFilterAdmin.value) {
            params.billing_cycle = planFilterAdmin.value;
        }
        const createdFrom = dateFilterToTimestamp(dateFrom.value, false);
        const createdTo = dateFilterToTimestamp(dateTo.value, true);
        if (createdFrom > 0) {
            params.created_from = String(createdFrom);
        }
        if (createdTo > 0) {
            params.created_to = String(createdTo);
        }
        if (activeCategoryTab.value !== "all") {
            params.category = activeCategoryTab.value;
        }

        return params;
    };

    return {
        filtersCollapsed,
        activeCategoryTab,
        categoryCounts,
        subscriptionToolbarTabs,
        activeStatusTab,
        planFilterUser,
        statusFilter,
        planFilterAdmin,
        dateFrom,
        dateTo,
        setCategoryTab,
        onFilterFieldChange,
        resetFilters,
        setCategoryCounts,
        buildUserStatusQueryParams,
        buildAdminQueryParams,
    };
}
