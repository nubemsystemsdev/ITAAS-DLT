import { computed, ref, shallowRef } from "vue";
import type { ComputedRef, Ref, ShallowRef } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import type { CatalogPublicListItem } from "@/api/definitions";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { LIST_PAGE_SIZE } from "@/constants/ui";

interface UseCatalogPageOptions<TItem> {
    backendType: string;
    timeoutPrefix: string;
    mapApiItem: (item: CatalogPublicListItem) => TItem;
    getPrice: (item: TItem) => number;
    pageSize?: number;
}

interface UseCatalogPageResult<TItem> {
    loading: Readonly<Ref<boolean>>;
    hasError: Readonly<Ref<boolean>>;
    searchQuery: Ref<string>;
    debouncedQuery: Readonly<Ref<string>>;
    currentPage: Readonly<Ref<number>>;
    totalPages: Readonly<Ref<number>>;
    totalItems: Readonly<Ref<number>>;
    items: Readonly<ShallowRef<TItem[]>>;
    filteredItems: ComputedRef<TItem[]>;
    minPrice: ComputedRef<number>;
    onSearchChanged: () => void;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    loadItems: () => void;
    cleanup: () => void;
}

const DEFAULT_PAGE_SIZE = LIST_PAGE_SIZE;
const SEARCH_DEBOUNCE_MS = 250;
const RETRY_DELAY_MS = 1500;

export function useCatalogPage<TItem>(options: UseCatalogPageOptions<TItem>): UseCatalogPageResult<TItem> {
    const loading = ref(true);
    const hasError = ref(false);
    const searchQuery = ref("");
    const debouncedQuery = ref("");
    const currentPage = ref(1);
    const totalPages = ref(1);
    const totalItems = ref(0);
    const items = shallowRef<TItem[]>([]);

    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const searchTimeoutId = `${options.timeoutPrefix}-search-${getUniqueStringId()}`;
    const loadRequestId = `${options.timeoutPrefix}-load-${getUniqueStringId()}`;
    const retryTimeoutId = `${options.timeoutPrefix}-retry-${getUniqueStringId()}`;

    const filteredItems = computed<TItem[]>(() => {
        return items.value;
    });

    const minPrice = computed<number>(() => {
        if (filteredItems.value.length === 0) {
            return 0;
        }
        return filteredItems.value.reduce((acc, cur) => Math.min(acc, options.getPrice(cur)), options.getPrice(filteredItems.value[0]));
    });

    const loadItems = () => {
        Timeouts.Abort(retryTimeoutId);
        Request.Abort(loadRequestId);

        loading.value = true;
        hasError.value = false;

        const query = debouncedQuery.value.trim();

        Request.Pending(
            loadRequestId,
            ApiCatalogItems.GetPublicCatalogItems({
                type: options.backendType,
                q: query || undefined,
                page: currentPage.value,
                pageSize,
            }),
        )
            .onSuccess((list) => {
                items.value = (list.items || []).map((item) => options.mapApiItem(item));
                currentPage.value = Math.max(list.page || 1, 1);
                totalPages.value = Math.max(list.totalPages || 1, 1);
                totalItems.value = Math.max(list.total || 0, 0);
                loading.value = false;
            })
            .onCancel(() => {
                // Request was cancelled, no action needed.
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    networkError: () => {
                        items.value = [];
                        totalItems.value = 0;
                        hasError.value = true;
                        loading.value = false;
                    },
                    serverError: () => {
                        Timeouts.Set(retryTimeoutId, RETRY_DELAY_MS, loadItems);
                    },
                });
            })
            .onUnexpectedError((err) => {
                console.error(err);
                items.value = [];
                totalItems.value = 0;
                hasError.value = true;
                loading.value = false;
            });
    };

    const onSearchChanged = () => {
        Timeouts.Set(searchTimeoutId, SEARCH_DEBOUNCE_MS, () => {
            debouncedQuery.value = searchQuery.value;
            currentPage.value = 1;
            loadItems();
        });
    };

    const goToPage = (page: number) => {
        const target = Math.min(Math.max(Math.trunc(page), 1), totalPages.value);
        if (target === currentPage.value || loading.value) {
            return;
        }
        currentPage.value = target;
        loadItems();
    };

    const nextPage = () => {
        goToPage(currentPage.value + 1);
    };

    const prevPage = () => {
        goToPage(currentPage.value - 1);
    };

    const cleanup = () => {
        Timeouts.Abort(searchTimeoutId);
        Timeouts.Abort(retryTimeoutId);
        Request.Abort(loadRequestId);
    };

    return {
        loading,
        hasError,
        searchQuery,
        debouncedQuery,
        currentPage,
        totalPages,
        totalItems,
        items,
        filteredItems,
        minPrice,
        onSearchChanged,
        goToPage,
        nextPage,
        prevPage,
        loadItems,
        cleanup,
    };
}
