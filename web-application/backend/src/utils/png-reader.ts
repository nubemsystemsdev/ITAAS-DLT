// Reserved for license

"use strict";

import Fs from "fs";
import Zlib from "zlib";

export interface PngRgbaData {
    width: number;
    height: number;
    pixels: Buffer;
    rgbCompressed: Buffer;
    alphaCompressed: Buffer;
}

function paethPredictor(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function unfilterRow(filterType: number, row: Buffer, prevRow: Buffer | null, bpp: number): Buffer {
    const out = Buffer.alloc(row.length);
    for (let i = 0; i < row.length; i++) {
        if (filterType === 0) {
            out[i] = row[i];
        } else if (filterType === 1) {
            const left = i >= bpp ? out[i - bpp] : 0;
            out[i] = (row[i] + left) & 0xff;
        } else if (filterType === 2) {
            const up = prevRow ? prevRow[i] : 0;
            out[i] = (row[i] + up) & 0xff;
        } else if (filterType === 3) {
            const left = i >= bpp ? out[i - bpp] : 0;
            const up = prevRow ? prevRow[i] : 0;
            out[i] = (row[i] + ((left + up) >> 1)) & 0xff;
        } else {
            const left = i >= bpp ? out[i - bpp] : 0;
            const up = prevRow ? prevRow[i] : 0;
            const upLeft = prevRow && i >= bpp ? prevRow[i - bpp] : 0;
            out[i] = (row[i] + paethPredictor(left, up, upLeft)) & 0xff;
        }
    }
    return out;
}

export function readPngFile(filePath: string): PngRgbaData {
    const data = Fs.readFileSync(filePath);

    const signature = data.slice(0, 8);
    if (signature.toString("binary") !== "\x89PNG\r\n\x1a\n") {
        throw new Error(`Not a valid PNG: ${filePath}`);
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let colorType = 0;
    const idatChunks: Buffer[] = [];
    let palette: Buffer | null = null;
    let trns: Buffer | null = null;

    while (offset < data.length) {
        const length = data.readUInt32BE(offset);
        const chunkType = data.slice(offset + 4, offset + 8).toString("ascii");
        const chunkData = data.slice(offset + 8, offset + 8 + length);

        if (chunkType === "IHDR") {
            width = chunkData.readUInt32BE(0);
            height = chunkData.readUInt32BE(4);
            colorType = chunkData[9];
        } else if (chunkType === "IDAT") {
            idatChunks.push(chunkData);
        } else if (chunkType === "PLTE") {
            palette = chunkData;
        } else if (chunkType === "tRNS") {
            trns = chunkData;
        } else if (chunkType === "IEND") {
            break;
        }

        offset += 12 + length;
    }

    if (!width || !height) {
        throw new Error(`Could not parse IHDR: ${filePath}`);
    }

    const compressed = Buffer.concat(idatChunks);
    const rawData = Zlib.inflateSync(compressed);

    let bytesPerPixel = 0;
    if (colorType === 0) bytesPerPixel = 1;
    else if (colorType === 2) bytesPerPixel = 3;
    else if (colorType === 4) bytesPerPixel = 2;
    else if (colorType === 6) bytesPerPixel = 4;
    else if (colorType === 3) bytesPerPixel = 1;
    else throw new Error(`Unsupported PNG color type: ${colorType}`);

    const stride = width * bytesPerPixel + 1;

    const rows: Buffer[] = [];
    for (let y = 0; y < height; y++) {
        const start = y * stride;
        const filterType = rawData[start];
        const rowPixels = rawData.slice(start + 1, start + stride);
        const prevRow = rows.length > 0 ? rows[rows.length - 1] : null;
        rows.push(unfilterRow(filterType, rowPixels, prevRow, bytesPerPixel));
    }

    const rgba = Buffer.alloc(width * height * 4);
    let outIdx = 0;

    for (let y = 0; y < height; y++) {
        const row = rows[y];
        for (let x = 0; x < width; x++) {
            const inIdx = x * bytesPerPixel;

            if (colorType === 6) {
                rgba[outIdx] = row[inIdx];
                rgba[outIdx + 1] = row[inIdx + 1];
                rgba[outIdx + 2] = row[inIdx + 2];
                rgba[outIdx + 3] = row[inIdx + 3];
            } else if (colorType === 2) {
                rgba[outIdx] = row[inIdx];
                rgba[outIdx + 1] = row[inIdx + 1];
                rgba[outIdx + 2] = row[inIdx + 2];
                rgba[outIdx + 3] = 255;
            } else if (colorType === 0) {
                rgba[outIdx] = row[inIdx];
                rgba[outIdx + 1] = row[inIdx];
                rgba[outIdx + 2] = row[inIdx];
                rgba[outIdx + 3] = 255;
            } else if (colorType === 4) {
                rgba[outIdx] = row[inIdx];
                rgba[outIdx + 1] = row[inIdx];
                rgba[outIdx + 2] = row[inIdx];
                rgba[outIdx + 3] = row[inIdx + 1];
            } else if (colorType === 3 && palette) {
                const idx = row[inIdx] * 3;
                rgba[outIdx] = palette[idx];
                rgba[outIdx + 1] = palette[idx + 1];
                rgba[outIdx + 2] = palette[idx + 2];
                rgba[outIdx + 3] = trns && row[inIdx] < trns.length ? trns[row[inIdx]] : 255;
            }

            outIdx += 4;
        }
    }

    const rgb = Buffer.alloc(width * height * 3);
    const alpha = Buffer.alloc(width * height);
    let ri = 0;
    let ai = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        rgb[ri] = rgba[i];
        rgb[ri + 1] = rgba[i + 1];
        rgb[ri + 2] = rgba[i + 2];
        ri += 3;
        alpha[ai] = rgba[i + 3];
        ai++;
    }

    return {
        width,
        height,
        pixels: rgba,
        rgbCompressed: Zlib.deflateSync(rgb, { level: 9 }),
        alphaCompressed: Zlib.deflateSync(alpha, { level: 9 }),
    };
}
