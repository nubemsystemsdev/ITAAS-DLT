<template>
    <div class="itaas-platform-credentials">
        <header class="itaas-platform-panel-header itaas-platform-panel-header--with-actions">
            <div class="itaas-platform-panel-header__content">
                <h2 class="details-view-panel-title">{{ $t("Workspace credentials") }}</h2>
                <p class="dashboard-page-header__subtitle">
                    {{ $t("Review saved credentials, see assigned flows, and overwrite secrets from the details.") }}
                </p>
            </div>
            <button
                type="button"
                class="btn btn-tertiary toolbar-action-btn"
                :aria-label="$t('Refresh')"
                :title="$t('Refresh')"
                :disabled="loadingCatalog"
                @click="reloadAll"
            >
                <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
            </button>
        </header>

        <p v-if="loadingCatalog" class="table-feedback">{{ $t("Loading") }}...</p>
        <p v-else-if="accessDenied" class="table-feedback">
            {{ $t("Active ITAAS subscription or assigned organization license is required") }}
        </p>
        <p v-else-if="catalogError" class="form-error" role="alert">{{ $t(catalogError) }}</p>
        <p v-else-if="flows.length === 0" class="table-feedback">{{ $t("No flows available for credential mapping") }}</p>
        <p v-else-if="credentialTypeGroups.length === 0" class="itaas-platform-info-text">
            {{ $t("No credentials saved yet.") }}
        </p>

        <ul v-else class="itaas-platform-credentials-grid">
            <li v-for="group in credentialTypeGroups" :key="group.credentialType" class="itaas-platform-credential-card">
                <header class="itaas-platform-credential-card__header">
                    <div class="itaas-platform-credential-card__intro">
                        <h3 class="itaas-platform-credential-card__title" :title="groupTitle(group)">
                            {{ groupTitle(group) }}
                        </h3>
                        <p class="itaas-platform-credential-card__meta">
                            {{ savedCredentialsLabel(group.credentials.length) }}
                            <template v-if="group.assignedFlowCount > 0"> · {{ assignedFlowsLabel(group.assignedFlowCount) }} </template>
                        </p>
                    </div>
                    <button
                        type="button"
                        class="btn btn-tertiary btn-sm itaas-platform-credential-card__action"
                        :aria-label="groupActionLabel(group) + ': ' + groupTitle(group)"
                        :title="groupActionLabel(group)"
                        @click="openCredentialDetail(group.credentialType)"
                    >
                        {{ groupActionLabel(group) }}
                    </button>
                </header>
            </li>
        </ul>

        <ItaasPlatformCredentialDetailModal
            v-if="displayCredentialDetailModal"
            v-model:display="displayCredentialDetailModal"
            :credentials="detailTypeCredentials"
            :credential-type="detailTypeGroup?.credentialType || ''"
            :credential-label="detailTypeGroup?.label || ''"
            :credential-fields="detailTypeGroup?.fields || []"
            :schema-conflict="detailTypeGroup?.schemaConflict || false"
            :flows="flows"
            @saved="reloadCatalog"
        />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import ItaasPlatformCredentialDetailModal from "@/components/modals/ItaasPlatformCredentialDetailModal.vue";
import {
    UNKNOWN_WORKSPACE_CREDENTIAL_TYPE,
    groupWorkspaceCredentialsByType,
    useItaasWorkspaceCredentials,
    type WorkspaceCredentialEntry,
    type WorkspaceCredentialTypeGroup,
} from "@/composables/useItaasWorkspaceCredentials";
import { readRouteTabQuery } from "@/utils/route-tab";

export default defineComponent({
    name: "ItaasPlatformCredentialsSection",
    components: {
        ItaasPlatformCredentialDetailModal,
    },
    setup: function () {
        const workspaceCredentials = useItaasWorkspaceCredentials();

        return {
            flows: workspaceCredentials.flows,
            accessDenied: workspaceCredentials.accessDenied,
            credentials: workspaceCredentials.credentials,
            credentialTypes: workspaceCredentials.credentialTypes,
            loadingCatalog: workspaceCredentials.loading,
            catalogError: workspaceCredentials.loadError,
            loadWorkspaceCredentials: workspaceCredentials.loadWorkspaceCredentials,
            abortWorkspaceCredentials: workspaceCredentials.abortWorkspaceCredentials,
        };
    },
    data: function () {
        return {
            detailCredentialType: "",
            displayCredentialDetailModal: false,
        };
    },
    computed: {
        credentialTypeGroups: function (): WorkspaceCredentialTypeGroup[] {
            return groupWorkspaceCredentialsByType(this.credentials, this.credentialTypes);
        },
        detailTypeGroup: function (): WorkspaceCredentialTypeGroup | null {
            const credentialType = (this.detailCredentialType || "").trim();
            if (!credentialType) {
                return null;
            }
            return (
                this.credentialTypeGroups.find(function (group: WorkspaceCredentialTypeGroup) {
                    return group.credentialType === credentialType;
                }) || null
            );
        },
        detailTypeCredentials: function (): WorkspaceCredentialEntry[] {
            if (!this.detailTypeGroup) {
                return [];
            }
            return this.detailTypeGroup.credentials;
        },
    },
    methods: {
        redirectFlowIdToDetail: function (): boolean {
            const flowId = readRouteTabQuery(this.$route.query.flowId);
            if (!flowId) {
                return false;
            }

            void this.$router.replace({
                name: "itaas-platform-flow-detail",
                params: { flowId: flowId },
            });
            return true;
        },
        groupTitle: function (group: WorkspaceCredentialTypeGroup): string {
            const title = (group.label || "").trim();
            if (title) {
                return title;
            }
            if (group.credentialType === UNKNOWN_WORKSPACE_CREDENTIAL_TYPE) {
                return this.$t("Unknown credential type");
            }
            return (group.credentialType || "").trim();
        },
        groupActionLabel: function (group: WorkspaceCredentialTypeGroup): string {
            return group.credentials.length > 0 || group.schemaConflict ? this.$t("View details") : this.$t("Create new credential");
        },
        savedCredentialsLabel: function (count: number): string {
            return this.$t("{0} saved credential(s)").replace("{0}", String(count));
        },
        assignedFlowsLabel: function (count: number): string {
            return this.$t("Assigned to {0} flow(s)").replace("{0}", String(count));
        },
        openCredentialDetail: function (credentialType: string): void {
            const typeKey = (credentialType || "").trim();
            if (!typeKey) {
                return;
            }
            this.detailCredentialType = typeKey;
            this.displayCredentialDetailModal = true;
        },
        reloadCatalog: function (): void {
            this.loadWorkspaceCredentials({
                onUnauthorized: () => {
                    this.$requireLogin();
                },
            });
        },
        reloadAll: function (): void {
            this.reloadCatalog();
        },
    },
    mounted: function () {
        if (this.redirectFlowIdToDetail()) {
            return;
        }
        this.reloadAll();
    },
    beforeUnmount: function () {
        this.abortWorkspaceCredentials();
    },
    watch: {
        "$route.query.flowId": function (): void {
            this.redirectFlowIdToDetail();
        },
        displayCredentialDetailModal: function (isOpen: boolean): void {
            if (!isOpen) {
                this.detailCredentialType = "";
            }
        },
        credentials: {
            deep: true,
            handler: function (): void {
                if (!this.displayCredentialDetailModal || !this.detailCredentialType) {
                    return;
                }
                if (!this.detailTypeGroup) {
                    this.displayCredentialDetailModal = false;
                    this.detailCredentialType = "";
                }
            },
        },
    },
});
</script>
