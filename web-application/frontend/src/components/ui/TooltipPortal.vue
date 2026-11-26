<template>
    <span
        ref="trigger"
        class="tooltip-portal-trigger"
        :class="{ 'tooltip-portal-trigger--open': visible && mobileLayout }"
        @mouseenter="onDesktopShow"
        @mouseleave="onPointerLeave"
        @focusin="onDesktopShow"
        @focusout="onFocusOut"
        @click="onTriggerClick"
    >
        <slot :described-by="describedBy"></slot>
    </span>

    <Teleport to="body">
        <div
            v-if="visible"
            :id="tooltipId"
            ref="popup"
            class="tooltip-portal-popup"
            :class="{
                'tooltip-portal-popup--multiline': multiline,
                'tooltip-portal-popup--mobile': mobileLayout,
            }"
            :style="popupStyle"
            role="tooltip"
            @mouseenter="onDesktopShow"
            @mouseleave="onPointerLeave"
        >
            {{ content }}
        </div>
    </Teleport>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { getUniqueStringId } from "@/utils/unique-id";

const TOOLTIP_HIDE_DELAY_MS = 150;

const isMobileViewport = function (): boolean {
    return window.matchMedia("(max-width: 640px)").matches;
};

export default defineComponent({
    name: "TooltipPortal",
    props: {
        content: {
            type: String,
            required: true,
        },
        offsetY: {
            type: Number,
            default: undefined,
        },
        multiline: {
            type: Boolean,
            default: false,
        },
    },
    setup: function (props) {
        const trigger = ref<HTMLElement | null>(null);
        const popup = ref<HTMLElement | null>(null);
        const visible = ref(false);
        const mobileLayout = ref(false);
        const tooltipId = "tooltip-" + getUniqueStringId();
        const describedBy = computed(function (): string | undefined {
            return visible.value ? tooltipId : undefined;
        });

        const popupStyle = ref<Record<string, string>>({ position: "fixed", left: "0px", top: "0px" });

        let rafId = 0 as number;
        let hideTimer = 0 as number;

        const getViewportPadding = function (): number {
            return isMobileViewport() ? 16 : 8;
        };

        const getMinLeft = function (padding: number): number {
            if (isMobileViewport()) {
                return padding;
            }

            const mainLayout = document.querySelector(".main-layout");
            const sidebarSizeRaw = mainLayout ? getComputedStyle(mainLayout).getPropertyValue("--side-bar-size").trim() : "";
            const sidebarSize = Number.parseInt(sidebarSizeRaw, 10);
            return (Number.isFinite(sidebarSize) ? sidebarSize : 0) + padding;
        };

        const updatePosition = function () {
            if (!trigger.value || !popup.value) return;

            const mobile = isMobileViewport();
            mobileLayout.value = mobile;

            const triggerRect = trigger.value.getBoundingClientRect();
            const popupWidth = popup.value.offsetWidth;
            const popupHeight = popup.value.offsetHeight;

            if (popupWidth <= 0 || popupHeight <= 0) {
                schedulePositionUpdate();
                return;
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = getViewportPadding();
            const minLeft = getMinLeft(padding);
            const maxLeft = viewportWidth - popupWidth - padding;
            const offsetY = props.offsetY || 8;

            let left = Math.round(triggerRect.left + triggerRect.width / 2 - popupWidth / 2);
            if (left < minLeft) {
                left = minLeft;
            }
            if (left > maxLeft) {
                left = Math.max(minLeft, maxLeft);
            }

            let top = Math.round(triggerRect.top - offsetY - popupHeight);
            const preferredBelowTop = Math.round(triggerRect.bottom + offsetY);

            if (top < padding) {
                top = preferredBelowTop;
            }

            if (top + popupHeight > viewportHeight - padding) {
                const aboveTop = Math.round(triggerRect.top - offsetY - popupHeight);
                if (aboveTop >= padding) {
                    top = aboveTop;
                } else {
                    top = Math.max(padding, viewportHeight - padding - popupHeight);
                }
            }

            const style: Record<string, string> = {
                position: "fixed",
                left: `${left}px`,
                top: `${top}px`,
            };
            if (mobile && props.multiline) {
                style.maxWidth = `calc(100vw - ${padding * 2}px)`;
            }
            popupStyle.value = style;
        };

        const schedulePositionUpdate = function () {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(function () {
                updatePosition();
                rafId = requestAnimationFrame(updatePosition);
            });
        };

        const cancelHide = function () {
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = 0;
            }
        };

        const show = async function () {
            cancelHide();
            visible.value = true;
            await nextTick();
            updatePosition();
            schedulePositionUpdate();
        };

        const hide = function () {
            cancelHide();
            visible.value = false;
            if (rafId) cancelAnimationFrame(rafId);
        };

        const onDesktopShow = function () {
            if (isMobileViewport()) {
                return;
            }
            show();
        };

        const onPointerLeave = function () {
            if (isMobileViewport()) {
                return;
            }
            cancelHide();
            hideTimer = window.setTimeout(hide, TOOLTIP_HIDE_DELAY_MS);
        };

        const onFocusOut = function (event: FocusEvent) {
            if (isMobileViewport()) {
                return;
            }
            const next = event.relatedTarget as Node | null;
            if (next && trigger.value?.contains(next)) {
                return;
            }
            hide();
        };

        const onTriggerClick = function (event: MouseEvent) {
            if (!isMobileViewport()) {
                return;
            }
            event.stopPropagation();
            if (visible.value) {
                hide();
                return;
            }
            show();
        };

        const onDocumentKeydown = function (event: KeyboardEvent) {
            if (event.key !== "Escape" || !visible.value) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            hide();
        };

        const onDocumentClick = function (event: MouseEvent) {
            if (!visible.value || !isMobileViewport()) {
                return;
            }
            const target = event.target as Node | null;
            if (!target || trigger.value?.contains(target) || popup.value?.contains(target)) {
                return;
            }
            hide();
        };

        const onScroll = function () {
            if (!visible.value) return;
            schedulePositionUpdate();
        };

        onMounted(function () {
            window.addEventListener("scroll", onScroll, true);
            window.addEventListener("resize", onScroll);
            document.addEventListener("click", onDocumentClick, true);
            document.addEventListener("keydown", onDocumentKeydown, true);
        });

        onBeforeUnmount(function () {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onScroll);
            document.removeEventListener("click", onDocumentClick, true);
            document.removeEventListener("keydown", onDocumentKeydown, true);
            if (rafId) cancelAnimationFrame(rafId);
            cancelHide();
        });

        return {
            trigger,
            popup,
            visible,
            mobileLayout,
            popupStyle,
            tooltipId,
            describedBy,
            onDesktopShow,
            onPointerLeave,
            onFocusOut,
            onTriggerClick,
        };
    },
});
</script>

<style scoped>
.tooltip-portal-trigger {
    display: inline-flex;
}

.tooltip-portal-popup {
    z-index: 10000;
    background: var(--color-bg-dark);
    color: var(--color-text-inverse);
    padding: var(--space-8) var(--space-12);
    border-radius: var(--radius-md);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    box-shadow: var(--elevation-2);
    pointer-events: auto;
}

.tooltip-portal-popup--multiline {
    white-space: pre-line;
    max-width: 240px;
    width: max-content;
    text-align: left;
}

.tooltip-portal-popup--mobile.tooltip-portal-popup--multiline {
    width: auto;
    max-width: calc(100vw - 32px);
}
</style>
