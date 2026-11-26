// Hex utils

"use strict";

/**
 * Adds a 0x prefix to hex string, if missing
 * @param hex The input hex
 * @param pad Optional pad size
 * @returns The hex string, with 0x prefix 
 */
export function hexWithPrefix(hex: string, pad?: number) {
    hex = (hex + "").toLowerCase();

    if (hex.substring(0, 2) !== "0x") {
        hex = "0x" + hex;
    }

    if (pad) {
        while (hex.length - 2 < pad) {
            hex = hex + "0";
        }
    }

    return hex;
}

/**
 * Removes the 0x prefix from a hex string, if it has it
 * @param hex The input hex string
 * @returns The hex string, without any prefix
 */
export function hexNoPrefix(hex: string) {
    hex = (hex + "").toLowerCase();

    if (hex.substring(0, 2) !== "0x") {
        return hex;
    } else {
        return hex.substring(2);
    }
}

/**
 * Parses hex string to big integer
 * @param hex The hex string
 * @returns The big integer
 */
export function parseHex(hex: string): bigint {
    hex = hexNoPrefix(hex);
    while (hex.length > 0 && hex.charAt(0) === '0') {
        hex = hex.substring(1);
    }
    try {
        return BigInt("0x" + hex);
    } catch (ex) {
        return BigInt(0);
    }
}

/**
 * Parses a hex string and returns the number as decimal
 * @param hex The hex string
 * @returns The decimal string
 */
export function hexToDecimal(hex: string): string {
    const h = parseHex(hex);
    return h.toString(10);
}

/**
 * Convierte cualquier valor "bytes-like" (Buffer, Uint8Array, Binary, string hex o "Binary.createFromBase64(...)")
 * a string hex con prefijo 0x. Útil para hashes de transacción que pueden venir como Binary desde BD o del receipt.
 * @param value Valor en cualquier formato (string, Buffer, Uint8Array, objeto con .buffer/.data/.hex()/.toString("hex"))
 * @returns String hex en minúsculas con prefijo "0x", o "" si no se puede convertir
 */
export function toHexString(value: unknown): string {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "string") {
        const m = /Binary\.createFromBase64\s*\(\s*['"]([^'"]+)['"]/.exec(value);
        if (m) {
            return "0x" + Buffer.from(m[1], "base64").toString("hex").toLowerCase();
        }
        if (value.startsWith("0x")) return value.toLowerCase();
        return value ? "0x" + String(value).toLowerCase() : "";
    }
    if (Buffer.isBuffer(value)) return "0x" + value.toString("hex").toLowerCase();
    if (value instanceof Uint8Array) return "0x" + Buffer.from(value).toString("hex").toLowerCase();
    const obj = value as { buffer?: Buffer; data?: Uint8Array; hex?: () => string; toString?: (enc?: string) => string };
    if (obj.buffer && Buffer.isBuffer(obj.buffer)) return "0x" + obj.buffer.toString("hex").toLowerCase();
    if (obj.data) return "0x" + Buffer.from(obj.data).toString("hex").toLowerCase();
    if (typeof obj.hex === "function") return ("0x" + obj.hex()).toLowerCase();
    if (typeof obj.toString === "function") {
        const s = obj.toString("hex");
        if (s) return (s.startsWith("0x") ? s : "0x" + s).toLowerCase();
    }
    return "";
}
