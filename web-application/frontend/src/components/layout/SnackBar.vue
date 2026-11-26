<template>
    <div
        class="snackbar"
        :class="{ hidden: !shown, center: position === 'center', right: position === 'right' }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        :aria-hidden="shown ? undefined : 'true'"
    >
        <button
            ref="snackbarBox"
            type="button"
            class="snackbar-box"
            :tabindex="shown ? 0 : -1"
            :title="$t('Dismiss')"
            @mouseleave="queueDismissCheck"
            @blur="queueDismissCheck"
            @click="hide"
            @keydown.esc="hide"
        >
            {{ message }}
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { SNACKBAR_AUTO_DISMISS_MS } from "@/constants/ui";

export default defineComponent({
    name: "SnackBar",
    data: function () {
        return {
            shown: false,
            message: "",
            position: "left",
            dismissTimeout: null as ReturnType<typeof setTimeout> | null,
            dismissExpired: false,
        };
    },
    methods: {
        show: function (msg: string, position?: string) {
            this.clearDismiss();
            this.shown = true;
            this.message = msg;
            this.position = position;
            this.dismissExpired = false;
            this.scheduleDismiss();
        },

        hide: function () {
            this.clearDismiss();
            this.shown = false;
        },

        scheduleDismiss: function () {
            if (!this.shown || this.dismissTimeout !== null) {
                return;
            }
            this.dismissTimeout = setTimeout(() => {
                this.dismissTimeout = null;
                this.dismissExpired = true;
                this.dismissIfReady();
            }, SNACKBAR_AUTO_DISMISS_MS);
        },

        queueDismissCheck: function () {
            this.$nextTick(() => this.dismissIfReady());
        },

        dismissIfReady: function () {
            if (!this.shown || !this.dismissExpired) {
                return;
            }
            const snackbarBox = this.$refs.snackbarBox as HTMLButtonElement | undefined;
            if (snackbarBox && (snackbarBox.matches(":hover") || document.activeElement === snackbarBox)) {
                return;
            }
            this.hide();
        },

        clearDismiss: function () {
            if (this.dismissTimeout !== null) {
                clearTimeout(this.dismissTimeout);
                this.dismissTimeout = null;
            }
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("snack", this.show.bind(this));
    },
    beforeUnmount: function () {
        this.clearDismiss();
    },
});
</script>
