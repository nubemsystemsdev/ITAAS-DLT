"use strict";

import Express from "express";
import { Controller } from "../controller";
import { ItaasWorkspaceProvisioningService } from "../../services/itaas-workspace-provisioning-service";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { sendItaasWorkspaceAdminMutationFailure, sendItaasWorkspaceAdminServiceError } from "../../utils/itaas-workspace-admin-api-errors";
import { Monitor } from "../../monitor";
import { BffTenantSubjectType } from "../../services/bff-provisioning-client";

/**
 * ITAAS BFF workspace admin API (catalog, global flows, assign/remove)
 * @group itaas_workspace_admin
 */
export class ItaasWorkspaceAdminController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/itaas/admin/flows", noCache(this.listFlows.bind(this)));
        application.get(prefix + "/itaas/admin/flows/:flowId", noCache(this.getFlow.bind(this)));
        application.get(prefix + "/itaas/admin/workspaces", noCache(this.listWorkspaces.bind(this)));
        application.post(prefix + "/itaas/admin/flows/global", ensureObjectBody(this.makeFlowGlobal.bind(this)));
        application.post(prefix + "/itaas/admin/flows/global/remove", ensureObjectBody(this.unpublishGlobalFlow.bind(this)));
        application.post(prefix + "/itaas/admin/flows/graph-visibility", ensureObjectBody(this.setFlowsGraphVisibility.bind(this)));
        application.post(
            prefix + "/itaas/admin/flows/graph-visibility/lookup",
            ensureObjectBody(this.lookupFlowsGraphVisibility.bind(this)),
        );
        application.post(prefix + "/itaas/admin/flows/:flowId/graph-visibility", ensureObjectBody(this.setFlowGraphVisibility.bind(this)));
        application.post(prefix + "/itaas/admin/workspaces/flows", ensureObjectBody(this.assignFlow.bind(this)));
        application.post(prefix + "/itaas/admin/workspaces/flows/remove", ensureObjectBody(this.removeFlow.bind(this)));
    }

    /**
     * @typedef ItaasWorkspaceFlowBody
     * @property {string} subjectType.required - `organization` or `user`
     * @property {string} subjectId.required - Organization id or user id
     * @property {string} flowId.required - Flowise chatflow id
     */

    /**
     * @typedef ItaasWorkspaceFlowSubject
     * @property {string} subjectType.required - `organization` or `user`
     * @property {string} subjectId.required - Organization id or user id
     */

    /**
     * @typedef ItaasWorkspaceFlowSyncResult
     * @property {string} action.required - Sync action (`provision` or `skip`)
     * @property {string} reason.required - Result reason
     * @property {ItaasWorkspaceFlowSubject.model} subject - Subject when present
     */

    /**
     * @typedef ItaasAdminFlowAssignment
     * @property {string} subjectType.required - `organization` or `user`
     * @property {string} subjectId.required - Organization id or user id
     * @property {string} name - Display name when known
     * @property {string} status.required - `active` or `inactive`
     */

    /**
     * @typedef ItaasAdminFlowItem
     * @property {string} id.required - Flowise chatflow id
     * @property {string} name.required - Flow display name
     * @property {boolean} deployed.required - Whether the flow is deployed
     * @property {string} type - Flowise flow type
     * @property {string} category - Flow category
     * @property {string} updatedAt - Last update timestamp
     * @property {boolean} isGlobal.required - Whether the flow is platform-global
     * @property {string} visibility.required - `global`, `workspace` or `unassigned`
     * @property {Array.<ItaasAdminFlowAssignment>} assignments.required - Workspace assignments
     * @property {boolean} graphVisibleToUsers.required - Whether end users can see the graph preview
     * @property {ItaasFlowGraph.model} graph - Sanitized node/edge preview when present
     */

    /**
     * @typedef ItaasAdminFlowsList
     * @property {Array.<ItaasAdminFlowItem>} items.required - Admin catalog flows
     */

    /**
     * @typedef ItaasAdminWorkspaceItem
     * @property {string} subjectType.required - `organization` or `user`
     * @property {string} subjectId.required - Organization id or user id
     * @property {string} subjectKey.required - BFF tenant key
     * @property {string} name - Display name when known
     * @property {string} status.required - `active` or `inactive`
     * @property {Array.<string>} flowIds.required - Assigned flow ids
     */

    /**
     * @typedef ItaasAdminWorkspacesList
     * @property {Array.<ItaasAdminWorkspaceItem>} items.required - BFF logical tenants
     */

    /**
     * @typedef ItaasAdminFlowGraphVisibilityBody
     * @property {boolean} visible.required - Whether end users can see the graph preview
     */

    /**
     * @typedef ItaasAdminFlowGraphVisibilityResult
     * @property {string} flowId.required - Flowise chatflow id
     * @property {boolean} graphVisibleToUsers.required - Whether end users can see the graph preview
     */

    /**
     * @typedef ItaasAdminFlowsGraphVisibilityBody
     * @property {boolean} visible.required - Whether end users can see the graph preview
     * @property {Array.<string>} flowIds.required - Catalog flow ids to update
     */

    /**
     * @typedef ItaasAdminFlowsGraphVisibilityResult
     * @property {boolean} graphVisibleToUsers.required - Whether end users can see the graph preview
     * @property {Array.<string>} flowIds.required - Catalog flow ids that were updated
     */

    /**
     * @typedef ItaasAdminFlowsGraphVisibilityLookupBody
     * @property {Array.<string>} flowIds.required - Catalog flow ids to read
     */

    /**
     * @typedef ItaasAdminFlowsGraphVisibilityLookupResult
     * @property {Array.<ItaasAdminFlowGraphVisibilityResult>} items.required - Current local visibility
     */

    /**
     * @typedef ItaasAdminGlobalFlowBody
     * @property {string} flowId.required - Flowise chatflow id
     */

    /**
     * @typedef ItaasAdminGlobalFlowResult
     * @property {Array.<string>} globalFlowIds.required - Current global flow ids
     * @property {number} clearedAssignments.required - Private assignments removed before publish
     */

    /**
     * Lists the Flowise catalog enriched with visibility and workspace assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminListItaasFlows
     * @route GET /itaas/admin/flows
     * @group itaas_workspace_admin
     * @param {string} q.query - Optional name filter forwarded to the BFF
     * @returns {ItaasAdminFlowsList.model} 200 - Admin flow catalog
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async listFlows(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const q = ((request.query.q || "") + "").trim();

        try {
            const items = await ItaasWorkspaceProvisioningService.getInstance().listAdminFlows(
                q || undefined,
            );
            sendApiResult(request, response, { items });
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list admin flows");
        }
    }

    /**
     * Returns a Flowise catalog flow by id, enriched with visibility, assignments and sanitized graph preview.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminGetItaasFlow
     * @route GET /itaas/admin/flows/{flowId}
     * @group itaas_workspace_admin
     * @param {string} flowId.path.required - Flowise chatflow id
     * @returns {ItaasAdminFlowItem.model} 200 - Admin catalog flow
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async getFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";

        try {
            const item = await ItaasWorkspaceProvisioningService.getInstance().getAdminFlow(flowId);
            sendApiResult(request, response, item);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load admin flow");
        }
    }

    /**
     * Sets whether end users can see the sanitized graph preview for a catalog flow.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminSetItaasFlowGraphVisibility
     * @route POST /itaas/admin/flows/{flowId}/graph-visibility
     * @group itaas_workspace_admin
     * @param {string} flowId.path.required - Flowise chatflow id
     * @param {ItaasAdminFlowGraphVisibilityBody.model} request.body.required - Visibility flag
     * @returns {ItaasAdminFlowGraphVisibilityResult.model} 200 - Updated visibility
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, INVALID_BODY
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: FLOW_NOT_FOUND
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async setFlowGraphVisibility(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const flowId = ((request.params && request.params.flowId) || "") + "";
        const body = (request.body || {}) as Record<string, unknown>;
        if (typeof body.visible !== "boolean") {
            sendApiError(request, response, BAD_REQUEST, "INVALID_BODY", "Invalid visibility");
            return;
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowGraphVisibility(
                flowId,
                body.visible,
            );
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not update graph visibility");
        }
    }

    /**
     * Sets graph visibility for many catalog flows in local settings only (no BFF).
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminSetItaasFlowsGraphVisibility
     * @route POST /itaas/admin/flows/graph-visibility
     * @group itaas_workspace_admin
     * @param {ItaasAdminFlowsGraphVisibilityBody.model} request.body.required - Visibility flag and catalog flow ids
     * @returns {ItaasAdminFlowsGraphVisibilityResult.model} 200 - Updated visibility
     * @returns {void} 400 - Bad request: INVALID_BODY
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async setFlowsGraphVisibility(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        if (typeof body.visible !== "boolean" || !Array.isArray(body.flowIds) || body.flowIds.length === 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_BODY", "Invalid visibility");
            return;
        }
        for (const flowId of body.flowIds) {
            if (typeof flowId !== "string") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_BODY", "Invalid visibility");
                return;
            }
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().setAdminFlowsGraphVisibility(
                body.flowIds as string[],
                body.visible,
            );
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not update graph visibility");
        }
    }

    /**
     * Reads local graph visibility for catalog flows (no BFF).
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminLookupItaasFlowsGraphVisibility
     * @route POST /itaas/admin/flows/graph-visibility/lookup
     * @group itaas_workspace_admin
     * @param {ItaasAdminFlowsGraphVisibilityLookupBody.model} request.body.required - Catalog flow ids
     * @returns {ItaasAdminFlowsGraphVisibilityLookupResult.model} 200 - Current visibility
     * @returns {void} 400 - Bad request: INVALID_BODY
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async lookupFlowsGraphVisibility(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        if (!Array.isArray(body.flowIds) || body.flowIds.length === 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_BODY", "Invalid visibility");
            return;
        }
        for (const flowId of body.flowIds) {
            if (typeof flowId !== "string") {
                sendApiError(request, response, BAD_REQUEST, "INVALID_BODY", "Invalid visibility");
                return;
            }
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().lookupAdminFlowsGraphVisibility(
                body.flowIds as string[],
            );
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not load graph visibility");
        }
    }

    /**
     * Lists BFF logical tenants for workspace assignment.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminListItaasWorkspaces
     * @route GET /itaas/admin/workspaces
     * @group itaas_workspace_admin
     * @returns {ItaasAdminWorkspacesList.model} 200 - Admin workspaces
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async listWorkspaces(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        try {
            const items = await ItaasWorkspaceProvisioningService.getInstance().listAdminWorkspaces();
            sendApiResult(request, response, { items });
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not list admin workspaces");
        }
    }

    /**
     * Publishes a flow as platform-global after clearing private assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminMakeItaasFlowGlobal
     * @route POST /itaas/admin/flows/global
     * @group itaas_workspace_admin
     * @param {ItaasAdminGlobalFlowBody.model} request.body.required - Flow id
     * @returns {ItaasAdminGlobalFlowResult.model} 200 - Updated global flow ids
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID, FLOW_GLOBAL_SYNC_FAILED, FLOW_ALREADY_ASSIGNED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, FLOW_OP_BUSY
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async makeFlowGlobal(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const flowId = ((body.flowId || "") + "").trim();
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flowId");
            return;
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().makeFlowGlobal(flowId);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not publish global flow");
        }
    }

    /**
     * Unpublishes a platform-global flow without restoring previous assignments.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminUnpublishItaasFlowGlobal
     * @route POST /itaas/admin/flows/global/remove
     * @group itaas_workspace_admin
     * @param {ItaasAdminGlobalFlowBody.model} request.body.required - Flow id
     * @returns {ItaasAdminGlobalFlowResult.model} 200 - Updated global flow ids
     * @returns {void} 400 - Bad request: INVALID_FLOW_ID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, FLOW_OP_BUSY
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async unpublishGlobalFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const flowId = ((body.flowId || "") + "").trim();
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flowId");
            return;
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().unpublishGlobalFlow(flowId);
            sendApiResult(request, response, result);
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not unpublish global flow");
        }
    }

    /**
     * Assigns a Flowise flow to a BFF logical tenant.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminAssignItaasWorkspaceFlow
     * @route POST /itaas/admin/workspaces/flows
     * @group itaas_workspace_admin
     * @param {ItaasWorkspaceFlowBody.model} request.body.required - Subject + flowId
     * @returns {ItaasWorkspaceFlowSyncResult.model} 200 - Sync result
     * @returns {void} 400 - Bad request: INVALID_SUBJECT, INVALID_FLOW_ID, FLOW_IS_GLOBAL, FLOW_ALREADY_ASSIGNED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, FLOW_OP_BUSY
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async assignFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const subjectType = ((body.subjectType || "") + "").trim();
        const subjectId = ((body.subjectId || "") + "").trim();
        const flowId = ((body.flowId || "") + "").trim();

        if (subjectType !== "organization" && subjectType !== "user") {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBJECT", "Invalid subjectType");
            return;
        }
        if (!subjectId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBJECT", "Invalid subjectId");
            return;
        }
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flowId");
            return;
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().assignFlowToSubject(
                { subjectType: subjectType as BffTenantSubjectType, subjectId },
                flowId,
            );
            if (sendItaasWorkspaceAdminMutationFailure(request, response, result)) {
                return;
            }
            sendApiResult(request, response, {
                action: result.action,
                reason: result.reason,
                subject: result.subject,
            });
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not assign flow");
        }
    }

    /**
     * Removes a Flowise flow from a BFF logical tenant.
     * Requires permission: admin.users.manage (platform admin role)
     * Binding: AdminRemoveItaasWorkspaceFlow
     * @route POST /itaas/admin/workspaces/flows/remove
     * @group itaas_workspace_admin
     * @param {ItaasWorkspaceFlowBody.model} request.body.required - Subject + flowId
     * @returns {ItaasWorkspaceFlowSyncResult.model} 200 - Sync result
     * @returns {void} 400 - Bad request: INVALID_SUBJECT, INVALID_FLOW_ID
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 503 - Service unavailable: BFF_UNAVAILABLE, FLOW_OP_BUSY
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async removeFlow(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage") || auth.user.role !== ADMIN_ROLE) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const body = (request.body || {}) as Record<string, unknown>;
        const subjectType = ((body.subjectType || "") + "").trim();
        const subjectId = ((body.subjectId || "") + "").trim();
        const flowId = ((body.flowId || "") + "").trim();

        if (subjectType !== "organization" && subjectType !== "user") {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBJECT", "Invalid subjectType");
            return;
        }
        if (!subjectId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_SUBJECT", "Invalid subjectId");
            return;
        }
        if (!flowId) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_FLOW_ID", "Invalid flowId");
            return;
        }

        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().removeFlowFromSubject(
                { subjectType: subjectType as BffTenantSubjectType, subjectId },
                flowId,
            );
            if (sendItaasWorkspaceAdminMutationFailure(request, response, result)) {
                return;
            }
            sendApiResult(request, response, {
                action: result.action,
                reason: result.reason,
                subject: result.subject,
            });
        } catch (ex) {
            if (sendItaasWorkspaceAdminServiceError(request, response, ex)) {
                return;
            }
            if (ex instanceof Error) {
                Monitor.exception(ex);
            }
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "", "Could not remove flow");
        }
    }
}
