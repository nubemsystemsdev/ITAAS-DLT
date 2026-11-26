<template>
    <ModalDialogContainer
        ref="modalContainer"
        v-model:display="displayStatus"
        :lock-close="(showLicenseAssignments && assignmentsLoading) || actionInProgress"
    >
        <div class="modal-dialog modal-lg organization-manage-member-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Manage member") }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    :disabled="(showLicenseAssignments && assignmentsLoading) || actionInProgress"
                    @click="close"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="member" class="modal-body modal-detail-body organization-manage-member-modal__body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <p class="modal-detail-amount">{{ memberTitle }}</p>
                        <p v-if="memberSubtitle" class="modal-detail-meta">{{ memberSubtitle }}</p>
                    </div>
                    <span :class="statusBadgeClass(member.status, memberStatusToneMap)" role="status">
                        {{ statusLabel(member.status) }}
                    </span>
                </div>

                <div class="modal-message-grid" role="table" :aria-label="$t('Member details')">
                    <div v-for="row in memberDetailRows" :key="row.id" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <p class="modal-message-value" role="cell">{{ row.value }}</p>
                    </div>
                </div>

                <section v-if="showRoleEditor" class="organization-manage-member-modal__role-editor" :aria-labelledby="roleEditorHeadingId">
                    <h3 :id="roleEditorHeadingId" class="organization-manage-member-modal__section-title">
                        {{ $t("Change role") }}
                    </h3>
                    <div class="form-group organization-manage-member-modal__role-field">
                        <label :for="roleSelectId">{{ $t("Role") }}</label>
                        <select
                            :id="roleSelectId"
                            v-model="selectedRole"
                            class="form-control form-control-full-width form-select"
                            :disabled="actionInProgress"
                        >
                            <option value="Member">{{ $t("Member") }}</option>
                            <option value="Admin">{{ $t("Organization admin") }}</option>
                        </select>
                    </div>
                </section>

                <section
                    v-if="showLicenseAssignments"
                    class="organization-manage-member-modal__assignments"
                    :aria-labelledby="assignmentsHeadingId"
                >
                    <h3 :id="assignmentsHeadingId" class="organization-manage-member-modal__section-title">
                        {{ $t("License assignments") }}
                    </h3>

                    <p v-if="assignmentsLoading" class="organization-manage-member-modal__hint">{{ $t("Loading") }}...</p>
                    <p
                        v-else-if="assignmentsError"
                        class="organization-manage-member-modal__hint organization-manage-member-modal__hint--error"
                    >
                        {{ assignmentsError }}
                    </p>
                    <p v-else-if="memberAssignments.length === 0" class="organization-manage-member-modal__hint">
                        {{ $t("No license assignments for this member") }}
                    </p>

                    <div v-else class="organization-manage-member-modal__table-wrap">
                        <table class="table table-stack organization-manage-member-modal__table">
                            <thead>
                                <tr>
                                    <th scope="col" class="organization-manage-member-modal__col-product">
                                        {{ $t("Product or service") }}
                                    </th>
                                    <th scope="col" class="organization-manage-member-modal__col-assigned">
                                        {{ $t("Assigned") }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="assignment in memberAssignments" :key="assignment.id">
                                    <td
                                        :data-label="$t('Product or service')"
                                        class="organization-manage-member-modal__col-product table-stack-row-primary"
                                    >
                                        {{ assignment.productName }}
                                    </td>
                                    <td :data-label="$t('Assigned')" class="organization-manage-member-modal__col-assigned">
                                        {{ assignment.assignedAtLabel }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div class="modal-footer organization-manage-member-modal__footer">
                <button type="button" class="btn btn-tertiary" :disabled="actionInProgress" @click="close">
                    {{ $t("Close") }}
                </button>
                <template v-if="canModify && member">
                    <button
                        v-if="showChangeRoleAction"
                        type="button"
                        class="btn btn-primary"
                        :disabled="actionInProgress"
                        @click="submitRoleChange"
                    >
                        <i :class="isActionLoading('role') ? 'fas fa-spinner fa-spin' : 'fas fa-user-tag'" aria-hidden="true"></i>
                        {{ $t("Change role") }}
                    </button>
                    <button
                        v-if="showActivateAction"
                        type="button"
                        class="btn btn-primary"
                        :disabled="actionInProgress"
                        @click="$emit('activate', member.id)"
                    >
                        <i :class="isActionLoading('activate') ? 'fas fa-spinner fa-spin' : 'fas fa-user-check'" aria-hidden="true"></i>
                        {{ $t("Activate") }}
                    </button>
                    <button
                        v-if="showDeactivateAction"
                        type="button"
                        class="btn btn-tertiary"
                        :disabled="actionInProgress"
                        @click="$emit('deactivate', member.id)"
                    >
                        <i :class="isActionLoading('deactivate') ? 'fas fa-spinner fa-spin' : 'fas fa-user-slash'" aria-hidden="true"></i>
                        {{ $t("Deactivate") }}
                    </button>
                    <button type="button" class="btn btn-danger" :disabled="actionInProgress" @click="$emit('remove', member.id)">
                        <i :class="isActionLoading('remove') ? 'fas fa-spinner fa-spin' : 'fas fa-trash-alt'" aria-hidden="true"></i>
                        {{ removeActionLabel }}
                    </button>
                </template>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { Request, RequestParams } from "@asanrom/request-browser";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type { LicenseAssignmentItem, MemberItem, OrgLicensesListResponse } from "@/api/definitions";
import { OrganizationController } from "@/control/organization";
import { useVModel } from "@/utils/v-model";
import {
    canChangeOrganizationMemberRole,
    isActiveMemberStatus,
    isInactiveMemberStatus,
    memberDisplayName,
    memberRoleLabel,
    memberStatusLabel,
} from "@/utils/org-member-display";
import { ORG_MEMBER_STATUS_TONE_MAP, statusBadgeClass } from "@/utils/status-badge";
import { formatSubscriptionItemDisplayName } from "@/utils/subscription-domain";
import { renderDate } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";

type MembersTabId = "active" | "invited";

type MemberAssignmentRow = {
    id: string;
    productName: string;
    assignedAtLabel: string;
};

type MemberDetailRow = {
    id: string;
    label: string;
    value: string;
};

export default defineComponent({
    name: "OrganizationManageMemberModal",
    components: {
        ModalDialogContainer,
    },

    emits: ["update:display", "activate", "deactivate", "remove", "change-role"],

    props: {
        display: {
            type: Boolean,
            default: false,
        },
        member: {
            type: Object as PropType<MemberItem | null>,
            default: null,
        },
        organizationId: {
            type: String,
            default: "",
        },
        activeTab: {
            type: String as PropType<MembersTabId>,
            default: "active",
        },
        canModify: {
            type: Boolean,
            default: false,
        },
        actionLoadingId: {
            type: String,
            default: "",
        },
    },

    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
            assignmentsRequestId: getUniqueStringId(),
        };
    },

    data: function () {
        return {
            memberStatusToneMap: ORG_MEMBER_STATUS_TONE_MAP,
            assignmentsLoading: false,
            assignmentsError: "",
            memberAssignments: [] as MemberAssignmentRow[],
            assignmentsHeadingId: `org-member-assignments-${getUniqueStringId()}`,
            roleEditorHeadingId: `org-member-role-editor-${getUniqueStringId()}`,
            roleSelectId: `org-manage-member-role-${getUniqueStringId()}`,
            selectedRole: "Member",
        };
    },

    computed: {
        actionInProgress: function (): boolean {
            const memberId = this.member?.id || "";
            return !!memberId && this.actionLoadingId.startsWith(memberId + ":");
        },

        memberTitle: function (): string {
            if (!this.member) {
                return "";
            }
            return memberDisplayName(this.member);
        },

        memberSubtitle: function (): string {
            return ((this.member?.email || "") + "").trim() || "—";
        },

        isCreator: function (): boolean {
            if (!this.member?.userId) {
                return false;
            }
            return OrganizationController.isOrganizationCreator(this.member.userId);
        },

        memberDetailRows: function (): MemberDetailRow[] {
            if (!this.member) {
                return [];
            }

            const orgJoinedLabel = this.activeTab === "invited" ? String(this.$t("Invited on")) : String(this.$t("Joined organization"));

            const rows: MemberDetailRow[] = [
                {
                    id: "email",
                    label: String(this.$t("Email")),
                    value: ((this.member.email || "") + "").trim() || "—",
                },
                ...(this.showRoleEditor
                    ? []
                    : [
                          {
                              id: "role",
                              label: String(this.$t("Role")),
                              value: memberRoleLabel(this.member.organizationRole, this.$t.bind(this)),
                          },
                      ]),
                {
                    id: "joined",
                    label: orgJoinedLabel,
                    value: this.member.joinedAt ? renderDate(this.member.joinedAt, this.$t) : "—",
                },
            ];

            if (this.isCreator) {
                rows.push({
                    id: "creator",
                    label: String(this.$t("Organization creator")),
                    value: String(this.$t("Yes")),
                });
            }

            return rows;
        },

        removeActionLabel: function (): string {
            if (this.activeTab === "invited") {
                return String(this.$t("Cancel invitation"));
            }
            return String(this.$t("Remove"));
        },

        showActivateAction: function (): boolean {
            return this.activeTab === "active" && !!this.member && isInactiveMemberStatus(this.member.status);
        },

        showDeactivateAction: function (): boolean {
            return this.activeTab === "active" && !!this.member && isActiveMemberStatus(this.member.status);
        },

        showLicenseAssignments: function (): boolean {
            return this.activeTab !== "invited";
        },

        showRoleEditor: function (): boolean {
            return this.canModify && !!this.member && canChangeOrganizationMemberRole(this.member);
        },

        roleHasChanges: function (): boolean {
            if (!this.member) {
                return false;
            }
            const current = ((this.member.organizationRole || "") + "").trim();
            return this.selectedRole !== current;
        },

        showChangeRoleAction: function (): boolean {
            return this.showRoleEditor && this.roleHasChanges;
        },
    },

    methods: {
        statusBadgeClass,

        statusLabel: function (status: string): string {
            return memberStatusLabel(status, this.$t.bind(this));
        },

        isActionLoading: function (kind: "activate" | "deactivate" | "remove" | "role"): boolean {
            const memberId = this.member?.id || "";
            return this.actionLoadingId === memberId + ":" + kind;
        },

        close: function (): void {
            if (this.actionInProgress) {
                return;
            }
            this.$closeModal();
        },

        stopPropagationEvent: function (e: Event): void {
            e.stopPropagation();
        },

        resetAssignmentsState: function (): void {
            this.assignmentsLoading = false;
            this.assignmentsError = "";
            this.memberAssignments = [];
        },

        syncSelectedRole: function (): void {
            const role = ((this.member?.organizationRole || "") + "").trim();
            this.selectedRole = role === "Admin" || role.toLowerCase() === "admin" ? "Admin" : "Member";
        },

        submitRoleChange: function (): void {
            if (!this.member?.id || !this.showChangeRoleAction || this.actionInProgress) {
                return;
            }
            this.$emit("change-role", this.member.id, this.selectedRole);
        },

        loadAssignments: function (): void {
            if (!this.showLicenseAssignments || !this.display || !this.organizationId || !this.member?.userId) {
                return;
            }

            Request.Abort(this.assignmentsRequestId);
            this.assignmentsLoading = true;
            this.assignmentsError = "";
            this.memberAssignments = [];

            void this.fetchAllLicenses()
                .then((licenses) => {
                    if (!this.display || !this.member?.userId) {
                        return;
                    }

                    this.memberAssignments = licenses.map((license) => this.toAssignmentRow(license));
                    this.assignmentsLoading = false;
                })
                .catch(() => {
                    if (!this.display) {
                        return;
                    }
                    this.assignmentsLoading = false;
                    this.assignmentsError = String(this.$t("Unable to load license assignments"));
                });
        },

        fetchAllLicenses: function (): Promise<LicenseAssignmentItem[]> {
            const userId = (this.member?.userId || "").trim();
            if (!userId) {
                return Promise.resolve([]);
            }
            return this.fetchAllPaginated<OrgLicensesListResponse, LicenseAssignmentItem>(
                (page) =>
                    ApiOrganizations.ListOrganizationLicenses(this.organizationId, {
                        page,
                        userId,
                    }),
                (response) => response.licenses || [],
            );
        },

        fetchAllPaginated: function <T extends { totalPages: number }, R>(
            buildRequest: (page: number) => RequestParams<T, unknown>,
            pickItems: (response: T) => R[],
        ): Promise<R[]> {
            const loadPage = (page: number, acc: R[]): Promise<R[]> => {
                return new Promise((resolve, reject) => {
                    Request.Pending(this.assignmentsRequestId, buildRequest(page))
                        .onSuccess((response) => {
                            const typed = response as T;
                            const next = [...acc, ...pickItems(typed)];
                            const totalPages = Math.max(typed.totalPages || 1, 1);
                            if (page >= totalPages) {
                                resolve(next);
                                return;
                            }
                            void loadPage(page + 1, next)
                                .then(resolve)
                                .catch(reject);
                        })
                        .onCancel(() => {
                            resolve(acc);
                        })
                        .onRequestError((_err, handleErr) => {
                            handleErr(_err, {
                                unauthorized: () => reject(new Error("unauthorized")),
                                forbidden: () => reject(new Error("forbidden")),
                                temporalError: () => reject(new Error("temporal")),
                                networkError: () => reject(new Error("network")),
                                serverError: () => reject(new Error("server")),
                            });
                        })
                        .onUnexpectedError((err) => {
                            reject(err);
                        });
                });
            };

            return loadPage(1, []);
        },

        toAssignmentRow: function (license: LicenseAssignmentItem): MemberAssignmentRow {
            const productName = formatSubscriptionItemDisplayName(license.productName, license.licensePoolId || license.subscriptionId);

            return {
                id: license.id,
                productName,
                assignedAtLabel: license.assignedAt ? renderDate(license.assignedAt, this.$t) : "—",
            };
        },
    },

    beforeUnmount: function () {
        Request.Abort(this.assignmentsRequestId);
    },

    watch: {
        display: function (isOpen: boolean) {
            if (isOpen) {
                this.syncSelectedRole();
                this.resetAssignmentsState();
                this.$nextTick(() => {
                    if (this.showLicenseAssignments) {
                        this.loadAssignments();
                    }
                    this.$autoFocus();
                });
                return;
            }
            Request.Abort(this.assignmentsRequestId);
            this.resetAssignmentsState();
        },

        member: function () {
            if (this.display) {
                this.syncSelectedRole();
            }
            if (this.display && this.showLicenseAssignments) {
                this.loadAssignments();
            }
        },

        organizationId: function () {
            if (this.display && this.showLicenseAssignments) {
                this.loadAssignments();
            }
        },

        activeTab: function () {
            if (!this.display) {
                return;
            }
            Request.Abort(this.assignmentsRequestId);
            this.resetAssignmentsState();
            if (this.showLicenseAssignments) {
                this.loadAssignments();
            }
        },
    },
});
</script>

<style scoped>
.organization-manage-member-modal {
    max-width: 720px;
    box-sizing: border-box;
}

.organization-manage-member-modal__body {
    gap: var(--space-24);
}

.organization-manage-member-modal__section-title {
    margin: 0;
    font-size: 18px;
    line-height: 26px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.organization-manage-member-modal__assignments,
.organization-manage-member-modal__role-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
}

.organization-manage-member-modal__role-field {
    margin: 0;
}

.organization-manage-member-modal__hint {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.organization-manage-member-modal__hint--error {
    color: var(--color-feedback-error);
}

.organization-manage-member-modal__table-wrap {
    width: 100%;
    overflow-x: auto;
}

.organization-manage-member-modal__table {
    width: 100%;
    min-width: 0;
    margin-bottom: 0;
    table-layout: fixed;
}

.organization-manage-member-modal__col-product {
    width: auto;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.organization-manage-member-modal__col-assigned {
    width: 40%;
    white-space: nowrap;
    text-align: right;
}

.organization-manage-member-modal__footer {
    flex-wrap: wrap;
    gap: var(--space-12);
    align-items: center;
}
</style>
