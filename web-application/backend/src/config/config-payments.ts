// Reserved for license

"use strict";

/**
 * Payments configuration.
 */
export class PaymentsConfig {
    public static getInstance(): PaymentsConfig {
        if (PaymentsConfig.instance) {
            return PaymentsConfig.instance;
        }

        const config: PaymentsConfig = new PaymentsConfig();

        config.currency = (process.env.PAYMENTS_CURRENCY || "EUR").toUpperCase();
        config.subscriptionMonthlyPeriodDays = Number.parseInt(process.env.PAYMENTS_SUBSCRIPTION_MONTHLY_PERIOD_DAYS || "30", 10);
        config.subscriptionAnnualPeriodDays = Number.parseInt(process.env.PAYMENTS_SUBSCRIPTION_ANNUAL_PERIOD_DAYS || "365", 10);
        config.subscriptionNoticeDays = Number.parseInt(process.env.PAYMENTS_SUBSCRIPTION_NOTICE_DAYS || "7", 10);
        config.pendingPaymentExpirationDays = Number.parseInt(process.env.PAYMENTS_PENDING_PAYMENT_EXPIRATION_DAYS || "7", 10);
        config.subscriptionGracePeriodDays = Number.parseInt(process.env.PAYMENTS_SUBSCRIPTION_GRACE_PERIOD_DAYS || "5", 10);

        PaymentsConfig.instance = config;

        return config;
    }

    private static instance: PaymentsConfig = null;

    public currency = "EUR";

    public subscriptionMonthlyPeriodDays = 30;
    public subscriptionAnnualPeriodDays = 365;
    public subscriptionNoticeDays = 7;
    public pendingPaymentExpirationDays = 7;
    public subscriptionGracePeriodDays = 5;

}
