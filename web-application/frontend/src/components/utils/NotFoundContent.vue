<template>
    <div class="content-inner" tabindex="-1">
        <div class="not-found-content">
            <h2>{{ $t("Not found") }}</h2>
            <p>{{ $t("The page you are looking for was not found.") }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "NotFoundContent",
    components: {},
});
</script>

<style scoped>
.not-found-content {
    text-align: center;
    padding: var(--space-32) var(--space-16);
}

.not-found-content h2 {
    margin: 0 0 var(--space-12);
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.not-found-content p {
    margin: 0;
    font-size: 15px;
    line-height: 24px;
    color: var(--color-text-muted);
}

@media (max-width: 640px) {
    .not-found-content {
        padding: var(--space-24) var(--space-12);
    }

    .not-found-content h2 {
        font-size: 18px;
        line-height: 24px;
    }

    .not-found-content p {
        font-size: 14px;
        line-height: 22px;
    }
}
</style>
