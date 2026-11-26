<template>
    <div class="page-content org-dashboard-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="isPlatformAdmin ? $t('Administration area') : $t('Personal area')"
            :title="$t('Dashboard')"
            :subtitle="
                isPlatformAdmin
                    ? $t('Monitor platform access, moderation and role management at a glance.')
                    : $t('Summary of your active subscriptions, usage and loyalty balance.')
            "
        />

        <section class="dashboard-kpis" :style="{ '--kpi-columns': visibleHeroKpis.length }">
            <article class="kpi-card" v-for="kpi in visibleHeroKpis" :key="kpi.id">
                <p class="kpi-label">
                    <span class="kpi-label-text">{{ $t(kpi.label) }}</span>
                    <InfoTooltip v-if="kpi.description" :content="$t(kpi.description)" />
                </p>
                <p class="kpi-value">{{ kpi.value }}</p>
                <p class="kpi-hint" :class="{ 'kpi-hint--positive': kpi.positive, 'kpi-hint--negative': kpi.negative }">{{ kpi.hint }}</p>
            </article>
        </section>

        <section v-if="isPlatformAdmin" class="admin-dashboard-content">
            <div class="admin-charts-row">
                <article class="panel-card dashboard-chart-panel">
                    <div class="panel-header">
                        <h2 id="dashboard-chart-revenue">{{ $t("Revenue last 12 months") }}</h2>
                    </div>
                    <DashboardChart v-if="revenueChartOption" labelled-by="dashboard-chart-revenue" :option="revenueChartOption" />
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                </article>

                <article class="panel-card dashboard-chart-panel">
                    <div class="panel-header">
                        <h2 id="dashboard-chart-subscriptions">{{ $t("New vs cancelled subscriptions") }}</h2>
                    </div>
                    <DashboardChart
                        v-if="subscriptionTrendChartOption"
                        labelled-by="dashboard-chart-subscriptions"
                        :option="subscriptionTrendChartOption"
                    />
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                </article>
            </div>

            <div class="admin-analytics-row">
                <article class="panel-card dashboard-chart-panel dashboard-chart-panel--compact">
                    <div class="panel-header">
                        <h2 id="dashboard-chart-status">{{ $t("Subscription status") }}</h2>
                    </div>
                    <DashboardChart
                        v-if="subscriptionStatusChartOption"
                        labelled-by="dashboard-chart-status"
                        :option="subscriptionStatusChartOption"
                        :chart-height="subscriptionStatusChartHeight"
                    />
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                </article>

                <article class="panel-card">
                    <div class="panel-header">
                        <h2>{{ $t("Token economics") }}</h2>
                    </div>
                    <div class="token-kpis">
                        <div class="token-kpi">
                            <p class="token-kpi-label">{{ $t("Available") }}</p>
                            <p class="token-kpi-value">{{ formatInteger(tokenCirculation.availableTokens) }}</p>
                        </div>
                        <div class="token-kpi">
                            <p class="token-kpi-label">{{ $t("Locked") }}</p>
                            <p class="token-kpi-value">{{ formatInteger(tokenCirculation.lockedTokens) }}</p>
                        </div>
                        <div class="token-kpi">
                            <p class="token-kpi-label">{{ $t("EUR equivalent") }}</p>
                            <p class="token-kpi-value">{{ formatMoneyFromCents(tokenCirculation.equivalentEurCents, "EUR") }}</p>
                        </div>
                    </div>
                </article>
            </div>

            <div class="admin-rankings-grid">
                <article class="panel-card panel-card--stacked">
                    <h2>{{ $t("Recent organizations") }}</h2>
                    <ul v-if="topOrganizations.length" class="ranking-list">
                        <li v-for="item in topOrganizations" :key="item.id">
                            <button
                                type="button"
                                class="ranking-item ranking-item-product ranking-item--actionable"
                                :aria-label="$t('View details') + ': ' + item.name"
                                @click="openOrganizationDetail(item.id)"
                            >
                                <div class="ranking-main">
                                    <p class="ranking-name">{{ item.name }}</p>
                                    <p class="ranking-meta">{{ item.meta }}</p>
                                </div>
                                <p class="ranking-value ranking-value--labeled">
                                    <span class="ranking-value-label">{{ $t("CIF / NIF") }}</span>
                                    <span class="ranking-value-data">{{ item.cifNif }}</span>
                                </p>
                            </button>
                        </li>
                    </ul>
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                    <div v-if="showOrganizationsViewMore" class="panel-card-footer">
                        <button type="button" class="panel-link" @click="routeTo('/clients-orgs')">{{ $t("View more") }}</button>
                    </div>
                </article>

                <article class="panel-card panel-card--stacked">
                    <h2>{{ $t("Recent payments") }}</h2>
                    <ul v-if="recentPayments.length" class="ranking-list">
                        <li v-for="item in recentPayments" :key="item.id || item.name">
                            <button
                                type="button"
                                class="ranking-item ranking-item-product ranking-item--actionable"
                                :aria-label="$t('View details') + ': ' + item.name"
                                @click="openPaymentDetail(item.id)"
                            >
                                <div class="ranking-main">
                                    <p class="ranking-name" :title="item.title">{{ item.name }}</p>
                                    <p class="ranking-meta">{{ item.meta }}</p>
                                </div>
                                <p class="ranking-value">{{ item.value }}</p>
                            </button>
                        </li>
                    </ul>
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                    <div v-if="showPaymentsViewMore" class="panel-card-footer">
                        <button type="button" class="panel-link" @click="routeTo('/payments')">{{ $t("View more") }}</button>
                    </div>
                </article>

                <article class="panel-card panel-card--stacked">
                    <h2>{{ $t("Top products and services") }}</h2>
                    <ul v-if="topProductsAndServices.length" class="ranking-list">
                        <li v-for="item in topProductsAndServices" :key="item.name">
                            <div class="ranking-item ranking-item-product">
                                <div class="ranking-main">
                                    <p class="ranking-name">{{ item.name }}</p>
                                    <p class="ranking-meta">{{ item.meta }}</p>
                                </div>
                                <p class="ranking-value">{{ item.value }}</p>
                            </div>
                        </li>
                    </ul>
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                    <div class="panel-card-footer">
                        <button type="button" class="panel-link" @click="routeTo('/admin/catalog')">{{ $t("View more") }}</button>
                    </div>
                </article>
            </div>

            <div class="admin-bottom-row">
                <article class="panel-card panel-card--stacked dashboard-chart-panel dashboard-chart-panel--fill">
                    <div class="panel-header blockchain-panel-header">
                        <div>
                            <h2 id="dashboard-chart-blockchain">{{ $t("Blockchain health") }}</h2>
                            <p class="blockchain-chart-caption">{{ blockchainChartCaption }}</p>
                        </div>
                        <div class="blockchain-period-tabs" role="tablist" :aria-label="$t('Blockchain events period')">
                            <button
                                v-for="period in blockchainChartPeriodOptions"
                                :id="'blockchain-period-tab-' + period.days"
                                :key="'blockchain-period-' + period.days"
                                type="button"
                                class="blockchain-period-tab"
                                :class="{ 'blockchain-period-tab--active': blockchainChartPeriodDays === period.days }"
                                role="tab"
                                :aria-selected="blockchainChartPeriodDays === period.days"
                                aria-controls="blockchain-period-panel"
                                @click="setBlockchainChartPeriod(period.days)"
                            >
                                {{ $t(period.label) }}
                            </button>
                        </div>
                    </div>
                    <div
                        id="blockchain-period-panel"
                        class="blockchain-period-panel"
                        role="tabpanel"
                        :aria-labelledby="'blockchain-period-tab-' + blockchainChartPeriodDays"
                    >
                        <DashboardChart
                            v-if="blockchainChartOption"
                            class="dashboard-echart--fill"
                            labelled-by="dashboard-chart-blockchain"
                            :option="blockchainChartOption"
                        />
                        <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                    </div>
                </article>

                <article class="panel-card panel-card--stacked">
                    <div class="panel-header">
                        <h2>{{ $t("Alerts and activity") }}</h2>
                    </div>
                    <ul v-if="alertItems.length" class="alerts-activity-list">
                        <li class="alert-activity-item" v-for="item in alertItems" :key="item.title">
                            <span class="alert-activity-dot" :class="'alert-dot--' + item.severity"></span>
                            <div class="alert-activity-content">
                                <p class="alert-activity-title">{{ item.title }}</p>
                                <p class="alert-activity-time">{{ item.time }}</p>
                            </div>
                        </li>
                    </ul>
                    <p v-else class="panel-empty">{{ $t("No alerts") }}</p>
                    <div class="panel-card-footer">
                        <button type="button" class="panel-link" @click="routeTo('/notifications')">{{ $t("View all") }}</button>
                    </div>
                </article>
            </div>

            <section v-if="adminActivity.length" class="panel-card">
                <div class="panel-header">
                    <h2>{{ $t("Notifications") }}</h2>
                    <button type="button" class="panel-link" @click="routeTo('/notifications')">{{ $t("View all") }}</button>
                </div>
                <ul class="alerts-list">
                    <li class="alert-item" v-for="activity in adminActivity" :key="activity.id || activity.title">
                        <div class="alert-main">
                            <span class="activity-dot" :class="activity.variantClass"></span>
                            <div class="alert-content">
                                <p class="activity-title">{{ activity.title }}</p>
                                <p class="activity-time">{{ activity.time }}</p>
                            </div>
                        </div>
                        <button type="button" class="panel-link" @click="routeTo('/notifications')">{{ $t("View") }}</button>
                    </li>
                </ul>
            </section>
        </section>

        <section v-else class="content-grid">
            <article class="panel-card">
                <div class="panel-header">
                    <h2>{{ $t("My active agents") }}</h2>
                    <button type="button" class="panel-link">
                        {{ $t("View all") }}
                    </button>
                </div>

                <div class="agent-list">
                    <template v-if="activeAgents.length">
                        <article class="agent-item" v-for="agent in activeAgents" :key="agent.name">
                            <div class="agent-main">
                                <div class="agent-avatar">{{ agent.short }}</div>
                                <div class="agent-details">
                                    <p class="agent-name">{{ agent.name }}</p>
                                    <p class="agent-plan">{{ $t(agent.plan) }}</p>
                                </div>
                            </div>

                            <div class="agent-usage">
                                <p class="agent-usage-label">{{ $t("Usage this month") }}</p>
                                <p class="agent-usage-value">{{ agent.usage }}</p>
                            </div>

                            <button type="button" class="open-button">{{ $t("Open") }}</button>
                        </article>
                    </template>
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                </div>
            </article>

            <article class="panel-card">
                <div class="panel-header">
                    <h2>{{ $t("My subscriptions") }}</h2>
                    <button type="button" class="panel-link" @click="routeTo('/subscriptions')">
                        {{ $t("View all") }}
                    </button>
                </div>

                <div class="agent-list">
                    <template v-if="activeSubscriptions.length">
                        <article
                            class="agent-item"
                            v-for="subscription in activeSubscriptions"
                            :key="subscription.name + subscription.plan"
                        >
                            <div class="agent-main">
                                <div class="agent-avatar">{{ subscription.short }}</div>
                                <div class="agent-details">
                                    <p class="agent-name">{{ subscription.name }}</p>
                                    <p class="agent-plan">{{ $t(subscription.plan) }}</p>
                                </div>
                            </div>

                            <div class="agent-usage">
                                <p class="agent-usage-label">{{ $t("Next renewal") }}</p>
                                <p class="agent-usage-value">{{ subscription.usage }}</p>
                            </div>

                            <button type="button" class="open-button" @click="routeTo('/subscriptions')">{{ $t("Open") }}</button>
                        </article>
                    </template>
                    <p v-else class="panel-empty">{{ $t("No data available") }}</p>
                </div>
            </article>

            <article class="panel-card recent-card">
                <div class="panel-header">
                    <h2>{{ $t("Notifications") }}</h2>
                    <button type="button" class="panel-link" @click="routeTo('/notifications')">{{ $t("View all") }}</button>
                </div>
                <p v-if="notificationsLoading" class="panel-empty">{{ $t("Loading notifications") }}...</p>
                <ul v-else-if="recentActivity.length" class="activity-list">
                    <li class="activity-item" v-for="activity in recentActivity" :key="activity.id || activity.title">
                        <span class="activity-dot" :class="activity.variantClass"></span>
                        <div class="activity-content">
                            <p class="activity-title">{{ activity.title }}</p>
                            <p class="activity-time">{{ activity.time }}</p>
                        </div>
                    </li>
                </ul>
                <p v-else class="panel-empty">{{ $t("No notifications yet") }}</p>
            </article>
        </section>

        <PaymentDetailModal v-if="displayPaymentDetailModal" v-model:display="displayPaymentDetailModal" :payment="paymentDetailView" />
    </div>
</template>

<script lang="ts">
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import { ApiDashboardAdmin } from "@/api/api-group-dashboard-admin";
import type { AdminDashboardSummary } from "@/api/definitions";
import { ApiNotifications } from "@/api/api-group-notifications";
import { ApiOrganizations } from "@/api/api-group-organizations";
import { ApiPayments } from "@/api/api-group-payments";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import { ApiTokensNubem } from "@/api/api-group-tokens-nubem";
import type { Notification as ApiNotification, PaymentListItem, SubscriptionStatusItem } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { ensureSubscribableLookup, resolveSubscribableDisplay } from "@/services/subscribable-lookup";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { formatInteger } from "@/utils/format-number";
import { SUBSCRIPTIONS_LIST_PAGE_SIZE, normalizeBillingCyclePlanLabel } from "@/utils/subscription-domain";
import { getUniqueStringId } from "@/utils/unique-id";
import { getNotificationActivityDotClass, getNotificationTitle } from "@/utils/notification-display";
import { paymentHistoryFilterStatusLabelKey, paymentTypeLabelKey } from "@/utils/payment-history-domain";
import { toTitleCase } from "@/utils/text";
import { routeTo } from "@/utils/route-to";
import {
    buildBlockchainEventsChartOption,
    buildRevenueMonthlyChartOption,
    buildSubscriptionStatusChartOption,
    buildSubscriptionTrendChartOption,
    getSubscriptionStatusChartHeight,
    readDashboardChartPalette,
    sliceBlockchainEventsDaily,
} from "@/utils/dashboard-chart-options";
import { Request } from "@asanrom/request-browser";
import { defineComponent, nextTick } from "vue";
import type { EChartsOption } from "echarts";
import InfoTooltip from "@/components/ui/InfoTooltip.vue";
import DashboardChart from "@/components/utils/DashboardChart.vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaymentDetailModal, { type PaymentDetailView } from "@/components/modals/PaymentDetailModal.vue";

interface ActiveAgent {
    short: string;
    name: string;
    plan: string;
    usage: string;
}

interface ActivityEvent {
    id?: string;
    title: string;
    time: string;
    variantClass: string;
}

interface RankingItem {
    id?: string;
    name: string;
    meta: string;
    value: string;
    title?: string;
}

interface OrganizationRankingItem {
    id: string;
    name: string;
    meta: string;
    cifNif: string;
}

interface HeroKpi {
    id: string;
    label: string;
    value: string;
    hint: string;
    description?: string;
    positive?: boolean;
    negative?: boolean;
}

const DASHBOARD_NOTIFICATIONS_PAGE_SIZE = 5;
const DASHBOARD_RANKING_DISPLAY_LIMIT = 3;

type BlockchainChartPeriodDays = 7 | 14 | 30;

const BLOCKCHAIN_CHART_PERIOD_OPTIONS: Array<{ days: BlockchainChartPeriodDays; label: string }> = [
    { days: 7, label: "Last week" },
    { days: 14, label: "Last 14 days" },
    { days: 30, label: "Last month" },
];

interface DashboardSubscriptionStatusItem extends SubscriptionStatusItem {
    nextRenewalDate?: number;
    currentPeriodEnd?: number;
    currentPeriodStart?: number;
}

function getInitialsFromLabel(label: string): string {
    const chunks = (label || "")
        .trim()
        .split(/[\s_-]+/)
        .filter((chunk) => !!chunk);
    if (!chunks.length) {
        return "?";
    }
    if (chunks.length === 1) {
        return chunks[0].slice(0, 2).toUpperCase();
    }
    return (chunks[0][0] + chunks[1][0]).toUpperCase();
}

function shortAgentLabel(agentId: string): string {
    if (!agentId) {
        return "—";
    }
    return agentId.length > 12 ? agentId.slice(0, 8) + "…" : agentId;
}

type DashboardPaymentStatusVariant = "confirmed" | "pending" | "failed" | "refund";

function getDashboardPaymentStatusVariant(status: string, type: string): DashboardPaymentStatusVariant {
    const normalizedType = (type || "").toLowerCase();
    const normalizedStatus = (status || "").toLowerCase();
    if (normalizedType.includes("refund") || normalizedStatus.includes("refund")) {
        return "refund";
    }
    if (normalizedStatus === "completed" || normalizedStatus === "confirmed") {
        return "confirmed";
    }
    if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
        return "failed";
    }
    return "pending";
}

export default defineComponent({
    name: "DashboardPage",
    components: {
        DashboardChart,
        DashboardPageHeader,
        InfoTooltip,
        PaymentDetailModal,
    },
    setup: function () {
        return {
            dashboardRequestId: getUniqueStringId(),
            organizationsRequestId: getUniqueStringId(),
            paymentsRequestId: getUniqueStringId(),
            notificationsRequestId: getUniqueStringId(),
            userCatalogRequestId: getUniqueStringId(),
            userTokensRequestId: getUniqueStringId(),
            userSubscriptionStatusRequestId: getUniqueStringId(),
            userSubscriptionNoticesRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            isPlatformAdmin: false,
            profileName: "User",
            dashboardSummary: null as AdminDashboardSummary | null,
            activeAgents: [] as ActiveAgent[],
            activeSubscriptions: [] as ActiveAgent[],
            notificationsLoading: false,
            recentActivity: [] as ActivityEvent[],
            adminActivity: [] as ActivityEvent[],
            topOrganizations: [] as OrganizationRankingItem[],
            organizationsTotal: 0,
            recentPayments: [] as RankingItem[],
            recentPaymentRecords: [] as PaymentListItem[],
            paymentsTotal: 0,
            topProductsAndServices: [] as RankingItem[],
            displayPaymentDetailModal: false,
            paymentDetailView: null as PaymentDetailView | null,
            blockchainChartPeriodDays: 7 as BlockchainChartPeriodDays,
            chartThemeRevision: 0,
            userMetrics: [
                { metricKey: "Active subscriptions", value: "—", detail: "No data available" },
                { metricKey: "Available agents", value: "—", detail: "No data available" },
                { metricKey: "Nubem tokens", value: "—", detail: "No data available" },
                { metricKey: "Next renewal", value: "—", detail: "No data available" },
            ] as Array<{ metricKey: string; value: string; detail: string }>,
        };
    },
    computed: {
        showOrganizationsViewMore: function (): boolean {
            return this.organizationsTotal > DASHBOARD_RANKING_DISPLAY_LIMIT;
        },
        showPaymentsViewMore: function (): boolean {
            return this.paymentsTotal > DASHBOARD_RANKING_DISPLAY_LIMIT;
        },
        visibleHeroKpis: function (): HeroKpi[] {
            if (this.isPlatformAdmin) {
                return this.adminHeroKpis;
            }
            return this.userHeroKpis;
        },
        adminHeroKpis: function (): HeroKpi[] {
            const s = this.dashboardSummary;
            if (!s) {
                return [
                    {
                        id: "mrr",
                        label: "MRR",
                        value: "—",
                        hint: this.$t("Loading") + "...",
                        description:
                            "Estimated monthly recurring revenue from all active subscriptions, with annual plans normalized to a monthly amount.",
                    },
                    {
                        id: "arr",
                        label: "ARR",
                        value: "—",
                        hint: "",
                        description: "Estimated annual recurring revenue, calculated as the current MRR multiplied by 12.",
                    },
                    { id: "active-subs", label: "Active subscriptions", value: "—", hint: "" },
                    { id: "total-users", label: "Total users", value: "—", hint: "" },
                    { id: "active-orgs", label: "Active organizations", value: "—", hint: "" },
                    { id: "month-revenue", label: "Month revenue", value: "—", hint: "" },
                ];
            }

            const mrrVariation = s.mrr.variationPct;
            const monthVariation = s.currentMonthRevenue.variationPct;

            return [
                {
                    id: "mrr",
                    label: "MRR",
                    value: formatMoneyFromCents(s.mrr.currentCents, "EUR", { maximumFractionDigits: 0 }),
                    hint: this.formatVariation(mrrVariation),
                    description:
                        "Estimated monthly recurring revenue from all active subscriptions, with annual plans normalized to a monthly amount.",
                    positive: mrrVariation != null && mrrVariation > 0,
                    negative: mrrVariation != null && mrrVariation < 0,
                },
                {
                    id: "arr",
                    label: "ARR",
                    value: formatMoneyFromCents(s.arr.currentCents, "EUR", { maximumFractionDigits: 0 }),
                    hint: this.$t("Annualized"),
                    description: "Estimated annual recurring revenue, calculated as the current MRR multiplied by 12.",
                },
                {
                    id: "active-subs",
                    label: "Active subscriptions",
                    value: formatInteger(s.activeSubscriptions.total),
                    hint: `${formatInteger(s.activeSubscriptions.plan)} ${this.$t("plans")}`,
                },
                {
                    id: "total-users",
                    label: "Total users",
                    value: formatInteger(s.totalUsers.total),
                    hint: `+${formatInteger(s.totalUsers.newLast30Days)} ${this.$t("new in 30 days")}`,
                    positive: s.totalUsers.newLast30Days > 0,
                },
                {
                    id: "active-orgs",
                    label: "Active organizations",
                    value: formatInteger(s.activeOrganizations.total),
                    hint: `${formatInteger(s.activeOrganizations.totalMembers)} ${this.$t("members")}`,
                },
                {
                    id: "month-revenue",
                    label: "Month revenue",
                    value: formatMoneyFromCents(s.currentMonthRevenue.cents, "EUR", { maximumFractionDigits: 0 }),
                    hint: this.formatVariation(monthVariation),
                    positive: monthVariation > 0,
                    negative: monthVariation < 0,
                },
            ];
        },
        userHeroKpis: function (): HeroKpi[] {
            return this.userMetrics.map((m) => ({
                id: m.metricKey,
                label: m.metricKey,
                value: m.value,
                hint: m.detail,
            }));
        },
        revenueMonthly: function (): Array<{ month: string; revenueCents: number; transactionCount: number }> {
            return this.dashboardSummary?.revenueMonthly || [];
        },
        subscriptionStatusEntries: function (): Array<{ status: string; count: number }> {
            const dist = this.dashboardSummary?.subscriptionStatusDistribution || {};
            return Object.entries(dist)
                .map(([status, count]) => ({ status, count: count as number }))
                .filter((entry) => entry.count > 0)
                .sort((a, b) => b.count - a.count);
        },
        subscriptionTrend: function (): Array<{ month: string; created: number; cancelled: number }> {
            return this.dashboardSummary?.subscriptionTrend || [];
        },
        tokenCirculation: function (): { availableTokens: number; lockedTokens: number; equivalentEurCents: number } {
            return this.dashboardSummary?.tokenCirculation || { availableTokens: 0, lockedTokens: 0, equivalentEurCents: 0 };
        },
        blockchainChartPeriodOptions: function (): Array<{ days: BlockchainChartPeriodDays; label: string }> {
            return BLOCKCHAIN_CHART_PERIOD_OPTIONS;
        },
        blockchainEventsForChart: function (): Array<{ day: string; eventCount: number }> {
            const points = this.dashboardSummary?.blockchainEventsDaily || [];
            return sliceBlockchainEventsDaily(points, this.blockchainChartPeriodDays);
        },
        blockchainChartCaption: function (): string {
            if (this.blockchainChartPeriodDays === 14) {
                return this.$t("Events per day (last 14 days)");
            }
            if (this.blockchainChartPeriodDays === 30) {
                return this.$t("Events per day (last month)");
            }
            return this.$t("Events per day (last week)");
        },
        chartPalette: function () {
            void this.chartThemeRevision;
            return readDashboardChartPalette();
        },
        revenueChartOption: function (): EChartsOption | null {
            if (!this.revenueMonthly.length) {
                return null;
            }
            return buildRevenueMonthlyChartOption(
                this.revenueMonthly,
                this.formatMonthLabel,
                this.formatMoneyShort,
                this.$t("Revenue"),
                this.chartPalette,
            );
        },
        subscriptionTrendChartOption: function (): EChartsOption | null {
            if (!this.subscriptionTrend.length) {
                return null;
            }
            return buildSubscriptionTrendChartOption(
                this.subscriptionTrend,
                this.formatMonthLabel,
                {
                    created: this.$t("New (subscriptions)"),
                    cancelled: this.$t("Cancelled (trend)"),
                },
                this.chartPalette,
            );
        },
        subscriptionStatusChartHeight: function (): number {
            return getSubscriptionStatusChartHeight(this.subscriptionStatusEntries.length);
        },
        subscriptionStatusChartOption: function (): EChartsOption | null {
            if (!this.subscriptionStatusEntries.length) {
                return null;
            }
            return buildSubscriptionStatusChartOption(
                this.subscriptionStatusEntries.map((entry) => ({
                    status: entry.status,
                    count: entry.count,
                    label: this.formatStatusLabel(entry.status),
                })),
                this.chartPalette,
                this.$t("Count") + "",
            );
        },
        blockchainChartOption: function (): EChartsOption | null {
            if (!this.blockchainEventsForChart.length) {
                return null;
            }
            return buildBlockchainEventsChartOption(
                this.blockchainEventsForChart,
                this.formatDayChartLabel,
                this.chartPalette,
                this.$t("Events") + "",
            );
        },
        alertItems: function (): Array<{ title: string; time: string; severity: string }> {
            const items: Array<{ title: string; time: string; severity: string }> = [];
            const s = this.dashboardSummary;
            if (!s) {
                return items;
            }

            if (s.paymentHealth.failedPaymentsCount > 0) {
                items.push({
                    title: `${formatInteger(s.paymentHealth.failedPaymentsCount)} ${this.$t("failed payments")}`,
                    time: this.$t("Last 90 days"),
                    severity: "error",
                });
            }
            if (s.paymentHealth.suspendedSubscriptions > 0) {
                items.push({
                    title: `${formatInteger(s.paymentHealth.suspendedSubscriptions)} ${this.$t("suspended subscriptions")}`,
                    time: this.$t("Require attention"),
                    severity: "warning",
                });
            }
            if (s.pendingOrgRequests > 0) {
                items.push({
                    title: `${formatInteger(s.pendingOrgRequests)} ${this.$t("pending organization requests")}`,
                    time: this.$t("Awaiting review"),
                    severity: "warning",
                });
            }
            if (s.pendingVCRequests > 0) {
                items.push({
                    title: `${formatInteger(s.pendingVCRequests)} ${this.$t("pending VC requests")}`,
                    time: this.$t("Awaiting review"),
                    severity: "info",
                });
            }
            if (s.traceabilityFailedCount > 0) {
                items.push({
                    title: `${formatInteger(s.traceabilityFailedCount)} ${this.$t("blockchain events failed")}`,
                    time: this.$t("Needs investigation"),
                    severity: "error",
                });
            }

            for (const activity of (s.recentActivity || []).slice(0, 5)) {
                items.push({
                    title: activity.title,
                    time: this.formatActivityTime(activity.timestamp),
                    severity: activity.severity,
                });
            }

            return items;
        },
    },
    methods: {
        formatMoneyFromCents,
        formatInteger,
        routeTo: function (target: string | Record<string, any>) {
            return routeTo(this, target);
        },
        openOrganizationDetail: function (organizationId: string) {
            if (!organizationId) {
                return;
            }
            this.routeTo({
                name: "clients-org-detail",
                params: { organizationId },
            });
        },
        openPaymentDetail: function (paymentId: string | undefined) {
            if (!paymentId) {
                return;
            }
            const payment = this.recentPaymentRecords.find((record) => record.id === paymentId);
            if (!payment) {
                return;
            }
            this.paymentDetailView = this.buildPaymentDetailView(payment);
            this.displayPaymentDetailModal = true;
        },
        buildPaymentDetailView: function (payment: PaymentListItem): PaymentDetailView {
            const statusVariant = getDashboardPaymentStatusVariant(payment.status, payment.type);
            const billingCycle = normalizeBillingCyclePlanLabel(payment.billingCycle || "");
            const methodParts = [this.formatRecentPaymentName(payment.type)];
            if (billingCycle) {
                methodParts.push(this.$t(billingCycle));
            }
            const subscribableId = (payment.subscribableId || "").trim();
            const profileName = AuthController.ProfileName || AuthController.Username;
            const clientName = ((payment.username || "") + "").trim() || ((payment.uid || "") + "").trim() || profileName;

            return {
                paymentId: payment.id,
                statusDisplay: this.$t(paymentHistoryFilterStatusLabelKey(payment.status || "")),
                statusVariant,
                amount: formatMoneyFromCents(payment.amountCents || 0, payment.currency || "EUR"),
                client: clientName || String(this.$t("Account")),
                method: methodParts.filter((part) => part && part !== "—").join(" · ") || "—",
                date: new Date(payment.createdAt || 0).toLocaleString(this.getIntlLocale()),
                reference: subscribableId || undefined,
                provider: payment.provider ? toTitleCase(payment.provider) : undefined,
            };
        },
        setBlockchainChartPeriod: function (days: number) {
            if (days === 7 || days === 14 || days === 30) {
                this.blockchainChartPeriodDays = days;
            }
        },
        onChartThemeChanged: function () {
            nextTick(() => {
                this.chartThemeRevision++;
            });
        },
        formatVariation: function (pct: number | null | undefined): string {
            if (pct == null) {
                return "—";
            }
            if (pct > 0) {
                return "▲ " + pct + "%";
            }
            if (pct < 0) {
                return "▼ " + Math.abs(pct) + "%";
            }
            return "— 0%";
        },
        formatMoneyShort: function (cents: number): string {
            if (!cents) {
                return "€0";
            }
            const eur = cents / 100;
            if (eur >= 1000) {
                return "€" + (eur / 1000).toFixed(1) + "k";
            }
            return "€" + eur.toFixed(0);
        },
        formatMonthLabel: function (month: string): string {
            if (!month) {
                return "";
            }
            const parts = month.split("-");
            if (parts.length < 2) {
                return month;
            }
            const monthIndex = parseInt(parts[1], 10) - 1;
            const date = new Date(2000, monthIndex, 1);
            const locale = this.getIntlLocale();
            return date.toLocaleString(locale, { month: "short" });
        },
        formatDayChartLabel: function (day: string): string {
            if (!day) {
                return "";
            }
            const parts = day.split("-");
            if (parts.length < 3) {
                return day;
            }
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const dateNum = parseInt(parts[2], 10);
            const date = new Date(year, month, dateNum);
            return date.toLocaleDateString(this.getIntlLocale(), { day: "2-digit", month: "short" });
        },
        formatCatalogItemTypeLabel: function (type: string): string {
            if (type === "ITAAS Platform") {
                return this.$t("ITAAS Platform");
            }
            if (type === "Digital Product") {
                return this.$t("Product");
            }
            if (type === "Recurring Service") {
                return this.$t("Service");
            }
            return type ? this.$t(type) : "—";
        },
        formatCatalogItemStatusLabel: function (status: string): string {
            return status ? this.$t(status) : "—";
        },
        formatStatusLabel: function (status: string): string {
            if (status === "Active") {
                return this.$t("Active (status chart)");
            }
            if (status === "Cancelled") {
                return this.$t("Cancelled (status chart)");
            }
            if (status === "Pending") {
                return this.$t("Pending");
            }
            if (status === "Suspended") {
                return this.$t("Suspended (status chart)");
            }
            if (status === "Past Due") {
                return this.$t("Past due");
            }
            if (status === "Pending Payment") {
                return this.$t("Pending payment");
            }
            if (status === "Scheduled Cancellation") {
                return this.$t("Scheduled cancellation");
            }
            if (status === "Complete") {
                return this.$t("Complete");
            }
            return status;
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
        formatActivityTime: function (timestamp: number): string {
            if (!timestamp) {
                return this.$t("No data available");
            }
            const HOUR = 60 * 60 * 1000;
            const DAY = 24 * HOUR;
            const diffMs = Date.now() - timestamp;
            if (diffMs < 0) {
                return this.formatShortDate(timestamp);
            }
            if (diffMs < HOUR) {
                return this.$t("Just now");
            }
            if (diffMs < DAY) {
                return this.$t("Today") + " · " + Math.floor(diffMs / HOUR) + " h";
            }
            if (diffMs < 2 * DAY) {
                return this.$t("Yesterday");
            }
            if (diffMs < 7 * DAY) {
                return Math.floor(diffMs / DAY) + " " + this.$t("days ago");
            }
            return this.formatShortDate(timestamp);
        },
        formatShortDate: function (timestamp: number): string {
            if (!timestamp) {
                return "—";
            }
            return new Date(timestamp).toLocaleDateString(this.getIntlLocale(), { day: "2-digit", month: "short" });
        },
        toPlanLabel: function (billingCycle: string): string {
            return normalizeBillingCyclePlanLabel(billingCycle);
        },
        setUserMetric: function (metricKey: string, value: string, detail: string) {
            const index = this.userMetrics.findIndex((metric) => metric.metricKey === metricKey);
            if (index < 0) {
                return;
            }
            this.userMetrics[index] = { metricKey, value, detail };
        },
        applyNoOrganizationFallback: function () {
            this.setUserMetric("Active subscriptions", "0", this.$t("No active subscriptions"));
            this.setUserMetric("Next renewal", "—", this.$t("No active renewals"));
            this.activeAgents = [];
            this.activeSubscriptions = [];
        },
        getEstimatedRenewalTimestamp: function (subscription: DashboardSubscriptionStatusItem): number {
            const startTimestamp = subscription.currentPeriodStart || 0;
            if (startTimestamp <= 0) {
                return 0;
            }
            const cycle = (subscription.billingCycle || "").trim().toLowerCase();
            const date = new Date(startTimestamp);
            if (cycle === "monthly") {
                date.setMonth(date.getMonth() + 1);
                return date.getTime();
            }
            if (cycle === "annual" || cycle === "yearly") {
                date.setFullYear(date.getFullYear() + 1);
                return date.getTime();
            }
            return 0;
        },
        getSubscriptionRenewalTimestamp: function (subscription: DashboardSubscriptionStatusItem): number {
            return subscription.nextRenewalDate || subscription.currentPeriodEnd || this.getEstimatedRenewalTimestamp(subscription);
        },
        applyTopSubscribedCatalogItems: function (summary: AdminDashboardSummary | null) {
            const data = summary?.topSubscribedCatalogItems;
            this.topProductsAndServices = (data?.items ?? []).map((item) => ({
                name: item.name,
                meta: `${this.formatCatalogItemTypeLabel(item.type)} · ${this.formatCatalogItemStatusLabel(item.status)}`,
                value: `${formatInteger(item.subscriptionCount)} ${this.$t("subscriptions")}`,
            }));
        },
        loadOrganizationData: function () {
            Request.Abort(this.organizationsRequestId);
            Request.Pending(this.organizationsRequestId, ApiOrganizations.ListOrganizations({ page: 1, pageSize: 25 }))
                .onSuccess((list) => {
                    this.organizationsTotal = typeof list.total === "number" ? list.total : (list.items || []).length;
                    this.topOrganizations = (list.items || [])
                        .slice()
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                        .slice(0, DASHBOARD_RANKING_DISPLAY_LIMIT)
                        .map((item) => ({
                            id: item.id,
                            name: item.companyName || this.$t("No data available"),
                            meta: `${item.country || "—"} · ${this.formatShortDate(item.createdAt)} · ${
                                item.isActive ? this.$t("Active") : this.$t("Inactive")
                            }`,
                            cifNif: item.cifNif || "—",
                        }));
                })
                .onRequestError(() => null)
                .onUnexpectedError(() => null);
        },
        formatRecentPaymentName: function (type: string): string {
            const normalizedType = (type || "").trim().toLowerCase();
            const labelKey = paymentTypeLabelKey(type);
            if (labelKey && labelKey !== normalizedType) {
                return this.$t(labelKey);
            }
            return toTitleCase(type || "Payment");
        },
        loadPaymentsData: function () {
            Request.Abort(this.paymentsRequestId);
            Request.Pending(this.paymentsRequestId, ApiPayments.ListPayments({ page: "1", pageSize: "25" }))
                .onSuccess((list) => {
                    this.paymentsTotal = typeof list.total === "number" ? list.total : (list.payments || []).length;
                    const sortedPayments = (list.payments || [])
                        .slice()
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                        .slice(0, DASHBOARD_RANKING_DISPLAY_LIMIT);
                    this.recentPaymentRecords = sortedPayments;
                    this.recentPayments = sortedPayments.map((payment) => ({
                        id: payment.id,
                        name: this.formatRecentPaymentName(payment.type),
                        meta: `${this.$t(paymentHistoryFilterStatusLabelKey(payment.status || ""))} · ${this.formatShortDate(
                            payment.createdAt,
                        )}`,
                        value: formatMoneyFromCents(payment.amountCents || 0, payment.currency || "EUR"),
                        title: payment.id,
                    }));
                })
                .onRequestError(() => null)
                .onUnexpectedError(() => null);
        },
        loadFallbackAdminData: function () {
            this.applyTopSubscribedCatalogItems(null);
            this.loadOrganizationData();
            this.loadPaymentsData();
        },
        loadAdminDashboardData: function () {
            if (!this.isPlatformAdmin) {
                return;
            }

            Request.Abort(this.dashboardRequestId);
            this.dashboardSummary = null;
            this.applyTopSubscribedCatalogItems(null);

            Request.Pending(this.dashboardRequestId, ApiDashboardAdmin.GetDashboardSummary())
                .onSuccess((summary) => {
                    this.dashboardSummary = summary;
                    this.applyTopSubscribedCatalogItems(summary);

                    this.loadOrganizationData();
                    this.loadPaymentsData();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => this.loadFallbackAdminData(),
                        temporalError: () => this.loadFallbackAdminData(),
                    });
                })
                .onUnexpectedError(() => {
                    this.loadFallbackAdminData();
                });

            this.loadDashboardNotifications();
        },
        mapNotificationToActivity: function (notification: ApiNotification): ActivityEvent {
            return {
                id: notification.id,
                title: getNotificationTitle(notification, this.$t.bind(this)),
                time: this.formatActivityTime(notification.date || 0),
                variantClass: getNotificationActivityDotClass(notification),
            };
        },
        applyNotificationActivities: function (notifications: ApiNotification[]) {
            const events = notifications
                .slice(0, DASHBOARD_NOTIFICATIONS_PAGE_SIZE)
                .map((notification) => this.mapNotificationToActivity(notification));
            if (this.isPlatformAdmin) {
                this.adminActivity = events;
            } else {
                this.recentActivity = events;
            }
        },
        clearNotificationActivities: function () {
            if (this.isPlatformAdmin) {
                this.adminActivity = [];
            } else {
                this.recentActivity = [];
            }
        },
        loadDashboardNotifications: function () {
            Request.Abort(this.notificationsRequestId);
            this.notificationsLoading = true;

            Request.Pending(
                this.notificationsRequestId,
                ApiNotifications.ListNotifications({
                    page: 1,
                    pageSize: DASHBOARD_NOTIFICATIONS_PAGE_SIZE,
                }),
            )
                .onSuccess((response) => {
                    this.applyNotificationActivities(response.notifications || []);
                    this.notificationsLoading = false;
                })
                .onRequestError(() => {
                    this.clearNotificationActivities();
                    this.notificationsLoading = false;
                })
                .onUnexpectedError(() => {
                    this.clearNotificationActivities();
                    this.notificationsLoading = false;
                });
        },
        loadUserCatalog: function () {
            Request.Abort(this.userCatalogRequestId);
            Request.Pending(this.userCatalogRequestId, ApiCatalogItems.GetPublicCatalogItems({ type: "agent", page: 1, pageSize: 25 }))
                .onSuccess((list) => {
                    const total = list.total ?? (list.items || []).length;
                    this.setUserMetric(
                        "Available agents",
                        formatInteger(total),
                        total > 0 ? this.$t("Items in marketplace") : this.$t("No agents available"),
                    );
                })
                .onRequestError(() => {
                    this.setUserMetric("Available agents", "—", "No data available");
                })
                .onUnexpectedError(() => {
                    this.setUserMetric("Available agents", "—", "No data available");
                });
        },
        loadUserTokens: function () {
            Request.Abort(this.userTokensRequestId);
            Request.Pending(this.userTokensRequestId, ApiTokensNubem.GetNubemTokenBalance())
                .onSuccess((balance) => {
                    const available = balance.available_tokens || 0;
                    const locked = balance.locked_tokens || 0;
                    this.setUserMetric(
                        "Nubem tokens",
                        formatInteger(available),
                        locked > 0 ? `${formatInteger(locked)} ${this.$t("locked")}` : this.$t("No locked tokens"),
                    );
                })
                .onRequestError(() => {
                    this.setUserMetric("Nubem tokens", "—", "No data available");
                })
                .onUnexpectedError(() => {
                    this.setUserMetric("Nubem tokens", "—", "No data available");
                });
        },
        loadUserSubscriptionStatus: function () {
            Request.Abort(this.userSubscriptionStatusRequestId);
            Request.Pending(
                this.userSubscriptionStatusRequestId,
                ApiSubscriptions.GetSubscriptionStatus({
                    page: "1",
                    pageSize: String(SUBSCRIPTIONS_LIST_PAGE_SIZE),
                    display_status: "active",
                }),
            )
                .onSuccess((response) => {
                    const activeCount = response.total ?? 0;
                    const subscriptions = (response.subscriptions || []) as DashboardSubscriptionStatusItem[];

                    if (activeCount === 0) {
                        this.applyNoOrganizationFallback();
                        return;
                    }

                    ensureSubscribableLookup(
                        (key) => this.$t(key),
                        (lookup, lookupFailed) => {
                            const mappedSubscriptions = subscriptions.map((sub) => {
                                const display = resolveSubscribableDisplay(
                                    lookup,
                                    sub.subscribableId || "",
                                    sub.subscribableType || "",
                                    sub.billingCycle || "",
                                );
                                const resolvedName = display.name || shortAgentLabel(sub.subscribableId || "");
                                const resolvedPlan = display.planLabel || this.toPlanLabel(sub.billingCycle || "");
                                const renewalTimestamp = this.getSubscriptionRenewalTimestamp(sub);
                                const renewalLabel = renewalTimestamp > 0 ? this.formatShortDate(renewalTimestamp) : "—";
                                const statusLabel = sub.status ? toTitleCase(sub.status) : this.$t("No data available");

                                return { resolvedName, resolvedPlan, renewalTimestamp, renewalLabel, statusLabel };
                            });

                            const subscriptionsDetail = mappedSubscriptions
                                .slice(0, 3)
                                .map((s) => s.resolvedName)
                                .join(", ");

                            this.setUserMetric(
                                "Active subscriptions",
                                formatInteger(activeCount),
                                subscriptionsDetail || this.$t("No active subscriptions"),
                            );

                            const nextRenewalTimestamp =
                                mappedSubscriptions
                                    .map((s) => s.renewalTimestamp)
                                    .filter((ts) => ts > 0)
                                    .sort((a, b) => a - b)[0] || 0;

                            if (nextRenewalTimestamp > 0) {
                                this.setUserMetric(
                                    "Next renewal",
                                    this.formatShortDate(nextRenewalTimestamp),
                                    lookupFailed ? this.$t("Estimated from billing cycle") : this.$t("Based on active subscriptions"),
                                );
                            } else {
                                this.setUserMetric("Next renewal", "—", this.$t("No active renewals"));
                            }

                            this.activeAgents = mappedSubscriptions.slice(0, 5).map((s) => ({
                                short: getInitialsFromLabel(s.resolvedName),
                                name: s.resolvedName,
                                plan: s.resolvedPlan,
                                usage: s.statusLabel,
                            }));

                            this.activeSubscriptions = mappedSubscriptions.slice(0, 5).map((s) => ({
                                short: getInitialsFromLabel(s.resolvedName),
                                name: s.resolvedName,
                                plan: s.resolvedPlan,
                                usage: s.renewalLabel,
                            }));
                        },
                    );
                })
                .onRequestError(() => {
                    this.applyNoOrganizationFallback();
                })
                .onUnexpectedError(() => {
                    this.applyNoOrganizationFallback();
                });
        },
        loadUserSubscriptionNotices: function () {
            Request.Abort(this.userSubscriptionNoticesRequestId);
            Request.Pending(this.userSubscriptionNoticesRequestId, ApiSubscriptions.GetSubscriptionNotices())
                .onSuccess((response) => {
                    const notices = (response.notices || []).slice().sort((a, b) => (a.nextNoticeAt || 0) - (b.nextNoticeAt || 0));
                    const nextUpcomingNotice = notices.find((notice) => (notice.nextNoticeAt || 0) > Date.now());
                    if (nextUpcomingNotice) {
                        this.setUserMetric(
                            "Next renewal",
                            this.formatShortDate(nextUpcomingNotice.nextNoticeAt),
                            nextUpcomingNotice.status ? toTitleCase(nextUpcomingNotice.status) : this.$t("No data available"),
                        );
                    }
                })
                .onRequestError(() => null)
                .onUnexpectedError(() => null);
        },
        loadUserDashboardData: function () {
            if (this.isPlatformAdmin) {
                return;
            }
            this.loadUserSubscriptionStatus();
            this.loadUserSubscriptionNotices();
            this.loadUserTokens();
            this.loadUserCatalog();
            this.loadDashboardNotifications();
        },
        refreshAuthContext: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }

            this.isPlatformAdmin = AuthController.Role === "admin";
            this.profileName = AuthController.ProfileName || AuthController.Username || "User";
            if (this.isPlatformAdmin) {
                this.loadAdminDashboardData();
            } else {
                this.loadUserDashboardData();
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.refreshAuthContext.bind(this));
        this.$listenOnAppEvent("theme-changed", this.onChartThemeChanged.bind(this));
        this.refreshAuthContext();
        this.$setSubTitle(this.$t("Dashboard"));
    },
    beforeUnmount: function () {
        Request.Abort(this.dashboardRequestId);
        Request.Abort(this.organizationsRequestId);
        Request.Abort(this.paymentsRequestId);
        Request.Abort(this.notificationsRequestId);
        Request.Abort(this.userCatalogRequestId);
        Request.Abort(this.userTokensRequestId);
        Request.Abort(this.userSubscriptionStatusRequestId);
        Request.Abort(this.userSubscriptionNoticesRequestId);
    },
});
</script>

<style scoped>
@import "@/style/layout/dashboard-charts.css";
.summary-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(var(--summary-columns, 4), minmax(0, 1fr));
    gap: var(--space-16);
}

.summary-card {
    width: 100%;
    min-width: 0;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-1);
    border: 1px solid var(--color-neutral-light);
    padding: var(--space-16);
}

.summary-label {
    margin: 0 0 var(--space-8) 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    margin: 0 0 var(--space-4) 0;
    font-size: 32px;
    line-height: 40px;
    font-weight: 700;
}

.content-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-16);
}

.recent-card {
    grid-column: 1 / -1;
}

.panel-card {
    width: 100%;
    min-width: 0;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    box-shadow: var(--elevation-1);
    border: 1px solid var(--color-neutral-light);
    padding: var(--space-16);
}

.org-dashboard-page .dashboard-kpis {
    grid-template-columns: repeat(var(--kpi-columns, 6), minmax(0, 1fr));
}

.org-dashboard-page .kpi-card {
    min-width: 0;
}

.admin-dashboard-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
}

.admin-charts-row,
.admin-analytics-row,
.admin-bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-16);
}

.admin-rankings-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-16);
}

.token-kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-16);
}

.token-kpi {
    text-align: center;
}

.token-kpi-label {
    margin: 0 0 var(--space-4) 0;
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.token-kpi-value {
    margin: 0;
    font-size: 24px;
    line-height: 32px;
    font-weight: 700;
}

.blockchain-panel-header {
    align-items: flex-start;
}

.blockchain-chart-caption {
    margin: var(--space-4) 0 0 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.alerts-activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.alert-activity-item {
    display: flex;
    gap: var(--space-12);
    align-items: flex-start;
    padding: var(--space-12) 0;
    border-bottom: 1px solid var(--color-neutral-light);
}

.alert-activity-item:first-child {
    padding-top: 0;
}

.alert-activity-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
}

.alert-activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
}

.alert-dot--error {
    background: var(--color-feedback-error, #ef4444);
}

.alert-dot--warning {
    background: var(--color-feedback-warning, #f59e0b);
}

.alert-dot--info {
    background: var(--color-brand-primary);
}

.alert-dot--success {
    background: var(--color-feedback-success, #22c55e);
}

.alert-activity-content {
    flex: 1;
    min-width: 0;
}

.alert-activity-title {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
}

.alert-activity-time {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    color: var(--color-text-muted);
}

.kpi-hint--positive {
    color: var(--color-feedback-success, #22c55e);
}

.kpi-hint--negative {
    color: var(--color-feedback-error, #ef4444);
}

.panel-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-12);
    align-items: center;
    margin-bottom: var(--space-16);
}

.panel-header h2 {
    margin: 0;
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
}

.panel-card--stacked {
    display: flex;
    flex-direction: column;
}

.panel-card--stacked:has(.panel-card-footer) {
    padding-bottom: var(--space-8);
}

.panel-card--stacked .ranking-list,
.panel-card--stacked .alerts-activity-list {
    margin-bottom: var(--space-12);
}

.panel-card-footer {
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-neutral-light);
}

.panel-card--stacked .panel-card-footer {
    padding-top: var(--space-16);
}

.panel-card-footer .panel-link {
    min-width: auto;
    min-height: auto;
    padding: var(--space-4) var(--space-8) 0;
    font-size: 13px;
    line-height: 18px;
}

.panel-link {
    min-width: 44px;
    min-height: 44px;
    padding: var(--space-8);
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    cursor: pointer;
}

.agent-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.agent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16);
    padding-bottom: var(--space-16);
    border-bottom: 1px solid var(--color-neutral-light);
}

.agent-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
}

.agent-main {
    display: flex;
    align-items: center;
    gap: var(--space-12);
}

.agent-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 20px;
    font-weight: 700;
    color: var(--color-text-inverse);
    background: var(--color-brand-primary);
}

.agent-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.agent-name,
.agent-plan,
.agent-usage-label,
.agent-usage-value {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.agent-name {
    font-weight: 600;
}

.agent-plan,
.agent-usage-label {
    color: var(--color-text-muted);
}

.agent-usage {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-4);
}

.agent-usage-value {
    font-weight: 600;
    color: var(--color-text-primary);
}

.open-button {
    min-width: 72px;
    min-height: 44px;
    padding: var(--space-8) var(--space-12);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-neutral-light);
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.open-button:hover {
    background: var(--color-bg-surface);
}

.activity-list {
    list-style: none;
    margin: var(--space-16) 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.activity-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
}

.activity-dot {
    width: 12px;
    height: 12px;
    margin-top: var(--space-4);
    border-radius: 100px;
    flex-shrink: 0;
}

.activity-dot-success {
    background: var(--color-feedback-success);
}

.activity-dot-muted {
    background: var(--color-neutral-light);
}

.activity-dot-primary {
    background: var(--color-brand-secondary-alt);
}

.activity-dot-warning {
    background: var(--color-feedback-warning);
}

.activity-dot-error {
    background: var(--color-feedback-error);
}

.activity-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.activity-title,
.activity-time {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.activity-title {
    font-weight: 600;
}

.activity-time {
    color: var(--color-text-muted);
}

.panel-empty {
    margin: var(--space-16) 0 0 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.alerts-list {
    list-style: none;
    padding: 0;
    margin: var(--space-16) 0 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.alert-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-8);
}

.alert-main {
    display: flex;
    gap: var(--space-8);
}

.alert-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.ranking-list {
    list-style: none;
    margin: var(--space-16) 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.ranking-list > li {
    border-bottom: 1px solid var(--color-neutral-light);
}

.ranking-list > li:last-child {
    border-bottom: none;
}

.ranking-list .ranking-item-product {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16);
    width: 100%;
    min-height: 52px;
    box-sizing: border-box;
}

.ranking-list > li > .ranking-item-product:not(.ranking-item--actionable) {
    padding: var(--space-12) 0;
}

.ranking-list > li:first-child > .ranking-item-product {
    padding-top: 0;
}

.ranking-list > li:last-child > .ranking-item-product {
    padding-bottom: 0;
}

.ranking-item {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-8);
    align-items: center;
}

.ranking-name,
.ranking-meta,
.ranking-value {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
}

.ranking-name {
    font-weight: 600;
}

.ranking-meta {
    color: var(--color-text-muted);
}

.ranking-value {
    justify-self: end;
    font-weight: 600;
    color: var(--color-text-primary);
}

.ranking-item-product {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16);
}

.ranking-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-4);
    min-width: 0;
    flex: 1;
    min-height: 44px;
}

.ranking-main .ranking-name,
.ranking-main .ranking-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ranking-item-product .ranking-value {
    flex-shrink: 0;
    text-align: right;
}

.ranking-item-product > .ranking-value:not(.ranking-value--labeled) {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 40px;
}

.ranking-item--actionable {
    width: 100%;
    margin: 0;
    min-height: 52px;
    padding: var(--space-12) var(--space-8);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    text-align: inherit;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease;
}

.ranking-list > li:first-child > .ranking-item--actionable {
    padding-top: 0;
}

.ranking-list > li:last-child > .ranking-item--actionable {
    padding-bottom: 0;
}

.ranking-item--actionable:hover {
    background: var(--color-bg-surface);
    border-color: var(--color-neutral-light);
}

.ranking-item--actionable:focus-visible {
    outline: 2px solid var(--color-brand-primary);
    outline-offset: 2px;
}

.ranking-value--labeled {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-4);
    min-height: 40px;
}

.ranking-value-label {
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    color: var(--color-text-muted);
}

.ranking-value-data {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.dark-theme .agent-avatar {
    background: var(--color-cta-fill);
    color: var(--color-cta-text);
}

@media (max-width: 1024px) {
    .org-dashboard-page .dashboard-kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 640px) {
    .org-dashboard-page .dashboard-kpis {
        grid-template-columns: minmax(0, 1fr);
    }

    .admin-charts-row,
    .admin-analytics-row,
    .admin-bottom-row {
        grid-template-columns: 1fr;
    }

    .admin-rankings-grid {
        grid-template-columns: 1fr;
    }

    .token-kpis {
        grid-template-columns: 1fr;
    }

    .content-grid {
        grid-template-columns: 1fr;
    }

    .panel-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .blockchain-panel-header .blockchain-period-tabs {
        width: 100%;
        justify-content: flex-start;
    }

    .agent-item {
        flex-direction: column;
        align-items: flex-start;
    }

    .agent-usage {
        align-items: flex-start;
    }

    .ranking-item {
        grid-template-columns: 1fr;
    }
}

@media (min-width: 641px) and (max-width: 1024px) {
    .org-dashboard-page .dashboard-kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .admin-charts-row,
    .admin-analytics-row,
    .admin-bottom-row {
        grid-template-columns: 1fr;
    }

    .admin-rankings-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .admin-rankings-grid > .panel-card:last-child {
        grid-column: 1 / -1;
    }

    .panel-header h2 {
        font-size: 18px;
        line-height: 26px;
    }

    .agent-item {
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .agent-main {
        flex: 1 1 100%;
    }

    .agent-usage {
        align-items: flex-start;
    }

    .open-button {
        margin-left: auto;
    }
}
</style>
