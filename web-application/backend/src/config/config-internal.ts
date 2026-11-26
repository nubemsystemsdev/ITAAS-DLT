// Internal service API configuration

"use strict";

/**
 * Internal service API configuration.
 */
export class InternalServiceConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): InternalServiceConfig {
        if (InternalServiceConfig.instance) {
            return InternalServiceConfig.instance;
        }

        const config: InternalServiceConfig = new InternalServiceConfig();

        config.apiKey = process.env.INTERNAL_SERVICE_API_KEY || "";

        InternalServiceConfig.instance = config;

        return config;
    }
    private static instance: InternalServiceConfig = null;

    public apiKey: string;

    constructor() {
        this.apiKey = "";
    }

    /**
     * Whether the internal service API is configured.
     */
    public isConfigured(): boolean {
        return !!this.apiKey;
    }
}
