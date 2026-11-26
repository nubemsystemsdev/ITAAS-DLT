<template>
    <section class="subscriptions-card dashboard-list-card">
        <TableCardToolbar
            :tabs="subscriptionToolbarTabs"
            :active-tab="activeCategoryTab"
            :tablist-label="$t('Filter by category')"
            :tab-panel-id="idPrefix + '-panel'"
            :tabs-disabled="loading"
            :filters-collapsed="filtersCollapsed"
            show-filters-toggle
            :filters-toggle-disabled="loading"
            @update:filters-collapsed="onFiltersCollapsedUpdate"
        >
            <template #tabs>
                <TableCardToolbarTabs
                    :tabs="subscriptionToolbarTabs"
                    :active-tab="activeCategoryTab"
                    :panel-id="idPrefix + '-panel'"
                    tablist-label="Filter by category"
                    :disabled="loading"
                    @select="onSelectCategoryTab"
                />
                <span v-if="mode === 'user' && cancelledCount" class="table-tablist-separator" role="separator"></span>
                <TableCardToolbarTabs
                    v-if="mode === 'user'"
                    :tabs="statusToolbarTabs"
                    :active-tab="activeStatusTab"
                    :panel-id="idPrefix + '-panel'"
                    tablist-label="Filter by status"
                    :disabled="loading"
                    @select="onSelectStatusTab"
                />
            </template>
            <template #filters>
                <template v-if="mode === 'user'">
                    <label class="toolbar-plan-filter" :for="`${idPrefix}-plan-filter`">
                        <span class="toolbar-plan-label">{{ $t("Plan") }}</span>
                        <select :id="`${idPrefix}-plan-filter`" v-model="draftPlan" class="toolbar-plan-select" :disabled="loading">
                            <option value="all">{{ $t("All") }}</option>
                            <option value="Monthly">{{ $t("Monthly") }}</option>
                            <option value="Annual">{{ $t("Annual") }}</option>
                        </select>
                    </label>
                </template>

                <template v-else>
                    <label class="toolbar-plan-filter" :for="`${idPrefix}-status-filter`">
                        <span class="toolbar-plan-label">{{ $t("Status") }}</span>
                        <select :id="`${idPrefix}-status-filter`" v-model="draftStatus" class="toolbar-plan-select" :disabled="loading">
                            <option value="">{{ $t("All") }}</option>
                            <option v-for="status in adminStatusOptions" :key="status.key" :value="status.key">
                                {{ $t(status.label) }}
                            </option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" :for="`${idPrefix}-plan-filter`">
                        <span class="toolbar-plan-label">{{ $t("Plan") }}</span>
                        <select :id="`${idPrefix}-plan-filter`" v-model="draftPlan" class="toolbar-plan-select" :disabled="loading">
                            <option value="">{{ $t("All") }}</option>
                            <option value="monthly">{{ $t("Monthly") }}</option>
                            <option value="annual">{{ $t("Annual") }}</option>
                            <option value="complete">{{ $t("Complete") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" :for="`${idPrefix}-date-from`">
                        <span class="toolbar-plan-label">{{ $t("From") }}</span>
                        <input
                            :id="`${idPrefix}-date-from`"
                            v-model="draftDateFrom"
                            type="date"
                            class="toolbar-plan-select"
                            :disabled="loading"
                        />
                    </label>

                    <label class="toolbar-plan-filter" :for="`${idPrefix}-date-to`">
                        <span class="toolbar-plan-label">{{ $t("To") }}</span>
                        <input
                            :id="`${idPrefix}-date-to`"
                            v-model="draftDateTo"
                            type="date"
                            class="toolbar-plan-select"
                            :disabled="loading"
                        />
                    </label>
                </template>

                <button
                    type="button"
                    class="btn btn-primary toolbar-action-btn toolbar-apply-btn"
                    :disabled="loading"
                    @click="onApplyFilters"
                >
                    <i class="fas fa-check" aria-hidden="true"></i>
                    {{ $t("Apply filters") }}
                </button>

                <button
                    type="button"
                    class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn"
                    :disabled="loading"
                    @click="onResetFilters"
                >
                    <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                    {{ $t("Clear filters") }}
                </button>
            </template>
        </TableCardToolbar>

        <div :id="idPrefix + '-panel'" role="tabpanel" :aria-labelledby="idPrefix + '-panel-tab-' + activeCategoryTab">
            <p v-if="loading" class="catalog-state">{{ $t("Loading subscriptions...") }}</p>
            <p v-else-if="listErrorMessage" class="catalog-state">{{ listErrorMessage }}</p>
            <p v-else-if="!subscriptions.length" class="catalog-state">{{ $t("No subscriptions found.") }}</p>

            <div v-else class="table-responsive">
                <table class="table table-wide table-stack table-stack--single-col-mobile table-stack--subscriptions">
                    <thead>
                        <tr v-if="mode === 'admin'">
                            <th scope="col">{{ $t("Client") }}</th>
                            <th scope="col">{{ $t("Type") }}</th>
                            <th scope="col">{{ $t("Item") }}</th>
                            <th scope="col">{{ $t("Plan") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col" class="subscription-cell--renewal">{{ $t("Next renewal") }}</th>
                            <th scope="col" class="text-right subscription-cell--actions">{{ $t("Actions") }}</th>
                        </tr>
                        <tr v-else>
                            <th scope="col">{{ $t("Product") }}</th>
                            <th scope="col">{{ $t("Amount") }}</th>
                            <th scope="col" class="subscription-cell--renewal">{{ $t("Next renewal") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col" class="text-right subscription-cell--actions">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-if="mode === 'admin'">
                            <tr v-for="subscription in adminSubscriptions" :key="subscription.id">
                                <slot name="admin-row" :subscription="subscription">
                                    <td :data-label="$t('Client')" class="table-stack-row-primary">
                                        <router-link
                                            class="link-deco cursor-pointer"
                                            :to="{ name: 'clients-client-detail', params: { clientId: subscription.uid } }"
                                            :title="subscription.username || subscription.uid"
                                        >
                                            {{ subscription.username || subscription.uid }}
                                        </router-link>
                                    </td>
                                    <td :data-label="$t('Type')">{{ formatCategory(subscription.category) }}</td>
                                    <td :data-label="$t('Item')">
                                        <span :title="subscription.subscribableId || undefined">
                                            {{ adminItemDisplayName(subscription) }}
                                        </span>
                                    </td>
                                    <td :data-label="$t('Plan')">{{ formatCycle(subscription.billingCycle) }}</td>
                                    <td :data-label="$t('Status')">
                                        <span :class="statusBadgeClass(subscription.status, subscriptionStatusToneMap)" role="status">
                                            {{ $t(subscription.status) }}
                                        </span>
                                    </td>
                                    <td :data-label="$t('Next renewal')" class="subscription-cell--renewal">
                                        {{ formatAdminRenewal(subscription.currentPeriodEnd) }}
                                    </td>
                                    <td :data-label="$t('Actions')" class="actions-cell text-right subscription-cell--actions">
                                        <div class="dashboard-actions-inline">
                                            <button
                                                type="button"
                                                class="btn btn-primary btn-xs"
                                                :aria-label="$t('View')"
                                                :title="$t('View')"
                                                :disabled="!!actionLoadingId"
                                                @click="$emit('view-detail', subscription.id)"
                                            >
                                                <i class="fas fa-eye no-margin"></i>
                                            </button>
                                            <button
                                                v-if="canSuspend(subscription)"
                                                type="button"
                                                class="btn btn-danger btn-xs"
                                                :aria-label="$t('Suspend')"
                                                :title="$t('Suspend')"
                                                :disabled="!!actionLoadingId"
                                                @click="$emit('suspend', subscription.id)"
                                            >
                                                <i
                                                    :class="
                                                        actionLoadingId === subscription.id + ':suspend'
                                                            ? 'fas fa-spinner fa-spin no-margin'
                                                            : 'fas fa-ban no-margin'
                                                    "
                                                    aria-hidden="true"
                                                ></i>
                                            </button>
                                            <button
                                                v-if="canReactivate(subscription)"
                                                type="button"
                                                class="btn btn-tertiary btn-xs"
                                                :aria-label="$t('Reactivate')"
                                                :title="$t('Reactivate')"
                                                :disabled="!!actionLoadingId"
                                                @click="$emit('reactivate', subscription.id)"
                                            >
                                                <i
                                                    :class="
                                                        actionLoadingId === subscription.id + ':reactivate'
                                                            ? 'fas fa-spinner fa-spin no-margin'
                                                            : 'fas fa-check no-margin'
                                                    "
                                                    aria-hidden="true"
                                                ></i>
                                            </button>
                                        </div>
                                    </td>
                                </slot>
                            </tr>
                        </template>
                        <template v-else>
                            <tr v-for="subscription in userSubscriptions" :key="subscription.id">
                                <slot name="user-row" :subscription="subscription">
                                    <td :data-label="$t('Product')" class="table-stack-row-primary">
                                        <span class="agent-data">
                                            <strong class="cell-strong">{{ subscription.agent }}</strong>
                                        </span>
                                    </td>
                                    <td :data-label="$t('Amount')" class="subscription-cell--amount">
                                        <p class="amount-value">
                                            {{ formatAmount(subscription.amount) }} / {{ formatCyclePeriod(subscription.billingCycle) }}
                                        </p>
                                    </td>
                                    <td :data-label="$t('Next renewal')" class="subscription-cell--renewal">
                                        <p class="renewal-date">
                                            {{ subscription.renewalDate ? formatUserRenewal(subscription.renewalDate) : "-" }}
                                        </p>
                                        <p v-if="renewalSecondaryText(subscription)" class="renewal-relative">
                                            {{ renewalSecondaryText(subscription) }}
                                        </p>
                                    </td>
                                    <td :data-label="$t('Status')" class="subscription-cell--status">
                                        <span :class="statusBadgeClass(subscription.status, subscriptionStatusToneMap)" role="status">
                                            {{ $t(userStatusLabel(subscription.status, subscription.cancelAtPeriodEnd)) }}
                                        </span>
                                    </td>
                                    <td :data-label="$t('Actions')" class="actions-cell text-right subscription-cell--actions">
                                        <div class="dashboard-actions-inline">
                                            <button
                                                type="button"
                                                class="btn btn-primary btn-xs action-button icon-only-button-mobile"
                                                :aria-label="$t('Manage subscription')"
                                                :title="$t('Manage subscription')"
                                                :disabled="actionLoading"
                                                @click="$emit('manage', subscription.id)"
                                            >
                                                <i class="fas fa-sliders no-margin" aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    </td>
                                </slot>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <PaginationBar
                :page="page"
                :total-pages="totalPages"
                :can-go-prev="canGoPrev"
                :can-go-next="canGoNext"
                :visible="paginationVisible"
                :aria-label="$t('Subscriptions list pagination')"
                @prev="$emit('prev')"
                @next="$emit('next')"
            />
        </div>
    </section>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import type { SubscriptionAdminListItem } from "@/api/definitions";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import TableCardToolbarTabs from "@/components/layout/TableCardToolbarTabs.vue";
import type { TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import type { SubscriptionListMode, UserPlanFilterValue } from "@/composables/useSubscriptionListFilters";
import { SUBSCRIPTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { formatPrice } from "@/utils/format-currency";
import {
    SUBSCRIPTION_ADMIN_STATUS_OPTIONS,
    type SubscriptionCategoryTab,
    type SubscriptionDisplayStatus,
    type SubscriptionFilterStatus,
    type UserSubscriptionListRow,
    canAdminReactivateSubscription,
    canAdminSuspendSubscription,
    formatBillingCycle,
    formatBillingCyclePeriod,
    formatSubscriptionCategory,
    formatSubscriptionItemDisplayName,
    userSubscriptionStatusLabelKey,
} from "@/utils/subscription-domain";
import { formatDateLongIntl, formatRelativeDays, renderDate } from "@/utils/time-utils";

export type { UserSubscriptionListRow };

export default defineComponent({
    name: "SubscriptionsListSection",
    components: {
        PaginationBar,
        TableCardToolbar,
        TableCardToolbarTabs,
    },
    emits: [
        "select-category-tab",
        "update:filters-collapsed",
        "apply-filters",
        "reset-filters",
        "prev",
        "next",
        "manage",
        "view-detail",
        "suspend",
        "reactivate",
    ],
    props: {
        mode: {
            type: String as PropType<SubscriptionListMode>,
            required: true,
        },
        idPrefix: {
            type: String,
            default: "subscriptions",
        },
        loading: {
            type: Boolean,
            default: false,
        },
        listErrorMessage: {
            type: String,
            default: "",
        },
        subscriptions: {
            type: Array as PropType<Array<UserSubscriptionListRow | SubscriptionAdminListItem>>,
            default: () => [],
        },
        subscriptionToolbarTabs: {
            type: Array as PropType<TableCardToolbarTabItem[]>,
            required: true,
        },
        activeCategoryTab: {
            type: String as PropType<SubscriptionCategoryTab>,
            required: true,
        },
        filtersCollapsed: {
            type: Boolean,
            default: true,
        },
        activeStatusTab: {
            type: String as PropType<SubscriptionFilterStatus>,
            default: "all",
        },
        planFilterUser: {
            type: String as PropType<UserPlanFilterValue>,
            default: "all",
        },
        statusFilter: {
            type: String,
            default: "",
        },
        planFilterAdmin: {
            type: String,
            default: "",
        },
        dateFrom: {
            type: String,
            default: "",
        },
        dateTo: {
            type: String,
            default: "",
        },
        page: {
            type: Number,
            required: true,
        },
        totalPages: {
            type: Number,
            required: true,
        },
        canGoPrev: {
            type: Boolean,
            default: false,
        },
        canGoNext: {
            type: Boolean,
            default: false,
        },
        paginationVisible: {
            type: Boolean,
            default: false,
        },
        actionLoading: {
            type: Boolean,
            default: false,
        },
        actionLoadingId: {
            type: String,
            default: "",
        },
        cancelledCount: {
            type: Number,
            default: 0,
        },
    },
    computed: {
        subscriptionStatusToneMap: function () {
            return SUBSCRIPTION_STATUS_TONE_MAP;
        },
        adminStatusOptions: function () {
            return SUBSCRIPTION_ADMIN_STATUS_OPTIONS;
        },
        statusToolbarTabs: function (): TableCardToolbarTabItem[] {
            if (this.mode !== "user") return [];
            if (!this.cancelledCount) return [];
            return [{ id: "cancelled", label: "Cancelled", count: this.cancelledCount }];
        },
        adminSubscriptions: function (): SubscriptionAdminListItem[] {
            if (this.mode !== "admin") {
                return [];
            }
            return this.subscriptions as SubscriptionAdminListItem[];
        },
        userSubscriptions: function (): UserSubscriptionListRow[] {
            if (this.mode !== "user") {
                return [];
            }
            return this.subscriptions as UserSubscriptionListRow[];
        },
    },
    data: function () {
        return {
            draftStatus: this.mode === "user" ? this.activeStatusTab || "all" : this.statusFilter || "",
            draftPlan: this.mode === "user" ? this.planFilterUser || "all" : this.planFilterAdmin || "",
            draftDateFrom: this.dateFrom || "",
            draftDateTo: this.dateTo || "",
        };
    },
    methods: {
        statusBadgeClass,
        adminItemDisplayName: function (subscription: SubscriptionAdminListItem): string {
            return formatSubscriptionItemDisplayName(subscription.subscribableName, subscription.subscribableId);
        },
        translate: function (key: string): string {
            return String(this.$t(key));
        },
        formatCategory: function (category?: string): string {
            return formatSubscriptionCategory(category, this.translate);
        },
        formatCycle: function (cycle: string): string {
            return formatBillingCycle(cycle, this.translate);
        },
        formatCyclePeriod: function (cycle: string): string {
            return formatBillingCyclePeriod(cycle, this.translate);
        },
        formatAdminRenewal: function (timestamp?: number): string {
            if (!timestamp || timestamp <= 0) {
                return "—";
            }
            return renderDate(timestamp, this.$t);
        },
        canSuspend: function (subscription: SubscriptionAdminListItem): boolean {
            return canAdminSuspendSubscription(subscription);
        },
        canReactivate: function (subscription: SubscriptionAdminListItem): boolean {
            return canAdminReactivateSubscription(subscription);
        },
        getIntlLocale: function (): string {
            const locale = String(this.$locale?.value || "")
                .trim()
                .toLowerCase();
            if (locale.startsWith("es")) {
                return "es-ES";
            }
            return "en-US";
        },
        formatAmount: function (amount: number | null): string {
            return formatPrice(amount, { locale: this.getIntlLocale(), minimumFractionDigits: 2 });
        },
        formatUserRenewal: function (dateIso: string): string {
            return formatDateLongIntl(dateIso, this.getIntlLocale());
        },
        userStatusLabel: function (status: SubscriptionDisplayStatus, cancelAtPeriodEnd = false): string {
            return userSubscriptionStatusLabelKey(status, cancelAtPeriodEnd);
        },
        renewalSecondaryText: function (subscription: UserSubscriptionListRow): string {
            if (!subscription.renewalDate) {
                return subscription.cancelAtPeriodEnd ? this.translate("Cancellation scheduled") : "";
            }

            const relativeDate = formatRelativeDays(subscription.renewalDate, this.getIntlLocale());
            const formattedDate = this.formatUserRenewal(subscription.renewalDate);

            if (subscription.cancelAtPeriodEnd) {
                return `${this.translate("Active until")} ${formattedDate}${relativeDate ? ` · ${relativeDate}` : ""} · ${this.translate(
                    "Will be cancelled at the end of the current period",
                )}`;
            }

            return relativeDate;
        },
        onSelectCategoryTab: function (tab: string) {
            this.$emit("select-category-tab", tab as SubscriptionCategoryTab);
        },
        onSelectStatusTab: function (tabId: string): void {
            if (this.mode !== "user") return;
            this.draftStatus = this.activeStatusTab === "cancelled" ? "all" : tabId;
            this.onApplyFilters();
        },
        onFiltersCollapsedUpdate: function (value: boolean) {
            this.$emit("update:filters-collapsed", value);
        },
        onApplyFilters: function (): void {
            this.$emit("apply-filters", {
                status: this.draftStatus,
                plan: this.draftPlan,
                dateFrom: this.draftDateFrom,
                dateTo: this.draftDateTo,
            });
        },
        onResetFilters: function (): void {
            const defaultStatus = this.mode === "user" ? "all" : "";
            const defaultPlan = this.mode === "user" ? "all" : "";
            this.draftStatus = defaultStatus;
            this.draftPlan = defaultPlan;
            this.draftDateFrom = "";
            this.draftDateTo = "";
            this.$emit("reset-filters");
        },
    },
    watch: {
        activeStatusTab: function (val: string): void {
            if (this.mode === "user") {
                this.draftStatus = val || "all";
            }
        },
        planFilterUser: function (val: string): void {
            if (this.mode === "user") {
                this.draftPlan = val || "all";
            }
        },
        statusFilter: function (val: string): void {
            if (this.mode === "admin") {
                this.draftStatus = val || "";
            }
        },
        planFilterAdmin: function (val: string): void {
            if (this.mode === "admin") {
                this.draftPlan = val || "";
            }
        },
        dateFrom: function (val: string): void {
            this.draftDateFrom = val || "";
        },
        dateTo: function (val: string): void {
            this.draftDateTo = val || "";
        },
    },
});
</script>

<style scoped>
@media (min-width: 1025px) {
    .table.table-stack.table-stack--subscriptions .subscription-cell--renewal {
        width: 1%;
        white-space: nowrap;
    }

    .table.table-stack.table-stack--subscriptions .subscription-cell--actions {
        width: 1%;
        min-width: calc(var(--space-48) * 3 + var(--space-8) * 2 + var(--space-12) * 2);
        white-space: nowrap;
    }

    .table.table-stack.table-stack--subscriptions .dashboard-actions-inline {
        flex-wrap: nowrap;
    }
}

@media (max-width: 1024px) {
    .table.table-stack.table-stack--subscriptions .subscription-cell--amount {
        order: 4;
        flex: 1 1 calc(50% - var(--space-12));
        min-width: calc(50% - var(--space-12));
    }

    .table.table-stack.table-stack--subscriptions .subscription-cell--renewal {
        order: 5;
        flex: 1 1 calc(50% - var(--space-12));
        min-width: calc(50% - var(--space-12));
    }

    .table.table-stack.table-stack--subscriptions .subscription-cell--status {
        order: 6;
        flex: 1 1 100%;
        min-width: 100%;
    }
}
</style>
