// Merge per-flow BFF credential requirements into a workspace catalog

"use strict";

import type { BffCredentialField, BffCredentialRequirement, BffFlowSummary } from "../services/bff-flows-client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ItaasWorkspaceCredential {
    id: string;
    name: string;
    credentialType: string;
    label: string;
    fields: BffCredentialField[];
    hostFlowId: string;
    assignedFlowIds: string[];
}

export interface ItaasWorkspaceCredentialType {
    credentialType: string;
    label: string;
    fields: BffCredentialField[];
    schemaConflict: boolean;
}

export interface ItaasWorkspaceCredentialsCatalog {
    workspaceId: string;
    flows: BffFlowSummary[];
    credentials: ItaasWorkspaceCredential[];
    credentialTypes: ItaasWorkspaceCredentialType[];
}

export type CatalogTypeMeta = {
    credentialType: string;
    label: string;
    fields: BffCredentialField[];
    schemaConflict: boolean;
    hostFlowIds: string[];
};

function sameCredentialFields(left: BffCredentialField[], right: BffCredentialField[]): boolean {
    const signature = (fields: BffCredentialField[]): string[] => fields
        .map((field) => JSON.stringify([(field.name || "").trim(), (field.type || "").trim().toLowerCase()]))
        .sort();
    const leftSignature = signature(left);
    const rightSignature = signature(right);
    return leftSignature.length === rightSignature.length
        && leftSignature.every((field, index) => field === rightSignature[index]);
}

function looksLikeCredentialId(value: string, credentialId: string): boolean {
    const normalized = (value || "").trim();
    if (!normalized) {
        return true;
    }
    if (normalized === credentialId) {
        return true;
    }
    return UUID_PATTERN.test(normalized);
}

function isGenericCredentialName(value: string, credentialId: string, typeLabel: string, credentialType: string): boolean {
    if (looksLikeCredentialId(value, credentialId)) {
        return true;
    }
    const normalized = (value || "").trim().toLowerCase();
    if (!normalized) {
        return true;
    }
    if (normalized === (typeLabel || "").trim().toLowerCase()) {
        return true;
    }
    return normalized === (credentialType || "").trim().toLowerCase();
}

function pickStoredCredentialName(
    currentName: string,
    incomingName: string,
    credentialId: string,
    typeLabel: string,
    credentialType: string,
): string {
    const incomingGeneric = isGenericCredentialName(incomingName, credentialId, typeLabel, credentialType);
    const currentGeneric = isGenericCredentialName(currentName, credentialId, typeLabel, credentialType);
    if (!incomingGeneric) {
        return incomingName;
    }
    if (!currentGeneric) {
        return currentName;
    }
    return incomingName || currentName;
}

function resolveCredentialDisplayName(
    optionName: string | undefined,
    credentialId: string,
    typeLabel: string,
    credentialType: string,
): string {
    const fromOption = (optionName || "").trim();
    if (fromOption && !isGenericCredentialName(fromOption, credentialId, typeLabel, credentialType)) {
        return fromOption;
    }
    const fromLabel = (typeLabel || "").trim();
    if (fromLabel) {
        return fromLabel;
    }
    const fromType = (credentialType || "").trim();
    if (fromType) {
        return fromType;
    }
    return credentialId;
}

export function mergeUniqueFlows(flows: BffFlowSummary[]): BffFlowSummary[] {
    const byId = new Map<string, BffFlowSummary>();
    for (const flow of flows) {
        const id = (flow.id || "").trim();
        if (!id || byId.has(id)) {
            continue;
        }
        byId.set(id, flow);
    }
    return Array.from(byId.values()).sort(function (a, b) {
        return (a.name || a.id || "").localeCompare(b.name || b.id || "", undefined, { sensitivity: "base" });
    });
}

export function mergeFlowCredentialRequirements(
    typeMap: Map<string, CatalogTypeMeta>,
    credentialMap: Map<string, ItaasWorkspaceCredential>,
    flowId: string,
    requirements: BffCredentialRequirement[],
): void {
    for (const requirement of requirements || []) {
        const credentialType = (requirement.credentialType || "").trim();
        if (!credentialType) {
            continue;
        }

        const existingType = typeMap.get(credentialType);
        if (existingType) {
            if (!existingType.hostFlowIds.includes(flowId)) {
                existingType.hostFlowIds.push(flowId);
            }
            const incomingFields = requirement.fields || [];
            if (!existingType.schemaConflict && incomingFields.length > 0) {
                if (existingType.fields.length === 0) {
                    existingType.fields = incomingFields.slice();
                } else if (!sameCredentialFields(existingType.fields, incomingFields)) {
                    existingType.fields = [];
                    existingType.schemaConflict = true;
                }
            }
            if (existingType.label === credentialType && requirement.label) {
                existingType.label = requirement.label.trim() || credentialType;
            }
        } else {
            typeMap.set(credentialType, {
                credentialType,
                label: (requirement.label || credentialType).trim(),
                fields: (requirement.fields || []).slice(),
                schemaConflict: false,
                hostFlowIds: [flowId],
            });
        }

        const typeMeta = typeMap.get(credentialType);
        if (!typeMeta) {
            continue;
        }

        for (const option of requirement.available || []) {
            const optionId = (option.id || "").trim();
            if (!optionId) {
                continue;
            }
            const displayName = resolveCredentialDisplayName(option.name, optionId, typeMeta.label, credentialType);
            const existing = credentialMap.get(optionId);
            if (existing) {
                if (requirement.credentialId === optionId && !existing.assignedFlowIds.includes(flowId)) {
                    existing.assignedFlowIds.push(flowId);
                }
                existing.name = pickStoredCredentialName(existing.name, displayName, existing.id, typeMeta.label, credentialType);
                continue;
            }
            credentialMap.set(optionId, {
                id: optionId,
                name: displayName,
                credentialType,
                label: typeMeta.label,
                fields: typeMeta.fields.slice(),
                hostFlowId: flowId,
                assignedFlowIds: requirement.assigned && requirement.credentialId === optionId ? [flowId] : [],
            });
        }

        const assignedId = (requirement.credentialId || "").trim();
        if (requirement.assigned && assignedId && !credentialMap.has(assignedId)) {
            credentialMap.set(assignedId, {
                id: assignedId,
                name: resolveCredentialDisplayName(undefined, assignedId, typeMeta.label, credentialType),
                credentialType,
                label: typeMeta.label,
                fields: typeMeta.fields.slice(),
                hostFlowId: flowId,
                assignedFlowIds: [flowId],
            });
        }
    }
}

export function sortWorkspaceCredentials(credentials: ItaasWorkspaceCredential[]): ItaasWorkspaceCredential[] {
    return credentials.slice().sort(function (a, b) {
        return (a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: "base" });
    });
}
