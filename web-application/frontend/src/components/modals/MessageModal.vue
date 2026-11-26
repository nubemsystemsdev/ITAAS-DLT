<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ title }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body modal-message-body">
                <div v-if="parsedRows.length" class="modal-message-grid" role="table" :aria-label="$t('Message details')">
                    <div v-for="(row, index) in parsedRows" :key="index" class="modal-message-row" role="row">
                        <p class="modal-message-label" role="rowheader">{{ row.label }}</p>
                        <p class="modal-message-value" role="cell">
                            <a
                                v-if="isUrl(row.value)"
                                :href="row.value"
                                class="modal-message-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {{ row.value }}
                            </a>
                            <span v-else>{{ row.value }}</span>
                        </p>
                    </div>
                </div>
                <p v-else class="modal-message-text">{{ message }}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Close") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "../../utils/v-model";

export default defineComponent({
    name: "MessageModal",
    emits: ["update:display"],

    props: {
        display: Boolean,
        title: String,
        message: String,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    computed: {
        parsedRows: function (): Array<{ label: string; value: string }> {
            const rawMessage = String(this.message || "");
            const lines = rawMessage
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            const rows: Array<{ label: string; value: string }> = [];
            let index = 0;

            while (index < lines.length) {
                const currentLine = lines[index];
                const separatorIndex = currentLine.indexOf(":");

                if (separatorIndex <= 0) {
                    return [];
                }

                const label = currentLine.slice(0, separatorIndex).trim();
                const inlineValue = currentLine.slice(separatorIndex + 1).trim();

                if (!label) {
                    return [];
                }

                if (inlineValue) {
                    rows.push({ label, value: inlineValue });
                    index += 1;
                    continue;
                }

                const nextLine = lines[index + 1];
                if (!nextLine) {
                    return [];
                }

                rows.push({ label, value: nextLine });
                index += 2;
            }

            return rows;
        },
    },
    methods: {
        isUrl: function (value: string): boolean {
            return /^https?:\/\/\S+$/i.test((value || "").trim());
        },
        close: function () {
            this.$closeModal();
        },

        escapeToClose: function (event) {
            if (event.key === "Escape") {
                this.close();
            }
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },
    },
    mounted: function () {
        if (this.display) {
            this.$autoFocus();
        }
    },
    watch: {
        display: function () {
            if (this.display) {
                this.$autoFocus();
            }
        },
    },
});
</script>
