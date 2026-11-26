// API tests — ITAAS custom agent requests (requester)

"use strict";

import { expect } from "chai";
import Crypto from "crypto";
import Stripe from "stripe";
import { APITester } from "../test-tools/api-tester";
import { APIAuthentication } from "../test-tools/authentication";
import { ApiItaasPlatform } from "../test-tools/api-bindings/api-group-itaas-platform";
import { ApiTokensNubem } from "../test-tools/api-bindings/api-group-tokens-nubem";
import { PreparedUser, TestUsers } from "../test-tools/models/users";
import { CustomAgentRequest, CustomAgentRequestStatus, CustomAgentRequestType } from "../../../src/models/custom-agent-request";
import { Organization } from "../../../src/models/organization";
import { OrganizationMembership, OrganizationMembershipRole, OrganizationMembershipStatus } from "../../../src/models/organization-membership";
import { CUSTOM_AGENT_ITEM_ID, CatalogItemType } from "../../../src/models/catalog-item";
import { BillingCycle, ItemPlan } from "../../../src/models/item-plan";
import { Payment, PaymentStatus, PaymentType } from "../../../src/models/payment";
import { PaymentEvent } from "../../../src/models/payment-event";
import { SubscribableType, Subscription, SubscriptionBillingCycle, SubscriptionStatus } from "../../../src/models/subscription";
import { CatalogItemService } from "../../../src/services/catalog-item-service";
import { ItaasPlatformService } from "../../../src/services/itaas-platform-service";
import { ItaasWorkspaceProvisioningService } from "../../../src/services/itaas-workspace-provisioning-service";
import { PaymentService } from "../../../src/services/payment-service";
import { SubscriptionBillingService } from "../../../src/services/subscription-billing-service";
import { SubscriptionService } from "../../../src/services/subscription-service";
import { TokenService } from "../../../src/services/token-service";
import { TokenTraceability, TokenTraceabilityActionKind, TokenTraceabilityStatus } from "../../../src/models/token-traceability";
import { TokenWallet, TokenWalletScopeType } from "../../../src/models/token-wallet";
import { createRandomUID } from "../../../src/utils/text-utils";

class ItaasGrantedPlatformService extends ItaasPlatformService {
    public async assertItaasAccess(): Promise<{ organizationId: string }> {
        return { organizationId: "" };
    }
}

const VALID_CREATE_BODY = {
    requestType: "custom",
    description: "Need a custom flow for contract review with several integrations.",
};

describe("API / ITAAS Custom Agent Requests (requester)", () => {
    let individual: PreparedUser;
    let orgAdmin: PreparedUser;
    let orgMember: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        individual = await TestUsers.NewRegularUser();
        orgAdmin = await TestUsers.NewRegularUser();
        orgMember = await TestUsers.NewRegularUser();

        await attachOrgRole(orgAdmin.uid, OrganizationMembershipRole.ADMIN);
        await attachOrgRole(orgMember.uid, OrganizationMembershipRole.MEMBER);
    });

    beforeEach(() => {
        ItaasPlatformService.setInstance(new ItaasGrantedPlatformService());
    });

    afterEach(() => {
        ItaasPlatformService.setInstance(null);
    });

    it("CreateItaasCustomAgentRequest returns 403 ORG_ADMIN_REQUIRED for a non-admin org member", async () => {
        await APITester.TestError(
            ApiItaasPlatform.CreateItaasCustomAgentRequest(VALID_CREATE_BODY),
            orgMember.auth,
            403,
            "ORG_ADMIN_REQUIRED",
        );
    });

    it("CreateItaasCustomAgentRequest returns 200 for an individual user", async () => {
        const created = await APITester.Test(
            ApiItaasPlatform.CreateItaasCustomAgentRequest(VALID_CREATE_BODY),
            individual.auth,
        );

        expect(created.status).to.equal(CustomAgentRequestStatus.PENDING_REVIEW);
        expect(created.requesterUserId).to.equal(individual.uid);
        expect(created.requesterUsername).to.equal(individual.username);
        expect(created.organizationId || "").to.equal("");
    });

    it("CreateItaasCustomAgentRequest returns 200 for an organization admin", async () => {
        const created = await APITester.Test(
            ApiItaasPlatform.CreateItaasCustomAgentRequest(VALID_CREATE_BODY),
            orgAdmin.auth,
        );

        expect(created.status).to.equal(CustomAgentRequestStatus.PENDING_REVIEW);
        expect(created.requesterUserId).to.equal(orgAdmin.uid);
        expect(created.organizationId).to.be.a("string").and.not.empty;
    });

    it("CancelItaasCustomAgentRequest returns 400 INVALID_STATUS when the request is not cancellable", async () => {
        const created = await APITester.Test(
            ApiItaasPlatform.CreateItaasCustomAgentRequest(VALID_CREATE_BODY),
            individual.auth,
        );

        const row = await CustomAgentRequest.findById(created.id);
        row.status = CustomAgentRequestStatus.IN_DEVELOPMENT;
        await row.save();

        await APITester.TestError(
            ApiItaasPlatform.CancelItaasCustomAgentRequest(created.id),
            individual.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("CheckoutItaasCustomAgentRequestDeposit returns 400 INVALID_STATUS when not pending_payment", async () => {
        const created = await APITester.Test(
            ApiItaasPlatform.CreateItaasCustomAgentRequest(VALID_CREATE_BODY),
            individual.auth,
        );

        await APITester.TestError(
            ApiItaasPlatform.CheckoutItaasCustomAgentRequestDeposit(created.id, {}),
            individual.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("CreateItaasCustomAgentRequest returns 400 PENDING_REQUEST_LIMIT_REACHED after 5 open requests", async () => {
        const cappedUser = await TestUsers.NewRegularUser();
        ItaasPlatformService.setInstance(new ItaasGrantedPlatformService());

        for (let i = 0; i < 5; i++) {
            await APITester.Test(
                ApiItaasPlatform.CreateItaasCustomAgentRequest({
                    ...VALID_CREATE_BODY,
                    description: `Need a custom flow for contract review batch ${i + 1}.`,
                }),
                cappedUser.auth,
            );
        }

        await APITester.TestError(
            ApiItaasPlatform.CreateItaasCustomAgentRequest({
                ...VALID_CREATE_BODY,
                description: "Need a custom flow for contract review batch overflow.",
            }),
            cappedUser.auth,
            400,
            "PENDING_REQUEST_LIMIT_REACHED",
        );
    });
});

async function attachOrgRole(userId: string, role: OrganizationMembershipRole): Promise<string> {
    const suffix = Crypto.randomBytes(4).toString("hex");
    const org = await Organization.create({
        companyName: "Custom Agent Test Org " + suffix,
        cifNif: "B" + suffix.toUpperCase().padEnd(8, "0"),
        country: "ES",
        fiscalAddress: "Calle Test 1",
        email: "org-" + suffix + "@test.com",
        adminUid: userId,
    });
    await OrganizationMembership.createMembership({
        userId,
        organizationId: org.id,
        organizationRole: role,
        status: OrganizationMembershipStatus.ACTIVE,
    });
    return org.id;
}

describe("API / ITAAS Custom Agent Requests (platform admin)", () => {
    let testAdmin: PreparedUser;
    let testUser: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        testAdmin = await TestUsers.NewAdministrator();
        testUser = await TestUsers.NewRegularUser();
    });

    afterEach(() => {
        ItaasPlatformService.setInstance(null);
    });

    it("AdminListItaasCustomAgentRequests returns 401 when unauthenticated", async () => {
        await APITester.TestError(
            ApiItaasPlatform.AdminListItaasCustomAgentRequests({}),
            APIAuthentication.Unauthenticated(),
            401,
        );
    });

    it("AdminListItaasCustomAgentRequests returns 403 for non-admin", async () => {
        await APITester.TestError(
            ApiItaasPlatform.AdminListItaasCustomAgentRequests({}),
            testUser.auth,
            403,
        );
    });

    it("AdminListItaasCustomAgentRequests finds by requester username", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_REVIEW);
        const result = await APITester.Test(
            ApiItaasPlatform.AdminListItaasCustomAgentRequests({ q: testUser.username }),
            testAdmin.auth,
        );
        expect(result.items.some((item: { id: string }) => item.id === request.id)).to.equal(true);
    });

    it("AdminAcceptItaasCustomAgentRequest returns 400 INVALID_STATUS when not pending_review", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminAcceptItaasCustomAgentRequest(request.id),
            testAdmin.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("AdminRejectItaasCustomAgentRequest returns 400 INVALID_STATUS when not pending_review", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminRejectItaasCustomAgentRequest(request.id, { reason: "Does not fit the current roadmap." }),
            testAdmin.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("AdminCancelItaasCustomAgentRequest returns 400 INVALID_STATUS when pending_review", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_REVIEW);
        await APITester.TestError(
            ApiItaasPlatform.AdminCancelItaasCustomAgentRequest(request.id),
            testAdmin.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("AdminCancelItaasCustomAgentRequest returns 400 INVALID_STATUS when not cancellable", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminCancelItaasCustomAgentRequest(request.id),
            testAdmin.auth,
            400,
            "INVALID_STATUS",
        );
    });
});

describe("API / ITAAS Custom Agent Requests (deposit)", () => {
    let testUser: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        testUser = await TestUsers.NewRegularUser();
    });

    afterEach(() => {
        ItaasPlatformService.setInstance(null);
    });

    it("onDepositPaid is a no-op when the request is not pending_payment", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.paymentId = "pay-deposit-noop";
        request.updatedAt = Date.now();
        await request.save();

        const accepted = await ItaasPlatformService.getInstance().onDepositPaid("pay-deposit-noop");
        expect(accepted).to.equal(false);

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
    });

    it("cancel expires the pending deposit checkout payment", async () => {
        ItaasPlatformService.setInstance(new ItaasGrantedPlatformService());

        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_cancel_expire",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.PENDING_PAYMENT;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const cancelled = await ItaasPlatformService.getInstance().cancelCustomAgentRequest(testUser.uid, request.id);
        expect(cancelled.status).to.equal(CustomAgentRequestStatus.CANCELLED);

        const reloadedPayment = await Payment.findById(payment.id);
        expect(reloadedPayment.status).to.equal(PaymentStatus.CANCELLED);
    });

    it("onDepositPaid rejects a stale paymentId after checkout was replaced", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = "pay-latest-checkout";
        request.updatedAt = Date.now();
        await request.save();

        const accepted = await ItaasPlatformService.getInstance().onDepositPaid("pay-older-checkout", request.id);
        expect(accepted).to.equal(false);

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.PENDING_PAYMENT);
        expect(reloaded.paymentId).to.equal("pay-latest-checkout");
    });

    it("onDepositPaid accepts the currently linked paymentId", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = "pay-active-checkout";
        request.updatedAt = Date.now();
        await request.save();

        const accepted = await ItaasPlatformService.getInstance().onDepositPaid("pay-active-checkout", request.id);
        expect(accepted).to.equal(true);

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.paymentId).to.equal("pay-active-checkout");
    });

    it("onDepositPaid throws REQUEST_NOT_FOUND when the request cannot be resolved", async () => {
        try {
            await ItaasPlatformService.getInstance().onDepositPaid("pay-missing", "req-missing");
            expect.fail("expected REQUEST_NOT_FOUND");
        } catch (ex) {
            expect(ex).to.be.instanceOf(Error);
            expect((ex as Error).message).to.equal("REQUEST_NOT_FOUND");
        }
    });

    it("resolveCustomAgentDepositPayment returns already_applied for the same payment after deposit", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.paymentId = "pay-already-applied";
        request.updatedAt = Date.now();
        await request.save();

        const decision = await ItaasPlatformService.getInstance().resolveCustomAgentDepositPayment(
            "pay-already-applied",
            request.id,
        );
        expect(decision).to.equal("already_applied");
    });

    it("resolveCustomAgentDepositPayment returns reject for a different payment after deposit", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.paymentId = "pay-original";
        request.updatedAt = Date.now();
        await request.save();

        const decision = await ItaasPlatformService.getInstance().resolveCustomAgentDepositPayment(
            "pay-other",
            request.id,
        );
        expect(decision).to.equal("reject");
    });

    it("handleStripeCheckoutCompleted re-applies entitlements when PaymentEvent exists but payment is not COMPLETED", async () => {
        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_retry_session",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const providerEventId = "evt_test_deposit_retry_" + createRandomUID();
        await PaymentEvent.create(payment.id, providerEventId, "checkout.session.completed");

        const event = {
            id: providerEventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_retry_session",
                    amount_total: 4200,
                    metadata: {
                        kind: "payment",
                        payment_id: payment.id,
                        request_id: request.id,
                        payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                    },
                },
            },
        } as unknown as Stripe.Event;

        await PaymentService.getInstance().handleStripeCheckoutCompleted(event);

        const reloadedPayment = await Payment.findById(payment.id);
        const reloadedRequest = await CustomAgentRequest.findById(request.id);
        expect(reloadedPayment.status).to.equal(PaymentStatus.COMPLETED);
        expect(reloadedPayment.amountCents).to.equal(4200);
        expect(reloadedRequest.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloadedRequest.paymentId).to.equal(payment.id);

        await PaymentService.getInstance().handleStripeCheckoutCompleted(event);
        const afterSecond = await CustomAgentRequest.findById(request.id);
        expect(afterSecond.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
    });

    it("handleStripeCheckoutCompleted cancels a stale custom-agent deposit checkout", async () => {
        const stalePayment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_stale_deposit",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        stalePayment.status = PaymentStatus.CONFIRMED;
        stalePayment.updatedAt = Date.now();
        await stalePayment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = "pay-newer-active-checkout";
        request.updatedAt = Date.now();
        await request.save();

        const tokenService = TokenService.getInstance();
        const originalCommit = tokenService.commit.bind(tokenService);
        const originalRestore = tokenService.restoreRedeem.bind(tokenService);
        let commitCalls = 0;
        let restoreCalls = 0;
        tokenService.commit = async (operationId: string, paymentId: string, checkoutSessionId: string) => {
            commitCalls++;
            return originalCommit(operationId, paymentId, checkoutSessionId);
        };
        tokenService.restoreRedeem = async (operationId: string, reason?: string) => {
            restoreCalls++;
            return originalRestore(operationId, reason);
        };

        const providerEventId = "evt_test_deposit_stale_" + createRandomUID();
        const event = {
            id: providerEventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_stale_deposit",
                    amount_total: 3500,
                    metadata: {
                        kind: "payment",
                        payment_id: stalePayment.id,
                        request_id: request.id,
                        payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                        token_redeem_operation_id: "redeem:custom_agent_deposit:" + stalePayment.id,
                    },
                },
            },
        } as unknown as Stripe.Event;

        try {
            await PaymentService.getInstance().handleStripeCheckoutCompleted(event);
        } finally {
            tokenService.commit = originalCommit;
            tokenService.restoreRedeem = originalRestore;
        }

        const reloadedPayment = await Payment.findById(stalePayment.id);
        const reloadedRequest = await CustomAgentRequest.findById(request.id);
        expect(reloadedPayment.status).to.equal(PaymentStatus.CANCELLED);
        expect(reloadedPayment.amountCents).to.equal(3500);
        expect(reloadedRequest.status).to.equal(CustomAgentRequestStatus.PENDING_PAYMENT);
        expect(reloadedRequest.paymentId).to.equal("pay-newer-active-checkout");
        expect(commitCalls).to.equal(0);
        expect(restoreCalls).to.equal(1);
    });

    it("handleStripeCheckoutCompleted reverts earn when a deposit becomes stale after token grant", async () => {
        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_stale_after_grant",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const walletBefore = (await TokenWallet.findByScope(TokenWalletScopeType.USER, testUser.uid))?.availableTokens || 0;
        const platform = ItaasPlatformService.getInstance();
        const originalOnDepositPaid = platform.onDepositPaid.bind(platform);
        const tokenService = TokenService.getInstance();
        const originalRevert = tokenService.revertFromRefund.bind(tokenService);
        let revertCalls = 0;
        platform.onDepositPaid = async (paymentId: string, requestId?: string) => {
            const current = await CustomAgentRequest.findById(request.id);
            current.paymentId = "pay-replaced-after-grant";
            current.updatedAt = Date.now();
            await current.save();
            return originalOnDepositPaid(paymentId, requestId);
        };
        tokenService.revertFromRefund = async (
            refundPayment: Payment,
            refundAmountCents: number,
            actorUid: string,
            operationId?: string,
        ) => {
            revertCalls++;
            return originalRevert(refundPayment, refundAmountCents, actorUid, operationId);
        };

        const providerEventId = "evt_test_deposit_stale_after_grant_" + createRandomUID();
        const event = {
            id: providerEventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_stale_after_grant",
                    amount_total: 5000,
                    metadata: {
                        kind: "payment",
                        payment_id: payment.id,
                        request_id: request.id,
                        payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                    },
                },
            },
        } as unknown as Stripe.Event;

        try {
            await PaymentService.getInstance().handleStripeCheckoutCompleted(event);
        } finally {
            platform.onDepositPaid = originalOnDepositPaid;
            tokenService.revertFromRefund = originalRevert;
        }

        const reloadedPayment = await Payment.findById(payment.id);
        const reloadedRequest = await CustomAgentRequest.findById(request.id);
        const walletAfter = (await TokenWallet.findByScope(TokenWalletScopeType.USER, testUser.uid))?.availableTokens || 0;
        expect(reloadedPayment.status).to.equal(PaymentStatus.CANCELLED);
        expect(reloadedRequest.status).to.equal(CustomAgentRequestStatus.PENDING_PAYMENT);
        expect(reloadedRequest.paymentId).to.equal("pay-replaced-after-grant");
        expect(revertCalls).to.equal(1);
        expect(walletAfter).to.equal(walletBefore);
    });

    it("handleStripeCheckoutCompleted does not refund the same deposit already applied", async () => {
        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_already_applied",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const providerEventId = "evt_test_deposit_already_applied_" + createRandomUID();
        const event = {
            id: providerEventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_already_applied",
                    metadata: {
                        kind: "payment",
                        payment_id: payment.id,
                        request_id: request.id,
                        payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                    },
                },
            },
        } as unknown as Stripe.Event;

        await PaymentService.getInstance().handleStripeCheckoutCompleted(event);

        const reloadedPayment = await Payment.findById(payment.id);
        const reloadedRequest = await CustomAgentRequest.findById(request.id);
        expect(reloadedPayment.status).to.equal(PaymentStatus.COMPLETED);
        expect(reloadedRequest.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloadedRequest.paymentId).to.equal(payment.id);
    });

    it("handleStripeCheckoutCompleted keeps the request payable when token grant fails", async () => {
        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_token_grant_fail",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const tokenService = TokenService.getInstance();
        const originalGrant = tokenService.grantFromPayment;
        tokenService.grantFromPayment = async () => {
            throw new Error("TOKEN_GRANT_FAILED");
        };

        const providerEventId = "evt_test_deposit_token_fail_" + createRandomUID();
        const event = {
            id: providerEventId,
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_token_grant_fail",
                    metadata: {
                        kind: "payment",
                        payment_id: payment.id,
                        request_id: request.id,
                        payment_type: PaymentType.CUSTOM_AGENT_DEPOSIT,
                    },
                },
            },
        } as unknown as Stripe.Event;

        try {
            await PaymentService.getInstance().handleStripeCheckoutCompleted(event);
            expect.fail("expected TOKEN_GRANT_FAILED");
        } catch (ex) {
            expect(ex).to.be.instanceOf(Error);
            expect((ex as Error).message).to.equal("TOKEN_GRANT_FAILED");
        } finally {
            tokenService.grantFromPayment = originalGrant;
        }

        const reloadedPayment = await Payment.findById(payment.id);
        const reloadedRequest = await CustomAgentRequest.findById(request.id);
        expect(reloadedPayment.status).to.equal(PaymentStatus.CONFIRMED);
        expect(reloadedRequest.status).to.equal(CustomAgentRequestStatus.PENDING_PAYMENT);
        expect(reloadedRequest.paymentId).to.equal(payment.id);
    });

    it("grantFromPayment credits the organization wallet for a custom-agent deposit", async () => {
        const orgId = await attachOrgRole(testUser.uid, OrganizationMembershipRole.ADMIN);
        const payment = await Payment.create(
            testUser.uid,
            PaymentType.CUSTOM_AGENT_DEPOSIT,
            "stripe",
            "cs_test_org_deposit_earn",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.COMPLETE,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT, orgId);
        request.paymentId = payment.id;
        request.updatedAt = Date.now();
        await request.save();

        const personalBefore = (await TokenWallet.findByScope(TokenWalletScopeType.USER, testUser.uid))?.availableTokens || 0;
        const orgBefore = (await TokenWallet.findByScope(TokenWalletScopeType.ORGANIZATION, orgId))?.availableTokens || 0;

        await TokenService.getInstance().grantFromPayment(payment);

        const personalAfter = (await TokenWallet.findByScope(TokenWalletScopeType.USER, testUser.uid))?.availableTokens || 0;
        const orgAfter = (await TokenWallet.findByScope(TokenWalletScopeType.ORGANIZATION, orgId))?.availableTokens || 0;
        expect(orgAfter).to.be.greaterThan(orgBefore);
        expect(personalAfter).to.equal(personalBefore);
    });

    it("grantFromPayment skips a create invoice that already earned under earn:subscription", async () => {
        const stripeSubscriptionId = "sub_legacy_earn_" + createRandomUID();
        const subscription = await Subscription.createSubscription({
            uid: testUser.uid,
            subscribableType: SubscribableType.ITEM,
            subscribableId: CUSTOM_AGENT_ITEM_ID,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId,
        });

        const payment = await Payment.create(
            testUser.uid,
            PaymentType.SUBSCRIPTION_CREATE,
            "stripe",
            "cs_test_legacy_earn",
            "",
            5000,
            "eur",
            SubscribableType.ITEM,
            CUSTOM_AGENT_ITEM_ID,
            SubscriptionBillingCycle.MONTHLY,
            CatalogItemType.CUSTOM_AGENT_SERVICE,
        );
        payment.subscriptionId = subscription.id;
        payment.status = PaymentStatus.CONFIRMED;
        payment.updatedAt = Date.now();
        await payment.save();

        const wallet = await TokenWallet.getOrCreate(TokenWalletScopeType.USER, testUser.uid);
        await TokenTraceability.create({
            operationId: `earn:subscription:${stripeSubscriptionId}`,
            actionKind: TokenTraceabilityActionKind.EARN,
            walletId: wallet.id,
            scopeType: TokenWalletScopeType.USER,
            scopeId: testUser.uid,
            actorUid: testUser.uid,
            paymentId: stripeSubscriptionId,
            checkoutSessionId: payment.providerSessionId || "",
            amountTokens: 2,
            amountEurCents: 200,
            payloadHash: "",
            chainName: "",
            txHash: "",
            status: TokenTraceabilityStatus.SENT,
            retries: 0,
            errorMessage: "",
            payloadJson: "{}",
        });

        const originalCreate = TokenTraceability.create;
        let newEarnLocks = 0;
        TokenTraceability.create = async function (input) {
            if (input.operationId === `earn:${payment.id}`) {
                newEarnLocks++;
            }
            return originalCreate.call(TokenTraceability, input);
        };

        try {
            await TokenService.getInstance().grantFromPayment(payment);
        } finally {
            TokenTraceability.create = originalCreate;
        }

        expect(newEarnLocks).to.equal(0);
        const migratedEarn = await TokenTraceability.findByOperationAction(
            `earn:${payment.id}`,
            TokenTraceabilityActionKind.EARN,
        );
        expect(migratedEarn).to.have.length(0);
    });

    it("PostNubemTokenRedeemQuote uses the organization wallet for an org admin", async () => {
        const orgAdmin = await TestUsers.NewRegularUser();
        const orgId = await attachOrgRole(orgAdmin.uid, OrganizationMembershipRole.ADMIN);

        const orgWallet = await TokenWallet.getOrCreate(TokenWalletScopeType.ORGANIZATION, orgId);
        orgWallet.availableTokens = 40;
        orgWallet.updatedAt = Date.now();
        await orgWallet.save();

        const personalWallet = await TokenWallet.getOrCreate(TokenWalletScopeType.USER, orgAdmin.uid);
        personalWallet.availableTokens = 5;
        personalWallet.updatedAt = Date.now();
        await personalWallet.save();

        const quote = await APITester.Test(
            ApiTokensNubem.PostNubemTokenRedeemQuote({
                amount_eur_cents: 5000,
                requested_tokens: 10,
            }),
            orgAdmin.auth,
        );

        expect(quote.availableTokens).to.equal(40);
        expect(quote.appliedTokens).to.equal(10);
    });
});

describe("API / ITAAS Custom Agent Requests (deliver)", () => {
    let testAdmin: PreparedUser;
    let testUser: PreparedUser;
    let capturedSubject: { subjectType: string; subjectId: string; flowId: string } | null;

    before(async () => {
        await APITester.Initialize();
        testAdmin = await TestUsers.NewAdministrator();
        testUser = await TestUsers.NewRegularUser();
        await CatalogItemService.getInstance().ensureCustomAgentServiceItem();
    });

    beforeEach(() => {
        capturedSubject = null;
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                capturedSubject = { subjectType: subject.subjectType, subjectId: subject.subjectId, flowId };
                return { action: "provision", reason: "flow_assigned", subject };
            },
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                return { action: "provision", reason: "flow_removed", subject, result: { skipped: false, tenant: { flowIds: [] } } };
            },
            syncWorkspaceForSubscription: async () => {
                return { action: "skip", reason: "test" };
            },
        } as unknown as ItaasWorkspaceProvisioningService);
    });

    afterEach(() => {
        ItaasPlatformService.setInstance(null);
        ItaasWorkspaceProvisioningService.setInstance(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 INVALID_FLOW_ID when flowId is empty", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "" }),
            testAdmin.auth,
            400,
            "INVALID_FLOW_ID",
        );
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 INVALID_STATUS when not in_development", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.PENDING_PAYMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-custom-1" }),
            testAdmin.auth,
            400,
            "INVALID_STATUS",
        );
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 FLOW_IS_GLOBAL for a global flow", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("FLOW_IS_GLOBAL");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "global-flow-1" }),
            testAdmin.auth,
            400,
            "FLOW_IS_GLOBAL",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 INVALID_FLOW_ID when flow is unknown", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("INVALID_FLOW_ID");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "missing-flow-id" }),
            testAdmin.auth,
            400,
            "INVALID_FLOW_ID",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 FLOW_ALREADY_ASSIGNED when flow is already assigned", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("FLOW_ALREADY_ASSIGNED");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-already-taken" }),
            testAdmin.auth,
            400,
            "FLOW_ALREADY_ASSIGNED",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest assigns the personal workspace and starts a monthly subscription", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        const delivered = await APITester.Test(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-user-1" }),
            testAdmin.auth,
        );

        expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(delivered.deliveredFlowiseFlowId).to.equal("flow-user-1");
        expect(delivered.monthlySubscriptionId).to.be.a("string").and.not.empty;
        expect(capturedSubject).to.deep.equal({
            subjectType: "user",
            subjectId: testUser.uid,
            flowId: "flow-user-1",
        });
    });

    it("AdminDeliverItaasCustomAgentRequest assigns the organization workspace", async () => {
        const organizationId = await attachOrgRole(testUser.uid, OrganizationMembershipRole.ADMIN);
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT, organizationId);
        const delivered = await APITester.Test(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-org-1" }),
            testAdmin.auth,
        );

        expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(delivered.organizationId).to.equal(organizationId);
        expect(capturedSubject).to.deep.equal({
            subjectType: "organization",
            subjectId: organizationId,
            flowId: "flow-org-1",
        });
    });

    it("AdminDeliverItaasCustomAgentRequest revokes the flow when billing fails for a missing payment method", async () => {
        const billing = SubscriptionBillingService.getInstance();
        const originalCreate = billing.createCustomAgentMonthlySubscription.bind(billing);
        billing.createCustomAgentMonthlySubscription = async () => {
            throw new Error("PAYMENT_METHOD_REQUIRED");
        };

        const revoked: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                capturedSubject = { subjectType: subject.subjectType, subjectId: subject.subjectId, flowId };
                return { action: "provision", reason: "flow_assigned", subject };
            },
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                revoked.push({ subjectType: subject.subjectType, subjectId: subject.subjectId, flowId });
                return { action: "provision", reason: "flow_removed", subject };
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        try {
            await APITester.TestError(
                ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-no-card" }),
                testAdmin.auth,
                422,
                "PAYMENT_METHOD_REQUIRED",
            );
        } finally {
            billing.createCustomAgentMonthlySubscription = originalCreate;
        }

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.deep.equal({
            subjectType: "user",
            subjectId: testUser.uid,
            flowId: "flow-no-card",
        });
        expect(revoked).to.deep.equal([{
            subjectType: "user",
            subjectId: testUser.uid,
            flowId: "flow-no-card",
        }]);
    });

    it("AdminDeliverItaasCustomAgentRequest keeps the delivered flow id when revoke fails after billing failure", async () => {
        const billing = SubscriptionBillingService.getInstance();
        const originalCreate = billing.createCustomAgentMonthlySubscription.bind(billing);
        billing.createCustomAgentMonthlySubscription = async () => {
            throw new Error("PAYMENT_METHOD_REQUIRED");
        };

        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                capturedSubject = { subjectType: subject.subjectType, subjectId: subject.subjectId, flowId };
                return { action: "provision", reason: "flow_assigned", subject };
            },
            removeFlowFromSubject: async () => {
                return { action: "provision", reason: "error", subject: { subjectType: "user", subjectId: testUser.uid } };
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        try {
            await APITester.TestError(
                ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-keep-id" }),
                testAdmin.auth,
                422,
                "PAYMENT_METHOD_REQUIRED",
            );
        } finally {
            billing.createCustomAgentMonthlySubscription = originalCreate;
        }

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId).to.equal("flow-keep-id");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
    });

    it("AdminDeliverItaasCustomAgentRequest does not start a monthly subscription when exclusive assign fails", async () => {
        let billingCalls = 0;
        const billing = SubscriptionBillingService.getInstance();
        const originalCreate = billing.createCustomAgentMonthlySubscription.bind(billing);
        billing.createCustomAgentMonthlySubscription = async (...args: Parameters<typeof originalCreate>) => {
            billingCalls += 1;
            return originalCreate(...args);
        };

        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("FLOW_ALREADY_ASSIGNED");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        try {
            await APITester.TestError(
                ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-taken-at-assign" }),
                testAdmin.auth,
                400,
                "FLOW_ALREADY_ASSIGNED",
            );
        } finally {
            billing.createCustomAgentMonthlySubscription = originalCreate;
        }

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(billingCalls).to.equal(0);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
    });

    it("AdminDeliverItaasCustomAgentRequest serializes concurrent delivers of the same request", async () => {
        let billingCalls = 0;
        const assignedFlows: string[] = [];
        const billing = SubscriptionBillingService.getInstance();
        const originalCreate = billing.createCustomAgentMonthlySubscription.bind(billing);
        billing.createCustomAgentMonthlySubscription = async (...args: Parameters<typeof originalCreate>) => {
            billingCalls += 1;
            return originalCreate(...args);
        };

        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                assignedFlows.push(flowId);
                await new Promise((resolve) => setTimeout(resolve, 40));
                capturedSubject = { subjectType: subject.subjectType, subjectId: subject.subjectId, flowId };
                return { action: "provision", reason: "flow_assigned", subject };
            },
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }) => {
                return { action: "provision", reason: "flow_removed", subject };
            },
            syncWorkspaceForSubscription: async () => {
                return { action: "skip", reason: "test" };
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        try {
            const [first, second] = await Promise.allSettled([
                APITester.Test(
                    ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-concurrent-a" }),
                    testAdmin.auth,
                ),
                APITester.Test(
                    ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-concurrent-b" }),
                    testAdmin.auth,
                ),
            ]);

            const fulfilled = [first, second].filter((row) => row.status === "fulfilled");
            const rejected = [first, second].filter((row) => row.status === "rejected");
            expect(fulfilled).to.have.length(1);
            expect(rejected).to.have.length(1);
            expect(assignedFlows).to.have.length(1);
            expect(billingCalls).to.equal(1);

            const delivered = (fulfilled[0] as PromiseFulfilledResult<{
                status: string;
                deliveredFlowiseFlowId: string;
                monthlySubscriptionId: string;
            }>).value;
            expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
            expect(delivered.deliveredFlowiseFlowId).to.equal(assignedFlows[0]);
            expect(delivered.monthlySubscriptionId).to.be.a("string").and.not.empty;
        } finally {
            billing.createCustomAgentMonthlySubscription = originalCreate;
        }

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(reloaded.deliveredFlowiseFlowId).to.equal(assignedFlows[0]);
    });

    it("AdminDeliverItaasCustomAgentRequest completes delivery when the flow was already assigned", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.deliveredFlowiseFlowId = "flow-partial";
        request.updatedAt = Date.now();
        await request.save();

        const delivered = await APITester.Test(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-partial" }),
            testAdmin.auth,
        );

        expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(delivered.deliveredFlowiseFlowId).to.equal("flow-partial");
        expect(delivered.monthlySubscriptionId).to.be.a("string").and.not.empty;
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 400 FLOW_ALREADY_DELIVERED when retrying with a different flow after partial assign", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.deliveredFlowiseFlowId = "flow-partial";
        request.updatedAt = Date.now();
        await request.save();

        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-other" }),
            testAdmin.auth,
            400,
            "FLOW_ALREADY_DELIVERED",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId).to.equal("flow-partial");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 503 BFF_UNAVAILABLE when the BFF is down", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("BFF_UNAVAILABLE");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-bff-down" }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 503 BFF_UNAVAILABLE on a BFF network error", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                throw new Error("BFF_PROVISIONING_NETWORK_ERROR");
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-bff-network" }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
        expect(reloaded.monthlySubscriptionId || "").to.equal("");
        expect(capturedSubject).to.equal(null);
    });

    it("AdminDeliverItaasCustomAgentRequest returns 503 BFF_UNAVAILABLE when exclusive assign is skipped", async () => {
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async () => {
                return { action: "provision", reason: "skipped" };
            },
            removeFlowFromSubject: async () => {
                throw new Error("should not revoke when assign never happened");
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        await APITester.TestError(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-bff-skip" }),
            testAdmin.auth,
            503,
            "BFF_UNAVAILABLE",
        );

        const reloaded = await CustomAgentRequest.findById(request.id);
        expect(reloaded.status).to.equal(CustomAgentRequestStatus.IN_DEVELOPMENT);
        expect(reloaded.deliveredFlowiseFlowId || "").to.equal("");
    });

    it("AdminDeliverItaasCustomAgentRequest retries flow assignment when the monthly subscription already exists", async () => {
        let assignCalls = 0;
        ItaasWorkspaceProvisioningService.setInstance({
            assignExclusiveCatalogFlowToSubject: async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
                assignCalls += 1;
                capturedSubject = { subjectType: subject.subjectType, subjectId: subject.subjectId, flowId };
                return { action: "provision", reason: "flow_assigned", subject };
            },
            removeFlowFromSubject: async (subject: { subjectType: string; subjectId: string }) => {
                return { action: "provision", reason: "flow_removed", subject };
            },
            syncWorkspaceForSubscription: async () => {
                return { action: "skip", reason: "test" };
            },
        } as unknown as ItaasWorkspaceProvisioningService);

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.monthlySubscriptionId = "sub-already-persisted";
        request.updatedAt = Date.now();
        await request.save();

        const delivered = await APITester.Test(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-retry-1" }),
            testAdmin.auth,
        );

        expect(assignCalls).to.equal(1);
        expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(delivered.deliveredFlowiseFlowId).to.equal("flow-retry-1");
        expect(delivered.monthlySubscriptionId).to.equal("sub-already-persisted");
        expect(capturedSubject).to.deep.equal({
            subjectType: "user",
            subjectId: testUser.uid,
            flowId: "flow-retry-1",
        });
    });

    it("AdminDeliverItaasCustomAgentRequest reuses a persisted monthlySubscriptionId on retry", async () => {
        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.IN_DEVELOPMENT);
        request.deliveredFlowiseFlowId = "flow-sub-ready";
        request.monthlySubscriptionId = "sub-already-persisted";
        request.updatedAt = Date.now();
        await request.save();

        const delivered = await APITester.Test(
            ApiItaasPlatform.AdminDeliverItaasCustomAgentRequest(request.id, { flowId: "flow-sub-ready" }),
            testAdmin.auth,
        );

        expect(delivered.status).to.equal(CustomAgentRequestStatus.DELIVERED);
        expect(delivered.monthlySubscriptionId).to.equal("sub-already-persisted");
    });

    it("syncWorkspaceForSubscription removes the delivered custom-agent flow when monthly fee is cancelled", async () => {
        const removeCalls: Array<{ subjectType: string; subjectId: string; flowId: string }> = [];
        ItaasWorkspaceProvisioningService.setInstance(null);
        const real = ItaasWorkspaceProvisioningService.getInstance();
        const originalRemove = real.removeFlowFromSubject.bind(real);
        const originalAssign = real.assignFlowToSubject.bind(real);
        const originalSubjectEntitlement = real.subjectHasItaasEntitlement.bind(real);

        real.removeFlowFromSubject = (async (subject: { subjectType: string; subjectId: string }, flowId: string) => {
            removeCalls.push({ subjectType: subject.subjectType, subjectId: subject.subjectId, flowId });
            return { action: "provision", reason: "flow_removed", subject };
        }) as typeof real.removeFlowFromSubject;
        real.assignFlowToSubject = (async () => {
            throw new Error("assign should not run for cancelled monthly");
        }) as typeof real.assignFlowToSubject;
        real.subjectHasItaasEntitlement = (async () => true) as typeof real.subjectHasItaasEntitlement;
        (real as any).ensureProvisioned = async () => ({ action: "provision", reason: "ok" });

        const monthly = await ItemPlan.findByItemAndCycle(CUSTOM_AGENT_ITEM_ID, BillingCycle.MONTHLY);
        const subscription = await Subscription.createSubscription({
            uid: testUser.uid,
            subscribableType: SubscribableType.ITEM,
            subscribableId: monthly.id,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            status: SubscriptionStatus.CANCELLED,
        });

        const request = await seedRequest(testUser.uid, CustomAgentRequestStatus.DELIVERED);
        request.deliveredFlowiseFlowId = "flow-revoke-1";
        request.monthlySubscriptionId = subscription.id;
        request.updatedAt = Date.now();
        await request.save();

        try {
            await real.syncWorkspaceForSubscription(subscription);
            expect(removeCalls).to.deep.equal([{
                subjectType: "user",
                subjectId: testUser.uid,
                flowId: "flow-revoke-1",
            }]);
        } finally {
            real.removeFlowFromSubject = originalRemove;
            real.assignFlowToSubject = originalAssign;
            real.subjectHasItaasEntitlement = originalSubjectEntitlement;
        }
    });
});

describe("Custom Agent monthly uniqueness", () => {
    let testUser: PreparedUser;

    before(async () => {
        await APITester.Initialize();
        testUser = await TestUsers.NewRegularUser();
        await CatalogItemService.getInstance().ensureCustomAgentServiceItem();
    });

    beforeEach(() => {
        ItaasWorkspaceProvisioningService.setInstance({
            syncWorkspaceForSubscription: async () => {
                return { action: "skip", reason: "test" };
            },
        } as unknown as ItaasWorkspaceProvisioningService);
    });

    afterEach(() => {
        ItaasWorkspaceProvisioningService.setInstance(null);
    });

    it("keeps two custom-agent monthly subscriptions active and eligible", async () => {
        const monthly = await ItemPlan.findByItemAndCycle(CUSTOM_AGENT_ITEM_ID, BillingCycle.MONTHLY);
        expect(monthly).to.exist;

        const first = await Subscription.createSubscription({
            uid: testUser.uid,
            subscribableType: SubscribableType.ITEM,
            subscribableId: monthly.id,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
        });
        const second = await Subscription.createSubscription({
            uid: testUser.uid,
            subscribableType: SubscribableType.ITEM,
            subscribableId: monthly.id,
            billingCycle: SubscriptionBillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
        });

        await SubscriptionService.getInstance().activateSubscription(
            testUser.uid,
            SubscribableType.ITEM,
            monthly.id,
            SubscriptionBillingCycle.MONTHLY,
            createRandomUID(),
            first.id,
        );

        const reloadedFirst = await Subscription.findById(first.id);
        const reloadedSecond = await Subscription.findById(second.id);
        expect(reloadedFirst.status).to.equal(SubscriptionStatus.ACTIVE);
        expect(reloadedSecond.status).to.equal(SubscriptionStatus.ACTIVE);

        const eligibility = await SubscriptionService.getInstance().validateSubscriptionEligibility(
            testUser.uid,
            SubscribableType.ITEM,
            monthly.id,
        );
        expect(eligibility.eligible).to.equal(true);
    });
});

async function seedRequest(requesterUserId: string, status: CustomAgentRequestStatus, organizationId?: string): Promise<CustomAgentRequest> {
    return CustomAgentRequest.createRequest({
        requestType: CustomAgentRequestType.CUSTOM,
        description: "Need a custom flow for platform admin status tests.",
        requesterUserId,
        organizationId,
        status,
    });
}
