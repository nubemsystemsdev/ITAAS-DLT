// Reserved for license

"use strict";

import { ObjectSchema } from "@asanrom/javascript-object-sanitizer";
import Express from "express";
import { Agent } from "../../models/agent";
import { AgentService } from "../../services/agent-service";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";

const AGENTS_LIST_PAGE_LIMIT = 25;
const AGENT_CODE_MAX_LENGTH = 20;   
const AGENT_NAME_MAX_LENGTH = 20;
const AGENT_DESCRIPTION_MAX_LENGTH = 1000;
const AGENT_TYPE_MAX_LENGTH = 20;
const AGENT_CATEGORY_MAX_LENGTH = 20;
const AGENT_PRICE_MIN = 0;
const AGENT_PRICE_MAX = 1000000;
const AGENT_NUM_TOKENS_MIN = 1;
const AGENT_NUM_TOKENS_MAX = 1000000;

/**
 * Agents admin API
 * @group agents_admin
 */
export class AgentsAdminController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/admin/agents", noCache(this.getAgents.bind(this)));
        application.get(prefix + "/admin/agents/:id", noCache(this.getAgent.bind(this)));

        application.post(prefix + "/admin/agents", ensureObjectBody(this.createAgent.bind(this)));
        application.post(prefix + "/admin/agents/:id/activate", ensureObjectBody(this.activateAgent.bind(this)));
        application.post(prefix + "/admin/agents/:id/deactivate", ensureObjectBody(this.deactivateAgent.bind(this)));

        application.put(prefix + "/admin/agents/:id", ensureObjectBody(this.updateAgent.bind(this)));
        application.delete(prefix + "/admin/agents/:id", ensureObjectBody(this.deleteAgent.bind(this)));
    }

    /**
     * @typedef AgentAdminItem
     * @property {string} id.required - Agent ID
     * @property {string} code.required - Agent code (unique)
     * @property {string} name.required - Agent name
     * @property {string} description.required - Agent description
     * @property {string} type.required - Agent type
     * @property {string} category.required - Agent category
     * @property {boolean} isActive.required - True if active
     * @property {number} price.required - Agent price
     * @property {number} createdAt.required - Creation timestamp (Unix milliseconds)
     * @property {number} numTokens.required - Number of tokens
     */

    /**
     * @typedef AgentAdminList
     * @property {Array.<AgentAdminItem>} agents.required - Agents
     * @property {number} page.required - Page number (starting by 1)
     * @property {number} totalPages.required - Total number of pages
     * @property {number} total.required - Total results
     */

    /**
     * Gets list of agents
     * Requires permission: admin.users.manage
     * Binding: GetAgents
     * @route GET /admin/agents
     * @group agents_admin
     * @param {string} q.query - Search query. Can be id, code or name.
     * @param {string} type.query - Type to filter by.
     * @param {string} category.query - Category to filter by.
     * @param {boolean} isActive.query - Filter by active status.
     * @param {number} page.query - Page. Starting by 1.
     * @param {number} pageSize.query - Page size. Max 25.
     * @returns {AgentAdminList.model} 200 - List of agents
     * @returns {void} 400 - Bad request: INVALID_IS_ACTIVE
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getAgents(request: Express.Request, response: Express.Response) {
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

        const q = ((request.query.q || "") + "").trim();
        const type = ((request.query.type || "") + "").trim();
        const category = ((request.query.category || "") + "").trim();

        const service = AgentService.getInstance();
        const isActiveFilter = service.parseBooleanFilter(request.query.isActive);
        
        if (isActiveFilter === null) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_IS_ACTIVE",
                "The client provided an invalid isActive filter",
            );
            return;
        }

        const total = await Agent.countFiltered(q, type, category, isActiveFilter);

        let pageSize = parseInt((request.query.pageSize || "") + "", 10) || AGENTS_LIST_PAGE_LIMIT;
        if (pageSize < 1) {
            pageSize = 1;
        }
        if (pageSize > AGENTS_LIST_PAGE_LIMIT) {
            pageSize = AGENTS_LIST_PAGE_LIMIT;
        }

        let totalPages = Math.floor(total / pageSize);
        if ((total % pageSize) > 0) {
            totalPages++;
        }

        let page = parseInt((request.query.page || "1") + "", 10) || 1;
        if (page < 1) {
            page = 1;
        }
        if (totalPages <= 0) {
            totalPages = 1;
        }
        if (page > totalPages) {
            page = totalPages;
        }

        const skip = (page - 1) * pageSize;
        const agents = await Agent.findFiltered(skip, pageSize, q, type, category, isActiveFilter);

        sendApiResult(request, response, {
            agents: agents.map((agent) => agent.toObject()),
            page: page,
            totalPages: totalPages,
            total: total,
        });
    }

    /**
     * Gets details of an agent
     * Requires permission: admin.users.manage
     * Binding: GetAgent
     * @route GET /admin/agents/{id}
     * @group agents_admin
     * @param {string} id.path.required - Agent ID
     * @returns {AgentAdminItem.model} 200 - Agent details
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async getAgent(request: Express.Request, response: Express.Response) {
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

        const id = (request.params.id || "") + "";
        const agent = await Agent.findById(id);

        if (!agent) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target agent was not found in the database",
            );
            return;
        }

        sendApiResult(request, response, agent.toObject());
    }

    /**
     * @typedef AgentCreateBody
     * @property {string} code.required - Agent code (lowercase, numbers, _ and -)
     * @property {string} name.required - Agent name
     * @property {string} description.required - Agent description
     * @property {string} type.required - Agent type
     * @property {string} category.required - Agent category
     * @property {boolean} isActive - Active status (default true)
     * @property {number} price.required - Agent price (>= 0)
     * @property {number} numTokens.required - Number of tokens (>= 0)
     */

    /**
     * Creates an agent
     * Requires permission: admin.users.manage
     * Binding: CreateAgent
     * @route POST /admin/agents
     * @group agents_admin
     * @param {AgentCreateBody.model} request.body - Agent to create
     * @returns {void} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_CODE, INVALID_NAME, INVALID_DESCRIPTION, INVALID_TYPE, INVALID_CATEGORY, INVALID_PRICE, INVALID_NUM_TOKENS, DUPLICATED_CODE, INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async createAgent(request: Express.Request, response: Express.Response) {
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

        const body = ObjectSchema.object({
            code: ObjectSchema.string().withDefaultValue(""),
            name: ObjectSchema.string().withDefaultValue(""),
            description: ObjectSchema.string().withDefaultValue(""),
            type: ObjectSchema.string().withDefaultValue(""),
            category: ObjectSchema.string().withDefaultValue(""),
            isActive: ObjectSchema.boolean().withDefaultValue(true),
            price: ObjectSchema.number().withDefaultValue(0),
            numTokens: ObjectSchema.number().withDefaultValue(0),
        }).sanitize(request.body);

        if (!body.code || body.code.length > AGENT_CODE_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_CODE", "Code is required and must be less than " + AGENT_CODE_MAX_LENGTH + " characters");
            return;
        }
        if (!body.name || body.name.length > AGENT_NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NAME", "Name is required and must be less than " + AGENT_NAME_MAX_LENGTH + " characters");
            return;
        }
        if (!body.description || body.description.length > AGENT_DESCRIPTION_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DESCRIPTION", "Description is required and must be less than " + AGENT_DESCRIPTION_MAX_LENGTH + " characters");
            return;
        }
        if (!body.type || body.type.length > AGENT_TYPE_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TYPE", "Type is required and must be less than " + AGENT_TYPE_MAX_LENGTH + " characters");
            return;
        }
        if (!body.category || body.category.length > AGENT_CATEGORY_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_CATEGORY", "Category is required and must be less than " + AGENT_CATEGORY_MAX_LENGTH + " characters");
            return;
        }
        if (!body.price || body.price < AGENT_PRICE_MIN || body.price > AGENT_PRICE_MAX) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PRICE", "Price is required and must be between " + AGENT_PRICE_MIN + " and " + AGENT_PRICE_MAX);
            return;
        }
        if (!body.numTokens || body.numTokens < AGENT_NUM_TOKENS_MIN || body.numTokens > AGENT_NUM_TOKENS_MAX) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NUM_TOKENS", "Number of tokens is required and must be between " + AGENT_NUM_TOKENS_MIN + " and " + AGENT_NUM_TOKENS_MAX);
            return;
        }

        try {
            await Agent.createAgent(body);
            sendApiSuccess(request, response);
        } catch (ex) {
            const errorCode = (((ex?.code || "") + "").trim());
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                errorCode || "INVALID_REQUEST",
                ex instanceof Error ? ex.message : "Agent create request validation failed",
            );
        }
    }

    /**
     * @typedef AgentUpdateBody
     * @property {string} code.required - Agent code (lowercase, numbers, _ and -)
     * @property {string} name.required - Agent name
     * @property {string} description.required - Agent description
     * @property {string} type.required - Agent type
     * @property {string} category.required - Agent category
     * @property {boolean} isActive - Active status
     * @property {number} price.required - Agent price (>= 0)
     * @property {number} numTokens.required - Number of tokens (>= 0)
     */

    /**
     * Updates an agent
     * Requires permission: admin.users.manage
     * Binding: UpdateAgent
     * @route PUT /admin/agents/{id}
     * @group agents_admin
     * @param {string} id.path.required - Agent ID
     * @param {AgentUpdateBody.model} request.body - Request body
     * @returns {AgentAdminItem.model} 200 - Updated agent
     * @returns {void} 400 - Bad request: INVALID_CODE, INVALID_NAME, INVALID_DESCRIPTION, INVALID_TYPE, INVALID_CATEGORY, INVALID_PRICE, INVALID_NUM_TOKENS, DUPLICATED_CODE, INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async updateAgent(request: Express.Request, response: Express.Response) {
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

        const id = (request.params.id || "") + "";
        const agent = await Agent.findById(id);

        if (!agent) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target agent was not found in the database",
            );
            return;
        }

        const body = ObjectSchema.object({
            code: ObjectSchema.string().withDefaultValue(""),
            name: ObjectSchema.string().withDefaultValue(""),
            description: ObjectSchema.string().withDefaultValue(""),
            type: ObjectSchema.string().withDefaultValue(""),
            category: ObjectSchema.string().withDefaultValue(""),
            isActive: ObjectSchema.boolean().withDefaultValue(agent.isActive),
            price: ObjectSchema.number().withDefaultValue(agent.price),
            numTokens: ObjectSchema.number().withDefaultValue(agent.numTokens),
        }).sanitize(request.body);

        if (body.code && body.code.length > AGENT_CODE_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_CODE", "Code is required and must be less than " + AGENT_CODE_MAX_LENGTH + " characters");
            return;
        }
        if (body.name && body.name.length > AGENT_NAME_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NAME", "Name is required and must be less than " + AGENT_NAME_MAX_LENGTH + " characters");
            return;
        }
        if (body.description && body.description.length > AGENT_DESCRIPTION_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_DESCRIPTION", "Description is required and must be less than " + AGENT_DESCRIPTION_MAX_LENGTH + " characters");
            return;
        }
        if (body.type && body.type.length > AGENT_TYPE_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_TYPE", "Type is required and must be less than " + AGENT_TYPE_MAX_LENGTH + " characters");
            return;
        }
        if (body.category && body.category.length > AGENT_CATEGORY_MAX_LENGTH) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_CATEGORY", "Category is required and must be less than " + AGENT_CATEGORY_MAX_LENGTH + " characters");
            return;
        }
        if (body.price && (body.price < AGENT_PRICE_MIN || body.price > AGENT_PRICE_MAX)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_PRICE", "Price is required and must be between " + AGENT_PRICE_MIN + " and " + AGENT_PRICE_MAX);
            return;
        }
        if (body.numTokens && (body.numTokens < AGENT_NUM_TOKENS_MIN || body.numTokens > AGENT_NUM_TOKENS_MAX)) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_NUM_TOKENS", "Number of tokens is required and must be between " + AGENT_NUM_TOKENS_MIN + " and " + AGENT_NUM_TOKENS_MAX);
            return;
        }

        try 
        {
            const updated = await AgentService.getInstance().updateAgent(agent, body);
            sendApiResult(request, response, updated.toObject());
        } catch (ex) {
            const errorCode = (((ex?.code || "") + "").trim());
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                errorCode || "INVALID_REQUEST",
                ex instanceof Error ? ex.message : "Agent update request validation failed",
            );
        }
    }

    /**
     * Deletes an agent
     * Requires permission: admin.users.manage
     * Binding: DeleteAgent
     * @route DELETE /admin/agents/{id}
     * @group agents_admin
     * @param {string} id.path.required - Agent ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async deleteAgent(request: Express.Request, response: Express.Response) {
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

        const id = (request.params.id || "") + "";
        const agent = await Agent.findById(id);

        if (!agent) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target agent was not found in the database",
            );
            return;
        }

        await agent.delete();
        sendApiSuccess(request, response);
    }

    /**
     * Activates an agent
     * Requires permission: admin.users.manage
     * Binding: ActivateAgent
     * @route POST /admin/agents/{id}/activate
     * @group agents_admin
     * @param {string} id.path.required - Agent ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async activateAgent(request: Express.Request, response: Express.Response) {
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

        const id = (request.params.id || "") + "";
        const agent = await Agent.findById(id);

        if (!agent) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target agent was not found in the database",
            );
            return;
        }

        await AgentService.getInstance().activate(agent);
        sendApiSuccess(request, response);
    }

    /**
     * Deactivates an agent
     * Requires permission: admin.users.manage
     * Binding: DeactivateAgent
     * @route POST /admin/agents/{id}/deactivate
     * @group agents_admin
     * @param {string} id.path.required - Agent ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async deactivateAgent(request: Express.Request, response: Express.Response) {
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

        const id = (request.params.id || "") + "";
        const agent = await Agent.findById(id);

        if (!agent) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "NOT_FOUND",
                "The target agent was not found in the database",
            );
            return;
        }

        await AgentService.getInstance().deactivate(agent);
        sendApiSuccess(request, response);
    }
}
