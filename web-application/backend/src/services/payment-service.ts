// Reserved for license

"use strict";

import Stripe from "stripe";
import { Config } from "../config/config";
import { PaymentsConfig } from "../config/config-payments";
import { Monitor } from "../monitor";
import { Payment, PaymentFilterOptions, PaymentStatus, PaymentType } from "../models/payment";
import { PaymentEvent } from "../models/payment-event";
import { SubscriptionService } from "./subscription-service";
import { createRandomUID } from "../utils/text-utils";
import { paymentIdToBytes32 } from "../utils/payments-utils";
import { PaymentRouterService } from "./payment-router-service";
import { Wallet } from "../models/wallet";
import { ZERO_ADDRESS } from "../utils/blockchain";
import { Subscription, SubscribableType, SubscriptionBillingCycle } from "../models/subscription";
import { OrganizationService } from "./organization-service";
import { StripeService } from "./stripe-service";
import { TokenService } from "./token-service";
import { CatalogItem, CatalogItemType, CUSTOM_AGENT_ITEM_ID } from "../models/catalog-item";
import { ItemPlan } from "../models/item-plan";
import { Plan } from "../models/plan";
import { PlanPricing } from "../models/plan-pricing";
import { PlanService } from "./plan-service";
import { SubscriptionBillingService } from "./subscription-billing-service";
import { User } from "../models/users/user";
import { buildPaymentInvoicePdf } from "./payment-invoice-pdf-builder";
import type { CustomAgentDepositPaymentDecision } from "./itaas-platform-service";

export interface PaymentHistoryFiltersInput {
    dateFrom?: number;
    dateTo?: number;
    paymentType?: string;
    productType?: string;
    status?: string;
}

export interface PaymentHistoryItemView {
    id: string;
    concept: string;
    amountCents: number;
    currency: string;
    method: string;
    status: string;
    paymentType: string;
    productType: string;
    billingCycle: string;
    createdAt: number;
    catalogItemType?: string;
}

interface PaymentInvoiceDiscountInfo {
    discountCents: number;
    nubemTokensDiscountCents: number;
    basePriceCents?: number;
}

export class PaymentService {
    public static instance: PaymentService = null;

    public static getInstance(): PaymentService {
        if (PaymentService.instance) {
            return PaymentService.instance;
        } else {
            PaymentService.instance = new PaymentService();
            return PaymentService.instance;
        }
    }

    public normalizeHistoryFilters(input: PaymentHistoryFiltersInput): PaymentFilterOptions {
        const filters: PaymentFilterOptions = {};

        if (typeof input.dateFrom === "number" && Number.isFinite(input.dateFrom) && input.dateFrom > 0) {
            filters.dateFrom = Math.floor(input.dateFrom);
        }

        if (typeof input.dateTo === "number" && Number.isFinite(input.dateTo) && input.dateTo > 0) {
            filters.dateTo = Math.floor(input.dateTo);
        }

        const paymentType = ((input.paymentType || "") + "").trim().toLowerCase();
        if (paymentType) {
            filters.type = paymentType;
        }

        const productType = ((input.productType || "") + "").trim().toLowerCase();
        if (productType === SubscribableType.ITEM || productType === SubscribableType.PLAN) {
            filters.productType = productType;
        }

        const status = ((input.status || "") + "").trim().toLowerCase();
        if (status) {
            filters.status = status;
        }

        return filters;
    }

    /**
     * Whether the user may view or download invoice data for a payment.
     * Owners, explicitly allowed platform admins, and organization admins for
     * the subscription's organization are allowed.
     */
    public async canUserAccessPayment(
        userId: string,
        payment: Payment,
        options?: { isPlatformAdmin?: boolean; allowPlatformAdmin?: boolean },
    ): Promise<boolean> {
        const uid = (userId || "").trim();
        if (!uid || !payment) {
            return false;
        }

        if (payment.uid === uid) {
            return true;
        }

        if (options?.isPlatformAdmin && options?.allowPlatformAdmin) {
            return true;
        }

        const subscriptionId = (payment.subscriptionId || "").trim();
        if (!subscriptionId) {
            return false;
        }

        const subscription = await Subscription.findById(subscriptionId);
        const organizationId = (subscription?.organizationId || "").trim();
        if (!organizationId) {
            return false;
        }

        return OrganizationService.getInstance().isOrganizationAdmin(uid, organizationId);
    }

    public async toHistoryItemView(payment: Payment): Promise<PaymentHistoryItemView> {
        const concept = await this.resolvePaymentConcept(payment);
        const catalogItemType = (payment.catalogItemType || "").trim() || undefined;

        return {
            id: payment.id,
            concept,
            amountCents: Math.floor(payment.amountCents || 0),
            currency: (payment.currency || "EUR") + "",
            method: this.resolvePaymentMethod(payment),
            status: ((payment.status || "") + "").toLowerCase(),
            paymentType: ((payment.type || "") + "").toLowerCase(),
            productType: ((payment.subscribableType || "") + "").toLowerCase(),
            billingCycle: ((payment.billingCycle || "") + "").toLowerCase(),
            createdAt: Math.floor(payment.createdAt || 0),
            catalogItemType,
        };
    }

    public async toAdminListItems(payments: Payment[]): Promise<any[]> {
        if (!payments.length) {
            return [];
        }

        const userIds = Array.from(new Set(payments.map((payment) => payment.uid).filter(Boolean)));
        const users = await Promise.all(userIds.map((uid) => User.findUserByUID(uid)));
        const usernames = new Map(users.filter((user) => !!user).map((user) => [user.id, user.username]));

        return payments.map((payment) => {
            const data = payment.toObject();
            data.username = usernames.get(payment.uid) || "";
            return data;
        });
    }

    public async generateInvoicePdf(payment: Payment): Promise<Buffer> {
        const appConfig = Config.getInstance();
        const view = await this.toHistoryItemView(payment);
        const clientProfile = await this.resolveInvoiceClientProfile(payment.uid);
        const invoiceDiscountInfo = await this.resolveInvoiceDiscountInfo(payment);

        let quantity = 1;
        if (payment.subscriptionId) {
            try {
                const subscription = await Subscription.findById(payment.subscriptionId);
                if (subscription) {
                    quantity = Math.max(1, Math.floor(Number(subscription.quantity) || 1));
                }
            } catch (_ex) {
                // fallback to 1
            }
        }

        return buildPaymentInvoicePdf({
            id: view.id,
            concept: view.concept,
            amountCents: view.amountCents,
            currency: view.currency,
            method: view.method,
            status: view.status,
            paymentType: view.paymentType,
            productType: view.productType,
            billingCycle: view.billingCycle,
            createdAt: view.createdAt,
            locale: clientProfile.locale,
            invoiceNumber: this.buildInvoiceNumber(view.id, view.createdAt),
            issuerName: this.resolveInvoiceIssuerName(appConfig),
            issuerTaxId: this.resolveInvoiceIssuerTaxId(),
            issuerWebsite: this.resolveInvoiceIssuerWebsite(appConfig),
            issuerEmail: this.resolveInvoiceIssuerEmail(appConfig),
            clientName: clientProfile.name,
            clientEmail: clientProfile.email,
            clientReference: payment.uid,
            quantity: quantity,
            discountCents: invoiceDiscountInfo.discountCents,
            nubemTokensDiscountCents: invoiceDiscountInfo.nubemTokensDiscountCents,
            basePriceCents: invoiceDiscountInfo.basePriceCents || 0,
            taxRatePercent: this.resolveInvoiceTaxRatePercent(),
        });
    }

    private async resolveInvoiceDiscountInfo(payment: Payment): Promise<PaymentInvoiceDiscountInfo> {
        const catalogDiscountCents = await this.resolveCatalogDiscountCents(payment);
        const basePriceCents = await this.resolveCatalogBasePriceCents(payment);

        let checkoutDiscountCents = 0;
        let nubemTokensDiscountCents = 0;

        const provider = ((payment.provider || "") + "").trim().toLowerCase();
        const sessionId = ((payment.providerSessionId || "") + "").trim();

        if (provider === "stripe" && sessionId) {
            const stripe = StripeService.getInstance();
            if (stripe.client) {
                try {
                    const session = await stripe.client.checkout.sessions.retrieve(sessionId);
                    const totalStripeDiscountCents = this.resolveStripeCheckoutDiscountCents(session);
                    const tokenRedeemOperationId = ((session.metadata?.token_redeem_operation_id || "") + "").trim();

                    nubemTokensDiscountCents = tokenRedeemOperationId ? totalStripeDiscountCents : 0;
                    checkoutDiscountCents = Math.max(0, totalStripeDiscountCents - nubemTokensDiscountCents);
                } catch (ex) {
                    Monitor.warning(
                        `[PAYMENTS] Unable to resolve Stripe discount breakdown for payment ${payment.id}: ${
                            ex instanceof Error ? ex.message : ex
                        }`,
                    );
                }
            }
        }

        return {
            discountCents: Math.max(0, Math.round(catalogDiscountCents + checkoutDiscountCents)),
            nubemTokensDiscountCents: Math.max(0, Math.round(nubemTokensDiscountCents)),
            basePriceCents: Math.max(0, Math.round(basePriceCents || 0)),
        };
    }

    private async resolveCatalogBasePriceCents(payment: Payment): Promise<number> {
        try {
            if (payment.subscribableType === SubscribableType.PLAN) {
                const pricing = await PlanPricing.findById(payment.subscribableId);
                if (!pricing) {
                    return 0;
                }

                const planService = PlanService.getInstance();
                const detail = await planService.getPlanDetail(pricing.planId);
                if (!detail || !detail.components || detail.components.length === 0) {
                    return 0;
                }

                const baseTotals = await planService.getComponentBaseTotals(detail.components);
                const cycle = ((payment.billingCycle || "") + "").trim().toLowerCase();
                const baseAmountCents = cycle === SubscriptionBillingCycle.ANNUAL ? baseTotals.annualCents : baseTotals.monthlyCents;
                return Math.max(0, Math.round(baseAmountCents || 0));
            }

            if (payment.subscribableType === SubscribableType.ITEM) {
                const plan = await ItemPlan.findById(payment.subscribableId);
                if (!plan) {
                    return 0;
                }
                return Math.max(0, Math.round(plan.priceCents || 0));
            }
        } catch (ex) {
            Monitor.warning(
                `[PAYMENTS] Unable to resolve catalog base price for payment ${payment.id}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }

        return 0;
    }

    private resolveStripeCheckoutDiscountCents(session: Stripe.Checkout.Session): number {
        const totalDetailsDiscount = Number((session as any)?.total_details?.amount_discount || 0);
        if (Number.isFinite(totalDetailsDiscount) && totalDetailsDiscount > 0) {
            return Math.max(0, Math.floor(totalDetailsDiscount));
        }

        const amountSubtotal = Number((session as any)?.amount_subtotal || 0);
        const amountTotal = Number((session as any)?.amount_total || 0);

        if (Number.isFinite(amountSubtotal) && Number.isFinite(amountTotal) && amountSubtotal > amountTotal) {
            return Math.max(0, Math.floor(amountSubtotal - amountTotal));
        }

        return 0;
    }

    private async resolveCatalogDiscountCents(payment: Payment): Promise<number> {
        if (payment.subscribableType !== SubscribableType.PLAN) {
            return 0;
        }

        try {
            const pricing = await PlanPricing.findById(payment.subscribableId);
            if (!pricing) {
                return 0;
            }

            const planService = PlanService.getInstance();
            const detail = await planService.getPlanDetail(pricing.planId);
            if (!detail || detail.components.length === 0) {
                return 0;
            }

            const baseTotals = await planService.getComponentBaseTotals(detail.components);
            const cycle = ((payment.billingCycle || "") + "").trim().toLowerCase();
            const baseAmountCents = cycle === SubscriptionBillingCycle.ANNUAL ? baseTotals.annualCents : baseTotals.monthlyCents;

            return Math.max(0, Math.round(baseAmountCents - pricing.priceCents));
        } catch (ex) {
            Monitor.warning(
                `[PAYMENTS] Unable to resolve catalog discount for payment ${payment.id}: ${
                    ex instanceof Error ? ex.message : ex
                }`,
            );
            return 0;
        }
    }

    private resolvePaymentMethod(payment: Payment): string {
        const provider = this.toTitle((payment.provider || "") + "");
        const cycle = this.toTitle((payment.billingCycle || "") + "");

        if (provider && cycle) {
            return `${provider} - ${cycle}`;
        }

        if (provider) {
            return provider;
        }

        if (cycle) {
            return cycle;
        }

        return "N/A";
    }

    private toTitle(raw: string): string {
        const normalized = (raw || "")
            .split(/[_\s-]+/g)
            .map((part) => part.trim())
            .filter((part) => !!part)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

        return normalized.join(" ");
    }

    private async resolvePaymentConcept(payment: Payment): Promise<string> {
        if (payment.subscribableType === SubscribableType.PLAN) {
            const pricing = await PlanPricing.findById(payment.subscribableId);
            if (!pricing) {
                return "Plan";
            }

            const plan = await Plan.findById(pricing.planId);
            return (plan?.name || "Plan") + "";
        }

        if (payment.subscribableType === SubscribableType.ITEM) {
            const itemPlan = await ItemPlan.findById(payment.subscribableId);
            const item = await CatalogItem.findById(itemPlan?.itemId || payment.subscribableId);
            return (item?.name || "Catalog item") + "";
        }

        return "Payment";
    }

    private async resolveInvoiceClientProfile(uid: string): Promise<{ name: string, email: string, locale: string }> {
        const fallback = {
            name: uid || "Customer",
            email: "",
            locale: "en",
        };

        if (!uid) {
            return fallback;
        }

        try {
            const user = await User.findUserByUID(uid);
            if (!user) {
                return fallback;
            }

            return {
                name: (user.username || uid || "Customer") + "",
                email: (user.email || "") + "",
                locale: ((user.locale || "") + "").toLowerCase() || "en",
            };
        } catch (ex) {
            Monitor.warning(`[PAYMENTS] Unable to resolve invoice customer profile for user ${uid}: ${ex instanceof Error ? ex.message : ex}`);
            return fallback;
        }
    }

    private buildInvoiceNumber(paymentId: string, createdAt: number): string {
        const date = new Date(createdAt || Date.now());
        const year = date.getUTCFullYear() || new Date().getUTCFullYear();
        const normalized = ((paymentId || "") + "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase();
        const suffix = normalized.slice(-8).padStart(8, "0");

        return `NUBEM-${year}-${suffix}`;
    }

    private resolveInvoiceIssuerName(config: Config): string {
        const name = ((config.appName || "") + "").trim();
        if (!name || name.toLowerCase() === "platform") {
            return "Nubemsystems";
        }

        return name;
    }

    private resolveInvoiceIssuerTaxId(): string {
        const envTaxId = ((process.env.INVOICE_ISSUER_TAX_ID || process.env.COMPANY_TAX_ID || "") + "").trim();
        return envTaxId || "N/A";
    }

    private resolveInvoiceIssuerWebsite(config: Config): string {
        const website = ((config.uriFrontend || config.uriBackend || "") + "").trim();
        return website || "N/A";
    }

    private resolveInvoiceIssuerEmail(config: Config): string {
        const configured = ((process.env.INVOICE_ISSUER_EMAIL || "") + "").trim();
        if (configured) {
            return configured;
        }

        let host = "";
        try {
            host = (config.getHost() || "").trim();
        } catch (_ex) {
            host = "";
        }

        if (!host || host === "localhost" || host === "127.0.0.1") {
            return "support@nubemsystems.com";
        }

        return `support@${host.replace(/^www\./i, "")}`;
    }

    private resolveInvoiceTaxRatePercent(): number {
        const value = Number(process.env.INVOICE_TAX_RATE_PERCENT || "0");
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
    }

    /**
     * Creates a one-time Stripe checkout for a custom-agent deposit.
     * Expires any previous pending checkout for the request so only one session remains chargeable.
     * @throws Error DEPOSIT_CHECKOUT_UNAVAILABLE | INSUFFICIENT_TOKEN_BALANCE | TOKENS_EXCEED_LIMIT
     */
    public async createCustomAgentDepositCheckout(input: {
        uid: string;
        requestId: string;
        amountCents: number;
        successUrl?: string;
        cancelUrl?: string;
        previousPaymentId?: string;
        organizationId?: string;
        redeemTokens?: number;
    }): Promise<{ checkoutUrl: string; paymentId: string }> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
        }

        const amountCents = Math.max(0, Math.round(input.amountCents || 0));
        const redeemTokens = Math.max(0, Math.floor(Number(input.redeemTokens) || 0));
        const orgId = ((input.organizationId || "") + "").trim() || null;
        await this.quoteCustomAgentDepositTokenRedeem(input.uid, amountCents, redeemTokens, orgId);

        const previousPaymentId = ((input.previousPaymentId || "") + "").trim();
        if (previousPaymentId) {
            const previous = await Payment.findById(previousPaymentId);
            if (
                previous
                && previous.type === PaymentType.CUSTOM_AGENT_DEPOSIT
                && (previous.status === PaymentStatus.PENDING_PAYMENT || previous.status === PaymentStatus.CREATED)
            ) {
                await this.invalidatePendingCustomAgentDeposit(previous);
            }
        }

        let customerId: string;
        try {
            customerId = await SubscriptionBillingService.getInstance().getOrCreateCustomerId(input.uid);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "Stripe is not configured") {
                throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
            }
            throw ex;
        }

        const cfg = PaymentsConfig.getInstance();
        const payment = await Payment.create(
            input.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "",
            "",
            amountCents,
            cfg.currency,
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.PENDING_PAYMENT;
        payment.updatedAt = Date.now();
        await payment.save();

        let tokenRedeemOperationId = "";
        let stripeDiscounts: Array<{ coupon: string }> = [];

        try {
            const tokenDiscount = await this.holdCustomAgentDepositTokens({
                uid: input.uid,
                amountCents,
                redeemTokens,
                organizationId: orgId,
                payment,
            });
            tokenRedeemOperationId = tokenDiscount.tokenRedeemOperationId;
            stripeDiscounts = tokenDiscount.discounts;
        } catch (ex) {
            await this.cancelCreatedDepositPayment(payment);
            throw ex;
        }

        const defaultSuccess = Config.getInstance().getFrontendURI(
            "/itaas-platform?tab=custom-request&checkout_result=success&session_id={CHECKOUT_SESSION_ID}",
        );
        const defaultCancel = Config.getInstance().getFrontendURI("/itaas-platform?tab=custom-request&checkout_result=cancel");

        try {
            const result = await stripe.createCustomCheckout(
                payment.amountCents,
                payment.currency,
                "Custom agent deposit",
                "Deposit for custom agent request",
                {
                    kind: "payment",
                    payment_id: payment.id,
                    request_id: input.requestId,
                    payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                    uid: input.uid,
                    token_redeem_operation_id: tokenRedeemOperationId,
                },
                input.successUrl || defaultSuccess,
                input.cancelUrl || defaultCancel,
                customerId,
                {
                    savePaymentMethodForFuture: true,
                    discounts: stripeDiscounts,
                },
            );
            payment.providerSessionId = result.sessionId || "";
            payment.updatedAt = Date.now();
            await payment.save();
            return { checkoutUrl: result.url || "", paymentId: payment.id };
        } catch (ex) {
            await this.releaseCustomAgentDepositTokenHold(payment.id, "REDEEM_RELEASE_DEPOSIT_CHECKOUT_FAILED");
            await this.cancelCreatedDepositPayment(payment);
            const message = ex instanceof Error ? ex.message : "";
            if (message === "Stripe is not configured") {
                throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
            }
            throw ex;
        }
    }

    /**
     * Expires a pending custom-agent deposit checkout by payment id (best effort).
     * Used when replacing a checkout or when the request is cancelled.
     */
    public async invalidateCustomAgentDepositByPaymentId(paymentId: string): Promise<void> {
        const id = ((paymentId || "") + "").trim();
        if (!id) {
            return;
        }
        const payment = await Payment.findById(id);
        if (!payment || payment.type !== PaymentType.CUSTOM_AGENT_DEPOSIT) {
            return;
        }
        await this.invalidatePendingCustomAgentDeposit(payment);
    }

    private getCustomAgentDepositRedeemOperationId(paymentId: string): string {
        return `redeem:custom_agent_deposit:${paymentId}`;
    }

    private async quoteCustomAgentDepositTokenRedeem(
        uid: string,
        amountCents: number,
        redeemTokens: number,
        organizationId: string | null,
    ): Promise<void> {
        if (redeemTokens <= 0) {
            return;
        }
        const tokenQuote = await TokenService.getInstance().quote(uid, amountCents, redeemTokens, organizationId);
        if (redeemTokens > tokenQuote.availableTokens) {
            throw new Error("INSUFFICIENT_TOKEN_BALANCE");
        }
        if (redeemTokens > tokenQuote.maxApplicableTokens) {
            throw new Error("TOKENS_EXCEED_LIMIT");
        }
    }

    private async holdCustomAgentDepositTokens(params: {
        uid: string;
        amountCents: number;
        redeemTokens: number;
        organizationId: string | null;
        payment: Payment;
    }): Promise<{ tokenRedeemOperationId: string; discounts: Array<{ coupon: string }> }> {
        if (params.redeemTokens <= 0) {
            return { tokenRedeemOperationId: "", discounts: [] };
        }

        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
        }

        const operationId = this.getCustomAgentDepositRedeemOperationId(params.payment.id);
        try {
            // Coupon amount must match tokens actually locked. hold() re-quotes the
            // current balance; a stale pre-hold quote could over-discount Stripe.
            const held = await TokenService.getInstance().hold(
                params.uid,
                params.amountCents,
                params.redeemTokens,
                operationId,
                params.organizationId,
            );
            if (held.appliedTokens <= 0) {
                return { tokenRedeemOperationId: "", discounts: [] };
            }
            const discounts: Array<{ coupon: string }> = [];
            if (held.discountEurCents > 0) {
                const coupon = await stripe.client.coupons.create({
                    name: "Nubem tokens",
                    amount_off: held.discountEurCents,
                    currency: ((params.payment.currency || "eur") + "").toLowerCase(),
                    duration: "once",
                });
                discounts.push({ coupon: coupon.id });
            }
            return { tokenRedeemOperationId: operationId, discounts };
        } catch (ex) {
            await this.releaseCustomAgentDepositTokenHold(params.payment.id, "REDEEM_RELEASE_DEPOSIT_CHECKOUT_FAILED");
            const message = ex instanceof Error ? ex.message : "";
            if (message === "INSUFFICIENT_TOKENS") {
                throw new Error("INSUFFICIENT_TOKEN_BALANCE");
            }
            if (message === "Stripe is not configured") {
                throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
            }
            throw ex;
        }
    }

    private async releaseCustomAgentDepositTokenHold(paymentId: string, reason: string): Promise<void> {
        const id = ((paymentId || "") + "").trim();
        if (!id) {
            return;
        }
        try {
            await TokenService.getInstance().release(this.getCustomAgentDepositRedeemOperationId(id), reason);
        } catch (ex) {
            Monitor.warning(
                `[PAYMENTS] Unable to release custom-agent deposit token hold for payment ${id}: ${
                    ex instanceof Error ? ex.message : ex
                }`,
            );
        }
    }

    private async cancelCreatedDepositPayment(payment: Payment): Promise<void> {
        payment.status = PaymentStatus.CANCELLED;
        payment.updatedAt = Date.now();
        await payment.save();
    }

    /**
     * Expires the Stripe checkout session (best effort) and marks the local payment cancelled.
     */
    private async invalidatePendingCustomAgentDeposit(payment: Payment): Promise<void> {
        if (
            payment.status !== PaymentStatus.PENDING_PAYMENT
            && payment.status !== PaymentStatus.CREATED
        ) {
            return;
        }

        await this.releaseCustomAgentDepositTokenHold(payment.id, "REDEEM_RELEASE_DEPOSIT_REPLACED");

        const sessionId = ((payment.providerSessionId || "") + "").trim();
        const stripe = StripeService.getInstance();
        if (stripe.client && sessionId && !Config.IS_TEST) {
            try {
                await stripe.client.checkout.sessions.expire(sessionId);
            } catch (ex) {
                Monitor.warning(
                    `[PAYMENTS] Unable to expire custom-agent deposit session ${sessionId}: ${ex instanceof Error ? ex.message : ex}`,
                );
            }
        }

        payment.status = PaymentStatus.CANCELLED;
        payment.updatedAt = Date.now();
        await payment.save();
    }

    /**
     * Refunds a custom-agent deposit that must not grant entitlement (stale/duplicate checkout).
     */
    private async refundRejectedCustomAgentDepositBestEffort(payment: Payment): Promise<void> {
        if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELLED) {
            return;
        }

        const stripe = StripeService.getInstance();
        if (!stripe.client || Config.IS_TEST) {
            payment.status = PaymentStatus.CANCELLED;
            payment.updatedAt = Date.now();
            await payment.save();
            return;
        }

        try {
            let paymentIntentId = ((payment.stripePaymentIntentId || "") + "").trim();
            if (!paymentIntentId) {
                const sessionId = ((payment.providerSessionId || "") + "").trim();
                if (sessionId.startsWith("pi_")) {
                    paymentIntentId = sessionId;
                } else if (sessionId) {
                    const session = await stripe.client.checkout.sessions.retrieve(sessionId);
                    const pi = session.payment_intent;
                    paymentIntentId = typeof pi === "string" ? pi : (pi && typeof pi === "object" ? (pi.id || "") : "");
                }
            }

            if (!paymentIntentId) {
                Monitor.warning(`[PAYMENTS] Cannot refund rejected custom-agent deposit ${payment.id}: missing payment_intent`);
                payment.status = PaymentStatus.CANCELLED;
                payment.updatedAt = Date.now();
                await payment.save();
                return;
            }

            payment.stripePaymentIntentId = paymentIntentId;
            const refund = await stripe.client.refunds.create({ payment_intent: paymentIntentId });
            payment.status = (refund.status || "") === "succeeded" ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED;
            payment.updatedAt = Date.now();
            await payment.save();
            Monitor.info(`[PAYMENTS] Refunded rejected custom-agent deposit ${payment.id} (refund=${refund.id})`);
        } catch (ex) {
            const msg = ex instanceof Error ? ex.message : String(ex);
            if (msg.includes("already been refunded")) {
                payment.status = PaymentStatus.REFUNDED;
            } else {
                Monitor.error(`[PAYMENTS] Failed to refund rejected custom-agent deposit ${payment.id}: ${msg}`);
                payment.status = PaymentStatus.CANCELLED;
            }
            payment.updatedAt = Date.now();
            await payment.save();
        }
    }

    /**
     * Creates a payment for a new subscription.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param billingCycle - Billing cycle
     * @returns Created payment and Stripe checkout URL
     */
    public async createSubscriptionBalancePayment(uid: string, subscribableType: SubscribableType, subscribableId: string, billingCycle: SubscriptionBillingCycle): Promise<{ payment: Payment, checkoutUrl: string }> {
        return await this.createBalancePayment(uid, PaymentType.SUBSCRIPTION_CREATE, subscribableType, subscribableId, billingCycle, "");
    }

    /**
     * Creates a payment for a subscription renewal.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param subscriptionId - Existing subscription identifier
     * @param billingCycle - Billing cycle
     * @returns Created payment and Stripe checkout URL
     */
    public async createSubscriptionRenewBalancePayment(uid: string, subscribableType: SubscribableType, subscribableId: string, subscriptionId: string, billingCycle: SubscriptionBillingCycle): Promise<{ payment: Payment, checkoutUrl: string }> {
        return await this.createBalancePayment(uid, PaymentType.SUBSCRIPTION_RENEW, subscribableType, subscribableId, billingCycle, subscriptionId);
    }

    /**
     * Creates a balance payment for subscription creation or renewal.
     * @param uid - User identifier
     * @param type - Payment type
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param billingCycle - Billing cycle
     * @param subscriptionId - Existing subscription identifier for renewals
     * @returns Created payment and Stripe checkout URL
     */
    private async createBalancePayment(
        uid: string,
        type: string,
        subscribableType: SubscribableType,
        subscribableId: string,
        billingCycle: SubscriptionBillingCycle,
        subscriptionId: string,
    ): Promise<{ payment: Payment, checkoutUrl: string }> {
        const cfg = PaymentsConfig.getInstance();
        const amountCents = await this.getSubscriptionPriceCents(subscribableType, subscribableId, billingCycle);
        const now = Date.now();

        let catalogItemType = "";
        if (subscribableType === SubscribableType.ITEM && subscribableId) {
            const itemPlan = await ItemPlan.findById(subscribableId);
            if (itemPlan) {
                const item = await CatalogItem.findById(itemPlan.itemId);
                if (item) {
                    catalogItemType = item.type;
                }
            }
        }

        const payment = new Payment({
            id: createRandomUID(),
            uid: uid,
            subscribableType: subscribableType,
            subscribableId: subscribableId,
            catalogItemType: catalogItemType,
            type: type,
            provider: "stripe",
            providerSessionId: "",
            providerEventId: "",
            amountCents: amountCents,
            currency: cfg.currency,
            status: PaymentStatus.PENDING_PAYMENT,
            txHash: "",
            billingCycle: billingCycle,
            subscriptionId: subscriptionId,
            createdAt: now,
            updatedAt: now,
        });
        await payment.insert();
        const descrType = type === PaymentType.SUBSCRIPTION_RENEW ? "renewal" : "creation";
        const checkoutUrl = await this.createStripeCheckoutForPayment(
            payment,
            "Subscription payment",
            `Subscription ${descrType} for ${subscribableType} ${subscribableId} (${billingCycle} billing cycle)`,
        );

        return { payment, checkoutUrl };
    }

    /**
     * Resolves the price in cents for a subscription based on subscribable type.
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param billingCycle - Expected billing cycle
     * @returns Price in cents
     */
    private async getSubscriptionPriceCents(subscribableType: SubscribableType, subscribableId: string, billingCycle: SubscriptionBillingCycle): Promise<number> {
        if (subscribableType === SubscribableType.PLAN) {
            const planPricing = await PlanPricing.findById(subscribableId);
            if (!planPricing) {
                throw this.makePaymentError("PLAN_NOT_FOUND");
            }
            return Math.max(0, Math.round(planPricing.priceCents || 0));
        }

        const plan = await ItemPlan.findById(subscribableId);
        if (!plan) {
            throw this.makePaymentError("PLAN_NOT_FOUND");
        }
        if (((plan.billingCycle || "") + "") !== ((billingCycle || "") + "")) {
            throw this.makePaymentError("INVALID_BILLING_CYCLE");
        }
        return Math.max(0, Math.round(plan.priceCents || 0));
    }

    /**
     * Creates a Stripe checkout session for a payment.
     * @param payment - Payment record
     * @param name - Checkout session name
     * @param description - Checkout session description
     * @returns Stripe checkout URL
     */
    private async createStripeCheckoutForPayment(payment: Payment, name: string, description: string): Promise<string> {
        const stripe = StripeService.getInstance();
        const result = await stripe.createCustomCheckout(
            payment.amountCents,
            payment.currency,
            name,
            description,
            {
                kind: "payment",
                payment_id: payment.id,
                uid: payment.uid,
                subscribable_type: payment.subscribableType,
                subscribable_id: payment.subscribableId,
                payment_type: payment.type,
                billing_cycle: payment.billingCycle,
                subscription_id: payment.subscriptionId,
            },
        );
        payment.providerSessionId = result.sessionId || "";
        payment.updatedAt = Date.now();
        await payment.save();
        return result.url || "";
    }

    /**
     * Creates a payment error with a code property.
     * @param code - Error code
     * @returns Error with code property
     */
    private makePaymentError(code: string): Error {
        const err = new Error(code);
        (err as any).code = code;
        return err;
    }

    /**
     * Handles a completed Stripe checkout session event.
     * Deduplicates events, updates payment status, and applies entitlements.
     * @param event - Stripe event
     */
    public async handleStripeCheckoutCompleted(event: Stripe.Event): Promise<void> {
        const checkout: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
        const providerEventId = event.id || "";

        const paymentId = checkout.metadata?.payment_id ? (checkout.metadata.payment_id + "") : "";
        const payment = paymentId ? await Payment.findById(paymentId) : await Payment.findByProviderSession(checkout.id);

        if (!payment) {
            Monitor.warning(`[PAYMENTS] Stripe event ${providerEventId} has no matching payment.`);
            const existingMissing = await PaymentEvent.findByProviderEventId(providerEventId);
            if (!existingMissing) {
                try {
                    await PaymentEvent.create("", providerEventId, event.type);
                } catch (_ex) {
                    Monitor.error(`[PAYMENTS] Duplicate Stripe event ${providerEventId} ignored for missing payment.`);
                }
            }
            return;
        }

        if (payment.status === PaymentStatus.COMPLETED) {
            Monitor.info(`[PAYMENTS] Payment ${payment.id} already completed. Status=${payment.status}`);
            return;
        }

        const existingEvent = await PaymentEvent.findByProviderEventId(providerEventId);
        if (!existingEvent) {
            try {
                await PaymentEvent.create(payment.id, providerEventId, event.type);
            } catch (_ex) {
                Monitor.error(`[PAYMENTS] Duplicate Stripe event ${providerEventId} while creating; continuing pending effects.`);
            }
        } else {
            Monitor.info(`[PAYMENTS] Stripe event ${providerEventId} already recorded; re-applying pending effects if needed.`);
        }

        payment.providerEventId = providerEventId || payment.providerEventId || "";
        payment.providerSessionId = checkout.id || payment.providerSessionId || "";
        const chargedCents = this.resolveCheckoutChargedCents(checkout);
        if (chargedCents !== null) {
            payment.amountCents = chargedCents;
        }
        if (payment.status !== PaymentStatus.CONFIRMED) {
            payment.status = PaymentStatus.CONFIRMED;
        }
        payment.updatedAt = Date.now();
        await payment.save();

        const redeemOperationId = checkout.metadata?.token_redeem_operation_id ? (checkout.metadata.token_redeem_operation_id + "") : "";
        if (redeemOperationId && payment.type !== PaymentType.CUSTOM_AGENT_DEPOSIT) {
            await TokenService.getInstance().commit(redeemOperationId, payment.id, checkout.id || "");
        }

        await this.applyPaymentEffects(payment, checkout.metadata || undefined, redeemOperationId);
    }

    /**
     * Amount Stripe actually charged after coupons. Null when the session has no total.
     */
    private resolveCheckoutChargedCents(checkout: Stripe.Checkout.Session): number | null {
        if (checkout.amount_total === null || checkout.amount_total === undefined) {
            return null;
        }
        const amountTotal = Number(checkout.amount_total);
        if (!Number.isFinite(amountTotal) || amountTotal < 0) {
            return null;
        }
        return Math.max(0, Math.floor(amountTotal));
    }

    /**
     * Records the payment on-chain and applies entitlements.
     * @param payment - Confirmed payment
     * @param checkoutMetadata - Optional Stripe checkout session metadata
     * @param redeemOperationId - Token redeem hold id for custom-agent deposits
     */
    private async applyPaymentEffects(
        payment: Payment,
        checkoutMetadata?: Stripe.Metadata | null,
        redeemOperationId: string = "",
    ): Promise<void> {
        try {
            await this.recordOnchain(payment);
        } catch (ex) {
            Monitor.error(`[PAYMENTS] On-chain record failed for payment ${payment.id}: ${ex.message}`);
            payment.status = PaymentStatus.FAILED;
            payment.updatedAt = Date.now();
            await payment.save();
            throw ex instanceof Error ? ex : new Error(String(ex));
        }

        await this.applyPaymentEntitlements(payment, checkoutMetadata, redeemOperationId);

        if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CANCELLED) {
            return;
        }

        if (payment.type !== PaymentType.CUSTOM_AGENT_DEPOSIT) {
            await TokenService.getInstance().grantFromPayment(payment);
        }

        payment.status = PaymentStatus.COMPLETED;
        payment.updatedAt = Date.now();
        await payment.save();
    }

    /**
     * Records the payment on the blockchain.
     * @param payment - Payment to record
     */
    private async recordOnchain(payment: Payment): Promise<void> {
        if (Config.IS_TEST) {
            payment.txHash = "test";
            return;
        }
        const paymentIdBytes32 = paymentIdToBytes32(payment.id);
        let account = ZERO_ADDRESS;
        const wallet = await Wallet.findByUser(payment.uid);
        if (wallet) {
            account = wallet.address;
        }
        const amount = BigInt(payment.amountCents || 0);
        const kind = this.getPaymentKind(payment.type);
        const ref = payment.type;

        const router = PaymentRouterService.getInstance();
        const already = await router.isRecorded(paymentIdBytes32);
        if (already) {
            payment.updatedAt = Date.now();
            await payment.save();
            return;
        }

        const tx = await router.recordPayment(paymentIdBytes32, account, amount, kind, ref);
        payment.txHash = tx || "";
    }

    /**
     * Maps a payment type to an on-chain kind identifier.
     * @param type - Payment type
     * @returns Numeric kind identifier
     */
    private getPaymentKind(type: string): number {
        switch (type) {
            case "agent_full":
                return 1;
            case "subscription_create":
                return 2;
            case "subscription_renew":
                return 3;
            case PaymentType.CUSTOM_AGENT_DEPOSIT:
                return 4;
            default:
                return 0;
        }
    }

    /**
     * Applies entitlements to the user based on the payment type.
     * @param payment - Completed payment
     * @param checkoutMetadata - Optional Stripe checkout session metadata
     * @param redeemOperationId - Token redeem hold id for custom-agent deposits
     */
    private async applyPaymentEntitlements(
        payment: Payment,
        checkoutMetadata?: Stripe.Metadata | null,
        redeemOperationId: string = "",
    ): Promise<void> {
        const subscribableType = payment.subscribableType || SubscribableType.ITEM;
        const subscribableId = payment.subscribableId;

        switch (payment.type) {
            case PaymentType.SUBSCRIPTION_CREATE:
            case PaymentType.SUBSCRIPTION_RENEW: {
                const billingCycle = ((payment.billingCycle || "monthly") + "") as SubscriptionBillingCycle;
                await SubscriptionService.getInstance().activateSubscription(
                    payment.uid,
                    subscribableType,
                    subscribableId,
                    billingCycle,
                    payment.id,
                    payment.subscriptionId,
                );
                break;
            }
            case PaymentType.CUSTOM_AGENT_DEPOSIT: {
                const { ItaasPlatformService } = require("./itaas-platform-service");
                const requestId = checkoutMetadata?.request_id ? (checkoutMetadata.request_id + "") : "";
                const operationId = ((redeemOperationId || checkoutMetadata?.token_redeem_operation_id || "") + "").trim();
                const platform = ItaasPlatformService.getInstance();
                const decision: CustomAgentDepositPaymentDecision = await platform.resolveCustomAgentDepositPayment(
                    payment.id,
                    requestId,
                );
                switch (decision) {
                    case "reject":
                        Monitor.warning(
                            `[PAYMENTS] Rejecting custom-agent deposit ${payment.id} for request ${requestId || "(unknown)"} (stale checkout)`,
                        );
                        await this.rejectCustomAgentDepositCheckout(payment, operationId);
                        break;
                    case "already_applied":
                        Monitor.info(
                            `[PAYMENTS] Custom-agent deposit ${payment.id} already applied; skipping request transition`,
                        );
                        await this.commitCustomAgentDepositRedeem(operationId, payment);
                        await TokenService.getInstance().grantFromPayment(payment);
                        break;
                    case "apply": {
                        await TokenService.getInstance().grantFromPayment(payment);
                        const accepted = await platform.onDepositPaid(payment.id, requestId);
                        if (!accepted) {
                            const after: CustomAgentDepositPaymentDecision = await platform.resolveCustomAgentDepositPayment(
                                payment.id,
                                requestId,
                            );
                            if (after === "reject") {
                                Monitor.warning(
                                    `[PAYMENTS] Rejecting custom-agent deposit ${payment.id} for request ${requestId || "(unknown)"} after token grant (stale checkout)`,
                                );
                                await this.rejectCustomAgentDepositCheckout(payment, operationId);
                                break;
                            }
                        }
                        await this.commitCustomAgentDepositRedeem(operationId, payment);
                        break;
                    }
                    default: {
                        const _exhaustive: never = decision;
                        throw new Error(`Unhandled custom-agent deposit decision: ${_exhaustive}`);
                    }
                }
                break;
            }
        }
    }

    private async commitCustomAgentDepositRedeem(operationId: string, payment: Payment): Promise<void> {
        const id = ((operationId || "") + "").trim();
        if (!id) {
            return;
        }
        await TokenService.getInstance().commit(id, payment.id, payment.providerSessionId || "");
    }

    private async rejectCustomAgentDepositCheckout(payment: Payment, operationId: string): Promise<void> {
        await this.restoreCustomAgentDepositRedeem(operationId, "REDEEM_RESTORE_DEPOSIT_REJECTED");
        await this.revertCustomAgentDepositEarnBestEffort(payment);
        await this.refundRejectedCustomAgentDepositBestEffort(payment);
    }

    private async restoreCustomAgentDepositRedeem(operationId: string, reason: string): Promise<void> {
        const id = ((operationId || "") + "").trim();
        if (!id) {
            return;
        }
        try {
            await TokenService.getInstance().restoreRedeem(id, reason);
        } catch (ex) {
            Monitor.warning(
                `[PAYMENTS] Unable to restore custom-agent deposit redeem for ${id}: ${
                    ex instanceof Error ? ex.message : ex
                }`,
            );
        }
    }

    private async revertCustomAgentDepositEarnBestEffort(payment: Payment): Promise<void> {
        try {
            await TokenService.getInstance().revertFromRefund(
                payment,
                payment.amountCents,
                payment.uid,
                `refund:${payment.id}:deposit-rejected`,
            );
        } catch (ex) {
            Monitor.warning(
                `[PAYMENTS] Unable to revert custom-agent deposit earn for ${payment.id}: ${
                    ex instanceof Error ? ex.message : ex
                }`,
            );
        }
    }
}
