<template>
    <div class="page-content" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>
        <div v-else-if="notFound">
            <h1>{{ $t("Wallet not found") }}</h1>
            <p>{{ $t("The wallet you are looking for was not found") }}</p>
            <p>
                <button type="button" class="btn btn-primary" @click="goBack">
                    <i class="fas fa-arrow-left"></i> {{ $t("Back to wallets list") }}
                </button>
            </p>
        </div>
        <VerticalMenuPageLayout
            v-else
            :title="$t('Wallet') + ': ' + (walletDid || walletAddress)"
            v-model:current="current"
            :back-route="backRoute"
            :back-title="$t('Back to wallets list')"
            :groups="[
                {
                    id: 'g-wallet',
                    name: $t('Wallet'),
                    options: [
                        {
                            id: 'details',
                            name: $t('Wallet details'),
                            icon: 'fas fa-wallet',
                        },
                    ],
                },
                {
                    id: 'g-security',
                    name: $t('Security'),
                    options: [
                        {
                            id: 'password',
                            name: $t('Change password'),
                            icon: 'fas fa-key',
                        },
                        {
                            id: 'key',
                            name: $t('Export key'),
                            icon: 'fas fa-key',
                        },
                    ],
                },
            ]"
        >
            <WalletDetailsPage
                v-if="current === 'details'"
                :wallet-id="walletId"
                :wallet-address="walletAddress"
                :wallet-did="walletDid"
            ></WalletDetailsPage>
            <ChangePasswordPage v-else-if="current === 'password'" :wallet-id="walletId"></ChangePasswordPage>
            <ExportKeyPage v-else-if="current === 'key'" :wallet-id="walletId" :wallet-address="walletAddress"></ExportKeyPage>
            <NotFoundContent v-else></NotFoundContent>
        </VerticalMenuPageLayout>
    </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from "vue";

import VerticalMenuPageLayout from "@/components/layout/VerticalMenuPageLayout.vue";
import NotFoundContent from "@/components/utils/NotFoundContent.vue";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { Request } from "@asanrom/request-browser";
import { ApiWallet } from "@/api/api-group-wallet";
import { ASYNC_COMPONENT_LOADER_DELAY_MS } from "@/constants/ui";
import { goBackFromContext } from "@/utils/route-to";

const WalletDetailsPage = defineAsyncComponent({
    loader: () => import("./WalletDetailsPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const ChangePasswordPage = defineAsyncComponent({
    loader: () => import("./ChangePasswordPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const ExportKeyPage = defineAsyncComponent({
    loader: () => import("./ExportKeyPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

export default defineComponent({
    name: "WalletSettingsPage",
    components: {
        VerticalMenuPageLayout,
        NotFoundContent,
        ComponentLoader,
        WalletDetailsPage,
        ChangePasswordPage,
        ExportKeyPage,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            walletId: (this.$route.params.id || "") + "",
            walletDid: "",
            walletAddress: "",

            loading: true,
            notFound: false,

            current: (this.$route.query.tab || "details") + "",
        };
    },
    computed: {
        backRoute: function () {
            return { name: "account-settings", query: { tab: "wallets" } };
        },
    },
    methods: {
        goBack: function () {
            goBackFromContext(this, this.backRoute, { preferHistory: false });
        },
        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            this.loading = true;

            Request.Pending(this.loadRequestId, ApiWallet.GetWallet())
                .onSuccess((wallet) => {
                    this.loading = false;
                    this.notFound = false;

                    this.walletId = (wallet.id || "") + "";
                    this.walletAddress = (wallet.address || "") + "";
                    this.walletDid = (wallet.did || "") + "";

                    const subtitleLabel = this.walletDid || this.walletAddress;
                    this.$setSubTitle(subtitleLabel + " | " + this.$t("Wallet"));
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Wallet"));
        this.load();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
    },
    watch: {
        $route: function () {
            this.current = (this.$route.query.tab || "details") + "";
        },
    },
});
</script>

<style></style>
