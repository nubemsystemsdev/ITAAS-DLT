<template>
    <div class="page-content product-detail-page nubem-detail-page" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <section v-else-if="catalogItem" class="catalog-detail-section">
            <div class="catalog-detail-inner">
                <button type="button" class="catalog-detail-back" @click="goBack">
                    <i class="fas fa-arrow-left" aria-hidden="true"></i>
                    {{ $t("Back to catalog") }}
                </button>

                <div class="catalog-detail-grid">
                    <div class="catalog-detail-visual">
                        <span class="catalog-detail-visual-icon">
                            <i :class="['fas', itemIcon]" aria-hidden="true"></i>
                        </span>
                    </div>

                    <div class="catalog-detail-info">
                        <div class="catalog-detail-tags">
                            <span class="catalog-detail-tag catalog-detail-tag-accent">{{ $t(kindLabel) }}</span>
                            <span class="catalog-detail-tag">{{ $t(catalogItem.type) }}</span>
                        </div>

                        <h1 class="catalog-detail-title">{{ catalogItem.name }}</h1>

                        <p class="catalog-detail-description">{{ $t(catalogItem.longDescription || catalogItem.shortDescription) }}</p>

                        <p class="catalog-detail-price">{{ formattedPrice }}</p>

                        <div v-if="catalogItem.features && catalogItem.features.length > 0" class="catalog-detail-includes">
                            <h2 class="catalog-detail-includes-title">{{ $t("What's included:") }}</h2>
                            <ul class="catalog-detail-includes-list">
                                <li v-for="feature in catalogItem.features" :key="feature">
                                    <i class="fas fa-check" aria-hidden="true"></i>
                                    <span>{{ $t(feature) }}</span>
                                </li>
                            </ul>
                        </div>

                        <button type="button" class="catalog-detail-cta">
                            {{ $t(ctaLabel) }}
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <section v-else-if="!loading" class="catalog-detail-section">
            <div class="catalog-detail-inner">
                <article class="catalog-detail-empty">
                    <h2>{{ $t("Item not found") }}</h2>
                    <p>{{ $t("The selected item is not available in the current catalog.") }}</p>
                    <button type="button" class="catalog-detail-link" @click="goBack">
                        <i class="fas fa-arrow-left" aria-hidden="true"></i>
                        {{ $t("Back to catalog") }}
                    </button>
                </article>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { RouteLocationRaw } from "vue-router";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { useCatalogItemDetail } from "@/composables/useCatalogItemDetail";
import { formatEur } from "@/utils/format-currency";
import { goBackFromContext } from "@/utils/route-to";

type CatalogDetailKind = "product" | "service";

const PRODUCT_TYPE_ICON: Record<string, string> = {
    customer_support: "fa-headset",
    operations: "fa-cogs",
    analytics: "fa-chart-line",
    reservations: "fa-calendar-check",
    fnb: "fa-utensils",
    backoffice: "fa-folder-open",
    reputation: "fa-star",
};

const SERVICE_TYPE_ICON: Record<string, string> = {
    launch: "fa-rocket",
    operations: "fa-cogs",
    growth: "fa-chart-line",
    compliance: "fa-shield-halved",
};

export default defineComponent({
    name: "NubemItemPage",
    components: {
        ComponentLoader,
    },
    setup: function () {
        const { loading, item, load } = useCatalogItemDetail("nubem-detail-load");
        return {
            loading,
            catalogItem: item,
            load,
        };
    },
    computed: {
        detailKind(): CatalogDetailKind {
            if (this.$route.query.kind === "service") {
                return "service";
            }
            return "product";
        },
        kindLabel(): string {
            return this.detailKind === "service" ? "Service" : "Product";
        },
        ctaLabel(): string {
            return this.detailKind === "service" ? "Request service" : "Buy now";
        },
        itemIcon(): string {
            if (!this.catalogItem) {
                return this.detailKind === "service" ? "fa-briefcase" : "fa-cube";
            }

            if (this.detailKind === "service") {
                return SERVICE_TYPE_ICON[this.catalogItem.type] || "fa-briefcase";
            }

            return PRODUCT_TYPE_ICON[this.catalogItem.type] || "fa-cube";
        },
        formattedPrice(): string {
            if (!this.catalogItem) {
                return "";
            }

            return formatEur(this.catalogItem.price, String(this.$locale?.value || "en"));
        },
        backRoute(): RouteLocationRaw {
            const filter = this.$route.query.filter;
            const filterQuery: Record<string, string> = {};
            if (typeof filter === "string" && ["all", "product", "service"].includes(filter)) {
                filterQuery.filter = filter;
            }

            if (this.$route.name === "catalog-detail") {
                return { name: "catalog", query: filterQuery };
            }

            return { name: "nubem-catalog", query: filterQuery };
        },
    },
    methods: {
        goBack: function () {
            goBackFromContext(this, this.backRoute, { preferHistory: false });
        },
    },
    mounted: function () {
        this.load(this.$route.params.id as string);
    },
});
</script>

<style scoped>
@import "@/style/layout/catalog-detail-shared.css";
</style>
