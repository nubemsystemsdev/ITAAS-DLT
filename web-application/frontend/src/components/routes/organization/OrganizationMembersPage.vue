<template>
    <div class="page-content organization-members-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Organization')"
            :title="$t('Organization members')"
            :subtitle="$t('Review the users who belong to this organization and their membership status.')"
        />

        <p v-if="!organizationId && !loading" class="organization-members-state-message">
            {{ $t("You are not part of any organization") }}
        </p>

        <p v-else-if="membersForbidden" class="organization-members-state-message">
            {{ $t("You do not have permission to view the members of this organization.") }}
        </p>

        <section v-else class="subscriptions-card dashboard-list-card">
            <TableCardToolbar
                v-if="canManageMembers"
                :tabs="memberTabs"
                :active-tab="activeTab"
                :tablist-label="$t('Organization members tabs')"
                tab-panel-id="organization-members-panel"
                :tabs-disabled="loading"
                @select="onSelectTab"
            >
                <template #actions>
                    <button
                        v-if="activeTab === 'invited'"
                        type="button"
                        class="btn btn-primary toolbar-action-btn"
                        :disabled="loading || inviteSubmitting"
                        @click="openInviteModal"
                    >
                        <i class="fas fa-user-plus" aria-hidden="true"></i>
                        {{ $t("Invite member") }}
                    </button>
                </template>
            </TableCardToolbar>

            <OrganizationInviteMemberModal
                v-model:display="displayInviteModal"
                :email-error="inviteEmailError"
                :submitting="inviteSubmitting"
                @submit="submitInvite"
            />

            <OrganizationManageMemberModal
                v-model:display="displayManageModal"
                :member="managedMember"
                :organization-id="organizationId"
                :active-tab="activeTab"
                :can-modify="managedMemberCanModify"
                :action-loading-id="actionLoadingId"
                @activate="onManageActivate"
                @deactivate="onManageDeactivate"
                @remove="onManageRemove"
                @change-role="onManageChangeRole"
            />

            <div
                class="table-responsive"
                :id="canManageMembers ? 'organization-members-panel' : undefined"
                :role="canManageMembers ? 'tabpanel' : undefined"
                :aria-labelledby="canManageMembers ? 'organization-members-panel-tab-' + activeTab : undefined"
            >
                <table class="table table-wide table-stack table-stack--single-col-mobile">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Username") }}</th>
                            <th scope="col">{{ $t("Email") }}</th>
                            <th scope="col">{{ $t("Role") }}</th>
                            <th v-if="showStatusColumn" scope="col">{{ $t("Status") }}</th>
                            <th v-if="showMemberMetricsColumns" scope="col" class="text-center">{{ $t("Assignments") }}</th>
                            <th v-if="showMemberMetricsColumns" scope="col">{{ $t("Joined") }}</th>
                            <th v-if="canManageMembers" scope="col" class="text-right">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="loading">
                        <tr>
                            <td :colspan="tableColspan" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>
                    <tbody v-else-if="members.length === 0">
                        <tr>
                            <td :colspan="tableColspan" class="table-feedback">{{ emptyMessage }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="member in members" :key="member.id">
                            <td :data-label="$t('Username')" class="table-stack-row-primary">
                                <strong class="cell-strong">{{ displayMemberName(member) }}</strong>
                            </td>
                            <td :data-label="$t('Email')">{{ displayMemberEmail(member) }}</td>
                            <td :data-label="$t('Role')">{{ roleLabel(member.organizationRole) }}</td>
                            <td v-if="showStatusColumn" :data-label="$t('Status')">
                                <span :class="statusBadgeClass(member.status, memberStatusToneMap)" role="status">
                                    {{ statusLabel(member.status) }}
                                </span>
                            </td>
                            <td v-if="showMemberMetricsColumns" :data-label="$t('Assignments')">
                                {{ formatAssignmentCount(member) }}
                            </td>
                            <td v-if="showMemberMetricsColumns" :data-label="$t('Joined')">
                                {{ renderJoinedDate(member.joinedAt) }}
                            </td>
                            <td v-if="canManageMembers" :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                <div class="dashboard-actions-inline">
                                    <button
                                        type="button"
                                        class="btn btn-primary action-button"
                                        :disabled="isMemberBusy(member.id)"
                                        :aria-label="$t('Manage member')"
                                        :title="$t('Manage member')"
                                        @click="openManageMember(member)"
                                    >
                                        <i
                                            :class="
                                                isMemberBusy(member.id) ? 'fas fa-spinner fa-spin no-margin' : 'fas fa-sliders-h no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                </div>
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
                :visible="paginationVisible"
                :aria-label="$t('Organization members pagination')"
                @prev="onPaginationPrev"
                @next="onPaginationNext"
            />
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type { MemberItem } from "@/api/definitions";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import OrganizationInviteMemberModal from "@/components/modals/organization/OrganizationInviteMemberModal.vue";
import OrganizationManageMemberModal from "@/components/modals/organization/OrganizationManageMemberModal.vue";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import type { TableCardToolbarTabItem } from "@/components/layout/TableCardToolbarTabs.vue";
import { usePagination } from "@/composables/usePagination";
import { OrganizationController } from "@/control/organization";
import { AppEvents } from "@/control/app-events";
import { canModifyOrganizationMember, memberDisplayName, memberRoleLabel, memberStatusLabel } from "@/utils/org-member-display";
import { ORG_MEMBER_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { getUniqueStringId } from "@/utils/unique-id";
import { renderDate } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";
import { normalizeRouteTabQuery, replaceRouteTab } from "@/utils/route-tab";

type MembersTabId = "active" | "invited";

const MEMBERS_TAB_IDS = ["active", "invited"] as const;

type OrganizationInviteMemberPayload = {
    email: string;
    role: string;
};

export default defineComponent({
    name: "OrganizationMembersPage",
    components: {
        DashboardPageHeader,
        OrganizationInviteMemberModal,
        OrganizationManageMemberModal,
        PaginationBar,
        TableCardToolbar,
    },

    setup: function () {
        const loading = ref(true);
        const pagination = usePagination({ loading });

        return {
            loading,
            loadRequestId: getUniqueStringId(),
            inviteRequestId: getUniqueStringId(),
            memberActionRequestId: getUniqueStringId(),
            pageSize: pagination.pageSize,
            page: pagination.page,
            totalPages: pagination.totalPages,
            paginationVisible: pagination.visible,
            paginationCanGoPrev: pagination.canGoPrev,
            paginationCanGoNext: pagination.canGoNext,
            paginationGoPrev: pagination.goPrev,
            paginationGoNext: pagination.goNext,
            paginationApplyListMeta: pagination.applyListMeta,
            paginationReset: pagination.reset,
        };
    },

    data: function () {
        return {
            memberStatusToneMap: ORG_MEMBER_STATUS_TONE_MAP,
            members: [] as MemberItem[],
            membersForbidden: false,
            activeTab: "active" as MembersTabId,
            displayInviteModal: false,
            inviteEmailError: "",
            inviteSubmitting: false,
            displayManageModal: false,
            managedMembershipId: "",
            actionLoadingId: "",
            organizationContextVersion: 0,
        };
    },

    computed: {
        pageTitle(): string {
            return this.$t("Organization members");
        },

        organizationId(): string {
            void this.organizationContextVersion;
            return OrganizationController.MyOrganization?.id || "";
        },

        canManageMembers(): boolean {
            void this.organizationContextVersion;
            return OrganizationController.isOrganizationAdmin();
        },

        memberTabs(): TableCardToolbarTabItem[] {
            return [
                { id: "active", label: "Active members" },
                { id: "invited", label: "Invited members" },
            ];
        },

        showStatusColumn(): boolean {
            return this.canManageMembers;
        },

        showMemberMetricsColumns(): boolean {
            return this.activeTab !== "invited";
        },

        tableColspan(): number {
            let cols = 3;
            if (this.showStatusColumn) {
                cols += 1;
            }
            if (this.showMemberMetricsColumns) {
                cols += 2;
            }
            if (this.canManageMembers) {
                cols += 1;
            }
            return cols;
        },

        emptyMessage(): string {
            if (this.activeTab === "invited") {
                return this.$t("No invited members found");
            }
            return this.$t("No members found for this organization");
        },

        removeActionLabel(): string {
            if (this.activeTab === "invited") {
                return this.$t("Cancel invitation");
            }
            return this.$t("Remove member");
        },

        managedMember(): MemberItem | null {
            if (!this.managedMembershipId) {
                return null;
            }
            return this.members.find((member) => member.id === this.managedMembershipId) || null;
        },

        managedMemberCanModify(): boolean {
            const member = this.managedMember;
            if (!member) {
                return false;
            }
            return canModifyOrganizationMember(member);
        },
    },

    methods: {
        statusBadgeClass,

        onOrganizationContextChanged: function () {
            this.organizationContextVersion += 1;
            if (!this.organizationId) {
                this.members = [];
                this.loading = false;
                return;
            }
            this.paginationReset();
            if (this.activeTab !== "active") {
                replaceRouteTab(this.$router, this.$route, "active", "active");
                return;
            }
            this.load();
        },

        initialize: async function () {
            await OrganizationController.ensureReady();
            this.organizationContextVersion += 1;
            if (!this.organizationId) {
                this.loading = false;
                return;
            }
            this.load();
        },

        roleLabel: function (role: string): string {
            return memberRoleLabel(role, this.$t.bind(this));
        },

        statusLabel: function (status: string): string {
            return memberStatusLabel(status, this.$t.bind(this));
        },

        displayMemberName: function (member: MemberItem): string {
            return memberDisplayName(member);
        },

        displayMemberEmail: function (member: MemberItem): string {
            const email = ((member.email || "") + "").trim();
            return email || "—";
        },

        renderJoinedDate: function (ts: number): string {
            if (!ts) {
                return "—";
            }
            return renderDate(ts, this.$t);
        },

        formatAssignmentCount: function (member: MemberItem): string {
            const count = Number(member.activeLicenseCount);
            if (!Number.isFinite(count) || count < 0) {
                return "0";
            }
            return String(Math.floor(count));
        },

        isMemberBusy: function (membershipId: string): boolean {
            return !!membershipId && this.actionLoadingId.startsWith(membershipId + ":");
        },

        openManageMember: function (member: MemberItem) {
            this.managedMembershipId = member.id;
            this.displayManageModal = true;
        },

        closeManageMember: function () {
            this.displayManageModal = false;
            this.managedMembershipId = "";
        },

        onManageActivate: function (membershipId: string) {
            const member = this.members.find((item) => item.id === membershipId);
            if (!member) {
                return;
            }
            this.confirmActivateMember(member);
        },

        onManageDeactivate: function (membershipId: string) {
            const member = this.members.find((item) => item.id === membershipId);
            if (!member) {
                return;
            }
            this.confirmDeactivateMember(member);
        },

        onManageRemove: function (membershipId: string) {
            const member = this.members.find((item) => item.id === membershipId);
            if (!member) {
                return;
            }
            this.confirmRemoveMember(member);
        },

        onManageChangeRole: function (membershipId: string, organizationRole: string) {
            const member = this.members.find((item) => item.id === membershipId);
            if (!member) {
                return;
            }
            this.changeMemberRole(membershipId, organizationRole);
        },

        syncTabFromRoute: function (): void {
            const nextTab = normalizeRouteTabQuery(this.$route.query.tab, MEMBERS_TAB_IDS, "active");
            if (this.activeTab === nextTab) {
                return;
            }
            this.activeTab = nextTab;
            this.paginationReset();
            this.closeInviteModal();
            this.closeManageMember();
            this.load();
        },

        onSelectTab: function (tabId: string) {
            if (tabId !== "active" && tabId !== "invited") {
                return;
            }
            if (this.activeTab === tabId) {
                return;
            }
            replaceRouteTab(this.$router, this.$route, tabId as MembersTabId, "active");
        },

        openInviteModal: function () {
            this.inviteEmailError = "";
            this.displayInviteModal = true;
        },

        closeInviteModal: function () {
            this.displayInviteModal = false;
            this.inviteEmailError = "";
        },

        load: function () {
            if (!this.organizationId) {
                this.loading = false;
                return;
            }

            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.membersForbidden = false;

            const listRequest =
                this.canManageMembers && this.activeTab === "invited"
                    ? ApiOrganizations.ListOrganizationInvitedMembers(this.organizationId, {
                          page: this.page,
                          pageSize: this.pageSize,
                      })
                    : ApiOrganizations.ListOrganizationMembers(this.organizationId, {
                          page: this.page,
                          pageSize: this.pageSize,
                      });

            Request.Pending(this.loadRequestId, listRequest)
                .onSuccess((response) => {
                    const items = response.members || [];
                    const totalPages = Math.max(response.totalPages || 1, 1);
                    if (items.length === 0 && this.page > 1 && totalPages > 0) {
                        this.page = Math.min(this.page - 1, totalPages);
                        this.load();
                        return;
                    }
                    this.members = items;
                    this.paginationApplyListMeta({ page: response.page, totalPages });
                    this.loading = false;
                })
                .onCancel(() => {
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.loading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.membersForbidden = true;
                            this.members = [];
                            this.paginationReset();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.members = [];
                            this.paginationReset();
                        },
                        notFound: () => {
                            this.members = [];
                            this.paginationReset();
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
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
                    console.error(err);
                    this.loading = false;
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },

        onPaginationPrev: function (): void {
            if (this.paginationGoPrev()) {
                this.load();
            }
        },

        onPaginationNext: function (): void {
            if (this.paginationGoNext()) {
                this.load();
            }
        },

        submitInvite: function (payload: OrganizationInviteMemberPayload) {
            if (!this.organizationId || !this.canManageMembers || this.inviteSubmitting) {
                return;
            }

            const email = (payload.email || "").trim().toLowerCase();
            if (!email) {
                this.inviteEmailError = this.$t("A valid email is required");
                return;
            }

            this.inviteEmailError = "";
            this.inviteSubmitting = true;
            Request.Abort(this.inviteRequestId);

            Request.Pending(
                this.inviteRequestId,
                ApiOrganizations.InviteOrganizationMember(this.organizationId, {
                    email,
                    organizationRole: payload.role || "Member",
                }),
            )
                .onSuccess(() => {
                    this.inviteSubmitting = false;
                    this.closeInviteModal();
                    this.$showSnackBar(this.$t("Member invited successfully"));
                    if (this.activeTab !== "invited") {
                        replaceRouteTab(this.$router, this.$route, "invited", "active");
                        return;
                    }
                    this.load();
                })
                .onCancel(() => {
                    this.inviteSubmitting = false;
                })
                .onRequestError((err, handleErr) => {
                    this.inviteSubmitting = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidEmail: () => {
                            this.inviteEmailError = this.$t("A valid email is required");
                        },
                        badRequestInvalidRole: () => {
                            this.inviteEmailError = this.$t("Invalid role");
                        },
                        badRequestUserNotFound: () => {
                            this.inviteEmailError = this.$t("No registered user found with this email");
                        },
                        badRequestMemberAlreadyExists: () => {
                            this.inviteEmailError = this.$t("This user is already a member of the organization");
                        },
                        badRequestUserAlreadyInOrganization: () => {
                            this.inviteEmailError = this.$t("This user already belongs to an organization");
                        },
                        badRequestUserHasActiveSubscriptions: () => {
                            this.inviteEmailError = this.$t("This user has active subscriptions and cannot be invited to an organization");
                        },
                        badRequest: () => {
                            this.inviteEmailError = this.$t("Bad request");
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
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
                    this.inviteSubmitting = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        confirmActivateMember: function (member: MemberItem) {
            this.$askUserConfirmation({
                title: this.$t("Activate member"),
                message: this.$t("Do you want to activate this member?"),
                callback: () => {
                    this.activateMember(member.id);
                },
            });
        },

        confirmDeactivateMember: function (member: MemberItem) {
            this.$askUserConfirmation({
                title: this.$t("Deactivate member"),
                message: this.$t("Do you want to deactivate this member?"),
                danger: true,
                deactivateAction: true,
                callback: () => {
                    this.deactivateMember(member.id);
                },
            });
        },

        confirmRemoveMember: function (member: MemberItem) {
            const message =
                this.activeTab === "invited"
                    ? this.$t("Do you want to cancel this invitation?")
                    : this.$t("Do you want to remove this member from the organization?");

            this.$askUserConfirmation({
                title: this.removeActionLabel,
                message,
                danger: true,
                deleteAction: true,
                callback: () => {
                    this.removeMember(member.id);
                },
            });
        },

        activateMember: function (membershipId: string) {
            if (!this.organizationId || !membershipId) {
                return;
            }
            this.actionLoadingId = membershipId + ":activate";
            Request.Abort(this.memberActionRequestId);

            Request.Pending(this.memberActionRequestId, ApiOrganizations.ActivateOrganizationMember(this.organizationId, membershipId))
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    this.$showSnackBar(this.$t("Member activated successfully"));
                    this.load();
                })
                .onCancel(() => {
                    this.actionLoadingId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        notFound: () => {
                            this.load();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.load();
                        },
                        notFoundMembershipNotFound: () => {
                            this.load();
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
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        changeMemberRole: function (membershipId: string, organizationRole: string) {
            if (!this.organizationId || !membershipId) {
                return;
            }
            this.actionLoadingId = membershipId + ":role";
            Request.Abort(this.memberActionRequestId);

            Request.Pending(
                this.memberActionRequestId,
                ApiOrganizations.ChangeOrganizationMemberRole(this.organizationId, membershipId, {
                    organizationRole,
                }),
            )
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    this.$showSnackBar(this.$t("Member role updated successfully"));
                    this.load();
                })
                .onCancel(() => {
                    this.actionLoadingId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                        },
                        badRequestInvalidRole: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Invalid role"));
                        },
                        badRequestCannotChangeOrgCreatorRole: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You cannot change the organization creator's role"));
                        },
                        notFound: () => {
                            this.load();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.load();
                        },
                        notFoundMembershipNotFound: () => {
                            this.load();
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
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        deactivateMember: function (membershipId: string) {
            if (!this.organizationId || !membershipId) {
                return;
            }
            this.actionLoadingId = membershipId + ":deactivate";
            Request.Abort(this.memberActionRequestId);

            Request.Pending(this.memberActionRequestId, ApiOrganizations.DeactivateOrganizationMember(this.organizationId, membershipId))
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    this.$showSnackBar(this.$t("Member deactivated successfully"));
                    this.load();
                })
                .onCancel(() => {
                    this.actionLoadingId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                        },
                        badRequestCannotDeactivateSelf: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You cannot deactivate your own membership"));
                        },
                        badRequestCannotDeactivateOrgCreator: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You cannot deactivate the organization creator"));
                        },
                        notFound: () => {
                            this.load();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.load();
                        },
                        notFoundMembershipNotFound: () => {
                            this.load();
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
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        removeMember: function (membershipId: string) {
            if (!this.organizationId || !membershipId) {
                return;
            }
            this.actionLoadingId = membershipId + ":remove";
            Request.Abort(this.memberActionRequestId);

            Request.Pending(this.memberActionRequestId, ApiOrganizations.RemoveOrganizationMember(this.organizationId, membershipId))
                .onSuccess(() => {
                    this.actionLoadingId = "";
                    const message =
                        this.activeTab === "invited"
                            ? this.$t("The invitation has been cancelled.")
                            : this.$t("A member has been removed from the organization.");
                    this.$showSnackBar(message);
                    this.closeManageMember();
                    this.load();
                })
                .onCancel(() => {
                    this.actionLoadingId = "";
                })
                .onRequestError((err, handleErr) => {
                    this.actionLoadingId = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Bad request"));
                        },
                        badRequestCannotRemoveSelf: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You cannot remove yourself from the organization"));
                        },
                        badRequestCannotRemoveOrgCreator: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You cannot remove the organization creator"));
                        },
                        notFound: () => {
                            this.load();
                        },
                        notFoundOrganizationNotFound: () => {
                            this.load();
                        },
                        notFoundMembershipNotFound: () => {
                            this.load();
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
                    this.actionLoadingId = "";
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },
    },

    mounted: function () {
        AppEvents.AddEventListener("organization-context-changed", this.onOrganizationContextChanged);
        this.syncTabFromRoute();
        void this.initialize();
    },

    beforeUnmount: function () {
        AppEvents.RemoveEventListener("organization-context-changed", this.onOrganizationContextChanged);
        Request.Abort(this.loadRequestId);
        Request.Abort(this.inviteRequestId);
        Request.Abort(this.memberActionRequestId);
    },

    watch: {
        "$route.query.tab": function () {
            this.syncTabFromRoute();
        },
        pageTitle: {
            immediate: true,
            handler(title: string) {
                this.$setSubTitle(title);
            },
        },
        displayInviteModal: function (isOpen: boolean) {
            if (!isOpen) {
                this.inviteEmailError = "";
            }
        },

        displayManageModal: function (isOpen: boolean) {
            if (!isOpen) {
                this.managedMembershipId = "";
            }
        },
    },
});
</script>

<style>
@import "@/style/layout/organization-members-page.css";
@import "@/style/layout/dashboard-data-pages.css";
</style>
