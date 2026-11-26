<template>
    <div class="itaas-platform-credentials-panel">
        <p v-if="loading" class="itaas-platform-info-text">{{ $t("Loading credential requirements...") }}</p>
        <p v-else-if="loadError" class="form-error" role="alert">{{ loadError }}</p>
        <p v-else-if="requirements.length === 0" class="itaas-platform-info-text">
            {{ $t("No credential requirements for this flow") }}
        </p>

        <ul v-else class="itaas-platform-credentials-grid">
            <li
                v-for="requirement in paginatedRequirements"
                :key="requirement.credentialType"
                class="itaas-platform-credential-card"
                :class="{ 'itaas-platform-credential-card--failed': isFailedRequirement(requirement) }"
            >
                <header class="itaas-platform-credential-card__header">
                    <div class="itaas-platform-credential-card__intro">
                        <h3 class="itaas-platform-credential-card__title">{{ requirement.label }}</h3>
                        <p class="itaas-platform-credential-card__meta">
                            <template v-if="requirement.assigned && assignedName(requirement)">
                                {{ $t("Assigned") }}: {{ assignedName(requirement) }}
                            </template>
                            <template v-else-if="requirement.assigned">
                                {{ $t("Secret configured (hidden)") }}
                            </template>
                            <template v-else>
                                {{ $t("Credential not configured yet") }}
                            </template>
                        </p>
                        <p v-if="isFailedRequirement(requirement)" class="form-error itaas-platform-credential-card__failed" role="alert">
                            {{ $t("This credential was involved in the last failed run") }}
                        </p>
                    </div>
                    <span
                        :class="requirement.assigned ? 'status-badge status-badge--success' : 'status-badge status-badge--muted'"
                        role="status"
                    >
                        {{ requirement.assigned ? $t("Connected") : $t("Not configured") }}
                    </span>
                </header>

                <div v-if="requirement.available.length > 0" class="itaas-platform-credential-form">
                    <label class="form-group" :for="selectId(requirement.credentialType)">
                        <span class="form-label">{{ $t("Use existing credential") }}</span>
                        <select
                            :id="selectId(requirement.credentialType)"
                            v-model="formState[requirement.credentialType].credentialId"
                            class="form-control"
                            :aria-invalid="formErrors[requirement.credentialType] ? 'true' : undefined"
                            :aria-describedby="formErrors[requirement.credentialType] ? errorId(requirement.credentialType) : undefined"
                        >
                            <option v-for="option in requirement.available" :key="option.id" :value="option.id">
                                {{ optionDisplayName(option, requirement) }}
                            </option>
                        </select>
                    </label>
                    <p
                        v-if="formErrors[requirement.credentialType]"
                        :id="errorId(requirement.credentialType)"
                        class="form-error"
                        role="alert"
                    >
                        {{ formErrors[requirement.credentialType] }}
                    </p>
                    <div class="itaas-platform-credential-form__actions itaas-platform-credential-form__actions--start">
                        <button
                            v-if="selectedCredentialIsAssigned(requirement)"
                            type="button"
                            class="btn btn-danger btn-sm"
                            :disabled="!!savingType"
                            @click="confirmDisconnect(requirement)"
                        >
                            {{ $t("Disconnect credential") }}
                        </button>
                        <button
                            v-else
                            type="button"
                            class="btn btn-tertiary btn-sm"
                            :disabled="!!savingType"
                            @click="submitReuse(requirement)"
                        >
                            {{ $t("Assign") }}
                        </button>
                        <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            :disabled="!!savingType"
                            @click="openEdit(requirement.credentialType)"
                        >
                            {{ requirement.assigned ? $t("Overwrite") : $t("Create new credential") }}
                        </button>
                    </div>
                </div>

                <div v-else class="itaas-platform-credential-form">
                    <p
                        v-if="formErrors[requirement.credentialType]"
                        :id="errorId(requirement.credentialType)"
                        class="form-error"
                        role="alert"
                    >
                        {{ formErrors[requirement.credentialType] }}
                    </p>
                    <div class="itaas-platform-credential-form__actions itaas-platform-credential-form__actions--start">
                        <button
                            v-if="requirement.assigned && requirement.credentialId"
                            type="button"
                            class="btn btn-danger btn-sm"
                            :disabled="!!savingType"
                            @click="confirmDisconnect(requirement)"
                        >
                            {{ $t("Disconnect credential") }}
                        </button>
                        <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            :disabled="!!savingType"
                            @click="openEdit(requirement.credentialType)"
                        >
                            {{ requirement.assigned ? $t("Overwrite") : $t("Configure credential") }}
                        </button>
                    </div>
                </div>
            </li>
        </ul>

        <PaginationBar
            v-if="requirements.length > 0"
            :page="credentialsPage"
            :total-pages="credentialsTotalPages"
            :can-go-prev="credentialsCanGoPrev"
            :can-go-next="credentialsCanGoNext"
            :visible="credentialsPaginationVisible"
            :aria-label="$t('Flow credentials pagination')"
            @prev="onCredentialsPaginationPrev"
            @next="onCredentialsPaginationNext"
        />

        <ModalDialogContainer :display="editingType.length > 0" @close="closeEdit" @update:display="onModalDisplayUpdate">
            <div class="modal-dialog itaas-platform-credential-modal-dialog" @click="stopPropagationEvent">
                <div class="modal-header">
                    <div class="modal-title">
                        {{ editingRequirement && editingRequirement.assigned ? $t("Overwrite") : $t("Add credential") }}
                    </div>
                    <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="closeEdit">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body modal-detail-body itaas-platform-credential-modal-body">
                    <p class="itaas-platform-credential-modal-intro">
                        <template v-if="editingRequirement && editingRequirement.assigned">
                            {{ $t("You can change the name and overwrite the secret value.") }}
                        </template>
                        <template v-else>
                            {{ $t("The secret cannot be viewed later; you can only overwrite it.") }}
                        </template>
                    </p>
                    <form v-if="editingRequirement" class="itaas-platform-credential-modal-form" @submit.prevent="submitCreateFromEdit">
                        <label class="form-group" :for="nameId(editingRequirement.credentialType)">
                            <span class="form-label">{{ $t("Name") }}</span>
                            <input
                                :id="nameId(editingRequirement.credentialType)"
                                v-model="formState[editingRequirement.credentialType].name"
                                type="text"
                                class="form-control"
                                :placeholder="$t('e.g. OpenAI, CRM, Pinecone')"
                                required
                                autocomplete="off"
                                :aria-invalid="formErrors[editingRequirement.credentialType] ? 'true' : undefined"
                                :aria-describedby="
                                    formErrors[editingRequirement.credentialType]
                                        ? editErrorId(editingRequirement.credentialType)
                                        : undefined
                                "
                            />
                        </label>
                        <label
                            v-for="field in editingRequirement.fields"
                            :key="field.name"
                            class="form-group"
                            :for="fieldId(editingRequirement.credentialType, field.name)"
                        >
                            <span class="form-label">{{ field.label }}</span>
                            <input
                                :id="fieldId(editingRequirement.credentialType, field.name)"
                                v-model="formState[editingRequirement.credentialType].data[field.name]"
                                :type="credentialFieldInputType(field.type)"
                                class="form-control"
                                :placeholder="secretFieldPlaceholder(editingRequirement, field.type)"
                                required
                                autocomplete="off"
                            />
                            <span
                                v-if="editingRequirement.assigned && isSecretFieldType(field.type)"
                                class="itaas-platform-credential-hint"
                            >
                                {{ $t("The saved value cannot be viewed; you can only overwrite it.") }}
                            </span>
                        </label>
                        <p
                            v-if="formErrors[editingRequirement.credentialType]"
                            :id="editErrorId(editingRequirement.credentialType)"
                            class="form-error"
                            role="alert"
                        >
                            {{ formErrors[editingRequirement.credentialType] }}
                        </p>
                    </form>
                </div>
                <div class="modal-footer itaas-platform-credential-modal-footer">
                    <button type="button" class="btn btn-tertiary" :disabled="savingType === editingType" @click="closeEdit">
                        {{ $t("Cancel") }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="!editingRequirement || savingType === editingType"
                        @click="submitCreateFromEdit"
                    >
                        {{ $t("Save") }}
                    </button>
                </div>
            </div>
        </ModalDialogContainer>
    </div>
</template>

<script lang="ts">
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasCredentialRequirement } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import PaginationBar from "@/components/layout/PaginationBar.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { itaasCredentialRequirementFailed, type ItaasRunErrorDetails } from "@/utils/itaas-run-error";
import { FLOW_CREDENTIALS_PAGE_SIZE } from "@/constants/ui";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, type PropType } from "vue";

type CredentialFormMode = "reuse" | "create" | "update";

type CredentialFormState = {
    mode: CredentialFormMode;
    credentialId: string;
    name: string;
    data: Record<string, string>;
};

export default defineComponent({
    name: "ItaasPlatformFlowCredentialsPanel",
    components: {
        ModalDialogContainer,
        PaginationBar,
    },
    emits: ["credentials-changed", "requirements-loaded"],
    props: {
        flowId: {
            type: String as PropType<string>,
            required: true,
        },
        failedNodeId: {
            type: String,
            default: "",
        },
        failedCredentialIds: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        failedCredentialType: {
            type: String,
            default: "",
        },
    },
    data: function () {
        return {
            loadRequestId: getUniqueStringId(),
            saveRequestId: getUniqueStringId(),
            loading: true,
            loadError: "",
            requirements: [] as ItaasCredentialRequirement[],
            formState: {} as Record<string, CredentialFormState>,
            formErrors: {} as Record<string, string>,
            savingType: "",
            editingType: "",
            credentialsPage: 1,
        };
    },
    computed: {
        credentialsPageSize: function (): number {
            return FLOW_CREDENTIALS_PAGE_SIZE;
        },
        credentialsTotalPages: function (): number {
            return Math.max(Math.ceil(this.requirements.length / this.credentialsPageSize), 1);
        },
        paginatedRequirements: function (): ItaasCredentialRequirement[] {
            const start = (this.credentialsPage - 1) * this.credentialsPageSize;
            return this.requirements.slice(start, start + this.credentialsPageSize);
        },
        credentialsPaginationVisible: function (): boolean {
            return this.credentialsTotalPages > 1;
        },
        credentialsCanGoPrev: function (): boolean {
            return this.credentialsPage > 1 && !this.loading;
        },
        credentialsCanGoNext: function (): boolean {
            return this.credentialsPage < this.credentialsTotalPages && !this.loading;
        },
        editingRequirement: function (): ItaasCredentialRequirement | null {
            const type = (this.editingType || "").trim();
            if (!type) {
                return null;
            }
            return this.requirements.find((item) => item.credentialType === type) || null;
        },
        failedRunDetails: function (): ItaasRunErrorDetails | null {
            const details: ItaasRunErrorDetails = {};
            const nodeId = (this.failedNodeId || "").trim();
            if (nodeId) {
                details.nodeId = nodeId;
            }
            const credentialType = (this.failedCredentialType || "").trim();
            if (credentialType) {
                details.credentialType = credentialType;
            }
            const ids = (this.failedCredentialIds || []).filter((id) => !!id);
            if (ids.length === 1) {
                details.credentialId = ids[0];
            } else if (ids.length > 1) {
                details.credentialIds = ids;
            }
            if (!details.nodeId && !details.credentialId && !details.credentialIds && !details.credentialType) {
                return null;
            }
            return details;
        },
    },
    methods: {
        resetCredentialsPage: function (): void {
            this.credentialsPage = 1;
        },
        clampCredentialsPage: function (): void {
            if (this.credentialsPage > this.credentialsTotalPages) {
                this.credentialsPage = this.credentialsTotalPages;
            }
        },
        onCredentialsPaginationPrev: function (): void {
            if (!this.credentialsCanGoPrev) {
                return;
            }
            this.credentialsPage--;
        },
        onCredentialsPaginationNext: function (): void {
            if (!this.credentialsCanGoNext) {
                return;
            }
            this.credentialsPage++;
        },
        selectId: function (credentialType: string): string {
            return `itaas-cred-select-${this.flowId}-${credentialType}`;
        },
        errorId: function (credentialType: string): string {
            return `itaas-cred-error-${this.flowId}-${credentialType}`;
        },
        editErrorId: function (credentialType: string): string {
            return `itaas-cred-edit-error-${this.flowId}-${credentialType}`;
        },
        nameId: function (credentialType: string): string {
            return `itaas-cred-name-${this.flowId}-${credentialType}`;
        },
        fieldId: function (credentialType: string, fieldName: string): string {
            return `itaas-cred-field-${this.flowId}-${credentialType}-${fieldName}`;
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
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
        secretFieldPlaceholder: function (requirement: ItaasCredentialRequirement, fieldType: string): string {
            if (!requirement.assigned || !this.isSecretFieldType(fieldType)) {
                return this.$t("Enter the secret");
            }
            return this.$t("******** (saved — type to overwrite)");
        },
        assignedName: function (requirement: ItaasCredentialRequirement): string {
            const assignedId = (requirement.credentialId || "").trim();
            if (!assignedId) {
                return "";
            }
            const match = (requirement.available || []).find((option) => option.id === assignedId);
            if (!match) {
                return "";
            }
            return this.optionDisplayName(match, requirement);
        },
        selectedCredentialIsAssigned: function (requirement: ItaasCredentialRequirement): boolean {
            const assignedId = (requirement.credentialId || "").trim();
            const selectedId = (this.formState[requirement.credentialType]?.credentialId || "").trim();
            return requirement.assigned && !!assignedId && selectedId === assignedId;
        },
        isFailedRequirement: function (requirement: ItaasCredentialRequirement): boolean {
            return itaasCredentialRequirementFailed(requirement, this.failedRunDetails, this.requirements);
        },
        revealFailedCredential: function (): void {
            const index = this.requirements.findIndex((requirement) => this.isFailedRequirement(requirement));
            if (index < 0) {
                return;
            }
            this.credentialsPage = Math.floor(index / this.credentialsPageSize) + 1;
        },
        optionDisplayName: function (option: { id: string; name: string }, requirement: ItaasCredentialRequirement): string {
            const optionName = (option.name || "").trim();
            const optionId = (option.id || "").trim();
            if (
                optionName &&
                optionName !== optionId &&
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(optionName)
            ) {
                return optionName;
            }
            return (requirement.label || requirement.credentialType || optionName || optionId).trim();
        },
        initFormState: function (entries: ItaasCredentialRequirement[]): void {
            const nextState: Record<string, CredentialFormState> = {};
            for (const requirement of entries) {
                const data: Record<string, string> = {};
                for (const field of requirement.fields || []) {
                    data[field.name] = "";
                }
                const available = requirement.available || [];
                const assignedId = (requirement.credentialId || "").trim();
                const assignedOption = assignedId ? available.find((option) => option.id === assignedId) : undefined;
                const selectedId = assignedOption ? assignedId : available[0] ? available[0].id : "";
                const initialName = assignedOption
                    ? this.optionDisplayName(assignedOption, requirement)
                    : (requirement.label || requirement.credentialType || "").trim();
                nextState[requirement.credentialType] = {
                    mode: "create",
                    credentialId: selectedId,
                    name: initialName,
                    data: data,
                };
            }
            this.formState = nextState;
            this.formErrors = {};
            this.editingType = "";
        },
        resetCredentialFormFields: function (credentialType: string): void {
            const requirement = this.requirements.find((item) => item.credentialType === credentialType);
            const state = this.formState[credentialType];
            if (!requirement || !state) {
                return;
            }
            const available = requirement.available || [];
            const assignedId = (requirement.credentialId || "").trim();
            const assignedOption = assignedId ? available.find((option) => option.id === assignedId) : undefined;
            state.name = assignedOption
                ? this.optionDisplayName(assignedOption, requirement)
                : (requirement.label || requirement.credentialType || "").trim();
            for (const field of requirement.fields || []) {
                state.data[field.name] = "";
            }
            this.formErrors[credentialType] = "";
        },
        openEdit: function (credentialType: string): void {
            this.resetCredentialFormFields(credentialType);
            this.editingType = credentialType;
        },
        closeEdit: function (): void {
            const type = (this.editingType || "").trim();
            this.editingType = "";
            if (type) {
                this.resetCredentialFormFields(type);
            }
        },
        onModalDisplayUpdate: function (value: boolean): void {
            if (!value) {
                this.closeEdit();
            }
        },
        submitReuse: function (requirement: ItaasCredentialRequirement): void {
            const state = this.formState[requirement.credentialType];
            if (!state) {
                return;
            }
            state.mode = "reuse";
            this.submitRequirement(requirement);
        },
        submitCreateFromEdit: function (): void {
            if (!this.editingRequirement) {
                return;
            }
            const requirement = this.editingRequirement;
            const state = this.formState[requirement.credentialType];
            if (!state) {
                return;
            }
            if (!state.name.trim()) {
                this.formErrors[requirement.credentialType] = this.$t("Invalid credential data");
                return;
            }
            for (const field of requirement.fields || []) {
                const value = (state.data[field.name] || "").trim();
                if (!value) {
                    this.formErrors[requirement.credentialType] = this.$t("Invalid credential data");
                    return;
                }
            }
            const assignedId = (requirement.credentialId || "").trim();
            if (requirement.assigned && assignedId) {
                state.mode = "update";
            } else {
                state.mode = "create";
            }
            this.submitRequirement(requirement);
        },
        confirmDisconnect: function (requirement: ItaasCredentialRequirement): void {
            if (!requirement.assigned || !requirement.credentialId || this.savingType) {
                return;
            }
            this.$askUserConfirmation({
                title: this.$t("Disconnect credential"),
                message: this.$t("The credential will be disconnected from this flow. It will remain saved for reuse."),
                callback: () => this.disconnectCredential(requirement),
            });
        },
        disconnectCredential: function (requirement: ItaasCredentialRequirement): void {
            const credentialId = (requirement.credentialId || "").trim();
            if (!credentialId || this.savingType) {
                return;
            }

            this.formErrors[requirement.credentialType] = "";
            Request.Abort(this.saveRequestId);
            this.savingType = requirement.credentialType;
            Request.Pending(this.saveRequestId, ApiItaasFlows.DisconnectItaasFlowCredential(this.flowId, credentialId))
                .onSuccess(() => {
                    this.savingType = "";
                    this.$showSnackBar(this.$t("Credential disconnected"));
                    this.loadCredentials();
                    this.$emit("credentials-changed");
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        unauthorizedBffUnauthorized: () => this.$requireLogin(),
                        badRequest: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Unable to disconnect credential");
                        },
                        badRequestInvalidFlowId: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid flow ID");
                        },
                        badRequestInvalidCredentialId: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid credential");
                        },
                        badRequestBffBadRequest: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Unable to disconnect credential");
                        },
                        notFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Credential not found");
                        },
                        notFoundFlowNotFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Flow not found");
                        },
                        notFoundCredentialNotFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Credential not found");
                        },
                        forbidden: () => this.$showMessageModal(this.$t("Error"), this.$t("Access denied")),
                        forbiddenItaasAccessRequired: () =>
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required")),
                        forbiddenKeycloakSessionExpired: () => {
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => this.$showMessageModal(this.$t("Error"), this.$t("Access denied")),
                        forbiddenBffForbidden: () => this.$showMessageModal(this.$t("Error"), this.$t("Access denied")),
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.formErrors[requirement.credentialType] = this.$t("Temporal error occurred. Please try again later.");
                        }),
                        temporalError: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Temporal error occurred. Please try again later.");
                        },
                    });
                    this.savingType = "";
                })
                .onUnexpectedError(() => {
                    this.formErrors[requirement.credentialType] = this.$t("Temporal error occurred. Please try again later.");
                    this.savingType = "";
                });
        },
        loadCredentials: function (): void {
            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.loadError = "";
            this.requirements = [];

            Request.Pending(this.loadRequestId, ApiItaasFlows.GetItaasFlowCredentials(this.flowId))
                .onSuccess((response) => {
                    this.requirements = response.requirements || [];
                    this.initFormState(this.requirements);
                    this.clampCredentialsPage();
                    this.$emit("requirements-loaded", this.requirements);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestInvalidFlowId: () => {
                            this.loadError = this.$t("Invalid flow ID");
                        },
                        badRequestBffBadRequest: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                        badRequestFlowInvalid: () => {
                            this.loadError = this.$t("The flow graph is invalid");
                        },
                        notFound: () => {
                            this.loadError = this.$t("Flow not found");
                        },
                        notFoundFlowNotFound: () => {
                            this.loadError = this.$t("Flow not found");
                        },
                        forbidden: () => {
                            this.loadError = this.$t("Access denied");
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.loadError = this.$t("Active ITAAS subscription or assigned organization license is required");
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.loadError = this.$t("Your session has expired. Reconnecting...");
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.loadError = this.$t("Access denied");
                        },
                        forbiddenBffForbidden: () => {
                            this.loadError = this.$t("Access denied");
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        }),
                        temporalError: () => {
                            this.loadError = this.$t("Temporal error occurred. Please try again later.");
                        },
                    });
                    this.loading = false;
                })
                .onUnexpectedError(() => {
                    this.loadError = this.$t("Temporal error occurred. Please try again later.");
                    this.loading = false;
                });
        },
        submitRequirement: function (requirement: ItaasCredentialRequirement): void {
            const state = this.formState[requirement.credentialType];
            if (!state || this.savingType) {
                return;
            }

            this.formErrors[requirement.credentialType] = "";
            Request.Abort(this.saveRequestId);
            this.savingType = requirement.credentialType;

            let body:
                | { credentialType: string; credentialId: string }
                | { credentialType: string; credentialId: string; name: string; data: Record<string, string> }
                | { credentialType: string; name: string; data: Record<string, string> };

            if (state.mode === "reuse") {
                body = {
                    credentialType: requirement.credentialType,
                    credentialId: (state.credentialId || "").trim(),
                };
            } else if (state.mode === "update") {
                const data: Record<string, string> = {};
                for (const field of requirement.fields || []) {
                    const value = (state.data[field.name] || "").trim();
                    if (value) {
                        data[field.name] = value;
                    }
                }
                body = {
                    credentialType: requirement.credentialType,
                    credentialId: (requirement.credentialId || state.credentialId || "").trim(),
                    name: (state.name || "").trim(),
                    data,
                };
            } else {
                body = {
                    credentialType: requirement.credentialType,
                    name: (state.name || "").trim(),
                    data: { ...state.data },
                };
            }

            const onStoreSuccess = (): void => {
                this.savingType = "";
                this.$showSnackBar(state.mode === "reuse" ? this.$t("Credential assigned") : this.$t("Credential saved and assigned"));
                this.closeEdit();
                this.loadCredentials();
                this.$emit("credentials-changed");
            };

            Request.Pending(this.saveRequestId, ApiItaasFlows.StoreItaasFlowCredentials(this.flowId, body))
                .onSuccess(onStoreSuccess)
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid credential data");
                        },
                        badRequestInvalidCredentialBody: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid credential data");
                        },
                        badRequestInvalidFlowId: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid flow ID");
                        },
                        badRequestBffBadRequest: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Invalid credential data");
                        },
                        notFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Credential not found");
                        },
                        notFoundCredentialNotFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Credential not found");
                        },
                        notFoundFlowNotFound: () => {
                            this.formErrors[requirement.credentialType] = this.$t("Flow not found");
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        forbiddenBffForbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        }),
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                    this.savingType = "";
                })
                .onUnexpectedError(() => {
                    this.formErrors[requirement.credentialType] = this.$t("Temporal error occurred. Please try again later.");
                    this.savingType = "";
                });
        },
    },
    mounted: function () {
        this.loadCredentials();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.saveRequestId);
    },
    watch: {
        flowId: function (): void {
            this.resetCredentialsPage();
            this.loadCredentials();
        },
        requirements: {
            handler: function (): void {
                this.clampCredentialsPage();
                this.revealFailedCredential();
            },
        },
        failedNodeId: function (): void {
            this.revealFailedCredential();
        },
        failedCredentialType: function (): void {
            this.revealFailedCredential();
        },
        failedCredentialIds: {
            handler: function (): void {
                this.revealFailedCredential();
            },
        },
    },
});
</script>
