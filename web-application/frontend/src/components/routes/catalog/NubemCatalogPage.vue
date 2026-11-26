<template>
    <div class="page-content products-page nubem-catalog-page" tabindex="-1">
        <section class="products-hero">
            <div class="products-hero-inner">
                <span class="products-hero-pill">{{ $t("Nubemsystems Catalog") }}</span>
                <h1 class="products-hero-title">{{ $t("Products & Services Catalog") }}</h1>
                <p class="products-hero-subtitle">
                    {{ $t("Discover all Nubemsystems products and services in one place. Filter by category to find what you need.") }}
                </p>
            </div>
        </section>

        <section class="products-content">
            <div class="products-content-inner">
                <div class="products-toolbar">
                    <label class="products-search-box" :aria-label="$t('Search product or service')">
                        <i class="fas fa-search" aria-hidden="true"></i>
                        <input
                            v-model="searchQuery"
                            type="search"
                            class="products-search-input"
                            :placeholder="$t('Search product or service')"
                            @input="onSearchChanged"
                        />
                    </label>

                    <div class="catalog-type-filter" role="tablist" :aria-label="$t('Catalog type filter')">
                        <button
                            v-for="option in filterOptions"
                            :key="option.value"
                            type="button"
                            class="catalog-type-filter-btn"
                            :class="{ 'is-active': selectedType === option.value }"
                            role="tab"
                            :aria-selected="selectedType === option.value"
                            @click="onFilterChanged(option.value)"
                        >
                            {{ $t(option.label) }}
                        </button>
                    </div>
                </div>

                <div class="catalog-kpi-grid">
                    <article class="catalog-kpi-card">
                        <div class="catalog-kpi-label">{{ $t("Total items") }}</div>
                        <div class="catalog-kpi-value">{{ filteredTotalItems }}</div>
                    </article>
                    <article class="catalog-kpi-card">
                        <div class="catalog-kpi-label">{{ $t("Starting price") }}</div>
                        <div class="catalog-kpi-value">{{ formatPrice(minPrice) }}</div>
                    </article>
                </div>

                <ComponentLoader v-if="loading"></ComponentLoader>

                <div v-else-if="hasError" class="catalog-user-state">
                    <h2>{{ $t("Could not load catalog right now.") }}</h2>
                    <p>{{ $t("Please try again in a few seconds.") }}</p>
                    <button type="button" class="btn btn-primary catalog-retry-button" @click="loadCatalog">
                        {{ $t("Retry load") }}
                    </button>
                </div>

                <div v-else-if="paginatedItems.length === 0" class="catalog-user-state">
                    <h2>{{ $t("No items found for your search.") }}</h2>
                    <p>{{ $t("Try changing the search text or filter.") }}</p>
                </div>

                <div v-else class="catalog-user-grid">
                    <article v-for="item in paginatedItems" :key="item.id" class="catalog-user-entry-card">
                        <p class="entry-main-title">{{ item.name }}</p>
                        <div class="entry-kind-tag">
                            <span class="tag tag-featured">{{ $t(item.kindLabel) }}</span>
                        </div>

                        <p class="entry-main-description">{{ item.shortDescription }}</p>

                        <div class="catalog-card-divider" aria-hidden="true"></div>

                        <div class="catalog-card-footer">
                            <div class="catalog-card-price-wrap">
                                <div class="catalog-card-price-main">
                                    <p class="entry-price">{{ formatPrice(item.price) }}</p>
                                    <p class="entry-price-cycle">/{{ $t("month") }}</p>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary catalog-action-btn catalog-view-btn" @click="goToDetail(item)">
                                {{ $t("View") }}
                            </button>
                        </div>
                    </article>
                </div>

                <div v-if="!loading && !hasError && totalPages > 1" class="catalog-pagination-sticky">
                    <PaginationBar
                        :page="currentPage"
                        :total-pages="totalPages"
                        :can-go-prev="currentPage > 1"
                        :can-go-next="currentPage < totalPages"
                        :aria-label="$t('Catalog pagination')"
                        @prev="prevPage"
                        @next="nextPage"
                    />
                </div>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import type { CatalogPublicListItem } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import { normalizeCatalogKindFromType } from "@/composables/catalog-domain";
import { LIST_PAGE_SIZE } from "@/constants/ui";
import { formatEur } from "@/utils/format-currency";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";

const CATALOG_KIND_TAB_IDS = ["all", "product", "service"] as const;
type CatalogKindFilter = (typeof CATALOG_KIND_TAB_IDS)[number];

interface CatalogCombinedItem extends CatalogPublicListItem {
    kind: Exclude<CatalogKindFilter, "all">;
    kindLabel: string;
}

const SEARCH_DEBOUNCE_MS = 250;
const RETRY_DELAY_MS = 1500;

export default defineComponent({
    name: "NubemCatalogPage",
    components: {
        ComponentLoader,
        PaginationBar,
    },
    data: function () {
        return {
            loading: true,
            hasError: false,
            searchQuery: "",
            debouncedQuery: "",
            selectedType: "all" as CatalogKindFilter,
            currentPage: 1,
            allItems: [] as CatalogCombinedItem[],
            searchTimeoutId: `nubem-catalog-search-${getUniqueStringId()}`,
            retryTimeoutId: `nubem-catalog-retry-${getUniqueStringId()}`,
            productRequestId: `nubem-catalog-products-${getUniqueStringId()}`,
            filterOptions: [
                { value: "all", label: "All" },
                { value: "product", label: "Products" },
                { value: "service", label: "Services" },
            ] as Array<{ value: CatalogKindFilter; label: string }>,
        };
    },
    computed: {
        filteredItems(): CatalogCombinedItem[] {
            return this.allItems;
        },
        filteredTotalItems(): number {
            return this.filteredItems.length;
        },
        totalPages(): number {
            return Math.max(Math.ceil(this.filteredItems.length / LIST_PAGE_SIZE), 1);
        },
        paginatedItems(): CatalogCombinedItem[] {
            const start = (this.currentPage - 1) * LIST_PAGE_SIZE;
            return this.filteredItems.slice(start, start + LIST_PAGE_SIZE);
        },
        minPrice(): number {
            if (this.filteredItems.length === 0) {
                return 0;
            }
            return this.filteredItems.reduce((min, item) => Math.min(min, item.price), this.filteredItems[0].price);
        },
    },
    methods: {
        formatPrice: function (value: number): string {
            return formatEur(value, String(this.$locale?.value || "en"));
        },
        mapApiItem: function (item: CatalogPublicListItem, kind: Exclude<CatalogKindFilter, "all">): CatalogCombinedItem {
            return {
                ...item,
                kind,
                kindLabel: kind === "product" ? "Product" : "Service",
            };
        },
        onSearchChanged: function () {
            Timeouts.Set(this.searchTimeoutId, SEARCH_DEBOUNCE_MS, () => {
                this.debouncedQuery = this.searchQuery;
                this.currentPage = 1;
                this.loadCatalog();
            });
        },
        syncTabFromRoute: function (): void {
            const tabQuery = this.$route.query.tab ?? this.$route.query.filter;
            this.selectedType = normalizeRouteTabQuery(tabQuery, CATALOG_KIND_TAB_IDS, "all");
        },
        onFilterChanged: function (filter: CatalogKindFilter) {
            if (this.selectedType === filter) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, filter, "all");
        },
        onRouteTabChanged: function (): void {
            const previousType = this.selectedType;
            this.syncTabFromRoute();
            if (previousType === this.selectedType) {
                return;
            }
            this.currentPage = 1;
            this.loadCatalog();
        },
        nextPage: function () {
            if (this.currentPage >= this.totalPages || this.loading) {
                return;
            }
            this.currentPage += 1;
        },
        prevPage: function () {
            if (this.currentPage <= 1 || this.loading) {
                return;
            }
            this.currentPage -= 1;
        },
        goToDetail: function (_item: CatalogCombinedItem) {
            if (AuthController.isAuthenticated()) {
                this.$router.push({ name: "catalog" });
                return;
            }
            this.$router.push({ name: "login" });
        },
        loadCatalog: function () {
            Timeouts.Abort(this.retryTimeoutId);
            Request.Abort(this.productRequestId);

            this.loading = true;
            this.hasError = false;

            const query = this.debouncedQuery.trim() || undefined;
            const kind = this.selectedType;
            const catalogKind = kind === "product" || kind === "service" ? kind : undefined;

            Request.Pending(
                this.productRequestId,
                ApiCatalogItems.GetPublicCatalogItems({
                    catalogKind,
                    q: query,
                    page: 1,
                    pageSize: LIST_PAGE_SIZE,
                }),
            )
                .onSuccess((response) => {
                    this.allItems = (response.items || [])
                        .map((item) => {
                            const resolvedKind = kind === "all" ? normalizeCatalogKindFromType(item.type || "") : kind;
                            const itemKind: Exclude<CatalogKindFilter, "all"> = resolvedKind === "plan" ? "service" : resolvedKind;
                            return this.mapApiItem(item, itemKind);
                        })
                        .sort((a, b) => a.name.localeCompare(b.name));

                    if (this.currentPage > this.totalPages) {
                        this.currentPage = this.totalPages;
                    }

                    this.loading = false;
                })
                .onCancel(() => {
                    // aborted by a subsequent request, no-op
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        temporalError: () => {
                            this.allItems = [];
                            this.hasError = true;
                            this.loading = false;
                            Timeouts.Set(this.retryTimeoutId, RETRY_DELAY_MS, this.loadCatalog);
                        },
                        networkError: () => {
                            this.allItems = [];
                            this.hasError = true;
                            this.loading = false;
                            Timeouts.Set(this.retryTimeoutId, RETRY_DELAY_MS, this.loadCatalog);
                        },
                        serverError: () => {
                            this.allItems = [];
                            this.hasError = true;
                            this.loading = false;
                            Timeouts.Set(this.retryTimeoutId, RETRY_DELAY_MS, this.loadCatalog);
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.allItems = [];
                    this.hasError = true;
                    this.loading = false;
                });
        },
        cleanupCatalog: function () {
            Timeouts.Abort(this.searchTimeoutId);
            Timeouts.Abort(this.retryTimeoutId);
            Request.Abort(this.productRequestId);
        },
    },
    mounted: function () {
        this.syncTabFromRoute();
        this.loadCatalog();
    },
    activated: function () {
        this.onRouteTabChanged();
    },
    beforeUnmount: function () {
        this.cleanupCatalog();
    },
    watch: {
        "$route.query.tab": function () {
            this.onRouteTabChanged();
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-shared-page.css";
</style>
