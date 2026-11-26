// Reserved for license

"use strict";

/**
 * Stripe configuration.
 */
export class StripeConfig {

    /**
     * Gets the configuration instance.
     */
    public static getInstance(): StripeConfig {
        if (StripeConfig.instance) {
            return StripeConfig.instance;
        }

        const config: StripeConfig = new StripeConfig();

        config.clientId = process.env.STRIPE_CLIENT_ID || "pk_test_51RWxQpRbmDU921Nj4iesIoAFNdeR9sfViVHHGUYB88TuY5AgjoZaMwVzRBjXzQi7O7XjeczJrwoARH8g2x8DkYd000FYUnEifY";
        config.clientSecret = process.env.STRIPE_CLIENT_SECRET || "sk_test_51RWxQpRbmDU921NjbcFVH119cJglRmIHjMELq0kkSV44Yv97NImyS28cdgSlKqMuFHpVKKhjJpE4sqPwmouIgK6a00Wj8U1Cdw";
        config.webhookId = process.env.STRIPE_WEBHOOK_SECRET || "whsec_8bea29159632f24d52c64575de11013e43696b7878f5ee82adec133ab05f4be2";
        config.fee = Number(process.env.STRIPE_FEE) || 0;

        StripeConfig.instance = config;

        return config;
    }
    private static instance: StripeConfig = null;

    public clientId: string;
    public clientSecret: string;
    public webhookId: string;
    public fee: number;

    constructor() {
        this.clientId = "pk_test_51RWxQpRbmDU921Nj4iesIoAFNdeR9sfViVHHGUYB88TuY5AgjoZaMwVzRBjXzQi7O7XjeczJrwoARH8g2x8DkYd000FYUnEifY";
        this.clientSecret = "sk_test_51RWxQpRbmDU921NjbcFVH119cJglRmIHjMELq0kkSV44Yv97NImyS28cdgSlKqMuFHpVKKhjJpE4sqPwmouIgK6a00Wj8U1Cdw";
        this.webhookId = "";
        this.fee = 0;
    }
}
