<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Subscription not found')"
        :not-found-description="$t('The subscription you are looking for does not exist or was removed from the platform.')"
        :error-message="loadError"
        :error-title="$t('Unable to load subscription detail.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--simple details-view-card">
                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Subscription profile") }}</p>
                    <div class="details-view-title-row">
                        <h1 class="details-view-title">{{ headerTitle }}</h1>
                        <span :class="statusBadgeClass(subscription.status, subscriptionStatusToneMap)" role="status">
                            {{ $t(subscription.status) }}
                        </span>
                    </div>
                    <p class="details-view-subtitle">
                        {{ $t("Review billing and payment history for this subscription.") }}
                    </p>
                </div>
            </header>
        </template>

        <DetailsViewTabs
            :tabs="visibleTabs"
            :active-tab="activeTab"
            :tablist-label="$t('Subscription detail sections')"
            icon-only="mobile"
            @select="selectTab"
        />

        <div
            v-if="activeTab === 'details'"
            id="details-view-panel-details"
            key="details"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-details"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Subscription details") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review the subscription record and billing cycle.") }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Identity") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-id-card details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Subscription ID") }}
                            </dt>
                            <dd class="details-view-value" :title="subscription.id">{{ subscription.id }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-user details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Client") }}
                            </dt>
                            <dd class="details-view-value">
                                <router-link
                                    v-if="subscription.uid"
                                    class="link-deco"
                                    :title="subscription.uid"
                                    :to="clientDetailRoute(subscription.uid)"
                                    :aria-label="$t('Clients view client details')"
                                >
                                    {{ clientDisplayName }}
                                </router-link>
                                <span v-else>—</span>
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-cube details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Item") }}
                            </dt>
                            <dd class="details-view-value" :title="subscription.subscribableName || subscription.subscribableId">
                                {{ subscribableDisplayName }}
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-layer-group details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Category") }}
                            </dt>
                            <dd class="details-view-value">{{ categoryLabel }}</dd>
                        </div>
                    </dl>
                </article>

                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Billing") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar-alt details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Plan") }}
                            </dt>
                            <dd class="details-view-value">{{ formatBillingCycle(subscription.billingCycle) }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-play details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Current period start") }}
                            </dt>
                            <dd class="details-view-value">{{ formatDate(subscription.currentPeriodStart) }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-forward details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Next renewal") }}
                            </dt>
                            <dd class="details-view-value">{{ formatDate(subscription.currentPeriodEnd) }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-clock details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Cancel at period end") }}
                            </dt>
                            <dd class="details-view-value">{{ subscription.cancelAtPeriodEnd ? $t("Yes") : $t("No") }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Created") }}
                            </dt>
                            <dd class="details-view-value">{{ renderDateAndTime(subscription.createdAt) }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-pen details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Updated") }}
                            </dt>
                            <dd class="details-view-value">{{ renderDateAndTime(subscription.updatedAt) }}</dd>
                        </div>
                    </dl>
                </article>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'payments'"
            id="details-view-panel-payments"
            key="payments"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-payments"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Payments") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review charges linked to this subscription. Only the latest successful payment can be refunded.") }}
                </p>
            </div>

            <div class="table-responsive">
                <table class="table table-wide table-stack table-stack--single-col-mobile">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Date") }}</th>
                            <th scope="col">{{ $t("Type") }}</th>
                            <th scope="col">{{ $t("Amount") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col">{{ $t("Provider") }}</th>
                            <th scope="col" class="text-right">{{ $t("Action") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="!payments.length">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("No payments found for this subscription.") }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="payment in payments" :key="payment.id">
                            <td :data-label="$t('Date')" class="table-stack-row-primary">{{ formatDate(payment.createdAt) }}</td>
                            <td :data-label="$t('Type')">{{ paymentTypeLabel(payment.type) }}</td>
                            <td :data-label="$t('Amount')">
                                {{ formatMoneyFromCents(payment.amountCents, payment.currency || "EUR") }}
                            </td>
                            <td :data-label="$t('Status')">
                                <span :class="statusBadgeClass(payment.status, paymentStatusToneMap)" role="status">
                                    {{ paymentStatusLabel(payment.status) }}
                                </span>
                            </td>
                            <td :data-label="$t('Provider')" class="text-muted one-line" :title="payment.providerSessionId || undefined">
                                {{ payment.provider || "—" }}
                            </td>
                            <td :data-label="$t('Action')" class="actions-cell text-right td-shrink">
                                <button
                                    v-if="canRefundPayment(payment)"
                                    type="button"
                                    class="btn btn-tertiary btn-xs"
                                    :disabled="actionLoading"
                                    :title="$t('Refund payment')"
                                    :aria-label="$t('Refund payment')"
                                    @click="confirmRefundPayment(payment.id)"
                                >
                                    <i
                                        :class="
                                            refundLoadingPaymentId === payment.id
                                                ? 'fas fa-spinner fa-spin no-margin'
                                                : 'fas fa-undo no-margin'
                                        "
                                        aria-hidden="true"
                                    ></i>
                                </button>
                                <span v-else>—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'actions'"
            id="details-view-panel-actions"
            key="actions"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-actions"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Subscription actions") }}</h2>
                <p class="details-view-content-description">
                    {{
                        $t(
                            "Suspend, reactivate or refund the latest payment. Changes are synced with Stripe and reflected in the subscription list.",
                        )
                    }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel details-view-panel--wide">
                    <h3 class="details-view-panel-title">{{ $t("Lifecycle") }}</h3>
                    <div
                        v-if="canSuspendSubscription || canReactivateSubscription || latestRefundablePayment"
                        class="details-view-panel-actions"
                    >
                        <button
                            v-if="canSuspendSubscription"
                            type="button"
                            class="btn btn-danger"
                            :disabled="actionLoading"
                            @click="confirmSuspend"
                        >
                            <i :class="actionLoadingKind === 'suspend' ? 'fas fa-spinner fa-spin' : 'fas fa-ban'" aria-hidden="true"></i>
                            {{ $t("Suspend subscription") }}
                        </button>
                        <button
                            v-if="canReactivateSubscription"
                            type="button"
                            class="btn btn-primary"
                            :disabled="actionLoading"
                            @click="confirmReactivate"
                        >
                            <i
                                :class="actionLoadingKind === 'reactivate' ? 'fas fa-spinner fa-spin' : 'fas fa-check'"
                                aria-hidden="true"
                            ></i>
                            {{ $t("Reactivate subscription") }}
                        </button>
                        <button
                            v-if="latestRefundablePayment"
                            type="button"
                            class="btn btn-tertiary"
                            :disabled="actionLoading"
                            @click="confirmRefundPayment(latestRefundablePayment.id)"
                        >
                            <i
                                :class="refundLoadingPaymentId === latestRefundablePayment.id ? 'fas fa-spinner fa-spin' : 'fas fa-undo'"
                                aria-hidden="true"
                            ></i>
                            {{ $t("Refund latest payment") }}
                        </button>
                    </div>
                    <p v-else class="details-view-state-message">
                        {{ $t("No administrative actions are available for the current subscription status.") }}
                    </p>
                </article>
            </div>
        </div>
    </DetailsViewLayout>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import type { SubscriptionAdminDetailResponse, SubscriptionAdminListItem, SubscriptionAdminPaymentItem } from "@/api/definitions";
import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import DetailsViewTabs from "@/components/layout/DetailsViewTabs.vue";
import { PAYMENT_STATUS_TONE_MAP, SUBSCRIPTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { useDetailsViewRoute } from "@/composables/useDetailsViewRoute";
import { AuthController } from "@/control/auth";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { getUniqueStringId } from "@/utils/unique-id";
import { truncateMiddle } from "@/utils/text";
import { renderDate, renderDateAndTime } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";
import { toTitleCase } from "@/utils/text";
import {
    canAdminReactivateSubscription,
    canAdminSuspendSubscription,
    formatBillingCycle as formatBillingCycleLabel,
} from "@/utils/subscription-domain";

type SubscriptionDetailTabId = "details" | "payments" | "actions";

const EMPTY_SUBSCRIPTION: SubscriptionAdminListItem = {
    id: "",
    uid: "",
    subscribableType: "",
    subscribableId: "",
    subscribableName: "",
    billingCycle: "",
    status: "",
    createdAt: 0,
    updatedAt: 0,
};

function normalizeRouteParam(raw: unknown): string {
    if (typeof raw === "string") {
        return raw.trim();
    }
    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" ? firstValue.trim() : "";
    }
    return "";
}

function normalizeTabQuery(raw: unknown): SubscriptionDetailTabId {
    const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    if (value === "payments" || value === "actions") {
        return value;
    }
    return "details";
}

function pickString(raw: Record<string, unknown>, camel: string, snake: string): string {
    const value = raw[camel] ?? raw[snake];
    if (value === undefined || value === null) {
        return "";
    }
    return String(value);
}

function pickNumber(raw: Record<string, unknown>, camel: string, snake: string): number | undefined {
    const value = raw[camel] ?? raw[snake];
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function pickBool(raw: Record<string, unknown>, camel: string, snake: string): boolean | undefined {
    const value = raw[camel] ?? raw[snake];
    if (value === undefined || value === null) {
        return undefined;
    }
    return !!value;
}

function normalizeAdminSubscription(raw: unknown): SubscriptionAdminListItem {
    if (!raw || typeof raw !== "object") {
        return { ...EMPTY_SUBSCRIPTION };
    }
    const data = raw as Record<string, unknown>;
    const id = pickString(data, "id", "id");
    if (!id) {
        return { ...EMPTY_SUBSCRIPTION };
    }
    return {
        id,
        uid: pickString(data, "uid", "uid"),
        username: pickString(data, "username", "username") || undefined,
        category: pickString(data, "category", "category") || undefined,
        subscribableType: pickString(data, "subscribableType", "subscribable_type"),
        subscribableId: pickString(data, "subscribableId", "subscribable_id"),
        subscribableName: pickString(data, "subscribableName", "subscribable_name") || undefined,
        billingCycle: pickString(data, "billingCycle", "billing_cycle"),
        status: pickString(data, "status", "status"),
        stripeSubscriptionId: pickString(data, "stripeSubscriptionId", "stripe_subscription_id") || undefined,
        currentPeriodStart: pickNumber(data, "currentPeriodStart", "current_period_start"),
        currentPeriodEnd: pickNumber(data, "currentPeriodEnd", "current_period_end"),
        cancelAtPeriodEnd: pickBool(data, "cancelAtPeriodEnd", "cancel_at_period_end"),
        createdAt: pickNumber(data, "createdAt", "created_at") || 0,
        updatedAt: pickNumber(data, "updatedAt", "updated_at") || 0,
    };
}

function normalizeAdminPayment(raw: unknown): SubscriptionAdminPaymentItem | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const data = raw as Record<string, unknown>;
    const id = pickString(data, "id", "id");
    if (!id) {
        return null;
    }
    return {
        id,
        type: pickString(data, "type", "type"),
        provider: pickString(data, "provider", "provider"),
        amountCents: pickNumber(data, "amountCents", "amount_cents") || 0,
        currency: pickString(data, "currency", "currency") || "EUR",
        status: pickString(data, "status", "status"),
        providerSessionId: pickString(data, "providerSessionId", "provider_session_id") || undefined,
        createdAt: pickNumber(data, "createdAt", "created_at") || 0,
    };
}

export default defineComponent({
    name: "SubscriptionDetailsPage",
    components: {
        DetailsViewLayout,
        DetailsViewTabs,
    },
    setup: function () {
        const { backRoute } = useDetailsViewRoute("subscriptionId", "subscriptions");
        return {
            loadRequestId: getUniqueStringId(),
            suspendRequestId: getUniqueStringId(),
            reactivateRequestId: getUniqueStringId(),
            refundRequestId: getUniqueStringId(),
            backRoute,
        };
    },
    data: function () {
        return {
            subscriptionStatusToneMap: SUBSCRIPTION_STATUS_TONE_MAP,
            paymentStatusToneMap: PAYMENT_STATUS_TONE_MAP,
            loading: true,
            notFound: false,
            loadError: "",
            canManageSubscription: false,
            activeTab: "details" as SubscriptionDetailTabId,
            actionLoading: false,
            actionLoadingKind: "" as "" | "suspend" | "reactivate",
            refundLoadingPaymentId: "",
            subscription: { ...EMPTY_SUBSCRIPTION } as SubscriptionAdminListItem,
            payments: [] as SubscriptionAdminPaymentItem[],
        };
    },
    computed: {
        routeSubscriptionId: function (): string {
            return normalizeRouteParam(this.$route.params.subscriptionId);
        },
        headerTitle: function (): string {
            if (this.subscription.id) {
                return truncateMiddle(this.subscription.id, 32);
            }
            return String(this.$t("Subscription"));
        },
        clientDisplayName: function (): string {
            if (this.subscription.username) {
                return this.subscription.username;
            }
            if (this.subscription.uid) {
                return truncateMiddle(this.subscription.uid, 24);
            }
            return "—";
        },
        subscribableTypeLabel: function (): string {
            const normalized = (this.subscription.subscribableType || "").toLowerCase();
            if (normalized === "plan") {
                return String(this.$t("Plan"));
            }
            if (normalized === "service") {
                return String(this.$t("Service"));
            }
            if (normalized === "product") {
                return String(this.$t("Product"));
            }
            return this.subscription.subscribableType ? toTitleCase(this.subscription.subscribableType) : "—";
        },
        categoryLabel: function (): string {
            const normalized = (this.subscription.category || "").trim().toLowerCase();
            if (normalized === "plan") {
                return String(this.$t("Plan"));
            }
            if (normalized === "service") {
                return String(this.$t("Service"));
            }
            if (normalized === "product") {
                return String(this.$t("Product"));
            }
            return this.subscribableTypeLabel;
        },
        subscribableDisplayName: function (): string {
            const normalizedName = (this.subscription.subscribableName || "").trim();
            if (normalizedName) {
                return normalizedName;
            }
            return this.subscription.subscribableId || "—";
        },
        canSuspendSubscription: function (): boolean {
            if (!this.canManageSubscription) {
                return false;
            }
            return canAdminSuspendSubscription(this.subscription);
        },
        canReactivateSubscription: function (): boolean {
            if (!this.canManageSubscription) {
                return false;
            }
            return canAdminReactivateSubscription(this.subscription);
        },
        latestRefundablePayment: function (): SubscriptionAdminPaymentItem | null {
            let latest: SubscriptionAdminPaymentItem | null = null;
            for (const payment of this.payments) {
                if (!this.isRefundablePaymentStatus(payment)) {
                    continue;
                }
                if (!latest || payment.createdAt > latest.createdAt) {
                    latest = payment;
                }
            }
            return latest;
        },
        visibleTabs: function (): Array<{ id: SubscriptionDetailTabId; label: string; icon: string }> {
            const tabs: Array<{ id: SubscriptionDetailTabId; label: string; icon: string }> = [
                { id: "details", label: "Subscription details", icon: "fas fa-receipt" },
                { id: "payments", label: "Payments", icon: "fas fa-credit-card" },
            ];
            if (this.canManageSubscription) {
                tabs.push({ id: "actions", label: "Subscription actions", icon: "fas fa-sliders" });
            }
            return tabs;
        },
    },
    methods: {
        statusBadgeClass,
        formatMoneyFromCents,
        renderDateAndTime: function (timestamp?: number): string {
            if (!timestamp) {
                return "—";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        formatDate: function (timestamp?: number): string {
            if (!timestamp || timestamp <= 0) {
                return "—";
            }
            return renderDate(timestamp, this.$t);
        },
        formatBillingCycle: function (cycle: string): string {
            return formatBillingCycleLabel(cycle, (key: string) => String(this.$t(key)));
        },
        paymentStatusLabel: function (status: string): string {
            return status ? toTitleCase(status) : "—";
        },
        paymentTypeLabel: function (type: string): string {
            const normalized = (type || "").toLowerCase();
            const mapping: Record<string, string> = {
                subscription_create: String(this.$t("Subscription creation")),
                subscription_renew: String(this.$t("Subscription renewal")),
                subscription_renewed: String(this.$t("Subscription renewal")),
                subscription_cancel: String(this.$t("Subscription cancellation")),
                refund: String(this.$t("Refund")),
                charge: String(this.$t("Charge")),
                payment: String(this.$t("Payment")),
            };
            return mapping[normalized] || toTitleCase(type);
        },
        isRefundablePaymentStatus: function (payment: SubscriptionAdminPaymentItem): boolean {
            const normalized = (payment.status || "").toLowerCase();
            if (normalized.includes("refund")) {
                return false;
            }
            return normalized.includes("confirm") || normalized.includes("succeed") || normalized.includes("paid");
        },
        canRefundPayment: function (payment: SubscriptionAdminPaymentItem): boolean {
            if (!this.canManageSubscription) {
                return false;
            }
            const latest = this.latestRefundablePayment;
            return !!latest && latest.id === payment.id;
        },
        clientDetailRoute: function (clientId: string) {
            return { name: "clients-client-detail", params: { clientId } };
        },
        refreshPermissions: function (): void {
            this.canManageSubscription =
                AuthController.Role === "admin" ||
                AuthController.hasPermission("admin.users.manage") ||
                AuthController.hasPermission("admin.roles");

            if (!this.visibleTabs.some((tab) => tab.id === this.activeTab)) {
                this.activeTab = "details";
            }
        },
        syncTabFromRoute: function (): void {
            const nextTab = normalizeTabQuery(this.$route.query.tab);
            if (!this.visibleTabs.some((tab) => tab.id === nextTab)) {
                this.activeTab = "details";
                return;
            }
            this.activeTab = nextTab;
        },
        selectTab: function (tabId: SubscriptionDetailTabId): void {
            if (this.activeTab === tabId) {
                return;
            }
            void this.$router.replace({
                query: {
                    ...this.$route.query,
                    tab: tabId === "details" ? undefined : tabId,
                },
            });
        },
        applyDetail: function (detail: SubscriptionAdminDetailResponse): void {
            const payload = detail as unknown as Record<string, unknown>;
            const subscriptionRaw = payload.subscription ?? null;
            this.subscription = normalizeAdminSubscription(subscriptionRaw);
            const paymentsRaw = Array.isArray(payload.payments) ? payload.payments : [];
            this.payments = paymentsRaw
                .map((payment) => normalizeAdminPayment(payment))
                .filter((payment): payment is SubscriptionAdminPaymentItem => payment !== null)
                .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
        },
        load: function (): void {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            const targetId = this.routeSubscriptionId;
            if (!targetId) {
                this.loading = false;
                this.notFound = true;
                this.loadError = "";
                this.$setSubTitle(this.$t("Subscription not found"));
                return;
            }

            const isRefresh = targetId === this.subscription.id;
            if (!isRefresh) {
                this.loading = true;
                this.notFound = false;
                this.loadError = "";
            }

            Request.Pending(this.loadRequestId, ApiSubscriptions.GetAdminSubscriptionDetail(targetId))
                .onSuccess((detail) => {
                    this.applyDetail(detail);
                    if (!this.subscription.id) {
                        this.loading = false;
                        this.notFound = true;
                        this.$setSubTitle(this.$t("Subscription not found"));
                        return;
                    }
                    this.loading = false;
                    this.notFound = false;
                    this.refreshPermissions();
                    this.syncTabFromRoute();
                    this.$setSubTitle(this.headerTitle);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.loadError = "";
                            this.$setSubTitle(this.$t("Subscription not found"));
                        },
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.loadError = "";
                            this.$setSubTitle(this.$t("Subscription not found"));
                        },
                        notFoundSubscriptionNotFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.loadError = "";
                            this.$setSubTitle(this.$t("Subscription not found"));
                        },
                        temporalError: () => {
                            this.loading = false;
                            this.loadError = String(this.$t("Unable to load subscription detail."));
                        },
                        networkError: () => {
                            this.loading = false;
                            this.loadError = String(this.$t("Unable to load subscription detail."));
                        },
                        serverError: () => {
                            this.loading = false;
                            this.loadError = String(this.$t("Unable to load subscription detail."));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.loading = false;
                    this.loadError = String(this.$t("Unable to load subscription detail."));
                });
        },
        clearRefundAction: function (): void {
            this.actionLoading = false;
            this.actionLoadingKind = "";
            this.refundLoadingPaymentId = "";
        },
        clearSubscriptionAction: function (): void {
            this.actionLoading = false;
            this.actionLoadingKind = "";
        },
        confirmSuspend: function (): void {
            if (!this.subscription.id || this.actionLoading || !this.canSuspendSubscription) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Suspend subscription"),
                message: this.$t("Do you want to suspend this subscription?"),
                danger: true,
                suspendAction: true,
                callback: () => {
                    this.doSuspend();
                },
            });
        },
        doSuspend: function (): void {
            if (!this.subscription.id) {
                return;
            }
            this.actionLoading = true;
            this.actionLoadingKind = "suspend";
            Request.Abort(this.suspendRequestId);
            Request.Pending(this.suspendRequestId, ApiSubscriptions.SuspendSubscriptionAdmin({ subscription_id: this.subscription.id }))
                .onSuccess(() => {
                    this.clearSubscriptionAction();
                    this.$showSnackBar(this.$t("Subscription suspended"));
                    this.load();
                })
                .onCancel(() => {
                    this.clearSubscriptionAction();
                })
                .onRequestError((err, handleErr) => {
                    this.clearSubscriptionAction();
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
                    this.clearSubscriptionAction();
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to suspend the subscription."));
                });
        },
        confirmReactivate: function (): void {
            if (!this.subscription.id || this.actionLoading || !this.canReactivateSubscription) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Reactivate subscription"),
                message: this.$t("Do you want to reactivate this subscription?"),
                danger: false,
                callback: () => {
                    this.doReactivate();
                },
            });
        },
        doReactivate: function (): void {
            if (!this.subscription.id) {
                return;
            }
            this.actionLoading = true;
            this.actionLoadingKind = "reactivate";
            Request.Abort(this.reactivateRequestId);
            Request.Pending(
                this.reactivateRequestId,
                ApiSubscriptions.ReactivateSubscriptionAdmin({ subscription_id: this.subscription.id }),
            )
                .onSuccess(() => {
                    this.clearSubscriptionAction();
                    this.$showSnackBar(this.$t("Subscription reactivated"));
                    this.load();
                })
                .onCancel(() => {
                    this.clearSubscriptionAction();
                })
                .onRequestError((err, handleErr) => {
                    this.clearSubscriptionAction();
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
                    this.clearSubscriptionAction();
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to reactivate the subscription."));
                });
        },
        confirmRefundPayment: function (paymentId: string): void {
            if (!this.subscription.id || !paymentId || this.actionLoading) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Refund payment"),
                message: this.$t("Do you want to refund this payment through Stripe?"),
                danger: true,
                callback: () => {
                    this.doRefundPayment(paymentId);
                },
            });
        },
        doRefundPayment: function (paymentId: string): void {
            if (!this.subscription.id || !paymentId) {
                return;
            }
            this.actionLoading = true;
            this.refundLoadingPaymentId = paymentId;
            Request.Abort(this.refundRequestId);
            Request.Pending(
                this.refundRequestId,
                ApiSubscriptions.RefundSubscriptionAdmin({
                    subscription_id: this.subscription.id,
                    payment_id: paymentId,
                }),
            )
                .onSuccess((response) => {
                    this.clearRefundAction();
                    this.$showSnackBar(`${this.$t("Refund processed")}: ${formatMoneyFromCents(response.refund_amount_cents, "EUR")}`);
                    this.load();
                })
                .onCancel(() => {
                    this.clearRefundAction();
                })
                .onRequestError((err, handleErr) => {
                    this.clearRefundAction();
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to process refund."));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found."));
                        },
                        notFoundSubscriptionNotFound: () => {
                            this.$showMessageModal(this.$t("Not found"), this.$t("Subscription not found."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to process refund."));
                        },
                        badRequestInvalidRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to process refund."));
                        },
                        badRequestPaymentNotFound: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Payment not found."));
                        },
                        badRequestPaymentAlreadyRefunded: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Payment already refunded."));
                        },
                        badRequestStripePaymentNotFound: () => {
                            this.$showMessageModal(
                                this.$t("Unable to process refund."),
                                this.$t(
                                    "We could not identify the charge corresponding to this payment. No refund has been issued. Review the invoice and its payments in Stripe before continuing.",
                                ),
                            );
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to process refund."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.clearRefundAction();
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to process refund."));
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.refreshPermissions.bind(this));
        this.refreshPermissions();
        this.syncTabFromRoute();
        this.$setSubTitle(this.$t("Subscription"));
        this.load();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
        Request.Abort(this.suspendRequestId);
        Request.Abort(this.reactivateRequestId);
        Request.Abort(this.refundRequestId);
    },
    watch: {
        routeSubscriptionId: function () {
            this.load();
        },
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/details-view.css";
@import "@/style/tables.css";
</style>
