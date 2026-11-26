<template>
    <div class="catalog-search-bar">
        <label class="catalog-user-search" :aria-label="placeholder">
            <span class="catalog-user-search-icon" aria-hidden="true">
                <i class="fas fa-search"></i>
            </span>
            <input
                ref="searchInput"
                :value="localQuery"
                type="text"
                class="catalog-user-search-input"
                :placeholder="placeholder"
                :disabled="disabled"
                autocomplete="off"
                @input="onInput"
                @keydown="onKeyDown"
                @blur="onBlur"
            />
            <button
                v-if="localQuery"
                type="button"
                class="catalog-user-search-clear"
                :title="$t('Clear search')"
                :aria-label="$t('Clear search')"
                @mousedown.prevent="clearSearch"
            >
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </label>

        <div v-if="showDropdown && suggestions.length" class="catalog-search-dropdown">
            <button
                v-for="entry in suggestions"
                :key="entry.id"
                type="button"
                class="search-suggestion-item"
                :class="{ 'is-active': activeSuggestionId === entry.id }"
                @mousedown.prevent
                @click="selectEntry(entry)"
            >
                <span class="search-suggestion-initial">{{ entry.initials }}</span>
                <span class="search-suggestion-text">
                    <span class="search-suggestion-name" v-html="highlightMatch(entry.name)"></span>
                    <span class="search-suggestion-desc">{{ truncate(entry.shortDescription, 60) }}</span>
                </span>
                <span class="tag search-suggestion-badge">{{ entry.kindLabel }}</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiCatalogItems } from "@/api/api-group-catalog-items";
import type { CatalogPublicEntryList } from "@/api/definitions";
import { mapCatalogPublicEntries, type CatalogEntry } from "@/composables/catalog-domain";
import { getUniqueStringId } from "@/utils/unique-id";

const SUGGEST_DEBOUNCE_MS = 250;
const SUGGESTION_PAGE_SIZE = 8;

export default defineComponent({
    name: "CatalogSearchBar",
    emits: ["update:modelValue", "select-entry", "search-submit"],
    props: {
        modelValue: {
            type: String,
            default: "",
        },
        placeholder: {
            type: String,
            default: "",
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        locale: {
            type: String,
            default: "en",
        },
    },
    data: function () {
        return {
            localQuery: this.modelValue,
            suggestions: [] as CatalogEntry[],
            showDropdown: false,
            activeSuggestionIndex: -1,
            suggestRequestId: `nubem-catalog-suggest-${getUniqueStringId()}`,
            suggestTimeout: null as ReturnType<typeof setTimeout> | null,
        };
    },
    computed: {
        activeSuggestionId: function (): string | null {
            if (this.activeSuggestionIndex < 0 || this.activeSuggestionIndex >= this.suggestions.length) {
                return null;
            }
            return this.suggestions[this.activeSuggestionIndex].id;
        },
    },
    methods: {
        onInput: function (event: Event): void {
            this.localQuery = (event.target as HTMLInputElement).value;
            this.showDropdown = false;
            this.activeSuggestionIndex = -1;
            this.scheduleSuggestions();
        },
        onBlur: function (): void {
            setTimeout(() => {
                this.closeDropdown();
            }, 200);
        },
        closeDropdown: function (): void {
            this.showDropdown = false;
            this.activeSuggestionIndex = -1;
        },
        onKeyDown: function (event: KeyboardEvent): void {
            if (event.key === "Escape") {
                this.closeDropdown();
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                if (this.showDropdown && this.activeSuggestionIndex >= 0 && this.activeSuggestionIndex < this.suggestions.length) {
                    this.selectEntry(this.suggestions[this.activeSuggestionIndex]);
                } else {
                    this.$emit("update:modelValue", this.localQuery);
                    this.$emit("search-submit");
                }
                return;
            }

            if (!this.showDropdown || !this.suggestions.length) {
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                this.activeSuggestionIndex = Math.min(this.activeSuggestionIndex + 1, this.suggestions.length - 1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, 0);
            }
        },
        scheduleSuggestions: function (): void {
            if (this.suggestTimeout) {
                clearTimeout(this.suggestTimeout);
            }
            const query = this.localQuery.trim();
            if (!query) {
                this.suggestions = [];
                this.closeDropdown();
                return;
            }
            this.suggestTimeout = setTimeout(() => {
                this.suggestTimeout = null;
                void this.fetchSuggestions(query);
            }, SUGGEST_DEBOUNCE_MS);
        },
        fetchSuggestions: async function (query: string): Promise<void> {
            try {
                const response = await new Promise<CatalogPublicEntryList>((resolve, reject) => {
                    Request.Abort(this.suggestRequestId);
                    Request.Pending(
                        this.suggestRequestId,
                        ApiCatalogItems.GetPublicCatalogEntries({
                            q: query,
                            page: 1,
                            pageSize: SUGGESTION_PAGE_SIZE,
                        }),
                    )
                        .onSuccess((data) => resolve(data as CatalogPublicEntryList))
                        .onCancel(() => reject(new Error("REQUEST_CANCELLED")))
                        .onRequestError((err) => reject(err))
                        .onUnexpectedError((err) => reject(err));
                });

                const entries = mapCatalogPublicEntries(response.items || []);
                this.suggestions = entries.slice(0, SUGGESTION_PAGE_SIZE);
                this.activeSuggestionIndex = -1;
                this.showDropdown = true;
            } catch (error) {
                if (error instanceof Error && error.message === "REQUEST_CANCELLED") {
                    return;
                }
                this.suggestions = [];
                this.closeDropdown();
            }
        },
        clearSearch: function (): void {
            this.localQuery = "";
            this.$emit("update:modelValue", "");
            this.$emit("search-submit");
            this.suggestions = [];
            this.closeDropdown();
            const input = this.$refs.searchInput as HTMLInputElement | null;
            if (input) {
                input.focus();
            }
        },
        selectEntry: function (entry: CatalogEntry): void {
            this.closeDropdown();
            this.$emit("select-entry", entry);
        },
        highlightMatch: function (text: string): string {
            const query = this.localQuery.trim().toLowerCase();
            if (!query) {
                return text;
            }
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
        },
        truncate: function (text: string, maxLength: number): string {
            const normalized = (text || "").trim();
            if (normalized.length <= maxLength) {
                return normalized;
            }
            return `${normalized.substring(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
        },
    },
    beforeUnmount: function () {
        if (this.suggestTimeout) {
            clearTimeout(this.suggestTimeout);
        }
        Request.Abort(this.suggestRequestId);
    },
    watch: {
        modelValue: function (next: string) {
            if (this.localQuery !== next) {
                this.localQuery = next;
            }
        },
    },
});
</script>

<style scoped>
.catalog-search-bar {
    position: relative;
    width: 100%;
    max-width: 420px;
}

.catalog-user-search {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--color-neutral-light);
    border-radius: 100px;
    background: var(--color-bg-surface);
    color: var(--color-text-muted);
    padding: var(--space-4) var(--space-8);
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.catalog-user-search:focus-within {
    border-color: var(--color-brand-secondary);
    background: var(--color-bg-elevated);
    box-shadow: var(--elevation-1);
}

.catalog-user-search-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 100px;
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
    flex-shrink: 0;
}

.catalog-user-search-input {
    width: 100%;
    min-height: 36px;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 20px;
}

.catalog-user-search-input::placeholder {
    color: var(--color-text-muted);
}

.catalog-user-search-input:focus {
    outline: none;
}

.catalog-user-search-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 100px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
}

.catalog-user-search-clear:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
}

.catalog-user-search-clear:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.catalog-search-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    z-index: 100;
    border: 1px solid var(--color-brand-secondary);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    box-shadow: var(--elevation-3);
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 400px;
}

.search-suggestion-item {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    width: 100%;
    min-height: 44px;
    padding: var(--space-8) var(--space-12);
    border: none;
    border-bottom: 1px solid var(--color-neutral-light);
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
}

.search-suggestion-item:last-child {
    border-bottom: none;
}

.search-suggestion-item:hover,
.search-suggestion-item.is-active {
    background: var(--color-bg-surface);
}

.search-suggestion-initial {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: var(--color-brand-primary);
    color: var(--color-text-inverse);
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    flex-shrink: 0;
}

.search-suggestion-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
}

.search-suggestion-name {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.search-suggestion-name mark {
    background: rgba(90, 123, 174, 0.2);
    color: var(--color-accent-readable);
    font-weight: 700;
}

.search-suggestion-desc {
    font-size: 12px;
    line-height: 16px;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.search-suggestion-badge {
    flex-shrink: 0;
}

@media (max-width: 640px) {
    .catalog-search-bar {
        max-width: 100%;
    }
}
</style>
