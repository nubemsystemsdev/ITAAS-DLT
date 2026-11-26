<template>
    <div class="page-vertical-menu-layout">
        <div class="page-vertical-head">
            <h1>{{ title }}</h1>
            <div class="page-vertical-head-menu">
                <button
                    type="button"
                    class="btn btn-primary page-vertical-head-menu-button"
                    :title="$t('Menu')"
                    :aria-label="$t('Menu')"
                    @click="openMenu"
                >
                    <i class="fas fa-bars no-margin" aria-hidden="true"></i>
                </button>
            </div>
        </div>
        <div class="page-vertical-rest">
            <div class="page-vertical-menu">
                <div v-if="backRoute" class="page-vertical-menu-group">
                    <div class="page-vertical-menu-group-options">
                        <button type="button" class="page-vertical-menu-group-option" @click="goBack">
                            <i class="fas fa-arrow-left"></i> <span>{{ backTitle }}</span>
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
                            :class="{ current: current === o.id, disabled: !!o.disabled, 'space-top': j > 0 }"
                        >
                            <i v-if="o.icon" :class="o.icon"></i> <span>{{ o.name }}</span>
                        </RouterLink>
                    </div>
                </div>
            </div>

            <div class="page-content-inner">
                <slot></slot>
            </div>

            <VerticalMenuModal
                v-if="displayMenuModal"
                v-model:display="displayMenuModal"
                :current="current"
                :groups="groups"
                :title="title"
                :back-route="backRoute"
                :back-title="backTitle"
            ></VerticalMenuModal>
        </div>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import VerticalMenuModal from "@/components/modals/VerticalMenuModal.vue";
import { RouteLocationRaw } from "vue-router";
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
    name: "VerticalMenuPageLayout",
    components: {
        VerticalMenuModal,
    },
    emits: ["update:current"],
    props: {
        title: String,
        groups: Array as PropType<MenuOptionGroup[]>,
        current: String,
        backRoute: Object as PropType<RouteLocationRaw>,
        backTitle: String,
    },
    data: function () {
        return {
            displayMenuModal: false,
        };
    },
    methods: {
        openMenu: function () {
            this.displayMenuModal = true;
        },
        goBack: function () {
            if (!this.backRoute) {
                return;
            }
            goBackFromContext(this, this.backRoute, { preferHistory: false });
        },
    },
    mounted: function () {},
    beforeUnmount: function () {},
});
</script>

<style>
@import "@/style/layout/page-nav-vertical.css";
</style>
