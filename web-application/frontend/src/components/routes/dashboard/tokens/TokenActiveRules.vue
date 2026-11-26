<template>
    <article class="active-rules-card">
        <h2>{{ $t("Active rules") }}</h2>

        <ComponentLoader v-if="rulesLoading" />

        <div v-else class="rules-columns" :class="{ 'rules-columns--single': rulesColumns.length === 1 }">
            <p v-if="rules.length === 0" class="rules-empty">
                {{ $t("No token rules configured") }}
            </p>
            <ul v-for="(column, columnIndex) in rulesColumns" :key="columnIndex" class="rules-list">
                <li v-for="rule in column" :key="rule.id" class="rule-item">
                    <span class="rule-check" aria-hidden="true">
                        <i class="fas fa-check"></i>
                    </span>
                    <div class="rule-content">
                        <p class="rule-name">{{ rule.name }}</p>
                        <p class="rule-description">{{ rule.description }}</p>
                    </div>
                </li>
            </ul>
        </div>
    </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";

export default defineComponent({
    name: "TokenActiveRules",

    components: {
        ComponentLoader,
    },

    props: {
        rules: {
            type: Array as PropType<{ id: string; name: string; description: string }[]>,
            default: () => [],
        },

        rulesLoading: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        rulesColumns(): { id: string; name: string; description: string }[][] {
            if (this.rules.length === 0) {
                return [];
            }

            const mid = Math.ceil(this.rules.length / 2);
            const left = this.rules.slice(0, mid);
            const right = this.rules.slice(mid);

            if (right.length === 0) {
                return [left];
            }

            return [left, right];
        },
    },
});
</script>
