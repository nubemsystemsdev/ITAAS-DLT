export const FLOW_GRAPH_NODE_WIDTH = 140;
export const FLOW_GRAPH_NODE_HEIGHT = 36;
export const FLOW_GRAPH_FIT_PADDING = 24;
export const FLOW_GRAPH_ZOOM_FACTOR = 1.25;
export const FLOW_GRAPH_MIN_SCALE = 0.2;
export const FLOW_GRAPH_MAX_SCALE = 3;

export interface FlowGraphCamera {
    scale: number;
    tx: number;
    ty: number;
}

export interface FlowGraphNodePosition {
    x: number;
    y: number;
}

export function clampScale(scale: number): number {
    if (!Number.isFinite(scale)) {
        return 1;
    }
    if (scale < FLOW_GRAPH_MIN_SCALE) {
        return FLOW_GRAPH_MIN_SCALE;
    }
    if (scale > FLOW_GRAPH_MAX_SCALE) {
        return FLOW_GRAPH_MAX_SCALE;
    }
    return scale;
}

export function applyPan(camera: FlowGraphCamera, dx: number, dy: number): FlowGraphCamera {
    return {
        scale: camera.scale,
        tx: camera.tx + dx,
        ty: camera.ty + dy,
    };
}

export function zoomCamera(camera: FlowGraphCamera, factor: number, originX: number, originY: number): FlowGraphCamera {
    const safeScale = camera.scale === 0 ? 1 : camera.scale;
    const worldX = (originX - camera.tx) / safeScale;
    const worldY = (originY - camera.ty) / safeScale;
    const scale = clampScale(safeScale * factor);
    return {
        scale,
        tx: originX - worldX * scale,
        ty: originY - worldY * scale,
    };
}

function allSamePosition(nodes: FlowGraphNodePosition[]): boolean {
    const first = nodes[0];
    for (let i = 1; i < nodes.length; i++) {
        if (nodes[i].x !== first.x || nodes[i].y !== first.y) {
            return false;
        }
    }
    return true;
}

export function computeFitCamera(nodes: FlowGraphNodePosition[], viewportWidth: number, viewportHeight: number): FlowGraphCamera {
    if (!nodes.length || viewportWidth <= 0 || viewportHeight <= 0) {
        return { scale: 1, tx: 0, ty: 0 };
    }

    if (nodes.length === 1 || allSamePosition(nodes)) {
        const node = nodes[0];
        const cx = node.x + FLOW_GRAPH_NODE_WIDTH / 2;
        const cy = node.y + FLOW_GRAPH_NODE_HEIGHT / 2;
        return {
            scale: 1,
            tx: viewportWidth / 2 - cx,
            ty: viewportHeight / 2 - cy,
        };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + FLOW_GRAPH_NODE_WIDTH);
        maxY = Math.max(maxY, node.y + FLOW_GRAPH_NODE_HEIGHT);
    }

    const worldW = Math.max(maxX - minX, 1);
    const worldH = Math.max(maxY - minY, 1);
    const availW = Math.max(viewportWidth - FLOW_GRAPH_FIT_PADDING * 2, 1);
    const availH = Math.max(viewportHeight - FLOW_GRAPH_FIT_PADDING * 2, 1);
    const scale = clampScale(Math.min(availW / worldW, availH / worldH));
    const worldCx = (minX + maxX) / 2;
    const worldCy = (minY + maxY) / 2;
    return {
        scale,
        tx: viewportWidth / 2 - worldCx * scale,
        ty: viewportHeight / 2 - worldCy * scale,
    };
}

export function cameraTransform(camera: FlowGraphCamera): string {
    return "translate(" + camera.tx + "px, " + camera.ty + "px) scale(" + camera.scale + ")";
}
