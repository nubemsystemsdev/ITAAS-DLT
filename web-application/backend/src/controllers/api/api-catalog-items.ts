// Catalog Items API

"use strict";

import { ObjectSchema } from "@asanrom/javascript-object-sanitizer";
import Express from "express";
import { BillingCycle, ItemPlan } from "../../models/item-plan";
import { CatalogItem, CatalogItemStatus, CatalogItemType, CatalogItemVisibility } from '../../models/catalog-item';
import { CatalogItemService, CatalogItemTraceabilityUpdateError } from "../../services/catalog-item-service";
import { CatalogPublicEntriesService } from "../../services/catalog-public-entries-service";
import { OrganizationService } from "../../services/organization-service";
import { UsersService } from "../../services/users-service";
import { isEnumValue, parsePageParameters } from "../../utils/api-utils";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";
import { TraceabilityService } from "../../services/traceability-service";

const CATALOG_LIST_PAGE_LIMIT = 25;
const NAME_MAX_LENGTH = 100;
const SHORT_DESC_MAX_LENGTH = 300;
const LONG_DESC_MAX_LENGTH = 5000;

/**
 * Catalog Items API
 * @group catalog_items
 */
export class CatalogItemsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/catalog/entries", noCache(this.getPublicEntries.bind(this)));
        application.get(prefix + "/catalog/items", noCache(this.getPublicItems.bind(this)));
        application.get(prefix + "/catalog/items/:id", noCache(this.getPublicItem.bind(this)));

        application.get(prefix + "/admin/catalog/items", noCache(this.getAdminItems.bind(this)));
        application.get(prefix + "/admin/catalog/entries", noCache(this.getAdminEntries.bind(this)));
        application.get(prefix + "/admin/catalog/items/:id", noCache(this.getAdminItem.bind(this)));
        application.post(prefix + "/admin/catalog/items", ensureObjectBody(this.createItem.bind(this)));
        application.put(prefix + "/admin/catalog/items/:id", ensureObjectBody(this.updateItem.bind(this)));
        application.delete(prefix + "/admin/catalog/items/:id", ensureObjectBody(this.deleteItem.bind(this)));
        application.post(prefix + "/admin/catalog/items/:id/archive", ensureObjectBody(this.archiveItem.bind(this)));
    }

    /**
     * @typedef CatalogPublicListItem
     * @property {string} id.required - Item ID
     * @property {string} type.required - Item type
     * @property {string} name.required - Item name
     * @property {string} shortDescription.required - Short description
     * @property {string} longDescription.required - Long description
     * @property {number} price.required - Item price
     * @property {string} status.required - Item status
     * @property {number} createdAt.required - Creation timestamp
     */

    /**
     * @typedef CatalogPublicList
     * @property {Array.<CatalogPublicListItem>} items.required - Catalog items
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
      * @typedef CatalogPublicItemPricing
      * @property {string} id.required - ItemPricing ID
      * @property {number} price.required - ItemPricing price in EUR
      */

    /**
      * @typedef CatalogPublicItemDetail
      * @property {string} id.required - Item ID
      * @property {string} type.required - Item type
      * @property {string} name.required - Item name
      * @property {string} shortDescription.required - Short description
      * @property {string} longDescription.required - Long description
      * @property {number} price.required - Default item price in EUR
      * @property {number} depositPriceEur - Deposit price in EUR (Custom Agent Service)
      * @property {string} status.required - Item status
      * @property {number} createdAt.required - Creation timestamp
      * @property {CatalogPublicItemPricing.model} monthlyItemPricing - Monthly ItemPricing detail
      * @property {CatalogPublicItemPricing.model} annualItemPricing - Annual ItemPricing detail
      */

    /**
      * @typedef CatalogPublicEntry
      * @property {string} detailKind.required - Entry detail kind (item or plan)
      * @property {CatalogPublicItemDetail.model} itemDetail - Catalog item detail payload
      * @property {PlanPublicDetailResponse.model} planDetail - Plan detail payload
      */

    /**
      * @typedef CatalogPublicEntryList
      * @property {Array.<CatalogPublicEntry>} items.required - Catalog entries with legacy detail payloads
      * @property {number} page.required - Page number
      * @property {number} totalPages.required - Total pages
      * @property {number} total.required - Total results
      */

    /**
     * Get public catalog entries (items and plans) in one paginated response
     * Binding: GetPublicCatalogEntries
     * @route GET /catalog/entries
     * @group catalog_items
     * @param {string} q.query - Search query
     * @param {string} filter.query - Legacy filter by product, service, plan or all
     * @param {string} type.query - Filter by product, service, plan or all
     * @param {string} subscriptionMode.query - Subscription mode: monthly, annual or any
     * @param {number} minPrice.query - Minimum price in EUR (uses selected subscriptionMode)
     * @param {number} maxPrice.query - Maximum price in EUR (uses selected subscriptionMode)
     * @param {string} sortBy.query - Sort field: relevance, name, price, createdAt
     * @param {string} sortDir.query - Sort direction: asc or desc
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {CatalogPublicEntryList.model} 200 - Paginated catalog entries
     */
    public async getPublicEntries(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        const showMultiLicensePlans = await OrganizationService.getInstance().showMultiLicensePlansInCatalog(auth.isRegisteredUser() ? auth.user.id : null);

        const list = await CatalogPublicEntriesService.getInstance().listPublicEntries(
            {
                q: request.query.q,
                filter: request.query.filter,
                type: request.query.type,
                subscriptionMode: request.query.subscriptionMode,
                minPrice: request.query.minPrice,
                maxPrice: request.query.maxPrice,
                sortBy: request.query.sortBy,
                sortDir: request.query.sortDir,
                page: request.query.page,
                pageSize: request.query.pageSize,
                showMultiLicensePlans,
            },
            CATALOG_LIST_PAGE_LIMIT,
        );

        sendApiResult(request, response, list);
    }

    /**
     * Get public catalog items (Published + Public only)
     * Binding: GetPublicCatalogItems
     * @route GET /catalog/items
     * @group catalog_items
     * @param {string} q.query - Search query
     * @param {string} type.query - Filter by type
     * @param {string} catalogKind.query - Filter by kind: service (includes ITAAS Platform) or product
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {CatalogPublicList.model} 200 - List of published catalog items
     */
    public async getPublicItems(request: Express.Request, response: Express.Response) {
        const q = ((request.query.q as string) || "").trim();
        const type = ((request.query.type as string) || "").trim();
        const catalogKind = ((request.query.catalogKind as string) || "").trim();
        const typesFilter = CatalogItem.resolveCatalogTypesFilter(type || undefined, catalogKind || undefined);

        const total = await CatalogItem.countFiltered(q || undefined, undefined, CatalogItemStatus.PUBLISHED, CatalogItemVisibility.PUBLIC, typesFilter);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, CATALOG_LIST_PAGE_LIMIT);
        const items = await CatalogItem.findFiltered(skip, pageSize, q || undefined, undefined, CatalogItemStatus.PUBLISHED, CatalogItemVisibility.PUBLIC, typesFilter);

        sendApiResult(request, response, {
            items: items.map(i => CatalogItemService.getInstance().toCatalogItemApi(i)),
            page,
            totalPages,
            total,
        });
    }

    /**
     * Get a public catalog item (Published + Public, or the Hidden custom-agent-service pricing item)
     * Binding: GetPublicCatalogItem
     * @route GET /catalog/items/{id}
     * @group catalog_items
     * @param {string} id.path.required - Item ID
     * @returns {CatalogPublicItemDetail.model} 200 - Item details
     * @returns {void} 404 - Not found
     */
    public async getPublicItem(request: Express.Request, response: Express.Response) {
        const id = (request.params.id || "") + "";
        const item = await CatalogItem.findById(id);

        if (!item || item.status !== CatalogItemStatus.PUBLISHED) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }

        // Custom agent pricing is fetched by ID from the ITAAS request UI, but stays Hidden in public catalog listings.
        const isVisiblePublicly = item.visibility === CatalogItemVisibility.PUBLIC;
        const isCustomAgentPricingLookup = CatalogItem.isCustomAgentServiceItem(item);
        if (!isVisiblePublicly && !isCustomAgentPricingLookup) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }

        const monthlyPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.MONTHLY);
        const annualPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.ANNUAL);
        const catalogService = CatalogItemService.getInstance();
        if (isCustomAgentPricingLookup && monthlyPlan) {
            await catalogService.ensureCustomAgentServicePublicPricing(item, monthlyPlan);
        }
        const payload: Record<string, unknown> = {
            ...catalogService.toCatalogItemApi(item),
            monthlyItemPricing: monthlyPlan ? {
                id: monthlyPlan.id,
                price: catalogService.centsToEur(monthlyPlan.priceCents),
            } : null,
            annualItemPricing: annualPlan ? {
                id: annualPlan.id,
                price: catalogService.centsToEur(annualPlan.priceCents),
            } : null,
        };
        if (isCustomAgentPricingLookup) {
            payload.depositPriceEur = catalogService.centsToEur(item.depositCents);
        }

        sendApiResult(request, response, payload);
    }

    /**
     * @typedef CatalogAdminItem
     * @property {string} id.required - Item ID
     * @property {string} type.required - Item type
     * @property {string} name.required - Item name
     * @property {string} shortDescription.required - Short description
     * @property {string} longDescription.required - Long description
     * @property {number} price.required - Monthly item price in EUR
     * @property {number} annualPriceEur - Annual item price in EUR
     * @property {number} depositPriceEur - Deposit price in EUR (Custom Agent Service)
     * @property {string} status.required - Item status
     * @property {string} visibility.required - Item visibility
     * @property {number} createdAt.required - Creation timestamp
     */

    /**
     * @typedef CatalogAdminList
     * @property {Array.<CatalogAdminItem>} items.required - Catalog items
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Get all catalog items (admin, all statuses)
     * Requires permission: admin.users.manage
     * Binding: GetAdminCatalogItems
     * @route GET /admin/catalog/items
     * @group catalog_items
     * @param {string} q.query - Search query
     * @param {string} type.query - Filter by type
     * @param {string} catalogKind.query - Filter by kind: service (includes ITAAS Platform) or product
     * @param {string} status.query - Filter by status
     * @param {string} visibility.query - Filter by visibility
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size
     * @returns {CatalogAdminList.model} 200 - List of catalog items
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAdminItems(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const q = ((request.query.q as string) || "").trim();
        const type = ((request.query.type as string) || "").trim();
        const catalogKind = ((request.query.catalogKind as string) || "").trim();
        const status = ((request.query.status as string) || "").trim();
        const visibility = ((request.query.visibility as string) || "").trim();
        const typesFilter = CatalogItem.resolveCatalogTypesFilter(type || undefined, catalogKind || undefined);

        const total = await CatalogItem.countFiltered(
            q || undefined,
            undefined,
            status || undefined,
            visibility || undefined,
            typesFilter,
        );
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, CATALOG_LIST_PAGE_LIMIT);
        const items = await CatalogItem.findFiltered(
            skip,
            pageSize,
            q || undefined,
            undefined,
            status || undefined,
            visibility || undefined,
            typesFilter,
        );

        const adminItems = await CatalogItemService.getInstance().mapItemsToAdminApi(items);

        sendApiResult(request, response, {
            items: adminItems,
            page,
            totalPages,
            total,
        });
    }

    /**
     * @typedef CatalogAdminEntry
     * @property {boolean} isPlan.required - True when the row is a business plan
     * @property {string} id.required - Entry ID
     * @property {string} name.required - Entry name
     * @property {string} type.required - Catalog item type or Plan
     * @property {number} price.required - Monthly price in EUR
     * @property {number} annualPriceEur - Annual price in EUR
     * @property {string} pricingMode - Plan pricing mode when isPlan
     * @property {number} discountPercent - Plan discount percent when isPlan
     * @property {string} visibility - Item visibility when not a plan
     * @property {string} status.required - Entry status
     * @property {number} updatedAt.required - Last update timestamp
     */

    /**
     * @typedef CatalogAdminEntryList
     * @property {Array.<CatalogAdminEntry>} items.required - Catalog items and plans
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Get all catalog items and plans (admin, all statuses) in one paginated response
     * Requires permission: admin.users.manage
     * Binding: GetAdminCatalogEntries
     * @route GET /admin/catalog/entries
     * @group catalog_items
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size
     * @returns {CatalogAdminEntryList.model} 200 - Paginated catalog entries
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAdminEntries(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const list = await CatalogPublicEntriesService.getInstance().listAdminEntries(request.query, CATALOG_LIST_PAGE_LIMIT);
        sendApiResult(request, response, list);
    }

    /**
     * Get a single catalog item (admin)
     * Requires permission: admin.users.manage
     * Binding: GetAdminCatalogItem
     * @route GET /admin/catalog/items/{id}
     * @group catalog_items
     * @param {string} id.path.required - Item ID
     * @returns {CatalogAdminItem.model} 200 - Item details
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async getAdminItem(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const id = (request.params.id || "") + "";
        const item = await CatalogItem.findById(id);

        if (!item) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }

        const annualPlan = await ItemPlan.findByItemAndCycle(item.id, BillingCycle.ANNUAL);
        const annualPriceEur = annualPlan
            ? CatalogItemService.getInstance().centsToEur(annualPlan.priceCents)
            : undefined;

        sendApiResult(request, response, CatalogItemService.getInstance().toCatalogAdminItemApi(item, annualPriceEur));
    }

    /**
     * @typedef CatalogBody
     * @property {string} type.required - Item type
     * @property {string} name.required - Item name
     * @property {string} shortDescription.required - Short description
     * @property {string} longDescription - Long description
     * @property {number} monthlyPriceEur.required - Monthly price in EUR
     * @property {number} annualPriceEur - Annual price in EUR
     * @property {number} depositPriceEur - Deposit price in EUR (Custom Agent Service)
     * @property {string} status - Status (default: Draft)
     * @property {string} visibility - Visibility (default: Public)
     */

    /**
     * Create a catalog item
     * Requires permission: admin.users.manage
     * Binding: CreateCatalogItem
     * @route POST /admin/catalog/items
     * @group catalog_items
     * @param {CatalogBody.model} request.body - Item data
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_TYPE, INVALID_NAME, INVALID_SHORT_DESCRIPTION, INVALID_LONG_DESCRIPTION, INVALID_MONTHLY_PRICE, INVALID_ANNUAL_PRICE, INVALID_STATUS, INVALID_VISIBILITY, PROTECTED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async createItem(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const body = ObjectSchema.object({
            type: ObjectSchema.string().withDefaultValue(""),
            name: ObjectSchema.string().withDefaultValue(""),
            shortDescription: ObjectSchema.string().withDefaultValue(""),
            longDescription: ObjectSchema.string().withDefaultValue(""),
            monthlyPriceEur: ObjectSchema.number().withDefaultValue(0),
            annualPriceEur: ObjectSchema.number().withDefaultValue(0),
            status: ObjectSchema.string().withDefaultValue(CatalogItemStatus.DRAFT),
            visibility: ObjectSchema.string().withDefaultValue(CatalogItemVisibility.PUBLIC),
        }).sanitize(request.body);

        if (!isEnumValue(CatalogItemType, body.type)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TYPE", "Invalid type value");
            return;
        }
        if (body.type === CatalogItemType.ITAAS_PLATFORM) {
            sendApiError(request, response, BAD_REQUEST, "PROTECTED", "The ITAAS Platform item cannot be created via this endpoint");
            return;
        }
        if (body.type === CatalogItemType.CUSTOM_AGENT_SERVICE) {
            sendApiError(request, response, BAD_REQUEST, "PROTECTED", "The Custom Agent Service item cannot be created via this endpoint");
            return;
        }
        if (!body.name.trim() || body.name.trim().length > NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NAME", "Name is required and must be less than " + NAME_MAX_LENGTH + " characters");
            return;
        }
        if (!body.shortDescription.trim() || body.shortDescription.trim().length > SHORT_DESC_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SHORT_DESCRIPTION", "Short description is required and must be less than " + SHORT_DESC_MAX_LENGTH + " characters");
            return;
        }
        if (body.longDescription && body.longDescription.length > LONG_DESC_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_LONG_DESCRIPTION", "Long description must be less than " + LONG_DESC_MAX_LENGTH + " characters");
            return;
        }
        if (!Number.isFinite(body.monthlyPriceEur) || body.monthlyPriceEur <= 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_MONTHLY_PRICE", "monthlyPriceEur must be a positive number");
            return;
        }
        if (!Number.isFinite(body.annualPriceEur) || body.annualPriceEur <= 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_ANNUAL_PRICE", "annualPriceEur must be a positive number");
            return;
        }
        if (!isEnumValue(CatalogItemStatus, body.status)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_STATUS", "Invalid status value");
            return;
        }
        if (!isEnumValue(CatalogItemVisibility, body.visibility)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_VISIBILITY", "Invalid visibility value");
            return;
        }

        const requestedStatus = body.status as CatalogItemStatus;

        let createdItem: CatalogItem;
        try {
            const createResult = await CatalogItemService.getInstance().createCatalogItemWithPricing({
                type: body.type as CatalogItemType,
                name: body.name.trim(),
                shortDescription: body.shortDescription.trim(),
                longDescription: body.longDescription,
                monthlyPriceEur: body.monthlyPriceEur,
                annualPriceEur: body.annualPriceEur,
                status: requestedStatus,
                visibility: body.visibility as CatalogItemVisibility,
            });
            createdItem = createResult.item;
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "CREATE_FAILED", ex instanceof Error ? ex.message : "Failed to create catalog item");
            return;
        }

        try {
            const visibility = body.visibility === CatalogItemVisibility.HIDDEN ? BigInt(1) : BigInt(0);
            await TraceabilityService.getInstance().syncCatalogItemState(createdItem.id, requestedStatus, visibility);
        } catch (ex) {
            await CatalogItemService.getInstance().deleteCatalogItemWithPricing(createdItem.id);
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "CREATE_TRACEABILITY_FAILED", ex instanceof Error ? ex.message : "Failed to record catalog item creation");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Update a catalog item
     * Requires permission: admin.users.manage
     * Binding: UpdateCatalogItem
     * @route PUT /admin/catalog/items/{id}
     * @group catalog_items
     * @param {string} id.path.required - Item ID
     * @param {CatalogBody.model} request.body - Fields to update
     * @returns {CatalogAdminItem.model} 200 - Updated item
     * @returns {void} 400 - Bad request: INVALID_REQUEST, INVALID_TYPE, INVALID_NAME, INVALID_SHORT_DESCRIPTION, INVALID_LONG_DESCRIPTION, INVALID_MONTHLY_PRICE, INVALID_ANNUAL_PRICE, INVALID_DEPOSIT_PRICE, INVALID_STATUS, INVALID_VISIBILITY, PROTECTED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @returns {void} 500 - Internal server error: UPDATE_FAILED, UPDATE_TRACEABILITY_FAILED, UPDATE_TRACEABILITY_ROLLBACK_FAILED
     * @security AuthToken
     */
    public async updateItem(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const id = (request.params.id || "") + "";
        const item = await CatalogItem.findById(id);
        if (!item) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }

        try {
            await CatalogItemService.getInstance().updateCatalogItemFromInput(item, request.body);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "Failed to update catalog item";
            if (ex instanceof CatalogItemTraceabilityUpdateError) {
                sendApiError(request, response, INTERNAL_SERVER_ERROR, ex.code, message);
                return;
            }
            
            if (message === "PROTECTED") {
                sendApiError(request, response, BAD_REQUEST, "PROTECTED", "Protected catalog item types cannot be assigned or changed");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "UPDATE_FAILED", message);
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Delete a catalog item
     * Requires permission: admin.users.manage
     * Binding: DeleteCatalogItem
     * @route DELETE /admin/catalog/items/{id}
     * @group catalog_items
     * @param {string} id.path.required - Item ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: PROTECTED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async deleteItem(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const id = (request.params.id || "") + "";
        const item = await CatalogItem.findById(id);
        if (!item) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }

        if (CatalogItem.isItaasPlatformItem(item)) {
            sendApiError(request, response, BAD_REQUEST, "PROTECTED", "The ITAAS Platform item cannot be deleted");
            return;
        }
        if (CatalogItem.isCustomAgentServiceItem(item)) {
            sendApiError(request, response, BAD_REQUEST, "PROTECTED", "The Custom Agent Service item cannot be deleted");
            return;
        }

        try {
            await CatalogItemService.getInstance().deleteCatalogItemWithPricing(item.id);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "DELETE_FAILED", ex instanceof Error ? ex.message : "Failed to delete catalog item");
            return;
        }

        try {
            await TraceabilityService.getInstance().recordCatalogDeleted(item.id);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "DELETE_TRACEABILITY_FAILED", ex instanceof Error ? ex.message : "Failed to record catalog item deletion");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Archive a catalog item
     * Requires permission: admin.users.manage
     * Binding: ArchiveCatalogItem
     * @route POST /admin/catalog/items/{id}/archive
     * @group catalog_items
     * @param {string} id.path.required - Item ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: PROTECTED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async archiveItem(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const id = (request.params.id || "") + "";
        const item = await CatalogItem.findById(id);
        if (!item) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Catalog item not found");
            return;
        }
        if (CatalogItem.isCustomAgentServiceItem(item)) {
            sendApiError(request, response, BAD_REQUEST, "PROTECTED", "The Custom Agent Service item cannot be archived");
            return;
        }
        const previousStatus = item.status;
        item.status = CatalogItemStatus.ARCHIVED;
        await item.save();

        try {
            const visibility = item.visibility === CatalogItemVisibility.HIDDEN ? BigInt(1) : BigInt(0);
            await TraceabilityService.getInstance().syncCatalogItemState(id, CatalogItemStatus.ARCHIVED, visibility);
        } catch (ex) {
            item.status = previousStatus;
            await item.save();
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "ARCHIVE_FAILED", ex instanceof Error ? ex.message : "Failed to record catalog item withdrawal");
            return;
        }

        sendApiSuccess(request, response);
    }
}
