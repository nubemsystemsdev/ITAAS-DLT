<template>
    <div
        class="modal-container modal-container-corner no-transition"
        :class="{ hidden: !display }"
        tabindex="-1"
        role="dialog"
        :aria-modal="display ? 'true' : undefined"
        aria-labelledby="select-wallet-dialog-title"
        :aria-hidden="display ? undefined : 'true'"
        @click="close"
        @keydown="escapeToClose"
    >
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div id="select-wallet-dialog-title" class="modal-title">{{ $t("Wallet") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="modal-body no-padding">
                <div class="settings-list">
                    <div v-if="walletId && walletAddress" class="settings-list-item">
                        <div class="settings-list-item-icon">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            <div class="select-wallet-name">{{ walletName || "-" }}</div>
                            <div class="select-wallet-addr">{{ walletAddress }}</div>
                        </div>
                    </div>

                    <div
                        v-if="walletId && walletAddress"
                        class="settings-list-item"
                        tabindex="0"
                        @keydown="clickOnEnter"
                        @click="copyAddress(walletAddress)"
                    >
                        <div class="settings-list-item-icon">
                            <i class="fas fa-clone"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Copy wallet address") }}
                        </div>
                    </div>

                    <RouterLink
                        v-if="walletId && walletAddress"
                        :to="{ name: 'account-settings', query: { tab: 'wallet' } }"
                        class="settings-list-item"
                        @click="close"
                    >
                        <div class="settings-list-item-icon">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="settings-list-item-caption">
                            {{ $t("Wallet details") }}
                        </div>
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "@/utils/v-model";
import { FocusTrap } from "@/utils/focus-trap";
import { WalletsController } from "@/control/wallets";

export default defineComponent({
    name: "SelectWalletDropdown",
    emits: ["update:display", "openModal"],

    props: {
        display: Boolean,
    },
    setup(props) {
        return {
            focusTrap: null as FocusTrap,
            displayStatus: useVModel(props, "display"),
        };
    },
    data: function () {
        return {
            walletId: WalletsController.CurrentWalletId,
            walletName: WalletsController.CurrentWalletName,
            walletAddress: WalletsController.CurrentWalletAddress,
            wallets: WalletsController.GetWallets(),
        };
    },
    methods: {
        syncWalletState: function () {
            const list = WalletsController.GetWallets();
            this.wallets = list;

            let id = WalletsController.CurrentWalletId;
            let name = WalletsController.CurrentWalletName;
            let address = WalletsController.CurrentWalletAddress;

            if ((!id || !address) && list.length > 0) {
                id = list[0].id;
                name = list[0].name;
                address = list[0].address;
            }

            this.walletId = id;
            this.walletName = name;
            this.walletAddress = address;
        },

        close: function () {
            this.displayStatus = false;
        },

        escapeToClose: function (event) {
            if (event.key === "Escape") {
                this.close();
            }
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },

        clickOnEnter: function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                event.target.click();
            }
        },

        onCurrentWalletChanged: function () {
            this.syncWalletState();
        },

        onWalletListChanged: function () {
            this.syncWalletState();
        },

        copyAddress: function (addr: string) {
            navigator.clipboard.writeText(addr);
            this.$showSnackBar(this.$t("Address copied to clipboard!"));
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("current-wallet-changed", this.onCurrentWalletChanged.bind(this));
        this.$listenOnAppEvent("wallet-list-changed", this.onWalletListChanged.bind(this));

        this.syncWalletState();

        this.focusTrap = new FocusTrap(this.$el, this.close.bind(this), "top-bar-button-wallet");

        if (this.display) {
            this.focusTrap.activate();
            this.$autoFocus();
        }
    },
    beforeUnmount: function () {
        this.focusTrap.destroy();
    },
    watch: {
        display: function () {
            if (this.display) {
                this.syncWalletState();
                this.focusTrap.activate();
                this.$autoFocus();
            } else {
                this.focusTrap.deactivate();
            }
        },
    },
});
</script>

<style></style>
