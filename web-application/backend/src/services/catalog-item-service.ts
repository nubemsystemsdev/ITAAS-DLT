// Reserved for license

"use strict";

import { ObjectSchema } from "@asanrom/javascript-object-sanitizer";
import {
    CatalogItem,
    CatalogItemStatus,
    CatalogItemType,
    CatalogItemVisibility,
    CUSTOM_AGENT_DEFAULT_DEPOSIT_CENTS,
    CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS,
    CUSTOM_AGENT_ITEM_ID,
    ITAAS_PLATFORM_DEFAULT_ANNUAL_CENTS,
    ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS,
    ITAAS_PLATFORM_ITEM_ID,
} from "../models/catalog-item";
import { BillingCycle, ItemPlan } from "../models/item-plan";
import { StripeService } from "./stripe-service";
import { PlanService } from "./plan-service";
import { TraceabilityService } from "./traceability-service";
import { Monitor } from "../monitor";
import { isEnumValue } from "../utils/api-utils";

const NAME_MAX_LENGTH = 100;
const SHORT_DESC_MAX_LENGTH = 300;
const LONG_DESC_MAX_LENGTH = 5000;

export interface CatalogAdminItemApi {
    id: string;
    type: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    annualPriceEur?: number;
    depositPriceEur?: number;
    status: string;
    visibility: string;
    createdAt: number;
}
export interface CreateCatalogItemWithPricingInput {
    type: CatalogItemType;
    name: string;
    shortDescription: string;
    longDescription?: string;
    status?: CatalogItemStatus;
    visibility?: CatalogItemVisibility;
    monthlyPriceEur: number;
    annualPriceEur: number;
}

export interface CreateCatalogItemWithPricingResult {
    item: CatalogItem;
    monthlyPlan: ItemPlan;
    annualPlan: ItemPlan;
}

export interface UpdateCatalogItemWithPricingInput {
    itemId: string;
    type: CatalogItemType;
    name: string;
    shortDescription: string;
    longDescription?: string;
    status: CatalogItemStatus;
    visibility: CatalogItemVisibility;
    monthlyPriceEur: number;
    annualPriceEur: number;
}

export interface CustomAgentServicePricing {
    monthlyPriceCents: number;
    depositCents: number;
    stripePriceId: string;
}

export class CatalogItemTraceabilityUpdateError extends Error {
    public readonly code: "UPDATE_TRACEABILITY_FAILED" | "UPDATE_TRACEABILITY_ROLLBACK_FAILED";

    public constructor(
        code: "UPDATE_TRACEABILITY_FAILED" | "UPDATE_TRACEABILITY_ROLLBACK_FAILED",
        message: string,
    ) {
        super(message);
        this.code = code;
    }
}

export class CatalogItemService {
    private static instance: CatalogItemService | null = null;

    public static getInstance(): CatalogItemService {
        if (CatalogItemService.instance) {
            return CatalogItemService.instance;
        }
        CatalogItemService.instance = new CatalogItemService();
        return CatalogItemService.instance;
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
     * Converts a CatalogItem to an API response object, transforming price from cents to euros.
     * @param item - CatalogItem to convert
     * @returns API-friendly object with price in euros
     */
    public toCatalogItemApi(item: CatalogItem): {
        id: string;
        type: string;
        name: string;
        shortDescription: string;
        longDescription: string;
        price: number;
        status: string;
        visibility: string;
        createdAt: number;
    } {
        return {
            id: item.id,
            type: item.type,
            name: item.name,
            shortDescription: item.shortDescription,
            longDescription: item.longDescription,
            price: this.centsToEur(item.price),
            status: item.status,
            visibility: item.visibility,
            createdAt: item.createdAt,
        };
    }

    /**
     * Ensures the ITAAS Platform catalog item and its pricing plans exist.
     * Seeds default prices (30 EUR / month, 300 EUR / year) and syncs Stripe when configured.
     * Called at startup to seed the default platform entry.
     */
    public async ensureItaasPlatformItem(): Promise<void> {
        const item = await CatalogItem.getOrCreateItaasPlatform();

        let monthly = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthly) {
            monthly = await ItemPlan.createPlan({
                itemId: item.id,
                billingCycle: BillingCycle.MONTHLY,
                priceCents: ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS,
                stripePriceId: "",
            });
        }

        let annual = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.ANNUAL);
        if (!annual) {
            annual = await ItemPlan.createPlan({
                itemId: item.id,
                billingCycle: BillingCycle.ANNUAL,
                priceCents: ITAAS_PLATFORM_DEFAULT_ANNUAL_CENTS,
                stripePriceId: "",
            });
        }

        await this.applyItaasPlatformDefaultPricingIfUnset(item, monthly, annual);

        try {
            await this.syncCatalogItemStripePricing(item, monthly, annual);
        } catch (ex) {
            Monitor.exception(ex);
        }

        try {
            const visibility = item.visibility === CatalogItemVisibility.HIDDEN ? BigInt(1) : BigInt(0);
            await TraceabilityService.getInstance().ensureCatalogItemOnChain(item.id, visibility);
        } catch (ex) {
            Monitor.exception(ex);
        }
    }

    /**
     * Ensures the custom agent service catalog item and its monthly pricing plan exist.
     * Hidden from the public catalog; prices are edited by superadmin only.
     */
    public async ensureCustomAgentServiceItem(): Promise<void> {
        const item = await CatalogItem.getOrCreateCustomAgentService();

        let monthly = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthly) {
            monthly = await ItemPlan.createPlan({
                itemId: item.id,
                billingCycle: BillingCycle.MONTHLY,
                priceCents: CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS,
                stripePriceId: "",
            });
        }

        await this.applyCustomAgentServiceDefaultPricingIfUnset(item, monthly);

        try {
            await this.syncCustomAgentServiceStripePricing(item, monthly);
        } catch (ex) {
            Monitor.exception(ex);
        }

        try {
            const visibility = item.visibility === CatalogItemVisibility.HIDDEN ? BigInt(1) : BigInt(0);
            await TraceabilityService.getInstance().ensureCatalogItemOnChain(item.id, visibility);
        } catch (ex) {
            Monitor.exception(ex);
        }
    }

    /**
     * Returns the global custom agent pricing (monthly subscription + deposit).
     */
    public async getCustomAgentServicePricing(): Promise<CustomAgentServicePricing> {
        const item = await CatalogItem.getOrCreateCustomAgentService();
        const monthly = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthly) {
            throw new Error("PRICING_PLAN_NOT_FOUND");
        }

        return {
            monthlyPriceCents: monthly.priceCents,
            depositCents: item.depositCents,
            stripePriceId: monthly.stripePriceId || "",
        };
    }

    /**
     * Updates global custom agent monthly price and deposit. Syncs Stripe for the monthly plan.
     * @param monthlyPriceCents - Monthly subscription amount in cents
     * @param depositCents - One-time deposit amount in cents
     */
    public async updateCustomAgentServicePricing(monthlyPriceCents: number, depositCents: number): Promise<CustomAgentServicePricing> {
        const item = await CatalogItem.getOrCreateCustomAgentService();
        const monthly = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthly) {
            throw new Error("PRICING_PLAN_NOT_FOUND");
        }

        const normalizedMonthly = Math.max(0, Math.round(monthlyPriceCents || 0));
        const normalizedDeposit = Math.max(0, Math.round(depositCents || 0));
        if (normalizedMonthly <= 0) {
            throw new Error("INVALID_MONTHLY_PRICE");
        }
        if (normalizedDeposit <= 0) {
            throw new Error("INVALID_DEPOSIT_PRICE");
        }

        const previous = {
            price: item.price,
            depositCents: item.depositCents,
            monthlyPriceCents: monthly.priceCents,
            monthlyStripePriceId: monthly.stripePriceId,
            monthlyUpdatedAt: monthly.updatedAt,
        };

        item.price = normalizedMonthly;
        item.depositCents = normalizedDeposit;
        await item.save();

        try {
            const stripe = StripeService.getInstance();
            if (stripe.client) {
                const stripeProductId = await this.resolveOrCreateStripeProductId(item, monthly, monthly);
                await this.applyItemPlanStripePriceUpdate(item, monthly, stripeProductId, normalizedMonthly, BillingCycle.MONTHLY);
            } else {
                monthly.priceCents = normalizedMonthly;
                monthly.updatedAt = Date.now();
                await monthly.save();
            }
        } catch (ex) {
            item.price = previous.price;
            item.depositCents = previous.depositCents;
            await item.save();

            monthly.priceCents = previous.monthlyPriceCents;
            monthly.stripePriceId = previous.monthlyStripePriceId;
            monthly.updatedAt = previous.monthlyUpdatedAt;
            await monthly.save();
            throw ex;
        }

        return {
            monthlyPriceCents: normalizedMonthly,
            depositCents: normalizedDeposit,
            stripePriceId: monthly.stripePriceId || "",
        };
    }

    /**
     * Updates a catalog item from the admin API input and records its state in traceability.
     * Rolls back the catalog update if the traceability update fails.
     * @param item - Existing catalog item to update
     * @param input - Untrusted update input from the API
     */
    public async updateCatalogItemFromInput(item: CatalogItem, input: unknown): Promise<void> {
        if (CatalogItem.isCustomAgentServiceItem(item)) {
            await this.updateCustomAgentServiceCatalogItemFromInput(item, input);
            return;
        }

        const monthlyPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        const annualPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.ANNUAL);
        if (!monthlyPlan || !annualPlan) {
            throw new Error("INVALID_REQUEST");
        }

        const body = ObjectSchema.object({
            type: ObjectSchema.string().withDefaultValue(item.type),
            name: ObjectSchema.string().withDefaultValue(item.name),
            shortDescription: ObjectSchema.string().withDefaultValue(item.shortDescription),
            longDescription: ObjectSchema.string().withDefaultValue(item.longDescription),
            monthlyPriceEur: ObjectSchema.number().withDefaultValue(this.centsToEur(monthlyPlan.priceCents)),
            annualPriceEur: ObjectSchema.number().withDefaultValue(this.centsToEur(annualPlan.priceCents)),
            status: ObjectSchema.string().withDefaultValue(item.status),
            visibility: ObjectSchema.string().withDefaultValue(item.visibility),
        }).sanitize(input);
        this.validateCatalogItemMetadata(body);

        if (body.type !== item.type) {
            if (CatalogItem.isProtectedCatalogItem(item) || this.isProtectedCatalogItemType(body.type)) {
                throw new Error("PROTECTED");
            }
        }
        if (!Number.isFinite(body.annualPriceEur) || body.annualPriceEur <= 0) {
            throw new Error("INVALID_ANNUAL_PRICE");
        }
        if (!isEnumValue(CatalogItemVisibility, body.visibility)) {
            throw new Error("INVALID_VISIBILITY");
        }

        const updateInput: UpdateCatalogItemWithPricingInput = {
            itemId: item.id,
            type: body.type as CatalogItemType,
            name: body.name.trim(),
            shortDescription: body.shortDescription.trim(),
            longDescription: body.longDescription,
            status: body.status as CatalogItemStatus,
            visibility: body.visibility as CatalogItemVisibility,
            monthlyPriceEur: body.monthlyPriceEur,
            annualPriceEur: body.annualPriceEur,
        };
        const rollbackInput: UpdateCatalogItemWithPricingInput = {
            itemId: item.id,
            type: item.type as CatalogItemType,
            name: item.name,
            shortDescription: item.shortDescription,
            longDescription: item.longDescription,
            status: item.status as CatalogItemStatus,
            visibility: item.visibility as CatalogItemVisibility,
            monthlyPriceEur: this.centsToEur(monthlyPlan.priceCents),
            annualPriceEur: this.centsToEur(annualPlan.priceCents),
        };

        await this.updateCatalogItemWithPricing(updateInput);
        const visibility = body.visibility === CatalogItemVisibility.HIDDEN ? BigInt(1) : BigInt(0);
        await this.syncCatalogItemTraceability(item.id, body.status as CatalogItemStatus, visibility, async () => {
            await this.updateCatalogItemWithPricing(rollbackInput);
        });
    }

    /**
     * Updates the protected custom agent service catalog item (metadata + global pricing).
     */
    public async updateCustomAgentServiceCatalogItem(input: {
        name: string;
        shortDescription: string;
        longDescription?: string;
        status: CatalogItemStatus;
        monthlyPriceEur: number;
        depositPriceEur: number;
    }): Promise<{ item: CatalogItem; monthlyPlan: ItemPlan }> {
        const item = await CatalogItem.getOrCreateCustomAgentService();
        const monthly = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthly) {
            throw new Error("PRICING_PLAN_NOT_FOUND");
        }

        const normalizedMonthly = this.eurToCents(input.monthlyPriceEur);
        const normalizedDeposit = this.eurToCents(input.depositPriceEur);
        if (normalizedMonthly <= 0) {
            throw new Error("INVALID_MONTHLY_PRICE");
        }
        if (normalizedDeposit <= 0) {
            throw new Error("INVALID_DEPOSIT_PRICE");
        }

        const previous = {
            name: item.name,
            shortDescription: item.shortDescription,
            longDescription: item.longDescription,
            status: item.status,
            visibility: item.visibility,
            price: item.price,
            depositCents: item.depositCents,
            monthlyPriceCents: monthly.priceCents,
            monthlyStripePriceId: monthly.stripePriceId,
            monthlyUpdatedAt: monthly.updatedAt,
        };

        item.name = input.name;
        item.shortDescription = input.shortDescription;
        item.longDescription = input.longDescription || "";
        item.status = input.status;
        item.visibility = CatalogItemVisibility.HIDDEN;
        item.price = normalizedMonthly;
        item.depositCents = normalizedDeposit;
        await item.save();

        try {
            const stripe = StripeService.getInstance();
            if (stripe.client) {
                const stripeProductId = await this.resolveOrCreateStripeProductId(item, monthly, monthly);
                await this.applyItemPlanStripePriceUpdate(item, monthly, stripeProductId, normalizedMonthly, BillingCycle.MONTHLY);
            } else {
                monthly.priceCents = normalizedMonthly;
                monthly.updatedAt = Date.now();
                await monthly.save();
            }
        } catch (ex) {
            item.name = previous.name;
            item.shortDescription = previous.shortDescription;
            item.longDescription = previous.longDescription;
            item.status = previous.status;
            item.visibility = previous.visibility;
            item.price = previous.price;
            item.depositCents = previous.depositCents;
            await item.save();

            monthly.priceCents = previous.monthlyPriceCents;
            monthly.stripePriceId = previous.monthlyStripePriceId;
            monthly.updatedAt = previous.monthlyUpdatedAt;
            await monthly.save();
            throw ex;
        }

        return { item, monthlyPlan: monthly };
    }

    private async updateCustomAgentServiceCatalogItemFromInput(item: CatalogItem, input: unknown): Promise<void> {
        const monthlyPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        if (!monthlyPlan) {
            throw new Error("INVALID_REQUEST");
        }

        const body = ObjectSchema.object({
            type: ObjectSchema.string().withDefaultValue(item.type),
            name: ObjectSchema.string().withDefaultValue(item.name),
            shortDescription: ObjectSchema.string().withDefaultValue(item.shortDescription),
            longDescription: ObjectSchema.string().withDefaultValue(item.longDescription),
            monthlyPriceEur: ObjectSchema.number().withDefaultValue(this.centsToEur(monthlyPlan.priceCents)),
            depositPriceEur: ObjectSchema.number().withDefaultValue(this.centsToEur(item.depositCents)),
            status: ObjectSchema.string().withDefaultValue(item.status),
        }).sanitize(input);
        this.validateCatalogItemMetadata(body);

        if (body.type !== item.type) {
            throw new Error("PROTECTED");
        }
        if (body.status === CatalogItemStatus.ARCHIVED) {
            throw new Error("PROTECTED");
        }
        if (!Number.isFinite(body.depositPriceEur) || body.depositPriceEur <= 0) {
            throw new Error("INVALID_DEPOSIT_PRICE");
        }

        const updateInput = {
            name: body.name.trim(),
            shortDescription: body.shortDescription.trim(),
            longDescription: body.longDescription,
            status: body.status as CatalogItemStatus,
            monthlyPriceEur: body.monthlyPriceEur,
            depositPriceEur: body.depositPriceEur,
        };
        const rollbackInput = {
            name: item.name,
            shortDescription: item.shortDescription,
            longDescription: item.longDescription,
            status: item.status as CatalogItemStatus,
            monthlyPriceEur: this.centsToEur(monthlyPlan.priceCents),
            depositPriceEur: this.centsToEur(item.depositCents),
        };

        await this.updateCustomAgentServiceCatalogItem(updateInput);
        await this.syncCatalogItemTraceability(item.id, body.status as CatalogItemStatus, BigInt(1), async () => {
            await this.updateCustomAgentServiceCatalogItem(rollbackInput);
        });
    }

    private validateCatalogItemMetadata(body: {
        type: string;
        name: string;
        shortDescription: string;
        longDescription: string;
        monthlyPriceEur: number;
        status: string;
    }): void {
        if (!isEnumValue(CatalogItemType, body.type)) {
            throw new Error("INVALID_TYPE");
        }
        const name = (body.name || "").trim();
        const shortDescription = (body.shortDescription || "").trim();
        if (!name || name.length > NAME_MAX_LENGTH) {
            throw new Error("INVALID_NAME");
        }
        if (!shortDescription || shortDescription.length > SHORT_DESC_MAX_LENGTH) {
            throw new Error("INVALID_SHORT_DESCRIPTION");
        }
        if (body.longDescription && body.longDescription.length > LONG_DESC_MAX_LENGTH) {
            throw new Error("INVALID_LONG_DESCRIPTION");
        }
        if (!Number.isFinite(body.monthlyPriceEur) || body.monthlyPriceEur <= 0) {
            throw new Error("INVALID_MONTHLY_PRICE");
        }
        if (!isEnumValue(CatalogItemStatus, body.status)) {
            throw new Error("INVALID_STATUS");
        }
    }

    private isProtectedCatalogItemType(type: string): boolean {
        return type === CatalogItemType.ITAAS_PLATFORM || type === CatalogItemType.CUSTOM_AGENT_SERVICE;
    }

    private async syncCatalogItemTraceability(
        itemId: string,
        status: CatalogItemStatus,
        visibility: bigint,
        rollback: () => Promise<void>,
    ): Promise<void> {
        try {
            await TraceabilityService.getInstance().syncCatalogItemState(itemId, status, visibility, true);
        } catch (ex) {
            const traceabilityMessage = ex instanceof Error ? ex.message : "Failed to record catalog item update";

            try {
                await rollback();
            } catch (error_) {
                const rollbackMessage = error_ instanceof Error ? error_.message : "Failed to rollback catalog item update";
                throw new CatalogItemTraceabilityUpdateError(
                    "UPDATE_TRACEABILITY_ROLLBACK_FAILED",
                    `${traceabilityMessage}. Rollback failed: ${rollbackMessage}`,
                );
            }

            throw new CatalogItemTraceabilityUpdateError("UPDATE_TRACEABILITY_FAILED", traceabilityMessage);
        }
    }

    /*
     * Converts a CatalogItem to an admin API response, including annual pricing when available.
     * @param item - CatalogItem to convert
     * @param annualPriceEur - Annual price in EUR from the annual ItemPlan
     * @returns API-friendly admin catalog item
     */
    public toCatalogAdminItemApi(item: CatalogItem, annualPriceEur?: number): CatalogAdminItemApi {
        const data = this.toCatalogItemApi(item) as CatalogAdminItemApi;
        if (annualPriceEur !== undefined) {
            data.annualPriceEur = annualPriceEur;
        }
        if (CatalogItem.isCustomAgentServiceItem(item)) {
            data.depositPriceEur = this.centsToEur(item.depositCents);
        }
        return data;
    }

    /**
     * Maps catalog items to admin API responses with monthly and annual prices.
     * @param items - Catalog items to convert
     * @returns Admin API items with annualPriceEur when an annual plan exists
     */
    public async mapItemsToAdminApi(items: CatalogItem[]): Promise<CatalogAdminItemApi[]> {
        if (!items.length) {
            return [];
        }

        const itemIds = items.map((i) => i.id);
        const plans = await ItemPlan.findByItemIds(itemIds);
        const annualPriceByItemId = new Map<string, number>();

        for (const plan of plans) {
            if (plan.billingCycle === BillingCycle.ANNUAL) {
                annualPriceByItemId.set(plan.itemId, this.centsToEur(plan.priceCents));
            }
        }

        return items.map((item) => this.toCatalogAdminItemApi(item, annualPriceByItemId.get(item.id)));
    }

    /**
     * Creates a catalog item with monthly and annual pricing plans in Stripe and the database.
     * On failure, performs a rollback of all created resources.
     * @param input - Catalog item creation data with pricing
     * @returns Created item with monthly and annual plans
     */
    public async createCatalogItemWithPricing(input: CreateCatalogItemWithPricingInput): Promise<CreateCatalogItemWithPricingResult> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const monthlyPriceCents = this.eurToCents(input.monthlyPriceEur);
        const annualPriceCents = this.eurToCents(input.annualPriceEur);

        const product = await stripe.client.products.create({
            name: input.name,
            description: input.shortDescription || "",
            metadata: {
                item_type: input.type,
            },
        });

        let item: CatalogItem | null = null;
        let monthlyStripePriceId = "";
        let annualStripePriceId = "";
        let monthlyPlan: ItemPlan | null = null;
        let annualPlan: ItemPlan | null = null;

        try {
            item = await CatalogItem.createItem({
                type: input.type,
                name: input.name,
                shortDescription: input.shortDescription,
                longDescription: input.longDescription || "",
                price: monthlyPriceCents,
                status: input.status || CatalogItemStatus.DRAFT,
                visibility: input.visibility || CatalogItemVisibility.PUBLIC,
            });

            const monthlyStripePrice = await stripe.client.prices.create({
                currency: "eur",
                unit_amount: monthlyPriceCents,
                recurring: { interval: "month" },
                product: product.id,
                metadata: {
                    item_id: item.id,
                    billing_cycle: BillingCycle.MONTHLY,
                },
            });
            monthlyStripePriceId = monthlyStripePrice.id;

            const annualStripePrice = await stripe.client.prices.create({
                currency: "eur",
                unit_amount: annualPriceCents,
                recurring: { interval: "year" },
                product: product.id,
                metadata: {
                    item_id: item.id,
                    billing_cycle: BillingCycle.ANNUAL,
                },
            });
            annualStripePriceId = annualStripePrice.id;

            monthlyPlan = await ItemPlan.createPlan({
                itemId: item.id,
                billingCycle: BillingCycle.MONTHLY,
                priceCents: monthlyPriceCents,
                stripePriceId: monthlyStripePriceId,
            });
            annualPlan = await ItemPlan.createPlan({
                itemId: item.id,
                billingCycle: BillingCycle.ANNUAL,
                priceCents: annualPriceCents,
                stripePriceId: annualStripePriceId,
            });

            return {
                item: item,
                monthlyPlan: monthlyPlan,
                annualPlan: annualPlan,
            };
        } catch (ex) {
            await this.rollbackCreateCatalogItem(item, monthlyPlan, annualPlan, monthlyStripePriceId, annualStripePriceId, product.id);
            throw ex;
        }
    }

    /**
     * Updates an existing catalog item and its pricing plans.
     * Creates new Stripe prices when the amount changes and archives old ones.
     * @param input - Update data for the catalog item
     * @returns Updated item with monthly and annual plans
     */
    public async updateCatalogItemWithPricing(input: UpdateCatalogItemWithPricingInput): Promise<CreateCatalogItemWithPricingResult> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const item = await CatalogItem.findById(input.itemId);
        if (!item) {
            throw new Error("ITEM_NOT_FOUND");
        }
        if (input.type !== item.type) {
            if (CatalogItem.isProtectedCatalogItem(item) || this.isProtectedCatalogItemType(input.type)) {
                throw new Error("PROTECTED");
            }
        }

        const monthlyPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        const annualPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.ANNUAL);
        if (!monthlyPlan || !annualPlan) {
            throw new Error("PRICING_PLAN_NOT_FOUND");
        }

        const monthlyPriceCents = this.eurToCents(input.monthlyPriceEur);
        const annualPriceCents = this.eurToCents(input.annualPriceEur);
        const pricingChanged = monthlyPlan.priceCents !== monthlyPriceCents || annualPlan.priceCents !== annualPriceCents;

        const previous = {
            type: item.type,
            name: item.name,
            shortDescription: item.shortDescription,
            longDescription: item.longDescription,
            price: item.price,
            status: item.status,
            visibility: item.visibility,
            monthlyPriceCents: monthlyPlan.priceCents,
            monthlyStripePriceId: monthlyPlan.stripePriceId,
            monthlyUpdatedAt: monthlyPlan.updatedAt,
            annualPriceCents: annualPlan.priceCents,
            annualStripePriceId: annualPlan.stripePriceId,
            annualUpdatedAt: annualPlan.updatedAt,
        };

        item.type = input.type;
        item.name = input.name;
        item.shortDescription = input.shortDescription;
        item.longDescription = input.longDescription || "";
        item.price = monthlyPriceCents;
        item.status = input.status;
        item.visibility = input.visibility;
        await item.save();

        try {
            const stripeProductId = await this.resolveOrCreateStripeProductId(item, monthlyPlan, annualPlan);

            await this.applyItemPlanStripePriceUpdate(
                item,
                monthlyPlan,
                stripeProductId,
                monthlyPriceCents,
                BillingCycle.MONTHLY,
            );
            await this.applyItemPlanStripePriceUpdate(
                item,
                annualPlan,
                stripeProductId,
                annualPriceCents,
                BillingCycle.ANNUAL,
            );

            if (pricingChanged) {
                await PlanService.getInstance().refreshCalculatedPlanPricingsForCatalogItem(item.id);
            }
        } catch (ex) {
            item.type = previous.type;
            item.name = previous.name;
            item.shortDescription = previous.shortDescription;
            item.longDescription = previous.longDescription;
            item.price = previous.price;
            item.status = previous.status;
            item.visibility = previous.visibility;
            await item.save();

            monthlyPlan.priceCents = previous.monthlyPriceCents;
            monthlyPlan.stripePriceId = previous.monthlyStripePriceId;
            monthlyPlan.updatedAt = previous.monthlyUpdatedAt;
            await monthlyPlan.save();

            annualPlan.priceCents = previous.annualPriceCents;
            annualPlan.stripePriceId = previous.annualStripePriceId;
            annualPlan.updatedAt = previous.annualUpdatedAt;
            await annualPlan.save();
            throw ex;
        }

        return {
            item: item,
            monthlyPlan: monthlyPlan,
            annualPlan: annualPlan,
        };
    }

    /**
     * Deletes a catalog item, its pricing plans, and archives Stripe resources.
     * @param itemId - Catalog item identifier to delete
     */
    public async deleteCatalogItemWithPricing(itemId: string): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        const item = await CatalogItem.findById(itemId);
        if (!item) {
            throw new Error("ITEM_NOT_FOUND");
        }
        if (CatalogItem.isProtectedCatalogItem(item)) {
            throw new Error("PROTECTED");
        }

        const plans = await ItemPlan.findByItemId(itemId);
        let stripeProductId = "";
        if (plans.length > 0) {
            stripeProductId = await this.getStripeProductIdFromPlan(plans[0]);
        }

        for (const plan of plans) {
            if (plan.stripePriceId) {
                await stripe.client.prices.update(plan.stripePriceId, { active: false });
            }
            await plan.delete();
        }

        if (stripeProductId) {
            await stripe.client.products.update(stripeProductId, { active: false });
        }

        await item.delete();
    }

    /**
     * Applies default ITAAS Platform prices when catalog data was seeded with zero amounts.
     * @param item - ITAAS Platform catalog item
     * @param monthlyPlan - Monthly ItemPlan
     * @param annualPlan - Annual ItemPlan
     */
    private async applyItaasPlatformDefaultPricingIfUnset(
        item: CatalogItem,
        monthlyPlan: ItemPlan,
        annualPlan: ItemPlan,
    ): Promise<void> {
        if (item.id !== ITAAS_PLATFORM_ITEM_ID) {
            return;
        }

        if (item.price <= 0) {
            item.price = ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS;
            await item.save();
        }

        if (monthlyPlan.priceCents <= 0) {
            monthlyPlan.priceCents = ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS;
            monthlyPlan.updatedAt = Date.now();
            await monthlyPlan.save();
        }

        if (annualPlan.priceCents <= 0) {
            annualPlan.priceCents = ITAAS_PLATFORM_DEFAULT_ANNUAL_CENTS;
            annualPlan.updatedAt = Date.now();
            await annualPlan.save();
        }
    }

    /**
     * Applies default custom agent prices when catalog data was seeded with zero amounts.
     */
    public async ensureCustomAgentServicePublicPricing(item: CatalogItem, monthlyPlan: ItemPlan): Promise<void> {
        await this.applyCustomAgentServiceDefaultPricingIfUnset(item, monthlyPlan);
    }

    /**
     * Applies default custom agent prices when catalog data was seeded with zero amounts.
     */
    private async applyCustomAgentServiceDefaultPricingIfUnset(
        item: CatalogItem,
        monthlyPlan: ItemPlan,
    ): Promise<void> {
        if (item.id !== CUSTOM_AGENT_ITEM_ID) {
            return;
        }

        if (item.price <= 0) {
            item.price = CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS;
            await item.save();
        }

        if (item.depositCents <= 0) {
            item.depositCents = CUSTOM_AGENT_DEFAULT_DEPOSIT_CENTS;
            await item.save();
        }

        if (monthlyPlan.priceCents <= 0) {
            monthlyPlan.priceCents = CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS;
            monthlyPlan.updatedAt = Date.now();
            await monthlyPlan.save();
        }
    }

    /**
     * Ensures the custom agent service monthly plan has a Stripe price ID.
     */
    private async syncCustomAgentServiceStripePricing(
        item: CatalogItem,
        monthlyPlan: ItemPlan,
    ): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return;
        }

        const stripeProductId = await this.resolveOrCreateStripeProductId(item, monthlyPlan, monthlyPlan);
        await this.applyItemPlanStripePriceUpdate(item, monthlyPlan, stripeProductId, monthlyPlan.priceCents, BillingCycle.MONTHLY);
    }

    /**
     * Ensures a catalog item has a Stripe product and price IDs on its monthly/annual plans.
     * @param item - Catalog item
     * @param monthlyPlan - Monthly ItemPlan
     * @param annualPlan - Annual ItemPlan
     */
    private async syncCatalogItemStripePricing(
        item: CatalogItem,
        monthlyPlan: ItemPlan,
        annualPlan: ItemPlan,
    ): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return;
        }

        const stripeProductId = await this.resolveOrCreateStripeProductId(item, monthlyPlan, annualPlan);
        await this.applyItemPlanStripePriceUpdate(item, monthlyPlan, stripeProductId, monthlyPlan.priceCents, BillingCycle.MONTHLY);
        await this.applyItemPlanStripePriceUpdate(item, annualPlan, stripeProductId, annualPlan.priceCents, BillingCycle.ANNUAL);
    }

    /**
     * Resolves an existing Stripe product for the item or creates one when missing.
     * @param item - Catalog item
     * @param monthlyPlan - Monthly ItemPlan
     * @param annualPlan - Annual ItemPlan
     * @returns Stripe product ID
     */
    private async resolveOrCreateStripeProductId(
        item: CatalogItem,
        monthlyPlan: ItemPlan,
        annualPlan: ItemPlan,
    ): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            throw new Error("Stripe is not configured");
        }

        let stripeProductId = await this.getStripeProductIdFromPlan(monthlyPlan);
        if (!stripeProductId) {
            stripeProductId = await this.getStripeProductIdFromPlan(annualPlan);
        }

        if (!stripeProductId) {
            const product = await stripe.client.products.create({
                name: item.name,
                description: item.shortDescription || "",
                metadata: {
                    item_type: item.type,
                    item_id: item.id,
                },
            });
            return product.id;
        }

        await stripe.client.products.update(stripeProductId, {
            name: item.name,
            description: item.shortDescription || "",
            metadata: {
                item_type: item.type,
                item_id: item.id,
            },
        });

        return stripeProductId;
    }

    /**
     * Creates or rotates a Stripe price for an ItemPlan when the amount changes or Stripe is missing.
     * @param item - Catalog item
     * @param plan - ItemPlan to update
     * @param stripeProductId - Stripe product ID
     * @param priceCents - Target price in cents
     * @param billingCycle - Monthly or annual billing cycle
     */
    private async applyItemPlanStripePriceUpdate(
        item: CatalogItem,
        plan: ItemPlan,
        stripeProductId: string,
        priceCents: number,
        billingCycle: BillingCycle,
    ): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return;
        }

        const needsStripePrice = !plan.stripePriceId || plan.priceCents !== priceCents;
        if (!needsStripePrice || priceCents <= 0) {
            if (plan.priceCents !== priceCents) {
                plan.priceCents = priceCents;
                plan.updatedAt = Date.now();
                await plan.save();
            }
            return;
        }

        const interval = billingCycle === BillingCycle.ANNUAL ? "year" : "month";
        const newStripePrice = await stripe.client.prices.create({
            currency: "eur",
            unit_amount: priceCents,
            recurring: { interval },
            product: stripeProductId,
            metadata: {
                item_id: item.id,
                billing_cycle: billingCycle,
            },
        });

        if (plan.stripePriceId) {
            await stripe.client.prices.update(plan.stripePriceId, { active: false });
        }

        plan.priceCents = priceCents;
        plan.stripePriceId = newStripePrice.id;
        plan.updatedAt = Date.now();
        await plan.save();
    }

    /**
     * Retrieves the Stripe product ID from an ItemPlan's Stripe price.
     * @param plan - ItemPlan with a stripePriceId
     * @returns Stripe product ID or empty string
     */
    private async getStripeProductIdFromPlan(plan: ItemPlan): Promise<string> {
        const stripe = StripeService.getInstance();
        if (!stripe.client || !plan?.stripePriceId) {
            return "";
        }
        const stripePrice = await stripe.client.prices.retrieve(plan.stripePriceId);
        if (typeof stripePrice.product === "string") {
            return stripePrice.product;
        }
        return stripePrice.product?.id || "";
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
     * Rolls back a failed catalog item creation by deleting plans,
     * archiving Stripe prices/products, and removing the item.
     * @param item - CatalogItem to remove
     * @param monthlyPlan - Monthly ItemPlan to remove
     * @param annualPlan - Annual ItemPlan to remove
     * @param monthlyStripePriceId - Stripe price ID to archive
     * @param annualStripePriceId - Stripe price ID to archive
     * @param stripeProductId - Stripe product ID to archive
     */
    private async rollbackCreateCatalogItem(
        item: CatalogItem | null,
        monthlyPlan: ItemPlan | null,
        annualPlan: ItemPlan | null,
        monthlyStripePriceId: string,
        annualStripePriceId: string,
        stripeProductId: string,
    ): Promise<void> {
        const stripe = StripeService.getInstance();
        if (!stripe.client) {
            return;
        }

        if (monthlyPlan) {
            try {
                await monthlyPlan.delete();
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed deleting monthly plan: ${message}`);
            }
        }
        if (annualPlan) {
            try {
                await annualPlan.delete();
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed deleting annual plan: ${message}`);
            }
        }

        if (monthlyStripePriceId) {
            try {
                await stripe.client.prices.update(monthlyStripePriceId, { active: false });
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed archiving monthly stripe price: ${message}`);
            }
        }
        if (annualStripePriceId) {
            try {
                await stripe.client.prices.update(annualStripePriceId, { active: false });
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed archiving annual stripe price: ${message}`);
            }
        }

        if (stripeProductId) {
            try {
                await stripe.client.products.update(stripeProductId, { active: false });
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed archiving stripe product: ${message}`);
            }
        }

        if (item) {
            try {
                await item.delete();
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : "unknown error";
                Monitor.warning(`[CATALOG] rollback failed deleting catalog item: ${message}`);
            }
        }
    }
}
