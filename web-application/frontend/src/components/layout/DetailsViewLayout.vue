<template>
    <div class="page-content details-view-page" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <section v-else class="details-view-shell">
            <button type="button" class="btn btn-tertiary details-view-back-button" @click="goBack">
                <i class="fas fa-arrow-left" aria-hidden="true"></i>
                {{ $t("Go back") }}
            </button>

            <article v-if="notFound" class="details-view-empty details-view-card">
                <h2 class="details-view-empty-title">{{ notFoundTitle }}</h2>
                <p class="details-view-empty-description">{{ notFoundDescription }}</p>
            </article>

            <article v-else-if="errorMessage" class="details-view-empty details-view-card">
                <h2 class="details-view-empty-title">{{ errorTitle }}</h2>
                <p class="details-view-empty-description">{{ errorMessage }}</p>
            </article>

            <div v-else class="details-view-layout">
                <slot name="header"></slot>

                <section class="details-view-content details-view-card">
                    <slot></slot>
                </section>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import type { RouteLocationRaw } from "vue-router";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { goBackFromContext } from "@/utils/route-to";

export default defineComponent({
    name: "DetailsViewLayout",
    components: {
        ComponentLoader,
    },
    props: {
        loading: {
            type: Boolean,
            default: false,
        },
        notFound: {
            type: Boolean,
            default: false,
        },
        backRoute: {
            type: [String, Object] as PropType<RouteLocationRaw>,
            required: true,
        },
        notFoundTitle: {
            type: String,
            required: true,
        },
        notFoundDescription: {
            type: String,
            required: true,
        },
        errorMessage: {
            type: String,
            default: "",
        },
        errorTitle: {
            type: String,
            default: "",
        },
    },
    methods: {
        goBack: function () {
            goBackFromContext(this, this.backRoute);
        },
    },
});
</script>

<style>
@import "@/style/layout/details-view.css";
</style>
