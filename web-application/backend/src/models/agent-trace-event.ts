// AgentTraceEvent - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions, TypedRow, enforceType } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "agent_trace_event";
const PRIMARY_KEY = "id";

export enum AgentTraceEventType {
    AGENT_PROMPT_SUBMITTED = "agent.prompt_submitted",
    AGENT_FLOW_GENERATED = "agent.flow_generated",
    PAYMENT_CONFIRMED = "payment.confirmed",
    EXECUTION_STARTED = "execution.started",
    EXECUTION_STOPPED_ERROR = "execution.stopped.error",
    EXECUTION_STOPPED_MANUAL = "execution.stopped.manual",
    EXECUTION_COMPLETED = "execution.completed",
}

export const AGENT_TRACE_EVENT_TYPE_VALUES: ReadonlySet<string> = new Set<string>(Object.values(AgentTraceEventType));

export function isAgentTraceEventType(value: string): value is AgentTraceEventType {
    return AGENT_TRACE_EVENT_TYPE_VALUES.has(((value || "") + "").trim());
}

export type AgentTraceEventCreateData = {
    eventId: string;
    organizationId?: string;
    actor: string;
    flowId?: string;
    executionId?: string;
    eventType: string;
    status?: string;
    startedAt?: number;
    finishedAt?: number;
    output?: string;
};

/**
 * Optional filters for agent trace event listings.
 * `actor` is the Keycloak subject (`sub`) stored by BFF ingest — not the marketplace uid.
 */
export type AgentTraceEventListFilters = {
    actor?: string;
    flowId?: string;
    executionId?: string;
    organizationId?: string;
    /** Single event type filter (ignored when `eventTypes` is set). */
    eventType?: string;
    /** Multiple event types (`IN` filter). Takes precedence over `eventType`. */
    eventTypes?: string[];
    since?: number;
    until?: number;
};

/* db-index: eventId */
/* db-index: eventType */
/* db-index: flowId */
/* db-index: createdAt DESC */
/* db-index: actor, createdAt DESC */
/* db-index: organizationId, createdAt DESC */
/* db-index: executionId, occurredAt */

export class AgentTraceEvent extends DataModel {
    public static readonly finder = new DataFinder<AgentTraceEvent, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<AgentTraceEvent>) => new AgentTraceEvent(data));

    public static async findById(id: string): Promise<AgentTraceEvent> {
        return AgentTraceEvent.finder.findByKey(id);
    }

    public static async findByEventId(eventId: string): Promise<AgentTraceEvent> {
        const res = await AgentTraceEvent.finder.find(DataFilter.equals("eventId", eventId));
        return res[0] || null;
    }

    public static async findAll(): Promise<AgentTraceEvent[]> {
        return AgentTraceEvent.finder.find(DataFilter.any(), OrderBy.desc("createdAt"));
    }

    public static async countAll(): Promise<number> {
        return AgentTraceEvent.finder.count(DataFilter.any());
    }

    public static async findAllPaginated(skip: number, limit: number): Promise<AgentTraceEvent[]> {
        return AgentTraceEvent.finder.find(
            DataFilter.any(),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    /**
     * @param actor Keycloak subject (`sub`) of the event actor
     */
    public static async findByUid(actor: string): Promise<AgentTraceEvent[]> {
        return AgentTraceEvent.finder.find(DataFilter.equals("actor", actor), OrderBy.desc("createdAt"));
    }

    /**
     * @param actor Keycloak subject (`sub`) of the event actor
     */
    public static async countByUid(actor: string): Promise<number> {
        return AgentTraceEvent.finder.count(DataFilter.equals("actor", actor));
    }

    /**
     * @param actor Keycloak subject (`sub`) of the event actor
     */
    public static async findByUidPaginated(actor: string, skip: number, limit: number): Promise<AgentTraceEvent[]> {
        return AgentTraceEvent.finder.find(
            DataFilter.equals("actor", actor),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static makeFilter(filters?: AgentTraceEventListFilters): DataFilter {
        const conditions: DataFilter[] = [];
        const actor = ((filters?.actor || "") + "").trim();
        const flowId = ((filters?.flowId || "") + "").trim();
        const executionId = ((filters?.executionId || "") + "").trim();
        const organizationId = ((filters?.organizationId || "") + "").trim();
        const eventType = ((filters?.eventType || "") + "").trim();
        const eventTypes = (filters?.eventTypes || [])
            .map(value => ((value || "") + "").trim())
            .filter(value => value.length > 0);
        const since = Number(filters?.since || 0);
        const until = Number(filters?.until || 0);

        if (actor) {
            conditions.push(DataFilter.equals("actor", actor));
        }
        if (flowId) {
            conditions.push(DataFilter.equals("flowId", flowId));
        }
        if (executionId) {
            conditions.push(DataFilter.equals("executionId", executionId));
        }
        if (organizationId) {
            conditions.push(DataFilter.equals("organizationId", organizationId));
        }
        if (eventTypes.length > 1) {
            conditions.push(DataFilter.into("eventType", eventTypes));
        } else if (eventTypes.length === 1) {
            conditions.push(DataFilter.equals("eventType", eventTypes[0]));
        } else if (eventType) {
            conditions.push(DataFilter.equals("eventType", eventType));
        }
        if (Number.isFinite(since) && since > 0) {
            conditions.push(DataFilter.greaterOrEquals("createdAt", Math.floor(since)));
        }
        if (Number.isFinite(until) && until > 0) {
            conditions.push(DataFilter.lessOrEquals("createdAt", Math.floor(until)));
        }

        return conditions.length === 0 ? DataFilter.any() : DataFilter.and(...conditions);
    }

    public static async countFiltered(filters?: AgentTraceEventListFilters): Promise<number> {
        return AgentTraceEvent.finder.count(AgentTraceEvent.makeFilter(filters));
    }

    /**
     * Counts events by on-chain anchor state under the same list filters.
     * `anchoredAt > 0` = confirmed on-chain; `anchoredAt = 0` = persisted but not yet anchored.
     */
    public static async countByAnchorGrouped(filters?: AgentTraceEventListFilters): Promise<{ anchored: number; unanchored: number }> {
        const base = AgentTraceEvent.makeFilter(filters);
        const [anchored, unanchored] = await Promise.all([
            AgentTraceEvent.finder.count(DataFilter.and(base, DataFilter.greaterThan("anchoredAt", 0))),
            AgentTraceEvent.finder.count(DataFilter.and(base, DataFilter.equals("anchoredAt", 0))),
        ]);
        return { anchored, unanchored };
    }

    public static async findFiltered(skip: number, limit: number, filters?: AgentTraceEventListFilters): Promise<AgentTraceEvent[]> {
        return AgentTraceEvent.finder.find(
            AgentTraceEvent.makeFilter(filters),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    /**
     * Timeline of events for one execution (oldest first by occurrence).
     * Ordered in DB by persisted `occurredAt` (`finishedAt || startedAt`), capped with `setMaxRows`.
     * Optional `actor` / `organizationId` / `flowId` restrict visibility.
     * Results are capped by `limit` (default 200, max 200).
     */
    public static async findByExecutionId(
        executionId: string,
        options?: { actor?: string; organizationId?: string; flowId?: string; limit?: number },
    ): Promise<AgentTraceEvent[]> {
        const normalizedExecutionId = ((executionId || "") + "").trim();
        if (!normalizedExecutionId) {
            return [];
        }

        const limit = Math.max(1, Math.min(200, options?.limit ?? 200));

        return AgentTraceEvent.finder.find(
            AgentTraceEvent.makeFilter({
                executionId: normalizedExecutionId,
                actor: options?.actor,
                organizationId: options?.organizationId,
                flowId: options?.flowId,
            }),
            OrderBy.asc("occurredAt"),
            SelectOptions.configure().setMaxRows(limit),
        );
    }

    /**
     * Effective occurrence timestamp: `finishedAt` when set, otherwise `startedAt`.
     */
    public static computeOccurredAt(startedAt: number, finishedAt: number): number {
        const finished = Number(finishedAt) || 0;
        const started = Number(startedAt) || 0;
        return finished > 0 ? finished : started;
    }

    public static async create(data: AgentTraceEventCreateData): Promise<AgentTraceEvent> {
        const now = Date.now();
        const startedAt = data.startedAt || 0;
        const finishedAt = data.finishedAt || 0;
        const event = new AgentTraceEvent({
            id: createRandomUID(),
            eventId: data.eventId || "",
            organizationId: data.organizationId || "",
            actor: data.actor || "",
            flowId: data.flowId || "",
            executionId: data.executionId || "",
            eventType: data.eventType || "",
            status: data.status || "",
            startedAt,
            finishedAt,
            occurredAt: AgentTraceEvent.computeOccurredAt(startedAt, finishedAt),
            output: data.output || "",
            anchoredAt: 0,
            txHash: "",
            createdAt: now,
            updatedAt: now,
        });

        await event.insert();
        return event;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public eventId: string;
    /* db-type: VARCHAR */
    public organizationId: string;
    /* db-type: VARCHAR */
    public actor: string;
    /* db-type: VARCHAR */
    public flowId: string;
    /* db-type: VARCHAR */
    public executionId: string;
    /* db-type: VARCHAR */
    public eventType: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: BIGINT */
    public startedAt: number;
    /* db-type: BIGINT */
    public finishedAt: number;
    /* db-type: BIGINT */
    public occurredAt: number;
    /* db-type: TEXT */
    public output: string;
    /* db-type: BIGINT */
    public anchoredAt: number;
    /* db-type: VARCHAR */
    public txHash: string;
    /* db-type: BIGINT */
    public createdAt: number;
    /* db-type: BIGINT */
    public updatedAt: number;

    constructor(data: TypedRow<AgentTraceEvent>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.eventId = enforceType(data.eventId, "string") || "";
        this.organizationId = enforceType(data.organizationId, "string") || "";
        this.actor = enforceType(data.actor, "string") || "";
        this.flowId = enforceType(data.flowId, "string") || "";
        this.executionId = enforceType(data.executionId, "string") || "";
        this.eventType = enforceType(data.eventType, "string") || "";
        this.status = enforceType(data.status, "string") || "";
        this.startedAt = enforceType(data.startedAt, "number") || 0;
        this.finishedAt = enforceType(data.finishedAt, "number") || 0;
        this.occurredAt = enforceType(data.occurredAt, "number")
            || AgentTraceEvent.computeOccurredAt(this.startedAt, this.finishedAt);
        this.output = enforceType(data.output, "string") || "";
        this.anchoredAt = enforceType(data.anchoredAt, "number") || 0;
        this.txHash = enforceType(data.txHash, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }

    /**
     * Effective occurrence timestamp used for timeline ordering.
     * Prefers persisted `occurredAt`; falls back to `finishedAt || startedAt` for legacy rows.
     */
    public getOccurredAt(): number {
        if (this.occurredAt > 0) {
            return this.occurredAt;
        }
        return AgentTraceEvent.computeOccurredAt(this.startedAt, this.finishedAt);
    }
}
