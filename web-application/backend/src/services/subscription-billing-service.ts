// Reserved for license

"use strict";

import Stripe from "stripe";
import { Config } from "../config/config";
import { RedisConfig } from "../config/config-redis";
import { Monitor } from "../monitor";
import { PaymentsConfig } from "../config/config-payments";
import { PaymentsPlatformConfigService } from "./payments-platform-config-service";
import { BillingCycle, ItemPlan } from "../models/item-plan";
import { Plan } from "../models/plan";
import { PlanPricing } from "../models/plan-pricing";
import { Payment, PaymentStatus, PaymentType } from "../models/payment";
import { PaymentEvent } from "../models/payment-event";
import { SubscribableType, Subscription, SubscriptionBillingCycle, SubscriptionStatus } from "../models/subscription";
import { CatalogItem, CatalogItemType, CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS, CUSTOM_AGENT_ITEM_ID } from "../models/catalog-item";
import { computeNoticeAt, computePeriodEnd, computeUnusedPeriodRefundCents, getPeriodDays } from "../utils/payments-utils";
import { resolveSeatIncreaseTargetFromInvoice } from "../utils/subscription-seat-utils";
import { createRandomUID } from "../utils/text-utils";
import { StripeService } from "./stripe-service";
import { TraceabilityService } from "./traceability-service";
import { TokenService } from "./token-service";
import { NotificationService } from "./notification-service";
import { User } from "../models/users/user";
import { OrganizationService } from "./organization-service";
import { OrganizationLicensePoolService } from "./organization-license-pool-service";
import { OrganizationDeletionSubscriptionPreference } from "../models/organization-deletion-request";
import { SubscriptionService } from "./subscription-service";
import { ItaasWorkspaceProvisioningService } from "./itaas-workspace-provisioning-service";
import { RedisService } from "./redis-service";
import { TokenTraceability, TokenTraceabilityActionKind } from "../models/token-traceability";
import { sha256 } from "../utils/hash";

interface PlanChangeHoldContext {
    subscriptionId: string;
    customerId: string;
    createdAt: number;
    phase: "credit_pending" | "credit_applied" | "update_pending" | "commit_pending" | "credit_rejected" | "reversal_pending";
    reversalAttemptedAt?: number;
}

export interface CreateStripeSubscriptionResult {
    subscription: Subscription;
    checkoutUrl: string;
}

export type SubscriptionPlanChangeMode = "immediate" | "period_end";

export interface ScheduledSubscriptionPlanChangeResult {
    subscription: Subscription;
    effectiveAt: number;
}

export interface ProrationPreview {
    creditCents: number;
    chargeCents: number;
    totalDueCents: number;
    currency: string;
}

export class SubscriptionBillingService {
    private static instance: SubscriptionBillingService | null = null;
    private readonly checkoutChains = new Map<string, Promise<void>>();

    public static getInstance(): SubscriptionBillingService {
        if (SubscriptionBillingService.instance) {
            return SubscriptionBillingService.instance;
        }
        SubscriptionBillingService.instance = new SubscriptionBillingService();
        return SubscriptionBillingService.instance;
    }

    private async recordSubscriptionPayment(data: {
        uid: string;
        subscriptionId: string;
        subscribableType: SubscribableType;
        subscribableId: string;
        billingCycle: SubscriptionBillingCycle;
        amountCents: number;
        currency: string;
        paymentType: PaymentType;
        providerSessionId: string;
        providerEventId: string;
        stripePaymentIntentId?: string;
        status?: PaymentStatus;
    }): Promise<Payment | null> {
        const existingEvent = await PaymentEvent.findByProviderEventId(data.providerEventId);
        if (existingEvent) {
            Monitor.info(`[Subscription] Payment event ${data.providerEventId} already processed, skipping.`);
            return null;
        }

        let catalogItemType = "";
        if (data.subscribableType === SubscribableType.ITEM && data.subscribableId) {
            const itemPlan = await ItemPlan.findById(data.subscribableId);
            if (itemPlan) {
                const item = await CatalogItem.findById(itemPlan.itemId);
                if (item) {
                    catalogItemType = item.type;
                }
            }
        }

        const payment = await Payment.create(
            data.uid,
            data.paymentType,
            "stripe",
            data.providerSessionId,
            data.providerEventId,
            data.amountCents,
            data.currency.toUpperCase(),
            data.subscribableType,
            data.subscribableId,
            data.billingCycle,
            catalogItemType || undefined,
        );
        payment.subscriptionId = data.subscriptionId;
        payment.stripePaymentIntentId = data.stripePaymentIntentId || "";
        payment.status = data.status || PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        await PaymentEvent.create(payment.id, data.providerEventId, data.paymentType);

        const subscription = await Subscription.findById(data.subscriptionId);
        if (subscription) {
            subscription.lastPaymentId = payment.id;
            subscription.updatedAt = Date.now();
            await subscription.save();
        }

        Monitor.info(`[Subscription] Payment recorded: ${payment.id} type=${data.paymentType} status=${payment.status} subscription=${data.subscriptionId}`);
        return payment;
    }

    /**
     * Resolves the internal payment id for checkout side effects on webhook retries.
     * @param payment Payment returned by recordSubscriptionPayment, if any
     * @param providerEventId Stripe event id used for payment deduplication
     * @returns Internal payment id or empty string
     */
    private async resolveCheckoutPaymentId(payment: Payment | null, providerEventId: string): Promise<string> {
        if (payment?.id) {
            return payment.id;
        }
        const existingEvent = await PaymentEvent.findByProviderEventId(providerEventId);
        if (!existingEvent?.paymentId) {
            return "";
        }
        const existingPayment = await Payment.findById(existingEvent.paymentId);
        return existingPayment?.id || "";
    }

    /**
     * Grants NubemTokens for a confirmed subscription payment. Idempotent by payment id.
     */
    private async grantTokensForSubscriptionPayment(payment: Payment | null): Promise<void> {
        if (!payment?.id) {
            return;
        }
        if (
            payment.status === PaymentStatus.FAILED
            || payment.status === PaymentStatus.CANCELLED
            || payment.status === PaymentStatus.REFUNDED
        ) {
            return;
        }
        await TokenService.getInstance().grantFromPayment(payment);
    }

    private async findPaymentByProviderEventId(providerEventId: string): Promise<Payment | null> {
        const eventId = ((providerEventId || "") + "").trim();
        if (!eventId) {
            return null;
        }
        const existingEvent = await PaymentEvent.findByProviderEventId(eventId);
        if (!existingEvent?.paymentId) {
            return null;
        }
        return Payment.findById(existingEvent.paymentId);
    }

    /**
     * Resolves the stripePriceId from either an ItemPlan or PlanPricing based on subscribableType.
     * @param subscribableType - Type of subscribable entity ("item" or "plan")
     * @param subscribableId - Identifier of the ItemPlan or PlanPricing
     * @returns Object with stripePriceId, billingCycle and itemId
     */
    private async resolveStripePrice(subscribableType: SubscribableType, subscribableId: string): Promise<{ stripePriceId: string; billingCycle: string; itemId: string }> {
        if (subscribableType === SubscribableType.PLAN) {
            const planPricing = await PlanPricing.findById(subscribableId);
            if (!planPricing) {
                throw new Error("PLAN_PRICING_NOT_FOUND");
            }
            if (!planPricing.stripePriceId) {
                throw new Error("PLAN_STRIPE_PRICE_NOT_CONFIGURED");
            }
            return {
                stripePriceId: planPricing.stripePriceId,
                billingCycle: planPricing.billingCycle,
                itemId: planPricing.planId,
            };
        }

        const itemPlan = await ItemPlan.findById(subscribableId);
        if (!itemPlan) {
            throw new Error("PLAN_NOT_FOUND");
        }
        if (!itemPlan.stripePriceId) {
            throw new Error("PLAN_STRIPE_PRICE_NOT_CONFIGURED");
        }
        return {
            stripePriceId: itemPlan.stripePriceId,
            billingCycle: itemPlan.billingCycle,
            itemId: itemPlan.itemId,
        };
    }

    /**
     * Creates a recurring Stripe subscription for an item plan or plan pricing
     * and synchronizes/creates the local database subscription.
     * @param uid - Owner user identifier
     * @param subscribableType - Subscribable type ("item" or "plan")
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @returns Created local subscription and Stripe checkout URL
     */
    public async createStripeSubscription(uid: string, subscribableType: SubscribableType, subscribableId: string, redeemTokens: number = 0, successUrl?: string, cancelUrl?: string, options?: { organizationId?: string; quantity?: number }): Promise<CreateStripeSubscriptionResult> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const orgId = options?.organizationId || null;
        await SubscriptionService.getInstance().assertPersonalMultiLicensePlanPurchaseAllowed(subscribableType, subscribableId, orgId);
        const canEditQuantity = await this.isQuantityEditable(subscribableType, subscribableId);
        const quantity = (orgId && canEditQuantity) ? (options?.quantity || 1) : 1;

        const resolved = await this.resolveStripePrice(subscribableType, subscribableId);

        const customerId = await this.getOrCreateCustomerId(uid);

        if (resolved.itemId !== CUSTOM_AGENT_ITEM_ID) {
            if (orgId) {
                const existingOrgSubs = await Subscription.findNonCancelledByOrganization(orgId);
                if (existingOrgSubs.some(s => s.subscribableType === subscribableType && s.subscribableId === subscribableId)) {
                    throw new Error("ALREADY_SUBSCRIBED");
                }
            } else {
                const existingStripeSubs = await stripe.client.subscriptions.list({
                    customer: customerId,
                    price: resolved.stripePriceId,
                    status: "active",
                    limit: 1,
                });
                if (existingStripeSubs.data.length > 0) {
                    throw new Error("ALREADY_SUBSCRIBED");
                }
            }
        }

        const local = await Subscription.createSubscription({
            uid,
            organizationId: orgId || undefined,
            subscribableType,
            subscribableId,
            billingCycle: this.toBillingCycle(resolved.billingCycle),
            status: SubscriptionStatus.PENDING,
            quantity,
        });

        const checkoutUrl = await this.createCheckoutForExistingSubscription(local, redeemTokens, successUrl, cancelUrl, { organizationId: orgId || undefined, quantity });
        return {
            subscription: local,
            checkoutUrl: checkoutUrl,
        };
    }

    /**
     * Creates a local monthly subscription for a delivered custom agent.
     * Requires a reusable payment method on the Stripe customer (saved at deposit checkout).
     * @throws Error DELIVERY_FAILED | PAYMENT_METHOD_REQUIRED
     */
    public async createCustomAgentMonthlySubscription(uid: string, organizationId?: string, requestId?: string): Promise<Subscription> {
        await CatalogItem.getOrCreateCustomAgentService();
        let monthly = await ItemPlan.findByItemAndCycle(CUSTOM_AGENT_ITEM_ID, BillingCycle.MONTHLY);
        if (!monthly) {
            monthly = await ItemPlan.createPlan({
                itemId: CUSTOM_AGENT_ITEM_ID,
                billingCycle: BillingCycle.MONTHLY,
                priceCents: CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS,
                stripePriceId: "",
            });
        }

        let stripeSubscriptionId = "";
        let localStatus = SubscriptionStatus.ACTIVE;
        const stripe = StripeService.getInstance();
        const rid = ((requestId || "") + "").trim();
        if (stripe.client && !Config.IS_TEST) {
            if (!monthly.stripePriceId) {
                throw new Error("DELIVERY_FAILED");
            }
            try {
                const customerId = await this.getOrCreateCustomerId(uid);
                let stripeSubscription: Stripe.Subscription | null = null;

                if (rid) {
                    const listed = await stripe.client.subscriptions.list({
                        customer: customerId,
                        status: "all",
                        limit: 100,
                    });
                    stripeSubscription = listed.data.find((sub) => {
                        const kind = ((sub.metadata?.kind || "") + "");
                        const metaRequestId = ((sub.metadata?.request_id || "") + "");
                        const status = ((sub.status || "") + "").toLowerCase();
                        return kind === "custom_agent_monthly"
                            && metaRequestId === rid
                            && (status === "active" || status === "trialing");
                    }) || null;
                }

                if (stripeSubscription) {
                    const existingLocal = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
                    if (existingLocal) {
                        return existingLocal;
                    }
                    stripeSubscriptionId = stripeSubscription.id;
                    localStatus = this.mapStripeSubscriptionStatus(stripeSubscription.status);
                } else {
                    const defaultPaymentMethodId = await this.resolveCustomerDefaultPaymentMethodId(customerId);
                    if (!defaultPaymentMethodId) {
                        throw new Error("PAYMENT_METHOD_REQUIRED");
                    }

                    const created = await stripe.client.subscriptions.create({
                        customer: customerId,
                        items: [{ price: monthly.stripePriceId, quantity: 1 }],
                        default_payment_method: defaultPaymentMethodId,
                        payment_behavior: "error_if_incomplete",
                        metadata: {
                            kind: "custom_agent_monthly",
                            uid,
                            organization_id: organizationId || "",
                            request_id: rid,
                        },
                    });
                    stripeSubscriptionId = created.id;
                    localStatus = this.mapStripeSubscriptionStatus(created.status);
                }

                if (localStatus !== SubscriptionStatus.ACTIVE) {
                    if (stripeSubscriptionId) {
                        try {
                            await stripe.client.subscriptions.cancel(stripeSubscriptionId);
                        } catch (cancelEx) {
                            Monitor.exception(cancelEx instanceof Error ? cancelEx : new Error(String(cancelEx)));
                        }
                    }
                    throw new Error("DELIVERY_FAILED");
                }
            } catch (ex) {
                if (ex instanceof Error && (ex.message === "DELIVERY_FAILED" || ex.message === "PAYMENT_METHOD_REQUIRED")) {
                    throw ex;
                }
                if (this.isStripePaymentMethodMissingError(ex)) {
                    throw new Error("PAYMENT_METHOD_REQUIRED");
                }
                Monitor.exception(ex instanceof Error ? ex : new Error(String(ex)));
                throw new Error("DELIVERY_FAILED");
            }
        }

        return Subscription.createSubscription({
            uid,
            organizationId,
            subscribableType: SubscribableType.ITEM,
            subscribableId: monthly.id,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            status: localStatus,
            stripeSubscriptionId,
        });
    }

    public async createCheckoutForExistingSubscription(local: Subscription, redeemTokens: number = 0, successUrl?: string, cancelUrl?: string, options?: { organizationId?: string; quantity?: number }): Promise<string> {
        return this.withSubscriptionCheckoutLock(local.id, () => this.createSubscriptionCheckout(local, redeemTokens, successUrl, cancelUrl, options));
    }

    private withSubscriptionCheckoutLock<T>(subscriptionId: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.checkoutChains.get(subscriptionId) || Promise.resolve();
        const run = previous.then(async () => {
            if (!RedisConfig.getInstance().enabled) {
                return fn();
            }
            const key = `subscription:checkout:${subscriptionId}`;
            const token = createRandomUID();
            const redis = RedisService.getInstance();
            if (!await redis.tryAcquireLock(key, token, 5 * 60 * 1000)) {
                throw new Error("SUBSCRIPTION_CHECKOUT_BUSY");
            }
            try {
                return await fn();
            } finally {
                await redis.releaseLock(key, token).catch(ex => Monitor.exception(ex));
            }
        });
        const tail = run.then(() => undefined, () => undefined);
        this.checkoutChains.set(subscriptionId, tail);
        return run.finally(() => {
            if (this.checkoutChains.get(subscriptionId) === tail) {
                this.checkoutChains.delete(subscriptionId);
            }
        });
    }

    private async findSubscriptionCheckouts(client: Stripe, local: Subscription, customerId: string): Promise<Stripe.Checkout.Session[]> {
        const sessions: Stripe.Checkout.Session[] = [];
        for await (const session of client.checkout.sessions.list({
            customer: customerId,
            limit: 100,
            ...(local.createdAt > 0 ? { created: { gte: Math.floor(local.createdAt / 1000) } } : {}),
        })) {
            if (session.metadata?.kind === "subscription_checkout" && session.metadata.local_subscription_id === local.id) {
                sessions.push(session);
            }
        }
        return sessions;
    }

    private async expirePreviousSubscriptionCheckouts(client: Stripe, local: Subscription, customerId: string): Promise<void> {
        const sessions = await this.findSubscriptionCheckouts(client, local, customerId);
        if (sessions.some(session => session.status === "complete")) {
            // Payment may have completed before its webhook reaches the local subscription.
            throw new Error("SUBSCRIPTION_CHECKOUT_ALREADY_COMPLETED");
        }
        const operations = new Set<string>();
        for (const session of sessions) {
            if (session.status === "open") {
                // The expiration webhook must not cancel the subscription being retried.
                await client.checkout.sessions.update(session.id, { metadata: { subscription_checkout_replaced: "true" } });
                let expired: Stripe.Checkout.Session;
                try {
                    expired = await client.checkout.sessions.expire(session.id);
                } catch (ex) {
                    // A timeout may hide a successful expiration, or payment may win the race.
                    expired = await client.checkout.sessions.retrieve(session.id);
                    if (expired.status !== "expired") {
                        if (expired.status === "open") {
                            await client.checkout.sessions.update(session.id, { metadata: { subscription_checkout_replaced: "" } });
                        }
                        throw ex;
                    }
                }
                if (expired.status !== "expired") {
                    throw new Error("SUBSCRIPTION_CHECKOUT_NOT_EXPIRED");
                }
            } else if (session.status !== "expired") {
                throw new Error("SUBSCRIPTION_CHECKOUT_NOT_EXPIRED");
            }
            const operationId = session.metadata?.token_redeem_operation_id;
            if (operationId) {
                operations.add(operationId);
            }
        }
        // Legacy sessions can share a hold: expire every session before releasing it.
        for (const operationId of operations) {
            await TokenService.getInstance().release(operationId, "REDEEM_RELEASE_CHECKOUT_REPLACED");
        }
    }

    private async createSubscriptionCheckout(local: Subscription, redeemTokens: number, successUrl?: string, cancelUrl?: string, options?: { organizationId?: string; quantity?: number }): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const orgId = options?.organizationId || local.organizationId || null;
        const canEditQuantity = await this.isQuantityEditable(local.subscribableType, local.subscribableId);
        const quantity = (orgId && canEditQuantity) ? (options?.quantity || local.quantity || 1) : 1;

        const resolved = await this.resolveStripePrice(local.subscribableType, local.subscribableId);
        const customerId = await this.getOrCreateCustomerId(local.uid);

        await this.expirePreviousSubscriptionCheckouts(stripe.client, local, customerId);

        const operationId = `redeem:subscription:checkout:${local.id}:${createRandomUID()}`;
        const priceCents = (await this.resolvePriceCents(local.subscribableType, local.subscribableId) ?? 0) * quantity;
        const tokenHold = redeemTokens > 0
            ? await TokenService.getInstance().hold(local.uid, priceCents, redeemTokens, operationId, orgId)
            : { appliedTokens: 0, discountEurCents: 0 };

        let checkoutAttempted = false;
        try {
            let stripeDiscounts: { coupon: string }[] = [];
            if (tokenHold.appliedTokens > 0 && tokenHold.discountEurCents > 0) {
                const coupon = await stripe.client.coupons.create({
                    name: "Nubem tokens",
                    amount_off: tokenHold.discountEurCents,
                    currency: "eur",
                    duration: "once",
                });
                stripeDiscounts = [{ coupon: coupon.id }];
            }

            checkoutAttempted = true;
            const checkout = await stripe.client.checkout.sessions.create({
                mode: "subscription",
                customer: customerId,
                line_items: [{ price: resolved.stripePriceId, quantity }],
                ...(stripeDiscounts.length > 0 ? { discounts: stripeDiscounts } : {}),
                metadata: {
                    kind: "subscription_checkout",
                    uid: local.uid,
                    organization_id: orgId || "",
                    quantity: quantity + "",
                    subscribable_type: local.subscribableType,
                    subscribable_id: local.subscribableId,
                    local_subscription_id: local.id,
                    item_id: resolved.itemId,
                    token_redeem_operation_id: tokenHold.appliedTokens > 0 ? operationId : "",
                },
                success_url: successUrl || Config.getInstance().getFrontendURI("/?subscription=success&session_id={CHECKOUT_SESSION_ID}"),
                cancel_url: cancelUrl || Config.getInstance().getFrontendURI("/?subscription=cancel"),
            }, { idempotencyKey: operationId });

            return checkout?.url || "";
        } catch (ex) {
            // Keep the hold on ambiguous Stripe failures: a payable session may exist.
            if (tokenHold.appliedTokens > 0 && (!checkoutAttempted || this.isDefinitiveStripeRejection(ex))) {
                await TokenService.getInstance().release(operationId, "REDEEM_RELEASE_CHECKOUT_FAILED").catch(releaseErr => Monitor.exception(releaseErr));
            }
            throw ex;
        }
    }

    /**
     * Handles a completed Stripe checkout session by linking the local subscription
     * with the Stripe subscription or upserting a new local record.
     * @param session - Stripe checkout session object
     */
    public async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventId?: string): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const stripeSubscriptionId = typeof session?.subscription === "string" ? session.subscription : "";
        if (!stripeSubscriptionId) {
            return;
        }

        const localSubscriptionId = (session?.metadata?.local_subscription_id || "") + "";
        const uid = (session?.metadata?.uid || "") + "";
        const organizationId = (session?.metadata?.organization_id || "") + "";
        const quantity = parseInt((session?.metadata?.quantity || "1") + "", 10) || 1;
        const subscribableType = (session?.metadata?.subscribable_type || "") + "" as SubscribableType;
        const subscribableId = (session?.metadata?.subscribable_id || "") + "";
        const amountCents = Math.floor(Number(session?.amount_total || session?.amount_subtotal || 0));
        const currency = (session?.currency || "eur") + "";
        const tokenRedeemOperationId = (session?.metadata?.token_redeem_operation_id || "") + "";
        const providerEventId = eventId || ("checkout_session_completed:" + session.id);
        let stripePaymentIntentId = "";
        const sessionPaymentIntent = session.payment_intent;
        if (typeof sessionPaymentIntent === "string") {
            stripePaymentIntentId = sessionPaymentIntent;
        } else if (sessionPaymentIntent && typeof sessionPaymentIntent === "object") {
            stripePaymentIntentId = (sessionPaymentIntent as Stripe.PaymentIntent).id || "";
        }

        if (localSubscriptionId) {
            const local = await Subscription.findById(localSubscriptionId);
            if (local) {
                const shouldApplyEffects = !local.stripeSubscriptionId || local.stripeSubscriptionId === stripeSubscriptionId;
                const stripeSub = await stripe.client.subscriptions.retrieve(stripeSubscriptionId, { expand: ["items.data.price"] });
                local.stripeSubscriptionId = stripeSubscriptionId;
                local.organizationId = await this.resolveCheckoutOrganizationId(local.uid, local.organizationId, organizationId);
                local.quantity = quantity;
                await this.syncLocalSubscriptionFromStripe(local, stripeSub);

                if (shouldApplyEffects) {
                    await this.applyCheckoutCreatePaymentEffects({
                        local,
                        uid: local.uid,
                        amountCents,
                        currency,
                        subscribableType: local.subscribableType,
                        subscribableId: local.subscribableId,
                        billingCycle: local.billingCycle as SubscriptionBillingCycle,
                        tokenRedeemOperationId,
                        sessionId: session.id,
                        providerEventId,
                        stripePaymentIntentId,
                    });
                }
                return;
            }
        }

        if (uid && subscribableId) {
            const existingByStripe = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
            const resolved = await this.resolveStripePrice(subscribableType || SubscribableType.ITEM, subscribableId);
            const billingCycle = this.toBillingCycle(resolved.billingCycle);
            const stripeSub = await stripe.client.subscriptions.retrieve(stripeSubscriptionId);
            const local = await this.upsertLocalSubscription(
                uid,
                subscribableType || SubscribableType.ITEM,
                subscribableId,
                stripeSubscriptionId,
                billingCycle,
                this.mapStripeSubscriptionStatus(stripeSub.status),
            );

            local.organizationId = await this.resolveCheckoutOrganizationId(uid, local.organizationId, organizationId);
            local.quantity = quantity;
            local.updatedAt = Date.now();
            await local.save();

            if (!existingByStripe || local.stripeSubscriptionId === stripeSubscriptionId) {
                await this.applyCheckoutCreatePaymentEffects({
                    local,
                    uid,
                    amountCents,
                    currency,
                    subscribableType: subscribableType || SubscribableType.ITEM,
                    subscribableId,
                    billingCycle,
                    tokenRedeemOperationId,
                    sessionId: session.id,
                    providerEventId,
                    stripePaymentIntentId,
                });
            }
        }
    }

    /**
     * Records the first subscription charge if needed, then applies checkout side effects.
     * Reuses an existing CREATE payment when `invoice.paid` already recorded it.
     */
    private async applyCheckoutCreatePaymentEffects(input: {
        local: Subscription;
        uid: string;
        amountCents: number;
        currency: string;
        subscribableType: SubscribableType;
        subscribableId: string;
        billingCycle: SubscriptionBillingCycle;
        tokenRedeemOperationId: string;
        sessionId: string;
        providerEventId: string;
        stripePaymentIntentId: string;
    }): Promise<void> {
        const existingCreate = await Payment.findConfirmedBySubscriptionIdAndType(input.local.id, PaymentType.SUBSCRIPTION_CREATE);
        let checkoutPaymentId = ((existingCreate?.id || "") + "").trim();
        if (!checkoutPaymentId) {
            const payment = await this.recordSubscriptionPayment({
                uid: input.uid,
                subscriptionId: input.local.id,
                subscribableType: input.subscribableType,
                subscribableId: input.subscribableId,
                billingCycle: input.billingCycle,
                amountCents: input.amountCents,
                currency: input.currency,
                paymentType: PaymentType.SUBSCRIPTION_CREATE,
                providerSessionId: input.sessionId,
                providerEventId: input.providerEventId,
                stripePaymentIntentId: input.stripePaymentIntentId,
            });
            checkoutPaymentId = await this.resolveCheckoutPaymentId(payment, input.providerEventId);
        }
        if (!checkoutPaymentId) {
            Monitor.warning(`[Subscription] Skipping checkout side effects: payment not resolved for event ${input.providerEventId}`);
            return;
        }
        await this.applyCheckoutSideEffects(
            input.local.id,
            input.uid,
            checkoutPaymentId,
            input.tokenRedeemOperationId || undefined,
            input.sessionId,
        );
    }

    /**
     * Applies subscription checkout side effects in a retry-safe order.
     * Token grant is idempotent by payment id and traceability creation
     * tolerates duplicate-create failures during webhook retries.
     */
    private async applyCheckoutSideEffects(
        subscriptionId: string,
        uid: string,
        paymentId: string,
        tokenRedeemOperationId?: string,
        sessionId?: string,
    ): Promise<void> {
        const payment = await Payment.findById(paymentId);
        await this.grantTokensForSubscriptionPayment(payment);

        if (tokenRedeemOperationId) {
            try {
                await TokenService.getInstance().commit(tokenRedeemOperationId, paymentId || "", sessionId || "");
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : `${ex}`;
                Monitor.error(`[Subscription] Error committing token redeem hold ${tokenRedeemOperationId}: ${message}`);
            }
        }

        await this.recordSubscriptionCreatedWithDuplicateTolerance(subscriptionId, uid);
    }

    private async recordSubscriptionCreatedWithDuplicateTolerance(subscriptionId: string, subscriberId: string): Promise<void> {
        try {
            await TraceabilityService.getInstance().recordSubscriptionCreated(subscriptionId, subscriberId);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : `${ex}`;
            if (this.isLikelyDuplicateSubscriptionCreateError(message)) {
                return;
            }
            throw ex;
        }
    }

    private isLikelyDuplicateSubscriptionCreateError(message: string): boolean {
        const normalized = (message || "").toLowerCase();
        return (
            normalized.includes("already_exists")
            || normalized.includes("already exists")
            || normalized.includes("already_created")
            || normalized.includes("already created")
            || normalized.includes("duplicate")
        );
    }

    /**
     * Changes the price/plan of an existing Stripe subscription
     * and updates the associated local subscription.
     * @param uid - Owner user identifier
     * @param subscriptionId - Local subscription identifier
     * @param targetSubscribableType - Target subscribable type
     * @param targetSubscribableId - Target ItemPlan or PlanPricing identifier
     * @param redeemTokens - Number of tokens to apply as discount (default 0)
     * @returns Updated local subscription
     */
    public async changePlan(uid: string, subscriptionId: string, targetSubscribableType: SubscribableType, targetSubscribableId: string, redeemTokens: number = 0): Promise<Subscription> {
        return this.withSubscriptionCheckoutLock(subscriptionId, () => this.changePlanLocked(uid, subscriptionId, targetSubscribableType, targetSubscribableId, redeemTokens));
    }

    private async changePlanLocked(uid: string, subscriptionId: string, targetSubscribableType: SubscribableType, targetSubscribableId: string, redeemTokens: number): Promise<Subscription> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (local?.uid !== uid) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        await SubscriptionService.getInstance().assertPersonalMultiLicensePlanPurchaseAllowed(targetSubscribableType, targetSubscribableId, local.organizationId);
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        const resolved = await this.resolveStripePrice(targetSubscribableType, targetSubscribableId);

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price", "schedule"] });
        const firstItem = stripeSub.items.data[0];
        if (!firstItem?.id) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
        }

        await this.reconcilePlanChangeTokenHoldsLocked(local, stripe.client, stripeSub);

        await this.releaseSubscriptionSchedule(stripeSub.schedule || null);

        const operationId = `redeem:subscription:change:${subscriptionId}:${targetSubscribableId}:${createRandomUID()}`;
        let tokenHeld = false;
        let stripeCreditAppliedCents = 0;
        let stripeCreditCustomerId = "";
        let stripeCreditResultUncertain = false;
        let stripePlanChangeAttempted = false;
        let stripePlanChangeApplied = false;
        let tokenHoldReleased = false;

        try {
            if (redeemTokens > 0) {
                const prorationPreview = await this.previewProration(uid, subscriptionId, targetSubscribableType, targetSubscribableId);
                if (prorationPreview.totalDueCents > 0) {
                    const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : (stripeSub.customer as Stripe.Customer).id;
                    const tokenHold = await TokenService.getInstance().hold(uid, prorationPreview.totalDueCents, redeemTokens, operationId, local.organizationId, {
                        planChange: { subscriptionId, customerId, createdAt: Date.now(), phase: "credit_pending" } satisfies PlanChangeHoldContext,
                    });
                    tokenHeld = tokenHold.appliedTokens > 0;
                    if (tokenHeld && tokenHold.discountEurCents > 0) {
                        stripeCreditResultUncertain = true;
                        await stripe.client.customers.createBalanceTransaction(customerId, this.planChangeCreditParams(operationId, -tokenHold.discountEurCents), { idempotencyKey: operationId });
                        stripeCreditAppliedCents = tokenHold.discountEurCents;
                        stripeCreditCustomerId = customerId;
                        stripeCreditResultUncertain = false;
                        await this.setPlanChangeHoldPhase(operationId, "credit_applied");
                    }
                }
            }

            const currentQuantity = firstItem.quantity || 1;
            if (tokenHeld) {
                await this.setPlanChangeHoldPhase(operationId, "update_pending");
            }
            stripePlanChangeAttempted = true;
            await stripe.client.subscriptions.update(local.stripeSubscriptionId, {
                items: [{ id: firstItem.id, price: resolved.stripePriceId, quantity: currentQuantity }],
                proration_behavior: "always_invoice",
                metadata: {
                    uid: uid,
                    subscribable_type: targetSubscribableType,
                    subscribable_id: targetSubscribableId,
                    item_id: resolved.itemId,
                    ...(tokenHeld ? { token_plan_change_operation_id: operationId } : {}),
                },
            }, { idempotencyKey: `${operationId}:update` });
            stripePlanChangeApplied = true;
            if (tokenHeld) {
                await this.setPlanChangeHoldPhase(operationId, "commit_pending");
            }
        } catch (ex) {
            // An uncertain update may already have consumed the credit on an invoice.
            if (tokenHeld && !stripePlanChangeApplied && (!stripePlanChangeAttempted || this.isDefinitiveStripeRejection(ex))) {
                try {
                    if (stripeCreditResultUncertain && this.isDefinitiveStripeRejection(ex)) {
                        await this.setPlanChangeHoldPhase(operationId, "credit_rejected");
                        await TokenService.getInstance().release(operationId, "PLAN_CHANGE_FAILED");
                        tokenHoldReleased = true;
                    } else if (stripeCreditAppliedCents > 0 && stripeCreditCustomerId) {
                        await this.setPlanChangeHoldPhase(operationId, "reversal_pending");
                        await stripe.client.customers.createBalanceTransaction(stripeCreditCustomerId, this.planChangeCreditParams(operationId, stripeCreditAppliedCents), { idempotencyKey: `${operationId}:revert` });
                        await TokenService.getInstance().release(operationId, "PLAN_CHANGE_FAILED");
                        tokenHoldReleased = true;
                    } else if (!stripeCreditResultUncertain) {
                        await this.setPlanChangeHoldPhase(operationId, "credit_rejected");
                        await TokenService.getInstance().release(operationId, "PLAN_CHANGE_FAILED");
                        tokenHoldReleased = true;
                    }
                } catch (cleanupErr) {
                    Monitor.error(`[Subscription] Plan change ${operationId} requires reconciliation: ${cleanupErr instanceof Error ? cleanupErr.message : cleanupErr}`);
                }
            }
            if (tokenHeld && !tokenHoldReleased) {
                Monitor.warning(`[Subscription] Retry will reconcile plan change token hold ${operationId} before creating another reservation`);
            }
            throw ex;
        }

        if (tokenHeld) {
            await TokenService.getInstance().commit(operationId, local.lastPaymentId || "", "").catch(commitErr => {
                const message = commitErr instanceof Error ? commitErr.message : `${commitErr}`;
                Monitor.error(`[Subscription] Error committing token hold after changePlan: ${message}`);
            });
        }

        const updatedSubscription = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price"] });
        await this.syncLocalSubscriptionFromStripe(local, updatedSubscription);
        return local;
    }

    private isDefinitiveStripeRejection(ex: unknown): boolean {
        if (!(ex instanceof Stripe.errors.StripeError) || ex.statusCode >= 500 || ex.statusCode === 409) {
            return false;
        }
        return ex instanceof Stripe.errors.StripeInvalidRequestError
            || ex instanceof Stripe.errors.StripeAuthenticationError
            || ex instanceof Stripe.errors.StripePermissionError
            || ex instanceof Stripe.errors.StripeRateLimitError
            || ex instanceof Stripe.errors.StripeCardError;
    }

    private planChangeCreditParams(operationId: string, amount: number): Stripe.CustomerCreateBalanceTransactionParams {
        return {
            amount,
            currency: "eur",
            metadata: amount < 0 ? { token_redeem_operation_id: operationId } : { token_redeem_reversal_operation_id: operationId },
        };
    }

    private planChangeHoldContext(hold: TokenTraceability): PlanChangeHoldContext {
        const context = JSON.parse(hold.payloadJson || "{}").payload?.planChange as PlanChangeHoldContext;
        if (!context?.customerId || !context.subscriptionId || !context.createdAt || !context.phase) {
            throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
        }
        return context;
    }

    private async setPlanChangeHoldPhase(operationId: string, phase: PlanChangeHoldContext["phase"]): Promise<void> {
        const hold = (await TokenTraceability.findByOperationAction(operationId, TokenTraceabilityActionKind.REDEEM_HOLD))[0];
        if (!hold) {
            throw new Error("TOKEN_HOLD_NOT_FOUND");
        }
        const payload = JSON.parse(hold.payloadJson);
        const context = this.planChangeHoldContext(hold);
        context.phase = phase;
        if (phase === "reversal_pending" && !context.reversalAttemptedAt) {
            context.reversalAttemptedAt = Date.now();
        }
        payload.payload.planChange = context;
        hold.payloadJson = JSON.stringify(payload);
        hold.payloadHash = sha256(hold.payloadJson);
        hold.updatedAt = Date.now();
        await hold.save();
    }

    /** Reconciles persisted token holds before a new plan change, including after a restart. */
    public async reconcilePlanChangeTokenHolds(subscriptionId: string): Promise<Subscription> {
        return this.withSubscriptionCheckoutLock(subscriptionId, async () => {
            const local = await Subscription.findById(subscriptionId);
            const client = StripeService.getInstance().client;
            if (!local?.stripeSubscriptionId || !client) {
                throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
            }
            const holds = await TokenTraceability.findOpenPlanChangeHolds(subscriptionId);
            if (holds.length === 0) {
                return local;
            }
            const stripeSub = await client.subscriptions.retrieve(local.stripeSubscriptionId);
            await this.reconcilePlanChangeTokenHoldsLocked(local, client, stripeSub, holds);
            return local;
        });
    }

    private async reconcilePlanChangeTokenHoldsLocked(local: Subscription, client: Stripe, stripeSub: Stripe.Subscription, holds?: TokenTraceability[]): Promise<void> {
        for (const hold of holds ?? await TokenTraceability.findOpenPlanChangeHolds(local.id)) {
            const context = this.planChangeHoldContext(hold);
            if (context.subscriptionId !== local.id) {
                throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
            }
            if (context.phase === "credit_rejected") {
                await TokenService.getInstance().release(hold.operationId, "PLAN_CHANGE_RECONCILED");
                continue;
            }
            if (context.phase === "commit_pending" || (context.phase !== "reversal_pending" && stripeSub.metadata?.token_plan_change_operation_id === hold.operationId)) {
                await this.syncLocalSubscriptionFromStripe(local, stripeSub);
                await TokenService.getInstance().commit(hold.operationId, local.lastPaymentId || "", "");
                continue;
            }
            if (context.phase === "update_pending") {
                // Missing metadata does not prove that an uncertain Stripe update failed.
                throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
            }
            const amount = Math.abs(hold.amountEurCents);
            let credit: Stripe.CustomerBalanceTransaction;
            let reversal: Stripe.CustomerBalanceTransaction;
            for await (const transaction of client.customers.listBalanceTransactions(context.customerId, { limit: 100 })) {
                if (transaction.metadata?.token_redeem_operation_id === hold.operationId) {
                    credit = transaction;
                }
                if (transaction.metadata?.token_redeem_reversal_operation_id === hold.operationId) {
                    reversal = transaction;
                }
            }
            const retryWindowMs = 24 * 60 * 60 * 1000;
            if (!credit && !reversal) {
                // Never replay an expired idempotency key: Stripe could create a second credit.
                if (Date.now() - context.createdAt >= retryWindowMs) {
                    throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
                }
                credit = await client.customers.createBalanceTransaction(context.customerId, this.planChangeCreditParams(hold.operationId, -amount), { idempotencyKey: hold.operationId });
            }
            if ((credit && (credit.amount !== -amount || credit.currency !== "eur")) || (reversal && (reversal.amount !== amount || reversal.currency !== "eur"))) {
                throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
            }
            if (!reversal) {
                if (context.reversalAttemptedAt && Date.now() - context.reversalAttemptedAt >= retryWindowMs) {
                    throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
                }
                await this.setPlanChangeHoldPhase(hold.operationId, "reversal_pending");
                await client.customers.createBalanceTransaction(context.customerId, this.planChangeCreditParams(hold.operationId, amount), { idempotencyKey: `${hold.operationId}:revert` });
            }
            await TokenService.getInstance().release(hold.operationId, "PLAN_CHANGE_RECONCILED");
        }
    }

    /**
     * Decides whether a requested plan change can be applied immediately
     * or must wait until the end of the current billing cycle.
     * @param currentSub - Current active subscription
     * @param targetSubscribableType - Target subscribable type
     * @param targetSubscribableId - Target plan or pricing identifier
     * @returns Effective mode enforced by the backend
     */
    public async determinePlanChangeMode(
        currentSub: Subscription,
        targetSubscribableType: SubscribableType,
        targetSubscribableId: string,
    ): Promise<SubscriptionPlanChangeMode> {
        if (!currentSub?.id || !targetSubscribableId) {
            return "period_end";
        }

        if (currentSub.subscribableType === SubscribableType.PLAN && targetSubscribableType === SubscribableType.PLAN) {
            return this.determinePlanToPlanChangeMode(currentSub.subscribableId, targetSubscribableId);
        }

        if (currentSub.subscribableType === SubscribableType.ITEM && targetSubscribableType === SubscribableType.ITEM) {
            return this.determineItemToItemChangeMode(currentSub.subscribableId, targetSubscribableId);
        }

        return "period_end";
    }

    private async determinePlanToPlanChangeMode(currentSubscribableId: string, targetSubscribableId: string): Promise<SubscriptionPlanChangeMode> {
        const currentPlanIndex = await this.resolvePlanIndex(currentSubscribableId);
        const targetPlanIndex = await this.resolvePlanIndex(targetSubscribableId);

        if (currentPlanIndex === null || targetPlanIndex === null) {
            return "period_end";
        }

        if (targetPlanIndex !== currentPlanIndex) {
            return targetPlanIndex > currentPlanIndex ? "immediate" : "period_end";
        }

        const currentPriceCents = await this.resolvePriceCents(SubscribableType.PLAN, currentSubscribableId);
        const targetPriceCents = await this.resolvePriceCents(SubscribableType.PLAN, targetSubscribableId);

        if (currentPriceCents === null || targetPriceCents === null) {
            return "period_end";
        }

        return targetPriceCents > currentPriceCents ? "immediate" : "period_end";
    }

    private async determineItemToItemChangeMode(currentSubscribableId: string, targetSubscribableId: string): Promise<SubscriptionPlanChangeMode> {
        const currentPriceCents = await this.resolveItemPriceCents(currentSubscribableId);
        const targetPriceCents = await this.resolveItemPriceCents(targetSubscribableId);

        if (currentPriceCents === null || targetPriceCents === null) {
            return "period_end";
        }

        return targetPriceCents > currentPriceCents ? "immediate" : "period_end";
    }

    public async resolvePriceCents(subscribableType: SubscribableType, subscribableId: string): Promise<number | null> {
        if (subscribableType === SubscribableType.PLAN) {
            const pricing = await PlanPricing.findById(subscribableId);
            return pricing ? pricing.priceCents : null;
        }
        return this.resolveItemPriceCents(subscribableId);
    }

    public async refreshLocalSubscription(subscriptionId: string): Promise<Subscription> {
        const stripe = StripeService.getInstance();
        const local = await Subscription.findById(subscriptionId);

        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }

        if (!local.stripeSubscriptionId || !stripe.client) {
            return local;
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price"] });
        return this.syncLocalSubscriptionFromStripe(local, stripeSub);
    }

    public async previewProration(uid: string, subscriptionId: string, targetSubscribableType: SubscribableType, targetSubscribableId: string): Promise<ProrationPreview> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (local?.uid !== uid) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        const resolved = await this.resolveStripePrice(targetSubscribableType, targetSubscribableId);
        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId);
        const firstItem = stripeSub.items.data[0];
        if (!firstItem?.id) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
        }

        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : "";
        const prorationDate = Math.floor(Date.now() / 1000);

        const upcoming = await stripe.client.invoices.createPreview({
            customer: customerId,
            subscription: local.stripeSubscriptionId,
            subscription_details: {
                proration_behavior: "create_prorations",
                proration_date: prorationDate,
                items: [{ id: firstItem.id, price: resolved.stripePriceId }],
            },
        });

        let creditCents = 0;
        let chargeCents = 0;

        for (const line of upcoming.lines.data) {
            const isProration = !!((line as Stripe.InvoiceLineItem & {
                parent?: { subscription_item_details?: { proration?: boolean } };
            }).parent?.subscription_item_details?.proration);

            if (!isProration) {
                continue;
            }

            const amount = Number(line.amount || 0);
            if (amount < 0) {
                creditCents += Math.abs(amount);
            } else {
                chargeCents += amount;
            }
        }

        return {
            creditCents,
            chargeCents,
            totalDueCents: Math.max(chargeCents - creditCents, 0),
            currency: upcoming.currency,
        };
    }

    /**
     * Schedules a plan change for the end of the current billing cycle.
     * @param uid - Owner user identifier
     * @param subscriptionId - Local subscription identifier
     * @param targetSubscribableType - Target subscribable type
     * @param targetSubscribableId - Target plan or pricing identifier
     * @returns Local subscription and the timestamp when the change takes effect
     */
    public async schedulePlanChangeAtPeriodEnd(
        uid: string,
        subscriptionId: string,
        targetSubscribableType: SubscribableType,
        targetSubscribableId: string,
    ): Promise<ScheduledSubscriptionPlanChangeResult> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (local?.uid !== uid) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        await SubscriptionService.getInstance().assertPersonalMultiLicensePlanPurchaseAllowed(targetSubscribableType, targetSubscribableId, local.organizationId);
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        const currentResolved = await this.resolveStripePrice(local.subscribableType, local.subscribableId);
        const targetResolved = await this.resolveStripePrice(targetSubscribableType, targetSubscribableId);
        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price", "schedule"] });
        const firstItem = stripeSub.items.data[0];
        const currentPriceId = firstItem?.price?.id || "";

        if (!firstItem?.id || !currentPriceId) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
        }

        const stripeSubPeriodStart = Number((firstItem as any)?.current_period_start || 0);
        const stripeSubPeriodEnd = Number((firstItem as any)?.current_period_end || 0);
        const periodStart = stripeSubPeriodStart || Math.floor(Date.now() / 1000);
        const periodEnd = stripeSubPeriodEnd || periodStart;
        const quantity = firstItem.quantity || 1;
        let scheduleId = this.getScheduleId(stripeSub.schedule || null);
        const scheduleMetadataBase: Record<string, string> = { uid };
        if (local.organizationId) {
            scheduleMetadataBase.organization_id = local.organizationId;
        }

        if (!scheduleId) {
            const createdSchedule = await stripe.client.subscriptionSchedules.create({
                from_subscription: local.stripeSubscriptionId,
            });
            scheduleId = createdSchedule.id;
        }

        await stripe.client.subscriptionSchedules.update(scheduleId, {
            end_behavior: "release",
            phases: [
                {
                    start_date: periodStart,
                    end_date: periodEnd,
                    items: [{ price: currentPriceId, quantity }],
                    metadata: {
                        ...scheduleMetadataBase,
                        subscribable_type: local.subscribableType,
                        subscribable_id: local.subscribableId,
                        item_id: currentResolved.itemId,
                    },
                    proration_behavior: "none",
                },
                {
                    start_date: periodEnd,
                    items: [{ price: targetResolved.stripePriceId, quantity }],
                    metadata: {
                        ...scheduleMetadataBase,
                        subscribable_type: targetSubscribableType,
                        subscribable_id: targetSubscribableId,
                        item_id: targetResolved.itemId,
                    },
                    proration_behavior: "none",
                },
            ],
        });

        const cfg = PaymentsConfig.getInstance();
        const targetBillingCycle = this.toBillingCycle(targetResolved.billingCycle);
        const targetPeriodDays = getPeriodDays(targetBillingCycle, cfg);
        const activationTimestamp = periodEnd * 1000;
        const targetEnd = computePeriodEnd(activationTimestamp, targetPeriodDays);

        const pending = await Subscription.createSubscription({
            uid: uid,
            organizationId: local.organizationId || undefined,
            quantity: local.quantity || quantity,
            subscribableType: targetSubscribableType,
            subscribableId: targetSubscribableId,
            billingCycle: targetBillingCycle,
            status: SubscriptionStatus.PENDING,
        });
        pending.currentPeriodStart = activationTimestamp;
        pending.currentPeriodEnd = targetEnd;
        pending.updatedAt = Date.now();
        await pending.save();

        local.succeedingSubscriptionId = pending.id;
        local.updatedAt = Date.now();
        await local.save();

        return {
            subscription: local,
            effectiveAt: activationTimestamp,
        };
    }

    /**
     * Cancels a Stripe subscription immediately or at period end
     * and reflects the resulting status in the local subscription.
     * @param subscriptionId - Local subscription identifier
     * @param atPeriodEnd - If true, cancels at period end; if false, cancels immediately
     * @returns Local subscription updated after cancellation
     */
    public async cancel(subscriptionId: string, atPeriodEnd = true): Promise<Subscription> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["schedule"] });
        await this.releaseSubscriptionSchedule(stripeSub.schedule || null);

        await stripe.client.subscriptions.update(local.stripeSubscriptionId, {
            cancel_at_period_end: atPeriodEnd,
        });

        if (atPeriodEnd) {
            const stripeSubUpdated = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, {
                expand: ["items.data.price", "schedule"],
            });
            return this.syncLocalSubscriptionFromStripe(local, stripeSubUpdated);
        }

        const now = Date.now();
        local.cancelAtPeriodEnd = atPeriodEnd;
        if (!atPeriodEnd) {
            local.status = SubscriptionStatus.CANCELLED;
            local.currentPeriodEnd = now;
            local.nextNoticeAt = 0;

            if (local.organizationId) {
                try {
                    await OrganizationLicensePoolService.getInstance().tearDownPoolsForSubscription(local);
                    Monitor.info(`[Subscription] Tore down license pools for org ${local.organizationId} on immediate cancellation of ${local.id}`);
                } catch (ex) {
                    Monitor.warning(`[Subscription] Error tearing down license pools for org ${local.organizationId}: ${ex instanceof Error ? ex.message : ex}`);
                }
            }
        }
        local.updatedAt = now;
        await local.save();
        await this.syncItaasWorkspaceBestEffort(local);
        return local;
    }

    /**
     * Cancels org subscriptions when an organization deletion request is approved.
     */
    public async cancelOrganizationSubscriptionsForDeletion(
        organizationId: string,
        handling: OrganizationDeletionSubscriptionPreference,
        actorUid: string,
    ): Promise<void> {
        const subs = await Subscription.findNonCancelledByOrganization(organizationId);
        for (const sub of subs) {
            if (handling === OrganizationDeletionSubscriptionPreference.IMMEDIATE_PRORATED_REFUND) {
                await this.cancelWithProratedRefund(sub.id, actorUid);
            } else {
                await this.cancelSubscriptionForOrgDeletionAtPeriodEnd(sub.id);
            }
        }
    }

    /**
     * Refunds unused period (prorated) then cancels immediately.
     */
    public async cancelWithProratedRefund(subscriptionId: string, actorUid: string): Promise<Subscription> {
        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        if (!local.stripeSubscriptionId) {
            local.status = SubscriptionStatus.CANCELLED;
            local.updatedAt = Date.now();
            await local.save();
            await this.syncItaasWorkspaceBestEffort(local);
            return local;
        }

        const refundCents = await this.estimateUnusedPeriodRefundCents(local);
        if (refundCents > 0 && (local.lastPaymentId || "").trim()) {
            await this.refundSubscriptionPayment(subscriptionId, local.lastPaymentId, actorUid, refundCents);
        }
        return this.cancel(subscriptionId, false);
    }

    private async cancelSubscriptionForOrgDeletionAtPeriodEnd(subscriptionId: string): Promise<Subscription> {
        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }

        try {
            return await this.cancel(subscriptionId, true);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : String(ex);
            if (message === "SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE" || message === "Stripe is not configured") {
                return SubscriptionService.getInstance().cancelSubscription(local, true);
            }
            throw ex;
        }
    }

    private async estimateUnusedPeriodRefundCents(local: Subscription): Promise<number> {
        const paymentId = (local.lastPaymentId || "").trim();
        if (!paymentId) {
            return 0;
        }
        const payment = await Payment.findById(paymentId);
        if (!payment || payment.status === PaymentStatus.REFUNDED || payment.amountCents <= 0) {
            return 0;
        }
        return computeUnusedPeriodRefundCents(
            local.currentPeriodStart,
            local.currentPeriodEnd,
            payment.amountCents,
        );
    }

    /**
     * Reactivates a subscription scheduled for period-end cancellation
     * and recalculates local validity/notification dates.
     * @param subscriptionId - Local subscription identifier
     * @returns Reactivated local subscription
     */
    public async reactivate(subscriptionId: string): Promise<Subscription> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        await stripe.client.subscriptions.update(local.stripeSubscriptionId, {
            cancel_at_period_end: false,
            pause_collection: null,
        });

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price"] });
        await this.syncLocalSubscriptionFromStripe(local, stripeSub);
        return local;
    }

    /**
     * Suspends billing for a Stripe subscription and marks the local record as suspended.
     * @param subscriptionId - Local subscription identifier
     * @returns Updated local subscription
     */
    public async suspend(subscriptionId: string): Promise<Subscription> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        if (!local.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE");
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["schedule"] });
        await this.releaseSubscriptionSchedule(stripeSub.schedule || null);

        await stripe.client.subscriptions.update(local.stripeSubscriptionId, {
            pause_collection: { behavior: "mark_uncollectible" },
            cancel_at_period_end: false,
        });

        const now = Date.now();
        local.status = SubscriptionStatus.SUSPENDED;
        local.cancelAtPeriodEnd = false;
        local.nextNoticeAt = 0;
        local.updatedAt = now;
        await local.save();

        await TraceabilityService.getInstance().recordSubscriptionSuspendedBestEffort(subscriptionId);
        await this.syncItaasWorkspaceBestEffort(local);

        return local;
    }

    /**
     * Refunds the latest or selected payment linked to a subscription through Stripe.
     * @param subscriptionId - Local subscription identifier
     * @param paymentId - Optional payment identifier (defaults to subscription last payment)
     * @param actorUid - Admin user performing the refund
     * @returns Refunded amount in cents and payment identifier
     */
    public async refundSubscriptionPayment(
        subscriptionId: string,
        paymentId: string,
        actorUid: string,
        amountCents?: number,
    ): Promise<{ refundAmountCents: number; paymentId: string }> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (!local) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }

        const targetPaymentId = (paymentId || local.lastPaymentId || "").trim();
        if (!targetPaymentId) {
            throw new Error("PAYMENT_NOT_FOUND");
        }

        const payment = await Payment.findById(targetPaymentId);
        if (!payment) {
            throw new Error("PAYMENT_NOT_FOUND");
        }
        if (payment.subscriptionId && payment.subscriptionId !== subscriptionId) {
            throw new Error("PAYMENT_NOT_FOUND");
        }
        if (payment.status === PaymentStatus.REFUNDED) {
            throw new Error("PAYMENT_ALREADY_REFUNDED");
        }

        const paymentIntentId = await this.resolveStripePaymentIntentId(payment);
        if (!paymentIntentId) {
            throw new Error("STRIPE_PAYMENT_NOT_FOUND");
        }

        let refund: Stripe.Refund;
        const refundAmount = amountCents !== undefined && amountCents > 0
            ? Math.min(Math.floor(amountCents), payment.amountCents)
            : undefined;
        try {
            refund = await stripe.client.refunds.create({
                payment_intent: paymentIntentId,
                ...(refundAmount !== undefined ? { amount: refundAmount } : {}),
            });
        } catch (stripeErr) {
            const msg = (stripeErr instanceof Error ? stripeErr.message : String(stripeErr)) + "";
            if (msg.includes("already been refunded")) {
                payment.status = PaymentStatus.REFUNDED;
                payment.updatedAt = Date.now();
                await payment.save();
                throw new Error("PAYMENT_ALREADY_REFUNDED");
            }
            throw stripeErr;
        }

        const refundCents = Math.max(0, Math.floor(Number(refund.amount || 0)));
        if (refundCents > 0 && (refund.status || "") === "succeeded") {
            await TokenService.getInstance().revertFromRefund(
                payment,
                refundCents,
                actorUid,
                `refund:${payment.id}:${refund.id}`,
            );
        }

        if ((refund.status || "") === "succeeded") {
            const isFullRefund = refundAmount === undefined || refundCents >= payment.amountCents;
            payment.status = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
            payment.updatedAt = Date.now();
            await payment.save();
        }

        return {
            refundAmountCents: refundCents,
            paymentId: payment.id,
        };
    }

    /**
     * Retrieves Stripe metadata for a local subscription.
     * @param subscriptionId - Local subscription identifier
     * @returns Stripe subscription summary
     */
    public async getStripeSubscriptionSummary(subscriptionId: string): Promise<{
        stripe_subscription_id: string;
        stripe_status: string;
        stripe_customer_id: string;
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
        pause_collection: boolean;
    } | null> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findById(subscriptionId);
        if (!local?.stripeSubscriptionId) {
            return null;
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId);
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id || "";

        return {
            stripe_subscription_id: stripeSub.id,
            stripe_status: stripeSub.status,
            stripe_customer_id: customerId,
            current_period_start: Number((stripeSub as { current_period_start?: number }).current_period_start || 0) * 1000,
            current_period_end: Number((stripeSub as { current_period_end?: number }).current_period_end || 0) * 1000,
            cancel_at_period_end: !!stripeSub.cancel_at_period_end,
            pause_collection: !!stripeSub.pause_collection,
        };
    }

    private async resolveStripePaymentIntentId(payment: Payment): Promise<string> {
        if (payment.stripePaymentIntentId) {
            return payment.stripePaymentIntentId;
        }

        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const sessionRef = (payment.providerSessionId || "").trim();
        if (!sessionRef) {
            return "";
        }
        if (sessionRef.startsWith("pi_")) {
            return sessionRef;
        }

        try {
            if (sessionRef.startsWith("in_")) {
                return await this.resolvePaymentIntentFromInvoice(stripe, sessionRef);
            }

            if (sessionRef.startsWith("cs_")) {
                const session = await stripe.client.checkout.sessions.retrieve(sessionRef);
                const paymentIntent = session.payment_intent;
                if (paymentIntent) {
                    return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id || "";
                }

                const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id || "";
                if (invoiceId) {
                    return await this.resolvePaymentIntentFromInvoice(stripe, invoiceId);
                }
            }
        } catch (ex) {
            Monitor.error(`[Subscription] Error resolving payment intent for payment ${payment.id}: ${ex instanceof Error ? ex.message : ex}`);
        }

        return "";
    }

    private async resolvePaymentIntentFromInvoice(stripe: StripeService, invoiceId: string, status: "paid" | "open" = "paid"): Promise<string> {
        if (!stripe.client || !invoiceId) {
            return "";
        }

        let paymentIntentId = "";
        const invoicePayments = stripe.client.invoicePayments.list({ invoice: invoiceId, status, limit: 100 });
        for await (const invoicePayment of invoicePayments) {
            if (invoicePayment.status !== status || (status === "paid" && !invoicePayment.amount_paid)) {
                continue;
            }

            const linkedInvoiceId = typeof invoicePayment.invoice === "string" ? invoicePayment.invoice : invoicePayment.invoice.id;
            if (linkedInvoiceId !== invoiceId || invoicePayment.payment.type !== "payment_intent") {
                return "";
            }

            const paymentIntent = invoicePayment.payment.payment_intent;
            const id = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id || "";
            // A local invoice payment cannot identify one charge when several payments funded the invoice.
            if (!id || (paymentIntentId && paymentIntentId !== id)) {
                return "";
            }
            paymentIntentId = id;
        }

        return paymentIntentId;
    }

    /**
     * Cancels a local subscription when its Stripe checkout session expires without payment.
     */
    public async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
        if (((session?.metadata?.kind || "") + "") !== "subscription_checkout") {
            return;
        }

        if (session.metadata.subscription_checkout_replaced === "true") {
            return;
        }

        const localSubscriptionId = ((session?.metadata?.local_subscription_id || "") + "").trim();
        if (!localSubscriptionId) {
            return;
        }

        return this.withSubscriptionCheckoutLock(localSubscriptionId, () => this.cancelExpiredSubscriptionCheckout(session, localSubscriptionId));
    }

    private async cancelExpiredSubscriptionCheckout(session: Stripe.Checkout.Session, localSubscriptionId: string): Promise<void> {
        const local = await Subscription.findById(localSubscriptionId);
        if (!local || local.stripeSubscriptionId) {
            return;
        }

        if (local.status !== SubscriptionStatus.PENDING && local.status !== SubscriptionStatus.PENDING_PAYMENT) {
            return;
        }

        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const client = StripeService.getInstance().client;
        if (client && customerId) {
            const sessions = await this.findSubscriptionCheckouts(client, local, customerId);
            if (sessions.some(checkout => checkout.id !== session.id && checkout.status !== "expired")) {
                // An earlier expiration event can arrive after a replacement was created.
                return;
            }
        }

        local.status = SubscriptionStatus.CANCELLED;
        local.updatedAt = Date.now();
        await local.save();
        await this.syncItaasWorkspaceBestEffort(local);
        Monitor.info(`[Subscription] Cancelled abandoned checkout subscription ${local.id} (session ${session.id} expired)`);
    }

    /**
     * Revokes the most recently assigned licenses when active assignments exceed subscription seats.
     * @returns Number of assignments revoked
     */
    public async reconcileOrganizationSeatAssignments(local: Subscription): Promise<number> {
        if (!local?.organizationId || !local.id) {
            return 0;
        }

        return OrganizationLicensePoolService.getInstance().syncPoolsForSubscription(local);
    }

    /**
     * Creates a Stripe Billing Portal session so the user can
     * manage their subscription through Stripe.
     * @param subscriptionId - Local subscription identifier
     * @returns Stripe billing portal session URL
     */
    public async createPortalSession(subscriptionId: string): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const sub = await Subscription.findById(subscriptionId);
        if (!sub?.stripeSubscriptionId) {
            throw new Error("SUBSCRIPTION_NOT_FOUND");
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(sub.stripeSubscriptionId);
        const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : "";
        if (!customerId) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_CUSTOMER");
        }

        const session = await stripe.client.billingPortal.sessions.create({
            customer: customerId,
            return_url: Config.getInstance().getFrontendURI("/"),
        });

        return session.url;
    }

    /**
     * Webhook handler for paid invoices.
     * Marks the local subscription as active, records the payment, and grants NubemTokens.
     * @param stripeSubscriptionId - Stripe subscription identifier
     * @param invoice - Stripe invoice object
     * @param eventId - Stripe event identifier for deduplication
     */
    public async handleInvoicePaid(stripeSubscriptionId: string, invoice?: Stripe.Invoice, eventId?: string): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const local = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
        if (!local) {
            return;
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(stripeSubscriptionId, { expand: ["items.data.price"] });

        if (invoice) {
            await this.applyPendingSeatIncreaseOnInvoicePaid(local, invoice);
        }

        const previousStatus = local.status;
        await this.syncLocalSubscriptionFromStripe(local, stripeSub);

        if (previousStatus === SubscriptionStatus.SUSPENDED && local.status === SubscriptionStatus.ACTIVE) {
            await TraceabilityService.getInstance().recordSubscriptionReactivatedBestEffort(local.id);
        }

        if (local.organizationId) {
            await this.reconcileOrganizationSeatAssignments(local);
        }

        if (invoice && eventId) {
            const billingReason = (invoice.billing_reason || "") + "";
            const paymentType = this.mapInvoiceBillingReasonToPaymentType(billingReason);

            if (paymentType === PaymentType.SUBSCRIPTION_CREATE) {
                const existingCreate = await Payment.findConfirmedBySubscriptionIdAndType(local.id, PaymentType.SUBSCRIPTION_CREATE);
                if (existingCreate) {
                    Monitor.info(`[Subscription] Skipping duplicate subscription_create invoice payment for subscription ${local.id} (checkout already recorded)`);
                    await this.grantTokensForSubscriptionPayment(existingCreate);
                    return;
                }
            }

            const amountCents = Math.floor(Number(invoice.amount_paid || 0));
            const currency = (invoice.currency || "eur") + "";
            const providerEventId = eventId || ("invoice_paid:" + invoice.id);
            const stripePaymentIntentId = await this.resolvePaymentIntentFromInvoice(stripe, invoice.id);

            const payment = await this.recordSubscriptionPayment({
                uid: local.uid,
                subscriptionId: local.id,
                subscribableType: local.subscribableType,
                subscribableId: local.subscribableId,
                billingCycle: local.billingCycle as SubscriptionBillingCycle,
                amountCents,
                currency,
                paymentType,
                providerSessionId: invoice.id,
                providerEventId,
                stripePaymentIntentId,
            });
            await this.grantTokensForSubscriptionPayment(payment || await this.findPaymentByProviderEventId(providerEventId));
        }
    }

    /**
     * Webhook handler for failed payments.
     * Suspends the local subscription, starts the grace period countdown,
     * and records the failed payment attempt for auditing.
     * @param stripeSubscriptionId - Stripe subscription identifier
     * @param invoice - Stripe invoice object
     * @param eventId - Stripe event identifier for deduplication
     */
    public async handlePaymentFailed(stripeSubscriptionId: string, invoice?: Stripe.Invoice, eventId?: string): Promise<void> {
        const local = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
        if (!local) {
            return;
        }

        if (invoice && local.hasPendingSeatIncrease()) {
            const billingReason = (invoice.billing_reason || "") + "";
            if (billingReason === "subscription_update" && await this.revertPendingSeatIncrease(local)) {
                if (eventId) {
                    const amountCents = Math.floor(Number(invoice.amount_due || invoice.amount_paid || invoice.subtotal || 0));
                    const currency = (invoice.currency || "eur") + "";
                    await this.recordSubscriptionPayment({
                        uid: local.uid,
                        subscriptionId: local.id,
                        subscribableType: local.subscribableType,
                        subscribableId: local.subscribableId,
                        billingCycle: local.billingCycle as SubscriptionBillingCycle,
                        amountCents,
                        currency,
                        paymentType: this.mapInvoiceBillingReasonToPaymentType(billingReason),
                        providerSessionId: invoice.id,
                        providerEventId: eventId,
                        stripePaymentIntentId: await this.resolvePaymentIntentFromInvoice(StripeService.getInstance(), invoice.id, "open"),
                        status: PaymentStatus.FAILED,
                    });
                }
                return;
            }
        }

        if (invoice && eventId) {
            const billingReason = (invoice.billing_reason || "") + "";
            const paymentType = this.mapInvoiceBillingReasonToPaymentType(billingReason);
            const amountCents = Math.floor(Number(invoice.amount_due || invoice.amount_paid || invoice.subtotal || 0));
            const currency = (invoice.currency || "eur") + "";

            await this.recordSubscriptionPayment({
                uid: local.uid,
                subscriptionId: local.id,
                subscribableType: local.subscribableType,
                subscribableId: local.subscribableId,
                billingCycle: local.billingCycle as SubscriptionBillingCycle,
                amountCents,
                currency,
                paymentType,
                providerSessionId: invoice.id,
                providerEventId: eventId,
                stripePaymentIntentId: await this.resolvePaymentIntentFromInvoice(StripeService.getInstance(), invoice.id, "open"),
                status: PaymentStatus.FAILED,
            });
        }

        const now = Date.now();
        const gracePeriodDays = await PaymentsPlatformConfigService.getInstance().getSubscriptionGracePeriodDays();
        local.status = SubscriptionStatus.SUSPENDED;
        local.gracePeriodEnd = PaymentsPlatformConfigService.getInstance().computeGracePeriodEnd(now, gracePeriodDays);
        local.updatedAt = now;
        await local.save();

        await this.syncItaasWorkspaceBestEffort(local);
        await TraceabilityService.getInstance().recordSubscriptionSuspendedBestEffort(local.id);

        try {
            if (local.organizationId) {
                await OrganizationService.getInstance().notifyOrganizationAdmins(local.organizationId, {
                    type: "payment_failed",
                    transactionId: local.lastPaymentId || local.id,
                    info: {
                        reason: "PAYMENT_FAILED",
                        retryUrl: "",
                    },
                });
            } else {
                const user = await User.findUserByUID(local.uid);
                if (user) {
                    await NotificationService.getInstance().sendNotification(user, {
                        type: "payment_failed",
                        transactionId: local.lastPaymentId || local.id,
                        info: {
                            reason: "PAYMENT_FAILED",
                            retryUrl: "",
                        },
                    });
                }
            }
        } catch (notifyEx) {
            const msg = notifyEx instanceof Error ? notifyEx.message : String(notifyEx);
            Monitor.warning(`[PAYMENTS] Failed to notify user ${local.uid} of payment failure: ${msg}`);
        }
    }

    /**
     * Webhook handler for deleted Stripe subscriptions.
     * Closes the local subscription and sets immediate termination.
     * @param stripeSubscriptionId - Stripe subscription identifier
     */
    public async handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
        const local = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
        if (!local) {
            return;
        }

        const now = Date.now();
        local.status = SubscriptionStatus.CANCELLED;
        local.cancelAtPeriodEnd = false;
        local.currentPeriodEnd = now;
        local.nextNoticeAt = 0;
        local.updatedAt = now;
        await local.save();

        await this.syncItaasWorkspaceBestEffort(local);

        if (local.organizationId) {
            try {
                await OrganizationLicensePoolService.getInstance().tearDownPoolsForSubscription(local);
                Monitor.info(`[Subscription] Tore down license pools for org ${local.organizationId} on subscription deletion`);
            } catch (ex) {
                Monitor.warning(`[Subscription] Error tearing down license pools for org ${local.organizationId}: ${ex instanceof Error ? ex.message : ex}`);
            }
            try {
                await OrganizationService.getInstance().finalizeOrganizationDeletionIfReady(local.organizationId);
            } catch (ex) {
                Monitor.warning(`[Subscription] Error finalizing org deletion for ${local.organizationId}: ${ex instanceof Error ? ex.message : ex}`);
            }
        }

        if (local.succeedingSubscriptionId) {
            const pending = await Subscription.findById(local.succeedingSubscriptionId);
            if (pending && (pending.status === SubscriptionStatus.PENDING || pending.status === SubscriptionStatus.PENDING_PAYMENT)) {
                pending.status = SubscriptionStatus.PENDING_PAYMENT;
                pending.updatedAt = now;
                await pending.save();
            }
        }

        await TraceabilityService.getInstance().recordSubscriptionCancelledBestEffort(local.id);
    }

    /**
     * Synchronizes the local subscription with the current Stripe subscription state.
     * @param local - Local subscription
     * @param stripeSub - Stripe subscription
     * @returns Updated local subscription
     */
    private async syncLocalSubscriptionFromStripe(local: Subscription, stripeSub: Stripe.Subscription): Promise<Subscription> {
        const now = Date.now();
        const cfg = PaymentsConfig.getInstance();
        const subscribableType = this.parseSubscribableType((stripeSub.metadata?.subscribable_type || "") + "") || local.subscribableType;
        const subscribableId = (stripeSub.metadata?.subscribable_id || local.subscribableId || "") + "";

        local.status = this.mapStripeSubscriptionStatus(stripeSub.status);
        local.cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
        local.subscribableType = subscribableType;

        // Clear grace period when Stripe reports the subscription as active again
        if (local.status === SubscriptionStatus.ACTIVE) {
            local.gracePeriodEnd = 0;
        }

        if (subscribableId) {
            local.subscribableId = subscribableId;
            try {
                const resolved = await this.resolveStripePrice(subscribableType, subscribableId);
                local.billingCycle = this.toBillingCycle(resolved.billingCycle);
            } catch {
                const interval = stripeSub.items.data[0]?.price?.recurring?.interval || "";
                local.billingCycle = interval === "year" ? SubscriptionBillingCycle.ANNUAL : SubscriptionBillingCycle.MONTHLY;
            }
        }
        const firstItem = stripeSub.items?.data?.[0];
        const currentPeriodStart = Number((firstItem as any)?.current_period_start || 0) * 1000;
        const currentPeriodEnd = Number((firstItem as any)?.current_period_end || 0) * 1000;

        if (currentPeriodStart  > 0) {
            local.currentPeriodStart = currentPeriodStart;
        }
        if (currentPeriodEnd > 0) {
            local.currentPeriodEnd = currentPeriodEnd;
            local.nextNoticeAt = computeNoticeAt(currentPeriodEnd, cfg.subscriptionNoticeDays);
        }

        local.updatedAt = now;

        const appliedScheduled = await this.applyScheduledQuantityIfDue(local, stripeSub);
        if (!appliedScheduled && !local.hasPendingSeatIncrease()) {
            const stripeQuantity = stripeSub.items?.data?.[0]?.quantity;
            if (typeof stripeQuantity === "number" && stripeQuantity > 0) {
                if (local.hasScheduledQuantityDecrease() && now < (local.scheduledQuantityEffectiveAt || 0)) {
                    if (stripeQuantity > local.quantity) {
                        local.quantity = stripeQuantity;
                    }
                } else {
                    local.quantity = stripeQuantity;
                }
            }
        }

        await local.save();
        await this.finalizeScheduledPlanChangeIfApplied(local);
        if (local.organizationId && !local.hasScheduledQuantityDecrease()) {
            await OrganizationLicensePoolService.getInstance().syncPoolsForSubscription(local);
        }
        await this.syncItaasWorkspaceBestEffort(local);
        return local;
    }

    /**
     * Best-effort BFF logical-tenant sync for ITAAS Platform subscriptions.
     * Never throws: billing webhooks must not fail because of provisioning.
     */
    private async syncItaasWorkspaceBestEffort(local: Subscription): Promise<void> {
        if (!local) {
            return;
        }
        try {
            await ItaasWorkspaceProvisioningService.getInstance().syncWorkspaceForSubscription(local);
        } catch (ex) {
            Monitor.warning(
                `[Subscription] ITAAS workspace sync failed for ${local.id}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    /**
     * Archives the pending successor subscription when a Stripe schedule
     * has applied the planned change to the active subscription.
     */
    private async finalizeScheduledPlanChangeIfApplied(local: Subscription): Promise<void> {
        if (!local.succeedingSubscriptionId || !local.stripeSubscriptionId) {
            return;
        }

        const pending = await Subscription.findById(local.succeedingSubscriptionId);
        if (!pending || pending.status !== SubscriptionStatus.PENDING) {
            return;
        }

        if (
            pending.subscribableType === local.subscribableType &&
            pending.subscribableId === local.subscribableId
        ) {
            pending.status = SubscriptionStatus.CANCELLED;
            pending.updatedAt = Date.now();
            await pending.save();
            local.succeedingSubscriptionId = "";
            local.updatedAt = Date.now();
            await local.save();
            Monitor.info(`[Subscription] Scheduled plan change applied for ${local.id}, archived pending ${pending.id}`);
        }
    }

    /**
     * Maps Stripe invoice billing_reason to local payment type.
     */
    private mapInvoiceBillingReasonToPaymentType(billingReason: string): PaymentType {
        switch (billingReason) {
            case "subscription_create":
                return PaymentType.SUBSCRIPTION_CREATE;
            case "subscription_update":
                return PaymentType.SUBSCRIPTION_CHANGE_PLAN;
            case "subscription_cycle":
                return PaymentType.SUBSCRIPTION_RENEW;
            default:
                return PaymentType.SUBSCRIPTION_RENEW;
        }
    }

    /**
     * Creates or updates the local subscription to keep
     * status, billing cycle, and periods synchronized with Stripe operations.
     * @param uid - Owner user identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param stripeSubscriptionId - Stripe subscription identifier
     * @param billingCycle - Normalized billing cycle
     * @param status - Subscription status
     * @returns Created or updated local subscription
     */
    private async upsertLocalSubscription(
        uid: string,
        subscribableType: SubscribableType,
        subscribableId: string,
        stripeSubscriptionId: string,
        billingCycle: SubscriptionBillingCycle,
        status: SubscriptionStatus,
    ): Promise<Subscription> {
        const now = Date.now();
        const cfg = PaymentsConfig.getInstance();
        const rows = await Subscription.findByUserAndSubscribable(uid, subscribableId);
        const existing = rows[0] || null;
        if (existing) {
            existing.status = status;
            existing.billingCycle = billingCycle;
            existing.stripeSubscriptionId = stripeSubscriptionId;
            existing.cancelAtPeriodEnd = false;
            existing.currentPeriodStart = now;
            existing.currentPeriodEnd = computePeriodEnd(now, getPeriodDays(billingCycle, cfg));
            existing.nextNoticeAt = computeNoticeAt(existing.currentPeriodEnd, cfg.subscriptionNoticeDays);
            existing.updatedAt = now;
            await existing.save();
            return existing;
        }

        const created = await Subscription.createSubscription({
            uid: uid,
            subscribableType: subscribableType,
            subscribableId: subscribableId,
            billingCycle: billingCycle,
            status: status,
            stripeSubscriptionId: stripeSubscriptionId,
        });
        created.currentPeriodStart = now;
        created.currentPeriodEnd = computePeriodEnd(now, getPeriodDays(billingCycle, cfg));
        created.nextNoticeAt = computeNoticeAt(created.currentPeriodEnd, cfg.subscriptionNoticeDays);
        created.updatedAt = now;
        await created.save();
        return created;
    }

    /**
     * Maps Stripe subscription status values to local subscription status.
     * @param stripeStatus - Status returned by Stripe
     * @returns Local normalized subscription status
     */
    private mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
        const normalized = ((stripeStatus || "") + "").toLowerCase();
        if (normalized === "active" || normalized === "trialing") {
            return SubscriptionStatus.ACTIVE;
        }
        if (normalized === "past_due" || normalized === "unpaid" || normalized === "incomplete_expired") {
            return SubscriptionStatus.PAST_DUE;
        }
        if (normalized === "canceled") {
            return SubscriptionStatus.CANCELLED;
        }
        return SubscriptionStatus.PENDING;
    }

    /**
     * Resolves the plan index associated with a plan pricing identifier.
     * @param subscribableId - Plan pricing identifier
     * @returns Plan index or null when it cannot be resolved
     */
    private async resolvePlanIndex(subscribableId: string): Promise<number | null> {
        const pricing = await PlanPricing.findById(subscribableId);
        if (!pricing) {
            return null;
        }

        const plan = await Plan.findById(pricing.planId);
        return plan ? plan.planIndex : null;
    }

    /**
     * Resolves the item-plan price in cents.
     * @param subscribableId - Item plan identifier
     * @returns Price in cents or null when it cannot be resolved
     */
    private async resolveItemPriceCents(subscribableId: string): Promise<number | null> {
        const itemPlan = await ItemPlan.findById(subscribableId);
        return itemPlan ? itemPlan.priceCents : null;
    }

    /**
     * Releases an active subscription schedule so it does not override a new decision.
     * @param schedule - Stripe schedule reference
     */
    private async releaseSubscriptionSchedule(schedule: string | Stripe.SubscriptionSchedule | null): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const scheduleId = this.getScheduleId(schedule);
        if (!scheduleId) {
            return;
        }

        const scheduleStatus = typeof schedule === "string" ? "" : schedule?.status || "";
        if (scheduleStatus && scheduleStatus !== "active" && scheduleStatus !== "not_started") {
            return;
        }

        await stripe.client.subscriptionSchedules.release(scheduleId);
    }

    /**
     * Returns the identifier of a Stripe schedule reference.
     * @param schedule - Stripe schedule reference
     * @returns Schedule identifier or an empty string
     */
    private getScheduleId(schedule: string | Stripe.SubscriptionSchedule | null): string {
        if (!schedule) {
            return "";
        }

        return typeof schedule === "string" ? schedule : schedule.id || "";
    }

    /**
     * Parses a raw subscribable type value.
     * @param raw - Raw subscribable type
     * @returns Parsed subscribable type or null
     */
    private parseSubscribableType(raw: string): SubscribableType | null {
        const normalized = (raw || "").trim();
        return Object.values(SubscribableType).includes(normalized as SubscribableType) ? (normalized as SubscribableType) : null;
    }

    /**
     * Resolves a reusable card payment method for off-session subscription charges.
     * Prefers the customer default; otherwise uses the newest attached card and promotes it to default.
     */
    private async resolveCustomerDefaultPaymentMethodId(customerId: string): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return "";
        }

        const customer = await stripe.client.customers.retrieve(customerId);
        if (!customer || ("deleted" in customer && customer.deleted)) {
            return "";
        }

        const activeCustomer = customer as Stripe.Customer;
        const defaultRaw = activeCustomer.invoice_settings?.default_payment_method;
        const defaultId = typeof defaultRaw === "string"
            ? defaultRaw
            : (defaultRaw && typeof defaultRaw === "object" && "id" in defaultRaw ? ((defaultRaw as Stripe.PaymentMethod).id || "") : "");
        if (defaultId) {
            return defaultId;
        }

        const listed = await stripe.client.paymentMethods.list({
            customer: customerId,
            type: "card",
            limit: 1,
        });
        const paymentMethodId = listed.data[0]?.id || "";
        if (!paymentMethodId) {
            return "";
        }

        try {
            await stripe.client.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
        } catch (ex) {
            Monitor.exception(ex instanceof Error ? ex : new Error(String(ex)));
        }

        return paymentMethodId;
    }

    private isStripePaymentMethodMissingError(ex: unknown): boolean {
        if (!ex || typeof ex !== "object") {
            return false;
        }
        const err = ex as { code?: string; type?: string; message?: string; raw?: { code?: string; decline_code?: string } };
        const code = ((err.code || err.raw?.code || "") + "").toLowerCase();
        const message = ((err.message || "") + "").toLowerCase();
        if (code === "resource_missing" && message.indexOf("payment method") >= 0) {
            return true;
        }
        if (code === "payment_intent_payment_attempt_failed" || code === "invoice_payment_intent_requires_action") {
            return true;
        }
        if (message.indexOf("no attached payment source") >= 0 || message.indexOf("default payment method") >= 0) {
            return true;
        }
        if (message.indexOf("payment method") >= 0 && (message.indexOf("missing") >= 0 || message.indexOf("required") >= 0)) {
            return true;
        }
        return false;
    }

    /**
     * Returns the Stripe customer associated with the user
     * or creates a new one using local uid metadata.
     * @param uid - Owner user identifier
     * @returns Stripe customer identifier
     */
    public async getOrCreateCustomerId(uid: string): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const search = await stripe.client.customers.search({
            query: `metadata['uid']:'${uid}'`,
            limit: 1,
        });
        if (search.data.length > 0) {
            return search.data[0].id;
        }

        const customer = await stripe.client.customers.create({
            metadata: { uid: uid },
        });
        return customer.id;
    }

    /**
     * Normalizes a raw billing cycle value into internal enums.
     * @param raw - Raw billing cycle value
     * @returns Normalized billing cycle
     */
    private toBillingCycle(raw: string): SubscriptionBillingCycle {
        if ((raw || "").toLowerCase() === "annual") {
            return SubscriptionBillingCycle.ANNUAL;
        }
        return SubscriptionBillingCycle.MONTHLY;
    }

    private async resolveCatalogItemType(subscribableType: SubscribableType, subscribableId: string): Promise<CatalogItemType | null> {
        if (subscribableType === SubscribableType.PLAN) {
            return null;
        }
        const itemPlan = await ItemPlan.findById(subscribableId);
        if (!itemPlan) {
            return null;
        }
        const catalogItem = await CatalogItem.findById(itemPlan.itemId);
        return (catalogItem?.type as CatalogItemType) || null;
    }

    public async isQuantityEditable(subscribableType: SubscribableType, subscribableId: string): Promise<boolean> {
        const catalogType = await this.resolveCatalogItemType(subscribableType, subscribableId);
        return catalogType === CatalogItemType.DIGITAL_PRODUCT;
    }

    public async isRecurringServiceItem(subscribableType: SubscribableType, subscribableId: string): Promise<boolean> {
        const catalogType = await this.resolveCatalogItemType(subscribableType, subscribableId);
        return catalogType === CatalogItemType.RECURRING_SERVICE;
    }

    /**
     * Resolves checkout quantity: multi-seat only for org admins on quantity-editable subscribables.
     */
    public async resolveCheckoutQuantity(
        subscribableType: SubscribableType,
        subscribableId: string,
        orgId: string | undefined,
        requestedQuantity: number,
        fallbackQuantity = 1,
    ): Promise<number> {
        const canEditQuantity = await this.isQuantityEditable(subscribableType, subscribableId);
        if (orgId && canEditQuantity) {
            return Math.max(1, Math.floor(requestedQuantity || fallbackQuantity || 1));
        }
        return 1;
    }

    /**
     * Resolves unit price, effective quantity, and total checkout amount in cents.
     */
    public async resolveCheckoutTotalCents(
        subscribableType: SubscribableType,
        subscribableId: string,
        orgId: string | undefined,
        requestedQuantity: number,
        fallbackQuantity = 1,
    ): Promise<{ unitPriceCents: number; quantity: number; totalPriceCents: number }> {
        const unitPriceCents = await this.resolvePriceCents(subscribableType, subscribableId) ?? 0;
        const quantity = await this.resolveCheckoutQuantity(subscribableType, subscribableId, orgId, requestedQuantity, fallbackQuantity);
        return {
            unitPriceCents,
            quantity,
            totalPriceCents: unitPriceCents * quantity,
        };
    }

    /**
     * Applies organization scope from checkout metadata without overwriting an existing org.
     */
    private async resolveCheckoutOrganizationId(
        uid: string,
        localOrganizationId: string | null,
        metadataOrganizationId: string,
    ): Promise<string | null> {
        if (localOrganizationId) {
            if (metadataOrganizationId && metadataOrganizationId !== localOrganizationId) {
                Monitor.warning(`[Subscription] Ignoring checkout organization_id ${metadataOrganizationId} for user ${uid}; local subscription already scoped to ${localOrganizationId}`);
            }
            return localOrganizationId;
        }

        if (!metadataOrganizationId) {
            return null;
        }

        const isAdmin = await OrganizationService.getInstance().isOrganizationAdmin(uid, metadataOrganizationId);
        if (!isAdmin) {
            Monitor.warning(`[Subscription] Ignoring checkout organization_id ${metadataOrganizationId} for user ${uid}; user is not an org admin`);
            return null;
        }

        return metadataOrganizationId;
    }

    public async updateSubscriptionQuantity(
        stripeSubscriptionId: string,
        quantity: number,
        prorationBehavior: "create_prorations" | "always_invoice" | "none" = "create_prorations",
        metadata?: Record<string, string>,
        paymentBehavior?: "error_if_incomplete" | "default_incomplete" | "allow_incomplete" | "pending_if_incomplete",
    ): Promise<Stripe.Subscription> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const stripeSub = await stripe.client.subscriptions.retrieve(stripeSubscriptionId);
        const firstItem = stripeSub.items.data[0];
        if (!firstItem?.id) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
        }

        return stripe.client.subscriptions.update(stripeSubscriptionId, {
            items: [{ id: firstItem.id, quantity }],
            proration_behavior: prorationBehavior,
            ...(metadata ? { metadata } : {}),
            ...(paymentBehavior ? { payment_behavior: paymentBehavior } : {}),
            expand: ["latest_invoice"],
        });
    }

    /**
     * Requests a seat increase: invoices immediately in Stripe but keeps local quantity and
     * license pools unchanged until invoice.paid (see applyPendingSeatIncreaseOnInvoicePaid).
     */
    public async requestSeatIncrease(local: Subscription, newQuantity: number): Promise<void> {
        if (!local.stripeSubscriptionId) {
            throw new Error("NO_STRIPE_SUBSCRIPTION");
        }
        const currentQuantity = local.getCurrentSeatLimit();
        if (newQuantity <= currentQuantity && !local.hasPendingSeatIncrease()) {
            throw new Error("INVALID_QUANTITY_INCREASE");
        }

        if (local.hasPendingSeatIncrease()) {
            const pendingQty = local.pendingQuantity || 0;
            if (newQuantity !== pendingQty) {
                throw new Error("PENDING_SEAT_INCREASE_PAYMENT");
            }
            return;
        }

        const previousPending = local.pendingQuantity || 0;
        const previousInvoiceId = local.seatIncreaseInvoiceId || "";
        local.pendingQuantity = newQuantity;
        local.updatedAt = Date.now();
        await local.save();

        try {
            // payment_behavior "error_if_incomplete" makes the change atomic: if the off-session
            // charge fails, Stripe throws and does NOT raise the subscription item quantity.
            const updatedSub = await this.updateSubscriptionQuantity(
                local.stripeSubscriptionId,
                newQuantity,
                "always_invoice",
                {
                    seat_increase_pending: "true",
                    pending_quantity: String(newQuantity),
                },
                "error_if_incomplete",
            );

            local.seatIncreaseInvoiceId = this.extractLatestInvoiceId(updatedSub);
            local.updatedAt = Date.now();
            await local.save();
        } catch (ex) {
            local.pendingQuantity = previousPending;
            local.seatIncreaseInvoiceId = previousInvoiceId;
            local.updatedAt = Date.now();
            await local.save();
            if (this.isStripeCardError(ex)) {
                throw new Error("SEAT_INCREASE_PAYMENT_FAILED");
            }
            throw ex;
        }
    }

    /**
     * Extracts the latest invoice id from an updated Stripe subscription (latest_invoice expanded or id).
     */
    private extractLatestInvoiceId(stripeSub: Stripe.Subscription): string {
        const latestInvoice = stripeSub.latest_invoice;
        if (!latestInvoice) {
            return "";
        }
        if (typeof latestInvoice === "string") {
            return latestInvoice;
        }
        return latestInvoice.id || "";
    }

    /**
     * True when the error raised by Stripe is a card error (declined / failed off-session charge).
     */
    private isStripeCardError(ex: unknown): boolean {
        if (!ex || typeof ex !== "object") {
            return false;
        }
        const candidate = ex as { type?: string; rawType?: string; code?: string };
        return candidate.type === "StripeCardError" || candidate.rawType === "card_error" || candidate.code === "card_declined";
    }

    /**
     * Activates a paid seat increase locally (quantity and license pools).
     * @returns True when pending seats were applied
     */
    private async applyPendingSeatIncreaseOnInvoicePaid(local: Subscription, invoice: Stripe.Invoice): Promise<boolean> {
        if (!local.hasPendingSeatIncrease()) {
            return false;
        }
        const billingReason = (invoice.billing_reason || "") + "";
        if (billingReason !== "subscription_update") {
            return false;
        }

        // Only apply for the exact invoice generated when the increase was requested. This prevents a
        // later trivial proration invoice (e.g. a -0.01 retry) from granting seats without real payment.
        const expectedInvoiceId = local.seatIncreaseInvoiceId || "";
        if (expectedInvoiceId && invoice.id !== expectedInvoiceId) {
            Monitor.warning(
                `[Subscription] Skipping seat increase apply for ${local.id}: invoice ${invoice.id} does not match pending seat-increase invoice ${expectedInvoiceId}`,
            );
            return false;
        }

        // Require an actual payment for the increase: a zero/negative invoice must never grant seats.
        const amountPaid = Math.floor(Number(invoice.amount_paid || 0));
        if (amountPaid <= 0) {
            Monitor.warning(
                `[Subscription] Skipping seat increase apply for ${local.id}: invoice ${invoice.id} has no positive amount paid (amount_paid=${amountPaid})`,
            );
            return false;
        }

        const currentQuantity = local.getCurrentSeatLimit();
        const pendingSnapshot = local.pendingQuantity || 0;

        let invoiceForResolve = invoice;
        if (!invoice.lines?.data?.length && invoice.id) {
            const stripe = StripeService.getInstance();
            if (stripe.client) {
                try {
                    invoiceForResolve = await stripe.client.invoices.retrieve(invoice.id, { expand: ["lines.data"] });
                } catch (ex) {
                    Monitor.warning(`[Subscription] Could not expand invoice lines for seat increase ${local.id}: ${ex instanceof Error ? ex.message : ex}`);
                }
            }
        }

        const resolvedTarget = resolveSeatIncreaseTargetFromInvoice(invoiceForResolve, pendingSnapshot, currentQuantity);
        if (resolvedTarget === null || resolvedTarget < currentQuantity) {
            Monitor.warning(
                `[Subscription] Skipping seat increase apply for ${local.id}: invalid target (current=${currentQuantity}, pending=${pendingSnapshot}, invoice=${invoice.id})`,
            );
            return false;
        }

        if (resolvedTarget !== pendingSnapshot) {
            Monitor.warning(
                `[Subscription] Seat increase target from invoice (${resolvedTarget}) differs from pending_quantity (${pendingSnapshot}) for ${local.id}; applying invoice value`,
            );
        }

        local.quantity = resolvedTarget;
        local.pendingQuantity = 0;
        local.seatIncreaseInvoiceId = "";
        local.scheduledQuantity = 0;
        local.scheduledQuantityEffectiveAt = 0;
        local.updatedAt = Date.now();
        await local.save();

        if (local.organizationId) {
            await OrganizationLicensePoolService.getInstance().syncPoolsForSubscription(local);
        }

        Monitor.info(`[Subscription] Applied paid seat increase for ${local.id}: quantity=${resolvedTarget}`);
        return true;
    }

    /**
     * Reverts a failed seat-increase invoice: restores Stripe quantity and clears pending seats.
     * @returns True when a pending increase was reverted
     */
    private async revertPendingSeatIncrease(local: Subscription): Promise<boolean> {
        if (!local.hasPendingSeatIncrease() || !local.stripeSubscriptionId) {
            return false;
        }

        const paidQuantity = local.getCurrentSeatLimit();
        try {
            await this.updateSubscriptionQuantity(local.stripeSubscriptionId, paidQuantity, "none");
        } catch (ex) {
            Monitor.error(`[Subscription] Failed to revert Stripe quantity after seat increase payment failure for ${local.id}: ${ex instanceof Error ? ex.message : ex}`);
            return false;
        }

        await this.voidSeatIncreaseInvoice(local);

        local.pendingQuantity = 0;
        local.seatIncreaseInvoiceId = "";
        local.updatedAt = Date.now();
        await local.save();
        Monitor.info(`[Subscription] Reverted pending seat increase for ${local.id}; quantity remains ${paidQuantity}`);
        return true;
    }

    /**
     * Voids the dangling seat-increase invoice (if still open) so a failed increase leaves no debt in dunning.
     */
    private async voidSeatIncreaseInvoice(local: Subscription): Promise<void> {
        const invoiceId = local.seatIncreaseInvoiceId || "";
        if (!invoiceId) {
            return;
        }
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return;
        }
        try {
            const invoice = await stripe.client.invoices.retrieve(invoiceId);
            if (invoice.status === "open") {
                await stripe.client.invoices.voidInvoice(invoiceId);
                Monitor.info(`[Subscription] Voided dangling seat-increase invoice ${invoiceId} for ${local.id}`);
            }
        } catch (ex) {
            Monitor.warning(`[Subscription] Could not void seat-increase invoice ${invoiceId} for ${local.id}: ${ex instanceof Error ? ex.message : ex}`);
        }
    }

    /**
     * Schedules a seat reduction at the current Stripe billing period end.
     * Current-period quantity and license assignments remain unchanged until then.
     */
    public async scheduleQuantityDecreaseAtPeriodEnd(local: Subscription, newQuantity: number): Promise<{ effectiveAt: number }> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }
        if (!local.stripeSubscriptionId) {
            throw new Error("NO_STRIPE_SUBSCRIPTION");
        }
        if (local.succeedingSubscriptionId) {
            throw new Error("SCHEDULED_PLAN_CHANGE_PENDING");
        }

        const currentQuantity = local.getCurrentSeatLimit();
        if (newQuantity >= currentQuantity) {
            throw new Error("INVALID_QUANTITY_DECREASE");
        }

        const resolved = await this.resolveStripePrice(local.subscribableType, local.subscribableId);
        const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price", "schedule"] });
        const firstItem = stripeSub.items.data[0];
        const currentPriceId = firstItem?.price?.id || resolved.stripePriceId;
        if (!firstItem?.id || !currentPriceId) {
            throw new Error("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
        }

        const stripeSubPeriodStart = Number((firstItem as { current_period_start?: number }).current_period_start || 0);
        const stripeSubPeriodEnd = Number((firstItem as { current_period_end?: number }).current_period_end || 0);
        const periodStart = stripeSubPeriodStart || Math.floor((local.currentPeriodStart || Date.now()) / 1000);
        const periodEnd = stripeSubPeriodEnd || Math.floor((local.currentPeriodEnd || Date.now()) / 1000);
        const effectiveAtMs = periodEnd > 0 ? periodEnd * 1000 : (local.currentPeriodEnd || Date.now());

        await this.releaseSubscriptionSchedule(stripeSub.schedule || null);

        const createdSchedule = await stripe.client.subscriptionSchedules.create({
            from_subscription: local.stripeSubscriptionId,
        });

        const scheduleMetadataBase: Record<string, string> = {
            uid: local.uid,
            seat_reduction: "true",
        };
        if (local.organizationId) {
            scheduleMetadataBase.organization_id = local.organizationId;
        }

        await stripe.client.subscriptionSchedules.update(createdSchedule.id, {
            end_behavior: "release",
            phases: [
                {
                    start_date: periodStart,
                    end_date: periodEnd,
                    items: [{ price: currentPriceId, quantity: currentQuantity }],
                    metadata: {
                        ...scheduleMetadataBase,
                        subscribable_type: local.subscribableType,
                        subscribable_id: local.subscribableId,
                    },
                    proration_behavior: "none",
                },
                {
                    start_date: periodEnd,
                    items: [{ price: currentPriceId, quantity: newQuantity }],
                    metadata: {
                        ...scheduleMetadataBase,
                        subscribable_type: local.subscribableType,
                        subscribable_id: local.subscribableId,
                    },
                    proration_behavior: "none",
                },
            ],
        });

        local.scheduledQuantity = newQuantity;
        local.scheduledQuantityEffectiveAt = effectiveAtMs;
        local.updatedAt = Date.now();
        await local.save();

        Monitor.info(`[Subscription] Scheduled seat reduction for ${local.id}: ${currentQuantity} -> ${newQuantity} at ${effectiveAtMs}`);
        return { effectiveAt: effectiveAtMs };
    }

    /**
     * Cancels a pending seat reduction and releases the associated Stripe schedule when present.
     */
    public async cancelScheduledQuantityDecrease(local: Subscription): Promise<void> {
        if (!local.hasScheduledQuantityDecrease()) {
            return;
        }

        const stripe = StripeService.getInstance();
        if (stripe.client && local.stripeSubscriptionId) {
            try {
                const stripeSub = await stripe.client.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["schedule"] });
                await this.releaseSubscriptionSchedule(stripeSub.schedule || null);
            } catch (ex) {
                Monitor.warning(`[Subscription] Error releasing seat-reduction schedule for ${local.id}: ${ex instanceof Error ? ex.message : ex}`);
            }
        }

        local.scheduledQuantity = 0;
        local.scheduledQuantityEffectiveAt = 0;
        local.updatedAt = Date.now();
        await local.save();
    }

    /**
     * Applies a scheduled seat reduction once the billing period boundary is reached.
     * @returns True when the scheduled reduction was applied
     */
    public async applyScheduledQuantityIfDue(local: Subscription, stripeSub?: Stripe.Subscription): Promise<boolean> {
        if (!local.hasScheduledQuantityDecrease()) {
            return false;
        }

        const now = Date.now();
        const effectiveAt = local.scheduledQuantityEffectiveAt || 0;
        const stripeQty = stripeSub?.items?.data?.[0]?.quantity;
        const dueByTime = effectiveAt > 0 && now >= effectiveAt;
        const dueByStripeQty = typeof stripeQty === "number" && stripeQty > 0 && stripeQty <= local.scheduledQuantity;

        if (!dueByTime && !dueByStripeQty) {
            return false;
        }

        const targetQuantity = local.scheduledQuantity;
        local.quantity = targetQuantity;
        local.scheduledQuantity = 0;
        local.scheduledQuantityEffectiveAt = 0;
        local.updatedAt = now;
        await local.save();

        Monitor.info(`[Subscription] Applied scheduled seat reduction for ${local.id}; quantity is now ${targetQuantity}`);

        if (local.organizationId) {
            await this.reconcileOrganizationSeatAssignments(local);
        }

        return true;
    }
}
