<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Client not found')"
        :not-found-description="$t('The client you are looking for does not exist or was deleted from the platform.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--with-media details-view-card">
                <div>
                    <div class="details-view-avatar">
                        <img v-if="image" class="details-view-avatar-image" :src="image" :alt="$t('Client profile image')" />
                        <img v-else class="details-view-avatar-image" src="@/assets/user.png" :alt="$t('Client profile image')" />
                    </div>
                </div>

                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Client profile") }}</p>
                    <h1 class="details-view-title">{{ displayName }}</h1>
                    <p v-if="username" class="details-view-handle">{{ "@" + username }}</p>
                    <p v-if="primaryOrganizationName" class="client-detail-organization">
                        {{ $t("Organization") }}: {{ primaryOrganizationName }}
                    </p>
                    <p class="details-view-subtitle">
                        {{ $t("Review identity, account status and profile information for this client.") }}
                    </p>
                </div>
            </header>
        </template>

        <DetailsViewTabs :tabs="visibleTabs" :active-tab="activeTab" :tablist-label="$t('Client detail sections')" @select="selectTab" />

        <div
            v-if="activeTab === 'details'"
            id="details-view-panel-details"
            key="details"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-details"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Client details") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review the administrative and public profile records associated with this client.") }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Identity") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-id-card details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Client ID") }}
                            </dt>
                            <dd class="details-view-value" :title="id">{{ id }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-at details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Username") }}
                            </dt>
                            <dd class="details-view-value">{{ username || "—" }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Email") }}
                            </dt>
                            <dd class="details-view-value">
                                <a v-if="email" class="link-deco" :href="'mailto:' + email">{{ email }}</a>
                                <span v-else>—</span>
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-language details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Locale") }}
                            </dt>
                            <dd class="details-view-value">{{ locale || "—" }}</dd>
                        </div>
                    </dl>
                </article>

                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Account status") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-briefcase details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Role") }}
                            </dt>
                            <dd class="details-view-value">{{ roleLabel }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-circle-check details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Email verification") }}
                            </dt>
                            <dd class="details-view-value">{{ verified ? $t("Verified") : $t("Not verified") }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-user-slash details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Banned") }}
                            </dt>
                            <dd class="details-view-value">{{ banned ? $t("Yes") : $t("No") }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-user-lock details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Two factor authentication") }}
                            </dt>
                            <dd class="details-view-value">{{ tfa ? $t("Enabled") : $t("Disabled") }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Created") }}
                            </dt>
                            <dd class="details-view-value">{{ renderDate(created) }}</dd>
                        </div>
                    </dl>
                </article>

                <article v-if="name || bio || location || website" class="details-view-panel details-view-panel--wide">
                    <h3 class="details-view-panel-title">{{ $t("Public profile") }}</h3>
                    <dl class="details-view-list">
                        <div v-if="name" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-signature details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Display name") }}
                            </dt>
                            <dd class="details-view-value">{{ name }}</dd>
                        </div>

                        <div v-if="bio" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-align-left details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Bio") }}
                            </dt>
                            <dd class="details-view-value">{{ bio }}</dd>
                        </div>

                        <div v-if="location" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-location-dot details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Location") }}
                            </dt>
                            <dd class="details-view-value">{{ location }}</dd>
                        </div>

                        <div v-if="website" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-link details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Website") }}
                            </dt>
                            <dd class="details-view-value">
                                <a class="link-deco" :href="website" target="_blank" rel="noopener noreferrer">{{ website }}</a>
                            </dd>
                        </div>
                    </dl>
                </article>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'subscriptions'"
            id="details-view-panel-subscriptions"
            key="subscriptions"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-subscriptions"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Subscriptions") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review active and historical subscriptions owned by this client.") }}
                </p>
            </div>

            <div class="table-responsive">
                <table class="table table-wide table-stack table-stack--single-col-mobile">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Item") }}</th>
                            <th scope="col">{{ $t("Type") }}</th>
                            <th scope="col">{{ $t("Plan") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col">{{ $t("Next renewal") }}</th>
                            <th scope="col" class="text-right">{{ $t("Action") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="subscriptionsLoading">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>
                    <tbody v-else-if="!subscriptions.length">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("No subscriptions found for this client.") }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="subscription in subscriptions" :key="subscription.id">
                            <td
                                :data-label="$t('Item')"
                                class="one-line table-stack-row-primary"
                                :title="subscription.subscribableName || subscription.subscribableId"
                            >
                                {{ subscription.subscribableName || subscription.subscribableId || "—" }}
                            </td>
                            <td :data-label="$t('Type')">{{ formatSubscriptionCategory(subscription.category) }}</td>
                            <td :data-label="$t('Plan')">{{ formatBillingCycle(subscription.billingCycle) }}</td>
                            <td :data-label="$t('Status')">
                                <span :class="statusBadgeClass(subscription.status, subscriptionStatusToneMap)" role="status">
                                    {{ $t(subscription.status) }}
                                </span>
                            </td>
                            <td :data-label="$t('Next renewal')">
                                {{ subscription.currentPeriodEnd ? renderDate(subscription.currentPeriodEnd) : "—" }}
                            </td>
                            <td :data-label="$t('Action')" class="actions-cell text-right td-shrink">
                                <router-link
                                    class="btn btn-primary btn-xs"
                                    :to="subscriptionDetailRoute(subscription.id)"
                                    :aria-label="$t('View subscription details')"
                                >
                                    <i class="fas fa-eye no-margin" aria-hidden="true"></i>
                                </router-link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <PaginationBar
                :page="subscriptionsPage"
                :total-pages="subscriptionsTotalPages"
                :can-go-prev="subscriptionsCanGoPrev"
                :can-go-next="subscriptionsCanGoNext"
                :visible="subscriptionsPaginationVisible"
                :aria-label="$t('Client subscriptions pagination')"
                @prev="onSubscriptionsPaginationPrev"
                @next="onSubscriptionsPaginationNext"
            />
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
                    {{ $t("Review payment history and charges associated with this client.") }}
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
                            <th scope="col">{{ $t("Subscription ID") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="paymentsLoading">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>
                    <tbody v-else-if="!payments.length">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("No payments found for this client.") }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="payment in payments" :key="payment.id">
                            <td :data-label="$t('Date')" class="table-stack-row-primary">{{ renderDate(payment.createdAt) }}</td>
                            <td :data-label="$t('Type')">{{ paymentTypeLabel(payment.type) }}</td>
                            <td :data-label="$t('Amount')">
                                {{ formatMoneyFromCents(payment.amountCents, payment.currency || "EUR") }}
                            </td>
                            <td :data-label="$t('Status')">
                                <span :class="statusBadgeClass(payment.status, paymentStatusToneMap)" role="status">
                                    {{ paymentStatusLabel(payment.status) }}
                                </span>
                            </td>
                            <td :data-label="$t('Provider')">{{ payment.provider || "—" }}</td>
                            <td :data-label="$t('Subscription ID')" class="one-line" :title="payment.subscriptionId || undefined">
                                <router-link
                                    v-if="payment.subscriptionId"
                                    class="link-deco"
                                    :to="subscriptionDetailRoute(payment.subscriptionId)"
                                >
                                    {{ payment.subscriptionId }}
                                </router-link>
                                <span v-else>—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <PaginationBar
                :page="paymentsPage"
                :total-pages="paymentsTotalPages"
                :can-go-prev="paymentsCanGoPrev"
                :can-go-next="paymentsCanGoNext"
                :visible="paymentsPaginationVisible"
                :aria-label="$t('Client payments pagination')"
                @prev="onPaymentsPaginationPrev"
                @next="onPaymentsPaginationNext"
            />
        </div>

        <div
            v-else-if="activeTab === 'billing'"
            id="details-view-panel-billing"
            key="billing"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-billing"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Nubem tokens") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review Nubem token balance for this client.") }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel details-view-panel--wide">
                    <h3 class="details-view-panel-title">{{ $t("Nubem tokens") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-wallet details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Available tokens") }}
                            </dt>
                            <dd class="details-view-value">{{ tokenBalance.available_tokens }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-lock details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Locked tokens") }}
                            </dt>
                            <dd class="details-view-value">{{ tokenBalance.locked_tokens }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-euro-sign details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Token value") }}
                            </dt>
                            <dd class="details-view-value">
                                {{ formatMoneyFromCents(tokenBalance.token_value_eur_cents, "EUR") }}
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-scale-balanced details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Equivalent balance") }}
                            </dt>
                            <dd class="details-view-value">
                                {{ formatMoneyFromCents(tokenBalance.equivalent_eur_cents, "EUR") }}
                            </dd>
                        </div>
                    </dl>
                </article>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'sessions'"
            id="details-view-panel-sessions"
            key="sessions"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-sessions"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Client sessions") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review active login sessions for this client account.") }}
                </p>
            </div>

            <div class="table-responsive">
                <table class="table table-wide table-stack table-stack--single-col-mobile">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Date") }}</th>
                            <th scope="col">{{ $t("IP address") }}</th>
                            <th scope="col">{{ $t("Operating system") }}</th>
                            <th scope="col">{{ $t("Web browser") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="!sessions.length">
                        <tr>
                            <td colspan="4" class="table-feedback">{{ $t("No active sessions found") }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="session in sessions" :key="session.session">
                            <td :data-label="$t('Date')" class="table-stack-row-primary">{{ renderDate(session.created) }}</td>
                            <td :data-label="$t('IP address')">{{ session.remote || "—" }}</td>
                            <td :data-label="$t('Operating system')">{{ session.os || "—" }}</td>
                            <td :data-label="$t('Web browser')">{{ session.browser || "—" }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'settings'"
            id="details-view-panel-settings"
            key="settings"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-settings"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Client settings") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Update client account data or perform moderation actions.") }}
                </p>
            </div>

            <article v-if="canManageUser" class="details-view-panel details-view-panel--wide">
                <div class="details-view-edit-header">
                    <h3 class="details-view-panel-title">{{ $t("Admin edit tools") }}</h3>
                    <p class="details-view-edit-description">
                        {{ $t("Update the username or email for this client account.") }}
                    </p>
                </div>

                <form class="details-view-edit-form" @submit="submitUserUpdate">
                    <div class="details-view-edit-grid">
                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="client-settings-username">
                                <i class="fas fa-user-tag details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Username") }}
                            </label>
                            <input
                                id="client-settings-username"
                                v-model="editUsername"
                                type="text"
                                maxlength="80"
                                class="form-control form-control-full-width"
                                :disabled="saving"
                                :aria-invalid="usernameError ? 'true' : undefined"
                                :aria-describedby="usernameError ? 'client-settings-username-error' : undefined"
                            />
                            <div v-if="usernameError" id="client-settings-username-error" class="form-error" role="alert">
                                {{ usernameError }}
                            </div>
                        </div>

                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="client-settings-email">
                                <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Email") }}
                            </label>
                            <input
                                id="client-settings-email"
                                v-model="editEmail"
                                type="email"
                                maxlength="255"
                                class="form-control form-control-full-width"
                                :disabled="saving"
                                :aria-invalid="emailError ? 'true' : undefined"
                                :aria-describedby="emailError ? 'client-settings-email-error' : undefined"
                            />
                            <div v-if="emailError" id="client-settings-email-error" class="form-error" role="alert">{{ emailError }}</div>
                        </div>
                    </div>

                    <div class="details-view-edit-actions">
                        <button type="submit" class="btn btn-primary" :disabled="saving || !userHasChanges">
                            <i class="fas fa-floppy-disk" aria-hidden="true"></i>
                            {{ $t("Save changes") }}
                        </button>
                    </div>
                </form>
            </article>

            <article v-if="canModerateUser" class="details-view-danger-panel">
                <h3 class="details-view-danger-title">{{ $t("Danger zone") }}</h3>
                <p class="details-view-danger-description">
                    <template v-if="modImmune">
                        {{ $t("This user is immune to moderation and cannot be banned from this view.") }}
                    </template>
                    <template v-else-if="banned">
                        {{ $t("This user is currently banned from the platform.") }}
                    </template>
                    <template v-else>
                        {{ $t("Ban this user from the platform. They will not be able to sign in until unbanned.") }}
                    </template>
                </p>
                <div class="details-view-danger-actions">
                    <button v-if="banned" type="button" class="btn btn-primary" :disabled="moderating" @click="confirmPardonUser">
                        <i class="fas fa-user-check" aria-hidden="true"></i>
                        {{ $t("Unban user") }}
                    </button>
                    <button v-else type="button" class="btn btn-danger" :disabled="moderating || modImmune" @click="confirmBanUser">
                        <i class="fas fa-user-slash" aria-hidden="true"></i>
                        {{ $t("Ban user") }}
                    </button>
                </div>
            </article>

            <p v-if="!canManageUser && !canModerateUser" class="details-view-state-message">
                {{ $t("You do not have permission to manage settings for this client.") }}
            </p>
        </div>
    </DetailsViewLayout>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiUsersAdmin } from "@/api/api-group-users-admin";
import { ApiProfile } from "@/api/api-group-profile";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import { ApiPayments } from "@/api/api-group-payments";
import type {
    PaymentListItem,
    SessionListItem,
    SubscriptionAdminListItem,
    UserAdminDetails,
    UserAdminOrganizationItem,
    UserAdminTokenBalance,
    UserProfile,
} from "@/api/definitions";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { toTitleCase } from "@/utils/text";
import { HOME_ROUTE } from "@/app-events-plugin";
import { useDetailsViewRoute } from "@/composables/useDetailsViewRoute";
import { usePagination } from "@/composables/usePagination";
import { AuthController } from "@/control/auth";
import { getUniqueStringId } from "@/utils/unique-id";
import { renderDate } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";
import { PAYMENT_STATUS_TONE_MAP, SUBSCRIPTION_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import DetailsViewTabs from "@/components/layout/DetailsViewTabs.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";

type ClientDetailTabId = "details" | "subscriptions" | "payments" | "billing" | "sessions" | "settings";

const EMPTY_TOKEN_BALANCE: UserAdminTokenBalance = {
    available_tokens: 0,
    locked_tokens: 0,
    token_value_eur_cents: 1,
    equivalent_eur_cents: 0,
};

function normalizeTabQuery(raw: unknown): ClientDetailTabId {
    const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    if (value === "subscriptions" || value === "payments" || value === "billing" || value === "sessions" || value === "settings") {
        return value;
    }
    return "details";
}

export default defineComponent({
    name: "ClientDetailsPage",
    components: {
        DetailsViewLayout,
        DetailsViewTabs,
        PaginationBar,
    },
    setup: function () {
        const {
            backRoute,
            routeTargetId: routeClientId,
            routeEditRequested,
            clearEditQuery,
        } = useDetailsViewRoute("clientId", "clients-orgs");
        const subscriptionsLoading = ref(false);
        const paymentsLoading = ref(false);
        const subscriptionsPagination = usePagination({ loading: subscriptionsLoading });
        const paymentsPagination = usePagination({ loading: paymentsLoading });

        return {
            loadUserRequestId: getUniqueStringId(),
            loadProfileRequestId: getUniqueStringId(),
            loadSubscriptionsRequestId: getUniqueStringId(),
            loadPaymentsRequestId: getUniqueStringId(),
            saveUsernameRequestId: getUniqueStringId(),
            saveEmailRequestId: getUniqueStringId(),
            moderationRequestId: getUniqueStringId(),
            backRoute,
            routeClientId,
            routeEditRequested,
            clearEditQuery,
            subscriptionsLoading,
            paymentsLoading,
            subscriptionsPage: subscriptionsPagination.page,
            subscriptionsPageSize: subscriptionsPagination.pageSize,
            subscriptionsTotalPages: subscriptionsPagination.totalPages,
            subscriptionsPaginationVisible: subscriptionsPagination.visible,
            subscriptionsCanGoPrev: subscriptionsPagination.canGoPrev,
            subscriptionsCanGoNext: subscriptionsPagination.canGoNext,
            subscriptionsApplyListMeta: subscriptionsPagination.applyListMeta,
            subscriptionsGoPrev: subscriptionsPagination.goPrev,
            subscriptionsGoNext: subscriptionsPagination.goNext,
            subscriptionsResetPagination: subscriptionsPagination.reset,
            paymentsPage: paymentsPagination.page,
            paymentsPageSize: paymentsPagination.pageSize,
            paymentsTotalPages: paymentsPagination.totalPages,
            paymentsPaginationVisible: paymentsPagination.visible,
            paymentsCanGoPrev: paymentsPagination.canGoPrev,
            paymentsCanGoNext: paymentsPagination.canGoNext,
            paymentsApplyListMeta: paymentsPagination.applyListMeta,
            paymentsGoPrev: paymentsPagination.goPrev,
            paymentsGoNext: paymentsPagination.goNext,
            paymentsResetPagination: paymentsPagination.reset,
        };
    },
    data: function () {
        return {
            subscriptionStatusToneMap: SUBSCRIPTION_STATUS_TONE_MAP,
            paymentStatusToneMap: PAYMENT_STATUS_TONE_MAP,
            loading: true,
            notFound: false,
            canManageUser: false,
            canModerateUser: false,
            activeTab: "details" as ClientDetailTabId,
            saving: false,
            moderating: false,
            editUsername: "",
            editEmail: "",
            usernameError: "",
            emailError: "",

            id: "",
            role: "",
            username: "",
            email: "",
            verified: false,
            banned: false,
            modImmune: false,
            created: 0,
            name: "",
            bio: "",
            image: "",
            location: "",
            website: "",
            locale: "",
            tfa: false,
            sessions: [] as SessionListItem[],
            organizations: [] as UserAdminOrganizationItem[],
            subscriptions: [] as SubscriptionAdminListItem[],
            payments: [] as PaymentListItem[],
            tokenBalance: { ...EMPTY_TOKEN_BALANCE } as UserAdminTokenBalance,
        };
    },
    computed: {
        userHasChanges: function (): boolean {
            return (this.editUsername || "").trim() !== this.username || (this.editEmail || "").trim() !== this.email;
        },
        displayName: function (): string {
            return this.name || this.username || this.$t("Client");
        },
        roleLabel: function (): string {
            return this.role || "(" + this.$t("Default role") + ")";
        },
        primaryOrganizationName: function (): string {
            if (!this.organizations.length) {
                return "";
            }
            const organization = this.organizations[0];
            return organization?.companyName || organization?.organizationId || "";
        },
        visibleTabs: function (): Array<{ id: ClientDetailTabId; label: string; shortLabel: string; icon: string }> {
            const tabs: Array<{ id: ClientDetailTabId; label: string; shortLabel: string; icon: string }> = [
                { id: "details", label: "Client details", shortLabel: "Details", icon: "fas fa-user" },
                { id: "sessions", label: "Active sessions", shortLabel: "Sessions", icon: "fas fa-desktop" },
                { id: "payments", label: "Payments", shortLabel: "Payments", icon: "fas fa-credit-card" },
                { id: "subscriptions", label: "Subscriptions", shortLabel: "Subscriptions", icon: "fas fa-repeat" },
                { id: "billing", label: "Nubem tokens", shortLabel: "Tokens", icon: "fas fa-coins" },
            ];
            if (this.canManageUser || this.canModerateUser) {
                tabs.push({ id: "settings", label: "Client settings", shortLabel: "Settings", icon: "fas fa-gear" });
            }
            return tabs;
        },
    },
    methods: {
        statusBadgeClass,
        renderDate: function (date: Date | string | number): string {
            if (!date) {
                return "—";
            }
            return renderDate(date, this.$t);
        },

        resetData: function () {
            this.id = "";
            this.role = "";
            this.username = "";
            this.email = "";
            this.verified = false;
            this.banned = false;
            this.modImmune = false;
            this.created = 0;
            this.name = "";
            this.bio = "";
            this.image = "";
            this.location = "";
            this.website = "";
            this.locale = "";
            this.tfa = false;
            this.sessions = [];
            this.organizations = [];
            this.subscriptions = [];
            this.payments = [];
            this.subscriptionsResetPagination();
            this.paymentsResetPagination();
            this.tokenBalance = { ...EMPTY_TOKEN_BALANCE };
            this.syncEditForm();
        },

        applyUserDetails: function (user: UserAdminDetails) {
            this.id = user.id || "";
            this.role = user.role || "";
            this.username = user.username || "";
            this.email = user.email || "";
            this.verified = !!user.verified;
            this.banned = !!user.banned;
            this.modImmune = !!user.modImmune;
            this.created = user.created || 0;
            this.tfa = !!user.tfa;
            this.locale = user.locale || "";
            this.sessions = Array.isArray(user.sessions) ? user.sessions : [];
            this.organizations = Array.isArray(user.organizations) ? user.organizations : [];
            this.tokenBalance = user.tokenBalance || { ...EMPTY_TOKEN_BALANCE };
        },

        applyPublicProfile: function (profile: UserProfile) {
            this.username = profile.username || this.username;
            this.name = profile.name || "";
            this.bio = profile.bio || "";
            this.image = profile.image || "";
            this.location = profile.location || "";
            this.website = profile.website || "";
        },
        syncEditForm: function () {
            this.editUsername = this.username || "";
            this.editEmail = this.email || "";
            this.usernameError = "";
            this.emailError = "";
        },
        refreshPermissions: function (): void {
            this.canManageUser = AuthController.hasPermission("admin.users.manage");
            this.canModerateUser = AuthController.hasPermission("mod.ban");

            if (this.routeEditRequested && this.id && this.canManageUser) {
                this.navigateToSettingsTab();
            }

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
            if (this.activeTab === "subscriptions" && this.id) {
                this.loadSubscriptions();
            } else if (this.activeTab === "payments" && this.id) {
                this.loadPayments();
            }
        },

        loadSubscriptions: function (): void {
            if (!this.id) {
                return;
            }

            this.subscriptionsLoading = true;
            Request.Abort(this.loadSubscriptionsRequestId);
            Request.Pending(
                this.loadSubscriptionsRequestId,
                ApiSubscriptions.ListAdminUserSubscriptions(this.id, {
                    page: String(this.subscriptionsPage),
                    pageSize: String(this.subscriptionsPageSize),
                }),
            )
                .onSuccess((response) => {
                    this.subscriptionsLoading = false;
                    this.subscriptions = response.subscriptions || [];
                    this.subscriptionsApplyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                })
                .onCancel(() => {
                    this.subscriptionsLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.subscriptionsLoading = false;
                    this.subscriptions = [];
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to load subscriptions."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to load subscriptions."));
                        },
                        badRequestInvalidRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to load subscriptions."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load subscriptions."));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to load subscriptions."));
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Server error"), this.$t("Unable to load subscriptions."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.subscriptionsLoading = false;
                    this.subscriptions = [];
                });
        },

        loadPayments: function (): void {
            if (!this.id) {
                return;
            }

            this.paymentsLoading = true;
            Request.Abort(this.loadPaymentsRequestId);
            Request.Pending(
                this.loadPaymentsRequestId,
                ApiPayments.ListAdminUserPayments(this.id, {
                    page: String(this.paymentsPage),
                    pageSize: String(this.paymentsPageSize),
                }),
            )
                .onSuccess((response) => {
                    this.paymentsLoading = false;
                    this.payments = response.payments || [];
                    this.paymentsApplyListMeta({
                        page: response.page,
                        totalPages: response.totalPages,
                    });
                })
                .onCancel(() => {
                    this.paymentsLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.paymentsLoading = false;
                    this.payments = [];
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to load payments."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to load payments."));
                        },
                        badRequestInvalidRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to load payments."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Unable to load payments."));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Network error"), this.$t("Unable to load payments."));
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Server error"), this.$t("Unable to load payments."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.paymentsLoading = false;
                    this.payments = [];
                });
        },

        onSubscriptionsPaginationPrev: function (): void {
            if (!this.subscriptionsGoPrev()) {
                return;
            }
            this.loadSubscriptions();
        },

        onSubscriptionsPaginationNext: function (): void {
            if (!this.subscriptionsGoNext()) {
                return;
            }
            this.loadSubscriptions();
        },

        onPaymentsPaginationPrev: function (): void {
            if (!this.paymentsGoPrev()) {
                return;
            }
            this.loadPayments();
        },

        onPaymentsPaginationNext: function (): void {
            if (!this.paymentsGoNext()) {
                return;
            }
            this.loadPayments();
        },

        selectTab: function (tabId: ClientDetailTabId): void {
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

        formatBillingCycle: function (cycle: string): string {
            const normalized = (cycle || "").toLowerCase();
            if (normalized === "monthly") {
                return String(this.$t("Monthly"));
            }
            if (normalized === "annual") {
                return String(this.$t("Annual"));
            }
            if (normalized === "complete") {
                return String(this.$t("Complete"));
            }
            return cycle ? toTitleCase(cycle) : "—";
        },
        formatSubscriptionCategory: function (category: string | undefined): string {
            const normalized = (category || "").toLowerCase();
            if (normalized === "plan") {
                return String(this.$t("Plan"));
            }
            if (normalized === "service") {
                return String(this.$t("Service"));
            }
            if (normalized === "product") {
                return String(this.$t("Product"));
            }
            return category ? toTitleCase(category) : "—";
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
                subscription_change_plan: String(this.$t("Plan change")),
            };
            return mapping[normalized] || toTitleCase(type);
        },
        subscriptionDetailRoute: function (subscriptionId: string) {
            return { name: "admin-subscription-detail", params: { subscriptionId } };
        },
        formatMoneyFromCents: formatMoneyFromCents,

        navigateToSettingsTab: function (): void {
            if (!this.id || (!this.canManageUser && !this.canModerateUser)) {
                return;
            }
            this.syncEditForm();
            void this.$router.replace({
                query: {
                    ...this.$route.query,
                    tab: "settings",
                    edit: undefined,
                },
            });
        },

        saveUsernameChange: function (nextUsername: string): Promise<boolean> {
            return new Promise((resolve) => {
                Request.Abort(this.saveUsernameRequestId);
                Request.Pending(this.saveUsernameRequestId, ApiUsersAdmin.ChangeUsername(this.id, { username: nextUsername }))
                    .onSuccess(() => {
                        this.username = nextUsername;
                        this.editUsername = nextUsername;
                        this.$setSubTitle(this.displayName);
                        resolve(true);
                    })
                    .onCancel(() => {
                        resolve(false);
                    })
                    .onRequestError((err, handleErr) => {
                        handleErr(err, {
                            unauthorized: () => this.$requireLogin(),
                            badRequestUsernameInvalid: () => {
                                this.usernameError = this.$t("Invalid username provided");
                            },
                            badRequestUsernameInUse: () => {
                                this.usernameError = this.$t("The provided username is already in use");
                            },
                            badRequest: () => {
                                this.usernameError = this.$t("Bad request");
                            },
                            notFound: () => {
                                this.usernameError = this.$t("User not found");
                                this.load();
                            },
                            forbidden: () => {
                                this.usernameError = this.$t("Access denied");
                                this.onAuthChanged();
                            },
                            serverError: () => {
                                this.usernameError = this.$t("Internal server error");
                            },
                            networkError: () => {
                                this.usernameError = this.$t("Could not connect to the server");
                            },
                        });
                        resolve(false);
                    })
                    .onUnexpectedError((err) => {
                        this.usernameError = err.message || this.$t("Internal server error");
                        resolve(false);
                    });
            });
        },
        saveEmailChange: function (nextEmail: string): Promise<boolean> {
            return new Promise((resolve) => {
                Request.Abort(this.saveEmailRequestId);
                Request.Pending(this.saveEmailRequestId, ApiUsersAdmin.ChangeEmail(this.id, { email: nextEmail }))
                    .onSuccess(() => {
                        this.email = nextEmail;
                        this.editEmail = nextEmail;
                        resolve(true);
                    })
                    .onCancel(() => {
                        resolve(false);
                    })
                    .onRequestError((err, handleErr) => {
                        handleErr(err, {
                            unauthorized: () => this.$requireLogin(),
                            badRequestEmailInvalid: () => {
                                this.emailError = this.$t("Invalid email provided");
                            },
                            badRequestEmailInUse: () => {
                                this.emailError = this.$t("The provided email is already in use");
                            },
                            badRequest: () => {
                                this.emailError = this.$t("Bad request");
                            },
                            notFound: () => {
                                this.emailError = this.$t("User not found");
                                this.load();
                            },
                            forbidden: () => {
                                this.emailError = this.$t("Access denied");
                                this.onAuthChanged();
                            },
                            serverError: () => {
                                this.emailError = this.$t("Internal server error");
                            },
                            networkError: () => {
                                this.emailError = this.$t("Could not connect to the server");
                            },
                        });
                        resolve(false);
                    })
                    .onUnexpectedError((err) => {
                        this.emailError = err.message || this.$t("Internal server error");
                        resolve(false);
                    });
            });
        },
        submitUserUpdate: async function (event: Event): Promise<void> {
            if (event) {
                event.preventDefault();
            }
            if (!this.canManageUser || !this.id || this.saving || !this.userHasChanges) {
                return;
            }

            const nextUsername = (this.editUsername || "").trim();
            const nextEmail = (this.editEmail || "").trim();
            const shouldUpdateUsername = nextUsername !== this.username;
            const shouldUpdateEmail = nextEmail !== this.email;

            this.usernameError = "";
            this.emailError = "";
            this.saving = true;

            if (shouldUpdateUsername) {
                const usernameSaved = await this.saveUsernameChange(nextUsername);
                if (!usernameSaved) {
                    this.saving = false;
                    return;
                }
            }

            if (shouldUpdateEmail) {
                const emailSaved = await this.saveEmailChange(nextEmail);
                if (!emailSaved) {
                    this.saving = false;
                    return;
                }
            }

            this.saving = false;
            this.$showSnackBar(this.$t("Changes successfully saved"));
            this.load();
        },

        loadPublicProfile: function (userId: string) {
            if (!userId) {
                return;
            }

            Request.Abort(this.loadProfileRequestId);
            Request.Pending(this.loadProfileRequestId, ApiProfile.GetProfile(userId))
                .onSuccess((profile) => {
                    if (userId !== this.routeClientId) {
                        return;
                    }
                    this.applyPublicProfile(profile);
                    this.$setSubTitle(this.displayName);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            // Public profile is optional for this view.
                        },
                        temporalError: () => {
                            // Do not block the administrative detail view on public profile retries.
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                });
        },

        confirmBanUser: function (): void {
            if (!this.id || this.moderating || !this.canModerateUser || this.banned || this.modImmune) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Ban user"),
                message: this.$t("Do you want to ban this user from the platform?"),
                danger: true,
                callback: () => {
                    this.doBanUser();
                },
            });
        },

        doBanUser: function (): void {
            if (!this.id || !this.canModerateUser) {
                return;
            }
            Request.Abort(this.moderationRequestId);
            this.moderating = true;
            Request.Pending(this.moderationRequestId, ApiUsersAdmin.Ban(this.id))
                .onSuccess(() => {
                    this.moderating = false;
                    this.banned = true;
                    this.$showSnackBar(this.$t("User banned"));
                    this.load();
                })
                .onCancel(() => {
                    this.moderating = false;
                })
                .onRequestError((err, handleErr) => {
                    this.moderating = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This user is immune to moderation"));
                        },
                        badRequestImmune: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This user is immune to moderation"));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("User not found"));
                            this.load();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            this.refreshPermissions();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.moderating = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        confirmPardonUser: function (): void {
            if (!this.id || this.moderating || !this.canModerateUser || !this.banned) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Unban user"),
                message: this.$t("Do you want to unban this user?"),
                danger: false,
                callback: () => {
                    this.doPardonUser();
                },
            });
        },

        doPardonUser: function (): void {
            if (!this.id || !this.canModerateUser) {
                return;
            }
            Request.Abort(this.moderationRequestId);
            this.moderating = true;
            Request.Pending(this.moderationRequestId, ApiUsersAdmin.Pardon(this.id))
                .onSuccess(() => {
                    this.moderating = false;
                    this.banned = false;
                    this.$showSnackBar(this.$t("User unbanned"));
                    this.load();
                })
                .onCancel(() => {
                    this.moderating = false;
                })
                .onRequestError((err, handleErr) => {
                    this.moderating = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("User not found"));
                            this.load();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            this.refreshPermissions();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.moderating = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        onAuthChanged: function () {
            this.refreshPermissions();
        },

        load: function () {
            Timeouts.Abort(this.loadUserRequestId);
            Request.Abort(this.loadUserRequestId);
            Request.Abort(this.loadProfileRequestId);

            const targetId = this.routeClientId;
            this.resetData();

            if (!targetId) {
                this.loading = false;
                this.notFound = true;
                this.$setSubTitle(this.$t("Client not found"));
                return;
            }

            this.loading = true;
            this.notFound = false;

            Request.Pending(this.loadUserRequestId, ApiUsersAdmin.GetUser(targetId))
                .onSuccess((user) => {
                    this.applyUserDetails(user);
                    this.loading = false;
                    this.notFound = false;
                    this.syncEditForm();
                    this.$setSubTitle(this.displayName);
                    this.loadPublicProfile(user.id || targetId);
                    this.refreshPermissions();
                    this.syncTabFromRoute();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.$setSubTitle(this.$t("Client not found"));
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadUserRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.loadUserRequestId, 1500, this.load.bind(this));
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.refreshPermissions();
        this.syncTabFromRoute();
        this.$setSubTitle(this.$t("Client"));
        this.load();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadUserRequestId);
        Request.Abort(this.loadUserRequestId);
        Request.Abort(this.loadProfileRequestId);
        Request.Abort(this.loadSubscriptionsRequestId);
        Request.Abort(this.loadPaymentsRequestId);
        Request.Abort(this.saveUsernameRequestId);
        Request.Abort(this.saveEmailRequestId);
        Request.Abort(this.moderationRequestId);
    },
    watch: {
        routeClientId: function () {
            this.load();
        },
        routeEditRequested: function (shouldEdit: boolean) {
            if (shouldEdit && this.canManageUser && this.id) {
                this.navigateToSettingsTab();
            }
        },
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/details-view.css";

.client-detail-organization {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 16px;
    line-height: 24px;
    font-weight: 500;
}
</style>
