<template>
    <div class="page-content clients-orgs-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Operation')"
            :title="$t('Clients/Orgs')"
            :subtitle="$t('Combined management of individual accounts and business organizations.')"
        />

        <section class="dashboard-section-card">
            <TableCardToolbar
                v-if="tabs.length > 1"
                :tabs="tabs"
                :active-tab="activeTab"
                :tablist-label="$t('Clients and organizations tabs')"
                tab-panel-id="clients-orgs-panel"
                @select="onToolbarTabSelect"
            />

            <div
                class="table-responsive"
                :id="tabs.length > 1 ? 'clients-orgs-panel' : undefined"
                :role="tabs.length > 1 ? 'tabpanel' : undefined"
                :aria-labelledby="tabs.length > 1 ? 'clients-orgs-panel-tab-' + activeTab : undefined"
            >
                <table
                    v-if="activeTab === 'organizations'"
                    class="table table-wide table-stack table-stack--single-col-mobile clients-orgs-table"
                >
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Organization") }}</th>
                            <th scope="col">{{ $t("Email") }}</th>
                            <th scope="col">{{ $t("Created") }}</th>
                            <th scope="col">{{ $t("Status") }}</th>
                            <th scope="col" class="text-right">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>

                    <tbody v-if="loading">
                        <tr>
                            <td colspan="6" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>

                    <tbody v-else>
                        <tr v-if="organizations.length === 0">
                            <td colspan="6" class="table-feedback">{{ $t("No data available") }}</td>
                        </tr>
                        <tr v-for="org in organizations" :key="org.id">
                            <td :data-label="$t('Organization')" class="table-stack-row-primary">
                                <span class="cell-strong">{{ org.companyName }}</span>
                            </td>
                            <td :data-label="$t('Email')">
                                {{ org.email }}
                            </td>
                            <td :data-label="$t('Created')">{{ renderDate(org.createdAt) }}</td>
                            <td :data-label="$t('Status')">
                                <span :class="statusBadgeClassFromTone(orgStatusTone(org))" role="status">
                                    {{ orgStatusLabel(org) }}
                                </span>
                            </td>
                            <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                <div class="clients-orgs-row-actions">
                                    <router-link
                                        v-if="canViewOrganizationRow(org)"
                                        :to="organizationViewRoute(org.id)"
                                        class="btn btn-primary btn-xs clients-orgs-row-action-btn"
                                        :aria-label="$t('Clients view organization details')"
                                        :title="$t('Clients view organization details')"
                                    >
                                        <i class="fas fa-eye no-margin" aria-hidden="true"></i>
                                    </router-link>
                                    <button
                                        v-if="canDeleteOrganization && org.isActive"
                                        type="button"
                                        class="btn btn-danger btn-xs clients-orgs-row-action-btn"
                                        :disabled="deletingOrgId === org.id"
                                        :aria-label="$t('Delete organization')"
                                        @click="confirmDeleteOrganization(org)"
                                    >
                                        <i
                                            :class="
                                                deletingOrgId === org.id ? 'fas fa-spinner fa-spin no-margin' : 'fas fa-trash-alt no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                    <span
                                        v-if="!canViewOrganizationRow(org) && !(canDeleteOrganization && org.isActive)"
                                        class="clients-orgs-actions-na"
                                        aria-hidden="true"
                                        >—</span
                                    >
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table v-else class="table table-wide table-stack table-stack--single-col-mobile clients-orgs-table">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Username") }}</th>
                            <th scope="col">{{ $t("Email") }}</th>
                            <th scope="col">{{ $t("Role") }}</th>
                            <th scope="col">{{ $t("Banned") }}</th>
                            <th scope="col">{{ $t("Created") }}</th>
                            <th scope="col">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>

                    <tbody v-if="loading">
                        <tr>
                            <td colspan="7" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>

                    <tbody v-else>
                        <tr v-if="individualRows.length === 0">
                            <td colspan="7" class="table-feedback">{{ $t("No data available") }}</td>
                        </tr>
                        <tr v-for="user in pagedIndividualRows" :key="user.id">
                            <td :data-label="$t('Username')" class="table-stack-row-primary">
                                <span class="cell-strong">{{ user.username }}</span>
                            </td>
                            <td :data-label="$t('Email')">{{ user.email }}</td>
                            <td :data-label="$t('Role')" class="clients-orgs-field-half">{{ user.role || "—" }}</td>
                            <td :data-label="$t('Banned')" class="clients-orgs-field-half">
                                {{ user.banned ? $t("Yes") : $t("No") }}
                            </td>
                            <td :data-label="$t('Created')">{{ renderDate(user.created) }}</td>
                            <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                <div class="clients-orgs-row-actions">
                                    <router-link
                                        v-if="canViewUsers"
                                        :to="clientViewRoute(user.id)"
                                        class="btn btn-primary btn-xs clients-orgs-row-action-btn"
                                        :aria-label="$t('Clients view client details')"
                                        :title="$t('Clients view client details')"
                                    >
                                        <i class="fas fa-eye no-margin" aria-hidden="true"></i>
                                    </router-link>
                                    <template v-if="canModerateUser">
                                        <button
                                            v-if="!user.banned"
                                            type="button"
                                            class="btn btn-danger btn-xs clients-orgs-row-action-btn"
                                            :disabled="moderatingUserId === user.id"
                                            :aria-label="$t('Ban user')"
                                            @click="confirmBanUser(user)"
                                        >
                                            <i
                                                :class="
                                                    moderatingUserId === user.id
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-trash-alt no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                        <button
                                            v-else
                                            type="button"
                                            class="btn btn-primary btn-xs clients-orgs-row-action-btn"
                                            :disabled="moderatingUserId === user.id"
                                            :aria-label="$t('Unban user')"
                                            :title="$t('Unban user')"
                                            @click="confirmPardonUser(user)"
                                        >
                                            <i
                                                :class="
                                                    moderatingUserId === user.id
                                                        ? 'fas fa-spinner fa-spin no-margin'
                                                        : 'fas fa-unlock no-margin'
                                                "
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                    </template>
                                    <span v-if="!canViewUsers && !canModerateUser" class="clients-orgs-actions-na" aria-hidden="true"
                                        >—</span
                                    >
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <PaginationBar
                :page="paginationPage"
                :total-pages="paginationTotalPages"
                :can-go-prev="paginationCanGoPrev"
                :can-go-next="paginationCanGoNext"
                :visible="paginationVisible"
                :aria-label="$t('Clients list pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>
    </div>

    <OrganizationDeletionRequestModal
        v-model:display="deleteModalOpen"
        purpose="platform-delete"
        :submitting="!!deletingOrgId"
        @submit="onDeleteModalSubmit"
    />
</template>

<script lang="ts">
import { ApiOrganizations } from "@/api/api-group-organizations";
import { ApiUsersAdmin } from "@/api/api-group-users-admin";
import { OrgItem, UserAdminListItem } from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import { AuthController } from "@/control/auth";
import { OrganizationController } from "@/control/organization";
import { hasOrganizationAdminAccess, hasPlatformOrganizationAccess } from "@/control/organization-admin-access";
import { getUniqueStringId } from "@/utils/unique-id";
import { renderDate } from "@/utils/time-utils";
import { Request } from "@asanrom/request-browser";
import { defineComponent, ref } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import OrganizationDeletionRequestModal from "@/components/modals/organization/OrganizationDeletionRequestModal.vue";
import { usePagination } from "@/composables/usePagination";
import { organizationStatusTone, resolveOrganizationStatusKind, statusBadgeClassFromTone } from "@/utils/status-badge";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";

type TabId = "organizations" | "individuals";

const CLIENTS_ORGS_TAB_IDS = ["organizations", "individuals"] as const;

export default defineComponent({
    name: "ClientsOrganizationsPage",
    components: {
        DashboardPageHeader,
        PaginationBar,
        TableCardToolbar,
        OrganizationDeletionRequestModal,
    },
    setup: function () {
        const loadingOrganizations = ref(false);
        const orgPagination = usePagination({ loading: loadingOrganizations });
        const usersPagination = usePagination();

        return {
            usersRequestId: getUniqueStringId(),
            organizationsRequestId: getUniqueStringId(),
            deleteOrgRequestId: getUniqueStringId(),
            userModerationRequestId: getUniqueStringId(),
            loadingOrganizations,
            orgPage: orgPagination.page,
            orgTotalPages: orgPagination.totalPages,
            orgPaginationVisible: orgPagination.visible,
            orgPaginationCanGoPrev: orgPagination.canGoPrev,
            orgPaginationCanGoNext: orgPagination.canGoNext,
            orgPaginationGoPrev: orgPagination.goPrev,
            orgPaginationGoNext: orgPagination.goNext,
            orgPaginationApplyListMeta: orgPagination.applyListMeta,
            orgPaginationReset: orgPagination.reset,
            usersPage: usersPagination.page,
            usersTotalPages: usersPagination.totalPages,
            usersPaginationVisible: usersPagination.visible,
            usersPaginationCanGoPrev: usersPagination.canGoPrev,
            usersPaginationCanGoNext: usersPagination.canGoNext,
            usersPaginationGoPrev: usersPagination.goPrev,
            usersPaginationGoNext: usersPagination.goNext,
            usersPaginationApplyListMeta: usersPagination.applyListMeta,
            usersPaginationReset: usersPagination.reset,
            listPageSize: orgPagination.pageSize,
        };
    },
    data: function () {
        return {
            loading: true,
            loadingUsers: false,
            activeTab: "organizations" as TabId,
            users: [] as UserAdminListItem[],
            organizations: [] as OrgItem[],
            orgsTotal: 0,
            canViewUsers: false,
            canViewAllOrganizations: false,
            canEditUser: false,
            canEditAllOrganizations: false,
            canEditOwnOrganization: false,
            canDeleteOrganization: false,
            deletingOrgId: "",
            deleteModalOpen: false,
            orgToDelete: null as OrgItem | null,
            canModerateUser: false,
            moderatingUserId: "",
            myOrganizationId: "",
        };
    },
    computed: {
        individualRows: function (): UserAdminListItem[] {
            return this.users.filter((user) => !(user.role || "").toLowerCase().includes("organization"));
        },
        paginationVisible: function (): boolean {
            if (this.loading) {
                return false;
            }
            return this.activeTab === "organizations" ? this.orgPaginationVisible : this.usersPaginationVisible;
        },
        paginationPage: function (): number {
            return this.activeTab === "organizations" ? this.orgPage : this.usersPage;
        },
        paginationTotalPages: function (): number {
            return this.activeTab === "organizations" ? this.orgTotalPages : this.usersTotalPages;
        },
        paginationCanGoPrev: function (): boolean {
            if (this.activeTab === "organizations") {
                return this.orgPaginationCanGoPrev;
            }
            return this.usersPaginationCanGoPrev;
        },
        paginationCanGoNext: function (): boolean {
            if (this.activeTab === "organizations") {
                return this.orgPaginationCanGoNext;
            }
            return this.usersPaginationCanGoNext;
        },
        pagedIndividualRows: function (): UserAdminListItem[] {
            const start = (this.usersPage - 1) * this.listPageSize;
            return this.individualRows.slice(start, start + this.listPageSize);
        },
        tabs: function (): Array<{ id: TabId; label: string; count: number }> {
            const visibleTabs: Array<{ id: TabId; label: string; count: number }> = [
                { id: "organizations", label: "Organizations", count: this.orgsTotal },
            ];
            if (this.canViewUsers) {
                visibleTabs.push({ id: "individuals", label: "Individuals", count: this.individualRows.length });
            }
            return visibleTabs;
        },
    },
    methods: {
        syncTabFromRoute: function (): void {
            const nextTab = normalizeRouteTabQuery(this.$route.query.tab, CLIENTS_ORGS_TAB_IDS, "organizations");
            if (!this.tabs.some((tab) => tab.id === nextTab)) {
                this.activeTab = "organizations";
                return;
            }
            this.activeTab = nextTab;
        },
        onToolbarTabSelect: function (tabId: TabId): void {
            if (this.activeTab === tabId) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, tabId, "organizations");
        },
        statusBadgeClassFromTone,
        updateLoadingState: function (): void {
            this.loading = this.loadingUsers || this.loadingOrganizations;
        },
        refreshPermissions: function (): void {
            const platformOrgAccess = hasPlatformOrganizationAccess();
            this.canViewUsers = AuthController.hasPermission("mod.users") || platformOrgAccess;
            this.canViewAllOrganizations = platformOrgAccess;
            this.canEditUser = AuthController.hasPermission("admin.users.manage");
            this.canEditAllOrganizations = platformOrgAccess;
            this.canEditOwnOrganization = hasOrganizationAdminAccess();
            this.canDeleteOrganization = platformOrgAccess;
            this.canModerateUser = AuthController.hasPermission("mod.ban");
        },
        canViewOrganizationRow: function (org: OrgItem): boolean {
            if (!org?.id) {
                return false;
            }
            if (this.canViewAllOrganizations || this.canEditAllOrganizations) {
                return true;
            }
            return this.canEditOwnOrganization && this.myOrganizationId === org.id;
        },
        organizationViewRoute: function (organizationId: string): {
            name: string;
            params: { organizationId: string };
        } {
            return {
                name: "clients-org-detail",
                params: { organizationId },
            };
        },
        clientViewRoute: function (clientId: string): { name: string; params: { clientId: string } } {
            return {
                name: "clients-client-detail",
                params: { clientId },
            };
        },
        confirmBanUser: function (user: UserAdminListItem): void {
            if (!user?.id || this.moderatingUserId || !this.canModerateUser || user.banned) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Ban user"),
                message: this.$t("Do you want to ban this user from the platform?"),
                danger: true,
                callback: () => {
                    this.doBanUser(user);
                },
            });
        },
        doBanUser: function (user: UserAdminListItem): void {
            if (!user?.id || !this.canModerateUser) {
                return;
            }
            Request.Abort(this.userModerationRequestId);
            this.moderatingUserId = user.id;
            Request.Pending(this.userModerationRequestId, ApiUsersAdmin.Ban(user.id))
                .onSuccess(() => {
                    this.moderatingUserId = "";
                    this.$showSnackBar(this.$t("User banned"));
                    this.loadUsers();
                })
                .onCancel(() => {
                    this.moderatingUserId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.moderatingUserId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This user is immune to moderation"));
                        },
                        badRequestImmune: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("This user is immune to moderation"));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("User not found"));
                            this.loadUsers();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            AuthController.CheckAuthStatus();
                            this.refreshPermissions();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.moderatingUserId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },
        confirmPardonUser: function (user: UserAdminListItem): void {
            if (!user?.id || this.moderatingUserId || !this.canModerateUser || !user.banned) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Unban user"),
                message: this.$t("Do you want to unban this user?"),
                danger: false,
                callback: () => {
                    this.doPardonUser(user);
                },
            });
        },
        doPardonUser: function (user: UserAdminListItem): void {
            if (!user?.id || !this.canModerateUser) {
                return;
            }
            Request.Abort(this.userModerationRequestId);
            this.moderatingUserId = user.id;
            Request.Pending(this.userModerationRequestId, ApiUsersAdmin.Pardon(user.id))
                .onSuccess(() => {
                    this.moderatingUserId = "";
                    this.$showSnackBar(this.$t("User unbanned"));
                    this.loadUsers();
                })
                .onCancel(() => {
                    this.moderatingUserId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.moderatingUserId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("User not found"));
                            this.loadUsers();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            AuthController.CheckAuthStatus();
                            this.refreshPermissions();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.moderatingUserId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },
        confirmDeleteOrganization: function (org: OrgItem): void {
            if (!org?.id || this.deletingOrgId || !this.canDeleteOrganization) {
                return;
            }
            this.orgToDelete = org;
            this.deleteModalOpen = true;
        },
        onDeleteModalSubmit: function (subscriptionHandling: string): void {
            if (!this.orgToDelete) {
                return;
            }
            this.doDeleteOrganization(this.orgToDelete, subscriptionHandling);
        },
        doDeleteOrganization: function (org: OrgItem, subscriptionHandling: string): void {
            if (!org?.id || !this.canDeleteOrganization) {
                return;
            }
            Request.Abort(this.deleteOrgRequestId);
            this.deletingOrgId = org.id;
            Request.Pending(this.deleteOrgRequestId, ApiOrganizations.DeleteOrganization(org.id, { subscriptionHandling }))
                .onSuccess(() => {
                    this.deletingOrgId = "";
                    this.deleteModalOpen = false;
                    this.orgToDelete = null;
                    const snackMessage =
                        subscriptionHandling === "AtPeriodEnd"
                            ? this.$t("Organization deletion scheduled for the end of the billing period")
                            : this.$t("Organization successfully deleted");
                    this.$showSnackBar(snackMessage);
                    this.loadOrganizations();
                })
                .onCancel(() => {
                    this.deletingOrgId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.deletingOrgId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestInvalidSubscriptionPreference: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid subscription preference."));
                        },
                        badRequestPendingDeletionRequestExists: () => {
                            this.$showMessageModal(
                                this.$t("Error"),
                                this.$t("A deletion request is already in progress for this organization."),
                            );
                            this.deleteModalOpen = false;
                            this.orgToDelete = null;
                        },
                        badRequestOrganizationNotActive: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization is not active"));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.loadOrganizations();
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.loadOrganizations();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            AuthController.CheckAuthStatus();
                            this.refreshPermissions();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                        serverErrorBlockchainRegistrationFailed: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Blockchain registration failed"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid subscription preference."));
                        },
                        serverErrorRefundFailed: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Refund failed"));
                        },
                        serverErrorStripeNotConfigured: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Stripe not configured"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.deletingOrgId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },
        orgStatusKind: function (org: OrgItem) {
            return resolveOrganizationStatusKind(org);
        },
        orgStatusTone: function (org: OrgItem) {
            return organizationStatusTone(this.orgStatusKind(org));
        },
        orgStatusLabel: function (org: OrgItem): string {
            const k = this.orgStatusKind(org);
            if (k === "approved") {
                return this.$t("Clients org status approved");
            }
            if (k === "pending") {
                return this.$t("Clients org status pending");
            }
            return this.$t("Clients org status rejected");
        },
        loadUsers: function () {
            Request.Abort(this.usersRequestId);
            this.loadingUsers = true;
            this.updateLoadingState();
            Request.Pending(this.usersRequestId, ApiUsersAdmin.GetUsers({ page: 1, pageSize: 100 }))
                .onSuccess((list) => {
                    this.users = list.users || [];
                    this.syncUsersPaginationMeta();
                    this.loadingUsers = false;
                    this.updateLoadingState();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loadingUsers = false;
                            this.users = [];
                            this.updateLoadingState();
                            if (this.canViewAllOrganizations || this.canEditOwnOrganization) {
                                replaceRouteTab(this.$router, this.$route, "organizations", "organizations");
                                return;
                            }
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        temporalError: () => {
                            this.loadingUsers = false;
                            this.users = [];
                            this.updateLoadingState();
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loadingUsers = false;
                    this.users = [];
                    this.updateLoadingState();
                });
        },
        syncUsersPaginationMeta: function (): void {
            const totalPages = Math.max(Math.ceil(this.individualRows.length / this.listPageSize), 1);
            this.usersPaginationApplyListMeta({
                page: Math.min(this.usersPage, totalPages),
                totalPages,
            });
        },
        loadOrganizations: function () {
            Request.Abort(this.organizationsRequestId);
            this.loadingOrganizations = true;
            this.updateLoadingState();
            Request.Pending(
                this.organizationsRequestId,
                ApiOrganizations.ListOrganizations({ page: this.orgPage, pageSize: this.listPageSize }),
            )
                .onSuccess((list) => {
                    this.organizations = list.items || [];
                    this.orgPaginationApplyListMeta({
                        page: list.page,
                        totalPages: list.totalPages,
                    });
                    this.orgsTotal = typeof list.total === "number" ? list.total : this.organizations.length;
                    this.loadingOrganizations = false;
                    this.myOrganizationId = "";
                    this.updateLoadingState();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loadingOrganizations = false;
                            this.updateLoadingState();
                            if (this.canEditOwnOrganization) {
                                this.loadMyOrganization();
                                return;
                            }
                            if (this.canViewUsers) {
                                this.organizations = [];
                                this.orgPaginationReset();
                                this.orgsTotal = 0;
                                replaceRouteTab(this.$router, this.$route, "individuals", "organizations");
                                return;
                            }
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        temporalError: () => {
                            this.loadingOrganizations = false;
                            this.organizations = [];
                            this.orgPaginationReset();
                            this.orgsTotal = 0;
                            this.updateLoadingState();
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loadingOrganizations = false;
                    this.organizations = [];
                    this.orgPaginationReset();
                    this.orgsTotal = 0;
                    this.updateLoadingState();
                });
        },
        loadMyOrganization: function (): void {
            this.loadingOrganizations = true;
            this.updateLoadingState();
            void OrganizationController.ensureReady().then(() => {
                const org = OrganizationController.MyOrganization;
                this.organizations = org?.id ? [org] : [];
                this.myOrganizationId = org?.id || "";
                if (org?.id) {
                    this.orgPaginationApplyListMeta({ page: 1, totalPages: 1 });
                } else {
                    this.orgPaginationReset();
                }
                this.orgsTotal = this.organizations.length;
                this.loadingOrganizations = false;
                this.updateLoadingState();
            });
        },
        onPaginationPrev: function (): void {
            if (this.activeTab === "organizations") {
                if (!this.orgPaginationGoPrev()) {
                    return;
                }
                this.loading = true;
                this.loadOrganizations();
                return;
            }

            this.usersPaginationGoPrev();
        },
        onPaginationNext: function (): void {
            if (this.activeTab === "organizations") {
                if (!this.orgPaginationGoNext()) {
                    return;
                }
                this.loading = true;
                this.loadOrganizations();
                return;
            }

            this.usersPaginationGoNext();
        },
        renderDate: function (ts: number): string {
            return renderDate(ts, this.$t);
        },
        load: async function () {
            this.refreshPermissions();
            if (!this.canViewUsers && !this.canViewAllOrganizations) {
                await OrganizationController.ensureReady();
                this.refreshPermissions();
            }
            this.orgPaginationReset();
            this.usersPaginationReset();
            this.myOrganizationId = "";

            if (!this.canViewUsers && !this.canViewAllOrganizations && !this.canEditOwnOrganization) {
                this.loading = false;
                this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                this.$router.push({ name: HOME_ROUTE });
                return;
            }

            if (!this.canViewUsers) {
                this.users = [];
                replaceRouteTab(this.$router, this.$route, "organizations", "organizations");
            } else {
                this.syncTabFromRoute();
            }
            this.loadingUsers = this.canViewUsers;
            this.loadingOrganizations = this.canViewAllOrganizations || this.canEditOwnOrganization;
            this.updateLoadingState();

            if (this.canViewUsers) {
                this.loadUsers();
            } else {
                this.syncUsersPaginationMeta();
            }

            if (this.canViewAllOrganizations) {
                this.loadOrganizations();
            } else if (this.canEditOwnOrganization) {
                this.loadMyOrganization();
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", () => {
            void this.load();
        });
        void this.load();
        this.$setSubTitle(this.$t("Clients/Orgs"));
        this.$autoFocus();
    },
    activated: function () {
        this.syncTabFromRoute();
        if (this.$route.query.refresh !== "1") {
            return;
        }

        this.load();

        const nextQuery = { ...this.$route.query };
        delete nextQuery.refresh;
        void this.$router.replace({ query: nextQuery });
    },
    beforeUnmount: function () {
        Request.Abort(this.usersRequestId);
        Request.Abort(this.organizationsRequestId);
        Request.Abort(this.deleteOrgRequestId);
        Request.Abort(this.userModerationRequestId);
    },
    watch: {
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
        activeTab: function () {
            this.usersPaginationReset();
            this.syncUsersPaginationMeta();
        },
        "individualRows.length": function () {
            this.syncUsersPaginationMeta();
        },
    },
});
</script>

<style scoped>
.clients-orgs-row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);
}

.clients-orgs-row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.clients-orgs-actions-na {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

@media (max-width: 640px) {
    .clients-orgs-table.table-stack--single-col-mobile td.clients-orgs-field-half {
        flex: 1 1 calc(50% - var(--space-12));
        min-width: calc(50% - var(--space-12));
        width: auto;
    }
}
</style>
