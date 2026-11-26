<template>
    <div class="content-inner" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <div v-if="!loading">
            <h2>{{ $t("Wallets") }}</h2>
            <div class="table-responsive">
                <table class="table table-stack">
                    <thead>
                        <tr>
                            <th>{{ $t("Name") }}</th>
                            <th>{{ $t("Address") }}</th>
                            <th>{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="wallets.length === 0">
                            <td colspan="4" class="table-feedback">{{ $t("You do not have any wallets yet.") }}</td>
                        </tr>
                        <tr v-for="w in wallets" :key="w.id">
                            <td :data-label="$t('Name')" class="table-stack-row-primary">
                                <RouterLink :to="{ name: 'wallet', params: { id: w.id } }">{{ w.name || "-" }}</RouterLink>
                            </td>
                            <td :data-label="$t('Address')">
                                {{ w.address }} (<a href="javascript:;" @click="copyAddress(w.address)"> {{ $t("Copy") }} </a>)
                            </td>
                            <td :data-label="$t('Actions')" class="actions-cell text-center td-shrink">
                                <RouterLink :to="{ name: 'wallet', params: { id: w.id } }" class="btn btn-primary btn-xs"
                                    ><i class="fas fa-cog"></i> {{ $t("Wallet settings") }}</RouterLink
                                >
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="form-group">
                <router-link :to="{ name: 'account-settings', query: { tab: 'create-wallet' } }" class="btn btn-primary">
                    <i class="fas fa-plus"></i> {{ $t("Create wallet") }}
                </router-link>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";

import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { ApiWallet } from "@/api/api-group-wallet";
import { WalletListItem } from "@/control/wallets";

export default defineComponent({
    name: "WalletsListPage",
    components: {
        ComponentLoader,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,

            wallets: [] as WalletListItem[],

            busy: false,
        };
    },
    methods: {
        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            this.loading = true;

            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }

            Request.Pending(this.loadRequestId, ApiWallet.GetWallet())
                .onSuccess((wallet) => {
                    const address = (wallet.address || "") + "";
                    this.wallets = address
                        ? [
                              {
                                  id: (wallet.id || "") + "",
                                  name: (wallet.did || "") + "",
                                  address,
                                  did: wallet.did,
                              },
                          ]
                        : [];
                    this.loading = false;

                    this.$autoFocus();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            this.wallets = [];
                            this.loading = false;
                        },
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            // Retry
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    // Retry
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },

        copyAddress: function (addr: string) {
            navigator.clipboard.writeText(addr);
            this.$showSnackBar(this.$t("Address copied to clipboard!"));
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));

        this.load();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
    },
});
</script>

<style scoped></style>
