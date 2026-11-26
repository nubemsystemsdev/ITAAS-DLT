// Plans API

"use strict";

import { ObjectSchema } from "@asanrom/javascript-object-sanitizer";
import Express from "express";
import { BillingCycle } from "../../models/item-plan";
import { Plan, PlanPricingMode, PlanStatus } from "../../models/plan";
import { PlanService } from "../../services/plan-service";
import { OrganizationService } from "../../services/organization-service";
import { UsersService } from "../../services/users-service";
import { isEnumValue, parsePageParameters } from "../../utils/api-utils";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";

const PLAN_LIST_PAGE_LIMIT = 25;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 5000;

/**
 * Plans API
 * @group plans
 */
export class PlansController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/plans", noCache(this.getPublicPlans.bind(this)));
        application.get(prefix + "/plans/:id", noCache(this.getPublicPlan.bind(this)));

        application.get(prefix + "/admin/plans", noCache(this.getAdminPlans.bind(this)));
        application.get(prefix + "/admin/plans/:id", noCache(this.getAdminPlan.bind(this)));
        application.post(prefix + "/admin/plans", ensureObjectBody(this.createPlan.bind(this)));
        application.put(prefix + "/admin/plans/:id", ensureObjectBody(this.updatePlan.bind(this)));
        application.delete(prefix + "/admin/plans/:id", ensureObjectBody(this.deletePlan.bind(this)));
        application.post(prefix + "/admin/plans/:id/archive", ensureObjectBody(this.archivePlan.bind(this)));
    }

    /**
     * @typedef PlanPublicListItem
     * @property {string} id.required - Plan ID
     * @property {string} name.required - Plan name
     * @property {string} description.required - Plan description
     * @property {string} pricingMode.required - Pricing mode (fixed or calculated)
     * @property {number} discountPercent.required - Discount percentage
     * @property {string} supportTier.required - Support tier
     * @property {string} supportConfig.required - Support config JSON
     * @property {string} superiorPlanId - Superior plan ID
     * @property {number} planIndex.required - Plan index
     * @property {number} createdAt.required - Creation timestamp
     * @property {string} status - Plan status (admin list)
     * @property {number} updatedAt - Last update timestamp (admin list)
     * @property {number} monthlyPriceEur - Monthly price in EUR (admin list, from PlanPricing)
     * @property {number} annualPriceEur - Annual price in EUR (admin list, from PlanPricing)
     */

    /**
     * @typedef PlanPublicList
     * @property {Array.<PlanPublicListItem>} items.required - Published plans
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * @typedef PlanPublicDetailPlan
     * @property {string} id.required - Plan ID
     * @property {string} name.required - Plan name
     * @property {string} description.required - Plan description
     * @property {string} pricingMode.required - Pricing mode
     * @property {number} discountPercent.required - Discount percentage
     * @property {string} supportConfig.required - Support config JSON
     * @property {number} planIndex.required - Plan index
     * @property {string} status.required - Plan status
     * @property {number} createdAt.required - Creation timestamp
     * @property {number} updatedAt.required - Update timestamp
     */

    /**
     * @typedef PlanPublicDetailComponent
     * @property {string} catalogItemId.required - Catalog item ID
     * @property {number} quantity.required - Quantity
     */

    /**
     * @typedef PlanPublicDetailPricing
     * @property {string} id.required - Pricing ID
     * @property {string} billingCycle.required - Billing cycle
     * @property {number} priceEur.required - Final price in EUR
     * @property {number} basePriceEur.required - Current component total in EUR
     * @property {number} discountAmountEur.required - Current discount amount in EUR
     */

    /**
     * @typedef PlanPublicDetailResponse
     * @property {PlanPublicDetailPlan.model} plan.required - Plan detail
     * @property {Array.<PlanPublicDetailComponent>} components.required - Plan components
     * @property {Array.<PlanPublicDetailPricing>} pricings.required - Plan pricing detail
     */

    /**
     * Get published plans (public)
     * Binding: GetPublicPlans
     * @route GET /plans
     * @group plans
     * @param {number} page.query - Page number (starting by 1)
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {PlanPublicList.model} 200 - List of published plans
     */
    public async getPublicPlans(request: Express.Request, response: Express.Response) {
        const total = await Plan.countByStatus(PlanStatus.PUBLISHED);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, PLAN_LIST_PAGE_LIMIT);
        const plans = await Plan.findPublished(skip, pageSize);
        const items = await PlanService.getInstance().mapPlansToAdminListApi(plans);

        sendApiResult(request, response, {
            items,
            page,
            totalPages,
            total,
        });
    }

    /**
     * Get a single published plan detail (public)
     * Binding: GetPublicPlan
     * @route GET /plans/{id}
     * @group plans
     * @param {string} id.path.required - Plan ID
     * @returns {PlanPublicDetailResponse.model} 200 - Plan detail with components and pricings
     * @returns {void} 404 - Not found
     */
    public async getPublicPlan(request: Express.Request, response: Express.Response) {
        const id = (request.params.id || "") + "";
        const auth = await UsersService.getInstance().auth(request);
        const showMultiLicensePlans = await OrganizationService.getInstance().showMultiLicensePlansInCatalog(auth.isRegisteredUser() ? auth.user.id : null);

        const planService = PlanService.getInstance();
        const detail = await planService.getPlanDetail(id);

        if (!detail || detail.plan.status !== PlanStatus.PUBLISHED) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            return;
        }

        if (!showMultiLicensePlans && detail.plan.requiresOrganization) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            return;
        }

        const baseTotals = await planService.getComponentBaseTotals(detail.components);

        sendApiResult(request, response, {
            plan: detail.plan.toObject(),
            components: detail.components.map(c => c.toObject()),
            pricings: detail.pricings.map(p => {
                const basePriceCents = p.billingCycle === BillingCycle.ANNUAL ? baseTotals.annualCents : baseTotals.monthlyCents;
                const priceCents = Math.max(0, Math.round(p.priceCents || 0));
                const discountAmountCents = Math.max(basePriceCents - priceCents, 0);

                return {
                    id: p.id,
                    billingCycle: p.billingCycle,
                    priceEur: planService.centsToEur(priceCents),
                    basePriceEur: planService.centsToEur(basePriceCents),
                    discountAmountEur: planService.centsToEur(discountAmountCents),
                };
            }),
        });
    }

    /**
     * Get all plans (admin, all statuses)
     * Requires permission: admin.users.manage
     * Binding: GetAdminPlans
     * @route GET /admin/plans
     * @group plans
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size
     * @returns {PlanPublicList.model} 200 - List of plans
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAdminPlans(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "The user lacks the required permission: admin.users.manage");
            return;
        }

        const total = await Plan.count();
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, PLAN_LIST_PAGE_LIMIT);
        const plans = await Plan.findAll(skip, pageSize);
        const items = await PlanService.getInstance().mapPlansToAdminListApi(plans);

        sendApiResult(request, response, {
            items,
            page,
            totalPages,
            total,
        });
    }

    /**
     * Get plan detail (admin)
     * Requires permission: admin.users.manage
     * Binding: GetAdminPlan
     * @route GET /admin/plans/{id}
     * @group plans
     * @param {string} id.path.required - Plan ID
     * @returns {object} 200 - Plan detail with components and pricings
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async getAdminPlan(request: Express.Request, response: Express.Response) {
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
        const detail = await PlanService.getInstance().getPlanDetail(id);

        if (!detail) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            return;
        }

        sendApiResult(request, response, {
            plan: detail.plan.toObject(),
            components: detail.components.map(c => c.toObject()),
            pricings: detail.pricings.map(p => ({
                id: p.id,
                billingCycle: p.billingCycle,
                priceEur: PlanService.getInstance().centsToEur(p.priceCents),
                stripePriceId: p.stripePriceId,
            })),
        });
    }

    /**
     * @typedef PlanCreateBody
     * @property {string} name.required - Plan name
     * @property {string} description - Plan description
     * @property {string} pricingMode.required - Pricing mode (fixed or calculated)
     * @property {number} discountPercent - Discount percentage (0-100, only for calculated mode)
     * @property {string} supportConfig - Support config JSON
     * @property {number} planIndex - Plan index
     * @property {string} status - Status (default: Draft)
     * @property {number} monthlyPriceEur - Monthly price in EUR (required for fixed mode)
     * @property {number} annualPriceEur - Annual price in EUR (required for fixed mode)
     * @property {Array.<PlanComponentInput>} components.required - Plan components
     */

    /**
     * @typedef PlanComponentInput
     * @property {string} catalogItemId.required - Catalog item ID
     * @property {string} usageLimits - Usage limits JSON
     * @property {number} quantity - Quantity (default: 1)
     */

    /**
     * Create a plan
     * Requires permission: admin.users.manage
     * Binding: CreatePlan
     * @route POST /admin/plans
     * @group plans
     * @param {PlanCreateBody.model} request.body - Plan data
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_NAME, INVALID_DESCRIPTION, INVALID_PRICING_MODE, INVALID_DISCOUNT_PERCENT, INVALID_PLAN_INDEX, DUPLICATE_PLAN_INDEX, INVALID_STATUS, INVALID_COMPONENTS, INVALID_COMPONENT, COMPONENT_NOT_PUBLISHABLE, INVALID_MONTHLY_PRICE, INVALID_ANNUAL_PRICE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async createPlan(request: Express.Request, response: Express.Response) {
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
            name: ObjectSchema.string().withDefaultValue(""),
            description: ObjectSchema.string().withDefaultValue(""),
            pricingMode: ObjectSchema.string().withDefaultValue(""),
            discountPercent: ObjectSchema.number().withDefaultValue(0),
            supportConfig: ObjectSchema.string().withDefaultValue(""),
            planIndex: ObjectSchema.number().withDefaultValue(0),
            status: ObjectSchema.string().withDefaultValue(PlanStatus.DRAFT),
            monthlyPriceEur: ObjectSchema.number().withDefaultValue(0),
            annualPriceEur: ObjectSchema.number().withDefaultValue(0),
            components: ObjectSchema.array(ObjectSchema.object({
                catalogItemId: ObjectSchema.string().withDefaultValue(""),
                usageLimits: ObjectSchema.string().withDefaultValue(""),
                quantity: ObjectSchema.number().withDefaultValue(1),
            })).withDefaultValue([]),
        }).sanitize(request.body);

        if (!body.name || body.name.length > NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NAME", "Name is required and must be less than " + NAME_MAX_LENGTH + " characters");
            return;
        }
        if (body.description && body.description.length > DESCRIPTION_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DESCRIPTION", "Description must be less than " + DESCRIPTION_MAX_LENGTH + " characters");
            return;
        }
        if (!isEnumValue(PlanPricingMode, body.pricingMode)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PRICING_MODE", "pricingMode must be 'fixed' or 'calculated'");
            return;
        }
        if (body.pricingMode === PlanPricingMode.CALCULATED && (body.discountPercent < 0 || body.discountPercent > 100)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DISCOUNT_PERCENT", "discountPercent must be between 0 and 100");
            return;
        }
        if (body.planIndex < 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PLAN_INDEX", "planIndex must be a non-negative number");
            return;
        }
        
        if (await PlanService.getInstance().isPlanIndexOccupied(body.planIndex)) {
            sendApiError(request, response, BAD_REQUEST, "DUPLICATE_PLAN_INDEX", "A plan with the same planIndex already exists");
            return;
        }

        if (body.status && !isEnumValue(PlanStatus, body.status)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_STATUS", "Invalid status value");
            return;
        }
        if (!Array.isArray(body.components) || body.components.length === 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENTS", "At least one component is required");
            return;
        }
        for (const comp of body.components) {
            if (!comp.catalogItemId) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENT", "Each component must have a catalogItemId");
                return;
            }
        }
        if (body.pricingMode === PlanPricingMode.FIXED) {
            if (!Number.isFinite(body.monthlyPriceEur) || body.monthlyPriceEur <= 0) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_MONTHLY_PRICE", "monthlyPriceEur must be a positive number");
                return;
            }
            if (!Number.isFinite(body.annualPriceEur) || body.annualPriceEur <= 0) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_ANNUAL_PRICE", "annualPriceEur must be a positive number");
                return;
            }
        }

        const requestedStatus = body.status as PlanStatus;
        const components = body.components.map((c: any) => ({
            catalogItemId: c.catalogItemId,
            usageLimits: c.usageLimits || undefined,
            quantity: c.quantity || 1,
        }));

        let createdPlan: Plan;
        try {
            const createResult = await PlanService.getInstance().createPlan({
                name: body.name,
                description: body.description,
                pricingMode: body.pricingMode as PlanPricingMode,
                discountPercent: body.pricingMode === PlanPricingMode.CALCULATED ? body.discountPercent : 0,
                supportConfig: body.supportConfig,
                planIndex: body.planIndex,
                status: requestedStatus,
                monthlyPriceEur: body.monthlyPriceEur,
                annualPriceEur: body.annualPriceEur,
                components,
            });
            createdPlan = createResult.plan;
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "CATALOG_ITEM_NOT_FOUND") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENT", "One or more components are invalid");
                return;
            }
            if (message === "COMPONENT_NOT_PUBLISHABLE") {
                sendApiError(request, response, BAD_REQUEST, "COMPONENT_NOT_PUBLISHABLE", "Published plans require all components to be published and public");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "CREATE_FAILED", ex instanceof Error ? ex.message : "Failed to create plan");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Update a plan
     * Requires permission: admin.users.manage
     * Binding: UpdatePlan
     * @route PUT /admin/plans/{id}
     * @group plans
     * @param {string} id.path.required - Plan ID
     * @param {PlanCreateBody.model} request.body - Plan data to update
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_NAME, INVALID_DESCRIPTION, INVALID_PRICING_MODE, INVALID_DISCOUNT_PERCENT, INVALID_PLAN_INDEX, DUPLICATE_PLAN_INDEX, INVALID_STATUS, INVALID_COMPONENTS, INVALID_COMPONENT, COMPONENT_NOT_PUBLISHABLE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async updatePlan(request: Express.Request, response: Express.Response) {
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
        const existing = await Plan.findById(id);
        if (!existing) {
            sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            return;
        }

        const body = ObjectSchema.object({
            name: ObjectSchema.string().withDefaultValue(existing.name),
            description: ObjectSchema.string().withDefaultValue(existing.description),
            pricingMode: ObjectSchema.string().withDefaultValue(existing.pricingMode),
            discountPercent: ObjectSchema.number().withDefaultValue(existing.discountPercent),
            supportConfig: ObjectSchema.string().withDefaultValue(existing.supportConfig),
            planIndex: ObjectSchema.number().withDefaultValue(existing.planIndex),
            status: ObjectSchema.string().withDefaultValue(existing.status),
            monthlyPriceEur: ObjectSchema.number().withDefaultValue(0),
            annualPriceEur: ObjectSchema.number().withDefaultValue(0),
            components: ObjectSchema.array(ObjectSchema.object({
                catalogItemId: ObjectSchema.string().withDefaultValue(""),
                usageLimits: ObjectSchema.string().withDefaultValue(""),
                quantity: ObjectSchema.number().withDefaultValue(1),
            })),
        }).sanitize(request.body);

        if (body.name && body.name.length > NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NAME", "Name must be less than " + NAME_MAX_LENGTH + " characters");
            return;
        }
        if (body.description && body.description.length > DESCRIPTION_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DESCRIPTION", "Description must be less than " + DESCRIPTION_MAX_LENGTH + " characters");
            return;
        }
        if (body.pricingMode && !isEnumValue(PlanPricingMode, body.pricingMode)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PRICING_MODE", "pricingMode must be 'fixed' or 'calculated'");
            return;
        }
        if (body.pricingMode === PlanPricingMode.CALCULATED && (body.discountPercent < 0 || body.discountPercent > 100)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DISCOUNT_PERCENT", "discountPercent must be between 0 and 100");
            return;
        }
        if (body.planIndex < 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PLAN_INDEX", "planIndex must be a non-negative number");
            return;
        }
        if (await PlanService.getInstance().isPlanIndexOccupied(body.planIndex, id)) {
            sendApiError(request, response, BAD_REQUEST, "DUPLICATE_PLAN_INDEX", "A plan with the same planIndex already exists");
            return;
        }
        if (body.status && !isEnumValue(PlanStatus, body.status)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_STATUS", "Invalid status value");
            return;
        }
        if (body.components !== null && body.components !== undefined) {
            if (!Array.isArray(body.components) || body.components.length === 0) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENTS", "At least one component is required");
                return;
            }
            for (const comp of body.components) {
                if (!comp.catalogItemId) {
                    sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENT", "Each component must have a catalogItemId");
                    return;
                }
            }
        }

        try {
            await PlanService.getInstance().updatePlan(id, {
                name: body.name,
                description: body.description,
                pricingMode: body.pricingMode as PlanPricingMode,
                discountPercent: body.pricingMode === PlanPricingMode.CALCULATED ? body.discountPercent : 0,
                supportConfig: body.supportConfig,
                planIndex: body.planIndex,
                status: body.status as PlanStatus,
                monthlyPriceEur: body.monthlyPriceEur,
                annualPriceEur: body.annualPriceEur,
                components: body.components ? body.components.map((c: any) => ({
                    catalogItemId: c.catalogItemId,
                    usageLimits: c.usageLimits || undefined,
                    quantity: c.quantity || 1,
                })) : undefined,
            });
            sendApiSuccess(request, response);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "CATALOG_ITEM_NOT_FOUND") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COMPONENT", "One or more components are invalid");
                return;
            }
            if (message === "COMPONENT_NOT_PUBLISHABLE") {
                sendApiError(request, response, BAD_REQUEST, "COMPONENT_NOT_PUBLISHABLE", "Published plans require all components to be published and public");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "UPDATE_FAILED", ex instanceof Error ? ex.message : "Failed to update plan");
        }
    }

    /**
     * Delete a plan
     * Requires permission: admin.users.manage
     * Binding: DeletePlan
     * @route DELETE /admin/plans/{id}
     * @group plans
     * @param {string} id.path.required - Plan ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async deletePlan(request: Express.Request, response: Express.Response) {
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

        try {
            await PlanService.getInstance().deletePlan(id);
            sendApiSuccess(request, response);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "PLAN_NOT_FOUND") {
                sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            } else {
                sendApiError(request, response, INTERNAL_SERVER_ERROR, "DELETE_FAILED", message || "Failed to delete plan");
            }
        }
    }
    
    /**
     * Archive a plan
     * Requires permission: admin.users.manage
     * Binding: ArchivePlan
     * @route POST /admin/plans/{id}/archive
     * @group plans
     * @param {string} id.path.required - Plan ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async archivePlan(request: Express.Request, response: Express.Response) {
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

        try {
            await PlanService.getInstance().archivePlan(id);
            sendApiSuccess(request, response);
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "PLAN_NOT_FOUND") {
                sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Plan not found");
            } else {
                sendApiError(request, response, INTERNAL_SERVER_ERROR, "ARCHIVE_FAILED", message || "Failed to archive plan");
            }
        }
    }
}
