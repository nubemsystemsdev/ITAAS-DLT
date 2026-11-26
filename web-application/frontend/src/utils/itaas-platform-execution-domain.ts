"use strict";

import type { AgentAdminItem, AgentTraceEventItem, ItaasFlowSummary } from "@/api/definitions";

/** Final execution outcomes shown in ITAAS Platform execution history. */
export const EXECUTION_HISTORY_EVENT_TYPE_LIST = ["execution.completed", "execution.stopped.error", "execution.stopped.manual"] as const;

export const EXECUTION_HISTORY_EVENT_TYPES = new Set<string>(EXECUTION_HISTORY_EVENT_TYPE_LIST);

export const EXECUTION_OUTCOME_FILTER_OPTIONS = [
    { value: "all", eventType: EXECUTION_HISTORY_EVENT_TYPE_LIST.join(",") },
    { value: "completed", eventType: "execution.completed" },
    { value: "stopped_error", eventType: "execution.stopped.error" },
    { value: "stopped_manual", eventType: "execution.stopped.manual" },
] as const;

export type ExecutionOutcomeFilterValue = (typeof EXECUTION_OUTCOME_FILTER_OPTIONS)[number]["value"];

/** Flow row for ITAAS Platform flows/credentials lists (from GET /itaas/flows). */
export type ItaasPlatformFlowSummary = {
    flowId: string;
    flowLabel: string;
    deployed: boolean;
    type?: string;
    category?: string;
    updatedAt?: string;
};

export type ItaasPlatformExecutionFilters = {
    flowId: string;
    dateFrom: string;
    dateTo: string;
    outcome: ExecutionOutcomeFilterValue;
};

export const EMPTY_ITAAS_EXECUTION_FILTERS: ItaasPlatformExecutionFilters = {
    flowId: "",
    dateFrom: "",
    dateTo: "",
    outcome: "all",
};

export const AGENT_TRACE_EVENT_LABEL_KEYS: Record<string, string> = {
    "execution.completed": "Execution completed",
    "execution.stopped.error": "Execution stopped with error",
    "execution.stopped.manual": "Execution stopped manually",
    "execution.started": "Execution started",
    "agent.prompt_submitted": "Prompt submitted",
    "agent.flow_generated": "Flow generated",
    "payment.confirmed": "Payment confirmed",
};

export type FlowLabelLookup = Record<string, string>;

export type ItaasPlatformExecutionRow = {
    id: string;
    flowLabel: string;
    flowId: string;
    executionId: string;
    status: string;
    timestamp: number;
    txHash: string;
};

export type ItaasPlatformTimelineEventRow = {
    id: string;
    eventType: string;
    eventLabel: string;
    status: string;
    timestamp: number;
    txHash: string;
    eventId: string;
};

export function resolveAgentTraceEventLabel(eventType: string, translate?: (labelKey: string) => string): string {
    const normalized = (eventType || "").trim();
    if (!normalized) {
        return "-";
    }

    const labelKey = AGENT_TRACE_EVENT_LABEL_KEYS[normalized];
    if (labelKey && translate) {
        return translate(labelKey);
    }

    return normalized;
}

export function mapAgentTraceEventToTimelineRow(
    entry: AgentTraceEventItem,
    translate?: (labelKey: string) => string,
): ItaasPlatformTimelineEventRow {
    return {
        id: entry.id,
        eventType: entry.eventType || "",
        eventLabel: resolveAgentTraceEventLabel(entry.eventType || "", translate),
        status: resolveExecutionStatus(entry) || (entry.status || "").trim().toLowerCase(),
        timestamp: resolveExecutionTimestamp(entry),
        txHash: entry.txHash || "",
        eventId: entry.eventId || "",
    };
}

export function resolveTimelineSummaryStatus(events: AgentTraceEventItem[]): string {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const status = resolveExecutionStatus(events[index]);
        if (status) {
            return status;
        }
    }

    const lastEvent = events[events.length - 1];
    return (lastEvent?.status || "").trim().toLowerCase();
}

export function resolveFlowLabelFromTimelineEvents(
    flowId: string,
    events: AgentTraceEventItem[],
    lookup?: FlowLabelLookup,
    translateEventType?: (eventType: string) => string,
): string {
    for (const entry of events) {
        const label = resolveFlowLabel(entry, lookup, translateEventType);
        if (label && label !== "-") {
            return label;
        }
    }

    const normalizedFlowId = (flowId || "").trim();
    if (normalizedFlowId && lookup && lookup[normalizedFlowId]) {
        return lookup[normalizedFlowId];
    }

    if (normalizedFlowId && !isTechnicalFlowIdentifier(normalizedFlowId)) {
        return normalizedFlowId;
    }

    return normalizedFlowId || "-";
}

export function isExecutionHistoryEvent(entry: Pick<AgentTraceEventItem, "eventType">): boolean {
    const eventType = (entry.eventType || "").trim();
    return EXECUTION_HISTORY_EVENT_TYPES.has(eventType);
}

export function filterExecutionHistoryEvents(entries: AgentTraceEventItem[]): AgentTraceEventItem[] {
    return entries.filter(isExecutionHistoryEvent);
}

export function resolveExecutionStatus(entry: Pick<AgentTraceEventItem, "status" | "eventType">): string {
    const status = (entry.status || "").trim().toLowerCase();
    if (status) {
        return status;
    }

    const eventType = (entry.eventType || "").trim();
    if (eventType === "execution.completed") {
        return "success";
    }
    if (eventType === "execution.stopped.error") {
        return "error";
    }
    if (eventType === "execution.stopped.manual") {
        return "error";
    }

    return "";
}

export function resolveExecutionTimestamp(
    entry: Pick<AgentTraceEventItem, "occurredAt" | "finishedAt" | "startedAt" | "createdAt">,
): number {
    return entry.occurredAt || entry.finishedAt || entry.startedAt || entry.createdAt || 0;
}

export function buildFlowLabelLookupFromAgents(agents: AgentAdminItem[]): FlowLabelLookup {
    const lookup: FlowLabelLookup = {};

    for (const agent of agents) {
        const name = (agent.name || "").trim();
        if (!name) {
            continue;
        }

        const id = (agent.id || "").trim();
        const code = (agent.code || "").trim();

        if (id) {
            lookup[id] = name;
        }
        if (code) {
            lookup[code] = name;
        }
    }

    return lookup;
}

function readNonEmptyString(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}

export function parseFlowLabelFromOutput(output: string | undefined): string {
    const raw = (output || "").trim();
    if (!raw) {
        return "";
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return "";
        }

        const payload = parsed as Record<string, unknown>;
        const directKeys = ["flowName", "flowLabel", "name", "title", "label"];
        for (const key of directKeys) {
            const value = readNonEmptyString(payload[key]);
            if (value) {
                return value;
            }
        }

        const flow = payload.flow;
        if (flow && typeof flow === "object" && !Array.isArray(flow)) {
            const flowRecord = flow as Record<string, unknown>;
            const nestedName = readNonEmptyString(flowRecord.name) || readNonEmptyString(flowRecord.title);
            if (nestedName) {
                return nestedName;
            }
        }
    } catch {
        return "";
    }

    return "";
}

function isTechnicalFlowIdentifier(value: string): boolean {
    const normalized = value.trim();
    if (!normalized) {
        return false;
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
        return true;
    }

    if (/^0x[0-9a-f]+$/i.test(normalized)) {
        return true;
    }

    if (/^[0-9a-f]{24,64}$/i.test(normalized)) {
        return true;
    }

    return false;
}

export function resolveFlowLabel(
    entry: Pick<AgentTraceEventItem, "flowId" | "output" | "eventType">,
    lookup?: FlowLabelLookup,
    translateEventType?: (eventType: string) => string,
): string {
    const fromOutput = parseFlowLabelFromOutput(entry.output);
    if (fromOutput) {
        return fromOutput;
    }

    const flowId = (entry.flowId || "").trim();
    if (flowId && lookup && lookup[flowId]) {
        return lookup[flowId];
    }

    if (flowId && !isTechnicalFlowIdentifier(flowId)) {
        return flowId;
    }

    const eventType = (entry.eventType || "").trim();
    if (eventType) {
        const labelKey = AGENT_TRACE_EVENT_LABEL_KEYS[eventType];
        if (labelKey && translateEventType) {
            return translateEventType(labelKey);
        }
        if (translateEventType) {
            return translateEventType(eventType);
        }
        return eventType;
    }

    return flowId || "-";
}

export function mapAgentTraceEventToExecutionRow(
    entry: AgentTraceEventItem,
    options?: {
        lookup?: FlowLabelLookup;
        translateEventType?: (eventType: string) => string;
    },
): ItaasPlatformExecutionRow {
    const flowId = (entry.flowId || "").trim();

    return {
        id: entry.id,
        flowLabel: resolveFlowLabel(entry, options?.lookup, options?.translateEventType),
        flowId: flowId,
        executionId: entry.executionId || "",
        status: resolveExecutionStatus(entry),
        timestamp: resolveExecutionTimestamp(entry),
        txHash: entry.txHash || "",
    };
}

export function dateInputToSinceMs(dateValue: string): number | undefined {
    const normalized = (dateValue || "").trim();
    if (!normalized) {
        return undefined;
    }

    const parsed = Date.parse(`${normalized}T00:00:00`);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function dateInputToUntilMs(dateValue: string): number | undefined {
    const normalized = (dateValue || "").trim();
    if (!normalized) {
        return undefined;
    }

    const parsed = Date.parse(`${normalized}T23:59:59.999`);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveOutcomeEventType(outcome: ExecutionOutcomeFilterValue): string {
    const match = EXECUTION_OUTCOME_FILTER_OPTIONS.find(function (option) {
        return option.value === outcome;
    });
    return match?.eventType || EXECUTION_HISTORY_EVENT_TYPE_LIST.join(",");
}

export function buildAgentTraceEventsQuery(filters: ItaasPlatformExecutionFilters): {
    flowId?: string;
    eventType?: string;
    since?: number;
    until?: number;
} {
    const query: {
        flowId?: string;
        eventType?: string;
        since?: number;
        until?: number;
    } = {};

    const flowId = (filters.flowId || "").trim();
    if (flowId) {
        query.flowId = flowId;
    }

    // Always scope history pages to final execution outcomes so backend pagination matches the UI.
    const eventType = resolveOutcomeEventType(filters.outcome);
    if (eventType) {
        query.eventType = eventType;
    }

    const since = dateInputToSinceMs(filters.dateFrom);
    if (since !== undefined) {
        query.since = since;
    }

    const until = dateInputToUntilMs(filters.dateTo);
    if (until !== undefined) {
        query.until = until;
    }

    return query;
}

export function mapItaasFlowSummariesToPlatformFlows(flows: ItaasFlowSummary[]): ItaasPlatformFlowSummary[] {
    return (flows || [])
        .map(function (flow) {
            const flowId = (flow.id || "").trim();
            const flowLabel = (flow.name || "").trim() || flowId;

            return {
                flowId: flowId,
                flowLabel: flowLabel,
                deployed: !!flow.deployed,
                type: flow.type,
                category: flow.category,
                updatedAt: flow.updatedAt,
            };
        })
        .filter(function (flow) {
            return !!flow.flowId;
        })
        .sort(function (left, right) {
            return left.flowLabel.localeCompare(right.flowLabel);
        });
}
