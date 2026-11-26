<template>
    <div
        class="modal-container modal-container-dialog"
        :class="{ hidden: !display, closing: closing }"
        tabindex="-1"
        role="dialog"
        :aria-modal="display ? 'true' : undefined"
        :aria-labelledby="hasDialogTitle ? titleId : undefined"
        :aria-hidden="display ? undefined : 'true'"
        @keydown="keyDownHandle"
        @animationend="onAnimationEnd"
        @mousedown="stopPropagationEvent"
        @touchstart="stopPropagationEvent"
        @click="stopPropagationEvent"
    >
        <div class="modal-out-close-area" @mousedown="onMouseDown" @touchstart="onTouchOutside"></div>
        <slot @mousedown="stopPropagationEvent" @touchstart="stopPropagationEvent" @click="stopPropagationEvent"></slot>
    </div>
</template>

<script lang="ts">
import { AppEvents } from "@/control/app-events";
import { FocusTrap } from "@/utils/focus-trap";
import { getUniqueStringId } from "@/utils/unique-id";
import { useVModel } from "@/utils/v-model";
import { defineComponent, nextTick } from "vue";

let modalDialogOpenCount = 0;

function syncModalDialogOpenCount(delta: number) {
    modalDialogOpenCount = Math.max(0, modalDialogOpenCount + delta);
    AppEvents.Emit("modal-dialog-open-count-changed", modalDialogOpenCount);
}

export default defineComponent({
    name: "ModalDialogContainer",
    emits: ["update:display", "key", "close"],

    props: {
        display: Boolean,
        lockClose: Boolean,
        static: Boolean,
        closeCallback: Function,
    },
    setup(props) {
        return {
            focusTrap: null as FocusTrap,
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            closing: false,
            titleId: "modal-dialog-title-" + getUniqueStringId(),
            hasDialogTitle: false,
        };
    },
    methods: {
        close: function (forced?: boolean) {
            if (this.lockClose && forced !== true) {
                return;
            }
            if (this.closeCallback && forced !== true) {
                this.closeCallback(() => {
                    this.$emit("close");
                    this.closing = true;
                });
            } else {
                this.$emit("close");
                this.closing = true;
            }
        },

        onAnimationEnd: function (e: AnimationEvent) {
            e.stopPropagation();
            if (e.animationName === "modal-close-animation") {
                this.closing = false;
                this.displayStatus = false;
            }
        },

        keyDownHandle: function (e) {
            e.stopPropagation();
            if (e.key === "Escape" && this.display && !this.closing) {
                this.close();
            } else {
                this.$emit("key", e);
            }
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },

        onTouchOutside: function (e: TouchEvent) {
            e.stopPropagation();
            if (!this.static) {
                this.close();
            }
        },

        onMouseDown: function (e: MouseEvent) {
            e.stopPropagation();
            if (e.button === 0 && !this.static) {
                this.close();
            }
        },

        focusLost: function () {
            if (this.display && !this.closing) {
                this.$el.focus();
            }
        },

        bindDialogTitle: function () {
            const root = this.$el;
            if (!(root instanceof HTMLElement)) {
                return;
            }
            const title = root.querySelector(".modal-title");
            if (title instanceof HTMLElement) {
                if (title.id) {
                    this.titleId = title.id;
                } else {
                    title.id = this.titleId;
                }
                this.hasDialogTitle = true;
            } else {
                this.hasDialogTitle = false;
            }
        },
    },
    mounted: function () {
        this.focusTrap = new FocusTrap(this.$el, this.focusLost.bind(this));

        if (this.display) {
            this.focusTrap.activate();
        }
    },
    beforeUnmount: function () {
        if (this.display) {
            syncModalDialogOpenCount(-1);
        }
        if (this.focusTrap) {
            this.focusTrap.destroy();
        }
    },
    watch: {
        display: {
            handler: function (isOpen: boolean, wasOpen: boolean | undefined) {
                if (wasOpen === undefined) {
                    if (isOpen) {
                        syncModalDialogOpenCount(1);
                    }
                } else if (isOpen && !wasOpen) {
                    syncModalDialogOpenCount(1);
                } else if (!isOpen && wasOpen) {
                    syncModalDialogOpenCount(-1);
                }

                if (this.display) {
                    this.closing = false;
                    if (this.focusTrap) {
                        this.focusTrap.activate();
                    }
                    nextTick(() => {
                        this.bindDialogTitle();
                    });
                } else {
                    if (this.focusTrap) {
                        this.focusTrap.deactivate();
                    }
                }
            },
            immediate: true,
        },
    },
});
</script>
