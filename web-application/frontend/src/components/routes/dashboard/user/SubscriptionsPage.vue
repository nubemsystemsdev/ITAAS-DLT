<template>
    <div class="page-content subscriptions-page" tabindex="-1">
        <AdminSubscriptionsPanel v-if="isSubscriptionAdmin" />

        <template v-else>
            <DashboardPageHeader
                :eyebrow="$t('Subscription area')"
                :title="$t('My subscriptions')"
                :subtitle="$t('Manage plans, renewals and scheduled cancellations of each agent.')"
            />

            <SubscriptionsListSection
                mode="user"
                id-prefix="subscriptions"
                :loading="loadingSubscriptions"
                :list-error-message="listErrorMessage"
                :subscriptions="subscriptions"
                :subscription-toolbar-tabs="subscriptionToolbarTabs"
                :active-category-tab="activeCategoryTab"
                v-model:filters-collapsed="filtersCollapsed"
                :active-status-tab="activeStatusTab"
                :plan-filter-user="planFilterUser"
                :page="page"
                :total-pages="totalPages"
                :can-go-prev="paginationCanGoPrev"
                :can-go-next="paginationCanGoNext"
                :pagination-visible="!loadingSubscriptions && paginationVisible"
                :cancelled-count="cancelledCount"
                :action-loading="actionLoading"
                @select-category-tab="onSelectCategoryTab"
                @apply-filters="onApplyFilters"
                @reset-filters="onResetListFilters"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
                @manage="openManageModal"
            />

            <ManageSubscriptionModal
                v-if="displayManageModal"
                v-model:display="displayManageModal"
                :subscription="selectedSubscription"
                :processing="actionLoading"
                :redeem-tokens="manageRedeemTokens"
                :available-token-balance="manageAvailableTokenBalance"
                :max-applicable-tokens="manageMaxApplicableTokens"
                :applied-tokens="manageAppliedTokens"
                :token-discount-eur-cents="manageTokenDiscountEurCents"
                :final-payable-amount-eur-cents="manageFinalPayableAmountEurCents"
                :quote-loading="manageTokenQuoteLoading"
                :preview-summary-text="managePreviewSummaryText"
                @cancel-subscription="onCancellationRequested"
                @reactivate-subscription="onReactivationRequested"
                @change-plan="onPlanChangeRequested"
                @plan-selection-change="onManagePlanSelectionChange"
                @update-redeem-tokens="onManageRedeemTokensUpdated"
            />
        </template>
    </div>
</template>

<script lang="ts">
import { ASYNC_COMPONENT_LOADER_DELAY_MS } from "@/constants/ui";
import { defineAsyncComponent, defineComponent, ref } from "vue";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import { ApiTokensNubem } from "@/api/api-group-tokens-nubem";
import type {
    PreviewChangeResponse,
    SubscriptionNoticeItem,
    SubscriptionStatusItem,
    TokenRedeemQuoteResponse,
    TokensBalanceResponse,
} from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import SubscriptionsListSection from "@/components/routes/dashboard/SubscriptionsListSection.vue";
import { useSubscriptionListFilters } from "@/composables/useSubscriptionListFilters";
import { usePagination } from "@/composables/usePagination";
import { ensureSubscribableLookup, type SubscribableLookupEntry, type SubscriptionPlanOption } from "@/services/subscribable-lookup";
import { SUBSCRIPTION_STATUS_TONE_MAP } from "@/utils/status-badge";
import { AuthController } from "@/control/auth";
import {
    PLAN_LOOKUP_SINGLE_KEY,
    SUBSCRIPTIONS_LIST_PAGE_SIZE,
    SUBSCRIPTION_CATEGORY_TABS,
    badRequestOrgRequiredForMultiLicensePlanHandler,
    normalizeBillingCyclePlanLabel,
    planLookupCycleKey,
    resolveSubscriptionDisplayStatus,
    type SubscriptionCategoryTab,
    type SubscriptionDisplayStatus,
} from "@/utils/subscription-domain";
import { toTitleCase } from "@/utils/text";
import { getUniqueStringId } from "@/utils/unique-id";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";
import { Request } from "@asanrom/request-browser";

const AdminSubscriptionsPanel = defineAsyncComponent({
    loader: () => import("@/components/routes/dashboard/admin/AdminSubscriptionsPanel.vue"),
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const ManageSubscriptionModal = defineAsyncComponent({
    loader: () => import("@/components/modals/ManageSubscriptionModal.vue"),
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

type SubscriptionStatus = SubscriptionDisplayStatus;
type SubscriptionChangeMode = "immediate" | "period_end";
type AgentCategory = Exclude<SubscriptionCategoryTab, "all">;

interface SubscriptionRow {
    id: string;
    agent: string;
    agentType: AgentCategory;
    version: string;
    subscribableType: string;
    subscribableId: string;
    billingCycle: string;
    rawStatus: string;
    cancelAtPeriodEnd: boolean;
    planId: string;
    plan: string;
    planIndex: number | null;
    status: SubscriptionStatus;
    renewalDate: string;
    amount: number | null;
    availablePlans: SubscriptionPlanOption[];
}

interface ManagePlanPayload {
    subscriptionId: string;
    planId: string;
    effective: SubscriptionChangeMode;
}

interface ManageCancelPayload {
    subscriptionId: string;
}

interface ManageReactivatePayload {
    subscriptionId: string;
}

interface ManagePlanSelectionPayload {
    subscriptionId: string;
    planId: string;
    effective: SubscriptionChangeMode;
}

export default defineComponent({
    name: "SubscriptionsPage",
    components: {
        AdminSubscriptionsPanel,
        ManageSubscriptionModal,
        DashboardPageHeader,
        SubscriptionsListSection,
    },
    setup: function () {
        const loadingSubscriptions = ref(false);
        const pagination = usePagination({ loading: loadingSubscriptions, pageSize: SUBSCRIPTIONS_LIST_PAGE_SIZE });
        const listFilters = useSubscriptionListFilters({
            mode: "user",
            page: pagination.page,
            pageSize: ref(SUBSCRIPTIONS_LIST_PAGE_SIZE),
            paginationReset: pagination.reset,
        });

        return {
            filtersCollapsed: listFilters.filtersCollapsed,
            activeCategoryTab: listFilters.activeCategoryTab,
            subscriptionToolbarTabs: listFilters.subscriptionToolbarTabs,
            activeStatusTab: listFilters.activeStatusTab,
            planFilterUser: listFilters.planFilterUser,
            setCategoryTab: listFilters.setCategoryTab,
            onFilterFieldChange: listFilters.onFilterFieldChange,
            resetListFilters: listFilters.resetFilters,
            setCategoryCounts: listFilters.setCategoryCounts,
            buildUserStatusQueryParams: listFilters.buildUserStatusQueryParams,
            subscriptionsStatusRequestId: getUniqueStringId(),
            subscriptionsNoticesRequestId: getUniqueStringId(),
            cancelSubscriptionRequestId: getUniqueStringId(),
            renewSubscriptionRequestId: getUniqueStringId(),
            changePlanRequestId: getUniqueStringId(),
            previewCancelRequestId: getUniqueStringId(),
            previewChangeRequestId: getUniqueStringId(),
            loadingSubscriptions,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
            paginationSetPage: pagination.setPage,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            listPageSize: pagination.pageSize,
        };
    },
    data: function () {
        return {
            subscriptionStatusToneMap: SUBSCRIPTION_STATUS_TONE_MAP,
            subscriptions: [] as SubscriptionRow[],
            total: 0,
            cancelledCount: 0,
            subscriptionListLoadVersion: 0,
            listErrorMessage: "",
            displayManageModal: false,
            selectedSubscriptionId: "",
            actionLoading: false,
            manageSelectedPlanId: "",
            manageRedeemTokens: 0,
            manageTokenBalance: null as TokensBalanceResponse | null,
            manageTokenQuote: null as TokenRedeemQuoteResponse | null,
            manageTokenQuoteLoading: false,
            managePreviewSummaryText: "",
            manageTokensBalanceRequestId: getUniqueStringId(),
            manageTokenQuoteRequestId: getUniqueStringId(),
        };
    },
    computed: {
        isSubscriptionAdmin(): boolean {
            return AuthController.Role === "admin" || AuthController.hasPermission("admin.users.manage");
        },
        selectedSubscription(): SubscriptionRow | null {
            return this.subscriptions.find((subscription) => subscription.id === this.selectedSubscriptionId) || null;
        },
        manageAvailableTokenBalance(): number {
            return Math.max(0, Math.floor(Number(this.manageTokenBalance?.available_tokens) || 0));
        },
        manageMaxApplicableTokens(): number {
            return Math.max(0, Math.floor(Number(this.manageTokenQuote?.maxApplicableTokens) || 0));
        },
        manageAppliedTokens(): number {
            return Math.max(0, Math.floor(Number(this.manageTokenQuote?.appliedTokens) || 0));
        },
        manageTokenDiscountEurCents(): number {
            return Math.max(0, Math.floor(Number(this.manageTokenQuote?.discountEurCents) || 0));
        },
        manageFinalPayableAmountEurCents(): number {
            if (this.manageTokenQuote) {
                return Math.max(0, Math.floor(Number(this.manageTokenQuote.finalAmountEurCents) || 0));
            }

            const selectedSubscription = this.selectedSubscription;
            return selectedSubscription?.amount ? Math.max(0, Math.round(selectedSubscription.amount * 100)) : 0;
        },
    },
    methods: {
        runRequest: function <T>(requestId: string, requestParams: any): Promise<T> {
            return new Promise((resolve, reject) => {
                Request.Abort(requestId);

                Request.Pending(requestId, requestParams)
                    .onSuccess((response) => resolve(response as T))
                    .onRequestError((err) => reject(err))
                    .onUnexpectedError((err) => reject(err));
            });
        },
        toPlanLabel: function (billingCycle: string): string {
            return normalizeBillingCyclePlanLabel(billingCycle);
        },
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
            if (previousTab === this.activeCategoryTab || this.isSubscriptionAdmin) {
                return;
            }
            this.activeStatusTab = "all";
            this.reloadSubscriptionList();
        },
        onApplyFilters: function (payload: { status: string; plan: string; dateFrom: string; dateTo: string }): void {
            this.activeStatusTab = payload.status as typeof this.activeStatusTab;
            this.planFilterUser = payload.plan as typeof this.planFilterUser;
            this.onFilterFieldChange();
            this.reloadSubscriptionList();
        },
        onResetListFilters: function (): void {
            this.resetListFilters();
            this.reloadSubscriptionList();
        },
        onPaginationPrev: function (): void {
            if (!this.paginationGoPrev()) {
                return;
            }
            this.reloadSubscriptionList();
        },
        onPaginationNext: function (): void {
            if (!this.paginationGoNext()) {
                return;
            }
            this.reloadSubscriptionList();
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
        getEstimatedRenewalTimestamp: function (statusItem: SubscriptionStatusItem): number {
            const startTimestamp = statusItem.currentPeriodStart || 0;
            if (startTimestamp <= 0) {
                return 0;
            }

            const cycle = statusItem.billingCycle || "";
            const date = new Date(startTimestamp);

            if (cycle === "monthly") {
                date.setMonth(date.getMonth() + 1);
                return date.getTime();
            }

            if (cycle === "annual") {
                date.setFullYear(date.getFullYear() + 1);
                return date.getTime();
            }

            return 0;
        },
        getPlanChangeMode: function (subscription: SubscriptionRow, targetPlanId: string): SubscriptionChangeMode {
            const targetPlan = subscription.availablePlans.find((plan) => plan.id === targetPlanId);
            if (!targetPlan) {
                return "period_end";
            }

            const normalizedType = (subscription.subscribableType || "").trim().toLowerCase();
            if (normalizedType === "plan") {
                if (subscription.planIndex === null || targetPlan.planIndex === null) {
                    return "period_end";
                }

                return targetPlan.planIndex > subscription.planIndex ? "immediate" : "period_end";
            }

            if (
                subscription.amount === null ||
                subscription.amount === undefined ||
                targetPlan.amount === null ||
                targetPlan.amount === undefined
            ) {
                return "period_end";
            }

            return targetPlan.amount > subscription.amount ? "immediate" : "period_end";
        },
        mapSubscriptionRow: function (
            statusItem: SubscriptionStatusItem,
            lookup: Map<string, SubscribableLookupEntry>,
            notice?: SubscriptionNoticeItem,
        ): SubscriptionRow {
            const isCancellationScheduled = !!statusItem.cancelAtPeriodEnd;
            const normalizedBillingCycle = statusItem.billingCycle || "";
            const isPlanSubscription = statusItem.subscribableType === "plan";
            let lookupEntry = lookup.get(statusItem.subscribableId || "");

            if (isPlanSubscription && !lookupEntry) {
                if (normalizedBillingCycle) {
                    lookupEntry = lookup.get(planLookupCycleKey(normalizedBillingCycle));
                }
                if (!lookupEntry) {
                    lookupEntry = lookup.get(PLAN_LOOKUP_SINGLE_KEY);
                }
            }

            let planLabel = lookupEntry?.planLabel || this.toPlanLabel(statusItem.billingCycle || "");
            let amount: number | null = lookupEntry?.amount ?? null;
            let availablePlans: SubscriptionPlanOption[] = lookupEntry?.availablePlans?.length
                ? lookupEntry.availablePlans
                : [{ id: statusItem.subscribableId || "", label: planLabel, amount: null, planIndex: lookupEntry?.planIndex ?? null }];

            if (isPlanSubscription && lookupEntry?.pricingByCycle && normalizedBillingCycle) {
                if (lookupEntry.pricingByCycle[normalizedBillingCycle] !== undefined) {
                    amount = lookupEntry.pricingByCycle[normalizedBillingCycle];
                }
                planLabel = this.toPlanLabel(statusItem.billingCycle || planLabel);

                const hasCurrentPricingIdInOptions = lookupEntry.availablePlans.some(
                    (planOption) => planOption.id === statusItem.subscribableId,
                );

                if (!hasCurrentPricingIdInOptions) {
                    availablePlans = [
                        {
                            id: statusItem.subscribableId || lookupEntry.planId,
                            label: planLabel,
                            amount,
                            planIndex: lookupEntry.planIndex,
                        },
                    ];
                }
            }

            const renewalTimestamp =
                statusItem.nextRenewalDate ||
                statusItem.currentPeriodEnd ||
                notice?.nextNoticeAt ||
                this.getEstimatedRenewalTimestamp(statusItem);
            const renewalDate = renewalTimestamp > 0 ? new Date(renewalTimestamp).toISOString() : "";
            const agentType = lookupEntry?.agentType || "product";

            return {
                id: statusItem.id,
                agent: lookupEntry?.name || statusItem.subscribableId || statusItem.id,
                agentType,
                version: lookupEntry?.version || toTitleCase(statusItem.subscribableType || "subscription"),
                subscribableType: statusItem.subscribableType || "",
                subscribableId: statusItem.subscribableId || "",
                billingCycle: statusItem.billingCycle || "",
                rawStatus: statusItem.status || "",
                cancelAtPeriodEnd: isCancellationScheduled,
                planId: statusItem.subscribableId || lookupEntry?.planId || "",
                plan: planLabel,
                planIndex: lookupEntry?.planIndex ?? null,
                status: resolveSubscriptionDisplayStatus(statusItem.status || "", isCancellationScheduled),
                renewalDate,
                amount,
                availablePlans,
            };
        },
        setSubscriptionRows: function (rows: SubscriptionRow[]): void {
            this.subscriptions = rows.slice();
        },
        applySubscriptionRows: function (
            statusItems: SubscriptionStatusItem[],
            lookup: Map<string, SubscribableLookupEntry>,
            noticeMap: Map<string, SubscriptionNoticeItem>,
        ): void {
            this.setSubscriptionRows(statusItems.map((item) => this.mapSubscriptionRow(item, lookup, noticeMap.get(item.id))));
            this.loadingSubscriptions = false;
        },
        refreshSubscriptionRowsWithLookup: function (
            loadVersion: number,
            statusItems: SubscriptionStatusItem[],
            noticeMap: Map<string, SubscriptionNoticeItem>,
        ): void {
            ensureSubscribableLookup(
                (key) => this.$t(key),
                (lookup, lookupFailed) => {
                    if (loadVersion !== this.subscriptionListLoadVersion) {
                        return;
                    }

                    this.applySubscriptionRows(statusItems, lookup, noticeMap);
                    if (lookupFailed && !this.listErrorMessage) {
                        this.listErrorMessage = String(this.$t("Unable to resolve some names and prices right now."));
                    }
                },
            );
        },
        loadSubscriptionList: function (): void {
            const loadVersion = this.subscriptionListLoadVersion + 1;
            this.subscriptionListLoadVersion = loadVersion;

            Request.Abort(this.subscriptionsStatusRequestId);
            Request.Abort(this.subscriptionsNoticesRequestId);

            let statusItems: SubscriptionStatusItem[] = [];
            let statusReady = false;
            let noticesReady = false;
            const noticeMap = new Map<string, SubscriptionNoticeItem>();

            const tryApplyRows = () => {
                if (!statusReady) {
                    return;
                }
                if (!noticesReady) {
                    return;
                }
                if (loadVersion !== this.subscriptionListLoadVersion) {
                    return;
                }

                this.applySubscriptionRows(statusItems, new Map<string, SubscribableLookupEntry>(), noticeMap);
                this.refreshSubscriptionRowsWithLookup(loadVersion, statusItems, noticeMap);
            };

            Request.Pending(this.subscriptionsNoticesRequestId, ApiSubscriptions.GetSubscriptionNotices())
                .onSuccess((noticesResponse) => {
                    for (const notice of noticesResponse.notices || []) {
                        noticeMap.set(notice.id, notice);
                    }
                    noticesReady = true;
                    tryApplyRows();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.loadingSubscriptions = false;
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            noticesReady = true;
                            if (statusReady) {
                                tryApplyRows();
                                this.listErrorMessage = String(this.$t("Unable to load renewal dates right now."));
                            }
                        },
                        networkError: () => {
                            noticesReady = true;
                            if (statusReady) {
                                tryApplyRows();
                                this.listErrorMessage = String(this.$t("Unable to load renewal dates right now."));
                            }
                        },
                        serverError: () => {
                            noticesReady = true;
                            if (statusReady) {
                                tryApplyRows();
                                this.listErrorMessage = String(this.$t("Unable to load renewal dates right now."));
                            }
                        },
                    });
                })
                .onUnexpectedError(() => {
                    noticesReady = true;
                    if (statusReady) {
                        tryApplyRows();
                        this.listErrorMessage = String(this.$t("Unable to load renewal dates right now."));
                    }
                });

            Request.Pending(this.subscriptionsStatusRequestId, ApiSubscriptions.GetSubscriptionStatus(this.buildUserStatusQueryParams()))
                .onSuccess((statusResponse) => {
                    statusItems = statusResponse.subscriptions || [];
                    this.paginationApplyListMeta({
                        page: statusResponse.page,
                        totalPages: statusResponse.totalPages,
                    });
                    this.total = statusResponse.total ?? 0;
                    this.cancelledCount = statusResponse.cancelledCount ?? 0;
                    this.setCategoryCounts(statusResponse.categoryCounts || {});
                    statusReady = true;
                    tryApplyRows();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.loadingSubscriptions = false;
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            this.setSubscriptionRows([]);
                            this.loadingSubscriptions = false;
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                        networkError: () => {
                            this.setSubscriptionRows([]);
                            this.loadingSubscriptions = false;
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                        serverError: () => {
                            this.setSubscriptionRows([]);
                            this.loadingSubscriptions = false;
                            this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.setSubscriptionRows([]);
                    this.loadingSubscriptions = false;
                    this.listErrorMessage = String(this.$t("Unable to load subscriptions."));
                });
        },
        reloadSubscriptionList: function (): void {
            this.loadingSubscriptions = true;
            this.listErrorMessage = "";
            this.loadSubscriptionList();
        },
        loadSubscriptions: function (): void {
            this.reloadSubscriptionList();
        },
        resetManageState: function (): void {
            this.manageSelectedPlanId = this.selectedSubscription?.planId || "";
            this.manageRedeemTokens = 0;
            this.manageTokenQuote = null;
            this.manageTokenQuoteLoading = false;
            this.managePreviewSummaryText = "";
        },
        loadManageTokenBalance: async function (): Promise<TokensBalanceResponse | null> {
            if (!AuthController.isAuthenticated) {
                this.manageTokenBalance = null;
                return null;
            }

            try {
                const balance = await this.runRequest<TokensBalanceResponse>(
                    this.manageTokensBalanceRequestId,
                    ApiTokensNubem.GetNubemTokenBalance(),
                );
                this.manageTokenBalance = balance;
                return balance;
            } catch (err) {
                console.error(err);
                this.manageTokenBalance = null;
                return null;
            }
        },
        formatPriceFromCents: function (amountCents: number, currency = "EUR"): string {
            return new Intl.NumberFormat(this.getIntlLocale(), {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
            }).format((Number(amountCents) || 0) / 100);
        },
        buildManageTokenQuote: function (
            amountEurCents: number,
            requestedTokens: number,
            maxApplicableTokens?: number,
            tokenValueEurCents?: number,
        ): TokenRedeemQuoteResponse {
            const availableTokens = this.manageAvailableTokenBalance;
            const normalizedRequestedTokens = Math.max(0, Math.floor(Number(requestedTokens) || 0));
            const resolvedTokenValue = Math.max(
                0,
                Math.floor(Number(tokenValueEurCents) || Number(this.manageTokenBalance?.token_value_eur_cents) || 0),
            );
            const resolvedMaxApplicableTokens = Math.max(0, Math.floor(Number(maxApplicableTokens) || 0));
            const appliedTokens = Math.max(
                0,
                Math.min(normalizedRequestedTokens, availableTokens, resolvedMaxApplicableTokens || availableTokens),
            );
            const discountEurCents = Math.min(appliedTokens * resolvedTokenValue, Math.max(amountEurCents, 0));

            return {
                walletId: "",
                availableTokens,
                requestedTokens: normalizedRequestedTokens,
                appliedTokens,
                maxApplicableTokens: resolvedMaxApplicableTokens || availableTokens,
                discountEurCents,
                finalAmountEurCents: Math.max(Math.max(amountEurCents, 0) - discountEurCents, 0),
            };
        },
        updateManageQuoteFromPreview: function (preview: PreviewChangeResponse, requestedTokens: number): number {
            const maxApplicableTokens = Math.max(0, Math.floor(Number(preview?.token_quote?.max_applicable_tokens) || 0));
            const tokenValueEurCents = Math.max(
                0,
                Math.floor(
                    Number(preview?.token_quote?.token_value_eur_cents) || Number(this.manageTokenBalance?.token_value_eur_cents) || 0,
                ),
            );
            const targetPriceCents = Math.max(0, Math.floor(Number((preview?.target as any)?.price_cents) || 0));
            const normalizedTokens = Math.max(0, Math.min(Math.floor(Number(requestedTokens) || 0), maxApplicableTokens));

            this.manageTokenQuote = this.buildManageTokenQuote(targetPriceCents, normalizedTokens, maxApplicableTokens, tokenValueEurCents);
            this.manageRedeemTokens = normalizedTokens;

            return normalizedTokens;
        },
        buildPlanChangePreviewText: function (preview: PreviewChangeResponse): string {
            const previewType = ((preview?.type || "") + "").toLowerCase();
            const targetPriceCents = Math.max(0, Math.floor(Number((preview?.target as any)?.price_cents) || 0));
            const activationTimestamp = Math.max(0, Math.floor(Number(preview?.scheduled_activation_at) || 0));

            if (previewType === "upgrade_immediate") {
                return `${String(this.$t("The selected plan will be applied immediately."))} ${String(
                    this.$t("Estimated total"),
                )}: ${this.formatPriceFromCents(targetPriceCents)}.`;
            }

            if (activationTimestamp > 0) {
                return `${String(this.$t("The selected plan will start at the end of the current billing cycle."))} ${String(
                    this.$t("Estimated activation"),
                )}: ${this.formatPreviewDate(activationTimestamp)}.`;
            }

            return `${String(this.$t("The selected plan will start at the end of the current billing cycle."))} ${String(
                this.$t("Estimated total"),
            )}: ${this.formatPriceFromCents(targetPriceCents)}.`;
        },
        refreshManagePendingPlanChangeQuote: async function (subscription: SubscriptionRow, planId: string): Promise<void> {
            const targetPlan = subscription.availablePlans.find((plan) => plan.id === planId);
            if (!targetPlan) {
                this.managePreviewSummaryText = "";
                this.manageTokenQuote = null;
                return;
            }

            const amountEurCents = Math.max(0, Math.round(Number(targetPlan.amount || 0) * 100));
            const estimatedTotalText =
                amountEurCents > 0 ? ` ${String(this.$t("Estimated total"))}: ${this.formatPriceFromCents(amountEurCents)}.` : "";
            this.managePreviewSummaryText = `${String(
                this.$t("The selected plan will replace the current pending checkout."),
            )}${estimatedTotalText}`;
            this.manageTokenQuoteLoading = true;

            try {
                const quote = await this.runRequest<TokenRedeemQuoteResponse>(
                    this.manageTokenQuoteRequestId,
                    ApiTokensNubem.PostNubemTokenRedeemQuote({
                        amount_eur_cents: amountEurCents,
                        requested_tokens: this.manageRedeemTokens,
                    }),
                );
                this.manageTokenQuote = quote;
            } catch (err) {
                console.error(err);
                this.manageTokenQuote = this.buildManageTokenQuote(amountEurCents, this.manageRedeemTokens);
            }

            this.manageTokenQuoteLoading = false;
        },
        refreshManagePlanChangePreview: async function (
            subscription: SubscriptionRow,
            planId: string,
            _effective: SubscriptionChangeMode,
        ): Promise<void> {
            if (!subscription.subscribableType || !subscription.subscribableId || !planId || planId === subscription.planId) {
                this.managePreviewSummaryText = "";
                this.manageTokenQuote = null;
                return;
            }

            this.manageTokenQuoteLoading = true;

            try {
                const preview = await this.runRequest<PreviewChangeResponse>(
                    this.previewChangeRequestId,
                    ApiSubscriptions.PreviewChangePlan({
                        subscribable_type: subscription.subscribableType,
                        subscribable_id: subscription.subscribableId,
                        target_subscribable_type: subscription.subscribableType,
                        target_subscribable_id: planId,
                    }),
                );
                this.managePreviewSummaryText = this.buildPlanChangePreviewText(preview);
                this.updateManageQuoteFromPreview(preview, this.manageRedeemTokens);
            } catch (err) {
                console.error(err);
                this.managePreviewSummaryText = String(this.$t("Unable to preview the plan change right now."));
                this.manageTokenQuote = null;
            }

            this.manageTokenQuoteLoading = false;
        },
        refreshManagePreviewState: async function (effective?: SubscriptionChangeMode): Promise<void> {
            const subscription = this.selectedSubscription;
            if (!subscription || !this.displayManageModal) {
                return;
            }

            if (this.manageSelectedPlanId && this.manageSelectedPlanId !== subscription.planId) {
                if (this.isPendingPaymentSubscription(subscription)) {
                    await this.refreshManagePendingPlanChangeQuote(subscription, this.manageSelectedPlanId);
                    return;
                }

                await this.refreshManagePlanChangePreview(subscription, this.manageSelectedPlanId, effective || "period_end");
                return;
            }

            this.managePreviewSummaryText = "";
            this.manageTokenQuote = null;
        },
        isPendingPaymentSubscription: function (subscription: SubscriptionRow): boolean {
            if (subscription.cancelAtPeriodEnd) {
                return false;
            }

            return subscription.status === "pending";
        },
        formatPreviewDate: function (timestamp: number): string {
            if (!timestamp) {
                return "-";
            }

            return new Intl.DateTimeFormat(this.getIntlLocale(), {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(new Date(timestamp));
        },
        getCheckoutReturnUrl: function (): string {
            return window.location.href;
        },
        openCheckoutPage: function (checkoutUrl: string): void {
            window.location.href = checkoutUrl;
        },
        openManageModal: function (subscriptionId: string): void {
            this.selectedSubscriptionId = subscriptionId;
            this.displayManageModal = true;
            this.resetManageState();
            void this.loadManageTokenBalance().then(() => {
                void this.refreshManagePreviewState();
            });
        },
        executePlanChangeRequest: function (
            target: SubscriptionRow,
            planId: string,
            effective: SubscriptionChangeMode,
            redeemTokens: number,
        ): void {
            Request.Abort(this.changePlanRequestId);
            Request.Pending(
                this.changePlanRequestId,
                ApiSubscriptions.ChangeSubscriptionPlan({
                    subscribable_type: target.subscribableType,
                    subscribable_id: target.subscribableId,
                    target_subscribable_id: planId,
                    redeem_tokens: redeemTokens,
                    method: "stripe",
                    effective,
                    success_url: this.getCheckoutReturnUrl(),
                    cancel_url: this.getCheckoutReturnUrl(),
                } as any),
            )
                .onSuccess((response) => {
                    this.actionLoading = false;
                    this.displayManageModal = false;
                    this.selectedSubscriptionId = "";
                    this.$showSnackBar(
                        response.status === "scheduled" ? this.$t("Subscription change scheduled") : this.$t("Subscription updated"),
                    );

                    if (response.checkout_url) {
                        this.openCheckoutPage(response.checkout_url);
                        return;
                    }

                    this.reloadSubscriptionList();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to change the plan.")),
                        badRequestInvalidRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to change the plan.")),
                        badRequestPlanChangeNotAllowed: () =>
                            this.$showMessageModal(
                                this.$t("Plan change not allowed"),
                                this.$t("Plan change is not available for this subscription."),
                            ),
                        badRequestInvalidEffective: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid plan change timing.")),
                        badRequestInvalidMethod: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid payment method.")),
                        badRequestInvalidTargetSubscribableId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Target plan is not valid.")),
                        badRequestInvalidSubscribableId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Current plan is not valid.")),
                        badRequestInvalidSubscribableType: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Current subscription type is not valid.")),
                        badRequestInsufficientTokenBalance: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Not enough tokens in your wallet.")),
                        badRequestTokensExceedLimit: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Too many tokens applied to this plan change.")),
                        badRequestOrgRequiredForMultiLicensePlan: badRequestOrgRequiredForMultiLicensePlanHandler(
                            (title, message) => this.$showMessageModal(title, message),
                            (key) => this.$t(key),
                        ),
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to change the plan.")),
                        networkError: () => this.$showMessageModal(this.$t("Network error"), this.$t("Unable to change the plan.")),
                        serverError: () => this.$showMessageModal(this.$t("Server error"), this.$t("Unable to change the plan.")),
                        forbidden: () => this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to change the plan.")),
                        forbiddenOrgMemberCannotPurchase: () =>
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to change the plan.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoading = false;
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to change the plan."));
                });
        },
        onManagePlanSelectionChange: function (payload: ManagePlanSelectionPayload): void {
            if (!payload.subscriptionId || payload.subscriptionId !== this.selectedSubscriptionId) {
                return;
            }

            this.manageSelectedPlanId = payload.planId;
            void this.refreshManagePreviewState(payload.effective);
        },
        onManageRedeemTokensUpdated: function (tokens: number): void {
            this.manageRedeemTokens = Math.max(0, Math.floor(Number(tokens) || 0));
            void this.refreshManagePreviewState();
        },
        onCancellationRequested: function (payload: ManageCancelPayload): void {
            const target = this.subscriptions.find((subscription) => subscription.id === payload.subscriptionId);
            if (!target || this.actionLoading || target.status !== "active") {
                return;
            }

            this.actionLoading = true;

            Request.Abort(this.previewCancelRequestId);
            Request.Pending(
                this.previewCancelRequestId,
                ApiSubscriptions.PreviewCancelSubscription({
                    subscription_id: target.id,
                }),
            )
                .onSuccess((preview) => {
                    this.actionLoading = false;

                    const previewDate = preview.period_end ? this.formatPreviewDate(preview.period_end) : "";
                    const remainingDays = Number.isFinite(preview.remaining_days) ? preview.remaining_days : null;

                    let confirmationMessage = String(this.$t("This action will cancel the subscription at the end of the current period."));
                    if (previewDate) {
                        confirmationMessage += ` ${String(this.$t("Estimated end date"))}: ${previewDate}.`;
                    }
                    if (remainingDays !== null) {
                        confirmationMessage += ` ${String(this.$t("Remaining days"))}: ${remainingDays}.`;
                    }

                    this.$askUserConfirmation({
                        title: this.$t("Cancel subscription"),
                        message: confirmationMessage,
                        danger: true,
                        callback: () => {
                            this.cancelSubscription(payload.subscriptionId);
                        },
                    });
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to validate cancellation.")),
                        badRequestInvalidSubscriptionId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to validate cancellation.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        temporalError: () =>
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to validate cancellation right now.")),
                        networkError: () =>
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to validate cancellation right now.")),
                        serverError: () =>
                            this.$showMessageModal(this.$t("Server error"), this.$t("Unable to validate cancellation right now.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoading = false;
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to validate cancellation right now."));
                });
        },
        cancelSubscription: function (subscriptionId: string): void {
            const target = this.subscriptions.find((subscription) => subscription.id === subscriptionId);
            if (!target) {
                return;
            }

            this.actionLoading = true;

            Request.Abort(this.cancelSubscriptionRequestId);
            Request.Pending(
                this.cancelSubscriptionRequestId,
                ApiSubscriptions.CancelSubscription({
                    subscription_id: target.id,
                    cancel_at_period_end: true,
                }),
            )
                .onSuccess(() => {
                    this.actionLoading = false;
                    this.displayManageModal = false;
                    this.selectedSubscriptionId = "";
                    this.$showSnackBar(this.$t("Subscription cancellation scheduled"));
                    this.reloadSubscriptionList();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        temporalError: () =>
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to cancel the subscription.")),
                        networkError: () => this.$showMessageModal(this.$t("Network error"), this.$t("Unable to cancel the subscription.")),
                        serverError: () => this.$showMessageModal(this.$t("Server error"), this.$t("Unable to cancel the subscription.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoading = false;
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to cancel the subscription."));
                });
        },
        onReactivationRequested: function (payload: ManageReactivatePayload): void {
            const target = this.subscriptions.find((subscription) => subscription.id === payload.subscriptionId);
            const canReactivate = !!target && (target.status === "cancelled" || target.cancelAtPeriodEnd);
            if (!canReactivate || this.actionLoading) {
                return;
            }

            const isUndoCancellation = !!target.cancelAtPeriodEnd && target.status !== "cancelled";
            this.$askUserConfirmation({
                title: isUndoCancellation ? this.$t("Cancel cancellation") : this.$t("Reactivate plan"),
                message: isUndoCancellation
                    ? this.$t("This will restore automatic renewal at the end of the current period.")
                    : this.$t("Do you want to reactivate this subscription? Billing will resume according to the current plan."),
                danger: false,
                callback: () => {
                    this.renewSubscription(payload.subscriptionId);
                },
            });
        },
        renewSubscription: function (subscriptionId: string): void {
            const target = this.subscriptions.find((subscription) => subscription.id === subscriptionId);
            const canReactivate = !!target && (target.status === "cancelled" || target.cancelAtPeriodEnd);
            if (!canReactivate || this.actionLoading) {
                return;
            }

            this.actionLoading = true;

            Request.Abort(this.renewSubscriptionRequestId);
            Request.Pending(
                this.renewSubscriptionRequestId,
                ApiSubscriptions.RenewSubscription({
                    subscription_id: target.id,
                }),
            )
                .onSuccess(() => {
                    this.actionLoading = false;
                    this.displayManageModal = false;
                    this.selectedSubscriptionId = "";
                    this.$showSnackBar(this.$t("Subscription reactivated"));
                    this.reloadSubscriptionList();
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Subscription cannot be reactivated.")),
                        badRequestInvalidRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Subscription cannot be reactivated.")),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        temporalError: () =>
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to reactivate the subscription.")),
                        networkError: () =>
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to reactivate the subscription.")),
                        serverError: () =>
                            this.$showMessageModal(this.$t("Server error"), this.$t("Unable to reactivate the subscription.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoading = false;
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to reactivate the subscription."));
                });
        },
        onPlanChangeRequested: function (payload: ManagePlanPayload): void {
            const target = this.subscriptions.find((subscription) => subscription.id === payload.subscriptionId);
            if (!target || this.actionLoading) {
                return;
            }

            const nextPlan = target.availablePlans.find((plan) => plan.id === payload.planId);
            if (!nextPlan) {
                return;
            }

            if (nextPlan.id === target.planId) {
                this.$showMessageModal(this.$t("No changes"), this.$t("Select a different plan to continue."));
                return;
            }

            if (!target.subscribableType || !target.subscribableId) {
                this.$showMessageModal(this.$t("Invalid request"), this.$t("Current subscription data is incomplete."));
                return;
            }

            const effective = payload.effective || this.getPlanChangeMode(target, payload.planId);
            const redeemTokens = Math.max(0, Math.floor(Number(this.manageTokenQuote?.appliedTokens) || this.manageRedeemTokens || 0));

            this.actionLoading = true;

            if (this.isPendingPaymentSubscription(target)) {
                this.executePlanChangeRequest(target, payload.planId, effective, redeemTokens);
                return;
            }

            Request.Abort(this.previewChangeRequestId);
            Request.Pending(
                this.previewChangeRequestId,
                ApiSubscriptions.PreviewChangePlan({
                    subscribable_type: target.subscribableType,
                    subscribable_id: target.subscribableId,
                    target_subscribable_type: target.subscribableType,
                    target_subscribable_id: payload.planId,
                }),
            )
                .onSuccess((preview) => {
                    this.managePreviewSummaryText = this.buildPlanChangePreviewText(preview);
                    const normalizedRedeemTokens = this.updateManageQuoteFromPreview(preview, redeemTokens);
                    this.executePlanChangeRequest(target, payload.planId, effective, normalizedRedeemTokens);
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to validate plan change.")),
                        badRequestInvalidSubscribableType: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Current subscription type is not valid.")),
                        temporalError: () => this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to change the plan.")),
                        networkError: () => this.$showMessageModal(this.$t("Network error"), this.$t("Unable to change the plan.")),
                        serverError: () => this.$showMessageModal(this.$t("Server error"), this.$t("Unable to change the plan.")),
                        badRequestInvalidSubscribableId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Current plan is not valid.")),
                        badRequestInvalidTargetSubscribableType: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Target subscription type is not valid.")),
                        badRequestInvalidTargetSubscribableId: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Target plan is not valid.")),
                        badRequestOrgRequiredForMultiLicensePlan: badRequestOrgRequiredForMultiLicensePlanHandler(
                            (title, message) => this.$showMessageModal(title, message),
                            (key) => this.$t(key),
                        ),
                        notFound: () => this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                        notFoundSubscriptionNotFound: () =>
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.actionLoading = false;
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to validate plan change right now."));
                });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.isSubscriptionAdmin ? this.$t("Manage subscriptions") : this.$t("My subscriptions"));
        if (this.isSubscriptionAdmin) {
            return;
        }
        this.syncTabFromRoute();
        this.loadSubscriptions();
    },
    beforeUnmount: function () {
        Request.Abort(this.subscriptionsStatusRequestId);
        Request.Abort(this.subscriptionsNoticesRequestId);
        Request.Abort(this.cancelSubscriptionRequestId);
        Request.Abort(this.renewSubscriptionRequestId);
        Request.Abort(this.changePlanRequestId);
        Request.Abort(this.previewCancelRequestId);
        Request.Abort(this.previewChangeRequestId);
        Request.Abort(this.manageTokensBalanceRequestId);
        Request.Abort(this.manageTokenQuoteRequestId);
    },
    watch: {
        "$route.query.tab": function () {
            this.onRouteTabChanged();
        },
    },
});
</script>
