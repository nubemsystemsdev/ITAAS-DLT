"use strict";

import { normalizeBytes32, validateBytes32 } from "./blockchain";
import { sha256 } from "./hash";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Maps a local entity id to the bytes32 form used on-chain and in traceability correlation fields.
 */
export function toChainTraceabilityEntityId(value: string): string {
    const trimmed = (value || "").trim();

    if (!trimmed) {
        return ZERO_BYTES32;
    }

    if (validateBytes32(trimmed)) {
        return normalizeBytes32(trimmed);
    }

    const hexNoPrefix = trimmed.startsWith("0x") || trimmed.startsWith("0X")
        ? trimmed.slice(2)
        : trimmed;

    if ((/^[0-9a-fA-F]{1,64}$/).test(hexNoPrefix)) {
        return normalizeBytes32(`0x${hexNoPrefix.padStart(64, "0")}`);
    }

    return normalizeBytes32(`0x${sha256(trimmed)}`);
}
