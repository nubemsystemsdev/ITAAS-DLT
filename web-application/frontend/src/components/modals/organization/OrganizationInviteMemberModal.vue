<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus" :lock-close="submitting">
        <div class="modal-dialog modal-md organization-invite-member-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Invite member") }}</div>
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
            <form class="modal-body organization-invite-member-modal__body" @submit.prevent="submit">
                <div class="form-group">
                    <label for="org-invite-modal-email">{{ $t("Email") }}</label>
                    <input
                        id="org-invite-modal-email"
                        v-model="email"
                        type="email"
                        class="form-control form-control-full-width"
                        :placeholder="$t('Registered user email')"
                        :disabled="submitting"
                        autocomplete="email"
                        :aria-invalid="emailError ? 'true' : undefined"
                        :aria-describedby="emailError ? 'org-invite-modal-email-error' : undefined"
                    />
                    <div v-if="emailError" id="org-invite-modal-email-error" class="form-error" role="alert">{{ emailError }}</div>
                </div>
                <div class="form-group">
                    <label for="org-invite-modal-role">{{ $t("Role") }}</label>
                    <select
                        id="org-invite-modal-role"
                        v-model="role"
                        class="form-control form-control-full-width form-select"
                        :disabled="submitting"
                    >
                        <option value="Member">{{ $t("Member") }}</option>
                        <option value="Admin">{{ $t("Organization admin") }}</option>
                    </select>
                </div>
            </form>
            <div class="modal-footer organization-invite-member-modal__footer">
                <button type="button" class="btn btn-tertiary" :disabled="submitting" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-primary" :disabled="submitting || !email.trim()" @click="submit">
                    <i class="fas fa-paper-plane" aria-hidden="true"></i>
                    {{ $t("Send invitation") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "@/utils/v-model";

export default defineComponent({
    name: "OrganizationInviteMemberModal",

    emits: ["update:display", "submit"],

    props: {
        display: {
            type: Boolean,
            default: false,
        },
        emailError: {
            type: String,
            default: "",
        },
        submitting: {
            type: Boolean,
            default: false,
        },
    },

    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },

    data: function () {
        return {
            email: "",
            role: "Member",
        };
    },

    methods: {
        resetFields: function () {
            this.email = "";
            this.role = "Member";
        },

        close: function () {
            if (this.submitting) {
                return;
            }
            this.$closeModal();
        },

        submit: function () {
            if (this.submitting || !this.email.trim()) {
                return;
            }
            this.$emit("submit", {
                email: this.email.trim().toLowerCase(),
                role: this.role,
            });
        },

        stopPropagationEvent: function (e: Event) {
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
.organization-invite-member-modal {
    max-width: 520px;
    box-sizing: border-box;
}

.organization-invite-member-modal__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.organization-invite-member-modal__footer {
    flex-wrap: wrap;
    gap: var(--space-12);
    align-items: center;
}
</style>
