// Internal users API (BFF / Flowise)

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { InternalUsersService } from "../../services/internal-users-service";
import { NOT_FOUND, noCache, sendApiError, sendApiResult } from "../../utils/http-utils";
import { rejectUnauthorizedInternalService } from "../../utils/internal-service-auth";

/**
 * Internal users API (service-to-service)
 * @group internal_users
 */
export class InternalUsersController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/internal/users/:keycloakSub", noCache(this.getUserByKeycloakSub.bind(this)));
    }

    /**
     * @typedef InternalUserOrganizationInfo
     * @property {string} id.required - Organization ID
     * @property {string} companyName.required - Organization name
     * @property {string} role.required - Membership role
     */

    /**
     * @typedef InternalUserItaasSubscriptionInfo
     * @property {boolean} hasSubscription.required - True when an active ITAAS Platform subscription exists
     * @property {string} source.required - Subscription source: organization, personal, or none
     * @property {boolean} assignedToUser.required - True when the user has a personal subscription or an assigned org license seat
     */

    /**
     * @typedef InternalUserInfoResponse
     * @property {string} uid.required - Marketplace user ID
     * @property {string} keycloakSub.required - Keycloak subject
     * @property {string} email.required - Email
     * @property {string} username.required - Username
     * @property {string} role.required - Platform role
     * @property {InternalUserOrganizationInfo.model} organization - Active organization (null when none)
     * @property {InternalUserItaasSubscriptionInfo.model} itaasSubscription.required - ITAAS Platform subscription status
     */

    /**
     * Get marketplace user info by Keycloak subject
     * Binding: GetInternalUserByKeycloakSub
     * @route GET /internal/users/{keycloakSub}
     * @group internal_users
     * @param {string} keycloakSub.path.required - Keycloak subject (`sub` claim)
     * @returns {InternalUserInfoResponse.model} 200 - User info
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: INTERNAL_SERVICE_DISABLED
     * @returns {void} 404 - Not found: USER_NOT_FOUND
     */
    public async getUserByKeycloakSub(request: Express.Request, response: Express.Response) {
        if (rejectUnauthorizedInternalService(request, response)) {
            return;
        }

        const keycloakSub = decodeURIComponent((request.params.keycloakSub || "") + "");

        const userInfo = await InternalUsersService.getInstance().getUserInfoByKeycloakSub(keycloakSub);

        if (!userInfo) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "USER_NOT_FOUND",
                "No marketplace user is linked to the provided Keycloak subject",
            );
            return;
        }

        sendApiResult(request, response, userInfo);
    }
}
