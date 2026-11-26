<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-lg itaas-platform-credential-detail-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">
                    {{ credentials.length > 0 || schemaConflict ? $t("Credential details") : $t("Create new credential") }}
                </div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="credentials.length > 0 || canCreateCredential || schemaConflict" class="modal-body modal-detail-body">
                <div class="modal-detail-summary">
                    <div class="modal-detail-summary-text">
                        <p class="modal-detail-amount">{{ typeLabel }}</p>
                        <p class="modal-detail-meta">
                            {{ savedCredentialsLabel }}
                            <template v-if="credentials.length > 0"> · {{ $t("Secret configured (hidden)") }} </template>
                        </p>
                    </div>
                </div>

                <p v-if="schemaConflict" class="form-error" role="alert">
                    {{ $t("Credential fields differ between flows. Create or overwrite this type from a flow's details.") }}
                </p>

                <section v-if="canCreateCredential" class="itaas-platform-credential-create" :aria-labelledby="createHeadingId">
                    <h3 :id="createHeadingId" class="itaas-platform-credential-create__title">
                        {{ $t("Create new credential") }}
                    </h3>
                    <p class="itaas-platform-credential-create__intro">
                        {{ $t("The secret cannot be viewed later; you can only overwrite it.") }}
                    </p>
                    <form class="itaas-platform-credential-modal-form" @submit.prevent="submitCreate">
                        <div class="form-group">
                            <label class="form-label" :for="createNameInputId">{{ $t("Name") }}</label>
                            <input
                                :id="createNameInputId"
                                v-model="createName"
                                type="text"
                                class="form-control"
                                :placeholder="$t('e.g. OpenAI, CRM, Pinecone')"
                                autocomplete="off"
                                :aria-required="true"
                                :aria-invalid="createError ? 'true' : undefined"
                                :aria-describedby="createError ? createErrorId : undefined"
                            />
                        </div>
                        <div v-for="field in createFields" :key="field.name" class="form-group itaas-platform-credential-overwrite__field">
                            <label class="form-label" :for="createFieldInputId(field.name)">{{ fieldLabel(field) }}</label>
                            <input
                                :id="createFieldInputId(field.name)"
                                v-model="createData[field.name]"
                                :type="credentialFieldInputType(field.type)"
                                class="form-control"
                                :placeholder="createFieldPlaceholder(field)"
                                autocomplete="off"
                                :aria-required="true"
                                :aria-invalid="createError ? 'true' : undefined"
                                :aria-describedby="createError ? createErrorId : undefined"
                            />
                        </div>
                        <p v-if="createError" :id="createErrorId" class="form-error" role="alert">
                            {{ createError }}
                        </p>
                        <div class="itaas-platform-credential-overwrite__actions">
                            <button type="submit" class="btn btn-primary btn-sm" :disabled="isBusy || !hasCreateDraft">
                                {{ $t("Save") }}
                            </button>
                        </div>
                    </form>
                </section>

                <section
                    v-if="credentials.length > 0"
                    class="itaas-platform-credential-flows-section"
                    :aria-label="$t('Saved credentials')"
                >
                    <div v-for="credential in credentials" :key="credential.id" class="itaas-platform-credential-flow">
                        <h3 class="itaas-platform-credential-flows-heading">
                            <button
                                type="button"
                                class="itaas-platform-credential-flow-toggle"
                                :aria-expanded="isCredentialExpanded(credential.id) ? 'true' : 'false'"
                                :aria-controls="assignedFlowsPanelId(credential.id)"
                                :aria-label="credentialToggleLabel(credential)"
                                @click="toggleCredential(credential.id)"
                            >
                                <span class="itaas-platform-credential-flows-header">
                                    <span class="itaas-platform-credential-flows-title">{{ credentialListLabel(credential) }}</span>
                                    <span v-if="assignedFlowCount(credential) > 0" class="itaas-platform-requests-count" aria-hidden="true">
                                        <span class="itaas-platform-requests-count-value">{{ assignedFlowCount(credential) }}</span>
                                    </span>
                                </span>
                                <i
                                    class="fas fa-chevron-down itaas-platform-credential-flow-chevron"
                                    :class="{ 'itaas-platform-credential-flow-chevron-open': isCredentialExpanded(credential.id) }"
                                    aria-hidden="true"
                                ></i>
                            </button>
                        </h3>
                        <div
                            v-show="isCredentialExpanded(credential.id)"
                            :id="assignedFlowsPanelId(credential.id)"
                            class="itaas-platform-credential-flow-panel"
                        >
                            <p v-if="assignedFlowViews(credential).length === 0" class="itaas-platform-info-text">
                                {{ $t("Not assigned to any flow") }}
                            </p>
                            <ul v-else class="itaas-platform-credential-assigned" tabindex="0" :aria-label="$t('Assigned flows')">
                                <li
                                    v-for="flow in assignedFlowViews(credential)"
                                    :key="flow.id"
                                    class="itaas-platform-credential-assigned-item"
                                >
                                    <div class="itaas-platform-credential-assigned-item__header">
                                        <div class="itaas-platform-credential-assigned-item__identity">
                                            <RouterLink
                                                class="link-deco"
                                                :to="flowDetailRoute(flow.id)"
                                                :title="$t('View details')"
                                                :aria-label="$t('View details') + ': ' + flow.name"
                                                @click="close"
                                            >
                                                {{ flow.name }}
                                            </RouterLink>
                                            <p v-if="flow.type" class="itaas-platform-credential-flow-panel-meta">{{ flow.type }}</p>
                                        </div>
                                        <span
                                            :class="statusBadgeClass(flow.deployed ? 'deployed' : 'not_deployed', flowDeployedToneMap)"
                                            role="status"
                                        >
                                            {{ flow.deployed ? $t("Deployed") : $t("Not deployed") }}
                                        </span>
                                    </div>
                                </li>
                            </ul>

                            <div
                                v-if="canOverwriteCredential(credential) && overwriteDrafts[credential.id]"
                                class="itaas-platform-credential-overwrite"
                            >
                                <div
                                    v-for="field in overwriteFields(credential)"
                                    :key="field.name"
                                    class="form-group itaas-platform-credential-overwrite__field"
                                >
                                    <label class="form-label" :for="fieldInputId(credential.id, field.name)">{{ fieldLabel(field) }}</label>
                                    <input
                                        :id="fieldInputId(credential.id, field.name)"
                                        v-model="overwriteDrafts[credential.id][field.name]"
                                        :type="credentialFieldInputType(field.type)"
                                        class="form-control"
                                        :placeholder="fieldPlaceholder(field)"
                                        autocomplete="off"
                                        :aria-invalid="cardErrors[credential.id] ? 'true' : undefined"
                                        :aria-describedby="cardErrors[credential.id] ? secretErrorId(credential.id) : undefined"
                                    />
                                </div>
                                <span class="itaas-platform-credential-hint">
                                    {{ $t("The saved value cannot be viewed; you can only overwrite it.") }}
                                </span>
                                <div class="itaas-platform-credential-overwrite__actions">
                                    <button
                                        type="button"
                                        class="btn btn-primary btn-sm"
                                        :disabled="isBusy || !hasOverwriteDraft(credential)"
                                        @click="submitOverwrite(credential.id)"
                                    >
                                        {{ $t("Overwrite") }}
                                    </button>
                                </div>
                                <p v-if="cardErrors[credential.id]" :id="secretErrorId(credential.id)" class="form-error" role="alert">
                                    {{ cardErrors[credential.id] }}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Close") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasCredentialField, ItaasFlowSummary } from "@/api/definitions";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import {
    uniqueAssignedFlowIds,
    workspaceCredentialListLabel,
    workspaceCredentialStoreName,
    type WorkspaceCredentialEntry,
} from "@/composables/useItaasWorkspaceCredentials";
import { AuthController } from "@/control/auth";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { statusBadgeClass, type StatusBadgeTone } from "@/utils/status-badge";
import { getUniqueStringId } from "@/utils/unique-id";
import { useVModel } from "@/utils/v-model";
import { Request } from "@asanrom/request-browser";

type AssignedFlowView = {
    id: string;
    name: string;
    type: string;
    deployed: boolean;
};

const FLOW_DEPLOYED_TONE_MAP: Record<string, StatusBadgeTone> = {
    deployed: "success",
    not_deployed: "muted",
};

function fieldsLookLikeApiKey(field: ItaasCredentialField): boolean {
    const name = ((field && field.name) || "").toLowerCase();
    const label = ((field && field.label) || "").toLowerCase();
    return name.includes("key") || name.includes("token") || name.includes("secret") || label.includes("key") || label.includes("api");
}

function sanitizeDomId(value: string): string {
    return (value || "").replace(/[^a-zA-Z0-9_-]/g, "-");
}

export default defineComponent({
    name: "ItaasPlatformCredentialDetailModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "saved"],
    props: {
        display: Boolean,
        credentials: {
            type: Array as PropType<WorkspaceCredentialEntry[]>,
            default: function () {
                return [];
            },
        },
        credentialType: {
            type: String,
            required: true,
        },
        credentialLabel: {
            type: String,
            default: "",
        },
        credentialFields: {
            type: Array as PropType<ItaasCredentialField[]>,
            default: function () {
                return [];
            },
        },
        schemaConflict: Boolean,
        flows: {
            type: Array as PropType<ItaasFlowSummary[]>,
            default: function () {
                return [];
            },
        },
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            saveRequestId: getUniqueStringId(),
            instanceId: getUniqueStringId(),
            overwriteDrafts: {} as Record<string, Record<string, string>>,
            cardErrors: {} as Record<string, string>,
            expandedCredentialIds: {} as Record<string, boolean>,
            savingId: "",
            creating: false,
            createName: "",
            createData: {} as Record<string, string>,
            createError: "",
            flowDeployedToneMap: FLOW_DEPLOYED_TONE_MAP,
        };
    },
    computed: {
        typeLabel: function (): string {
            const fromType = (this.credentialLabel || this.credentialType || "").trim();
            if (fromType) {
                return fromType;
            }
            const first = this.credentials[0];
            if (!first) {
                return "";
            }
            const fromCredential = (first.label || first.credentialType || "").trim();
            if (fromCredential) {
                return fromCredential;
            }
            return this.$t("Unknown credential type");
        },
        savedCredentialsLabel: function (): string {
            return this.$t("{0} saved credential(s)").replace("{0}", String(this.credentials.length));
        },
        isBusy: function (): boolean {
            return this.creating || !!this.savingId;
        },
        credentialTypeKey: function (): string {
            const fromType = (this.credentialType || "").trim();
            if (fromType) {
                return fromType;
            }
            const first = this.credentials[0];
            if (!first) {
                return "";
            }
            return (first.credentialType || "").trim();
        },
        createFields: function (): ItaasCredentialField[] {
            const typeFields = (this.credentialFields || []).filter(function (field: ItaasCredentialField) {
                return !!(field && (field.name || "").trim());
            });
            if (typeFields.length > 0) {
                return typeFields;
            }
            const credentials = this.credentials || [];
            for (let index = 0; index < credentials.length; index++) {
                const fields = this.overwriteFields(credentials[index]);
                if (fields.length > 0) {
                    return fields;
                }
            }
            return [];
        },
        canCreateCredential: function (): boolean {
            return !this.schemaConflict && !!this.credentialTypeKey && this.createFields.length > 0;
        },
        hasCreateDraft: function (): boolean {
            if (!(this.createName || "").trim()) {
                return false;
            }
            const data = this.createData || {};
            const fields = this.createFields;
            for (let index = 0; index < fields.length; index++) {
                if (!(data[fields[index].name] || "").trim()) {
                    return false;
                }
            }
            return true;
        },
        createHeadingId: function (): string {
            return "itaas-cred-create-heading-" + this.instanceId;
        },
        createNameInputId: function (): string {
            return "itaas-cred-create-name-" + this.instanceId;
        },
        createErrorId: function (): string {
            return "itaas-cred-create-error-" + this.instanceId;
        },
    },
    methods: {
        statusBadgeClass,
        credentialListLabel: function (credential: WorkspaceCredentialEntry): string {
            return workspaceCredentialListLabel(credential, this.credentials || []);
        },
        assignedFlowCount: function (credential: WorkspaceCredentialEntry): number {
            return uniqueAssignedFlowIds([credential]).length;
        },
        assignedFlowViews: function (credential: WorkspaceCredentialEntry): AssignedFlowView[] {
            const ids = uniqueAssignedFlowIds([credential]);
            const catalog = this.flows || [];

            return ids.map(function (flowId) {
                const summary = catalog.find(function (flow) {
                    return flow.id === flowId;
                });
                return {
                    id: flowId,
                    name: ((summary && summary.name) || flowId).trim() || flowId,
                    type: ((summary && summary.type) || "").trim(),
                    deployed: !!(summary && summary.deployed),
                };
            });
        },
        isCredentialExpanded: function (credentialId: string): boolean {
            return !!this.expandedCredentialIds[(credentialId || "").trim()];
        },
        credentialToggleLabel: function (credential: WorkspaceCredentialEntry): string {
            const name = this.credentialListLabel(credential);
            const count = this.assignedFlowCount(credential);
            if (count <= 0) {
                return name;
            }
            return name + " (" + count + ")";
        },
        assignedFlowsPanelId: function (credentialId: string): string {
            return "itaas-cred-assigned-flows-panel-" + this.instanceId + "-" + sanitizeDomId(credentialId);
        },
        toggleCredential: function (credentialId: string): void {
            const id = (credentialId || "").trim();
            if (!id) {
                return;
            }
            const next: Record<string, boolean> = Object.assign({}, this.expandedCredentialIds);
            next[id] = !next[id];
            this.expandedCredentialIds = next;
        },
        syncExpandedCredentials: function (credentials: WorkspaceCredentialEntry[]): void {
            const next: Record<string, boolean> = {};
            const previous = this.expandedCredentialIds || {};
            let keptOpen = false;
            for (let index = 0; index < credentials.length; index++) {
                const id = credentials[index].id;
                if (Object.prototype.hasOwnProperty.call(previous, id)) {
                    next[id] = !!previous[id];
                    if (next[id]) {
                        keptOpen = true;
                    }
                } else {
                    next[id] = false;
                }
            }
            if (!keptOpen && credentials.length > 0) {
                next[credentials[0].id] = true;
            }
            this.expandedCredentialIds = next;
        },
        emptyOverwriteDraft: function (credential: WorkspaceCredentialEntry): Record<string, string> {
            const nextFields: Record<string, string> = {};
            const fields = this.overwriteFields(credential);
            for (const field of fields) {
                nextFields[field.name] = "";
            }
            return nextFields;
        },
        syncOverwriteDrafts: function (credentials: WorkspaceCredentialEntry[]): void {
            const nextDrafts: Record<string, Record<string, string>> = {};
            for (const credential of credentials) {
                const previous = this.overwriteDrafts[credential.id] || {};
                const nextFields: Record<string, string> = {};
                const fields = this.overwriteFields(credential);
                for (const field of fields) {
                    nextFields[field.name] = previous[field.name] || "";
                }
                nextDrafts[credential.id] = nextFields;
            }
            this.overwriteDrafts = nextDrafts;
        },
        flowDetailRoute: function (flowId: string): { name: string; params: { flowId: string } } {
            return {
                name: "itaas-platform-flow-detail",
                params: { flowId: (flowId || "").trim() },
            };
        },
        fieldInputId: function (credentialId: string, fieldName: string): string {
            return "itaas-cred-detail-field-" + this.instanceId + "-" + sanitizeDomId(credentialId) + "-" + sanitizeDomId(fieldName);
        },
        secretErrorId: function (credentialId: string): string {
            return "itaas-cred-detail-secret-error-" + this.instanceId + "-" + sanitizeDomId(credentialId);
        },
        isSecretFieldType: function (fieldType: string): boolean {
            const normalized = (fieldType || "").trim().toLowerCase();
            return normalized === "password" || normalized === "secret";
        },
        credentialFieldInputType: function (fieldType: string): string {
            if (this.isSecretFieldType(fieldType)) {
                return "password";
            }
            return "text";
        },
        overwriteFields: function (credential: WorkspaceCredentialEntry): ItaasCredentialField[] {
            return (credential.fields || []).filter(function (field: ItaasCredentialField) {
                return !!(field && (field.name || "").trim());
            });
        },
        canOverwriteCredential: function (credential: WorkspaceCredentialEntry): boolean {
            return !this.schemaConflict && !!(credential.credentialType || "").trim() && this.overwriteFields(credential).length > 0;
        },
        hasOverwriteDraft: function (credential: WorkspaceCredentialEntry): boolean {
            const drafts = this.overwriteDrafts[credential.id] || {};
            const fields = this.overwriteFields(credential);
            for (const field of fields) {
                if ((drafts[field.name] || "").trim()) {
                    return true;
                }
            }
            return false;
        },
        fieldLabel: function (field: ItaasCredentialField): string {
            const label = (field.label || "").trim();
            if (label) {
                return label;
            }
            if (this.isSecretFieldType(field.type) || fieldsLookLikeApiKey(field)) {
                return this.$t("Password / API key");
            }
            return (field.name || "").trim() || this.$t("Password / API key");
        },
        fieldPlaceholder: function (field: ItaasCredentialField): string {
            if (this.isSecretFieldType(field.type) || fieldsLookLikeApiKey(field)) {
                return this.$t("******** (saved — type to overwrite)");
            }
            return "";
        },
        createFieldPlaceholder: function (field: ItaasCredentialField): string {
            if (this.isSecretFieldType(field.type) || fieldsLookLikeApiKey(field)) {
                return this.$t("Enter the secret");
            }
            return "";
        },
        createFieldInputId: function (fieldName: string): string {
            return "itaas-cred-create-field-" + this.instanceId + "-" + sanitizeDomId(fieldName);
        },
        syncCreateForm: function (resetValues: boolean): void {
            const previousData = this.createData || {};
            const nextData: Record<string, string> = {};
            const fields = this.createFields;
            for (let index = 0; index < fields.length; index++) {
                const name = fields[index].name;
                nextData[name] = resetValues ? "" : previousData[name] || "";
            }
            this.createData = nextData;
            if (resetValues) {
                this.createName = "";
                this.createError = "";
            }
        },
        storeHostFlowId: function (credential: WorkspaceCredentialEntry): string {
            const host = (credential.hostFlowId || "").trim();
            if (host) {
                return host;
            }
            const assigned = uniqueAssignedFlowIds([credential]);
            return assigned[0] || "";
        },
        resetLocalState: function (): void {
            this.overwriteDrafts = {};
            this.cardErrors = {};
            this.savingId = "";
            this.creating = false;
            this.createName = "";
            this.createData = {};
            this.createError = "";
            this.expandedCredentialIds = {};
        },
        storeCredential: function (
            flowId: string,
            body: { credentialType: string; credentialId?: string; name: string; data?: Record<string, string> },
            onSuccess: () => void,
            onError: (message: string) => void,
        ): void {
            const storeFlowId = (flowId || "").trim();
            if (!storeFlowId) {
                onError(this.$t("Flow not found"));
                return;
            }

            Request.Abort(this.saveRequestId);

            Request.Pending(this.saveRequestId, ApiItaasFlows.StoreItaasFlowCredentials(storeFlowId, body))
                .onSuccess(onSuccess)
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        badRequestInvalidCredentialBody: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        badRequestInvalidFlowId: () => {
                            onError(this.$t("Invalid flow ID"));
                        },
                        badRequestBffBadRequest: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        notFound: () => {
                            onError(this.$t("Credential not found"));
                        },
                        notFoundCredentialNotFound: () => {
                            onError(this.$t("Credential not found"));
                        },
                        notFoundFlowNotFound: () => {
                            onError(this.$t("Flow not found"));
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                            onError(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            onError(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        forbiddenBffForbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                            onError(this.$t("Temporal error occurred. Please try again later."));
                        }),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                            onError(this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    onError(this.$t("Temporal error occurred. Please try again later."));
                });
        },
        submitOverwrite: function (credentialId: string): void {
            if (this.isBusy) {
                return;
            }
            const id = (credentialId || "").trim();
            const credential =
                this.credentials.find(function (item: WorkspaceCredentialEntry) {
                    return item.id === id;
                }) || null;
            if (!credential) {
                return;
            }
            if (!this.canOverwriteCredential(credential)) {
                this.cardErrors[credential.id] = this.$t("Invalid credential data");
                return;
            }
            const drafts = this.overwriteDrafts[credential.id] || {};
            const data: Record<string, string> = {};
            const fields = this.overwriteFields(credential);
            for (const field of fields) {
                const value = (drafts[field.name] || "").trim();
                if (value) {
                    data[field.name] = value;
                }
            }
            if (Object.keys(data).length === 0) {
                this.cardErrors[credential.id] = this.$t("Invalid credential data");
                return;
            }

            this.cardErrors[credential.id] = "";
            this.savingId = credential.id;
            this.storeCredential(
                this.storeHostFlowId(credential),
                {
                    credentialType: credential.credentialType,
                    credentialId: credential.id,
                    name: workspaceCredentialStoreName(credential),
                    data,
                },
                () => {
                    this.savingId = "";
                    this.overwriteDrafts[credential.id] = this.emptyOverwriteDraft(credential);
                    this.$showSnackBar(this.$t("Credential saved"));
                    this.$emit("saved");
                },
                (message) => {
                    this.savingId = "";
                    this.cardErrors[credential.id] = message;
                },
            );
        },
        createUnassignedCredential: function (
            body: { credentialType: string; name: string; data: Record<string, string> },
            onSuccess: () => void,
            onError: (message: string) => void,
        ): void {
            Request.Abort(this.saveRequestId);

            Request.Pending(this.saveRequestId, ApiItaasFlows.CreateItaasWorkspaceCredential(body))
                .onSuccess(onSuccess)
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        badRequestInvalidCredentialBody: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        badRequestBffBadRequest: () => {
                            onError(this.$t("Invalid credential data"));
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                            onError(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            onError(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        forbiddenBffForbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                            onError(this.$t("Access denied"));
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                            onError(this.$t("Temporal error occurred. Please try again later."));
                        }),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                            onError(this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    onError(this.$t("Temporal error occurred. Please try again later."));
                });
        },
        submitCreate: function (): void {
            if (this.isBusy) {
                return;
            }
            if (!this.canCreateCredential) {
                this.createError = this.$t("Invalid credential data");
                return;
            }
            const name = (this.createName || "").trim();
            if (!name) {
                this.createError = this.$t("Invalid credential data");
                return;
            }
            const data: Record<string, string> = {};
            const fields = this.createFields;
            for (let index = 0; index < fields.length; index++) {
                const value = (this.createData[fields[index].name] || "").trim();
                if (!value) {
                    this.createError = this.$t("Invalid credential data");
                    return;
                }
                data[fields[index].name] = value;
            }

            this.createError = "";
            this.creating = true;
            this.createUnassignedCredential(
                {
                    credentialType: this.credentialTypeKey,
                    name: name,
                    data: data,
                },
                () => {
                    this.creating = false;
                    this.syncCreateForm(true);
                    this.$showSnackBar(this.$t("Credential saved"));
                    this.$emit("saved");
                },
                (message) => {
                    this.creating = false;
                    this.createError = message;
                },
            );
        },
        close: function (): void {
            Request.Abort(this.saveRequestId);
            this.resetLocalState();
            this.$closeModal();
        },
        stopPropagationEvent: function (e: Event): void {
            e.stopPropagation();
        },
    },
    mounted: function () {
        this.syncExpandedCredentials(this.credentials || []);
        this.syncOverwriteDrafts(this.credentials || []);
        this.syncCreateForm(true);
        if (this.display) {
            this.$autoFocus();
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
    watch: {
        display: function (isOpen: boolean): void {
            if (isOpen) {
                this.syncExpandedCredentials(this.credentials || []);
                this.syncOverwriteDrafts(this.credentials || []);
                this.syncCreateForm(true);
                this.$autoFocus();
                return;
            }
            Request.Abort(this.saveRequestId);
            this.resetLocalState();
        },
        credentials: {
            deep: true,
            handler: function (credentials: WorkspaceCredentialEntry[]): void {
                const next = credentials || [];
                this.syncExpandedCredentials(next);
                this.syncOverwriteDrafts(next);
                this.syncCreateForm(false);
            },
        },
    },
});
</script>

<style>
@import "@/style/layout/itaas-platform.css";
</style>
