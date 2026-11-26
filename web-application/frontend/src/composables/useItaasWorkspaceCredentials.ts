import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasCredentialField, ItaasFlowSummary, ItaasWorkspaceCredential, ItaasWorkspaceCredentialType } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { ref, type Ref } from "vue";

export type WorkspaceCredentialEntry = {
    id: string;
    name: string;
    credentialType: string;
    label: string;
    fields: ItaasCredentialField[];
    hostFlowId: string;
    assignedFlowIds: string[];
};

export const UNKNOWN_WORKSPACE_CREDENTIAL_TYPE = "unknown";

export type WorkspaceCredentialTypeGroup = {
    credentialType: string;
    label: string;
    fields: ItaasCredentialField[];
    schemaConflict: boolean;
    credentials: WorkspaceCredentialEntry[];
    assignedFlowCount: number;
};

export type UseItaasWorkspaceCredentialsResult = {
    flows: Ref<ItaasFlowSummary[]>;
    credentials: Ref<WorkspaceCredentialEntry[]>;
    credentialTypes: Ref<ItaasWorkspaceCredentialType[]>;
    loading: Ref<boolean>;
    accessDenied: Ref<boolean>;
    loadError: Ref<string>;
    loadWorkspaceCredentials: (options?: { onUnauthorized?: () => void }) => void;
    abortWorkspaceCredentials: () => void;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export function workspaceCredentialDisplayName(entry: WorkspaceCredentialEntry): string {
    return resolveCredentialDisplayName(entry.name, entry.id, entry.label, entry.credentialType);
}

export function workspaceCredentialStoreName(entry: WorkspaceCredentialEntry): string {
    const stored = (entry.name || "").trim();
    if (stored && !isGenericCredentialName(stored, entry.id, entry.label, entry.credentialType)) {
        return stored;
    }
    return workspaceCredentialDisplayName(entry);
}

function shortCredentialId(credentialId: string): string {
    const id = (credentialId || "").trim();
    if (id.length <= 8) {
        return id;
    }
    return id.slice(0, 8);
}

export function workspaceCredentialListLabel(entry: WorkspaceCredentialEntry, siblings: WorkspaceCredentialEntry[]): string {
    const base = workspaceCredentialDisplayName(entry);
    const duplicates = (siblings || []).filter(function (sibling: WorkspaceCredentialEntry) {
        return workspaceCredentialDisplayName(sibling) === base;
    });
    if (duplicates.length <= 1) {
        return base;
    }
    const shortId = shortCredentialId(entry.id);
    if (!shortId) {
        return base;
    }
    return base + " · " + shortId;
}

function uniqueFlowIds(ids: string[]): string[] {
    const seen: Record<string, boolean> = {};
    const result: string[] = [];
    for (const rawId of ids) {
        const id = (rawId || "").trim();
        if (!id || seen[id]) {
            continue;
        }
        seen[id] = true;
        result.push(id);
    }
    return result;
}

export function uniqueAssignedFlowIds(credentials: WorkspaceCredentialEntry[]): string[] {
    const all: string[] = [];
    for (const credential of credentials) {
        const assigned = credential.assignedFlowIds || [];
        for (const flowId of assigned) {
            all.push(flowId);
        }
    }
    return uniqueFlowIds(all);
}

export function groupWorkspaceCredentialsByType(
    credentials: WorkspaceCredentialEntry[],
    credentialTypes: ItaasWorkspaceCredentialType[],
): WorkspaceCredentialTypeGroup[] {
    const byType = new Map<string, WorkspaceCredentialTypeGroup>();
    for (const type of credentialTypes) {
        const credentialType = (type.credentialType || "").trim();
        const fields = (type.fields || []).filter(function (field) {
            return !!(field && (field.name || "").trim());
        });
        if (!credentialType || (fields.length === 0 && !type.schemaConflict) || byType.has(credentialType)) {
            continue;
        }
        byType.set(credentialType, {
            credentialType,
            label: (type.label || credentialType).trim(),
            fields,
            schemaConflict: type.schemaConflict,
            credentials: [],
            assignedFlowCount: 0,
        });
    }
    for (const credential of credentials) {
        const credentialType = (credential.credentialType || "").trim() || UNKNOWN_WORKSPACE_CREDENTIAL_TYPE;
        const existing = byType.get(credentialType);
        if (existing) {
            existing.credentials.push(credential);
            if (!existing.label && credential.label) {
                existing.label = (credential.label || "").trim();
            }
            if (!existing.schemaConflict && existing.fields.length === 0 && credential.fields.length > 0) {
                existing.fields = credential.fields.slice();
            }
            continue;
        }
        byType.set(credentialType, {
            credentialType,
            label: (credential.label || (credentialType === UNKNOWN_WORKSPACE_CREDENTIAL_TYPE ? "" : credentialType)).trim(),
            fields: credential.fields.slice(),
            schemaConflict: false,
            credentials: [credential],
            assignedFlowCount: 0,
        });
    }

    const groups = Array.from(byType.values());
    for (const group of groups) {
        group.credentials.sort(function (a, b) {
            return workspaceCredentialListLabel(a, group.credentials).localeCompare(
                workspaceCredentialListLabel(b, group.credentials),
                undefined,
                {
                    sensitivity: "base",
                },
            );
        });
        group.assignedFlowCount = uniqueAssignedFlowIds(group.credentials).length;
    }
    groups.sort(function (a, b) {
        const labelA = (a.label || a.credentialType).trim();
        const labelB = (b.label || b.credentialType).trim();
        return labelA.localeCompare(labelB, undefined, { sensitivity: "base" });
    });
    return groups;
}

function mapCatalogCredential(item: ItaasWorkspaceCredential): WorkspaceCredentialEntry {
    return {
        id: (item.id || "").trim(),
        name: (item.name || "").trim(),
        credentialType: (item.credentialType || "").trim(),
        label: (item.label || "").trim(),
        fields: (item.fields || []).slice(),
        hostFlowId: (item.hostFlowId || "").trim(),
        assignedFlowIds: uniqueFlowIds(item.assignedFlowIds || []),
    };
}

export function useItaasWorkspaceCredentials(): UseItaasWorkspaceCredentialsResult {
    const flows = ref<ItaasFlowSummary[]>([]);
    const credentials = ref<WorkspaceCredentialEntry[]>([]);
    const credentialTypes = ref<ItaasWorkspaceCredentialType[]>([]);
    const loading = ref(false);
    const accessDenied = ref(false);
    const loadError = ref("");
    const loadRequestId = getUniqueStringId();

    const abortWorkspaceCredentials = function (): void {
        Request.Abort(loadRequestId);
    };

    const loadWorkspaceCredentials = function (options?: { onUnauthorized?: () => void }): void {
        abortWorkspaceCredentials();
        loading.value = true;
        accessDenied.value = false;
        loadError.value = "";
        let sawUnauthorized = false;

        Request.Pending(loadRequestId, ApiItaasFlows.ListItaasWorkspaceCredentials())
            .onSuccess((response) => {
                flows.value = (response.flows || []).slice().sort(function (a, b) {
                    return (a.name || a.id || "").localeCompare(b.name || b.id || "", undefined, { sensitivity: "base" });
                });
                credentials.value = (response.credentials || []).map(mapCatalogCredential).filter(function (entry) {
                    return !!entry.id;
                });
                credentialTypes.value = (response.credentialTypes || []).slice();
                loading.value = false;
            })
            .onRequestError((err, handleErr) => {
                handleErr(err, {
                    unauthorized: function () {
                        sawUnauthorized = true;
                        if (options?.onUnauthorized) {
                            options.onUnauthorized();
                        }
                    },
                    unauthorizedBffUnauthorized: function () {
                        sawUnauthorized = true;
                        if (options?.onUnauthorized) {
                            options.onUnauthorized();
                        }
                    },
                    forbidden: function () {
                        loadError.value = "Access denied";
                    },
                    forbiddenItaasAccessRequired: function () {
                        accessDenied.value = true;
                    },
                    forbiddenKeycloakSessionExpired: function () {
                        sawUnauthorized = true;
                        void AuthController.ReauthenticateWithKeycloak();
                    },
                    forbiddenKeycloakTokenUnavailable: function () {
                        loadError.value = "Access denied";
                    },
                    forbiddenBffForbidden: function () {
                        loadError.value = "Access denied";
                    },
                    ...itaasBffUpstreamErrorHandlers(function () {
                        loadError.value = "Temporal error occurred. Please try again later.";
                    }),
                    temporalError: function () {
                        loadError.value = "Temporal error occurred. Please try again later.";
                    },
                });
                if (!sawUnauthorized && !accessDenied.value && !loadError.value) {
                    loadError.value = "Temporal error occurred. Please try again later.";
                }
                flows.value = [];
                credentials.value = [];
                credentialTypes.value = [];
                loading.value = false;
            })
            .onUnexpectedError(function () {
                flows.value = [];
                credentials.value = [];
                credentialTypes.value = [];
                loadError.value = "Temporal error occurred. Please try again later.";
                loading.value = false;
            });
    };

    return {
        flows,
        credentials,
        credentialTypes,
        loading,
        accessDenied,
        loadError,
        loadWorkspaceCredentials,
        abortWorkspaceCredentials,
    };
}
