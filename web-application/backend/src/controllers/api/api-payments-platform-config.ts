// Payments platform config API

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, noCache, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { PaymentsPlatformConfigService } from "../../services/payments-platform-config-service";

/**
 * Payments platform config API
 * @group payments_platform_config
 */
export class PaymentsPlatformConfigController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/admin/payments-platform-config", noCache(this.getAdminConfig.bind(this)));
        application.put(prefix + "/admin/payments-platform-config", ensureObjectBody(this.updateAdminConfig.bind(this)));
    }

    /**
     * @typedef PaymentsPlatformConfig
     * @property {number} subscriptionGracePeriodDays.required - Days after payment failure before subscription cancellation
     * @property {number} updatedAt.required - Last update timestamp (ms)
     */

    /**
     * @typedef PaymentsPlatformConfigUpdateBody
     * @property {number} subscriptionGracePeriodDays.required - Days after payment failure before subscription cancellation
     */

    /**
     * Get payments platform config for admin
     * Binding: GetAdminPaymentsPlatformConfig
     * @route GET /admin/payments-platform-config
     * @group payments_platform_config
     * @returns {PaymentsPlatformConfig.model} 200 - Platform payments config
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAdminConfig(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }
        const cfg = await PaymentsPlatformConfigService.getInstance().getAdminConfig();
        sendApiResult(request, response, {
            subscriptionGracePeriodDays: cfg.subscriptionGracePeriodDays,
            updatedAt: cfg.updatedAt,
        });
    }

    /**
     * Update payments platform config
     * Binding: UpdateAdminPaymentsPlatformConfig
     * @route PUT /admin/payments-platform-config
     * @group payments_platform_config
     * @param {PaymentsPlatformConfigUpdateBody.model} request.body - Config patch
     * @returns {PaymentsPlatformConfig.model} 200 - Updated config
     * @returns {void} 400 - Bad request: INVALID_GRACE_PERIOD_DAYS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async updateAdminConfig(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }
        const body = request.body || {};
        if (typeof body.subscriptionGracePeriodDays !== "number" || !Number.isFinite(body.subscriptionGracePeriodDays)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_GRACE_PERIOD_DAYS", "subscriptionGracePeriodDays must be a number");
            return;
        }
        const cfg = await PaymentsPlatformConfigService.getInstance().getAdminConfig();
        PaymentsPlatformConfigService.getInstance().applyGracePeriodDays(cfg, body.subscriptionGracePeriodDays);
        await cfg.save();
        sendApiResult(request, response, {
            subscriptionGracePeriodDays: cfg.subscriptionGracePeriodDays,
            updatedAt: cfg.updatedAt,
        });
    }
}
