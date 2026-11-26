<template>
    <span class="info-tooltip">
        <TooltipPortal v-slot="{ describedBy }" :content="content" :multiline="multiline">
            <button type="button" class="info-tooltip-icon" :aria-label="$t('More information')" :aria-describedby="describedBy"></button>
        </TooltipPortal>
    </span>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import TooltipPortal from "@/components/ui/TooltipPortal.vue";

export default defineComponent({
    name: "InfoTooltip",
    components: {
        TooltipPortal,
    },
    props: {
        content: {
            type: String,
            required: true,
        },
        multiline: {
            type: Boolean,
            default: true,
        },
    },
});
</script>

<style scoped>
.info-tooltip {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
}

.info-tooltip-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    background: var(--color-cta-fill);
    color: var(--color-cta-text);
    cursor: help;
    padding: 0;
}

.info-tooltip-icon::before {
    content: "i";
}

.info-tooltip :deep(.tooltip-portal-trigger) {
    display: inline-flex;
    align-items: center;
}

@media (max-width: 640px) {
    .info-tooltip :deep(.tooltip-portal-trigger) {
        min-width: 44px;
        min-height: 44px;
        justify-content: center;
    }

    .info-tooltip-icon {
        cursor: pointer;
    }

    .info-tooltip :deep(.tooltip-portal-trigger--open) .info-tooltip-icon {
        outline: 2px solid var(--color-brand-secondary);
        outline-offset: 2px;
    }
}
</style>
