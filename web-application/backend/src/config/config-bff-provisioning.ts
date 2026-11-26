// BFF workspace provisioning configuration (DLT → BFF)

"use strict";

/**
 * Outbound config for calling the BFF /provisioning/workspaces* endpoints.
 * Disabled when the feature flag is off or base URL / API key are missing.
 */
export class BffProvisioningConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): BffProvisioningConfig {
        if (BffProvisioningConfig.instance) {
            return BffProvisioningConfig.instance;
        }

        const config: BffProvisioningConfig = new BffProvisioningConfig();

        const enabledRaw = ((process.env.BFF_PROVISIONING_ENABLED || "") + "").trim().toUpperCase();
        config.enabledFlag = enabledRaw === "YES" || enabledRaw === "TRUE" || enabledRaw === "1";
        config.baseUrl = ((process.env.BFF_BASE_URL || "") + "").trim().replace(/\/+$/, "");
        config.apiKey = ((process.env.BFF_PROVISIONING_API_KEY || "") + "").trim();
        config.timeoutMs = Number(process.env.BFF_PROVISIONING_TIMEOUT_MS) || 15000;

        BffProvisioningConfig.instance = config;

        return config;
    }

    /**
     * Exposed for tests to inject or reset the singleton.
     */
    public static setInstance(config: BffProvisioningConfig | null): void {
        BffProvisioningConfig.instance = config;
    }

    private static instance: BffProvisioningConfig = null;

    /** Explicit feature flag from env (BFF_PROVISIONING_ENABLED). */
    public enabledFlag: boolean;

    /** BFF base URL without trailing slash (e.g. http://localhost:4000). */
    public baseUrl: string;

    /** Shared secret sent as x-provisioning-key (must match BFF PROVISIONING_API_KEY). */
    public apiKey: string;

    /** HTTP timeout in milliseconds. */
    public timeoutMs: number;

    constructor() {
        this.enabledFlag = false;
        this.baseUrl = "";
        this.apiKey = "";
        this.timeoutMs = 15000;
    }

    /**
     * Whether outbound provisioning calls should be made.
     */
    public isEnabled(): boolean {
        return this.enabledFlag && !!this.baseUrl && !!this.apiKey;
    }
}
