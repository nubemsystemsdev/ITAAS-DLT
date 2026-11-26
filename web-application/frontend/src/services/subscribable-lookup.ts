import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import { ApiPlans } from "@/api/api-group-plans";
import type { CatalogPublicItemDetail, CatalogPublicListItem, PlanPublicListItem } from "@/api/definitions";
import {
    CATALOG_ITEM_TYPE_CUSTOM_AGENT_SERVICE,
    CATALOG_ITEM_TYPE_ITAAS_PLATFORM,
    CATALOG_ITEM_TYPE_RECURRING_SERVICE,
    CATALOG_PLAN_LOOKUP_PAGE_SIZE,
    CUSTOM_AGENT_SERVICE_ITEM_ID,
    normalizeBillingCyclePlanLabel,
    planLookupCycleKey,
    PLAN_LOOKUP_SINGLE_KEY,
    type SubscriptionAgentCategory,
} from "@/utils/subscription-domain";
import { toTitleCase } from "@/utils/text";
import { Request } from "@asanrom/request-browser";

const LOOKUP_DETAIL_CONCURRENCY = 6;
const LOOKUP_REQUEST_PREFIX = "subscribable-lookup";

export interface SubscriptionPlanOption {
    id: string;
    label: string;
    amount: number | null;
    planIndex: number | null;
}

export interface SubscribableLookupEntry {
    name: string;
    agentType: SubscriptionAgentCategory;
    version: string;
    planId: string;
    planLabel: string;
    amount: number | null;
    planIndex: number | null;
    availablePlans: SubscriptionPlanOption[];
    pricingByCycle?: Record<string, number>;
}

interface PlanPublicDetailPricing {
    id?: string;
    billingCycle?: string;
    priceEur?: number;
}

interface PlanPublicDetailPlan {
    id?: string;
    name?: string;
    planIndex?: number;
}

interface PlanPublicDetailResponse {
    plan?: PlanPublicDetailPlan;
    pricings?: PlanPublicDetailPricing[];
}

type LookupTranslator = (key: string) => string;

let cachedLookup: Map<string, SubscribableLookupEntry> | null = null;
let cachedLookupFailed = false;
let lookupLoading = false;
const pendingCallbacks: Array<(lookup: Map<string, SubscribableLookupEntry>, failed: boolean) => void> = [];

function isServiceCatalogType(catalogItemType: string): boolean {
    return (
        catalogItemType === CATALOG_ITEM_TYPE_RECURRING_SERVICE ||
        catalogItemType === CATALOG_ITEM_TYPE_ITAAS_PLATFORM ||
        catalogItemType === CATALOG_ITEM_TYPE_CUSTOM_AGENT_SERVICE
    );
}

function resolveAgentType(catalogItemType: string, subscribableType: string): SubscriptionAgentCategory {
    if (subscribableType === "plan") {
        return "plan";
    }
    if (isServiceCatalogType(catalogItemType)) {
        return "service";
    }
    return "product";
}

function registerCatalogLookupFromDetail(detail: CatalogPublicItemDetail, lookup: Map<string, SubscribableLookupEntry>): void {
    const agentType = resolveAgentType(detail.type || "", "item");
    const availablePlans: SubscriptionPlanOption[] = [];

    if (detail.monthlyItemPricing?.id) {
        const monthlyAmount = detail.monthlyItemPricing.price ?? detail.price;
        availablePlans.push({
            id: detail.monthlyItemPricing.id,
            label: "Monthly",
            amount: monthlyAmount,
            planIndex: null,
        });
    }

    if (detail.annualItemPricing?.id) {
        const annualAmount = detail.annualItemPricing.price ?? detail.price;
        availablePlans.push({
            id: detail.annualItemPricing.id,
            label: "Annual",
            amount: annualAmount,
            planIndex: null,
        });
    }

    for (const plan of availablePlans) {
        lookup.set(plan.id, {
            name: detail.name || plan.id,
            agentType,
            version: toTitleCase(detail.type || "item"),
            planId: plan.id,
            planLabel: plan.label,
            amount: plan.amount,
            planIndex: null,
            availablePlans,
        });
    }
}

function registerPlanLookupFromDetail(
    plan: PlanPublicListItem,
    detail: PlanPublicDetailResponse,
    lookup: Map<string, SubscribableLookupEntry>,
    t: LookupTranslator,
): SubscribableLookupEntry {
    const pricingByCycle: Record<string, number> = {};
    const availablePlans: SubscriptionPlanOption[] = [];
    const planIndex = detail.plan?.planIndex ?? plan.planIndex ?? null;

    for (const pricing of detail.pricings || []) {
        const normalizedCycle = (pricing.billingCycle || "").trim().toLowerCase();
        if (!normalizedCycle || pricing.priceEur === undefined || pricing.priceEur === null) {
            continue;
        }

        pricingByCycle[normalizedCycle] = pricing.priceEur;

        const optionId = pricing.id || plan.id;
        if (!availablePlans.some((existingOption) => existingOption.id === optionId)) {
            availablePlans.push({
                id: optionId,
                label: normalizeBillingCyclePlanLabel(normalizedCycle),
                amount: pricing.priceEur,
                planIndex,
            });
        }
    }

    const pricingCycles = Object.keys(pricingByCycle);
    const fallbackCycle = pricingCycles[0] || "";
    const fallbackLabel = normalizeBillingCyclePlanLabel(fallbackCycle || "plan");
    const fallbackAmount = fallbackCycle ? pricingByCycle[fallbackCycle] : null;
    const planName = detail.plan?.name || plan.name || plan.id;

    if (!availablePlans.length) {
        availablePlans.push({
            id: plan.id,
            label: fallbackLabel,
            amount: fallbackAmount,
            planIndex,
        });
    }

    const lookupEntry: SubscribableLookupEntry = {
        name: planName,
        agentType: "plan",
        version: t("Plan"),
        planId: plan.id,
        planLabel: fallbackLabel,
        amount: fallbackAmount,
        planIndex,
        availablePlans,
        pricingByCycle,
    };

    lookup.set(plan.id, lookupEntry);

    for (const pricing of detail.pricings || []) {
        const pricingId = pricing.id || "";
        const normalizedCycle = (pricing.billingCycle || "").trim().toLowerCase();
        if (!pricingId || !normalizedCycle || pricing.priceEur === undefined || pricing.priceEur === null) {
            continue;
        }

        lookup.set(pricingId, {
            name: planName,
            agentType: "plan",
            version: t("Plan"),
            planId: pricingId,
            planLabel: normalizeBillingCyclePlanLabel(normalizedCycle),
            amount: pricing.priceEur,
            planIndex,
            availablePlans,
            pricingByCycle,
        });
    }

    return lookupEntry;
}

function registerPlanFallbackLookupByCycle(
    lookup: Map<string, SubscribableLookupEntry>,
    entriesByCycle: Map<string, SubscribableLookupEntry[]>,
    entriesWithPricing: SubscribableLookupEntry[],
): void {
    for (const [cycle, entries] of entriesByCycle.entries()) {
        if (entries.length === 1) {
            lookup.set(planLookupCycleKey(cycle), entries[0]);
        }
    }

    if (entriesWithPricing.length === 1) {
        lookup.set(PLAN_LOOKUP_SINGLE_KEY, entriesWithPricing[0]);
    }
}

function registerPlanEntryByCycle(entriesByCycle: Map<string, SubscribableLookupEntry[]>, entry: SubscribableLookupEntry): void {
    for (const cycle of Object.keys(entry.pricingByCycle || {})) {
        const existingEntries = entriesByCycle.get(cycle) || [];
        entriesByCycle.set(cycle, [...existingEntries, entry]);
    }
}

function runParallel<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
        if (!items.length) {
            resolve();
            return;
        }

        let nextIndex = 0;
        let active = 0;

        const launch = () => {
            while (active < concurrency && nextIndex < items.length) {
                const item = items[nextIndex++];
                active++;
                worker(item)
                    .catch(() => undefined)
                    .finally(() => {
                        active--;
                        if (nextIndex >= items.length && active === 0) {
                            resolve();
                        } else {
                            launch();
                        }
                    });
            }
        };

        launch();
    });
}

function fetchCatalogItemDetail(itemId: string): Promise<CatalogPublicItemDetail | null> {
    const requestId = `${LOOKUP_REQUEST_PREFIX}-catalog-detail-${itemId}`;
    return new Promise((resolve) => {
        Request.Abort(requestId);
        Request.Pending(requestId, ApiCatalogItems.GetPublicCatalogItem(itemId))
            .onSuccess((detail) => resolve(detail))
            .onRequestError(() => resolve(null))
            .onUnexpectedError(() => resolve(null));
    });
}

function fetchPlanDetail(planId: string): Promise<PlanPublicDetailResponse | null> {
    const requestId = `${LOOKUP_REQUEST_PREFIX}-plan-detail-${planId}`;
    return new Promise((resolve) => {
        Request.Abort(requestId);
        Request.Pending(requestId, ApiPlans.GetPublicPlan(planId) as any)
            .onSuccess((detail: PlanPublicDetailResponse) => resolve(detail || {}))
            .onRequestError(() => resolve(null))
            .onUnexpectedError(() => resolve(null));
    });
}

function fetchCatalogListPage(page: number): Promise<{ items: CatalogPublicListItem[]; hasMore: boolean } | null> {
    const requestId = `${LOOKUP_REQUEST_PREFIX}-catalog-list-${page}`;
    return new Promise((resolve) => {
        Request.Abort(requestId);
        Request.Pending(
            requestId,
            ApiCatalogItems.GetPublicCatalogItems({
                page,
                pageSize: CATALOG_PLAN_LOOKUP_PAGE_SIZE,
            }),
        )
            .onSuccess((response) => {
                resolve({
                    items: response.items || [],
                    hasMore: (response.page || 1) < (response.totalPages || 1),
                });
            })
            .onRequestError(() => resolve(null))
            .onUnexpectedError(() => resolve(null));
    });
}

function fetchPlansListPage(page: number): Promise<{ items: PlanPublicListItem[]; hasMore: boolean } | null> {
    const requestId = `${LOOKUP_REQUEST_PREFIX}-plans-list-${page}`;
    return new Promise((resolve) => {
        Request.Abort(requestId);
        Request.Pending(
            requestId,
            ApiPlans.GetPublicPlans({
                page,
                pageSize: CATALOG_PLAN_LOOKUP_PAGE_SIZE,
            }),
        )
            .onSuccess((response) => {
                resolve({
                    items: response.items || [],
                    hasMore: (response.page || 1) < (response.totalPages || 1),
                });
            })
            .onRequestError(() => resolve(null))
            .onUnexpectedError(() => resolve(null));
    });
}

async function loadAllCatalogItems(): Promise<{ items: CatalogPublicListItem[]; failed: boolean }> {
    const items: CatalogPublicListItem[] = [];
    let page = 1;
    let failed = false;
    let hasMore = true;

    while (hasMore) {
        const response = await fetchCatalogListPage(page);
        if (!response) {
            failed = true;
            break;
        }
        items.push(...response.items);
        hasMore = response.hasMore;
        page += 1;
    }

    return { items, failed };
}

async function loadAllPlans(): Promise<{ plans: PlanPublicListItem[]; failed: boolean }> {
    const plans: PlanPublicListItem[] = [];
    let page = 1;
    let failed = false;
    let hasMore = true;

    while (hasMore) {
        const response = await fetchPlansListPage(page);
        if (!response) {
            failed = true;
            break;
        }
        plans.push(...response.items);
        hasMore = response.hasMore;
        page += 1;
    }

    return { plans, failed };
}

async function buildSubscribableLookup(t: LookupTranslator): Promise<{ lookup: Map<string, SubscribableLookupEntry>; failed: boolean }> {
    const lookup = new Map<string, SubscribableLookupEntry>();
    let failed = false;

    const [catalogResult, plansResult] = await Promise.all([loadAllCatalogItems(), loadAllPlans()]);
    failed = failed || catalogResult.failed || plansResult.failed;

    const catalogItemIds = catalogResult.items.map((item) => item.id);
    if (!catalogItemIds.includes(CUSTOM_AGENT_SERVICE_ITEM_ID)) {
        catalogItemIds.push(CUSTOM_AGENT_SERVICE_ITEM_ID);
    }

    await runParallel(catalogItemIds, LOOKUP_DETAIL_CONCURRENCY, async (itemId) => {
        const detail = await fetchCatalogItemDetail(itemId);
        if (!detail) {
            return;
        }
        registerCatalogLookupFromDetail(detail, lookup);
    });

    const entriesByCycle = new Map<string, SubscribableLookupEntry[]>();
    const entriesWithPricing: SubscribableLookupEntry[] = [];

    await runParallel(plansResult.plans, LOOKUP_DETAIL_CONCURRENCY, async (plan) => {
        const detail = await fetchPlanDetail(plan.id);
        if (!detail) {
            return;
        }
        const entry = registerPlanLookupFromDetail(plan, detail, lookup, t);
        if (Object.keys(entry.pricingByCycle || {}).length) {
            entriesWithPricing.push(entry);
            registerPlanEntryByCycle(entriesByCycle, entry);
        }
    });

    registerPlanFallbackLookupByCycle(lookup, entriesByCycle, entriesWithPricing);

    return { lookup, failed };
}

function flushPendingCallbacks(): void {
    const callbacks = pendingCallbacks.slice();
    pendingCallbacks.length = 0;
    const lookup = cachedLookup || new Map<string, SubscribableLookupEntry>();
    for (const callback of callbacks) {
        callback(lookup, cachedLookupFailed);
    }
}

/** Clears in-memory lookup cache (e.g. after logout). */
export function clearSubscribableLookupCache(): void {
    cachedLookup = null;
    cachedLookupFailed = false;
    lookupLoading = false;
    pendingCallbacks.length = 0;
    Request.Abort(LOOKUP_REQUEST_PREFIX);
}

/**
 * Returns cached catalog/plan lookup or loads it once (shared across dashboard and subscriptions).
 */
export function ensureSubscribableLookup(
    t: LookupTranslator,
    done: (lookup: Map<string, SubscribableLookupEntry>, failed: boolean) => void,
): void {
    if (cachedLookup) {
        done(cachedLookup, cachedLookupFailed);
        return;
    }

    pendingCallbacks.push(done);
    if (lookupLoading) {
        return;
    }

    lookupLoading = true;
    buildSubscribableLookup(t)
        .then(({ lookup, failed }) => {
            cachedLookup = lookup;
            cachedLookupFailed = failed;
            lookupLoading = false;
            flushPendingCallbacks();
        })
        .catch(() => {
            cachedLookup = new Map();
            cachedLookupFailed = true;
            lookupLoading = false;
            flushPendingCallbacks();
        });
}

/** Resolves display name and plan label for a subscription row using the shared lookup. */
export function resolveSubscribableDisplay(
    lookup: Map<string, SubscribableLookupEntry>,
    subscribableId: string,
    subscribableType: string,
    billingCycle: string,
): { name: string; planLabel: string } {
    const normalizedCycle = (billingCycle || "").trim().toLowerCase();
    const isPlanSubscription = (subscribableType || "").trim().toLowerCase() === "plan";

    let lookupEntry = lookup.get(subscribableId || "");
    if (isPlanSubscription && !lookupEntry) {
        if (normalizedCycle) {
            lookupEntry = lookup.get(planLookupCycleKey(normalizedCycle));
        }
        if (!lookupEntry) {
            lookupEntry = lookup.get(PLAN_LOOKUP_SINGLE_KEY);
        }
    }

    return {
        name: lookupEntry?.name || subscribableId || "",
        planLabel: lookupEntry?.planLabel || normalizeBillingCyclePlanLabel(billingCycle || ""),
    };
}
