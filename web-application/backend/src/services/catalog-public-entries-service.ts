// Catalog Public Entries Service

"use strict";

import { CatalogItem, CatalogItemType } from "../models/catalog-item";
import { BillingCycle, ItemPlan } from "../models/item-plan";
import { Plan } from "../models/plan";
import { PlanComponent } from "../models/plan-component";
import { PlanPricing } from "../models/plan-pricing";
import { SubscribableType, SubscriptionBillingCycle } from "../models/subscription";
import { CatalogItemService } from "./catalog-item-service";
import { PlanService } from "./plan-service";

export interface CatalogAdminEntryApi {
	isPlan: boolean;
	id: string;
	name: string;
	type: string;
	price: number;
	annualPriceEur?: number;
	pricingMode?: string;
	discountPercent?: number;
	visibility?: string;
	status: string;
	updatedAt: number;
}

export interface CatalogAdminEntryListApi {
	items: CatalogAdminEntryApi[];
	page: number;
	totalPages: number;
	total: number;
}

interface PaginatedQuery {
	page?: unknown;
	pageSize?: unknown;
}

type CatalogEntryFilter = "all" | "product" | "service" | "plan";
type CatalogEntryKind = "product" | "service" | "plan";
type CatalogEntrySortBy = "name" | "price" | "createdAt";
type CatalogEntrySortDir = "asc" | "desc";

const DEFAULT_FILTER: CatalogEntryFilter = "all";

interface CatalogPublicEntriesQuery {
	q?: unknown;
	filter?: unknown;
	type?: unknown;
	subscriptionMode?: unknown;
	minPrice?: unknown;
	maxPrice?: unknown;
	sortBy?: unknown;
	sortDir?: unknown;
	page?: unknown;
	pageSize?: unknown;
	showMultiLicensePlans?: boolean;
}

interface CatalogPublicEntryCandidate {
	detailKind: SubscribableType;
	entityId: string;
	kind: CatalogEntryKind;
	name: string;
	createdAt: number;
	relevanceScore: number;
	monthlyPriceEur: number | null;
	annualPriceEur: number | null;
	effectivePriceEur: number | null;
}

interface CatalogPublicItemPricing {
	id: string;
	price: number;
}

interface CatalogPublicItemDetail {
	id: string;
	type: string;
	name: string;
	shortDescription: string;
	longDescription: string;
	price: number;
	status: string;
	createdAt: number;
	monthlyItemPricing: CatalogPublicItemPricing | null;
	annualItemPricing: CatalogPublicItemPricing | null;
}

interface CatalogPublicPlanDetailPricing {
	id: string;
	billingCycle: string;
	priceEur: number;
	basePriceEur: number;
	discountAmountEur: number;
}

interface CatalogPublicPlanDetailResponse {
	plan: Record<string, unknown>;
	components: Array<Record<string, unknown>>;
	pricings: CatalogPublicPlanDetailPricing[];
}

interface CatalogPublicEntry {
	detailKind: SubscribableType;
	itemDetail?: CatalogPublicItemDetail;
	planDetail?: CatalogPublicPlanDetailResponse;
}

interface CatalogPublicEntryList {
	items: CatalogPublicEntry[];
	page: number;
	totalPages: number;
	total: number;
}

interface PageMeta {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	skip: number;
}

function normalizeText(value: unknown): string {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function uniqueNonEmpty(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => !!value)));
}

function isValidFilter(filter: string): filter is CatalogEntryFilter {
    return ["all", "product", "service", "plan"].includes(filter);
}

function isValidSubscriptionMode(mode: string): mode is SubscriptionBillingCycle {
    return [SubscriptionBillingCycle.MONTHLY, SubscriptionBillingCycle.ANNUAL].includes(mode as SubscriptionBillingCycle);
}

function isValidSortBy(sortBy: string): sortBy is CatalogEntrySortBy {
    return ["name", "price", "createdAt"].includes(sortBy);
}

function isValidSortDir(sortDir: string): sortDir is CatalogEntrySortDir {
    return ["asc", "desc"].includes(sortDir);
}

function parseOptionalNonNegativeNumber(value: unknown): number | null {
    const n = Number.parseFloat(String(value ?? "").trim());
    if (!Number.isFinite(n) || n < 0) {
        return null;
    }
    return n;
}

function normalizeCatalogKindFromType(type: string): "product" | "service" {
    const normalizedType = normalizeText(type);

    if (
        normalizedType === normalizeText(CatalogItemType.RECURRING_SERVICE) ||
        normalizedType === normalizeText(CatalogItemType.ITAAS_PLATFORM) ||
        normalizedType.includes("service")
    ) {
        return "service";
    }

    return "product";
}

function buildPageMeta(query: PaginatedQuery, total: number, pageLimit: number): PageMeta {
    let pageSize = Number.parseInt(String(query.pageSize || ""), 10) || pageLimit;

    if (pageSize < 1) {
        pageSize = 1;
    }
    if (pageSize > pageLimit) {
        pageSize = pageLimit;
    }

    let totalPages = Math.floor(total / pageSize);
    if ((total % pageSize) > 0) {
        totalPages++;
    }

    let page = Number.parseInt(String(query.page || "1"), 10) || 1;
    if (page < 1) {
        page = 1;
    }

    if (totalPages <= 0) {
        totalPages = 1;
    }

    if (page > totalPages) {
        page = totalPages;
    }

    return {
        page,
        pageSize,
        total,
        totalPages,
        skip: (page - 1) * pageSize,
    };
}

export class CatalogPublicEntriesService {
    private static instance: CatalogPublicEntriesService | null = null;

    public static getInstance(): CatalogPublicEntriesService {
        if (CatalogPublicEntriesService.instance) {
            return CatalogPublicEntriesService.instance;
        }

        CatalogPublicEntriesService.instance = new CatalogPublicEntriesService();
        return CatalogPublicEntriesService.instance;
    }

    public async listPublicEntries(query: CatalogPublicEntriesQuery, pageLimit: number): Promise<CatalogPublicEntryList> {
        const rawFilter = normalizeText(query.type || query.filter || DEFAULT_FILTER);
        const filter: CatalogEntryFilter = isValidFilter(rawFilter) ? rawFilter : DEFAULT_FILTER;
        const rawSubscriptionMode = normalizeText(query.subscriptionMode);
        const subscriptionMode: SubscriptionBillingCycle | null = isValidSubscriptionMode(rawSubscriptionMode)
            ? rawSubscriptionMode
            : null;

        const normalizedQuery = normalizeText(query.q);
        const queryTokens = normalizedQuery ? normalizedQuery.split(" ").filter((token) => !!token) : [];
        const minPriceEur = parseOptionalNonNegativeNumber(query.minPrice);
        const maxPriceEur = parseOptionalNonNegativeNumber(query.maxPrice);
        const normalizedSortBy = normalizeText(query.sortBy);
        const normalizedSortDir = normalizeText(query.sortDir);
        const sortBy: CatalogEntrySortBy = isValidSortBy(normalizedSortBy)
            ? normalizedSortBy
            : (normalizedQuery ? "name" : "createdAt");
        const sortDir: CatalogEntrySortDir = isValidSortDir(normalizedSortDir)
            ? normalizedSortDir
            : (sortBy === "createdAt" ? "desc" : "asc");

        const [catalogItems, publishedPlans] = await Promise.all([
            filter === "plan" ? Promise.resolve([] as CatalogItem[]) : CatalogItem.findPublished(),
            filter === "product" || filter === "service" ? Promise.resolve([] as Plan[]) : Plan.findPublished(),
        ]);

        const plans = query.showMultiLicensePlans === true
            ? publishedPlans
            : publishedPlans.filter((plan) => !plan.requiresOrganization);

        const [planItemLabelsByPlanId, itemPlans, planPricings] = await Promise.all([
            this.loadPlanItemLabels(plans),
            ItemPlan.findByItemIds(catalogItems.map((item) => item.id)),
            PlanPricing.findByPlanIds(plans.map((plan) => plan.id)),
        ]);

        const itemPricingByItemId = this.buildItemPricingByItemId(itemPlans);
        const planPricingByPlanId = this.buildPlanPricingByPlanId(planPricings);

        const candidates = this.buildCandidates(
            catalogItems,
            plans,
            filter,
            normalizedQuery,
            queryTokens,
            planItemLabelsByPlanId,
            subscriptionMode,
            itemPricingByItemId,
            planPricingByPlanId,
        );

        const filteredCandidates = candidates.filter((candidate) => {
            if (candidate.effectivePriceEur === null) {
                return false;
            }
            if (minPriceEur !== null && candidate.effectivePriceEur < minPriceEur) {
                return false;
            }
            if (maxPriceEur !== null && candidate.effectivePriceEur > maxPriceEur) {
                return false;
            }
            return true;
        });

        this.sortCandidates(filteredCandidates, sortBy, sortDir);

        const pageMeta = buildPageMeta(query, filteredCandidates.length, pageLimit);
        const pageCandidates = filteredCandidates.slice(pageMeta.skip, pageMeta.skip + pageMeta.pageSize);
        const items = await this.hydratePageEntries(pageCandidates, catalogItems, plans);

        return {
            items,
            page: pageMeta.page,
            totalPages: pageMeta.totalPages,
            total: pageMeta.total,
        };
    }

    public async listAdminEntries(query: PaginatedQuery, pageLimit: number): Promise<CatalogAdminEntryListApi> {
        const [itemTotal, planTotal] = await Promise.all([CatalogItem.countFiltered(), Plan.count()]);
        const [catalogItems, plans] = await Promise.all([
            CatalogItem.findFiltered(0, itemTotal),
            Plan.findAll(0, planTotal),
        ]);
        const [adminItems, adminPlans] = await Promise.all([
            CatalogItemService.getInstance().mapItemsToAdminApi(catalogItems),
            PlanService.getInstance().mapPlansToAdminListApi(plans),
        ]);
        const entries: CatalogAdminEntryApi[] = [
            ...adminItems.map((item) => ({
                isPlan: false,
                id: item.id,
                name: item.name,
                type: item.type,
                price: item.price,
                annualPriceEur: item.annualPriceEur,
                visibility: item.visibility,
                status: item.status,
                updatedAt: item.createdAt,
            })),
            ...adminPlans.map((plan) => ({
                isPlan: true,
                id: plan.id,
                name: plan.name,
                type: "Plan",
                price: plan.monthlyPriceEur ?? 0,
                annualPriceEur: plan.annualPriceEur,
                pricingMode: plan.pricingMode,
                discountPercent: plan.discountPercent,
                status: plan.status,
                updatedAt: plan.updatedAt || plan.createdAt,
            })),
        ].sort((a, b) => b.updatedAt - a.updatedAt);
        const pageMeta = buildPageMeta(query, entries.length, pageLimit);

        return {
            items: entries.slice(pageMeta.skip, pageMeta.skip + pageMeta.pageSize),
            page: pageMeta.page,
            totalPages: pageMeta.totalPages,
            total: pageMeta.total,
        };
    }

    private async loadPlanItemLabels(plans: Plan[]): Promise<Record<string, string[]>> {
        if (!plans.length) {
            return {};
        }

        const components = await PlanComponent.findByPlanIds(plans.map((plan) => plan.id));
        if (!components.length) {
            return {};
        }

        const catalogItems = await CatalogItem.findByIds(uniqueNonEmpty(components.map((component) => component.catalogItemId)));
        const catalogItemNameById = new Map<string, string>();

        for (const catalogItem of catalogItems) {
            catalogItemNameById.set(catalogItem.id, catalogItem.name || "");
        }

        const labelsByPlanId: Record<string, string[]> = {};

        for (const component of components) {
            if (!labelsByPlanId[component.planId]) {
                labelsByPlanId[component.planId] = [];
            }

            const quantity = Math.max(1, Math.round(component.quantity || 1));
            const itemName = catalogItemNameById.get(component.catalogItemId) || component.catalogItemId;
            labelsByPlanId[component.planId].push(quantity > 1 ? `${itemName} x${quantity}` : itemName);
        }

        return labelsByPlanId;
    }

    private buildCandidates(
        catalogItems: CatalogItem[],
        plans: Plan[],
        filter: CatalogEntryFilter,
        normalizedQuery: string,
        queryTokens: string[],
        planItemLabelsByPlanId: Record<string, string[]>,
        subscriptionMode: SubscriptionBillingCycle | null,
        itemPricingByItemId: Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }>,
        planPricingByPlanId: Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }>,
    ): CatalogPublicEntryCandidate[] {
        const candidates: CatalogPublicEntryCandidate[] = [];

        for (const catalogItem of catalogItems) {
            const kind = normalizeCatalogKindFromType(catalogItem.type);

            if (filter !== DEFAULT_FILTER && kind !== filter) {
                continue;
            }

            const searchText = normalizeText([
                catalogItem.name,
                catalogItem.shortDescription,
                catalogItem.longDescription,
                catalogItem.type,
                kind,
            ].join(" "));

            if (normalizedQuery && !this.matchesAllTokens(searchText, queryTokens)) {
                continue;
            }

            const itemPricing = itemPricingByItemId.get(catalogItem.id) || { monthlyPriceEur: null, annualPriceEur: null };
            const relevanceScore = this.computeRelevanceScore(normalizedQuery, searchText, normalizeText(catalogItem.name), normalizeText(catalogItem.id));
            const effectivePriceEur = this.resolveEffectivePrice(itemPricing.monthlyPriceEur, itemPricing.annualPriceEur, subscriptionMode);

            candidates.push({
                detailKind: SubscribableType.ITEM,
                entityId: catalogItem.id,
                kind,
                name: catalogItem.name || "Untitled",
                createdAt: Math.round(catalogItem.createdAt || 0),
                relevanceScore,
                monthlyPriceEur: itemPricing.monthlyPriceEur,
                annualPriceEur: itemPricing.annualPriceEur,
                effectivePriceEur,
            });
        }

        if (filter === DEFAULT_FILTER || filter === "plan") {
            for (const plan of plans) {
                const searchText = normalizeText([
                    plan.name,
                    plan.description,
                    plan.pricingMode,
                    ...(planItemLabelsByPlanId[plan.id] || []),
                ].join(" "));

                if (normalizedQuery && !this.matchesAllTokens(searchText, queryTokens)) {
                    continue;
                }

                const planPricing = planPricingByPlanId.get(plan.id) || { monthlyPriceEur: null, annualPriceEur: null };
                const relevanceScore = this.computeRelevanceScore(normalizedQuery, searchText, normalizeText(plan.name), normalizeText(plan.id));
                const effectivePriceEur = this.resolveEffectivePrice(planPricing.monthlyPriceEur, planPricing.annualPriceEur, subscriptionMode);

                candidates.push({
                    detailKind: SubscribableType.PLAN,
                    entityId: plan.id,
                    kind: "plan",
                    name: plan.name || "Untitled",
                    createdAt: Math.round(plan.createdAt || 0),
                    relevanceScore,
                    monthlyPriceEur: planPricing.monthlyPriceEur,
                    annualPriceEur: planPricing.annualPriceEur,
                    effectivePriceEur,
                });
            }
        }

        return candidates;
    }

    private buildItemPricingByItemId(itemPlans: ItemPlan[]): Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }> {
        const catalogItemService = CatalogItemService.getInstance();
        const priceByItemId = new Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }>();

        for (const itemPlan of itemPlans) {
            const current = priceByItemId.get(itemPlan.itemId) || { monthlyPriceEur: null, annualPriceEur: null };
            const priceEur = catalogItemService.centsToEur(itemPlan.priceCents);

            if (itemPlan.billingCycle === BillingCycle.MONTHLY) {
                current.monthlyPriceEur = priceEur;
            }
            if (itemPlan.billingCycle === BillingCycle.ANNUAL) {
                current.annualPriceEur = priceEur;
            }

            priceByItemId.set(itemPlan.itemId, current);
        }

        return priceByItemId;
    }

    private buildPlanPricingByPlanId(planPricings: PlanPricing[]): Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }> {
        const planService = PlanService.getInstance();
        const priceByPlanId = new Map<string, { monthlyPriceEur: number | null; annualPriceEur: number | null }>();

        for (const planPricing of planPricings) {
            const current = priceByPlanId.get(planPricing.planId) || { monthlyPriceEur: null, annualPriceEur: null };
            const priceEur = planService.centsToEur(planPricing.priceCents);

            if (planPricing.billingCycle === BillingCycle.MONTHLY) {
                current.monthlyPriceEur = priceEur;
            }
            if (planPricing.billingCycle === BillingCycle.ANNUAL) {
                current.annualPriceEur = priceEur;
            }

            priceByPlanId.set(planPricing.planId, current);
        }

        return priceByPlanId;
    }

    private resolveEffectivePrice(monthlyPriceEur: number | null, annualPriceEur: number | null, mode: SubscriptionBillingCycle | null): number | null {
        if (mode === SubscriptionBillingCycle.MONTHLY) {
            return monthlyPriceEur;
        }
        if (mode === SubscriptionBillingCycle.ANNUAL) {
            return annualPriceEur;
        }

        const candidates: number[] = [];
        if (monthlyPriceEur !== null) {
            candidates.push(monthlyPriceEur);
        }
        if (annualPriceEur !== null) {
            candidates.push(annualPriceEur);
        }

        if (!candidates.length) {
            return null;
        }

        return Math.min(...candidates);
    }

    private matchesAllTokens(searchText: string, queryTokens: string[]): boolean {
        for (const token of queryTokens) {
            if (!searchText.includes(token)) {
                return false;
            }
        }
        return true;
    }

    private computeRelevanceScore(normalizedQuery: string, normalizedSearchText: string, normalizedName: string, normalizedId: string): number {
        if (!normalizedQuery) {
            return 0;
        }

        let score = 0;

        if (normalizedId === normalizedQuery) {
            score += 200;
        }
        if (normalizedName === normalizedQuery) {
            score += 120;
        } else if (normalizedName.startsWith(normalizedQuery)) {
            score += 80;
        } else if (normalizedName.includes(normalizedQuery)) {
            score += 50;
        } else if (normalizedSearchText.includes(normalizedQuery)) {
            score += 20;
        }

        for (const token of normalizedQuery.split(" ").filter((token) => !!token)) {
            if (normalizedName.startsWith(token)) {
                score += 10;
            } else if (normalizedSearchText.includes(token)) {
                score += 5;
            }
        }

        return score;
    }

    private sortCandidates(candidates: CatalogPublicEntryCandidate[], sortBy: CatalogEntrySortBy, sortDir: CatalogEntrySortDir): void {
        const dir = sortDir === "asc" ? 1 : -1;

        candidates.sort((left, right) => {
            let comparison = 0;

            if (sortBy === "price") {
                comparison = (left.effectivePriceEur || 0) - (right.effectivePriceEur || 0);
            } else if (sortBy === "createdAt") {
                comparison = (left.createdAt || 0) - (right.createdAt || 0);
            } else {
                comparison = left.name.localeCompare(right.name);
            }

            if (comparison !== 0) {
                return comparison * dir;
            }

            const nameComparison = left.name.localeCompare(right.name);
            if (nameComparison !== 0) {
                return nameComparison;
            }

            if (left.detailKind === right.detailKind) {
                return left.entityId.localeCompare(right.entityId);
            }

            return left.detailKind.localeCompare(right.detailKind);
        });
    }

    private async hydratePageEntries(
        candidates: CatalogPublicEntryCandidate[],
        catalogItems: CatalogItem[],
        plans: Plan[],
    ): Promise<CatalogPublicEntry[]> {
        if (!candidates.length) {
            return [];
        }

        const catalogItemService = CatalogItemService.getInstance();
        const planService = PlanService.getInstance();

        const catalogItemById = new Map<string, CatalogItem>();
        for (const catalogItem of catalogItems) {
            catalogItemById.set(catalogItem.id, catalogItem);
        }

        const planById = new Map<string, Plan>();
        for (const plan of plans) {
            planById.set(plan.id, plan);
        }

        const pageItemIds = candidates
            .filter((candidate) => candidate.detailKind === SubscribableType.ITEM)
            .map((candidate) => candidate.entityId);

        const pagePlanIds = candidates
            .filter((candidate) => candidate.detailKind === SubscribableType.PLAN)
            .map((candidate) => candidate.entityId);

        const [itemPlans, planComponents, planPricings] = await Promise.all([
            ItemPlan.findByItemIds(pageItemIds),
            PlanComponent.findByPlanIds(pagePlanIds),
            PlanPricing.findByPlanIds(pagePlanIds),
        ]);

        const itemPlanMap = new Map<string, ItemPlan>();
        for (const itemPlan of itemPlans) {
            itemPlanMap.set(`${itemPlan.itemId}:${itemPlan.billingCycle}`, itemPlan);
        }

        const planPricingsByPlanId = new Map<string, PlanPricing[]>();
        for (const planPricing of planPricings) {
            const group = planPricingsByPlanId.get(planPricing.planId) || [];
            group.push(planPricing);
            planPricingsByPlanId.set(planPricing.planId, group);
        }

        const planComponentsByPlanId = new Map<string, PlanComponent[]>();
        for (const planComponent of planComponents) {
            const group = planComponentsByPlanId.get(planComponent.planId) || [];
            group.push(planComponent);
            planComponentsByPlanId.set(planComponent.planId, group);
        }

        const baseTotalsByPlanId = await planService.getComponentBaseTotalsMap(planComponents);

        return candidates.map((candidate) => {
            if (candidate.detailKind === SubscribableType.ITEM) {
                const catalogItem = catalogItemById.get(candidate.entityId);

                if (!catalogItem) {
                    return {
                        detailKind: SubscribableType.ITEM,
                    };
                }

                const monthlyItemPlan = itemPlanMap.get(`${catalogItem.id}:${BillingCycle.MONTHLY}`);
                const annualItemPlan = itemPlanMap.get(`${catalogItem.id}:${BillingCycle.ANNUAL}`);
                const itemDetailBase = catalogItemService.toCatalogItemApi(catalogItem) as Omit<CatalogPublicItemDetail, "monthlyItemPricing" | "annualItemPricing">;
                const itemDetail: CatalogPublicItemDetail = {
                    ...itemDetailBase,
                    monthlyItemPricing: monthlyItemPlan ? {
                        id: monthlyItemPlan.id,
                        price: catalogItemService.centsToEur(monthlyItemPlan.priceCents),
                    } : null,
                    annualItemPricing: annualItemPlan ? {
                        id: annualItemPlan.id,
                        price: catalogItemService.centsToEur(annualItemPlan.priceCents),
                    } : null,
                };

                return {
                    detailKind: SubscribableType.ITEM,
                    itemDetail,
                };
            }

            const plan = planById.get(candidate.entityId);

            if (!plan) {
                return {
                    detailKind: SubscribableType.PLAN,
                };
            }

            const baseTotals = baseTotalsByPlanId[plan.id] || { monthlyCents: 0, annualCents: 0 };
            const planDetail: CatalogPublicPlanDetailResponse = {
                plan: plan.toObject(),
                components: (planComponentsByPlanId.get(plan.id) || []).map((component) => component.toObject()),
                pricings: (planPricingsByPlanId.get(plan.id) || []).map((pricing): CatalogPublicPlanDetailPricing => {
                    const basePriceCents = pricing.billingCycle === BillingCycle.ANNUAL ? baseTotals.annualCents : baseTotals.monthlyCents;
                    const priceCents = Math.max(0, Math.round(pricing.priceCents || 0));
                    const discountAmountCents = Math.max(basePriceCents - priceCents, 0);

                    return {
                        id: pricing.id,
                        billingCycle: pricing.billingCycle,
                        priceEur: planService.centsToEur(priceCents),
                        basePriceEur: planService.centsToEur(basePriceCents),
                        discountAmountEur: planService.centsToEur(discountAmountCents),
                    };
                }),
            };

            return {
                detailKind: SubscribableType.PLAN,
                planDetail,
            };
        });
    }
}
