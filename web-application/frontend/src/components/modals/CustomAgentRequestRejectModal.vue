<template>
    <ModalDialogContainer v-model:display="displayStatus">
        <div class="modal-dialog modal-md custom-agent-request-reject-modal" @click.stop>
            <div class="modal-header">
                <div class="modal-title">{{ $t("Reject custom agent request") }}</div>
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
                <p>{{ $t("Do you want to reject this custom agent request? Provide a reason for the requester.") }}</p>
                <label class="custom-agent-request-reject-label" for="custom-agent-request-reject-reason">
                    {{ $t("Rejection reason") }}
                </label>
                <textarea
                    id="custom-agent-request-reject-reason"
                    v-model="reason"
                    rows="4"
                    maxlength="2000"
                    class="form-control form-control-full-width form-textarea"
                    :disabled="submitting"
                    :aria-invalid="showReasonError ? 'true' : undefined"
                    :aria-describedby="showReasonError ? 'custom-agent-request-reject-reason-error' : undefined"
                    @keydown.ctrl.enter.prevent="confirm"
                ></textarea>
                <p v-if="showReasonError" id="custom-agent-request-reject-reason-error" class="form-error" role="alert">
                    {{ $t("A rejection reason is required") }}
                </p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="submitting" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-danger" :disabled="submitting" @click="confirm">
                    <i :class="submitting ? 'fas fa-spinner fa-spin' : 'fas fa-xmark'" aria-hidden="true"></i>
                    {{ $t("Reject") }}
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
    name: "CustomAgentRequestRejectModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "confirm"],
    props: {
        display: Boolean,
        submitting: {
            type: Boolean,
            default: false,
        },
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            reason: "",
            showReasonError: false,
        };
    },
    methods: {
        reset: function (): void {
            this.reason = "";
            this.showReasonError = false;
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
            const trimmed = (this.reason || "").trim();
            if (!trimmed) {
                this.showReasonError = true;
                return;
            }
            this.showReasonError = false;
            this.$emit("confirm", trimmed);
        },
    },
    watch: {
        display: function (isOpen: boolean): void {
            if (isOpen) {
                this.reset();
            }
        },
        reason: function (): void {
            if (this.showReasonError && (this.reason || "").trim()) {
                this.showReasonError = false;
            }
        },
    },
});
</script>

<style scoped>
.custom-agent-request-reject-label {
    display: block;
    margin-top: var(--space-16);
    margin-bottom: var(--space-8);
    font-size: 14px;
    font-weight: 600;
}

.custom-agent-request-reject-modal .modal-footer {
    justify-content: space-between;
    align-items: center;
}

.custom-agent-request-reject-modal .modal-footer .btn {
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
}
</style>
