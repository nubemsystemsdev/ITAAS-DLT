<template>
    <div class="table-tablist" role="tablist" :aria-label="tablistLabel">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            :id="panelId ? panelId + '-tab-' + tab.id : undefined"
            type="button"
            class="table-card-toolbar-tab"
            :class="{ active: activeTab === tab.id }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :aria-controls="panelId || undefined"
            :disabled="disabled"
            @click="onSelect(tab.id)"
        >
            {{ $t(tab.label) }}<template v-if="typeof tab.count === 'number'"> ({{ tab.count }})</template>
        </button>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";

export interface TableCardToolbarTabItem {
    id: string;
    label: string;
    count?: number;
}

export default defineComponent({
    name: "TableCardToolbarTabs",
    emits: ["select"],
    props: {
        tabs: {
            type: Array as PropType<TableCardToolbarTabItem[]>,
            required: true,
        },
        activeTab: {
            type: String,
            required: true,
        },
        tablistLabel: {
            type: String,
            required: true,
        },
        panelId: {
            type: String,
            default: "",
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        onSelect: function (tabId: string) {
            if (this.disabled) {
                return;
            }
            this.$emit("select", tabId);
        },
    },
});
</script>
