// Reserved for license

"use strict";

import Express from "express";
import Stripe from "stripe";
import { Monitor } from "../../monitor";
import { Controller } from "../controller";
import { StripeService } from "../../services/stripe-service";
import { StripeConfig } from "../../config/config-stripe";
import { PaymentService } from "../../services/payment-service";
import { Payment, PaymentStatus } from "../../models/payment";
import { TokenService } from "../../services/token-service";
import { SubscriptionBillingService } from "../../services/subscription-billing-service";
import { sendApiError } from "../../utils/http-utils";

/**
 * Endpoints called by external services
 * for events and third party login
 */
export class StripeEventsController extends Controller {
    public register(application: Express.Express): any {
        // Callback for google login
        application.post("/stripe/webhook", Express.raw({ type: "application/json" }), this.stripeEventHandler.bind(this));
    }

    public async stripeEventHandler(request: Express.Request, response: Express.Response) {
        const sig = request.headers["stripe-signature"];
        let event: Stripe.Event;
        Monitor.debug("[STRIPE/SIG] " + sig);

        const stripe = StripeService.getInstance().client;

        if (!stripe) {
            Monitor.warning("Received event, but stripe is misconfigured, cannot handle it.");
            response.status(503).send("Stripe service unavailable");    
            return;
        }
        // Retrieve event from request
        try {
            event = stripe.webhooks.constructEvent(request.body, sig, StripeConfig.getInstance().webhookId);
        } catch (err) {
            Monitor.warning("[STRIPE] Error: " + err.message);
            return response.status(400).send(`Webhook Error: ${err.message}`);
        }

        Monitor.debug(`[STRIPE] Received event of type ${event.type} with data: ${JSON.stringify(event.data)}`);
        // Handle event
        switch (event.type) {
            case "checkout.session.completed":
                {
                    const charge: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
                    if (charge.metadata && charge.metadata.kind === "payment") {
                        try {
                            await PaymentService.getInstance().handleStripeCheckoutCompleted(event);
                            Monitor.debug(`[STRIPE] Payment handled successfully`);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : `${err}`;
                            Monitor.error(`[STRIPE] Error handling payment: ${message}`);
                            sendApiError(request, response, 500, "PAYMENT_PROCESSING_FAILED", message);
                            return;
                        }
                    } else if (charge.metadata && charge.metadata.kind === "subscription_checkout") {
                        try {
                            await SubscriptionBillingService.getInstance().handleCheckoutSessionCompleted(charge, event.id);
                            Monitor.debug(`[STRIPE] Subscription checkout handled successfully`);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : `${err}`;
                            Monitor.error(`[STRIPE] Error handling subscription checkout: ${message}`);
                            sendApiError(request, response, 500, "SUBSCRIPTION_CHECKOUT_PROCESSING_FAILED", message);
                            return;
                        }
                    }
                }
                break;
            case "checkout.session.expired":
                {
                    const checkout = event.data.object as Stripe.Checkout.Session;
                    const operationId = checkout?.metadata?.token_redeem_operation_id ? (checkout.metadata.token_redeem_operation_id + "") : "";
                    const replacedSubscriptionCheckout = checkout?.metadata?.kind === "subscription_checkout"
                        && checkout.metadata.subscription_checkout_replaced === "true";
                    // The replacement flow releases legacy shared holds after every session expires.
                    if (operationId && !replacedSubscriptionCheckout) {
                        try {
                            await TokenService.getInstance().release(operationId, "REDEEM_RELEASE_SESSION_EXPIRED");
                        } catch (err) {
                            Monitor.error(`[STRIPE] Error releasing redeem hold on session expired: ${err.message}`);
                        }
                    }
                    if (checkout?.metadata?.kind === "subscription_checkout") {
                        try {
                            await SubscriptionBillingService.getInstance().handleCheckoutSessionExpired(checkout);
                        } catch (err) {
                            Monitor.error(`[STRIPE] Error cancelling abandoned subscription checkout: ${err.message}`);
                        }
                    }
                }
                break;
            case "charge.refunded":
                {
                    const charge = event.data.object as Stripe.Charge;
                    const paymentIntentId = (charge?.payment_intent || "") + "";
                    if (paymentIntentId) {
                        const payment = await Payment.findByPaymentIntentId(paymentIntentId);
                        if (payment) {
                            let refunds: Stripe.Refund[] = [];
                            try {
                                const listed = await stripe.refunds.list({ charge: charge.id, limit: 100 });
                                refunds = listed.data;
                            } catch (err) {
                                Monitor.error(`[STRIPE] Error listing refunds for charge ${charge.id}: ${err.message}`);
                                break;
                            }
                            for (const refund of refunds) {
                                if ((refund.status || "") !== "succeeded") {
                                    continue;
                                }
                                const refundCents = Math.floor(Number(refund.amount || 0));
                                if (!Number.isFinite(refundCents) || refundCents <= 0) {
                                    continue;
                                }
                                try {
                                    await TokenService.getInstance().revertFromRefund(
                                        payment,
                                        refundCents,
                                        payment.uid,
                                        `refund:${payment.id}:${refund.id}`,
                                    );
                                } catch (err) {
                                    Monitor.error(`[STRIPE] Error reverting tokens from refund ${refund.id}: ${err.message}`);
                                }
                            }
                            const cumulativeRefundCents = Math.floor(Number(charge.amount_refunded || 0));
                            const isFullRefund = charge.refunded === true || cumulativeRefundCents >= payment.amountCents;
                            payment.status = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
                            payment.updatedAt = Date.now();
                            await payment.save();
                            Monitor.debug(`[STRIPE] Payment ${payment.id} status updated to ${payment.status}`);
                        }
                    }
                }
                break;
            case "invoice.paid":
                {
                    const invoice = event.data.object as Stripe.Invoice;
                    const stripeSubscriptionId = invoice.parent.subscription_details.subscription
                        ? (invoice.parent.subscription_details.subscription + "")
                        : "";
                    if (stripeSubscriptionId) {
                        try {
                            await SubscriptionBillingService.getInstance().handleInvoicePaid(stripeSubscriptionId, invoice, event.id);
                            Monitor.debug(`[STRIPE] Subscription marked active from invoice.paid: ${stripeSubscriptionId}`);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : `${err}`;
                            Monitor.error(`[STRIPE] Error handling invoice.paid: ${message}`);
                            sendApiError(request, response, 500, "SUBSCRIPTION_INVOICE_PROCESSING_FAILED", message);
                            return;
                        }
                    }
                }
                break;
            case "invoice.payment_failed":
                {
                    const invoice = event.data.object as Stripe.Invoice;
                    const stripeSubscriptionId = invoice.parent.subscription_details.subscription
                        ? (invoice.parent.subscription_details.subscription + "")
                        : "";
                    if (stripeSubscriptionId) {
                        try {
                            await SubscriptionBillingService.getInstance().handlePaymentFailed(stripeSubscriptionId, invoice, event.id);
                            Monitor.debug(`[STRIPE] Subscription marked past_due from invoice.payment_failed: ${stripeSubscriptionId}`);
                        } catch (err) {
                            Monitor.error(`[STRIPE] Error handling invoice.payment_failed: ${err.message}`);
                        }
                    }
                }
                break;
            case "customer.subscription.deleted":
                {
                    const stripeSubscription = event.data.object as Stripe.Subscription;
                    const stripeSubscriptionId = (stripeSubscription?.id || "") + "";
                    if (stripeSubscriptionId) {
                        try {
                            await SubscriptionBillingService.getInstance().handleSubscriptionDeleted(stripeSubscriptionId);
                            Monitor.debug(`[STRIPE] Subscription marked cancelled from customer.subscription.deleted: ${stripeSubscriptionId}`);
                        } catch (err) {
                            Monitor.error(`[STRIPE] Error handling customer.subscription.deleted: ${err.message}`);
                        }
                    }
                }
                break;
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    }
}
