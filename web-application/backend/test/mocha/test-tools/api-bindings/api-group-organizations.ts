// API bindings: organizations (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonAuthenticatedErrorHandler } from "@asanrom/request-axios";
import { getApiUrl, generateURIQuery } from "./utils";
import { OrgListResponse, OrgItem, OrgRequestCreateBody, OrgRequestListResponse, OrgRequestItem, OrgDeletionRequestItem, OrgDeletionRequestCreateBody, OrgDeletionRequestListResponse, OrgDeletionRequestRejectBody, OrgUpdateBody, MembersListResponse, AcceptInvitationBody, InviteMemberBody, ChangeMemberRoleBody, OrgSubscriptionsListResponse, OrgPaymentsListResponse, OrgLicensesListResponse, LicenseAssignmentItem, AssignLicenseBody, OrgLicensePoolsListResponse, BackfillLicensePoolsResponse, UpdateSeatsResponse, UpdateSeatsBody } from "./definitions";

export class ApiOrganizations {
    /**
     * Method: GET
     * Path: /organizations
     * Lists all organizations (paginated). Platform admin only.
     * Requires permission: admin.users.manage
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizations(queryParams: ListOrganizationsQueryParameters): RequestParams<OrgListResponse, ListOrganizationsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/my
     * Returns the organization the current user belongs to (as admin or member).
     * Returns 404 if the user is not part of any organization.
     * @returns The request parameters
     */
    public static GetMyOrganization(): RequestParams<OrgItem, GetMyOrganizationErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/my`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/requests
     * Creates an organization request for platform admin approval.
     * @param body Body parameters
     * @returns The request parameters
     */
    public static CreateOrganizationRequest(body: OrgRequestCreateBody): RequestParams<void, CreateOrganizationRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/requests`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "PENDING_REQUEST_ALREADY_EXISTS", handler.badRequestPendingRequestAlreadyExists)
                    .add(400, "CIF_NIF_ALREADY_EXISTS", handler.badRequestCifNifAlreadyExists)
                    .add(400, "ADMIN_ALREADY_HAS_ORGANIZATION", handler.badRequestAdminAlreadyHasOrganization)
                    .add(400, "INVALID_FISCAL_ADDRESS", handler.badRequestInvalidFiscalAddress)
                    .add(400, "INVALID_COUNTRY", handler.badRequestInvalidCountry)
                    .add(400, "INVALID_CIF_NIF", handler.badRequestInvalidCifNif)
                    .add(400, "INVALID_COMPANY_NAME", handler.badRequestInvalidCompanyName)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/requests
     * Lists organization requests. Platform admin only.
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationRequests(queryParams: ListOrganizationRequestsQueryParameters): RequestParams<OrgRequestListResponse, ListOrganizationRequestsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/requests` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/request
     * Returns the authenticated user's latest organization request.
     * @returns The request parameters
     */
    public static GetMyOrganizationRequest(): RequestParams<OrgRequestItem, GetMyOrganizationRequestErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/request`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_REQUEST_NOT_FOUND", handler.notFoundOrganizationRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /organizations/request
     * Cancels (deletes) the authenticated user's pending organization request.
     * @returns The request parameters
     */
    public static CancelMyOrganizationRequest(): RequestParams<void, CancelMyOrganizationRequestErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/organizations/request`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_REQUEST_NOT_FOUND", handler.notFoundOrganizationRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "REQUEST_NOT_PENDING", handler.badRequestRequestNotPending)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/requests/{requestId}/approve
     * Approves an organization request. Platform admin only.
     * @param requestId Organization request ID
     * @returns The request parameters
     */
    public static ApproveOrganizationRequest(requestId: string): RequestParams<void, ApproveOrganizationRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/requests/${encodeURIComponent(requestId)}/approve`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "BLOCKCHAIN_REGISTRATION_FAILED", handler.serverErrorBlockchainRegistrationFailed)
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "CIF_NIF_ALREADY_EXISTS", handler.badRequestCifNifAlreadyExists)
                    .add(400, "ADMIN_ALREADY_HAS_ORGANIZATION", handler.badRequestAdminAlreadyHasOrganization)
                    .add(400, "APPLICANT_USER_NOT_FOUND", handler.badRequestApplicantUserNotFound)
                    .add(400, "REQUEST_NOT_PENDING", handler.badRequestRequestNotPending)
                    .add(400, "REQUEST_NOT_FOUND", handler.badRequestRequestNotFound)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/requests/{requestId}/reject
     * Rejects an organization request. Platform admin only.
     * @param requestId Organization request ID
     * @returns The request parameters
     */
    public static RejectOrganizationRequest(requestId: string): RequestParams<void, RejectOrganizationRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/requests/${encodeURIComponent(requestId)}/reject`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "REQUEST_NOT_FOUND", handler.notFoundRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "REQUEST_NOT_PENDING", handler.badRequestRequestNotPending)
                    .add(400, "REQUEST_NOT_FOUND", handler.badRequestRequestNotFound)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/deletion-request
     * Submits an organization deletion request. Organization admin only.
     * @param orgId Organization ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static SubmitOrganizationDeletionRequest(orgId: string, body: OrgDeletionRequestCreateBody): RequestParams<OrgDeletionRequestItem, SubmitOrganizationDeletionRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/deletion-request`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "NOT_ORGANIZATION_ADMIN", handler.badRequestNotOrganizationAdmin)
                    .add(400, "ORGANIZATION_NOT_ACTIVE", handler.badRequestOrganizationNotActive)
                    .add(400, "PENDING_DELETION_REQUEST_EXISTS", handler.badRequestPendingDeletionRequestExists)
                    .add(400, "INVALID_SUBSCRIPTION_PREFERENCE", handler.badRequestInvalidSubscriptionPreference)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/deletion-request
     * Returns the organization's pending or latest deletion request. Organization admin only.
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static GetOrganizationDeletionRequest(orgId: string): RequestParams<OrgDeletionRequestItem, GetOrganizationDeletionRequestErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/deletion-request`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "DELETION_REQUEST_NOT_FOUND", handler.notFoundDeletionRequestNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /organizations/{orgId}/deletion-request
     * Cancels the pending organization deletion request. Organization admin only.
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static CancelOrganizationDeletionRequest(orgId: string): RequestParams<void, CancelOrganizationDeletionRequestErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/deletion-request`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "DELETION_REQUEST_NOT_FOUND", handler.notFoundDeletionRequestNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "NOT_ORGANIZATION_ADMIN", handler.forbiddenNotOrganizationAdmin)
                    .add(403, "*", handler.forbidden)
                    .add(400, "DELETION_REQUEST_NOT_PENDING", handler.badRequestDeletionRequestNotPending)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/deletion-requests
     * Lists organization deletion requests. Platform admin only.
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationDeletionRequests(queryParams: ListOrganizationDeletionRequestsQueryParameters): RequestParams<OrgDeletionRequestListResponse, ListOrganizationDeletionRequestsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/deletion-requests` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_STATUS", handler.badRequestInvalidStatus)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/deletion-requests/{requestId}/approve
     * Approves an organization deletion request. Platform admin only.
     * @param requestId Deletion request ID
     * @returns The request parameters
     */
    public static ApproveOrganizationDeletionRequest(requestId: string): RequestParams<void, ApproveOrganizationDeletionRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/deletion-requests/${encodeURIComponent(requestId)}/approve`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "STRIPE_NOT_CONFIGURED", handler.serverErrorStripeNotConfigured)
                    .add(500, "REFUND_FAILED", handler.serverErrorRefundFailed)
                    .add(500, "BLOCKCHAIN_REGISTRATION_FAILED", handler.serverErrorBlockchainRegistrationFailed)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "DELETION_REQUEST_NOT_FOUND", handler.notFoundDeletionRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "ORGANIZATION_NOT_ACTIVE", handler.badRequestOrganizationNotActive)
                    .add(400, "DELETION_REQUEST_NOT_PENDING", handler.badRequestDeletionRequestNotPending)
                    .add(400, "INVALID_SUBSCRIPTION_PREFERENCE", handler.badRequestInvalidSubscriptionPreference)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/deletion-requests/{requestId}/reject
     * Rejects an organization deletion request. Platform admin only.
     * @param requestId Deletion request ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RejectOrganizationDeletionRequest(requestId: string, body: OrgDeletionRequestRejectBody): RequestParams<void, RejectOrganizationDeletionRequestErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/deletion-requests/${encodeURIComponent(requestId)}/reject`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "DELETION_REQUEST_NOT_FOUND", handler.notFoundDeletionRequestNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "DELETION_REQUEST_NOT_PENDING", handler.badRequestDeletionRequestNotPending)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}
     * Returns the details of an organization. Only the org admin may call this.
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static GetOrganization(orgId: string): RequestParams<OrgItem, GetOrganizationErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: PUT
     * Path: /organizations/{orgId}
     * Updates organization details. Only the org admin may call this.
     * @param orgId Organization ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateOrganization(orgId: string, body: OrgUpdateBody): RequestParams<void, UpdateOrganizationErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "INVALID_COUNTRY", handler.badRequestInvalidCountry)
                    .add(400, "INVALID_FISCAL_ADDRESS", handler.badRequestInvalidFiscalAddress)
                    .add(400, "INVALID_EMAIL", handler.badRequestInvalidEmail)
                    .add(400, "INVALID_COMPANY_NAME", handler.badRequestInvalidCompanyName)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /organizations/{orgId}
     * Deletes an organization. Only platform admins may call this.
     * @param orgId Organization ID
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static DeleteOrganization(orgId: string, queryParams: DeleteOrganizationQueryParameters): RequestParams<void, DeleteOrganizationErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(500, "STRIPE_NOT_CONFIGURED", handler.serverErrorStripeNotConfigured)
                    .add(500, "REFUND_FAILED", handler.serverErrorRefundFailed)
                    .add(500, "BLOCKCHAIN_REGISTRATION_FAILED", handler.serverErrorBlockchainRegistrationFailed)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "PENDING_DELETION_REQUEST_EXISTS", handler.badRequestPendingDeletionRequestExists)
                    .add(400, "ORGANIZATION_NOT_ACTIVE", handler.badRequestOrganizationNotActive)
                    .add(400, "INVALID_SUBSCRIPTION_PREFERENCE", handler.badRequestInvalidSubscriptionPreference)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/members
     * Lists organization members (non-invited). Org admin or platform admin (admin.users.manage) may call this. Inactive members are included for admins.
     * @param orgId Organization ID
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationMembers(orgId: string, queryParams: ListOrganizationMembersQueryParameters): RequestParams<MembersListResponse, ListOrganizationMembersErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/members/invited
     * Lists invited users of an organization. Only the org admin may call this.
     * @param orgId Organization ID
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationInvitedMembers(orgId: string, queryParams: ListOrganizationInvitedMembersQueryParameters): RequestParams<MembersListResponse, ListOrganizationInvitedMembersErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/invited` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/memberships/{membershipId}/accept
     * Accepts the caller's pending organization invitation.
     * @param membershipId Membership ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AcceptOrganizationInvitation(membershipId: string, body: AcceptInvitationBody): RequestParams<void, AcceptOrganizationInvitationErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/memberships/${encodeURIComponent(membershipId)}/accept`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "USER_HAS_ACTIVE_SUBSCRIPTIONS", handler.badRequestUserHasActiveSubscriptions)
                    .add(400, "USER_ALREADY_IN_ORGANIZATION", handler.badRequestUserAlreadyInOrganization)
                    .add(400, "MEMBERSHIP_NOT_INVITED", handler.badRequestMembershipNotInvited)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/memberships/{membershipId}/reject
     * Rejects the caller's pending organization invitation and removes membership.
     * @param membershipId Membership ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static RejectOrganizationInvitation(membershipId: string, body: AcceptInvitationBody): RequestParams<void, RejectOrganizationInvitationErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/memberships/${encodeURIComponent(membershipId)}/reject`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "MEMBERSHIP_NOT_INVITED", handler.badRequestMembershipNotInvited)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/members/invite
     * Invites an existing user by email to the organization.
     * @param orgId Organization ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static InviteOrganizationMember(orgId: string, body: InviteMemberBody): RequestParams<void, InviteOrganizationMemberErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/invite`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "USER_HAS_ACTIVE_SUBSCRIPTIONS", handler.badRequestUserHasActiveSubscriptions)
                    .add(400, "USER_ALREADY_IN_ORGANIZATION", handler.badRequestUserAlreadyInOrganization)
                    .add(400, "MEMBER_ALREADY_EXISTS", handler.badRequestMemberAlreadyExists)
                    .add(400, "USER_NOT_FOUND", handler.badRequestUserNotFound)
                    .add(400, "INVALID_ROLE", handler.badRequestInvalidRole)
                    .add(400, "INVALID_EMAIL", handler.badRequestInvalidEmail)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/members/{membershipId}/activate
     * Activates a member (sets status to Active).
     * @param orgId Organization ID
     * @param membershipId Membership ID
     * @returns The request parameters
     */
    public static ActivateOrganizationMember(orgId: string, membershipId: string): RequestParams<void, ActivateOrganizationMemberErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}/activate`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/members/{membershipId}/deactivate
     * Deactivates a member (sets status to Inactive).
     * @param orgId Organization ID
     * @param membershipId Membership ID
     * @returns The request parameters
     */
    public static DeactivateOrganizationMember(orgId: string, membershipId: string): RequestParams<void, DeactivateOrganizationMemberErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}/deactivate`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "CANNOT_DEACTIVATE_ORG_CREATOR", handler.badRequestCannotDeactivateOrgCreator)
                    .add(400, "CANNOT_DEACTIVATE_SELF", handler.badRequestCannotDeactivateSelf)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: PUT
     * Path: /organizations/{orgId}/members/{membershipId}/role
     * Changes a member's role in the organization.
     * @param orgId Organization ID
     * @param membershipId Membership ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static ChangeOrganizationMemberRole(orgId: string, membershipId: string, body: ChangeMemberRoleBody): RequestParams<void, ChangeOrganizationMemberRoleErrorHandler> {
        return {
            method: "PUT",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}/role`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "CANNOT_CHANGE_ORG_CREATOR_ROLE", handler.badRequestCannotChangeOrgCreatorRole)
                    .add(400, "INVALID_ROLE", handler.badRequestInvalidRole)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /organizations/{orgId}/members/{membershipId}
     * Removes a member from the organization.
     * @param orgId Organization ID
     * @param membershipId Membership ID
     * @returns The request parameters
     */
    public static RemoveOrganizationMember(orgId: string, membershipId: string): RequestParams<void, RemoveOrganizationMemberErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "CANNOT_REMOVE_ORG_CREATOR", handler.badRequestCannotRemoveOrgCreator)
                    .add(400, "CANNOT_REMOVE_SELF", handler.badRequestCannotRemoveSelf)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/leave
     * Allows the authenticated user to voluntarily leave their organization.
     * Deactivates all license assignments and removes the membership.
     * Blocked for the organization creator.
     * @returns The request parameters
     */
    public static LeaveOrganization(): RequestParams<void, LeaveOrganizationErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/leave`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "MEMBERSHIP_NOT_FOUND", handler.notFoundMembershipNotFound)
                    .add(404, "*", handler.notFound)
                    .add(400, "CANNOT_LEAVE_AS_CREATOR", handler.badRequestCannotLeaveAsCreator)
                    .add(400, "NOT_A_MEMBER", handler.badRequestNotAMember)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/subscriptions
     * Lists all subscriptions owned by the org.
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static ListOrganizationSubscriptions(orgId: string): RequestParams<OrgSubscriptionsListResponse, ListOrganizationSubscriptionsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/subscriptions`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/payments
     * Lists billing history for the organization.
     * @param orgId Organization ID
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationPayments(orgId: string, queryParams: ListOrganizationPaymentsQueryParameters): RequestParams<OrgPaymentsListResponse, ListOrganizationPaymentsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/payments` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/licenses
     * Lists active license assignments for an organization.
     * @param orgId Organization ID
     * @param queryParams Query parameters
     * @returns The request parameters
     */
    public static ListOrganizationLicenses(orgId: string, queryParams: ListOrganizationLicensesQueryParameters): RequestParams<OrgLicensesListResponse, ListOrganizationLicensesErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/licenses` + generateURIQuery(queryParams)),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/licenses
     * Assigns a license pool seat to a member.
     * @param orgId Organization ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static AssignOrganizationLicense(orgId: string, body: AssignLicenseBody): RequestParams<LicenseAssignmentItem, AssignOrganizationLicenseErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/licenses`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "NO_SEATS_AVAILABLE", handler.badRequestNoSeatsAvailable)
                    .add(400, "LICENSE_ALREADY_ASSIGNED", handler.badRequestLicenseAlreadyAssigned)
                    .add(400, "MEMBER_NOT_ACTIVE", handler.badRequestMemberNotActive)
                    .add(400, "LICENSE_POOL_NOT_ACTIVE", handler.badRequestLicensePoolNotActive)
                    .add(400, "LICENSE_POOL_NOT_FOUND", handler.badRequestLicensePoolNotFound)
                    .add(400, "INVALID_USER_ID", handler.badRequestInvalidUserId)
                    .add(400, "INVALID_LICENSE_POOL_ID", handler.badRequestInvalidLicensePoolId)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/license-pools
     * Lists active license pools for an organization (one pool per catalog product).
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static ListOrganizationLicensePools(orgId: string): RequestParams<OrgLicensePoolsListResponse, ListOrganizationLicensePoolsErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/license-pools`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/license-pools/backfill
     * Backfills license pools and links legacy item-level assignments. Requires platform admin.
     * @param orgId Organization ID
     * @returns The request parameters
     */
    public static BackfillOrganizationLicensePools(orgId: string): RequestParams<BackfillLicensePoolsResponse, BackfillOrganizationLicensePoolsErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/license-pools/backfill`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /organizations/{orgId}/licenses/{licenseId}
     * Revokes (deactivates) a license assignment.
     * @param orgId Organization ID
     * @param licenseId License assignment ID
     * @returns The request parameters
     */
    public static RevokeOrganizationLicense(orgId: string, licenseId: string): RequestParams<void, RevokeOrganizationLicenseErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/licenses/${encodeURIComponent(licenseId)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "LICENSE_ASSIGNMENT_NOT_FOUND", handler.notFoundLicenseAssignmentNotFound)
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: GET
     * Path: /organizations/{orgId}/license-pools/{licensePoolId}/seats
     * Gets the current seat status for an organization license pool.
     * @param orgId Organization ID
     * @param licensePoolId License pool ID
     * @returns The request parameters
     */
    public static GetOrganizationSeatStatus(orgId: string, licensePoolId: string): RequestParams<UpdateSeatsResponse, GetOrganizationSeatStatusErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/license-pools/${encodeURIComponent(licensePoolId)}/seats`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "LICENSE_POOL_NOT_FOUND", handler.badRequestLicensePoolNotFound)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /organizations/{orgId}/subscriptions/{subscriptionId}/seats
     * Updates the number of seats for an organization subscription.
     * Seat increases are invoiced immediately in Stripe (`always_invoice`); local quantity and
     * license pools update only after `invoice.paid`. Reductions take effect at the
     * current billing period end: current seats and assignments stay until then; Stripe
     * is updated via a subscription schedule and excess licenses are revoked on renewal.
     * @param orgId Organization ID
     * @param subscriptionId Subscription ID
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateOrganizationSeats(orgId: string, subscriptionId: string, body: UpdateSeatsBody): RequestParams<UpdateSeatsResponse, UpdateOrganizationSeatsErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/organizations/${encodeURIComponent(orgId)}/subscriptions/${encodeURIComponent(subscriptionId)}/seats`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "ORGANIZATION_NOT_FOUND", handler.notFoundOrganizationNotFound)
                    .add(404, "*", handler.notFound)
                    .add(403, "*", handler.forbidden)
                    .add(400, "SEAT_INCREASE_PAYMENT_FAILED", handler.badRequestSeatIncreasePaymentFailed)
                    .add(400, "PENDING_SEAT_INCREASE_PAYMENT", handler.badRequestPendingSeatIncreasePayment)
                    .add(400, "SCHEDULED_PLAN_CHANGE_PENDING", handler.badRequestScheduledPlanChangePending)
                    .add(400, "QUANTITY_NOT_EDITABLE", handler.badRequestQuantityNotEditable)
                    .add(400, "NO_STRIPE_SUBSCRIPTION", handler.badRequestNoStripeSubscription)
                    .add(400, "SUBSCRIPTION_NOT_FOUND", handler.badRequestSubscriptionNotFound)
                    .add(400, "INVALID_QUANTITY", handler.badRequestInvalidQuantity)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for ListOrganizations
 */
export type ListOrganizationsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for ListOrganizations
 */
export interface ListOrganizationsQueryParameters {
    /**
     * Search by id, company name or CIF/NIF prefix
     */
    q?: string;

    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for GetMyOrganization
 */
export type GetMyOrganizationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for CreateOrganizationRequest
 */
export type CreateOrganizationRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPANY_NAME
     */
    badRequestInvalidCompanyName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_CIF_NIF
     */
    badRequestInvalidCifNif: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COUNTRY
     */
    badRequestInvalidCountry: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FISCAL_ADDRESS
     */
    badRequestInvalidFiscalAddress: () => void;

    /**
     * Handler for status = 400 and code = ADMIN_ALREADY_HAS_ORGANIZATION
     */
    badRequestAdminAlreadyHasOrganization: () => void;

    /**
     * Handler for status = 400 and code = CIF_NIF_ALREADY_EXISTS
     */
    badRequestCifNifAlreadyExists: () => void;

    /**
     * Handler for status = 400 and code = PENDING_REQUEST_ALREADY_EXISTS
     */
    badRequestPendingRequestAlreadyExists: () => void;
};

/**
 * Error handler for ListOrganizationRequests
 */
export type ListOrganizationRequestsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for ListOrganizationRequests
 */
export interface ListOrganizationRequestsQueryParameters {
    /**
     * Search by company, CIF/NIF or applicant email
     */
    q?: string;

    /**
     * Filter by status
     */
    status?: string;

    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for GetMyOrganizationRequest
 */
export type GetMyOrganizationRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_REQUEST_NOT_FOUND
     */
    notFoundOrganizationRequestNotFound: () => void;
};

/**
 * Error handler for CancelMyOrganizationRequest
 */
export type CancelMyOrganizationRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = REQUEST_NOT_PENDING
     */
    badRequestRequestNotPending: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_REQUEST_NOT_FOUND
     */
    notFoundOrganizationRequestNotFound: () => void;
};

/**
 * Error handler for ApproveOrganizationRequest
 */
export type ApproveOrganizationRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = REQUEST_NOT_FOUND
     */
    badRequestRequestNotFound: () => void;

    /**
     * Handler for status = 400 and code = REQUEST_NOT_PENDING
     */
    badRequestRequestNotPending: () => void;

    /**
     * Handler for status = 400 and code = APPLICANT_USER_NOT_FOUND
     */
    badRequestApplicantUserNotFound: () => void;

    /**
     * Handler for status = 400 and code = ADMIN_ALREADY_HAS_ORGANIZATION
     */
    badRequestAdminAlreadyHasOrganization: () => void;

    /**
     * Handler for status = 400 and code = CIF_NIF_ALREADY_EXISTS
     */
    badRequestCifNifAlreadyExists: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;

    /**
     * Handler for status = 500 and code = BLOCKCHAIN_REGISTRATION_FAILED
     */
    serverErrorBlockchainRegistrationFailed: () => void;
};

/**
 * Error handler for RejectOrganizationRequest
 */
export type RejectOrganizationRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = REQUEST_NOT_FOUND
     */
    badRequestRequestNotFound: () => void;

    /**
     * Handler for status = 400 and code = REQUEST_NOT_PENDING
     */
    badRequestRequestNotPending: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = REQUEST_NOT_FOUND
     */
    notFoundRequestNotFound: () => void;
};

/**
 * Error handler for SubmitOrganizationDeletionRequest
 */
export type SubmitOrganizationDeletionRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIPTION_PREFERENCE
     */
    badRequestInvalidSubscriptionPreference: () => void;

    /**
     * Handler for status = 400 and code = PENDING_DELETION_REQUEST_EXISTS
     */
    badRequestPendingDeletionRequestExists: () => void;

    /**
     * Handler for status = 400 and code = ORGANIZATION_NOT_ACTIVE
     */
    badRequestOrganizationNotActive: () => void;

    /**
     * Handler for status = 400 and code = NOT_ORGANIZATION_ADMIN
     */
    badRequestNotOrganizationAdmin: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for GetOrganizationDeletionRequest
 */
export type GetOrganizationDeletionRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = DELETION_REQUEST_NOT_FOUND
     */
    notFoundDeletionRequestNotFound: () => void;
};

/**
 * Error handler for CancelOrganizationDeletionRequest
 */
export type CancelOrganizationDeletionRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = DELETION_REQUEST_NOT_PENDING
     */
    badRequestDeletionRequestNotPending: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * Handler for status = 403 and code = NOT_ORGANIZATION_ADMIN
     */
    forbiddenNotOrganizationAdmin: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = DELETION_REQUEST_NOT_FOUND
     */
    notFoundDeletionRequestNotFound: () => void;
};

/**
 * Error handler for ListOrganizationDeletionRequests
 */
export type ListOrganizationDeletionRequestsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_STATUS
     */
    badRequestInvalidStatus: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;
};

/**
 * Query parameters for ListOrganizationDeletionRequests
 */
export interface ListOrganizationDeletionRequestsQueryParameters {
    /**
     * Search by request ID, organization ID or requester user ID
     */
    q?: string;

    /**
     * Filter by status
     */
    status?: string;

    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for ApproveOrganizationDeletionRequest
 */
export type ApproveOrganizationDeletionRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIPTION_PREFERENCE
     */
    badRequestInvalidSubscriptionPreference: () => void;

    /**
     * Handler for status = 400 and code = DELETION_REQUEST_NOT_PENDING
     */
    badRequestDeletionRequestNotPending: () => void;

    /**
     * Handler for status = 400 and code = ORGANIZATION_NOT_ACTIVE
     */
    badRequestOrganizationNotActive: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = DELETION_REQUEST_NOT_FOUND
     */
    notFoundDeletionRequestNotFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 500 and code = BLOCKCHAIN_REGISTRATION_FAILED
     */
    serverErrorBlockchainRegistrationFailed: () => void;

    /**
     * Handler for status = 500 and code = REFUND_FAILED
     */
    serverErrorRefundFailed: () => void;

    /**
     * Handler for status = 500 and code = STRIPE_NOT_CONFIGURED
     */
    serverErrorStripeNotConfigured: () => void;
};

/**
 * Error handler for RejectOrganizationDeletionRequest
 */
export type RejectOrganizationDeletionRequestErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = DELETION_REQUEST_NOT_PENDING
     */
    badRequestDeletionRequestNotPending: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = DELETION_REQUEST_NOT_FOUND
     */
    notFoundDeletionRequestNotFound: () => void;
};

/**
 * Error handler for GetOrganization
 */
export type GetOrganizationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for UpdateOrganization
 */
export type UpdateOrganizationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COMPANY_NAME
     */
    badRequestInvalidCompanyName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EMAIL
     */
    badRequestInvalidEmail: () => void;

    /**
     * Handler for status = 400 and code = INVALID_FISCAL_ADDRESS
     */
    badRequestInvalidFiscalAddress: () => void;

    /**
     * Handler for status = 400 and code = INVALID_COUNTRY
     */
    badRequestInvalidCountry: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for DeleteOrganization
 */
export type DeleteOrganizationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_SUBSCRIPTION_PREFERENCE
     */
    badRequestInvalidSubscriptionPreference: () => void;

    /**
     * Handler for status = 400 and code = ORGANIZATION_NOT_ACTIVE
     */
    badRequestOrganizationNotActive: () => void;

    /**
     * Handler for status = 400 and code = PENDING_DELETION_REQUEST_EXISTS
     */
    badRequestPendingDeletionRequestExists: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 500 and code = BLOCKCHAIN_REGISTRATION_FAILED
     */
    serverErrorBlockchainRegistrationFailed: () => void;

    /**
     * Handler for status = 500 and code = REFUND_FAILED
     */
    serverErrorRefundFailed: () => void;

    /**
     * Handler for status = 500 and code = STRIPE_NOT_CONFIGURED
     */
    serverErrorStripeNotConfigured: () => void;
};

/**
 * Query parameters for DeleteOrganization
 */
export interface DeleteOrganizationQueryParameters {
    /**
     * ImmediateProratedRefund or AtPeriodEnd
     */
    subscriptionHandling: string;
}

/**
 * Error handler for ListOrganizationMembers
 */
export type ListOrganizationMembersErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Query parameters for ListOrganizationMembers
 */
export interface ListOrganizationMembersQueryParameters {
    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for ListOrganizationInvitedMembers
 */
export type ListOrganizationInvitedMembersErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Query parameters for ListOrganizationInvitedMembers
 */
export interface ListOrganizationInvitedMembersQueryParameters {
    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for AcceptOrganizationInvitation
 */
export type AcceptOrganizationInvitationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = MEMBERSHIP_NOT_INVITED
     */
    badRequestMembershipNotInvited: () => void;

    /**
     * Handler for status = 400 and code = USER_ALREADY_IN_ORGANIZATION
     */
    badRequestUserAlreadyInOrganization: () => void;

    /**
     * Handler for status = 400 and code = USER_HAS_ACTIVE_SUBSCRIPTIONS
     */
    badRequestUserHasActiveSubscriptions: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for RejectOrganizationInvitation
 */
export type RejectOrganizationInvitationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = MEMBERSHIP_NOT_INVITED
     */
    badRequestMembershipNotInvited: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for InviteOrganizationMember
 */
export type InviteOrganizationMemberErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_EMAIL
     */
    badRequestInvalidEmail: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ROLE
     */
    badRequestInvalidRole: () => void;

    /**
     * Handler for status = 400 and code = USER_NOT_FOUND
     */
    badRequestUserNotFound: () => void;

    /**
     * Handler for status = 400 and code = MEMBER_ALREADY_EXISTS
     */
    badRequestMemberAlreadyExists: () => void;

    /**
     * Handler for status = 400 and code = USER_ALREADY_IN_ORGANIZATION
     */
    badRequestUserAlreadyInOrganization: () => void;

    /**
     * Handler for status = 400 and code = USER_HAS_ACTIVE_SUBSCRIPTIONS
     */
    badRequestUserHasActiveSubscriptions: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for ActivateOrganizationMember
 */
export type ActivateOrganizationMemberErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for DeactivateOrganizationMember
 */
export type DeactivateOrganizationMemberErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_DEACTIVATE_SELF
     */
    badRequestCannotDeactivateSelf: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_DEACTIVATE_ORG_CREATOR
     */
    badRequestCannotDeactivateOrgCreator: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for ChangeOrganizationMemberRole
 */
export type ChangeOrganizationMemberRoleErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_ROLE
     */
    badRequestInvalidRole: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_CHANGE_ORG_CREATOR_ROLE
     */
    badRequestCannotChangeOrgCreatorRole: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for RemoveOrganizationMember
 */
export type RemoveOrganizationMemberErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_REMOVE_SELF
     */
    badRequestCannotRemoveSelf: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_REMOVE_ORG_CREATOR
     */
    badRequestCannotRemoveOrgCreator: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;
};

/**
 * Error handler for LeaveOrganization
 */
export type LeaveOrganizationErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = NOT_A_MEMBER
     */
    badRequestNotAMember: () => void;

    /**
     * Handler for status = 400 and code = CANNOT_LEAVE_AS_CREATOR
     */
    badRequestCannotLeaveAsCreator: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = MEMBERSHIP_NOT_FOUND
     */
    notFoundMembershipNotFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for ListOrganizationSubscriptions
 */
export type ListOrganizationSubscriptionsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for ListOrganizationPayments
 */
export type ListOrganizationPaymentsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Query parameters for ListOrganizationPayments
 */
export interface ListOrganizationPaymentsQueryParameters {
    /**
     * Page number
     */
    page?: string;

    /**
     * Page size
     */
    pageSize?: string;

    /**
     * Max results (default: 25, max: 256)
     */
    limit?: string;

    /**
     * Continuation token from previous page
     */
    continuationToken?: string;

    /**
     * Filter by date from (Unix ms timestamp)
     */
    dateFrom?: string;

    /**
     * Filter by date to (Unix ms timestamp)
     */
    dateTo?: string;

    /**
     * Filter by payment type
     */
    paymentType?: string;

    /**
     * Filter by product type (item or plan)
     */
    productType?: string;

    /**
     * Filter by payment status (`paid` matches completed and confirmed)
     */
    status?: string;
}

/**
 * Error handler for ListOrganizationLicenses
 */
export type ListOrganizationLicensesErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Query parameters for ListOrganizationLicenses
 */
export interface ListOrganizationLicensesQueryParameters {
    /**
     * When set, only assignments for this member user ID
     */
    userId?: string;

    /**
     * Page number
     */
    page?: number;

    /**
     * Page size (max 25)
     */
    pageSize?: number;
}

/**
 * Error handler for AssignOrganizationLicense
 */
export type AssignOrganizationLicenseErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_LICENSE_POOL_ID
     */
    badRequestInvalidLicensePoolId: () => void;

    /**
     * Handler for status = 400 and code = INVALID_USER_ID
     */
    badRequestInvalidUserId: () => void;

    /**
     * Handler for status = 400 and code = LICENSE_POOL_NOT_FOUND
     */
    badRequestLicensePoolNotFound: () => void;

    /**
     * Handler for status = 400 and code = LICENSE_POOL_NOT_ACTIVE
     */
    badRequestLicensePoolNotActive: () => void;

    /**
     * Handler for status = 400 and code = MEMBER_NOT_ACTIVE
     */
    badRequestMemberNotActive: () => void;

    /**
     * Handler for status = 400 and code = LICENSE_ALREADY_ASSIGNED
     */
    badRequestLicenseAlreadyAssigned: () => void;

    /**
     * Handler for status = 400 and code = NO_SEATS_AVAILABLE
     */
    badRequestNoSeatsAvailable: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for ListOrganizationLicensePools
 */
export type ListOrganizationLicensePoolsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for BackfillOrganizationLicensePools
 */
export type BackfillOrganizationLicensePoolsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for RevokeOrganizationLicense
 */
export type RevokeOrganizationLicenseErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;

    /**
     * Handler for status = 404 and code = LICENSE_ASSIGNMENT_NOT_FOUND
     */
    notFoundLicenseAssignmentNotFound: () => void;
};

/**
 * Error handler for GetOrganizationSeatStatus
 */
export type GetOrganizationSeatStatusErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = LICENSE_POOL_NOT_FOUND
     */
    badRequestLicensePoolNotFound: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

/**
 * Error handler for UpdateOrganizationSeats
 */
export type UpdateOrganizationSeatsErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_QUANTITY
     */
    badRequestInvalidQuantity: () => void;

    /**
     * Handler for status = 400 and code = SUBSCRIPTION_NOT_FOUND
     */
    badRequestSubscriptionNotFound: () => void;

    /**
     * Handler for status = 400 and code = NO_STRIPE_SUBSCRIPTION
     */
    badRequestNoStripeSubscription: () => void;

    /**
     * Handler for status = 400 and code = QUANTITY_NOT_EDITABLE
     */
    badRequestQuantityNotEditable: () => void;

    /**
     * Handler for status = 400 and code = SCHEDULED_PLAN_CHANGE_PENDING
     */
    badRequestScheduledPlanChangePending: () => void;

    /**
     * Handler for status = 400 and code = PENDING_SEAT_INCREASE_PAYMENT
     */
    badRequestPendingSeatIncreasePayment: () => void;

    /**
     * Handler for status = 400 and code = SEAT_INCREASE_PAYMENT_FAILED
     */
    badRequestSeatIncreasePaymentFailed: () => void;

    /**
     * General handler for status = 403
     */
    forbidden: () => void;

    /**
     * General handler for status = 404
     */
    notFound: () => void;

    /**
     * Handler for status = 404 and code = ORGANIZATION_NOT_FOUND
     */
    notFoundOrganizationNotFound: () => void;
};

