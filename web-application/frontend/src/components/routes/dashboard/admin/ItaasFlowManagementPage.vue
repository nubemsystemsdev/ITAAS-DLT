<template>
    <div class="page-content itaas-flow-admin-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Control')"
            :title="$t('ITAAS flow management')"
            :subtitle="$t('Publish flows globally or assign them to workspaces.')"
        />

        <section class="dashboard-section-card">
            <TableCardToolbar
                :tabs="visibilityTabs"
                :active-tab="visibilityFilter"
                :tablist-label="$t('Flow visibility filters')"
                tab-panel-id="itaas-flow-admin-panel"
                :tabs-disabled="loading || mutationBusy"
                :filters-collapsed="filtersCollapsed"
                show-filters-toggle
                :filters-toggle-disabled="loading || mutationBusy"
                @select="selectVisibilityFilter"
                @update:filtersCollapsed="onFiltersCollapsedUpdate"
            >
                <template #actions>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn"
                        :disabled="loading || mutationBusy"
                        :title="$t('Refresh')"
                        :aria-label="$t('Refresh')"
                        @click="loadFlows"
                    >
                        <i class="fas fa-arrow-rotate-right no-margin" aria-hidden="true"></i>
                    </button>
                </template>
                <template #filters>
                    <label class="toolbar-plan-filter" for="itaas-flow-admin-search">
                        <span class="toolbar-plan-label">{{ $t("Search by name") }}</span>
                        <input
                            id="itaas-flow-admin-search"
                            v-model="draftSearchQuery"
                            type="search"
                            class="toolbar-plan-select"
                            :placeholder="$t('Search by name')"
                            :disabled="loading || mutationBusy"
                            @keydown.enter.prevent="applySearchFilter"
                        />
                    </label>
                    <button
                        type="button"
                        class="btn btn-primary toolbar-action-btn toolbar-apply-btn"
                        :disabled="loading || mutationBusy"
                        @click="applySearchFilter"
                    >
                        <i class="fas fa-check" aria-hidden="true"></i>
                        {{ $t("Apply filters") }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-tertiary toolbar-action-btn toolbar-clear-btn"
                        :disabled="loading || mutationBusy"
                        @click="clearSearchFilter"
                    >
                        <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
                        {{ $t("Clear filters") }}
                    </button>
                </template>
            </TableCardToolbar>

            <div
                id="itaas-flow-admin-panel"
                class="table-responsive"
                role="tabpanel"
                :aria-labelledby="'itaas-flow-admin-panel-tab-' + visibilityFilter"
            >
                <table class="table table-wide table-stack table-stack--single-col-mobile itaas-flow-admin-table">
                    <thead>
                        <tr>
                            <th scope="col" class="itaas-flow-admin-col-name">{{ $t("Name") }}</th>
                            <th scope="col" class="td-shrink">{{ $t("Flow ID") }}</th>
                            <th scope="col" class="td-shrink">{{ $t("Deployed") }}</th>
                            <th scope="col" class="td-shrink">{{ $t("Visibility") }}</th>
                            <th scope="col" class="td-shrink">{{ $t("Workspaces") }}</th>
                            <th scope="col" class="itaas-flow-admin-col-graph td-shrink">
                                {{ $t("Graph") }}
                                <span class="itaas-flow-admin-graph-header-control itaas-flow-admin-graph-header-info">
                                    <InfoTooltip
                                        :content="$t('When enabled, users can preview the flow graph. Administrators always see it.')"
                                    />
                                </span>
                                <span class="itaas-flow-admin-graph-header-control itaas-flow-admin-graph-header-switch">
                                    <ToggleSwitch
                                        class="itaas-flow-admin-graph-toggle"
                                        :val="allFilteredGraphsVisible"
                                        :disabled="graphMasterToggleDisabled"
                                        :title="graphMasterToggleLabel"
                                        :aria-label="graphMasterToggleLabel"
                                        @update:val="askSetFilteredFlowsGraphVisibility"
                                    >
                                        {{ $t("Show graph to users") }}
                                    </ToggleSwitch>
                                </span>
                            </th>
                            <th scope="col" class="text-right td-shrink">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="loading">
                        <tr>
                            <td colspan="7" class="table-feedback">{{ $t("Loading") }}...</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-if="filteredFlows.length === 0">
                            <td colspan="7" class="table-feedback">{{ $t("No flows found") }}</td>
                        </tr>
                        <tr v-for="flow in filteredFlows" :key="flow.id">
                            <td :data-label="$t('Name')" class="table-stack-row-primary itaas-flow-admin-col-name">
                                <router-link
                                    class="link-deco cell-strong"
                                    :to="{ name: 'itaas-admin-flow-detail', params: { flowId: flow.id } }"
                                    :title="$t('View details')"
                                    :aria-label="$t('View details') + ': ' + flow.name"
                                >
                                    {{ flow.name }}
                                </router-link>
                            </td>
                            <td :data-label="$t('Flow ID')" class="itaas-flow-admin-id-cell td-shrink">
                                <div class="itaas-flow-admin-id-row">
                                    <span class="itaas-flow-admin-id" :title="flow.id">{{ truncateMiddle(flow.id, 20) }}</span>
                                    <CopyIconButton
                                        :text="flow.id"
                                        label="Copy flow ID"
                                        success-message="Copied to clipboard!"
                                        :disabled="!flow.id"
                                    />
                                </div>
                            </td>
                            <td :data-label="$t('Deployed')" class="itaas-flow-admin-field-half td-shrink">
                                <span :class="statusBadgeClass(flow.deployed ? 'active' : 'inactive')" role="status">
                                    {{ flow.deployed ? $t("Yes") : $t("No") }}
                                </span>
                            </td>
                            <td :data-label="$t('Visibility')" class="itaas-flow-admin-field-half td-shrink">
                                <span :class="statusBadgeClass(flow.visibility, visibilityToneMap)" role="status">
                                    {{ visibilityLabel(flow.visibility) }}
                                </span>
                            </td>
                            <td :data-label="$t('Workspaces')" class="td-shrink">
                                <span v-if="flow.isGlobal">{{ $t("All active workspaces") }}</span>
                                <span v-else-if="flow.assignments.length === 0" class="itaas-flow-admin-cell-muted">—</span>
                                <button
                                    v-else
                                    type="button"
                                    class="btn btn-tertiary btn-sm"
                                    :title="$t('View assigned workspaces')"
                                    :aria-label="$t('View assigned workspaces') + ': ' + flow.name"
                                    @click="openAssignmentsModal(flow)"
                                >
                                    <i class="fas fa-eye" aria-hidden="true"></i>
                                    {{ $t("View") }}
                                    <span class="itaas-flow-admin-count">({{ flow.assignments.length }})</span>
                                </button>
                            </td>
                            <td :data-label="$t('Show graph to users')" class="itaas-flow-admin-graph-cell td-shrink">
                                <span class="itaas-flow-admin-graph-heading">
                                    <ToggleSwitch
                                        class="itaas-flow-admin-graph-toggle"
                                        :val="!!flow.graphVisibleToUsers"
                                        :disabled="mutationBusy"
                                        :title="$t('Show graph to users')"
                                        :aria-label="$t('Show graph to users') + ': ' + flow.name"
                                        @update:val="onGraphVisibilityChange(flow, $event)"
                                    >
                                        {{ $t("Show graph to users") }}
                                    </ToggleSwitch>
                                </span>
                            </td>
                            <td :data-label="$t('Actions')" class="actions-cell text-right td-shrink">
                                <div class="itaas-flow-admin-row-actions">
                                    <button
                                        v-if="!flow.isGlobal"
                                        type="button"
                                        class="btn btn-primary btn-xs itaas-flow-admin-row-action-btn"
                                        :disabled="mutationBusy"
                                        :title="$t('Make public')"
                                        :aria-label="$t('Make public') + ': ' + flow.name"
                                        :aria-busy="busyAction === actionKey(flow.id, 'global') ? 'true' : undefined"
                                        @click="askMakeGlobal(flow)"
                                    >
                                        <i
                                            :class="
                                                busyAction === actionKey(flow.id, 'global')
                                                    ? 'fas fa-spinner fa-spin no-margin'
                                                    : 'fas fa-globe no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                    <button
                                        v-else
                                        type="button"
                                        class="btn btn-tertiary btn-xs itaas-flow-admin-row-action-btn"
                                        :disabled="mutationBusy"
                                        :title="$t('Unpublish')"
                                        :aria-label="$t('Unpublish') + ': ' + flow.name"
                                        :aria-busy="busyAction === actionKey(flow.id, 'unpublish') ? 'true' : undefined"
                                        @click="askUnpublish(flow)"
                                    >
                                        <i
                                            :class="
                                                busyAction === actionKey(flow.id, 'unpublish')
                                                    ? 'fas fa-spinner fa-spin no-margin'
                                                    : 'fas fa-eye-slash no-margin'
                                            "
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                    <button
                                        v-if="!flow.isGlobal"
                                        type="button"
                                        class="btn btn-tertiary btn-xs itaas-flow-admin-row-action-btn"
                                        :disabled="mutationBusy"
                                        :title="$t('Assign workspaces')"
                                        :aria-label="$t('Assign workspaces') + ': ' + flow.name"
                                        @click="openAssignModal(flow)"
                                    >
                                        <i class="fas fa-building no-margin" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <ModalDialogContainer :display="assignmentsModalOpen" @close="closeAssignmentsModal" @update:display="onAssignmentsModalDisplay">
            <div class="modal-dialog modal-md itaas-flow-admin-modal" @click="stopPropagationEvent">
                <div class="modal-header">
                    <div class="modal-title">{{ $t("Assigned workspaces") }}</div>
                    <button
                        type="button"
                        class="modal-close-btn"
                        :title="$t('Close')"
                        :aria-label="$t('Close')"
                        @click="closeAssignmentsModal"
                    >
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div v-if="assignmentsFlow" class="itaas-flow-admin-modal-flow">
                        <span class="cell-strong">{{ assignmentsFlow.name }}</span>
                        <span class="itaas-flow-admin-id" :title="assignmentsFlow.id">{{ assignmentsFlow.id }}</span>
                    </div>
                    <ul v-if="assignmentsFlow && assignmentsFlow.assignments.length > 0" class="itaas-flow-admin-current-list">
                        <li v-for="assignment in assignmentsFlow.assignments" :key="assignmentKey(assignment)">
                            <router-link
                                class="link-deco"
                                :to="assignmentProfileRoute(assignment)"
                                :title="assignmentProfileLinkTitle(assignment)"
                                @click="closeAssignmentsModal"
                            >
                                {{ assignmentLabel(assignment) }}
                            </router-link>
                            <span :class="statusBadgeClass(assignment.status === 'active' ? 'active' : 'inactive')" role="status">
                                {{ assignment.status === "active" ? $t("Active") : $t("Inactive") }}
                            </span>
                        </li>
                    </ul>
                    <p v-else class="table-feedback">{{ $t("No workspaces found") }}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary" @click="closeAssignmentsModal">
                        {{ $t("Close") }}
                    </button>
                    <button
                        v-if="assignmentsFlow && !assignmentsFlow.isGlobal"
                        type="button"
                        class="btn btn-primary"
                        @click="openAssignFromView"
                    >
                        {{ $t("Assign workspaces") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>

        <ModalDialogContainer :display="assignModalOpen" @close="closeAssignModal" @update:display="onAssignModalDisplay">
            <div class="modal-dialog modal-md itaas-flow-admin-modal" @click="stopPropagationEvent">
                <div class="modal-header">
                    <div class="modal-title">{{ $t("Assign workspaces") }}</div>
                    <button
                        type="button"
                        class="modal-close-btn"
                        :title="$t('Close')"
                        :aria-label="$t('Close')"
                        :disabled="assignBusy"
                        @click="closeAssignModal"
                    >
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div v-if="assignFlow" class="itaas-flow-admin-modal-flow">
                        <span class="cell-strong">{{ assignFlow.name }}</span>
                        <span class="itaas-flow-admin-id" :title="assignFlow.id">{{ assignFlow.id }}</span>
                    </div>

                    <p v-if="loadingWorkspaces" class="table-feedback">{{ $t("Loading") }}...</p>
                    <p v-else-if="workspaces.length === 0" class="table-feedback">{{ $t("No workspaces found") }}</p>
                    <template v-else>
                        <div v-if="assignFlow && assignFlow.assignments.length > 0" class="itaas-flow-admin-modal-section">
                            <h3 class="itaas-flow-admin-section-title">{{ $t("Current assignments") }}</h3>
                            <ul class="itaas-flow-admin-current-list">
                                <li v-for="assignment in assignFlow.assignments" :key="assignmentKey(assignment)">
                                    <span>{{ assignmentLabel(assignment) }}</span>
                                    <button
                                        type="button"
                                        class="btn btn-danger btn-xs"
                                        :disabled="assignBusy"
                                        :title="$t('Remove')"
                                        :aria-label="$t('Remove') + ': ' + assignmentLabel(assignment)"
                                        @click="removeAssignment(assignment)"
                                    >
                                        <i class="fas fa-trash-alt no-margin" aria-hidden="true"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div class="itaas-flow-admin-modal-section">
                            <h3 class="itaas-flow-admin-section-title">{{ $t("Add workspaces") }}</h3>
                            <div class="itaas-flow-admin-workspace-list">
                                <label
                                    v-for="workspace in assignableWorkspaces"
                                    :key="workspace.subjectKey"
                                    class="itaas-flow-admin-workspace-option"
                                >
                                    <input
                                        v-model="selectedWorkspaceKeys"
                                        type="checkbox"
                                        :value="workspace.subjectKey"
                                        :disabled="assignBusy"
                                    />
                                    <span>{{ workspaceLabel(workspace) }}</span>
                                </label>
                                <p v-if="assignableWorkspaces.length === 0" class="table-feedback">
                                    {{ $t("All workspaces already have this flow") }}
                                </p>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-tertiary" :disabled="assignBusy" @click="closeAssignModal">
                        {{ $t("Close") }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="assignBusy || selectedWorkspaceKeys.length === 0"
                        @click="assignSelectedWorkspaces"
                    >
                        {{ assignBusy ? $t("Saving") + "..." : $t("Assign") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>
    </div>
</template>

<script lang="ts">
import { ApiItaasWorkspaceAdmin } from "@/api/api-group-itaas-workspace-admin";
import {
    ItaasAdminFlowAssignment,
    ItaasAdminFlowGraphVisibilityResult,
    ItaasAdminFlowItem,
    ItaasAdminWorkspaceItem,
} from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";
import TableCardToolbar from "@/components/layout/TableCardToolbar.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import InfoTooltip from "@/components/ui/InfoTooltip.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import ToggleSwitch from "@/components/utils/ToggleSwitch.vue";
import { AuthController } from "@/control/auth";
import { statusBadgeClass, StatusBadgeTone } from "@/utils/status-badge";
import { Timeouts } from "@/utils/timeout";
import { truncateMiddle } from "@/utils/text";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

type VisibilityFilter = "all" | "global" | "workspace" | "unassigned";

const GRAPH_BULK_ACTION = "graph-bulk";
const GRAPH_VISIBILITY_SETTLE_MS = 500;
const GRAPH_VISIBILITY_LOOKUP_ATTEMPTS = 3;

const VISIBILITY_TONE_MAP: Record<string, StatusBadgeTone> = {
    global: "success",
    workspace: "info",
    unassigned: "muted",
};

export default defineComponent({
    name: "ItaasFlowManagementPage",
    components: {
        CopyIconButton,
        DashboardPageHeader,
        InfoTooltip,
        TableCardToolbar,
        ModalDialogContainer,
        ToggleSwitch,
    },
    setup: function () {
        return {
            loadFlowsRequestId: getUniqueStringId(),
            loadWorkspacesRequestId: getUniqueStringId(),
            mutateRequestId: getUniqueStringId(),
            lookupGraphRequestId: getUniqueStringId(),
            graphSettleTimeoutId: getUniqueStringId(),
            visibilityToneMap: VISIBILITY_TONE_MAP,
        };
    },
    data: function () {
        return {
            loading: true,
            loadingWorkspaces: false,
            flows: [] as ItaasAdminFlowItem[],
            workspaces: [] as ItaasAdminWorkspaceItem[],
            searchQuery: "",
            draftSearchQuery: "",
            filtersCollapsed: true,
            visibilityFilter: "all" as VisibilityFilter,
            busyAction: "",
            assignmentsModalOpen: false,
            assignmentsFlow: null as ItaasAdminFlowItem | null,
            assignModalOpen: false,
            assignFlow: null as ItaasAdminFlowItem | null,
            selectedWorkspaceKeys: [] as string[],
            assignBusy: false,
            graphBulkGeneration: 0,
        };
    },
    computed: {
        visibilityTabs: function () {
            return [
                { id: "all", label: String(this.$t("All")) },
                { id: "global", label: String(this.$t("Global")) },
                { id: "workspace", label: String(this.$t("Assigned")) },
                { id: "unassigned", label: String(this.$t("Unassigned")) },
            ];
        },
        filteredFlows: function (): ItaasAdminFlowItem[] {
            if (this.visibilityFilter === "all") {
                return this.flows;
            }
            return this.flows.filter((flow) => flow.visibility === this.visibilityFilter);
        },
        mutationBusy: function (): boolean {
            return !!this.busyAction || this.assignBusy;
        },
        allFilteredGraphsVisible: function (): boolean {
            return this.filteredFlows.length > 0 && this.filteredFlows.every((flow) => !!flow.graphVisibleToUsers);
        },
        noFilteredGraphsVisible: function (): boolean {
            return this.filteredFlows.length === 0 || this.filteredFlows.every((flow) => !flow.graphVisibleToUsers);
        },
        graphMasterToggleDisabled: function (): boolean {
            return this.loading || this.mutationBusy || this.filteredFlows.length === 0;
        },
        graphMasterToggleLabel: function (): string {
            return String(this.$t("Show graph to users for every flow in the current list"));
        },
        assignableWorkspaces: function (): ItaasAdminWorkspaceItem[] {
            if (!this.assignFlow) {
                return this.workspaces;
            }
            const assigned = new Set(this.assignFlow.assignments.map((assignment) => this.assignmentKey(assignment)));
            return this.workspaces.filter((workspace) => !assigned.has(workspace.subjectKey));
        },
    },
    methods: {
        statusBadgeClass,
        truncateMiddle,
        stopPropagationEvent: function (event: Event) {
            event.stopPropagation();
        },
        actionKey: function (flowId: string, action: string): string {
            return flowId + ":" + action;
        },
        visibilityLabel: function (visibility: string): string {
            if (visibility === "global") {
                return String(this.$t("Global"));
            }
            if (visibility === "workspace") {
                return String(this.$t("Assigned"));
            }
            return String(this.$t("Unassigned"));
        },
        assignmentKey: function (assignment: ItaasAdminFlowAssignment): string {
            return assignment.subjectType === "user" ? "user:" + assignment.subjectId : assignment.subjectId;
        },
        assignmentProfileRoute: function (assignment: ItaasAdminFlowAssignment): {
            name: string;
            params: { clientId?: string; organizationId?: string };
        } {
            if (assignment.subjectType === "user") {
                return {
                    name: "clients-client-detail",
                    params: { clientId: assignment.subjectId },
                };
            }
            return {
                name: "clients-org-detail",
                params: { organizationId: assignment.subjectId },
            };
        },
        assignmentProfileLinkTitle: function (assignment: ItaasAdminFlowAssignment): string {
            if (assignment.subjectType === "user") {
                return String(this.$t("View user profile"));
            }
            return String(this.$t("Clients view organization details"));
        },
        assignmentLabel: function (assignment: ItaasAdminFlowAssignment): string {
            const name = (assignment.name || "").trim() || assignment.subjectId;
            const typeLabel = assignment.subjectType === "organization" ? String(this.$t("Organization")) : String(this.$t("User"));
            return name + " (" + typeLabel + ")";
        },
        workspaceLabel: function (workspace: ItaasAdminWorkspaceItem): string {
            const name = (workspace.name || "").trim() || workspace.subjectId;
            const typeLabel = workspace.subjectType === "organization" ? String(this.$t("Organization")) : String(this.$t("User"));
            const statusLabel = workspace.status === "active" ? String(this.$t("Active")) : String(this.$t("Inactive"));
            return name + " (" + typeLabel + ", " + statusLabel + ")";
        },
        selectVisibilityFilter: function (tabId: string) {
            if (tabId === "global" || tabId === "workspace" || tabId === "unassigned" || tabId === "all") {
                this.visibilityFilter = tabId;
            }
        },
        onFiltersCollapsedUpdate: function (collapsed: boolean) {
            this.filtersCollapsed = collapsed;
        },
        applySearchFilter: function () {
            this.searchQuery = (this.draftSearchQuery || "").trim();
            this.draftSearchQuery = this.searchQuery;
            this.loadFlows();
        },
        clearSearchFilter: function () {
            this.draftSearchQuery = "";
            this.searchQuery = "";
            this.loadFlows();
        },
        ensureAccess: function (): boolean {
            if (!AuthController.hasPermission("admin.users.manage")) {
                this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                this.$router.push({ name: HOME_ROUTE });
                return false;
            }
            return true;
        },
        requestGraphVisibility: function (
            flow: ItaasAdminFlowItem,
            visible: boolean,
            previous: boolean,
            generation: number,
            onDone: (ok: boolean) => void,
        ) {
            Request.Pending(this.mutateRequestId, ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility(flow.id, { visible }))
                .onSuccess((payload) => {
                    flow.graphVisibleToUsers = !!(payload && payload.graphVisibleToUsers);
                    onDone(true);
                })
                .onCancel(() => {
                    this.recoverInterruptedGraphVisibility(generation, [flow.id], visible, false, (ok) => {
                        this.notifySingleGraphRecover(flow, visible, ok);
                        onDone(true);
                    });
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    let restoreLocal = false;
                    let reloadList = false;
                    handleErr(err, {
                        unauthorized: () => {
                            restoreLocal = true;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidFlowId: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid flow id"));
                        },
                        badRequestInvalidBody: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        badRequest: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        notFoundFlowNotFound: () => {
                            restoreLocal = true;
                            reloadList = true;
                            this.$showMessageModal(
                                this.$t("Flow not found"),
                                this.$t("The flow you are looking for does not exist or you do not have access to it."),
                            );
                        },
                        notFound: () => {
                            restoreLocal = true;
                            reloadList = true;
                            this.$showMessageModal(
                                this.$t("Flow not found"),
                                this.$t("The flow you are looking for does not exist or you do not have access to it."),
                            );
                        },
                        status503BffUnavailable: () => {
                            restoreLocal = true;
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            restoreLocal = true;
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => undefined,
                    });
                    if (restoreLocal) {
                        flow.graphVisibleToUsers = previous;
                        onDone(false);
                        if (reloadList) {
                            this.loadFlows();
                        }
                        return;
                    }
                    this.recoverInterruptedGraphVisibility(generation, [flow.id], visible, false, (ok) => {
                        this.notifySingleGraphRecover(flow, visible, ok);
                        onDone(true);
                    });
                })
                .onUnexpectedError(() => {
                    this.recoverInterruptedGraphVisibility(generation, [flow.id], visible, false, (ok) => {
                        this.notifySingleGraphRecover(flow, visible, ok);
                        onDone(true);
                    });
                });
        },
        onGraphVisibilityChange: function (flow: ItaasAdminFlowItem, visible: boolean) {
            if (this.mutationBusy || !!flow.graphVisibleToUsers === visible) {
                return;
            }
            const previous = !!flow.graphVisibleToUsers;
            flow.graphVisibleToUsers = visible;
            const generation = this.invalidateInFlightGraphBulk();
            this.busyAction = this.actionKey(flow.id, "graph");
            Request.Abort(this.mutateRequestId);
            this.requestGraphVisibility(flow, visible, previous, generation, () => {
                this.busyAction = "";
            });
        },
        askSetFilteredFlowsGraphVisibility: function (visible: boolean) {
            if (this.graphMasterToggleDisabled) {
                return;
            }
            if (visible ? this.allFilteredGraphsVisible : this.noFilteredGraphsVisible) {
                return;
            }
            const targets = this.filteredFlows.filter((flow) => !!flow.graphVisibleToUsers !== visible);
            if (targets.length === 0) {
                return;
            }
            this.$askUserConfirmation({
                title: visible ? this.$t("Show all") : this.$t("Hide all"),
                message: visible
                    ? this.$t("This will show the flow graph to users for every flow in the current list (this search and tab).")
                    : this.$t("This will hide the flow graph from users for every flow in the current list (this search and tab)."),
                callback: () => {
                    this.setFilteredFlowsGraphVisibility(visible);
                },
            });
        },
        setFilteredFlowsGraphVisibility: function (visible: boolean) {
            if (this.mutationBusy || this.loading) {
                return;
            }
            const targets = this.filteredFlows.filter((flow) => !!flow.graphVisibleToUsers !== visible);
            if (targets.length === 0) {
                return;
            }
            const previousById: Record<string, boolean> = {};
            for (const flow of targets) {
                previousById[flow.id] = !!flow.graphVisibleToUsers;
                flow.graphVisibleToUsers = visible;
            }
            const targetIds = targets.map((flow) => flow.id);
            const generation = this.invalidateInFlightGraphBulk();
            Request.Abort(this.mutateRequestId);
            this.busyAction = GRAPH_BULK_ACTION;
            Request.Pending(
                this.mutateRequestId,
                ApiItaasWorkspaceAdmin.AdminSetItaasFlowsGraphVisibility({
                    visible,
                    flowIds: targetIds,
                }),
            )
                .onSuccess((payload) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    const flowIds = payload && payload.flowIds;
                    if (!Array.isArray(flowIds)) {
                        this.recoverInterruptedGraphVisibility(generation, targetIds, visible, true, () => {
                            this.busyAction = "";
                        });
                        return;
                    }
                    const failedCount = this.applyBulkGraphVisibilityResult(
                        previousById,
                        flowIds,
                        !!(payload && payload.graphVisibleToUsers),
                    );
                    this.busyAction = "";
                    if (failedCount > 0) {
                        this.$showMessageModal(
                            this.$t("Action failed"),
                            this.$t("Some flows could not be updated. Changes already applied were kept."),
                        );
                    }
                })
                .onCancel(() => {
                    this.recoverInterruptedGraphVisibility(generation, targetIds, visible, true, () => {
                        this.busyAction = "";
                    });
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    let restoreLocal = false;
                    handleErr(err, {
                        unauthorized: () => {
                            restoreLocal = true;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidBody: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        badRequest: () => {
                            restoreLocal = true;
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        temporalError: () => undefined,
                    });
                    if (restoreLocal) {
                        this.restoreBulkGraphVisibility(previousById);
                        this.busyAction = "";
                        return;
                    }
                    this.recoverInterruptedGraphVisibility(generation, targetIds, visible, true, () => {
                        this.busyAction = "";
                    });
                })
                .onUnexpectedError(() => {
                    this.recoverInterruptedGraphVisibility(generation, targetIds, visible, true, () => {
                        this.busyAction = "";
                    });
                });
        },
        invalidateInFlightGraphBulk: function (): number {
            this.graphBulkGeneration += 1;
            return this.graphBulkGeneration;
        },
        isCurrentGraphBulk: function (generation: number): boolean {
            return generation === this.graphBulkGeneration;
        },
        flowById: function (flowId: string): ItaasAdminFlowItem | undefined {
            return this.flows.find((flow) => flow.id === flowId);
        },
        applyBulkGraphVisibilityResult: function (
            previousById: Record<string, boolean>,
            updatedIds: string[],
            visibleNow: boolean,
        ): number {
            const updated = new Set(updatedIds);
            let failedCount = 0;
            for (const id of Object.keys(previousById)) {
                const flow = this.flowById(id);
                if (!updated.has(id)) {
                    failedCount++;
                    if (flow) {
                        flow.graphVisibleToUsers = previousById[id];
                    }
                    continue;
                }
                if (flow) {
                    flow.graphVisibleToUsers = visibleNow;
                }
            }
            return failedCount;
        },
        restoreBulkGraphVisibility: function (previousById: Record<string, boolean>) {
            for (const id of Object.keys(previousById)) {
                const flow = this.flowById(id);
                if (flow) {
                    flow.graphVisibleToUsers = previousById[id];
                }
            }
        },
        applyLookupGraphVisibility: function (flowIds: string[], items: ItaasAdminFlowGraphVisibilityResult[]) {
            const byId = new Map(items.map((item) => [item.flowId, !!item.graphVisibleToUsers]));
            for (const id of flowIds) {
                if (!byId.has(id)) {
                    continue;
                }
                const flow = this.flowById(id);
                if (flow) {
                    flow.graphVisibleToUsers = byId.get(id) === true;
                }
            }
        },
        countLookupMismatches: function (
            flowIds: string[],
            items: ItaasAdminFlowGraphVisibilityResult[],
            intendedVisible: boolean,
        ): number {
            const byId = new Map(items.map((item) => [item.flowId, !!item.graphVisibleToUsers]));
            let failedCount = 0;
            for (const id of flowIds) {
                if (!byId.has(id) || (byId.get(id) === true) !== intendedVisible) {
                    failedCount++;
                }
            }
            return failedCount;
        },
        notifySingleGraphRecover: function (flow: ItaasAdminFlowItem, intendedVisible: boolean, lookupOk: boolean) {
            const current = this.flowById(flow.id) || flow;
            if (!lookupOk || !!current.graphVisibleToUsers !== intendedVisible) {
                this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
            }
        },
        lookupGraphVisibility: function (
            flowIds: string[],
            generation: number,
            onDone: (ok: boolean, items: ItaasAdminFlowGraphVisibilityResult[]) => void,
        ) {
            if (!this.isCurrentGraphBulk(generation) || flowIds.length === 0) {
                onDone(false, []);
                return;
            }
            Request.Abort(this.lookupGraphRequestId);
            Request.Pending(this.lookupGraphRequestId, ApiItaasWorkspaceAdmin.AdminLookupItaasFlowsGraphVisibility({ flowIds }))
                .onSuccess((payload) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    onDone(true, (payload && payload.items) || []);
                })
                .onCancel(() => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    onDone(false, []);
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => undefined,
                        badRequestInvalidBody: () => undefined,
                        badRequest: () => undefined,
                        temporalError: () => undefined,
                    });
                    onDone(false, []);
                })
                .onUnexpectedError(() => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    onDone(false, []);
                });
        },
        recoverInterruptedGraphVisibility: function (
            generation: number,
            flowIds: string[],
            intendedVisible: boolean,
            showPartialMessage: boolean,
            onDone: (ok: boolean) => void,
        ) {
            if (!this.isCurrentGraphBulk(generation)) {
                return;
            }
            const finish = (ok: boolean, items: ItaasAdminFlowGraphVisibilityResult[]) => {
                if (!this.isCurrentGraphBulk(generation)) {
                    return;
                }
                if (ok) {
                    this.applyLookupGraphVisibility(flowIds, items);
                    if (showPartialMessage && this.countLookupMismatches(flowIds, items, intendedVisible) > 0) {
                        this.$showMessageModal(
                            this.$t("Action failed"),
                            this.$t("Some flows could not be updated. Changes already applied were kept."),
                        );
                    }
                } else if (showPartialMessage) {
                    this.$showMessageModal(
                        this.$t("Action failed"),
                        this.$t("Could not confirm which flows were updated. Refresh the list if something looks wrong."),
                    );
                }
                onDone(ok);
            };
            const attemptLookup = (attempt: number) => {
                if (!this.isCurrentGraphBulk(generation)) {
                    return;
                }
                this.lookupGraphVisibility(flowIds, generation, (ok, items) => {
                    if (!this.isCurrentGraphBulk(generation)) {
                        return;
                    }
                    const pending = !ok || this.countLookupMismatches(flowIds, items, intendedVisible) > 0;
                    if (pending && attempt + 1 < GRAPH_VISIBILITY_LOOKUP_ATTEMPTS) {
                        Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                            attemptLookup(attempt + 1);
                        });
                        return;
                    }
                    finish(ok, items);
                });
            };
            Timeouts.Abort(this.graphSettleTimeoutId);
            Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                attemptLookup(0);
            });
        },
        applyLoadedFlows: function (items: ItaasAdminFlowItem[]) {
            this.flows = items || [];
            if (this.assignFlow) {
                const refreshed = this.flows.find((flow) => flow.id === this.assignFlow.id);
                this.assignFlow = refreshed || null;
                if (!this.assignFlow || this.assignFlow.isGlobal) {
                    this.closeAssignModal();
                }
            }
            if (this.assignmentsFlow) {
                const refreshedAssignments = this.flows.find((flow) => flow.id === this.assignmentsFlow.id);
                this.assignmentsFlow = refreshedAssignments || null;
                if (!this.assignmentsFlow || this.assignmentsFlow.assignments.length === 0) {
                    this.closeAssignmentsModal();
                }
            }
        },
        loadFlows: function () {
            if (!this.ensureAccess() || this.mutationBusy) {
                return;
            }
            Request.Abort(this.loadFlowsRequestId);
            this.loading = true;
            const q = (this.searchQuery || "").trim();
            Request.Pending(this.loadFlowsRequestId, ApiItaasWorkspaceAdmin.AdminListItaasFlows(q ? { q } : {}))
                .onSuccess((list) => {
                    this.applyLoadedFlows(list.items || []);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loading = false;
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        status503BffUnavailable: () => {
                            this.loading = false;
                            this.flows = [];
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.loading = false;
                            this.flows = [];
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.loading = false;
                            this.flows = [];
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.flows = [];
                });
        },
        loadWorkspaces: function () {
            Request.Abort(this.loadWorkspacesRequestId);
            this.loadingWorkspaces = true;
            Request.Pending(this.loadWorkspacesRequestId, ApiItaasWorkspaceAdmin.AdminListItaasWorkspaces())
                .onSuccess((list) => {
                    this.workspaces = list.items || [];
                    this.loadingWorkspaces = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.loadingWorkspaces = false;
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        status503BffUnavailable: () => {
                            this.loadingWorkspaces = false;
                            this.workspaces = [];
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.loadingWorkspaces = false;
                            this.workspaces = [];
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.loadingWorkspaces = false;
                            this.workspaces = [];
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loadingWorkspaces = false;
                    this.workspaces = [];
                });
        },
        askMakeGlobal: function (flow: ItaasAdminFlowItem) {
            if (this.mutationBusy) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Make public"),
                message: this.$t("This will make the flow available to all active workspaces and remove its private assignments."),
                callback: () => {
                    this.makeGlobal(flow.id);
                },
            });
        },
        askUnpublish: function (flow: ItaasAdminFlowItem) {
            if (this.mutationBusy) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Unpublish"),
                message: this.$t("This will stop sharing the flow globally. Previous workspace assignments will not be restored."),
                callback: () => {
                    this.unpublish(flow.id);
                },
            });
        },
        makeGlobal: function (flowId: string) {
            if (this.mutationBusy) {
                return;
            }
            this.busyAction = this.actionKey(flowId, "global");
            Request.Pending(this.mutateRequestId, ApiItaasWorkspaceAdmin.AdminMakeItaasFlowGlobal({ flowId }))
                .onSuccess(() => {
                    this.busyAction = "";
                    this.loadFlows();
                })
                .onRequestError((err, handleErr) => {
                    this.busyAction = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidFlowId: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid flow id"));
                        },
                        badRequestFlowAlreadyAssigned: () => {
                            this.$showMessageModal(
                                this.$t("Action failed"),
                                this.$t("This flow is delivered as a custom agent and cannot be published globally."),
                            );
                        },
                        badRequestFlowGlobalSyncFailed: () => {
                            this.$showMessageModal(
                                this.$t("Action failed"),
                                this.$t("Could not clear workspace assignments before publishing the flow."),
                            );
                            this.loadFlows();
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        status503FlowOpBusy: () => {
                            this.$showMessageModal(
                                this.$t("Action failed"),
                                this.$t("Another operation is in progress for this flow. Please try again."),
                            );
                        },
                        status503BffUnavailable: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.busyAction = "";
                });
        },
        unpublish: function (flowId: string) {
            if (this.mutationBusy) {
                return;
            }
            this.busyAction = this.actionKey(flowId, "unpublish");
            Request.Pending(this.mutateRequestId, ApiItaasWorkspaceAdmin.AdminUnpublishItaasFlowGlobal({ flowId }))
                .onSuccess(() => {
                    this.busyAction = "";
                    this.loadFlows();
                })
                .onRequestError((err, handleErr) => {
                    this.busyAction = "";
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidFlowId: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid flow id"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        status503FlowOpBusy: () => {
                            this.$showMessageModal(
                                this.$t("Action failed"),
                                this.$t("Another operation is in progress for this flow. Please try again."),
                            );
                        },
                        status503BffUnavailable: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.busyAction = "";
                });
        },
        openAssignmentsModal: function (flow: ItaasAdminFlowItem) {
            this.assignmentsFlow = flow;
            this.assignmentsModalOpen = true;
        },
        closeAssignmentsModal: function () {
            this.assignmentsModalOpen = false;
            this.assignmentsFlow = null;
        },
        onAssignmentsModalDisplay: function (display: boolean) {
            if (!display) {
                this.closeAssignmentsModal();
            }
        },
        openAssignFromView: function () {
            if (!this.assignmentsFlow || this.mutationBusy) {
                return;
            }
            const flow = this.assignmentsFlow;
            this.closeAssignmentsModal();
            this.openAssignModal(flow);
        },
        openAssignModal: function (flow: ItaasAdminFlowItem) {
            if (this.mutationBusy) {
                return;
            }
            this.assignFlow = flow;
            this.selectedWorkspaceKeys = [];
            this.assignModalOpen = true;
            if (this.workspaces.length === 0) {
                this.loadWorkspaces();
            }
        },
        closeAssignModal: function () {
            if (this.assignBusy) {
                return;
            }
            this.assignModalOpen = false;
            this.assignFlow = null;
            this.selectedWorkspaceKeys = [];
        },
        onAssignModalDisplay: function (display: boolean) {
            if (!display) {
                this.closeAssignModal();
            }
        },
        assignSelectedWorkspaces: function () {
            if (!this.assignFlow || this.selectedWorkspaceKeys.length === 0 || this.mutationBusy) {
                return;
            }
            const flowId = this.assignFlow.id;
            const selected = this.workspaces.filter((workspace) => this.selectedWorkspaceKeys.includes(workspace.subjectKey));
            if (selected.length === 0) {
                return;
            }

            this.assignBusy = true;
            const next = [...selected];

            const assignNext = () => {
                const workspace = next.shift();
                if (!workspace) {
                    this.assignBusy = false;
                    this.selectedWorkspaceKeys = [];
                    this.loadFlows();
                    return;
                }
                Request.Pending(
                    this.mutateRequestId,
                    ApiItaasWorkspaceAdmin.AdminAssignItaasWorkspaceFlow({
                        subjectType: workspace.subjectType,
                        subjectId: workspace.subjectId,
                        flowId,
                    }),
                )
                    .onSuccess(() => {
                        assignNext();
                    })
                    .onRequestError((err, handleErr) => {
                        this.assignBusy = false;
                        handleErr(err, {
                            unauthorized: () => this.$requireLogin(),
                            forbidden: () => {
                                this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                            },
                            badRequestFlowIsGlobal: () => {
                                this.$showMessageModal(
                                    this.$t("Action failed"),
                                    this.$t("Flow is global and cannot be assigned to a workspace"),
                                );
                                this.loadFlows();
                            },
                            badRequestFlowAlreadyAssigned: () => {
                                this.$showMessageModal(this.$t("Action failed"), this.$t("This flow is already assigned to a workspace."));
                                this.loadFlows();
                            },
                            badRequestInvalidFlowId: () => {
                                this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid flow id"));
                            },
                            badRequestInvalidSubject: () => {
                                this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid workspace"));
                            },
                            badRequest: () => {
                                this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                            },
                            status503FlowOpBusy: () => {
                                this.$showMessageModal(
                                    this.$t("Action failed"),
                                    this.$t("Another operation is in progress for this flow. Please try again."),
                                );
                            },
                            status503BffUnavailable: () => {
                                this.$showMessageModal(
                                    this.$t("Service unavailable"),
                                    this.$t("Could not reach the flow provisioning service."),
                                );
                            },
                            status503: () => {
                                this.$showMessageModal(
                                    this.$t("Service unavailable"),
                                    this.$t("Could not reach the flow provisioning service."),
                                );
                            },
                            temporalError: () => {
                                this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                            },
                        });
                        this.loadFlows();
                    })
                    .onUnexpectedError(() => {
                        this.assignBusy = false;
                    });
            };

            assignNext();
        },
        removeAssignment: function (assignment: ItaasAdminFlowAssignment) {
            if (!this.assignFlow || this.mutationBusy) {
                return;
            }
            const flowId = this.assignFlow.id;
            this.assignBusy = true;
            Request.Pending(
                this.mutateRequestId,
                ApiItaasWorkspaceAdmin.AdminRemoveItaasWorkspaceFlow({
                    subjectType: assignment.subjectType,
                    subjectId: assignment.subjectId,
                    flowId,
                }),
            )
                .onSuccess(() => {
                    this.assignBusy = false;
                    this.loadFlows();
                })
                .onRequestError((err, handleErr) => {
                    this.assignBusy = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this action."));
                        },
                        badRequestInvalidFlowId: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid flow id"));
                        },
                        badRequestInvalidSubject: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Invalid workspace"));
                        },
                        badRequest: () => {
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Please try again in a moment."));
                        },
                        status503FlowOpBusy: () => {
                            this.$showMessageModal(
                                this.$t("Action failed"),
                                this.$t("Another operation is in progress for this flow. Please try again."),
                            );
                        },
                        status503BffUnavailable: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        status503: () => {
                            this.$showMessageModal(
                                this.$t("Service unavailable"),
                                this.$t("Could not reach the flow provisioning service."),
                            );
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.assignBusy = false;
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.loadFlows.bind(this));
        this.loadFlows();
        this.$setSubTitle(this.$t("ITAAS flow management"));
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.graphSettleTimeoutId);
        this.invalidateInFlightGraphBulk();
        Request.Abort(this.loadFlowsRequestId);
        Request.Abort(this.loadWorkspacesRequestId);
        Request.Abort(this.mutateRequestId);
        Request.Abort(this.lookupGraphRequestId);
    },
});
</script>

<style>
@import "@/style/layout/itaas-flow-admin.css";
</style>
