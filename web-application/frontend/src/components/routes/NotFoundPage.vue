<template>
    <div class="page-content" tabindex="-1">
        <div class="not-found-page">
            <h1>{{ $t("Not found") }}</h1>
            <p>{{ $t("The page you are looking for was not found.") }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "NotFoundPage",
    components: {},
    mounted: function () {
        this.$setSubTitle(this.$t("Not found"));
    },
});
</script>

<style>
.not-found-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - var(--top-bar-size) - var(--space-64));
    padding: var(--space-32) 0;
    text-align: center;
}

.not-found-page h1 {
    margin: 0 0 var(--space-16);
    font-size: 28px;
    line-height: 36px;
    font-weight: 700;
    color: var(--color-text-primary);
}

.not-found-page p {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    color: var(--color-text-muted);
}

@media (max-width: 640px) {
    .not-found-page {
        padding: var(--space-24) 0;
    }

    .not-found-page h1 {
        font-size: 22px;
        line-height: 28px;
    }

    .not-found-page p {
        font-size: 15px;
        line-height: 22px;
    }
}
</style>
