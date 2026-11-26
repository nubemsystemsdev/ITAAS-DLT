<template>
    <nav v-if="showBar" class="pagination" :aria-label="ariaLabel || $t('Pagination')">
        <button
            type="button"
            class="pagination-icon"
            :class="canGoPrev ? 'is-actionable' : 'is-disabled'"
            :title="$t('Previous')"
            :aria-label="$t('Previous')"
            :disabled="!canGoPrev"
            @click="onPrev"
        >
            <i class="fas fa-angle-left" aria-hidden="true"></i>
        </button>
        <span class="pagination-status">{{ $t("Page") }} {{ page }} {{ $t("of") }} {{ totalPages }}</span>
        <button
            type="button"
            class="pagination-icon"
            :class="canGoNext ? 'is-actionable' : 'is-disabled'"
            :title="$t('Next')"
            :aria-label="$t('Next')"
            :disabled="!canGoNext"
            @click="onNext"
        >
            <i class="fas fa-angle-right" aria-hidden="true"></i>
        </button>
    </nav>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "PaginationBar",
    emits: ["prev", "next"],
    props: {
        page: {
            type: Number,
            required: true,
        },
        totalPages: {
            type: Number,
            required: true,
        },
        canGoPrev: {
            type: Boolean,
            default: false,
        },
        canGoNext: {
            type: Boolean,
            default: false,
        },
        visible: {
            type: Boolean,
            default: undefined,
        },
        ariaLabel: {
            type: String,
            default: "",
        },
    },
    computed: {
        showBar: function (): boolean {
            if (typeof this.visible === "boolean") {
                return this.visible;
            }
            return this.totalPages > 1;
        },
    },
    methods: {
        onPrev: function () {
            if (!this.canGoPrev) {
                return;
            }
            this.$emit("prev");
        },
        onNext: function () {
            if (!this.canGoNext) {
                return;
            }
            this.$emit("next");
        },
    },
});
</script>
