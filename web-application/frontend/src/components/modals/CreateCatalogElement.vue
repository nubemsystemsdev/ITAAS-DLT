<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="isSubmitting || loadingDetails">
        <div class="modal-dialog modal-lg" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ modalTitle }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    @click="close"
                    :disabled="isSubmitting || loadingDetails"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <form class="modal-form" @submit="submitDraft" @click="stopPropagationEvent">
                <div class="modal-body">
                    <p v-if="loadingDetails" class="modal-loading-state">
                        <i class="fas fa-spinner fa-spin"></i> {{ $t("Loading data...") }}
                    </p>

                    <template v-else>
                        <div v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</div>

                        <!-- Type -->
                        <div class="form-group">
                            <label for="create-item-type">{{ $t("Type") }}:</label>
                            <select
                                v-if="!isEditMode"
                                id="create-item-type"
                                class="form-control form-select form-control-full-width auto-focus"
                                v-model="itemType"
                                :aria-invalid="errorType ? 'true' : undefined"
                                :aria-describedby="errorType ? 'create-item-type-error' : undefined"
                            >
                                <option :value="CATALOG_TYPE_DIGITAL_PRODUCT">{{ $t("Product") }}</option>
                                <option :value="CATALOG_TYPE_RECURRING_SERVICE">{{ $t("Service") }}</option>
                                <option value="Plan">{{ $t("Plan") }}</option>
                            </select>
                            <input
                                v-else
                                id="create-item-type"
                                class="form-control form-control-full-width"
                                type="text"
                                :value="itemTypeLabel"
                                readonly
                            />
                            <p v-if="errorType" id="create-item-type-error" class="form-field-error" role="alert">{{ errorType }}</p>
                        </div>

                        <!-- ── Product / Service fields ── -->
                        <template v-if="itemType !== 'Plan'">
                            <div class="form-group">
                                <label for="create-item-name">{{ $t("Name") }}:</label>
                                <input
                                    id="create-item-name"
                                    class="form-control form-control-full-width"
                                    type="text"
                                    v-model="name"
                                    :aria-invalid="errorName ? 'true' : undefined"
                                    :aria-describedby="errorName ? 'create-item-name-error' : undefined"
                                />
                                <p v-if="errorName" id="create-item-name-error" class="form-field-error" role="alert">{{ errorName }}</p>
                            </div>

                            <div class="form-group">
                                <label for="create-item-short-desc">{{ $t("Short description") }}:</label>
                                <input
                                    id="create-item-short-desc"
                                    class="form-control form-control-full-width"
                                    type="text"
                                    v-model="shortDescription"
                                    :aria-invalid="errorShortDescription ? 'true' : undefined"
                                    :aria-describedby="errorShortDescription ? 'create-item-short-desc-error' : undefined"
                                />
                                <p v-if="errorShortDescription" id="create-item-short-desc-error" class="form-field-error" role="alert">
                                    {{ errorShortDescription }}
                                </p>
                            </div>

                            <div class="form-group">
                                <label for="create-item-long-desc">{{ $t("Long description (optional)") }}:</label>
                                <textarea
                                    id="create-item-long-desc"
                                    class="form-control form-control-full-width form-textarea"
                                    rows="4"
                                    v-model="longDescription"
                                    :aria-invalid="errorLongDescription ? 'true' : undefined"
                                    :aria-describedby="errorLongDescription ? 'create-item-long-desc-error' : undefined"
                                ></textarea>
                                <p v-if="errorLongDescription" id="create-item-long-desc-error" class="form-field-error" role="alert">
                                    {{ errorLongDescription }}
                                </p>
                            </div>

                            <div class="form-two-col">
                                <div class="form-group">
                                    <label for="create-item-monthly-price">{{ $t("Monthly price (€)") }}:</label>
                                    <input
                                        id="create-item-monthly-price"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        v-model.number="monthlyPrice"
                                        :aria-invalid="errorMonthlyPrice ? 'true' : undefined"
                                        :aria-describedby="errorMonthlyPrice ? 'create-item-monthly-price-error' : undefined"
                                    />
                                    <p v-if="errorMonthlyPrice" id="create-item-monthly-price-error" class="form-field-error" role="alert">
                                        {{ errorMonthlyPrice }}
                                    </p>
                                </div>
                                <div v-if="isCustomAgentService" class="form-group">
                                    <label for="create-item-deposit-price">{{ $t("Deposit price (€)") }}:</label>
                                    <input
                                        id="create-item-deposit-price"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        v-model.number="depositPrice"
                                        :aria-invalid="errorDepositPrice ? 'true' : undefined"
                                        :aria-describedby="errorDepositPrice ? 'create-item-deposit-price-error' : undefined"
                                    />
                                    <p v-if="errorDepositPrice" id="create-item-deposit-price-error" class="form-field-error" role="alert">
                                        {{ errorDepositPrice }}
                                    </p>
                                </div>
                                <div v-else class="form-group">
                                    <label for="create-item-annual-price">{{ $t("Annual price (€)") }}:</label>
                                    <input
                                        id="create-item-annual-price"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        v-model.number="annualPrice"
                                        :aria-invalid="errorAnnualPrice ? 'true' : undefined"
                                        :aria-describedby="errorAnnualPrice ? 'create-item-annual-price-error' : undefined"
                                    />
                                    <p v-if="errorAnnualPrice" id="create-item-annual-price-error" class="form-field-error" role="alert">
                                        {{ errorAnnualPrice }}
                                    </p>
                                </div>
                            </div>
                        </template>

                        <!-- ── Plan fields ── -->
                        <template v-else>
                            <div class="form-group">
                                <label for="create-plan-name">{{ $t("Name") }}:</label>
                                <input
                                    id="create-plan-name"
                                    class="form-control form-control-full-width"
                                    type="text"
                                    v-model="planName"
                                    :aria-invalid="errorPlanName ? 'true' : undefined"
                                    :aria-describedby="errorPlanName ? 'create-plan-name-error' : undefined"
                                />
                                <p v-if="errorPlanName" id="create-plan-name-error" class="form-field-error" role="alert">
                                    {{ errorPlanName }}
                                </p>
                            </div>

                            <div class="form-group">
                                <label for="create-plan-description">{{ $t("Description") }}:</label>
                                <textarea
                                    id="create-plan-description"
                                    class="form-control form-control-full-width form-textarea"
                                    rows="3"
                                    v-model="planDescription"
                                    :aria-invalid="errorPlanDescription ? 'true' : undefined"
                                    :aria-describedby="errorPlanDescription ? 'create-plan-description-error' : undefined"
                                ></textarea>
                                <p v-if="errorPlanDescription" id="create-plan-description-error" class="form-field-error" role="alert">
                                    {{ errorPlanDescription }}
                                </p>
                            </div>

                            <div class="form-two-col">
                                <div class="form-group">
                                    <label for="create-plan-pricing-mode">{{ $t("Pricing mode") }}:</label>
                                    <select
                                        id="create-plan-pricing-mode"
                                        class="form-control form-select form-control-full-width"
                                        v-model="planPricingMode"
                                        :aria-invalid="errorPlanPricingMode ? 'true' : undefined"
                                        :aria-describedby="errorPlanPricingMode ? 'create-plan-pricing-mode-error' : undefined"
                                    >
                                        <option :value="PLAN_PRICING_FIXED">{{ $t("Fixed price") }}</option>
                                        <option :value="PLAN_PRICING_CALCULATED">{{ $t("Calculated from components") }}</option>
                                    </select>
                                    <p
                                        v-if="errorPlanPricingMode"
                                        id="create-plan-pricing-mode-error"
                                        class="form-field-error"
                                        role="alert"
                                    >
                                        {{ errorPlanPricingMode }}
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label for="create-plan-index" class="label-with-tooltip">
                                        {{ $t("Plan index") }}:
                                        <InfoTooltip
                                            :content="$t('Determines the display order of plans. Plans with a lower index appear first.')"
                                        />
                                    </label>
                                    <input
                                        id="create-plan-index"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="1"
                                        min="0"
                                        v-model.number="planIndex"
                                        :aria-invalid="errorPlanIndex ? 'true' : undefined"
                                        :aria-describedby="errorPlanIndex ? 'create-plan-index-error' : undefined"
                                    />
                                    <p v-if="errorPlanIndex" id="create-plan-index-error" class="form-field-error" role="alert">
                                        {{ errorPlanIndex }}
                                    </p>
                                </div>
                            </div>

                            <div v-if="planPricingMode === PLAN_PRICING_FIXED" class="form-two-col">
                                <div class="form-group">
                                    <label for="create-plan-monthly-price">{{ $t("Monthly price (€)") }}:</label>
                                    <input
                                        id="create-plan-monthly-price"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        v-model.number="planMonthlyPrice"
                                        :aria-invalid="errorPlanMonthlyPrice ? 'true' : undefined"
                                        :aria-describedby="errorPlanMonthlyPrice ? 'create-plan-monthly-price-error' : undefined"
                                    />
                                    <p
                                        v-if="errorPlanMonthlyPrice"
                                        id="create-plan-monthly-price-error"
                                        class="form-field-error"
                                        role="alert"
                                    >
                                        {{ errorPlanMonthlyPrice }}
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label for="create-plan-annual-price">{{ $t("Annual price (€)") }}:</label>
                                    <input
                                        id="create-plan-annual-price"
                                        class="form-control form-control-full-width"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        v-model.number="planAnnualPrice"
                                        :aria-invalid="errorPlanAnnualPrice ? 'true' : undefined"
                                        :aria-describedby="errorPlanAnnualPrice ? 'create-plan-annual-price-error' : undefined"
                                    />
                                    <p
                                        v-if="errorPlanAnnualPrice"
                                        id="create-plan-annual-price-error"
                                        class="form-field-error"
                                        role="alert"
                                    >
                                        {{ errorPlanAnnualPrice }}
                                    </p>
                                </div>
                            </div>

                            <div v-if="planPricingMode === PLAN_PRICING_CALCULATED" class="form-group">
                                <label for="create-plan-discount">{{ $t("Discount (%)") }}:</label>
                                <input
                                    id="create-plan-discount"
                                    class="form-control form-control-full-width"
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    v-model.number="planDiscount"
                                    :aria-invalid="errorPlanDiscount ? 'true' : undefined"
                                    :aria-describedby="errorPlanDiscount ? 'create-plan-discount-error' : undefined"
                                />
                                <p v-if="errorPlanDiscount" id="create-plan-discount-error" class="form-field-error" role="alert">
                                    {{ errorPlanDiscount }}
                                </p>
                            </div>

                            <!-- Components (required by PlanCreateBody.components) -->
                            <div class="components-section">
                                <p class="components-section-title">
                                    {{ $t("Components") }}
                                    <span class="components-required" aria-hidden="true">*</span>
                                </p>
                                <p class="components-section-hint">{{ $t("Add at least one product or service from the catalog.") }}</p>

                                <div class="form-group">
                                    <div class="search-input-wrapper">
                                        <input
                                            id="create-plan-components-search"
                                            class="form-control form-control-full-width"
                                            type="text"
                                            :placeholder="$t('Search products or services...')"
                                            v-model="componentQuery"
                                            @input="onComponentQueryInput"
                                            :aria-invalid="errorPlanComponents ? 'true' : undefined"
                                            :aria-describedby="errorPlanComponents ? 'create-plan-components-error' : undefined"
                                            :aria-label="$t('Search products or services...')"
                                        />
                                        <button
                                            v-if="componentQuery"
                                            type="button"
                                            class="search-clear-btn"
                                            :aria-label="$t('Clear search')"
                                            @click="clearComponentQuery"
                                        >
                                            <i class="fas fa-times" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </div>

                                <div
                                    v-if="!componentQuery.trim()"
                                    class="component-browse-filters"
                                    role="group"
                                    :aria-label="$t('Filter catalog items')"
                                >
                                    <button
                                        type="button"
                                        class="component-browse-filter"
                                        :class="{ active: componentBrowseType === '' }"
                                        @click="setComponentBrowseType('')"
                                    >
                                        {{ $t("All") }}
                                    </button>
                                    <button
                                        type="button"
                                        class="component-browse-filter"
                                        :class="{ active: componentBrowseType === COMPONENT_BROWSE_FILTER_PRODUCT }"
                                        @click="setComponentBrowseType(COMPONENT_BROWSE_FILTER_PRODUCT)"
                                    >
                                        {{ $t("Product") }}
                                    </button>
                                    <button
                                        type="button"
                                        class="component-browse-filter"
                                        :class="{ active: componentBrowseType === COMPONENT_BROWSE_FILTER_SERVICE }"
                                        @click="setComponentBrowseType(COMPONENT_BROWSE_FILTER_SERVICE)"
                                    >
                                        {{ $t("Service") }}
                                    </button>
                                </div>

                                <p v-if="isComponentPickerLoading" class="component-state-text">
                                    <i class="fas fa-spinner fa-spin"></i> {{ $t("Loading...") }}
                                </p>

                                <ul v-else-if="displayedCatalogPickerItems.length" class="component-search-results">
                                    <li
                                        v-for="result in displayedCatalogPickerItems"
                                        :key="result.id"
                                        class="component-result-item"
                                        :class="{ 'is-added': isComponentAlreadyAdded(result.id) }"
                                    >
                                        <div class="component-item-main">
                                            <div class="component-item-heading">
                                                <div class="component-item-title-row">
                                                    <span class="component-item-name">{{ result.name }}</span>
                                                    <span class="component-item-price">{{ formatPrice(result.price) }}{{ $t("/mo") }}</span>
                                                </div>
                                                <span class="component-item-type">{{ result.type }}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-sm component-add-btn"
                                            :disabled="isComponentAlreadyAdded(result.id)"
                                            :aria-label="$t('Add component')"
                                            @click="addComponent(result)"
                                        >
                                            <i class="fas fa-plus no-margin"></i>
                                        </button>
                                    </li>
                                </ul>
                                <p v-else-if="componentQuery.trim()" class="component-state-text">
                                    {{ $t("No items found for your search.") }}
                                </p>
                                <p v-else class="component-state-text">{{ $t("No products or services found in the catalog.") }}</p>

                                <div v-if="planComponents.length" class="component-list">
                                    <p class="components-added-title">{{ $t("Added components") }} ({{ planComponents.length }})</p>
                                    <div
                                        v-for="(comp, idx) in planComponents"
                                        :key="comp.catalogItemId"
                                        class="component-list-item component-list-item--stacked"
                                    >
                                        <div class="component-item-main">
                                            <div class="component-item-heading">
                                                <div class="component-item-title-row">
                                                    <span class="component-item-name">{{ comp.name }}</span>
                                                    <span class="component-item-price">{{ formatPrice(comp.price) }}{{ $t("/mo") }}</span>
                                                </div>
                                                <span class="component-item-type">{{ comp.type }}</span>
                                            </div>
                                        </div>
                                        <div class="component-list-item-controls">
                                            <div class="component-usage-limits">
                                                <label class="component-field-label" :for="`comp-limits-${comp.catalogItemId}`">
                                                    {{ $t("Usage limits (optional)") }}
                                                </label>
                                                <input
                                                    :id="`comp-limits-${comp.catalogItemId}`"
                                                    class="form-control component-usage-input"
                                                    type="text"
                                                    :placeholder="$t('Usage limits JSON placeholder')"
                                                    v-model="comp.usageLimits"
                                                />
                                            </div>
                                            <div class="component-qty-group">
                                                <label class="component-field-label qty-label" :for="`comp-qty-${comp.catalogItemId}`">{{
                                                    $t("Qty")
                                                }}</label>
                                                <div class="component-qty-input-row">
                                                    <input
                                                        v-if="!isSingleLicensePlanComponent(comp)"
                                                        class="form-control qty-input"
                                                        :id="`comp-qty-${comp.catalogItemId}`"
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        v-model.number="comp.quantity"
                                                        @input="onPlanComponentQuantityInput(comp)"
                                                    />
                                                    <input
                                                        v-else
                                                        class="form-control qty-input"
                                                        :id="`comp-qty-${comp.catalogItemId}`"
                                                        type="number"
                                                        value="1"
                                                        readonly
                                                        disabled
                                                    />
                                                    <button
                                                        type="button"
                                                        class="btn btn-danger btn-sm icon-only-button component-remove-btn"
                                                        :aria-label="$t('Remove')"
                                                        :title="$t('Remove')"
                                                        @click="removeComponent(idx)"
                                                    >
                                                        <i class="fas fa-trash-alt no-margin"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p v-else class="component-state-text">
                                    {{ $t("No components added yet. Add at least one product or service.") }}
                                </p>
                                <p v-if="errorPlanComponents" id="create-plan-components-error" class="form-field-error" role="alert">
                                    {{ errorPlanComponents }}
                                </p>

                                <div v-if="planPricingMode === PLAN_PRICING_CALCULATED && planComponents.length" class="plan-price-preview">
                                    <p class="plan-price-preview-title">{{ $t("Estimated price preview") }}</p>

                                    <!-- Monthly -->
                                    <div class="plan-price-preview-section">
                                        <span class="plan-price-period">{{ $t("Monthly") }}</span>
                                        <div v-if="planDiscount > 0" class="plan-price-row">
                                            <span class="plan-price-label">{{ $t("Before discount") }}</span>
                                            <span class="plan-price-value plan-price-base">{{ formatPrice(rawMonthlyPrice) }}</span>
                                        </div>
                                        <div v-if="planDiscount > 0" class="plan-price-row">
                                            <span class="plan-price-label">{{ $t("Discount") }} ({{ planDiscount }}%)</span>
                                            <span class="plan-price-value plan-price-discount"
                                                >-{{ formatPrice(rawMonthlyPrice - calculatedMonthlyPrice) }}</span
                                            >
                                        </div>
                                        <div class="plan-price-row plan-price-row--total">
                                            <span class="plan-price-label">{{ $t("Total") }}</span>
                                            <span class="plan-price-value plan-price-total">{{ formatPrice(calculatedMonthlyPrice) }}</span>
                                        </div>
                                    </div>

                                    <!-- Annual -->
                                    <div class="plan-price-preview-section">
                                        <span class="plan-price-period">{{ $t("Annual") }}</span>
                                        <div v-if="planDiscount > 0" class="plan-price-row">
                                            <span class="plan-price-label">{{ $t("Before discount") }}</span>
                                            <span class="plan-price-value plan-price-base">{{ formatPrice(rawAnnualPrice) }}</span>
                                        </div>
                                        <div v-if="planDiscount > 0" class="plan-price-row">
                                            <span class="plan-price-label">{{ $t("Discount") }} ({{ planDiscount }}%)</span>
                                            <span class="plan-price-value plan-price-discount"
                                                >-{{ formatPrice(rawAnnualPrice - calculatedAnnualPrice) }}</span
                                            >
                                        </div>
                                        <div class="plan-price-row plan-price-row--total">
                                            <span class="plan-price-label">{{ $t("Total") }}</span>
                                            <span class="plan-price-value plan-price-total">{{ formatPrice(calculatedAnnualPrice) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <div
                            v-if="itemType !== 'Plan' || isEditMode"
                            class="catalog-create-status-row"
                            :class="{
                                'form-two-col': itemType !== 'Plan' && isEditMode && !isCustomAgentService,
                                'catalog-create-status-row--plan': itemType === 'Plan' && isEditMode,
                            }"
                        >
                            <div v-if="itemType !== 'Plan' && !isCustomAgentService" class="form-group">
                                <label for="create-item-visibility">{{ $t("Visibility") }}:</label>
                                <select
                                    id="create-item-visibility"
                                    class="form-control form-select form-control-full-width"
                                    v-model="visibility"
                                    :aria-invalid="errorVisibility ? 'true' : undefined"
                                    :aria-describedby="errorVisibility ? 'create-item-visibility-error' : undefined"
                                >
                                    <option :value="CATALOG_VISIBILITY_PUBLIC">{{ $t("Public") }}</option>
                                    <option :value="CATALOG_VISIBILITY_HIDDEN">{{ $t("Hidden") }}</option>
                                </select>
                                <p v-if="errorVisibility" id="create-item-visibility-error" class="form-field-error" role="alert">
                                    {{ errorVisibility }}
                                </p>
                            </div>

                            <div v-if="isEditMode" class="form-group">
                                <label for="create-entry-status">{{ $t("Status") }}:</label>
                                <select
                                    id="create-entry-status"
                                    class="form-control form-select form-control-full-width"
                                    v-model="selectedStatus"
                                >
                                    <option :value="STATUS_DRAFT">{{ $t("Draft") }}</option>
                                    <option :value="STATUS_PUBLISHED">{{ $t("Published") }}</option>
                                    <option :value="STATUS_ARCHIVED">{{ $t("Archived") }}</option>
                                </select>
                            </div>
                        </div>
                    </template>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary" :disabled="isSubmitting || loadingDetails" @click="close">
                        {{ $t("Cancel") }}
                    </button>
                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting || loadingDetails">
                        <i v-if="draftBusy" class="fas fa-spinner fa-spin"></i>
                        <i v-else class="fas fa-save"></i> {{ submitButtonLabel }}
                    </button>
                    <button
                        v-if="!isEditMode"
                        type="button"
                        class="btn btn-primary"
                        :disabled="isSubmitting || loadingDetails"
                        @click="submitPublished"
                    >
                        <i v-if="publishBusy" class="fas fa-spinner fa-spin"></i>
                        <i v-else class="fas fa-plus"></i> {{ publishButtonLabel }}
                    </button>
                </div>
            </form>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import InfoTooltip from "@/components/ui/InfoTooltip.vue";
import { useVModel } from "@/utils/v-model";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { formatEur } from "@/utils/format-currency";

import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import { ApiPlans } from "@/api/api-group-plans";
import { CatalogAdminItem, CatalogBody, PlanComponentInput, PlanCreateBody } from "@/api/definitions";

const CATALOG_TYPE_DIGITAL_PRODUCT = "Digital Product";
const CATALOG_TYPE_RECURRING_SERVICE = "Recurring Service";
const CATALOG_TYPE_ITAAS_PLATFORM = "ITAAS Platform";
const CATALOG_TYPE_CUSTOM_AGENT_SERVICE = "Custom Agent Service";

const CATALOG_TYPES_CREATABLE = [CATALOG_TYPE_DIGITAL_PRODUCT, CATALOG_TYPE_RECURRING_SERVICE];
const CATALOG_TYPES_EDITABLE = [...CATALOG_TYPES_CREATABLE, CATALOG_TYPE_ITAAS_PLATFORM, CATALOG_TYPE_CUSTOM_AGENT_SERVICE];
const STATUS_DRAFT = "Draft";
const STATUS_PUBLISHED = "Published";
const STATUS_ARCHIVED = "Archived";
const CATALOG_VISIBILITY_PUBLIC = "Public";
const CATALOG_VISIBILITY_HIDDEN = "Hidden";
const PLAN_PRICING_FIXED = "fixed";
const PLAN_PRICING_CALCULATED = "calculated";
const COMPONENT_BROWSE_FILTER_PRODUCT = "product";
const COMPONENT_BROWSE_FILTER_SERVICE = "service";

const CATALOG_NAME_MAX_LENGTH = 100;
const CATALOG_SHORT_DESC_MAX_LENGTH = 300;
const CATALOG_LONG_DESC_MAX_LENGTH = 5000;
const PLAN_NAME_MAX_LENGTH = 100;
const PLAN_DESCRIPTION_MAX_LENGTH = 5000;

/** Types that can be used as plan components (catalog items, not plans). */
const PLAN_COMPONENT_CATALOG_TYPES = [CATALOG_TYPE_DIGITAL_PRODUCT, CATALOG_TYPE_RECURRING_SERVICE, CATALOG_TYPE_ITAAS_PLATFORM];

function isPositivePrice(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

interface PlanAdminPricingRow {
    billingCycle: string;
    priceEur: number;
}

interface PlanAdminComponentRow {
    catalogItemId: string;
    usageLimits?: string;
    quantity?: number;
}

interface PlanAdminDetailResponse {
    plan: {
        id: string;
        name: string;
        description?: string;
        pricingMode?: string;
        discountPercent?: number;
        planIndex?: number;
        status?: string;
    };
    components: PlanAdminComponentRow[];
    pricings: PlanAdminPricingRow[];
}

/** UI state for a plan component row (maps to PlanComponentInput on submit). */
interface PlanComponentEntry {
    catalogItemId: string;
    name: string;
    type: string;
    status: string;
    visibility: string;
    quantity: number;
    price: number;
    usageLimits: string;
}

export default defineComponent({
    name: "CreateCatalogElement",
    components: {
        InfoTooltip,
    },
    emits: ["update:display", "created", "updated"],
    props: {
        display: Boolean,
        defaultType: String,
        editKind: {
            type: String,
            default: "",
        },
        editItemId: {
            type: String,
            default: "",
        },
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
            createRequestId: getUniqueStringId(),
            loadDetailsRequestId: getUniqueStringId(),
            publicPriceRequestId: getUniqueStringId(),
            componentSearchRequestId: getUniqueStringId(),
            componentBrowseRequestId: getUniqueStringId(),
            CATALOG_TYPE_DIGITAL_PRODUCT,
            CATALOG_TYPE_RECURRING_SERVICE,
            CATALOG_TYPE_ITAAS_PLATFORM,
            CATALOG_TYPE_CUSTOM_AGENT_SERVICE,
            CATALOG_VISIBILITY_PUBLIC,
            CATALOG_VISIBILITY_HIDDEN,
            PLAN_PRICING_FIXED,
            PLAN_PRICING_CALCULATED,
            COMPONENT_BROWSE_FILTER_PRODUCT,
            COMPONENT_BROWSE_FILTER_SERVICE,
            STATUS_DRAFT,
            STATUS_PUBLISHED,
            STATUS_ARCHIVED,
        };
    },
    data: function () {
        return {
            draftBusy: false,
            publishBusy: false,
            loadingDetails: false,
            catalogStatus: "",
            planStatus: "",
            errorMessage: "",

            // Field errors
            errorType: "",
            errorName: "",
            errorShortDescription: "",
            errorLongDescription: "",
            errorMonthlyPrice: "",
            errorAnnualPrice: "",
            errorDepositPrice: "",
            errorVisibility: "",

            // Field errors (plan)
            errorPlanName: "",
            errorPlanDescription: "",
            errorPlanPricingMode: "",
            errorPlanDiscount: "",
            errorPlanIndex: "",
            errorPlanComponents: "",
            errorPlanMonthlyPrice: "",
            errorPlanAnnualPrice: "",

            // Shared
            itemType: CATALOG_TYPE_RECURRING_SERVICE,

            // Product / Service
            name: "",
            shortDescription: "",
            longDescription: "",
            monthlyPrice: null as number | null,
            annualPrice: null as number | null,
            depositPrice: null as number | null,
            visibility: CATALOG_VISIBILITY_PUBLIC,

            // Plan
            planName: "",
            planDescription: "",
            planPricingMode: PLAN_PRICING_FIXED,
            planDiscount: 0,
            planMonthlyPrice: null as number | null,
            planAnnualPrice: null as number | null,
            planIndex: 0,
            planComponents: [] as PlanComponentEntry[],

            // Component picker (search + browse catalog for PlanCreateBody.components)
            componentQuery: "",
            componentSearchBusy: false,
            componentSearchResults: [] as CatalogAdminItem[],
            componentSearchTimeout: null as ReturnType<typeof setTimeout> | null,
            componentBrowseBusy: false,
            componentBrowseItems: [] as CatalogAdminItem[],
            componentBrowseType: "",
        };
    },
    computed: {
        isEditMode: function (): boolean {
            return !!(this.editItemId && (this.editKind === "catalog" || this.editKind === "plan"));
        },
        isCustomAgentService: function (): boolean {
            return this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE;
        },
        itemTypeLabel: function (): string {
            if (this.itemType === "Plan") return this.$t("Plan");
            if (this.itemType === CATALOG_TYPE_DIGITAL_PRODUCT) return this.$t("Product");
            if (this.itemType === CATALOG_TYPE_ITAAS_PLATFORM) return this.$t("ITAAS Platform");
            if (this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE) return this.$t("Custom Agent Service");
            return this.$t("Service");
        },
        modalTitle: function (): string {
            if (this.isEditMode) {
                if (this.itemType === "Plan") return this.$t("Edit plan");
                if (this.itemType === CATALOG_TYPE_DIGITAL_PRODUCT) return this.$t("Edit product");
                if (this.itemType === CATALOG_TYPE_ITAAS_PLATFORM) return this.$t("Edit ITAAS Platform");
                if (this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE) return this.$t("Edit Custom Agent Service");
                return this.$t("Edit service");
            }
            if (this.itemType === "Plan") return this.$t("Create plan");
            if (this.itemType === CATALOG_TYPE_DIGITAL_PRODUCT) return this.$t("Create product");
            return this.$t("Create service");
        },
        isSubmitting: function (): boolean {
            return this.draftBusy || this.publishBusy;
        },
        submitButtonLabel: function (): string {
            if (this.draftBusy) {
                return this.isEditMode ? this.$t("Saving...") : this.$t("Creating...");
            }
            return this.isEditMode ? this.$t("Save") : this.$t("Save as draft");
        },
        publishButtonLabel: function (): string {
            if (this.publishBusy) {
                return this.$t("Publishing...");
            }
            return this.$t("Publish");
        },
        selectedStatus: {
            get: function (): string {
                if (this.itemType === "Plan") {
                    return this.planStatus || STATUS_DRAFT;
                }

                return this.catalogStatus || STATUS_DRAFT;
            },
            set: function (value: string) {
                if (this.itemType === "Plan") {
                    this.planStatus = value;
                    return;
                }

                this.catalogStatus = value;
            },
        },
        rawMonthlyPrice: function (): number {
            return this.planComponents.reduce((acc, c) => acc + c.price * c.quantity, 0);
        },
        rawAnnualPrice: function (): number {
            return this.rawMonthlyPrice * 12;
        },
        calculatedMonthlyPrice: function (): number {
            const discount = Math.min(Math.max(this.planDiscount || 0, 0), 100);
            return this.rawMonthlyPrice * (1 - discount / 100);
        },
        calculatedAnnualPrice: function (): number {
            return this.calculatedMonthlyPrice * 12;
        },
        isComponentPickerLoading: function (): boolean {
            return this.componentQuery.trim() ? this.componentSearchBusy : this.componentBrowseBusy;
        },
        displayedCatalogPickerItems: function (): CatalogAdminItem[] {
            return this.componentQuery.trim() ? this.componentSearchResults : this.componentBrowseItems;
        },
    },
    methods: {
        close: function () {
            this.$closeModal();
        },

        stopPropagationEvent: function (e: Event) {
            e.stopPropagation();
        },

        formatPrice: function (value: number): string {
            return formatEur(value, String(this.$locale?.value || "en"));
        },

        resolveDefaultItemType: function (): string {
            if (this.defaultType === "product") return CATALOG_TYPE_DIGITAL_PRODUCT;
            if (this.defaultType === "plan") return "Plan";
            return CATALOG_TYPE_RECURRING_SERVICE;
        },

        clearFieldErrors: function () {
            this.errorMessage = "";
            this.errorType = "";
            this.errorName = "";
            this.errorShortDescription = "";
            this.errorLongDescription = "";
            this.errorMonthlyPrice = "";
            this.errorAnnualPrice = "";
            this.errorDepositPrice = "";
            this.errorVisibility = "";
            this.errorPlanName = "";
            this.errorPlanDescription = "";
            this.errorPlanPricingMode = "";
            this.errorPlanDiscount = "";
            this.errorPlanIndex = "";
            this.errorPlanComponents = "";
            this.errorPlanMonthlyPrice = "";
            this.errorPlanAnnualPrice = "";
        },

        validateCatalogItemLocally: function (): boolean {
            const trimmedName = (this.name || "").trim();
            const trimmedShort = (this.shortDescription || "").trim();
            const trimmedLong = (this.longDescription || "").trim();

            const allowedTypes = this.isEditMode ? CATALOG_TYPES_EDITABLE : CATALOG_TYPES_CREATABLE;
            if (!allowedTypes.includes(this.itemType)) {
                this.errorType = this.$t("Invalid type");
                return false;
            }
            if (!trimmedName || trimmedName.length > CATALOG_NAME_MAX_LENGTH) {
                this.errorName = this.$t("Invalid name");
                return false;
            }
            if (!trimmedShort || trimmedShort.length > CATALOG_SHORT_DESC_MAX_LENGTH) {
                this.errorShortDescription = this.$t("Invalid short description");
                return false;
            }
            if (trimmedLong.length > CATALOG_LONG_DESC_MAX_LENGTH) {
                this.errorLongDescription = this.$t("Invalid long description");
                return false;
            }
            if (!isPositivePrice(this.monthlyPrice)) {
                this.errorMonthlyPrice = this.$t("Invalid monthly price");
                return false;
            }
            if (this.isCustomAgentService) {
                if (!isPositivePrice(this.depositPrice)) {
                    this.errorDepositPrice = this.$t("Invalid deposit price");
                    return false;
                }
            } else if (!isPositivePrice(this.annualPrice)) {
                this.errorAnnualPrice = this.$t("Invalid annual price");
                return false;
            }
            if (!this.isCustomAgentService) {
                if (this.visibility !== CATALOG_VISIBILITY_PUBLIC && this.visibility !== CATALOG_VISIBILITY_HIDDEN) {
                    this.errorVisibility = this.$t("Invalid visibility");
                    return false;
                }
            }
            return true;
        },

        validatePlanLocally: function (): boolean {
            const trimmedName = (this.planName || "").trim();
            const trimmedDescription = (this.planDescription || "").trim();

            if (!trimmedName || trimmedName.length > PLAN_NAME_MAX_LENGTH) {
                this.errorPlanName = this.$t("Invalid name");
                return false;
            }
            if (trimmedDescription.length > PLAN_DESCRIPTION_MAX_LENGTH) {
                this.errorPlanDescription = this.$t("Invalid description");
                return false;
            }
            if (this.planPricingMode !== PLAN_PRICING_FIXED && this.planPricingMode !== PLAN_PRICING_CALCULATED) {
                this.errorPlanPricingMode = this.$t("Invalid pricing mode");
                return false;
            }
            if (this.planPricingMode === PLAN_PRICING_CALCULATED) {
                const discount = this.planDiscount;
                if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
                    this.errorPlanDiscount = this.$t("Invalid discount value");
                    return false;
                }
            }
            if (!Number.isFinite(this.planIndex) || this.planIndex < 0) {
                this.errorPlanIndex = this.$t("Invalid plan index");
                return false;
            }
            if (!this.planComponents.length) {
                this.errorPlanComponents = this.$t("At least one product or service is required");
                return false;
            }
            for (const comp of this.planComponents) {
                const qty = comp.quantity;
                if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
                    this.errorPlanComponents = this.$t("One or more products or services are invalid");
                    return false;
                }
                if (this.isSingleLicensePlanComponent(comp)) {
                    comp.quantity = 1;
                }
            }
            if (this.planPricingMode === PLAN_PRICING_FIXED) {
                if (!isPositivePrice(this.planMonthlyPrice)) {
                    this.errorPlanMonthlyPrice = this.$t("Invalid monthly price");
                    return false;
                }
                if (!isPositivePrice(this.planAnnualPrice)) {
                    this.errorPlanAnnualPrice = this.$t("Invalid annual price");
                    return false;
                }
            }
            return true;
        },

        resetForm: function () {
            this.draftBusy = false;
            this.publishBusy = false;
            this.loadingDetails = false;
            this.catalogStatus = "";
            this.planStatus = "";
            this.clearFieldErrors();
            this.itemType = this.resolveDefaultItemType();

            // Product / Service
            this.name = "";
            this.shortDescription = "";
            this.longDescription = "";
            this.monthlyPrice = null;
            this.annualPrice = null;
            this.depositPrice = null;
            this.visibility = CATALOG_VISIBILITY_PUBLIC;

            // Plan
            this.planName = "";
            this.planDescription = "";
            this.planPricingMode = PLAN_PRICING_FIXED;
            this.planDiscount = 0;
            this.planMonthlyPrice = null;
            this.planAnnualPrice = null;
            this.planIndex = 0;
            this.planComponents = [];
            this.componentQuery = "";
            this.componentSearchResults = [];
            this.componentSearchBusy = false;
            this.componentBrowseItems = [];
            this.componentBrowseBusy = false;
            this.componentBrowseType = "";
        },

        onModalOpen: function () {
            if (this.isEditMode) {
                this.loadEditData();
            } else {
                this.resetForm();
                this.ensurePlanComponentPickerLoaded();
            }
            this.$autoFocus();
        },

        loadEditData: function () {
            if (!this.editItemId) return;
            this.loadingDetails = true;
            this.errorMessage = "";
            Request.Abort(this.loadDetailsRequestId);
            Request.Abort(this.publicPriceRequestId);
            if (this.editKind === "plan") {
                this.loadEditPlan(this.editItemId);
            } else if (this.editKind === "catalog") {
                this.loadEditCatalogItem(this.editItemId);
            } else {
                this.loadingDetails = false;
            }
        },

        loadEditCatalogItem: function (id: string) {
            Request.Pending(this.loadDetailsRequestId, ApiCatalogItems.GetAdminCatalogItem(id))
                .onSuccess((item) => {
                    this.itemType = item.type;
                    this.name = item.name;
                    this.shortDescription = item.shortDescription;
                    this.longDescription = item.longDescription || "";
                    this.monthlyPrice = item.price;
                    if (item.type === CATALOG_TYPE_CUSTOM_AGENT_SERVICE) {
                        this.depositPrice = item.depositPriceEur != null ? item.depositPriceEur : null;
                        this.annualPrice = null;
                        this.visibility = CATALOG_VISIBILITY_HIDDEN;
                    } else if (item.annualPriceEur != null) {
                        this.annualPrice = item.annualPriceEur;
                        this.depositPrice = null;
                        this.visibility = item.visibility;
                    } else if (item.price > 0) {
                        this.annualPrice = item.price * 12;
                        this.depositPrice = null;
                        this.visibility = item.visibility;
                    } else {
                        this.annualPrice = null;
                        this.depositPrice = null;
                        this.visibility = item.visibility;
                    }
                    this.catalogStatus = item.status;
                    this.loadingDetails = false;

                    if (item.type !== CATALOG_TYPE_CUSTOM_AGENT_SERVICE && item.status === "Published" && item.visibility === "Public") {
                        Request.Pending(this.publicPriceRequestId, ApiCatalogItems.GetPublicCatalogItem(id))
                            .onSuccess((detail) => {
                                if (detail.monthlyItemPricing?.price != null) {
                                    this.monthlyPrice = detail.monthlyItemPricing.price;
                                }
                                if (detail.annualItemPricing?.price != null) {
                                    this.annualPrice = detail.annualItemPricing.price;
                                }
                            })
                            .onRequestError(() => {})
                            .onUnexpectedError(() => {});
                    }
                })
                .onCancel(() => {
                    this.loadingDetails = false;
                })
                .onRequestError((err, handleErr) => {
                    this.loadingDetails = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.errorMessage = this.$t("Access denied");
                        },
                        notFound: () => {
                            this.errorMessage = this.$t("Item not found");
                        },
                        temporalError: () => {
                            this.errorMessage = this.$t("No data available");
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loadingDetails = false;
                    this.errorMessage = this.$t("Unexpected error");
                });
        },

        loadEditPlan: function (id: string) {
            Request.Pending(this.loadDetailsRequestId, ApiPlans.GetAdminPlan(id))
                .onSuccess((detail) => {
                    const data = detail as unknown as PlanAdminDetailResponse;
                    const plan = data.plan || ({} as PlanAdminDetailResponse["plan"]);
                    this.itemType = "Plan";
                    this.planName = plan.name || "";
                    this.planDescription = plan.description || "";
                    this.planPricingMode = plan.pricingMode || PLAN_PRICING_FIXED;
                    this.planDiscount = plan.discountPercent ?? 0;
                    this.planIndex = plan.planIndex ?? 0;
                    this.planStatus = plan.status || "Draft";

                    const pricings = data.pricings || [];
                    const monthlyPricing = pricings.find((p) => p.billingCycle === "monthly");
                    const annualPricing = pricings.find((p) => p.billingCycle === "annual");
                    if (this.planPricingMode === PLAN_PRICING_FIXED) {
                        this.planMonthlyPrice = monthlyPricing?.priceEur ?? null;
                        this.planAnnualPrice = annualPricing?.priceEur ?? null;
                    } else {
                        this.planMonthlyPrice = null;
                        this.planAnnualPrice = null;
                    }

                    this.populatePlanComponentsFromDetail(data.components || []);
                    this.loadingDetails = false;
                    this.ensurePlanComponentPickerLoaded();
                })
                .onCancel(() => {
                    this.loadingDetails = false;
                })
                .onRequestError((err, handleErr) => {
                    this.loadingDetails = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.errorMessage = this.$t("Access denied");
                        },
                        notFound: () => {
                            this.errorMessage = this.$t("Item not found");
                        },
                        temporalError: () => {
                            this.errorMessage = this.$t("No data available");
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loadingDetails = false;
                    this.errorMessage = this.$t("Unexpected error");
                });
        },

        buildPlanComponentEntry: function (comp: PlanAdminComponentRow, item?: CatalogAdminItem): PlanComponentEntry {
            const quantity = this.normalizePlanComponentQuantity(comp.quantity, item?.type || "");
            if (item) {
                return {
                    catalogItemId: comp.catalogItemId,
                    name: item.name,
                    type: item.type,
                    status: item.status,
                    visibility: item.visibility,
                    quantity,
                    price: item.price,
                    usageLimits: comp.usageLimits || "",
                };
            }
            return {
                catalogItemId: comp.catalogItemId,
                name: comp.catalogItemId,
                type: "",
                status: "",
                visibility: "",
                quantity,
                price: 0,
                usageLimits: comp.usageLimits || "",
            };
        },

        populatePlanComponentsFromDetail: function (components: PlanAdminComponentRow[]) {
            if (!components.length) {
                this.planComponents = [];
                return;
            }

            const entries: PlanComponentEntry[] = [];
            let remaining = components.length;

            const checkDone = () => {
                remaining -= 1;
                if (remaining <= 0) {
                    this.planComponents = entries;
                }
            };

            for (const comp of components) {
                if (!comp.catalogItemId) {
                    checkDone();
                    continue;
                }

                Request.Pending(getUniqueStringId(), ApiCatalogItems.GetAdminCatalogItem(comp.catalogItemId))
                    .onSuccess((item) => {
                        entries.push(this.buildPlanComponentEntry(comp, item));
                        checkDone();
                    })
                    .onRequestError(() => {
                        entries.push(this.buildPlanComponentEntry(comp));
                        checkDone();
                    })
                    .onUnexpectedError(() => {
                        entries.push(this.buildPlanComponentEntry(comp));
                        checkDone();
                    });
            }
        },

        filterPlanComponentCatalogItems: function (items: CatalogAdminItem[]): CatalogAdminItem[] {
            return items.filter((item) => PLAN_COMPONENT_CATALOG_TYPES.includes(item.type) && item.status !== STATUS_DRAFT);
        },

        buildPlanComponentsPayload: function (): PlanComponentInput[] {
            return this.planComponents.map((c): PlanComponentInput => {
                const usageLimits = (c.usageLimits || "").trim();
                return {
                    catalogItemId: c.catalogItemId,
                    quantity: this.normalizePlanComponentQuantity(c.quantity, c.type),
                    usageLimits: usageLimits || undefined,
                };
            });
        },

        ensurePlanComponentPickerLoaded: function () {
            if (this.itemType !== "Plan") return;
            if (!this.componentQuery.trim()) {
                this.loadBrowseCatalogItems();
            }
        },

        setComponentBrowseType: function (type: string) {
            this.componentBrowseType = type;
            this.loadBrowseCatalogItems();
        },

        loadBrowseCatalogItems: function () {
            this.componentBrowseBusy = true;
            Request.Abort(this.componentBrowseRequestId);
            const catalogKind =
                this.componentBrowseType === COMPONENT_BROWSE_FILTER_PRODUCT || this.componentBrowseType === COMPONENT_BROWSE_FILTER_SERVICE
                    ? this.componentBrowseType
                    : undefined;
            Request.Pending(
                this.componentBrowseRequestId,
                ApiCatalogItems.GetAdminCatalogItems({
                    page: 1,
                    pageSize: 25,
                    status: STATUS_PUBLISHED,
                    catalogKind,
                }),
            )
                .onSuccess((list) => {
                    this.componentBrowseItems = this.filterPlanComponentCatalogItems(list.items || []);
                    this.componentBrowseBusy = false;
                })
                .onRequestError(() => {
                    this.componentBrowseBusy = false;
                })
                .onUnexpectedError(() => {
                    this.componentBrowseBusy = false;
                });
        },

        // ── Component search ──────────────────────────────────────

        onComponentQueryInput: function () {
            if (this.componentSearchTimeout) clearTimeout(this.componentSearchTimeout);
            if (!this.componentQuery.trim()) {
                this.componentSearchResults = [];
                return;
            }
            this.componentSearchTimeout = setTimeout(() => this.searchComponents(), 400);
        },

        clearComponentQuery: function () {
            this.componentQuery = "";
            this.componentSearchResults = [];
            if (this.componentSearchTimeout) clearTimeout(this.componentSearchTimeout);
            Request.Abort(this.componentSearchRequestId);
            this.componentSearchBusy = false;
        },

        searchComponents: function () {
            const query = this.componentQuery.trim();
            if (!query) return;

            this.componentSearchBusy = true;
            Request.Abort(this.componentSearchRequestId);
            Request.Pending(
                this.componentSearchRequestId,
                ApiCatalogItems.GetAdminCatalogItems({ q: query, pageSize: 10, status: STATUS_PUBLISHED }),
            )
                .onSuccess((list) => {
                    this.componentSearchResults = this.filterPlanComponentCatalogItems(list.items || []);
                    this.componentSearchBusy = false;
                })
                .onRequestError(() => {
                    this.componentSearchBusy = false;
                })
                .onUnexpectedError(() => {
                    this.componentSearchBusy = false;
                });
        },

        isComponentAlreadyAdded: function (id: string): boolean {
            return this.planComponents.some((c) => c.catalogItemId === id);
        },

        isSingleLicensePlanComponent: function (comp: Pick<PlanComponentEntry, "type">): boolean {
            return comp.type === CATALOG_TYPE_RECURRING_SERVICE || comp.type === CATALOG_TYPE_ITAAS_PLATFORM;
        },

        normalizePlanComponentQuantity: function (quantity: number | undefined, type: string): number {
            if (type === CATALOG_TYPE_RECURRING_SERVICE || type === CATALOG_TYPE_ITAAS_PLATFORM) {
                return 1;
            }

            const normalizedQuantity = Number(quantity);
            if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) {
                return 1;
            }

            return Math.floor(normalizedQuantity);
        },

        addComponent: function (item: CatalogAdminItem) {
            if (!PLAN_COMPONENT_CATALOG_TYPES.includes(item.type)) return;
            if (this.isComponentAlreadyAdded(item.id)) return;
            this.planComponents.push({
                catalogItemId: item.id,
                name: item.name,
                type: item.type,
                status: item.status,
                visibility: item.visibility,
                quantity: this.normalizePlanComponentQuantity(1, item.type),
                price: item.price,
                usageLimits: "",
            });
            this.errorPlanComponents = "";
        },

        removeComponent: function (index: number) {
            this.planComponents.splice(index, 1);
        },

        onPlanComponentQuantityInput: function (comp?: PlanComponentEntry) {
            if (comp) {
                comp.quantity = this.normalizePlanComponentQuantity(comp.quantity, comp.type);
            }
            this.errorPlanComponents = "";
        },

        // ── Submit ────────────────────────────────────────────────

        submitDraft: function (e: Event) {
            this.submitWithStatus(e, this.resolveSubmitStatus());
        },

        submitPublished: function (e: Event) {
            this.submitWithStatus(e, STATUS_PUBLISHED);
        },

        resolveSubmitStatus: function (): string {
            if (!this.isEditMode) {
                return STATUS_DRAFT;
            }

            if (this.itemType === "Plan") {
                return this.planStatus || STATUS_DRAFT;
            }

            return this.catalogStatus || STATUS_DRAFT;
        },

        submitWithStatus: function (e: Event, requestedStatus: string) {
            e.preventDefault();
            e.stopPropagation();
            if (this.isSubmitting) return;

            this.clearFieldErrors();

            if (this.itemType === "Plan") {
                if (!this.validatePlanLocally()) return;
                this.setSubmitBusy(requestedStatus, true);
                this.submitPlan(requestedStatus);
            } else {
                if (!this.validateCatalogItemLocally()) return;
                this.setSubmitBusy(requestedStatus, true);
                this.submitCatalogItem(requestedStatus);
            }
        },

        setSubmitBusy: function (requestedStatus: string, busy: boolean) {
            if (!this.isEditMode && requestedStatus === STATUS_PUBLISHED) {
                this.publishBusy = busy;
                return;
            }
            this.draftBusy = busy;
        },

        submitCatalogItem: function (requestedStatus: string) {
            const trimmedLong = (this.longDescription || "").trim();
            const body: CatalogBody = {
                type: this.itemType,
                name: (this.name || "").trim(),
                shortDescription: (this.shortDescription || "").trim(),
                longDescription: trimmedLong || undefined,
                monthlyPriceEur: this.monthlyPrice as number,
            };
            if (this.isCustomAgentService) {
                body.depositPriceEur = this.depositPrice as number;
            } else {
                body.annualPriceEur = this.annualPrice as number;
                body.visibility = this.visibility;
            }
            body.status = requestedStatus;

            if (this.isEditMode && this.editKind === "catalog") {
                this.submitUpdateCatalogItem(body, requestedStatus);
            } else {
                this.submitCreateCatalogItem(body, requestedStatus);
            }
        },

        resolveCatalogItemUpdatedMessage: function (): string {
            if (this.itemType === CATALOG_TYPE_DIGITAL_PRODUCT) {
                return this.$t("Product updated successfully");
            }
            if (this.itemType === CATALOG_TYPE_ITAAS_PLATFORM) {
                return this.$t("ITAAS Platform updated successfully");
            }
            if (this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE) {
                return this.$t("Custom Agent Service updated successfully");
            }
            return this.$t("Service updated successfully");
        },

        submitCreateCatalogItem: function (body: CatalogBody, requestedStatus: string) {
            Request.Pending(this.createRequestId, ApiCatalogItems.CreateCatalogItem(body))
                .onSuccess(() => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.$emit("created", { kind: "catalog" });
                    this.$showSnackBar(
                        this.itemType === CATALOG_TYPE_DIGITAL_PRODUCT
                            ? this.$t("Product created successfully")
                            : this.$t("Service created successfully"),
                    );
                    this.$nextTick(() => this.close());
                })
                .onCancel(() => {
                    this.setSubmitBusy(requestedStatus, false);
                })
                .onRequestError((err, handleErr) => {
                    this.setSubmitBusy(requestedStatus, false);
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.errorMessage = this.$t("Access denied");
                        },
                        badRequest: () => {
                            this.errorMessage =
                                this.isEditMode &&
                                (this.itemType === CATALOG_TYPE_ITAAS_PLATFORM || this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE)
                                    ? this.$t("This catalog item is protected and cannot be modified in that way")
                                    : this.$t("Bad request");
                        },
                        badRequestInvalidType: () => {
                            this.errorType = this.$t("Invalid type");
                        },
                        badRequestInvalidName: () => {
                            this.errorName = this.$t("Invalid name");
                        },
                        badRequestInvalidShortDescription: () => {
                            this.errorShortDescription = this.$t("Invalid short description");
                        },
                        badRequestInvalidLongDescription: () => {
                            this.errorLongDescription = this.$t("Invalid long description");
                        },
                        badRequestInvalidMonthlyPrice: () => {
                            this.errorMonthlyPrice = this.$t("Invalid monthly price");
                        },
                        badRequestInvalidAnnualPrice: () => {
                            this.errorAnnualPrice = this.$t("Invalid annual price");
                        },
                        badRequestInvalidStatus: () => {
                            this.errorMessage = this.$t("Invalid status");
                        },
                        badRequestInvalidVisibility: () => {
                            this.errorVisibility = this.$t("Invalid visibility");
                        },
                        badRequestProtected: () => {
                            this.errorMessage = this.$t("This catalog item is protected and cannot be modified in that way");
                        },
                        temporalError: () => {
                            this.errorMessage = this.$t("No data available");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.errorMessage = err instanceof Error ? err.message : this.$t("Unexpected error");
                });
        },

        submitUpdateCatalogItem: function (body: CatalogBody, requestedStatus: string) {
            Request.Pending(this.createRequestId, ApiCatalogItems.UpdateCatalogItem(this.editItemId, body))
                .onSuccess(() => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.$emit("updated", { kind: "catalog" });
                    this.$showSnackBar(this.resolveCatalogItemUpdatedMessage());
                    this.$nextTick(() => this.close());
                })
                .onCancel(() => {
                    this.setSubmitBusy(requestedStatus, false);
                })
                .onRequestError((err, handleErr) => {
                    this.setSubmitBusy(requestedStatus, false);
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.errorMessage = this.$t("Access denied");
                        },
                        notFound: () => {
                            this.errorMessage = this.$t("Item not found");
                        },
                        badRequest: () => {
                            this.errorMessage =
                                this.isEditMode &&
                                (this.itemType === CATALOG_TYPE_ITAAS_PLATFORM || this.itemType === CATALOG_TYPE_CUSTOM_AGENT_SERVICE)
                                    ? this.$t("This catalog item is protected and cannot be modified in that way")
                                    : this.$t("Bad request");
                        },
                        badRequestInvalidRequest: () => {
                            this.errorMessage = this.$t("Invalid request");
                        },
                        badRequestInvalidType: () => {
                            this.errorType = this.$t("Invalid type");
                        },
                        badRequestInvalidName: () => {
                            this.errorName = this.$t("Invalid name");
                        },
                        badRequestInvalidShortDescription: () => {
                            this.errorShortDescription = this.$t("Invalid short description");
                        },
                        badRequestInvalidLongDescription: () => {
                            this.errorLongDescription = this.$t("Invalid long description");
                        },
                        badRequestInvalidMonthlyPrice: () => {
                            this.errorMonthlyPrice = this.$t("Invalid monthly price");
                        },
                        badRequestInvalidAnnualPrice: () => {
                            this.errorAnnualPrice = this.$t("Invalid annual price");
                        },
                        badRequestInvalidDepositPrice: () => {
                            this.errorDepositPrice = this.$t("Invalid deposit price");
                        },
                        badRequestInvalidStatus: () => {
                            this.errorMessage = this.$t("Invalid status");
                        },
                        badRequestInvalidVisibility: () => {
                            this.errorVisibility = this.$t("Invalid visibility");
                        },
                        badRequestProtected: () => {
                            this.errorMessage = this.$t("This catalog item is protected and cannot be modified in that way");
                        },
                        temporalError: () => {
                            this.errorMessage = this.$t("No data available");
                        },
                        serverErrorUpdateFailed: () => {
                            this.errorMessage = this.$t("Failed to update catalog item");
                        },
                        serverErrorUpdateTraceabilityFailed: () => {
                            this.errorMessage = this.$t("Failed to update traceability");
                        },
                        serverErrorUpdateTraceabilityRollbackFailed: () => {
                            this.errorMessage = this.$t("Failed to update traceability rollback");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.errorMessage = err instanceof Error ? err.message : this.$t("Unexpected error");
                });
        },

        submitPlan: function (requestedStatus: string) {
            const body: PlanCreateBody = {
                name: (this.planName || "").trim(),
                description: (this.planDescription || "").trim() || undefined,
                pricingMode: this.planPricingMode,
                discountPercent: this.planDiscount,
                monthlyPriceEur: this.planPricingMode === "fixed" ? this.planMonthlyPrice : undefined,
                annualPriceEur: this.planPricingMode === "fixed" ? this.planAnnualPrice : undefined,
                planIndex: this.planIndex,
                components: this.buildPlanComponentsPayload(),
            };
            body.status = requestedStatus;

            if (this.isEditMode && this.editKind === "plan") {
                this.submitUpdatePlan(body, requestedStatus);
            } else {
                this.submitCreatePlan(body, requestedStatus);
            }
        },

        handlePlanRequestError: function (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void) {
            handleErr(err, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.errorMessage = this.$t("Access denied");
                },
                badRequest: () => {
                    this.errorMessage = this.$t("Bad request");
                },
                badRequestInvalidName: () => {
                    this.errorPlanName = this.$t("Invalid name");
                },
                badRequestInvalidDescription: () => {
                    this.errorPlanDescription = this.$t("Invalid description");
                },
                badRequestInvalidPricingMode: () => {
                    this.errorPlanPricingMode = this.$t("Invalid pricing mode");
                },
                badRequestInvalidDiscountPercent: () => {
                    this.errorPlanDiscount = this.$t("Invalid discount value");
                },
                badRequestInvalidPlanIndex: () => {
                    this.errorPlanIndex = this.$t("Invalid plan index");
                },
                badRequestDuplicatePlanIndex: () => {
                    this.errorPlanIndex = this.$t("A plan with this index already exists");
                },
                badRequestInvalidStatus: () => {
                    this.errorMessage = this.$t("Invalid status");
                },
                badRequestInvalidComponents: () => {
                    this.errorPlanComponents = this.$t("At least one product or service is required");
                },
                badRequestComponentNotPublishable: () => {
                    this.errorPlanComponents = this.$t(
                        "One or more products or services cannot be added to the plan because they are not published",
                    );
                },
                badRequestInvalidMonthlyPrice: () => {
                    this.errorPlanMonthlyPrice = this.$t("Invalid monthly price");
                },
                badRequestInvalidAnnualPrice: () => {
                    this.errorPlanAnnualPrice = this.$t("Invalid annual price");
                },
                temporalError: () => {
                    this.errorMessage = this.$t("No data available");
                },
            });
        },

        submitCreatePlan: function (body: PlanCreateBody, requestedStatus: string) {
            Request.Pending(this.createRequestId, ApiPlans.CreatePlan(body))
                .onSuccess(() => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.$emit("created", { kind: "plan" });
                    this.$showSnackBar(this.$t("Plan created successfully"));
                    this.$nextTick(() => this.close());
                })
                .onCancel(() => {
                    this.setSubmitBusy(requestedStatus, false);
                })
                .onRequestError((err, handleErr) => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.handlePlanRequestError(err, handleErr);
                })
                .onUnexpectedError((err) => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.errorMessage = err instanceof Error ? err.message : this.$t("Unexpected error");
                });
        },

        submitUpdatePlan: function (body: PlanCreateBody, requestedStatus: string) {
            Request.Pending(this.createRequestId, ApiPlans.UpdatePlan(this.editItemId, body))
                .onSuccess(() => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.$emit("updated", { kind: "plan" });
                    this.$showSnackBar(this.$t("Plan updated successfully"));
                    this.$nextTick(() => this.close());
                })
                .onCancel(() => {
                    this.setSubmitBusy(requestedStatus, false);
                })
                .onRequestError((err, handleErr) => {
                    this.setSubmitBusy(requestedStatus, false);
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.errorMessage = this.$t("Access denied");
                        },
                        notFound: () => {
                            this.errorMessage = this.$t("Item not found");
                        },
                        badRequest: () => {
                            this.errorMessage = this.$t("Bad request");
                        },
                        badRequestInvalidName: () => {
                            this.errorPlanName = this.$t("Invalid name");
                        },
                        badRequestInvalidDescription: () => {
                            this.errorPlanDescription = this.$t("Invalid description");
                        },
                        badRequestInvalidPricingMode: () => {
                            this.errorPlanPricingMode = this.$t("Invalid pricing mode");
                        },
                        badRequestInvalidDiscountPercent: () => {
                            this.errorPlanDiscount = this.$t("Invalid discount value");
                        },
                        badRequestInvalidPlanIndex: () => {
                            this.errorPlanIndex = this.$t("Invalid plan index");
                        },
                        badRequestDuplicatePlanIndex: () => {
                            this.errorPlanIndex = this.$t("A plan with this index already exists");
                        },
                        badRequestInvalidStatus: () => {
                            this.errorMessage = this.$t("Invalid status");
                        },
                        badRequestInvalidComponents: () => {
                            this.errorPlanComponents = this.$t("At least one product or service is required");
                        },
                        badRequestInvalidComponent: () => {
                            this.errorPlanComponents = this.$t("One or more products or services are invalid");
                        },
                        badRequestComponentNotPublishable: () => {
                            this.errorPlanComponents = this.$t(
                                "One or more products or services cannot be added to the plan because they are not published",
                            );
                        },
                        temporalError: () => {
                            this.errorMessage = this.$t("No data available");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.setSubmitBusy(requestedStatus, false);
                    this.errorMessage = err instanceof Error ? err.message : this.$t("Unexpected error");
                });
        },
    },
    mounted: function () {
        if (this.display) {
            this.onModalOpen();
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.createRequestId);
        Request.Abort(this.loadDetailsRequestId);
        Request.Abort(this.publicPriceRequestId);
        Request.Abort(this.componentSearchRequestId);
        Request.Abort(this.componentBrowseRequestId);
        if (this.componentSearchTimeout) clearTimeout(this.componentSearchTimeout);
    },
    watch: {
        display: function () {
            if (this.display) {
                this.onModalOpen();
            }
        },
        itemType: function () {
            if (!this.isEditMode) {
                this.ensurePlanComponentPickerLoaded();
            }
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-create-element.css";

.modal-loading-state {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: var(--space-8);
}
</style>
