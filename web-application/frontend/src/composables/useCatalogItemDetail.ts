import { onBeforeUnmount, ref } from "vue";
import type { Ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import type { CatalogPublicItemDetail } from "@/api/definitions";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";

const RETRY_DELAY_MS = 1500;

/** Public catalog item as returned by detail endpoint (may include extra fields). */
export type CatalogPublicDetailItem = CatalogPublicItemDetail & {
    features?: string[];
};

export interface UseCatalogItemDetailResult {
    loading: Readonly<Ref<boolean>>;
    item: Readonly<Ref<CatalogPublicDetailItem | null>>;
    load: (id: string) => void;
    cleanup: () => void;
}

/**
 * Loads a single catalog item by id with the same retry semantics as the legacy detail pages.
 */
export function useCatalogItemDetail(timeoutPrefix: string): UseCatalogItemDetailResult {
    const loading = ref(true);
    const item = ref<CatalogPublicDetailItem | null>(null);
    const loadTimeoutId = `${timeoutPrefix}-${getUniqueStringId()}`;

    const load = (id: string) => {
        Timeouts.Abort(loadTimeoutId);
        Request.Abort(loadTimeoutId);

        loading.value = true;
        item.value = null;

        Request.Pending(loadTimeoutId, ApiCatalogItems.GetPublicCatalogItem(id))
            .onSuccess((data) => {
                loading.value = false;
                item.value = data as CatalogPublicDetailItem;
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    notFound: () => {
                        loading.value = false;
                        item.value = null;
                    },
                    serverError: () => {
                        Timeouts.Set(loadTimeoutId, RETRY_DELAY_MS, () => load(id));
                    },
                    networkError: () => {
                        Timeouts.Set(loadTimeoutId, RETRY_DELAY_MS, () => load(id));
                    },
                });
            })
            .onUnexpectedError((err) => {
                console.error(err);
                Timeouts.Set(loadTimeoutId, RETRY_DELAY_MS, () => load(id));
            });
    };

    const cleanup = () => {
        Timeouts.Abort(loadTimeoutId);
        Request.Abort(loadTimeoutId);
    };

    onBeforeUnmount(cleanup);

    return {
        loading,
        item,
        load,
        cleanup,
    };
}
