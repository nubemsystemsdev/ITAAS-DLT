import { computed, ref } from "vue";
import { AGENT_MARKETPLACE_FAVORITES_STORAGE_KEY } from "@/composables/agent-marketplace-domain";

function readFavoriteIds(): Set<string> {
    if (typeof window === "undefined") {
        return new Set();
    }

    try {
        const raw = window.localStorage.getItem(AGENT_MARKETPLACE_FAVORITES_STORAGE_KEY);
        if (!raw) {
            return new Set();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return new Set();
        }
        return new Set(parsed.filter((id) => typeof id === "string"));
    } catch {
        return new Set();
    }
}

function writeFavoriteIds(ids: Set<string>): void {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(AGENT_MARKETPLACE_FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
}

export function useAgentMarketplaceFavorites() {
    const favoriteIds = ref<Set<string>>(readFavoriteIds());

    const favoriteCount = computed((): number => {
        return favoriteIds.value.size;
    });

    const isFavorite = (agentId: string): boolean => {
        return favoriteIds.value.has(agentId);
    };

    const toggleFavorite = (agentId: string): void => {
        const next = new Set(favoriteIds.value);
        if (next.has(agentId)) {
            next.delete(agentId);
        } else {
            next.add(agentId);
        }
        favoriteIds.value = next;
        writeFavoriteIds(next);
    };

    return {
        favoriteIds,
        favoriteCount,
        isFavorite,
        toggleFavorite,
    };
}
