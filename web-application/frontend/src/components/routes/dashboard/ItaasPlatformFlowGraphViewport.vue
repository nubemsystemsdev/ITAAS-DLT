<template>
    <div
        ref="viewportEl"
        class="itaas-platform-flow-graph-slot__canvas itaas-platform-flow-graph-viewport"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endPan"
        @pointercancel="endPan"
        @wheel.prevent="onWheel"
    >
        <div class="itaas-platform-flow-graph-viewport__world" :style="worldStyle">
            <svg
                class="itaas-platform-flow-graph-viewport__edges"
                :width="svgWidth"
                :height="svgHeight"
                :style="svgStyle"
                aria-hidden="true"
            >
                <line v-for="edge in drawnEdges" :key="edge.id" :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" />
            </svg>
            <div
                v-for="node in nodes"
                :key="node.id"
                class="itaas-platform-flow-graph-viewport__node"
                :class="{ 'itaas-platform-flow-graph-viewport__node--failed': node.id === failedNodeId }"
                :style="nodeBoxStyle(node)"
                :title="nodeFailedTitle(node)"
            >
                {{ node.label }}
            </div>
        </div>
        <div class="itaas-platform-flow-graph-viewport__controls">
            <button type="button" class="itaas-platform-flow-graph-viewport__btn" :aria-label="$t('Zoom in')" @click.stop="zoomIn">
                <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
            <button type="button" class="itaas-platform-flow-graph-viewport__btn" :aria-label="$t('Zoom out')" @click.stop="zoomOut">
                <i class="fas fa-minus" aria-hidden="true"></i>
            </button>
            <button type="button" class="itaas-platform-flow-graph-viewport__btn" :aria-label="$t('Fit to view')" @click.stop="fit">
                <i class="fas fa-compress" aria-hidden="true"></i>
                <span class="itaas-platform-flow-graph-viewport__btn-label">{{ $t("Fit to view") }}</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import type { ItaasFlowGraphEdge, ItaasFlowGraphNode } from "@/api/definitions";
import {
    applyPan,
    cameraTransform,
    computeFitCamera,
    FLOW_GRAPH_NODE_HEIGHT,
    FLOW_GRAPH_NODE_WIDTH,
    FLOW_GRAPH_ZOOM_FACTOR,
    type FlowGraphCamera,
    zoomCamera,
} from "@/utils/flow-graph-viewport";
import { defineComponent, type PropType } from "vue";

export default defineComponent({
    name: "ItaasPlatformFlowGraphViewport",
    props: {
        nodes: {
            type: Array as PropType<ItaasFlowGraphNode[]>,
            required: true,
        },
        edges: {
            type: Array as PropType<ItaasFlowGraphEdge[]>,
            required: true,
        },
        failedNodeId: {
            type: String,
            default: "",
        },
    },
    data: function () {
        return {
            camera: { scale: 1, tx: 0, ty: 0 } as FlowGraphCamera,
            cameraUserAdjusted: false,
            dragging: false,
            lastX: 0,
            lastY: 0,
            resizeObserver: null as ResizeObserver | null,
        };
    },
    computed: {
        worldStyle: function (): Record<string, string> {
            return {
                transform: cameraTransform(this.camera),
            };
        },
        nodeById: function (): Map<string, ItaasFlowGraphNode> {
            const map = new Map<string, ItaasFlowGraphNode>();
            for (const node of this.nodes) {
                map.set(node.id, node);
            }
            return map;
        },
        bounds: function (): { minX: number; minY: number; width: number; height: number } {
            if (!this.nodes.length) {
                return { minX: 0, minY: 0, width: 1, height: 1 };
            }
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const node of this.nodes) {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + FLOW_GRAPH_NODE_WIDTH);
                maxY = Math.max(maxY, node.y + FLOW_GRAPH_NODE_HEIGHT);
            }
            return {
                minX,
                minY,
                width: Math.max(maxX - minX, 1),
                height: Math.max(maxY - minY, 1),
            };
        },
        svgWidth: function (): number {
            return this.bounds.width;
        },
        svgHeight: function (): number {
            return this.bounds.height;
        },
        svgStyle: function (): Record<string, string> {
            return {
                left: this.bounds.minX + "px",
                top: this.bounds.minY + "px",
            };
        },
        drawnEdges: function (): Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> {
            const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];
            const minX = this.bounds.minX;
            const minY = this.bounds.minY;
            const cx = FLOW_GRAPH_NODE_WIDTH / 2;
            const cy = FLOW_GRAPH_NODE_HEIGHT / 2;
            for (const edge of this.edges) {
                const from = this.nodeById.get(edge.source);
                const to = this.nodeById.get(edge.target);
                if (!from || !to) {
                    continue;
                }
                lines.push({
                    id: edge.id,
                    x1: from.x + cx - minX,
                    y1: from.y + cy - minY,
                    x2: to.x + cx - minX,
                    y2: to.y + cy - minY,
                });
            }
            return lines;
        },
    },
    methods: {
        nodeBoxStyle: function (node: ItaasFlowGraphNode): Record<string, string> {
            return {
                left: node.x + "px",
                top: node.y + "px",
                width: FLOW_GRAPH_NODE_WIDTH + "px",
                height: FLOW_GRAPH_NODE_HEIGHT + "px",
            };
        },
        nodeFailedTitle: function (node: ItaasFlowGraphNode): string {
            if (node.id === this.failedNodeId) {
                return node.label + " — " + this.$t("Failed in the last run");
            }
            return node.label;
        },
        viewportSize: function (): { width: number; height: number } {
            const el = this.$refs.viewportEl as HTMLElement | undefined;
            if (!el) {
                return { width: 0, height: 0 };
            }
            return { width: el.clientWidth, height: el.clientHeight };
        },
        fit: function (): void {
            const size = this.viewportSize();
            this.camera = computeFitCamera(this.nodes, size.width, size.height);
            this.cameraUserAdjusted = false;
        },
        zoomIn: function (): void {
            this.zoomBy(FLOW_GRAPH_ZOOM_FACTOR);
        },
        zoomOut: function (): void {
            this.zoomBy(1 / FLOW_GRAPH_ZOOM_FACTOR);
        },
        zoomBy: function (factor: number): void {
            const size = this.viewportSize();
            this.camera = zoomCamera(this.camera, factor, size.width / 2, size.height / 2);
            this.cameraUserAdjusted = true;
        },
        onWheel: function (event: WheelEvent): void {
            const delta = event.deltaY > 0 ? 1 / FLOW_GRAPH_ZOOM_FACTOR : FLOW_GRAPH_ZOOM_FACTOR;
            const el = this.$refs.viewportEl as HTMLElement | undefined;
            if (!el) {
                return;
            }
            const rect = el.getBoundingClientRect();
            const originX = event.clientX - rect.left;
            const originY = event.clientY - rect.top;
            this.camera = zoomCamera(this.camera, delta, originX, originY);
            this.cameraUserAdjusted = true;
        },
        onPointerDown: function (event: PointerEvent): void {
            if (event.button !== 0) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target && target.closest(".itaas-platform-flow-graph-viewport__controls")) {
                return;
            }
            this.dragging = true;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            const el = event.currentTarget as HTMLElement;
            el.setPointerCapture(event.pointerId);
        },
        onPointerMove: function (event: PointerEvent): void {
            if (!this.dragging) {
                return;
            }
            const dx = event.clientX - this.lastX;
            const dy = event.clientY - this.lastY;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            this.camera = applyPan(this.camera, dx, dy);
            this.cameraUserAdjusted = true;
        },
        endPan: function (): void {
            this.dragging = false;
        },
        observeResize: function (): void {
            const el = this.$refs.viewportEl as HTMLElement | undefined;
            if (!el || typeof ResizeObserver === "undefined") {
                return;
            }
            this.resizeObserver = new ResizeObserver(() => {
                if (this.cameraUserAdjusted) {
                    return;
                }
                this.fit();
            });
            this.resizeObserver.observe(el);
        },
    },
    mounted: function () {
        this.$nextTick(() => {
            this.fit();
            this.observeResize();
        });
    },
    beforeUnmount: function () {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    },
    watch: {
        nodes: {
            deep: true,
            handler: function () {
                this.cameraUserAdjusted = false;
                this.$nextTick(() => {
                    this.fit();
                });
            },
        },
    },
});
</script>
