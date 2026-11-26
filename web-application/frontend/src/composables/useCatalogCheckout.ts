import { computed, onBeforeUnmount, ref, type Ref } from "vue";
import { Request } from "@asanrom/request-browser";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { ApiSubscriptions } from "@/api/api-group-subscriptions";
import type { PreviewCreateResponse, SubscriptionStatusResponse } from "@/api/definitions";
import type {
    CatalogActionType,
    CatalogEntry,
    CatalogPricingOption,
    CatalogSubscriptionInfo,
    PurchaseResultVariant,
} from "@/composables/catalog-domain";
import {
    buildCatalogSubscriptionsMap,
    getCatalogSubscriptionPriority,
    resolveCatalogPrimaryActionLabel,
    resolveCatalogPrimaryActionType,
} from "@/composables/useCatalogSubscriptionDomain";
import { getUniqueStringId } from "@/utils/unique-id";
import { badRequestOrgRequiredForMultiLicensePlanHandler } from "@/utils/subscription-domain";

interface UseCatalogCheckoutOptions {
    isAuthenticated: () => boolean;
    loading: Ref<boolean>;
    route: RouteLocationNormalizedLoaded;
    router: Router;
    selectedEntry: Ref<CatalogEntry | null>;
    getSelectedPricingOption: (entry: CatalogEntry) => CatalogPricingOption | null;
    getSelectedQuantity: (entry: CatalogEntry) => number;
    getRedeemTokensForEntry: (entry: CatalogEntry) => number;
    updateEntryQuoteFromPreview: (entry: CatalogEntry, preview: PreviewCreateResponse, requestedTokens: number) => number;
    loadTokenBalance: () => Promise<unknown>;
    refreshEntryTokenQuote: (entry: CatalogEntry) => Promise<void>;
    failActionWithMessage: (title: string, message: string) => void;
    openCheckoutPage: (checkoutUrl: string) => void;
    requireLogin: () => void;
    showSnackBar: (message: string) => void;
    goToSubscriptions: () => void | Promise<void>;
    translate: (key: string) => string;
}

export function useCatalogCheckout(options: UseCatalogCheckoutOptions) {
    const subscriptionsBySubscribableId = ref<Record<string, CatalogSubscriptionInfo>>({});
    const actionInProgressEntryId = ref("");
    const displayPurchaseResultModal = ref(false);
    const purchaseResultModalVariant = ref<PurchaseResultVariant>("success");
    const purchaseResultModalTitle = ref("");
    const purchaseResultModalMessage = ref("");
    const catalogNotice = ref("");

    const subscriptionStatusRequestId = `nubem-subscriptions-status-${getUniqueStringId()}`;
    const previewCreateRequestId = `nubem-preview-create-${getUniqueStringId()}`;
    const createSubscriptionRequestId = `nubem-create-subscription-${getUniqueStringId()}`;
    const completePendingRequestId = `nubem-complete-pending-${getUniqueStringId()}`;

    const purchaseResultModalIconClass = computed(() => {
        if (purchaseResultModalVariant.value === "success") {
            return "fas fa-circle-check";
        }
        if (purchaseResultModalVariant.value === "cancel") {
            return "fas fa-circle-exclamation";
        }
        return "fas fa-circle-xmark";
    });

    const purchaseResultModalToneClass = computed(() => {
        if (purchaseResultModalVariant.value === "success") {
            return "is-success";
        }
        if (purchaseResultModalVariant.value === "cancel") {
            return "is-warning";
        }
        return "is-error";
    });

    const runRequest = <T>(requestId: string, requestParams: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            Request.Abort(requestId);
            Request.Pending(requestId, requestParams)
                .onSuccess((response) => {
                    resolve(response as T);
                })
                .onCancel(() => {
                    reject(new Error("REQUEST_CANCELLED"));
                })
                .onRequestError((err) => {
                    reject(err instanceof Error ? err : new Error("REQUEST_ERROR"));
                })
                .onUnexpectedError((err) => {
                    reject(err instanceof Error ? err : new Error("UNEXPECTED_ERROR"));
                });
        });
    };

    const isRequestCancelled = (error: unknown): boolean => {
        return error instanceof Error && error.message === "REQUEST_CANCELLED";
    };

    const openPurchaseResultModal = (variant: PurchaseResultVariant, title: string, message: string): void => {
        purchaseResultModalVariant.value = variant;
        purchaseResultModalTitle.value = options.translate(title);
        purchaseResultModalMessage.value = options.translate(message);
        displayPurchaseResultModal.value = true;
    };

    const closePurchaseResultModal = (): void => {
        displayPurchaseResultModal.value = false;
    };

    const stopPurchaseResultEvent = (event: Event): void => {
        event.stopPropagation();
    };

    const loadSubscriptionStatuses = async (): Promise<Record<string, CatalogSubscriptionInfo>> => {
        if (!options.isAuthenticated()) {
            subscriptionsBySubscribableId.value = {};
            return {};
        }

        const statusResponse = await runRequest<SubscriptionStatusResponse>(
            subscriptionStatusRequestId,
            ApiSubscriptions.GetSubscriptionStatus({}),
        );
        const subscriptions = buildCatalogSubscriptionsMap(statusResponse.subscriptions || []);
        subscriptionsBySubscribableId.value = subscriptions;
        return subscriptions;
    };

    const getSubscriptionByOption = (option: CatalogPricingOption | null): CatalogSubscriptionInfo | null => {
        if (!option || !option.subscribableId) {
            return null;
        }
        return subscriptionsBySubscribableId.value[option.subscribableId] || null;
    };

    const getEntrySubscription = (entry: CatalogEntry): CatalogSubscriptionInfo | null => {
        let selectedSubscription: CatalogSubscriptionInfo | null = null;

        for (const option of entry.pricingOptions) {
            if (!option.subscribableId) {
                continue;
            }

            const optionSubscription = subscriptionsBySubscribableId.value[option.subscribableId];
            if (!optionSubscription) {
                continue;
            }

            if (
                !selectedSubscription ||
                getCatalogSubscriptionPriority(optionSubscription) > getCatalogSubscriptionPriority(selectedSubscription)
            ) {
                selectedSubscription = optionSubscription;
            }
        }

        return selectedSubscription;
    };

    const getPrimaryActionType = (entry: CatalogEntry): CatalogActionType => {
        const selectedOption = options.getSelectedPricingOption(entry);
        const selectedSubscription = getSubscriptionByOption(selectedOption);
        return resolveCatalogPrimaryActionType({
            selectedOption,
            selectedSubscription,
            isAuthenticated: options.isAuthenticated(),
        });
    };

    const getPrimaryActionLabel = (entry: CatalogEntry): string => {
        return resolveCatalogPrimaryActionLabel(getPrimaryActionType(entry));
    };

    const isPrimaryActionDisabled = (entry: CatalogEntry): boolean => {
        if (options.loading.value) {
            return true;
        }
        if (actionInProgressEntryId.value) {
            return true;
        }
        return getPrimaryActionType(entry) === "unavailable";
    };

    const isEntryActionRunning = (entry: CatalogEntry): boolean => {
        return actionInProgressEntryId.value === entry.id;
    };

    const getCheckoutReturnUrl = (result: "success" | "cancel" | "error"): string => {
        const url = new URL(window.location.href);
        url.searchParams.set("checkout_result", result);
        url.searchParams.set("checkout_flow", "subscription");
        return url.toString();
    };

    const refreshSubscriptionsOnly = async (): Promise<void> => {
        try {
            catalogNotice.value = "";
            await loadSubscriptionStatuses();
            await options.loadTokenBalance();
            if (options.selectedEntry.value) {
                try {
                    await options.refreshEntryTokenQuote(options.selectedEntry.value);
                } catch (error) {
                    if (!isRequestCancelled(error)) {
                        console.error(error);
                    }
                }
            }
        } catch (error) {
            if (isRequestCancelled(error)) {
                return;
            }
            console.error(error);
            catalogNotice.value = "Subscription status could not be updated right now.";
        }
    };

    const handleCheckoutReturnResult = (): void => {
        const queryResult = String(options.route.query.checkout_result || options.route.query.subscription || "");
        const normalizedResult = queryResult.trim().toLowerCase();

        if (!["success", "cancel", "error"].includes(normalizedResult)) {
            return;
        }

        if (normalizedResult === "success") {
            openPurchaseResultModal("success", "Purchase completed", "Your purchase was completed successfully.");
            void refreshSubscriptionsOnly();
        } else if (normalizedResult === "cancel") {
            openPurchaseResultModal("cancel", "Purchase cancelled", "The checkout was cancelled. You can try again whenever you want.");
        } else {
            openPurchaseResultModal("error", "Purchase failed", "An error occurred while processing your checkout. Please try again.");
        }

        const nextQuery = { ...(options.route.query as Record<string, string>) };
        delete nextQuery.checkout_result;
        delete nextQuery.checkout_flow;
        delete nextQuery.subscription;
        delete nextQuery.session_id;

        void options.router.replace({ query: nextQuery }).catch(() => {
            // Ignore duplicated navigation.
        });
    };

    const onPrimaryAction = (entry: CatalogEntry): void => {
        const actionType = getPrimaryActionType(entry);

        if (actionType === "unavailable") {
            options.failActionWithMessage("Unavailable", "This entry does not have active pricing yet.");
            return;
        }

        if (actionType === "manage") {
            void options.goToSubscriptions();
            return;
        }

        if (!options.isAuthenticated()) {
            options.requireLogin();
            return;
        }

        const selectedOption = options.getSelectedPricingOption(entry);
        if (!selectedOption || !selectedOption.subscribableId) {
            options.failActionWithMessage("Unavailable", "This entry does not have active pricing yet.");
            return;
        }

        const requestedRedeemTokens = options.getRedeemTokensForEntry(entry);
        const requestedQuantity = Math.max(1, Math.floor(Number(options.getSelectedQuantity(entry)) || 1));
        actionInProgressEntryId.value = entry.id;

        if (actionType === "complete_pending") {
            const selectedSubscription = getSubscriptionByOption(selectedOption);
            if (!selectedSubscription) {
                actionInProgressEntryId.value = "";
                options.failActionWithMessage("Not found", "Pending subscription not found.");
                return;
            }

            Request.Abort(completePendingRequestId);
            Request.Pending(
                completePendingRequestId,
                ApiSubscriptions.CompletePendingSubscription({
                    subscription_id: selectedSubscription.id,
                    redeem_tokens: requestedRedeemTokens,
                    success_url: getCheckoutReturnUrl("success"),
                    cancel_url: getCheckoutReturnUrl("cancel"),
                } as any),
            )
                .onSuccess((result) => {
                    actionInProgressEntryId.value = "";

                    if (result.checkout_url) {
                        options.openCheckoutPage(result.checkout_url);
                        return;
                    }

                    options.showSnackBar(options.translate("Pending subscription updated"));
                    void refreshSubscriptionsOnly();
                })
                .onRequestError((err, handleErr) => {
                    actionInProgressEntryId.value = "";
                    handleErr(err, {
                        unauthorized: () => options.requireLogin(),
                        badRequest: () => options.failActionWithMessage("Invalid request", "The pending subscription is no longer valid."),
                        badRequestInvalidSubscriptionId: () =>
                            options.failActionWithMessage("Invalid request", "The pending subscription is no longer valid."),
                        badRequestSubscriptionNotPending: () =>
                            options.failActionWithMessage("Already processed", "This subscription is no longer pending."),
                        badRequestInsufficientTokenBalance: () =>
                            options.failActionWithMessage(
                                "Insufficient balance",
                                "You do not have enough token balance for this subscription.",
                            ),
                        badRequestTokensExceedLimit: () =>
                            options.failActionWithMessage("Limit exceeded", "This subscription exceeds your current token limit."),
                        notFound: () => options.failActionWithMessage("Not found", "Pending subscription not found."),
                        notFoundSubscriptionNotFound: () => options.failActionWithMessage("Not found", "Pending subscription not found."),
                        temporalError: () =>
                            options.failActionWithMessage("Temporal error", "Could not complete pending payment right now."),
                        networkError: () => options.failActionWithMessage("Network error", "Could not complete pending payment right now."),
                        serverError: () => options.failActionWithMessage("Server error", "Could not complete pending payment right now."),
                        forbidden: () => options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                        forbiddenOrgMemberCannotPurchase: () =>
                            options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                    });
                })
                .onUnexpectedError(() => {
                    actionInProgressEntryId.value = "";
                    options.failActionWithMessage("Temporal error", "Could not complete pending payment right now.");
                });
            return;
        }

        Request.Abort(previewCreateRequestId);
        Request.Pending(
            previewCreateRequestId,
            ApiSubscriptions.PreviewCreateSubscription({
                subscribable_type: selectedOption.subscribableType,
                subscribable_id: selectedOption.subscribableId,
                quantity: requestedQuantity,
            } as any),
        )
            .onSuccess((preview) => {
                const normalizedRedeemTokens = options.updateEntryQuoteFromPreview(entry, preview, requestedRedeemTokens);
                const pendingSubscriptionId = `${(preview as any)?.pending_subscription_id || ""}`;

                if (pendingSubscriptionId) {
                    Request.Abort(completePendingRequestId);
                    Request.Pending(
                        completePendingRequestId,
                        ApiSubscriptions.CompletePendingSubscription({
                            subscription_id: pendingSubscriptionId,
                            redeem_tokens: normalizedRedeemTokens,
                            success_url: getCheckoutReturnUrl("success"),
                            cancel_url: getCheckoutReturnUrl("cancel"),
                        } as any),
                    )
                        .onSuccess((result) => {
                            actionInProgressEntryId.value = "";

                            if (result.checkout_url) {
                                options.openCheckoutPage(result.checkout_url);
                                return;
                            }

                            options.showSnackBar(options.translate("Pending subscription updated"));
                            void refreshSubscriptionsOnly();
                        })
                        .onRequestError((err, handleErr) => {
                            actionInProgressEntryId.value = "";
                            handleErr(err, {
                                unauthorized: () => options.requireLogin(),
                                badRequest: () =>
                                    options.failActionWithMessage("Invalid request", "The pending subscription is no longer valid."),
                                badRequestInvalidSubscriptionId: () =>
                                    options.failActionWithMessage("Invalid request", "The pending subscription is no longer valid."),
                                badRequestSubscriptionNotPending: () =>
                                    options.failActionWithMessage("Already processed", "This subscription is no longer pending."),
                                badRequestInsufficientTokenBalance: () =>
                                    options.failActionWithMessage(
                                        "Insufficient balance",
                                        "You do not have enough token balance for this subscription.",
                                    ),
                                badRequestTokensExceedLimit: () =>
                                    options.failActionWithMessage("Limit exceeded", "This subscription exceeds your current token limit."),
                                notFound: () => options.failActionWithMessage("Not found", "Pending subscription not found."),
                                notFoundSubscriptionNotFound: () =>
                                    options.failActionWithMessage("Not found", "Pending subscription not found."),
                                temporalError: () =>
                                    options.failActionWithMessage("Temporal error", "Could not complete pending payment right now."),
                                networkError: () =>
                                    options.failActionWithMessage("Network error", "Could not complete pending payment right now."),
                                serverError: () =>
                                    options.failActionWithMessage("Server error", "Could not complete pending payment right now."),
                                forbidden: () =>
                                    options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                                forbiddenOrgMemberCannotPurchase: () =>
                                    options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                            });
                        })
                        .onUnexpectedError(() => {
                            actionInProgressEntryId.value = "";
                            options.failActionWithMessage("Temporal error", "Could not complete pending payment right now.");
                        });
                    return;
                }

                Request.Abort(createSubscriptionRequestId);
                Request.Pending(
                    createSubscriptionRequestId,
                    ApiSubscriptions.CreateSubscription({
                        subscribable_type: selectedOption.subscribableType,
                        subscribable_id: selectedOption.subscribableId,
                        quantity: requestedQuantity,
                        redeem_tokens: normalizedRedeemTokens,
                        success_url: getCheckoutReturnUrl("success"),
                        cancel_url: getCheckoutReturnUrl("cancel"),
                    } as any),
                )
                    .onSuccess((result) => {
                        actionInProgressEntryId.value = "";

                        if (result.checkout_url) {
                            options.openCheckoutPage(result.checkout_url);
                            return;
                        }

                        options.showSnackBar(options.translate("Subscription created"));
                        void refreshSubscriptionsOnly();
                    })
                    .onRequestError((err, handleErr) => {
                        actionInProgressEntryId.value = "";
                        handleErr(err, {
                            unauthorized: () => options.requireLogin(),
                            badRequest: () => options.failActionWithMessage("Invalid request", "This subscription cannot be created."),
                            badRequestInvalidSubscribableType: () =>
                                options.failActionWithMessage("Invalid request", "The selected pricing type is invalid."),
                            badRequestInvalidSubscribableId: () =>
                                options.failActionWithMessage("Invalid request", "The selected pricing is no longer available."),
                            badRequestAlreadyFullAccess: () =>
                                options.failActionWithMessage("Already subscribed", "This entry already has full access."),
                            badRequestAlreadySubscribedToItem: () =>
                                options.failActionWithMessage(
                                    "Already subscribed",
                                    "You already have an active subscription for this item.",
                                ),
                            badRequestAlreadySubscribedToPlan: () =>
                                options.failActionWithMessage(
                                    "Already subscribed",
                                    "You already have an active subscription for this plan.",
                                ),
                            badRequestItemCoveredByActivePlan: () =>
                                options.failActionWithMessage(
                                    "Already covered",
                                    "This item is already covered by an active plan subscription.",
                                ),
                            badRequestPlanContainsAlreadySubscribedItem: () =>
                                options.failActionWithMessage(
                                    "Already covered",
                                    "This plan contains items that are already subscribed separately.",
                                ),
                            badRequestInsufficientTokenBalance: () =>
                                options.failActionWithMessage(
                                    "Insufficient balance",
                                    "You do not have enough token balance for this subscription.",
                                ),
                            badRequestTokensExceedLimit: () =>
                                options.failActionWithMessage("Limit exceeded", "This subscription exceeds your current token limit."),
                            temporalError: () =>
                                options.failActionWithMessage("Temporal error", "Could not create the subscription right now."),
                            networkError: () =>
                                options.failActionWithMessage("Network error", "Could not create the subscription right now."),
                            serverError: () =>
                                options.failActionWithMessage("Server error", "Could not create the subscription right now."),
                            forbidden: () =>
                                options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                            forbiddenOrgMemberCannotPurchase: () =>
                                options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                            badRequestAlreadySubscribed: () =>
                                options.failActionWithMessage("Already subscribed", "You already have an active subscription."),
                            badRequestInvalidQuantity: () =>
                                options.failActionWithMessage("Invalid request", "The requested quantity is invalid."),
                            badRequestOrgRequiredForMultiLicensePlan: badRequestOrgRequiredForMultiLicensePlanHandler((title, message) =>
                                options.failActionWithMessage(title, message),
                            ),
                        });
                    })
                    .onUnexpectedError(() => {
                        actionInProgressEntryId.value = "";
                        options.failActionWithMessage("Temporal error", "Could not create the subscription right now.");
                    });
            })
            .onRequestError((err, handleErr) => {
                actionInProgressEntryId.value = "";
                handleErr(err, {
                    unauthorized: () => options.requireLogin(),
                    badRequest: () => options.failActionWithMessage("Invalid request", "This subscription cannot be created."),
                    badRequestInvalidSubscribableType: () =>
                        options.failActionWithMessage("Invalid request", "The selected pricing type is invalid."),
                    badRequestInvalidSubscribableId: () =>
                        options.failActionWithMessage("Invalid request", "The selected pricing is no longer available."),
                    badRequestAlreadySubscribedToItem: () =>
                        options.failActionWithMessage("Already subscribed", "You already have an active subscription for this item."),
                    badRequestAlreadySubscribedToPlan: () =>
                        options.failActionWithMessage("Already subscribed", "You already have an active subscription for this plan."),
                    badRequestItemCoveredByActivePlan: () =>
                        options.failActionWithMessage("Already covered", "This item is already covered by an active plan subscription."),
                    badRequestPlanContainsAlreadySubscribedItem: () =>
                        options.failActionWithMessage(
                            "Already covered",
                            "This plan contains items that are already subscribed separately.",
                        ),
                    temporalError: () => options.failActionWithMessage("Temporal error", "Could not validate the subscription right now."),
                    networkError: () => options.failActionWithMessage("Network error", "Could not validate the subscription right now."),
                    serverError: () => options.failActionWithMessage("Server error", "Could not validate the subscription right now."),
                    forbidden: () => options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                    forbiddenOrgMemberCannotPurchase: () =>
                        options.failActionWithMessage("Forbidden", "You are not allowed to purchase this subscription."),
                    badRequestOrgRequiredForMultiLicensePlan: badRequestOrgRequiredForMultiLicensePlanHandler((title, message) =>
                        options.failActionWithMessage(title, message),
                    ),
                });
            })
            .onUnexpectedError(() => {
                actionInProgressEntryId.value = "";
                options.failActionWithMessage("Temporal error", "Could not validate the subscription right now.");
            });
    };

    onBeforeUnmount(() => {
        Request.Abort(subscriptionStatusRequestId);
        Request.Abort(previewCreateRequestId);
        Request.Abort(createSubscriptionRequestId);
        Request.Abort(completePendingRequestId);
    });

    return {
        subscriptionsBySubscribableId,
        actionInProgressEntryId,
        displayPurchaseResultModal,
        purchaseResultModalVariant,
        purchaseResultModalTitle,
        purchaseResultModalMessage,
        purchaseResultModalIconClass,
        purchaseResultModalToneClass,
        catalogNotice,
        loadSubscriptionStatuses,
        refreshSubscriptionsOnly,
        openPurchaseResultModal,
        closePurchaseResultModal,
        stopPurchaseResultEvent,
        getSubscriptionByOption,
        getEntrySubscription,
        getPrimaryActionType,
        getPrimaryActionLabel,
        isPrimaryActionDisabled,
        isEntryActionRunning,
        handleCheckoutReturnResult,
        onPrimaryAction,
    };
}
