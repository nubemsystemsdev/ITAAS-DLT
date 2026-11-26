<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="submitting">
        <div class="modal-dialog modal-md organization-deletion-request-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ modalTitle }}</div>
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
            <form class="modal-body organization-deletion-request-modal__body" @submit.prevent="submit">
                <p class="organization-deletion-request-modal__intro">
                    {{ modalIntro }}
                </p>
                <fieldset class="organization-deletion-request-modal__fieldset">
                    <legend class="organization-deletion-request-modal__legend">
                        {{ $t("Subscription handling preference") }}
                    </legend>
                    <label class="organization-deletion-request-modal__option">
                        <input
                            v-model="subscriptionPreference"
                            type="radio"
                            name="org-deletion-modal-subscription-preference"
                            value="ImmediateProratedRefund"
                            :disabled="submitting"
                        />
                        <span>{{ $t("Immediate prorated refund and subscription cancellation") }}</span>
                    </label>
                    <label class="organization-deletion-request-modal__option">
                        <input
                            v-model="subscriptionPreference"
                            type="radio"
                            name="org-deletion-modal-subscription-preference"
                            value="AtPeriodEnd"
                            :disabled="submitting"
                        />
                        <span>{{ $t("Cancel subscriptions at the end of the billing period (no refund)") }}</span>
                    </label>
                </fieldset>
            </form>
            <div class="modal-footer organization-deletion-request-modal__footer">
                <button type="button" class="btn btn-tertiary" :disabled="submitting" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-danger" :disabled="submitting" @click="submit">
                    <i v-if="submitting" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <i v-else class="fas fa-trash-alt" aria-hidden="true"></i>
                    {{ submitting ? $t("Loading") : submitButtonLabel }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { useVModel } from "@/utils/v-model";

export default defineComponent({
    name: "OrganizationDeletionRequestModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "submit"],
    props: {
        display: {
            type: Boolean,
            default: false,
        },
        submitting: {
            type: Boolean,
            default: false,
        },
        purpose: {
            type: String,
            default: "request",
        },
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    computed: {
        modalTitle: function (): string {
            if (this.purpose === "platform-delete") {
                return String(this.$t("Delete organization"));
            }
            return String(this.$t("Request organization deletion"));
        },
        modalIntro: function (): string {
            if (this.purpose === "platform-delete") {
                return String(this.$t("Do you want to delete this organization? Choose how active subscriptions should be handled."));
            }
            return String(
                this.$t(
                    "Do you want to request deletion of this organization? Organization admins and platform administrators will be notified.",
                ),
            );
        },
        submitButtonLabel: function (): string {
            if (this.purpose === "platform-delete") {
                return String(this.$t("Delete organization"));
            }
            return String(this.$t("Submit deletion request"));
        },
    },
    data: function () {
        return {
            subscriptionPreference: "ImmediateProratedRefund",
        };
    },
    methods: {
        resetFields: function (): void {
            this.subscriptionPreference = "ImmediateProratedRefund";
        },

        close: function (): void {
            if (this.submitting) {
                return;
            }
            this.$closeModal();
        },

        submit: function (): void {
            if (this.submitting) {
                return;
            }
            this.$emit("submit", this.subscriptionPreference);
        },

        stopPropagationEvent: function (e: Event): void {
            e.stopPropagation();
        },
    },
    mounted: function () {
        if (this.display) {
            this.$autoFocus();
        }
    },
    watch: {
        display: function (isOpen: boolean) {
            if (isOpen) {
                this.resetFields();
                this.$nextTick(() => {
                    this.$autoFocus();
                });
            }
        },
    },
});
</script>

<style scoped>
.organization-deletion-request-modal {
    max-width: 520px;
    box-sizing: border-box;
}

.organization-deletion-request-modal__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.organization-deletion-request-modal__intro {
    margin: 0;
    font-size: 14px;
    line-height: 24px;
    color: var(--color-text-primary);
}

.organization-deletion-request-modal__fieldset {
    margin: 0;
    padding: 0;
    border: 0;
}

.organization-deletion-request-modal__legend {
    margin-bottom: var(--space-12);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.organization-deletion-request-modal__option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-12);
    margin-bottom: var(--space-12);
    font-size: 14px;
    line-height: 24px;
    color: var(--color-text-primary);
    cursor: pointer;
}

.organization-deletion-request-modal__option input {
    margin-top: var(--space-4);
    min-width: 16px;
    min-height: 16px;
}

.organization-deletion-request-modal__footer {
    flex-wrap: wrap;
    gap: var(--space-12);
    align-items: center;
}
</style>
