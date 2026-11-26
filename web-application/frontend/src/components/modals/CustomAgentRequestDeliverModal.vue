<template>
    <ModalDialogContainer v-model:display="displayStatus">
        <div class="modal-dialog modal-md custom-agent-request-deliver-modal" @click.stop>
            <div class="modal-header">
                <div class="modal-title">{{ $t("Deliver custom agent request") }}</div>
                <button
                    type="button"
                    class="modal-close-btn"
                    :title="$t('Close')"
                    :aria-label="$t('Close')"
                    :disabled="submitting"
                    @click="close"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>{{ $t("Enter the Flowise flow ID to assign it to the requester.") }}</p>
                <label class="custom-agent-request-deliver-label" for="custom-agent-request-deliver-flow-id">
                    {{ $t("Flow ID") }}
                </label>
                <input
                    id="custom-agent-request-deliver-flow-id"
                    v-model.trim="flowId"
                    type="text"
                    class="form-control form-control-full-width"
                    :placeholder="$t('Flowise flow ID')"
                    :disabled="submitting"
                    :aria-invalid="showFlowIdError ? 'true' : undefined"
                    :aria-describedby="showFlowIdError ? 'custom-agent-request-deliver-flow-id-error' : undefined"
                    @keydown.enter.prevent="confirm"
                />
                <p v-if="showFlowIdError" id="custom-agent-request-deliver-flow-id-error" class="form-error" role="alert">
                    {{ flowIdErrorMessage }}
                </p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="submitting" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-primary" :disabled="submitting" @click="confirm">
                    <i :class="submitting ? 'fas fa-spinner fa-spin' : 'fas fa-truck'" aria-hidden="true"></i>
                    {{ $t("Deliver") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { useVModel } from "@/utils/v-model";
import { defineComponent } from "vue";

export default defineComponent({
    name: "CustomAgentRequestDeliverModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "confirm", "clear-validation"],
    props: {
        display: Boolean,
        submitting: {
            type: Boolean,
            default: false,
        },
        validationError: {
            type: String,
            default: "",
        },
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            flowId: "",
            localRequiredError: false,
        };
    },
    computed: {
        showFlowIdError: function (): boolean {
            return this.localRequiredError || !!(this.validationError || "").trim();
        },
        flowIdErrorMessage: function (): string {
            if (this.localRequiredError) {
                return this.$t("A Flowise flow ID is required");
            }
            return (this.validationError || "").trim();
        },
    },
    methods: {
        reset: function (): void {
            this.flowId = "";
            this.localRequiredError = false;
        },
        close: function (): void {
            if (this.submitting) {
                return;
            }
            this.displayStatus = false;
        },
        confirm: function (): void {
            if (this.submitting) {
                return;
            }
            const trimmed = (this.flowId || "").trim();
            if (!trimmed) {
                this.localRequiredError = true;
                return;
            }
            this.localRequiredError = false;
            this.$emit("confirm", trimmed);
        },
    },
    watch: {
        display: function (isOpen: boolean): void {
            if (isOpen) {
                this.reset();
            }
        },
        flowId: function (): void {
            if (this.localRequiredError && (this.flowId || "").trim()) {
                this.localRequiredError = false;
            }
            if ((this.validationError || "").trim()) {
                this.$emit("clear-validation");
            }
        },
    },
});
</script>

<style scoped>
.custom-agent-request-deliver-label {
    display: block;
    margin-top: var(--space-16);
    margin-bottom: var(--space-8);
    font-size: 14px;
    font-weight: 600;
}

.custom-agent-request-deliver-modal .modal-footer {
    justify-content: space-between;
    align-items: center;
}

.custom-agent-request-deliver-modal .modal-footer .btn {
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
}
</style>
