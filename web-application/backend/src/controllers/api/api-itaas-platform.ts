"use strict";

import Express from "express";
import { Controller } from "../controller";
import { ItaasPlatformService } from "../../services/itaas-platform-service";
import { UsersService } from "../../services/users-service";
import {
    ensureObjectBody,
    INTERNAL_SERVER_ERROR,
    noCache,
    sendApiError,
    sendApiResult,
    sendUnauthorized,
} from "../../utils/http-utils";
import { parsePageParameters } from "../../utils/api-utils";
import {
    sendForbiddenUnlessPlatformItaasAdmin,
    sendItaasCustomAgentRequestError,
} from "../../utils/itaas-custom-agent-request-api-errors";
import { Monitor } from "../../monitor";

const LIST_PAGE_LIMIT = 25;

/**
 * ITAAS Platform user API
 * @group itaas_platform
 */
export class ItaasPlatformController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/itaas/custom-agent-requests", noCache(this.getCustomAgentRequests.bind(this)));
        application.get(prefix + "/itaas/custom-agent-requests/:id", noCache(this.getCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/custom-agent-requests", ensureObjectBody(this.createCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/custom-agent-requests/:id/cancel", ensureObjectBody(this.cancelCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/custom-agent-requests/:id/checkout-deposit", ensureObjectBody(this.checkoutCustomAgentRequestDeposit.bind(this)));

        application.get(prefix + "/itaas/admin/custom-agent-requests", noCache(this.adminListCustomAgentRequests.bind(this)));
        application.get(prefix + "/itaas/admin/custom-agent-requests/:id", noCache(this.adminGetCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/admin/custom-agent-requests/:id/reject", ensureObjectBody(this.adminRejectCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/admin/custom-agent-requests/:id/accept", ensureObjectBody(this.adminAcceptCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/admin/custom-agent-requests/:id/cancel", ensureObjectBody(this.adminCancelCustomAgentRequest.bind(this)));
        application.post(prefix + "/itaas/admin/custom-agent-requests/:id/deliver", ensureObjectBody(this.adminDeliverCustomAgentRequest.bind(this)));
    }

    /**
     * @typedef ItaasCustomAgentRequestItem
     * @property {string} id.required - Request ID
     * @property {string} status.required - Request status
     * @property {string} requestType.required - Request type (`adaptation` or `custom`)
     * @property {string} description.required - Request description
     * @property {string} baseAgentId - Optional base marketplace agent ID
     * @property {string} baseFlowiseFlowId - Optional base Flowise flow ID
     * @property {string} requesterUserId.required - Requester user ID
     * @property {string} requesterUsername - Requester username
     * @property {string} organizationId - Billing organization ID when requested as org admin
     * @property {string} adminRejectionReason - Admin rejection reason
     * @property {string} paymentId - Deposit payment ID
     * @property {string} deliveredFlowiseFlowId - Delivered Flowise flow ID
     * @property {string} monthlySubscriptionId - Monthly subscription ID after delivery
     * @property {string} closedFromStatus - Status before cancellation or rejection
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     * @property {number} updatedAt.required - Update timestamp (Unix ms)
     */

    /**
     * @typedef ItaasCustomAgentRequestListResponse
     * @property {Array.<ItaasCustomAgentRequestItem>} custom_agent_requests.required - User custom agent requests
     */

    /**
     * @typedef ItaasCustomAgentRequestCreateBody
     * @property {string} requestType.required - Request type (`adaptation` or `custom`)
     * @property {string} description.required - Request description
     * @property {string} baseAgentId - Optional base marketplace agent ID
     * @property {string} baseFlowiseFlowId - Optional base Flowise flow ID
     */

    /**
     * @typedef ItaasCustomAgentRequestRejectBody
     * @property {string} reason.required - Rejection reason
     */

    /**
     * @typedef ItaasCustomAgentRequestDeliverBody
     * @property {string} flowId.required - Non-global Flowise flow ID to assign
     */

    /**
     * @typedef ItaasAdminCustomAgentRequestList
     * @property {Array.<ItaasCustomAgentRequestItem>} items.required - Custom agent requests
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * @typedef ItaasCustomAgentRequestCheckoutBody
     * @property {string} successUrl - Frontend URL after successful payment
     * @property {string} cancelUrl - Frontend URL after cancelled payment
     * @property {number} redeem_tokens - Number of tokens to apply as a discount (optional, default 0)
     */

    /**
     * @typedef ItaasCustomAgentRequestCheckoutResponse
     * @property {string} checkoutUrl.required - Stripe checkout URL
     */

    /**
     * Lists custom agent requests for the billing subject of the authenticated user.
     * Binding: GetItaasCustomAgentRequests
     * @route GET /itaas/custom-agent-requests
     * @group itaas_platform
     * @returns {ItaasCustomAgentRequestListResponse.model} 200 - Custom agent requests
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, ORG_ADMIN_REQUIRED
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async getCustomAgentRequests(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            const rows = await ItaasPlatformService.getInstance().listCustomAgentRequestsForUser(auth.user.id);
            sendApiResult(request, response, {
                custom_agent_requests: rows,
            });
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load custom agent requests");
        }
    }

    /**
     * Gets a custom agent request for the authenticated requester.
     * Binding: GetItaasCustomAgentRequest
     * @route GET /itaas/custom-agent-requests/{id}
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Custom agent request
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, ORG_ADMIN_REQUIRED
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async getCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            const item = await ItaasPlatformService.getInstance().getCustomAgentRequestForRequester(
                auth.user.id,
                request.params.id,
            );
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load custom agent request");
        }
    }

    /**
     * Creates a custom agent request for review by the platform team.
     * Requires an active personal ITAAS subscription or an assigned organization ITAAS license.
     * Binding: CreateItaasCustomAgentRequest
     * @route POST /itaas/custom-agent-requests
     * @group itaas_platform
     * @param {ItaasCustomAgentRequestCreateBody.model} request.body.required - Request payload
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Created request
     * @returns {void} 400 - Bad request: INVALID_REQUEST_TYPE, INVALID_DESCRIPTION, INVALID_BASE_FLOW_ID, INVALID_BASE_AGENT_ID, PENDING_REQUEST_LIMIT_REACHED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, ORG_ADMIN_REQUIRED
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async createCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const requestType = typeof body.requestType === "string" ? body.requestType : "";
        const description = typeof body.description === "string" ? body.description : "";
        const baseAgentId = typeof body.baseAgentId === "string" ? body.baseAgentId : "";
        const baseFlowiseFlowId = typeof body.baseFlowiseFlowId === "string" ? body.baseFlowiseFlowId : "";

        try {
            const created = await ItaasPlatformService.getInstance().createCustomAgentRequest({
                userId: auth.user.id,
                requestType,
                description,
                baseAgentId,
                baseFlowiseFlowId,
            });
            sendApiResult(request, response, created);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not create custom agent request");
        }
    }

    /**
     * Cancels a custom agent request in `pending_review` or `pending_payment`.
     * Binding: CancelItaasCustomAgentRequest
     * @route POST /itaas/custom-agent-requests/{id}/cancel
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Cancelled request
     * @returns {void} 400 - Bad request: INVALID_STATUS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, ORG_ADMIN_REQUIRED
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async cancelCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            const item = await ItaasPlatformService.getInstance().cancelCustomAgentRequest(
                auth.user.id,
                request.params.id,
            );
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not cancel custom agent request");
        }
    }

    /**
     * Starts a Stripe checkout for the custom-agent deposit.
     * Binding: CheckoutItaasCustomAgentRequestDeposit
     * @route POST /itaas/custom-agent-requests/{id}/checkout-deposit
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @param {ItaasCustomAgentRequestCheckoutBody.model} request.body - Optional return URLs and token redemption
     * @returns {ItaasCustomAgentRequestCheckoutResponse.model} 200 - Stripe checkout URL
     * @returns {void} 400 - Bad request: INVALID_STATUS, INSUFFICIENT_TOKEN_BALANCE, TOKENS_EXCEED_LIMIT
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ITAAS_ACCESS_REQUIRED, ORG_ADMIN_REQUIRED
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 503 - Service unavailable: DEPOSIT_CHECKOUT_UNAVAILABLE
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async checkoutCustomAgentRequestDeposit(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const successUrl = typeof body.successUrl === "string" ? body.successUrl.trim() : "";
        const cancelUrl = typeof body.cancelUrl === "string" ? body.cancelUrl.trim() : "";
        const redeemTokens = Math.max(0, Math.floor(Number(body.redeem_tokens) || 0));

        try {
            const result = await ItaasPlatformService.getInstance().checkoutDeposit(
                auth.user.id,
                request.params.id,
                successUrl || undefined,
                cancelUrl || undefined,
                redeemTokens,
            );
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not start deposit checkout");
        }
    }

    /**
     * Lists custom agent requests for platform admins.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminListItaasCustomAgentRequests
     * @route GET /itaas/admin/custom-agent-requests
     * @group itaas_platform
     * @param {string} q.query - Search query
     * @param {string} status.query - Filter by status
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size
     * @returns {ItaasAdminCustomAgentRequestList.model} 200 - Paged custom agent requests
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminListCustomAgentRequests(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        const q = ((request.query.q || "") + "").trim();
        const status = ((request.query.status || "") + "").trim();

        try {
            const total = await ItaasPlatformService.getInstance().countCustomAgentRequestsForAdmin(
                q || undefined,
                status || undefined,
            );
            const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, LIST_PAGE_LIMIT);
            const items = await ItaasPlatformService.getInstance().listCustomAgentRequestsForAdmin(
                q || undefined,
                status || undefined,
                skip,
                pageSize,
            );
            sendApiResult(request, response, {
                items,
                page,
                totalPages,
                total,
            });
        } catch (ex) {
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list custom agent requests");
        }
    }

    /**
     * Gets a custom agent request for platform admins.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminGetItaasCustomAgentRequest
     * @route GET /itaas/admin/custom-agent-requests/{id}
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Custom agent request
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminGetCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        try {
            const item = await ItaasPlatformService.getInstance().getCustomAgentRequestForAdmin(request.params.id);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load custom agent request");
        }
    }

    /**
     * Rejects a custom agent request in `pending_review`.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminRejectItaasCustomAgentRequest
     * @route POST /itaas/admin/custom-agent-requests/{id}/reject
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @param {ItaasCustomAgentRequestRejectBody.model} request.body.required - Rejection payload
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Rejected request
     * @returns {void} 400 - Bad request: INVALID_STATUS, INVALID_REJECTION_REASON
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminRejectCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const reason = typeof body.reason === "string" ? body.reason : "";

        try {
            const item = await ItaasPlatformService.getInstance().rejectCustomAgentRequest(request.params.id, reason);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not reject custom agent request");
        }
    }

    /**
     * Accepts a custom agent request and moves it to `pending_payment`.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminAcceptItaasCustomAgentRequest
     * @route POST /itaas/admin/custom-agent-requests/{id}/accept
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Accepted request
     * @returns {void} 400 - Bad request: INVALID_STATUS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminAcceptCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        try {
            const item = await ItaasPlatformService.getInstance().acceptCustomAgentRequest(request.params.id);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not accept custom agent request");
        }
    }

    /**
     * Cancels a custom agent request in `pending_payment`. During `pending_review` the admin must reject instead.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminCancelItaasCustomAgentRequest
     * @route POST /itaas/admin/custom-agent-requests/{id}/cancel
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Cancelled request
     * @returns {void} 400 - Bad request: INVALID_STATUS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminCancelCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        try {
            const item = await ItaasPlatformService.getInstance().cancelCustomAgentRequestByAdmin(request.params.id);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not cancel custom agent request");
        }
    }

    /**
     * Delivers a custom agent request in `in_development`.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminDeliverItaasCustomAgentRequest
     * @route POST /itaas/admin/custom-agent-requests/{id}/deliver
     * @group itaas_platform
     * @param {string} id.path.required - Request ID
     * @param {ItaasCustomAgentRequestDeliverBody.model} request.body.required - Delivery payload
     * @returns {ItaasCustomAgentRequestItem.model} 200 - Delivered request
     * @returns {void} 400 - Bad request: INVALID_STATUS, INVALID_FLOW_ID, FLOW_IS_GLOBAL, FLOW_ALREADY_ASSIGNED, FLOW_ALREADY_DELIVERED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 422 - Unprocessable entity: DELIVERY_FAILED, PAYMENT_METHOD_REQUIRED
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, FLOW_OP_BUSY
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async adminDeliverCustomAgentRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (sendForbiddenUnlessPlatformItaasAdmin(auth, request, response)) {
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const flowId = typeof body.flowId === "string" ? body.flowId : "";

        try {
            const item = await ItaasPlatformService.getInstance().deliverCustomAgentRequest(request.params.id, flowId);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasCustomAgentRequestError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not deliver custom agent request");
        }
    }
}
