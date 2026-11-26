// Function tests — flow graph viewport camera math

import { describe, it } from "node:test";

import assert from "node:assert/strict";
import {
    applyPan,
    clampScale,
    computeFitCamera,
    FLOW_GRAPH_MAX_SCALE,
    FLOW_GRAPH_MIN_SCALE,
    FLOW_GRAPH_NODE_HEIGHT,
    FLOW_GRAPH_NODE_WIDTH,
    FLOW_GRAPH_ZOOM_FACTOR,
    zoomCamera,
} from "../src/utils/flow-graph-viewport.ts";

describe("flow-graph-viewport", () => {
    it("clampScale keeps scale between 0.2 and 3", () => {
        assert.strictEqual(clampScale(1), 1);
        assert.strictEqual(clampScale(0.05), FLOW_GRAPH_MIN_SCALE);
        assert.strictEqual(clampScale(10), FLOW_GRAPH_MAX_SCALE);
    });

    it("zoomCamera multiplies scale by 1.25 and keeps the origin world point fixed", () => {
        const camera = { scale: 1, tx: 10, ty: 20 };
        const originX = 100;
        const originY = 80;
        const worldX = (originX - camera.tx) / camera.scale;
        const worldY = (originY - camera.ty) / camera.scale;
        const next = zoomCamera(camera, FLOW_GRAPH_ZOOM_FACTOR, originX, originY);
        assert.strictEqual(next.scale, 1.25);
        assert.ok(Math.abs((originX - next.tx) / next.scale - worldX) < 1e-9);
        assert.ok(Math.abs((originY - next.ty) / next.scale - worldY) < 1e-9);
    });

    it("computeFitCamera uses scale 1 and centers a single node", () => {
        const camera = computeFitCamera([{ x: 0, y: 0 }], 400, 200);
        assert.strictEqual(camera.scale, 1);
        const cx = FLOW_GRAPH_NODE_WIDTH / 2;
        const cy = FLOW_GRAPH_NODE_HEIGHT / 2;
        assert.ok(Math.abs(cx * camera.scale + camera.tx - 200) < 1e-9);
        assert.ok(Math.abs(cy * camera.scale + camera.ty - 100) < 1e-9);
    });

    it("computeFitCamera uses scale 1 when all nodes share the same position", () => {
        const camera = computeFitCamera(
            [
                { x: 50, y: 50 },
                { x: 50, y: 50 },
            ],
            400,
            200,
        );
        assert.strictEqual(camera.scale, 1);
    });

    it("computeFitCamera scales a wide graph to fit inside the viewport padding", () => {
        const nodes = [
            { x: 0, y: 0 },
            { x: 400, y: 0 },
        ];
        const camera = computeFitCamera(nodes, 400, 200);
        assert.ok(camera.scale < 1);
        assert.ok(camera.scale >= FLOW_GRAPH_MIN_SCALE);
        const minX = 0;
        const maxX = 400 + FLOW_GRAPH_NODE_WIDTH;
        const screenLeft = minX * camera.scale + camera.tx;
        const screenRight = maxX * camera.scale + camera.tx;
        assert.ok(screenLeft >= 24 - 1e-6);
        assert.ok(screenRight <= 400 - 24 + 1e-6);
    });

    it("computeFitCamera returns identity when nodes or viewport are empty", () => {
        assert.deepStrictEqual(computeFitCamera([], 400, 200), { scale: 1, tx: 0, ty: 0 });
        assert.deepStrictEqual(computeFitCamera([{ x: 0, y: 0 }], 0, 200), { scale: 1, tx: 0, ty: 0 });
    });

    it("applyPan shifts translation by screen deltas", () => {
        assert.deepStrictEqual(applyPan({ scale: 2, tx: 5, ty: 7 }, 3, -4), { scale: 2, tx: 8, ty: 3 });
    });
});
