<template>
    <div class="page-content itaas-platform-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Automation area')"
            :title="$t('ITAAS Platform')"
            :subtitle="$t('Discover public agents, manage your flows, credentials and execution history in one place.')"
        />

        <section class="itaas-platform-shell">
            <TableCardToolbar
                :tabs="tabs"
                :active-tab="activeTab"
                :tablist-label="$t('ITAAS Platform tabs')"
                tab-panel-id="itaas-platform-panel"
                @select="selectTab"
            />

            <section
                id="itaas-platform-panel"
                class="dashboard-data-card itaas-platform-panel"
                role="tabpanel"
                :aria-labelledby="'itaas-platform-panel-tab-' + activeTab"
            >
                <ItaasPlatformPublicFlowsSection v-if="activeTab === 'public-agents'" />
                <ItaasPlatformCustomRequestSection v-else-if="activeTab === 'custom-request'" />
                <ItaasPlatformFlowsSection v-else-if="activeTab === 'flows'" />
                <ItaasPlatformCredentialsSection v-else-if="activeTab === 'credentials'" />
                <ItaasPlatformExecutionsSection v-else />
            </section>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import type { TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import ItaasPlatformCredentialsSection from "@/components/routes/dashboard/ItaasPlatformCredentialsSection.vue";
import ItaasPlatformCustomRequestSection from "@/components/routes/dashboard/ItaasPlatformCustomRequestSection.vue";
import ItaasPlatformExecutionsSection from "@/components/routes/dashboard/ItaasPlatformExecutionsSection.vue";
import ItaasPlatformFlowsSection from "@/components/routes/dashboard/ItaasPlatformFlowsSection.vue";
import ItaasPlatformPublicFlowsSection from "@/components/routes/dashboard/ItaasPlatformPublicFlowsSection.vue";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";

const VALID_TABS = ["public-agents", "custom-request", "flows", "credentials", "executions"] as const;
type ItaasPlatformTabId = (typeof VALID_TABS)[number];
const DEFAULT_TAB: ItaasPlatformTabId = "public-agents";

export default defineComponent({
    name: "ItaasPlatformPage",
    components: {
        DashboardPageHeader,
        ItaasPlatformCredentialsSection,
        ItaasPlatformCustomRequestSection,
        ItaasPlatformExecutionsSection,
        ItaasPlatformFlowsSection,
        ItaasPlatformPublicFlowsSection,
        TableCardToolbar,
    },
    data: function () {
        return {
            activeTab: DEFAULT_TAB as ItaasPlatformTabId,
        };
    },
    computed: {
        tabs: function (): TableCardToolbarTabItem[] {
            return [
                { id: "public-agents", label: "Public agents" },
                { id: "custom-request", label: "Request flow" },
                { id: "flows", label: "My flows" },
                { id: "credentials", label: "Credentials" },
                { id: "executions", label: "Executions" },
            ];
        },
    },
    methods: {
        syncTabFromRoute: function (): void {
            this.activeTab = normalizeRouteTabQuery(this.$route.query.tab, VALID_TABS, DEFAULT_TAB);
        },
        selectTab: function (tabId: string): void {
            const nextTab = normalizeRouteTabQuery(tabId, VALID_TABS, DEFAULT_TAB);
            if (this.activeTab === nextTab) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, nextTab, DEFAULT_TAB);
        },
    },
    created: function () {
        this.syncTabFromRoute();
    },
    mounted: function () {
        this.$setSubTitle(this.$t("ITAAS Platform"));
        this.$autoFocus();
        this.syncTabFromRoute();
    },
    watch: {
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
    },
});
</script>

<style>
@import "@/style/layout/agent-marketplace.css";
@import "@/style/layout/catalog-shared-page.css";
@import "@/style/layout/itaas-platform.css";
@import "@/style/layout/traceability-page.css";
</style>
