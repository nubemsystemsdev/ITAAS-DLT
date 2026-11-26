<template>
    <section class="dashboard-section-card catalog-user-card">
        <div v-if="showToolbar" class="catalog-user-toolbar">
            <TableCardToolbar
                :filters-collapsed="filtersCollapsed"
                show-filters-toggle
                :filters-toggle-disabled="loading"
                @update:filters-collapsed="onFiltersCollapsedUpdate"
            >
                <template #tabs>
                    <CatalogSearchBar
                        :model-value="searchQuery"
                        :placeholder="$t('Search item, service or plan')"
                        :disabled="loading"
                        :locale="locale"
                        @update:model-value="onSearchChanged"
                        @search-submit="onSearchSubmit"
                        @select-entry="onSuggestionSelected"
                    />
                </template>

                <template #filters>
                    <label class="toolbar-plan-filter" for="catalog-type">
                        <span class="toolbar-plan-label">{{ $t("Type") }}</span>
                        <select id="catalog-type" v-model="draftType" class="toolbar-plan-select" :disabled="loading">
                            <option value="all">{{ $t("All") }}</option>
                            <option value="product">{{ $t("Products") }}</option>
                            <option value="service">{{ $t("Services") }}</option>
                            <option value="plan">{{ $t("Plans") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" for="catalog-subscription-mode">
                        <span class="toolbar-plan-label">{{ $t("Billing") }}</span>
                        <select id="catalog-subscription-mode" v-model="draftBilling" class="toolbar-plan-select" :disabled="loading">
                            <option value="monthly">{{ $t("Monthly") }}</option>
                            <option value="annual">{{ $t("Annual") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter toolbar-plan-filter--narrow" for="catalog-min-price">
                        <span class="toolbar-plan-label">{{ $t("Minimum price") }}</span>
                        <input
                            id="catalog-min-price"
                            :value="draftMinPrice"
                            type="number"
                            class="toolbar-plan-select toolbar-plan-select--price"
                            :disabled="loading"
                            min="0"
                            step="0.01"
                            :placeholder="$t('0.00')"
                            @change="onDraftMinPriceChange"
                        />
                    </label>

                    <label class="toolbar-plan-filter toolbar-plan-filter--narrow" for="catalog-max-price">
                        <span class="toolbar-plan-label">{{ $t("Maximum price") }}</span>
                        <input
                            id="catalog-max-price"
                            :value="draftMaxPrice"
                            type="number"
                            class="toolbar-plan-select toolbar-plan-select--price"
                            :disabled="loading"
                            min="0"
                            step="0.01"
                            :placeholder="$t('0.00')"
                            @change="onDraftMaxPriceChange"
                        />
                    </label>

                    <label class="toolbar-plan-filter" for="catalog-sort-by">
                        <span class="toolbar-plan-label">{{ $t("Sort by") }}</span>
                        <select id="catalog-sort-by" v-model="draftSortBy" class="toolbar-plan-select" :disabled="loading">
                            <option value="">{{ $t("Default") }}</option>
                            <option value="name">{{ $t("Name") }}</option>
                            <option value="price">{{ $t("Price") }}</option>
                            <option value="createdAt">{{ $t("Created at") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" for="catalog-sort-dir">
                        <span class="toolbar-plan-label">{{ $t("Order") }}</span>
                        <select id="catalog-sort-dir" v-model="draftSortDir" class="toolbar-plan-select" :disabled="loading">
                            <option value="">{{ $t("Default") }}</option>
                            <option value="asc">{{ $t("Ascending") }}</option>
                            <option value="desc">{{ $t("Descending") }}</option>
                        </select>
                    </label>

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

            <p v-if="catalogNotice" class="catalog-notice" role="status" aria-live="polite">
                {{ $t(catalogNotice) }}
            </p>

            <p v-if="!isAuthenticated" class="catalog-login-hint" role="status" aria-live="polite">
                {{ $t("Sign in to subscribe or complete pending payments.") }}
            </p>
        </div>

        <ComponentLoader v-if="loading"></ComponentLoader>

        <div v-else-if="hasError" class="catalog-user-state">
            <h2>{{ $t("Could not load catalog right now.") }}</h2>
            <p>{{ $t("Please try again in a few seconds.") }}</p>
            <button type="button" class="btn btn-primary catalog-retry-button" @click="$emit('retry-load')">
                {{ $t("Retry load") }}
            </button>
        </div>

        <div v-else-if="entries.length === 0" class="catalog-user-state">
            <h2>{{ $t(emptyStateTitle) }}</h2>
            <p>{{ $t(emptyStateMessage) }}</p>
        </div>

        <div v-else class="catalog-user-grid">
            <article v-for="entry in entries" :key="entry.id" class="catalog-user-entry-card">
                <p class="entry-main-title">{{ entry.name }}</p>
                <div class="entry-kind-tag">
                    <span v-if="entry.kindLabel" class="tag tag-featured">{{ $t(entry.kindLabel) }}</span>
                </div>

                <p class="entry-main-description">{{ entry.description }}</p>

                <div class="catalog-card-divider" aria-hidden="true"></div>

                <div class="catalog-card-footer">
                    <div class="catalog-card-price-wrap">
                        <p v-if="entry.showOriginalPrice" class="entry-price-original">
                            {{ entry.originalPriceLabel }} /{{ $t(entry.cycleLabel) }}
                        </p>

                        <div class="catalog-card-price-main">
                            <p class="entry-price">{{ entry.priceLabel }}</p>
                            <p v-if="entry.hasCycleLabel" class="entry-price-cycle">/{{ $t(entry.cycleLabel) }}</p>
                            <span v-if="entry.hasDiscount" class="entry-price-discount"> -{{ entry.discountPercent }}% </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="btn btn-primary catalog-action-btn catalog-view-btn"
                        :disabled="actionInProgress"
                        @click="onViewEntry(entry.id)"
                    >
                        {{ $t("View") }}
                    </button>
                </div>
            </article>
        </div>

        <div v-if="!loading && !hasError && totalPages > 1" class="catalog-pagination-sticky">
            <PaginationBar
                :page="currentPage"
                :total-pages="totalPages"
                :can-go-prev="canGoPrev"
                :can-go-next="canGoNext"
                :aria-label="$t('Catalog pagination')"
                @prev="$emit('prev-page')"
                @next="$emit('next-page')"
            />
        </div>
    </section>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import type { TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import CatalogSearchBar from "@/components/utils/CatalogSearchBar.vue";

export interface CatalogUserListCardItem {
    id: string;
    initials: string;
    kindLabel: string;
    typeLabel: string;
    name: string;
    description: string;
    showOriginalPrice: boolean;
    originalPriceLabel: string;
    cycleLabel: string;
    priceLabel: string;
    hasCycleLabel: boolean;
    hasDiscount: boolean;
    discountPercent: number;
}

export default defineComponent({
    name: "CatalogUserListSection",
    components: {
        CatalogSearchBar,
        ComponentLoader,
        PaginationBar,
        TableCardToolbar,
    },
    emits: [
        "search-change",
        "search-submit",
        "select-suggestion",
        "retry-load",
        "view-entry",
        "prev-page",
        "next-page",
        "update:filters-collapsed",
        "apply-filters",
        "reset-filters",
    ],
    props: {
        loading: {
            type: Boolean,
            default: false,
        },
        hasError: {
            type: Boolean,
            default: false,
        },
        catalogEntriesCount: {
            type: Number,
            default: 0,
        },
        toolbarTabs: {
            type: Array as PropType<TableCardToolbarTabItem[]>,
            default: () => [],
        },
        selectedType: {
            type: String,
            default: "all",
        },
        filtersCollapsed: {
            type: Boolean,
            default: true,
        },
        subscriptionMode: {
            type: String,
            default: "monthly",
        },
        minPrice: {
            type: Number as PropType<number | null>,
            default: null,
        },
        maxPrice: {
            type: Number as PropType<number | null>,
            default: null,
        },
        sortBy: {
            type: String,
            default: "",
        },
        sortDir: {
            type: String,
            default: "",
        },
        searchQuery: {
            type: String,
            default: "",
        },
        locale: {
            type: String,
            default: "en",
        },
        catalogNotice: {
            type: String,
            default: "",
        },
        isAuthenticated: {
            type: Boolean,
            default: false,
        },
        emptyStateTitle: {
            type: String,
            default: "",
        },
        emptyStateMessage: {
            type: String,
            default: "",
        },
        entries: {
            type: Array as PropType<CatalogUserListCardItem[]>,
            default: () => [],
        },
        actionInProgress: {
            type: Boolean,
            default: false,
        },
        currentPage: {
            type: Number,
            default: 1,
        },
        totalPages: {
            type: Number,
            default: 1,
        },
        canGoPrev: {
            type: Boolean,
            default: false,
        },
        canGoNext: {
            type: Boolean,
            default: false,
        },
    },
    data: function () {
        return {
            draftType: this.selectedType || "all",
            draftBilling: this.subscriptionMode || "monthly",
            draftMinPrice: this.draftPriceToString(this.minPrice),
            draftMaxPrice: this.draftPriceToString(this.maxPrice),
            draftSortBy: this.sortBy || "",
            draftSortDir: this.sortDir || "",
        };
    },
    methods: {
        draftPriceToString: function (val: number | null | undefined): string {
            if (val === null || val === undefined) {
                return "";
            }
            return String(val);
        },
        draftPriceToNumber: function (raw: string): number | null {
            const trimmed = (raw || "").trim();
            return trimmed ? Math.max(0, Number(trimmed)) : null;
        },
        onDraftMinPriceChange: function (event: Event): void {
            this.draftMinPrice = (event.target as HTMLInputElement).value;
        },
        onDraftMaxPriceChange: function (event: Event): void {
            this.draftMaxPrice = (event.target as HTMLInputElement).value;
        },
        onApplyFilters: function (): void {
            this.$emit("apply-filters", {
                selectedType: this.draftType,
                subscriptionMode: this.draftBilling,
                minPrice: this.draftPriceToNumber(this.draftMinPrice),
                maxPrice: this.draftPriceToNumber(this.draftMaxPrice),
                sortBy: this.draftSortBy,
                sortDir: this.draftSortDir,
            });
        },
        onResetFilters: function (): void {
            this.draftType = "all";
            this.draftBilling = "monthly";
            this.draftMinPrice = "";
            this.draftMaxPrice = "";
            this.draftSortBy = "";
            this.draftSortDir = "";
            this.$emit("reset-filters");
        },
        onSearchChanged: function (value: string): void {
            this.$emit("search-change", value);
        },
        onSearchSubmit: function (): void {
            this.$emit("search-submit");
        },
        onSuggestionSelected: function (entry: any): void {
            this.$emit("select-suggestion", entry);
        },
        onViewEntry: function (entryId: string): void {
            if (this.actionInProgress) {
                return;
            }
            this.$emit("view-entry", entryId);
        },
        onFiltersCollapsedUpdate: function (collapsed: boolean): void {
            this.$emit("update:filters-collapsed", collapsed);
        },
    },
    watch: {
        selectedType: function (val: string): void {
            this.draftType = val || "all";
        },
        subscriptionMode: function (val: string): void {
            this.draftBilling = val || "monthly";
        },
        minPrice: function (val: number | null): void {
            this.draftMinPrice = this.draftPriceToString(val);
        },
        maxPrice: function (val: number | null): void {
            this.draftMaxPrice = this.draftPriceToString(val);
        },
        sortBy: function (val: string): void {
            this.draftSortBy = val || "";
        },
        sortDir: function (val: string): void {
            this.draftSortDir = val || "";
        },
    },
    computed: {
        showToolbar: function (): boolean {
            return !this.hasError;
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-shared-page.css";

.catalog-user-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--space-16);
}

.catalog-user-toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
}

.catalog-notice,
.catalog-login-hint {
    margin: 0;
    padding: var(--space-12);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 20px;
}

.catalog-login-hint {
    border: 1px solid var(--color-brand-secondary);
}

.catalog-notice {
    border: 1px solid var(--color-feedback-warning);
}

.catalog-user-search-clear:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}
</style>
