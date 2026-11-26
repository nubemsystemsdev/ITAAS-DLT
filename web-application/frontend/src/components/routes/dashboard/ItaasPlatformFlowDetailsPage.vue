<template>
    <DetailsViewLayout
        :loading="loading"
        :not-found="notFound"
        :back-route="backRoute"
        :not-found-title="$t('Flow not found')"
        :not-found-description="$t('The flow you are looking for does not exist or you do not have access to it.')"
        :error-message="loadError"
        :error-title="$t('Unable to load flow detail.')"
    >
        <template #header>
            <header class="details-view-header details-view-header--simple details-view-card">
                <div class="details-view-header-main">
                    <p class="details-view-kicker">{{ $t("Flow detail") }}</p>
                    <div class="details-view-title-row">
                        <h1 class="details-view-title" :title="name">{{ name || "-" }}</h1>
                        <span :class="statusBadgeClass(deployed ? 'deployed' : 'not_deployed', flowDeployedToneMap)" role="status">
                            {{ deployed ? $t("Deployed") : $t("Not deployed") }}
                        </span>
                        <span
                            v-if="isAdminMode"
                            :class="statusBadgeClass(graphVisibleToUsers ? 'visible' : 'hidden', graphVisibilityToneMap)"
                            role="status"
                        >
                            {{ graphVisibleToUsers ? $t("Visible to users") : $t("Hidden from users") }}
                        </span>
                    </div>
                    <p class="details-view-subtitle">{{ subtitle }}</p>
                </div>
            </header>
        </template>

        <div
            class="itaas-platform-flow-detail"
            :class="{
                'itaas-platform-flow-detail--admin': isAdminMode,
                'itaas-platform-flow-detail--no-preview': !showGraphPreview,
            }"
        >
            <ItaasPlatformFlowGraphPreview v-if="showGraphPreview" :graph="graph" :failed-node-id="failedNodeId" />

            <div class="itaas-platform-flow-detail__sidebar">
                <article class="details-view-panel itaas-platform-flow-detail__identity">
                    <h3 class="details-view-panel-title">{{ $t("Identity") }}</h3>
                    <dl class="details-view-list">
                        <div class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-fingerprint details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Flow ID") }}
                            </dt>
                            <dd class="details-view-value itaas-platform-flow-detail-id">
                                <span :title="flowId">{{ flowId || "-" }}</span>
                                <CopyIconButton
                                    :text="flowId"
                                    label="Copy flow ID"
                                    success-message="Copied to clipboard!"
                                    :disabled="!flowId"
                                />
                            </dd>
                        </div>

                        <div v-if="type" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-tag details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Type") }}
                            </dt>
                            <dd class="details-view-value">{{ type }}</dd>
                        </div>

                        <div v-if="category" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-folder details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Category") }}
                            </dt>
                            <dd class="details-view-value">{{ category }}</dd>
                        </div>

                        <div v-if="createdAt" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-calendar details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Created") }}
                            </dt>
                            <dd class="details-view-value">{{ renderTimestamp(createdAt) }}</dd>
                        </div>

                        <div v-if="updatedAt" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-pen details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Updated") }}
                            </dt>
                            <dd class="details-view-value">{{ renderTimestamp(updatedAt) }}</dd>
                        </div>

                        <div v-if="isAdminMode" class="details-view-list-item">
                            <dt class="details-view-label">
                                <i class="fas fa-diagram-project details-view-label-icon" aria-hidden="true"></i>
                                {{ $t("Graph") }}
                            </dt>
                            <dd class="details-view-value itaas-platform-flow-detail__graph-visibility">
                                <ToggleSwitch
                                    class="itaas-flow-admin-graph-toggle"
                                    :val="graphVisibleToUsers"
                                    :disabled="graphBusy || loading || notFound || !!loadError"
                                    :title="$t('Show graph to users')"
                                    :aria-label="$t('Show graph to users')"
                                    aria-describedby="itaas-admin-flow-graph-hint"
                                    @update:val="onAdminGraphVisibilityChange"
                                >
                                    {{ $t("Show graph to users") }}
                                </ToggleSwitch>
                                <p id="itaas-admin-flow-graph-hint" class="itaas-platform-flow-detail__graph-visibility-hint">
                                    {{ $t("Administrators always see the graph preview.") }}
                                </p>
                            </dd>
                        </div>
                    </dl>
                </article>

                <ItaasPlatformFlowRunPanel
                    v-if="!isAdminMode"
                    :flow-id="flowId"
                    :disabled="runDisabled"
                    :graph-nodes="graphNodes"
                    :credential-requirements="credentialRequirements"
                    @run-error="onRunError"
                />
            </div>

            <article v-if="!isAdminMode && showCredentialsSection" class="details-view-panel itaas-platform-flow-detail__credentials">
                <h3 class="details-view-panel-title">{{ $t("Credentials") }}</h3>
                <p class="details-view-content-description">
                    {{ $t("Each flow declares the providers it needs. Assign an existing credential or create a new one for this flow.") }}
                </p>
                <ItaasPlatformFlowCredentialsPanel
                    :flow-id="flowId"
                    :failed-node-id="failedNodeId"
                    :failed-credential-ids="failedCredentialIds"
                    :failed-credential-type="failedCredentialType"
                    @requirements-loaded="onRequirementsLoaded"
                />
            </article>
        </div>
    </DetailsViewLayout>
</template>

<script lang="ts">
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import { ApiItaasWorkspaceAdmin } from "@/api/api-group-itaas-workspace-admin";
import type {
    ItaasAdminFlowGraphVisibilityResult,
    ItaasAdminFlowItem,
    ItaasCredentialRequirement,
    ItaasFlowDetail,
    ItaasFlowGraph,
    ItaasFlowGraphNode,
} from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import DetailsViewLayout from "@/components/layout/DetailsViewLayout.vue";
import ItaasPlatformFlowCredentialsPanel from "@/components/routes/dashboard/ItaasPlatformFlowCredentialsPanel.vue";
import ItaasPlatformFlowGraphPreview from "@/components/routes/dashboard/ItaasPlatformFlowGraphPreview.vue";
import ItaasPlatformFlowRunPanel from "@/components/routes/dashboard/ItaasPlatformFlowRunPanel.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import ToggleSwitch from "@/components/utils/ToggleSwitch.vue";
import { AuthController } from "@/control/auth";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import type { ItaasRunErrorDetails } from "@/utils/itaas-run-error";
import { statusBadgeClass, type StatusBadgeTone } from "@/utils/status-badge";
import { Timeouts } from "@/utils/timeout";
import { renderDateAndTime } from "@/utils/time-utils";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { computed, defineComponent, ref } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";

const FLOW_DEPLOYED_TONE_MAP: Record<string, StatusBadgeTone> = {
    deployed: "success",
    not_deployed: "muted",
};

const GRAPH_VISIBILITY_TONE_MAP: Record<string, StatusBadgeTone> = {
    visible: "success",
    hidden: "muted",
};

const GRAPH_VISIBILITY_SETTLE_MS = 500;
const GRAPH_VISIBILITY_LOOKUP_ATTEMPTS = 3;

function normalizeRouteParam(raw: unknown): string {
    if (typeof raw === "string") {
        return raw.trim();
    }

    if (Array.isArray(raw)) {
        const firstValue = raw[0];
        return typeof firstValue === "string" ? firstValue.trim() : "";
    }

    return "";
}

export default defineComponent({
    name: "ItaasPlatformFlowDetailsPage",
    components: {
        CopyIconButton,
        DetailsViewLayout,
        ItaasPlatformFlowCredentialsPanel,
        ItaasPlatformFlowGraphPreview,
        ItaasPlatformFlowRunPanel,
        ToggleSwitch,
    },
    setup: function () {
        const loading = ref(false);
        const route = useRoute();

        const isAdminMode = computed(function (): boolean {
            const routeName = String(route.name || "");
            if (routeName === "itaas-admin-flow-detail") {
                return true;
            }
            const path = String(route.path || "");
            return path.startsWith("/admin/itaas-flows/") && path !== "/admin/itaas-flows";
        });

        const backRoute = computed<RouteLocationRaw>(() => {
            if (isAdminMode.value) {
                return { name: "itaas-flow-management" };
            }
            const fromTab = String(route.query.from || "").trim();
            return {
                name: "itaas-platform",
                query: { tab: fromTab === "public-agents" ? "public-agents" : "flows" },
            };
        });

        return {
            loading,
            isAdminMode,
            backRoute,
        };
    },
    data: function () {
        return {
            notFound: false,
            loadError: "",
            flowId: "",
            name: "",
            deployed: false,
            type: "",
            category: "",
            createdAt: "",
            updatedAt: "",
            graph: null as ItaasFlowGraph | null,
            failedNodeId: "",
            failedCredentialIds: [] as string[],
            failedCredentialType: "",
            credentialRequirements: [] as ItaasCredentialRequirement[],
            graphVisibleToUsers: false,
            graphBusy: false,
            loadGeneration: 0,
            graphGeneration: 0,
            loadRequestId: getUniqueStringId(),
            graphRequestId: getUniqueStringId(),
            lookupGraphRequestId: getUniqueStringId(),
            graphSettleTimeoutId: getUniqueStringId(),
            flowDeployedToneMap: FLOW_DEPLOYED_TONE_MAP,
            graphVisibilityToneMap: GRAPH_VISIBILITY_TONE_MAP,
        };
    },
    computed: {
        subtitle: function (): string {
            if (this.isAdminMode) {
                return String(this.$t("Review flow information and preview the graph."));
            }
            return String(this.$t("Review flow information and run it from this page."));
        },
        runDisabled: function (): boolean {
            return this.notFound || !!this.loadError || !(this.flowId || "").trim();
        },
        showGraphPreview: function (): boolean {
            return this.isAdminMode || !!this.graph;
        },
        showCredentialsSection: function (): boolean {
            if (this.loading || this.notFound || this.loadError || !(this.flowId || "").trim()) {
                return false;
            }
            return true;
        },
        graphNodes: function (): ItaasFlowGraphNode[] {
            return (this.graph && this.graph.nodes) || [];
        },
    },
    methods: {
        statusBadgeClass,
        resetFlowFields: function (): void {
            this.name = "";
            this.deployed = false;
            this.type = "";
            this.category = "";
            this.createdAt = "";
            this.updatedAt = "";
            this.graph = null;
            this.failedNodeId = "";
            this.failedCredentialIds = [];
            this.failedCredentialType = "";
            this.credentialRequirements = [];
            this.graphVisibleToUsers = false;
        },
        applyFlowDetail: function (detail: ItaasFlowDetail | ItaasAdminFlowItem): void {
            this.flowId = (detail.id || this.flowId || "").trim();
            this.name = (detail.name || "").trim();
            this.deployed = !!detail.deployed;
            this.type = (detail.type || "").trim();
            this.category = (detail.category || "").trim();
            this.createdAt = ("createdAt" in detail ? detail.createdAt || "" : "").trim();
            this.updatedAt = (detail.updatedAt || "").trim();
            this.graph = detail.graph && detail.graph.nodes && detail.graph.nodes.length ? detail.graph : null;
            this.graphVisibleToUsers = "graphVisibleToUsers" in detail ? !!detail.graphVisibleToUsers : false;
        },
        onRequirementsLoaded: function (requirements: ItaasCredentialRequirement[]): void {
            this.credentialRequirements = requirements || [];
        },
        onRunError: function (details: ItaasRunErrorDetails | null): void {
            this.failedNodeId = (details && details.nodeId) || "";
            this.failedCredentialType = (details && details.credentialType) || "";
            if (details && details.credentialId) {
                this.failedCredentialIds = [details.credentialId];
                return;
            }
            this.failedCredentialIds = (details && details.credentialIds) || [];
        },
        renderTimestamp: function (timestamp: string): string {
            if (!timestamp) {
                return "-";
            }
            return renderDateAndTime(timestamp, this.$t);
        },
        ensureAdminAccess: function (): boolean {
            if (!AuthController.hasPermission("admin.users.manage")) {
                this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                this.$router.push({ name: HOME_ROUTE });
                return false;
            }
            return true;
        },
        finishLoadError: function (): void {
            if (!this.notFound && !this.loadError) {
                this.loadError = this.$t("Temporal error occurred. Please try again later.");
            }
            this.resetFlowFields();
            this.loading = false;
        },
        isCurrentLoad: function (generation: number): boolean {
            return generation === this.loadGeneration;
        },
        isCurrentGraphOp: function (generation: number): boolean {
            return generation === this.graphGeneration;
        },
        onAdminGraphVisibilityChange: function (visible: boolean): void {
            if (!this.isAdminMode || this.graphBusy || this.loading || !!this.graphVisibleToUsers === visible) {
                return;
            }
            const flowId = (this.flowId || "").trim();
            if (!flowId) {
                return;
            }
            const previous = !!this.graphVisibleToUsers;
            this.graphVisibleToUsers = visible;
            this.graphBusy = true;
            this.graphGeneration += 1;
            const generation = this.graphGeneration;
            Request.Abort(this.graphRequestId);
            Request.Pending(this.graphRequestId, ApiItaasWorkspaceAdmin.AdminSetItaasFlowGraphVisibility(flowId, { visible }))
                .onSuccess((payload) => {
                    if (!this.isCurrentGraphOp(generation)) {
                        return;
                    }
                    this.graphVisibleToUsers = !!(payload && payload.graphVisibleToUsers);
                    this.graphBusy = false;
                })
                .onCancel(() => {
                    this.recoverAdminGraphVisibility(generation, flowId, visible);
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentGraphOp(generation)) {
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
                            this.$showMessageModal(
                                this.$t("Flow not found"),
                                this.$t("The flow you are looking for does not exist or you do not have access to it."),
                            );
                        },
                        notFound: () => {
                            restoreLocal = true;
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
                        this.graphVisibleToUsers = previous;
                        this.graphBusy = false;
                        return;
                    }
                    this.recoverAdminGraphVisibility(generation, flowId, visible);
                })
                .onUnexpectedError(() => {
                    this.recoverAdminGraphVisibility(generation, flowId, visible);
                });
        },
        recoverAdminGraphVisibility: function (generation: number, flowId: string, intendedVisible: boolean): void {
            if (!this.isCurrentGraphOp(generation)) {
                return;
            }
            const finish = (ok: boolean, visibleNow: boolean) => {
                if (!this.isCurrentGraphOp(generation)) {
                    return;
                }
                if (ok) {
                    this.graphVisibleToUsers = visibleNow;
                }
                if (!ok || visibleNow !== intendedVisible) {
                    this.$showMessageModal(this.$t("Temporal error"), this.$t("Please try again in a moment."));
                }
                this.graphBusy = false;
            };
            const attemptLookup = (attempt: number) => {
                if (!this.isCurrentGraphOp(generation)) {
                    return;
                }
                Request.Abort(this.lookupGraphRequestId);
                Request.Pending(
                    this.lookupGraphRequestId,
                    ApiItaasWorkspaceAdmin.AdminLookupItaasFlowsGraphVisibility({ flowIds: [flowId] }),
                )
                    .onSuccess((payload) => {
                        if (!this.isCurrentGraphOp(generation)) {
                            return;
                        }
                        const items = ((payload && payload.items) || []) as ItaasAdminFlowGraphVisibilityResult[];
                        const row = items.find((item) => item.flowId === flowId);
                        if (!row) {
                            if (attempt + 1 < GRAPH_VISIBILITY_LOOKUP_ATTEMPTS) {
                                Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                                    attemptLookup(attempt + 1);
                                });
                                return;
                            }
                            finish(false, intendedVisible);
                            return;
                        }
                        const visibleNow = !!row.graphVisibleToUsers;
                        if (visibleNow !== intendedVisible && attempt + 1 < GRAPH_VISIBILITY_LOOKUP_ATTEMPTS) {
                            Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                                attemptLookup(attempt + 1);
                            });
                            return;
                        }
                        finish(true, visibleNow);
                    })
                    .onCancel(() => {
                        if (!this.isCurrentGraphOp(generation)) {
                            return;
                        }
                        finish(false, intendedVisible);
                    })
                    .onRequestError((err, handleErr) => {
                        if (!this.isCurrentGraphOp(generation)) {
                            return;
                        }
                        handleErr(err, {
                            unauthorized: () => this.$requireLogin(),
                            forbidden: () => undefined,
                            badRequestInvalidBody: () => undefined,
                            badRequest: () => undefined,
                            temporalError: () => undefined,
                        });
                        if (attempt + 1 < GRAPH_VISIBILITY_LOOKUP_ATTEMPTS) {
                            Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                                attemptLookup(attempt + 1);
                            });
                            return;
                        }
                        finish(false, intendedVisible);
                    })
                    .onUnexpectedError(() => {
                        if (!this.isCurrentGraphOp(generation)) {
                            return;
                        }
                        if (attempt + 1 < GRAPH_VISIBILITY_LOOKUP_ATTEMPTS) {
                            Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                                attemptLookup(attempt + 1);
                            });
                            return;
                        }
                        finish(false, intendedVisible);
                    });
            };
            Timeouts.Abort(this.graphSettleTimeoutId);
            Timeouts.Set(this.graphSettleTimeoutId, GRAPH_VISIBILITY_SETTLE_MS, () => {
                attemptLookup(0);
            });
        },
        loadAdminFlowDetail: function (flowId: string, generation: number): void {
            Request.Pending(this.loadRequestId, ApiItaasWorkspaceAdmin.AdminGetItaasFlow(flowId))
                .onSuccess((payload) => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    this.applyFlowDetail(payload as ItaasAdminFlowItem);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    handleErr(err, {
                        unauthorized: () => {
                            this.resetFlowFields();
                            this.loading = false;
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestInvalidFlowId: () => {
                            this.notFound = true;
                        },
                        forbidden: () => {
                            this.loadError = this.$t("Access denied");
                            this.$showMessageModal(this.$t("Access denied"), this.$t("You lack required permissions for this view."));
                            this.$router.push({ name: HOME_ROUTE });
                        },
                        notFound: () => {
                            this.notFound = true;
                        },
                        notFoundFlowNotFound: () => {
                            this.notFound = true;
                        },
                        status503BffUnavailable: () => {
                            this.loadError = this.$t("Could not reach the flow provisioning service.");
                        },
                        status503: () => {
                            this.loadError = this.$t("Could not reach the flow provisioning service.");
                        },
                        temporalError: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                    });
                    this.finishLoadError();
                })
                .onUnexpectedError(() => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    this.loadError = this.$t("Temporal error occurred. Please try again later.");
                    this.resetFlowFields();
                    this.loading = false;
                });
        },
        loadUserFlowDetail: function (flowId: string, generation: number): void {
            Request.Pending(this.loadRequestId, ApiItaasFlows.GetItaasFlow(flowId))
                .onSuccess((payload) => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    this.applyFlowDetail(payload as ItaasFlowDetail);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    handleErr(err, {
                        unauthorized: () => {
                            this.resetFlowFields();
                            this.loading = false;
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.resetFlowFields();
                            this.loading = false;
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestInvalidFlowId: () => {
                            this.notFound = true;
                        },
                        badRequestBffBadRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestFlowInvalid: () => {
                            this.loadError = this.$t("The flow graph is invalid");
                        },
                        forbidden: () => {
                            this.loadError = this.$t("Access denied");
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.loadError = this.$t("Active ITAAS subscription or assigned organization license is required");
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.loadError = this.$t("Your session has expired. Reconnecting...");
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.loadError = this.$t("Flows service is temporarily unavailable. Please try again later.");
                        },
                        forbiddenBffForbidden: () => {
                            this.loadError = this.$t("Flows service is temporarily unavailable. Please try again later.");
                        },
                        notFound: () => {
                            this.notFound = true;
                        },
                        notFoundFlowNotFound: () => {
                            this.notFound = true;
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.loadError = this.$t("Flows service is temporarily unavailable. Please try again later.");
                        }),
                        temporalError: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                    });
                    this.finishLoadError();
                })
                .onUnexpectedError(() => {
                    if (!this.isCurrentLoad(generation)) {
                        return;
                    }
                    this.loadError = this.$t("Temporal error occurred. Please try again later.");
                    this.resetFlowFields();
                    this.loading = false;
                });
        },
        loadFlowDetail: function (): void {
            if (this.isAdminMode && !this.ensureAdminAccess()) {
                return;
            }

            const flowId = normalizeRouteParam(this.$route.params.flowId);
            if (!flowId) {
                this.notFound = true;
                this.loadError = "";
                this.flowId = "";
                this.resetFlowFields();
                return;
            }

            Request.Abort(this.loadRequestId);
            Request.Abort(this.graphRequestId);
            Request.Abort(this.lookupGraphRequestId);
            Timeouts.Abort(this.graphSettleTimeoutId);
            this.graphBusy = false;
            this.graphGeneration += 1;
            this.loadGeneration += 1;
            const generation = this.loadGeneration;
            this.loading = true;
            this.notFound = false;
            this.loadError = "";
            this.flowId = flowId;
            this.resetFlowFields();

            if (this.isAdminMode) {
                this.loadAdminFlowDetail(flowId, generation);
                return;
            }
            this.loadUserFlowDetail(flowId, generation);
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Flow detail"));
        this.$autoFocus();
        this.loadFlowDetail();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.graphSettleTimeoutId);
        this.graphGeneration += 1;
        Request.Abort(this.loadRequestId);
        Request.Abort(this.graphRequestId);
        Request.Abort(this.lookupGraphRequestId);
    },
    watch: {
        "$route.params.flowId": function (): void {
            this.loadFlowDetail();
        },
        "$route.name": function (): void {
            this.loadFlowDetail();
        },
    },
});
</script>

<style>
@import "@/style/layout/details-view.css";
@import "@/style/layout/itaas-platform.css";
@import "@/style/layout/itaas-flow-admin.css";
</style>
