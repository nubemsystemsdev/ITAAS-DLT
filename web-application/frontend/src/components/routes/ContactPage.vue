<template>
    <div class="page-content under-construction-page" tabindex="-1">
        <section class="construction-card" aria-live="polite">
            <p class="construction-kicker">{{ $t("Nubemsystems") }}</p>
            <h1>{{ $t("Page is under construction") }}</h1>
            <p class="construction-message">
                {{ $t("Contact page is currently under construction. Please check back soon.") }}
            </p>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "ContactPage",
});
</script>

<style>
@import "@/style/layout/under-construction-page.css";
</style>
