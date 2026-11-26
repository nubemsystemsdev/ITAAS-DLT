// Reserved for license

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, NOT_FOUND, noCache, sendApiError, sendApiErrorOnMessage, sendApiResult, sendApiSuccess, sendUnauthorized, INTERNAL_SERVER_ERROR } from "../../utils/http-utils";
import { UsersService } from "../../services/users-service";
import { NotificationService } from "../../services/notification-service";
import { OrganizationService, BLOCKCHAIN_REGISTRATION_FAILED } from "../../services/organization-service";
import { SubscriptionBillingService } from "../../services/subscription-billing-service";
import { SubscriptionService } from "../../services/subscription-service";
import { Organization } from "../../models/organization";
import { OrganizationLicenseAssignment } from "../../models/organization-license-assignment";
import { OrganizationLicensePool, computePoolAvailableCount, isUnlimitedPoolSeatLimit, poolHasAvailableSeat } from "../../models/organization-license-pool";
import { OrganizationLicensePoolService } from "../../services/organization-license-pool-service";
import { CatalogItem } from "../../models/catalog-item";
import { OrganizationMembership, OrganizationMembershipRole, OrganizationMembershipStatus } from "../../models/organization-membership";
import { OrganizationRequest, OrganizationRequestStatus } from "../../models/organization-request";
import { OrganizationDeletionRequestStatus } from "../../models/organization-deletion-request";
import { Payment } from "../../models/payment";
import { PaymentService } from "../../services/payment-service";
import { Subscription } from "../../models/subscription";
import { User } from "../../models/users/user";
import { parsePageParameters } from "../../utils/api-utils";
import { validateEmail } from "../../utils/text-utils";
import { Monitor } from "../../monitor";
const ORGANIZATIONS_PAGE_LIMIT = 25;
const COMPANY_NAME_MAX_LENGTH = 200;
const CIF_NIF_MAX_LENGTH = 30;
const COUNTRY_MAX_LENGTH = 100;
const FISCAL_ADDRESS_MAX_LENGTH = 500;
const EMAIL_MAX_LENGTH = 200;

/**
 * Organizations API (Org admin + member self-service)
 * @group organizations
 */
export class OrganizationsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        // Organization CRUD
        application.get(prefix + "/organizations/my", noCache(this.getMyOrganization.bind(this)));
        application.get(prefix + "/organizations/request", noCache(this.getMyOrganizationRequest.bind(this)));
        application.delete(prefix + "/organizations/request", noCache(this.cancelMyOrganizationRequest.bind(this)));
        application.get(prefix + "/organizations", noCache(this.listOrganizations.bind(this)));
        application.post(prefix + "/organizations/requests", ensureObjectBody(this.requestOrganization.bind(this)));
        application.get(prefix + "/organizations/requests", noCache(this.listOrganizationRequests.bind(this)));
        application.post(prefix + "/organizations/requests/:requestId/approve", ensureObjectBody(this.approveOrganizationRequest.bind(this)));
        application.post(prefix + "/organizations/requests/:requestId/reject", ensureObjectBody(this.rejectOrganizationRequest.bind(this)));
        application.get(prefix + "/organizations/deletion-requests", noCache(this.listOrganizationDeletionRequests.bind(this)));
        application.post(prefix + "/organizations/deletion-requests/:requestId/approve", ensureObjectBody(this.approveOrganizationDeletionRequest.bind(this)));
        application.post(prefix + "/organizations/deletion-requests/:requestId/reject", ensureObjectBody(this.rejectOrganizationDeletionRequest.bind(this)));
        application.get(prefix + "/organizations/:orgId", noCache(this.getOrganization.bind(this)));
        application.put(prefix + "/organizations/:orgId", ensureObjectBody(this.updateOrganization.bind(this)));
        application.delete(prefix + "/organizations/:orgId", noCache(this.deleteOrganization.bind(this)));
        application.post(prefix + "/organizations/:orgId/deletion-request", ensureObjectBody(this.submitOrganizationDeletionRequest.bind(this)));
        application.get(prefix + "/organizations/:orgId/deletion-request", noCache(this.getOrganizationDeletionRequest.bind(this)));
        application.delete(prefix + "/organizations/:orgId/deletion-request", noCache(this.cancelOrganizationDeletionRequest.bind(this)));

        // Members
        application.get(prefix + "/organizations/:orgId/members", noCache(this.listMembers.bind(this)));
        application.get(prefix + "/organizations/:orgId/members/invited", noCache(this.listInvitedMembers.bind(this)));
        application.post(prefix + "/organizations/:orgId/members/invite", ensureObjectBody(this.inviteMember.bind(this)));
        application.post(prefix + "/organizations/memberships/:membershipId/accept", ensureObjectBody(this.acceptInvitation.bind(this)));
        application.post(prefix + "/organizations/memberships/:membershipId/reject", ensureObjectBody(this.rejectInvitation.bind(this)));
        application.post(prefix + "/organizations/:orgId/members/:membershipId/activate", ensureObjectBody(this.activateMember.bind(this)));
        application.post(prefix + "/organizations/:orgId/members/:membershipId/deactivate", ensureObjectBody(this.deactivateMember.bind(this)));
        application.put(prefix + "/organizations/:orgId/members/:membershipId/role", ensureObjectBody(this.changeMemberRole.bind(this)));
        application.delete(prefix + "/organizations/:orgId/members/:membershipId", noCache(this.removeMember.bind(this)));
        application.post(prefix + "/organizations/leave", ensureObjectBody(this.leaveOrganization.bind(this)));

        // Subscriptions & billing
        application.get(prefix + "/organizations/:orgId/subscriptions", noCache(this.listSubscriptions.bind(this)));
        application.get(prefix + "/organizations/:orgId/payments", noCache(this.listPayments.bind(this)));

        // License assignment
        application.get(prefix + "/organizations/:orgId/license-pools", noCache(this.listLicensePools.bind(this)));
        application.post(prefix + "/organizations/:orgId/license-pools/backfill", ensureObjectBody(this.backfillLicensePools.bind(this)));
        application.get(prefix + "/organizations/:orgId/licenses", noCache(this.listLicenses.bind(this)));
        application.post(prefix + "/organizations/:orgId/licenses", ensureObjectBody(this.assignLicense.bind(this)));
        application.delete(prefix + "/organizations/:orgId/licenses/:licenseId", noCache(this.revokeLicense.bind(this)));
        application.get(prefix + "/organizations/:orgId/license-pools/:licensePoolId/seats", noCache(this.getSeats.bind(this)));
        application.post(prefix + "/organizations/:orgId/subscriptions/:subscriptionId/seats", ensureObjectBody(this.updateSeats.bind(this)));
    }

    /**
     * @typedef OrgItem
     * @property {string} id.required - Organization ID
     * @property {string} companyName.required - Company name
     * @property {string} cifNif.required - CIF / NIF
     * @property {string} country.required - Country
     * @property {string} fiscalAddress.required - Fiscal address
     * @property {string} email.required - Contact email
     * @property {string} adminUid.required - Admin user ID
     * @property {string} adminUsername.required - Admin username
     * @property {boolean} isActive.required - Active flag
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     * @property {string} currentUserOrganizationRole - Authenticated user's active role in this organization
     * @property {boolean} currentUserIsOrganizationAdmin - True when the authenticated user is an active organization admin
     * @property {number} currentUserJoinedAt - Authenticated user's join date (Unix ms)
     */

    /**
     * @typedef OrgListResponse
     * @property {Array.<OrgItem>} items.required - Organizations
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists all organizations (paginated). Platform admin only.
     * Requires permission: admin.users.manage
     * Binding: ListOrganizations
     * @route GET /organizations
     * @group organizations
     * @param {string} q.query - Search by id, company name or CIF/NIF prefix
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {OrgListResponse.model} 200 - Organizations
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listOrganizations(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const q = ((request.query.q || "") + "").trim();
        const search = q || undefined;
        const total = await Organization.countFiltered(search);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const pageItems = await Organization.findFiltered(skip, pageSize, search);

        sendApiResult(request, response, {
            items: pageItems.map(o => o.toObject()),
            page,
            totalPages,
            total,
        });
    }

    /**
     * Returns the organization the current user belongs to (as admin or member).
     * Returns 404 if the user is not part of any organization.
     * Binding: GetMyOrganization
     * @route GET /organizations/my
     * @group organizations
     * @returns {OrgItem.model} 200 - The user's organization
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async getMyOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const service = OrganizationService.getInstance();

        const adminOrgs = await service.getOrganizationsByAdmin(auth.user.id);
        if (adminOrgs) {
            sendApiResult(request, response, await service.toOrganizationItem(adminOrgs, auth.user.id));
            return;
        }

        const memberships = await service.getMemberships(auth.user.id);
        if (memberships && memberships.status === OrganizationMembershipStatus.ACTIVE) {
            const org = await Organization.findById(memberships.organizationId);
            if (org) {
                sendApiResult(request, response, await service.toOrganizationItem(org, auth.user.id));
                return;
            }
        }

        sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "You are not part of any organization");
    }

    /**
     * @typedef OrgRequestCreateBody
     * @property {string} companyName.required - Company name
     * @property {string} cifNif.required - CIF / NIF
     * @property {string} country.required - Country
     * @property {string} fiscalAddress.required - Fiscal address
     */

    /**
     * @typedef OrgRequestItem
     * @property {string} id.required - Organization request ID
     * @property {string} companyName.required - Company name
     * @property {string} cifNif.required - CIF / NIF
     * @property {string} country.required - Country
     * @property {string} fiscalAddress.required - Fiscal address
     * @property {string} applicantEmail.required - Applicant email
     * @property {string} status.required - Request status
     * @property {number} requestedAt.required - Request timestamp
     * @property {number} resolvedAt.required - Resolution timestamp (0 if pending)
     */

    /**
     * @typedef OrgRequestListResponse
     * @property {Array.<OrgRequestItem>} items.required - Organization requests
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Creates an organization request for platform admin approval.
     * Binding: CreateOrganizationRequest
     * @route POST /organizations/requests
     * @group organizations
     * @param {OrgRequestCreateBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_COMPANY_NAME, INVALID_CIF_NIF, INVALID_COUNTRY, INVALID_FISCAL_ADDRESS, ADMIN_ALREADY_HAS_ORGANIZATION, CIF_NIF_ALREADY_EXISTS, PENDING_REQUEST_ALREADY_EXISTS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async requestOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const companyName = ((request.body.companyName || "") + "").trim();
        if (!companyName || companyName.length > COMPANY_NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_COMPANY_NAME", "Company name is required and must not exceed 200 characters");
            return;
        }

        const cifNif = ((request.body.cifNif || "") + "").trim();
        if (!cifNif || cifNif.length > CIF_NIF_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_CIF_NIF", "CIF/NIF is required and must not exceed 30 characters");
            return;
        }

        const country = ((request.body.country || "") + "").trim();
        if (!country || country.length > COUNTRY_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_COUNTRY", "Country is required and must not exceed 100 characters");
            return;
        }

        const fiscalAddress = ((request.body.fiscalAddress || "") + "").trim();
        if (!fiscalAddress || fiscalAddress.length > FISCAL_ADDRESS_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FISCAL_ADDRESS", "Fiscal address is required and must not exceed 500 characters");
            return;
        }

        const orgService = OrganizationService.getInstance();
        if (await orgService.userAdministersAnyOrganization(auth.user.id)) {
            sendApiError(request, response, BAD_REQUEST, "ADMIN_ALREADY_HAS_ORGANIZATION", "ADMIN_ALREADY_HAS_ORGANIZATION");
            return;
        }

        const activeMemberships = await OrganizationMembership.findByUserId(auth.user.id);
        if (activeMemberships.some(m => m.status === OrganizationMembershipStatus.ACTIVE)) {
            sendApiError(request, response, BAD_REQUEST, "ADMIN_ALREADY_HAS_ORGANIZATION", "ADMIN_ALREADY_HAS_ORGANIZATION");
            return;
        }

        const pendingRequests = await OrganizationRequest.findPendingByUid(auth.user.id);
        if (pendingRequests.length > 0) {
            sendApiError(request, response, BAD_REQUEST, "PENDING_REQUEST_ALREADY_EXISTS", "PENDING_REQUEST_ALREADY_EXISTS");
            return;
        }

        const existingByCifNif = await Organization.findByCifNif(cifNif);
        if (existingByCifNif) {
            sendApiError(request, response, BAD_REQUEST, "CIF_NIF_ALREADY_EXISTS", "CIF_NIF_ALREADY_EXISTS");
            return;
        }

        try {
            await OrganizationService.getInstance().submitOrganizationRequest(auth.user.id, companyName, cifNif, country, fiscalAddress);

            try {
                const adminUsers = await User.findPlatformAdmins();
                await Promise.all(adminUsers.map(adminUser => NotificationService.getInstance().sendNotification(adminUser, {
                    type: "organization_request",
                    organizationName: companyName,
                    memberName: auth.user.username,
                    info: {
                        message: "A new organization request has been submitted.",
                    },
                })));
            } catch (ex) {
                Monitor.warning(`[ORG] Failed to notify platform admins about organization request "${companyName}" from user ${auth.user.id}`);
                Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
            }

            sendApiSuccess(request, response);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Returns the authenticated user's latest organization request.
     * Binding: GetMyOrganizationRequest
     * @route GET /organizations/request
     * @group organizations
     * @returns {OrgRequestItem.model} 200 - Organization request
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: ORGANIZATION_REQUEST_NOT_FOUND
     * @security AuthToken
     */
    public async getMyOrganizationRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const latest = await OrganizationRequest.findLatestByUid(auth.user.id);
        if (!latest) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_REQUEST_NOT_FOUND", "Organization request not found");
            return;
        }

        sendApiResult(request, response, {
            id: latest.id,
            companyName: latest.companyName,
            cifNif: latest.cifNif,
            country: latest.country,
            fiscalAddress: latest.fiscalAddress,
            applicantEmail: latest.applicantEmail,
            status: latest.status,
            requestedAt: latest.requestedAt,
            resolvedAt: latest.resolvedAt,
        });
    }

    /**
     * Cancels (deletes) the authenticated user's pending organization request.
     * Binding: CancelMyOrganizationRequest
     * @route DELETE /organizations/request
     * @group organizations
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: REQUEST_NOT_PENDING
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: ORGANIZATION_REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async cancelMyOrganizationRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            const result = await OrganizationService.getInstance().cancelMyOrganizationRequest(auth.user.id);
            if (result === "deleted") {
                sendApiSuccess(request, response);
                return;
            }
            if (result === "not_pending") {
                sendApiError(request, response, BAD_REQUEST, "REQUEST_NOT_PENDING", "REQUEST_NOT_PENDING");
                return;
            }
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_REQUEST_NOT_FOUND", "Organization request not found");
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Lists organization requests. Platform admin only.
     * Binding: ListOrganizationRequests
     * @route GET /organizations/requests
     * @group organizations
     * @param {string} q.query - Search by company, CIF/NIF or applicant email
     * @param {string} status.query - Filter by status
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {OrgRequestListResponse.model} 200 - Organization requests
     * @returns {void} 400 - Bad request: INVALID_STATUS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listOrganizationRequests(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const q = ((request.query.q || "") + "").trim();
        const statusRaw = ((request.query.status || "") + "").trim();
        const status = statusRaw || undefined;

        if (status && status !== OrganizationRequestStatus.PENDING && status !== OrganizationRequestStatus.APPROVED && status !== OrganizationRequestStatus.REJECTED) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_STATUS", "Invalid status value");
            return;
        }

        const total = await OrganizationRequest.countFiltered(
            q || undefined,
            status as OrganizationRequestStatus | undefined,
        );
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const pageItems = await OrganizationRequest.findFiltered(
            skip,
            pageSize,
            q || undefined,
            status as OrganizationRequestStatus | undefined,
        );

        sendApiResult(request, response, {
            items: pageItems.map(r => ({
                id: r.id,
                companyName: r.companyName,
                cifNif: r.cifNif,
                country: r.country,
                fiscalAddress: r.fiscalAddress,
                applicantEmail: r.applicantEmail,
                status: r.status,
                requestedAt: r.requestedAt,
                resolvedAt: r.resolvedAt,
            })),
            page,
            totalPages,
            total,
        });
    }

    /**
     * Approves an organization request. Platform admin only.
     * Binding: ApproveOrganizationRequest
     * @route POST /organizations/requests/{requestId}/approve
     * @group organizations
     * @param {string} requestId.path.required - Organization request ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: REQUEST_NOT_FOUND, REQUEST_NOT_PENDING, APPLICANT_USER_NOT_FOUND, ADMIN_ALREADY_HAS_ORGANIZATION, CIF_NIF_ALREADY_EXISTS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error: BLOCKCHAIN_REGISTRATION_FAILED
     * @security AuthToken
     */
    public async approveOrganizationRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const requestId = (request.params.requestId || "").trim();
        if (!requestId) {
            sendApiError(request, response, BAD_REQUEST, "REQUEST_NOT_FOUND", "Invalid requestId");
            return;
        }
        const requestItem = await OrganizationRequest.findById(requestId);
        if (!requestItem) {
            sendApiError(request, response, NOT_FOUND, "REQUEST_NOT_FOUND", "Request not found");
            return;
        }
        if (requestItem.status !== OrganizationRequestStatus.PENDING) {
            sendApiError(request, response, BAD_REQUEST, "REQUEST_NOT_PENDING", "REQUEST_NOT_PENDING");
            return;
        }
        const applicantUser = await User.findUser(requestItem.applicantEmail.toLowerCase());
        if (!applicantUser) {
            sendApiError(request, response, BAD_REQUEST, "APPLICANT_USER_NOT_FOUND", "APPLICANT_USER_NOT_FOUND");
            return;
        }
        if (await OrganizationService.getInstance().userAdministersAnyOrganization(applicantUser.id)) {
            sendApiError(request, response, BAD_REQUEST, "ADMIN_ALREADY_HAS_ORGANIZATION", "ADMIN_ALREADY_HAS_ORGANIZATION");
            return;
        }
        const activeMemberships = await OrganizationMembership.findByUserId(applicantUser.id);
        if (activeMemberships.some(m => m.status === OrganizationMembershipStatus.ACTIVE)) {
            sendApiError(request, response, BAD_REQUEST, "ADMIN_ALREADY_HAS_ORGANIZATION", "ADMIN_ALREADY_HAS_ORGANIZATION");
            return;
        }
        const existingOrgByCif = await Organization.findByCifNif(requestItem.cifNif);
        if (existingOrgByCif) {
            sendApiError(request, response, BAD_REQUEST, "CIF_NIF_ALREADY_EXISTS", "CIF_NIF_ALREADY_EXISTS");
            return;
        }

        try {
            await OrganizationService.getInstance().approveOrganizationRequest(requestId);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        await NotificationService.getInstance().sendNotification(applicantUser, {
            type: "organization_request_approved",
            companyName: requestItem.companyName,
            info: {
                message: "Your organization request has been approved.",
            },
        });
        
        sendApiSuccess(request, response);
    }

    /**
     * Rejects an organization request. Platform admin only.
     * Binding: RejectOrganizationRequest
     * @route POST /organizations/requests/{requestId}/reject
     * @group organizations
     * @param {string} requestId.path.required - Organization request ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: REQUEST_NOT_FOUND, REQUEST_NOT_PENDING
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async rejectOrganizationRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const requestId = (request.params.requestId || "").trim();
        if (!requestId) {
            sendApiError(request, response, BAD_REQUEST, "REQUEST_NOT_FOUND", "Invalid requestId");
            return;
        }
        const requestItem = await OrganizationRequest.findById(requestId);
        if (!requestItem) {
            sendApiError(request, response, NOT_FOUND, "REQUEST_NOT_FOUND", "Request not found");
            return;
        }
        if (requestItem.status !== OrganizationRequestStatus.PENDING) {
            sendApiError(request, response, BAD_REQUEST, "REQUEST_NOT_PENDING", "REQUEST_NOT_PENDING");
            return;
        }

        const user = await User.findUser(requestItem.applicantEmail.toLowerCase());

        try {
            await OrganizationService.getInstance().rejectOrganizationRequest(requestId);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }

        
        await NotificationService.getInstance().sendNotification(user, {
            type: "organization_request_rejected",
            companyName: requestItem.companyName,
            info: {
                message: "Your organization request has been rejected.",
            },
        });
        
        sendApiSuccess(request, response);
    }

    /**
     * @typedef OrgDeletionRequestCreateBody
     * @property {string} subscriptionPreference.required - ImmediateProratedRefund or AtPeriodEnd
     */

    /**
     * @typedef OrgDeletionRequestItem
     * @property {string} id.required - Deletion request ID
     * @property {string} organizationId.required - Organization ID
     * @property {string} organizationName.required - Organization name
     * @property {string} requestedByUserId.required - Requesting admin user ID
     * @property {string} requestedByUsername.required - Requesting admin username
     * @property {string} subscriptionPreference.required - Requested subscription handling
     * @property {string} resolvedSubscriptionHandling - Applied subscription handling (empty if pending)
     * @property {string} status.required - Request status
     * @property {number} requestedAt.required - Request timestamp
     * @property {number} resolvedAt.required - Resolution timestamp (0 if pending)
     * @property {string} resolvedByUserId - Platform admin who resolved the request
     * @property {string} resolvedByUsername - Platform admin username who resolved the request
     * @property {number} scheduledDeletionAt - Estimated closure timestamp when status is ApprovedPendingPeriodEnd (0 otherwise)
     * @property {string} rejectionReason - Reason provided when rejected (empty otherwise)
     */

    /**
     * @typedef OrgDeletionRequestRejectBody
     * @property {string} reason - Optional rejection reason
     */

    /**
     * @typedef OrgDeletionRequestListResponse
     * @property {Array.<OrgDeletionRequestItem>} items.required - Organization deletion requests
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Submits an organization deletion request. Organization admin only.
     * Binding: SubmitOrganizationDeletionRequest
     * @route POST /organizations/{orgId}/deletion-request
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {OrgDeletionRequestCreateBody.model} request.body - Request body
     * @returns {OrgDeletionRequestItem.model} 200 - Deletion request
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIPTION_PREFERENCE, PENDING_DELETION_REQUEST_EXISTS, ORGANIZATION_NOT_ACTIVE, NOT_ORGANIZATION_ADMIN
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async submitOrganizationDeletionRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const orgService = OrganizationService.getInstance();
        const preference = orgService.parseDeletionSubscriptionPreference(request.body.subscriptionPreference);
        if (!preference) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIPTION_PREFERENCE", "Invalid subscription preference");
            return;
        }

        try {
            const created = await orgService.submitDeletionRequest(orgId, auth.user.id, preference);
            sendApiResult(request, response, await orgService.mapDeletionRequestToApiItem(created));
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_FOUND", NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_ACTIVE", BAD_REQUEST, "ORGANIZATION_NOT_ACTIVE", "Organization is not active")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "NOT_ORGANIZATION_ADMIN", FORBIDDEN, "", "You are not the admin of this organization")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "PENDING_DELETION_REQUEST_EXISTS", BAD_REQUEST, "PENDING_DELETION_REQUEST_EXISTS", "A pending deletion request already exists")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Returns the organization's pending or latest deletion request. Organization admin only.
     * Binding: GetOrganizationDeletionRequest
     * @route GET /organizations/{orgId}/deletion-request
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {OrgDeletionRequestItem.model} 200 - Deletion request
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, DELETION_REQUEST_NOT_FOUND
     * @security AuthToken
     */
    public async getOrganizationDeletionRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "You are not the admin of this organization");
            return;
        }

        const deletionRequest = await OrganizationService.getInstance().getDeletionRequestForOrganization(orgId);
        if (!deletionRequest) {
            sendApiError(request, response, NOT_FOUND, "DELETION_REQUEST_NOT_FOUND", "Deletion request not found");
            return;
        }

        sendApiResult(request, response, await OrganizationService.getInstance().mapDeletionRequestToApiItem(deletionRequest));
    }

    /**
     * Cancels the pending organization deletion request. Organization admin only.
     * Binding: CancelOrganizationDeletionRequest
     * @route DELETE /organizations/{orgId}/deletion-request
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: DELETION_REQUEST_NOT_PENDING
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: NOT_ORGANIZATION_ADMIN
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, DELETION_REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async cancelOrganizationDeletionRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();

        try {
            const result = await OrganizationService.getInstance().cancelDeletionRequest(orgId, auth.user.id);
            if (result === "deleted") {
                sendApiSuccess(request, response);
                return;
            }
            if (result === "not_pending") {
                sendApiError(request, response, BAD_REQUEST, "DELETION_REQUEST_NOT_PENDING", "Deletion request is not pending");
                return;
            }
            sendApiError(request, response, NOT_FOUND, "DELETION_REQUEST_NOT_FOUND", "Deletion request not found");
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_FOUND", NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "NOT_ORGANIZATION_ADMIN", FORBIDDEN, "", "You are not the admin of this organization")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Lists organization deletion requests. Platform admin only.
     * Binding: ListOrganizationDeletionRequests
     * @route GET /organizations/deletion-requests
     * @group organizations
     * @param {string} q.query - Search by request ID, organization ID or requester user ID
     * @param {string} status.query - Filter by status
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {OrgDeletionRequestListResponse.model} 200 - Deletion requests
     * @returns {void} 400 - Bad request: INVALID_STATUS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listOrganizationDeletionRequests(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const q = ((request.query.q || "") + "").trim();
        const statusRaw = ((request.query.status || "") + "").trim();
        const status = statusRaw || undefined;

        if (status && status !== OrganizationDeletionRequestStatus.PENDING
            && status !== OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END
            && status !== OrganizationDeletionRequestStatus.APPROVED
            && status !== OrganizationDeletionRequestStatus.REJECTED) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_STATUS", "Invalid status value");
            return;
        }

        const orgService = OrganizationService.getInstance();
        const total = (await orgService.listDeletionRequests(0, 1, q || undefined, status as OrganizationDeletionRequestStatus | undefined)).total;
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const { items: pageItems } = await orgService.listDeletionRequests(
            skip,
            pageSize,
            q || undefined,
            status as OrganizationDeletionRequestStatus | undefined,
        );

        sendApiResult(request, response, {
            items: await Promise.all(pageItems.map((item) => orgService.mapDeletionRequestToApiItem(item))),
            page,
            totalPages,
            total,
        });
    }

    /**
     * Approves an organization deletion request. Platform admin only.
     * Binding: ApproveOrganizationDeletionRequest
     * @route POST /organizations/deletion-requests/{requestId}/approve
     * @group organizations
     * @param {string} requestId.path.required - Deletion request ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIPTION_PREFERENCE, DELETION_REQUEST_NOT_PENDING, ORGANIZATION_NOT_ACTIVE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: DELETION_REQUEST_NOT_FOUND, ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error: BLOCKCHAIN_REGISTRATION_FAILED, REFUND_FAILED, STRIPE_NOT_CONFIGURED
     * @security AuthToken
     */
    public async approveOrganizationDeletionRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const requestId = (request.params.requestId || "").trim();
        if (!requestId) {
            sendApiError(request, response, BAD_REQUEST, "DELETION_REQUEST_NOT_FOUND", "Invalid requestId");
            return;
        }

        try {
            await OrganizationService.getInstance().approveDeletionRequest(requestId, auth.user.id);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "DELETION_REQUEST_NOT_FOUND", NOT_FOUND, "DELETION_REQUEST_NOT_FOUND", "Deletion request not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "DELETION_REQUEST_NOT_PENDING", BAD_REQUEST, "DELETION_REQUEST_NOT_PENDING", "Deletion request is not pending")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_FOUND", NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_ACTIVE", BAD_REQUEST, "ORGANIZATION_NOT_ACTIVE", "Organization is not active")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "Stripe is not configured", INTERNAL_SERVER_ERROR, "STRIPE_NOT_CONFIGURED", "Stripe is not configured")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "PAYMENT_ALREADY_REFUNDED", BAD_REQUEST, "PAYMENT_ALREADY_REFUNDED", "Payment already refunded")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "SUBSCRIPTION_NOT_FOUND", BAD_REQUEST, "SUBSCRIPTION_NOT_FOUND", "Subscription not found")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Rejects an organization deletion request. Platform admin only.
     * Binding: RejectOrganizationDeletionRequest
     * @route POST /organizations/deletion-requests/{requestId}/reject
     * @group organizations
     * @param {string} requestId.path.required - Deletion request ID
     * @param {OrgDeletionRequestRejectBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: DELETION_REQUEST_NOT_PENDING
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: DELETION_REQUEST_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async rejectOrganizationDeletionRequest(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const requestId = (request.params.requestId || "").trim();
        if (!requestId) {
            sendApiError(request, response, BAD_REQUEST, "DELETION_REQUEST_NOT_FOUND", "Invalid requestId");
            return;
        }

        const reason = ((request.body.reason || "") + "").trim();
        if (reason.length > 2000) {
            sendApiError(request, response, BAD_REQUEST, "REJECTION_REASON_TOO_LONG", "Rejection reason is too long");
            return;
        }

        try {
            await OrganizationService.getInstance().rejectDeletionRequest(requestId, auth.user.id, reason);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "DELETION_REQUEST_NOT_FOUND", NOT_FOUND, "DELETION_REQUEST_NOT_FOUND", "Deletion request not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "DELETION_REQUEST_NOT_PENDING", BAD_REQUEST, "DELETION_REQUEST_NOT_PENDING", "Deletion request is not pending")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Returns the details of an organization. Only the org admin may call this.
     * Binding: GetOrganization
     * @route GET /organizations/{orgId}
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {OrgItem.model} 200 - Organization details
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async getOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            const membership = await OrganizationMembership.findByUserAndOrganization(auth.user.id, orgId);
            if (!membership || membership.status !== OrganizationMembershipStatus.ACTIVE) {
                sendApiError(request, response, FORBIDDEN, "", "Access denied to this organization");
                return;
            }
        }

        sendApiResult(request, response, await OrganizationService.getInstance().toOrganizationItem(org, auth.user.id));
    }

    /**
     * @typedef OrgUpdateBody
     * @property {string} companyName - New company name
     * @property {string} fiscalAddress - New fiscal address
     * @property {string} email - New contact email
     * @property {string} country - New country
     */

    /**
     * Updates organization details. Only the org admin may call this.
     * Binding: UpdateOrganization
     * @route PUT /organizations/{orgId}
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {OrgUpdateBody.model} request.body - Fields to update
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_COMPANY_NAME, INVALID_EMAIL, INVALID_FISCAL_ADDRESS, INVALID_COUNTRY
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async updateOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const updateData: Record<string, string> = {};

        if (request.body.companyName !== undefined) {
            const v = ((request.body.companyName || "") + "").trim();
            if (!v || v.length > COMPANY_NAME_MAX_LENGTH) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COMPANY_NAME", "Company name must not be empty and must not exceed 200 characters");
                return;
            }
            updateData.companyName = v;
        }

        if (request.body.email !== undefined) {
            const v = ((request.body.email || "") + "").trim().toLowerCase();
            if (!validateEmail(v) || v.length > EMAIL_MAX_LENGTH) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_EMAIL", "A valid email is required");
                return;
            }
            updateData.email = v;
        }

        if (request.body.fiscalAddress !== undefined) {
            const v = ((request.body.fiscalAddress || "") + "").trim();
            if (!v || v.length > FISCAL_ADDRESS_MAX_LENGTH) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_FISCAL_ADDRESS", "Fiscal address must not be empty");
                return;
            }
            updateData.fiscalAddress = v;
        }

        if (request.body.country !== undefined) {
            const v = ((request.body.country || "") + "").trim();
            if (!v || v.length > COUNTRY_MAX_LENGTH) {
                sendApiError(request, response, BAD_REQUEST, "INVALID_COUNTRY", "Country must not be empty");
                return;
            }
            updateData.country = v;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        try {
            await OrganizationService.getInstance().updateOrganization(orgId, auth.user.id, updateData);
            sendApiSuccess(request, response);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Deletes an organization. Only platform admins may call this.
     * Binding: DeleteOrganization
     * @route DELETE /organizations/{orgId}
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} subscriptionHandling.query.required - ImmediateProratedRefund or AtPeriodEnd
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_SUBSCRIPTION_PREFERENCE, ORGANIZATION_NOT_ACTIVE, PENDING_DELETION_REQUEST_EXISTS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error: BLOCKCHAIN_REGISTRATION_FAILED, REFUND_FAILED, STRIPE_NOT_CONFIGURED
     * @security AuthToken
     */
    public async deleteOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const subscriptionHandling = OrganizationService.getInstance().parseDeletionSubscriptionPreference(
            ((request.query.subscriptionHandling || "") + "").trim(),
        );
        if (!subscriptionHandling) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBSCRIPTION_PREFERENCE", "Invalid subscription handling");
            return;
        }

        try {
            await OrganizationService.getInstance().deleteOrganizationByPlatform(orgId, auth.user.id, subscriptionHandling);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_FOUND", NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "ORGANIZATION_NOT_ACTIVE", BAD_REQUEST, "ORGANIZATION_NOT_ACTIVE", "Organization is not active")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "PENDING_DELETION_REQUEST_EXISTS", BAD_REQUEST, "PENDING_DELETION_REQUEST_EXISTS", "A deletion request is already in progress")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "Stripe is not configured", INTERNAL_SERVER_ERROR, "STRIPE_NOT_CONFIGURED", "Stripe is not configured")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "PAYMENT_ALREADY_REFUNDED", BAD_REQUEST, "PAYMENT_ALREADY_REFUNDED", "Payment already refunded")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "SUBSCRIPTION_NOT_FOUND", BAD_REQUEST, "SUBSCRIPTION_NOT_FOUND", "Subscription not found")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * @typedef MemberItem
     * @property {string} id.required - Membership ID
     * @property {string} userId.required - User ID
     * @property {string} username.required - Username
     * @property {string} email.required - User email
     * @property {number} activeLicenseCount.required - Active license assignment count for this member
     * @property {string} organizationId.required - Organization ID
     * @property {string} organizationRole.required - Role: Admin | Member
     * @property {string} status.required - Status: Active | Invited | Inactive
     * @property {number} joinedAt.required - Joined timestamp (Unix ms)
     */

    /**
     * @typedef MembersListResponse
     * @property {Array.<MemberItem>} members.required - Members list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists organization members (non-invited). Org admin or platform admin (admin.users.manage) may call this. Inactive members are included for admins.
     * Binding: ListOrganizationMembers
     * @route GET /organizations/{orgId}/members
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {MembersListResponse.model} 200 - Members list
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async listMembers(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        try {
            const total = await OrganizationMembership.countByOrganizationId(orgId);
            const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
            const members = await OrganizationMembership.findByOrganizationIdPaginated(orgId, skip, pageSize);
            sendApiResult(request, response, {
                members: await OrganizationService.getInstance().toMemberItems(members),
                page,
                totalPages,
                total,
            });
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * Lists invited users of an organization. Only the org admin may call this.
     * Binding: ListOrganizationInvitedMembers
     * @route GET /organizations/{orgId}/members/invited
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {MembersListResponse.model} 200 - Invited users list
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async listInvitedMembers(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        try {
            const total = await OrganizationMembership.countByOrganizationId(orgId, OrganizationMembershipStatus.INVITED);
            const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
            const members = await OrganizationMembership.findByOrganizationIdPaginated(orgId, skip, pageSize, OrganizationMembershipStatus.INVITED);
            sendApiResult(request, response, {
                members: await OrganizationService.getInstance().toMemberItems(members),
                page,
                totalPages,
                total,
            });
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * @typedef AcceptInvitationBody
     * @property {string} notificationId.required - Notification ID
     */

    /**
     * Accepts the caller's pending organization invitation.
     * Binding: AcceptOrganizationInvitation
     * @route POST /organizations/memberships/{membershipId}/accept
     * @group organizations
     * @param {string} membershipId.path.required - Membership ID
     * @param {AcceptInvitationBody.model} request.body - Notification ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: MEMBERSHIP_NOT_INVITED, USER_ALREADY_IN_ORGANIZATION, USER_HAS_ACTIVE_SUBSCRIPTIONS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async acceptInvitation(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const membershipId = (request.params.membershipId || "").trim();
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.userId !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        if (membership.status !== OrganizationMembershipStatus.INVITED) {
            sendApiError(request, response, BAD_REQUEST, "MEMBERSHIP_NOT_INVITED", "Membership is not pending invitation");
            return;
        }

        try {
            await OrganizationService.getInstance().acceptMembershipInvitationAndNotify(
                auth.user.id,
                auth.user.username,
                membershipId,
                (request.body.notificationId || "") + "",
            );
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            const message = ex instanceof Error ? ex.message : "Internal server error";
            if (message === "USER_ALREADY_IN_ORGANIZATION") {
                sendApiError(request, response, BAD_REQUEST, "USER_ALREADY_IN_ORGANIZATION", "This user already belongs to an organization");
                return;
            }
            if (message === "USER_HAS_ACTIVE_SUBSCRIPTIONS") {
                sendApiError(request, response, BAD_REQUEST, "USER_HAS_ACTIVE_SUBSCRIPTIONS", "This user has active subscriptions and cannot accept an organization invitation");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", message);
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Rejects the caller's pending organization invitation and removes membership.
     * Binding: RejectOrganizationInvitation
     * @route POST /organizations/memberships/{membershipId}/reject
     * @group organizations
     * @param {string} membershipId.path.required - Membership ID
     * @param {AcceptInvitationBody.model} request.body - Notification ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: MEMBERSHIP_NOT_INVITED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async rejectInvitation(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const membershipId = (request.params.membershipId || "").trim();
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.userId !== auth.user.id) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        if (membership.status !== OrganizationMembershipStatus.INVITED) {
            sendApiError(request, response, BAD_REQUEST, "MEMBERSHIP_NOT_INVITED", "Membership is not pending invitation");
            return;
        }

        try {
            await OrganizationService.getInstance().rejectMembershipInvitation(auth.user.id, membershipId);
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        await NotificationService.getInstance().updateInvitationNotificationStatus(auth.user.id, "rejected", request.body.notificationId);

        const org = await Organization.findById(membership.organizationId);
        if (org) {
            await OrganizationService.getInstance().notifyOrganizationAdmins(org.id, {
                type: "organization_member_invitation_rejected",
                organizationName: org.companyName,
                memberName: auth.user.username,
                info: {
                    message: "An invitation has been rejected.",
                },
            }, auth.user.id);
        }

        sendApiSuccess(request, response);
    }

    /**
     * @typedef InviteMemberBody
     * @property {string} email.required - Email of the user to invite
     * @property {string} organizationRole.required - Role: Admin | Member
     */

    /**
     * Invites an existing user by email to the organization.
     * Binding: InviteOrganizationMember
     * @route POST /organizations/{orgId}/members/invite
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {InviteMemberBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_EMAIL, INVALID_ROLE, USER_NOT_FOUND, MEMBER_ALREADY_EXISTS, USER_ALREADY_IN_ORGANIZATION, USER_HAS_ACTIVE_SUBSCRIPTIONS
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async inviteMember(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();

        const email = ((request.body.email || "") + "").trim().toLowerCase();
        if (!email || !validateEmail(email)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_EMAIL", "A valid email is required");
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const targetUser = await User.findUser(email);
        if (!targetUser) {
            sendApiError(request, response, BAD_REQUEST, "USER_NOT_FOUND", "No registered user found with this email");
            return;
        }
        const existingMembership = await OrganizationMembership.findByUserAndOrganization(targetUser.id, orgId);
        if (existingMembership) {
            sendApiError(request, response, BAD_REQUEST, "MEMBER_ALREADY_EXISTS", "This user is already a member of the organization");
            return;
        }
        const activeMembership = await OrganizationMembership.findActiveMembershipForUser(targetUser.id);
        if (activeMembership && activeMembership.organizationId !== orgId) {
            sendApiError(request, response, BAD_REQUEST, "USER_ALREADY_IN_ORGANIZATION", "This user already belongs to an organization");
            return;
        }
        const activeSubscriptions = await Subscription.findActiveByUser(targetUser.id);
        if (activeSubscriptions.length > 0) {
            sendApiError(request, response, BAD_REQUEST, "USER_HAS_ACTIVE_SUBSCRIPTIONS", "This user has active subscriptions and cannot be invited to an organization");
            return;
        }
        const rawRole = ((request.body.organizationRole || OrganizationMembershipRole.MEMBER) + "").trim();        
        const role = OrganizationService.getInstance().parseMembershipRole(rawRole);
        if (!role) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_ROLE", "Invalid role");
            return;
        }
        let membership;
        try {
            membership = await OrganizationService.getInstance().inviteMember(
                orgId,
                auth.user.id,
                email,
                role,
            );
        } catch (ex) {
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        await NotificationService.getInstance().sendNotification(targetUser, {
            type: "organization_member_invited",
            organizationName: org.companyName,
            role,
            membershipId: membership.id,
            info: {
                message: "",
            },
        });
        
        sendApiSuccess(request, response);
    }

    /**
     * Activates a member (sets status to Active).
     * Binding: ActivateOrganizationMember
     * @route POST /organizations/{orgId}/members/{membershipId}/activate
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} membershipId.path.required - Membership ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async activateMember(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const membershipId = (request.params.membershipId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.organizationId !== orgId) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        try {
            await OrganizationService.getInstance().activateMember(membershipId);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        const memberUser = await User.findUserByUID(membership.userId);
        if (memberUser) {
            await NotificationService.getInstance().sendNotification(memberUser, {
                type: "organization_member_activated",
                organizationName: org.companyName,
                info: {
                    message: "Your membership has been activated.",
                },
            });
        }
        
        sendApiSuccess(request, response);
    }

    /**
     * Deactivates a member (sets status to Inactive).
     * Binding: DeactivateOrganizationMember
     * @route POST /organizations/{orgId}/members/{membershipId}/deactivate
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} membershipId.path.required - Membership ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: CANNOT_DEACTIVATE_SELF, CANNOT_DEACTIVATE_ORG_CREATOR
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async deactivateMember(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const membershipId = (request.params.membershipId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.organizationId !== orgId) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        if (membership.userId === auth.user.id) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own membership");
            return;
        }
        if (OrganizationService.getInstance().isOrganizationCreator(org, membership.userId)) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_DEACTIVATE_ORG_CREATOR", "You cannot deactivate the organization creator");
            return;
        }
        try {
            await OrganizationService.getInstance().deactivateMember(membershipId);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        const memberUser = await User.findUserByUID(membership.userId);
        if (memberUser) {
            await NotificationService.getInstance().sendNotification(memberUser, {
                type: "organization_member_deactivated",
                organizationName: org.companyName,
                info: {
                    message: "Your membership has been deactivated.",
                },
            });
        }
        
        sendApiSuccess(request, response);
    }

    /**
     * @typedef ChangeMemberRoleBody
     * @property {string} organizationRole.required - Role: Admin | Member
     */

    /**
     * Changes a member's role in the organization.
     * Binding: ChangeOrganizationMemberRole
     * @route PUT /organizations/{orgId}/members/{membershipId}/role
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} membershipId.path.required - Membership ID
     * @param {ChangeMemberRoleBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_ROLE, CANNOT_CHANGE_ORG_CREATOR_ROLE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async changeMemberRole(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const membershipId = (request.params.membershipId || "").trim();

        const parsedRole = OrganizationService.getInstance().parseMembershipRole(request.body.organizationRole || "");
        if (!parsedRole) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_ROLE", "Invalid role");
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.organizationId !== orgId) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        if (OrganizationService.getInstance().isOrganizationCreator(org, membership.userId)) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_CHANGE_ORG_CREATOR_ROLE", "You cannot change the organization creator's role");
            return;
        }

        try {
            await OrganizationService.getInstance().changeMemberRole(membershipId, parsedRole);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, "CANNOT_CHANGE_ORG_CREATOR_ROLE", BAD_REQUEST, "CANNOT_CHANGE_ORG_CREATOR_ROLE", "You cannot change the organization creator's role")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        sendApiSuccess(request, response);
    }

    /**
     * Removes a member from the organization.
     * Binding: RemoveOrganizationMember
     * @route DELETE /organizations/{orgId}/members/{membershipId}
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} membershipId.path.required - Membership ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: CANNOT_REMOVE_SELF, CANNOT_REMOVE_ORG_CREATOR
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, MEMBERSHIP_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async removeMember(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const membershipId = (request.params.membershipId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.organizationId !== orgId) {
            sendApiError(request, response, NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found");
            return;
        }
        if (membership.userId === auth.user.id) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_REMOVE_SELF", "You cannot remove yourself from the organization");
            return;
        }
        if (OrganizationService.getInstance().isOrganizationCreator(org, membership.userId)) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_REMOVE_ORG_CREATOR", "You cannot remove the organization creator");
            return;
        }
        try {
            await OrganizationService.getInstance().removeMember(orgId, auth.user.id, membershipId);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        const memberUser = await User.findUserByUID(membership.userId);
        if (memberUser) {
            await NotificationService.getInstance().sendNotification(memberUser, {
                type: "organization_member_removed",
                organizationName: org.companyName,
                info: {
                    message: "You have been removed from the organization.",
                    organizationName: org.companyName,
                },
            });
        }
        
        sendApiSuccess(request, response);
    }

    /**
     * Allows the authenticated user to voluntarily leave their organization.
     * Deactivates all license assignments and removes the membership.
     * Blocked for the organization creator.
     * Binding: LeaveOrganization
     * @route POST /organizations/leave
     * @group organizations
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: NOT_A_MEMBER, CANNOT_LEAVE_AS_CREATOR
     * @returns {void} 401 - Unauthorized
     * @returns {void} 404 - Not found: MEMBERSHIP_NOT_FOUND, ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async leaveOrganization(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const membership = await OrganizationMembership.findActiveMembershipForUser(auth.user.id);
        if (!membership) {
            sendApiError(request, response, BAD_REQUEST, "NOT_A_MEMBER", "You are not an active member of any organization");
            return;
        }

        const org = await Organization.findById(membership.organizationId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        if (OrganizationService.getInstance().isOrganizationCreator(org, auth.user.id)) {
            sendApiError(request, response, BAD_REQUEST, "CANNOT_LEAVE_AS_CREATOR", "The organization creator cannot leave the organization");
            return;
        }

        try {
            await OrganizationService.getInstance().removeMember(org.id, auth.user.id, membership.id);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            if (sendApiErrorOnMessage(request, response, ex, "CANNOT_REMOVE_ORG_CREATOR", BAD_REQUEST, "CANNOT_LEAVE_AS_CREATOR", "The organization creator cannot leave the organization")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
            return;
        }

        await OrganizationService.getInstance().notifyOrganizationAdmins(org.id, {
            type: "organization_member_left",
            organizationName: org.companyName,
            info: {
                organizationName: org.companyName,
                memberName: auth.user?.username || auth.user?.id || "Unknown",
            },
        }, auth.user.id);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef OrgSubscriptionItem
     * @property {string} id.required - Subscription ID
     * @property {string} subscribableType - Subscribable type (item or plan)
     * @property {string} subscribableId - Subscribable id
     * @property {string} subscribableName - Human-readable product or plan name
     * @property {string} billingCycle.required - Billing cycle
     * @property {string} status.required - Status
     * @property {number} currentPeriodStart.required - Current period start (Unix ms)
     * @property {number} currentPeriodEnd.required - Current period end (Unix ms)
     * @property {boolean} cancelAtPeriodEnd.required - Cancel at period end flag
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     */

    /**
     * @typedef OrgSubscriptionsListResponse
     * @property {Array.<OrgSubscriptionItem>} subscriptions.required - Subscriptions list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists all subscriptions owned by the org.
     * Binding: ListOrganizationSubscriptions
     * @route GET /organizations/{orgId}/subscriptions
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {OrgSubscriptionsListResponse.model} 200 - Subscriptions list
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async listSubscriptions(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "You are not the admin of this organization");
            return;
        }

        const total = await Subscription.countByOrganization(orgId);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const subscriptions = await Subscription.findByOrganizationPaginated(orgId, skip, pageSize);

        sendApiResult(request, response, {
            subscriptions: await SubscriptionService.getInstance().attachSubscribableNames(subscriptions),
            page,
            totalPages,
            total,
        });
    }

    /**
     * @typedef OrgPaymentItem
     * @property {string} id.required - Payment ID
     * @property {string} agentId.required - Agent ID
     * @property {string} type.required - Payment type
     * @property {number} amountCents.required - Amount in cents
     * @property {string} currency.required - Currency
     * @property {string} status.required - Status
     * @property {string} billingCycle.required - Billing cycle
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     */

    /**
     * @typedef OrgPaymentsListResponse
     * @property {Array.<OrgPaymentItem>} payments.required - Payments list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists billing history for the organization.
     * Binding: ListOrganizationPayments
     * @route GET /organizations/{orgId}/payments
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @param {string} limit.query - Max results (default: 25, max: 256)
     * @param {string} continuationToken.query - Continuation token from previous page
     * @param {string} dateFrom.query - Filter by date from (Unix ms timestamp)
     * @param {string} dateTo.query - Filter by date to (Unix ms timestamp)
     * @param {string} paymentType.query - Filter by payment type
     * @param {string} productType.query - Filter by product type (item or plan)
     * @param {string} status.query - Filter by payment status (`paid` matches completed and confirmed)
     * @returns {OrgPaymentsListResponse.model} 200 - Payments list
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async listPayments(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "You are not the admin of this organization");
            return;
        }

        const orgSubscriptions = await Subscription.findByOrganization(orgId);
        const subIds = orgSubscriptions.map(s => s.id);

        const filtersInput = {
            dateFrom: Number.parseInt((request.query.dateFrom as string) || "", 10) || undefined,
            dateTo: Number.parseInt((request.query.dateTo as string) || "", 10) || undefined,
            paymentType: ((request.query.paymentType as string) || "").trim(),
            productType: ((request.query.productType as string) || "").trim(),
            status: ((request.query.status as string) || "").trim(),
        };
        const filters = PaymentService.getInstance().normalizeHistoryFilters(filtersInput);

        const total = await Payment.countBySubscriptionIdsWithFilters(subIds, filters);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const payments = await Payment.findBySubscriptionIdsWithFilters(subIds, skip, pageSize, filters);

        sendApiResult(request, response, {
            payments: payments.map(p => p.toObject()),
            page,
            totalPages,
            total,
        });
    }

    /**
     * @typedef LicenseAssignmentItem
     * @property {string} id.required - Assignment ID
     * @property {string} organizationId.required - Organization ID
     * @property {string} userId.required - Assigned user ID
     * @property {string} licensePoolId.required - License pool ID
     * @property {string} subscriptionId.required - Source billing subscription ID (denormalized)
     * @property {boolean} isActive.required - Active flag
     * @property {number} assignedAt.required - Assignment timestamp (Unix ms)
     * @property {string} productName - Catalog product or service display name
     */

    /**
     * @typedef LicensePoolItem
     * @property {string} id.required - Pool ID
     * @property {string} organizationId.required - Organization ID
     * @property {string} catalogItemId.required - Catalog item ID
     * @property {string} itemPlanId.required - Item plan ID for entitlement
     * @property {string} sourceSubscriptionId.required - Billing subscription ID
     * @property {string} sourceType.required - plan | item
     * @property {number} seatLimit.required - Maximum assignable seats (-1 = unlimited, services)
     * @property {number} assignedCount.required - Active assignments count
     * @property {number} availableCount - Remaining seats (null when seatLimit is -1)
     * @property {string} productName.required - Catalog product display name
     * @property {string} billingCycle.required - Billing cycle
     * @property {string} parentSubscriptionId.required - Same as sourceSubscriptionId
     * @property {string} status.required - Pool status (mirrors source subscription)
     */

    /**
     * @typedef OrgLicensePoolsListResponse
     * @property {Array.<LicensePoolItem>} pools.required - License pools
     */

    /**
     * @typedef BackfillLicensePoolsResponse
     * @property {number} poolsCreated.required - New pools created during backfill
     * @property {number} assignmentsLinked.required - Legacy assignments linked to pools
     * @property {number} skipped.required - Assignments or rows skipped
     */

    /**
     * @typedef OrgLicensesListResponse
     * @property {Array.<LicenseAssignmentItem>} licenses.required - License assignments
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * Lists active license assignments for an organization.
     * Binding: ListOrganizationLicenses
     * @route GET /organizations/{orgId}/licenses
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} userId.query - When set, only assignments for this member user ID
     * @param {number} page.query - Page number
     * @param {number} pageSize.query - Page size (max 25)
     * @returns {OrgLicensesListResponse.model} 200 - License assignments
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async listLicenses(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        const filterUserId = ((request.query.userId || "") + "").trim();

        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            const isOwnLicenses = filterUserId && filterUserId === auth.user.id
                && await OrganizationMembership.isActiveMember(auth.user.id, orgId);
            if (!isOwnLicenses) {
                sendApiError(request, response, FORBIDDEN, "", "You are not the admin of this organization");
                return;
            }
        }

        const total = filterUserId
            ? await OrganizationLicenseAssignment.countActiveByOrganizationAndUser(orgId, filterUserId)
            : await OrganizationLicenseAssignment.countActiveByOrganization(orgId);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, ORGANIZATIONS_PAGE_LIMIT);
        const licenses = filterUserId
            ? await OrganizationLicenseAssignment.findActiveByOrganizationAndUser(orgId, filterUserId, skip, pageSize)
            : await OrganizationLicenseAssignment.findActiveByOrganization(orgId, skip, pageSize);
        const licenseRows = await OrganizationLicensePoolService.getInstance().toLicenseAssignmentApiRows(licenses);

        sendApiResult(request, response, {
            licenses: licenseRows,
            page,
            totalPages,
            total,
        });
    }

    /**
     * Lists active license pools for an organization (one pool per catalog product).
     * Binding: ListOrganizationLicensePools
     * @route GET /organizations/{orgId}/license-pools
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {OrgLicensePoolsListResponse.model} 200 - License pools
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async listLicensePools(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "You are not the admin of this organization");
            return;
        }

        const pools = await OrganizationLicensePool.findActiveByOrganization(orgId);
        const items = await Promise.all(pools.map(async (pool) => {
            const assignedCount = await OrganizationLicenseAssignment.countActiveByPool(pool.id);
            const catalogItem = await CatalogItem.findById(pool.catalogItemId);
            return {
                id: pool.id,
                organizationId: pool.organizationId,
                catalogItemId: pool.catalogItemId,
                itemPlanId: pool.itemPlanId,
                sourceSubscriptionId: pool.sourceSubscriptionId,
                sourceType: pool.sourceType,
                seatLimit: pool.seatLimit,
                assignedCount,
                availableCount: computePoolAvailableCount(pool.seatLimit, assignedCount),
                productName: catalogItem?.name || "",
                billingCycle: pool.billingCycle,
                parentSubscriptionId: pool.sourceSubscriptionId,
                status: pool.status,
            };
        }));

        sendApiResult(request, response, { pools: items });
    }

    /**
     * Backfills license pools and links legacy item-level assignments. Requires platform admin.
     * Binding: BackfillOrganizationLicensePools
     * @route POST /organizations/{orgId}/license-pools/backfill
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @returns {BackfillLicensePoolsResponse.model} 200 - Backfill summary
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @security AuthToken
     */
    public async backfillLicensePools(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Missing permission admin.users.manage");
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        const result = await OrganizationLicensePoolService.getInstance().backfillOrganization(orgId);
        sendApiResult(request, response, result);
    }

    /**
     * @typedef AssignLicenseBody
     * @property {string} licensePoolId.required - License pool ID to assign
     * @property {string} userId.required - Member user ID to assign the license to
     */

    /**
     * Assigns a license pool seat to a member.
     * Binding: AssignOrganizationLicense
     * @route POST /organizations/{orgId}/licenses
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {AssignLicenseBody.model} request.body - Request body
     * @returns {LicenseAssignmentItem.model} 200 - Created or reactivated license assignment
     * @returns {void} 400 - Bad request: INVALID_LICENSE_POOL_ID, INVALID_USER_ID, LICENSE_POOL_NOT_FOUND, LICENSE_POOL_NOT_ACTIVE, MEMBER_NOT_ACTIVE, LICENSE_ALREADY_ASSIGNED, NO_SEATS_AVAILABLE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async assignLicense(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();

        const licensePoolId = ((request.body.licensePoolId || "") + "").trim();
        if (!licensePoolId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_LICENSE_POOL_ID", "licensePoolId is required");
            return;
        }

        const userId = ((request.body.userId || "") + "").trim();
        if (!userId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_USER_ID", "userId is required");
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        const isOrgAdmin = await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId);
        if (!isOrgAdmin && !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const pool = await OrganizationLicensePool.findById(licensePoolId);
        if (!pool || pool.organizationId !== orgId) {
            sendApiError(request, response, BAD_REQUEST, "LICENSE_POOL_NOT_FOUND", "LICENSE_POOL_NOT_FOUND");
            return;
        }

        const poolService = OrganizationLicensePoolService.getInstance();
        if (!(await poolService.isPoolAssignable(pool))) {
            sendApiError(request, response, BAD_REQUEST, "LICENSE_POOL_NOT_ACTIVE", "License pool is not active");
            return;
        }

        const targetMembership = await OrganizationMembership.findByUserAndOrganization(userId, orgId);
        if (!targetMembership || targetMembership.status !== OrganizationMembershipStatus.ACTIVE) {
            sendApiError(request, response, BAD_REQUEST, "MEMBER_NOT_ACTIVE", "Target user must be an active member of the organization");
            return;
        }

        const existingAssignment = await OrganizationLicenseAssignment.findByPoolAndUser(licensePoolId, userId);
        if (existingAssignment?.isActive) {
            sendApiError(request, response, BAD_REQUEST, "LICENSE_ALREADY_ASSIGNED", "LICENSE_ALREADY_ASSIGNED");
            return;
        }

        const activeAssignments = await OrganizationLicenseAssignment.countActiveByPool(licensePoolId);
        if (!poolHasAvailableSeat(pool.seatLimit, activeAssignments)) {
            sendApiError(request, response, BAD_REQUEST, "NO_SEATS_AVAILABLE", `All ${pool.seatLimit} seats are assigned`);
            return;
        }

        try {
            const assignment = await OrganizationService.getInstance().assignLicense(
                orgId,
                auth.user.id,
                licensePoolId,
                userId,
            );
            const [licenseRow] = await OrganizationLicensePoolService.getInstance().toLicenseAssignmentApiRows([assignment]);
            sendApiResult(request, response, licenseRow || assignment.toObject());
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            const message = ex instanceof Error ? ex.message : "Internal server error";
            if (message === "NO_SEATS_AVAILABLE") {
                const seatsMsg = isUnlimitedPoolSeatLimit(pool.seatLimit)
                    ? "No seats available"
                    : `All ${pool.seatLimit} seats are assigned`;
                sendApiError(request, response, BAD_REQUEST, "NO_SEATS_AVAILABLE", seatsMsg);
                return;
            }
            if (message === "LICENSE_POOL_NOT_FOUND") {
                sendApiError(request, response, BAD_REQUEST, "LICENSE_POOL_NOT_FOUND", message);
                return;
            }
            if (message === "LICENSE_POOL_NOT_ACTIVE") {
                sendApiError(request, response, BAD_REQUEST, "LICENSE_POOL_NOT_ACTIVE", message);
                return;
            }
            if (message === "LICENSE_ALREADY_ASSIGNED") {
                sendApiError(request, response, BAD_REQUEST, "LICENSE_ALREADY_ASSIGNED", message);
                return;
            }
            if (message === "MEMBER_NOT_ACTIVE") {
                sendApiError(request, response, BAD_REQUEST, "MEMBER_NOT_ACTIVE", message);
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", message);
        }
    }

    /**
     * Revokes (deactivates) a license assignment.
     * Binding: RevokeOrganizationLicense
     * @route DELETE /organizations/{orgId}/licenses/{licenseId}
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} licenseId.path.required - License assignment ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND, LICENSE_ASSIGNMENT_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async revokeLicense(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const licenseId = (request.params.licenseId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }
        const assignment = await OrganizationLicenseAssignment.findById(licenseId);
        if (!assignment || assignment.organizationId !== orgId) {
            sendApiError(request, response, NOT_FOUND, "LICENSE_ASSIGNMENT_NOT_FOUND", "License assignment not found");
            return;
        }
        try {
            await OrganizationService.getInstance().revokeLicense(orgId, auth.user.id, licenseId);
            sendApiSuccess(request, response);
        } catch (ex) {
            if (sendApiErrorOnMessage(request, response, ex, BLOCKCHAIN_REGISTRATION_FAILED, INTERNAL_SERVER_ERROR, BLOCKCHAIN_REGISTRATION_FAILED, "Blockchain registration failed")) {
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", ex instanceof Error ? ex.message : "Internal server error");
        }
    }

    /**
     * @typedef UpdateSeatsBody
     * @property {number} quantity.required - New seat count (must be >= 1)
     */

    /**
     * @typedef UpdateSeatsResponse
     * @property {number} quantity - Current billable seat count (active licenses)
     * @property {number} pending_quantity - Seats requested but not yet paid (0 if none)
     * @property {number} scheduled_quantity - Seats after the scheduled reduction (0 if none)
     * @property {number} scheduled_quantity_effective_at - Unix ms when the reduction takes effect (0 if none)
     * @property {string} seat_payment_status - active | pending
     */

    /**
     * Gets the current seat status for an organization license pool.
     * Binding: GetOrganizationSeatStatus
     * @route GET /organizations/{orgId}/license-pools/{licensePoolId}/seats
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} licensePoolId.path.required - License pool ID
     * @returns {UpdateSeatsResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: LICENSE_POOL_NOT_FOUND
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async getSeats(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const licensePoolId = (request.params.licensePoolId || "").trim();

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }

        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const pool = await OrganizationLicensePool.findById(licensePoolId);
        if (!pool || pool.organizationId !== orgId) {
            sendApiError(request, response, BAD_REQUEST, "LICENSE_POOL_NOT_FOUND", "LICENSE_POOL_NOT_FOUND");
            return;
        }

        const subscription = pool.sourceSubscriptionId ? await Subscription.findById(pool.sourceSubscriptionId) : null;
        const pendingQuantity = Math.max(0, Number((subscription as any)?.pendingQuantity || (subscription as any)?.pending_quantity || 0) || 0);
        const quantity = subscription
            ? subscription.getCurrentSeatLimit()
            : isUnlimitedPoolSeatLimit(pool.seatLimit)
                ? 0
                : Math.max(0, pool.seatLimit);

        sendApiResult(request, response, {
            quantity,
            pending_quantity: pendingQuantity,
            scheduled_quantity: subscription?.scheduledQuantity || 0,
            scheduled_quantity_effective_at: subscription?.scheduledQuantityEffectiveAt || 0,
            seat_payment_status: pendingQuantity > quantity ? "pending" : "active",
        });
    }

    /**
     * Updates the number of seats for an organization subscription.
     * Seat increases are invoiced immediately in Stripe (`always_invoice`); local quantity and
     * license pools update only after `invoice.paid`. Reductions take effect at the
     * current billing period end: current seats and assignments stay until then; Stripe
     * is updated via a subscription schedule and excess licenses are revoked on renewal.
     * Binding: UpdateOrganizationSeats
     * @route POST /organizations/{orgId}/subscriptions/{subscriptionId}/seats
     * @group organizations
     * @param {string} orgId.path.required - Organization ID
     * @param {string} subscriptionId.path.required - Subscription ID
     * @param {UpdateSeatsBody.model} request.body - Request body
     * @returns {UpdateSeatsResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_QUANTITY, SUBSCRIPTION_NOT_FOUND, NO_STRIPE_SUBSCRIPTION, QUANTITY_NOT_EDITABLE, SCHEDULED_PLAN_CHANGE_PENDING, PENDING_SEAT_INCREASE_PAYMENT, SEAT_INCREASE_PAYMENT_FAILED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: ORGANIZATION_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async updateSeats(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const orgId = (request.params.orgId || "").trim();
        const subscriptionId = (request.params.subscriptionId || "").trim();
        const newQuantity = parseInt((request.body.quantity || "0") + "", 10);

        if (!newQuantity || newQuantity < 1) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_QUANTITY", "quantity must be >= 1");
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            sendApiError(request, response, NOT_FOUND, "ORGANIZATION_NOT_FOUND", "Organization not found");
            return;
        }
        if (!await OrganizationService.getInstance().isOrganizationAdmin(auth.user.id, orgId)) {
            sendApiError(request, response, FORBIDDEN, "", "Access denied");
            return;
        }

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription || subscription.organizationId !== orgId) {
            sendApiError(request, response, BAD_REQUEST, "SUBSCRIPTION_NOT_FOUND", "SUBSCRIPTION_NOT_FOUND");
            return;
        }
        if (!subscription.stripeSubscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "NO_STRIPE_SUBSCRIPTION", "Subscription has no Stripe reference");
            return;
        }

        const billingService = SubscriptionBillingService.getInstance();
        const canEditQuantity = await billingService.isQuantityEditable(subscription.subscribableType, subscription.subscribableId);
        if (!canEditQuantity) {
            sendApiError(request, response, BAD_REQUEST, "QUANTITY_NOT_EDITABLE", "This subscription type does not support seat changes");
            return;
        }

        if (subscription.succeedingSubscriptionId) {
            sendApiError(request, response, BAD_REQUEST, "SCHEDULED_PLAN_CHANGE_PENDING",
                "Cannot change seats while a plan change is scheduled for this subscription");
            return;
        }

        try {
            const billingService = SubscriptionBillingService.getInstance();
            const previousQuantity = subscription.getCurrentSeatLimit();

            if (newQuantity > previousQuantity) {
                if (subscription.hasScheduledQuantityDecrease()) {
                    await billingService.cancelScheduledQuantityDecrease(subscription);
                }

                if (subscription.hasPendingSeatIncrease()) {
                    const pendingQty = subscription.pendingQuantity || 0;
                    if (newQuantity !== pendingQty) {
                        sendApiError(request, response, BAD_REQUEST, "PENDING_SEAT_INCREASE_PAYMENT",
                            "Cannot request another seat increase while a seat increase payment is pending");
                        return;
                    }
                    sendApiResult(request, response, {
                        quantity: subscription.getCurrentSeatLimit(),
                        pending_quantity: pendingQty,
                        scheduled_quantity: 0,
                        scheduled_quantity_effective_at: 0,
                    });
                    return;
                }

                await billingService.requestSeatIncrease(subscription, newQuantity);
                const updated = await Subscription.findById(subscriptionId);

                sendApiResult(request, response, {
                    quantity: updated?.getCurrentSeatLimit() ?? previousQuantity,
                    pending_quantity: updated?.pendingQuantity ?? newQuantity,
                    scheduled_quantity: 0,
                    scheduled_quantity_effective_at: 0,
                    seat_payment_status: "active",
                });
                return;
            }

            if (newQuantity === previousQuantity) {
                if (subscription.hasScheduledQuantityDecrease()) {
                    await billingService.cancelScheduledQuantityDecrease(subscription);
                }
                sendApiResult(request, response, {
                    quantity: subscription.getCurrentSeatLimit(),
                    pending_quantity: subscription.pendingQuantity || 0,
                    scheduled_quantity: 0,
                    scheduled_quantity_effective_at: 0,
                    seat_payment_status: "active",
                });
                return;
            }

            if (subscription.hasPendingSeatIncrease()) {
                sendApiError(request, response, BAD_REQUEST, "PENDING_SEAT_INCREASE_PAYMENT",
                    "Cannot reduce seats while a seat increase payment is pending");
                return;
            }

            const { effectiveAt } = await billingService.scheduleQuantityDecreaseAtPeriodEnd(subscription, newQuantity);
            const updated = await Subscription.findById(subscriptionId);

            sendApiResult(request, response, {
                quantity: updated?.quantity ?? previousQuantity,
                pending_quantity: updated?.pendingQuantity ?? 0,
                scheduled_quantity: updated?.scheduledQuantity ?? newQuantity,
                scheduled_quantity_effective_at: updated?.scheduledQuantityEffectiveAt ?? effectiveAt,
                seat_payment_status: "active",
            });
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "Internal server error";
            if (message === "SCHEDULED_PLAN_CHANGE_PENDING") {
                sendApiError(request, response, BAD_REQUEST, "SCHEDULED_PLAN_CHANGE_PENDING", message);
                return;
            }
            if (message === "PENDING_SEAT_INCREASE_PAYMENT") {
                sendApiError(request, response, BAD_REQUEST, "PENDING_SEAT_INCREASE_PAYMENT",
                    "Cannot request another seat increase while a seat increase payment is pending");
                return;
            }
            if (message === "SEAT_INCREASE_PAYMENT_FAILED") {
                sendApiError(request, response, BAD_REQUEST, "SEAT_INCREASE_PAYMENT_FAILED",
                    "The payment for the seat increase was declined");
                return;
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", message);
        }
    }

}
