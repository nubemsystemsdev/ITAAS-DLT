// BFF flows proxy configuration (DLT → BFF /api/flows*)

"use strict";

const DEFAULT_MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

/**
 * Outbound config for calling the BFF north-face /api/flows* endpoints.
 * Enabled when BFF_BASE_URL is set. Does not require BFF_PROVISIONING_API_KEY
 * (Bearer user token is used instead).
 */
export class BffFlowsConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): BffFlowsConfig {
        if (BffFlowsConfig.instance) {
            return BffFlowsConfig.instance;
        }

        const config: BffFlowsConfig = new BffFlowsConfig();

        config.baseUrl = ((process.env.BFF_BASE_URL || "") + "").trim().replace(/\/+$/, "");
        config.timeoutMs = Number(process.env.BFF_FLOWS_TIMEOUT_MS) || 600000;

        const parsedMax = Number(process.env.BFF_FLOWS_MAX_RESPONSE_BYTES);
        config.maxResponseBytes = (Number.isFinite(parsedMax) && parsedMax > 0)
            ? Math.floor(parsedMax)
            : DEFAULT_MAX_RESPONSE_BYTES;

        BffFlowsConfig.instance = config;

        return config;
    }

    /**
     * Exposed for tests to inject or reset the singleton.
     */
    public static setInstance(config: BffFlowsConfig | null): void {
        BffFlowsConfig.instance = config;
    }

    private static instance: BffFlowsConfig = null;

    /** BFF base URL without trailing slash (e.g. http://localhost:4000). Shared with provisioning. */
    public baseUrl: string;

    /** HTTP timeout in milliseconds (flow runs can be long). */
    public timeoutMs: number;

    /** Max response body bytes for outbound BFF calls (abort + discard beyond this). */
    public maxResponseBytes: number;

    constructor() {
        this.baseUrl = "";
        this.timeoutMs = 600000;
        this.maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES;
    }

    /**
     * Whether outbound flows proxy calls should be made.
     */
    public isEnabled(): boolean {
        return !!this.baseUrl;
    }
}
