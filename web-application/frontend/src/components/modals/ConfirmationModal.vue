<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ title }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body">
                <p class="modal-message-text">{{ message }}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button
                    type="button"
                    class="btn"
                    :class="danger || deleteAction || suspendAction || deactivateAction || rejectAction ? 'btn-danger' : 'btn-primary'"
                    @click="confirm"
                >
                    <i :class="confirmIconClass" aria-hidden="true"></i>
                    {{ $t(confirmLabelKey) }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "../../utils/v-model";

export default defineComponent({
    name: "ConfirmationModal",
    emits: ["update:display", "confirm"],

    props: {
        display: Boolean,
        title: String,
        message: String,
        danger: Boolean,
        deleteAction: Boolean,
        suspendAction: Boolean,
        deactivateAction: Boolean,
        rejectAction: Boolean,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    computed: {
        confirmLabelKey: function (): string {
            if (this.deleteAction) {
                return "Delete";
            }
            if (this.suspendAction) {
                return "Suspend";
            }
            if (this.deactivateAction) {
                return "Deactivate";
            }
            if (this.rejectAction) {
                return "Reject";
            }
            return "Confirm";
        },
        confirmIconClass: function (): string {
            if (this.deleteAction) {
                return "fas fa-trash";
            }
            if (this.suspendAction) {
                return "fas fa-pause";
            }
            if (this.deactivateAction) {
                return "fas fa-user-slash";
            }
            if (this.rejectAction) {
                return "fas fa-xmark";
            }
            return "fas fa-check";
        },
    },
    methods: {
        close: function () {
            this.$closeModal();
        },

        escapeToClose: function (event) {
            if (event.key === "Escape") {
                this.close();
            }
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },

        confirm: function () {
            this.close();
            this.$emit("confirm");
        },
    },
    mounted: function () {
        if (this.display) {
            this.$autoFocus();
        }
    },
    watch: {
        display: function () {
            if (this.display) {
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

.modal-footer .btn {
    padding: var(--space-8) var(--space-16);
    min-height: 44px; /* accesibilidad: área táctil mínima */
    height: 44px; /* fuerza altura consistente */
    box-sizing: border-box;
    min-width: 112px;
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
