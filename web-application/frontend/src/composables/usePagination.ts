import { computed, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import { LIST_PAGE_SIZE } from "@/constants/ui";

export interface PaginatedListMeta {
    page?: number;
    totalPages?: number;
}

export interface UsePaginationOptions {
    pageSize?: number;
    loading?: Ref<boolean>;
}

export interface UsePaginationResult {
    pageSize: number;
    page: Ref<number>;
    totalPages: Ref<number>;
    visible: ComputedRef<boolean>;
    canGoPrev: ComputedRef<boolean>;
    canGoNext: ComputedRef<boolean>;
    applyListMeta: (meta: PaginatedListMeta) => void;
    setPage: (nextPage: number) => void;
    goPrev: () => boolean;
    goNext: () => boolean;
    reset: () => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
    const pageSize = options.pageSize ?? LIST_PAGE_SIZE;
    const page = ref(1);
    const totalPages = ref(1);

    const visible = computed(() => totalPages.value > 1);

    const canGoPrev = computed(() => {
        const loading = options.loading?.value ?? false;
        return page.value > 1 && !loading;
    });

    const canGoNext = computed(() => {
        const loading = options.loading?.value ?? false;
        return page.value < totalPages.value && !loading;
    });

    const applyListMeta = (meta: PaginatedListMeta) => {
        page.value = Math.max(1, meta.page || page.value);
        totalPages.value = Math.max(1, meta.totalPages || 1);
    };

    const setPage = (nextPage: number) => {
        const bounded = Math.min(Math.max(Math.trunc(nextPage), 1), Math.max(totalPages.value, 1));
        page.value = bounded;
    };

    const goPrev = (): boolean => {
        if (!canGoPrev.value) {
            return false;
        }
        page.value--;
        return true;
    };

    const goNext = (): boolean => {
        if (!canGoNext.value) {
            return false;
        }
        page.value++;
        return true;
    };

    const reset = () => {
        page.value = 1;
        totalPages.value = 1;
    };

    return {
        pageSize,
        page,
        totalPages,
        visible,
        canGoPrev,
        canGoNext,
        applyListMeta,
        setPage,
        goPrev,
        goNext,
        reset,
    };
}
