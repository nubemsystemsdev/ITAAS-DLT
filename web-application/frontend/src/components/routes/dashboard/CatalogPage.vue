<template>
    <div v-if="canManageCatalog" class="page-content catalog-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Marketplace')"
            :title="$t('Catalog')"
            :subtitle="$t('Products, services, ITAAS agents and business plans from the marketplace catalog.')"
        />

        <section class="dashboard-section-card">
            <TableCardToolbar
                :tabs="catalogToolbarTabs"
                :active-tab="selectedType"
                :tablist-label="$t('Catalog type filters')"
                tab-panel-id="catalog-admin-panel"
                @select="selectType"
            >
                <template v-if="isPlatformAdmin()" #actions>
                    <button type="button" class="btn btn-primary" @click="openCreateItemModal">
                        <i class="fas fa-plus" aria-hidden="true"></i>
                        {{ $t("New item") }}
                    </button>
                </template>
            </TableCardToolbar>

            <div id="catalog-admin-panel" role="tabpanel" :aria-labelledby="'catalog-admin-panel-tab-' + selectedType">
                <p v-if="loading" class="catalog-state">{{ $t("Loading data...") }}</p>
                <p v-else-if="errorMessage" class="catalog-state">{{ $t(errorMessage) }}</p>
                <p v-else-if="!items.length" class="catalog-state">{{ $t("No data available") }}</p>

                <div v-else class="table-responsive">
                    <table class="table table-wide table-stack">
                        <thead>
                            <tr>
                                <th scope="col">{{ $t("Element") }}</th>
                                <th scope="col">{{ $t("Type") }}</th>
                                <th scope="col">{{ $t("Monthly price (€)") }}</th>
                                <th scope="col">{{ $t("Annual price (€)") }}</th>
                                <th v-if="!isPlanTab()" scope="col">{{ $t("Visibility") }}</th>
                                <th scope="col">{{ $t("Status") }}</th>
                                <th scope="col">{{ $t("Updated") }}</th>
                                <th scope="col" class="text-right">{{ $t("Actions") }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in items" :key="item.id">
                                <td :data-label="$t('Element')" class="item-name-cell table-stack-row-primary">
                                    <span class="item-name">{{ item.name }}</span>
                                </td>
                                <td :data-label="$t('Type')" class="table-stack-subtitle">{{ catalogItemTypeLabel(item) }}</td>
                                <td :data-label="$t('Monthly price (€)')" class="catalog-price-cell">{{ displayPrice(item) }}</td>
                                <td :data-label="$t('Annual price (€)')">{{ formatAnnualPrice(item.annualPriceEur) }}</td>
                                <td v-if="!isPlanTab()" :data-label="$t('Visibility')">
                                    <span v-if="item.visibility" :class="catalogVisibilityBadgeClass(item.visibility)" role="status">
                                        {{ catalogVisibilityLabel(item.visibility) }}
                                    </span>
                                    <span v-else class="catalog-cell-muted">—</span>
                                </td>
                                <td :data-label="$t('Status')">
                                    <span :class="catalogStatusBadgeClass(item)" role="status">
                                        {{ catalogStatusLabel(item.status) }}
                                    </span>
                                </td>
                                <td :data-label="$t('Updated')" class="table-stack-footer">{{ formatDate(item.dateMs) }}</td>
                                <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                    <div v-if="canManageCatalog" class="catalog-row-actions">
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-xs catalog-row-action-btn"
                                            :aria-label="$t('Edit')"
                                            :title="$t('Edit')"
                                            :disabled="deletingItemId === item.id"
                                            @click="onEditItem(item)"
                                        >
                                            <i class="fas fa-pencil no-margin" aria-hidden="true"></i>
                                        </button>
                                        <button
                                            v-if="canDeleteCatalogItem(item)"
                                            type="button"
                                            class="btn btn-danger btn-xs catalog-row-action-btn"
                                            :aria-label="$t('Delete')"
                                            :title="$t('Delete')"
                                            :disabled="deletingItemId === item.id"
                                            @click="confirmDeleteItem(item)"
                                        >
                                            <i
                                                v-if="deletingItemId === item.id"
                                                class="fas fa-spinner fa-spin no-margin"
                                                aria-hidden="true"
                                            ></i>
                                            <i v-else class="fas fa-trash-alt no-margin" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <span v-else class="catalog-cell-muted">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <PaginationBar
                    :page="page"
                    :total-pages="totalPages"
                    :can-go-prev="paginationCanGoPrev"
                    :can-go-next="paginationCanGoNext"
                    :visible="!loading && paginationVisible"
                    :aria-label="$t('Catalog pagination')"
                    @prev="onPaginationPrev"
                    @next="onPaginationNext"
                />
            </div>
        </section>

        <CreateCatalogElement
            v-if="displayCatalogModal"
            v-model:display="displayCatalogModal"
            :default-type="createProductServiceDefaultType"
            :edit-kind="editKind"
            :edit-item-id="editItemId"
            @created="onCatalogItemSaved"
            @updated="onCatalogItemSaved"
        ></CreateCatalogElement>
    </div>

    <div v-else class="page-content catalog-page" tabindex="-1">
        <section class="catalog-card">
            <p class="catalog-state">{{ $t("Redirecting to user catalog...") }}</p>
        </section>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import { ApiPlans } from "@/api/api-group-plans";
import { CatalogAdminItem, CatalogAdminEntry } from "@/api/definitions";
import CreateCatalogElement from "@/components/modals/CreateCatalogElement.vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import {
    CATALOG_ITEM_STATUS_TONE_MAP,
    CATALOG_PLAN_STATUS_TONE_MAP,
    CATALOG_VISIBILITY_TONE_MAP,
    statusBadgeClass,
} from "@/utils/status-badge";
import { AuthController } from "@/control/auth";
import { getUniqueStringId } from "@/utils/unique-id";
import { formatPrice as formatCurrencyEur } from "@/utils/format-currency";
import { formatDateShortIntl } from "@/utils/time-utils";
import { usePagination } from "@/composables/usePagination";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";

const PRODUCT_BACKEND_TYPE = "Digital Product";
const SERVICE_BACKEND_TYPE = "Recurring Service";
const ITAAS_PLATFORM_BACKEND_TYPE = "ITAAS Platform";
const ITAAS_PLATFORM_ITEM_ID = "itaas-platform";
const CUSTOM_AGENT_SERVICE_BACKEND_TYPE = "Custom Agent Service";
const CUSTOM_AGENT_SERVICE_ITEM_ID = "custom-agent-service";
const SERVICE_TAB_KEY = "service";
const PRODUCT_TAB_KEY = "product";
const PLAN_TAB_KEY = "plan";
const PLAN_PRICING_CALCULATED = "calculated";
/** Unified row for catalog items and business plans in the admin table. */
interface CatalogTableItem {
    id: string;
    name: string;
    type: string;
    price: number;
    annualPriceEur?: number;
    priceDisplay: string;
    visibility: string;
    status: string;
    dateMs: number;
    isPlan: boolean;
}

type PlanTableRowSource = {
    id: string;
    name: string;
    monthlyPriceEur?: number | null;
    annualPriceEur?: number;
    pricingMode?: string;
    discountPercent?: number;
    status?: string;
    updatedAt?: number;
    createdAt?: number;
};

export default defineComponent({
    name: "CatalogPage",
    components: {
        CreateCatalogElement,
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbar,
    },
    setup: function () {
        const loading = ref(false);
        const pagination = usePagination({ loading });
        const paginationCanGoPrev = computed(() => pagination.canGoPrev.value);
        const paginationCanGoNext = computed(() => pagination.canGoNext.value);
        const paginationVisible = computed(() => pagination.visible.value);

        return {
            loading,
            catalogRequestId: getUniqueStringId(),
            deleteRequestId: getUniqueStringId(),
            pageSize: pagination.pageSize,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible,
            paginationCanGoPrev,
            paginationCanGoNext,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
            paginationSetPage: pagination.setPage,
        };
    },
    data: function () {
        return {
            errorMessage: "",
            selectedType: "all",
            items: [] as CatalogTableItem[],
            displayCatalogModal: false,
            createProductServiceDefaultType: "service",
            editKind: "",
            editItemId: "",
            deletingItemId: "",
            tabs: [
                { key: "all", label: "All" },
                { key: SERVICE_TAB_KEY, label: "Services" },
                { key: PRODUCT_TAB_KEY, label: "Products" },
                //{ key: "agent", label: "ITAAS agent" },
                { key: PLAN_TAB_KEY, label: "Business plans" },
                // { key: "retired", label: "Retired" },
            ],
            userRole: AuthController.Role || "",
        };
    },
    computed: {
        canManageCatalog(): boolean {
            return this.hasManageCatalogPermission();
        },
        catalogToolbarTabs: function () {
            return [
                { id: "all", label: this.$t("All") },
                { id: SERVICE_TAB_KEY, label: this.$t("Services") },
                { id: PRODUCT_TAB_KEY, label: this.$t("Products") },
                { id: "plan", label: this.$t("Business plans") },
            ];
        },
    },
    methods: {
        catalogVisibilityBadgeClass: function (visibility: string): string {
            return statusBadgeClass(visibility, CATALOG_VISIBILITY_TONE_MAP);
        },
        catalogStatusBadgeClass: function (item: CatalogTableItem): string {
            const toneMap = item.isPlan ? CATALOG_PLAN_STATUS_TONE_MAP : CATALOG_ITEM_STATUS_TONE_MAP;
            return statusBadgeClass(item.status, toneMap);
        },
        catalogVisibilityLabel: function (visibility: string): string {
            return visibility ? this.$t(visibility) : "";
        },
        catalogStatusLabel: function (status: string): string {
            return status ? this.$t(status) : "—";
        },
        canDeleteCatalogItem: function (item: CatalogTableItem): boolean {
            if (item.isPlan) {
                return true;
            }
            if (item.id === ITAAS_PLATFORM_ITEM_ID || item.type === ITAAS_PLATFORM_BACKEND_TYPE) {
                return false;
            }
            if (item.id === CUSTOM_AGENT_SERVICE_ITEM_ID || item.type === CUSTOM_AGENT_SERVICE_BACKEND_TYPE) {
                return false;
            }
            return true;
        },
        catalogItemTypeLabel: function (item: CatalogTableItem): string {
            if (item.isPlan) {
                return item.type;
            }
            if (item.type === ITAAS_PLATFORM_BACKEND_TYPE) {
                return this.$t("ITAAS Platform");
            }
            if (item.type === CUSTOM_AGENT_SERVICE_BACKEND_TYPE) {
                return this.$t("Custom Agent Service");
            }
            if (item.type === PRODUCT_BACKEND_TYPE) {
                return this.$t("Product");
            }
            if (item.type === SERVICE_BACKEND_TYPE) {
                return this.$t("Service");
            }
            return item.type;
        },
        openCreateItemModal: function () {
            this.editKind = "";
            this.editItemId = "";
            if (this.selectedType === PRODUCT_TAB_KEY) {
                this.createProductServiceDefaultType = "product";
            } else if (this.selectedType === PLAN_TAB_KEY) {
                this.createProductServiceDefaultType = "plan";
            } else {
                this.createProductServiceDefaultType = "service";
            }
            this.displayCatalogModal = true;
        },
        onEditItem: function (item: CatalogTableItem) {
            if (!this.hasManageCatalogPermission()) return;
            this.editKind = item.isPlan ? "plan" : "catalog";
            this.editItemId = item.id;
            this.createProductServiceDefaultType = item.isPlan ? "plan" : item.type === PRODUCT_BACKEND_TYPE ? "product" : "service";
            this.displayCatalogModal = true;
        },
        confirmDeleteItem: function (item: CatalogTableItem) {
            if (!this.hasManageCatalogPermission() || this.deletingItemId || !this.canDeleteCatalogItem(item)) return;
            const title = item.isPlan ? this.$t("Delete plan") : this.$t("Delete catalog item");
            const message = item.isPlan ? `${this.$t("Delete plan")} (${item.name})` : `${this.$t("Delete catalog item")} (${item.name})`;
            this.$askUserConfirmation({
                title,
                message,
                danger: true,
                deleteAction: true,
                callback: () => this.doDeleteItem(item),
            });
        },
        doDeleteItem: function (item: CatalogTableItem) {
            if (!this.hasManageCatalogPermission()) return;
            Request.Abort(this.deleteRequestId);
            this.deletingItemId = item.id;
            if (item.isPlan) {
                this.doDeletePlanItem(item);
            } else {
                this.doDeleteCatalogItemRow(item);
            }
        },
        doDeletePlanItem: function (item: CatalogTableItem) {
            Request.Pending(this.deleteRequestId, ApiPlans.DeletePlan(item.id))
                .onSuccess(() => {
                    this.deletingItemId = "";
                    this.$showSnackBar(this.$t("Plan deleted successfully"));
                    this.loadTableItems();
                })
                .onCancel(() => {
                    this.deletingItemId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.deletingItemId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Item not found"));
                            this.loadTableItems();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("No data available"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.deletingItemId = "";
                    this.$showMessageModal(this.$t("Error"), err instanceof Error ? err.message : this.$t("Unexpected error"));
                });
        },
        doDeleteCatalogItemRow: function (item: CatalogTableItem) {
            Request.Pending(this.deleteRequestId, ApiCatalogItems.DeleteCatalogItem(item.id))
                .onSuccess(() => {
                    this.deletingItemId = "";
                    this.$showSnackBar(this.$t("Catalog item deleted successfully"));
                    this.loadTableItems();
                })
                .onCancel(() => {
                    this.deletingItemId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.deletingItemId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("No data available"));
                        },
                        badRequestProtected: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This catalog item is protected and cannot be deleted"));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Item not found"));
                            this.loadTableItems();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("No data available"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.deletingItemId = "";
                    this.$showMessageModal(this.$t("Error"), err instanceof Error ? err.message : this.$t("Unexpected error"));
                });
        },
        onCatalogItemSaved: function (payload?: { kind?: string }) {
            if (payload?.kind === "plan") {
                this.page = 1;
                replaceRouteTab(this.$router, this.$route, PLAN_TAB_KEY, "all");
            }
            this.editKind = "";
            this.editItemId = "";
            this.loadTableItems();
        },
        syncTabFromRoute: function (): void {
            const validTabs = ["all", SERVICE_TAB_KEY, PRODUCT_TAB_KEY, PLAN_TAB_KEY] as const;
            this.selectedType = normalizeRouteTabQuery(this.$route.query.tab, validTabs, "all");
        },
        selectType: function (type: string) {
            if (this.selectedType === type) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, type, "all");
        },
        onRouteTabChanged: function (): void {
            const previousType = this.selectedType;
            this.syncTabFromRoute();
            if (previousType !== this.selectedType) {
                this.paginationReset();
                this.loadTableItems();
            }
        },
        onPaginationPrev: function () {
            if (this.paginationGoPrev()) {
                this.loadTableItems();
            }
        },
        onPaginationNext: function () {
            if (this.paginationGoNext()) {
                this.loadTableItems();
            }
        },
        isPlanTab: function (): boolean {
            return this.selectedType === PLAN_TAB_KEY;
        },
        isAllTab: function (): boolean {
            return this.selectedType === "all";
        },
        resolveCatalogApiFilters: function (): { type?: string; catalogKind?: string; status?: string } {
            if (this.selectedType === "retired") {
                return { status: "Archived" };
            }
            if (this.selectedType === "all") {
                return {};
            }
            if (this.isPlanTab()) {
                return {};
            }
            if (this.selectedType === SERVICE_TAB_KEY) {
                return { catalogKind: "service" };
            }
            if (this.selectedType === PRODUCT_TAB_KEY) {
                return { catalogKind: "product" };
            }
            return { type: this.selectedType };
        },
        mapCatalogToTableItem: function (item: CatalogAdminItem): CatalogTableItem {
            return {
                id: item.id,
                name: item.name,
                type: item.type,
                price: item.price,
                annualPriceEur: item.annualPriceEur,
                priceDisplay: "",
                visibility: item.visibility,
                status: item.status,
                dateMs: item.createdAt,
                isPlan: false,
            };
        },
        mapAdminEntryToTableItem: function (entry: CatalogAdminEntry): CatalogTableItem {
            if (entry.isPlan) {
                return this.mapPlanToTableItem({
                    id: entry.id,
                    name: entry.name,
                    pricingMode: entry.pricingMode || "",
                    discountPercent: entry.discountPercent || 0,
                    status: entry.status,
                    updatedAt: entry.updatedAt,
                    createdAt: entry.updatedAt,
                    monthlyPriceEur: entry.price,
                    annualPriceEur: entry.annualPriceEur,
                });
            }

            return {
                id: entry.id,
                name: entry.name,
                type: entry.type,
                price: entry.price,
                annualPriceEur: entry.annualPriceEur,
                priceDisplay: "",
                visibility: entry.visibility || "",
                status: entry.status,
                dateMs: entry.updatedAt,
                isPlan: false,
            };
        },
        mapPlanToTableItem: function (plan: PlanTableRowSource): CatalogTableItem {
            const monthlyPrice = plan.monthlyPriceEur;
            const annualPrice = plan.annualPriceEur;
            let priceDisplay = "";

            if (monthlyPrice === undefined || monthlyPrice === null) {
                if (plan.pricingMode === PLAN_PRICING_CALCULATED) {
                    priceDisplay =
                        plan.discountPercent && plan.discountPercent > 0
                            ? `${this.$t("Calculated from components")} (-${plan.discountPercent}%)`
                            : this.$t("Calculated from components");
                } else {
                    priceDisplay = this.$t("Fixed price");
                }
            }

            return {
                id: plan.id,
                name: plan.name,
                type: this.$t("Plan"),
                price: monthlyPrice ?? 0,
                annualPriceEur: annualPrice,
                priceDisplay,
                visibility: "",
                status: plan.status || "Draft",
                dateMs: plan.updatedAt || plan.createdAt,
                isPlan: true,
            };
        },
        loadAdminTablePage: function (
            requestFactory: () => ReturnType<typeof ApiCatalogItems.GetAdminCatalogItems>,
            mapRow: (row: CatalogAdminItem | PlanTableRowSource | CatalogAdminEntry) => CatalogTableItem,
        ) {
            this.loading = true;
            this.errorMessage = "";
            Request.Abort(this.catalogRequestId);
            Request.Pending(this.catalogRequestId, requestFactory())
                .onSuccess((list) => {
                    this.items = (list.items || []).map((row) => mapRow(row));
                    this.totalPages = Math.max(1, list.totalPages || 1);
                    this.page = list.page || this.page;
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => (this.errorMessage = "You do not have permissions to view this catalog."),
                        temporalError: () => (this.errorMessage = "No data available"),
                    });
                    this.loading = false;
                })
                .onUnexpectedError(() => {
                    this.errorMessage = "No data available";
                    this.loading = false;
                });
        },
        loadTableItems: function () {
            if (this.isAllTab()) {
                this.loadAllEntries();
                return;
            }
            if (this.isPlanTab()) {
                this.loadPlans();
                return;
            }
            this.loadCatalogItems();
        },
        loadPlans: function () {
            this.loadAdminTablePage(
                () =>
                    ApiPlans.GetAdminPlans({
                        page: this.page,
                        pageSize: this.pageSize,
                    }),
                (plan) => this.mapPlanToTableItem(plan),
            );
        },
        loadCatalogItems: function () {
            const filters = this.resolveCatalogApiFilters();
            this.loadAdminTablePage(
                () =>
                    ApiCatalogItems.GetAdminCatalogItems({
                        page: this.page,
                        pageSize: this.pageSize,
                        type: filters.type,
                        catalogKind: filters.catalogKind,
                        status: filters.status,
                    }),
                (item) => this.mapCatalogToTableItem(item as CatalogAdminItem),
            );
        },
        loadAllEntries: function () {
            this.loadAdminTablePage(
                () =>
                    ApiCatalogItems.GetAdminCatalogEntries({
                        page: this.page,
                        pageSize: this.pageSize,
                    }),
                (entry) => this.mapAdminEntryToTableItem(entry as CatalogAdminEntry),
            );
        },
        displayPrice: function (item: CatalogTableItem): string {
            if (item.priceDisplay) {
                return item.priceDisplay;
            }
            return this.formatPrice(item.price);
        },
        formatDate: function (value: number): string {
            if (!value) {
                return "-";
            }
            return formatDateShortIntl(value, "en-EN");
        },
        formatPrice: function (value: number): string {
            return formatCurrencyEur(value, { locale: "en-EN", nullishCoerceToZero: true });
        },
        formatAnnualPrice: function (value: number | undefined): string {
            if (value === undefined || value === null) {
                return "-";
            }
            return formatCurrencyEur(value, { locale: "en-EN", nullishCoerceToZero: true });
        },
        hasManageCatalogPermission: function (): boolean {
            return AuthController.hasPermission("admin.users.manage");
        },
        isPlatformAdmin: function (): boolean {
            return (
                this.userRole === "admin" ||
                AuthController.hasPermission("admin.roles") ||
                AuthController.hasPermission("admin.users.manage") ||
                AuthController.hasPermission("admin.users.view")
            );
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Catalog"));
        this.userRole = AuthController.Role || "default";

        if (!this.canManageCatalog) {
            void this.$router.replace({ name: "catalog" });
            return;
        }

        this.syncTabFromRoute();
        this.loadTableItems();
    },
    activated: function () {
        if (!this.canManageCatalog) {
            return;
        }
        this.onRouteTabChanged();
    },
    beforeUnmount: function () {
        Request.Abort(this.catalogRequestId);
        Request.Abort(this.deleteRequestId);
    },
    watch: {
        "$route.query.tab": function () {
            this.onRouteTabChanged();
        },
    },
});
</script>

<style scoped>
.catalog-page .catalog-card {
    padding: var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.catalog-page .catalog-state {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.item-name-cell {
    align-items: center;
    gap: var(--space-8);
}

.catalog-price-cell {
    max-width: 240px;
    white-space: normal;
}

.catalog-cell-muted {
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.catalog-row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);
}

.catalog-row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.catalog-row-action-btn:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}
</style>
