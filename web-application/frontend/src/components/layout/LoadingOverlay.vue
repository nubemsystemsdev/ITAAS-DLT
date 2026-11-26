<template>
    <div
        class="loading-overlay"
        :class="{ hidden: !display }"
        :aria-hidden="display ? undefined : 'true'"
        :aria-busy="display ? 'true' : 'false'"
    >
        <output v-if="display" class="visually-hidden">{{ $t("Loading") }}</output>
        <div class="loading-overlay-loader" aria-hidden="true">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "LoadingOverlay",

    props: {
        display: Boolean,
    },
});
</script>
