// Reserved for license

"use strict";

import { Plan, PlanPricingMode, PlanStatus } from "../models/plan";
import { PlanComponent } from "../models/plan-component";
import { PlanPricing } from "../models/plan-pricing";
import { BillingCycle, ItemPlan } from "../models/item-plan";
import { CatalogItem, CatalogItemStatus, CatalogItemVisibility } from "../models/catalog-item";
import { StripeService } from "./stripe-service";
import { Monitor } from "../monitor";
function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export interface PlanInput {
    name: string;
    description?: string;
    status?: PlanStatus;
    pricingMode: PlanPricingMode;
    discountPercent?: number;
    supportConfig?: string;
    planIndex?: number;
    components: CreatePlanComponentInput[];
    monthlyPriceEur?: number;
    annualPriceEur?: number;
}

export interface CreatePlanComponentInput {
    catalogItemId: string;
    usageLimits?: string;
    quantity?: number;
}

export interface PlanDetail {
    plan: Plan;
    components: PlanComponent[];
    pricings: PlanPricing[];
}

/** Admin plan list row with monthly and annual prices from PlanPricing. */
export interface PlanAdminListItemApi {
    id: string;
    name: string;
    description: string;
    pricingMode: string;
    discountPercent: number;
    supportTier: string;
    supportConfig: string;
    superiorPlanId?: string;
    planIndex: number;
    status: string;
    createdAt: number;
    updatedAt: number;
    monthlyPriceEur?: number;
    annualPriceEur?: number;
}

export class PlanService {
    private static instance: PlanService | null = null;

    /**
     * Returns the singleton instance of PlanService.
     * @returns PlanService instance
     */
    public static getInstance(): PlanService {
        if (PlanService.instance) {
            return PlanService.instance;
        }
        PlanService.instance = new PlanService();
        return PlanService.instance;
    }

    /**
     * Converts a price in cents to euros.
     * @param cents - Price in cents
     * @returns Price in euros
     */
    public centsToEur(cents: number): number {
        return Math.max(0, Math.round(cents || 0)) / 100;
    }

    /**
     * Retrieves the full detail of a plan including its components and pricings.
     * @param planId - Plan identifier
     * @returns PlanDetail with plan, components and pricings, or null if not found
     */
    public async getPlanDetail(planId: string): Promise<PlanDetail | null> {
        const plan = await Plan.findById(planId);
        if (!plan) {
            return null;
        }
        const components = await PlanComponent.findByPlanId(planId);
        const pricings = await PlanPricing.findByPlanId(planId);
        return { plan, components, pricings };
    }

    public async getComponentBaseTotalsMap(components: PlanComponent[]): Promise<Record<string, { monthlyCents: number; annualCents: number }>> {
        const totalsByPlanId: Record<string, { monthlyCents: number; annualCents: number }> = {};

        if (!components.length) {
            return totalsByPlanId;
        }

        const itemIds = Array.from(new Set(components.map((component) => component.catalogItemId).filter((itemId) => !!itemId)));
        const itemPlans = await ItemPlan.findByItemIds(itemIds);

        const monthlyPriceByItemId = new Map<string, number>();
        const annualPriceByItemId = new Map<string, number>();

        for (const itemPlan of itemPlans) {
            if (itemPlan.billingCycle === BillingCycle.ANNUAL) {
                annualPriceByItemId.set(itemPlan.itemId, itemPlan.priceCents || 0);
                continue;
            }

            monthlyPriceByItemId.set(itemPlan.itemId, itemPlan.priceCents || 0);
        }

        for (const component of components) {
            if (!totalsByPlanId[component.planId]) {
                totalsByPlanId[component.planId] = {
                    monthlyCents: 0,
                    annualCents: 0,
                };
            }

            const quantity = component.quantity || 1;
            totalsByPlanId[component.planId].monthlyCents += (monthlyPriceByItemId.get(component.catalogItemId) || 0) * quantity;
            totalsByPlanId[component.planId].annualCents += (annualPriceByItemId.get(component.catalogItemId) || 0) * quantity;
        }

        return totalsByPlanId;
    }

    public async getComponentBaseTotals(components: PlanComponent[]): Promise<{ monthlyCents: number; annualCents: number }> {
        if (!components.length) {
            return {
                monthlyCents: 0,
                annualCents: 0,
            };
        }

        const totalsByPlanId = await this.getComponentBaseTotalsMap(components);
        return totalsByPlanId[components[0].planId] || { monthlyCents: 0, annualCents: 0 };
    }

    public async refreshCalculatedPlanPricingsForCatalogItem(catalogItemId: string): Promise<void> {
        const components = await PlanComponent.findByCatalogItemId(catalogItemId);
        const planIds = Array.from(new Set(components.map(component => component.planId).filter(Boolean)));

        for (const planId of planIds) {
            const detail = await this.getPlanDetail(planId);
            if (!detail || detail.plan.pricingMode !== PlanPricingMode.CALCULATED) {
                continue;
            }

            const calculated = await this.calculatePriceFromComponents(detail.components, detail.plan.discountPercent);
            await this.recalculatePricings(detail.plan, calculated.monthlyCents, calculated.annualCents);
        }
    }

    /**
     * Maps plans to admin list API rows with monthly and annual prices.
     * @param plans - Plans to convert
     * @returns Admin list items with price fields when pricings exist
     */
    public async mapPlansToAdminListApi(plans: Plan[]): Promise<PlanAdminListItemApi[]> {
        if (!plans.length) {
            return [];
        }

        const planIds = plans.map((p) => p.id);
        const allPricings = await PlanPricing.findByPlanIds(planIds);
        const pricingsByPlanId = new Map<string, PlanPricing[]>();

        for (const pricing of allPricings) {
            const list = pricingsByPlanId.get(pricing.planId) || [];
            list.push(pricing);
            pricingsByPlanId.set(pricing.planId, list);
        }

        const pricesByPlanId = new Map<string, { monthlyCents: number; annualCents: number }>();
        const calculatedFallbackPlans: Plan[] = [];

        for (const plan of plans) {
            const pricings = pricingsByPlanId.get(plan.id) || [];
            const monthlyCents = this.pricingCentsForCycle(pricings, BillingCycle.MONTHLY);
            const annualCents = this.pricingCentsForCycle(pricings, BillingCycle.ANNUAL);

            if (monthlyCents === 0 && annualCents === 0 && plan.pricingMode === PlanPricingMode.CALCULATED) {
                calculatedFallbackPlans.push(plan);
            }

            pricesByPlanId.set(plan.id, { monthlyCents, annualCents });
        }

        if (calculatedFallbackPlans.length > 0) {
            const fallbackPlanIds = calculatedFallbackPlans.map((plan) => plan.id);
            const fallbackComponents = await PlanComponent.findByPlanIds(fallbackPlanIds);
            const componentsByPlanId = new Map<string, PlanComponent[]>();

            for (const component of fallbackComponents) {
                const list = componentsByPlanId.get(component.planId) || [];
                list.push(component);
                componentsByPlanId.set(component.planId, list);
            }

            const itemPlanPrices = await this.buildItemPlanPriceLookup(fallbackComponents);

            for (const plan of calculatedFallbackPlans) {
                const components = componentsByPlanId.get(plan.id) || [];
                if (components.length > 0) {
                    pricesByPlanId.set(plan.id, this.calculatePriceFromComponentPrices(components, plan.discountPercent, itemPlanPrices));
                }
            }
        }

        return plans.map((plan) => {
            const prices = pricesByPlanId.get(plan.id) || { monthlyCents: 0, annualCents: 0 };
            return this.toPlanAdminListItemApi(plan, prices.monthlyCents, prices.annualCents);
        });
    }

    /**
     * Converts a plan to an admin list API row with resolved monthly and annual prices.
     * @param plan - Plan to convert
     * @param monthlyCents - Monthly price in cents
     * @param annualCents - Annual price in cents
     * @returns Admin list item with optional monthlyPriceEur and annualPriceEur
     */
    public toPlanAdminListItemApi(plan: Plan, monthlyCents: number, annualCents: number): PlanAdminListItemApi {
        const row = plan.toObject() as PlanAdminListItemApi;

        if (monthlyCents > 0) {
            row.monthlyPriceEur = this.centsToEur(monthlyCents);
        }
        if (annualCents > 0) {
            row.annualPriceEur = this.centsToEur(annualCents);
        }

        return row;
    }

    /**
     * @param pricings - Plan pricings to search
     * @param billingCycle - Monthly or annual billing cycle
     * @returns Price in cents or 0 if not found
     */
    private pricingCentsForCycle(pricings: PlanPricing[], billingCycle: BillingCycle): number {
        const pricing = pricings.find((p) => p.billingCycle === billingCycle);
        return pricing ? pricing.priceCents : 0;
    }

    /**
     * Checks whether a given planIndex is already assigned to an existing plan.
     * When planId is provided, that plan is ignored during the check.
     * @param planIndex - Plan index to check
     * @param planId - Optional plan identifier to exclude from the check
     * @returns true if the index is already occupied, false otherwise
     */
    public async isPlanIndexOccupied(planIndex: number, planId?: string): Promise<boolean> {
        const existing = await Plan.findByPlanIndex(planIndex);
        if (!planId) {
            return existing.length > 0;
        }
        return existing.some(plan => plan.id !== planId);
    }

    /**
     * Creates a new plan with its components and Stripe pricings.
     * Creates a single Stripe product for the plan with monthly and annual prices attached.
     * If pricingMode is "calculated", price is computed from component ItemPlans.
     * On failure, performs a rollback of all created resources.
     * @param input - Plan creation data including components and pricing info
     * @returns PlanDetail with the created plan, components and pricings
     */
    public async createPlan(input: PlanInput): Promise<PlanDetail> {
        const stripe = StripeService.getInstance();

        const normalizedDiscountPercent = this.normalizeDiscountPercent(input.pricingMode, input.discountPercent);

        this.validateDiscount(input.pricingMode, normalizedDiscountPercent);
        await this.ensureComponentsReferenceExistingItems(input.components || []);

        const targetStatus = input.status || PlanStatus.DRAFT;
        if (targetStatus === PlanStatus.PUBLISHED) {
            await this.ensurePlanComponentsArePublishable(input.components || []);
        }

        const plan = await Plan.createPlan({
            name: input.name,
            description: input.description,
            status: input.status,
            pricingMode: input.pricingMode,
            discountPercent: normalizedDiscountPercent,
            supportConfig: input.supportConfig,
            planIndex: input.planIndex,
            requiresOrganization: (input.components || []).some((c) => Math.max(1, Math.round(c.quantity || 1)) > 1),
        });

        const components: PlanComponent[] = [];
        for (const comp of input.components || []) {
            await this.validateCatalogItem(comp.catalogItemId);
            const component = await PlanComponent.createComponent({
                planId: plan.id,
                catalogItemId: comp.catalogItemId,
                usageLimits: comp.usageLimits,
                quantity: comp.quantity,
            });
            components.push(component);
        }

        let stripeProductId = "";

        if (stripe.client) {
            const product = await stripe.client.products.create({
                name: plan.name,
                description: plan.description || "",
                metadata: { plan_id: plan.id },
            });
            stripeProductId = product.id;
        }

        const pricings: PlanPricing[] = [];

        try {
            if (input.pricingMode === PlanPricingMode.CALCULATED) {
                const calculated = await this.calculatePriceFromComponents(components, normalizedDiscountPercent);
                const monthlyPricing = await this.createStripePricing(stripe, plan, stripeProductId, BillingCycle.MONTHLY, calculated.monthlyCents);
                const annualPricing = await this.createStripePricing(stripe, plan, stripeProductId, BillingCycle.ANNUAL, calculated.annualCents);
                if (monthlyPricing) { pricings.push(monthlyPricing); }
                if (annualPricing) { pricings.push(annualPricing); }
            } else {
                const monthlyCents = this.eurToCents(input.monthlyPriceEur || 0);
                const annualCents = this.eurToCents(input.annualPriceEur || 0);
                const monthlyPricing = await this.createStripePricing(stripe, plan, stripeProductId, BillingCycle.MONTHLY, monthlyCents);
                const annualPricing = await this.createStripePricing(stripe, plan, stripeProductId, BillingCycle.ANNUAL, annualCents);
                if (monthlyPricing) { pricings.push(monthlyPricing); }
                if (annualPricing) { pricings.push(annualPricing); }
            }
        } catch (ex) {
            await this.rollbackCreatePlan(plan, components, stripeProductId);
            throw ex;
        }

        return { plan, components, pricings };
    }

    /**
     * Updates an existing plan's fields, components and recalculates pricings if needed.
     * Replaces all components if provided. Recalculates Stripe prices when pricing changes.
     * @param planId - Plan identifier to update
     * @param input - Partial plan data with fields to update
     * @returns Updated PlanDetail
     */
    public async updatePlan(planId: string, input: PlanInput): Promise<PlanDetail | null> {
        const plan = await Plan.findById(planId);
        if (!plan) {
            throw new Error("PLAN_NOT_FOUND");
        }

        if (input.components !== undefined) {
            await this.ensureComponentsReferenceExistingItems(input.components);
        }

        const targetStatus = input.status !== undefined ? input.status : plan.status;
        if (targetStatus === PlanStatus.PUBLISHED) {
            const componentsToValidate =
                input.components !== undefined ? input.components : this.mapPlanComponentsToInputs(await PlanComponent.findByPlanId(planId));
            await this.ensurePlanComponentsArePublishable(componentsToValidate);
        }

        if (input.name !== undefined) { plan.name = input.name; }
        if (input.description !== undefined) { plan.description = input.description; }
        if (input.status !== undefined) { plan.status = input.status; }
        if (input.pricingMode !== undefined) { plan.pricingMode = input.pricingMode; }
        if (plan.pricingMode === PlanPricingMode.CALCULATED) {
            if (input.discountPercent !== undefined) { plan.discountPercent = input.discountPercent; }
        } else {
            plan.discountPercent = 0;
        }
        if (input.supportConfig !== undefined) { plan.supportConfig = input.supportConfig; }
        if (input.planIndex !== undefined) { plan.planIndex = input.planIndex; }
        if (input.components !== undefined) { plan.requiresOrganization = input.components.some((c) => Math.max(1, Math.round(c.quantity || 1)) > 1); }
        plan.updatedAt = Date.now();

        plan.discountPercent = this.normalizeDiscountPercent(plan.pricingMode, plan.discountPercent);
        this.validateDiscount(plan.pricingMode, plan.discountPercent);
        await plan.save();

        if (input.components !== undefined) {
            await PlanComponent.deleteByPlanId(planId);
            for (const comp of input.components) {
                await this.validateCatalogItem(comp.catalogItemId);
                await PlanComponent.createComponent({
                    planId: planId,
                    catalogItemId: comp.catalogItemId,
                    usageLimits: comp.usageLimits,
                    quantity: comp.quantity,
                });
            }
        }

        if (input.pricingMode === PlanPricingMode.CALCULATED || (input.pricingMode === undefined && plan.pricingMode === PlanPricingMode.CALCULATED)) {
            const components = await PlanComponent.findByPlanId(planId);
            const discount = input.discountPercent ?? plan.discountPercent;
            const calculated = await this.calculatePriceFromComponents(components, discount);
            await this.recalculatePricings(plan, calculated.monthlyCents, calculated.annualCents);
        } else if (input.monthlyPriceEur !== undefined || input.annualPriceEur !== undefined) {
            const existingPricings = await PlanPricing.findByPlanId(planId);
            const monthlyCents = this.eurToCents(input.monthlyPriceEur ?? this.centsToEur(this.findPricingCents(existingPricings, BillingCycle.MONTHLY)));
            const annualCents = this.eurToCents(input.annualPriceEur ?? this.centsToEur(this.findPricingCents(existingPricings, BillingCycle.ANNUAL)));
            await this.recalculatePricings(plan, monthlyCents, annualCents);
        }

        return await this.getPlanDetail(planId);
    }

    public async ensurePlanComponentsArePublishable(components: CreatePlanComponentInput[]): Promise<void> {
        const itemsById = await this.ensureComponentsReferenceExistingItems(components);

        for (const comp of components) {
            const item = itemsById.get(comp.catalogItemId);
            if (!item) {
                throw new Error("CATALOG_ITEM_NOT_FOUND");
            }
            if (item.status !== CatalogItemStatus.PUBLISHED || item.visibility !== CatalogItemVisibility.PUBLIC) {
                throw new Error("COMPONENT_NOT_PUBLISHABLE");
            }
        }
    }

    /**
     * Deletes a plan and all its associated components, pricings and Stripe resources.
     * Archives Stripe prices and the shared Stripe product before removing local records.
     * @param planId - Plan identifier to delete
     */
    public async deletePlan(planId: string): Promise<void> {
        const plan = await Plan.findById(planId);
        if (!plan) {
            throw new Error("PLAN_NOT_FOUND");
        }

        const stripe = StripeService.getInstance();
        const pricings = await PlanPricing.findByPlanId(planId);

        let stripeProductId = "";
        for (const pricing of pricings) {
            if (pricing.stripePriceId && stripe.client) {
                try {
                    if (!stripeProductId) {
                        const stripePrice = await stripe.client.prices.retrieve(pricing.stripePriceId);
                        stripeProductId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product?.id || "";
                    }
                    await stripe.client.prices.update(pricing.stripePriceId, { active: false });
                } catch (ex) {
                    Monitor.warning(`[PLAN] Failed to archive stripe price ${pricing.stripePriceId}: ${getErrorMessage(ex)}`);
                }
            }
            await pricing.delete();
        }

        if (stripeProductId && stripe.client) {
            try {
                await stripe.client.products.update(stripeProductId, { active: false });
            } catch (ex) {
                Monitor.warning(`[PLAN] Failed to archive stripe product ${stripeProductId}: ${getErrorMessage(ex)}`);
            }
        }

        await PlanComponent.deleteByPlanId(planId);
        await plan.delete();
    }

    /**
     * Sets a plan's status to Archived.
     * @param planId - Plan identifier
     * @returns Updated Plan
     */
    public async archivePlan(planId: string): Promise<Plan> {
        const plan = await Plan.findById(planId);
        if (!plan) {
            throw new Error("PLAN_NOT_FOUND");
        }
        plan.status = PlanStatus.ARCHIVED;
        plan.updatedAt = Date.now();
        await plan.save();
        return plan;
    }

    /**
     * Validates that the discount percent is within 0-100 range for calculated pricing mode.
     * @param pricingMode - The pricing mode of the plan
     * @param discountPercent - The discount percentage to validate
     */
    private validateDiscount(pricingMode: string, discountPercent: number): void {
        if (pricingMode === PlanPricingMode.CALCULATED) {
            if (discountPercent < 0 || discountPercent > 100) {
                throw new Error("INVALID_DISCOUNT_PERCENT");
            }
        }
    }

    /**
     * Validates that a CatalogItem exists by its identifier.
     * @param catalogItemId - CatalogItem identifier
     */
    private async validateCatalogItem(catalogItemId: string): Promise<void> {
        const item = await CatalogItem.findById(catalogItemId);
        if (!item) {
            throw new Error("CATALOG_ITEM_NOT_FOUND");
        }
    }

    private async ensureComponentsReferenceExistingItems(components: CreatePlanComponentInput[]): Promise<Map<string, CatalogItem>> {
        const catalogItemIds = Array.from(new Set((components || []).map((component) => component.catalogItemId).filter(Boolean)));
        const items = await CatalogItem.findByIds(catalogItemIds);
        const itemsById = new Map<string, CatalogItem>(items.map((item) => [item.id, item]));

        for (const component of components || []) {
            if (!itemsById.has(component.catalogItemId)) {
                throw new Error("CATALOG_ITEM_NOT_FOUND");
            }
        }

        return itemsById;
    }

    private mapPlanComponentsToInputs(components: PlanComponent[]): CreatePlanComponentInput[] {
        return components.map((component) => ({
            catalogItemId: component.catalogItemId,
            usageLimits: component.usageLimits || undefined,
            quantity: component.quantity || 1,
        }));
    }

    /**
     * Calculates the plan price from its components by summing ItemPlan prices
     * and applying the discount factor.
     * @param components - List of PlanComponents to sum prices for
     * @param discountPercent - Discount percentage to apply (0-100)
     * @returns Object with monthlyCents and annualCents after discount
     */
    private async calculatePriceFromComponents(components: PlanComponent[], discountPercent: number): Promise<{ monthlyCents: number; annualCents: number }> {
        const itemPlanPrices = await this.buildItemPlanPriceLookup(components);
        return this.calculatePriceFromComponentPrices(components, discountPercent, itemPlanPrices);
    }

    /**
     * Builds a lookup of catalog item prices for the supplied plan components.
     * @param components - Plan components whose catalog items need prices
     * @returns Map by catalog item ID and billing cycle
     */
    private async buildItemPlanPriceLookup(components: PlanComponent[]): Promise<Map<string, Map<BillingCycle, number>>> {
        const catalogItemIds = Array.from(new Set(
            components.map((component) => component.catalogItemId).filter(Boolean),
        ));
        const itemPlans = await ItemPlan.findByItemIds(catalogItemIds);
        const prices = new Map<string, Map<BillingCycle, number>>();

        for (const itemPlan of itemPlans) {
            const itemPrices = prices.get(itemPlan.itemId) || new Map<BillingCycle, number>();
            itemPrices.set(itemPlan.billingCycle, itemPlan.priceCents || 0);
            prices.set(itemPlan.itemId, itemPrices);
        }

        return prices;
    }

    /**
     * Calculates component-based plan prices from a preloaded item price lookup.
     * @param components - Plan components to price
     * @param discountPercent - Discount percentage to apply (0-100)
     * @param itemPlanPrices - Preloaded item prices by catalog item and cycle
     * @returns Object with monthlyCents and annualCents after discount
     */
    private calculatePriceFromComponentPrices(
        components: PlanComponent[],
        discountPercent: number,
        itemPlanPrices: Map<string, Map<BillingCycle, number>>,
    ): { monthlyCents: number; annualCents: number } {
        let monthlyTotal = 0;
        let annualTotal = 0;

        for (const component of components) {
            const itemPrices = itemPlanPrices.get(component.catalogItemId);
            const qty = component.quantity || 1;
            monthlyTotal += (itemPrices?.get(BillingCycle.MONTHLY) || 0) * qty;
            annualTotal += (itemPrices?.get(BillingCycle.ANNUAL) || 0) * qty;
        }

        const factor = (100 - discountPercent) / 100;
        return {
            monthlyCents: Math.max(0, Math.round(monthlyTotal * factor)),
            annualCents: Math.max(0, Math.round(annualTotal * factor)),
        };
    }

    private normalizeDiscountPercent(pricingMode: PlanPricingMode, discountPercent?: number): number {
        if (pricingMode !== PlanPricingMode.CALCULATED) {
            return 0;
        }

        return Math.min(100, Math.max(0, Math.round(Number(discountPercent || 0))));
    }

    /**
     * Creates a Stripe price on an existing product for a plan billing cycle,
     * then stores the PlanPricing locally.
     * The Stripe product is created once per plan and shared across billing cycles.
     * @param stripe - StripeService instance
     * @param plan - The Plan to create pricing for
     * @param stripeProductId - Existing Stripe product ID to attach the price to
     * @param billingCycle - Monthly or Annual
     * @param priceCents - Price in cents
     * @returns Created PlanPricing or null if Stripe is not configured
     */
    private async createStripePricing(stripe: StripeService, plan: Plan, stripeProductId: string, billingCycle: BillingCycle, priceCents: number): Promise<PlanPricing | null> {
        let stripePriceId = "";

        if (stripe.client && stripeProductId) {
            const price = await stripe.client.prices.create({
                currency: "eur",
                unit_amount: priceCents,
                recurring: { interval: billingCycle === BillingCycle.ANNUAL ? "year" : "month" },
                product: stripeProductId,
                metadata: { plan_id: plan.id, billing_cycle: billingCycle },
            });
            stripePriceId = price.id;
        }

        return PlanPricing.createPricing({
            planId: plan.id,
            billingCycle,
            priceCents,
            stripePriceId,
        });
    }

    /**
     * Recalculates and updates existing PlanPricings for a plan.
     * Creates new Stripe prices and archives old ones when the amount changes.
     * @param plan - The Plan whose pricings to recalculate
     * @param monthlyCents - New monthly price in cents
     * @param annualCents - New annual price in cents
     */
    private async recalculatePricings(plan: Plan, monthlyCents: number, annualCents: number): Promise<void> {
        const stripe = StripeService.getInstance();
        const existingPricings = await PlanPricing.findByPlanId(plan.id);

        for (const pricing of existingPricings) {
            const newCents = pricing.billingCycle === BillingCycle.ANNUAL ? annualCents : monthlyCents;

            if (pricing.priceCents !== newCents) {
                if (pricing.stripePriceId && stripe.client) {
                    let stripeProductId = "";
                    try {
                        const oldPrice = await stripe.client.prices.retrieve(pricing.stripePriceId);
                        stripeProductId = typeof oldPrice.product === "string" ? oldPrice.product : oldPrice.product?.id || "";
                    } catch (ex) {
                        Monitor.warning(`[PLAN] Failed to retrieve old stripe price: ${getErrorMessage(ex)}`);
                    }

                    if (stripeProductId) {
                        const newPrice = await stripe.client.prices.create({
                            currency: "eur",
                            unit_amount: newCents,
                            recurring: { interval: pricing.billingCycle === BillingCycle.ANNUAL ? "year" : "month" },
                            product: stripeProductId,
                            metadata: { plan_id: plan.id, billing_cycle: pricing.billingCycle },
                        });

                        try {
                            await stripe.client.prices.update(pricing.stripePriceId, { active: false });
                        } catch (ex) {
                            Monitor.warning(`[PLAN] Failed to archive old stripe price: ${getErrorMessage(ex)}`);
                        }

                        pricing.stripePriceId = newPrice.id;
                    }
                }

                pricing.priceCents = newCents;
                pricing.updatedAt = Date.now();
                await pricing.save();
            }
        }
    }

    /**
     * Finds the price in cents for a specific billing cycle from a list of pricings.
     * @param pricings - List of PlanPricings to search
     * @param billingCycle - Billing cycle to find
     * @returns Price in cents or 0 if not found
     */
    private findPricingCents(pricings: PlanPricing[], billingCycle: BillingCycle): number {
        const p = pricings.find(pr => pr.billingCycle === billingCycle);
        return p ? p.priceCents : 0;
    }

    /**
     * Converts a price in euros to cents.
     * @param value - Price in euros
     * @returns Price in cents
     */
    private eurToCents(value: number): number {
        return Math.max(0, Math.round(Number(value || 0) * 100));
    }

    /**
     * Rolls back a failed plan creation by deleting components, pricings,
     * archiving Stripe prices and the shared Stripe product, and removing the plan itself.
     * @param plan - The Plan to roll back
     * @param components - Components already created to remove
     * @param stripeProductId - Stripe product ID to archive (shared across billing cycles)
     */
    private async rollbackCreatePlan(plan: Plan, components: PlanComponent[], stripeProductId: string): Promise<void> {
        const stripe = StripeService.getInstance();

        for (const component of components) {
            try { await component.delete(); } catch (ex) {
                Monitor.warning(`[PLAN] Rollback: failed to delete component ${component.id}: ${getErrorMessage(ex)}`);
            }
        }

        const pricings = await PlanPricing.findByPlanId(plan.id);
        for (const pricing of pricings) {
            if (pricing.stripePriceId && stripe.client) {
                try { await stripe.client.prices.update(pricing.stripePriceId, { active: false }); } catch (ex) {
                    Monitor.warning(`[PLAN] Rollback: failed to archive stripe price ${pricing.stripePriceId}: ${getErrorMessage(ex)}`);
                }
            }
            try { await pricing.delete(); } catch (ex) {
                Monitor.warning(`[PLAN] Rollback: failed to delete pricing ${pricing.id}: ${getErrorMessage(ex)}`);
            }
        }

        if (stripeProductId && stripe.client) {
            try { await stripe.client.products.update(stripeProductId, { active: false }); } catch (ex) {
                Monitor.warning(`[PLAN] Rollback: failed to archive stripe product ${stripeProductId}: ${getErrorMessage(ex)}`);
            }
        }

        try { await plan.delete(); } catch (ex) {
            Monitor.warning(`[PLAN] Rollback: failed to delete plan ${plan.id}: ${getErrorMessage(ex)}`);
        }
    }
}
