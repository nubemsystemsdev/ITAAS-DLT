<template>
    <div class="table-card-toolbar-panel">
        <div v-if="hasToolbarRow" class="table-card-toolbar">
            <div v-if="hasTabsArea" class="table-card-toolbar__tabs">
                <slot name="tabs">
                    <TableCardToolbarTabs
                        v-if="tabs.length"
                        :tabs="tabs"
                        :active-tab="activeTab"
                        :tablist-label="tablistLabel"
                        :panel-id="tabPanelId"
                        :disabled="tabsDisabled"
                        @select="onSelectTab"
                    />
                </slot>
            </div>

            <div v-if="hasActionsArea" class="table-card-toolbar__actions">
                <slot name="actions"></slot>
                <button
                    v-if="showFiltersToggle"
                    type="button"
                    class="btn btn-tertiary toolbar-action-btn toolbar-collapse-btn"
                    :aria-expanded="!filtersCollapsed"
                    :disabled="filtersToggleDisabled"
                    @click="toggleFilters"
                >
                    <i class="fas fa-filter" aria-hidden="true"></i>
                    {{ filtersCollapsed ? $t("Show filters") : $t("Hide filters") }}
                </button>
            </div>
        </div>

        <div v-if="filtersVisible" class="table-card-toolbar-filters">
            <slot name="filters"></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import TableCardToolbarTabs, { type TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";

export default defineComponent({
    name: "TableCardToolbar",
    components: {
        TableCardToolbarTabs,
    },
    emits: ["select", "update:filtersCollapsed"],
    props: {
        tabs: {
            type: Array as PropType<TableCardToolbarTabItem[]>,
            default: () => [],
        },
        activeTab: {
            type: String,
            default: "",
        },
        tablistLabel: {
            type: String,
            default: "",
        },
        tabsDisabled: {
            type: Boolean,
            default: false,
        },
        filtersCollapsed: {
            type: Boolean,
            default: true,
        },
        showFiltersToggle: {
            type: Boolean,
            default: false,
        },
        filtersToggleDisabled: {
            type: Boolean,
            default: false,
        },
        tabPanelId: {
            type: String,
            default: "",
        },
    },
    computed: {
        hasToolbarRow: function (): boolean {
            return this.hasTabsArea || this.hasActionsArea;
        },
        hasTabsArea: function (): boolean {
            return this.tabs.length > 0 || !!this.$slots.tabs;
        },
        hasActionsArea: function (): boolean {
            return !!this.$slots.actions || this.showFiltersToggle;
        },
        filtersVisible: function (): boolean {
            if (!this.$slots.filters) {
                return false;
            }
            if (!this.showFiltersToggle) {
                return true;
            }
            return !this.filtersCollapsed;
        },
    },
    methods: {
        onSelectTab: function (tabId: string) {
            this.$emit("select", tabId);
        },
        toggleFilters: function () {
            this.$emit("update:filtersCollapsed", !this.filtersCollapsed);
        },
    },
});
</script>
