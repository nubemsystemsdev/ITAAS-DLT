// Agent - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";
import { AgentInputData, AgentService } from "../services/agent-service";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "agent";
const PRIMARY_KEY = "id";

export enum AgentVisibility {
    PUBLIC = "public",
    PRIVATE = "private",
}

export enum AgentOwnerType {
    PLATFORM = "platform",
    USER = "user",
    ORGANIZATION = "organization",
}

/* db-index: code */
/* db-index: type */
/* db-index: category */
/* db-index: isActive */
/* db-index: visibility */
/* db-index: ownerType */
/* db-index: ownerId */
export class Agent extends DataModel {
    public static readonly finder = new DataFinder<Agent, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Agent>) => new Agent(data));

    public static async findById(id: string): Promise<Agent> {
        return Agent.finder.findByKey(id);
    }

    public static async findByCode(code: string): Promise<Agent> {
        const result = await Agent.finder.find(DataFilter.equals("code", code));
        return result[0] || null;
    }

    public static makeFilter(
        q?: string,
        type?: string,
        category?: string,
        isActive?: boolean,
        visibility?: string,
        ownerType?: string,
        ownerId?: string,
    ): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("code", q, true),
                DataFilter.startsWith("name", q, true),
            ));
        }

        if (type) {
            filters.push(DataFilter.equals("type", type));
        }

        if (category) {
            filters.push(DataFilter.equals("category", category));
        }

        if (isActive !== undefined) {
            filters.push(DataFilter.equals("isActive", isActive));
        }

        if (visibility) {
            filters.push(DataFilter.equals("visibility", visibility));
        }

        if (ownerType) {
            filters.push(DataFilter.equals("ownerType", ownerType));
        }

        if (ownerId) {
            filters.push(DataFilter.equals("ownerId", ownerId));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(
        q?: string,
        type?: string,
        category?: string,
        isActive?: boolean,
        visibility?: string,
        ownerType?: string,
        ownerId?: string,
    ): Promise<number> {
        return Agent.finder.count(Agent.makeFilter(q, type, category, isActive, visibility, ownerType, ownerId));
    }

    public static async findFiltered(
        skip: number,
        limit: number,
        q?: string,
        type?: string,
        category?: string,
        isActive?: boolean,
        visibility?: string,
        ownerType?: string,
        ownerId?: string,
    ): Promise<Agent[]> {
        return Agent.finder.find(
            Agent.makeFilter(q, type, category, isActive, visibility, ownerType, ownerId),
            OrderBy.nothing(),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async createAgent(input: AgentInputData): Promise<Agent> {
        await AgentService.getInstance().assertCodeUniqueness(input.code);

        const now = Date.now();
        const agent = new Agent({
            id: createRandomUID(),
            code: input.code,
            name: input.name,
            description: input.description,
            type: input.type,
            category: input.category,
            isActive: input.isActive === undefined ? true : !!input.isActive,
            price: input.price,
            createdAt: now,
            numTokens: input.numTokens,
            publishedVersion: "",
            useCase: "",
            usageRequirements: "",
            slaAgreement: "",
            monthlyConsumptionLimit: 0,
            visibility: AgentVisibility.PUBLIC,
            ownerType: AgentOwnerType.PLATFORM,
            ownerId: "",
            customRequestId: "",
        });

        await agent.insert();
        return agent;
    }

    // Agent fields
    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public code: string;
    /* db-type: VARCHAR */
    public name: string;
    /* db-type: TEXT */
    public description: string;
    /* db-type: VARCHAR */
    public type: string;
    /* db-type: VARCHAR */
    public category: string;
    /* db-type: BOOLEAN */
    public isActive: boolean;
    /* db-type: INT */
    public price: number;
    /* db-type: BIGINT */
    public createdAt: number;
    /* db-type: INT */
    public numTokens: number;
    /* db-type: VARCHAR */
    public publishedVersion: string;
    /* db-type: TEXT */
    public useCase: string;
    /* db-type: TEXT */
    public usageRequirements: string;
    /* db-type: TEXT */
    public slaAgreement: string;
    /* db-type: INT */
    public monthlyConsumptionLimit: number;
    /* db-type: INT */
    public updatedAt: number;
    /* db-type: VARCHAR */
    public visibility: string;
    /* db-type: VARCHAR */
    public ownerType: string;
    /* db-type: VARCHAR */
    public ownerId: string;
    /* db-type: VARCHAR */
    public customRequestId: string;

    constructor(data: TypedRow<Agent>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.code = enforceType(data.code, "string") || "";
        this.name = enforceType(data.name, "string") || "";
        this.description = enforceType(data.description, "string") || "";
        this.type = enforceType(data.type, "string") || "";
        this.category = enforceType(data.category, "string") || "";
        this.isActive = enforceType(data.isActive, "boolean") || false;
        this.price = enforceType(data.price, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.numTokens = enforceType(data.numTokens, "number") || 0;
        this.publishedVersion = enforceType(data.publishedVersion, "string") || "";
        this.useCase = enforceType(data.useCase, "string") || "";
        this.usageRequirements = enforceType(data.usageRequirements, "string") || "";
        this.slaAgreement = enforceType(data.slaAgreement, "string") || "";
        this.monthlyConsumptionLimit = enforceType(data.monthlyConsumptionLimit, "number") || 0;
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();
        this.visibility = enforceType(data.visibility, "string") || AgentVisibility.PUBLIC;
        this.ownerType = enforceType(data.ownerType, "string") || AgentOwnerType.PLATFORM;
        this.ownerId = enforceType(data.ownerId, "string") || "";
        this.customRequestId = enforceType(data.customRequestId, "string") || "";

        this.init();
    }
}
