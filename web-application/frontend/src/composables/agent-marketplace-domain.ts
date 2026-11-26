export type AgentMarketplaceViewTab = "all" | "favorites";

export type AgentMarketplaceCategory = "all" | "front-desk" | "revenue" | "guest-experience" | "operations";

export type AgentMarketplaceSortBy = "" | "name" | "rating" | "price";

export type AgentMarketplaceSortDir = "" | "asc" | "desc";

export interface AgentMarketplaceAgent {
    id: string;
    name: string;
    shortDescription: string;
    category: Exclude<AgentMarketplaceCategory, "all">;
    categoryLabel: string;
    rating: number;
    reviewCount: number;
    monthlyPrice: number;
    capabilities: string[];
    integrations: string[];
    deployed?: boolean;
}

export const AGENT_MARKETPLACE_FAVORITES_STORAGE_KEY = "itaas-agent-marketplace-favorites";

export const AGENT_MARKETPLACE_DEFAULT_PAGE_SIZE = 8;
