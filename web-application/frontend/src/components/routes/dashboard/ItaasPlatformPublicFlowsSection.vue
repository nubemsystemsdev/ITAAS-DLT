<template>
    <div class="itaas-platform-public-flows">
        <p v-if="loading" class="table-feedback">{{ $t("Loading") }}...</p>
        <p v-else-if="accessDenied" class="table-feedback">
            {{ $t("Active ITAAS subscription or assigned organization license is required") }}
        </p>
        <AgentMarketplaceListSection
            v-else
            :search-query="searchQuery"
            :selected-category="selectedCategory"
            :favorites-only="favoritesOnly"
            :active-view-tab="viewTab"
            :favorite-count="favoriteCount"
            :sort-by="sortBy"
            :sort-dir="sortDir"
            v-model:filters-collapsed="filtersCollapsed"
            :entries="marketplaceCards"
            :current-page="page"
            :total-pages="totalPages"
            :pagination-visible="paginationVisible"
            :can-go-prev="paginationCanGoPrev"
            :can-go-next="paginationCanGoNext"
            :show-advanced-filters="false"
            @search-change="onSearchChanged"
            @search-submit="onSearchSubmit"
            @apply-filters="onApplyFilters"
            @reset-filters="resetFilters"
            @view-tab-change="onViewTabChanged"
            @toggle-favorite="toggleFavorite"
            @view-entry="openFlowDetail"
            @prev-page="prevPage"
            @next-page="nextPage"
        />
    </div>
</template>

<script lang="ts">
import { ref } from "vue";
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasFlowSummary, ItaasFlowsListResponse } from "@/api/definitions";
import AgentMarketplaceListSection, { type AgentMarketplaceCardItem } from "@/components/routes/dashboard/AgentMarketplaceListSection.vue";
import { AuthController } from "@/control/auth";
import { type AgentMarketplaceAgent } from "@/composables/agent-marketplace-domain";
import { useAgentMarketplace } from "@/composables/useAgentMarketplace";
import { useItaasFlowFavorites } from "@/composables/useItaasFlowFavorites";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

const CARD_NAME_MAX_LENGTH = 45;
const CARD_DESCRIPTION_MAX_LENGTH = 130;

function truncateCardText(text: string, maxLength: number): string {
    const normalizedText = (text || "").trim();
    if (!normalizedText || normalizedText.length <= maxLength) {
        return normalizedText;
    }
    return `${normalizedText.substring(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
}

function mapGlobalFlowsToAgents(flows: ItaasFlowSummary[]): AgentMarketplaceAgent[] {
    return (flows || [])
        .map(function (flow): AgentMarketplaceAgent {
            const id = (flow.id || "").trim();
            const name = (flow.name || "").trim() || id;
            const capabilities = [flow.type, flow.category].filter(function (value): value is string {
                return !!(value || "").trim();
            });

            return {
                id: id,
                name: name,
                shortDescription: capabilities.join(" · ") || id,
                category: "operations",
                categoryLabel: (flow.category || flow.type || "").trim(),
                rating: 0,
                reviewCount: 0,
                monthlyPrice: 0,
                capabilities: capabilities,
                integrations: [],
                deployed: !!flow.deployed,
            };
        })
        .filter(function (agent) {
            return !!agent.id;
        })
        .sort(function (left, right) {
            return left.name.localeCompare(right.name);
        });
}

export default defineComponent({
    name: "ItaasPlatformPublicFlowsSection",
    components: {
        AgentMarketplaceListSection,
    },
    setup: function () {
        const agents = ref<AgentMarketplaceAgent[]>([]);
        const flowFavorites = useItaasFlowFavorites();
        const marketplace = useAgentMarketplace(agents, {
            favoriteIds: flowFavorites.favoriteIds,
            favoriteCount: flowFavorites.favoriteCount,
            isFavorite: flowFavorites.isFavorite,
        });

        return {
            agents,
            flowFavorites,
            ...marketplace,
        };
    },
    data: function () {
        return {
            loading: false,
            accessDenied: false,
            loadRequestId: getUniqueStringId(),
        };
    },
    computed: {
        marketplaceCards: function (): AgentMarketplaceCardItem[] {
            return this.paginatedAgents.map((agent) => ({
                id: agent.id,
                name: truncateCardText(agent.name, CARD_NAME_MAX_LENGTH),
                description: truncateCardText(agent.shortDescription, CARD_DESCRIPTION_MAX_LENGTH),
                isFavorite: this.isFavorite(agent.id),
                capabilities: agent.capabilities,
                monthlyPrice: null,
                statusLabel: agent.deployed ? this.$t("Deployed") : this.$t("Not deployed"),
                viewDisabled: !agent.deployed,
            }));
        },
    },
    methods: {
        getFavoriteErrorHandlers: function () {
            return {
                unauthorized: () => {
                    this.$requireLogin();
                },
                forbiddenItaasAccessRequired: () => {
                    this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                },
                temporalError: () => {
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                },
            };
        },
        loadFavorites: function (): void {
            this.flowFavorites.loadFavorites(this.getFavoriteErrorHandlers());
        },
        toggleFavorite: function (flowId: string): void {
            this.flowFavorites.toggleFavorite(flowId, this.getFavoriteErrorHandlers());
        },
        reloadFlows: function (): void {
            if (this.loading) {
                return;
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.accessDenied = false;

            Request.Pending(this.loadRequestId, ApiItaasFlows.ListItaasGlobalFlows())
                .onSuccess((payload) => {
                    const response = payload as ItaasFlowsListResponse;
                    this.agents = mapGlobalFlowsToAgents(response.flows || []);
                    this.loading = false;
                    this.loadFavorites();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.agents = [];
                            this.loading = false;
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.accessDenied = true;
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        forbiddenBffForbidden: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        }),
                        temporalError: () => {
                            this.agents = [];
                            this.loading = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.agents = [];
                    this.loading = false;
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                });
        },
        openFlowDetail: function (flowId: string): void {
            const normalizedFlowId = (flowId || "").trim();
            if (!normalizedFlowId) {
                return;
            }

            const agent = this.agents.find((item) => item.id === normalizedFlowId);
            if (!agent || !agent.deployed) {
                return;
            }

            void this.$router
                .push({
                    name: "itaas-platform-flow-detail",
                    params: { flowId: normalizedFlowId },
                    query: { from: "public-agents" },
                })
                .catch(() => {
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                });
        },
    },
    mounted: function () {
        this.reloadFlows();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        this.flowFavorites.abortAll();
    },
});
</script>
