<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Organization not found')"
        :not-found-description="$t('The organization you are looking for does not exist or was deleted from the platform.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--simple details-view-card">
                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Organization profile") }}</p>

                    <h1 class="details-view-title">{{ companyName }}</h1>
                    <p class="details-view-subtitle">
                        {{ $t("Review identification, contact and administration details for this organization.") }}
                    </p>
                </div>
            </header>
        </template>

        <DetailsViewTabs
            :tabs="visibleTabs"
            :active-tab="activeTab"
            :tablist-label="$t('Organization detail sections')"
            @select="selectTab"
        />

        <div
            v-if="activeTab === 'details'"
            id="details-view-panel-details"
            key="details"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-details"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Organization details") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review the main records and contact information associated with this organization.") }}
                </p>
            </div>

            <div class="details-view-panels">
                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Identity") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-id-card details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Organization ID") }}
                            </dt>
                            <dd class="details-view-value" :title="id">{{ id }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-fingerprint details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("CIF / NIF") }}
                            </dt>
                            <dd class="details-view-value">{{ cifNif || "—" }}</dd>
                        </div>
                    </dl>
                </article>

                <article class="details-view-panel">
                    <h3 class="details-view-panel-title">{{ $t("Administration") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-user-shield details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Organization admin") }}
                            </dt>
                            <dd class="details-view-value">
                                <router-link
                                    v-if="adminUid"
                                    class="link-deco"
                                    :title="adminUid"
                                    :to="clientDetailRoute(adminUid)"
                                    :aria-label="$t('Clients view client details')"
                                >
                                    {{ adminDisplayName }}
                                </router-link>
                                <span v-else>—</span>
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Created") }}
                            </dt>
                            <dd class="details-view-value">{{ renderDate(createdAt) }}</dd>
                        </div>
                    </dl>
                </article>

                <article class="details-view-panel details-view-panel--wide">
                    <h3 class="details-view-panel-title">{{ $t("Contact and tax details") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Contact email") }}
                            </dt>
                            <dd class="details-view-value">
                                <a v-if="email" class="link-deco" :href="'mailto:' + email">{{ email }}</a>
                                <span v-else>—</span>
                            </dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-earth-europe details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Country") }}
                            </dt>
                            <dd class="details-view-value">{{ country || "—" }}</dd>
                        </div>

                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-location-dot details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Fiscal address") }}
                            </dt>
                            <dd class="details-view-value">{{ fiscalAddress || "—" }}</dd>
                        </div>
                    </dl>
                </article>
            </div>
        </div>

        <div
            v-else-if="activeTab === 'members'"
            id="details-view-panel-members"
            key="members"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-members"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Organization members") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Review the users who belong to this organization and their membership status.") }}
                </p>
            </div>

            <p v-if="membersForbidden" class="details-view-state-message">
                {{ $t("You do not have permission to view the members of this organization.") }}
            </p>

            <template v-else>
                <div class="table-responsive">
                    <table class="table table-wide table-stack table-stack--single-col-mobile">
                        <thead>
                            <tr>
                                <th scope="col">{{ $t("Username") }}</th>
                                <th scope="col">{{ $t("Role") }}</th>
                                <th scope="col">{{ $t("Status") }}</th>
                                <th scope="col">{{ $t("Joined") }}</th>
                            </tr>
                        </thead>
                        <tbody v-if="membersLoading">
                            <tr>
                                <td colspan="4" class="table-feedback">{{ $t("Loading") }}...</td>
                            </tr>
                        </tbody>
                        <tbody v-else-if="members.length === 0">
                            <tr>
                                <td colspan="4" class="table-feedback">{{ $t("No members found for this organization") }}</td>
                            </tr>
                        </tbody>
                        <tbody v-else>
                            <tr v-for="member in members" :key="member.id">
                                <td :data-label="$t('Username')" class="table-stack-row-primary">
                                    <router-link
                                        v-if="member.userId"
                                        class="link-deco"
                                        :title="member.userId"
                                        :to="clientDetailRoute(member.userId)"
                                        :aria-label="$t('Clients view client details')"
                                    >
                                        {{ memberDisplayName(member) }}
                                    </router-link>
                                    <span v-else>—</span>
                                </td>
                                <td :data-label="$t('Role')">{{ memberRoleLabel(member.organizationRole) }}</td>
                                <td :data-label="$t('Status')">
                                    <span :class="'member-status member-status--' + memberStatusClass(member.status)">
                                        <i :class="memberStatusIcon(member.status)" aria-hidden="true"></i>
                                        {{ memberStatusLabel(member.status) }}
                                    </span>
                                </td>
                                <td :data-label="$t('Joined')">{{ renderDate(member.joinedAt) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <PaginationBar
                    :page="membersPage"
                    :total-pages="membersTotalPages"
                    :can-go-prev="membersPage > 1 && !membersLoading"
                    :can-go-next="membersPage < membersTotalPages && !membersLoading"
                    :aria-label="$t('Organization members pagination')"
                    @prev="goToMembersPage(membersPage - 1)"
                    @next="goToMembersPage(membersPage + 1)"
                />
            </template>
        </div>

        <div
            v-else-if="activeTab === 'settings'"
            id="details-view-panel-settings"
            key="settings"
            class="details-view-tab-panel"
            role="tabpanel"
            aria-labelledby="details-view-tab-settings"
        >
            <div class="details-view-content-header">
                <h2 class="details-view-content-title">{{ $t("Organization settings") }}</h2>
                <p class="details-view-content-description">
                    {{ $t("Update organization data or perform irreversible administrative actions.") }}
                </p>
            </div>

            <article v-if="canEditOrganization" class="details-view-panel details-view-panel--wide">
                <div class="details-view-edit-header">
                    <h3 class="details-view-panel-title">{{ $t("Organization edit tools") }}</h3>
                    <p class="details-view-edit-description">
                        {{ $t("Update the main company and contact information for this organization.") }}
                    </p>
                </div>

                <form class="details-view-edit-form" @submit="submitOrganizationUpdate">
                    <div class="details-view-edit-grid">
                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="org-settings-company-name">
                                <i class="fas fa-building details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Organization") }}
                            </label>
                            <input
                                id="org-settings-company-name"
                                v-model="editCompanyName"
                                type="text"
                                maxlength="255"
                                class="form-control form-control-full-width"
                                :disabled="saving"
                                :aria-invalid="companyNameError ? 'true' : undefined"
                                :aria-describedby="companyNameError ? 'org-settings-company-name-error' : undefined"
                            />
                            <div v-if="companyNameError" id="org-settings-company-name-error" class="form-error" role="alert">
                                {{ companyNameError }}
                            </div>
                        </div>

                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="org-settings-email">
                                <i class="fas fa-envelope details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Contact email") }}
                            </label>
                            <input
                                id="org-settings-email"
                                v-model="editEmail"
                                type="email"
                                maxlength="255"
                                class="form-control form-control-full-width"
                                :disabled="saving"
                                :aria-invalid="emailError ? 'true' : undefined"
                                :aria-describedby="emailError ? 'org-settings-email-error' : undefined"
                            />
                            <div v-if="emailError" id="org-settings-email-error" class="form-error" role="alert">{{ emailError }}</div>
                        </div>

                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="org-settings-country">
                                <i class="fas fa-earth-europe details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Country") }}
                            </label>
                            <input
                                id="org-settings-country"
                                v-model="editCountry"
                                type="text"
                                maxlength="255"
                                class="form-control form-control-full-width"
                                :disabled="saving"
                                :aria-invalid="countryError ? 'true' : undefined"
                                :aria-describedby="countryError ? 'org-settings-country-error' : undefined"
                            />
                            <div v-if="countryError" id="org-settings-country-error" class="form-error" role="alert">
                                {{ countryError }}
                            </div>
                        </div>

                        <div class="details-view-edit-field">
                            <label class="details-view-label" for="org-settings-fiscal-address">
                                <i class="fas fa-location-dot details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Fiscal address") }}
                            </label>
                            <textarea
                                id="org-settings-fiscal-address"
                                v-model="editFiscalAddress"
                                rows="4"
                                maxlength="255"
                                class="form-control form-control-full-width form-textarea"
                                :disabled="saving"
                                :aria-invalid="fiscalAddressError ? 'true' : undefined"
                                :aria-describedby="fiscalAddressError ? 'org-settings-fiscal-address-error' : undefined"
                            ></textarea>
                            <div v-if="fiscalAddressError" id="org-settings-fiscal-address-error" class="form-error" role="alert">
                                {{ fiscalAddressError }}
                            </div>
                        </div>
                    </div>

                    <div class="details-view-edit-actions">
                        <button type="submit" class="btn btn-primary" :disabled="saving || !organizationHasChanges">
                            <i class="fas fa-save" aria-hidden="true"></i>
                            {{ $t("Save changes") }}
                        </button>
                    </div>
                </form>
            </article>

            <article v-if="canDeleteOrganization" class="details-view-danger-panel">
                <h3 class="details-view-danger-title">{{ $t("Danger zone") }}</h3>
                <p class="details-view-danger-description">
                    {{ $t("Permanently delete this organization from the platform. This action cannot be undone.") }}
                </p>
                <div class="details-view-danger-actions">
                    <button type="button" class="btn btn-danger" :disabled="deleting" @click="confirmDeleteOrganization">
                        <i class="fas fa-trash-alt" aria-hidden="true"></i>
                        {{ $t("Delete organization") }}
                    </button>
                </div>
            </article>

            <p v-if="!canEditOrganization && !canDeleteOrganization" class="details-view-state-message">
                {{ $t("You do not have permission to manage settings for this organization.") }}
            </p>
        </div>
    </DetailsViewLayout>

    <OrganizationDeletionRequestModal
        v-model:display="deleteModalOpen"
        purpose="platform-delete"
        :submitting="deleting"
        @submit="onDeleteModalSubmit"
    />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import { MemberItem, OrgItem } from "@/api/definitions";
import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import DetailsViewTabs from "@/components/layout/DetailsViewTabs.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import OrganizationDeletionRequestModal from "@/components/modals/organization/OrganizationDeletionRequestModal.vue";
import { LIST_PAGE_SIZE } from "@/constants/ui";
import { useDetailsViewRoute } from "@/composables/useDetailsViewRoute";
import { OrganizationController } from "@/control/organization";
import { hasOrganizationAdminAccess, hasPlatformOrganizationAccess } from "@/control/organization-admin-access";
import { getUniqueStringId } from "@/utils/unique-id";
import { truncateMiddle } from "@/utils/text";
import { renderDate } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";

type OrgDetailTabId = "details" | "members" | "settings";

function normalizeTabQuery(raw: unknown): OrgDetailTabId {
    const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    if (value === "members" || value === "settings") {
        return value;
    }
    return "details";
}

export default defineComponent({
    name: "ClientOrganizationDetailsPage",
    components: {
        DetailsViewLayout,
        DetailsViewTabs,
        PaginationBar,
        OrganizationDeletionRequestModal,
    },
    setup: function () {
        const {
            backRoute,
            routeTargetId: routeOrganizationId,
            routeEditRequested,
            clearEditQuery,
        } = useDetailsViewRoute("organizationId", "clients-orgs");
        return {
            loadRequestId: getUniqueStringId(),
            updateRequestId: getUniqueStringId(),
            membersRequestId: getUniqueStringId(),
            deleteRequestId: getUniqueStringId(),
            backRoute,
            routeOrganizationId,
            routeEditRequested,
            clearEditQuery,
        };
    },
    data: function () {
        return {
            loading: true,
            notFound: false,
            canEditOrganization: false,
            canDeleteOrganization: false,
            canViewMembers: false,
            saving: false,
            deleting: false,
            deleteModalOpen: false,
            activeTab: "details" as OrgDetailTabId,
            editCompanyName: "",
            editFiscalAddress: "",
            editEmail: "",
            editCountry: "",
            companyNameError: "",
            fiscalAddressError: "",
            emailError: "",
            countryError: "",

            members: [] as MemberItem[],
            membersLoading: false,
            membersForbidden: false,
            membersPage: 1,
            membersTotalPages: 1,
            membersTotal: 0,

            id: "",
            companyName: "",
            cifNif: "",
            country: "",
            fiscalAddress: "",
            email: "",
            adminUid: "",
            adminUsername: "",
            createdAt: 0,
        };
    },
    computed: {
        organizationHasChanges: function (): boolean {
            return (
                this.editCompanyName !== this.companyName ||
                this.editFiscalAddress !== this.fiscalAddress ||
                this.editEmail !== this.email ||
                this.editCountry !== this.country
            );
        },
        visibleTabs: function (): Array<{ id: OrgDetailTabId; label: string; shortLabel: string; icon: string }> {
            const tabs: Array<{ id: OrgDetailTabId; label: string; shortLabel: string; icon: string }> = [
                { id: "details", label: "Organization details", shortLabel: "Details", icon: "fas fa-building" },
            ];
            if (this.canViewMembers) {
                tabs.push({ id: "members", label: "Organization members", shortLabel: "Members", icon: "fas fa-users" });
            }
            if (this.canEditOrganization || this.canDeleteOrganization) {
                tabs.push({ id: "settings", label: "Organization settings", shortLabel: "Settings", icon: "fas fa-gear" });
            }
            return tabs;
        },
        adminDisplayName: function (): string {
            if (this.adminUsername) {
                return this.adminUsername;
            }
            if (this.adminUid) {
                return truncateMiddle(this.adminUid, 24);
            }
            return "—";
        },
    },
    methods: {
        truncateMiddle,
        renderDate: function (ts: number): string {
            if (!ts) {
                return "—";
            }
            return renderDate(ts, this.$t);
        },

        memberRoleLabel: function (role: string): string {
            const normalized = (role || "").toLowerCase();
            if (normalized === "admin") {
                return this.$t("Organization admin");
            }
            if (normalized === "member") {
                return this.$t("Member");
            }
            return role || "—";
        },

        memberStatusLabel: function (status: string): string {
            const normalized = (status || "").toLowerCase();
            if (normalized === "active") {
                return this.$t("Active");
            }
            if (normalized === "invited") {
                return this.$t("Invited");
            }
            if (normalized === "inactive") {
                return this.$t("Inactive");
            }
            return status || "—";
        },

        memberStatusClass: function (status: string): string {
            const normalized = (status || "").toLowerCase();
            if (normalized === "active") {
                return "success";
            }
            if (normalized === "invited") {
                return "warning";
            }
            return "muted";
        },

        memberStatusIcon: function (status: string): string {
            const normalized = (status || "").toLowerCase();
            if (normalized === "active") {
                return "fas fa-check-circle";
            }
            if (normalized === "invited") {
                return "fas fa-user-plus";
            }
            return "fas fa-ban";
        },

        memberDisplayName: function (member: MemberItem): string {
            if (member.username) {
                return member.username;
            }
            if (member.userId) {
                return truncateMiddle(member.userId, 24);
            }
            return "—";
        },

        clientDetailRoute: function (clientId: string) {
            return { name: "clients-client-detail", params: { clientId } };
        },

        backRouteWithListRefresh: function () {
            return {
                name: "clients-orgs",
                query: { refresh: "1" },
            };
        },

        syncTabFromRoute: function (): void {
            const nextTab = normalizeTabQuery(this.$route.query.tab);
            if (!this.visibleTabs.some((tab) => tab.id === nextTab)) {
                this.activeTab = "details";
                return;
            }
            this.activeTab = nextTab;
            if (this.activeTab === "members" && this.id && this.canViewMembers) {
                this.loadMembers();
            }
        },

        selectTab: function (tabId: OrgDetailTabId): void {
            if (this.activeTab === tabId) {
                return;
            }

            void this.$router.replace({
                query: {
                    ...this.$route.query,
                    tab: tabId === "details" ? undefined : tabId,
                },
            });
        },

        applyOrganization: function (org: OrgItem) {
            this.members = [];
            this.membersPage = 1;
            this.membersTotal = 0;
            this.membersTotalPages = 1;
            this.membersForbidden = false;

            this.id = org.id;
            this.companyName = org.companyName || "";
            this.cifNif = org.cifNif || "";
            this.country = org.country || "";
            this.fiscalAddress = org.fiscalAddress || "";
            this.email = org.email || "";
            this.adminUid = org.adminUid || "";
            this.adminUsername = org.adminUsername || "";
            this.createdAt = org.createdAt || 0;
            this.syncEditForm();
        },
        refreshPermissions: function (): void {
            const platformOrgAccess = hasPlatformOrganizationAccess();
            const isOrgAdmin = hasOrganizationAdminAccess();

            this.canEditOrganization = platformOrgAccess || isOrgAdmin;
            this.canDeleteOrganization = platformOrgAccess;
            this.canViewMembers = platformOrgAccess || isOrgAdmin;

            if (this.routeEditRequested && this.id && this.canEditOrganization) {
                this.navigateToSettingsTab();
            }

            if (!this.visibleTabs.some((tab) => tab.id === this.activeTab)) {
                this.activeTab = "details";
            }
        },
        syncEditForm: function (): void {
            this.editCompanyName = this.companyName || "";
            this.editFiscalAddress = this.fiscalAddress || "";
            this.editEmail = this.email || "";
            this.editCountry = this.country || "";
            this.companyNameError = "";
            this.fiscalAddressError = "";
            this.emailError = "";
            this.countryError = "";
        },
        navigateToSettingsTab: function (): void {
            if (!this.canEditOrganization || !this.id) {
                return;
            }
            this.syncEditForm();
            void this.$router.replace({
                query: {
                    ...this.$route.query,
                    tab: "settings",
                    edit: undefined,
                },
            });
        },
        submitOrganizationUpdate: function (event: Event): void {
            if (event) {
                event.preventDefault();
            }
            if (!this.canEditOrganization || !this.id || this.saving || !this.organizationHasChanges) {
                return;
            }

            this.companyNameError = "";
            this.fiscalAddressError = "";
            this.emailError = "";
            this.countryError = "";
            this.saving = true;

            Request.Abort(this.updateRequestId);
            Request.Pending(
                this.updateRequestId,
                ApiOrganizations.UpdateOrganization(this.id, {
                    companyName: (this.editCompanyName || "").trim(),
                    fiscalAddress: (this.editFiscalAddress || "").trim(),
                    email: (this.editEmail || "").trim(),
                    country: (this.editCountry || "").trim(),
                }),
            )
                .onSuccess(() => {
                    this.saving = false;
                    this.$showSnackBar(this.$t("Organization successfully updated"));
                    this.load();
                })
                .onCancel(() => {
                    this.saving = false;
                })
                .onRequestError((err, handleErr) => {
                    this.saving = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestInvalidCompanyName: () => {
                            this.companyNameError = this.$t("Invalid organization name");
                        },
                        badRequestInvalidFiscalAddress: () => {
                            this.fiscalAddressError = this.$t("Invalid fiscal address");
                        },
                        badRequestInvalidEmail: () => {
                            this.emailError = this.$t("Invalid email provided");
                        },
                        badRequestInvalidCountry: () => {
                            this.countryError = this.$t("Invalid country provided");
                        },
                        badRequest: () => {
                            this.companyNameError = this.$t("Bad request");
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.load();
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.load();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
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
                    this.saving = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        loadMembers: function () {
            if (!this.id || !this.canViewMembers || this.membersLoading) {
                return;
            }

            this.membersLoading = true;
            this.membersForbidden = false;
            Request.Abort(this.membersRequestId);
            Request.Pending(
                this.membersRequestId,
                ApiOrganizations.ListOrganizationMembers(this.id, {
                    page: this.membersPage,
                    pageSize: LIST_PAGE_SIZE,
                }),
            )
                .onSuccess((response) => {
                    this.membersLoading = false;
                    this.members = response.members || [];
                    this.membersPage = response.page || 1;
                    this.membersTotalPages = Math.max(response.totalPages || 1, 1);
                    this.membersTotal = response.total || 0;
                })
                .onCancel(() => {
                    this.membersLoading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.membersLoading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.membersForbidden = true;
                            this.members = [];
                        },
                        notFoundOrganizationNotFound: () => {
                            this.notFound = true;
                        },
                        notFound: () => {
                            this.notFound = true;
                        },
                        temporalError: () => {
                            Timeouts.Set(this.membersRequestId, 1500, this.loadMembers.bind(this));
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
                    this.membersLoading = false;
                    console.error(err);
                    Timeouts.Set(this.membersRequestId, 1500, this.loadMembers.bind(this));
                });
        },

        goToMembersPage: function (page: number): void {
            if (page < 1 || page > this.membersTotalPages || page === this.membersPage) {
                return;
            }
            this.membersPage = page;
            this.loadMembers();
        },

        confirmDeleteOrganization: function (): void {
            if (!this.id || this.deleting || !this.canDeleteOrganization) {
                return;
            }
            this.deleteModalOpen = true;
        },

        onDeleteModalSubmit: function (subscriptionHandling: string): void {
            this.doDeleteOrganization(subscriptionHandling);
        },

        doDeleteOrganization: function (subscriptionHandling: string): void {
            if (!this.id || !this.canDeleteOrganization) {
                return;
            }

            Request.Abort(this.deleteRequestId);
            this.deleting = true;
            Request.Pending(this.deleteRequestId, ApiOrganizations.DeleteOrganization(this.id, { subscriptionHandling }))
                .onSuccess(() => {
                    this.deleting = false;
                    this.deleteModalOpen = false;
                    const snackMessage =
                        subscriptionHandling === "AtPeriodEnd"
                            ? this.$t("Organization deletion scheduled for the end of the billing period")
                            : this.$t("Organization successfully deleted");
                    this.$showSnackBar(snackMessage);
                    void this.$router.push(this.backRouteWithListRefresh());
                })
                .onCancel(() => {
                    this.deleting = false;
                })
                .onRequestError((err, handleErr) => {
                    this.deleting = false;
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
                        },
                        badRequestOrganizationNotActive: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization is not active"));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            void this.$router.push(this.backRouteWithListRefresh());
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            void this.$router.push(this.backRouteWithListRefresh());
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
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
                    this.deleting = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            const targetId = this.routeOrganizationId;

            if (!targetId) {
                this.loading = false;
                this.notFound = true;
                this.$setSubTitle(this.$t("Organization not found"));
                return;
            }

            this.loading = true;
            this.notFound = false;

            Request.Pending(this.loadRequestId, ApiOrganizations.GetOrganization(targetId))
                .onSuccess((org) => {
                    this.loading = false;
                    this.notFound = false;
                    this.applyOrganization(org);
                    this.refreshPermissions();
                    this.syncTabFromRoute();
                    this.$setSubTitle(this.companyName || this.$t("Organization"));
                    void OrganizationController.ensureReady().then(() => {
                        this.refreshPermissions();
                        this.syncTabFromRoute();
                    });
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.$setSubTitle(this.$t("Organization not found"));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.$setSubTitle(this.$t("Organization not found"));
                        },
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                            this.$setSubTitle(this.$t("Organization not found"));
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", () => {
            void OrganizationController.ensureReady().then(() => {
                this.refreshPermissions();
                this.syncTabFromRoute();
            });
        });
        this.syncTabFromRoute();
        this.refreshPermissions();
        void OrganizationController.ensureReady().then(() => {
            this.refreshPermissions();
            this.syncTabFromRoute();
        });
        this.$setSubTitle(this.$t("Organization"));
        this.load();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Timeouts.Abort(this.membersRequestId);
        Request.Abort(this.loadRequestId);
        Request.Abort(this.updateRequestId);
        Request.Abort(this.membersRequestId);
        Request.Abort(this.deleteRequestId);
    },
    watch: {
        routeOrganizationId: function () {
            this.membersPage = 1;
            this.load();
        },
        routeEditRequested: function (shouldEdit: boolean) {
            if (shouldEdit && this.canEditOrganization && this.id) {
                this.navigateToSettingsTab();
            }
        },
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
        canViewMembers: function (canView: boolean) {
            if (!canView && this.activeTab === "members") {
                this.activeTab = "details";
            }
        },
    },
});
</script>

<style scoped>
@import "@/style/layout/details-view.css";
@import "@/style/tables.css";

.member-status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    white-space: nowrap;
}

.member-status--success {
    color: var(--color-feedback-success);
}

.member-status--warning {
    color: var(--color-feedback-warning);
}

.member-status--muted {
    color: var(--color-text-muted);
}
</style>
