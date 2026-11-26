// Reserved for license

"use strict";

import { MethodTransactionOptions } from "@cyberchain/smart-contract-wrapper";
import { BlockchainConfig } from "../config/config-blockchain";
import { AgentTraceEvent, AgentTraceEventListFilters, AgentTraceEventType, isAgentTraceEventType } from "../models/agent-trace-event";
import { Monitor } from "../monitor";
import { normalizeBytes32, validateBytes32, ZERO_ADDRESS } from "../utils/blockchain";
import { sha256 } from "../utils/hash";
import { AgentEventTraceabilityWrapper } from "../contracts/agent-event-traceability";
import { InternalUsersService } from "./internal-users-service";
import { resolvePageParameters } from "../utils/api-utils";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

export type TraceIngestInput = {
    eventId: string;
    organizationId?: string;
    actor: string;
    flowId?: string;
    executionId?: string;
    eventType: AgentTraceEventType;
    status?: string;
    startedAt?: number;
    finishedAt?: number;
    output?: string;
};

/**
 * Caller scope for reading agent trace events.
 * Non-admin callers need ITAAS entitlement (personal subscription or assigned org license).
 */
export type AgentTraceReadScope = {
    isAdmin: boolean;
    userId?: string | null;
    keycloakSub?: string | null;
};

export type AgentTraceListQuery = {
    flowId?: string;
    executionId?: string;
    organizationId?: string;
    eventType?: string;
    since?: number;
    until?: number;
};

export type AgentTraceEventDto = ReturnType<AgentTraceEvent["toObject"]>;

export type AgentTraceListResult = {
    events: AgentTraceEventDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type AgentTraceOverviewCounts = {
    total: number;
    anchored: number;
    unanchored: number;
};

export type AgentTraceExecutionTimelineResult = {
    execution_id: string;
    flow_id: string;
    events: AgentTraceEventDto[];
    total: number;
};

type AgentTraceVisibility =
    | { kind: "admin" }
    | { kind: "personal"; actor: string }
    | { kind: "organization"; organizationId: string };

export class AgentTraceabilityService {
    private static instance: AgentTraceabilityService = null;

    /** Hard cap for execution timelines (oldest-first slice). */
    public static readonly EXECUTION_TIMELINE_LIMIT = 200;

    public static getInstance(): AgentTraceabilityService {
        if (AgentTraceabilityService.instance) {
            return AgentTraceabilityService.instance;
        }
        AgentTraceabilityService.instance = new AgentTraceabilityService();
        return AgentTraceabilityService.instance;
    }

    public get contract(): AgentEventTraceabilityWrapper {
        return BlockchainConfig.getInstance().contracts.agentEventTraceability;
    }

    public getTransactionOptionsAdmin(): MethodTransactionOptions {
        const config = BlockchainConfig.getInstance();
        return {
            signKey: config.privateKeys.admin,
            complementaryAddress: config.privateKeys.adminComplementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    public async ingestAndAnchor(input: TraceIngestInput): Promise<{ stored: AgentTraceEvent; duplicated: boolean }> {
        const normalized = this.normalizeInput(input);

        const found = await AgentTraceEvent.findByEventId(normalized.eventId);
        if (found) {
            return { stored: found, duplicated: true };
        }

        const event = await AgentTraceEvent.create({
            eventId: normalized.eventId,
            organizationId: normalized.organizationId,
            actor: normalized.actor,
            flowId: normalized.flowId,
            executionId: normalized.executionId,
            eventType: normalized.eventType,
            status: normalized.status,
            startedAt: normalized.startedAt,
            finishedAt: normalized.finishedAt,
            output: normalized.output,
        });

        if (this.contract.address === ZERO_ADDRESS) {
            throw new Error("AgentEventTraceability contract not configured");
        }

        const occurredAt = normalized.finishedAt > 0 ? normalized.finishedAt : normalized.startedAt;

        const tx = await this.contract.recordEvent(
            normalized.eventId,
            normalized.eventType,
            normalized.payloadHash,
            normalized.actor,
            BigInt(occurredAt),
            this.getTransactionOptionsAdmin(),
        );

        const txHashRaw = tx.receipt.transactionHash;
        let txHash = "";
        if (typeof txHashRaw === "string") {
            txHash = txHashRaw;
        } else if (txHashRaw) {
            txHash = `0x${txHashRaw.toString("hex")}`;
        }

        event.txHash = txHash;
        event.anchoredAt = Date.now();
        event.updatedAt = Date.now();
        await event.save();

        return { stored: event, duplicated: false };
    }

    /**
     * Paginated agent trace events for Marketplace FE, scoped by admin / ITAAS entitlement.
     * @throws Error with message INVALID_EVENT_TYPE | INVALID_TIME_RANGE | ITAAS_ACCESS_REQUIRED
     */
    public async listAgentTraceEvents(
        scope: AgentTraceReadScope,
        query: AgentTraceListQuery,
        pagination: { page?: number; pageSize?: number; pageLimit: number },
    ): Promise<AgentTraceListResult> {
        const filters = await this.buildListFilters(scope, query);

        const total = await AgentTraceEvent.countFiltered(filters);
        const { page, pageSize, totalPages, skip } = resolvePageParameters(
            pagination.page,
            pagination.pageSize,
            total,
            pagination.pageLimit,
        );
        const rows = await AgentTraceEvent.findFiltered(skip, pageSize, filters);

        return {
            events: rows.map(event => event.toObject()),
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /**
     * Overview counts for agent trace events visible to the caller.
     * Only rows with `anchoredAt > 0` are treated as on-chain confirmed.
     * @throws Error with message ITAAS_ACCESS_REQUIRED
     */
    public async getAgentTraceOverviewCounts(scope: AgentTraceReadScope): Promise<AgentTraceOverviewCounts> {
        const filters = await this.buildListFilters(scope, {});
        const { anchored, unanchored } = await AgentTraceEvent.countByAnchorGrouped(filters);
        return {
            total: anchored + unanchored,
            anchored,
            unanchored,
        };
    }

    /**
     * Timeline for one execution. Returns null when no events are visible to the caller.
     * @throws Error with message INVALID_EXECUTION_ID | ITAAS_ACCESS_REQUIRED
     */
    public async getExecutionTimeline(
        scope: AgentTraceReadScope,
        executionId: string,
        options?: { flowId?: string },
    ): Promise<AgentTraceExecutionTimelineResult | null> {
        const normalizedExecutionId = ((executionId || "") + "").trim();
        if (!normalizedExecutionId) {
            throw new Error("INVALID_EXECUTION_ID");
        }

        const visibility = await this.resolveVisibility(scope);
        const flowId = ((options?.flowId || "") + "").trim();
        const rows = await AgentTraceEvent.findByExecutionId(normalizedExecutionId, {
            actor: visibility.kind === "personal" ? visibility.actor : undefined,
            organizationId: visibility.kind === "organization" ? visibility.organizationId : undefined,
            flowId: flowId || undefined,
            limit: AgentTraceabilityService.EXECUTION_TIMELINE_LIMIT,
        });

        if (rows.length === 0) {
            return null;
        }

        return {
            execution_id: normalizedExecutionId,
            flow_id: flowId || rows[0].flowId || "",
            events: rows.map(event => event.toObject()),
            total: rows.length,
        };
    }

    /**
     * Builds model filters for the caller.
     * @throws Error with message INVALID_EVENT_TYPE | INVALID_TIME_RANGE | ITAAS_ACCESS_REQUIRED
     */
    private async buildListFilters(scope: AgentTraceReadScope, query: AgentTraceListQuery): Promise<AgentTraceEventListFilters> {
        const visibility = await this.resolveVisibility(scope);

        const flowId = ((query.flowId || "") + "").trim();
        const executionId = ((query.executionId || "") + "").trim();
        const requestedOrganizationId = ((query.organizationId || "") + "").trim();
        const eventTypeRaw = ((query.eventType || "") + "").trim();
        const eventTypes = eventTypeRaw
            ? eventTypeRaw.split(",").map(value => value.trim()).filter(value => value.length > 0)
            : [];
        const since = this.normalizeOptionalTimestamp(query.since);
        const until = this.normalizeOptionalTimestamp(query.until);

        for (const eventType of eventTypes) {
            if (!isAgentTraceEventType(eventType)) {
                throw new Error("INVALID_EVENT_TYPE");
            }
        }

        if (since > 0 && until > 0 && since > until) {
            throw new Error("INVALID_TIME_RANGE");
        }

        const filters: AgentTraceEventListFilters = {};

        if (visibility.kind === "personal") {
            filters.actor = visibility.actor;
            if (requestedOrganizationId) {
                filters.organizationId = requestedOrganizationId;
            }
        } else if (visibility.kind === "organization") {
            filters.organizationId = visibility.organizationId;
        } else if (requestedOrganizationId) {
            filters.organizationId = requestedOrganizationId;
        }

        if (flowId) {
            filters.flowId = flowId;
        }
        if (executionId) {
            filters.executionId = executionId;
        }
        if (eventTypes.length > 1) {
            filters.eventTypes = eventTypes;
        } else if (eventTypes.length === 1) {
            filters.eventType = eventTypes[0];
        }
        if (since > 0) {
            filters.since = since;
        }
        if (until > 0) {
            filters.until = until;
        }

        return filters;
    }

    /**
     * Resolves read visibility from admin role or ITAAS entitlement.
     * @throws Error with message ITAAS_ACCESS_REQUIRED
     */
    private async resolveVisibility(scope: AgentTraceReadScope): Promise<AgentTraceVisibility> {
        if (scope.isAdmin) {
            return { kind: "admin" };
        }

        const userId = ((scope.userId || "") + "").trim();
        if (!userId) {
            Monitor.warning("[AGENT_TRACE] Non-admin caller without userId; denying agent trace access");
            throw new Error("ITAAS_ACCESS_REQUIRED");
        }

        const access = await InternalUsersService.getInstance().resolveItaasAccessForUser(userId);

        if (!access.allowed) {
            throw new Error("ITAAS_ACCESS_REQUIRED");
        }

        if (access.source === "organization" && access.organizationId) {
            return { kind: "organization", organizationId: access.organizationId };
        }

        if (access.source === "personal") {
            const keycloakSub = ((scope.keycloakSub || "") + "").trim();
            if (!keycloakSub) {
                Monitor.warning("[AGENT_TRACE] Personal ITAAS user without keycloakSub; denying agent trace access");
                throw new Error("ITAAS_ACCESS_REQUIRED");
            }
            return { kind: "personal", actor: keycloakSub };
        }

        throw new Error("ITAAS_ACCESS_REQUIRED");
    }

    private normalizeOptionalTimestamp(value: number | undefined): number {
        if (value === undefined || value === null) {
            return 0;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error("INVALID_TIME_RANGE");
        }

        return parsed === 0 ? 0 : Math.floor(parsed);
    }

    private normalizeInput(input: TraceIngestInput): {
        eventId: string;
        organizationId: string;
        actor: string;
        flowId: string;
        executionId: string;
        eventType: string;
        status: string;
        startedAt: number;
        finishedAt: number;
        output: string;
        payloadHash: string;
    } {
        const eventType = ((input.eventType || "") + "").trim();
        if (!eventType) {
            throw new Error("event_type is required");
        }

        const eventIdRaw = ((input.eventId || "") + "").trim();
        if (!eventIdRaw) {
            throw new Error("eventId is required");
        }

        const actor = ((input.actor || "") + "").trim();
        if (!actor) {
            throw new Error("actor is required");
        }

        const startedAt = Number(input.startedAt || 0);
        const finishedAt = Number(input.finishedAt || 0);
        if ((!Number.isFinite(startedAt) || startedAt <= 0) && (!Number.isFinite(finishedAt) || finishedAt <= 0)) {
            throw new Error("startedAt or finishedAt is required and must be a positive epoch timestamp in milliseconds");
        }

        const organizationId = ((input.organizationId || "") + "").trim();
        const flowId = ((input.flowId || "") + "").trim();
        const executionId = ((input.executionId || "") + "").trim();
        const status = ((input.status || "") + "").trim();
        const output = input.output === undefined || input.output === null ? "" : (input.output + "");

        const eventId = this.normalizeOrHashToBytes32(eventIdRaw);
        const payloadSource = JSON.stringify({
            organizationId,
            flowId,
            executionId,
            status,
            startedAt,
            finishedAt,
            output,
        });
        const payloadHash = this.normalizeOrHashToBytes32(payloadSource);

        return {
            eventId,
            organizationId,
            actor,
            flowId,
            executionId,
            eventType,
            status,
            startedAt: startedAt > 0 ? startedAt : 0,
            finishedAt: finishedAt > 0 ? finishedAt : 0,
            output,
            payloadHash,
        };
    }

    private normalizeOrHashToBytes32(value: string): string {
        const trimmed = (value || "").trim();
        if (!trimmed) {
            return ZERO_BYTES32;
        }

        if (validateBytes32(trimmed)) {
            return normalizeBytes32(trimmed);
        }

        if ((/^[0-9a-fA-F]{64}$/).test(trimmed)) {
            return normalizeBytes32(`0x${trimmed}`);
        }

        return normalizeBytes32(`0x${sha256(trimmed)}`);
    }
}
