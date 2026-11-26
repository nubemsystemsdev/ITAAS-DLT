// Wallets controller

import { Request } from "@asanrom/request-browser";
import { Timeouts } from "@/utils/timeout";
import { AppEvents } from "./app-events";
import { AuthController } from "./auth";
import { WalletInfo } from "@/api/definitions";
import { ApiWallet } from "@/api/api-group-wallet";
import { getDefaultWallet, setDefaultWallet } from "./app-preferences";

export interface WalletListItem {
    id: string;
    name: string;
    address: string;
    did?: string;
}

export class WalletsController {
    public static Wallets: WalletListItem[] = [];

    private static walletPresenceKnown: boolean | null = null;

    private static loadInFlightPromise: Promise<void> | null = null;

    private static presenceCheckPromise: Promise<boolean> | null = null;

    private static clearWalletPresenceState(): void {
        WalletsController.walletPresenceKnown = null;
        WalletsController.loadInFlightPromise = null;
        WalletsController.presenceCheckPromise = null;
    }

    /**
     * Resolves whether the authenticated user has a wallet (navigation guard semantics).
     * Reuses an in-flight {@link Load} or cached definitive result; does not call the API on every route change.
     */
    public static resolveUserHasWallet(): Promise<boolean> {
        if (!AuthController.isAuthenticated()) {
            return Promise.resolve(false);
        }

        if (WalletsController.walletPresenceKnown !== null) {
            return Promise.resolve(WalletsController.walletPresenceKnown);
        }

        if (WalletsController.loadInFlightPromise) {
            return WalletsController.loadInFlightPromise.then(() => {
                if (WalletsController.walletPresenceKnown !== null) {
                    return WalletsController.walletPresenceKnown;
                }
                // Do not block navigation on temporary API failures.
                return true;
            });
        }

        if (WalletsController.presenceCheckPromise) {
            return WalletsController.presenceCheckPromise;
        }

        WalletsController.presenceCheckPromise = WalletsController.fetchUserHasWallet();
        return WalletsController.presenceCheckPromise;
    }

    private static fetchUserHasWallet(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            Request.Do(ApiWallet.GetWallet())
                .onSuccess(() => {
                    WalletsController.walletPresenceKnown = true;
                    WalletsController.presenceCheckPromise = null;
                    resolve(true);
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            WalletsController.walletPresenceKnown = false;
                            WalletsController.presenceCheckPromise = null;
                            resolve(false);
                        },
                        unauthorized: () => {
                            AuthController.ClearSession();
                            WalletsController.walletPresenceKnown = false;
                            WalletsController.presenceCheckPromise = null;
                            resolve(false);
                        },
                        temporalError: () => {
                            WalletsController.presenceCheckPromise = null;
                            // Do not block navigation on temporary API failures.
                            resolve(true);
                        },
                    });
                })
                .onUnexpectedError(() => {
                    WalletsController.presenceCheckPromise = null;
                    // Do not block navigation on temporary API failures.
                    resolve(true);
                });
        });
    }

    private static mapWalletInfoToListItem(wallet: WalletInfo): WalletListItem {
        const address = (wallet.address || "") + "";
        return {
            id: (wallet.id || "") + "",
            name: (wallet.did || "") + "",
            address,
            did: wallet.did,
        };
    }

    public static GetWallets(): WalletListItem[] {
        return WalletsController.Wallets.slice();
    }

    public static CurrentWalletId = "";
    public static CurrentWalletAddress = "";
    public static CurrentWalletName = "";

    public static Initialize() {
        WalletsController.Load();
        AppEvents.AddEventListener("auth-status-changed", WalletsController.Load);
    }

    public static Load() {
        Timeouts.Abort("wallets-controller-load-list");
        Request.Abort("wallets-controller-load-list");

        if (!AuthController.isAuthenticated()) {
            WalletsController.clearWalletPresenceState();
            WalletsController.CurrentWalletId = "";
            WalletsController.CurrentWalletAddress = "";
            WalletsController.CurrentWalletName = "";
            AppEvents.Emit(
                "current-wallet-changed",
                WalletsController.CurrentWalletId,
                WalletsController.CurrentWalletAddress,
                WalletsController.CurrentWalletName,
            );
            return; // Not logged in
        }

        WalletsController.walletPresenceKnown = null;

        WalletsController.loadInFlightPromise = new Promise<void>((resolveLoad) => {
            Request.Pending("wallets-controller-load-list", ApiWallet.GetWallet())
                .onSuccess((walletInfo: WalletInfo) => {
                    WalletsController.walletPresenceKnown = !!walletInfo;
                    const result: WalletListItem[] = walletInfo ? [WalletsController.mapWalletInfoToListItem(walletInfo)] : [];

                    WalletsController.Wallets = result;

                    AppEvents.Emit("wallet-list-changed");

                    const prefWalletId = getDefaultWallet(AuthController.UID);
                    const prefWallet = result.filter((w) => {
                        return w.id === prefWalletId || w.address === prefWalletId;
                    });

                    if (prefWallet.length > 0) {
                        WalletsController.CurrentWalletId = prefWallet[0].id;
                        WalletsController.CurrentWalletAddress = prefWallet[0].address;
                        WalletsController.CurrentWalletName = prefWallet[0].name;
                    } else if (result.length > 0) {
                        WalletsController.CurrentWalletId = result[0].id;
                        WalletsController.CurrentWalletAddress = result[0].address;
                        WalletsController.CurrentWalletName = result[0].name;
                    } else {
                        WalletsController.CurrentWalletId = "";
                        WalletsController.CurrentWalletAddress = "";
                        WalletsController.CurrentWalletName = "";
                    }
                    AppEvents.Emit(
                        "current-wallet-changed",
                        WalletsController.CurrentWalletId,
                        WalletsController.CurrentWalletAddress,
                        WalletsController.CurrentWalletName,
                    );
                    resolveLoad();
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            WalletsController.walletPresenceKnown = false;
                            WalletsController.Wallets = [];
                            WalletsController.CurrentWalletId = "";
                            WalletsController.CurrentWalletAddress = "";
                            WalletsController.CurrentWalletName = "";
                            AppEvents.Emit("wallet-list-changed");
                            AppEvents.Emit(
                                "current-wallet-changed",
                                WalletsController.CurrentWalletId,
                                WalletsController.CurrentWalletAddress,
                                WalletsController.CurrentWalletName,
                            );
                            resolveLoad();
                        },
                        unauthorized: () => {
                            WalletsController.walletPresenceKnown = false;
                            AppEvents.Emit("unauthorized");
                            resolveLoad();
                        },
                        temporalError: () => {
                            resolveLoad();
                            // Retry
                            Timeouts.Set("wallets-controller-load-list", 1500, WalletsController.Load);
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    resolveLoad();
                    // Retry
                    Timeouts.Set("wallets-controller-load-list", 1500, WalletsController.Load);
                });
        });

        WalletsController.loadInFlightPromise.finally(() => {
            WalletsController.loadInFlightPromise = null;
        });
    }

    public static SetDefaultWallet(wallet: WalletInfo | WalletListItem) {
        const walletEntry = "id" in wallet && "name" in wallet ? wallet : WalletsController.mapWalletInfoToListItem(wallet);

        WalletsController.walletPresenceKnown = true;
        WalletsController.presenceCheckPromise = null;
        setDefaultWallet(AuthController.UID, walletEntry.id);
        WalletsController.CurrentWalletId = walletEntry.id;
        WalletsController.CurrentWalletAddress = walletEntry.address;
        WalletsController.CurrentWalletName = walletEntry.name;
        AppEvents.Emit(
            "current-wallet-changed",
            WalletsController.CurrentWalletId,
            WalletsController.CurrentWalletAddress,
            WalletsController.CurrentWalletName,
        );
    }
}
