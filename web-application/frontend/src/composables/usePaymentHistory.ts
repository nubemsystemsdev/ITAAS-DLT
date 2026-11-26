import { ApiPayments, ListPaymentsQueryParameters } from "@/api/api-group-payments";
import type { MyPaymentHistoryItem, PaymentListItem } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { useCollapsibleFilters } from "@/composables/useCollapsibleFilters";
import { usePagination } from "@/composables/usePagination";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
    resolvePaymentStatus,
    paymentMethodLabelKey,
    BACKEND_PAYMENT_TYPES,
    PAYMENT_HISTORY_FILTER_STATUSES,
    isSuccessfulPaymentStatus,
    resolvePaymentHistoryApiStatus,
} from "@/utils/payment-history-domain";

export type ProductTypeFilter = "all" | "item" | "plan";

export interface PaymentHistoryFiltersState {
    dateFrom: string;
    dateTo: string;
    paymentType: string;
    productType: ProductTypeFilter;
    status: string;
}

export interface PaymentHistoryFilterChangePayload {
    field: keyof PaymentHistoryFiltersState;
    value: string;
}

interface PaymentHistoryViewModel {
    $t: (key: string) => string;
    $setSubTitle: (subtitle: string) => void;
    $autoFocus: () => void;
    $requireLogin: () => void;
    $showMessageModal: (title: string, message: string) => void;
}

const PAYMENT_HISTORY_PAGE_SIZE = 8;

function createDefaultFilters(): PaymentHistoryFiltersState {
    return {
        dateFrom: "",
        dateTo: "",
        paymentType: "all",
        productType: "all",
        status: "all",
    };
}

function mapPaymentToHistoryItem(payment: PaymentListItem | any): MyPaymentHistoryItem {
    if ((payment as any).concept) {
        return {
            id: (payment.id || "") + "",
            concept: ((payment as any).concept || "") + "",
            amountCents: Number.isFinite(payment.amountCents) ? payment.amountCents : 0,
            currency: ((payment.currency || "") + "").trim().toUpperCase(),
            method: paymentMethodLabelKey(((payment as any).method || "") + ""),
            status: (resolvePaymentStatus(((payment.status || "") + "").trim()) as string) || "pending_payment",
            paymentType: ((payment as any).paymentType || "") + "",
            productType: ((payment as any).productType || "") + "",
            catalogItemType: ((payment as any).catalogItemType || "") + "",
            billingCycle: ((payment as any).billingCycle || "") + "",
            createdAt: Number.isFinite(payment.createdAt) ? payment.createdAt : 0,
        };
    }

    const paymentType = ((payment.type || "") + "").trim().toLowerCase();
    const productType = ((payment.subscribableType || "") + "").trim().toLowerCase();
    return {
        id: (payment.id || "") + "",
        concept: paymentType || "payment",
        amountCents: Number.isFinite(payment.amountCents) ? payment.amountCents : 0,
        currency: ((payment.currency || "") + "").trim().toUpperCase(),
        method: paymentMethodLabelKey(((payment.provider || "") + "").trim()),
        status: (resolvePaymentStatus(((payment.status || "") + "").trim()) as string) || "pending_payment",
        paymentType: paymentType || "payment",
        productType: productType || "product",
        catalogItemType: ((payment.catalogItemType || "") + "").trim(),
        billingCycle: ((payment.billingCycle || "") + "").trim().toLowerCase(),
        createdAt: Number.isFinite(payment.createdAt) ? payment.createdAt : 0,
    };
}

function normalizeDateStart(dateValue: string): number | null {
    if (!dateValue) {
        return null;
    }

    const value = Date.parse(`${dateValue}T00:00:00.000`);
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.floor(value);
}

function normalizeDateEnd(dateValue: string): number | null {
    if (!dateValue) {
        return null;
    }

    const value = Date.parse(`${dateValue}T23:59:59.999`);
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.floor(value);
}

function mergeDistinctSorted(existingValues: string[], nextValues: string[]): string[] {
    return Array.from(new Set([...existingValues, ...nextValues]))
        .filter((value) => !!value)
        .sort((a, b) => a.localeCompare(b));
}

export function usePaymentHistory() {
    const instance = getCurrentInstance();
    if (!instance || !instance.proxy) {
        throw new Error("usePaymentHistory must be called from component setup.");
    }

    const vm = instance.proxy as unknown as PaymentHistoryViewModel;
    const t = (key: string): string => String(vm.$t(key));

    const loading = ref(false);
    const payments = ref<MyPaymentHistoryItem[]>([]);

    const generatedDownloadLoadingByPaymentId = ref<Record<string, boolean>>({});

    const availablePaymentTypes = ref<string[]>([...BACKEND_PAYMENT_TYPES]);
    const availableStatuses = ref<string[]>([...PAYMENT_HISTORY_FILTER_STATUSES]);

    const filters = reactive<PaymentHistoryFiltersState>(createDefaultFilters());
    const { filtersCollapsed, setFiltersCollapsed } = useCollapsibleFilters(true);

    const pagination = usePagination({
        loading,
        pageSize: PAYMENT_HISTORY_PAGE_SIZE,
    });

    const historyRequestId = getUniqueStringId();
    let historyRequestSequence = 0;

    const abortHistoryRequests = () => {
        Request.Abort(historyRequestId);
    };

    const isCurrentHistoryRequest = (requestSequence: number): boolean => {
        return requestSequence === historyRequestSequence;
    };

    const updateAvailableFilterOptions = () => {
        const currentPaymentTypes = payments.value.map((payment) => payment.paymentType || "");
        const currentStatuses = payments.value.map((payment) => {
            const status = (payment.status || "").trim().toLowerCase();
            return isSuccessfulPaymentStatus(status) ? "paid" : status;
        });

        availablePaymentTypes.value = mergeDistinctSorted(availablePaymentTypes.value, currentPaymentTypes);
        availableStatuses.value = mergeDistinctSorted(availableStatuses.value, currentStatuses);
    };

    const setHistoryErrorState = () => {
        loading.value = false;
        payments.value = [];
        pagination.reset();
    };

    const buildQuery = (page: number, pageSize: number, apiStatus?: string): ListPaymentsQueryParameters => {
        const query: ListPaymentsQueryParameters = {
            page: String(page),
            pageSize: String(pageSize),
        };

        const dateFrom = normalizeDateStart(filters.dateFrom);
        if (dateFrom !== null) {
            query.dateFrom = String(dateFrom);
        }

        const dateTo = normalizeDateEnd(filters.dateTo);
        if (dateTo !== null) {
            query.dateTo = String(dateTo);
        }

        if (filters.paymentType !== "all") {
            query.paymentType = filters.paymentType;
        }

        if (filters.productType !== "all") {
            query.productType = filters.productType;
        }

        const status = apiStatus ?? resolvePaymentHistoryApiStatus(filters.status);
        if (status) {
            query.status = status;
        }

        return query;
    };

    const handleHistoryRequestError = (err: unknown, handleErr: (err: unknown, handlers: Record<string, () => void>) => void) => {
        setHistoryErrorState();

        handleErr(err, {
            unauthorized: () => vm.$requireLogin(),
            temporalError: () => vm.$showMessageModal(t("Temporal error"), t("Unable to load payments.")),
            networkError: () => vm.$showMessageModal(t("Network error"), t("Unable to load payments.")),
            serverError: () => vm.$showMessageModal(t("Server error"), t("Unable to load payments.")),
        });
    };

    const loadHistory = () => {
        const requestSequence = ++historyRequestSequence;

        loading.value = true;

        abortHistoryRequests();

        const page = Math.max(1, pagination.page.value);

        Request.Pending(historyRequestId, ApiPayments.ListPayments(buildQuery(page, pagination.pageSize)))
            .onSuccess((response) => {
                if (!isCurrentHistoryRequest(requestSequence)) {
                    return;
                }

                loading.value = false;
                const rawPayments = response.payments || [];

                payments.value = rawPayments.map((payment) => mapPaymentToHistoryItem(payment));
                pagination.applyListMeta({ page: response.page, totalPages: response.totalPages });

                updateAvailableFilterOptions();
            })
            .onRequestError((err, handleErr) => {
                if (!isCurrentHistoryRequest(requestSequence)) {
                    return;
                }

                handleHistoryRequestError(err, handleErr);
            })
            .onUnexpectedError(() => {
                if (!isCurrentHistoryRequest(requestSequence)) {
                    return;
                }

                setHistoryErrorState();
                vm.$showMessageModal(t("Temporal error"), t("Unable to load payments."));
            });
    };

    const onApplyFilters = (payload: PaymentHistoryFiltersState) => {
        filters.dateFrom = payload.dateFrom;
        filters.dateTo = payload.dateTo;
        filters.paymentType = payload.paymentType;
        filters.productType = payload.productType as ProductTypeFilter;
        filters.status = payload.status;
        pagination.setPage(1);
        loadHistory();
    };

    const clearFilters = () => {
        Object.assign(filters, createDefaultFilters());
        pagination.setPage(1);
        loadHistory();
    };

    const goToPreviousPage = () => {
        if (!pagination.goPrev()) {
            return;
        }
        loadHistory();
    };

    const goToNextPage = () => {
        if (!pagination.goNext()) {
            return;
        }
        loadHistory();
    };

    const isGeneratedDownloadLoading = (paymentId: string): boolean => {
        return !!generatedDownloadLoadingByPaymentId.value[paymentId];
    };

    const isGeneratedButtonDisabled = (paymentId: string): boolean => {
        return isGeneratedDownloadLoading(paymentId);
    };

    const downloadGeneratedInvoice = async (paymentId: string) => {
        if (generatedDownloadLoadingByPaymentId.value[paymentId]) {
            return;
        }

        generatedDownloadLoadingByPaymentId.value[paymentId] = true;

        try {
            const request = ApiPayments.DownloadPaymentInvoice(paymentId);
            const response = await fetch(request.url, {
                method: request.method,
                headers: {
                    "x-session-id": AuthController.Session,
                },
            });

            if (response.status === 401) {
                vm.$requireLogin();
                return;
            }

            if (response.status === 403) {
                vm.$showMessageModal(t("Access denied"), t("Unable to download this invoice."));
                return;
            }

            if (response.status === 404) {
                vm.$showMessageModal(t("Not found"), t("Payment not found."));
                return;
            }

            if (!response.ok) {
                vm.$showMessageModal(t("Temporal error"), t("Unable to download invoice."));
                return;
            }

            const pdfBlob = await response.blob();
            const blobUrl = URL.createObjectURL(pdfBlob);
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = `invoice-${paymentId}.pdf`;
            anchor.click();
            URL.revokeObjectURL(blobUrl);
        } catch (_error) {
            vm.$showMessageModal(t("Temporal error"), t("Unable to download invoice."));
        } finally {
            generatedDownloadLoadingByPaymentId.value[paymentId] = false;
        }
    };

    const cleanup = () => {
        historyRequestSequence++;
        abortHistoryRequests();
    };

    onMounted(() => {
        vm.$setSubTitle(t("Payment history"));
        vm.$autoFocus();
        loadHistory();
    });

    onBeforeUnmount(() => {
        cleanup();
    });

    return {
        loading,
        payments,
        filters,
        filtersCollapsed,
        setFiltersCollapsed,
        availablePaymentTypes,
        availableStatuses,
        page: pagination.page,
        totalPages: pagination.totalPages,
        paginationVisible: pagination.visible,
        paginationCanGoPrev: pagination.canGoPrev,
        paginationCanGoNext: pagination.canGoNext,
        loadHistory,
        onApplyFilters,
        clearFilters,
        goToPreviousPage,
        goToNextPage,
        isGeneratedDownloadLoading,
        isGeneratedButtonDisabled,
        downloadGeneratedInvoice,
    };
}
