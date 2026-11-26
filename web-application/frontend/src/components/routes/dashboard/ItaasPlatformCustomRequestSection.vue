<template>
    <div class="itaas-platform-custom-request">
        <header class="itaas-platform-panel-header">
            <div class="itaas-platform-panel-header__content">
                <h2 class="details-view-panel-title">{{ $t("Request flow") }}</h2>
                <p class="dashboard-page-header__subtitle">
                    {{ $t("Request a custom flow or adaptation and track its review status.") }}
                </p>
            </div>
        </header>

        <p v-if="loadingCatalog || loadingRequests" class="table-feedback">{{ $t("Loading") }}...</p>
        <p v-else-if="accessDenied" class="table-feedback">
            {{ $t("Active ITAAS subscription or assigned organization license is required") }}
        </p>
        <p v-else-if="orgAdminRequired" class="table-feedback">
            {{ $t("Only the organization admin can request custom agents or adaptations.") }}
        </p>

        <template v-else>
            <article v-if="catalogSummary && catalogSummary.hasPricing" class="itaas-platform-info-card">
                <h3 class="itaas-platform-pricing-title">{{ $t("Pricing") }}</h3>
                <ul class="itaas-platform-pricing-list" :aria-label="$t('Custom agent pricing')">
                    <li v-if="catalogSummary.depositFormatted">
                        <strong>{{ $t("One-time deposit") }}:</strong>
                        {{ catalogSummary.depositFormatted }}
                        <span class="itaas-platform-pricing-hint">{{ $t("Charged when your request is accepted") }}</span>
                    </li>
                    <li v-if="catalogSummary.monthlyFormatted">
                        <strong>{{ $t("Monthly fee") }}:</strong>
                        {{ catalogSummary.monthlyFormatted }}
                        <span class="itaas-platform-pricing-hint">{{ $t("Charged when the flow is delivered") }}</span>
                    </li>
                </ul>
            </article>

            <section class="itaas-platform-form-card">
                <h3 class="details-view-panel-title itaas-platform-form-card__title">{{ $t("Request a flow") }}</h3>

                <nav class="itaas-platform-wizard-steps" :aria-label="$t('Request flow steps')">
                    <button
                        v-for="(step, index) in wizardSteps"
                        :key="step"
                        type="button"
                        class="itaas-platform-wizard-step"
                        :class="{ active: wizardStep === index, done: wizardStep > index }"
                        :disabled="index > wizardStep"
                        :aria-current="wizardStep === index ? 'step' : undefined"
                        @click="goToWizardStep(index)"
                    >
                        <span class="itaas-platform-wizard-step__number">
                            <i v-if="wizardStep > index" class="fas fa-check" aria-hidden="true"></i>
                            <span v-else>{{ index + 1 }}</span>
                        </span>
                        <span class="itaas-platform-wizard-step__label">{{ step }}</span>
                    </button>
                </nav>

                <div class="itaas-platform-wizard-heading" aria-live="polite">
                    <h4 class="itaas-platform-wizard-current-step" aria-hidden="true">{{ wizardSteps[wizardStep] }}</h4>
                    <p class="itaas-platform-wizard-description">{{ wizardStepDescription }}</p>
                </div>

                <div v-if="wizardStep === 0" class="itaas-platform-wizard-pane">
                    <div class="itaas-platform-wizard-type-cards" role="radiogroup" :aria-label="$t('Request type')">
                        <button
                            type="button"
                            class="itaas-platform-wizard-type-card"
                            :class="{ selected: wizardReqType === 'custom' }"
                            role="radio"
                            :aria-checked="wizardReqType === 'custom'"
                            @click="selectRequestType('custom')"
                        >
                            <i class="fas fa-diagram-project" aria-hidden="true"></i>
                            <span class="itaas-platform-wizard-type-card__title">{{ $t("Custom flow") }}</span>
                            <span class="itaas-platform-wizard-type-card__text">{{
                                $t("Design from scratch: nodes, loops, branches and tools for your use case.")
                            }}</span>
                        </button>
                        <button
                            type="button"
                            class="itaas-platform-wizard-type-card"
                            :class="{ selected: wizardReqType === 'adaptation' }"
                            role="radio"
                            :aria-checked="wizardReqType === 'adaptation'"
                            @click="selectRequestType('adaptation')"
                        >
                            <i class="fas fa-code-branch" aria-hidden="true"></i>
                            <span class="itaas-platform-wizard-type-card__title">{{ $t("Adaptation") }}</span>
                            <span class="itaas-platform-wizard-type-card__text">{{
                                $t("Start from an existing catalog flow and adapt it to your organization.")
                            }}</span>
                        </button>
                    </div>

                    <label v-if="wizardReqType === 'adaptation'" class="form-group" for="itaas-wizard-base-agent">
                        <span class="form-label">
                            {{ $t("Base public agent") }}
                            <span class="itaas-platform-required-marker" aria-hidden="true">*</span>
                        </span>
                        <select
                            id="itaas-wizard-base-agent"
                            v-model="wizardAdaptAgentId"
                            class="form-control"
                            :disabled="publicAgents.length === 0"
                            :aria-invalid="wizardError === 'base-agent-required' ? 'true' : undefined"
                            :aria-describedby="wizardError === 'base-agent-required' ? 'itaas-wizard-base-agent-error' : undefined"
                            @change="wizardError = ''"
                        >
                            <option value="" disabled>
                                {{ publicAgents.length ? $t("Select a public agent") : $t("No public agents found") }}
                            </option>
                            <option v-for="agent in publicAgents" :key="agent.id" :value="agent.id">
                                {{ agent.name }}
                            </option>
                        </select>
                        <span v-if="publicAgents.length === 0" class="itaas-platform-wizard-hint">
                            {{ $t("No public agents found") }}
                        </span>
                        <span
                            v-if="wizardError === 'base-agent-required'"
                            id="itaas-wizard-base-agent-error"
                            class="form-error"
                            role="alert"
                        >
                            {{ wizardErrorMessage }}
                        </span>
                    </label>

                    <div class="itaas-platform-wizard-actions">
                        <button
                            type="button"
                            class="btn btn-primary"
                            :disabled="
                                wizardNavigating ||
                                (wizardReqType === 'adaptation' && (!wizardAdaptAgentId.trim() || publicAgents.length === 0))
                            "
                            @click="wizardNext"
                        >
                            {{ $t("Continue") }}
                        </button>
                    </div>
                </div>

                <div v-else-if="wizardStep === 1" class="itaas-platform-wizard-pane">
                    <label class="form-group" for="itaas-wizard-title">
                        <span class="form-label">
                            {{ $t("Title") }}
                            <span class="itaas-platform-required-marker" aria-hidden="true">*</span>
                        </span>
                        <input
                            id="itaas-wizard-title"
                            v-model.trim="wizardTitle"
                            type="text"
                            class="form-control"
                            maxlength="80"
                            :aria-invalid="
                                wizardStep === 1 && (wizardError === 'title-required' || wizardError === 'title-too-long')
                                    ? 'true'
                                    : undefined
                            "
                            :aria-describedby="
                                wizardStep === 1 && (wizardError === 'title-required' || wizardError === 'title-too-long')
                                    ? 'itaas-wizard-title-error'
                                    : undefined
                            "
                            :placeholder="$t('e.g. Banking reconciliation flow')"
                            @input="wizardError = ''"
                        />
                        <span
                            v-if="wizardStep === 1 && (wizardError === 'title-required' || wizardError === 'title-too-long')"
                            id="itaas-wizard-title-error"
                            class="form-error"
                            role="alert"
                        >
                            {{ wizardErrorMessage }}
                        </span>
                    </label>
                    <label class="form-group" for="itaas-wizard-description">
                        <span class="form-label">
                            {{ $t("Description / requirements") }}
                            <span class="itaas-platform-required-marker" aria-hidden="true">*</span>
                        </span>
                        <textarea
                            id="itaas-wizard-description"
                            v-model.trim="wizardDesc"
                            class="form-control"
                            rows="5"
                            maxlength="2800"
                            :aria-invalid="
                                wizardStep === 1 && (wizardError === 'desc-too-short' || wizardError === 'desc-too-long')
                                    ? 'true'
                                    : undefined
                            "
                            :aria-describedby="
                                wizardStep === 1 && (wizardError === 'desc-too-short' || wizardError === 'desc-too-long')
                                    ? 'itaas-wizard-description-error'
                                    : undefined
                            "
                            :placeholder="$t('Goal, inputs, outputs, business rules, SLAs...')"
                            @input="wizardError = ''"
                        ></textarea>
                        <span
                            v-if="wizardStep === 1 && (wizardError === 'desc-too-short' || wizardError === 'desc-too-long')"
                            id="itaas-wizard-description-error"
                            class="form-error"
                            role="alert"
                        >
                            {{ wizardErrorMessage }}
                        </span>
                    </label>
                    <label class="form-group" for="itaas-wizard-pattern">
                        <span class="form-label">{{ $t("Desired pattern") }}</span>
                        <select id="itaas-wizard-pattern" v-model="wizardPattern" class="form-control">
                            <option value="linear">{{ $t("Linear (pipeline)") }}</option>
                            <option value="loop">{{ $t("Loop / iteration") }}</option>
                            <option value="branch">{{ $t("Conditional branches") }}</option>
                            <option value="parallel">{{ $t("Parallel + merge") }}</option>
                            <option value="agent-tools">{{ $t("Agent with tools") }}</option>
                        </select>
                    </label>
                    <div class="itaas-platform-wizard-actions">
                        <button type="button" class="btn btn-tertiary" @click="wizardPrev">{{ $t("Back") }}</button>
                        <button type="button" class="btn btn-primary" @click="wizardNext">{{ $t("Continue") }}</button>
                    </div>
                </div>

                <div v-else-if="wizardStep === 2" class="itaas-platform-wizard-pane">
                    <label class="form-group" for="itaas-wizard-integrations">
                        <span class="form-label">
                            {{ $t("Integrations / credentials") }}
                            <span class="itaas-platform-required-marker" aria-hidden="true">*</span>
                        </span>
                        <textarea
                            id="itaas-wizard-integrations"
                            v-model.trim="wizardIntegrations"
                            class="form-control"
                            rows="4"
                            maxlength="1000"
                            :aria-invalid="
                                wizardStep === 2 && (wizardError === 'integrations-required' || wizardError === 'integrations-too-long')
                                    ? 'true'
                                    : undefined
                            "
                            :aria-describedby="wizardStep === 2 && wizardError ? 'itaas-wizard-integrations-error' : undefined"
                            :placeholder="$t('OpenAI, CRM, SharePoint, email, webhooks...')"
                            @input="wizardError = ''"
                        ></textarea>
                        <span class="itaas-platform-wizard-hint">
                            {{ $t("API keys will be configured later in Credentials.") }}
                        </span>
                        <span v-if="wizardStep === 2 && wizardError" id="itaas-wizard-integrations-error" class="form-error" role="alert">
                            {{ wizardErrorMessage }}
                        </span>
                    </label>
                    <label class="form-group" for="itaas-wizard-priority">
                        <span class="form-label">{{ $t("Priority") }}</span>
                        <select id="itaas-wizard-priority" v-model="wizardPriority" class="form-control">
                            <option value="normal">{{ $t("Normal") }}</option>
                            <option value="high">{{ $t("High") }}</option>
                            <option value="low">{{ $t("Low") }}</option>
                        </select>
                    </label>
                    <div class="itaas-platform-wizard-actions">
                        <button type="button" class="btn btn-tertiary" @click="wizardPrev">{{ $t("Back") }}</button>
                        <button type="button" class="btn btn-primary" @click="wizardNext">{{ $t("Continue") }}</button>
                    </div>
                </div>

                <div v-else class="itaas-platform-wizard-pane">
                    <div class="itaas-platform-wizard-review">
                        <div class="itaas-platform-wizard-review-intro">
                            <i class="fas fa-clipboard-check" aria-hidden="true"></i>
                            <p>{{ $t("Review the information before sending. You can keep up to 5 requests pending at a time.") }}</p>
                        </div>
                        <dl class="itaas-platform-wizard-review-list">
                            <div>
                                <dt>{{ $t("Request type") }}</dt>
                                <dd>{{ formatRequestType(wizardReqType) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Title") }}</dt>
                                <dd>{{ wizardTitle }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Desired pattern") }}</dt>
                                <dd>{{ formatWizardPattern(wizardPattern) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t("Priority") }}</dt>
                                <dd>{{ formatWizardPriority(wizardPriority) }}</dd>
                            </div>
                            <div v-if="wizardReqType === 'adaptation' && wizardAdaptAgentId.trim()">
                                <dt>{{ $t("Base public agent") }}</dt>
                                <dd>{{ selectedBaseAgentLabel }}</dd>
                            </div>
                            <div v-if="catalogSummary && catalogSummary.depositFormatted">
                                <dt>{{ $t("One-time deposit") }}</dt>
                                <dd>
                                    {{ catalogSummary.depositFormatted }}
                                    —
                                    {{ $t("Charged after acceptance") }}
                                </dd>
                            </div>
                            <div v-if="catalogSummary && catalogSummary.monthlyFormatted">
                                <dt>{{ $t("Monthly fee") }}</dt>
                                <dd>
                                    {{ catalogSummary.monthlyFormatted }}
                                    —
                                    {{ $t("Starts when the flow is delivered") }}
                                </dd>
                            </div>
                        </dl>
                        <div class="itaas-platform-wizard-review-description">
                            <span>{{ $t("Description / requirements") }}</span>
                            <p>{{ wizardDesc }}</p>
                        </div>
                        <div v-if="wizardIntegrations.trim()" class="itaas-platform-wizard-review-description">
                            <span>{{ $t("Integrations / credentials") }}</span>
                            <p>{{ wizardIntegrations }}</p>
                        </div>
                        <p
                            v-if="catalogSummary && catalogSummary.depositFormatted && catalogSummary.monthlyFormatted"
                            class="itaas-platform-wizard-review-pricing-note"
                        >
                            {{
                                $t("After acceptance you will pay a {0} deposit. When the flow is delivered, a monthly fee of {1} starts.")
                                    .replace("{0}", catalogSummary.depositFormatted)
                                    .replace("{1}", catalogSummary.monthlyFormatted)
                            }}
                        </p>
                    </div>
                    <div class="itaas-platform-wizard-actions">
                        <button type="button" class="btn btn-tertiary" @click="wizardPrev">{{ $t("Back") }}</button>
                        <button type="button" class="btn btn-primary" :disabled="submitting || !canSubmit" @click="submitRequest">
                            <i v-if="submitting" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                            <i v-else class="fas fa-paper-plane" aria-hidden="true"></i>
                            {{ submitting ? $t("Submitting request...") : $t("Send request") }}
                        </button>
                    </div>
                </div>
            </section>

            <section class="itaas-platform-requests-card">
                <header class="itaas-platform-requests-header">
                    <h3 class="details-view-panel-title">{{ $t("Your requests") }}</h3>
                    <span v-if="requests.length" class="itaas-platform-requests-count" :aria-label="$t('Number of requests')">
                        <span class="itaas-platform-requests-count-value">{{ requests.length }}</span>
                    </span>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn itaas-platform-requests-refresh"
                        :aria-label="$t('Refresh')"
                        :title="$t('Refresh')"
                        :disabled="loadingRequests || loadingCatalog"
                        @click="reloadSection"
                    >
                        <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
                    </button>
                </header>
                <p v-if="requests.length === 0" class="table-feedback">{{ $t("No flow requests yet") }}</p>
                <ul v-else class="itaas-platform-request-list">
                    <li v-for="requestItem in requests" :key="requestItem.id" class="itaas-platform-request-row">
                        <div class="itaas-platform-request-header">
                            <div class="itaas-platform-request-body">
                                <div class="itaas-platform-request-title-row">
                                    <h4 class="itaas-platform-request-title" :title="getRequestTitle(requestItem.description)">
                                        {{ getRequestTitle(requestItem.description) }}
                                    </h4>
                                    <span :class="statusBadgeClass(requestItem.status, customRequestStatusToneMap)" role="status">
                                        {{ formatRequestStatus(requestItem.status) }}
                                    </span>
                                </div>
                                <p class="itaas-platform-request-type">{{ formatRequestType(requestItem.requestType) }}</p>
                                <p class="itaas-platform-request-meta">
                                    <span class="itaas-platform-request-date">{{ renderTimestamp(requestItem.createdAt) }}</span>
                                    <span class="itaas-platform-request-id-row">
                                        <span class="itaas-platform-request-id" :title="requestItem.id">{{
                                            truncateMiddle(requestItem.id, 20)
                                        }}</span>
                                        <CopyIconButton
                                            :text="requestItem.id"
                                            label="Copy request ID"
                                            success-message="Copied to clipboard!"
                                        />
                                    </span>
                                </p>
                                <p
                                    v-if="canPayDeposit(requestItem) && catalogSummary && catalogSummary.hasPricing"
                                    class="itaas-platform-request-pricing"
                                >
                                    {{ $t("Deposit due") }}: {{ catalogSummary.depositFormatted }}
                                </p>
                                <p
                                    v-else-if="isDeliveredRequest(requestItem) && catalogSummary && catalogSummary.hasPricing"
                                    class="itaas-platform-request-pricing"
                                >
                                    {{ $t("Monthly fee active") }}: {{ catalogSummary.monthlyFormatted }}
                                </p>
                            </div>
                        </div>
                        <div class="itaas-platform-request-content-grid">
                            <div class="itaas-platform-request-description-column">
                                <p
                                    class="itaas-platform-request-description"
                                    :class="{
                                        'is-collapsed':
                                            isFieldCollapsible(requestItem, 'description') &&
                                            !isFieldExpanded(requestItem.id, 'description'),
                                    }"
                                >
                                    {{ getRequestDescription(requestItem.description) }}
                                </p>
                                <button
                                    v-if="isFieldCollapsible(requestItem, 'description')"
                                    type="button"
                                    class="itaas-platform-request-description-toggle"
                                    :aria-expanded="isFieldExpanded(requestItem.id, 'description')"
                                    @click="toggleField(requestItem.id, 'description')"
                                >
                                    {{ isFieldExpanded(requestItem.id, "description") ? $t("Show less") : $t("Show more") }}
                                </button>
                            </div>
                            <dl v-if="hasRequestMetadata(requestItem.description)" class="itaas-platform-request-metadata">
                                <div v-if="getRequestField(requestItem.description, 'pattern')">
                                    <dt>{{ $t("Desired pattern") }}</dt>
                                    <dd>{{ formatWizardPattern(getRequestField(requestItem.description, "pattern")) }}</dd>
                                </div>
                                <div v-if="getRequestField(requestItem.description, 'integrations')">
                                    <dt>{{ $t("Integrations / credentials") }}</dt>
                                    <dd
                                        :class="{
                                            'is-collapsed':
                                                isFieldCollapsible(requestItem, 'integrations') &&
                                                !isFieldExpanded(requestItem.id, 'integrations'),
                                        }"
                                    >
                                        {{ getRequestField(requestItem.description, "integrations") }}
                                    </dd>
                                    <button
                                        v-if="isFieldCollapsible(requestItem, 'integrations')"
                                        type="button"
                                        class="itaas-platform-request-description-toggle"
                                        :aria-expanded="isFieldExpanded(requestItem.id, 'integrations')"
                                        @click="toggleField(requestItem.id, 'integrations')"
                                    >
                                        {{ isFieldExpanded(requestItem.id, "integrations") ? $t("Show less") : $t("Show more") }}
                                    </button>
                                </div>
                                <div v-if="getRequestField(requestItem.description, 'priority')">
                                    <dt>{{ $t("Priority") }}</dt>
                                    <dd>{{ formatWizardPriority(getRequestField(requestItem.description, "priority")) }}</dd>
                                </div>
                            </dl>
                        </div>
                        <div v-if="requestItem.adminRejectionReason" class="itaas-platform-request-notes">
                            <p class="itaas-platform-request-note">
                                <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
                                <span>
                                    <strong>{{ $t("Rejection reason") }}:</strong>
                                    {{ requestItem.adminRejectionReason }}
                                </span>
                            </p>
                        </div>
                        <div class="itaas-platform-request-actions">
                            <button
                                v-if="canPayDeposit(requestItem)"
                                type="button"
                                class="btn btn-primary btn-sm"
                                :disabled="busyRequestId === requestItem.id || displayDepositCheckoutModal"
                                @click="openDepositCheckout(requestItem)"
                            >
                                <i
                                    class="fas"
                                    :class="busyRequestId === requestItem.id ? 'fa-spinner fa-spin' : 'fa-credit-card'"
                                    aria-hidden="true"
                                ></i>
                                {{
                                    catalogSummary && catalogSummary.hasPricing
                                        ? $t("Pay deposit ({0})").replace("{0}", catalogSummary.depositFormatted)
                                        : $t("Pay deposit")
                                }}
                            </button>
                            <button
                                v-if="canCancelRequest(requestItem)"
                                type="button"
                                class="btn btn-danger btn-sm"
                                :disabled="busyRequestId === requestItem.id"
                                :aria-label="$t('Cancel request')"
                                @click="confirmCancelRequest(requestItem)"
                            >
                                <i class="fas fa-ban" aria-hidden="true"></i>
                                <span class="itaas-platform-request-action-label-full">{{ $t("Cancel request") }}</span>
                                <span class="itaas-platform-request-action-label-short">{{ $t("Cancel") }}</span>
                            </button>
                            <button
                                type="button"
                                class="btn btn-tertiary btn-sm itaas-platform-request-track-btn"
                                :aria-label="$t('View request tracking')"
                                @click="openRequestTracking(requestItem)"
                            >
                                <i class="fas fa-route" aria-hidden="true"></i>
                                <span class="itaas-platform-request-action-label-full">{{ $t("View request tracking") }}</span>
                                <span class="itaas-platform-request-action-label-short">{{ $t("View tracking") }}</span>
                            </button>
                        </div>
                    </li>
                </ul>
            </section>
        </template>

        <ItaasPlatformRequestTrackingModal
            v-model:display="displayTrackingModal"
            :request="selectedRequest"
            :deposit-formatted="catalogSummary?.depositFormatted || ''"
            :monthly-formatted="catalogSummary?.monthlyFormatted || ''"
        />

        <CustomAgentDepositCheckoutModal
            v-model:display="displayDepositCheckoutModal"
            :busy="Boolean(busyRequestId && selectedDepositRequest && busyRequestId === selectedDepositRequest.id)"
            :deposit-amount-cents="catalogSummary?.depositCents || 0"
            :deposit-formatted="catalogSummary?.depositFormatted || ''"
            @confirm="confirmDepositCheckout"
        />

        <ModalDialogContainer v-model:display="displayPurchaseResultModal">
            <div class="modal-dialog modal-md purchase-result-modal" @click="stopPurchaseResultEvent">
                <div class="modal-header">
                    <div class="modal-title">{{ purchaseResultModalTitle }}</div>
                    <button
                        type="button"
                        class="modal-close-btn"
                        :title="$t('Close')"
                        :aria-label="$t('Close')"
                        @click="closePurchaseResultModal"
                    >
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="modal-body purchase-result-modal-body">
                    <div class="purchase-result-icon-wrap" :class="purchaseResultModalToneClass">
                        <i :class="purchaseResultModalIconClass" aria-hidden="true"></i>
                    </div>
                    <p class="purchase-result-message">{{ purchaseResultModalMessage }}</p>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary purchase-result-close-btn" @click="closePurchaseResultModal">
                        {{ $t("Close") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>
    </div>
</template>

<script lang="ts">
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import { ApiItaasPlatform } from "@/api/api-group-itaas-platform";
import type { CatalogPublicItemDetail, ItaasCustomAgentRequestItem, ItaasCustomAgentRequestListResponse } from "@/api/definitions";
import CustomAgentDepositCheckoutModal from "@/components/modals/CustomAgentDepositCheckoutModal.vue";
import ItaasPlatformRequestTrackingModal from "@/components/modals/ItaasPlatformRequestTrackingModal.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { useAgentMarketplace } from "@/composables/useAgentMarketplace";
import { statusBadgeClass } from "@/utils/status-badge";
import { truncateMiddle } from "@/utils/text";
import { getUniqueStringId } from "@/utils/unique-id";
import { renderDateAndTime } from "@/utils/time-utils";
import { formatMoneyFromCents } from "@/utils/format-currency";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

type PurchaseResultVariant = "success" | "cancel" | "error";

const CUSTOM_AGENT_SERVICE_ITEM_ID = "custom-agent-service";
const FLOW_TITLE_MAX_LENGTH = 80;
const FLOW_DESCRIPTION_MAX_LENGTH = 2800;
const FLOW_INTEGRATIONS_MAX_LENGTH = 1000;
const REQUEST_DESCRIPTION_COLLAPSE_LENGTH = 280;
const REQUEST_DESCRIPTION_COLLAPSE_LINE_COUNT = 5;
const REQUEST_FIELD_LABELS = {
    pattern: ["desired pattern", "patrón deseado"],
    integrations: ["integrations / credentials", "integraciones / credenciales"],
    priority: ["priority", "prioridad"],
} as const;

type CatalogSummary = {
    hasPricing: boolean;
    depositCents: number;
    depositFormatted: string;
    monthlyFormatted: string;
};

const CUSTOM_REQUEST_STATUS_TONE_MAP: Record<string, "success" | "warning" | "error" | "muted"> = {
    pending_review: "warning",
    rejected: "error",
    pending_payment: "warning",
    in_development: "warning",
    delivered: "success",
    cancelled: "muted",
};

export default defineComponent({
    name: "ItaasPlatformCustomRequestSection",
    components: {
        CopyIconButton,
        CustomAgentDepositCheckoutModal,
        ItaasPlatformRequestTrackingModal,
        ModalDialogContainer,
    },
    setup: function () {
        const marketplace = useAgentMarketplace();

        return {
            publicAgents: marketplace.allAgents,
        };
    },
    data: function () {
        return {
            loadingCatalog: false,
            loadingRequests: false,
            submitting: false,
            accessDenied: false,
            orgAdminRequired: false,
            catalogSummary: null as CatalogSummary | null,
            requests: [] as ItaasCustomAgentRequestItem[],
            wizardStep: 0,
            wizardReqType: "custom" as "custom" | "adaptation",
            wizardAdaptAgentId: "",
            wizardTitle: "",
            wizardDesc: "",
            wizardError: "",
            wizardPattern: "linear",
            wizardIntegrations: "",
            wizardPriority: "normal",
            wizardNavigating: false,
            catalogRequestId: getUniqueStringId(),
            listRequestId: getUniqueStringId(),
            submitRequestId: getUniqueStringId(),
            cancelRequestId: getUniqueStringId(),
            checkoutRequestId: getUniqueStringId(),
            busyRequestId: "",
            customRequestStatusToneMap: CUSTOM_REQUEST_STATUS_TONE_MAP,
            displayTrackingModal: false,
            selectedRequest: null as ItaasCustomAgentRequestItem | null,
            displayDepositCheckoutModal: false,
            selectedDepositRequest: null as ItaasCustomAgentRequestItem | null,
            expandedFieldKeys: [] as string[],
            displayPurchaseResultModal: false,
            purchaseResultModalVariant: "success" as PurchaseResultVariant,
            purchaseResultModalTitle: "",
            purchaseResultModalMessage: "",
        };
    },
    computed: {
        purchaseResultModalIconClass: function (): string {
            if (this.purchaseResultModalVariant === "success") {
                return "fas fa-check-circle";
            }
            if (this.purchaseResultModalVariant === "cancel") {
                return "fas fa-exclamation-circle";
            }
            return "fas fa-times-circle";
        },
        purchaseResultModalToneClass: function (): string {
            if (this.purchaseResultModalVariant === "success") {
                return "is-success";
            }
            if (this.purchaseResultModalVariant === "cancel") {
                return "is-warning";
            }
            return "is-error";
        },
        wizardSteps: function (): string[] {
            return [this.$t("Type"), this.$t("Requirements"), this.$t("Integrations"), this.$t("Review")];
        },
        wizardStepDescription: function (): string {
            switch (this.wizardStep) {
                case 0:
                    return this.$t("Choose whether to create a flow from scratch or adapt an existing one.");
                case 1:
                    return this.$t("Describe what the flow should do and how it should behave.");
                case 2:
                    return this.$t("List the integrations and choose the request priority.");
                case 3:
                    return this.$t("Review the information before sending your request.");
                default:
                    return "";
            }
        },
        wizardValid: function (): boolean {
            if (
                this.wizardTitle.trim().length === 0 ||
                this.wizardTitle.trim().length > FLOW_TITLE_MAX_LENGTH ||
                this.wizardDesc.trim().length < 10 ||
                this.wizardDesc.trim().length > FLOW_DESCRIPTION_MAX_LENGTH ||
                this.wizardIntegrations.trim().length === 0 ||
                this.wizardIntegrations.trim().length > FLOW_INTEGRATIONS_MAX_LENGTH
            ) {
                return false;
            }
            if (this.wizardReqType === "adaptation" && !this.hasValidBaseAgent) {
                return false;
            }
            return true;
        },
        hasValidBaseAgent: function (): boolean {
            return this.wizardReqType !== "adaptation" || this.publicAgents.some((agent) => agent.id === this.wizardAdaptAgentId);
        },
        selectedBaseAgentLabel: function (): string {
            const selectedAgent = this.publicAgents.find((agent) => agent.id === this.wizardAdaptAgentId);
            return selectedAgent ? selectedAgent.name : this.wizardAdaptAgentId;
        },
        wizardErrorMessage: function (): string {
            switch (this.wizardError) {
                case "title-required":
                    return this.$t("Title is required");
                case "title-too-long":
                    return this.$t("Flow name must be 80 characters or fewer");
                case "desc-too-short":
                    return this.$t("Description must be at least 10 characters");
                case "desc-too-long":
                    return this.$t("Description must be 2800 characters or fewer");
                case "integrations-required":
                    return this.$t("Integrations are required");
                case "integrations-too-long":
                    return this.$t("Integrations must be 1000 characters or fewer");
                case "base-agent-required":
                    return this.$t("Select a public agent for adaptation");
                default:
                    return "";
            }
        },
        canSubmit: function (): boolean {
            return this.wizardValid;
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        getCheckoutReturnUrl: function (result: PurchaseResultVariant): string {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "custom-request");
            url.searchParams.set("checkout_result", result);
            url.searchParams.delete("session_id");
            return url.toString();
        },
        openPurchaseResultModal: function (variant: PurchaseResultVariant, title: string, message: string): void {
            this.purchaseResultModalVariant = variant;
            this.purchaseResultModalTitle = title;
            this.purchaseResultModalMessage = message;
            this.displayPurchaseResultModal = true;
        },
        closePurchaseResultModal: function (): void {
            this.displayPurchaseResultModal = false;
        },
        stopPurchaseResultEvent: function (event: Event): void {
            event.stopPropagation();
        },
        clearCheckoutReturnQuery: function (): void {
            const nextQuery = { ...(this.$route.query as Record<string, string>) };
            delete nextQuery.checkout_result;
            delete nextQuery.session_id;
            void this.$router.replace({ query: nextQuery }).catch(() => {});
        },
        handleCheckoutReturnResult: function (): void {
            const queryResult = String(this.$route.query.checkout_result || "")
                .trim()
                .toLowerCase();
            if (!["success", "cancel", "error"].includes(queryResult)) {
                return;
            }

            if (queryResult === "success") {
                this.openPurchaseResultModal(
                    "success",
                    this.$t("Deposit paid"),
                    this.$t("Your deposit was received. Development can start."),
                );
                this.loadRequests();
            } else if (queryResult === "cancel") {
                this.openPurchaseResultModal(
                    "cancel",
                    this.$t("Payment cancelled"),
                    this.$t("The deposit checkout was cancelled. You can try again whenever you want."),
                );
            } else {
                this.openPurchaseResultModal(
                    "error",
                    this.$t("Payment failed"),
                    this.$t("An error occurred while processing your deposit payment. Please try again."),
                );
            }

            this.clearCheckoutReturnQuery();
        },
        formatRequestType: function (requestType: string): string {
            const normalized = (requestType || "").trim().toLowerCase();
            if (normalized === "adaptation") {
                return this.$t("Adaptation of existing flow");
            }
            return this.$t("Custom flow");
        },
        getRequestTitle: function (description: string): string {
            const firstLine = (description || "").split(/\r?\n/)[0].trim();
            const separatorIndex = firstLine.indexOf(":");
            if (separatorIndex > 0) {
                const key = firstLine.substring(0, separatorIndex).trim().toLowerCase();
                if (key === "title" || key === "título" || key === "titre" || key === "titel") {
                    return firstLine.substring(separatorIndex + 1).trim() || this.$t("Untitled request");
                }
            }
            return firstLine || this.$t("Untitled request");
        },
        getRequestDescription: function (description: string): string {
            const lines = (description || "").split(/\r?\n/);
            const firstLine = (lines[0] || "").trim().toLowerCase();
            const titlePrefixes = ["title:", "título:", "titre:", "titel:"];
            const metadataPrefixes = Object.values(REQUEST_FIELD_LABELS).flatMap((labels) => labels.map((label) => `${label}:`));
            if (titlePrefixes.some((p) => firstLine.startsWith(p))) {
                lines.shift();
            }
            return (
                lines
                    .filter((line) => !metadataPrefixes.some((prefix) => line.trim().toLowerCase().startsWith(prefix)))
                    .join("\n")
                    .replace(/\n{2,}/g, "\n")
                    .trim() || this.$t("No additional details")
            );
        },
        getRequestField: function (description: string, field: keyof typeof REQUEST_FIELD_LABELS): string {
            const labels = REQUEST_FIELD_LABELS[field];
            const line = (description || "").split(/\r?\n/).find((item) => {
                const normalized = item.trim().toLowerCase();
                return labels.some((label) => normalized.startsWith(`${label}:`));
            });
            if (!line) {
                return "";
            }
            return line.substring(line.indexOf(":") + 1).trim();
        },
        hasRequestMetadata: function (description: string): boolean {
            return Object.keys(REQUEST_FIELD_LABELS).some((field) =>
                this.getRequestField(description, field as keyof typeof REQUEST_FIELD_LABELS),
            );
        },
        isRequestDescriptionCollapsible: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            const description = this.getRequestDescription(requestItem.description);
            return (
                description.length > REQUEST_DESCRIPTION_COLLAPSE_LENGTH ||
                description.split(/\r?\n/).length > REQUEST_DESCRIPTION_COLLAPSE_LINE_COUNT
            );
        },
        isFieldCollapsible: function (requestItem: ItaasCustomAgentRequestItem, field: "description" | "integrations"): boolean {
            if (field === "description") {
                return this.isRequestDescriptionCollapsible(requestItem);
            }
            return this.getRequestField(requestItem.description, "integrations").length > REQUEST_DESCRIPTION_COLLAPSE_LENGTH;
        },
        isFieldExpanded: function (requestId: string, field: string): boolean {
            return this.expandedFieldKeys.includes(`${requestId}:${field}`);
        },
        toggleField: function (requestId: string, field: string): void {
            const key = `${requestId}:${field}`;
            if (this.isFieldExpanded(requestId, field)) {
                this.expandedFieldKeys = this.expandedFieldKeys.filter((k) => k !== key);
                return;
            }
            this.expandedFieldKeys = [...this.expandedFieldKeys, key];
        },
        formatRequestStatus: function (status: string): string {
            const normalized = (status || "").trim().toLowerCase();
            switch (normalized) {
                case "pending_review":
                    return this.$t("Under review");
                case "rejected":
                    return this.$t("Rejected");
                case "pending_payment":
                    return this.$t("Payment pending");
                case "in_development":
                    return this.$t("In development");
                case "delivered":
                    return this.$t("Delivered");
                case "cancelled":
                    return this.$t("Cancelled");
                default:
                    return this.$t("Request status");
            }
        },
        canPayDeposit: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return (requestItem.status || "").trim().toLowerCase() === "pending_payment";
        },
        isDeliveredRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            return (requestItem.status || "").trim().toLowerCase() === "delivered";
        },
        canCancelRequest: function (requestItem: ItaasCustomAgentRequestItem): boolean {
            const status = (requestItem.status || "").trim().toLowerCase();
            return status === "pending_review" || status === "pending_payment";
        },
        renderTimestamp: function (timestamp: number): string {
            if (!timestamp) {
                return "-";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        reloadSection: function (): void {
            this.loadCatalogSummary();
            this.loadRequests();
        },
        resetWizard: function (): void {
            this.wizardStep = 0;
            this.wizardReqType = "custom";
            this.wizardAdaptAgentId = "";
            this.wizardTitle = "";
            this.wizardDesc = "";
            this.wizardError = "";
            this.wizardPattern = "linear";
            this.wizardIntegrations = "";
            this.wizardPriority = "normal";
            this.wizardNavigating = false;
        },
        selectRequestType: function (requestType: "custom" | "adaptation"): void {
            this.wizardReqType = requestType;
            this.wizardError = "";
            if (requestType === "custom") {
                this.wizardAdaptAgentId = "";
            }
        },
        wizardNext: function (): void {
            if (this.wizardNavigating) {
                return;
            }
            if (this.wizardStep === 0) {
                if (this.wizardReqType === "adaptation" && !this.hasValidBaseAgent) {
                    this.wizardError = "base-agent-required";
                    return;
                }
            } else if (this.wizardStep === 1) {
                if (!this.wizardTitle.trim()) {
                    this.wizardError = "title-required";
                    return;
                }
                if (this.wizardTitle.trim().length > FLOW_TITLE_MAX_LENGTH) {
                    this.wizardError = "title-too-long";
                    return;
                }
                if (this.wizardDesc.trim().length < 10) {
                    this.wizardError = "desc-too-short";
                    return;
                }
                if (this.wizardDesc.trim().length > FLOW_DESCRIPTION_MAX_LENGTH) {
                    this.wizardError = "desc-too-long";
                    return;
                }
            } else if (this.wizardStep === 2) {
                if (!this.wizardIntegrations.trim()) {
                    this.wizardError = "integrations-required";
                    return;
                }
                if (this.wizardIntegrations.trim().length > FLOW_INTEGRATIONS_MAX_LENGTH) {
                    this.wizardError = "integrations-too-long";
                    return;
                }
            }
            this.wizardError = "";
            this.wizardNavigating = true;
            if (this.wizardStep < 3) {
                this.wizardStep += 1;
            }
            this.$nextTick(() => {
                this.wizardNavigating = false;
            });
        },
        wizardPrev: function (): void {
            this.wizardError = "";
            if (this.wizardStep > 0) {
                this.wizardStep -= 1;
            }
        },
        goToWizardStep: function (step: number): void {
            if (step < 0 || step > this.wizardStep) {
                return;
            }
            this.wizardError = "";
            this.wizardStep = step;
        },
        openRequestTracking: function (requestItem: ItaasCustomAgentRequestItem): void {
            this.selectedRequest = requestItem;
            this.displayTrackingModal = true;
        },
        formatWizardPattern: function (pattern: string): string {
            switch (pattern) {
                case "loop":
                    return this.$t("Loop / iteration");
                case "branch":
                    return this.$t("Conditional branches");
                case "parallel":
                    return this.$t("Parallel + merge");
                case "agent-tools":
                    return this.$t("Agent with tools");
                case "linear":
                default:
                    return this.$t("Linear (pipeline)");
            }
        },
        formatWizardPriority: function (priority: string): string {
            switch (priority) {
                case "high":
                    return this.$t("High");
                case "low":
                    return this.$t("Low");
                case "normal":
                default:
                    return this.$t("Normal");
            }
        },
        loadCatalogSummary: function (): void {
            Request.Abort(this.catalogRequestId);
            this.loadingCatalog = true;

            const request = ApiCatalogItems.GetPublicCatalogItem(CUSTOM_AGENT_SERVICE_ITEM_ID);
            Request.Pending(this.catalogRequestId, request)
                .onSuccess((item: CatalogPublicItemDetail) => {
                    const depositEur =
                        typeof item.depositPriceEur === "number" && Number.isFinite(item.depositPriceEur) && item.depositPriceEur > 0
                            ? item.depositPriceEur
                            : 0;
                    const monthlyFromPlan =
                        item.monthlyItemPricing && typeof item.monthlyItemPricing.price === "number" && item.monthlyItemPricing.price > 0
                            ? item.monthlyItemPricing.price
                            : 0;
                    const monthlyEur = monthlyFromPlan > 0 ? monthlyFromPlan : item.price > 0 ? item.price : 0;
                    const depositFormatted = depositEur > 0 ? formatMoneyFromCents(Math.round(depositEur * 100), "EUR") : "";
                    const monthlyFormatted = monthlyEur > 0 ? formatMoneyFromCents(Math.round(monthlyEur * 100), "EUR") : "";
                    this.catalogSummary = {
                        hasPricing: Boolean(depositFormatted || monthlyFormatted),
                        depositCents: Math.round(depositEur * 100),
                        depositFormatted,
                        monthlyFormatted,
                    };
                    this.loadingCatalog = false;
                })
                .onRequestError((_err, handleErr) => {
                    const applyFallbackSummary = () => {
                        this.catalogSummary = {
                            hasPricing: false,
                            depositCents: 0,
                            depositFormatted: "",
                            monthlyFormatted: "",
                        };
                    };
                    handleErr(_err, {
                        notFound: () => {
                            applyFallbackSummary();
                        },
                        temporalError: () => {
                            applyFallbackSummary();
                        },
                    });
                    this.loadingCatalog = false;
                })
                .onUnexpectedError(() => {
                    this.loadingCatalog = false;
                });
        },
        loadRequests: function (): void {
            Request.Abort(this.listRequestId);
            this.loadingRequests = true;
            this.accessDenied = false;
            this.orgAdminRequired = false;

            const request = ApiItaasPlatform.GetItaasCustomAgentRequests();
            Request.Pending(this.listRequestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as ItaasCustomAgentRequestListResponse;
                    this.requests = response.custom_agent_requests || [];
                    this.loadingRequests = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.requests = [];
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.requests = [];
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenOrgAdminRequired: () => {
                            this.orgAdminRequired = true;
                            this.requests = [];
                        },
                        temporalError: () => {
                            this.requests = [];
                        },
                    });
                    this.loadingRequests = false;
                })
                .onUnexpectedError(() => {
                    this.requests = [];
                    this.loadingRequests = false;
                });
        },
        confirmCancelRequest: function (requestItem: ItaasCustomAgentRequestItem): void {
            this.$askUserConfirmation({
                title: this.$t("Cancel request"),
                message: this.$t("Are you sure you want to cancel this custom agent request?"),
                danger: true,
                callback: () => {
                    this.cancelRequest(requestItem);
                },
            });
        },
        cancelRequest: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (!this.canCancelRequest(requestItem) || this.busyRequestId) {
                return;
            }

            Request.Abort(this.cancelRequestId);
            this.busyRequestId = requestItem.id;

            Request.Pending(this.cancelRequestId, ApiItaasPlatform.CancelItaasCustomAgentRequest(requestItem.id))
                .onSuccess((updated) => {
                    this.requests = this.requests.map((row) => (row.id === updated.id ? updated : row));
                    if (this.selectedRequest && this.selectedRequest.id === updated.id) {
                        this.selectedRequest = updated;
                    }
                    this.$showSnackBar(this.$t("Request cancelled"));
                    this.busyRequestId = "";
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenOrgAdminRequired: () => {
                            this.orgAdminRequired = true;
                        },
                        badRequestInvalidStatus: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This request can no longer be cancelled."));
                            this.loadRequests();
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                        notFoundRequestNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Request not found"));
                            this.loadRequests();
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Request not found"));
                            this.loadRequests();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    this.busyRequestId = "";
                })
                .onUnexpectedError(() => {
                    this.busyRequestId = "";
                });
        },
        openDepositCheckout: function (requestItem: ItaasCustomAgentRequestItem): void {
            if (!this.canPayDeposit(requestItem) || this.busyRequestId) {
                return;
            }
            this.selectedDepositRequest = requestItem;
            this.displayDepositCheckoutModal = true;
        },
        confirmDepositCheckout: function (redeemTokens: number): void {
            if (!this.selectedDepositRequest) {
                return;
            }
            this.payDeposit(this.selectedDepositRequest, redeemTokens);
        },
        payDeposit: function (requestItem: ItaasCustomAgentRequestItem, redeemTokens: number = 0): void {
            if (!this.canPayDeposit(requestItem) || this.busyRequestId) {
                return;
            }

            Request.Abort(this.checkoutRequestId);
            this.busyRequestId = requestItem.id;

            Request.Pending(
                this.checkoutRequestId,
                ApiItaasPlatform.CheckoutItaasCustomAgentRequestDeposit(requestItem.id, {
                    successUrl: this.getCheckoutReturnUrl("success"),
                    cancelUrl: this.getCheckoutReturnUrl("cancel"),
                    redeem_tokens: Math.max(0, Math.floor(Number(redeemTokens) || 0)),
                }),
            )
                .onSuccess((result) => {
                    const checkoutUrl = (result.checkoutUrl || "").trim();
                    if (!checkoutUrl) {
                        this.$showMessageModal(this.$t("Error"), this.$t("Deposit checkout is unavailable right now."));
                        this.busyRequestId = "";
                        return;
                    }
                    window.location.href = checkoutUrl;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenOrgAdminRequired: () => {
                            this.orgAdminRequired = true;
                        },
                        badRequestInvalidStatus: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This request is not waiting for deposit payment."));
                            this.displayDepositCheckoutModal = false;
                            this.loadRequests();
                        },
                        badRequestInsufficientTokenBalance: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Not enough tokens in your wallet"));
                        },
                        badRequestTokensExceedLimit: () => {
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("You can apply at most the allowed number of tokens to this purchase"),
                            );
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                        notFoundRequestNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Request not found"));
                            this.displayDepositCheckoutModal = false;
                            this.loadRequests();
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Request not found"));
                            this.displayDepositCheckoutModal = false;
                            this.loadRequests();
                        },
                        status503DepositCheckoutUnavailable: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Deposit checkout is unavailable right now."));
                        },
                        status503: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Deposit checkout is unavailable right now."));
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    this.busyRequestId = "";
                })
                .onUnexpectedError(() => {
                    this.busyRequestId = "";
                });
        },
        submitRequest: function (): void {
            if (!this.canSubmit || this.submitting || this.wizardNavigating) {
                return;
            }
            if (this.wizardReqType === "adaptation" && !this.hasValidBaseAgent) {
                this.wizardStep = 0;
                this.wizardError = "base-agent-required";
                return;
            }

            Request.Abort(this.submitRequestId);
            this.submitting = true;

            const requestDescription = [
                `${this.$t("Title")}: ${this.wizardTitle.trim()}`,
                this.wizardDesc.trim(),
                `${this.$t("Desired pattern")}: ${this.wizardPattern}`,
                this.wizardIntegrations.trim() ? `${this.$t("Integrations / credentials")}: ${this.wizardIntegrations.trim()}` : "",
                `${this.$t("Priority")}: ${this.wizardPriority}`,
            ]
                .filter(Boolean)
                .join("\n\n");

            const request = ApiItaasPlatform.CreateItaasCustomAgentRequest({
                requestType: this.wizardReqType,
                description: requestDescription,
                baseAgentId: this.wizardReqType === "adaptation" ? this.wizardAdaptAgentId.trim() || undefined : undefined,
            });

            Request.Pending(this.submitRequestId, request)
                .onSuccess(() => {
                    this.resetWizard();
                    this.$showSnackBar(this.$t("Flow request submitted"));
                    this.loadRequests();
                    this.submitting = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                        badRequestInvalidDescription: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Description must be at least 10 characters"));
                        },
                        badRequestInvalidRequestType: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid request type"));
                        },
                        badRequestInvalidBaseFlowId: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid base flow ID"));
                        },
                        badRequestInvalidBaseAgentId: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid base agent ID"));
                        },
                        badRequestPendingRequestLimitReached: () => {
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("You already have the maximum number of open custom agent requests"),
                            );
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenOrgAdminRequired: () => {
                            this.orgAdminRequired = true;
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    this.submitting = false;
                })
                .onUnexpectedError(() => {
                    this.submitting = false;
                });
        },
    },
    mounted: function () {
        this.handleCheckoutReturnResult();
        this.reloadSection();
    },
    beforeUnmount: function () {
        Request.Abort(this.catalogRequestId);
        Request.Abort(this.listRequestId);
        Request.Abort(this.submitRequestId);
        Request.Abort(this.cancelRequestId);
        Request.Abort(this.checkoutRequestId);
    },
});
</script>

<style scoped>
.purchase-result-modal {
    overflow: hidden;
}

.purchase-result-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-16);
    padding: var(--space-24);
    text-align: center;
}

.purchase-result-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 100px;
    background: var(--color-bg-surface);
    font-size: 40px;
    line-height: 48px;
}

.purchase-result-icon-wrap.is-success {
    color: var(--color-feedback-success);
}

.purchase-result-icon-wrap.is-error {
    color: var(--color-feedback-error);
}

.purchase-result-icon-wrap.is-warning {
    color: var(--color-feedback-warning);
}

.purchase-result-message {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 16px;
    line-height: 24px;
    max-width: 360px;
}

.purchase-result-close-btn {
    min-height: 44px;
}
</style>
