// Reserved for license

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { ensureObjectBody, sendApiError, sendApiResult, sendUnauthorized, BAD_REQUEST, NOT_FOUND, noCache, INTERNAL_SERVER_ERROR, sendApiSuccess, FORBIDDEN } from "../../utils/http-utils";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { Payment } from "../../models/payment";
import {
    SubscribableType,
    Subscription,
    SubscriptionAdminListFilters,
    SubscriptionCategoryFilter,
    SubscriptionDisplayStatusFilter,
    SubscriptionStatus,
    SubscriptionUserListFilters,
} from "../../models/subscription";
import { parsePageParameters } from "../../utils/api-utils";
import { SubscriptionService } from "../../services/subscription-service";
import { ItemPlan } from "../../models/item-plan";
import { PlanPricing } from "../../models/plan-pricing";
import { SubscriptionBillingService } from "../../services/subscription-billing-service";
import { TokenService } from "../../services/token-service";
import { TraceabilityService } from "../../services/traceability-service";
import { Monitor } from "../../monitor";
import { OrganizationService } from "../../services/organization-service";

const SUBSCRIPTIONS_PAGE_LIMIT = 25;
const SUBSCRIPTIONS_ADMIN_PAYMENTS_LIMIT = 50;

const SUBSCRIPTION_CATEGORY_FILTERS: SubscriptionCategoryFilter[] = ["plan", "service", "product"];
const SUBSCRIPTION_DISPLAY_STATUS_FILTERS: SubscriptionDisplayStatusFilter[] = ["active", "pending", "cancelled"];

/**
 * Subscriptions API
 * @group subscriptions
 */
export class SubscriptionsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {

        application.get(prefix + "/subscriptions/status", noCache(this.getStatus.bind(this)));
        application.get(prefix + "/subscriptions/notices", noCache(this.getNotices.bind(this)));
        application.get(prefix + "/subscriptions/allowance", noCache(this.getAllowance.bind(this)));
        application.get(prefix + "/subscriptions/admin", noCache(this.listAdminSubscriptions.bind(this)));
        application.get(prefix + "/subscriptions/admin/:subscriptionId", noCache(this.getAdminSubscriptionDetail.bind(this)));
        application.get(prefix + "/subscriptions/admin/user/:uid", noCache(this.listAdminUserSubscriptions.bind(this)));

        application.post(prefix + "/subscriptions/create", ensureObjectBody(this.createSubscription.bind(this)));
        application.post(prefix + "/subscriptions/renew", ensureObjectBody(this.renewSubscription.bind(this)));
        application.post(prefix + "/subscriptions/change-plan", ensureObjectBody(this.changePlan.bind(this)));
        application.post(prefix + "/subscriptions/cancel", ensureObjectBody(this.cancelSubscription.bind(this)));
        application.post(prefix + "/subscriptions/admin/suspend", ensureObjectBody(this.suspendSubscription.bind(this)));
        application.post(prefix + "/subscriptions/admin/reactivate", ensureObjectBody(this.reactivateSubscriptionAdmin.bind(this)));
        application.post(prefix + "/subscriptions/admin/refund", ensureObjectBody(this.refundSubscriptionAdmin.bind(this)));
        application.post(prefix + "/subscriptions/preview-change", ensureObjectBody(this.previewChange.bind(this)));
        application.post(prefix + "/subscriptions/preview-cancel", ensureObjectBody(this.previewCancel.bind(this)));
        application.post(prefix + "/subscriptions/preview-create", ensureObjectBody(this.previewCreate.bind(this)));
        application.post(prefix + "/subscriptions/complete-pending", ensureObjectBody(this.completePending.bind(this)));
    }

    /**
     * @typedef SubscriptionCreateBody
     * @property {string} subscribable_type.required - Subscribable type (item or plan)
     * @property {string} subscribable_id.required - Subscribable identifier (ItemPlan or PlanPricing id)
     * @property {number} redeem_tokens - Number of tokens to apply as a discount (optional, default 0)
     * @property {string} success_url - URL to redirect the user after a successful payment (optional)
     * @property {string} cancel_url - URL to redirect the user after cancelling the payment (optional)
     * @property {number} quantity - Number of seats for organization digital product subscriptions (optional, default 1)
     */

    /**
     * @typedef SubscriptionCheckoutResponse
     * @property {string} subscription_id.required - Subscription id
     * @property {string} stripe_subscription_id - Stripe subscription id
     * @property {string} subscribable_type.required - Subscribable type
     * @property {string} subscribable_id.required - Subscribable id
     * @property {string} billing_cycle.required - Billing cycle
     * @property {string} status.required - Subscription status
     * @property {string} checkout_url - Stripe checkout URL
     */

    /**
     * Create subscription
     * Binding: CreateSubscription
     * @route POST /subscriptions/create
     * @group subscriptions
     * @param {SubscriptionCreateBody.model} request.body - Request body
     * @returns {SubscriptionCheckoutResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIBABLE_TYPE, INVALID_SUBSCRIBABLE_ID, INVALID_QUANTITY, ALREADY_FULL_ACCESS, ALREADY_SUBSCRIBED, ALREADY_SUBSCRIBED_TO_ITEM, ALREADY_SUBSCRIBED_TO_PLAN, ITEM_COVERED_BY_ACTIVE_PLAN, PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM, ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN, INSUFFICIENT_TOKEN_BALANCE, TOKENS_EXCEED_LIMIT
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: ORG_MEMBER_CANNOT_PURCHASE
     * @security AuthToken
     */
    public async createSubscription(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subscribableType = ((request.body.subscribable_type || "") + "").trim() as SubscribableType;
        const subscribableId = ((request.body.subscribable_id || "") + "").trim();
        const redeemTokens = Math.max(0, Math.floor(Number(request.body.redeem_tokens) || 0));
        const successUrl = ((request.body.success_url || "") + "").trim() || undefined;
        const cancelUrl = ((request.body.cancel_url || "") + "").trim() || undefined;
        const requestedQuantity = Math.max(1, Math.floor(Number(request.body.quantity) || 1));
        if (!subscribableType || !Object.values(SubscribableType).includes(subscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_TYPE", "subscribable_type must be 'item' or 'plan'");
            return;
        }
        if (!subscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "subscribable_id is required");
            return;
        }

        const billingContext = await OrganizationService.getInstance().resolveBillingOrganizationContext(auth.user.id);
        if (!billingContext) {
            sendApiError(request, response, FORBIDDEN, "ORG_MEMBER_CANNOT_PURCHASE", "Only organization admins can purchase or change subscriptions");
            return;
        }
        const orgId = billingContext.organizationId || undefined;

        const activeForSubscribable = await Subscription.findActiveByUserAndSubscribable(auth.user.id, subscribableType, subscribableId);
        const normalizedActive = Array.isArray(activeForSubscribable) ? activeForSubscribable : [];
        const hasFullAccess = normalizedActive.some(s => (s.billingCycle || "") === "complete");
        if (hasFullAccess) {
            sendApiError(request, response, BAD_REQUEST, "ALREADY_FULL_ACCESS", "This subscribable already has full access");
            return;
        }

        if (subscribableType === SubscribableType.PLAN) {
            const planPricing = await PlanPricing.findById(subscribableId);
            if (!planPricing) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "Plan pricing not found");
                return;
            }
        } else {
            const plan = await ItemPlan.findById(subscribableId);
            if (!plan) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "Item plan not found");
                return;
            }
            if (requestedQuantity > 1 && await SubscriptionBillingService.getInstance().isRecurringServiceItem(subscribableType, subscribableId)) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_QUANTITY", "Recurring services do not support quantity other than 1");
                return;
            }
        }

        const eligibility = await SubscriptionService.getInstance().validateSubscriptionEligibility(auth.user.id, subscribableType, subscribableId, orgId);
        if (!eligibility.eligible) {
            if (eligibility.reason === "ALREADY_SUBSCRIBED_TO_ITEM" || eligibility.reason === "ALREADY_SUBSCRIBED_TO_PLAN") {
                const pendingSubs = await Subscription.findPendingByUserAndSubscribable(auth.user.id, subscribableId);
                if (pendingSubs.length > 0) {
                    const pending = pendingSubs[0];
                    const pendingOrgId = pending.organizationId || undefined;
                    if (pendingOrgId && !await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, pendingOrgId)) {
                        sendApiError(request, response, FORBIDDEN, "", "Access denied");
                        return;
                    }
                    if (redeemTokens > 0) {
                        const billingService = SubscriptionBillingService.getInstance();
                        const { totalPriceCents } = await billingService.resolveCheckoutTotalCents(
                            pending.subscribableType,
                            pending.subscribableId,
                            pendingOrgId,
                            pending.quantity || 1,
                            pending.quantity || 1,
                        );
                        const tokenQuote = await TokenService.getInstance().quote(auth.user.id, totalPriceCents, redeemTokens, pendingOrgId);
                        if (redeemTokens > tokenQuote.availableTokens) {
                            sendApiError(request, response, BAD_REQUEST, "INSUFFICIENT_TOKEN_BALANCE", "Not enough tokens in your wallet");
                            return;
                        }
                        if (redeemTokens > tokenQuote.maxApplicableTokens) {
                            sendApiError(request, response, BAD_REQUEST, "TOKENS_EXCEED_LIMIT", `You can apply at most ${tokenQuote.maxApplicableTokens} tokens to this purchase`);
                            return;
                        }
                    }
                    try {
                        const pendingOptions = pendingOrgId ? { organizationId: pendingOrgId, quantity: pending.quantity || 1 } : undefined;
                        const checkoutUrl = await SubscriptionBillingService.getInstance().createCheckoutForExistingSubscription(pending, redeemTokens, successUrl, cancelUrl, pendingOptions);
                        sendApiResult(request, response, {
                            subscription_id: pending.id,
                            stripe_subscription_id: pending.stripeSubscriptionId || "",
                            subscribable_type: pending.subscribableType,
                            subscribable_id: pending.subscribableId,
                            billing_cycle: pending.billingCycle,
                            status: pending.status,
                            checkout_url: checkoutUrl,
                        });
                        return;
                    } catch (ex) {
                        Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
                        // A failed replacement may leave the previous checkout payable.
                    }
                }
            } else if (eligibility.reason === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                return;
            }
            sendApiError(request, response, BAD_REQUEST, eligibility.reason, eligibility.reason);
            return;
        }

        if (redeemTokens > 0) {
            const billingService = SubscriptionBillingService.getInstance();
            const { totalPriceCents } = await billingService.resolveCheckoutTotalCents(subscribableType, subscribableId, orgId, requestedQuantity);
            const tokenQuote = await TokenService.getInstance().quote(auth.user.id, totalPriceCents, redeemTokens, orgId);
            if (redeemTokens > tokenQuote.availableTokens) {
                sendApiError(request, response, BAD_REQUEST, "INSUFFICIENT_TOKEN_BALANCE", "Not enough tokens in your wallet");
                return;
            }
            if (redeemTokens > tokenQuote.maxApplicableTokens) {
                sendApiError(request, response, BAD_REQUEST, "TOKENS_EXCEED_LIMIT", `You can apply at most ${tokenQuote.maxApplicableTokens} tokens to this purchase`);
                return;
            }
        }

        try {
            const billingService = SubscriptionBillingService.getInstance();
            const quantity = await billingService.resolveCheckoutQuantity(subscribableType, subscribableId, orgId, requestedQuantity);
            const options = orgId ? { organizationId: orgId, quantity } : undefined;
            const creation = await billingService.createStripeSubscription(auth.user.id, subscribableType, subscribableId, redeemTokens, successUrl, cancelUrl, options);
            const localSubscription = creation.subscription;
            sendApiResult(request, response, {
                subscription_id: localSubscription.id,
                stripe_subscription_id: localSubscription.stripeSubscriptionId,
                subscribable_type: localSubscription.subscribableType,
                subscribable_id: localSubscription.subscribableId,
                billing_cycle: localSubscription.billingCycle,
                status: localSubscription.status,
                checkout_url: creation.checkoutUrl,
            });
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "ALREADY_SUBSCRIBED") {
                sendApiError(request, response, BAD_REQUEST, "ALREADY_SUBSCRIBED", "Organization already has an active or pending subscription for this subscribable");
                return;
            }
            if (message === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", message);
        }
    }

    /**
     * @typedef SubscriptionRenewBody
     * @property {string} subscription_id.required - Subscription id
     */

    /**
     * Renew subscription
     * Binding: RenewSubscription
     * @route POST /subscriptions/renew
     * @group subscriptions
     * @param {SubscriptionRenewBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async renewSubscription(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subId = (request.body.subscription_id || "") + "";
        const sub = await Subscription.findById(subId);
        if (!sub || sub.uid !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }
        if ((sub.billingCycle || "") === "complete" || !sub.stripeSubscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "Subscription cannot be renewed");
            return;
        }

        const wasSuspended = sub.status === SubscriptionStatus.SUSPENDED;

        try {
            await SubscriptionBillingService.getInstance().reactivate(sub.id);

        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", message);
            return;
        }

        try {
            if (wasSuspended) {
                await TraceabilityService.getInstance().recordSubscriptionReactivated(sub.id);
            } else {
                await TraceabilityService.getInstance().recordSubscriptionRenewed(sub.id);
            }
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "TRACEABILITY_RECORDING_FAILED", "Renewal succeeded but failed to record traceability event");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * @typedef SubscriptionChangePlanBody
     * @property {string} subscribable_type.required - Current subscribable type
     * @property {string} subscribable_id.required - Current subscribable id
     * @property {string} target_subscribable_id.required - Target subscribable id
     * @property {string} method - Payment method (must be stripe)
     * @property {string} effective - Change timing
     * @property {number} redeem_tokens - Number of tokens to apply as a discount (optional, default 0)
     */

    /**
     * @typedef ChangePlanResponse
     * @property {string} subscription_id - Subscription id
     * @property {string} stripe_subscription_id - Stripe subscription id
     * @property {string} status - Subscription status
     * @property {string} checkout_url - Stripe checkout URL
     * @property {string} current_subscribable_id - Current subscribable id
     * @property {string} target_subscribable_id - Target subscribable id
     * @property {number} effective_at - Effective timestamp
     */

    /**
     * Change subscription plan
     * Binding: ChangeSubscriptionPlan
     * @route POST /subscriptions/change-plan
     * @group subscriptions
     * @param {SubscriptionChangePlanBody.model} request.body - Request body
     * @returns {ChangePlanResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIBABLE_TYPE, INVALID_SUBSCRIBABLE_ID, INVALID_TARGET_SUBSCRIBABLE_ID, INVALID_METHOD, INVALID_EFFECTIVE, PLAN_CHANGE_NOT_ALLOWED, INVALID_REQUEST, ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN, INSUFFICIENT_TOKEN_BALANCE, TOKENS_EXCEED_LIMIT
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: ORG_MEMBER_CANNOT_PURCHASE
     * @security AuthToken
     */
    public async changePlan(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subscribableType = ((request.body.subscribable_type || "") + "").trim() as SubscribableType;
        const subscribableId = ((request.body.subscribable_id || "") + "").trim();
        const targetSubscribableId = ((request.body.target_subscribable_id || "") + "").trim();
        const redeemTokens = Math.max(0, Math.floor(Number(request.body.redeem_tokens) || 0));

        if (!subscribableType || !Object.values(SubscribableType).includes(subscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_TYPE", "subscribable_type must be 'item' or 'plan'");
            return;
        }
        if (!subscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "subscribable_id is required");
            return;
        }
        if (!targetSubscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TARGET_SUBSCRIBABLE_ID", "target_subscribable_id is required");
            return;
        }

        const billingContext = await OrganizationService.getInstance().resolveBillingOrganizationContext(auth.user.id);
        if (!billingContext) {
            sendApiError(request, response, FORBIDDEN, "ORG_MEMBER_CANNOT_PURCHASE", "Only organization admins can purchase or change subscriptions");
            return;
        }
        const orgId = billingContext.organizationId || undefined;

        const subscriptionService = SubscriptionService.getInstance();

        const method = ((request.body.method || "stripe") + "").trim().toLowerCase();
        if (method !== "stripe") {
            sendApiError(request, response, BAD_REQUEST, "INVALID_METHOD", "Method must be stripe");
            return;
        }

        const rawEffective = ((request.body.effective || "") + "").trim();
        if (rawEffective && !subscriptionService.parseEffectiveMode(rawEffective)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_EFFECTIVE", "effective must be immediate or period_end");
            return;
        }

        let currentSub = await subscriptionService.getEntitlement(auth.user.id, subscribableType, subscribableId);
        if (currentSub && ((currentSub.billingCycle || "") === "complete")) {
            sendApiError(request, response, BAD_REQUEST, "PLAN_CHANGE_NOT_ALLOWED", "Plan change is not supported for full access");
            return;
        }

        if (!currentSub) {
            try {
                const changeOptions = orgId ? { organizationId: orgId } : undefined;
                const creation = await SubscriptionBillingService.getInstance().createStripeSubscription(auth.user.id, subscribableType, targetSubscribableId, redeemTokens, undefined, undefined, changeOptions);
                const result = creation.subscription;
                sendApiResult(request, response, {
                    subscription_id: result.id,
                    stripe_subscription_id: result.stripeSubscriptionId,
                    status: result.status,
                    checkout_url: creation.checkoutUrl,
                    current_subscribable_id: "",
                    target_subscribable_id: targetSubscribableId,
                    effective_at: Date.now(),
                });
            } catch (ex) {
                Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
                const message = ex instanceof Error ? ex.message : "Invalid request";
                if (message === "ALREADY_SUBSCRIBED") {
                    sendApiError(request, response, BAD_REQUEST, "ALREADY_SUBSCRIBED", "Organization already has an active or pending subscription for this subscribable");
                    return;
                }
                if (message === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                    sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                    return;
                }
                sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", message);
                return;
            }
            return;
        }

        try {
            const billingService = SubscriptionBillingService.getInstance();
            if (currentSub.stripeSubscriptionId) {
                currentSub = await billingService.reconcilePlanChangeTokenHolds(currentSub.id);
            }
            if (currentSub.subscribableId === targetSubscribableId) {
                sendApiResult(request, response, {
                    status: "no_change",
                    current_subscribable_id: currentSub.subscribableId,
                    target_subscribable_id: targetSubscribableId,
                    effective_at: currentSub.currentPeriodStart || Date.now(),
                });
                return;
            }
            const requestedEffective = rawEffective
                ? subscriptionService.parseEffectiveMode(rawEffective)
                : null;
            const effectiveMode = requestedEffective || await billingService.determinePlanChangeMode(currentSub, subscribableType, targetSubscribableId);

            if (effectiveMode === "period_end") {
                const scheduled = await billingService.schedulePlanChangeAtPeriodEnd(
                    auth.user.id,
                    currentSub.id,
                    subscribableType,
                    targetSubscribableId,
                );

                try {
                    await TraceabilityService.getInstance().recordSubscriptionChanged(currentSub.id, auth.user.id);
                } catch (ex) {
                    Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
                }

                sendApiResult(request, response, {
                    subscription_id: scheduled.subscription.id,
                    stripe_subscription_id: scheduled.subscription.stripeSubscriptionId,
                    status: "scheduled",
                    current_subscribable_id: subscribableId,
                    target_subscribable_id: targetSubscribableId,
                    effective_at: scheduled.effectiveAt,
                });
                return;
            }

            if (redeemTokens > 0) {
                const billingService = SubscriptionBillingService.getInstance();
                const proration = await billingService.previewProration(auth.user.id, currentSub.id, subscribableType, targetSubscribableId);
                const tokenQuote = await TokenService.getInstance().quote(auth.user.id, proration.totalDueCents, redeemTokens, currentSub.organizationId);
                if (redeemTokens > tokenQuote.availableTokens) {
                    sendApiError(request, response, BAD_REQUEST, "INSUFFICIENT_TOKEN_BALANCE", "Not enough tokens in your wallet");
                    return;
                }
                if (redeemTokens > tokenQuote.maxApplicableTokens) {
                    sendApiError(request, response, BAD_REQUEST, "TOKENS_EXCEED_LIMIT", `You can apply at most ${tokenQuote.maxApplicableTokens} tokens to this plan change`);
                    return;
                }
            }

            await SubscriptionBillingService.getInstance().changePlan(auth.user.id, currentSub.id, subscribableType, targetSubscribableId, redeemTokens);

        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "PLAN_CHANGE_FAILED", message);
            return;
        }

        try {
            await TraceabilityService.getInstance().recordSubscriptionChanged(currentSub.id, auth.user.id);
        } catch (ex) {    
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "TRACEABILITY_RECORDING_FAILED", "Plan change succeeded but failed to record traceability event");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * @typedef SubscriptionCancelBody
     * @property {string} subscription_id.required - Subscription id
     * @property {boolean} cancel_at_period_end - Cancel at period end (default: true)
     */

    /**
     * Cancel subscription
     * Binding: CancelSubscription
     * @route POST /subscriptions/cancel
     * @group subscriptions
     * @param {SubscriptionCancelBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async cancelSubscription(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subId = (request.body.subscription_id || "") + "";
        const sub = await Subscription.findById(subId);
        if (!sub || sub.uid !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        const cancelAtPeriodEnd = (request.body.cancel_at_period_end === undefined) ? true : !!request.body.cancel_at_period_end;

        try {
            await SubscriptionBillingService.getInstance().cancel(sub.id, cancelAtPeriodEnd);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "SUBSCRIPTION_HAS_NO_STRIPE_REFERENCE") {
                await SubscriptionService.getInstance().cancelSubscription(sub, cancelAtPeriodEnd);
            } else {
                throw ex;
            }
        }

        if (!cancelAtPeriodEnd) {
            try {
                await TraceabilityService.getInstance().recordSubscriptionCancelled(sub.id);
            } catch (ex) {
                Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            }
        }

        sendApiSuccess(request, response);
    }

    /**
     * @typedef PreviewChangeBody
     * @property {string} subscribable_type.required - Current subscribable type
     * @property {string} subscribable_id.required - Current subscribable id
     * @property {string} target_subscribable_type.required - Target subscribable type
     * @property {string} target_subscribable_id.required - Target subscribable id
     */

    /**
     * @typedef PreviewChangeResponse
     * @property {string} type.required - Change type (upgrade_immediate or period_end)
     * @property {object} current.required - Current subscription details
     * @property {object} target.required - Target subscription details
     * @property {number} scheduled_activation_at - Activation timestamp for period_end changes
     * @property {object} token_quote - Token redemption quote
     */

    /**
     * Preview subscription plan change
     * Binding: PreviewChangePlan
     * @route POST /subscriptions/preview-change
     * @group subscriptions
     * @param {PreviewChangeBody.model} request.body - Request body
     * @returns {PreviewChangeResponse.model} 200 - Preview result
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIBABLE_TYPE, INVALID_SUBSCRIBABLE_ID, INVALID_TARGET_SUBSCRIBABLE_TYPE, INVALID_TARGET_SUBSCRIBABLE_ID, ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async previewChange(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subscribableType = ((request.body.subscribable_type || "") + "").trim() as SubscribableType;
        const subscribableId = ((request.body.subscribable_id || "") + "").trim();
        const targetSubscribableType = ((request.body.target_subscribable_type || "") + "").trim() as SubscribableType;
        const targetSubscribableId = ((request.body.target_subscribable_id || "") + "").trim();

        if (!subscribableType || !Object.values(SubscribableType).includes(subscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_TYPE", "subscribable_type must be 'item' or 'plan'");
            return;
        }
        if (!subscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "subscribable_id is required");
            return;
        }
        if (!targetSubscribableType || !Object.values(SubscribableType).includes(targetSubscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TARGET_SUBSCRIBABLE_TYPE", "target_subscribable_type must be 'item' or 'plan'");
            return;
        }
        if (!targetSubscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TARGET_SUBSCRIBABLE_ID", "target_subscribable_id is required");
            return;
        }

        const currentSub = await SubscriptionService.getInstance().getEntitlement(auth.user.id, subscribableType, subscribableId);
        if (!currentSub) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "No active subscription found");
            return;
        }

        try {
            await SubscriptionService.getInstance().assertPersonalMultiLicensePlanPurchaseAllowed(
                targetSubscribableType,
                targetSubscribableId,
                currentSub.organizationId,
            );
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                return;
            }
            throw ex;
        }

        const billingService = SubscriptionBillingService.getInstance();
        const targetPriceCents = await billingService.resolvePriceCents(targetSubscribableType, targetSubscribableId);
        const currentPriceCents = await billingService.resolvePriceCents(subscribableType, subscribableId);

        try {
            const mode = await billingService.determinePlanChangeMode(currentSub, targetSubscribableType, targetSubscribableId);

            if (mode === "immediate") {
                const proration = await billingService.previewProration(auth.user.id, currentSub.id, targetSubscribableType, targetSubscribableId);
                const tokenQuote = await TokenService.getInstance().quote(auth.user.id, proration.totalDueCents, 0, currentSub.organizationId);
                sendApiResult(request, response, {
                    type: "upgrade_immediate",
                    current: {
                        subscribable_id: subscribableId,
                        subscribable_type: subscribableType,
                        billing_cycle: currentSub.billingCycle,
                        price_cents: currentPriceCents,
                        period_start: currentSub.currentPeriodStart,
                        period_end: currentSub.currentPeriodEnd,
                    },
                    target: {
                        subscribable_id: targetSubscribableId,
                        subscribable_type: targetSubscribableType,
                        price_cents: targetPriceCents,
                    },
                    proration,
                    token_quote: {
                        max_applicable_tokens: tokenQuote.maxApplicableTokens,
                        token_value_eur_cents: tokenQuote.tokenValueEurCents,
                    },
                });
                return;
            }

            const tokenQuote = await TokenService.getInstance().quote(auth.user.id, targetPriceCents ?? 0, 0, currentSub.organizationId);
            sendApiResult(request, response, {
                type: "period_end",
                current: {
                    subscribable_id: subscribableId,
                    subscribable_type: subscribableType,
                    billing_cycle: currentSub.billingCycle,
                    price_cents: currentPriceCents,
                    period_start: currentSub.currentPeriodStart,
                    period_end: currentSub.currentPeriodEnd,
                },
                target: {
                    subscribable_id: targetSubscribableId,
                    subscribable_type: targetSubscribableType,
                    price_cents: targetPriceCents,
                },
                scheduled_activation_at: currentSub.currentPeriodEnd,
                token_quote: {
                    max_applicable_tokens: tokenQuote.maxApplicableTokens,
                    token_value_eur_cents: tokenQuote.tokenValueEurCents,
                },
            });
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "PREVIEW_FAILED", message);
        }
    }

    /**
     * @typedef PreviewCancelBody
     * @property {string} subscription_id.required - Subscription id
     */

    /**
     * @typedef PreviewCancelResponse
     * @property {string} subscription_id.required - Subscription id
     * @property {string} subscribable_type.required - Subscribable type
     * @property {string} subscribable_id.required - Subscribable id
     * @property {string} billing_cycle.required - Billing cycle
     * @property {number} period_end.required - Period end timestamp
     * @property {number} remaining_days.required - Days remaining in period
     * @property {object} cancel_options.required - Available cancel options
     */

    /**
     * Preview subscription cancellation
     * Binding: PreviewCancelSubscription
     * @route POST /subscriptions/preview-cancel
     * @group subscriptions
     * @param {PreviewCancelBody.model} request.body - Request body
     * @returns {PreviewCancelResponse.model} 200 - Cancellation preview
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIPTION_ID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async previewCancel(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subId = ((request.body.subscription_id || "") + "").trim();
        if (!subId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIPTION_ID", "subscription_id is required");
            return;
        }

        const sub = await Subscription.findById(subId);
        if (!sub || sub.uid !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        const now = Date.now();
        const remainingDays = sub.currentPeriodEnd > now ? Math.ceil((sub.currentPeriodEnd - now) / (24 * 60 * 60 * 1000)) : 0;

        sendApiResult(request, response, {
            subscription_id: sub.id,
            subscribable_type: sub.subscribableType,
            subscribable_id: sub.subscribableId,
            billing_cycle: sub.billingCycle,
            period_end: sub.currentPeriodEnd,
            remaining_days: remainingDays,
            cancel_options: {
                immediate: { available: true },
                period_end: { available: true, scheduled_at: sub.currentPeriodEnd },
            },
        });
    }

    /**
     * @typedef PreviewCreateBody
     * @property {string} subscribable_type.required - Subscribable type
     * @property {string} subscribable_id.required - Subscribable id
     */

    /**
     * @typedef PreviewCreateResponse
     * @property {boolean} eligible.required - Whether subscription is allowed
     * @property {object} subscribable.required - Subscribable details
     * @property {object} token_quote - Token redemption quote
     */

    /**
     * Preview subscription creation
     * Binding: PreviewCreateSubscription
     * @route POST /subscriptions/preview-create
     * @group subscriptions
     * @param {PreviewCreateBody.model} request.body - Request body
     * @returns {PreviewCreateResponse.model} 200 - Creation preview
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIBABLE_TYPE, INVALID_SUBSCRIBABLE_ID, ALREADY_SUBSCRIBED_TO_ITEM, ALREADY_SUBSCRIBED_TO_PLAN, ITEM_COVERED_BY_ACTIVE_PLAN, PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM, ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: ORG_MEMBER_CANNOT_PURCHASE
     * @security AuthToken
     */
    public async previewCreate(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subscribableType = ((request.body.subscribable_type || "") + "").trim() as SubscribableType;
        const subscribableId = ((request.body.subscribable_id || "") + "").trim();
        const requestedQuantity = Math.max(1, Math.floor(Number(request.body.quantity) || 1));

        if (!subscribableType || !Object.values(SubscribableType).includes(subscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_TYPE", "subscribable_type must be 'item' or 'plan'");
            return;
        }
        if (!subscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "subscribable_id is required");
            return;
        }

        const billingContext = await OrganizationService.getInstance().resolveBillingOrganizationContext(auth.user.id);
        if (!billingContext) {
            sendApiError(request, response, FORBIDDEN, "ORG_MEMBER_CANNOT_PURCHASE", "Only organization admins can purchase or change subscriptions");
            return;
        }
        const orgId = billingContext.organizationId || undefined;

        const eligibility = await SubscriptionService.getInstance().validateSubscriptionEligibility(auth.user.id, subscribableType, subscribableId, orgId);
        if (!eligibility.eligible) {
            if (eligibility.reason === "ALREADY_SUBSCRIBED_TO_ITEM" || eligibility.reason === "ALREADY_SUBSCRIBED_TO_PLAN") {
                const pendingSubs = await Subscription.findPendingByUserAndSubscribable(auth.user.id, subscribableId);
                if (pendingSubs.length > 0) {
                    const billingService = SubscriptionBillingService.getInstance();
                    const { unitPriceCents, quantity, totalPriceCents } = await billingService.resolveCheckoutTotalCents(
                        subscribableType,
                        subscribableId,
                        pendingSubs[0].organizationId || orgId,
                        requestedQuantity,
                        pendingSubs[0].quantity || 1,
                    );
                    let billingCycle: string | null = null;
                    if (subscribableType === SubscribableType.PLAN) {
                        const pricing = await PlanPricing.findById(subscribableId);
                        billingCycle = pricing ? pricing.billingCycle : null;
                    } else {
                        const plan = await ItemPlan.findById(subscribableId);
                        billingCycle = plan ? plan.billingCycle : null;
                    }
                    const tokenQuote = await TokenService.getInstance().quote(auth.user.id, totalPriceCents, 0, pendingSubs[0].organizationId || orgId);
                    sendApiResult(request, response, {
                        eligible: true,
                        pending_subscription_id: pendingSubs[0].id,
                        quantity,
                        total_price_cents: totalPriceCents,
                        subscribable: {
                            type: subscribableType,
                            id: subscribableId,
                            price_cents: unitPriceCents,
                            billing_cycle: billingCycle,
                        },
                        token_quote: {
                            max_applicable_tokens: tokenQuote.maxApplicableTokens,
                            token_value_eur_cents: tokenQuote.tokenValueEurCents,
                        },
                    });
                    return;
                }
            }
            if (eligibility.reason === "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN") {
                sendApiError(request, response, BAD_REQUEST, "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN", "Multi-license plans require an organization");
                return;
            }
            sendApiError(request, response, BAD_REQUEST, eligibility.reason, eligibility.reason);
            return;
        }

        const billingService = SubscriptionBillingService.getInstance();
        const { unitPriceCents, quantity, totalPriceCents } = await billingService.resolveCheckoutTotalCents(subscribableType, subscribableId, orgId, requestedQuantity);

        let billingCycle: string | null = null;

        if (subscribableType === SubscribableType.PLAN) {
            const pricing = await PlanPricing.findById(subscribableId);
            if (!pricing) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "Plan pricing not found");
                return;
            }
            billingCycle = pricing.billingCycle;
        } else {
            const plan = await ItemPlan.findById(subscribableId);
            if (!plan) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "Item plan not found");
                return;
            }
            billingCycle = plan.billingCycle;
        }

        const tokenQuote = await TokenService.getInstance().quote(auth.user.id, totalPriceCents, 0, orgId);

        sendApiResult(request, response, {
            eligible: true,
            quantity,
            total_price_cents: totalPriceCents,
            subscribable: {
                type: subscribableType,
                id: subscribableId,
                price_cents: unitPriceCents,
                billing_cycle: billingCycle,
            },
            token_quote: {
                max_applicable_tokens: tokenQuote.maxApplicableTokens,
                token_value_eur_cents: tokenQuote.tokenValueEurCents,
            },
        });
    }

    /**
     * @typedef CompletePendingBody
     * @property {string} subscription_id.required - Pending subscription id
     * @property {number} redeem_tokens - Number of tokens to apply as a discount (optional, default 0)
     * @property {string} success_url - URL to redirect the user after a successful payment (optional)
     * @property {string} cancel_url - URL to redirect the user after cancelling the payment (optional)
     */

    /**
     * @typedef CompletePendingResponse
     * @property {string} subscription_id.required - Subscription id
     * @property {string} checkout_url.required - Stripe checkout URL
     */

    /**
     * Complete a pending payment subscription
     * Binding: CompletePendingSubscription
     * @route POST /subscriptions/complete-pending
     * @group subscriptions
     * @param {CompletePendingBody.model} request.body - Request body
     * @returns {CompletePendingResponse.model} 200 - Checkout URL generated
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIPTION_ID, SUBSCRIPTION_NOT_PENDING, INSUFFICIENT_TOKEN_BALANCE, TOKENS_EXCEED_LIMIT
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Forbidden: ORG_MEMBER_CANNOT_PURCHASE
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async completePending(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subId = ((request.body.subscription_id || "") + "").trim();
        const redeemTokens = Math.max(0, Math.floor(Number(request.body.redeem_tokens) || 0));
        const successUrl = ((request.body.success_url || "") + "").trim() || undefined;
        const cancelUrl = ((request.body.cancel_url || "") + "").trim() || undefined;
        if (!subId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIPTION_ID", "subscription_id is required");
            return;
        }

        const billingContext = await OrganizationService.getInstance().resolveBillingOrganizationContext(auth.user.id);
        if (!billingContext) {
            sendApiError(request, response, FORBIDDEN, "ORG_MEMBER_CANNOT_PURCHASE", "Only organization admins can purchase or change subscriptions");
            return;
        }

        const sub = await Subscription.findById(subId);
        if (!sub || sub.uid !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        if (sub.status !== SubscriptionStatus.PENDING && sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
            sendApiError(request, response, BAD_REQUEST, "SUBSCRIPTION_NOT_PENDING", "Subscription is not in a pending state");
            return;
        }

        if (redeemTokens > 0) {
            const billingService = SubscriptionBillingService.getInstance();
            const checkoutOrgId = sub.organizationId || undefined;
            const { totalPriceCents } = await billingService.resolveCheckoutTotalCents(
                sub.subscribableType,
                sub.subscribableId,
                checkoutOrgId,
                sub.quantity || 1,
                sub.quantity || 1,
            );
            const tokenQuote = await TokenService.getInstance().quote(auth.user.id, totalPriceCents, redeemTokens, checkoutOrgId);
            if (redeemTokens > tokenQuote.availableTokens) {
                sendApiError(request, response, BAD_REQUEST, "INSUFFICIENT_TOKEN_BALANCE", "Not enough tokens in your wallet");
                return;
            }
            if (redeemTokens > tokenQuote.maxApplicableTokens) {
                sendApiError(request, response, BAD_REQUEST, "TOKENS_EXCEED_LIMIT", `You can apply at most ${tokenQuote.maxApplicableTokens} tokens to this purchase`);
                return;
            }
        }

        try {
            const checkoutOrgId = sub.organizationId || undefined;
            if (checkoutOrgId && !await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, checkoutOrgId)) {
                sendApiError(request, response, FORBIDDEN, "", "Access denied");
                return;
            }
            const checkoutOptions = checkoutOrgId ? { organizationId: checkoutOrgId, quantity: sub.quantity || 1 } : undefined;
            const checkoutUrl = await SubscriptionBillingService.getInstance().createCheckoutForExistingSubscription(sub, redeemTokens, successUrl, cancelUrl, checkoutOptions);

            sub.status = SubscriptionStatus.PENDING_PAYMENT;
            sub.updatedAt = Date.now();
            await sub.save();

            sendApiResult(request, response, {
                subscription_id: sub.id,
                checkout_url: checkoutUrl,
            });
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", message);
        }
    }

    /**
     * @typedef SubscriptionStatusItem
     * @property {string} id.required - Subscription id
     * @property {string} subscribableType.required - Subscribable type
     * @property {string} subscribableId.required - Subscribable id
     * @property {string} billingCycle.required - Billing cycle
     * @property {string} status.required - Status
     * @property {boolean} cancelAtPeriodEnd - Cancel at period end flag
     * @property {number} currentPeriodStart - Current period start (Unix ms)
     * @property {number} currentPeriodEnd - Current period end (Unix ms)
     * @property {number} nextRenewalDate - Next renewal date (Unix ms)
     */

    /**
     * @typedef SubscriptionStatusCategoryCounts
     * @property {number} all.required - Total subscriptions for current secondary filters
     * @property {number} plan.required - Plan subscriptions count
     * @property {number} service.required - Service subscriptions count
     * @property {number} product.required - Product subscriptions count
     */

    /**
     * @typedef SubscriptionStatusResponse
     * @property {Array.<SubscriptionStatusItem>} subscriptions.required - Subscriptions list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     * @property {SubscriptionStatusCategoryCounts.model} categoryCounts.required - Category tab counts
     * @property {number} cancelledCount - Cancelled subscriptions count for current filters
     */

    /**
     * Get subscription status
     * Binding: GetSubscriptionStatus
     * @route GET /subscriptions/status
     * @group subscriptions
     * @param {string} category.query - Filter by category (plan, service, product)
     * @param {string} display_status.query - Filter by display status (active, pending, cancelled)
     * @param {string} billing_cycle.query - Filter by billing cycle (monthly, annual, complete)
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @returns {SubscriptionStatusResponse.model} 200 - Subscriptions list
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getStatus(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const rawCategory = typeof request.query?.category === "string" ? request.query.category.trim() : "";
        const rawDisplayStatus = typeof request.query?.display_status === "string" ? request.query.display_status.trim() : "";
        const rawBillingCycle = typeof request.query?.billing_cycle === "string" ? request.query.billing_cycle.trim() : "";

        const category = SUBSCRIPTION_CATEGORY_FILTERS.includes(rawCategory as SubscriptionCategoryFilter)
            ? rawCategory as SubscriptionCategoryFilter
            : undefined;
        const displayStatus = SUBSCRIPTION_DISPLAY_STATUS_FILTERS.includes(rawDisplayStatus as SubscriptionDisplayStatusFilter)
            ? rawDisplayStatus as SubscriptionDisplayStatusFilter
            : undefined;
        const billingCycle = rawBillingCycle || undefined;

        const baseFilters: SubscriptionUserListFilters = {
            billingCycle,
            displayStatus,
        };
        const listFilters: SubscriptionUserListFilters = {
            ...baseFilters,
            category,
        };

        const [total, categoryCounts] = await Promise.all([
            Subscription.countByUser(auth.user.id, listFilters),
            Subscription.countCategoryCountsByUser(auth.user.id, baseFilters),
        ]);
        const cancelledCount = listFilters.displayStatus === "cancelled"
            ? total
            : await Subscription.countByUser(auth.user.id, { ...listFilters, displayStatus: "cancelled" });
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, SUBSCRIPTIONS_PAGE_LIMIT);
        const subscriptions = await Subscription.findByUser(auth.user.id, skip, pageSize, listFilters);

        sendApiResult(request, response, {
            subscriptions: subscriptions.map((subscription) => subscription.toObject()),
            page,
            totalPages,
            total,
            categoryCounts,
            cancelledCount,
        });
    }

    /**
     * @typedef SubscriptionNoticeItem
     * @property {string} id.required - Subscription id
     * @property {number} nextNoticeAt.required - Next notice timestamp
     * @property {string} status.required - Subscription status
     */

    /**
     * @typedef SubscriptionNoticesResponse
     * @property {Array.<SubscriptionNoticeItem>} notices.required - Upcoming notices
     */

    /**
     * Get upcoming notices
     * Binding: GetSubscriptionNotices
     * @route GET /subscriptions/notices
     * @group subscriptions
     * @returns {SubscriptionNoticesResponse.model} 200 - Upcoming notices
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getNotices(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const now = Date.now();
        const subs = await Subscription.findByUser(auth.user.id);
        const upcoming = subs.filter(s => s.nextNoticeAt > 0 && s.nextNoticeAt <= now + (30 * 24 * 60 * 60 * 1000));

        sendApiResult(request, response, { notices: upcoming });
    }

    /**
     * @typedef SubscriptionAllowanceResponse
     * @property {boolean} has_subscription.required - True if an entitlement exists
     * @property {string} subscribable_type - Subscribable type
     * @property {string} subscribable_id - Subscribable id
     * @property {string} billing_cycle - Billing cycle
     * @property {string} status - Subscription status
     */

    /**
     * Get token allowance for a subscribable according to active subscription
     * Binding: GetSubscriptionAllowance
     * @route GET /subscriptions/allowance
     * @group subscriptions
     * @param {string} subscribable_type.query.required - Subscribable type
     * @param {string} subscribable_id.query.required - Subscribable id
     * @returns {SubscriptionAllowanceResponse.model} 200 - Allowance details
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIBABLE_TYPE, INVALID_SUBSCRIBABLE_ID
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async getAllowance(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const subscribableType = (typeof request.query?.subscribable_type === "string") ? request.query.subscribable_type.trim() as SubscribableType : null;
        const subscribableId = (typeof request.query?.subscribable_id === "string") ? request.query.subscribable_id.trim() : "";
        if (!subscribableType || !Object.values(SubscribableType).includes(subscribableType)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_TYPE", "subscribable_type is required and must be 'item' or 'plan'");
            return;
        }
        if (!subscribableId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIBABLE_ID", "subscribable_id is required");
            return;
        }

        const sub = await SubscriptionService.getInstance().getEntitlement(auth.user.id, subscribableType, subscribableId);
        sendApiResult(request, response, {
            has_subscription: !!sub,
            subscribable_type: sub?.subscribableType || null,
            subscribable_id: sub?.subscribableId || null,
            billing_cycle: sub?.billingCycle || null,
            status: sub?.status || null,
        });
    }

    /**
     * @typedef SubscriptionAdminListItem
     * @property {string} id.required - Subscription id
     * @property {string} uid.required - Owner user id
     * @property {string} username - Owner username
     * @property {string} category - Subscription category (plan, service, product)
     * @property {string} subscribableType.required - Subscribable type
     * @property {string} subscribableId.required - Subscribable id
     * @property {string} subscribableName - Human-readable item or plan name
     * @property {string} billingCycle.required - Billing cycle
     * @property {string} status.required - Status
     * @property {string} stripeSubscriptionId - Stripe subscription id
     * @property {number} currentPeriodStart - Current period start (Unix ms)
     * @property {number} currentPeriodEnd - Current period end (Unix ms)
     * @property {boolean} cancelAtPeriodEnd - Cancel at period end flag
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     * @property {number} updatedAt.required - Update timestamp (Unix ms)
     */

    /**
     * @typedef SubscriptionAdminListResponse
     * @property {Array.<SubscriptionAdminListItem>} subscriptions.required - Subscriptions list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     * @property {SubscriptionStatusCategoryCounts.model} categoryCounts.required - Category tab counts
     */

    /**
     * Lists subscriptions globally for platform administrators.
     * Requires permission: admin.users.manage
     * Binding: ListAdminSubscriptions
     * @route GET /subscriptions/admin
     * @group subscriptions
     * @param {string} status.query - Filter by status
     * @param {string} billing_cycle.query - Filter by billing cycle
     * @param {string} category.query - Filter by category (plan, service, product)
     * @param {string} created_from.query - Filter by createdAt from (Unix ms)
     * @param {string} created_to.query - Filter by createdAt to (Unix ms)
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @returns {SubscriptionAdminListResponse.model} 200 - Subscriptions list
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listAdminSubscriptions(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const rawCreatedFrom = typeof request.query?.created_from === "string" ? request.query.created_from.trim() : "";
        const rawCreatedTo = typeof request.query?.created_to === "string" ? request.query.created_to.trim() : "";
        const parsedCreatedFrom = rawCreatedFrom ? Number(rawCreatedFrom) : 0;
        const parsedCreatedTo = rawCreatedTo ? Number(rawCreatedTo) : 0;
        const rawCategory = typeof request.query?.category === "string" ? request.query.category.trim() : "";
        const category = SUBSCRIPTION_CATEGORY_FILTERS.includes(rawCategory as SubscriptionCategoryFilter)
            ? rawCategory as SubscriptionCategoryFilter
            : undefined;

        const baseFilters: Omit<SubscriptionAdminListFilters, "category"> = {
            status: typeof request.query?.status === "string" ? request.query.status.trim() : "",
            billingCycle: typeof request.query?.billing_cycle === "string" ? request.query.billing_cycle.trim() : "",
            createdFrom: Number.isFinite(parsedCreatedFrom) && parsedCreatedFrom > 0 ? Math.floor(parsedCreatedFrom) : 0,
            createdTo: Number.isFinite(parsedCreatedTo) && parsedCreatedTo > 0 ? Math.floor(parsedCreatedTo) : 0,
        };
        const filters: SubscriptionAdminListFilters = {
            ...baseFilters,
            category,
        };

        const [total, categoryCounts] = await Promise.all([
            Subscription.countForAdmin(filters),
            Subscription.countCategoryCountsForAdmin(baseFilters),
        ]);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, SUBSCRIPTIONS_PAGE_LIMIT);
        const subscriptions = await Subscription.findForAdmin(filters, skip, pageSize);
        const subscriptionItems = await SubscriptionService.getInstance().toAdminListItems(subscriptions);

        sendApiResult(request, response, {
            subscriptions: subscriptionItems,
            page,
            totalPages,
            total,
            categoryCounts,
        });
    }

    /**
     * @typedef SubscriptionAdminUserListResponse
     * @property {Array.<SubscriptionAdminListItem>} subscriptions.required - Subscriptions list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists subscriptions for a specific user (admin view).
     * Requires permission: admin.users.manage
     * Binding: ListAdminUserSubscriptions
     * @route GET /subscriptions/admin/user/{uid}
     * @group subscriptions
     * @param {string} uid.path.required - Target user id
     * @param {string} category.query - Filter by category (plan, service, product)
     * @param {string} display_status.query - Filter by display status (active, pending, cancelled)
     * @param {string} billing_cycle.query - Filter by billing cycle (monthly, annual, complete)
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @returns {SubscriptionAdminUserListResponse.model} 200 - Subscriptions list
     * @returns {void} 400 - Bad request: INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listAdminUserSubscriptions(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const uid = ((request.params.uid || "") + "").trim();
        if (!uid) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "uid is required");
            return;
        }

        const rawCategory = typeof request.query?.category === "string" ? request.query.category.trim() : "";
        const rawDisplayStatus = typeof request.query?.display_status === "string" ? request.query.display_status.trim() : "";
        const rawBillingCycle = typeof request.query?.billing_cycle === "string" ? request.query.billing_cycle.trim() : "";

        const category = SUBSCRIPTION_CATEGORY_FILTERS.includes(rawCategory as SubscriptionCategoryFilter)
            ? rawCategory as SubscriptionCategoryFilter
            : undefined;
        const displayStatus = SUBSCRIPTION_DISPLAY_STATUS_FILTERS.includes(rawDisplayStatus as SubscriptionDisplayStatusFilter)
            ? rawDisplayStatus as SubscriptionDisplayStatusFilter
            : undefined;
        const billingCycle = rawBillingCycle || undefined;

        const baseFilters: SubscriptionUserListFilters = {
            billingCycle,
            displayStatus,
        };
        const listFilters: SubscriptionUserListFilters = {
            ...baseFilters,
            category,
        };

        const total = await Subscription.countByUser(uid, listFilters);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, SUBSCRIPTIONS_PAGE_LIMIT);
        const subscriptions = await Subscription.findByUser(uid, skip, pageSize, listFilters);
        const subscriptionItems = await SubscriptionService.getInstance().toAdminListItems(subscriptions);

        sendApiResult(request, response, {
            subscriptions: subscriptionItems,
            page,
            totalPages,
            total,
        });
    }

    /**
     * @typedef SubscriptionAdminPaymentItem
     * @property {string} id.required - Payment id
     * @property {string} type.required - Payment type
     * @property {string} provider.required - Payment provider
     * @property {number} amountCents.required - Amount in cents
     * @property {string} currency.required - Currency
     * @property {string} status.required - Payment status
     * @property {string} providerSessionId - Stripe session or payment intent id
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     */

    /**
     * @typedef SubscriptionAdminStripeSummary
     * @property {string} stripe_subscription_id.required - Stripe subscription id
     * @property {string} stripe_status.required - Stripe subscription status
     * @property {string} stripe_customer_id.required - Stripe customer id
     * @property {number} current_period_start - Current period start (Unix ms)
     * @property {number} current_period_end - Current period end (Unix ms)
     * @property {boolean} cancel_at_period_end.required - Cancel at period end flag
     * @property {boolean} pause_collection.required - Pause collection flag
     */

    /**
     * @typedef SubscriptionAdminDetailResponse
     * @property {SubscriptionAdminListItem.model} subscription.required - Subscription details
     * @property {Array.<SubscriptionAdminPaymentItem>} payments.required - Related payments
     * @property {SubscriptionAdminStripeSummary.model} stripe - Stripe summary
     */

    /**
     * Gets subscription detail with payments and Stripe summary for administrators.
     * Requires permission: admin.users.manage
     * Binding: GetAdminSubscriptionDetail
     * @route GET /subscriptions/admin/{subscriptionId}
     * @group subscriptions
     * @param {string} subscriptionId.path.required - Subscription id
     * @returns {SubscriptionAdminDetailResponse.model} 200 - Subscription detail
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async getAdminSubscriptionDetail(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const subscriptionId = ((request.params.subscriptionId || "") + "").trim();
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        const payments = await Payment.findBySubscriptionId(subscriptionId, 0, SUBSCRIPTIONS_ADMIN_PAYMENTS_LIMIT);
        let stripe = null;
        try {
            stripe = await SubscriptionBillingService.getInstance().getStripeSubscriptionSummary(subscriptionId);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }

        const subscriptionItems = await SubscriptionService.getInstance().toAdminListItems([subscription]);
        const subscriptionItem = subscriptionItems[0];
        if (!subscriptionItem?.id) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        sendApiResult(request, response, {
            subscription: subscriptionItem,
            payments: payments.map((payment) => payment.toObject()),
            stripe,
        });
    }

    /**
     * @typedef SubscriptionAdminActionBody
     * @property {string} subscription_id.required - Subscription id
     */

    /**
     * Suspends a subscription (Stripe pause + local suspended status).
     * Requires permission: admin.users.manage
     * Binding: SuspendSubscriptionAdmin
     * @route POST /subscriptions/admin/suspend
     * @group subscriptions
     * @param {SubscriptionAdminActionBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async suspendSubscription(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const subscriptionId = ((request.body.subscription_id || "") + "").trim();
        if (!subscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "subscription_id is required");
            return;
        }

        try {
            await SubscriptionBillingService.getInstance().suspend(subscriptionId);
            sendApiSuccess(request, response);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "SUBSCRIPTION_NOT_FOUND") {
                sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
                return;
            }
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", message);
        }
    }

    /**
     * Reactivates a subscription for administrators.
     * Requires permission: admin.users.manage
     * Binding: ReactivateSubscriptionAdmin
     * @route POST /subscriptions/admin/reactivate
     * @group subscriptions
     * @param {SubscriptionAdminActionBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async reactivateSubscriptionAdmin(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const subscriptionId = ((request.body.subscription_id || "") + "").trim();
        if (!subscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "subscription_id is required");
            return;
        }

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
            return;
        }

        const wasSuspended = subscription.status === SubscriptionStatus.SUSPENDED;

        try {
            await SubscriptionBillingService.getInstance().reactivate(subscriptionId);
            try {
                if (wasSuspended) {
                    await TraceabilityService.getInstance().recordSubscriptionReactivated(subscriptionId);
                } else {
                    await TraceabilityService.getInstance().recordSubscriptionRenewed(subscriptionId);
                }
            } catch (ex) {
                Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            }
            sendApiSuccess(request, response);
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "SUBSCRIPTION_NOT_FOUND") {
                sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
                return;
            }
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", message);
        }
    }

    /**
     * @typedef SubscriptionAdminRefundBody
     * @property {string} subscription_id.required - Subscription id
     * @property {string} payment_id - Payment id to refund (defaults to last payment)
     */

    /**
     * @typedef SubscriptionAdminRefundResponse
     * @property {string} payment_id.required - Refunded payment id
     * @property {number} refund_amount_cents.required - Refunded amount in cents
     */

    /**
     * Refunds a subscription payment through Stripe.
     * Requires permission: admin.users.manage
     * Binding: RefundSubscriptionAdmin
     * @route POST /subscriptions/admin/refund
     * @group subscriptions
     * @param {SubscriptionAdminRefundBody.model} request.body - Request body
     * @returns {SubscriptionAdminRefundResponse.model} 200 - Refund result
     * @returns {void} 400 - Bad request: INVALID_REQUEST, PAYMENT_NOT_FOUND, PAYMENT_ALREADY_REFUNDED, STRIPE_PAYMENT_NOT_FOUND
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: SUBSCRIPTION_NOT_FOUND
     * @security AuthToken
     */
    public async refundSubscriptionAdmin(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const subscriptionId = ((request.body.subscription_id || "") + "").trim();
        const paymentId = ((request.body.payment_id || "") + "").trim();
        if (!subscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "subscription_id is required");
            return;
        }

        try {
            const result = await SubscriptionBillingService.getInstance().refundSubscriptionPayment(
                subscriptionId,
                paymentId,
                auth.user.id,
            );
            sendApiResult(request, response, {
                payment_id: result.paymentId,
                refund_amount_cents: result.refundAmountCents,
            });
        } catch (ex) {
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            const message = ex instanceof Error ? ex.message : "Invalid request";
            if (message === "SUBSCRIPTION_NOT_FOUND") {
                sendApiError(request, response, NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "Subscription not found");
                return;
            }
            if (message === "PAYMENT_NOT_FOUND") {
                sendApiError(request, response, BAD_REQUEST, "PAYMENT_NOT_FOUND", "Payment not found");
                return;
            }
            if (message === "STRIPE_PAYMENT_NOT_FOUND") {
                sendApiError(request, response, BAD_REQUEST, "STRIPE_PAYMENT_NOT_FOUND", "Stripe payment not found");
                return;
            }
            if (message === "PAYMENT_ALREADY_REFUNDED") {
                sendApiError(request, response, BAD_REQUEST, "PAYMENT_ALREADY_REFUNDED", "This payment has already been refunded");
                return;
            }
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", message);
        }
    }
}
