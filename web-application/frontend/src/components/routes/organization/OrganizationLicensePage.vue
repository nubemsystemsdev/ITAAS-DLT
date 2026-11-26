<template>
    <div class="page-content org-licenses-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Organization')"
            :title="$t('Licenses')"
            :subtitle="$t('Each Business license lets you assign access to one active organization member.')"
        />

        <section class="dashboard-section-card dashboard-list-card">
            <div class="licenses-action-row">
                <button type="button" class="btn btn-primary licenses-buy-button" @click="openCatalog">
                    <i class="fas fa-plus" aria-hidden="true"></i>
                    {{ $t("Purchase license") }}
                </button>
            </div>

            <ComponentLoader v-if="loading" />

            <section v-else-if="hasError" class="licenses-state">
                <h2>{{ $t("Could not load licenses right now.") }}</h2>
                <p>{{ $t("Please try again in a few seconds.") }}</p>
                <button type="button" class="btn btn-primary" @click="loadPageData">{{ $t("Retry load") }}</button>
            </section>

            <section v-else-if="!licenseProducts.length" class="licenses-state">
                <h2>{{ $t("No contracted products or services yet.") }}</h2>
                <p>{{ $t("Purchase a license or plan from the ITAAS catalog.") }}</p>
                <button type="button" class="btn btn-primary" @click="openCatalog">{{ $t("Purchase license") }}</button>
            </section>

            <section v-else class="license-grid" :aria-label="$t('Contracted products')">
                <article v-for="product in licenseProducts" :key="product.id" class="license-card">
                    <div class="license-card-header">
                        <div class="license-icon" :class="product.toneClass">{{ product.initials }}</div>
                        <div class="license-title-block">
                            <h2>{{ $t(product.name) }}</h2>
                            <div class="license-billing-row">
                                <p>{{ $t(product.billingLabel) }}</p>
                                <p v-if="product.scheduledQuantity" class="license-scheduled-note">
                                    <i class="fas fa-arrow-right" aria-hidden="true"></i>
                                    {{ product.scheduledQuantity }} {{ $t("seats in the next payment") }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="license-usage-row">
                        <div>
                            <p class="license-usage-count">
                                <template v-if="product.licenseLimit === null">
                                    <strong>{{ assignedCount(product) }}</strong> {{ $t("assigned") }}
                                </template>
                                <template v-else>
                                    <strong>{{ assignedCount(product) }}</strong
                                    >/{{ product.licenseLimit }}
                                </template>
                            </p>
                            <p class="license-muted">{{ product.licenseLimit === null ? $t("Unlimited seats") : $t("Seats used") }}</p>
                        </div>
                        <div class="license-price">
                            <strong>{{ formatProductPrice(product.monthlyPrice, product.billingCycle) }}</strong>
                            <span>{{ $t("IVA included") }}</span>
                        </div>
                    </div>

                    <div
                        class="license-progress"
                        role="progressbar"
                        :aria-label="$t('License usage')"
                        :aria-valuemin="0"
                        :aria-valuemax="product.licenseLimit === null ? Math.max(assignedCount(product), 1) : product.licenseLimit"
                        :aria-valuenow="assignedCount(product)"
                    >
                        <span :style="{ width: usagePercent(product) + '%' }"></span>
                    </div>

                    <div class="license-actions">
                        <button
                            type="button"
                            class="btn btn-primary"
                            :disabled="!canOpenAssignments(product)"
                            @click="openAssignments(product)"
                        >
                            {{ $t("Assign") }}
                        </button>
                        <button
                            v-if="product.licenseLimit !== null"
                            type="button"
                            class="btn btn-tertiary"
                            :disabled="!canManageSeats(product)"
                            @click="openSeatManagement(product)"
                        >
                            <i
                                :class="seatPaymentProcessingProductId === product.id ? 'fas fa-spinner fa-spin' : 'fas fa-cog'"
                                aria-hidden="true"
                            ></i>
                            {{ $t("Manage") }}
                        </button>
                    </div>
                </article>
            </section>
        </section>

        <LicenseAssignmentsModal
            v-model:display="assignmentModalOpen"
            :selected-product="selectedProduct"
            :active-members="activeMembers"
            :draft-assigned-user-ids="draftAssignedUserIds"
            :saving-assignments="savingAssignments"
            @close="closeAssignmentModal"
            @set-assignment="setDraftAssignment"
        />

        <SeatPaymentStatusModal
            v-model:display="seatPaymentModalOpen"
            :status="seatPaymentStatus"
            :product-name="$t(seatPaymentProductName)"
            :assigned-quantity="seatPaymentAssignedQuantity"
            :baseline-quantity="seatPaymentBaselineQuantity"
            :target-quantity="seatPaymentTargetQuantity"
            :scheduled-quantity="seatPaymentScheduledQuantity"
            :billing-cycle="seatPaymentBillingCycle"
            @close="closeSeatPaymentModal"
            @retry="retrySeatPaymentStatus"
            @submit="submitSeatQuantity"
        />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type {
    LicenseAssignmentItem,
    LicensePoolItem,
    MemberItem,
    MembersListResponse,
    OrgLicensePoolsListResponse,
    OrgLicensesListResponse,
    UpdateSeatsResponse,
} from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import LicenseAssignmentsModal from "@/components/modals/LicenseAssignmentsModal.vue";
import SeatPaymentStatusModal from "@/components/modals/SeatPaymentStatusModal.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { useSeatIncreasePayment } from "@/composables/useSeatIncreasePayment";
import { AppEvents } from "@/control/app-events";
import { OrganizationController } from "@/control/organization";
import { ensureSubscribableLookup, resolveSubscribableDisplay, type SubscribableLookupEntry } from "@/services/subscribable-lookup";
import { formatPrice } from "@/utils/format-currency";
import { memberDisplayName, memberRoleLabel } from "@/utils/org-member-display";
import { normalizeBillingCyclePlanLabel } from "@/utils/subscription-domain";
import { Timeouts } from "@/utils/timeout";
import { getUniqueStringId } from "@/utils/unique-id";

type SeatPaymentModalStatus = "ready" | "processing" | "success" | "scheduled" | "failed" | "timeout" | "error";

type LicensePageProduct = {
    id: string;
    name: string;
    billingLabel: string;
    billingCycle: string;
    monthlyPrice: number | null;
    toneClass: string;
    initials: string;
    licenseLimit: number | null;
    scheduledQuantity: number;
    canAssign: boolean;
    subscriptionId: string;
    assignedCount: number;
    assignedUserIds: string[];
};

type AssignmentModalMember = {
    id: string;
    name: string;
    subtitle: string;
    initials: string;
    toneClass: string;
};

const MEMBER_PAGE_SIZE = 25;
const LICENSE_PAGE_SIZE = 25;
const PRODUCT_TONE_COUNT = 6;

function normalizeString(value: unknown): string {
    return String(value || "").trim();
}

function normalizeQuantity(value: unknown, fallback = 0): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return Math.max(0, Math.floor(fallback));
    }
    return Math.max(0, Math.floor(numeric));
}

function computeInitials(value: string): string {
    const parts = normalizeString(value).split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "LP";
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function toneClassFromString(value: string): string {
    const source = normalizeString(value) || "license";
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return `license-tone-${(hash % PRODUCT_TONE_COUNT) + 1}`;
}

function isRequestCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === "REQUEST_CANCELLED";
}

export default defineComponent({
    name: "OrganizationLicensePage",
    components: {
        ComponentLoader,
        DashboardPageHeader,
        LicenseAssignmentsModal,
        SeatPaymentStatusModal,
    },

    setup: function () {
        const seatPayment = useSeatIncreasePayment();

        return {
            loadPoolsRequestId: getUniqueStringId(),
            loadMembersRequestId: getUniqueStringId(),
            loadLicensesRequestId: getUniqueStringId(),
            assignmentRequestId: getUniqueStringId(),
            seatStatusRequestId: getUniqueStringId(),
            seatPaymentCancel: seatPayment.cancel,
            seatPaymentRequestChange: seatPayment.requestChange,
            seatPaymentIsRequestCancelled: seatPayment.isRequestCancelled,
        };
    },

    data: function () {
        return {
            loading: true,
            hasError: false,
            loadVersion: 0,
            organizationContextVersion: 0,
            members: [] as MemberItem[],
            licenseAssignments: [] as LicenseAssignmentItem[],
            licensePools: [] as LicensePoolItem[],
            licenseProducts: [] as LicensePageProduct[],
            subscribableLookup: new Map<string, SubscribableLookupEntry>(),
            assignmentModalOpen: false,
            selectedProductId: "",
            draftAssignedUserIds: [] as string[],
            savingAssignments: false,
            assignmentEpoch: 0,
            seatStatusByPoolId: {} as Record<string, UpdateSeatsResponse>,
            seatPaymentModalOpen: false,
            seatPaymentStatus: "ready" as SeatPaymentModalStatus,
            seatPaymentProductId: "",
            seatPaymentProductName: "",
            seatPaymentAssignedQuantity: 0,
            seatPaymentBaselineQuantity: 0,
            seatPaymentTargetQuantity: 0,
            seatPaymentScheduledQuantity: 0,
            seatPaymentBillingCycle: "",
            seatPaymentProcessingProductId: "",
        };
    },

    computed: {
        pageTitle(): string {
            return this.$t("Licenses");
        },

        organizationId(): string {
            void this.organizationContextVersion;
            return OrganizationController.MyOrganization?.id || "";
        },

        canManageLicenses(): boolean {
            void this.organizationContextVersion;
            return OrganizationController.isOrganizationAdmin();
        },

        selectedProduct(): LicensePageProduct | null {
            if (!this.selectedProductId) {
                return null;
            }
            return this.licenseProducts.find((product) => product.id === this.selectedProductId) || null;
        },

        activeMembers(): AssignmentModalMember[] {
            return this.members
                .filter((member) => normalizeString(member.status).toLowerCase() === "active")
                .map((member) => {
                    const name = memberDisplayName(member);
                    return {
                        id: member.userId,
                        name,
                        subtitle: normalizeString(member.email) || memberRoleLabel(member.organizationRole || "", this.$t.bind(this)),
                        initials: computeInitials(name),
                        toneClass: toneClassFromString(normalizeString(member.userId) || normalizeString(member.id) || name),
                    };
                });
        },
    },

    methods: {
        resetPageState: function (): void {
            this.hasError = false;
            this.members = [];
            this.licenseAssignments = [];
            this.licensePools = [];
            this.licenseProducts = [];
            this.subscribableLookup = new Map<string, SubscribableLookupEntry>();
            this.seatStatusByPoolId = {};
            this.selectedProductId = "";
            this.draftAssignedUserIds = [];
        },

        onOrganizationContextChanged: function (): void {
            this.organizationContextVersion += 1;
            this.closeAssignmentModal();
            this.closeSeatPaymentModal();

            if (!this.organizationId) {
                this.resetPageState();
                this.loading = false;
                return;
            }

            void this.loadPageData();
        },

        initialize: async function (): Promise<void> {
            await OrganizationController.ensureReady();
            this.organizationContextVersion += 1;
            if (!this.organizationId) {
                this.loading = false;
                return;
            }
            await this.loadPageData();
        },

        runRequest: function <T>(requestKey: string, requestParams: any): Promise<T> {
            return new Promise((resolve, reject) => {
                Request.Pending(requestKey, requestParams)
                    .onSuccess((response) => resolve(response as T))
                    .onCancel(() => reject(new Error("REQUEST_CANCELLED")))
                    .onRequestError((err) => reject(err))
                    .onUnexpectedError((err) => reject(err));
            });
        },

        loadSubscribableLookup: function (): Promise<Map<string, SubscribableLookupEntry>> {
            return new Promise((resolve) => {
                ensureSubscribableLookup(
                    (key) => this.$t(key),
                    (lookup) => {
                        resolve(lookup);
                    },
                );
            });
        },

        fetchAllMembers: async function (orgId: string): Promise<MemberItem[]> {
            const items: MemberItem[] = [];
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                const response = await this.runRequest<MembersListResponse>(
                    this.loadMembersRequestId,
                    ApiOrganizations.ListOrganizationMembers(orgId, {
                        page,
                        pageSize: MEMBER_PAGE_SIZE,
                    }),
                );
                items.push(...(response.members || []));
                totalPages = Math.max(normalizeQuantity(response.totalPages, 1), 1);
                page += 1;
            }

            return items;
        },

        fetchAllLicenses: async function (orgId: string): Promise<LicenseAssignmentItem[]> {
            const items: LicenseAssignmentItem[] = [];
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                const response = await this.runRequest<OrgLicensesListResponse>(
                    this.loadLicensesRequestId,
                    ApiOrganizations.ListOrganizationLicenses(orgId, {
                        page,
                        pageSize: LICENSE_PAGE_SIZE,
                    }),
                );
                items.push(...(response.licenses || []));
                totalPages = Math.max(normalizeQuantity(response.totalPages, 1), 1);
                page += 1;
            }

            return items;
        },

        fetchLicensePools: function (orgId: string): Promise<OrgLicensePoolsListResponse> {
            return this.runRequest<OrgLicensePoolsListResponse>(
                this.loadPoolsRequestId,
                ApiOrganizations.ListOrganizationLicensePools(orgId),
            );
        },

        loadSeatStatusMap: async function (orgId: string, pools: LicensePoolItem[]): Promise<Record<string, UpdateSeatsResponse>> {
            if (!this.canManageLicenses) {
                return {};
            }

            const poolIds = pools
                .filter((pool) => normalizeQuantity(pool.seatLimit, 0) >= 0)
                .map((pool) => normalizeString(pool.id))
                .filter(Boolean);

            const results = await Promise.allSettled(
                poolIds.map(async (poolId) => {
                    const response = await this.runRequest<UpdateSeatsResponse>(
                        `${this.seatStatusRequestId}-${poolId}`,
                        ApiOrganizations.GetOrganizationSeatStatus(orgId, poolId),
                    );
                    return { poolId, response };
                }),
            );

            const statusMap: Record<string, UpdateSeatsResponse> = {};
            for (const result of results) {
                if (result.status !== "fulfilled") {
                    continue;
                }
                statusMap[result.value.poolId] = result.value.response;
            }

            return statusMap;
        },

        handleLoadRequestError: function (err: unknown): void {
            ApiOrganizations.ListOrganizationLicensePools(this.organizationId || "-").handleError(err as any, {
                unauthorized: () => this.$requireLogin(),
                forbidden: () => {
                    this.hasError = true;
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                notFoundOrganizationNotFound: () => {
                    this.hasError = true;
                },
                notFound: () => {
                    this.hasError = true;
                },
                temporalError: () => {
                    this.hasError = true;
                    Timeouts.Set(this.loadPoolsRequestId, 1500, () => {
                        void this.loadPageData();
                    });
                },
                networkError: () => {
                    this.hasError = true;
                },
                serverError: () => {
                    this.hasError = true;
                },
            });
        },

        loadPageData: async function (): Promise<void> {
            if (!this.organizationId) {
                this.loading = false;
                this.resetPageState();
                return;
            }

            this.loadVersion += 1;
            const currentLoadVersion = this.loadVersion;

            Request.Abort(this.loadPoolsRequestId);
            Request.Abort(this.loadMembersRequestId);
            Request.Abort(this.loadLicensesRequestId);
            Request.Abort(this.seatStatusRequestId);

            this.loading = true;
            this.hasError = false;

            try {
                const orgId = this.organizationId;
                const [members, licenses, poolsResponse, lookup] = await Promise.all([
                    this.fetchAllMembers(orgId),
                    this.fetchAllLicenses(orgId),
                    this.fetchLicensePools(orgId),
                    this.loadSubscribableLookup(),
                ]);
                const seatStatuses = await this.loadSeatStatusMap(orgId, poolsResponse.pools || []);

                if (currentLoadVersion !== this.loadVersion) {
                    return;
                }

                this.members = members;
                this.licenseAssignments = (licenses || []).filter((license) => license && license.isActive !== false);
                this.licensePools = (poolsResponse.pools || []).slice();
                this.subscribableLookup = lookup;
                this.seatStatusByPoolId = seatStatuses;
                this.rebuildLicenseProducts();
                this.loading = false;
            } catch (err) {
                if (currentLoadVersion !== this.loadVersion) {
                    return;
                }
                this.loading = false;
                if (isRequestCancelled(err)) {
                    return;
                }
                this.handleLoadRequestError(err);
            }
        },

        resolveLookupEntry: function (pool: LicensePoolItem): SubscribableLookupEntry | null {
            const keys = [normalizeString(pool.itemPlanId), normalizeString(pool.catalogItemId)];
            for (const key of keys) {
                if (!key) {
                    continue;
                }
                const entry = this.subscribableLookup.get(key);
                if (entry) {
                    return entry;
                }
            }
            return null;
        },

        resolvePoolName: function (pool: LicensePoolItem): string {
            const lookupKey = normalizeString(pool.itemPlanId) || normalizeString(pool.catalogItemId);
            const display = resolveSubscribableDisplay(
                this.subscribableLookup,
                lookupKey,
                normalizeString(pool.sourceType),
                normalizeString(pool.billingCycle),
            );
            return normalizeString(pool.productName) || display.name || lookupKey || pool.id;
        },

        resolvePoolBillingLabel: function (pool: LicensePoolItem): string {
            const lookupKey = normalizeString(pool.itemPlanId) || normalizeString(pool.catalogItemId);
            const display = resolveSubscribableDisplay(
                this.subscribableLookup,
                lookupKey,
                normalizeString(pool.sourceType),
                normalizeString(pool.billingCycle),
            );
            return display.planLabel || normalizeBillingCyclePlanLabel(normalizeString(pool.billingCycle).toLowerCase());
        },

        resolvePoolPrice: function (pool: LicensePoolItem): number | null {
            const entry = this.resolveLookupEntry(pool);
            if (!entry) {
                return null;
            }

            const cycle = normalizeString(pool.billingCycle).toLowerCase();
            if (entry.pricingByCycle && cycle && typeof entry.pricingByCycle[cycle] === "number") {
                return entry.pricingByCycle[cycle];
            }

            return typeof entry.amount === "number" ? entry.amount : null;
        },

        rebuildLicenseProducts: function (): void {
            this.licenseProducts = this.licensePools
                .map((pool) => {
                    const assignedItems = this.licenseAssignments.filter(
                        (license) => normalizeString(license.licensePoolId) === normalizeString(pool.id),
                    );
                    const assignedUserIds = assignedItems.map((license) => normalizeString(license.userId)).filter(Boolean);
                    const seatStatus = this.seatStatusByPoolId[normalizeString(pool.id)];
                    const rawSeatLimit = Number(pool.seatLimit);
                    const isUnlimited = Number.isFinite(rawSeatLimit) && rawSeatLimit < 0;
                    const currentSeatLimit = isUnlimited ? null : normalizeQuantity(pool.seatLimit, assignedUserIds.length);
                    const scheduledQuantity = isUnlimited ? 0 : normalizeQuantity(seatStatus?.scheduled_quantity, 0);
                    const name = this.resolvePoolName(pool);

                    return {
                        id: normalizeString(pool.id),
                        name,
                        billingLabel: this.resolvePoolBillingLabel(pool),
                        billingCycle: normalizeString(pool.billingCycle),
                        monthlyPrice: this.resolvePoolPrice(pool),
                        toneClass: toneClassFromString(normalizeString(pool.catalogItemId) || normalizeString(pool.id) || name),
                        initials: computeInitials(name),
                        licenseLimit: currentSeatLimit,
                        scheduledQuantity,
                        canAssign:
                            this.canManageLicenses &&
                            normalizeString(pool.status).toLowerCase() === "active" &&
                            this.activeMembers.length > 0 &&
                            (currentSeatLimit === null || assignedUserIds.length < currentSeatLimit),
                        subscriptionId: normalizeString(pool.sourceSubscriptionId),
                        assignedCount: assignedUserIds.length,
                        assignedUserIds,
                    } as LicensePageProduct;
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            if (this.assignmentModalOpen) {
                this.syncDraftAssignments();
            }
        },

        syncDraftAssignments: function (): void {
            const product = this.selectedProduct;
            this.draftAssignedUserIds = product ? product.assignedUserIds.slice() : [];
        },

        getIntlLocale: function (): string {
            const locale = String(this.$locale?.value || "")
                .trim()
                .toLowerCase();
            if (locale.startsWith("es")) {
                return "es-ES";
            }
            return "en-US";
        },

        formatProductPrice: function (amount: number | null, billingCycle: string): string {
            const formatted = formatPrice(amount, { locale: this.getIntlLocale(), minimumFractionDigits: 2 });
            if (formatted === "-") {
                return formatted;
            }

            const normalizedCycle = normalizeString(billingCycle).toLowerCase();
            if (normalizedCycle === "annual" || normalizedCycle === "yearly") {
                return `${formatted} / ${this.$t("Annual").toLowerCase()}`;
            }
            if (normalizedCycle === "monthly") {
                return `${formatted} / ${this.$t("month")}`;
            }
            return formatted;
        },

        assignedCount: function (product: LicensePageProduct): number {
            return normalizeQuantity(product.assignedCount, 0);
        },

        canOpenAssignments: function (_product: LicensePageProduct): boolean {
            return this.canManageLicenses && this.activeMembers.length > 0;
        },

        usagePercent: function (product: LicensePageProduct): number {
            const count = this.assignedCount(product);
            if (product.licenseLimit === null) {
                return count > 0 ? 100 : 0;
            }
            if (product.licenseLimit <= 0) {
                return 0;
            }
            return Math.max(0, Math.min(100, Math.round((count / product.licenseLimit) * 100)));
        },

        openCatalog: function (): void {
            void this.$router.push({ name: "catalog" });
        },

        openAssignments: function (product: LicensePageProduct): void {
            if (!this.canOpenAssignments(product)) {
                return;
            }
            this.selectedProductId = product.id;
            this.assignmentModalOpen = true;
            this.syncDraftAssignments();
        },

        closeAssignmentModal: function (): void {
            if (this.savingAssignments) {
                return;
            }
            this.assignmentModalOpen = false;
            this.selectedProductId = "";
            this.draftAssignedUserIds = [];
        },

        findAssignment: function (poolId: string, userId: string): LicenseAssignmentItem | null {
            return (
                this.licenseAssignments.find(
                    (assignment) =>
                        normalizeString(assignment.licensePoolId) === normalizeString(poolId) &&
                        normalizeString(assignment.userId) === normalizeString(userId),
                ) || null
            );
        },

        setDraftAssignment: function (memberId: string, assigned: boolean): void {
            const product = this.selectedProduct;
            if (!product || !this.organizationId) {
                return;
            }

            if (assigned) {
                this.assignLicense(product, memberId);
            } else {
                this.revokeLicense(product, memberId);
            }
        },

        assignLicense: function (product: LicensePageProduct, memberId: string): void {
            if (!this.organizationId) {
                return;
            }

            this.assignmentEpoch += 1;
            const epoch = this.assignmentEpoch;
            const prevAssignments = this.licenseAssignments.slice();
            const prevDraft = this.draftAssignedUserIds.slice();

            const optimisticId = `optimistic-${getUniqueStringId()}`;
            const optimisticAssignment: LicenseAssignmentItem = {
                id: optimisticId,
                organizationId: this.organizationId,
                userId: memberId,
                licensePoolId: product.id,
                subscriptionId: product.subscriptionId,
                isActive: true,
                assignedAt: Date.now(),
            };

            this.licenseAssignments = this.licenseAssignments
                .filter(
                    (item) =>
                        !(
                            normalizeString(item.licensePoolId) === normalizeString(product.id) &&
                            normalizeString(item.userId) === normalizeString(memberId)
                        ),
                )
                .concat([optimisticAssignment]);
            this.draftAssignedUserIds = this.draftAssignedUserIds
                .filter((uid) => normalizeString(uid) !== normalizeString(memberId))
                .concat([memberId]);
            this.rebuildLicenseProducts();
            this.savingAssignments = true;

            Request.Abort(this.assignmentRequestId);

            Request.Pending(
                this.assignmentRequestId,
                ApiOrganizations.AssignOrganizationLicense(this.organizationId, {
                    licensePoolId: product.id,
                    userId: memberId,
                }),
            )
                .onSuccess((assignment) => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = this.licenseAssignments
                        .filter((item) => normalizeString(item.id) !== normalizeString(optimisticId))
                        .concat([assignment]);
                    this.rebuildLicenseProducts();
                    this.$showSnackBar(this.$t("License assigned"));
                })
                .onCancel(() => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                })
                .onRequestError((err, handleErr) => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestNoSeatsAvailable: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("There are not enough contracted licenses."));
                        },
                        badRequestLicenseAlreadyAssigned: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not update license assignment."));
                            void this.loadPageData();
                        },
                        badRequestMemberNotActive: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Only active licenses can be assigned."));
                        },
                        badRequestLicensePoolNotActive: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Only active licenses can be assigned."));
                        },
                        badRequestLicensePoolNotFound: () => {
                            void this.loadPageData();
                        },
                        badRequestInvalidLicensePoolId: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                        },
                        badRequestInvalidUserId: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not update license assignment."));
                        },
                        notFoundOrganizationNotFound: () => {
                            void this.loadPageData();
                        },
                        notFound: () => {
                            void this.loadPageData();
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                    if (err instanceof Error && err.message === "BLOCKCHAIN_REGISTRATION_FAILED") {
                        this.$showMessageModal(this.$t("Error"), this.$t("Blockchain registration failed"));
                        return;
                    }
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        revokeLicense: function (product: LicensePageProduct, memberId: string): void {
            if (!this.organizationId) {
                return;
            }

            const assignment = this.findAssignment(product.id, memberId);
            if (!assignment) {
                return;
            }

            this.assignmentEpoch += 1;
            const epoch = this.assignmentEpoch;
            const prevAssignments = this.licenseAssignments.slice();
            const prevDraft = this.draftAssignedUserIds.slice();

            this.licenseAssignments = this.licenseAssignments.filter((item) => normalizeString(item.id) !== normalizeString(assignment.id));
            this.draftAssignedUserIds = this.draftAssignedUserIds.filter((uid) => normalizeString(uid) !== normalizeString(memberId));
            this.rebuildLicenseProducts();
            this.savingAssignments = true;

            Request.Abort(this.assignmentRequestId);

            Request.Pending(this.assignmentRequestId, ApiOrganizations.RevokeOrganizationLicense(this.organizationId, assignment.id))
                .onSuccess(() => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.$showSnackBar(this.$t("License revoked"));
                })
                .onCancel(() => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                })
                .onRequestError((err, handleErr) => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        notFoundLicenseAssignmentNotFound: () => {
                            void this.loadPageData();
                        },
                        notFoundOrganizationNotFound: () => {
                            void this.loadPageData();
                        },
                        notFound: () => {
                            void this.loadPageData();
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    if (this.assignmentEpoch !== epoch) return;
                    this.savingAssignments = false;
                    this.licenseAssignments = prevAssignments;
                    this.draftAssignedUserIds = prevDraft;
                    this.rebuildLicenseProducts();
                    if (err instanceof Error && err.message === "BLOCKCHAIN_REGISTRATION_FAILED") {
                        this.$showMessageModal(this.$t("Error"), this.$t("Blockchain registration failed"));
                        return;
                    }
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        canManageSeats: function (product: LicensePageProduct): boolean {
            return this.canManageLicenses && product.licenseLimit !== null && !!normalizeString(product.subscriptionId);
        },

        openSeatManagement: function (product: LicensePageProduct): void {
            if (!this.organizationId || !this.canManageSeats(product)) {
                return;
            }

            this.seatPaymentModalOpen = true;
            this.seatPaymentStatus = "processing";
            this.seatPaymentProductId = product.id;
            this.seatPaymentProductName = product.name;
            this.seatPaymentAssignedQuantity = product.assignedCount;
            this.seatPaymentBaselineQuantity = product.licenseLimit || 1;
            this.seatPaymentTargetQuantity = product.scheduledQuantity || product.licenseLimit || 1;
            this.seatPaymentScheduledQuantity = product.scheduledQuantity;
            this.seatPaymentBillingCycle = product.billingCycle;
            this.seatPaymentProcessingProductId = product.id;

            Request.Abort(this.seatStatusRequestId);
            Request.Pending(this.seatStatusRequestId, ApiOrganizations.GetOrganizationSeatStatus(this.organizationId, product.id))
                .onSuccess((response) => {
                    this.seatPaymentProcessingProductId = "";
                    this.applySeatStatusState(product, response, "ready");
                })
                .onCancel(() => {
                    this.seatPaymentProcessingProductId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.seatPaymentProcessingProductId = "";
                    handleErr(err, {
                        unauthorized: () => {
                            this.seatPaymentModalOpen = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.seatPaymentModalOpen = false;
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestLicensePoolNotFound: () => {
                            this.seatPaymentModalOpen = false;
                            this.$showMessageModal(this.$t("Error"), this.$t("License pool not found."));
                        },
                        badRequest: () => {
                            this.seatPaymentStatus = "error";
                        },
                        notFoundOrganizationNotFound: () => {
                            this.seatPaymentModalOpen = false;
                            void this.loadPageData();
                        },
                        notFound: () => {
                            this.seatPaymentModalOpen = false;
                            void this.loadPageData();
                        },
                        networkError: () => {
                            this.seatPaymentStatus = "error";
                        },
                        serverError: () => {
                            this.seatPaymentStatus = "error";
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.seatPaymentProcessingProductId = "";
                    this.seatPaymentStatus = "error";
                });
        },

        applySeatStatusState: function (product: LicensePageProduct, response: UpdateSeatsResponse, status: SeatPaymentModalStatus): void {
            this.seatStatusByPoolId = {
                ...this.seatStatusByPoolId,
                [product.id]: response,
            };
            this.rebuildLicenseProducts();
            this.seatPaymentStatus = status;
            this.seatPaymentProductId = product.id;
            this.seatPaymentProductName = product.name;
            this.seatPaymentAssignedQuantity = product.assignedCount;
            this.seatPaymentBaselineQuantity = normalizeQuantity(
                response.quantity,
                product.licenseLimit === null ? product.assignedCount : product.licenseLimit || 1,
            );
            this.seatPaymentTargetQuantity = normalizeQuantity(
                response.scheduled_quantity,
                normalizeQuantity(response.pending_quantity, this.seatPaymentBaselineQuantity),
            );
            if (!this.seatPaymentTargetQuantity) {
                this.seatPaymentTargetQuantity = this.seatPaymentBaselineQuantity;
            }
            this.seatPaymentScheduledQuantity = normalizeQuantity(response.scheduled_quantity, 0);
            this.seatPaymentBillingCycle = product.billingCycle;
        },

        closeSeatPaymentModal: function (): void {
            if (this.seatPaymentStatus === "processing") {
                this.seatPaymentCancel();
                Request.Abort(this.seatStatusRequestId);
            }

            this.seatPaymentModalOpen = false;
            this.seatPaymentStatus = "ready";
            this.seatPaymentProductId = "";
            this.seatPaymentProductName = "";
            this.seatPaymentAssignedQuantity = 0;
            this.seatPaymentBaselineQuantity = 0;
            this.seatPaymentTargetQuantity = 0;
            this.seatPaymentScheduledQuantity = 0;
            this.seatPaymentBillingCycle = "";
            this.seatPaymentProcessingProductId = "";
        },

        updateLocalSeatStatus: function (poolId: string, response: UpdateSeatsResponse | null): void {
            if (!poolId || !response) {
                return;
            }

            this.seatStatusByPoolId = {
                ...this.seatStatusByPoolId,
                [poolId]: response,
            };
            this.rebuildLicenseProducts();
        },

        handleSeatUpdateRequestError: function (product: LicensePageProduct, quantity: number, err: unknown): void {
            ApiOrganizations.UpdateOrganizationSeats(this.organizationId, product.subscriptionId, { quantity }).handleError(err as any, {
                unauthorized: () => {
                    this.seatPaymentModalOpen = false;
                    this.$requireLogin();
                },
                forbidden: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                },
                badRequestInvalidQuantity: () => {
                    this.seatPaymentStatus = "ready";
                    this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                },
                badRequestSeatIncreasePaymentFailed: () => {
                    this.seatPaymentStatus = "failed";
                },
                badRequestSubscriptionNotFound: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("Pending subscription not found."));
                },
                badRequestNoStripeSubscription: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("This license cannot change seats."));
                },
                badRequestQuantityNotEditable: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("This license cannot change seats."));
                },
                badRequestScheduledPlanChangePending: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("This license cannot change seats."));
                },
                badRequestPendingSeatIncreasePayment: () => {
                    this.seatPaymentStatus = "timeout";
                },
                badRequest: () => {
                    if (quantity > this.seatPaymentBaselineQuantity) {
                        this.seatPaymentStatus = "failed";
                        return;
                    }
                    this.seatPaymentStatus = "error";
                },
                notFoundOrganizationNotFound: () => {
                    this.seatPaymentModalOpen = false;
                    void this.loadPageData();
                },
                notFound: () => {
                    this.seatPaymentModalOpen = false;
                    void this.loadPageData();
                },
                networkError: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                },
                serverError: () => {
                    this.seatPaymentStatus = "error";
                    this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                },
            });
        },

        submitSeatQuantity: async function (quantity: number): Promise<void> {
            const product = this.licenseProducts.find((item) => item.id === this.seatPaymentProductId) || null;
            if (!product || !this.organizationId || !this.canManageSeats(product)) {
                return;
            }

            this.seatPaymentStatus = "processing";
            this.seatPaymentTargetQuantity = quantity;
            this.seatPaymentProcessingProductId = product.id;

            try {
                const result = await this.seatPaymentRequestChange({
                    orgId: this.organizationId,
                    licensePoolId: product.id,
                    subscriptionId: product.subscriptionId,
                    baselineQuantity: this.seatPaymentBaselineQuantity,
                    targetQuantity: quantity,
                });

                this.seatPaymentProcessingProductId = "";
                this.updateLocalSeatStatus(product.id, result.status);

                if (result.outcome === "scheduled") {
                    this.seatPaymentStatus = "scheduled";
                    this.seatPaymentScheduledQuantity = result.status
                        ? normalizeQuantity(result.status.scheduled_quantity, quantity)
                        : quantity;
                    this.$showSnackBar(this.$t("Organization seat count was reduced and licenses may have been revoked."));
                    return;
                }

                if (result.outcome === "success") {
                    this.seatPaymentStatus = "success";
                    if (result.status) {
                        this.seatPaymentBaselineQuantity = normalizeQuantity(result.status.quantity, quantity);
                        this.seatPaymentTargetQuantity = normalizeQuantity(result.status.quantity, quantity);
                        this.seatPaymentScheduledQuantity = normalizeQuantity(result.status.scheduled_quantity, 0);
                    }
                    this.$showSnackBar(this.$t("The new seat quantity is active."));
                    return;
                }

                if (result.outcome === "failed") {
                    this.seatPaymentStatus = "failed";
                    return;
                }

                this.seatPaymentStatus = "timeout";
            } catch (err) {
                this.seatPaymentProcessingProductId = "";
                if (this.seatPaymentIsRequestCancelled(err)) {
                    if (!this.seatPaymentModalOpen) {
                        return;
                    }
                    this.seatPaymentStatus = "ready";
                    return;
                }
                this.handleSeatUpdateRequestError(product, quantity, err);
            }
        },

        retrySeatPaymentStatus: function (): void {
            const product = this.licenseProducts.find((item) => item.id === this.seatPaymentProductId) || null;
            if (!product) {
                return;
            }
            this.openSeatManagement(product);
        },
    },

    mounted: function () {
        AppEvents.AddEventListener("organization-context-changed", this.onOrganizationContextChanged);
        void this.initialize();
        this.$autoFocus();
    },

    beforeUnmount: function () {
        AppEvents.RemoveEventListener("organization-context-changed", this.onOrganizationContextChanged);
        Request.Abort(this.loadPoolsRequestId);
        Request.Abort(this.loadMembersRequestId);
        Request.Abort(this.loadLicensesRequestId);
        Request.Abort(this.assignmentRequestId);
        Request.Abort(this.seatStatusRequestId);
        this.seatPaymentCancel();
    },

    watch: {
        pageTitle: {
            immediate: true,
            handler(title: string) {
                this.$setSubTitle(title);
            },
        },
        assignmentModalOpen: function (isOpen: boolean) {
            if (!isOpen) {
                this.selectedProductId = "";
                this.draftAssignedUserIds = [];
            }
        },
    },
});
</script>

<style>
@import "@/style/layout/organization-license-page.css";
</style>
