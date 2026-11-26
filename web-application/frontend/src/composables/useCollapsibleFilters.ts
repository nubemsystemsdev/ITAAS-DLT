import { ref } from "vue";
import type { Ref } from "vue";

export interface UseCollapsibleFiltersResult {
    filtersCollapsed: Ref<boolean>;
    toggleFilters: () => void;
    setFiltersCollapsed: (collapsed: boolean) => void;
}

export function useCollapsibleFilters(initialCollapsed = true): UseCollapsibleFiltersResult {
    const filtersCollapsed = ref(initialCollapsed);

    const toggleFilters = () => {
        filtersCollapsed.value = !filtersCollapsed.value;
    };

    const setFiltersCollapsed = (collapsed: boolean) => {
        filtersCollapsed.value = collapsed;
    };

    return {
        filtersCollapsed,
        toggleFilters,
        setFiltersCollapsed,
    };
}
