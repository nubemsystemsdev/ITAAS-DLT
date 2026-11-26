// Payments platform config service

"use strict";

import { PaymentsConfig } from "../config/config-payments";
import { PaymentsPlatformConfig } from "../models/payments-platform-config";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_GRACE_PERIOD_DAYS_MIN = 0;
export const SUBSCRIPTION_GRACE_PERIOD_DAYS_MAX = 365;

/**
 * Runtime subscription billing settings stored in the database (editable from admin UI).
 */
export class PaymentsPlatformConfigService {
    private static instance: PaymentsPlatformConfigService = null;

    public static getInstance(): PaymentsPlatformConfigService {
        if (PaymentsPlatformConfigService.instance) {
            return PaymentsPlatformConfigService.instance;
        }
        PaymentsPlatformConfigService.instance = new PaymentsPlatformConfigService();
        return PaymentsPlatformConfigService.instance;
    }

    public sanitizeSubscriptionGracePeriodDays(value: number): number {
        if (!Number.isFinite(value)) {
            return PaymentsConfig.getInstance().subscriptionGracePeriodDays;
        }
        const days = Math.floor(value);
        return Math.min(SUBSCRIPTION_GRACE_PERIOD_DAYS_MAX, Math.max(SUBSCRIPTION_GRACE_PERIOD_DAYS_MIN, days));
    }

    public computeGracePeriodEnd(startMs: number, gracePeriodDays: number): number {
        const days = this.sanitizeSubscriptionGracePeriodDays(gracePeriodDays);
        return startMs + days * MS_PER_DAY;
    }

    /**
     * Ensures the default payments platform config row exists in the database.
     * Called at master process startup; uses PAYMENTS_SUBSCRIPTION_GRACE_PERIOD_DAYS when seeding.
     */
    public async ensureDefaultConfig(): Promise<void> {
        const envDefault = PaymentsConfig.getInstance().subscriptionGracePeriodDays;
        await PaymentsPlatformConfig.getOrCreateDefault(envDefault);
    }

    public async getSubscriptionGracePeriodDays(): Promise<number> {
        const envDefault = PaymentsConfig.getInstance().subscriptionGracePeriodDays;
        const cfg = await PaymentsPlatformConfig.getOrCreateDefault(envDefault);
        return this.sanitizeSubscriptionGracePeriodDays(cfg.subscriptionGracePeriodDays);
    }

    public async getAdminConfig(): Promise<PaymentsPlatformConfig> {
        const envDefault = PaymentsConfig.getInstance().subscriptionGracePeriodDays;
        return PaymentsPlatformConfig.getOrCreateDefault(envDefault);
    }

    public applyGracePeriodDays(cfg: PaymentsPlatformConfig, gracePeriodDays: number): void {
        cfg.subscriptionGracePeriodDays = this.sanitizeSubscriptionGracePeriodDays(gracePeriodDays);
        cfg.updatedAt = Date.now();
    }
}
