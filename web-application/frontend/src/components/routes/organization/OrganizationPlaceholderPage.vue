<template>
    <div class="page-content under-construction-page" tabindex="-1">
        <section class="construction-card" aria-live="polite">
            <p class="construction-kicker">{{ $t("Organization") }}</p>
            <h1>{{ pageTitle }}</h1>
            <p class="construction-message">
                {{ $t("This section is currently under construction. Please check back soon.") }}
            </p>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "OrganizationPlaceholderPage",
    computed: {
        pageTitle(): string {
            const titleKey = (this.$route.meta?.pageTitleKey as string) || "";
            return titleKey ? this.$t(titleKey) : this.$t("Page is under construction");
        },
    },
    watch: {
        pageTitle: {
            immediate: true,
            handler(title: string) {
                this.$setSubTitle(title);
            },
        },
    },
});
</script>

<style>
@import "@/style/layout/under-construction-page.css";
</style>
