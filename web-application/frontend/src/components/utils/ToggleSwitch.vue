<template>
    <button type="button" class="switch-button-container" role="switch" :aria-checked="ariaChecked" :disabled="disabled" @click="toggle">
        <div class="switch-button-control">
            <div class="switch-button" :class="{ enabled: val, indeterminate: showIndeterminate }">
                <div class="button"></div>
            </div>
        </div>
        <div class="switch-button-label">
            <slot></slot>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "../../utils/v-model";

export default defineComponent({
    name: "ToggleSwitch",
    emits: ["update:val"],

    props: {
        val: Boolean,
        disabled: Boolean,
        indeterminate: Boolean,
    },
    setup(props) {
        return {
            valState: useVModel(props, "val"),
        };
    },
    computed: {
        showIndeterminate: function (): boolean {
            return !!this.indeterminate && !this.val;
        },
        ariaChecked: function (): "true" | "false" | "mixed" {
            if (this.showIndeterminate) {
                return "mixed";
            }
            return this.val ? "true" : "false";
        },
    },
    methods: {
        toggle: function () {
            if (this.disabled) {
                return;
            }
            if (this.showIndeterminate) {
                this.valState = true;
                return;
            }
            this.valState = !this.valState;
        },
    },
});
</script>

<style></style>
