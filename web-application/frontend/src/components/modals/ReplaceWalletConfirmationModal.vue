<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="true">
        <div class="modal-dialog modal-md replace-wallet-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Replace current wallet") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="replace-wallet-warning">
                    <i class="fas fa-triangle-exclamation replace-wallet-warning-icon" aria-hidden="true"></i>
                    <p>
                        {{
                            $t(
                                "Creating a new wallet will replace your current wallet. Your current address, keys and associated data will be permanently lost.",
                            )
                        }}
                    </p>
                </div>
                <p class="replace-wallet-hint">
                    {{ $t("Make sure you have exported and safely stored your current private key before continuing.") }}
                </p>
                <div class="replace-wallet-ack">
                    <ToggleSwitch v-model:val="acknowledged">
                        <span class="replace-wallet-ack-label">{{
                            $t("I understand that my current wallet will be permanently lost and cannot be recovered")
                        }}</span>
                    </ToggleSwitch>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Go back") }}
                </button>
                <button type="button" class="btn btn-danger" :disabled="!acknowledged" @click="confirm">
                    <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    {{ $t("Continue") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "../../utils/v-model";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import ToggleSwitch from "@/components/utils/ToggleSwitch.vue";

export default defineComponent({
    name: "ReplaceWalletConfirmationModal",
    components: {
        ModalDialogContainer,
        ToggleSwitch,
    },
    emits: ["update:display", "confirm"],
    props: {
        display: Boolean,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            acknowledged: false,
        };
    },
    methods: {
        close: function () {
            this.$closeModal(true);
        },

        confirm: function () {
            if (!this.acknowledged) {
                return;
            }
            this.acknowledged = false;
            this.$closeModal(true);
            this.$emit("confirm");
        },

        stopPropagationEvent: function (e: Event) {
            e.stopPropagation();
        },
    },
    watch: {
        display: function () {
            if (this.display) {
                this.acknowledged = false;
                this.$autoFocus();
            }
        },
    },
});
</script>

<style scoped>
.modal-dialog {
    max-width: 520px;
    box-sizing: border-box;
}

.replace-wallet-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-12);
    margin-bottom: var(--space-12);
    padding: var(--space-12) var(--space-16);
    border: 1px solid color-mix(in srgb, var(--color-feedback-error) 32%, var(--theme-border-color));
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-feedback-error) 8%, transparent);
}

.replace-wallet-warning-icon {
    flex-shrink: 0;
    margin-top: var(--space-4);
    color: var(--color-feedback-error);
    font-size: 1.125rem;
}

.replace-wallet-warning p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
}

.replace-wallet-hint {
    margin: 0 0 var(--space-12);
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.5;
}

.replace-wallet-ack {
    margin: 0;
}

.replace-wallet-ack :deep(.switch-button-label) {
    flex: 1;
    min-width: 0;
}

.replace-wallet-ack-label {
    font-size: 0.875rem;
    line-height: 1.5;
}

.modal-footer .btn {
    min-height: 44px;
    min-width: 112px;
    padding: var(--space-8) var(--space-16);
    font-size: 14px;
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
}

.modal-footer .btn i {
    margin-right: var(--space-8);
}
</style>
