<template>
    <button type="button" class="copy-icon-button" :title="labelText" :aria-label="labelText" :disabled="disabled || !text" @click="copy">
        <i class="fas fa-clone" aria-hidden="true"></i>
    </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "CopyIconButton",
    emits: ["copied"],
    props: {
        text: {
            type: String,
            required: true,
        },
        successMessage: {
            type: String,
            default: "Address copied to clipboard!",
        },
        label: {
            type: String,
            default: "Copy",
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        labelText: function (): string {
            return this.$t(this.label);
        },
    },
    methods: {
        copy: function () {
            if (this.disabled || !this.text) {
                return;
            }

            navigator.clipboard.writeText(this.text);
            this.$showSnackBar(this.$t(this.successMessage));
            this.$emit("copied");
        },
    },
});
</script>

<style scoped>
.copy-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: unset;
    min-height: 44px;
    padding: var(--space-12) var(--space-4) var(--space-12) 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-accent-readable);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.2s ease;
}

.copy-icon-button:hover:not(:disabled) {
    color: var(--color-brand-primary);
}

.dark-theme .copy-icon-button:hover:not(:disabled) {
    color: var(--color-text-inverse);
}

.copy-icon-button:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.copy-icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
</style>
