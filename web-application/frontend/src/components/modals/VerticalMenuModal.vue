<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ title }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="page-vertical-menu in-modal">
                    <div v-if="backRoute" class="page-vertical-menu-group">
                        <div class="page-vertical-menu-group-options">
                            <button type="button" class="page-vertical-menu-group-option" @click="goBack">
                                <i class="fas fa-arrow-left" aria-hidden="true"></i> <span>{{ backTitle }}</span>
                            </button>
                        </div>
                    </div>
                    <div
                        v-for="(group, i) in groups"
                        :key="group.id"
                        class="page-vertical-menu-group"
                        :class="{ disabled: !!group.disabled, 'border-top': i > 0 || !!backRoute }"
                    >
                        <div class="page-vertical-menu-group-name">{{ group.name }}</div>
                        <div class="page-vertical-menu-group-options">
                            <RouterLink
                                v-for="(o, j) in group.options"
                                :key="o.id"
                                :to="{ name: $route.name, params: $route.params, query: { tab: o.id } }"
                                class="page-vertical-menu-group-option"
                                :class="{
                                    current: current === o.id,
                                    disabled: !!o.disabled,
                                    'space-top': j > 0,
                                }"
                                @click="close"
                            >
                                <i v-if="o.icon" :class="o.icon"></i> <span>{{ o.name }}</span>
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useVModel } from "@/utils/v-model";
import { goBackFromContext } from "@/utils/route-to";

interface MenuOption {
    id: string;
    name: string;
    icon: string;
    disabled?: boolean;
}

interface MenuOptionGroup {
    id: string;
    name: string;
    options: MenuOption[];
    disabled?: boolean;
}

export default defineComponent({
    name: "VerticalMenuModal",
    emits: ["update:display", "select-option"],

    props: {
        display: Boolean,
        title: String,
        groups: Array as PropType<MenuOptionGroup[]>,
        current: String,
        backRoute: Object as PropType<RouteLocationRaw>,
        backTitle: String,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
        };
    },
    methods: {
        close: function () {
            this.$closeModal();
        },

        goBack: function () {
            if (!this.backRoute) {
                return;
            }
            this.close();
            goBackFromContext(this, this.backRoute, { preferHistory: false });
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

<style></style>
