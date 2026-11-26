<template>
    <div class="modal-container modal-container-login modal-container-opaque no-transition login-page-shell auth-page-shell" tabindex="-1">
        <div class="login-layout auth-layout">
            <div class="modal-dialog login-card auth-card create-wallet-page-card">
                <div class="login-card-header auth-card-header">
                    <div class="auth-actions">
                        <button
                            type="button"
                            class="btn btn-secondary"
                            :title="$t('Select your language')"
                            :aria-label="$t('Select your language')"
                            @click="selectLanguage"
                        >
                            <i class="fas fa-language blue-icon" aria-hidden="true"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-secondary"
                            :title="$t('Change theme')"
                            :aria-label="$t('Change theme')"
                            @click="invertTheme"
                        >
                            <i v-if="theme === 'dark'" class="fas fa-sun blue-icon" aria-hidden="true"></i>
                            <i v-else class="fas fa-moon blue-icon" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="auth-brand login-brand brand-in-card">
                        <div class="auth-brand-logo login-brand-logo">
                            <img :src="brandLogo" :alt="$t('Nubemsystems logo')" class="auth-brand-logo-image" />
                        </div>
                    </div>
                    <h2>{{ $t("Create wallet") }}</h2>
                    <p>{{ $t("To continue, you must create your wallet.") }}</p>
                </div>

                <CreateWalletForm :show-hint="false" @created="onWalletCreated" />
            </div>
        </div>
        <ChangeLanguageModal v-if="displayLanguageModal" v-model:display="displayLanguageModal"></ChangeLanguageModal>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import CreateWalletForm from "@/components/routes/wallet/CreateWalletForm.vue";
import ChangeLanguageModal from "@/components/modals/ChangeLanguageModal.vue";
import { WalletsController } from "@/control/wallets";
import { ColorThemeName, getTheme, setTheme } from "@/control/app-preferences";
import type { WalletInfo } from "@/api/definitions";
import nubemsystemsLogoLight from "@/assets/nubemsystem-logo-navy.png";
import nubemsystemsLogoDark from "@/assets/nubemsystem-logo-white.png";

export default defineComponent({
    name: "CreateWalletPage",
    components: {
        ChangeLanguageModal,
        CreateWalletForm,
    },
    data: function () {
        return {
            theme: getTheme(),
            displayLanguageModal: false,
        };
    },
    computed: {
        brandLogo: function (): string {
            return this.theme === "dark" ? nubemsystemsLogoDark : nubemsystemsLogoLight;
        },
    },
    methods: {
        onWalletCreated: function (wallet: WalletInfo) {
            WalletsController.Load();
            WalletsController.SetDefaultWallet(wallet);
            this.$router.push({ name: "dashboard" });
        },

        invertTheme: function () {
            setTheme(this.theme === "dark" ? "light" : "dark");
        },

        onThemeChanged: function (t: ColorThemeName) {
            this.theme = t;
        },

        selectLanguage: function () {
            this.displayLanguageModal = true;
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("theme-changed", this.onThemeChanged.bind(this));
    },
});
</script>

<style>
@import "@/style/auth.css";
</style>
