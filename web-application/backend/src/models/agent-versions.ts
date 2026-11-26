// AgentVersions - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "agent_versions";
const PRIMARY_KEY = "id";

export enum AgentVersionStatus {
    DRAFT = "Draft",
    IN_VALIDATION = "In Validation",
    PUBLISHED = "Published",
    ARCHIVED = "Archived"
}

/* db-index: agentId */
/* db-index: status */

export class AgentVersions extends DataModel {
    public static readonly finder = new DataFinder<AgentVersions, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<AgentVersions>) => new AgentVersions(data));

    public static async findById(id: string): Promise<AgentVersions> {
        return AgentVersions.finder.findByKey(id);
    }

    public static async findByAgentId(agentId: string): Promise<AgentVersions[]> {
        return AgentVersions.finder.find(DataFilter.equals("agentId", agentId), OrderBy.desc("createdAt"), SelectOptions.configure());
    }

    public static async findPublishedByAgentId(agentId: string): Promise<AgentVersions[]> {
        return AgentVersions.finder.find(DataFilter.and(
            DataFilter.equals("agentId", agentId),
            DataFilter.equals("status", AgentVersionStatus.PUBLISHED),
        ), OrderBy.desc("createdAt"), SelectOptions.configure());
    }

    public static async findByAgentIdAndVersion(agentId: string, versionNumber: string): Promise<AgentVersions> {
        const res = await AgentVersions.finder.find(DataFilter.and(
            DataFilter.equals("agentId", agentId),
            DataFilter.equals("versionNumber", versionNumber),
        ));
        return res[0] || null;
    }

    public static async createVersion(data: {
        agentId: string;
        versionNumber: string;
        changelog?: string;
        flowiseFlowId?: string;
        status?: AgentVersionStatus;
    }): Promise<AgentVersions> {
        const now = Date.now();
        const version = new AgentVersions({
            id: createRandomUID(),
            agentId: data.agentId,
            versionNumber: data.versionNumber,
            changelog: data.changelog || "",
            flowiseFlowId: data.flowiseFlowId || "",
            status: data.status || AgentVersionStatus.DRAFT,
            createdAt: now,
            updatedAt: now,
        });

        await version.insert();
        return version;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public agentId: string;
    /* db-type: VARCHAR */
    public versionNumber: string;
    /* db-type: TEXT */
    public changelog: string;
    /* db-type: VARCHAR */
    public flowiseFlowId: string;
    /* db-type: VARCHAR */
    public status: AgentVersionStatus;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<AgentVersions>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.agentId = enforceType(data.agentId, "string") || "";
        this.versionNumber = enforceType(data.versionNumber, "string") || "";
        this.changelog = enforceType(data.changelog, "string") || "";
        this.flowiseFlowId = enforceType(data.flowiseFlowId, "string") || "";
        this.status = enforceType(data.status, "string") as AgentVersionStatus || AgentVersionStatus.DRAFT;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}