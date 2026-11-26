<template>
    <div class="password-input-container">
        <div class="password-input">
            <input
                v-bind="$attrs"
                v-model="valState"
                :type="hidden ? 'password' : 'text'"
                :disabled="disabled"
                maxlength="255"
                :name="name"
                :autocomplete="resolvedAutocomplete"
                :class="{ 'auto-focus': !!autoFocus }"
            />
            <button
                type="button"
                :disabled="disabled"
                class="password-input-hide-btn"
                @click="toggleHide"
                :title="hidden ? $t('Show password') : $t('Hide password')"
                :aria-label="hidden ? $t('Show password') : $t('Hide password')"
            >
                <i v-if="hidden" class="fas fa-eye blue-icon" aria-hidden="true"></i>
                <i v-else class="fas fa-eye-slash blue-icon" aria-hidden="true"></i>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { useVModel } from "@/utils/v-model";
import { defineComponent } from "vue";

export default defineComponent({
    name: "PasswordInput",
    inheritAttrs: false,
    emits: ["update:val"],

    props: {
        val: String,
        disabled: Boolean,
        name: String,
        isNewPassword: Boolean,
        autoFocus: Boolean,
        isRepeatedPassword: Boolean,
        autocomplete: {
            type: String,
            default: "",
        },
    },
    setup(props) {
        return {
            valState: useVModel(props, "val"),
        };
    },
    data: function () {
        return {
            hidden: true,
        };
    },
    computed: {
        resolvedAutocomplete: function (): string {
            if (this.autocomplete) {
                return this.autocomplete;
            }
            if (!this.hidden) {
                return "off";
            }
            if (this.isNewPassword || this.isRepeatedPassword) {
                return "new-password";
            }
            return "current-password";
        },
    },
    methods: {
        toggleHide: function () {
            this.hidden = !this.hidden;
            this.$autoFocus();
        },
    },
});
</script>

<style scoped>
/* Field appearance lives in forms.css (.password-input input) */
</style>
