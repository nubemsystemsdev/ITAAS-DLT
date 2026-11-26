// Subscription billing refund regression tests

"use strict";

import assert from "assert";
import Stripe from "stripe";
import { Payment, PaymentStatus } from "../../../src/models/payment";
import { Subscription, SubscriptionStatus } from "../../../src/models/subscription";
import { StripeService } from "../../../src/services/stripe-service";
import { SubscriptionBillingService } from "../../../src/services/subscription-billing-service";
import { TokenService } from "../../../src/services/token-service";

describe("SubscriptionBillingService refunds", () => {
    const billing = SubscriptionBillingService.getInstance();
    let originalStripe: StripeService;
    let originalFindSubscription: typeof Subscription.findById;
    let originalFindPayment: typeof Payment.findById;
    let originalTokenService: typeof TokenService.getInstance;
    let client: Stripe;
    let payment: Payment;
    let subscription: Subscription;
    let refundRequests: Stripe.RefundCreateParams[];
    let invoiceRequests: Stripe.InvoicePaymentListParams[];
    let checkoutRequests: string[];
    let invoicePaymentPages: Stripe.InvoicePayment[][];
    let pagesRead: number;
    let customerChargeLookups: number;

    function invoicePayment(paymentIntent: string | Stripe.PaymentIntent, invoice = "in_selected", status = "paid"): Stripe.InvoicePayment {
        return {
            id: "inpay_selected",
            invoice,
            status,
            amount_paid: status === "paid" ? 3000 : null,
            payment: { type: "payment_intent", payment_intent: paymentIntent },
        } as Stripe.InvoicePayment;
    }

    beforeEach(() => {
        originalStripe = StripeService.instance;
        originalFindSubscription = Subscription.findById;
        originalFindPayment = Payment.findById;
        originalTokenService = TokenService.getInstance;
        refundRequests = [];
        invoiceRequests = [];
        checkoutRequests = [];
        pagesRead = 0;
        customerChargeLookups = 0;
        invoicePaymentPages = [[invoicePayment("pi_selected")]];
        subscription = {
            id: "subscription_selected",
            lastPaymentId: "payment_selected",
            stripeSubscriptionId: "sub_selected",
            status: SubscriptionStatus.ACTIVE,
            organizationId: "",
        } as Subscription;
        payment = {
            id: "payment_selected",
            subscriptionId: subscription.id,
            providerSessionId: "in_selected",
            stripePaymentIntentId: "",
            status: PaymentStatus.COMPLETED,
            amountCents: 3000,
            save: async () => undefined,
        } as unknown as Payment;
        Subscription.findById = async () => subscription;
        Payment.findById = async () => payment;
        TokenService.getInstance = () => ({ revertFromRefund: async () => undefined } as unknown as TokenService);

        client = new Stripe("sk_test_refund_fixture", StripeService.CONFIG);
        client.refunds.create = (async (params: Stripe.RefundCreateParams) => {
            refundRequests.push(params);
            return { id: "re_selected", amount: params.amount || payment.amountCents, status: "succeeded" };
        }) as typeof client.refunds.create;
        client.invoicePayments.list = ((params: Stripe.InvoicePaymentListParams) => {
            invoiceRequests.push(params);
            return (async function* () {
                for (const page of invoicePaymentPages) {
                    pagesRead++;
                    yield* page;
                }
            })() as unknown as Stripe.ApiListPromise<Stripe.InvoicePayment>;
        }) as typeof client.invoicePayments.list;
        client.checkout.sessions.retrieve = (async (id: string) => {
            checkoutRequests.push(id);
            return { id, payment_intent: null, invoice: "in_selected" };
        }) as typeof client.checkout.sessions.retrieve;
        client.subscriptions.retrieve = (async () => ({ customer: "cus_shared", latest_invoice: "in_unrelated" })) as unknown as typeof client.subscriptions.retrieve;
        client.charges.list = (async () => {
            customerChargeLookups++;
            return { data: [{ payment_intent: "pi_unrelated" }] };
        }) as typeof client.charges.list;
        StripeService.instance = { client } as StripeService;
    });

    afterEach(() => {
        StripeService.instance = originalStripe;
        Subscription.findById = originalFindSubscription;
        Payment.findById = originalFindPayment;
        TokenService.getInstance = originalTokenService;
    });

    it("refunds the selected invoice even when the customer has a newer unrelated charge", async () => {
        const result = await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin");

        assert.deepStrictEqual(refundRequests, [{ payment_intent: "pi_selected" }]);
        assert.deepStrictEqual(invoiceRequests, [{ invoice: "in_selected", status: "paid", limit: 100 }]);
        assert.strictEqual(customerChargeLookups, 0);
        assert.strictEqual(result.paymentId, payment.id);
        assert.strictEqual(payment.status, PaymentStatus.REFUNDED);
    });

    it("resolves a subscription checkout through that session's invoice", async () => {
        payment.providerSessionId = "cs_selected";
        await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin");

        assert.deepStrictEqual(checkoutRequests, ["cs_selected"]);
        assert.strictEqual(invoiceRequests[0].invoice, "in_selected");
        assert.strictEqual(refundRequests[0].payment_intent, "pi_selected");
        assert.strictEqual(customerChargeLookups, 0);
    });

    it("accepts expanded invoice and payment intent references", async () => {
        payment.providerSessionId = "cs_selected";
        client.checkout.sessions.retrieve = (async () => ({ payment_intent: null, invoice: { id: "in_selected" } })) as unknown as typeof client.checkout.sessions.retrieve;
        invoicePaymentPages = [[invoicePayment({ id: "pi_selected" } as Stripe.PaymentIntent)]];
        invoicePaymentPages[0][0].invoice = { id: "in_selected" } as Stripe.Invoice;

        await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin");
        assert.strictEqual(refundRequests[0].payment_intent, "pi_selected");
    });

    it("keeps explicitly stored payment intents", async () => {
        payment.stripePaymentIntentId = "pi_stored";
        await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin", 1500);

        assert.deepStrictEqual(refundRequests, [{ payment_intent: "pi_stored", amount: 1500 }]);
        assert.strictEqual(invoiceRequests.length, 0);
        assert.strictEqual(payment.status, PaymentStatus.PARTIALLY_REFUNDED);
    });

    it("supports a payment intent stored as the provider reference", async () => {
        payment.providerSessionId = "pi_selected";
        await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin");

        assert.strictEqual(refundRequests[0].payment_intent, "pi_selected");
        assert.strictEqual(invoiceRequests.length, 0);
    });

    it("supports the payment intent returned by the selected checkout session", async () => {
        payment.providerSessionId = "cs_selected";
        client.checkout.sessions.retrieve = (async () => ({ payment_intent: { id: "pi_selected" }, invoice: null })) as unknown as typeof client.checkout.sessions.retrieve;
        await billing.refundSubscriptionPayment(subscription.id, payment.id, "admin");

        assert.strictEqual(refundRequests[0].payment_intent, "pi_selected");
        assert.strictEqual(invoiceRequests.length, 0);
    });

    for (const reference of ["", "sub_selected", "unknown_reference"]) {
        it(`does not guess a charge for an unresolved provider reference (${reference || "empty"})`, async () => {
            payment.providerSessionId = reference;
            await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);

            assert.strictEqual(refundRequests.length, 0);
            assert.strictEqual(customerChargeLookups, 0);
            assert.strictEqual(payment.status, PaymentStatus.COMPLETED);
        });
    }

    it("does not use the subscription's latest invoice when checkout has no payment or invoice", async () => {
        payment.providerSessionId = "cs_selected";
        client.checkout.sessions.retrieve = (async () => ({ payment_intent: null, invoice: null })) as unknown as typeof client.checkout.sessions.retrieve;
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);

        assert.strictEqual(refundRequests.length, 0);
        assert.strictEqual(invoiceRequests.length, 0);
        assert.strictEqual(customerChargeLookups, 0);
    });

    for (const status of ["open", "canceled"]) {
        it(`does not refund an invoice payment with status ${status}`, async () => {
            invoicePaymentPages = [[invoicePayment("pi_selected", "in_selected", status)]];
            await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);
            assert.strictEqual(refundRequests.length, 0);
        });
    }

    it("does not refund an invoice without payments", async () => {
        invoicePaymentPages = [[]];
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);
        assert.strictEqual(refundRequests.length, 0);
        assert.strictEqual(customerChargeLookups, 0);
    });

    it("rejects ambiguous invoice payments across multiple pages", async () => {
        invoicePaymentPages = [[invoicePayment("pi_selected")], [invoicePayment("pi_other")]];
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);

        assert.strictEqual(pagesRead, 2);
        assert.strictEqual(refundRequests.length, 0);
        assert.strictEqual(payment.status, PaymentStatus.COMPLETED);
    });

    it("rejects a payment linked to another invoice", async () => {
        invoicePaymentPages = [[invoicePayment("pi_unrelated", "in_unrelated")]];
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);
        assert.strictEqual(refundRequests.length, 0);
    });

    it("does not guess a payment intent for a payment recorded outside Stripe", async () => {
        invoicePaymentPages[0][0].payment = { type: "payment_record", payment_record: "pr_selected" };
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);
        assert.strictEqual(refundRequests.length, 0);
    });

    it("does not refund another charge if invoice lookup fails", async () => {
        client.invoicePayments.list = (() => { throw new Error("Stripe unavailable"); }) as typeof client.invoicePayments.list;
        await assert.rejects(billing.refundSubscriptionPayment(subscription.id, payment.id, "admin"), /STRIPE_PAYMENT_NOT_FOUND/);
        assert.strictEqual(refundRequests.length, 0);
        assert.strictEqual(customerChargeLookups, 0);
    });

    it("records the invoice's payment intent from the modern InvoicePayment schema", async () => {
        const originalFindByStripeId = Subscription.findByStripeSubscriptionId;
        const internal = billing as any;
        const originalSync = internal.syncLocalSubscriptionFromStripe;
        const originalApplySeats = internal.applyPendingSeatIncreaseOnInvoicePaid;
        const originalRecord = internal.recordSubscriptionPayment;
        const originalGrant = internal.grantTokensForSubscriptionPayment;
        let recorded: { providerSessionId: string; stripePaymentIntentId: string };
        Subscription.findByStripeSubscriptionId = async () => subscription;
        internal.syncLocalSubscriptionFromStripe = async () => undefined;
        internal.applyPendingSeatIncreaseOnInvoicePaid = async () => undefined;
        internal.grantTokensForSubscriptionPayment = async () => undefined;
        internal.recordSubscriptionPayment = async (data: typeof recorded) => {
            recorded = data;
            return payment;
        };
        try {
            await billing.handleInvoicePaid("sub_selected", {
                id: "in_selected", billing_reason: "subscription_cycle", amount_paid: 3000, currency: "eur",
            } as Stripe.Invoice, "evt_selected");

            assert.strictEqual(recorded.providerSessionId, "in_selected");
            assert.strictEqual(recorded.stripePaymentIntentId, "pi_selected");
        } finally {
            Subscription.findByStripeSubscriptionId = originalFindByStripeId;
            internal.syncLocalSubscriptionFromStripe = originalSync;
            internal.applyPendingSeatIncreaseOnInvoicePaid = originalApplySeats;
            internal.recordSubscriptionPayment = originalRecord;
            internal.grantTokensForSubscriptionPayment = originalGrant;
        }
    });

    it("records the open payment attempt when a partially paid invoice fails", async () => {
        const originalFindByStripeId = Subscription.findByStripeSubscriptionId;
        const internal = billing as any;
        const originalRevertSeats = internal.revertPendingSeatIncrease;
        const originalRecord = internal.recordSubscriptionPayment;
        let recorded: { stripePaymentIntentId: string; status: PaymentStatus };
        Subscription.findByStripeSubscriptionId = async () => subscription;
        subscription.hasPendingSeatIncrease = () => true;
        internal.revertPendingSeatIncrease = async () => true;
        internal.recordSubscriptionPayment = async (data: typeof recorded) => {
            recorded = data;
            return payment;
        };
        invoicePaymentPages = [[invoicePayment("pi_paid"), invoicePayment("pi_failed", "in_selected", "open")]];
        try {
            await billing.handlePaymentFailed("sub_selected", {
                id: "in_selected", billing_reason: "subscription_update", amount_due: 3000, currency: "eur",
            } as Stripe.Invoice, "evt_failed");

            assert.strictEqual(recorded.stripePaymentIntentId, "pi_failed");
            assert.strictEqual(recorded.status, PaymentStatus.FAILED);
            assert.strictEqual(invoiceRequests[0].status, "open");
        } finally {
            Subscription.findByStripeSubscriptionId = originalFindByStripeId;
            internal.revertPendingSeatIncrease = originalRevertSeats;
            internal.recordSubscriptionPayment = originalRecord;
        }
    });
});
