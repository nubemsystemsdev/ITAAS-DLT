<template>
    <div class="content-inner" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <div v-else-if="notFound" class="my-wallet-empty">
            <p class="details-view-state-message">{{ $t("You do not have a wallet yet.") }}</p>
            <div class="my-wallet-empty-actions">
                <RouterLink :to="{ name: 'create-wallet' }" class="btn btn-primary">
                    <i class="fas fa-wallet" aria-hidden="true"></i>
                    {{ $t("Create wallet") }}
                </RouterLink>
            </div>
        </div>

        <div v-else class="my-wallet-content">
            <dl class="details-view-list">
                <div class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-fingerprint details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Wallet ID") }}
                    </dt>
                    <dd class="details-view-value my-wallet-value">
                        <span class="my-wallet-value-text" :title="walletId">{{ displayWalletId }}</span>
                        <CopyIconButton :text="walletId" success-message="Copied to clipboard!" />
                    </dd>
                </div>

                <div v-if="walletDid" class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-id-card details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("User DID") }}
                    </dt>
                    <dd class="details-view-value my-wallet-value">
                        <span class="my-wallet-value-text" :title="walletDid">{{ displayWalletDid }}</span>
                        <CopyIconButton :text="walletDid" success-message="Copied to clipboard!" />
                    </dd>
                </div>

                <div class="details-view-list-item">
                    <dt class="details-view-label">
                        <i class="fas fa-wallet details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Wallet address") }}
                    </dt>
                    <dd class="details-view-value my-wallet-value">
                        <span class="my-wallet-value-text" :title="walletAddress">{{ displayWalletAddress }}</span>
                        <CopyIconButton :text="walletAddress" />
                    </dd>
                </div>
            </dl>

            <section class="my-wallet-actions">
                <h3 class="my-wallet-actions-title">{{ $t("Security") }}</h3>
                <p class="my-wallet-actions-description">{{ $t("Manage your wallet keys and password.") }}</p>

                <div class="my-wallet-actions-group">
                    <button
                        type="button"
                        class="btn"
                        :class="activeAction === 'create' ? 'btn-primary' : 'btn-tertiary'"
                        @click="toggleAction('create')"
                    >
                        <i class="fas fa-plus" aria-hidden="true"></i>
                        {{ $t("Create new wallet") }}
                    </button>
                    <button
                        type="button"
                        class="btn"
                        :class="activeAction === 'change-password' ? 'btn-primary' : 'btn-tertiary'"
                        @click="toggleAction('change-password')"
                    >
                        <i class="fas fa-key" aria-hidden="true"></i>
                        {{ $t("Change wallet password") }}
                    </button>
                    <button
                        type="button"
                        class="btn"
                        :class="activeAction === 'export' ? 'btn-primary' : 'btn-tertiary'"
                        @click="toggleAction('export')"
                    >
                        <i class="fas fa-file-export" aria-hidden="true"></i>
                        {{ $t("Export wallet key") }}
                    </button>
                </div>

                <div v-if="activeAction === 'create'" class="my-wallet-action-panel">
                    <h4 class="my-wallet-action-panel-title">{{ $t("Create new wallet") }}</h4>
                    <CreateWalletForm :replace="hasWallet" @created="onWalletCreated" />
                </div>

                <div v-else-if="activeAction === 'change-password'" class="my-wallet-action-panel">
                    <ChangePasswordPage :wallet-id="walletId" />
                </div>

                <div v-else-if="activeAction === 'export'" class="my-wallet-action-panel">
                    <ExportKeyPage :wallet-id="walletId" :wallet-address="walletAddress" />
                </div>
            </section>
        </div>
    </div>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent } from "vue";

import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import CopyIconButton from "@/components/ui/CopyIconButton.vue";
import { AuthController } from "@/control/auth";
import { ApiWallet } from "@/api/api-group-wallet";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { Request } from "@asanrom/request-browser";
import type { WalletInfo } from "@/api/definitions";
import { ASYNC_COMPONENT_LOADER_DELAY_MS } from "@/constants/ui";
import { WalletsController } from "@/control/wallets";
import { truncateMiddle } from "@/utils/text";

type WalletAction = "" | "create" | "export" | "change-password";

const ChangePasswordPage = defineAsyncComponent({
    loader: () => import("@/components/routes/wallet/ChangePasswordPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const ExportKeyPage = defineAsyncComponent({
    loader: () => import("@/components/routes/wallet/ExportKeyPage.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

const CreateWalletForm = defineAsyncComponent({
    loader: () => import("@/components/routes/wallet/CreateWalletForm.vue"),
    loadingComponent: ComponentLoader,
    delay: ASYNC_COMPONENT_LOADER_DELAY_MS,
});

export default defineComponent({
    name: "MyWalletPage",
    components: {
        ComponentLoader,
        CopyIconButton,
        ChangePasswordPage,
        ExportKeyPage,
        CreateWalletForm,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,
            notFound: false,
            walletId: "",
            walletAddress: "",
            walletDid: "",
            activeAction: "" as WalletAction,
        };
    },
    computed: {
        hasWallet: function (): boolean {
            return !!this.walletAddress;
        },
        displayWalletId: function (): string {
            return truncateMiddle(this.walletId, 32);
        },
        displayWalletDid: function (): string {
            return truncateMiddle(this.walletDid, 32);
        },
        displayWalletAddress: function (): string {
            return truncateMiddle(this.walletAddress, 24);
        },
    },
    methods: {
        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            if (!AuthController.isAuthenticated()) {
                this.loading = false;
                this.$requireLogin();
                return;
            }

            this.loading = true;

            Request.Pending(this.loadRequestId, ApiWallet.GetWallet())
                .onSuccess((wallet) => {
                    const address = (wallet.address || "") + "";
                    if (!address) {
                        this.notFound = true;
                        this.walletId = "";
                        this.walletAddress = "";
                        this.walletDid = "";
                    } else {
                        this.notFound = false;
                        this.walletId = (wallet.id || "") + "";
                        this.walletAddress = address;
                        this.walletDid = (wallet.did || "") + "";
                    }
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            this.notFound = true;
                            this.walletId = "";
                            this.walletAddress = "";
                            this.walletDid = "";
                            this.loading = false;
                        },
                        unauthorized: () => {
                            this.loading = false;
                            this.$requireLogin();
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

        toggleAction: function (action: WalletAction) {
            this.activeAction = this.activeAction === action ? "" : action;
        },

        onWalletCreated: function (_wallet: WalletInfo) {
            this.activeAction = "";
            WalletsController.Load();
            WalletsController.SetDefaultWallet(_wallet);
            this.load();
        },

        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }
            this.load();
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));
        this.$listenOnAppEvent("wallet-list-changed", this.load.bind(this));
        this.load();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
    },
});
</script>

<style scoped>
.my-wallet-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-32);
}

.my-wallet-empty {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.my-wallet-empty-actions {
    display: flex;
    justify-content: center;
}

.my-wallet-value {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    max-width: 100%;
}

.my-wallet-value-text {
    min-width: 0;
    overflow-wrap: anywhere;
}

.my-wallet-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding-top: var(--space-16);
    border-top: 1px solid var(--theme-border-color);
}

.my-wallet-actions-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.my-wallet-actions-description {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.875rem;
}

.my-wallet-actions-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
}

.my-wallet-action-panel {
    margin-top: var(--space-16);
    padding: var(--space-16);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
}

.my-wallet-action-panel-title {
    margin: 0 0 var(--space-16);
    font-size: 1rem;
    font-weight: 600;
}

.my-wallet-action-panel :deep(.form-group-buttons) {
    justify-content: flex-start;
}

@media (max-width: 640px) {
    .my-wallet-actions-group .btn {
        flex: 1 1 100%;
        width: 100%;
    }

    .my-wallet-action-panel :deep(.form-group-buttons) {
        flex-direction: column;
        align-items: stretch;
    }

    .my-wallet-action-panel :deep(.form-group-buttons .btn) {
        flex: 1 1 100%;
        width: 100%;
    }
}
</style>
