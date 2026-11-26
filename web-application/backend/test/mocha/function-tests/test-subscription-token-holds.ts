// Subscription token reservation regression tests

"use strict";

import assert from "assert";
import Express from "express";
import Stripe from "stripe";
import { RedisConfig } from "../../../src/config/config-redis";
import { SubscriptionsController } from "../../../src/controllers/api/api-subscriptions";
import { StripeEventsController } from "../../../src/controllers/webhooks/stripe-events";
import { User } from "../../../src/models/users/user";
import { CatalogItem, CatalogItemType } from "../../../src/models/catalog-item";
import { BillingCycle, ItemPlan } from "../../../src/models/item-plan";
import { SubscribableType, Subscription, SubscriptionStatus } from "../../../src/models/subscription";
import { TokenTraceability, TokenTraceabilityActionKind, TokenTraceabilityStatus } from "../../../src/models/token-traceability";
import { TokenWallet, TokenWalletScopeType } from "../../../src/models/token-wallet";
import { Wallet } from "../../../src/models/wallet";
import { BlockchainService } from "../../../src/services/blockchain-service";
import { StripeService } from "../../../src/services/stripe-service";
import { SubscriptionBillingService } from "../../../src/services/subscription-billing-service";
import { SubscriptionService } from "../../../src/services/subscription-service";
import { TraceabilityService } from "../../../src/services/traceability-service";
import { OrganizationService } from "../../../src/services/organization-service";
import { RedisService } from "../../../src/services/redis-service";
import { AuthContext, UsersService } from "../../../src/services/users-service";
import { EffectiveTokenRules, TokenRedeemQuote, TokenService } from "../../../src/services/token-service";

describe("Subscription token holds", () => {
    const billing = SubscriptionBillingService.getInstance();
    const internal = billing as any;
    const successUrl = "https://example.test/subscription/success";
    const cancelUrl = "https://example.test/subscription/cancel";
    let originalStripe: StripeService;
    let originalTokenService: typeof TokenService.getInstance;
    let originalSubscriptionService: typeof SubscriptionService.getInstance;
    let originalFindSubscription: typeof Subscription.findById;
    let originalCreateSubscription: typeof Subscription.createSubscription;
    let originalFindOrganizationSubscriptions: typeof Subscription.findNonCancelledByOrganization;
    let originalFindItemPlan: typeof ItemPlan.findById;
    let originalFindCatalogItem: typeof CatalogItem.findById;
    let originalPreviewProration: typeof billing.previewProration;
    let originalSync: typeof internal.syncLocalSubscriptionFromStripe;
    let originalWorkspaceSync: typeof internal.syncItaasWorkspaceBestEffort;
    let originalFindOpenPlanChangeHolds: typeof TokenTraceability.findOpenPlanChangeHolds;
    let originalFindOperationAction: typeof TokenTraceability.findByOperationAction;
    let planChangeTraces: TokenTraceability[];
    let redisWasEnabled: boolean;
    let client: Stripe;
    let local: Subscription;
    let quote: TokenRedeemQuote;
    let held: Awaited<ReturnType<TokenService["hold"]>>;
    let holdError: Error;
    let updateError: Error;
    let holdRequests: Parameters<TokenService["hold"]>[];
    let commitRequests: string[];
    let releaseRequests: string[];
    let couponRequests: Stripe.CouponCreateParams[];
    let checkoutRequests: Stripe.Checkout.SessionCreateParams[];
    let checkoutSessions: Stripe.Checkout.Session[];
    let expiredSessions: Stripe.Checkout.Session[];
    let checkoutKeys: string[];
    let lifecycleEvents: string[];
    let createdLocals: Subscription[];
    let balanceRequests: Array<{ customerId: string; amount: number }>;
    let balanceTransactions: Stripe.CustomerBalanceTransaction[];
    let balanceKeys: string[];
    let stripeSubscriptionMetadata: Stripe.Metadata;
    let updateRequests: Stripe.SubscriptionUpdateParams[];
    let createdSubscriptions: number;
    let sharedAvailableTokens: number | null;
    let prorationDueCents: number;

    async function checkout(existing: boolean, redeemTokens = 100, options?: { organizationId?: string; quantity?: number }) {
        if (existing) {
            return billing.createCheckoutForExistingSubscription(local, redeemTokens, successUrl, cancelUrl, options);
        }
        const result = await billing.createStripeSubscription("owner", SubscribableType.ITEM, "item_plan", redeemTokens, successUrl, cancelUrl, options);
        return result.checkoutUrl;
    }

    async function changePlan(redeemTokens = 100, targetSubscribableId = "item_plan") {
        return billing.changePlan("owner", local.id, SubscribableType.ITEM, targetSubscribableId, redeemTokens);
    }

    async function expirationWebhook(session: Stripe.Checkout.Session) {
        const originalConstructEvent = client.webhooks.constructEvent;
        client.webhooks.constructEvent = () => ({ type: "checkout.session.expired", data: { object: session } }) as Stripe.Event;
        const request = { headers: { "stripe-signature": "fixture" }, body: {} } as unknown as Express.Request;
        let acknowledged = false;
        const response = { json: () => { acknowledged = true; } } as unknown as Express.Response;
        try {
            await new StripeEventsController().stripeEventHandler(request, response);
            assert(acknowledged);
        } finally {
            client.webhooks.constructEvent = originalConstructEvent;
        }
    }

    beforeEach(() => {
        redisWasEnabled = RedisConfig.getInstance().enabled;
        RedisConfig.getInstance().enabled = false;
        originalStripe = StripeService.instance;
        originalTokenService = TokenService.getInstance;
        originalSubscriptionService = SubscriptionService.getInstance;
        originalFindSubscription = Subscription.findById;
        originalCreateSubscription = Subscription.createSubscription;
        originalFindOrganizationSubscriptions = Subscription.findNonCancelledByOrganization;
        originalFindItemPlan = ItemPlan.findById;
        originalFindCatalogItem = CatalogItem.findById;
        originalPreviewProration = billing.previewProration;
        originalSync = internal.syncLocalSubscriptionFromStripe;
        originalWorkspaceSync = internal.syncItaasWorkspaceBestEffort;
        originalFindOpenPlanChangeHolds = TokenTraceability.findOpenPlanChangeHolds;
        originalFindOperationAction = TokenTraceability.findByOperationAction;
        planChangeTraces = [];
        TokenTraceability.findOpenPlanChangeHolds = async () => [];
        TokenTraceability.findByOperationAction = async (id, action) => planChangeTraces.filter(trace => trace.operationId === id && trace.actionKind === action);
        holdRequests = [];
        commitRequests = [];
        releaseRequests = [];
        couponRequests = [];
        checkoutRequests = [];
        checkoutSessions = [];
        expiredSessions = [];
        checkoutKeys = [];
        lifecycleEvents = [];
        createdLocals = [];
        balanceRequests = [];
        balanceTransactions = [];
        balanceKeys = [];
        stripeSubscriptionMetadata = {};
        updateRequests = [];
        createdSubscriptions = 0;
        sharedAvailableTokens = null;
        prorationDueCents = 5000;
        holdError = updateError = null;
        quote = { availableTokens: 100, appliedTokens: 100, discountEurCents: 1000 } as TokenRedeemQuote;
        held = { appliedTokens: 40, discountEurCents: 400 };
        local = {
            id: "subscription_existing", uid: "owner", organizationId: null,
            subscribableType: SubscribableType.ITEM, subscribableId: "item_plan",
            stripeSubscriptionId: "sub_selected", quantity: 3, lastPaymentId: "payment_selected",
            status: SubscriptionStatus.PENDING, save: async () => undefined,
        } as unknown as Subscription;
        Subscription.findById = async () => local;
        Subscription.findNonCancelledByOrganization = async () => [];
        Subscription.createSubscription = async (data) => {
            const created = {
                ...data, id: `subscription_created_${++createdSubscriptions}`, status: SubscriptionStatus.PENDING,
                save: async () => undefined,
            } as unknown as Subscription;
            createdLocals.push(created);
            return created;
        };
        ItemPlan.findById = async () => ({
            id: "item_plan", itemId: "item_selected", billingCycle: BillingCycle.MONTHLY,
            priceCents: 10000, stripePriceId: "price_selected",
        }) as ItemPlan;
        CatalogItem.findById = async () => ({ id: "item_selected", type: CatalogItemType.DIGITAL_PRODUCT }) as CatalogItem;
        SubscriptionService.getInstance = () => ({
            assertPersonalMultiLicensePlanPurchaseAllowed: async () => undefined,
        }) as unknown as SubscriptionService;
        TokenService.getInstance = () => ({
            quote: async () => quote,
            hold: async (...args: Parameters<TokenService["hold"]>) => {
                holdRequests.push(args);
                lifecycleEvents.push(`hold:${args[2]}`);
                if (holdError) throw holdError;
                if (sharedAvailableTokens !== null) {
                    const appliedTokens = Math.min(args[2], sharedAvailableTokens);
                    sharedAvailableTokens -= appliedTokens;
                    return { appliedTokens, discountEurCents: appliedTokens * 10 };
                }
                if (args[5] && held.appliedTokens > 0) {
                    planChangeTraces.push({
                        operationId: args[3], actionKind: TokenTraceabilityActionKind.REDEEM_HOLD,
                        amountEurCents: -held.discountEurCents,
                        payloadJson: JSON.stringify({ payload: { amountEurCents: args[1], ...args[5] } }),
                        save: async () => undefined,
                    } as unknown as TokenTraceability);
                }
                return { ...held };
            },
            commit: async (id: string) => { commitRequests.push(id); },
            release: async (id: string) => { releaseRequests.push(id); lifecycleEvents.push(`release:${id}`); },
        }) as unknown as TokenService;
        billing.previewProration = async () => ({ creditCents: 0, chargeCents: prorationDueCents, totalDueCents: prorationDueCents, currency: "eur" });
        internal.syncLocalSubscriptionFromStripe = async () => local;
        internal.syncItaasWorkspaceBestEffort = async () => undefined;

        client = new Stripe("sk_test_subscription_hold_fixture", StripeService.CONFIG);
        client.customers.search = (async () => ({ data: [{ id: "cus_selected" }] })) as unknown as typeof client.customers.search;
        client.subscriptions.list = (async () => ({ data: [] })) as unknown as typeof client.subscriptions.list;
        client.coupons.create = (async (params: Stripe.CouponCreateParams) => {
            couponRequests.push(params);
            return { id: `coupon_${couponRequests.length}` };
        }) as typeof client.coupons.create;
        client.checkout.sessions.list = ((params: Stripe.Checkout.SessionListParams) => {
            return (async function* () {
                yield* checkoutSessions.filter(session => session.customer === params.customer);
            })() as unknown as Stripe.ApiListPromise<Stripe.Checkout.Session>;
        }) as typeof client.checkout.sessions.list;
        client.checkout.sessions.update = (async (id: string, params: Stripe.Checkout.SessionUpdateParams) => {
            const session = checkoutSessions.find(session => session.id === id);
            session.metadata = { ...session.metadata, ...(params.metadata as Stripe.MetadataParam) } as Stripe.Metadata;
            lifecycleEvents.push(`update:${id}`);
            return session;
        }) as typeof client.checkout.sessions.update;
        client.checkout.sessions.expire = (async (id: string) => {
            const session = checkoutSessions.find(session => session.id === id);
            session.status = "expired";
            lifecycleEvents.push(`expire:${id}`);
            expiredSessions.push({ ...session, metadata: { ...session.metadata } });
            return session;
        }) as typeof client.checkout.sessions.expire;
        client.checkout.sessions.retrieve = (async (id: string) => checkoutSessions.find(session => session.id === id)) as typeof client.checkout.sessions.retrieve;
        client.checkout.sessions.create = (async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
            checkoutRequests.push(params);
            checkoutKeys.push(options.idempotencyKey);
            const session = {
                id: `cs_${checkoutRequests.length}`, url: "https://checkout.stripe.test/selected",
                status: "open", customer: params.customer, metadata: { ...params.metadata },
            } as Stripe.Checkout.Session;
            checkoutSessions.push(session);
            lifecycleEvents.push(`create:${session.id}`);
            return session;
        }) as typeof client.checkout.sessions.create;
        client.subscriptions.retrieve = (async () => ({
            id: "sub_selected", customer: "cus_selected", schedule: null,
            items: { data: [{ id: "si_selected", quantity: 1 }] }, metadata: { ...stripeSubscriptionMetadata },
        })) as unknown as typeof client.subscriptions.retrieve;
        client.subscriptions.update = (async (_id: string, params: Stripe.SubscriptionUpdateParams) => {
            updateRequests.push(params);
            if (updateError) throw updateError;
            stripeSubscriptionMetadata = { ...stripeSubscriptionMetadata, ...params.metadata } as Stripe.Metadata;
            return { id: "sub_selected" };
        }) as typeof client.subscriptions.update;
        client.customers.listBalanceTransactions = ((customerId: string) => {
            return (async function* () {
                yield* balanceTransactions.filter(transaction => transaction.customer === customerId);
            })() as unknown as Stripe.ApiListPromise<Stripe.CustomerBalanceTransaction>;
        }) as typeof client.customers.listBalanceTransactions;
        client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams, options?: Stripe.RequestOptions) => {
            const previousIndex = balanceKeys.indexOf(options?.idempotencyKey);
            if (options?.idempotencyKey && previousIndex >= 0) {
                return balanceTransactions[previousIndex];
            }
            balanceRequests.push({ customerId, amount: params.amount });
            balanceKeys.push(options?.idempotencyKey);
            const transaction = {
                id: `cbtxn_${balanceTransactions.length}`, customer: customerId,
                amount: params.amount, currency: params.currency, metadata: { ...params.metadata },
            } as Stripe.CustomerBalanceTransaction;
            balanceTransactions.push(transaction);
            return transaction;
        }) as typeof client.customers.createBalanceTransaction;
        StripeService.instance = { client } as StripeService;
    });

    afterEach(() => {
        RedisConfig.getInstance().enabled = redisWasEnabled;
        StripeService.instance = originalStripe;
        TokenService.getInstance = originalTokenService;
        SubscriptionService.getInstance = originalSubscriptionService;
        Subscription.findById = originalFindSubscription;
        Subscription.createSubscription = originalCreateSubscription;
        Subscription.findNonCancelledByOrganization = originalFindOrganizationSubscriptions;
        ItemPlan.findById = originalFindItemPlan;
        CatalogItem.findById = originalFindCatalogItem;
        billing.previewProration = originalPreviewProration;
        internal.syncLocalSubscriptionFromStripe = originalSync;
        internal.syncItaasWorkspaceBestEffort = originalWorkspaceSync;
        TokenTraceability.findOpenPlanChangeHolds = originalFindOpenPlanChangeHolds;
        TokenTraceability.findByOperationAction = originalFindOperationAction;
    });

    for (const existing of [false, true]) {
        const flow = existing ? "existing subscription checkout" : "new subscription checkout";
        const subscriptionId = existing ? "subscription_existing" : "subscription_created_1";

        it(`${flow} applies only the partial discount actually reserved`, async () => {
            await checkout(existing);

            const operationId = holdRequests[0][3];
            assert.match(operationId, new RegExp(`^redeem:subscription:checkout:${subscriptionId}:[0-9a-f]{32}$`));
            assert.deepStrictEqual(holdRequests, [["owner", 10000, 100, operationId, null]]);
            assert.strictEqual(couponRequests[0].amount_off, 400);
            assert.deepStrictEqual(checkoutRequests[0].discounts, [{ coupon: "coupon_1" }]);
            assert.strictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, holdRequests[0][3]);
            assert.strictEqual(checkoutKeys[0], holdRequests[0][3]);
        });

        it(`${flow} creates no coupon or redemption metadata when the reservation returns zero`, async () => {
            held = { appliedTokens: 0, discountEurCents: 0 };
            await checkout(existing);

            assert.strictEqual(holdRequests.length, 1);
            assert.deepStrictEqual(couponRequests, []);
            assert.strictEqual(checkoutRequests[0].discounts, undefined);
            assert.strictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, "");
        });

        it(`${flow} applies the full discount when all requested tokens were reserved`, async () => {
            held = { appliedTokens: 100, discountEurCents: 1000 };
            await checkout(existing);

            assert.strictEqual(couponRequests[0].amount_off, 1000);
            assert.strictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, holdRequests[0][3]);
        });

        it(`${flow} stops before creating Stripe discounts or sessions when the hold fails`, async () => {
            holdError = new Error("INSUFFICIENT_TOKENS");
            await assert.rejects(checkout(existing), /INSUFFICIENT_TOKENS/);

            assert.deepStrictEqual(couponRequests, []);
            assert.deepStrictEqual(checkoutRequests, []);
        });

        it(`${flow} skips reservations and discounts when no redemption was requested`, async () => {
            await checkout(existing, 0);

            assert.deepStrictEqual(holdRequests, []);
            assert.deepStrictEqual(couponRequests, []);
            assert.strictEqual(checkoutRequests[0].discounts, undefined);
            assert.strictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, "");
        });

        it(`${flow} reserves against the organization wallet and the total price for all seats`, async () => {
            await checkout(existing, 100, { organizationId: "org_selected", quantity: 3 });

            assert.deepStrictEqual(holdRequests, [["owner", 30000, 100, holdRequests[0][3], "org_selected"]]);
            assert.strictEqual(couponRequests[0].amount_off, 400);
            assert.strictEqual(checkoutRequests[0].metadata.organization_id, "org_selected");
        });
    }

    it("uses the reserved discount rather than the earlier available-balance quote", async () => {
        quote = { availableTokens: 0, appliedTokens: 0, discountEurCents: 0 } as TokenRedeemQuote;
        await checkout(true);

        assert.strictEqual(holdRequests.length, 1);
        assert.strictEqual(couponRequests[0].amount_off, 400);
        assert.strictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, holdRequests[0][3]);
    });

    it("cannot discount two concurrent checkouts with the same available tokens", async () => {
        sharedAvailableTokens = 100;
        await Promise.all([checkout(false), checkout(false)]);

        assert.strictEqual(holdRequests.length, 2);
        assert.strictEqual(sharedAvailableTokens, 0);
        assert.strictEqual(couponRequests.length, 1);
        assert.strictEqual(couponRequests[0].amount_off, 1000);
        assert.strictEqual(checkoutRequests.filter(session => !!session.discounts?.length).length, 1);
        assert.strictEqual(checkoutRequests.filter(session => !!session.metadata.token_redeem_operation_id).length, 1);
    });

    it("keeps the previous reservation when its checkout cannot be expired", async () => {
        await checkout(true);
        const originalOperation = holdRequests[0][3];
        client.checkout.sessions.expire = (async () => { throw new Error("Stripe expiration failed"); }) as typeof client.checkout.sessions.expire;

        await assert.rejects(checkout(true, 1), /Stripe expiration failed/);

        assert.strictEqual(checkoutRequests.length, 1);
        assert.strictEqual(holdRequests.length, 1);
        assert.deepStrictEqual(releaseRequests, []);
        assert.strictEqual(checkoutSessions[0].status, "open");
        assert.strictEqual(checkoutSessions[0].metadata.subscription_checkout_replaced, "");
        assert.strictEqual(checkoutSessions[0].metadata.token_redeem_operation_id, originalOperation);
    });

    it("does not replace a checkout that completed before its webhook", async () => {
        await checkout(true);
        checkoutSessions[0].status = "complete";

        await assert.rejects(checkout(true, 1), /SUBSCRIPTION_CHECKOUT_ALREADY_COMPLETED/);

        assert.strictEqual(checkoutRequests.length, 1);
        assert.strictEqual(holdRequests.length, 1);
        assert.deepStrictEqual(releaseRequests, []);
        assert.deepStrictEqual(expiredSessions, []);
    });

    it("recovers a confirmed expiration when Stripe's expiration response is lost", async () => {
        await checkout(true);
        const expire = client.checkout.sessions.expire;
        client.checkout.sessions.expire = (async (id: string) => {
            await expire(id);
            throw new Error("Stripe expiration response lost");
        }) as typeof client.checkout.sessions.expire;
        await checkout(true, 1);

        assert.strictEqual(checkoutRequests.length, 2);
        assert.strictEqual(checkoutSessions[0].status, "expired");
        assert.deepStrictEqual(releaseRequests, [holdRequests[0][3]]);
    });

    it("leaves unrelated checkouts and their reservations unchanged", async () => {
        const unrelated = {
            id: "cs_other", customer: "cus_selected", status: "open",
            metadata: { kind: "subscription_checkout", local_subscription_id: "subscription_other", token_redeem_operation_id: "other_hold" },
        } as unknown as Stripe.Checkout.Session;
        checkoutSessions.push(unrelated);
        await checkout(true);

        assert.strictEqual(unrelated.status, "open");
        assert.deepStrictEqual(expiredSessions, []);
        assert.deepStrictEqual(releaseRequests, []);
    });

    it("stops a replacement when another worker holds its Redis lock", async () => {
        const originalRedis = RedisService.getInstance;
        RedisConfig.getInstance().enabled = true;
        RedisService.getInstance = () => ({ tryAcquireLock: async () => false }) as unknown as RedisService;
        try {
            await assert.rejects(checkout(true), /SUBSCRIPTION_CHECKOUT_BUSY/);
            assert.deepStrictEqual(holdRequests, []);
            assert.deepStrictEqual(checkoutRequests, []);
        } finally {
            RedisService.getInstance = originalRedis;
        }
    });

    it("keeps the pending subscription when the API cannot replace its checkout", async () => {
        const originalUsers = UsersService.getInstance;
        const originalOrganization = OrganizationService.getInstance;
        const originalActive = Subscription.findActiveByUserAndSubscribable;
        const originalPending = Subscription.findPendingByUserAndSubscribable;
        const subscriptions = SubscriptionService.getInstance();
        const auth = new AuthContext();
        auth.user = { id: "owner", role: "user" } as User;
        UsersService.getInstance = () => ({ auth: async () => auth }) as unknown as UsersService;
        OrganizationService.getInstance = () => ({ resolveBillingOrganizationContext: async () => ({ organizationId: null }) }) as unknown as OrganizationService;
        Subscription.findActiveByUserAndSubscribable = async () => [];
        Subscription.findPendingByUserAndSubscribable = async () => [local];
        SubscriptionService.getInstance = () => ({
            validateSubscriptionEligibility: async () => ({ eligible: false, reason: "ALREADY_SUBSCRIBED_TO_ITEM" }),
        }) as unknown as SubscriptionService;
        let status: number;
        const response = { status: (value: number) => { status = value; }, json: () => undefined, end: () => undefined } as unknown as Express.Response;
        const request = {
            body: { subscribable_type: SubscribableType.ITEM, subscribable_id: "item_plan", redeem_tokens: 0 },
            logger: { levels: { debug: false } },
        } as unknown as Express.Request;
        try {
            await checkout(true);
            client.checkout.sessions.expire = (async () => { throw new Error("Stripe expiration failed"); }) as typeof client.checkout.sessions.expire;
            await new SubscriptionsController().createSubscription(request, response);

            assert.strictEqual(status, 400);
            assert.strictEqual(local.status, SubscriptionStatus.PENDING);
            assert.strictEqual(checkoutSessions[0].status, "open");
            assert.deepStrictEqual(releaseRequests, []);
        } finally {
            UsersService.getInstance = originalUsers;
            OrganizationService.getInstance = originalOrganization;
            Subscription.findActiveByUserAndSubscribable = originalActive;
            Subscription.findPendingByUserAndSubscribable = originalPending;
            SubscriptionService.getInstance = () => subscriptions;
        }
    });

    it("ignores expiration events from checkouts explicitly replaced by a retry", async () => {
        local.stripeSubscriptionId = "";
        await checkout(true);
        await checkout(true, 1);
        await billing.handleCheckoutSessionExpired(expiredSessions[0]);

        assert.strictEqual(local.status, SubscriptionStatus.PENDING);
        assert.strictEqual(checkoutSessions[1].status, "open");
    });

    it("ignores a delayed natural expiration when a replacement checkout is open", async () => {
        local.stripeSubscriptionId = "";
        await checkout(true);
        checkoutSessions[0].status = "expired";
        const expired = { ...checkoutSessions[0], metadata: { ...checkoutSessions[0].metadata } };
        await checkout(true, 1);
        await billing.handleCheckoutSessionExpired(expired);

        assert.strictEqual(local.status, SubscriptionStatus.PENDING);
        assert.strictEqual(checkoutSessions[1].status, "open");
    });

    it("still cancels an abandoned checkout when there is no replacement", async () => {
        local.stripeSubscriptionId = "";
        await checkout(true);
        checkoutSessions[0].status = "expired";
        await billing.handleCheckoutSessionExpired(checkoutSessions[0]);

        assert.strictEqual(local.status, SubscriptionStatus.CANCELLED);
    });

    for (const failure of ["coupon", "session"]) {
        it(`releases the reservation when Stripe rejects the ${failure}`, async () => {
            const error = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Stripe rejected checkout" });
            if (failure === "coupon") {
                client.coupons.create = (async () => { throw error; }) as typeof client.coupons.create;
            } else {
                client.checkout.sessions.create = (async () => { throw error; }) as typeof client.checkout.sessions.create;
            }
            await assert.rejects(checkout(true), /Stripe rejected checkout/);

            assert.deepStrictEqual(releaseRequests, [holdRequests[0][3]]);
            assert.strictEqual(checkoutSessions.length, 0);
        });
    }

    it("keeps the reservation when Stripe may have created the checkout but its response is lost", async () => {
        const create = client.checkout.sessions.create;
        client.checkout.sessions.create = (async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
            await create(params, options);
            throw new Error("Stripe response lost");
        }) as unknown as typeof client.checkout.sessions.create;
        await assert.rejects(checkout(true), /Stripe response lost/);

        assert.deepStrictEqual(releaseRequests, []);
        assert.strictEqual(checkoutSessions[0].status, "open");
        assert.strictEqual(checkoutSessions[0].metadata.token_redeem_operation_id, holdRequests[0][3]);
    });

    it("credits only the amount reserved for a plan change", async () => {
        local.organizationId = "org_selected";
        await changePlan();

        const operationId = holdRequests[0][3];
        assert.match(operationId, /^redeem:subscription:change:subscription_existing:item_plan:[0-9a-f]{32}$/);
        assert.deepStrictEqual(holdRequests, [["owner", 5000, 100, operationId, "org_selected", holdRequests[0][5]]]);
        assert.strictEqual((holdRequests[0][5].planChange as any).subscriptionId, local.id);
        assert.strictEqual((holdRequests[0][5].planChange as any).customerId, "cus_selected");
        assert.deepStrictEqual(balanceRequests, [{ customerId: "cus_selected", amount: -400 }]);
        assert.deepStrictEqual(commitRequests, [operationId]);
    });

    it("does not credit or commit a zero-token reservation when changing plans", async () => {
        held = { appliedTokens: 0, discountEurCents: 0 };
        await changePlan();

        assert.deepStrictEqual(balanceRequests, []);
        assert.deepStrictEqual(commitRequests, []);
        assert.strictEqual(updateRequests.length, 1);
    });

    it("reverts only the applied reserved credit after a plan change fails", async () => {
        updateError = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Stripe update failed" });
        await assert.rejects(changePlan(), /Stripe update failed/);

        assert.deepStrictEqual(balanceRequests, [{ customerId: "cus_selected", amount: -400 }, { customerId: "cus_selected", amount: 400 }]);
        assert.deepStrictEqual(releaseRequests, [holdRequests[0][3]]);
        assert.deepStrictEqual(commitRequests, []);
    });

    it("does not release a nonexistent reservation after a plan change fails", async () => {
        held = { appliedTokens: 0, discountEurCents: 0 };
        updateError = new Error("Stripe update failed");
        await assert.rejects(changePlan(), /Stripe update failed/);

        assert.deepStrictEqual(balanceRequests, []);
        assert.deepStrictEqual(releaseRequests, []);
        assert.deepStrictEqual(commitRequests, []);
    });

    it("stops a plan change before applying credit when the reservation fails", async () => {
        holdError = new Error("INSUFFICIENT_TOKENS");
        await assert.rejects(changePlan(), /INSUFFICIENT_TOKENS/);

        assert.deepStrictEqual(balanceRequests, []);
        assert.deepStrictEqual(updateRequests, []);
        assert.deepStrictEqual(commitRequests, []);
    });

    it("skips reservation and credit when a plan change has no amount due", async () => {
        prorationDueCents = 0;
        await changePlan();

        assert.deepStrictEqual(holdRequests, []);
        assert.deepStrictEqual(balanceRequests, []);
        assert.deepStrictEqual(commitRequests, []);
    });

    describe("Reservation lifecycle with the real TokenService", () => {
        let tokens: TokenService;
        let wallet: TokenWallet;
        let traces: TokenTraceability[];
        let chargedTokens: number[];
        let originalFindTraces: typeof TokenTraceability.findByOperationAction;
        let originalCreateTrace: typeof TokenTraceability.create;
        let originalGetWallet: typeof TokenWallet.getOrCreate;
        let originalFindWallet: typeof TokenWallet.finder.findByKey;
        let originalFindChainWallet: typeof Wallet.findByUser;
        let originalBlockchain: typeof BlockchainService.getInstance;
        let originalFindOpenHolds: typeof TokenTraceability.findOpenPlanChangeHolds;

        async function apiPlanChange(redeemTokens: number, targetSubscribableId = "plan_b") {
            const originalUsers = UsersService.getInstance;
            const originalOrganization = OrganizationService.getInstance;
            const subscriptions = SubscriptionService.getInstance();
            const traceability = TraceabilityService.getInstance();
            const originalRecord = traceability.recordSubscriptionChanged;
            const auth = new AuthContext();
            auth.user = { id: "owner", role: "user" } as User;
            UsersService.getInstance = () => ({ auth: async () => auth }) as unknown as UsersService;
            OrganizationService.getInstance = () => ({ resolveBillingOrganizationContext: async () => ({ organizationId: null }) }) as unknown as OrganizationService;
            SubscriptionService.getInstance = () => ({
                parseEffectiveMode: () => "immediate",
                getEntitlement: async () => local,
                assertPersonalMultiLicensePlanPurchaseAllowed: async () => undefined,
            }) as unknown as SubscriptionService;
            traceability.recordSubscriptionChanged = async () => undefined;
            let status: number;
            let body: any;
            const response = { status: (value: number) => { status = value; }, json: (value: unknown) => { body = value; }, end: () => undefined } as unknown as Express.Response;
            const request = {
                body: { subscribable_type: SubscribableType.ITEM, subscribable_id: local.subscribableId, target_subscribable_id: targetSubscribableId, redeem_tokens: redeemTokens, effective: "immediate" },
                logger: { levels: { debug: false } },
            } as unknown as Express.Request;
            try {
                await new SubscriptionsController().changePlan(request, response);
                return { status, body };
            } finally {
                UsersService.getInstance = originalUsers;
                OrganizationService.getInstance = originalOrganization;
                SubscriptionService.getInstance = () => subscriptions;
                traceability.recordSubscriptionChanged = originalRecord;
            }
        }

        beforeEach(() => {
            originalFindTraces = TokenTraceability.findByOperationAction;
            originalCreateTrace = TokenTraceability.create;
            originalGetWallet = TokenWallet.getOrCreate;
            originalFindWallet = TokenWallet.finder.findByKey;
            originalFindChainWallet = Wallet.findByUser;
            originalBlockchain = BlockchainService.getInstance;
            originalFindOpenHolds = TokenTraceability.findOpenPlanChangeHolds;
            traces = [];
            chargedTokens = [];
            wallet = {
                id: "user:owner", scopeType: TokenWalletScopeType.USER, scopeId: "owner",
                availableTokens: 200, lockedTokens: 0, version: 0, save: async () => undefined,
            } as unknown as TokenWallet;
            TokenTraceability.findByOperationAction = async (id, action) => traces.filter(trace => trace.operationId === id && trace.actionKind === action);
            TokenTraceability.findOpenPlanChangeHolds = async (subscriptionId) => traces.filter(trace =>
                trace.actionKind === TokenTraceabilityActionKind.REDEEM_HOLD
                && trace.operationId.startsWith(`redeem:subscription:change:${subscriptionId}:`)
                && !traces.some(closed => closed.operationId === trace.operationId
                    && (closed.actionKind === TokenTraceabilityActionKind.REDEEM_COMMIT || closed.actionKind === TokenTraceabilityActionKind.REDEEM_RELEASE)));
            TokenTraceability.create = async (data) => {
                const trace = {
                    ...data, id: `trace_${traces.length}`, save: async () => undefined,
                    delete: async () => { traces = traces.filter(stored => stored !== trace); },
                } as unknown as TokenTraceability;
                traces.push(trace);
                return trace;
            };
            TokenWallet.getOrCreate = async () => wallet;
            TokenWallet.finder.findByKey = async (id) => id === wallet.id ? wallet : null;
            Wallet.findByUser = async () => ({ address: "0x" + "12".repeat(20) }) as Wallet;
            BlockchainService.getInstance = () => ({
                chargeUserBalance: async (_address: string, amount: bigint) => {
                    chargedTokens.push(Number(amount));
                    return `charge_tx_${chargedTokens.length}`;
                },
            }) as unknown as BlockchainService;
            tokens = new TokenService();
            tokens.getEffectiveRules = async () => ({
                enabled: true, minPurchaseEurCentsToRedeem: 0, maxRedeemPct: 100, tokenValueEurCents: 10,
            }) as EffectiveTokenRules;
            const hold = tokens.hold.bind(tokens);
            tokens.hold = async (...args) => {
                holdRequests.push(args);
                lifecycleEvents.push(`hold:${args[2]}`);
                return hold(...args);
            };
            const release = tokens.release.bind(tokens);
            tokens.release = async (...args) => {
                releaseRequests.push(args[0]);
                lifecycleEvents.push(`release:${args[0]}`);
                return release(...args);
            };
            TokenService.getInstance = () => tokens;
            ItemPlan.findById = async (id) => ({
                id, itemId: "item_selected", stripePriceId: `price_${id}`, billingCycle: BillingCycle.MONTHLY, priceCents: 10000,
            }) as ItemPlan;
            internal.syncLocalSubscriptionFromStripe = async () => {
                const metadata = updateRequests[updateRequests.length - 1].metadata;
                assert(metadata && typeof metadata === "object");
                local.subscribableId = metadata.subscribable_id as string;
                return local;
            };
        });

        afterEach(() => {
            TokenTraceability.findByOperationAction = originalFindTraces;
            TokenTraceability.create = originalCreateTrace;
            TokenWallet.getOrCreate = originalGetWallet;
            TokenWallet.finder.findByKey = originalFindWallet;
            Wallet.findByUser = originalFindChainWallet;
            BlockchainService.getInstance = originalBlockchain;
            TokenTraceability.findOpenPlanChangeHolds = originalFindOpenHolds;
        });

        it("reserves and consumes 100 then 1 tokens for A -> B -> A -> B", async () => {
            local.subscribableId = "plan_a";
            await changePlan(100, "plan_b");
            assert.strictEqual(local.subscribableId, "plan_b");
            await changePlan(0, "plan_a");
            assert.strictEqual(local.subscribableId, "plan_a");
            await changePlan(1, "plan_b");

            assert.deepStrictEqual(balanceRequests, [{ customerId: "cus_selected", amount: -1000 }, { customerId: "cus_selected", amount: -10 }]);
            assert.deepStrictEqual(chargedTokens, [100, 1]);
            assert.strictEqual(wallet.availableTokens, 99);
            assert.strictEqual(wallet.lockedTokens, 0);
            const holds = traces.filter(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_HOLD);
            const commits = traces.filter(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_COMMIT);
            assert.strictEqual(holds.length, 2);
            assert.notStrictEqual(holds[0].operationId, holds[1].operationId);
            assert.deepStrictEqual(commits.map(trace => trace.operationId), holds.map(trace => trace.operationId));
            assert.deepStrictEqual(commits.map(trace => trace.amountTokens), [-100, -1]);
        });

        it("uses a new reservation for a retry after the previous plan change was released", async () => {
            updateError = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Stripe update failed" });
            await assert.rejects(changePlan(100), /Stripe update failed/);
            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);

            updateError = null;
            await changePlan(1);

            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -10]);
            assert.deepStrictEqual(chargedTokens, [1]);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.notStrictEqual(holdRequests[0][3], holdRequests[1][3]);
        });

        it("releases the reservation if Stripe rejects the credit so a retry can reserve again", async () => {
            const createCredit = client.customers.createBalanceTransaction;
            client.customers.createBalanceTransaction = (async () => { throw new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Stripe credit failed" }); }) as typeof createCredit;
            await assert.rejects(changePlan(100), /Stripe credit failed/);
            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.deepStrictEqual(updateRequests, []);
            assert.deepStrictEqual(chargedTokens, []);
            assert.strictEqual(traces.filter(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_RELEASE).length, 1);

            client.customers.createBalanceTransaction = createCredit;
            await changePlan(1);
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-10]);
            assert.deepStrictEqual(chargedTokens, [1]);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.notStrictEqual(holdRequests[0][3], holdRequests[1][3]);
        });

        it("keeps the tokens reserved if Stripe applies credit but its response is lost", async () => {
            client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams) => {
                balanceRequests.push({ customerId, amount: params.amount });
                throw new Error("Stripe response lost");
            }) as typeof client.customers.createBalanceTransaction;
            await assert.rejects(changePlan(100), /Stripe response lost/);

            assert.deepStrictEqual(balanceRequests, [{ customerId: "cus_selected", amount: -1000 }]);
            assert.strictEqual(wallet.availableTokens, 100);
            assert.strictEqual(wallet.lockedTokens, 100);
            assert.deepStrictEqual(chargedTokens, []);
            assert.strictEqual(traces.length, 1);
            assert.strictEqual(traces[0].actionKind, TokenTraceabilityActionKind.REDEEM_HOLD);
        });

        for (const [ErrorType, type] of [
            [Stripe.errors.StripeInvalidRequestError, "invalid_request_error"],
            [Stripe.errors.StripeAuthenticationError, "authentication_error"],
            [Stripe.errors.StripePermissionError, "invalid_request_error"],
            [Stripe.errors.StripeRateLimitError, "rate_limit_error"],
            [Stripe.errors.StripeCardError, "card_error"],
        ] as const) {
            it(`releases a ${ErrorType.name} rejection and leaves no tokens locked after a successful retry`, async () => {
                const create = client.customers.createBalanceTransaction;
                client.customers.createBalanceTransaction = (async () => { throw new ErrorType({ type, message: "Definitive credit rejection" }); }) as typeof create;
                await assert.rejects(changePlan(100), /Definitive credit rejection/);

                assert.strictEqual(wallet.availableTokens, 200);
                assert.strictEqual(wallet.lockedTokens, 0);
                assert.strictEqual(traces.filter(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_RELEASE).length, 1);
                client.customers.createBalanceTransaction = create;
                await changePlan(100);

                assert.deepStrictEqual(chargedTokens, [100]);
                assert.strictEqual(wallet.availableTokens, 100);
                assert.strictEqual(wallet.lockedTokens, 0);
                assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000]);
                assert.notStrictEqual(holdRequests[0][3], holdRequests[1][3]);
            });
        }

        for (const error of [new Stripe.errors.StripeAPIError({ type: "api_error", message: "Uncertain credit", statusCode: 500 }), new Stripe.errors.StripeConnectionError({ type: "api_error", message: "Uncertain credit" }), new Stripe.errors.StripeIdempotencyError({ type: "idempotency_error", message: "Uncertain credit" })]) {
            it(`keeps a ${error.type} outcome recoverable and blocks a fresh reservation if reconciliation fails`, async () => {
                client.customers.createBalanceTransaction = (async () => { throw error; }) as typeof client.customers.createBalanceTransaction;
                await assert.rejects(changePlan(100), /Uncertain credit/);
                const hold = traces[0];
                const context = JSON.parse(hold.payloadJson).payload.planChange;
                assert.strictEqual(context.customerId, "cus_selected");
                assert.strictEqual(context.subscriptionId, local.id);
                assert.strictEqual(context.phase, "credit_pending");

                await assert.rejects(changePlan(1), /Uncertain credit/);
                assert.strictEqual(wallet.availableTokens, 100);
                assert.strictEqual(wallet.lockedTokens, 100);
                assert.strictEqual(holdRequests.length, 1);
                assert.deepStrictEqual(updateRequests, []);
                assert.deepStrictEqual(chargedTokens, []);
            });
        }

        it("reconciles a lost credit response after a service restart before applying a new redemption", async () => {
            const create = client.customers.createBalanceTransaction;
            client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams, options?: Stripe.RequestOptions) => {
                await create(customerId, params, options);
                throw new Error("Credit response lost");
            }) as unknown as typeof create;
            await assert.rejects(changePlan(100), /Credit response lost/);
            assert.strictEqual(wallet.lockedTokens, 100);
            const originalOperation = holdRequests[0][3];

            client.customers.createBalanceTransaction = create;
            const restartedTokens = new TokenService();
            restartedTokens.getEffectiveRules = tokens.getEffectiveRules;
            TokenService.getInstance = () => restartedTokens;
            await new SubscriptionBillingService().reconcilePlanChangeTokenHolds(local.id);
            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);
            await changePlan(1);

            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -10]);
            assert.deepStrictEqual(balanceKeys.slice(0, 2), [originalOperation, `${originalOperation}:revert`]);
            assert.deepStrictEqual(chargedTokens, [1]);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.strictEqual(wallet.lockedTokens, 0);
        });

        it("reconciles a lost credit response through the API before checking a fully reserved balance", async () => {
            wallet.availableTokens = 100;
            local.subscribableId = "plan_a";
            const create = client.customers.createBalanceTransaction;
            client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams, options?: Stripe.RequestOptions) => {
                await create(customerId, params, options);
                throw new Error("Credit response lost");
            }) as unknown as typeof create;
            await assert.rejects(changePlan(100, "plan_b"), /Credit response lost/);
            assert.strictEqual(wallet.availableTokens, 0);
            assert.strictEqual(wallet.lockedTokens, 100);
            client.customers.createBalanceTransaction = create;

            assert.strictEqual((await apiPlanChange(100)).status, 200);
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -1000]);
            assert.deepStrictEqual(chargedTokens, [100]);
            assert.strictEqual(wallet.availableTokens, 0);
            assert.strictEqual(wallet.lockedTokens, 0);
        });

        it("blocks a fresh API reservation when the previous credit cannot be reconciled", async () => {
            wallet.availableTokens = 100;
            local.subscribableId = "plan_a";
            client.customers.createBalanceTransaction = (async () => { throw new Error("Credit uncertain"); }) as typeof client.customers.createBalanceTransaction;
            await assert.rejects(changePlan(100, "plan_b"), /Credit uncertain/);
            client.customers.listBalanceTransactions = (() => { throw new Error("Stripe unavailable"); }) as typeof client.customers.listBalanceTransactions;

            assert.deepStrictEqual(await apiPlanChange(100), { status: 500, body: { code: "PLAN_CHANGE_FAILED" } });
            assert.strictEqual(holdRequests.length, 1);
            assert.deepStrictEqual(releaseRequests, []);
            assert.deepStrictEqual(chargedTokens, []);
            assert.strictEqual(wallet.lockedTokens, 100);
        });

        it("commits an applied plan change whose response was lost without reversing or redeeming twice", async () => {
            wallet.availableTokens = 100;
            local.subscribableId = "plan_a";
            const update = client.subscriptions.update;
            client.subscriptions.update = (async (...args: Parameters<typeof update>) => {
                await update(...args);
                throw new Stripe.errors.StripeConnectionError({ type: "api_error", message: "Plan response lost" });
            }) as typeof update;
            await assert.rejects(changePlan(100, "plan_b"), /Plan response lost/);
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000]);
            assert.deepStrictEqual(releaseRequests, []);
            assert.strictEqual(wallet.lockedTokens, 100);
            client.subscriptions.update = update;

            const retry = await apiPlanChange(100);
            assert.strictEqual(retry.status, 200);
            assert.strictEqual(retry.body.status, "no_change");
            assert.strictEqual(local.subscribableId, "plan_b");
            assert.deepStrictEqual(chargedTokens, [100]);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(wallet.availableTokens, 0);
            assert.strictEqual(holdRequests.length, 1);
            assert.strictEqual(updateRequests.length, 1);
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000]);
        });

        it("does not reverse an uncertain plan update whose outcome Stripe has not confirmed", async () => {
            wallet.availableTokens = 100;
            local.subscribableId = "plan_a";
            updateError = new Stripe.errors.StripeAPIError({ type: "api_error", message: "Plan update uncertain", statusCode: 500 });
            await assert.rejects(changePlan(100, "plan_b"), /Plan update uncertain/);
            assert.strictEqual(JSON.parse(traces[0].payloadJson).payload.planChange.phase, "update_pending");
            updateError = null;

            assert.deepStrictEqual(await apiPlanChange(100), { status: 500, body: { code: "PLAN_CHANGE_FAILED" } });
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000]);
            assert.deepStrictEqual(releaseRequests, []);
            assert.deepStrictEqual(chargedTokens, []);
            assert.strictEqual(wallet.lockedTokens, 100);
            assert.strictEqual(holdRequests.length, 1);
            assert.strictEqual(updateRequests.length, 1);
        });

        it("replays an unconfirmed credit with its original key and reverses it before reserving again", async () => {
            const create = client.customers.createBalanceTransaction;
            client.customers.createBalanceTransaction = (async () => { throw new Error("Connection lost before response"); }) as typeof create;
            await assert.rejects(changePlan(100), /Connection lost before response/);
            const originalOperation = holdRequests[0][3];
            client.customers.createBalanceTransaction = create;
            await changePlan(1);

            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -10]);
            assert.strictEqual(balanceKeys[0], originalOperation);
            assert.deepStrictEqual(chargedTokens, [1]);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.strictEqual(wallet.lockedTokens, 0);
        });

        it("does not interpret authentication failure during reconciliation as rejection of the original credit", async () => {
            client.customers.createBalanceTransaction = (async () => { throw new Error("Original credit uncertain"); }) as typeof client.customers.createBalanceTransaction;
            await assert.rejects(changePlan(100), /Original credit uncertain/);
            client.customers.createBalanceTransaction = (async () => { throw new Stripe.errors.StripeAuthenticationError({ type: "authentication_error", message: "Reconciliation key rejected" }); }) as typeof client.customers.createBalanceTransaction;
            await assert.rejects(changePlan(1), /Reconciliation key rejected/);

            assert.strictEqual(wallet.lockedTokens, 100);
            assert.strictEqual(holdRequests.length, 1);
            assert.deepStrictEqual(releaseRequests, []);
        });

        it("keeps tokens locked until a failed compensation is confirmed on retry", async () => {
            const create = client.customers.createBalanceTransaction;
            updateError = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Plan update rejected" });
            client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams, options?: Stripe.RequestOptions) => {
                if (params.amount > 0) throw new Stripe.errors.StripeAuthenticationError({ type: "authentication_error", message: "Reversal rejected" });
                return create(customerId, params, options);
            }) as typeof create;
            await assert.rejects(changePlan(100), /Plan update rejected/);
            assert.strictEqual(wallet.lockedTokens, 100);
            assert.deepStrictEqual(releaseRequests, []);

            updateError = null;
            client.customers.createBalanceTransaction = create;
            await changePlan(1);

            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -10]);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.deepStrictEqual(chargedTokens, [1]);
        });

        it("does not repeat a compensation whose response was lost", async () => {
            const create = client.customers.createBalanceTransaction;
            updateError = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Plan update rejected" });
            client.customers.createBalanceTransaction = (async (customerId: string, params: Stripe.CustomerCreateBalanceTransactionParams, options?: Stripe.RequestOptions) => {
                const transaction = await create(customerId, params, options);
                if (params.amount > 0) throw new Error("Reversal response lost");
                return transaction;
            }) as typeof create;
            await assert.rejects(changePlan(100), /Plan update rejected/);
            assert.strictEqual(wallet.lockedTokens, 100);
            updateError = null;
            client.customers.createBalanceTransaction = create;
            await changePlan(1);

            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000, 1000, -10]);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(wallet.availableTokens, 199);
        });

        it("retries a pending token commit for a confirmed plan update", async () => {
            const originalBlockchainService = BlockchainService.getInstance;
            BlockchainService.getInstance = () => ({ chargeUserBalance: async () => { throw new Error("Blockchain unavailable"); } }) as unknown as BlockchainService;
            await changePlan(100);
            assert.strictEqual(wallet.lockedTokens, 100);
            assert.strictEqual(JSON.parse(traces[0].payloadJson).payload.planChange.phase, "commit_pending");
            BlockchainService.getInstance = originalBlockchainService;
            await billing.reconcilePlanChangeTokenHolds(local.id);
            await billing.reconcilePlanChangeTokenHolds(local.id);

            assert.deepStrictEqual(chargedTokens, [100]);
            assert.strictEqual(wallet.availableTokens, 100);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.deepStrictEqual(balanceRequests.map(request => request.amount), [-1000]);
        });

        it("requires reconciliation instead of replaying a credit with an expired idempotency key", async () => {
            const create = client.customers.createBalanceTransaction;
            client.customers.createBalanceTransaction = (async () => { throw new Error("Original credit uncertain"); }) as typeof create;
            await assert.rejects(changePlan(100), /Original credit uncertain/);
            const payload = JSON.parse(traces[0].payloadJson);
            payload.payload.planChange.createdAt = Date.now() - 25 * 60 * 60 * 1000;
            traces[0].payloadJson = JSON.stringify(payload);
            client.customers.createBalanceTransaction = create;
            await assert.rejects(changePlan(1), /PLAN_CHANGE_RECONCILIATION_REQUIRED/);

            assert.deepStrictEqual(balanceRequests, []);
            assert.strictEqual(holdRequests.length, 1);
            assert.strictEqual(wallet.lockedTokens, 100);
        });

        it("keeps an open reservation idempotent without locking tokens twice", async () => {
            const first = await tokens.hold("owner", 5000, 100, "open_operation");
            const retry = await tokens.hold("owner", 5000, 100, "open_operation");

            assert.deepStrictEqual(retry, first);
            assert.strictEqual(wallet.availableTokens, 100);
            assert.strictEqual(wallet.lockedTokens, 100);
            assert.strictEqual(traces.length, 1);
        });

        it("does not return discount from a committed legacy reservation", async () => {
            const operationId = "redeem:subscription:change:subscription_existing:item_plan";
            await tokens.hold("owner", 5000, 100, operationId);
            await tokens.commit(operationId, "payment_selected", "");

            assert.deepStrictEqual(await tokens.hold("owner", 5000, 1, operationId), { appliedTokens: 0, discountEurCents: 0 });
            assert.deepStrictEqual(chargedTokens, [100]);
            assert.strictEqual(wallet.availableTokens, 100);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(traces.length, 2);
        });

        it("does not return discount or lock tokens again from a released reservation", async () => {
            await tokens.hold("owner", 5000, 100, "released_operation");
            await tokens.release("released_operation");

            assert.deepStrictEqual(await tokens.hold("owner", 5000, 1, "released_operation"), { appliedTokens: 0, discountEurCents: 0 });
            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(traces.length, 2);
        });

        for (const action of [TokenTraceabilityActionKind.REDEEM_COMMIT, TokenTraceabilityActionKind.REDEEM_RELEASE]) {
            it(`does not reopen an operation with ${action} even if its hold record is missing`, async () => {
                await tokens.hold("owner", 5000, 100, "closed_operation");
                if (action === TokenTraceabilityActionKind.REDEEM_COMMIT) {
                    await tokens.commit("closed_operation", "payment_selected", "");
                } else {
                    await tokens.release("closed_operation");
                }
                traces = traces.filter(trace => trace.actionKind !== TokenTraceabilityActionKind.REDEEM_HOLD);
                const availableTokens = wallet.availableTokens;

                assert.deepStrictEqual(await tokens.hold("owner", 5000, 1, "closed_operation"), { appliedTokens: 0, discountEurCents: 0 });
                assert.strictEqual(wallet.availableTokens, availableTokens);
                assert.strictEqual(wallet.lockedTokens, 0);
                assert.strictEqual(traces.length, 1);
            });
        }

        it("does not reuse a reservation whose commit is pending confirmation", async () => {
            await tokens.hold("owner", 5000, 100, "pending_commit");
            await tokens.commit("pending_commit", "payment_selected", "");
            traces.find(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_COMMIT).status = TokenTraceabilityStatus.PENDING;

            assert.deepStrictEqual(await tokens.hold("owner", 5000, 1, "pending_commit"), { appliedTokens: 0, discountEurCents: 0 });
            assert.strictEqual(wallet.lockedTokens, 0);
        });

        for (const existing of [false, true]) {
            it(`reserves 100 then 1 tokens when replacing a ${existing ? "retried" : "new"} subscription checkout`, async () => {
                await checkout(existing, 100);
                const pending = existing ? local : createdLocals[0];
                await billing.createCheckoutForExistingSubscription(pending, 1, successUrl, cancelUrl);

                assert.deepStrictEqual(couponRequests.map(coupon => coupon.amount_off), [1000, 10]);
                assert.strictEqual(wallet.availableTokens, 199);
                assert.strictEqual(wallet.lockedTokens, 1);
                assert.strictEqual(checkoutSessions[0].status, "expired");
                assert.strictEqual(checkoutSessions[1].status, "open");
                const operations = checkoutRequests.map(session => session.metadata.token_redeem_operation_id as string);
                assert.notStrictEqual(operations[0], operations[1]);
                assert.deepStrictEqual(releaseRequests, [operations[0]]);
                assert(lifecycleEvents.indexOf("expire:cs_1") < lifecycleEvents.indexOf(`release:${operations[0]}`));
                assert(lifecycleEvents.indexOf(`release:${operations[0]}`) < lifecycleEvents.indexOf("hold:1"));
                await tokens.commit(operations[1], "payment_selected", "cs_2");
                assert.deepStrictEqual(chargedTokens, [1]);
                assert.strictEqual(wallet.lockedTokens, 0);
            });
        }

        it("releases the previous reservation when the replacement requests zero tokens", async () => {
            await checkout(true, 100);
            await checkout(true, 0);

            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(checkoutSessions[0].status, "expired");
            assert.strictEqual(checkoutRequests[1].discounts, undefined);
            assert.strictEqual(checkoutRequests[1].metadata.token_redeem_operation_id, "");
            assert.strictEqual(holdRequests.length, 1);
        });

        it("serializes concurrent replacements so that only one checkout and reservation remain open", async () => {
            await Promise.all([checkout(true, 100), checkout(true, 1)]);

            assert.deepStrictEqual(couponRequests.map(coupon => coupon.amount_off), [1000, 10]);
            assert.strictEqual(checkoutSessions.filter(session => session.status === "open").length, 1);
            assert.strictEqual(wallet.availableTokens, 199);
            assert.strictEqual(wallet.lockedTokens, 1);
        });

        it("expires all legacy sessions before releasing their shared reservation", async () => {
            const operationId = `redeem:subscription:${local.id}`;
            await tokens.hold("owner", 10000, 100, operationId);
            for (const id of ["cs_legacy_1", "cs_legacy_2"]) {
                checkoutSessions.push({
                    id, customer: "cus_selected", status: "open",
                    metadata: { kind: "subscription_checkout", local_subscription_id: local.id, token_redeem_operation_id: operationId },
                } as unknown as Stripe.Checkout.Session);
            }
            const expire = client.checkout.sessions.expire;
            client.checkout.sessions.expire = (async (id: string) => {
                const session = await expire(id);
                await expirationWebhook(session);
                assert.strictEqual(wallet.lockedTokens, 100);
                return session;
            }) as typeof client.checkout.sessions.expire;
            await checkout(true, 1);

            assert.deepStrictEqual(couponRequests.map(coupon => coupon.amount_off), [10]);
            assert.deepStrictEqual(releaseRequests, [operationId]);
            for (const id of ["cs_legacy_1", "cs_legacy_2"]) {
                assert(lifecycleEvents.indexOf(`expire:${id}`) < lifecycleEvents.indexOf(`release:${operationId}`));
            }
            assert.strictEqual(wallet.availableTokens, 199);
            assert.strictEqual(wallet.lockedTokens, 1);
        });

        it("releases tokens and cancels the subscription on an ordinary expiration webhook", async () => {
            local.stripeSubscriptionId = "";
            await checkout(true);
            checkoutSessions[0].status = "expired";
            await expirationWebhook(checkoutSessions[0]);

            assert.strictEqual(wallet.availableTokens, 200);
            assert.strictEqual(wallet.lockedTokens, 0);
            assert.strictEqual(local.status, SubscriptionStatus.CANCELLED);
        });

        it("creates a fresh reservation instead of reusing a consumed legacy reservation", async () => {
            const operationId = `redeem:subscription:${local.id}`;
            await tokens.hold("owner", 10000, 100, operationId);
            await tokens.commit(operationId, "payment_selected", "cs_previous");
            await checkout(true, 1);

            assert.deepStrictEqual(couponRequests.map(coupon => coupon.amount_off), [10]);
            assert.notStrictEqual(checkoutRequests[0].metadata.token_redeem_operation_id, operationId);
            assert.deepStrictEqual(chargedTokens, [100]);
            assert.strictEqual(wallet.availableTokens, 99);
            assert.strictEqual(wallet.lockedTokens, 1);
        });
    });
});
