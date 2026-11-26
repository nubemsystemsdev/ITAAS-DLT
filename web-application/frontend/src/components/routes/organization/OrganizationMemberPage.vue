<template>
    <div class="page-content org-member-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Organization')"
            :title="$t('My membership')"
            :subtitle="$t('View your membership and assigned resources')"
        />

        <section class="dashboard-section-card dashboard-list-card">
            <div class="org-member-header">
                <div class="org-member-info">
                    <h2 class="org-member-name">{{ organizationName }}</h2>
                    <p class="org-member-joined">{{ $t("Role") }}: {{ userRole }} · {{ $t("Joined") }}: {{ joinedDate }}</p>
                </div>
                <button type="button" class="btn btn-danger" :disabled="leaving" @click="confirmLeave">
                    <i v-if="leaving" class="fas fa-spinner fa-spin icon-margin" aria-hidden="true"></i>
                    <i v-else class="fas fa-sign-out-alt icon-margin" aria-hidden="true"></i>
                    {{ $t("Leave organization") }}
                </button>
            </div>

            <ComponentLoader v-if="loading" />

            <section v-else-if="hasError" class="licenses-state">
                <h2>{{ $t("Could not load your assigned resources right now.") }}</h2>
                <p>{{ $t("Please try again in a few seconds.") }}</p>
                <button type="button" class="btn btn-primary" @click="loadPageData">{{ $t("Retry load") }}</button>
            </section>

            <section v-else-if="!assignedResources.length" class="licenses-state">
                <h2>{{ $t("No assigned resources") }}</h2>
                <p>{{ $t("You have not been assigned any agents, products or licenses in this organization yet.") }}</p>
            </section>

            <section v-else class="license-list" :aria-label="$t('Assigned resources')">
                <ul>
                    <li v-for="resource in assignedResources" :key="resource.id" class="license-item">
                        <div class="license-icon" :class="resource.toneClass">{{ resource.initials }}</div>
                        <div class="license-info-left">
                            <div class="license-name">{{ resource.name }}</div>
                            <div class="license-meta">
                                <span>{{ $t(resource.typeLabelKey) }}</span>
                            </div>
                        </div>
                        <div class="license-info-right">
                            <strong class="license-status-badge" :class="resource.statusClass">{{ $t(resource.statusLabelKey) }}</strong>
                            <span v-if="resource.assignedAt" class="license-assigned">{{ formatAssignedDate(resource.assignedAt) }}</span>
                        </div>
                    </li>
                </ul>
            </section>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type { LicenseAssignmentItem } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { OrganizationController } from "@/control/organization";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { memberRoleLabel } from "@/utils/org-member-display";
import { renderDate } from "@/utils/time-utils";
import { Timeouts } from "@/utils/timeout";
import { AppEvents } from "@/control/app-events";

const PRODUCT_TONE_COUNT = 6;

interface AssignedResource {
    id: string;
    name: string;
    initials: string;
    toneClass: string;
    typeLabelKey: "License";
    statusLabelKey: "Active" | "Inactive";
    statusClass: string;
    assignedAt: LicenseAssignmentItem["assignedAt"] | null;
    isActive: boolean;
}

function normalizeString(value: unknown): string {
    return String(value || "").trim();
}

function computeInitials(value: string): string {
    const parts = normalizeString(value).split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "?";
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

export default defineComponent({
    name: "OrganizationMemberPage",
    components: {
        ComponentLoader,
        DashboardPageHeader,
    },
    setup: function () {
        return {
            licensesRequestId: getUniqueStringId(),
            leaveRequestId: getUniqueStringId(),
            retryTimeoutId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,
            hasError: false,
            leaving: false,
            loadVersion: 0,
            organizationContextVersion: 0,
            assignedResources: [] as AssignedResource[],
        };
    },
    computed: {
        pageTitle(): string {
            return this.$t("My membership");
        },

        organizationId(): string {
            void this.organizationContextVersion;
            return OrganizationController.MyOrganization?.id || "";
        },

        organizationName(): string {
            void this.organizationContextVersion;
            const name = OrganizationController.MyOrganization?.companyName || "";
            return name || this.$t("Organization");
        },

        userRole(): string {
            void this.organizationContextVersion;
            const role = OrganizationController.MyOrganization?.currentUserOrganizationRole || "";
            return memberRoleLabel(role, this.$t.bind(this));
        },

        joinedDate(): string {
            void this.organizationContextVersion;
            const ts = OrganizationController.MyOrganization?.currentUserJoinedAt;
            if (!ts) {
                return "—";
            }
            return renderDate(ts, this.$t);
        },
    },
    methods: {
        resetPageState: function (): void {
            this.hasError = false;
            this.assignedResources = [];
        },

        onOrganizationContextChanged: function (): void {
            this.organizationContextVersion += 1;

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
            void this.loadPageData();
        },

        loadPageData: function (): void {
            if (!this.organizationId) {
                this.loading = false;
                this.resetPageState();
                return;
            }

            this.loadVersion += 1;
            const currentLoadVersion = this.loadVersion;

            Request.Abort(this.licensesRequestId);
            this.loading = true;
            this.hasError = false;

            Request.Pending(
                this.licensesRequestId,
                ApiOrganizations.ListOrganizationLicenses(this.organizationId, {
                    userId: AuthController.UID,
                }),
            )
                .onSuccess((response) => {
                    if (currentLoadVersion !== this.loadVersion) {
                        return;
                    }
                    const licenses = (response.licenses || []).filter((license) => license && license.isActive !== false);
                    this.assignedResources = licenses.map((license, index) => this.buildAssignedResource(license, index));
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
                            this.hasError = true;
                            this.assignedResources = [];
                        },
                        notFoundOrganizationNotFound: () => {
                            this.assignedResources = [];
                        },
                        notFound: () => {
                            this.assignedResources = [];
                        },
                        temporalError: () => {
                            this.hasError = true;
                            Timeouts.Set(this.retryTimeoutId, 1500, this.loadPageData.bind(this));
                        },
                        networkError: () => {
                            this.hasError = true;
                        },
                        serverError: () => {
                            this.hasError = true;
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    this.loading = false;
                    this.hasError = true;
                });
        },

        formatAssignedDate: function (assignedAt: LicenseAssignmentItem["assignedAt"] | null): string {
            if (!assignedAt) {
                return "";
            }
            return this.$t("Assigned") + " " + renderDate(assignedAt, this.$t);
        },

        buildAssignedResource: function (license: LicenseAssignmentItem, index: number): AssignedResource {
            const rawId = normalizeString(license.id);
            const rawSubscriptionId = normalizeString(license.subscriptionId);
            const productName = normalizeString(license.productName) || rawSubscriptionId || rawId || `${this.$t("License")} ${index + 1}`;
            const resourceId = rawId || rawSubscriptionId || `license-${index + 1}`;
            const initials = computeInitials(productName);
            const toneClass = toneClassFromString(resourceId || productName);
            const isActive = license.isActive !== false;
            const statusLabelKey = isActive ? "Active" : "Inactive";
            const statusClass = isActive ? "license-tone-4" : "license-tone-6";

            return {
                id: resourceId,
                name: productName,
                initials,
                toneClass,
                typeLabelKey: "License",
                statusLabelKey,
                statusClass,
                assignedAt: license.assignedAt || null,
                isActive,
            };
        },

        confirmLeave: function () {
            this.$askUserConfirmation({
                title: this.$t("Leave organization"),
                message: this.$t(
                    "Are you sure you want to leave this organization? All your assigned licenses will be revoked and you will lose access to the organization's resources.",
                ),
                callback: () => {
                    this.leaveOrganization();
                },
            });
        },

        leaveOrganization: function () {
            if (this.leaving) {
                return;
            }

            this.leaving = true;
            Request.Abort(this.leaveRequestId);

            Request.Pending(this.leaveRequestId, ApiOrganizations.LeaveOrganization())
                .onSuccess(() => {
                    this.$showSnackBar(this.$t("You have left the organization"));
                    void OrganizationController.Refresh().then(() => {
                        if (this.$router) {
                            void this.$router.push({ name: "dashboard" });
                        }
                    });
                })
                .onCancel(() => {
                    this.leaving = false;
                })
                .onRequestError((err, handleErr) => {
                    this.leaving = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestNotAMember: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("You are not an active member of any organization"));
                        },
                        badRequestCannotLeaveAsCreator: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("The organization creator cannot leave the organization"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not leave the organization"));
                        },
                        notFoundMembershipNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Membership not found"));
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not leave the organization"));
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not leave the organization"));
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
                    this.leaving = false;
                    this.$showMessageModal(this.$t("Error"), err instanceof Error ? err.message : this.$t("Internal server error"));
                });
        },
    },
    mounted: function () {
        AppEvents.AddEventListener("organization-context-changed", this.onOrganizationContextChanged);
        void this.initialize();
    },
    beforeUnmount: function () {
        AppEvents.RemoveEventListener("organization-context-changed", this.onOrganizationContextChanged);
        Request.Abort(this.licensesRequestId);
        Request.Abort(this.leaveRequestId);
        Timeouts.Abort(this.retryTimeoutId);
    },
    watch: {
        pageTitle: {
            immediate: true,
            handler(title: string) {
                this.$setSubTitle(title);
            },
        },
    },
});
</script>

<style>
@import "@/style/layout/organization-member-page.css";
@import "@/style/layout/organization-license-page.css";
</style>
