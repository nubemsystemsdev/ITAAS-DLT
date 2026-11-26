import { computed, onBeforeUnmount, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import type { CatalogPublicEntryList } from "@/api/definitions";
import { LIST_PAGE_SIZE } from "@/constants/ui";
import {
    CATALOG_FILTER_OPTIONS,
    type CatalogEntry,
    type CatalogKindFilter,
    isValidCatalogFilter,
    mapCatalogPublicEntries,
} from "@/composables/catalog-domain";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import { usePagination } from "@/composables/usePagination";
import { getUniqueStringId } from "@/utils/unique-id";

const SEARCH_DEBOUNCE_MS = 250;

interface UseCatalogEntriesOptions {
    route: RouteLocationNormalizedLoaded;
    router: Router;
}

function isRequestCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === "REQUEST_CANCELLED";
}

export function useCatalogEntries(options: UseCatalogEntriesOptions) {
    const loading = ref(true);
    const hasError = ref(false);
    const catalogNotice = ref("");
    const searchQuery = ref("");
    const selectedType = ref<CatalogKindFilter>(
        typeof options.route.query.filter === "string" && isValidCatalogFilter(options.route.query.filter)
            ? options.route.query.filter
            : "all",
    );
    const catalogEntries = ref<CatalogEntry[]>([]);
    const totalCatalogEntries = ref(0);
    const pagination = usePagination({
        loading,
        pageSize: LIST_PAGE_SIZE,
    });

    const loadRequestId = `nubem-catalog-entries-${getUniqueStringId()}`;
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;
    let latestLoadSequence = 0;

    const { filtersCollapsed, setFiltersCollapsed } = useCollapsibleFilters(true);

    const subscriptionMode = ref<string>("monthly");
    const minPrice = ref<number | null>(null);
    const maxPrice = ref<number | null>(null);
    const sortBy = ref<string>("");
    const sortDir = ref<string>("");

    const catalogToolbarTabs = computed(() => {
        return CATALOG_FILTER_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
        }));
    });

    const emptyStateTitle = computed(() => {
        if (searchQuery.value.trim()) {
            return "No entries found for your search.";
        }
        if (selectedType.value === "service") {
            return "No services available right now.";
        }
        if (selectedType.value === "product") {
            return "No products available right now.";
        }
        if (selectedType.value === "plan") {
            return "No plans available right now.";
        }
        return "No entries available right now.";
    });

    const emptyStateMessage = computed(() => {
        if (searchQuery.value.trim()) {
            return "Try changing the search text or filter.";
        }
        if (selectedType.value !== "all") {
            return "Try another category or check back later.";
        }
        return "Please try again in a few seconds.";
    });

    const runRequest = <T>(requestId: string, requestParams: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            Request.Abort(requestId);
            Request.Pending(requestId, requestParams)
                .onSuccess((response) => {
                    resolve(response as T);
                })
                .onCancel(() => {
                    reject(new Error("REQUEST_CANCELLED"));
                })
                .onRequestError((err) => {
                    reject(err instanceof Error ? err : new Error("REQUEST_ERROR"));
                })
                .onUnexpectedError((err) => {
                    reject(err instanceof Error ? err : new Error("UNEXPECTED_ERROR"));
                });
        });
    };

    const loadCatalog = async (): Promise<void> => {
        const loadSequence = ++latestLoadSequence;
        loading.value = true;
        hasError.value = false;
        catalogNotice.value = "";

        try {
            const response = await runRequest<CatalogPublicEntryList>(
                loadRequestId,
                ApiCatalogItems.GetPublicCatalogEntries({
                    q: searchQuery.value.trim() || undefined,
                    type: selectedType.value !== "all" ? selectedType.value : undefined,
                    subscriptionMode: subscriptionMode.value,
                    minPrice: minPrice.value !== null ? minPrice.value : undefined,
                    maxPrice: maxPrice.value !== null ? maxPrice.value : undefined,
                    sortBy: sortBy.value || undefined,
                    sortDir: sortDir.value || undefined,
                    page: pagination.page.value,
                    pageSize: pagination.pageSize,
                }),
            );

            if (loadSequence !== latestLoadSequence) {
                return;
            }

            catalogEntries.value = mapCatalogPublicEntries(response.items || []);
            totalCatalogEntries.value = Math.max(response.total || 0, 0);
            pagination.applyListMeta({
                page: response.page,
                totalPages: response.totalPages,
            });
        } catch (error) {
            if (loadSequence !== latestLoadSequence || isRequestCancelled(error)) {
                return;
            }

            console.error(error);
            catalogEntries.value = [];
            totalCatalogEntries.value = 0;
            hasError.value = true;
            pagination.applyListMeta({
                page: 1,
                totalPages: 1,
            });
        } finally {
            if (loadSequence === latestLoadSequence) {
                loading.value = false;
            }
        }
    };

    const scheduleSearchLoad = () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            searchTimeout = null;
            void loadCatalog();
        }, SEARCH_DEBOUNCE_MS);
    };

    const onSearchChanged = (value?: string): void => {
        if (typeof value === "string") {
            searchQuery.value = value;
        }
    };

    const submitSearch = (): void => {
        pagination.setPage(1);
        void loadCatalog();
    };

    const clearSearch = (): void => {
        if (!searchQuery.value) {
            return;
        }

        searchQuery.value = "";
        pagination.setPage(1);
        scheduleSearchLoad();
    };

    const onFilterChanged = (filter: CatalogKindFilter): void => {
        selectedType.value = filter;
        pagination.setPage(1);

        const query: Record<string, string> = {};
        if (filter !== "all") {
            query.filter = filter;
        }

        void options.router.replace({ query }).catch(() => {
            // Ignore duplicated navigation.
        });

        void loadCatalog();
    };

    const onFiltersCollapsedUpdate = (collapsed: boolean): void => {
        setFiltersCollapsed(collapsed);
    };

    const onFilterFieldChange = (): void => {
        pagination.setPage(1);
        void loadCatalog();
    };

    const resetFilters = (): void => {
        selectedType.value = "all";
        subscriptionMode.value = "monthly";
        minPrice.value = null;
        maxPrice.value = null;
        sortBy.value = "";
        sortDir.value = "";
        pagination.setPage(1);

        void options.router.replace({ query: {} }).catch(() => {
            // Ignore duplicated navigation.
        });

        void loadCatalog();
    };

    const nextPage = (): void => {
        if (!pagination.goNext()) {
            return;
        }
        void loadCatalog();
    };

    const prevPage = (): void => {
        if (!pagination.goPrev()) {
            return;
        }
        void loadCatalog();
    };

    onBeforeUnmount(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        Request.Abort(loadRequestId);
    });

    return {
        loading,
        hasError,
        catalogNotice,
        searchQuery,
        selectedType,
        catalogEntries,
        totalCatalogEntries,
        page: pagination.page,
        totalPages: pagination.totalPages,
        paginationCanGoPrev: pagination.canGoPrev,
        paginationCanGoNext: pagination.canGoNext,
        catalogToolbarTabs,
        emptyStateTitle,
        emptyStateMessage,
        loadCatalog,
        onSearchChanged,
        submitSearch,
        clearSearch,
        onFilterChanged,
        filtersCollapsed,
        subscriptionMode,
        minPrice,
        maxPrice,
        sortBy,
        sortDir,
        onFiltersCollapsedUpdate,
        onFilterFieldChange,
        resetFilters,
        nextPage,
        prevPage,
    };
}
