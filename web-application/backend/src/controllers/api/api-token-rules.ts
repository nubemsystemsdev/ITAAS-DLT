// Token rules API

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { ensureObjectBody, sendApiError, sendApiResult, sendUnauthorized, FORBIDDEN, noCache } from "../../utils/http-utils";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { TokenRuleConfig } from "../../models/token-rule-config";
import { TokenService } from "../../services/token-service";

/**
 * Token Rules API
 * @group token_rules
 */
export class TokenRulesController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/token-rules", noCache(this.getPublicRules.bind(this)));
        application.get(prefix + "/admin/token-rules", noCache(this.getAdminRules.bind(this)));
        application.put(prefix + "/admin/token-rules", ensureObjectBody(this.updateAdminRules.bind(this)));
    }

    /**
     * @typedef TokenRulesUpdateBody
     * @property {boolean} enabled - Enable token rules
     * @property {number} emissionRatePct - Emission percentage
     * @property {number} tokenValueEurCents - Value of one token in euro cents
     * @property {number} minPurchaseEurCentsToEarn - Minimum purchase (cents) to earn
     * @property {number} minPurchaseEurCentsToRedeem - Minimum purchase (cents) to redeem
     * @property {number} maxRedeemPct - Max redeem percentage
     * @property {number} expirationMonths - Expiration in months
     * @property {boolean} stackWithPromotions - Allow stacking promotions
     * @property {string} allowedProductKinds - Product filter
     */

    /**
     * @typedef TokenRulesConfig
     * @property {boolean} enabled.required - Enable token rules
     * @property {number} emissionRatePct.required - Emission percentage
     * @property {number} tokenValueEurCents.required - Value of one token in euro cents
     * @property {number} minPurchaseEurCentsToEarn.required - Minimum purchase (cents) to earn
     * @property {number} minPurchaseEurCentsToRedeem.required - Minimum purchase (cents) to redeem
     * @property {number} maxRedeemPct.required - Max redeem percentage
     * @property {number} expirationMonths.required - Expiration in months
     * @property {boolean} stackWithPromotions.required - Allow stacking promotions
     * @property {string} allowedProductKinds.required - Product filter
     */

    /**
     * Get public effective token rules
     * Binding: GetTokenRules
     * @route GET /token-rules
     * @group token_rules
     * @returns {TokenRulesConfig.model} 200 - Effective token rules
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getPublicRules(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        const rules = await TokenService.getInstance().getEffectiveRules();
        sendApiResult(request, response, rules);
    }

    /**
     * Get token rules for admin
     * Binding: GetAdminTokenRules
     * @route GET /admin/token-rules
     * @group token_rules
     * @returns {TokenRulesConfig.model} 200 - Rule config
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAdminRules(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }
        const cfg = await TokenRuleConfig.getOrCreateDefault();
        sendApiResult(request, response, cfg.toObject());
    }

    /**
     * Update token rules
     * Binding: UpdateAdminTokenRules
     * @route PUT /admin/token-rules
     * @group token_rules
     * @param {TokenRulesUpdateBody.model} request.body - Rule patch
     * @returns {TokenRulesConfig.model} 200 - Updated rule config
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async updateAdminRules(request: Express.Request, response: Express.Response) {
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
        const patch: Partial<TokenRuleConfig> = {};
        if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
        if (typeof body.emissionRatePct === "number") patch.emissionRatePct = body.emissionRatePct;
        if (typeof body.tokenValueEurCents === "number") patch.tokenValueEurCents = body.tokenValueEurCents;
        if (typeof body.minPurchaseEurCentsToEarn === "number") patch.minPurchaseEurCentsToEarn = body.minPurchaseEurCentsToEarn;
        if (typeof body.minPurchaseEurCentsToRedeem === "number") patch.minPurchaseEurCentsToRedeem = body.minPurchaseEurCentsToRedeem;
        if (typeof body.maxRedeemPct === "number") patch.maxRedeemPct = body.maxRedeemPct;
        if (typeof body.expirationMonths === "number") patch.expirationMonths = body.expirationMonths;
        if (typeof body.stackWithPromotions === "boolean") patch.stackWithPromotions = body.stackWithPromotions;
        if (typeof body.allowedProductKinds === "string") patch.allowedProductKinds = body.allowedProductKinds;
        const cfg = await TokenRuleConfig.getOrCreateDefault();
        TokenService.getInstance().sanitizeAndApplyRules(cfg, patch);
        await cfg.save();
        sendApiResult(request, response, cfg.toObject());
    }
}
