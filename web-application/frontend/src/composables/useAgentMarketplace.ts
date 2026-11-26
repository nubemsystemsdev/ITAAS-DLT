import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import {
    type AgentMarketplaceAgent,
    type AgentMarketplaceCategory,
    type AgentMarketplaceSortBy,
    type AgentMarketplaceSortDir,
    type AgentMarketplaceViewTab,
} from "@/composables/agent-marketplace-domain";
import { useAgentMarketplaceFavorites } from "@/composables/useAgentMarketplaceFavorites";
import { usePagination } from "@/composables/usePagination";

// Mockup only; data and variable names are provisional until the database contract is defined.
const PUBLIC_AGENTS: AgentMarketplaceAgent[] = [
    {
        id: "public-front-desk-concierge",
        name: "Front Desk Concierge",
        shortDescription: "Assist guests with common requests, local recommendations and service availability around the clock.",
        category: "front-desk",
        categoryLabel: "Front desk",
        rating: 4.9,
        reviewCount: 38,
        monthlyPrice: 49,
        capabilities: ["Guest support", "Local recommendations", "Request routing"],
        integrations: ["Email", "CRM", "Knowledge base"],
    },
    {
        id: "public-revenue-optimizer",
        name: "Revenue Optimizer",
        shortDescription: "Turn occupancy, demand and booking signals into practical pricing recommendations for your team.",
        category: "revenue",
        categoryLabel: "Revenue",
        rating: 4.8,
        reviewCount: 27,
        monthlyPrice: 89,
        capabilities: ["Demand analysis", "Pricing recommendations", "Performance reports"],
        integrations: ["PMS", "Booking engine", "Analytics"],
    },
    {
        id: "public-guest-feedback",
        name: "Guest Feedback Analyst",
        shortDescription: "Summarize reviews and surface recurring service issues before they affect guest satisfaction.",
        category: "guest-experience",
        categoryLabel: "Guest experience",
        rating: 4.7,
        reviewCount: 19,
        monthlyPrice: 59,
        capabilities: ["Review summaries", "Sentiment analysis", "Issue detection"],
        integrations: ["Email", "Review platforms", "Slack"],
    },
    {
        id: "public-housekeeping-coordinator",
        name: "Housekeeping Coordinator",
        shortDescription: "Coordinate room readiness, maintenance handoffs and daily housekeeping priorities.",
        category: "operations",
        categoryLabel: "Operations",
        rating: 4.6,
        reviewCount: 16,
        monthlyPrice: 69,
        capabilities: ["Task coordination", "Room readiness", "Escalations"],
        integrations: ["PMS", "Maintenance", "Messaging"],
    },
    {
        id: "public-campaign-assistant",
        name: "Campaign Assistant",
        shortDescription: "Create targeted guest communications for promotions, events and post-stay engagement.",
        category: "guest-experience",
        categoryLabel: "Guest experience",
        rating: 4.5,
        reviewCount: 12,
        monthlyPrice: 39,
        capabilities: ["Campaign drafts", "Audience segments", "Message personalization"],
        integrations: ["CRM", "Email", "Marketing platform"],
    },
    {
        id: "public-operations-monitor",
        name: "Operations Monitor",
        shortDescription: "Watch operational signals and notify the right team when a workflow needs attention.",
        category: "operations",
        categoryLabel: "Operations",
        rating: 4.4,
        reviewCount: 9,
        monthlyPrice: 79,
        capabilities: ["Exception monitoring", "Alerts", "Daily summaries"],
        integrations: ["PMS", "Webhooks", "Email"],
    },
    {
        id: "public-booking-assistant",
        name: "Booking Assistant",
        shortDescription: "Help teams answer booking questions and prepare accurate reservation updates across channels.",
        category: "front-desk",
        categoryLabel: "Front desk",
        rating: 4.3,
        reviewCount: 8,
        monthlyPrice: 45,
        capabilities: ["Booking questions", "Reservation updates", "Guest messaging"],
        integrations: ["Booking engine", "Email", "CRM"],
    },
    {
        id: "public-maintenance-triage",
        name: "Maintenance Triage",
        shortDescription: "Classify maintenance reports, prioritize urgent issues and route work to the right team.",
        category: "operations",
        categoryLabel: "Operations",
        rating: 4.2,
        reviewCount: 7,
        monthlyPrice: 55,
        capabilities: ["Issue classification", "Priority scoring", "Work routing"],
        integrations: ["Maintenance", "Messaging", "Webhooks"],
    },
    {
        id: "public-review-response",
        name: "Review Response Assistant",
        shortDescription: "Draft thoughtful and consistent responses to guest reviews while highlighting recurring themes.",
        category: "guest-experience",
        categoryLabel: "Guest experience",
        rating: 4.1,
        reviewCount: 6,
        monthlyPrice: 35,
        capabilities: ["Response drafts", "Review classification", "Tone guidance"],
        integrations: ["Review platforms", "CRM", "Email"],
    },
    {
        id: "public-demand-forecaster",
        name: "Demand Forecaster",
        shortDescription: "Turn historical booking patterns and current demand signals into planning insights for your team.",
        category: "revenue",
        categoryLabel: "Revenue",
        rating: 4.0,
        reviewCount: 5,
        monthlyPrice: 75,
        capabilities: ["Demand forecasts", "Trend analysis", "Planning insights"],
        integrations: ["PMS", "Analytics", "Booking engine"],
    },
];

export type AgentMarketplaceFavoritesSource = {
    favoriteIds: Ref<Set<string>>;
    favoriteCount?: ComputedRef<number>;
    isFavorite?: (agentId: string) => boolean;
    toggleFavorite?: (agentId: string) => void;
};

export function useAgentMarketplace(agentsSource?: Ref<AgentMarketplaceAgent[]>, favoritesSource?: AgentMarketplaceFavoritesSource) {
    const localFavorites = favoritesSource ? null : useAgentMarketplaceFavorites();
    const favoriteIds = favoritesSource ? favoritesSource.favoriteIds : localFavorites!.favoriteIds;

    const favoriteCount: ComputedRef<number> = favoritesSource?.favoriteCount
        ? favoritesSource.favoriteCount
        : computed((): number => {
              return favoriteIds.value.size;
          });

    const isFavorite =
        favoritesSource?.isFavorite ||
        function (agentId: string): boolean {
            return favoriteIds.value.has(agentId);
        };

    const searchQuery = ref("");
    const selectedCategory = ref<AgentMarketplaceCategory>("all");
    const viewTab = ref<AgentMarketplaceViewTab>("all");
    const sortBy = ref<AgentMarketplaceSortBy>("");
    const sortDir = ref<AgentMarketplaceSortDir>("");
    const filtersCollapsed = ref(true);
    const pagination = usePagination();

    const allAgents = computed((): AgentMarketplaceAgent[] => {
        return agentsSource ? agentsSource.value : PUBLIC_AGENTS;
    });

    const favoritesOnly = computed((): boolean => {
        return viewTab.value === "favorites";
    });

    const filteredAgents = computed((): AgentMarketplaceAgent[] => {
        const normalizedQuery = searchQuery.value.trim().toLowerCase();
        let items = allAgents.value.filter((agent) => {
            if (selectedCategory.value !== "all" && agent.category !== selectedCategory.value) {
                return false;
            }

            if (favoritesOnly.value && !favoriteIds.value.has(agent.id)) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const haystack = [agent.name, agent.shortDescription, agent.categoryLabel, ...agent.capabilities, ...agent.integrations]
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });

        if (sortBy.value) {
            const direction = sortDir.value === "desc" ? -1 : 1;
            items = [...items].sort((left, right) => {
                if (sortBy.value === "name") {
                    return left.name.localeCompare(right.name) * direction;
                }
                if (sortBy.value === "rating") {
                    return (left.rating - right.rating) * direction;
                }
                if (sortBy.value === "price") {
                    return (left.monthlyPrice - right.monthlyPrice) * direction;
                }
                return 0;
            });
        }

        return items;
    });

    watch(
        filteredAgents,
        (agents) => {
            pagination.applyListMeta({
                page: 1,
                totalPages: Math.max(1, Math.ceil(agents.length / pagination.pageSize)),
            });
        },
        { immediate: true },
    );

    const paginatedAgents = computed((): AgentMarketplaceAgent[] => {
        const start = (pagination.page.value - 1) * pagination.pageSize;
        return filteredAgents.value.slice(start, start + pagination.pageSize);
    });

    const onSearchChanged = (value: string): void => {
        searchQuery.value = value;
        pagination.setPage(1);
    };

    const onSearchSubmit = (): void => {
        pagination.setPage(1);
    };

    const onApplyFilters = (payload: {
        selectedCategory: AgentMarketplaceCategory;
        sortBy: AgentMarketplaceSortBy;
        sortDir: AgentMarketplaceSortDir;
    }): void => {
        selectedCategory.value = payload.selectedCategory;
        sortBy.value = payload.sortBy;
        sortDir.value = payload.sortDir;
        pagination.setPage(1);
    };

    const resetFilters = (): void => {
        selectedCategory.value = "all";
        viewTab.value = "all";
        sortBy.value = "";
        sortDir.value = "";
        searchQuery.value = "";
        pagination.reset();
    };

    const onViewTabChanged = (tabId: string): void => {
        viewTab.value = tabId === "favorites" ? "favorites" : "all";
        pagination.setPage(1);
    };

    const prevPage = (): void => {
        pagination.goPrev();
    };

    const nextPage = (): void => {
        pagination.goNext();
    };

    return {
        searchQuery,
        selectedCategory,
        viewTab,
        sortBy,
        sortDir,
        filtersCollapsed,
        page: pagination.page,
        allAgents,
        filteredAgents,
        paginatedAgents,
        totalPages: pagination.totalPages,
        paginationVisible: pagination.visible,
        paginationCanGoPrev: pagination.canGoPrev,
        paginationCanGoNext: pagination.canGoNext,
        onSearchChanged,
        onSearchSubmit,
        onApplyFilters,
        resetFilters,
        onViewTabChanged,
        prevPage,
        nextPage,
        favoritesOnly,
        favoriteIds,
        favoriteCount,
        isFavorite,
        ...(favoritesSource
            ? favoritesSource.toggleFavorite
                ? { toggleFavorite: favoritesSource.toggleFavorite }
                : {}
            : { toggleFavorite: localFavorites!.toggleFavorite }),
    };
}
