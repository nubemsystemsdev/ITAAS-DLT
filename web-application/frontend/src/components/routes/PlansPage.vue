<template>
    <div class="page-content products-page nubem-catalog-page" tabindex="-1">
        <section class="products-hero">
            <div class="products-hero-inner">
                <span class="products-hero-pill">{{ $t("Nubemsystems Plans") }}</span>
                <h1 class="products-hero-title">{{ $t("Plans Catalog") }}</h1>
                <p class="products-hero-subtitle">
                    {{ $t("Explore all available plans and compare pricing tiers to choose what fits your organization.") }}
                </p>
            </div>
        </section>

        <section class="products-content">
            <div class="products-content-inner">
                <div class="products-toolbar">
                    <label class="products-search-box" :aria-label="$t('Search plan')">
                        <i class="fas fa-search" aria-hidden="true"></i>
                        <input
                            v-model="searchQuery"
                            type="search"
                            class="products-search-input"
                            :placeholder="$t('Search plan')"
                            @input="onSearchChanged"
                        />
                    </label>
                </div>

                <div class="catalog-kpi-grid">
                    <article class="catalog-kpi-card">
                        <div class="catalog-kpi-label">{{ $t("Total plans") }}</div>
                        <div class="catalog-kpi-value">{{ totalPlans }}</div>
                    </article>
                    <article class="catalog-kpi-card">
                        <div class="catalog-kpi-label">{{ $t("Starting price") }}</div>
                        <div class="catalog-kpi-value">{{ formatPrice(startingPrice) }}</div>
                    </article>
                </div>

                <ComponentLoader v-if="loading"></ComponentLoader>

                <div v-else-if="hasError" class="catalog-user-state">
                    <h2>{{ $t("Could not load plans right now.") }}</h2>
                    <p>{{ $t("Please try again in a few seconds.") }}</p>
                    <button type="button" class="btn btn-primary catalog-retry-button" @click="loadPlans">
                        {{ $t("Retry load") }}
                    </button>
                </div>

                <div v-else-if="plans.length === 0" class="catalog-user-state">
                    <h2>{{ $t("No plans found for your search.") }}</h2>
                    <p>{{ $t("Try changing the search text.") }}</p>
                </div>

                <div v-else class="catalog-user-grid">
                    <article v-for="plan in plans" :key="plan.id" class="catalog-user-entry-card">
                        <p class="entry-main-title">{{ plan.name }}</p>
                        <div class="entry-kind-tag">
                            <span class="tag tag-featured">{{ $t("Plan") }}</span>
                        </div>

                        <p class="entry-main-description">{{ plan.shortDescription }}</p>

                        <div class="catalog-card-divider" aria-hidden="true"></div>

                        <div class="catalog-card-footer">
                            <div class="catalog-card-price-wrap">
                                <div class="catalog-card-price-main">
                                    <p class="entry-price">{{ formatPrice(plan.minPrice) }}</p>
                                    <p class="entry-price-cycle">/{{ $t("month") }}</p>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary catalog-action-btn catalog-view-btn" @click="goToPlanDashboard">
                                {{ $t("View") }}
                            </button>
                        </div>
                    </article>
                </div>

                <div v-if="!loading && !hasError && totalPages > 1" class="catalog-pagination-sticky">
                    <PaginationBar
                        :page="page"
                        :total-pages="totalPages"
                        :can-go-prev="paginationCanGoPrev"
                        :can-go-next="paginationCanGoNext"
                        :aria-label="$t('Plans pagination')"
                        @prev="prevPage"
                        @next="nextPage"
                    />
                </div>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AuthController } from "@/control/auth";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import { useCatalogEntries } from "@/composables/useCatalogEntries";
import { formatEur } from "@/utils/format-currency";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";

const SEARCH_DEBOUNCE_MS = 250;

export default defineComponent({
    name: "PlansPage",
    components: {
        ComponentLoader,
        PaginationBar,
    },
    setup: function () {
        const route = useRoute();
        const router = useRouter();
        const catalogEntriesState = useCatalogEntries({
            route,
            router,
        });

        catalogEntriesState.selectedType.value = "plan";

        const searchTimeoutId = `plans-search-${getUniqueStringId()}`;

        const plans = computed(() => catalogEntriesState.catalogEntries.value);
        const totalPlans = computed(() => catalogEntriesState.totalCatalogEntries.value);
        const startingPrice = computed(() => {
            const positivePrices = plans.value.map((plan) => plan.minPrice).filter((price) => price > 0);
            if (positivePrices.length === 0) {
                return 0;
            }
            return Math.min(...positivePrices);
        });

        const onSearchChanged = function () {
            Timeouts.Set(searchTimeoutId, SEARCH_DEBOUNCE_MS, () => {
                catalogEntriesState.submitSearch();
            });
        };

        return {
            ...catalogEntriesState,
            plans,
            totalPlans,
            startingPrice,
            onSearchChanged,
            loadPlans: catalogEntriesState.loadCatalog,
            searchTimeoutId,
        };
    },
    methods: {
        formatPrice: function (value: number): string {
            return formatEur(value, String(this.$locale?.value || "en"));
        },
        goToPlanDashboard: function () {
            if (AuthController.isAuthenticated()) {
                this.$router.push({ name: "catalog" });
                return;
            }
            this.$router.push({ name: "login" });
        },
    },
    mounted: function () {
        void this.loadPlans();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.searchTimeoutId);
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-shared-page.css";
</style>
