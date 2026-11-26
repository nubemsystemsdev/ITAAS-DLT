<template>
    <form @submit="submit" class="create-wallet-form">
        <p v-if="showHint" class="create-wallet-form-hint">{{ $t("Choose a strong password to secure your new wallet.") }}</p>

        <div class="form-group login-input-group auth-input-group">
            <label for="create-wallet-password">{{ $t("Wallet password") }}</label>
            <div
                class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
            >
                <PasswordInput
                    id="create-wallet-password"
                    :disabled="busy"
                    v-model:val="password"
                    name="create-wallet-password"
                    :auto-focus="true"
                    :is-new-password="true"
                    :aria-invalid="errorPassword ? 'true' : undefined"
                    :aria-describedby="errorPassword ? 'create-wallet-password-error' : undefined"
                ></PasswordInput>
            </div>
            <div v-if="errorPassword" id="create-wallet-password-error" class="form-error" role="alert">{{ errorPassword }}</div>
        </div>

        <div class="form-group login-input-group auth-input-group">
            <label for="create-wallet-password-2">{{ $t("Repeat the password") }}</label>
            <div
                class="login-field-wrapper login-password-wrapper auth-password-wrapper form-control-accent-wrapper form-control-auth-password"
            >
                <PasswordInput
                    id="create-wallet-password-2"
                    :disabled="busy"
                    v-model:val="password2"
                    name="create-wallet-password-2"
                    :is-new-password="true"
                    :is-repeated-password="true"
                    :aria-invalid="errorPassword ? 'true' : undefined"
                    :aria-describedby="errorPassword ? 'create-wallet-password-error' : undefined"
                ></PasswordInput>
            </div>
        </div>

        <div class="create-wallet-form-advanced auth-input-group">
            <button
                type="button"
                class="create-wallet-form-advanced-toggle"
                :aria-expanded="advancedKeysExpanded"
                aria-controls="create-wallet-form-advanced-panel"
                :disabled="busy"
                @click="toggleAdvancedKeys"
            >
                <span class="create-wallet-form-advanced-toggle-label">
                    {{ $t("Import existing keys") }}
                    <span class="create-wallet-form-optional-badge">{{ $t("(optional)") }}</span>
                </span>
                <i
                    class="fas fa-chevron-down create-wallet-form-chevron"
                    :class="{ 'create-wallet-form-chevron--open': advancedKeysExpanded }"
                    aria-hidden="true"
                ></i>
            </button>

            <div v-show="advancedKeysExpanded" id="create-wallet-form-advanced-panel" class="create-wallet-form-advanced-panel">
                <p class="create-wallet-form-advanced-hint" role="note">
                    <i class="fas fa-circle-info" aria-hidden="true"></i>
                    <span>{{
                        $t("Leave these fields empty to create a new wallet automatically, or enter your keys to import an existing one.")
                    }}</span>
                </p>

                <div class="form-group login-input-group auth-input-group">
                    <label for="create-wallet-private-key-ec">{{
                        $t("ECDSA private key (hexadecimal, 32 bytes). Leave blank to generate a random wallet.")
                    }}</label>
                    <textarea
                        id="create-wallet-private-key-ec"
                        class="form-control form-control-full-width form-textarea"
                        rows="1"
                        :disabled="busy"
                        v-model="privateKeyEc"
                        :aria-invalid="errorPrivateKeyEc ? 'true' : undefined"
                        :aria-describedby="errorPrivateKeyEc ? 'create-wallet-private-key-ec-error' : undefined"
                    ></textarea>
                    <div v-if="errorPrivateKeyEc" id="create-wallet-private-key-ec-error" class="form-error" role="alert">
                        {{ errorPrivateKeyEc }}
                    </div>
                </div>

                <div class="form-group login-input-group auth-input-group">
                    <label for="create-wallet-private-key-ml">{{
                        $t("ML-DSA secret key (hexadecimal). Leave blank unless importing an existing ML-DSA key pair.")
                    }}</label>
                    <textarea
                        id="create-wallet-private-key-ml"
                        class="form-control form-control-full-width form-textarea"
                        rows="1"
                        :disabled="busy"
                        v-model="privateKeyMl"
                        :aria-invalid="errorPrivateKeyMl ? 'true' : undefined"
                        :aria-describedby="errorPrivateKeyMl ? 'create-wallet-private-key-ml-error' : undefined"
                    ></textarea>
                    <div v-if="errorPrivateKeyMl" id="create-wallet-private-key-ml-error" class="form-error" role="alert">
                        {{ errorPrivateKeyMl }}
                    </div>
                </div>

                <div class="form-group login-input-group auth-input-group">
                    <label for="create-wallet-public-key-ml">{{
                        $t("ML-DSA public key (hexadecimal). Must be provided together with the ML-DSA secret key.")
                    }}</label>
                    <textarea
                        id="create-wallet-public-key-ml"
                        class="form-control form-control-full-width form-textarea"
                        rows="1"
                        :disabled="busy"
                        v-model="publicKeyMl"
                        :aria-invalid="errorPublicKeyMl ? 'true' : undefined"
                        :aria-describedby="errorPublicKeyMl ? 'create-wallet-public-key-ml-error' : undefined"
                    ></textarea>
                    <div v-if="errorPublicKeyMl" id="create-wallet-public-key-ml-error" class="form-error" role="alert">
                        {{ errorPublicKeyMl }}
                    </div>
                </div>
            </div>
        </div>

        <div class="form-group-buttons">
            <button type="submit" :disabled="busy" class="btn btn-primary">
                <i class="fas fa-wallet" aria-hidden="true"></i>
                {{ $t("Create wallet") }}
            </button>
        </div>
        <div class="form-error" v-if="error" role="alert">{{ error }}</div>
    </form>

    <ReplaceWalletConfirmationModal v-model:display="showReplaceModal" @confirm="onReplaceConfirmed" />
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { getUniqueStringId } from "@/utils/unique-id";

import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";

import PasswordInput from "@/components/utils/PasswordInput.vue";
import ReplaceWalletConfirmationModal from "@/components/modals/ReplaceWalletConfirmationModal.vue";
import { ApiWallet } from "@/api/api-group-wallet";
import type { WalletInfo } from "@/api/definitions";

export default defineComponent({
    name: "CreateWalletForm",
    components: {
        PasswordInput,
        ReplaceWalletConfirmationModal,
    },
    emits: ["created"],
    props: {
        replace: Boolean,
        showHint: {
            type: Boolean,
            default: true,
        },
    },
    setup: function () {
        return {
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            privateKeyEc: "",
            privateKeyMl: "",
            publicKeyMl: "",
            errorPrivateKeyEc: "",
            errorPrivateKeyMl: "",
            errorPublicKeyMl: "",

            password: "",
            password2: "",
            errorPassword: "",

            error: "",
            busy: false,
            advancedKeysExpanded: false,
            showReplaceModal: false,
        };
    },
    methods: {
        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },

        toggleAdvancedKeys: function () {
            this.advancedKeysExpanded = !this.advancedKeysExpanded;
        },

        submit: function (e: Event) {
            if (e) {
                e.preventDefault();
            }

            if (this.busy) {
                return;
            }

            this.error = "";
            this.errorPassword = "";
            this.errorPrivateKeyEc = "";
            this.errorPrivateKeyMl = "";
            this.errorPublicKeyMl = "";

            if (!this.password) {
                this.errorPassword = this.$t("You must specify a password");
                return;
            }

            if (this.password !== this.password2) {
                this.errorPassword = this.$t("The passwords do not match");
                return;
            }

            const privateKeyMl = this.privateKeyMl.trim();
            const publicKeyMl = this.publicKeyMl.trim();

            if ((privateKeyMl && !publicKeyMl) || (!privateKeyMl && publicKeyMl)) {
                const mlPairError = this.$t("You must provide both the ML-DSA secret key and the public key together");
                if (!privateKeyMl) {
                    this.errorPrivateKeyMl = mlPairError;
                }
                if (!publicKeyMl) {
                    this.errorPublicKeyMl = mlPairError;
                }
                this.advancedKeysExpanded = true;
                return;
            }

            if (this.replace) {
                this.showReplaceModal = true;
                return;
            }

            this.doCreate();
        },

        onReplaceConfirmed: function () {
            this.doCreate();
        },

        doCreate: function () {
            if (this.busy) {
                return;
            }

            const privateKeyEc = this.privateKeyEc.trim();
            const privateKeyMl = this.privateKeyMl.trim();
            const publicKeyMl = this.publicKeyMl.trim();

            this.busy = true;

            Request.Pending(
                this.saveRequestId,
                ApiWallet.CreateWallet({
                    password: this.password,
                    privateKeyEc: privateKeyEc || undefined,
                    privateKeyMl: privateKeyMl || undefined,
                    publicKeyMl: publicKeyMl || undefined,
                }),
            )
                .onSuccess((w: WalletInfo) => {
                    this.busy = false;
                    this.showReplaceModal = false;
                    this.password = "";
                    this.password2 = "";
                    this.privateKeyEc = "";
                    this.privateKeyMl = "";
                    this.publicKeyMl = "";

                    this.$showSnackBar(this.$t("Wallet successfully created!"));
                    this.$emit("created", w);
                })
                .onCancel(() => {
                    this.busy = false;
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        badRequestWeakPassword: () => {
                            this.errorPassword = this.$t("The provided password is too short");
                        },
                        badRequestInvalidPrivateKeyEc: () => {
                            this.errorPrivateKeyEc = this.$t("Invalid private key provided");
                            this.advancedKeysExpanded = true;
                        },
                        badRequestInvalidPrivateKeyMl: () => {
                            this.errorPrivateKeyMl = this.$t("Invalid ML-DSA secret key provided");
                            this.advancedKeysExpanded = true;
                        },
                        badRequestInvalidPublicKeyMl: () => {
                            this.errorPublicKeyMl = this.$t("Invalid ML-DSA public key provided");
                            this.advancedKeysExpanded = true;
                        },
                        badRequestErrorCreatingWallet: () => {
                            this.error = this.$t("Could not create wallet");
                        },
                        badRequest: () => {
                            this.error = this.$t("Bad request");
                        },
                        serverError: () => {
                            this.error = this.$t("Internal server error");
                        },
                        networkError: () => {
                            this.error = this.$t("Could not connect to the server");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.error = err.message;
                    console.error(err);
                    this.busy = false;
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));

        if (AuthController.isAuthenticated()) {
            this.$autoFocus();
        } else {
            this.$requireLogin();
        }
    },
    beforeUnmount: function () {
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped>
.create-wallet-form-hint {
    margin: 0 0 var(--space-12);
    color: var(--color-text-muted);
    font-size: 0.875rem;
}

.create-wallet-form-advanced {
    margin-bottom: var(--space-12);
    padding: var(--space-8);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-elevated);
    box-shadow: var(--elevation-1);
}

.create-wallet-form-advanced-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    width: 100%;
    min-height: 44px;
    padding: var(--space-4) var(--space-8);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--auth-font-label);
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.create-wallet-form-advanced-toggle:not(:disabled):hover {
    background: var(--color-bg-surface);
}

.create-wallet-form-advanced-toggle:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.create-wallet-form-advanced-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

.create-wallet-form-advanced-toggle-label {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-4);
    text-align: left;
}

.create-wallet-form-optional-badge {
    color: var(--color-text-muted);
    font-weight: 400;
}

.create-wallet-form-chevron {
    flex-shrink: 0;
    color: var(--color-text-primary);
    transition: transform 0.2s ease;
}

.create-wallet-form-chevron--open {
    transform: rotate(180deg);
}

.create-wallet-form-advanced-panel {
    margin-top: var(--space-8);
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-neutral-light);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.create-wallet-form-advanced-hint {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    margin: 0;
    padding: var(--space-8) var(--space-12);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-neutral-light);
    border-left: 2px solid var(--color-brand-secondary);
    background: var(--color-bg-surface);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
}

.create-wallet-form-advanced-hint i {
    flex-shrink: 0;
    margin-top: var(--space-4);
    color: var(--color-accent-readable);
    font-size: 16px;
    line-height: 1;
}

.dark-theme .create-wallet-form-advanced {
    border-color: var(--outline-variant);
    background: var(--surface-container-high);
}

.dark-theme .create-wallet-form-advanced-panel {
    border-top-color: var(--outline-variant);
}

.dark-theme .create-wallet-form-advanced-hint {
    background: var(--surface-container-lowest);
    border-color: var(--outline-variant);
    border-left-color: var(--color-brand-secondary);
    color: var(--color-text-muted);
}

.dark-theme .create-wallet-form-advanced-toggle:not(:disabled):hover {
    background: var(--surface-container-lowest);
}
</style>
