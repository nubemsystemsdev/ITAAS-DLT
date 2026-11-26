<template>
    <ModalDialogContainer v-model:display="displayStatus">
        <div class="modal-dialog modal-lg assignment-modal" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title assignment-modal-title">
                    <span>{{ selectedProduct ? $t(selectedProduct.name) : $t("License assignments") }}</span>
                    <small>{{ $t("Select the members who will have access") }}</small>
                </div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="$emit('close')">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div v-if="selectedProduct" class="assignment-limit-bar" role="status" aria-live="polite">
                <span>
                    <template v-if="selectedProduct.licenseLimit === null">
                        {{ draftAssignedCount }} {{ $t("licenses assigned") }} · {{ $t("Unlimited seats") }}
                    </template>
                    <template v-else> {{ draftAssignedCount }}/{{ selectedProduct.licenseLimit }} {{ $t("licenses assigned") }} </template>
                </span>
                <span v-if="assignmentLimitReached" class="assignment-limit-warning">{{ $t("License limit reached") }}</span>
            </div>

            <div class="assignment-user-list">
                <div v-for="member in activeMembers" :key="member.id" class="assignment-user-row">
                    <div class="member-avatar" :class="member.toneClass">{{ member.initials }}</div>
                    <div class="member-copy">
                        <div class="member-copy-header">
                            <p>{{ member.name }}</p>
                            <span
                                class="status-badge"
                                :class="isDraftAssigned(member.id) ? 'status-badge--success' : 'status-badge--muted'"
                            >
                                {{ isDraftAssigned(member.id) ? $t("With access") : $t("No access") }}
                            </span>
                        </div>
                        <span class="member-subtitle">{{ member.subtitle }}</span>
                    </div>
                    <ToggleSwitch
                        class="assignment-toggle"
                        :val="isDraftAssigned(member.id)"
                        :disabled="isAssignmentDisabled(member.id)"
                        :aria-label="member.name"
                        @update:val="setDraftAssignment(member.id, $event)"
                    />
                </div>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import ToggleSwitch from "@/components/utils/ToggleSwitch.vue";
import { useVModel } from "@/utils/v-model";

interface LicenseAssignmentsModalProduct {
    name: string;
    licenseLimit: number | null;
}

interface LicenseAssignmentsModalMember {
    id: string;
    name: string;
    subtitle: string;
    initials: string;
    toneClass: string;
}

export default defineComponent({
    name: "LicenseAssignmentsModal",
    components: {
        ModalDialogContainer,
        ToggleSwitch,
    },
    emits: ["update:display", "close", "set-assignment"],
    props: {
        display: Boolean,
        selectedProduct: {
            type: Object as PropType<LicenseAssignmentsModalProduct | null>,
            default: null,
        },
        activeMembers: {
            type: Array as PropType<LicenseAssignmentsModalMember[]>,
            default: () => [],
        },
        draftAssignedUserIds: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        savingAssignments: Boolean,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    computed: {
        draftAssignedCount(): number {
            return this.draftAssignedUserIds.length;
        },
        assignmentLimitReached(): boolean {
            return (
                !!this.selectedProduct &&
                this.selectedProduct.licenseLimit !== null &&
                this.draftAssignedCount >= this.selectedProduct.licenseLimit
            );
        },
    },
    methods: {
        isDraftAssigned: function (memberId: string): boolean {
            return this.draftAssignedUserIds.includes(memberId);
        },
        isAssignmentDisabled: function (memberId: string): boolean {
            return !this.isDraftAssigned(memberId) && this.assignmentLimitReached;
        },
        setDraftAssignment: function (memberId: string, assigned: boolean): void {
            this.$emit("set-assignment", memberId, assigned);
        },
        stopPropagationEvent: function (event: Event): void {
            event.stopPropagation();
        },
    },
});
</script>

<style>
@import "@/style/layout/organization-license-page.css";
</style>
