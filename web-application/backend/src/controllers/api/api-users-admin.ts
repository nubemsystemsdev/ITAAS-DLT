// Reserved for license

"use strict";

import Express from "express";
import { Session } from "../../models/users/session";
import { User } from "../../models/users/user";
import { UsersAdminService } from "../../services/users-admin-service";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, getRequestRemoteAddress, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";
import { UserRole } from "../../models/users/user-role";
import { validateEmail } from "../../utils/text-utils";


const USERS_LIST_PAGE_LIMIT = 100;

/**
 * Users admin API
 * @group users_admin
 */
export class UsersAdminController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/admin/users", noCache(this.getUsers.bind(this)));
        application.get(prefix + "/admin/users/:id", noCache(this.getUser.bind(this)));

        application.post(prefix + "/admin/users/:id/role", ensureObjectBody(this.setUserRole.bind(this)));

        application.post(prefix + "/admin/users/:id/ban", ensureObjectBody(this.banUser.bind(this)));
        application.post(prefix + "/admin/users/:id/pardon", ensureObjectBody(this.pardonUser.bind(this)));

        application.post(prefix + "/admin/users/:id/tfa/disable", ensureObjectBody(this.disableTFA.bind(this)));

        application.post(prefix + "/admin/users/:id/email", ensureObjectBody(this.changeEmail.bind(this)));
        application.post(prefix + "/admin/users/:id/password", ensureObjectBody(this.changePassword.bind(this)));
        application.post(prefix + "/admin/users/:id/username", ensureObjectBody(this.changeUsername.bind(this)));

        application.post(prefix + "/admin/users/:id/add/adminrole", ensureObjectBody(this.addAdmin.bind(this)));
        application.post(prefix + "/admin/users/:id/remove/adminrole", ensureObjectBody(this.removeAdmin.bind(this)));
    }

    /**
     * @typedef UserAdminListItem
     * @property {string} id.required - User ID
     * @property {string} role.required - User role
     * @property {string} username.required - Username
     * @property {string} email.required - Email
     * @property {boolean} verified.required - Verified
     * @property {boolean} banned.required - Banned
     * @property {number} created.required - Creation timestamp (Unix milliseconds)
     */

    /**
     * @typedef UserAdminList
     * @property {Array.<UserAdminListItem>} users.required - Users
     * @property {number} page.required - Page number (starting by 1)
     * @property {number} totalPages.required - Total number of pages
     * @property {number} total - Total results
     */


    /**
     * Gets list of users
     * Requires permission: mod.users
     * Binding: GetUsers
     * @route GET /admin/users
     * @group users_admin
     * @param {string} q.query - Search query. Can be id, email or username.
     * @param {string} role.query - Role to filter by. Use a dash (-) to filter by default role
     * @param {number} page.query - Page. Starting by 1.
     * @param {number} pageSize.query - Page size. Max 100.
     * @returns {UserAdminList.model} 200 - List of users
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getUsers(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("mod.users")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: mod.users",
            );
            return;
        }

        function getUserItem(u: User) {
            return {
                id: u.id,
                role: u.role,
                username: u.username,
                email: u.email,
                verified: u.emailVerified,
                banned: u.banned,
                created: u.created,
            };
        }

        const q = (request.query.q || "") + "";

        if (q) {
            let user = await User.findUserByUID(q);

            if (user) {
                sendApiResult(request, response, {
                    users: [getUserItem(user)],
                    page: 1,
                    totalPages: 1,
                    total: 1,
                });
                return;
            }

            user = await User.findUser(q);

            if (user) {
                sendApiResult(request, response, {
                    users: [getUserItem(user)],
                    page: 1,
                    totalPages: 1,
                    total: 1,
                });
                return;
            }
        }

        let roleFilter: string;

        if (request.query.role) {
            roleFilter = request.query.role + "";

            if (roleFilter === "-") {
                roleFilter = "";
            }
        }

        const total = await User.countFiltered(q, roleFilter);

        let pageSize = parseInt((request.query.pageSize || "25") + "", 10) || 25;

        if (pageSize < 1) {
            pageSize = 1;
        }

        if (pageSize > USERS_LIST_PAGE_LIMIT) {
            pageSize = USERS_LIST_PAGE_LIMIT;
        }

        let totalPages = Math.floor(total / pageSize);

        if (total % pageSize > 0) {
            totalPages++;
        }

        let page = parseInt((request.query.page || "1") + "", 10) || 1;

        if (page < 1) {
            page = 1;
        }

        if (page > totalPages) {
            page = totalPages;
        }

        const skip = (page - 1) * pageSize;

        const users = await User.findFiltered(skip, pageSize, q, roleFilter);

        const usersList = [];

        for (const u of users) {
            usersList.push(getUserItem(u));
        }

        sendApiResult(request, response, {
            users: usersList,
            page: page,
            totalPages: totalPages,
            total: total,
        });
    }

    /**
     * @typedef UserAdminTokenBalance
     * @property {number} available_tokens.required - Available token balance
     * @property {number} locked_tokens.required - Locked token balance
     * @property {number} token_value_eur_cents.required - Value of one token in euro cents
     * @property {number} equivalent_eur_cents.required - Fiat equivalent for available tokens
     */

    /**
     * @typedef UserAdminOrganizationItem
     * @property {string} organizationId.required - Organization ID
     * @property {string} companyName.required - Organization display name
     */

    /**
     * @typedef UserAdminDetails
     * @property {string} id.required - User ID
     * @property {string} role.required - User role
     * @property {string} username.required - Username
     * @property {string} email.required - Email
     * @property {boolean} verified.required - Verified
     * @property {boolean} banned.required - Banned
     * @property {number} created.required - Creation timestamp (Unix milliseconds)
     * @property {boolean} modImmune.required - Immune to moderation
     * @property {boolean} tfa.required - Has TFA enabled
     * @property {string} locale.required - User locale
     * @property {Array.<SessionListItem>} sessions.required - List of sessions
     * @property {UserAdminTokenBalance.model} tokenBalance.required - Nubem token balance
     * @property {Array.<UserAdminOrganizationItem>} organizations.required - Related organizations
     */

    /**
     * Gets details of an user
     * Requires permission: mod.users
     * Binding: GetUser
     * @route GET /admin/users/{id}
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @returns {UserAdminDetails.model} 200 - User details
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async getUser(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("mod.users")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: mod.users",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        const details = await UsersAdminService.getInstance().buildUserAdminDetails(user, auth.session.id);
        sendApiResult(request, response, details);
    }

    /**
     * @typedef AdminSetRoleBody
     * @property {string} role.required - Role to set
     */

    /**
     * Sets the role of an user
     * Requires permission: admin.roles
     * Binding: SetRole
     * @route POST /admin/users/{id}/role
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @param {AdminSetRoleBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: SELF, INVALID_ROLE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async setUserRole(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.roles")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.roles",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        if (user.id === auth.uid) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "SELF",
                "The user tried to set their own role",
            );
            return;
        }

        const role = request.body.role + "";

        if (role && role !== ADMIN_ROLE) {
            const roleData = await UserRole.finder.findByKey(role);

            if (!roleData) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "INVALID_ROLE",
                    "The user provided an non-existent role",
                );
                return;
            }
        }

        user.role = role;
        await user.save();

        sendApiSuccess(request, response);
    }


    /**
     * Bans an user
     * Requires permission: mod.ban
     * Binding: Ban
     * @route POST /admin/users/{id}/ban
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: IMMUNE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async banUser(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("mod.ban")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: mod.ban",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        const immune = await user.isImmuneToModeration();

        if (immune) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "IMMUNE",
                "The target user is immune to moderation",
            );
            return;
        }

        user.banned = true;
        await user.save();

        await Session.closeSessions(user);

        request.logger.info("[ADMIN] Banned user", {
            by: { id: auth.user.id, username: auth.user.username },
            user: { id: user.id, username: user.username },
        });

        sendApiSuccess(request, response);
    }

    /**
     * Pardons an user
     * Requires permission: mod.ban
     * Binding: Pardon
     * @route POST /admin/users/{id}/pardon
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async pardonUser(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("mod.ban")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: mod.ban",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        user.banned = false;
        await user.save();

        request.logger.info("[ADMIN] Pardoned user", {
            by: { id: auth.user.id, username: auth.user.username },
            user: { id: user.id, username: user.username },
        });

        sendApiSuccess(request, response);
    }

    /**
     * Disables TFA for an user to recover their account
     * Requires permission: admin.users.manage
     * Binding: DisableTFA
     * @route POST /admin/users/{id}/tfa/disable
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @returns {void} 200 - Success
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async disableTFA(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        user.tfa = false;
        user.tfaSecret = "";
        await user.save();

        request.logger.info("[ADMIN] Forced to disable TFA", {
            by: { id: auth.user.id, username: auth.user.username },
            ip: getRequestRemoteAddress(request),
            user: { id: user.id, username: user.username },
        });

        sendApiSuccess(request, response);
    }

    /**
     * @typedef UserAdminEmailChange
     * @property {string} email.required - New email
     */

    /**
     * Changes the email of an account
     * Requires permission: admin.users.manage
     * Binding: ChangeEmail
     * @route POST /admin/users/{id}/email
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @param {UserAdminEmailChange.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: EMAIL_INVALID, EMAIL_IN_USE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async changeEmail(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        const email = (request.body.email || "").toLowerCase();

        if (!email || !validateEmail(email)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "EMAIL_INVALID",
                "The client provided an invalid email",
            );
            return;
        }

        const otherAccount = (await User.findUser(email));
        if (otherAccount) {
            if (otherAccount.emailVerified) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "EMAIL_IN_USE",
                    "The client provided an email being used by another account",
                );
                return;
            } else {
                // Not verified account exists, we can remove it
                await otherAccount.delete();
            }
        }

        user.email = email;
        user.emailVerified = true;
        await user.save();

        request.logger.info("[ADMIN] Forced to change email", {
            by: { id: auth.user.id, username: auth.user.username },
            user: { id: user.id, username: user.username },
            email: email,
        });

        sendApiSuccess(request, response);
    }

    /**
     * @typedef UserAdminUsernameChange
     * @property {string} username.required - New username
     */

    /**
     * Changes the username of an account
     * Requires permission: admin.users.manage
     * Binding: ChangeUsername
     * @route POST /admin/users/{id}/username
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @param {UserAdminUsernameChange.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: USERNAME_INVALID, USERNAME_IN_USE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async changeUsername(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        // Username
        const username = (request.body.username || "") + "";

        if (!username || !User.validateUserName(username)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_INVALID",
                "The client provided an invalid username",
            );
            return;
        }

        if (await User.findUser(username) !== null) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "USERNAME_IN_USE",
                "The client provided an username being used by another account",
            );
            return;
        }

        const oldUsername = user.username;

        user.username = username;
        user.usernameLowerCase = username.toLowerCase();

        await user.save();

        await UsersService.getInstance().clearProfileCache(user.id);

        request.logger.info("[ADMIN] Forced to change email", {
            by: { id: auth.user.id, username: auth.user.username },
            ip: getRequestRemoteAddress(request),
            user: { id: user.id, username: user.username },
            old_username: oldUsername,
        });

        sendApiSuccess(request, response);
    }

    /**
     * @typedef UserAdminPasswordChange
     * @property {string} password.required - New password
     */

    /**
     * Changes the password of an account
     * Requires permission: admin.users.manage
     * Binding: ChangePassword
     * @route POST /admin/users/{id}/password
     * @group users_admin
     * @param {string} id.path.required - User ID
     * @param {UserAdminPasswordChange.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: WEAK_PASSWORD
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async changePassword(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const uid = request.params.id + "";

        const user = await User.findUserByUID(uid);

        if (!user) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target user was not found in the database",
            );
            return;
        }

        const newPassword = (request.body.password || "") + "";

        if (!newPassword || newPassword.length < 6) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too weak password",
            );
            return;
        }

        await user.changePassword(newPassword);

        request.logger.info("[ADMIN] Forced to change password", {
            by: { id: auth.user.id, username: auth.user.username },
            user: { id: user.id, username: user.username },
        });

        sendApiSuccess(request, response);
    }


    /**
     * @typedef AdminRoleResponse
     * @property {boolean} success.required - Successful operation
     * @property {string} message.required - Descriptive message
     * @property {string} txHash - Blockchain transaction hash (if applicable)
     */

    /**
     * Promote a user to Admin
     * Requires permission: admin.roles
     * Binding: AddAdminRole
     * @route POST /admin/users/{id}/add/adminrole
     * @group users_admin
     * @param {string} id.path.required - Target User ID
     * @returns {AdminRoleResponse.model} 200 - Success
     * @returns {void} 400 - Bad request: WALLET_NOT_FOUND
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async addAdmin(request: Express.Request, response: Express.Response) {
        try {
            const auth = await UsersService.getInstance().auth(request);
            if (!auth.isRegisteredUser()) {
                return sendUnauthorized(request, response);
            }

            if (!auth.hasPermission("admin.roles")) {
                return sendApiError(request, response, FORBIDDEN, "FORBIDDEN", "Lacks permission: admin.roles");
            }

            const uid = request.params.id + "";

            const result = await UsersService.getInstance().promoteToAdmin(uid);

            request.logger.info("Admin promotion executed via API", { 
                by: auth.user.id, 
                targetUid: uid, 
                txHash: result.txHash 
            });

            return sendApiSuccess(request, response);

        } catch (error) {
            request.logger.error("Error in addAdmin API: " + error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            if (errorMessage === "USER_NOT_FOUND") {
                return sendApiError(request, response, NOT_FOUND, "NOT_FOUND", "Target user not found");
            }

            if (errorMessage === "WALLET_NOT_FOUND") {
                return sendApiError(request, response, BAD_REQUEST, "WALLET_NOT_FOUND", "The user must have a wallet to be an admin on blockchain");
            }

            return sendApiError(
                request, 
                response, 
                INTERNAL_SERVER_ERROR, 
                "ADD_ADMIN_FAILED", 
                errorMessage
            );
        }
    }


    /**
     * Remove Admin role from a user
     * Requires permission: admin.roles
     * Binding: RemoveAdminRole
     * @route POST /admin/users/{id}/remove/adminrole
     * @group users_admin
     * @param {string} id.path.required - Target User ID
     * @returns {AdminRoleResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async removeAdmin(request: Express.Request, response: Express.Response) {
        try {
            const auth = await UsersService.getInstance().auth(request);
            if (!auth.isRegisteredUser()) {
                return sendUnauthorized(request, response);
            }

            if (!auth.hasPermission("admin.roles")) {
                return sendApiError(request, response, FORBIDDEN, "FORBIDDEN", "Lacks permission: admin.roles");
            }

            const uid = request.params.id + "";
            const result = await UsersService.getInstance().revokeAdminRole(uid);

            request.logger.info("[ADMIN] Removed administrator role", { 
                by: auth.user.id, 
                targetUid: uid,
                txHash: result.txHash 
            });

            return sendApiSuccess(request, response);

        } catch (error) {
            request.logger.error("Error in removeAdmin API: " + error);
            
            return sendApiError(
                request, 
                response, 
                INTERNAL_SERVER_ERROR, 
                "REMOVE_ADMIN_FAILED", 
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }
}

