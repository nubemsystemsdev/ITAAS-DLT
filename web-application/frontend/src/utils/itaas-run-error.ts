// Sanitized BFF/DLT run-error details (node + credential ids/type only)

export interface ItaasRunErrorDetails {
    nodeId?: string;
    credentialId?: string;
    credentialIds?: string[];
    credentialType?: string;
}

export interface ItaasRunErrorCredentialHint {
    credentialType: string;
    label: string;
    credentialId?: string | null;
    nodeIds?: string[];
    available?: Array<{ id: string }>;
}

const MAX_ERROR_ID_LENGTH = 128;

function sanitizeId(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, MAX_ERROR_ID_LENGTH);
}

export function parseItaasRunErrorDetails(body: unknown): ItaasRunErrorDetails | null {
    if (!body) {
        return null;
    }
    let parsed: unknown = body;
    if (typeof body === "string") {
        try {
            parsed = JSON.parse(body);
        } catch (_ex) {
            return null;
        }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
    }
    const detailsRaw = (parsed as { details?: unknown }).details;
    if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) {
        return null;
    }
    const row = detailsRaw as Record<string, unknown>;
    const details: ItaasRunErrorDetails = {};
    const nodeId = sanitizeId(row.nodeId);
    if (nodeId) {
        details.nodeId = nodeId;
    }
    const credentialId = sanitizeId(row.credentialId);
    if (credentialId) {
        details.credentialId = credentialId;
    }
    const credentialType = sanitizeId(row.credentialType);
    if (credentialType) {
        details.credentialType = credentialType;
    }
    if (Array.isArray(row.credentialIds)) {
        const ids = Array.from(new Set(row.credentialIds.map((item) => sanitizeId(item)).filter(Boolean)));
        if (ids.length === 1 && !details.credentialId) {
            details.credentialId = ids[0];
        } else if (ids.length > 1) {
            details.credentialIds = ids;
        }
    }
    if (!details.nodeId && !details.credentialId && !details.credentialIds && !details.credentialType) {
        return null;
    }
    return details;
}

export function itaasRunErrorNodeLabel(details: ItaasRunErrorDetails | null, nodes: Array<{ id: string; label: string }>): string {
    const nodeId = details && details.nodeId;
    if (!nodeId) {
        return "";
    }
    const match = nodes.find((node) => node.id === nodeId);
    const label = match && (match.label || "").trim();
    return label || nodeId;
}

function requirementMatchesId(requirement: ItaasRunErrorCredentialHint, credentialId: string): boolean {
    if ((requirement.credentialId || "").trim() === credentialId) {
        return true;
    }
    return (requirement.available || []).some((option) => option.id === credentialId);
}

function failedCredentialIdList(details: ItaasRunErrorDetails): string[] {
    const ids: string[] = [];
    if (details.credentialId) {
        ids.push(details.credentialId);
    }
    for (const id of details.credentialIds || []) {
        if (id && ids.indexOf(id) < 0) {
            ids.push(id);
        }
    }
    return ids;
}

/**
 * Requirements that can be attributed uniquely. If several types share the same
 * AgentFlow node (or the BFF lists every credential id), returns none so the UI
 * can highlight the graph node instead of painting every card.
 */
export function itaasFailedCredentialRequirements(
    details: ItaasRunErrorDetails | null,
    requirements: ItaasRunErrorCredentialHint[],
): ItaasRunErrorCredentialHint[] {
    if (!details) {
        return [];
    }
    if (details.credentialType) {
        return requirements.filter((row) => row.credentialType === details.credentialType);
    }
    const ids = failedCredentialIdList(details);
    if (ids.length) {
        const matched = requirements.filter((row) => ids.some((id) => requirementMatchesId(row, id)));
        if (matched.length === 1) {
            return matched;
        }
        return [];
    }
    if (details.nodeId) {
        const onNode = requirements.filter((row) => (row.nodeIds || []).indexOf(details.nodeId || "") >= 0);
        if (onNode.length === 1) {
            return onNode;
        }
    }
    return [];
}

export function itaasCredentialRequirementFailed(
    requirement: ItaasRunErrorCredentialHint,
    details: ItaasRunErrorDetails | null,
    requirements: ItaasRunErrorCredentialHint[],
): boolean {
    return itaasFailedCredentialRequirements(details, requirements).some((row) => row.credentialType === requirement.credentialType);
}

export function itaasRunErrorCredentialLabel(details: ItaasRunErrorDetails | null, requirements: ItaasRunErrorCredentialHint[]): string {
    if (!details) {
        return "";
    }
    const unique = itaasFailedCredentialRequirements(details, requirements);
    if (unique.length === 1) {
        return (unique[0].label || unique[0].credentialType || "").trim();
    }
    if (details.credentialType) {
        return details.credentialType;
    }
    return "";
}

export function formatItaasRunErrorMessage(
    fallback: string,
    namedTemplate: string,
    nodeTemplate: string,
    details: ItaasRunErrorDetails | null,
    nodes: Array<{ id: string; label: string }>,
    requirements: ItaasRunErrorCredentialHint[] = [],
): string {
    const credentialLabel = itaasRunErrorCredentialLabel(details, requirements);
    if (credentialLabel) {
        return namedTemplate.replace("{0}", credentialLabel);
    }
    const nodeLabel = itaasRunErrorNodeLabel(details, nodes);
    if (nodeLabel) {
        return nodeTemplate.replace("{0}", nodeLabel);
    }
    return fallback;
}
