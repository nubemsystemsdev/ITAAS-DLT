import type { CatalogPublicEntry, CatalogPublicItemDetail, PlanPublicDetailResponse } from "@/api/definitions";

export type CatalogKindFilter = "all" | "product" | "service" | "plan";
export type CatalogEntryKind = Exclude<CatalogKindFilter, "all">;
export type CatalogDetailKind = "item" | "plan";
export type CatalogBillingCycle = "monthly" | "annual";
export type CatalogSubscribableType = "item" | "plan";
export type CatalogSubscriptionState = "none" | "active" | "pending" | "cancelled";
export type CatalogActionType = "subscribe" | "manage" | "complete_pending" | "unavailable";
export type CheckoutResult = "success" | "cancel" | "error";
export type PurchaseResultVariant = "success" | "cancel" | "error";

export interface CatalogPricingOption {
    cycle: CatalogBillingCycle;
    label: string;
    price: number;
    basePrice: number;
    discountAmount: number;
    discountPercent: number;
    priceIncludesDiscount: boolean;
    subscribableType: CatalogSubscribableType;
    subscribableId: string;
}

export interface CatalogEntry {
    id: string;
    entityId: string;
    detailKind: CatalogDetailKind;
    kind: CatalogEntryKind;
    kindLabel: string;
    typeLabel: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    planItems: string[];
    initials: string;
    pricingOptions: CatalogPricingOption[];
    minPrice: number;
}

export interface CatalogSubscriptionInfo {
    id: string;
    rawStatus: string;
    state: CatalogSubscriptionState;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number;
}

export const CATALOG_FILTER_OPTIONS: ReadonlyArray<{ value: CatalogKindFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "product", label: "Products" },
    { value: "service", label: "Services" },
    { value: "plan", label: "Plans" },
];

export function computeCatalogInitials(name: string): string {
    const tokens = (name || "").trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return "?";
    }
    if (tokens.length === 1) {
        return tokens[0].substring(0, 2).toUpperCase();
    }
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
}

export function normalizeCatalogBillingCycle(cycle: string): CatalogBillingCycle | null {
    const normalizedCycle = (cycle || "").trim().toLowerCase();
    if (normalizedCycle === "monthly") {
        return "monthly";
    }
    if (normalizedCycle === "annual" || normalizedCycle === "yearly") {
        return "annual";
    }
    return null;
}

const CATALOG_TYPE_ITAAS_PLATFORM = "itaas platform";

export function normalizeCatalogKindFromType(type: string): CatalogEntryKind {
    const normalizedType = (type || "").trim().toLowerCase();
    if (normalizedType === CATALOG_TYPE_ITAAS_PLATFORM || normalizedType.includes("service")) {
        return "service";
    }
    return "product";
}

export function isValidCatalogFilter(filter: string): filter is CatalogKindFilter {
    return ["all", "product", "service", "plan"].includes(filter);
}

export function toCatalogSearchableText(value: unknown): string {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

export function ensureCatalogCycleSelection(
    entries: CatalogEntry[],
    selectedCycleByEntry: Record<string, CatalogBillingCycle>,
): Record<string, CatalogBillingCycle> {
    const nextSelectedCycleByEntry: Record<string, CatalogBillingCycle> = {};

    for (const entry of entries) {
        const existingCycle = selectedCycleByEntry[entry.id];
        const hasExistingCycle = !!existingCycle && entry.pricingOptions.some((option) => option.cycle === existingCycle);

        if (hasExistingCycle) {
            nextSelectedCycleByEntry[entry.id] = existingCycle;
        } else if (entry.pricingOptions.length > 0) {
            nextSelectedCycleByEntry[entry.id] = entry.pricingOptions[0].cycle;
        }
    }

    return nextSelectedCycleByEntry;
}

export function getSelectedCatalogCycle(
    entry: CatalogEntry,
    selectedCycleByEntry: Record<string, CatalogBillingCycle>,
): CatalogBillingCycle {
    const selectedCycle = selectedCycleByEntry[entry.id];
    if (selectedCycle && entry.pricingOptions.some((option) => option.cycle === selectedCycle)) {
        return selectedCycle;
    }
    return entry.pricingOptions[0]?.cycle || "monthly";
}

export function getSelectedCatalogPricingOption(
    entry: CatalogEntry,
    selectedCycleByEntry: Record<string, CatalogBillingCycle>,
): CatalogPricingOption | null {
    const cycle = getSelectedCatalogCycle(entry, selectedCycleByEntry);
    return entry.pricingOptions.find((option) => option.cycle === cycle) || entry.pricingOptions[0] || null;
}

export function getListCatalogPricingOption(entry: CatalogEntry): CatalogPricingOption | null {
    return entry.pricingOptions.find((option) => option.cycle === "monthly") || entry.pricingOptions[0] || null;
}

function ensurePricingOptions(detailKind: CatalogDetailKind, pricingOptions: CatalogPricingOption[]): CatalogPricingOption[] {
    if (pricingOptions.length > 0) {
        return pricingOptions;
    }

    return [
        {
            cycle: "monthly",
            label: "Monthly",
            price: 0,
            basePrice: 0,
            discountAmount: 0,
            discountPercent: 0,
            priceIncludesDiscount: true,
            subscribableType: detailKind,
            subscribableId: "",
        },
    ];
}

function mapItemPricingOptions(itemDetail: CatalogPublicItemDetail): CatalogPricingOption[] {
    const pricingOptions: CatalogPricingOption[] = [];

    if (itemDetail.monthlyItemPricing?.id) {
        pricingOptions.push({
            cycle: "monthly",
            label: "Monthly",
            price: Math.max(Number(itemDetail.monthlyItemPricing.price || 0), 0),
            basePrice: Math.max(Number(itemDetail.monthlyItemPricing.price || 0), 0),
            discountAmount: 0,
            discountPercent: 0,
            priceIncludesDiscount: true,
            subscribableType: "item",
            subscribableId: itemDetail.monthlyItemPricing.id,
        });
    }

    if (itemDetail.annualItemPricing?.id) {
        pricingOptions.push({
            cycle: "annual",
            label: "Annual",
            price: Math.max(Number(itemDetail.annualItemPricing.price || 0), 0),
            basePrice: Math.max(Number(itemDetail.annualItemPricing.price || 0), 0),
            discountAmount: 0,
            discountPercent: 0,
            priceIncludesDiscount: true,
            subscribableType: "item",
            subscribableId: itemDetail.annualItemPricing.id,
        });
    }

    if (!pricingOptions.length) {
        const fallbackPrice = Math.max(Number(itemDetail.price || 0), 0);
        pricingOptions.push({
            cycle: "monthly",
            label: "Monthly",
            price: fallbackPrice,
            basePrice: fallbackPrice,
            discountAmount: 0,
            discountPercent: 0,
            priceIncludesDiscount: true,
            subscribableType: "item",
            subscribableId: "",
        });
    }

    return pricingOptions;
}

function mapPlanPricingOptions(planDetail: PlanPublicDetailResponse): CatalogPricingOption[] {
    const pricingOptions = (planDetail.pricings || [])
        .map((pricing): CatalogPricingOption | null => {
            const cycle = normalizeCatalogBillingCycle(pricing.billingCycle || "");
            if (!cycle) {
                return null;
            }

            const normalizedPrice = Math.max(Number(pricing.priceEur || 0), 0);
            const normalizedBasePrice = Math.max(Number(pricing.basePriceEur ?? pricing.priceEur) || 0, 0);
            const normalizedDiscountAmount = Math.max(Number(pricing.discountAmountEur || 0), 0);
            const normalizedDiscountPercent =
                normalizedBasePrice > 0
                    ? Math.max(0, Math.min(100, Math.round((normalizedDiscountAmount / normalizedBasePrice) * 100)))
                    : 0;

            return {
                cycle,
                label: cycle === "annual" ? "Annual" : "Monthly",
                price: normalizedPrice,
                basePrice: normalizedBasePrice,
                discountAmount: normalizedDiscountAmount,
                discountPercent: normalizedDiscountPercent,
                priceIncludesDiscount: true,
                subscribableType: "plan",
                subscribableId: pricing.id || "",
            };
        })
        .filter((pricing): pricing is CatalogPricingOption => !!pricing)
        .sort((left, right) => {
            if (left.cycle === right.cycle) {
                return 0;
            }
            return left.cycle === "monthly" ? -1 : 1;
        });

    return ensurePricingOptions("plan", pricingOptions);
}

function mapPlanItems(planDetail: PlanPublicDetailResponse, itemNameById: Map<string, string>): string[] {
    return (planDetail.components || [])
        .map((component) => {
            const catalogItemId = component.catalogItemId || "";
            if (!catalogItemId) {
                return "";
            }

            const itemName = itemNameById.get(catalogItemId) || catalogItemId;
            const quantity = Math.max(1, Math.round(Number(component.quantity || 1) || 1));
            return quantity > 1 ? `${itemName} x${quantity}` : itemName;
        })
        .filter((value) => !!value);
}

export function mapCatalogPublicEntries(entries: CatalogPublicEntry[]): CatalogEntry[] {
    const itemNameById = new Map<string, string>();

    for (const entry of entries || []) {
        if (entry.itemDetail?.id) {
            itemNameById.set(entry.itemDetail.id, entry.itemDetail.name || "Untitled");
        }
    }

    const mappedEntries: CatalogEntry[] = [];

    for (const entry of entries || []) {
        const isPlan = entry.detailKind === "plan" || !!entry.planDetail?.plan;

        if (isPlan && entry.planDetail?.plan?.id) {
            const plan = entry.planDetail.plan;
            const pricingOptions = mapPlanPricingOptions(entry.planDetail);

            mappedEntries.push({
                id: `plan-${plan.id}`,
                entityId: plan.id,
                detailKind: "plan",
                kind: "plan",
                kindLabel: "Plan",
                typeLabel: plan.pricingMode || "",
                name: plan.name || "Untitled",
                shortDescription: plan.description || "",
                longDescription: plan.description || "",
                planItems: mapPlanItems(entry.planDetail, itemNameById),
                initials: computeCatalogInitials(plan.name || ""),
                pricingOptions,
                minPrice: pricingOptions.reduce((minPrice, option) => Math.min(minPrice, option.price), pricingOptions[0].price),
            });
            continue;
        }

        const itemDetail = entry.itemDetail;
        if (!itemDetail?.id) {
            continue;
        }

        const kind = normalizeCatalogKindFromType(itemDetail.type || "");
        const pricingOptions = ensurePricingOptions("item", mapItemPricingOptions(itemDetail));

        mappedEntries.push({
            id: `item-${itemDetail.id}`,
            entityId: itemDetail.id,
            detailKind: "item",
            kind,
            kindLabel: kind === "service" ? "Service" : "Product",
            typeLabel: itemDetail.type || "",
            name: itemDetail.name || "Untitled",
            shortDescription: itemDetail.shortDescription || "",
            longDescription: itemDetail.longDescription || itemDetail.shortDescription || "",
            planItems: [],
            initials: computeCatalogInitials(itemDetail.name || ""),
            pricingOptions,
            minPrice: pricingOptions.reduce((minPrice, option) => Math.min(minPrice, option.price), pricingOptions[0].price),
        });
    }

    return mappedEntries;
}
