// Reserved for license

"use strict";

import { PaymentsConfig } from "../config/config-payments";
import { CatalogItem, CUSTOM_AGENT_ITEM_ID } from "../models/catalog-item";
import { ItemPlan } from "../models/item-plan";
import { PlanComponent } from "../models/plan-component";
import { Plan } from "../models/plan";
import { PlanPricing } from "../models/plan-pricing";
import { computeNoticeAt, computePeriodEnd, getPeriodDays } from "../utils/payments-utils";
import { User } from "../models/users/user";
import { SubscribableType, Subscription, SubscriptionBillingCycle, SubscriptionCategoryFilter, SubscriptionStatus } from "../models/subscription";
import { OrganizationLicenseAssignment } from "../models/organization-license-assignment";
import { OrganizationLicensePool } from "../models/organization-license-pool";
import { Monitor } from "../monitor";
import { createRandomUID } from "../utils/text-utils";
import { ItaasWorkspaceProvisioningService } from "./itaas-workspace-provisioning-service";

export interface EligibilityResult {
    eligible: boolean;
    reason: string;
}

export type SubscriptionEffectiveMode = "immediate" | "period_end";

export class SubscriptionService {
    private static instance: SubscriptionService = null;

    public static getInstance(): SubscriptionService {
        if (SubscriptionService.instance) {
            return SubscriptionService.instance;
        } else {
            SubscriptionService.instance = new SubscriptionService();
            return SubscriptionService.instance;
        }
    }

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
     * Activates a complete (one-time) subscription for a user and subscribable entity.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type ("item" or "plan")
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param paymentId - Payment identifier
     * @returns Activated subscription
     */
    public async activatecompleteSubscription(uid: string, subscribableType: SubscribableType, subscribableId: string, paymentId: string): Promise<Subscription> {
        const now = Date.now();
        const activeForPlan = await Subscription.findActiveByUserAndSubscribable(uid, subscribableType, subscribableId);
        let sub = activeForPlan[0] || null;

        if (!sub) {
            sub = new Subscription({
                id: paymentId,
                uid: uid,
                organizationId: null,
                subscribableType: subscribableType,
                subscribableId: subscribableId,
                billingCycle: SubscriptionBillingCycle.COMPLETE,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: 0,
                cancelAtPeriodEnd: false,
                renewals: 0,
                lastPaymentId: paymentId,
                nextNoticeAt: 0,
                nextRenewalDate: 0,
                stripeSubscriptionId: "",
                createdAt: now,
                updatedAt: now,
            });
            await sub.insert();
            await this.syncItaasWorkspaceBestEffort(sub);
            return sub;
        }

        sub.billingCycle = SubscriptionBillingCycle.COMPLETE;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.currentPeriodStart = sub.currentPeriodStart || now;
        sub.currentPeriodEnd = 0;
        sub.cancelAtPeriodEnd = false;
        sub.lastPaymentId = paymentId;
        sub.nextNoticeAt = 0;
        sub.updatedAt = now;
        await sub.save();
        await this.syncItaasWorkspaceBestEffort(sub);
        return sub;
    }

    /**
     * Activates a recurring subscription for a user and subscribable entity.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @param billingCycle - Billing cycle (monthly, annual)
     * @param paymentId - Payment identifier
     * @param subscriptionId - Optional existing subscription identifier for upgrade
     * @returns Activated subscription
     */
    public async activateSubscription(
        uid: string,
        subscribableType: SubscribableType,
        subscribableId: string,
        billingCycle: SubscriptionBillingCycle,
        paymentId: string,
        subscriptionId?: string,
    ): Promise<Subscription> {
        if (billingCycle === SubscriptionBillingCycle.COMPLETE) {
            return this.activatecompleteSubscription(uid, subscribableType, subscribableId, paymentId);
        }

        const cfg = PaymentsConfig.getInstance();
        let sub: Subscription = null;
        if (subscriptionId) {
            const existing = await Subscription.findById(subscriptionId);
            if (existing?.uid === uid) {
                if (existing.subscribableId === subscribableId) {
                    sub = existing;
                } else {
                    existing.status = SubscriptionStatus.CANCELLED;
                    existing.cancelAtPeriodEnd = false;
                    existing.currentPeriodEnd = Date.now();
                    existing.nextNoticeAt = 0;
                    existing.updatedAt = Date.now();
                    await existing.save();
                    await this.syncItaasWorkspaceBestEffort(existing);
                }
            }
        }
        if (!sub) {
            const activeForPlan = await Subscription.findActiveByUserAndSubscribable(uid, subscribableType, subscribableId);
            sub = activeForPlan[0] || null;
        }
        const now = Date.now();
        const periodDays = getPeriodDays(billingCycle, cfg);

        if (!sub) {
            sub = new Subscription({
                id: paymentId,
                uid: uid,
                organizationId: null,
                subscribableType: subscribableType,
                subscribableId: subscribableId,
                billingCycle: billingCycle,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: computePeriodEnd(now, periodDays),
                cancelAtPeriodEnd: false,
                renewals: 0,
                lastPaymentId: paymentId,
                nextNoticeAt: 0,
                nextRenewalDate: 0,
                stripeSubscriptionId: "",
                createdAt: now,
                updatedAt: now,
            });
            sub.nextNoticeAt = computeNoticeAt(sub.currentPeriodEnd, cfg.subscriptionNoticeDays);
            await sub.insert();
            await this.syncItaasWorkspaceBestEffort(sub);
            return sub;
        }

        if (sub.status !== SubscriptionStatus.ACTIVE) {
            sub.status = SubscriptionStatus.ACTIVE;
        }
        sub.billingCycle = billingCycle;
        sub.gracePeriodEnd = 0;

        if (sub.currentPeriodEnd < now) {
            sub.currentPeriodStart = now;
            sub.currentPeriodEnd = computePeriodEnd(now, periodDays);
        } else {
            sub.currentPeriodEnd = computePeriodEnd(sub.currentPeriodEnd, periodDays);
        }

        sub.renewals = (sub.renewals || 0) + 1;
        sub.lastPaymentId = paymentId;
        sub.cancelAtPeriodEnd = false;
        sub.nextNoticeAt = computeNoticeAt(sub.currentPeriodEnd, cfg.subscriptionNoticeDays);
        sub.updatedAt = now;
        await sub.save();
        await this.cancelOtherActiveSubscriptions(uid, subscribableType, subscribableId, sub.id, now);
        await this.syncItaasWorkspaceBestEffort(sub);

        return sub;
    }

    /**
     * Schedules a plan change at the end of the current billing period.
     * @param currentSub - Current active subscription
     * @param newSubscribableType - Target subscribable type
     * @param newSubscribableId - Target subscribable identifier
     * @param newBillingCycle - Target billing cycle
     * @returns Pending subscription for the plan change
     */
    public async schedulePlanChangeAtPeriodEnd(
        currentSub: Subscription,
        newSubscribableType: SubscribableType,
        newSubscribableId: string,
        newBillingCycle: SubscriptionBillingCycle,
    ): Promise<Subscription> {
        if (!currentSub?.id) {
            throw new Error("Subscription not found");
        }
        if ((currentSub.status || "") !== SubscriptionStatus.ACTIVE) {
            throw new Error("Subscription is not active");
        }
        if ((currentSub.billingCycle || "") === SubscriptionBillingCycle.COMPLETE) {
            throw new Error("Plan change is not supported for complete subscriptions");
        }

        const now = Date.now();
        const cfg = PaymentsConfig.getInstance();
        const targetStart = Math.max(currentSub.currentPeriodEnd || now, now);
        const periodDays = getPeriodDays(newBillingCycle, cfg);
        const targetEnd = computePeriodEnd(targetStart, periodDays);

        const pendingSubs = await Subscription.findPendingByUserAndEitherSubscribable(
            currentSub.uid,
            currentSub.subscribableId,
            newSubscribableId,
        );

        let pending = pendingSubs[0] || null;
        if (pending) {
            pending.subscribableType = newSubscribableType;
            pending.subscribableId = newSubscribableId;
            pending.billingCycle = newBillingCycle;
            pending.status = SubscriptionStatus.PENDING;
            pending.currentPeriodStart = targetStart;
            pending.currentPeriodEnd = targetEnd;
            pending.cancelAtPeriodEnd = false;
            pending.nextNoticeAt = computeNoticeAt(targetEnd, cfg.subscriptionNoticeDays);
            pending.updatedAt = now;
            await pending.save();
        } else {
            pending = new Subscription({
                id: createRandomUID(),
                uid: currentSub.uid,
                organizationId: null,
                subscribableType: newSubscribableType,
                subscribableId: newSubscribableId,
                billingCycle: newBillingCycle,
                status: SubscriptionStatus.PENDING,
                currentPeriodStart: targetStart,
                currentPeriodEnd: targetEnd,
                cancelAtPeriodEnd: false,
                renewals: 0,
                lastPaymentId: "",
                nextNoticeAt: computeNoticeAt(targetEnd, cfg.subscriptionNoticeDays),
                nextRenewalDate: 0,
                stripeSubscriptionId: "",
                createdAt: now,
                updatedAt: now,
            });
            await pending.insert();
        }

        for (const extra of pendingSubs) {
            if (extra.id !== pending.id) {
                await extra.delete();
            }
        }

        currentSub.cancelAtPeriodEnd = true;
        currentSub.updatedAt = now;
        await currentSub.save();

        return pending;
    }

    /**
     * Cancels a subscription immediately or at period end.
     * @param sub - Subscription to cancel
     * @param cancelAtPeriodEnd - If true, cancel at period end; if false, cancel immediately
     * @returns Updated subscription
     */
    public async cancelSubscription(sub: Subscription, cancelAtPeriodEnd: boolean): Promise<Subscription> {
        const now = Date.now();
        if (cancelAtPeriodEnd) {
            sub.cancelAtPeriodEnd = true;
            sub.status = SubscriptionStatus.ACTIVE;
        } else {
            sub.cancelAtPeriodEnd = false;
            sub.status = SubscriptionStatus.CANCELLED;
            sub.currentPeriodEnd = now;
            sub.nextNoticeAt = 0;
        }
        sub.updatedAt = now;
        await sub.save();
        await this.syncItaasWorkspaceBestEffort(sub);
        return sub;
    }

    /**
     * Activates a pending subscription plan change.
     * @param uid - User identifier
     * @param subscribableId - Subscribable identifier
     * @param nowTs - Optional timestamp for testing
     * @returns Activated subscription or null
     */
    public async activatePendingPlan(uid: string, subscribableId: string, nowTs?: number): Promise<Subscription | null> {
        const now = nowTs || Date.now();
        const cfg = PaymentsConfig.getInstance();
        const pendingSubs = await Subscription.findPendingByUserAndSubscribable(uid, subscribableId);
        if (pendingSubs.length === 0) {
            return null;
        }

        let selected = pendingSubs[0];
        for (const item of pendingSubs) {
            if ((item.updatedAt || 0) > (selected.updatedAt || 0)) {
                selected = item;
            }
        }

        for (const extra of pendingSubs) {
            if (extra.id !== selected.id) {
                await extra.delete();
            }
        }

        selected.status = SubscriptionStatus.ACTIVE;
        selected.cancelAtPeriodEnd = false;
        if ((selected.currentPeriodStart || 0) <= 0 || selected.currentPeriodStart > now) {
            selected.currentPeriodStart = now;
        }
        if ((selected.currentPeriodEnd || 0) <= selected.currentPeriodStart) {
            const billingCycle = this.parseBillingCycle((selected.billingCycle || "") + "") || SubscriptionBillingCycle.MONTHLY;
            selected.currentPeriodEnd = computePeriodEnd(selected.currentPeriodStart, getPeriodDays(billingCycle, cfg));
        }
        selected.nextNoticeAt = computeNoticeAt(selected.currentPeriodEnd, cfg.subscriptionNoticeDays);
        selected.updatedAt = now;
        await selected.save();
        await this.cancelOtherActiveSubscriptions(uid, selected.subscribableType, subscribableId, selected.id, now);
        await this.syncItaasWorkspaceBestEffort(selected);

        return selected;
    }

    /**
     * Processes the notice queue by marking due notices.
     * @returns Number of notices processed
     */
    public async updateNoticeQueue(): Promise<number> {
        const now = Date.now();
        const subs = await Subscription.findRenewalNoticesDue();
        let notices = 0;
        for (const sub of subs) {
            notices++;
            Monitor.info(`[PAYMENTS] Renewal notice due for subscription ${sub.id}`);
            sub.nextNoticeAt = 0;
            sub.updatedAt = now;
            await sub.save();
        }
        return notices;
    }

    /**
     * Gets the best active entitlement for a user and subscribable entity.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - Subscribable identifier
     * @returns Best active subscription or null
     */
    public async getEntitlement(uid: string, subscribableType: SubscribableType, subscribableId: string): Promise<Subscription | null> {
        const personalEntitlement = this.pickBestSubscription(
            await Subscription.findActiveByUserAndSubscribable(uid, subscribableType, subscribableId),
        );
        if (personalEntitlement) {
            return personalEntitlement;
        }

        const licenseAssignments = await OrganizationLicenseAssignment.findActiveByUser(uid);
        const licensedSubscriptions: Subscription[] = [];
        for (const assignment of licenseAssignments) {
            if (!assignment.licensePoolId) {
                continue;
            }
            const pool = await OrganizationLicensePool.findById(assignment.licensePoolId);
            if (!pool || pool.status !== SubscriptionStatus.ACTIVE) {
                continue;
            }
            if (subscribableType === SubscribableType.ITEM && pool.itemPlanId !== subscribableId) {
                continue;
            }
            if (subscribableType === SubscribableType.PLAN) {
                continue;
            }
            const sub = await Subscription.findById(pool.sourceSubscriptionId);
            if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
                continue;
            }
            licensedSubscriptions.push(sub);
        }

        return this.pickBestSubscription(licensedSubscriptions);
    }

    private pickBestSubscription(activeSubscriptions: Subscription[]): Subscription | null {
        if (activeSubscriptions.length === 0) {
            return null;
        }

        let best: Subscription = null;
        for (const sub of activeSubscriptions) {
            if ((sub.billingCycle || "") === SubscriptionBillingCycle.COMPLETE) {
                continue;
            }
            if (!best) {
                best = sub;
                continue;
            }
            if ((sub.updatedAt || 0) > (best.updatedAt || 0)) {
                best = sub;
            }
        }

        return best || activeSubscriptions[0];
    }

    /**
     * Cancels all other active subscriptions for the same subscribable entity except the kept one.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type
     * @param subscribableId - Subscribable identifier
     * @param keepId - Subscription identifier to keep active
     * @param nowTs - Optional timestamp
     */
    private async cancelOtherActiveSubscriptions(uid: string, subscribableType: SubscribableType, subscribableId: string, keepId: string, nowTs?: number): Promise<void> {
        if (subscribableType === SubscribableType.ITEM) {
            const itemPlan = await ItemPlan.findById(subscribableId);
            if (itemPlan?.itemId === CUSTOM_AGENT_ITEM_ID) {
                return;
            }
        }

        const now = nowTs || Date.now();
        const activeForPlan = await Subscription.findActiveByUserAndSubscribable(uid, subscribableType, subscribableId);
        for (const existing of activeForPlan) {
            if (existing.id === keepId) {
                continue;
            }
            existing.status = SubscriptionStatus.CANCELLED;
            existing.cancelAtPeriodEnd = false;
            existing.currentPeriodEnd = now;
            existing.nextNoticeAt = 0;
            existing.updatedAt = now;
            await existing.save();
            await this.syncItaasWorkspaceBestEffort(existing);
        }
    }

    /**
     * Returns true when a plan must be purchased through an organization.
     * @param planId - Plan identifier
     */
    public async planRequiresOrganizationForPurchase(planId: string): Promise<boolean> {
        const normalizedPlanId = ((planId || "") + "").trim();
        if (!normalizedPlanId) {
            return false;
        }

        const plan = await Plan.findById(normalizedPlanId);
        return plan?.requiresOrganization || false;
    }

    public async assertPersonalMultiLicensePlanPurchaseAllowed(
        subscribableType: SubscribableType,
        subscribableId: string,
        organizationId: string | null | undefined,
    ): Promise<void> {
        if (organizationId || subscribableType !== SubscribableType.PLAN) {
            return;
        }

        const planPricing = await PlanPricing.findById(subscribableId);
        if (!planPricing) {
            return;
        }

        const plan = await Plan.findById(planPricing.planId);
        if (!plan?.requiresOrganization) {
            return;
        }

        throw new Error("ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN");
    }

    /**
     * Validates whether a user is eligible to subscribe to a given subscribable.
     * Prevents duplicate subscriptions and overlapping item/plan coverage.
     * @param uid - User identifier
     * @param subscribableType - Subscribable type ("item" or "plan")
     * @param subscribableId - ItemPlan or PlanPricing identifier
     * @returns Eligibility result with reason if not eligible
     */
    public async validateSubscriptionEligibility(
        uid: string,
        subscribableType: SubscribableType,
        subscribableId: string,
        organizationId?: string,
    ): Promise<EligibilityResult> {
        if (subscribableType === SubscribableType.ITEM) {
            return this.validateItemEligibility(uid, subscribableId, organizationId);
        }

        if (subscribableType === SubscribableType.PLAN) {
            return this.validatePlanEligibility(uid, subscribableId, organizationId);
        }

        return { eligible: false, reason: "INVALID_SUBSCRIBABLE_TYPE" };
    }

    private async validateItemEligibility(uid: string, subscribableId: string, organizationId?: string): Promise<EligibilityResult> {
        const itemPlan = await ItemPlan.findById(subscribableId);
        if (itemPlan?.itemId === CUSTOM_AGENT_ITEM_ID) {
            return { eligible: true, reason: "" };
        }

        const activeForItem = organizationId
            ? await Subscription.findNonCancelledByOrganizationAndSubscribable(organizationId, SubscribableType.ITEM, subscribableId)
            : await Subscription.findNonCancelledByUserAndSubscribable(uid, SubscribableType.ITEM, subscribableId);
        if (activeForItem.length > 0) {
            return { eligible: false, reason: "ALREADY_SUBSCRIBED_TO_ITEM" };
        }

        if (!itemPlan) {
            return { eligible: true, reason: "" };
        }

        const siblingItemPlans = await ItemPlan.findByItemId(itemPlan.itemId);
        const siblingIds = siblingItemPlans.map(p => p.id).filter(id => id !== subscribableId);
        if (siblingIds.length > 0) {
            const hasSiblingSubscription = organizationId
                ? await Subscription.hasNonCancelledByOrganizationAndSubscribableIds(organizationId, SubscribableType.ITEM, siblingIds)
                : await Subscription.hasNonCancelledByUserAndSubscribableIds(uid, SubscribableType.ITEM, siblingIds);
            if (hasSiblingSubscription) {
                return { eligible: false, reason: "ALREADY_SUBSCRIBED_TO_ITEM" };
            }
        }

        const planComponents = await PlanComponent.findByCatalogItemId(itemPlan.itemId);
        const planIds = [...new Set(planComponents.map(c => c.planId))];
        if (planIds.length === 0) {
            return { eligible: true, reason: "" };
        }

        const pricings = await PlanPricing.findByPlanIds(planIds);
        const pricingIds = pricings.map(p => p.id);
        if (pricingIds.length === 0) {
            return { eligible: true, reason: "" };
        }

        const hasActivePlan = organizationId
            ? await Subscription.hasNonCancelledByOrganizationAndSubscribableIds(organizationId, SubscribableType.PLAN, pricingIds)
            : await Subscription.hasNonCancelledByUserAndSubscribableIds(uid, SubscribableType.PLAN, pricingIds);
        if (hasActivePlan) {
            return { eligible: false, reason: "ITEM_COVERED_BY_ACTIVE_PLAN" };
        }

        return { eligible: true, reason: "" };
    }

    private async validatePlanEligibility(uid: string, subscribableId: string, organizationId?: string): Promise<EligibilityResult> {
        const activeForPlan = organizationId
            ? await Subscription.findNonCancelledByOrganizationAndSubscribable(organizationId, SubscribableType.PLAN, subscribableId)
            : await Subscription.findNonCancelledByUserAndSubscribable(uid, SubscribableType.PLAN, subscribableId);
        if (activeForPlan.length > 0) {
            return { eligible: false, reason: "ALREADY_SUBSCRIBED_TO_PLAN" };
        }

        const planPricing = await PlanPricing.findById(subscribableId);
        if (!planPricing) {
            return { eligible: true, reason: "" };
        }

        if (!organizationId && await this.planRequiresOrganizationForPurchase(planPricing.planId)) {
            return { eligible: false, reason: "ORG_REQUIRED_FOR_MULTI_LICENSE_PLAN" };
        }

        const siblingPricings = await PlanPricing.findByPlanId(planPricing.planId);
        const siblingIds = siblingPricings.map(p => p.id).filter(id => id !== subscribableId);
        if (siblingIds.length > 0) {
            const hasSiblingSubscription = organizationId
                ? await Subscription.hasNonCancelledByOrganizationAndSubscribableIds(organizationId, SubscribableType.PLAN, siblingIds)
                : await Subscription.hasNonCancelledByUserAndSubscribableIds(uid, SubscribableType.PLAN, siblingIds);
            if (hasSiblingSubscription) {
                return { eligible: false, reason: "ALREADY_SUBSCRIBED_TO_PLAN" };
            }
        }

        const components = await PlanComponent.findByPlanId(planPricing.planId);
        const catalogItemIds = [...new Set(components.map(c => c.catalogItemId))];
        if (catalogItemIds.length === 0) {
            return { eligible: true, reason: "" };
        }

        const itemPlans = await ItemPlan.findByItemIds(catalogItemIds);
        const itemPlanIds = itemPlans.map(ip => ip.id);
        if (itemPlanIds.length === 0) {
            return { eligible: true, reason: "" };
        }

        const hasActiveItem = organizationId
            ? await Subscription.hasNonCancelledByOrganizationAndSubscribableIds(organizationId, SubscribableType.ITEM, itemPlanIds)
            : await Subscription.hasNonCancelledByUserAndSubscribableIds(uid, SubscribableType.ITEM, itemPlanIds);
        if (hasActiveItem) {
            return { eligible: false, reason: "PLAN_CONTAINS_ALREADY_SUBSCRIBED_ITEM" };
        }

        return { eligible: true, reason: "" };
    }

    /**
     * Parses a raw billing cycle string into the enum value.
     * @param raw - Raw billing cycle string
     * @returns Parsed billing cycle or null
     */
    public parseBillingCycle(raw: string): SubscriptionBillingCycle | null {
        const normalized = (raw || "").trim().toLowerCase();
        if (normalized === "monthly" || normalized === "annual") {
            return normalized as SubscriptionBillingCycle;
        }
        return null;
    }

    /**
     * Parses a raw effective mode string into the enum value.
     * @param raw - Raw effective mode string
     * @returns Parsed effective mode or null
     */
    public parseEffectiveMode(raw: string): SubscriptionEffectiveMode | null {
        const normalized = (raw || "").trim().toLowerCase();
        if (normalized === "immediate" || normalized === "period_end") {
            return normalized as SubscriptionEffectiveMode;
        }
        return null;
    }

    /**
     * Converts subscriptions to admin list API items, including owner username and category.
     * @param subscriptions - Subscriptions to convert
     * @returns Admin list items
     */
    public async attachSubscribableNames(subscriptions: Subscription[]): Promise<any[]> {
        if (!subscriptions.length) {
            return [];
        }

        const maps = await this.loadSubscribableNameMaps(subscriptions);

        return subscriptions.map((sub) => {
            const data = sub.toObject();
            data.subscribableName = this.resolveAdminSubscribableName(
                sub,
                maps.itemPlanById,
                maps.catalogItemById,
                maps.planPricingById,
                maps.planById,
            );
            return data;
        });
    }

    public async toAdminListItems(subscriptions: Subscription[]): Promise<any[]> {
        if (!subscriptions.length) {
            return [];
        }

        const userIds = Array.from(new Set(subscriptions.map((sub) => sub.uid).filter(Boolean)));
        const users = await Promise.all(userIds.map((uid) => User.findUserByUID(uid)));
        const usernames = new Map(users.filter((user) => !!user).map((user) => [user.id, user.username]));

        const maps = await this.loadSubscribableNameMaps(subscriptions);

        return subscriptions.map((sub) => {
            const data = sub.toObject();
            data.username = usernames.get(sub.uid) || "";
            data.category = this.resolveAdminListCategory(sub, maps.itemPlanById, maps.catalogItemById);
            data.subscribableName = this.resolveAdminSubscribableName(
                sub,
                maps.itemPlanById,
                maps.catalogItemById,
                maps.planPricingById,
                maps.planById,
            );
            return data;
        });
    }

    private async loadSubscribableNameMaps(subscriptions: Subscription[]): Promise<{
        itemPlanById: Map<string, ItemPlan>;
        catalogItemById: Map<string, CatalogItem>;
        planPricingById: Map<string, PlanPricing>;
        planById: Map<string, Plan>;
    }> {
        const itemSubscribableIds = Array.from(new Set(
            subscriptions
                .filter((sub) => sub.subscribableType === SubscribableType.ITEM)
                .map((sub) => sub.subscribableId)
                .filter(Boolean),
        ));
        const itemPlans = await ItemPlan.findByIds(itemSubscribableIds);
        const itemPlanById = new Map(itemPlans.map((plan) => [plan.id, plan]));
        const catalogItemIds = Array.from(new Set(itemPlans.map((plan) => plan.itemId).filter(Boolean)));
        const catalogItems = await CatalogItem.findByIds(catalogItemIds);
        const catalogItemById = new Map(catalogItems.map((item) => [item.id, item]));

        const planSubscribableIds = Array.from(new Set(
            subscriptions
                .filter((sub) => sub.subscribableType === SubscribableType.PLAN)
                .map((sub) => sub.subscribableId)
                .filter(Boolean),
        ));
        const planPricings = (await Promise.all(planSubscribableIds.map((id) => PlanPricing.findById(id)))).filter((pricing) => !!pricing);
        const planPricingById = new Map(planPricings.map((pricing) => [pricing.id, pricing]));
        const planIds = Array.from(new Set(planPricings.map((pricing) => pricing.planId).filter(Boolean)));
        const plans = (await Promise.all(planIds.map((id) => Plan.findById(id)))).filter((plan) => !!plan);
        const planById = new Map(plans.map((plan) => [plan.id, plan]));

        return { itemPlanById, catalogItemById, planPricingById, planById };
    }

    private resolveAdminSubscribableName(
        sub: Subscription,
        itemPlanById: Map<string, ItemPlan>,
        catalogItemById: Map<string, CatalogItem>,
        planPricingById: Map<string, PlanPricing>,
        planById: Map<string, Plan>,
    ): string {
        if (sub.subscribableType === SubscribableType.PLAN) {
            const planPricing = planPricingById.get(sub.subscribableId);
            if (!planPricing) {
                return "";
            }
            return planById.get(planPricing.planId)?.name || "";
        }

        const itemPlan = itemPlanById.get(sub.subscribableId);
        if (!itemPlan) {
            return "";
        }

        return catalogItemById.get(itemPlan.itemId)?.name || "";
    }

    private resolveAdminListCategory(
        sub: Subscription,
        itemPlanById: Map<string, ItemPlan>,
        catalogItemById: Map<string, CatalogItem>,
    ): SubscriptionCategoryFilter | "" {
        if (sub.subscribableType === SubscribableType.PLAN) {
            return "plan";
        }

        const itemPlan = itemPlanById.get(sub.subscribableId);
        if (!itemPlan) {
            return "product";
        }

        const catalogItem = catalogItemById.get(itemPlan.itemId);
        if (!catalogItem) {
            return "product";
        }

        if (CatalogItem.isServiceCatalogType(catalogItem.type)) {
            return "service";
        }

        return "product";
    }
}
