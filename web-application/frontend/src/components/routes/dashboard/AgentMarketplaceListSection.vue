<template>
    <section class="agent-marketplace-card">
        <div class="agent-marketplace-toolbar">
            <TableCardToolbar
                :filters-collapsed="filtersCollapsed"
                :show-filters-toggle="showAdvancedFilters"
                @update:filters-collapsed="onFiltersCollapsedUpdate"
            >
                <template v-if="showFavorites" #tabs>
                    <TableCardToolbarTabs
                        :tabs="viewTabs"
                        :active-tab="activeViewTab"
                        panel-id="agent-marketplace-panel"
                        :tablist-label="$t('Agent marketplace views')"
                        @select="onViewTabSelect"
                    />
                </template>

                <template v-if="showAdvancedFilters" #filters>
                    <label class="toolbar-plan-filter" for="agent-marketplace-category">
                        <span class="toolbar-plan-label">{{ $t("Category") }}</span>
                        <select id="agent-marketplace-category" v-model="draftCategory" class="toolbar-plan-select">
                            <option value="all">{{ $t("All") }}</option>
                            <option value="front-desk">{{ $t("Front desk") }}</option>
                            <option value="revenue">{{ $t("Revenue") }}</option>
                            <option value="guest-experience">{{ $t("Guest experience") }}</option>
                            <option value="operations">{{ $t("Operations") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" for="agent-marketplace-sort-by">
                        <span class="toolbar-plan-label">{{ $t("Sort by") }}</span>
                        <select id="agent-marketplace-sort-by" v-model="draftSortBy" class="toolbar-plan-select">
                            <option value="">{{ $t("Default") }}</option>
                            <option value="name">{{ $t("Name") }}</option>
                            <option value="rating">{{ $t("Rating") }}</option>
                            <option value="price">{{ $t("Price") }}</option>
                        </select>
                    </label>

                    <label class="toolbar-plan-filter" for="agent-marketplace-sort-dir">
                        <span class="toolbar-plan-label">{{ $t("Order") }}</span>
                        <select id="agent-marketplace-sort-dir" v-model="draftSortDir" class="toolbar-plan-select">
                            <option value="">{{ $t("Default") }}</option>
                            <option value="asc">{{ $t("Ascending") }}</option>
                            <option value="desc">{{ $t("Descending") }}</option>
                        </select>
                    </label>

                    <button type="button" class="btn btn-primary toolbar-action-btn toolbar-apply-btn" @click="onApplyFilters">
                        <i class="fas fa-check" aria-hidden="true"></i>
                        {{ $t("Apply filters") }}
                    </button>

                    <button type="button" class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn" @click="onResetFilters">
                        <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                        {{ $t("Clear filters") }}
                    </button>
                </template>
            </TableCardToolbar>

            <label class="agent-marketplace-search" :aria-label="$t('Search agents')">
                <i class="fas fa-search" aria-hidden="true"></i>
                <input
                    :value="searchQuery"
                    type="search"
                    class="agent-marketplace-search__input"
                    :placeholder="$t('Search agents by name, capability or integration')"
                    @input="onSearchInput"
                    @keydown.enter.prevent="onSearchSubmit"
                />
            </label>
        </div>

        <div
            v-if="entries.length === 0"
            class="catalog-user-state"
            :id="showFavorites ? 'agent-marketplace-panel' : undefined"
            :role="showFavorites ? 'tabpanel' : undefined"
            :aria-labelledby="showFavorites ? 'agent-marketplace-panel-tab-' + activeViewTab : undefined"
        >
            <h2>{{ emptyStateTitleLabel }}</h2>
            <p>{{ emptyStateMessageLabel }}</p>
            <button v-if="favoritesOnly" type="button" class="btn btn-tertiary catalog-retry-button" @click="onShowAllAgents">
                {{ $t("Show all agents") }}
            </button>
        </div>

        <div
            v-else
            class="catalog-user-grid"
            :id="showFavorites ? 'agent-marketplace-panel' : undefined"
            :role="showFavorites ? 'tabpanel' : undefined"
            :aria-labelledby="showFavorites ? 'agent-marketplace-panel-tab-' + activeViewTab : undefined"
        >
            <article v-for="entry in entries" :key="entry.id" class="catalog-user-entry-card">
                <div class="agent-marketplace-card-head">
                    <p class="entry-main-title">{{ entry.name }}</p>
                    <button
                        v-if="showFavorites"
                        type="button"
                        class="agent-marketplace-favorite-btn"
                        :class="{ 'is-active': entry.isFavorite }"
                        :title="entry.isFavorite ? $t('Remove from favorites') : $t('Add to favorites')"
                        :aria-label="entry.isFavorite ? $t('Remove from favorites') : $t('Add to favorites')"
                        :aria-pressed="entry.isFavorite ? 'true' : 'false'"
                        @click="onToggleFavorite(entry.id)"
                    >
                        <i :class="entry.isFavorite ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i>
                    </button>
                </div>

                <div v-if="entry.capabilities.length > 0" class="entry-capability-tags">
                    <span v-for="cap in entry.capabilities.slice(0, 3)" :key="cap" class="tag">{{ cap }}</span>
                    <span v-if="entry.capabilities.length > 3" class="tag">
                        {{ $t("More capabilities") }}: {{ entry.capabilities.length - 3 }}
                    </span>
                </div>

                <p class="entry-main-description">{{ entry.description }}</p>

                <div class="catalog-card-divider" aria-hidden="true"></div>

                <div class="catalog-card-footer agent-marketplace-card-footer">
                    <div v-if="entry.monthlyPrice != null" class="entry-price-wrap">
                        <span class="entry-price">{{ formatPrice(entry.monthlyPrice) }}</span>
                        <span class="entry-price-cycle">/{{ $t("month") }}</span>
                    </div>
                    <div v-else-if="entry.statusLabel" class="entry-price-wrap">
                        <span class="entry-price entry-status-label">{{ entry.statusLabel }}</span>
                    </div>
                    <button
                        type="button"
                        class="btn btn-primary catalog-action-btn catalog-view-btn"
                        :disabled="entry.viewDisabled"
                        :title="entry.viewDisabled ? $t('Not deployed') : $t('View')"
                        @click="onViewEntry(entry)"
                    >
                        {{ $t("View") }}
                    </button>
                </div>
            </article>
        </div>

        <div v-if="paginationVisible" class="agent-marketplace-pagination">
            <PaginationBar
                :page="currentPage"
                :total-pages="totalPages"
                :can-go-prev="canGoPrev"
                :can-go-next="canGoNext"
                :visible="paginationVisible"
                :aria-label="$t('Agent marketplace pagination')"
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
import TableCardToolbarTabs, { type TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import type {
    AgentMarketplaceCategory,
    AgentMarketplaceSortBy,
    AgentMarketplaceSortDir,
    AgentMarketplaceViewTab,
} from "@/composables/agent-marketplace-domain";
import { formatEur } from "@/utils/format-currency";

export interface AgentMarketplaceCardItem {
    id: string;
    name: string;
    description: string;
    isFavorite: boolean;
    capabilities: string[];
    /** When null/undefined, statusLabel is shown instead of a price. */
    monthlyPrice?: number | null;
    statusLabel?: string;
    viewDisabled?: boolean;
}

export default defineComponent({
    name: "AgentMarketplaceListSection",
    components: {
        PaginationBar,
        TableCardToolbar,
        TableCardToolbarTabs,
    },
    emits: [
        "search-change",
        "search-submit",
        "toggle-favorite",
        "prev-page",
        "next-page",
        "update:filters-collapsed",
        "apply-filters",
        "reset-filters",
        "view-tab-change",
        "view-entry",
    ],
    props: {
        searchQuery: {
            type: String,
            default: "",
        },
        selectedCategory: {
            type: String as PropType<AgentMarketplaceCategory>,
            default: "all",
        },
        favoritesOnly: {
            type: Boolean,
            default: false,
        },
        activeViewTab: {
            type: String as PropType<AgentMarketplaceViewTab>,
            default: "all",
        },
        favoriteCount: {
            type: Number,
            default: 0,
        },
        sortBy: {
            type: String as PropType<AgentMarketplaceSortBy>,
            default: "",
        },
        sortDir: {
            type: String as PropType<AgentMarketplaceSortDir>,
            default: "",
        },
        filtersCollapsed: {
            type: Boolean,
            default: true,
        },
        entries: {
            type: Array as PropType<AgentMarketplaceCardItem[]>,
            default: () => [],
        },
        currentPage: {
            type: Number,
            default: 1,
        },
        totalPages: {
            type: Number,
            default: 1,
        },
        paginationVisible: {
            type: Boolean,
            default: false,
        },
        canGoPrev: {
            type: Boolean,
            default: false,
        },
        canGoNext: {
            type: Boolean,
            default: false,
        },
        showAdvancedFilters: {
            type: Boolean,
            default: true,
        },
        showFavorites: {
            type: Boolean,
            default: true,
        },
    },
    data: function () {
        return {
            draftCategory: this.selectedCategory || "all",
            draftSortBy: this.sortBy || "",
            draftSortDir: this.sortDir || "",
        };
    },
    methods: {
        onSearchInput: function (event: Event): void {
            this.$emit("search-change", (event.target as HTMLInputElement).value);
        },
        onSearchSubmit: function (): void {
            this.$emit("search-submit");
        },
        onApplyFilters: function (): void {
            this.$emit("apply-filters", {
                selectedCategory: this.draftCategory as AgentMarketplaceCategory,
                sortBy: this.draftSortBy as AgentMarketplaceSortBy,
                sortDir: this.draftSortDir as AgentMarketplaceSortDir,
            });
        },
        onResetFilters: function (): void {
            this.draftCategory = "all";
            this.draftSortBy = "";
            this.draftSortDir = "";
            this.$emit("reset-filters");
        },
        onViewTabSelect: function (tabId: string): void {
            this.$emit("view-tab-change", tabId);
        },
        onShowAllAgents: function (): void {
            this.$emit("view-tab-change", "all");
        },
        onToggleFavorite: function (entryId: string): void {
            this.$emit("toggle-favorite", entryId);
        },
        onViewEntry: function (entry: AgentMarketplaceCardItem): void {
            if (entry.viewDisabled) {
                return;
            }
            this.$emit("view-entry", entry.id);
        },
        onFiltersCollapsedUpdate: function (collapsed: boolean): void {
            this.$emit("update:filters-collapsed", collapsed);
        },
        formatPrice: function (price: number): string {
            return formatEur(price, this.$locale.value);
        },
    },
    computed: {
        viewTabs: function (): TableCardToolbarTabItem[] {
            if (!this.showFavorites) {
                return [{ id: "all", label: "All agents" }];
            }
            return [
                { id: "all", label: "All agents" },
                { id: "favorites", label: "Favorites", count: this.favoriteCount },
            ];
        },
        emptyStateTitleLabel: function (): string {
            return this.favoritesOnly ? this.$t("No favorite agents yet") : this.$t("No agents match your filters");
        },
        emptyStateMessageLabel: function (): string {
            return this.favoritesOnly
                ? this.$t("Mark agents as favorites to see them here, or disable the favorites filter.")
                : this.$t("Try adjusting your search or filters to discover more ITAAS agents.");
        },
    },
    watch: {
        selectedCategory: function (value: AgentMarketplaceCategory): void {
            this.draftCategory = value || "all";
        },
        sortBy: function (value: AgentMarketplaceSortBy): void {
            this.draftSortBy = value || "";
        },
        sortDir: function (value: AgentMarketplaceSortDir): void {
            this.draftSortDir = value || "";
        },
    },
});
</script>
