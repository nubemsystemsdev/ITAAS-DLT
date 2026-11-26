<template>
    <article class="details-view-panel itaas-platform-flow-graph-slot" :aria-label="$t('Flow preview')">
        <header class="itaas-platform-flow-graph-slot__header">
            <h3 class="details-view-panel-title">{{ $t("Flow preview") }}</h3>
            <button
                v-if="hasNodes"
                ref="expandedOpenTrigger"
                type="button"
                class="itaas-platform-flow-graph-slot__expand-btn"
                :aria-label="$t('Open in full screen')"
                :title="$t('Open in full screen')"
                @click="openExpanded"
            >
                <i class="fas fa-expand" aria-hidden="true"></i>
                <span class="itaas-platform-flow-graph-slot__expand-btn-label">{{ $t("Open in full screen") }}</span>
            </button>
        </header>
        <div v-if="hasNodes" class="itaas-platform-flow-graph-slot__inline-preview">
            <ItaasPlatformFlowGraphViewport :nodes="graphNodes" :edges="graphEdges" :failed-node-id="failedNodeId" />
        </div>
        <div v-if="hasNodes" class="itaas-platform-flow-graph-slot__entry-wrap">
            <div class="itaas-platform-flow-graph-slot__entry-intro">
                <span class="itaas-platform-flow-graph-slot__entry-icon" aria-hidden="true">
                    <i class="fas fa-diagram-project"></i>
                </span>
                <p class="itaas-platform-flow-graph-slot__entry-label">{{ $t("Flow preview") }}</p>
            </div>
            <p class="itaas-platform-flow-graph-slot__entry-message">
                {{ $t("The diagram opens in full screen for easier navigation.") }}
            </p>
            <button
                type="button"
                class="btn btn-primary itaas-platform-flow-graph-slot__entry-action"
                ref="expandedEntryTrigger"
                @click="openExpanded"
            >
                {{ $t("Open in full screen") }}
            </button>
        </div>
        <div v-else class="itaas-platform-flow-graph-slot__canvas itaas-platform-flow-graph-empty" role="status">
            <span class="itaas-platform-flow-graph-empty__icon" aria-hidden="true">
                <i class="fas fa-diagram-project"></i>
            </span>
            <p class="itaas-platform-flow-graph-empty__title">{{ $t("No preview available") }}</p>
            <p class="itaas-platform-flow-graph-empty__message">
                {{ $t("This flow does not have a graph to display.") }}
            </p>
        </div>
    </article>

    <Teleport to="body">
        <div
            v-if="expanded"
            ref="expandedRoot"
            class="itaas-platform-flow-graph-expanded"
            :class="isDarkTheme ? 'dark-theme' : 'light-theme'"
            role="dialog"
            aria-modal="true"
            :aria-label="$t('Flow preview expanded')"
            tabindex="-1"
        >
            <header class="itaas-platform-flow-graph-expanded__header">
                <h3 class="itaas-platform-flow-graph-expanded__title">{{ $t("Flow preview") }}</h3>
                <button
                    type="button"
                    class="itaas-platform-flow-graph-expanded__close-btn"
                    :aria-label="$t('Close')"
                    :title="$t('Close')"
                    @click="closeExpanded"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </header>
            <div class="itaas-platform-flow-graph-expanded__body">
                <ItaasPlatformFlowGraphViewport :nodes="graphNodes" :edges="graphEdges" :failed-node-id="failedNodeId" />
            </div>
        </div>
    </Teleport>
</template>

<script lang="ts">
import type { ItaasFlowGraph, ItaasFlowGraphEdge, ItaasFlowGraphNode } from "@/api/definitions";
import ItaasPlatformFlowGraphViewport from "@/components/routes/dashboard/ItaasPlatformFlowGraphViewport.vue";
import { ColorThemeName, getTheme } from "@/control/app-preferences";
import { FocusTrap } from "@/utils/focus-trap";
import { defineComponent, type PropType } from "vue";

type LockableScreenOrientation = ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
};

export default defineComponent({
    name: "ItaasPlatformFlowGraphPreview",
    components: {
        ItaasPlatformFlowGraphViewport,
    },
    props: {
        graph: {
            type: Object as PropType<ItaasFlowGraph | null>,
            default: null,
        },
        failedNodeId: {
            type: String,
            default: "",
        },
    },
    data: function () {
        return {
            expanded: false,
            theme: getTheme(),
            bodyOverflowBeforeExpand: "",
            landscapeLocked: false,
            focusTrap: null as FocusTrap | null,
        };
    },
    computed: {
        graphNodes: function (): ItaasFlowGraphNode[] {
            return (this.graph && this.graph.nodes) || [];
        },
        graphEdges: function (): ItaasFlowGraphEdge[] {
            return (this.graph && this.graph.edges) || [];
        },
        hasNodes: function (): boolean {
            return this.graphNodes.length > 0;
        },
        isDarkTheme: function (): boolean {
            return this.theme === "dark";
        },
    },
    methods: {
        onThemeChanged: function (theme: ColorThemeName): void {
            this.theme = theme;
        },
        focusLost: function (): void {
            if (!this.expanded) {
                return;
            }
            const root = this.$refs.expandedRoot as HTMLElement | undefined;
            if (root) {
                root.focus();
            }
        },
        activateFocusTrap: function (): void {
            const root = this.$refs.expandedRoot as HTMLElement | undefined;
            if (!root) {
                return;
            }
            if (!this.focusTrap) {
                this.focusTrap = new FocusTrap(root, this.focusLost.bind(this));
            }
            this.focusTrap.activate();
        },
        deactivateFocusTrap: function (): void {
            if (this.focusTrap) {
                this.focusTrap.deactivate();
            }
        },
        returnFocusToOpenTrigger: function (): void {
            const triggers = [this.$refs.expandedOpenTrigger, this.$refs.expandedEntryTrigger];
            for (const trigger of triggers) {
                const el = trigger as HTMLElement | undefined;
                if (el && el.offsetParent !== null) {
                    el.focus();
                    return;
                }
            }
        },
        lockLandscape: async function (): Promise<void> {
            if (window.innerWidth > 1024) {
                return;
            }
            try {
                const orientation = screen.orientation as LockableScreenOrientation | undefined;
                if (orientation && typeof orientation.lock === "function") {
                    await orientation.lock("landscape");
                    this.landscapeLocked = true;
                }
            } catch {
                this.landscapeLocked = false;
            }
        },
        unlockLandscape: function (): void {
            if (!this.landscapeLocked) {
                return;
            }
            try {
                const orientation = screen.orientation as LockableScreenOrientation | undefined;
                if (orientation && typeof orientation.unlock === "function") {
                    orientation.unlock();
                }
            } catch {
                // silent fallback
            }
            this.landscapeLocked = false;
        },
        openExpanded: function (): void {
            if (!this.hasNodes || this.expanded) {
                return;
            }
            this.bodyOverflowBeforeExpand = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            this.expanded = true;
            void this.lockLandscape();
            this.$nextTick(() => {
                const root = this.$refs.expandedRoot as HTMLElement | undefined;
                if (root) {
                    root.focus();
                }
                this.activateFocusTrap();
            });
        },
        closeExpanded: function (): void {
            if (!this.expanded) {
                return;
            }
            this.deactivateFocusTrap();
            this.expanded = false;
            document.body.style.overflow = this.bodyOverflowBeforeExpand;
            this.bodyOverflowBeforeExpand = "";
            this.unlockLandscape();
            this.$nextTick(() => {
                this.returnFocusToOpenTrigger();
            });
        },
        escapeToClose: function (event: KeyboardEvent): void {
            if (!this.expanded || event.key !== "Escape") {
                return;
            }
            this.closeExpanded();
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
        document.addEventListener("keydown", this.escapeToClose);
    },
    beforeUnmount: function () {
        document.removeEventListener("keydown", this.escapeToClose);
        if (this.focusTrap) {
            this.focusTrap.destroy();
            this.focusTrap = null;
        }
        this.closeExpanded();
    },
});
</script>
