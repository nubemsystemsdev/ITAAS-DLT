<template>
    <section class="dashboard-page-header">
        <div class="dashboard-page-header__content">
            <p v-if="eyebrow" class="dashboard-page-header__eyebrow">{{ eyebrow }}</p>
            <h1 class="dashboard-page-header__title">{{ title }}</h1>
            <p v-if="subtitle" class="dashboard-page-header__subtitle">{{ subtitle }}</p>
        </div>
    </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "DashboardPageHeader",
    props: {
        eyebrow: {
            type: String,
            default: "",
        },
        title: {
            type: String,
            required: true,
        },
        subtitle: {
            type: String,
            default: "",
        },
    },
});
</script>
