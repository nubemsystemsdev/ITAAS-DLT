// CatalogItem - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "catalog_item";
const PRIMARY_KEY = "id";

export const ITAAS_PLATFORM_ITEM_ID = "itaas-platform";
/** Default monthly list price for the ITAAS Platform item (EUR). */
export const ITAAS_PLATFORM_DEFAULT_MONTHLY_EUR = 30;
/** Default annual list price for the ITAAS Platform item (EUR). */
export const ITAAS_PLATFORM_DEFAULT_ANNUAL_EUR = 300;
export const ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS = ITAAS_PLATFORM_DEFAULT_MONTHLY_EUR * 100;
export const ITAAS_PLATFORM_DEFAULT_ANNUAL_CENTS = ITAAS_PLATFORM_DEFAULT_ANNUAL_EUR * 100;

export const CUSTOM_AGENT_ITEM_ID = "custom-agent-service";
/** Default monthly price for custom agent service (EUR). */
export const CUSTOM_AGENT_DEFAULT_MONTHLY_EUR = 150;
/** Default deposit for custom agent service (EUR). */
export const CUSTOM_AGENT_DEFAULT_DEPOSIT_EUR = 50;
export const CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS = CUSTOM_AGENT_DEFAULT_MONTHLY_EUR * 100;
export const CUSTOM_AGENT_DEFAULT_DEPOSIT_CENTS = CUSTOM_AGENT_DEFAULT_DEPOSIT_EUR * 100;

export enum CatalogItemType {
    ITAAS_PLATFORM = "ITAAS Platform",
    CUSTOM_AGENT_SERVICE = "Custom Agent Service",
    DIGITAL_PRODUCT = "Digital Product",
    RECURRING_SERVICE = "Recurring Service"
}

export enum CatalogItemStatus {
    PUBLISHED = "Published",
    DRAFT = "Draft",
    ARCHIVED = "Archived",
}

export enum CatalogItemVisibility {
    PUBLIC = "Public",
    HIDDEN = "Hidden",
}

/* db-index: type */
/* db-index: status */
/* db-index: visibility */
/* db-index: price */
/* db-index: name */
/* db-index: createdAt */
/* db-index: status, visibility, type */
/* db-index: status, visibility, createdAt DESC */
/* db-index: status, visibility, price */

export class CatalogItem extends DataModel {
    public static readonly finder = new DataFinder<CatalogItem, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<CatalogItem>) => new CatalogItem(data));

    public static async findById(id: string): Promise<CatalogItem> {
        return CatalogItem.finder.findByKey(id);
    }

    public static async findByIds(ids: string[]): Promise<CatalogItem[]> {
        if (!ids.length) {
            return [];
        }

        return CatalogItem.finder.find(
            DataFilter.into("id", ids),
            OrderBy.nothing(),
            SelectOptions.configure(),
        );
    }

    /**
     * Resolves catalog item types for list filters.
     * @param type - Exact catalog item type
     * @param catalogKind - Group filter: service (recurring + ITAAS platform) or product
     * @returns Types to match, or undefined for no type filter
     */
    public static resolveCatalogTypesFilter(type?: string, catalogKind?: string): string[] | undefined {
        if (catalogKind === "service") {
            return [CatalogItemType.RECURRING_SERVICE, CatalogItemType.ITAAS_PLATFORM, CatalogItemType.CUSTOM_AGENT_SERVICE];
        }
        if (catalogKind === "product") {
            return [CatalogItemType.DIGITAL_PRODUCT];
        }
        if (type) {
            return [type];
        }
        return undefined;
    }

    public static resolveAdminTypesFilter(type?: string, catalogKind?: string): string[] | undefined {
        return CatalogItem.resolveCatalogTypesFilter(type, catalogKind);
    }

    public static makeFilter(
        q?: string,
        type?: string,
        status?: string,
        visibility?: string,
        types?: string[],
    ): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.contains("name", q, true),
                DataFilter.contains("type", q, true),
            ));
        }

        if (types?.length) {
            filters.push(DataFilter.into("type", types));
        } else if (type) {
            filters.push(DataFilter.equals("type", type));
        }

        if (status) {
            filters.push(DataFilter.equals("status", status));
        }

        if (visibility) {
            filters.push(DataFilter.equals("visibility", visibility));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(
        q?: string,
        type?: string,
        status?: string,
        visibility?: string,
        types?: string[],
    ): Promise<number> {
        return CatalogItem.finder.count(CatalogItem.makeFilter(q, type, status, visibility, types));
    }

    public static async findFiltered(
        skip: number,
        limit: number,
        q?: string,
        type?: string,
        status?: string,
        visibility?: string,
        types?: string[],
    ): Promise<CatalogItem[]> {
        return CatalogItem.finder.find(
            CatalogItem.makeFilter(q, type, status, visibility, types),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async findPublished(): Promise<CatalogItem[]> {
        return CatalogItem.finder.find(
            DataFilter.and(
                DataFilter.equals("status", CatalogItemStatus.PUBLISHED),
                DataFilter.equals("visibility", CatalogItemVisibility.PUBLIC),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findIdsByTypes(types: CatalogItemType[]): Promise<string[]> {
        if (!types.length) {
            return [];
        }

        const ids: string[] = [];
        for (const type of types) {
            const items = await CatalogItem.finder.find(
                DataFilter.equals("type", type),
                OrderBy.nothing(),
                SelectOptions.configure(),
            );
            ids.push(...items.map((item) => item.id));
        }
        return ids;
    }

    public static isItaasPlatformItem(item: { id: string; type: string }): boolean {
        return item.id === ITAAS_PLATFORM_ITEM_ID || item.type === CatalogItemType.ITAAS_PLATFORM;
    }

    public static isCustomAgentServiceItem(item: { id: string; type: string }): boolean {
        return item.id === CUSTOM_AGENT_ITEM_ID || item.type === CatalogItemType.CUSTOM_AGENT_SERVICE;
    }

    public static isProtectedCatalogItem(item: { id: string; type: string }): boolean {
        return CatalogItem.isItaasPlatformItem(item) || CatalogItem.isCustomAgentServiceItem(item);
    }

    public static isServiceCatalogType(type: CatalogItemType | string): boolean {
        return (
            type === CatalogItemType.RECURRING_SERVICE ||
            type === CatalogItemType.ITAAS_PLATFORM ||
            type === CatalogItemType.CUSTOM_AGENT_SERVICE
        );
    }

    public static async findItaasPlatform(): Promise<CatalogItem | null> {
        return CatalogItem.finder.findByKey(ITAAS_PLATFORM_ITEM_ID);
    }

    public static async getOrCreateItaasPlatform(): Promise<CatalogItem> {
        const existing = await CatalogItem.findItaasPlatform();
        if (existing) {
            return existing;
        }
        const now = Date.now();
        const item = new CatalogItem({
            id: ITAAS_PLATFORM_ITEM_ID,
            type: CatalogItemType.ITAAS_PLATFORM,
            name: "ITAAS Platform",
            shortDescription: "ITAAS distributed ledger platform service",
            longDescription: "",
            price: ITAAS_PLATFORM_DEFAULT_MONTHLY_CENTS,
            depositCents: 0,
            status: CatalogItemStatus.PUBLISHED,
            visibility: CatalogItemVisibility.PUBLIC,
            createdAt: now,
        });
        await item.insert();
        return item;
    }

    public static async findCustomAgentService(): Promise<CatalogItem | null> {
        return CatalogItem.finder.findByKey(CUSTOM_AGENT_ITEM_ID);
    }

    public static async getOrCreateCustomAgentService(): Promise<CatalogItem> {
        const existing = await CatalogItem.findCustomAgentService();
        if (existing) {
            return existing;
        }
        const now = Date.now();
        const item = new CatalogItem({
            id: CUSTOM_AGENT_ITEM_ID,
            type: CatalogItemType.CUSTOM_AGENT_SERVICE,
            name: "Custom Agent Service",
            shortDescription: "Fixed pricing for ITAAS custom agent requests",
            longDescription: "",
            price: CUSTOM_AGENT_DEFAULT_MONTHLY_CENTS,
            depositCents: CUSTOM_AGENT_DEFAULT_DEPOSIT_CENTS,
            status: CatalogItemStatus.PUBLISHED,
            visibility: CatalogItemVisibility.HIDDEN,
            createdAt: now,
        });
        await item.insert();
        return item;
    }

    public static async createItem(data: {
        type: CatalogItemType;
        name: string;
        shortDescription: string;
        longDescription?: string;
        price: number;
        status?: CatalogItemStatus;
        visibility?: CatalogItemVisibility;
    }): Promise<CatalogItem> {
        const now = Date.now();
        const item = new CatalogItem({
            id: createRandomUID(),
            type: data.type,
            name: data.name,
            shortDescription: data.shortDescription,
            longDescription: data.longDescription || "",
            price: Math.max(0, Math.round(data.price || 0)),
            depositCents: 0,
            status: data.status || CatalogItemStatus.DRAFT,
            visibility: data.visibility || CatalogItemVisibility.PUBLIC,
            createdAt: now,
        });

        await item.insert();
        return item;
    }
    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public type: string;
    /* db-type: VARCHAR */
    public name: string;
    /* db-type: VARCHAR */
    public shortDescription: string;
    /* db-type: VARCHAR */
    public longDescription: string;
    /* db-type: INT */
    public price: number;
    /* db-type: INT */
    public depositCents: number;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: VARCHAR */
    public visibility: string;
    /* db-type: INT */
    public createdAt: number;

    constructor(data: TypedRow<CatalogItem>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.type = enforceType(data.type, "string") || CatalogItemType.DIGITAL_PRODUCT;
        this.name = enforceType(data.name, "string") || "";
        this.shortDescription = enforceType(data.shortDescription, "string") || "";
        this.longDescription = enforceType(data.longDescription, "string") || "";
        this.price = Math.max(0, Math.round(enforceType(data.price, "number") || 0));
        this.depositCents = Math.max(0, Math.round(enforceType(data.depositCents, "number") || 0));
        this.status = enforceType(data.status, "string") || CatalogItemStatus.DRAFT;
        this.visibility = enforceType(data.visibility, "string") || CatalogItemVisibility.PUBLIC;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();

        this.init();
    }
}
