<template>
    <div
        class="table-tablist details-view-tablist"
        :class="{
            'details-view-tablist--icon-only': iconOnly === true,
            'details-view-tablist--icon-only-mobile': iconOnly === 'mobile',
        }"
        role="tablist"
        :aria-label="tablistLabel"
    >
        <button
            v-for="tab in tabs"
            :key="tab.id"
            :id="'details-view-tab-' + tab.id"
            type="button"
            class="details-view-tab"
            :class="{ active: activeTab === tab.id, 'details-view-tab--danger': tab.variant === 'danger' }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :aria-controls="'details-view-panel-' + tab.id"
            :title="$t(tab.label)"
            @click="onSelect(tab.id)"
        >
            <i v-if="tab.icon" :class="tab.icon" aria-hidden="true"></i>
            <span v-if="tab.shortLabel" class="details-view-tab-label details-view-tab-label--short">{{ $t(tab.shortLabel) }}</span>
            <span class="details-view-tab-label" :class="{ 'details-view-tab-label--full': !!tab.shortLabel }">{{ $t(tab.label) }}</span>
        </button>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";

export interface DetailsViewTabItem {
    id: string;
    label: string;
    shortLabel?: string;
    icon?: string;
    variant?: "danger";
}

export default defineComponent({
    name: "DetailsViewTabs",
    emits: ["select"],
    props: {
        tabs: {
            type: Array as PropType<DetailsViewTabItem[]>,
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
        iconOnly: {
            type: [Boolean, String] as PropType<boolean | "mobile">,
            default: false,
        },
    },
    methods: {
        onSelect: function (tabId: string) {
            this.$emit("select", tabId);
        },
    },
});
</script>
