<template>
    <article class="details-view-panel itaas-platform-flow-run-panel">
        <h3 class="details-view-panel-title">{{ $t("Run flow") }}</h3>
        <p class="details-view-content-description">
            {{ $t("Ask a question or leave empty to run the flow.") }}
        </p>

        <label class="form-group" :for="questionInputId">
            <span class="form-label">{{ $t("Question") }}</span>
            <textarea :id="questionInputId" v-model="question" class="form-control" rows="3" :disabled="running || disabled"></textarea>
        </label>

        <div class="itaas-platform-flow-run-panel__actions">
            <button type="button" class="btn btn-primary" :disabled="running || disabled || !hasFlowId" @click="runFlow">
                {{ running ? $t("Running") + "..." : $t("Run") }}
            </button>
        </div>

        <div v-if="hasResult" class="itaas-platform-flow-run-result">
            <h4 class="details-view-panel-title">{{ $t("Run result") }}</h4>
            <pre v-if="resultText" class="itaas-platform-flow-run-result__text">{{ resultText }}</pre>
            <pre v-else-if="resultJsonPretty" class="itaas-platform-flow-run-result__text">{{ resultJsonPretty }}</pre>
            <p v-else class="table-feedback">{{ $t("No textual result returned.") }}</p>
        </div>
    </article>
</template>

<script lang="ts">
import { ApiItaasFlows } from "@/api/api-group-itaas-flows";
import type { ItaasCredentialRequirement, ItaasFlowGraphNode, ItaasRunFlowBody, ItaasRunFlowResult } from "@/api/definitions";
import { AuthController } from "@/control/auth";
import { itaasBffUpstreamErrorHandlers } from "@/utils/itaas-bff-upstream-error-handlers";
import { formatItaasRunErrorMessage, parseItaasRunErrorDetails } from "@/utils/itaas-run-error";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent, type PropType } from "vue";

export default defineComponent({
    name: "ItaasPlatformFlowRunPanel",
    emits: ["run-error"],
    props: {
        flowId: {
            type: String,
            required: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        graphNodes: {
            type: Array as PropType<ItaasFlowGraphNode[]>,
            default: () => [],
        },
        credentialRequirements: {
            type: Array as PropType<ItaasCredentialRequirement[]>,
            default: () => [],
        },
    },
    data: function () {
        return {
            question: "",
            running: false,
            resultText: "",
            resultJsonPretty: "",
            hasResult: false,
            runRequestId: getUniqueStringId(),
            questionInputId: "itaas-flow-run-question-" + getUniqueStringId(),
        };
    },
    computed: {
        hasFlowId: function (): boolean {
            return (this.flowId || "").trim().length > 0;
        },
    },
    methods: {
        clearResult: function (): void {
            this.hasResult = false;
            this.resultText = "";
            this.resultJsonPretty = "";
        },
        failRun: function (err: { body?: string } | null, fallbackKey: string, namedKey: string, nodeKey: string): void {
            this.running = false;
            const details = err ? parseItaasRunErrorDetails(err.body) : null;
            this.$emit("run-error", details);
            this.$showSnackBar(
                formatItaasRunErrorMessage(
                    this.$t(fallbackKey),
                    this.$t(namedKey),
                    this.$t(nodeKey),
                    details,
                    this.graphNodes || [],
                    this.credentialRequirements || [],
                ),
            );
        },
        runFlow: function (): void {
            if (this.running || this.disabled || !this.hasFlowId) {
                return;
            }

            const normalizedFlowId = this.flowId.trim();
            Request.Abort(this.runRequestId);
            this.running = true;
            this.clearResult();
            this.$emit("run-error", null);

            const trimmedQuestion = (this.question || "").trim();
            const body: ItaasRunFlowBody = trimmedQuestion ? { question: trimmedQuestion } : {};

            Request.Pending(this.runRequestId, ApiItaasFlows.RunItaasFlow(normalizedFlowId, body))
                .onSuccess((payload) => {
                    const result = payload as ItaasRunFlowResult;
                    this.resultText = (result.text || "").trim();
                    if (!this.resultText && result.json != null) {
                        try {
                            this.resultJsonPretty = JSON.stringify(result.json, null, 2);
                        } catch (_err) {
                            this.resultJsonPretty = "";
                        }
                    }
                    this.hasResult = true;
                    this.running = false;
                    this.$emit("run-error", null);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.running = false;
                            this.$requireLogin();
                        },
                        unauthorizedBffUnauthorized: () => {
                            this.running = false;
                            this.$requireLogin();
                        },
                        forbidden: () => {
                            this.running = false;
                        },
                        forbiddenItaasAccessRequired: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Active ITAAS subscription or assigned organization license is required"));
                        },
                        forbiddenKeycloakSessionExpired: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Your session has expired. Reconnecting..."));
                            void AuthController.ReauthenticateWithKeycloak();
                        },
                        forbiddenKeycloakTokenUnavailable: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        forbiddenBffForbidden: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        },
                        badRequestInvalidQuestion: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                        badRequestInvalidFlowId: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                        badRequestBffBadRequest: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                        badRequestFlowInvalid: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("The flow graph is invalid"));
                        },
                        badRequestCredentialMissing: () => {
                            this.failRun(
                                err,
                                "This flow needs a credential",
                                "This flow needs a {0} credential",
                                "This flow needs a credential on node {0}",
                            );
                        },
                        badRequestCredentialUnresolved: () => {
                            this.failRun(
                                err,
                                "The flow credential could not be resolved",
                                "The {0} credential could not be resolved",
                                "The credential on node {0} could not be resolved",
                            );
                        },
                        badRequestCredentialInvalid: () => {
                            this.failRun(
                                err,
                                "The flow credential was rejected",
                                "The {0} credential was rejected",
                                "The credential on node {0} was rejected",
                            );
                        },
                        badRequest: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                        notFoundFlowNotFound: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Flow not found"));
                        },
                        notFound: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Flow not found"));
                        },
                        status409FlowNotDeployed: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("This flow is not deployed"));
                        },
                        status409: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("This flow is not deployed"));
                        },
                        status422ExecutionFailed: () => {
                            this.failRun(err, "The flow run failed", "The flow run failed ({0})", "The flow run failed at node {0}");
                        },
                        status422: () => {
                            this.failRun(err, "The flow run failed", "The flow run failed ({0})", "The flow run failed at node {0}");
                        },
                        tooManyRequestsLlmRateLimited: () => {
                            this.failRun(
                                err,
                                "The provider is rate limiting requests. Please try again later.",
                                "The provider is rate limiting {0} requests. Please try again later.",
                                "The provider is rate limiting requests at node {0}. Please try again later.",
                            );
                        },
                        tooManyRequests: () => {
                            this.failRun(
                                err,
                                "The provider is rate limiting requests. Please try again later.",
                                "The provider is rate limiting {0} requests. Please try again later.",
                                "The provider is rate limiting requests at node {0}. Please try again later.",
                            );
                        },
                        ...itaasBffUpstreamErrorHandlers(() => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Flows service is temporarily unavailable. Please try again later."));
                        }),
                        status503LlmUnavailable: () => {
                            this.failRun(
                                err,
                                "The model is temporarily unavailable",
                                "The {0} model is temporarily unavailable",
                                "The model is temporarily unavailable at node {0}",
                            );
                        },
                        temporalError: () => {
                            this.running = false;
                            this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.running = false;
                    this.$showSnackBar(this.$t("Temporal error occurred. Please try again later."));
                });
        },
    },
    beforeUnmount: function () {
        Request.Abort(this.runRequestId);
    },
});
</script>
