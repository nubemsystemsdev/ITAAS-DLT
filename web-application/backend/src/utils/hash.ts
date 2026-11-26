// Hashing utilities

"use strict";

import Crypto from "crypto";

/**
 * Computes SHA256 hash
 * @param input The input data to hash
 * @returns Hash as hex string (0-9, a-f only, 64 chars)
 */
export function sha256(input: string | Buffer): string {
    const data = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
    return Crypto.createHash("sha256").update(data).digest("hex").toLowerCase();
}
