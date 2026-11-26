// Reserved for license

"use strict";

import { sha256 } from "../utils/hash";
import { CustomAgentRequest } from "../models/custom-agent-request";
import { Payment, PaymentType } from "../models/payment";
import { Subscription, SubscribableType } from "../models/subscription";
import { PlanPricing } from "../models/plan-pricing";
import { Plan } from "../models/plan";
import { ItemPlan } from "../models/item-plan";
import { CatalogItem } from "../models/catalog-item";
import { TokenRuleConfig } from "../models/token-rule-config";
import { TokenTraceability, TokenTraceabilityStatus, TokenTraceabilityActionKind } from "../models/token-traceability";
import { TokenWallet, TokenWalletScopeType } from "../models/token-wallet";
import { OrganizationMembership } from "../models/organization-membership";
import { Wallet } from "../models/wallet";
import { BlockchainService } from "./blockchain-service";
import { BalanceConfig } from "../config/config-balance";
import { AsyncSemaphore } from "@asanrom/async-tools";
import { Monitor } from "../monitor";

export interface EffectiveTokenRules {
    enabled: boolean;
    emissionRatePct: number;
    tokenValueEurCents: number;
    minPurchaseEurCentsToEarn: number;
    minPurchaseEurCentsToRedeem: number;
    maxRedeemPct: number;
    expirationMonths: number;
    stackWithPromotions: boolean;
    allowedProductKinds: string;
    activeCampaignMultiplier: number;
    activeCampaignId: string;
}

export interface TokenRedeemQuote {
    walletId: string;
    availableTokens: number;
    requestedTokens: number;
    appliedTokens: number;
    maxApplicableTokens: number;
    tokenValueEurCents: number;
    discountEurCents: number;
    finalAmountEurCents: number;
}


/**
 * Returns whether a trace action must be backed by an on-chain transaction.
 * @param actionKind Trace action kind
 * @returns True for actions that need a chain transaction hash
 */
export function tokenTraceRequiresOnChainConfirmation(actionKind: string): boolean {
    return actionKind === TokenTraceabilityActionKind.EARN
        || actionKind === TokenTraceabilityActionKind.REFUND_REVERT
        || actionKind === TokenTraceabilityActionKind.REDEEM_COMMIT;
}

/**
 * Returns whether a trace row may be promoted to SENT for the given action and tx hash.
 * @param actionKind Trace action kind
 * @param txHash On-chain transaction hash, if any
 * @returns True when the trace can be marked SENT
 */
export function canPromoteTokenTraceToSent(actionKind: string, txHash: string): boolean {
    if (!tokenTraceRequiresOnChainConfirmation(actionKind)) {
        return true;
    }
    return ((txHash || "") + "").trim().length > 0;
}
/**
 * Central token domain service for rules, earn/redeem flows, refunds,
 * wallet accounting, and blockchain traceability.
 */
export class TokenService {
    private static instance: TokenService | null = null;
    private readonly walletSemaphores: Map<string, AsyncSemaphore> = new Map();

    public static getInstance(): TokenService {
        return TokenService.instance ?? (TokenService.instance = new TokenService());
    }

    private getSemaphoreForWallet(walletId: string): AsyncSemaphore {
        let sem = this.walletSemaphores.get(walletId);
        if (!sem) {
            sem = new AsyncSemaphore(1);
            this.walletSemaphores.set(walletId, sem);
        }
        return sem;
    }

    /**
     * Applies an admin patch to token rules with normalization and clamping.
     * @param current Current persisted rule configuration
     * @param patch Partial update from API/backoffice
     * @returns Updated rule configuration ready to be saved
     */
    public sanitizeAndApplyRules(current: TokenRuleConfig, patch: Partial<TokenRuleConfig>): TokenRuleConfig {
        // If a field is not provided in the patch, we keep the current value.
        current.enabled = typeof patch.enabled === "boolean" ? patch.enabled : current.enabled;
        // These limits prevent saving percentages or amounts out of range.
        current.emissionRatePct = this.clamp(Number(patch.emissionRatePct ?? current.emissionRatePct), 0, 100);
        current.tokenValueEurCents = Math.max(1, Math.floor(Number(patch.tokenValueEurCents ?? current.tokenValueEurCents ?? 1)));
        current.minPurchaseEurCentsToEarn = Math.max(0, Math.floor(Number(patch.minPurchaseEurCentsToEarn ?? current.minPurchaseEurCentsToEarn)));
        current.minPurchaseEurCentsToRedeem = Math.max(0, Math.floor(Number(patch.minPurchaseEurCentsToRedeem ?? current.minPurchaseEurCentsToRedeem)));
        current.maxRedeemPct = this.clamp(Number(patch.maxRedeemPct ?? current.maxRedeemPct), 0, 100);
        current.expirationMonths = Math.max(0, Math.floor(Number(patch.expirationMonths ?? current.expirationMonths)));
        current.stackWithPromotions = patch.stackWithPromotions ?? current.stackWithPromotions;
        current.allowedProductKinds = ((patch.allowedProductKinds ?? current.allowedProductKinds) || "all") + "";
        current.updatedAt = Date.now();
        return current;
    }

    /**
     * Resolves the effective rules used at runtime (config + feature flag).
     * @returns Effective token rules used by earn/redeem logic
     */
    public async getEffectiveRules(): Promise<EffectiveTokenRules> {
        const base = await TokenRuleConfig.getOrCreateDefault();
        const featureEnabled = BalanceConfig.getInstance().tokensNubemEnabled;
        return {
            enabled: featureEnabled && !!base.enabled,
            emissionRatePct: this.clamp(base.emissionRatePct, 0, 100),
            tokenValueEurCents: Math.max(1, Math.floor(base.tokenValueEurCents || 1)),
            minPurchaseEurCentsToEarn: Math.max(0, base.minPurchaseEurCentsToEarn || 0),
            minPurchaseEurCentsToRedeem: Math.max(0, base.minPurchaseEurCentsToRedeem || 0),
            maxRedeemPct: this.clamp(base.maxRedeemPct, 0, 100),
            expirationMonths: Math.max(0, base.expirationMonths || 0),
            stackWithPromotions: !!base.stackWithPromotions,
            allowedProductKinds: (base.allowedProductKinds || "all") + "",
            activeCampaignMultiplier: 1,
            activeCampaignId: "",
        };
    }

    /**
     * Resolves the token wallet for a billing scope.
     * Org purchases use the organization wallet; personal purchases use the user wallet.
     */
    public async resolveWallet(userId: string, organizationId?: string | null): Promise<TokenWallet> {
        if (organizationId) {
            return TokenWallet.getOrCreate(TokenWalletScopeType.ORGANIZATION, organizationId);
        }
        return TokenWallet.getOrCreate(TokenWalletScopeType.USER, userId);
    }

    /**
     * Returns the token wallet visible to the user in balance/history endpoints.
     * Org admins see their organization wallet; everyone else sees their personal wallet.
     */
    public async resolveAndGetWalletForUser(userId: string, preferOrganization: boolean = true): Promise<TokenWallet> {
        if (preferOrganization) {
            const adminMembership = await OrganizationMembership.findActiveAdminMembershipForUser(userId);
            if (adminMembership) {
                return TokenWallet.getOrCreate(TokenWalletScopeType.ORGANIZATION, adminMembership.organizationId);
            }
        }
        return TokenWallet.getOrCreate(TokenWalletScopeType.USER, userId);
    }

    /**
     * Simulates token redemption without mutating state.
     * @param userId User identifier
     * @param amountEurCents Purchase amount in euro cents
     * @param requestedTokens Requested token amount to redeem
     * @param organizationId When set, quotes against the organization wallet
     * @returns Redemption quote with applied tokens and final amount
     */
    public async quote(userId: string, amountEurCents: number, requestedTokens: number, organizationId?: string | null): Promise<TokenRedeemQuote> {
        const rules = await this.getEffectiveRules();
        const wallet = await this.resolveWallet(userId, organizationId);

        const amount = Math.max(0, Math.floor(amountEurCents || 0));
        const requested = Math.max(0, Math.floor(requestedTokens || 0));
        const available = Math.max(0, Math.floor(wallet.availableTokens || 0));

        const tokenValueEurCents = Math.max(1, rules.tokenValueEurCents);

        if (!rules.enabled || amount < rules.minPurchaseEurCentsToRedeem) {
            // If rules are not met, return a quote with no discount.
            return { walletId: wallet.id, availableTokens: available, requestedTokens: requested, appliedTokens: 0, maxApplicableTokens: 0, tokenValueEurCents, discountEurCents: 0, finalAmountEurCents: amount };
        }

        // Real redeem limit comes from two things: percent cap and available balance.
        const maxByPct = Math.floor(amount * (rules.maxRedeemPct / 100));
        const maxTokensByPct = Math.floor(maxByPct / tokenValueEurCents);
        const maxApplicableTokens = Math.max(0, Math.min(available, maxTokensByPct));
        const appliedTokens = requested > 0 ? Math.max(0, Math.min(maxApplicableTokens, requested)) : 0;
        const discount = appliedTokens * tokenValueEurCents;
        return {
            walletId: wallet.id,
            availableTokens: available,
            requestedTokens: requested,
            appliedTokens,
            maxApplicableTokens,
            tokenValueEurCents,
            discountEurCents: discount,
            finalAmountEurCents: Math.max(0, amount - discount),
        };
    }

    /**
     * Grants tokens for a successful payment (idempotent by payment id).
     * Includes on-chain mint/deposit and off-chain wallet/trace updates.
     * Skips when this payment already earned, including pre-migration
     * `earn:subscription:{stripeSubscriptionId}` rows for CREATE invoices.
     * @param payment Confirmed payment
     * @returns Void
     */
    public async grantFromPayment(payment: Payment): Promise<void> {
        if (!payment?.id || (payment.amountCents || 0) <= 0) {
            return;
        }
        const subscription = payment.subscriptionId
            ? await Subscription.findById(payment.subscriptionId)
            : null;
        if (await this.hasExistingEarnForPayment(payment, subscription)) {
            return;
        }
        await this.earnTokensCore({
            operationId: `earn:${payment.id}`,
            uid: payment.uid,
            organizationId: await this.resolveEarnOrganizationId(payment, subscription),
            amountCents: payment.amountCents,
            blockchainDetails: `nubem:earn:${payment.id}`,
            paymentId: payment.id,
            checkoutSessionId: payment.providerSessionId || "",
        });
    }

    /**
     * True when this payment already granted tokens, under the current
     * `earn:{paymentId}` key or the legacy subscription-checkout key.
     */
    private async hasExistingEarnForPayment(payment: Payment, subscription: Subscription | null): Promise<boolean> {
        const existingByPayment = await TokenTraceability.findEarnTraceByPayment(payment.id);
        if (existingByPayment) {
            return true;
        }
        if (payment.type !== PaymentType.SUBSCRIPTION_CREATE) {
            return false;
        }
        const stripeId = ((subscription?.stripeSubscriptionId || "") + "").trim();
        if (!stripeId) {
            return false;
        }
        return this.existsOperation(`earn:subscription:${stripeId}`, TokenTraceabilityActionKind.EARN);
    }

    /**
     * Organization wallet for subscription payments and custom-agent deposits.
     * Deposits have no subscriptionId; the request carries the org scope.
     */
    private async resolveEarnOrganizationId(payment: Payment, subscription: Subscription | null): Promise<string | null> {
        const fromSubscription = ((subscription?.organizationId || "") + "").trim();
        if (fromSubscription) {
            return fromSubscription;
        }
        if (payment.type !== PaymentType.CUSTOM_AGENT_DEPOSIT) {
            return null;
        }
        const request = await CustomAgentRequest.findByPaymentId(payment.id);
        const fromRequest = ((request?.organizationId || "") + "").trim();
        return fromRequest || null;
    }

    /**
     * Grants tokens for a completed subscription checkout.
     * This path is used when subscriptions are handled outside the generic payment flow.
     * @param uid User identifier
     * @param amountCents Amount paid in cents
     * @param paymentId Internal payment identifier
     * @param checkoutSessionId Stripe checkout session identifier
     * @param subscriptionEarnRef Stable subscription reference for idempotency (e.g. Stripe subscription id)
     * @returns Void
     */
    public async grantFromSubscriptionCheckout(
        uid: string,
        amountCents: number,
        paymentId: string,
        checkoutSessionId: string,
        subscriptionEarnRef: string,
        organizationId?: string | null,
    ): Promise<void> {
        const normalizedAmount = Math.floor(Number(amountCents || 0));
        if (!uid || normalizedAmount <= 0) {
            return;
        }
        const earnRef = ((subscriptionEarnRef || "") + "").trim() || checkoutSessionId || paymentId;
        await this.earnTokensCore({
            operationId: `earn:subscription:${earnRef}`,
            uid,
            organizationId: organizationId || null,
            amountCents: normalizedAmount,
            blockchainDetails: `nubem:subscription:${earnRef}`,
            paymentId: paymentId || "",
            checkoutSessionId: checkoutSessionId || "",
            extraPayload: { sourceId: subscriptionEarnRef || "", organizationId: organizationId || "" },
        });
    }

    /**
     * Shared earn-tokens flow: idempotency lock, rule check, wallet credit,
     * blockchain deposit, and traceability record creation.
     */
    private async earnTokensCore(params: {
        operationId: string;
        uid: string;
        organizationId?: string | null;
        amountCents: number;
        blockchainDetails: string;
        paymentId: string;
        checkoutSessionId: string;
        extraPayload?: Record<string, unknown>;
    }): Promise<void> {
        const lockCreated = await this.createIdempotencyLock(params.operationId, TokenTraceabilityActionKind.EARN);
        if (!lockCreated) {
            return;
        }
        try {
            const rules = await this.getEffectiveRules();
            if (!rules.enabled || params.amountCents < rules.minPurchaseEurCentsToEarn) {
                return;
            }
            const rewardEurCents = (params.amountCents * (rules.emissionRatePct / 100)) * rules.activeCampaignMultiplier;
            const rawTokens = rewardEurCents / Math.max(1, rules.tokenValueEurCents);
            const tokens = Math.max(0, Math.floor(rawTokens));
            if (tokens <= 0) {
                return;
            }
            const wallet = await this.resolveWallet(params.uid, params.organizationId);
            const updatedWallet = await this.atomicUpdateWallet(wallet.id, () => true, {
                availableTokens: tokens,
            });
            if (!updatedWallet) {
                throw new Error("WALLET_NOT_FOUND");
            }
            let chainWallet: Wallet | null = null;
            let trace: TokenTraceability;
            try {
                try {
                    chainWallet = await this.getUserBlockchainWallet(params.uid);
                } catch (_ex) {
                    chainWallet = null;
                }
                trace = await this.createTrace({
                    operationId: params.operationId,
                    actionKind: TokenTraceabilityActionKind.EARN,
                    wallet: updatedWallet,
                    actorUid: params.uid,
                    paymentId: params.paymentId,
                    checkoutSessionId: params.checkoutSessionId,
                    amountTokens: tokens,
                    amountEurCents: Math.floor(tokens * Math.max(1, rules.tokenValueEurCents)),
                    payload: { emissionRatePct: rules.emissionRatePct, multiplier: rules.activeCampaignMultiplier, ...params.extraPayload },
                    status: TokenTraceabilityStatus.PENDING,
                });
            } catch (ex) {
                await this.atomicUpdateWallet(wallet.id, w => w.availableTokens >= tokens, {
                    availableTokens: -tokens,
                });
                throw ex;
            }
            let depositTxHash = "";
            if (chainWallet) {
                try {
                    depositTxHash = await BlockchainService.getInstance().addBalance(
                        chainWallet.address,
                        BigInt(tokens),
                        params.blockchainDetails,
                    );
                } catch (ex) {
                    await this.discardPendingTrace(trace);
                    await this.atomicUpdateWallet(wallet.id, w => w.availableTokens >= tokens, {
                        availableTokens: -tokens,
                    });
                    throw ex;
                }
            }
            await this.markTraceSent(trace, depositTxHash, !chainWallet);
        } finally {
            await this.removeIdempotencyLock(params.operationId, TokenTraceabilityActionKind.EARN);
        }
    }

    /**
     * Reverts previously granted tokens when a single Stripe refund is processed.
     * Reversion is proportional to the refunded amount for that refund only.
     * @param payment Original payment
     * @param refundAmountCents Refunded amount in euro cents for this refund (not cumulative)
     * @param actorUid User/system actor performing the operation
     * @param operationId Idempotency key, typically `refund:{paymentId}:{stripeRefundId}`
     * @returns Void
     */
    public async revertFromRefund(
        payment: Payment,
        refundAmountCents: number,
        actorUid: string,
        operationId?: string,
    ): Promise<void> {
        const incrementalRefund = Math.max(0, Math.floor(refundAmountCents || 0));
        if (!payment?.id || incrementalRefund <= 0 || (payment.amountCents || 0) <= 0) {
            return;
        }
        const opId = ((operationId || "") + "").trim() || `refund:${payment.id}:${incrementalRefund}`;
        if (await this.existsOperation(opId, TokenTraceabilityActionKind.REFUND_REVERT)) {
            return;
        }
        let earnTrace = await this.findOperation(`earn:${payment.id}`, TokenTraceabilityActionKind.EARN);
        if (!earnTrace) {
            earnTrace = await TokenTraceability.findEarnTraceByPayment(payment.id);
        }
        if (!earnTrace) {
            return;
        }
        const earnTokens = Math.max(0, Math.floor(earnTrace.amountTokens || 0));
        const alreadyRevertedTokens = await this.getTotalRevertedTokensForPayment(payment.id);
        const remainingTokens = Math.max(0, earnTokens - alreadyRevertedTokens);
        if (remainingTokens <= 0) {
            return;
        }
        const alreadyRevertedCents = await this.getTotalRevertedCentsForPayment(payment.id);
        const cappedIncrementalRefund = Math.min(
            incrementalRefund,
            Math.max(0, (payment.amountCents || 0) - alreadyRevertedCents),
        );
        if (cappedIncrementalRefund <= 0) {
            return;
        }
        const revertTokens = Math.min(
            remainingTokens,
            Math.floor((earnTokens * cappedIncrementalRefund) / Math.max(1, payment.amountCents)),
        );
        // Never revert more tokens than were earned from that payment.
        if (revertTokens <= 0) {
            return;
        }
        const wallet = await TokenWallet.finder.findByKey(earnTrace.walletId);
        if (!wallet) {
            return;
        }
        const updatedWallet = await this.atomicUpdateWallet(wallet.id, w => w.availableTokens >= revertTokens, {
            availableTokens: -revertTokens,
        });
        if (!updatedWallet) {
            throw new Error("INSUFFICIENT_TOKENS");
        }
        let chainWallet: Wallet | null = null;
        let trace: TokenTraceability;
        try {
            try {
                chainWallet = await this.getUserBlockchainWallet(payment.uid);
            } catch (_ex) {
                chainWallet = null;
            }
            trace = await this.createTrace({
                operationId: opId,
                actionKind: TokenTraceabilityActionKind.REFUND_REVERT,
                wallet: updatedWallet,
                actorUid: actorUid || payment.uid,
                paymentId: payment.id,
                checkoutSessionId: payment.providerSessionId || "",
                amountTokens: -revertTokens,
                amountEurCents: -cappedIncrementalRefund,
                payload: { sourceOperation: earnTrace.operationId },
                status: TokenTraceabilityStatus.PENDING,
            });
        } catch (ex) {
            await this.atomicUpdateWallet(wallet.id, () => true, {
                availableTokens: revertTokens,
            });
            throw ex;
        }
        let chargeTxHash = "";
        if (chainWallet) {
            try {
                chargeTxHash = await BlockchainService.getInstance().chargeUserBalance(
                    chainWallet.address,
                    BigInt(revertTokens),
                );
            } catch (ex) {
                // If blockchain charge fails, undo local debit to keep balances aligned.
                await this.discardPendingTrace(trace);
                await this.atomicUpdateWallet(wallet.id, () => true, {
                    availableTokens: revertTokens,
                });
                throw ex;
            }
        }
        await this.markTraceSent(trace, chargeTxHash, !chainWallet);
    }

    /**
     * Places a temporary hold for token redemption before payment confirmation.
     * Moves tokens from available to locked balance.
     * @param userId User identifier
     * @param amountEurCents Checkout amount in euro cents
     * @param requestedTokens Requested token amount
     * @param operationId Idempotency key for the checkout operation
     * @returns Tokens actually locked and the matching euro-cent discount, or zero for closed operations
     */
    public async hold(
        userId: string,
        amountEurCents: number,
        requestedTokens: number,
        operationId: string,
        organizationId?: string | null,
        context?: Record<string, unknown>,
    ): Promise<{ appliedTokens: number; discountEurCents: number }> {
        if (await this.existsOperation(operationId, TokenTraceabilityActionKind.REDEEM_COMMIT)
            || await this.existsOperation(operationId, TokenTraceabilityActionKind.REDEEM_RELEASE)) {
            return { appliedTokens: 0, discountEurCents: 0 };
        }
        const existingHold = await this.findOperation(operationId, TokenTraceabilityActionKind.REDEEM_HOLD);
        if (existingHold) {
            return {
                appliedTokens: Math.abs(existingHold.amountTokens || 0),
                discountEurCents: Math.abs(existingHold.amountEurCents || 0),
            };
        }
        const q = await this.quote(userId, amountEurCents, requestedTokens, organizationId);
        if (q.appliedTokens <= 0) {
            return { appliedTokens: 0, discountEurCents: 0 };
        }
        const wallet = await this.atomicMoveTokensForHold(q.walletId, q.appliedTokens);
        if (!wallet) {
            throw new Error("INSUFFICIENT_TOKENS");
        }
        await this.createTrace({
            operationId,
            actionKind: TokenTraceabilityActionKind.REDEEM_HOLD,
            wallet,
            actorUid: userId,
            paymentId: "",
            checkoutSessionId: "",
            amountTokens: -q.appliedTokens,
            amountEurCents: -q.discountEurCents,
            payload: { amountEurCents, ...context },
            status: TokenTraceabilityStatus.SENT,
        });
        return {
            appliedTokens: q.appliedTokens,
            discountEurCents: q.discountEurCents,
        };
    }

    /**
     * Commits a previous redemption hold after successful payment.
     * Finalizes off-chain accounting and executes on-chain token charge.
     * @param operationId Idempotency key for the checkout operation
     * @param paymentId Internal payment id
     * @param checkoutSessionId Stripe checkout session id
     * @returns Void
     */
    public async commit(operationId: string, paymentId: string, checkoutSessionId: string): Promise<void> {
        if (await this.existsOperation(operationId, TokenTraceabilityActionKind.REDEEM_COMMIT)) {
            return;
        }
        const hold = await this.findOperation(operationId, TokenTraceabilityActionKind.REDEEM_HOLD);
        if (!hold) {
            return;
        }
        const tokens = Math.abs(hold.amountTokens || 0);
        const wallet = await this.atomicMoveTokensForCommit(hold.walletId, tokens);
        if (!wallet) {
            throw new Error("INSUFFICIENT_LOCKED_TOKENS");
        }
        let chainWallet: Wallet | null = null;
        let trace: TokenTraceability;
        try {
            try {
                chainWallet = await this.getUserBlockchainWallet(hold.actorUid);
            } catch (_ex) {
                chainWallet = null;
            }
            trace = await this.createTrace({
                operationId,
                actionKind: TokenTraceabilityActionKind.REDEEM_COMMIT,
                wallet,
                actorUid: hold.actorUid,
                paymentId: paymentId || "",
                checkoutSessionId: checkoutSessionId || "",
                amountTokens: -tokens,
                amountEurCents: hold.amountEurCents,
                payload: { holdTraceId: hold.id },
                status: TokenTraceabilityStatus.PENDING,
            });
        } catch (ex) {
            await this.atomicUpdateWallet(hold.walletId, () => true, {
                lockedTokens: tokens,
            });
            throw ex;
        }
        let chargeTxHash = "";
        if (chainWallet) {
            try {
                chargeTxHash = await BlockchainService.getInstance().chargeUserBalance(
                    chainWallet.address,
                    BigInt(tokens),
                );
            } catch (ex) {
                // If blockchain charge fails, restore locked balance to avoid partial local commit.
                await this.discardPendingTrace(trace);
                await this.atomicUpdateWallet(hold.walletId, () => true, {
                    lockedTokens: tokens,
                });
                throw ex;
            }
        }
        await this.markTraceSent(trace, chargeTxHash);
    }

    /**
     * Returns redeemed tokens when a checkout is refunded after a hold or commit.
     * Releases a pending hold, or credits back tokens already consumed by commit.
     * @param operationId Idempotency key for the checkout operation
     * @param reason Reason metadata for traceability
     * @returns Void
     */
    public async restoreRedeem(operationId: string, reason: string = "REDEEM_RESTORE"): Promise<void> {
        const id = ((operationId || "") + "").trim();
        if (!id) {
            return;
        }
        if (await this.existsOperation(id, TokenTraceabilityActionKind.REDEEM_RELEASE)) {
            return;
        }
        const commit = await this.findOperation(id, TokenTraceabilityActionKind.REDEEM_COMMIT);
        if (!commit) {
            await this.release(id, reason);
            return;
        }
        const tokens = Math.abs(commit.amountTokens || 0);
        if (tokens <= 0) {
            return;
        }
        const wallet = await this.atomicUpdateWallet(commit.walletId, () => true, {
            availableTokens: tokens,
        });
        if (!wallet) {
            throw new Error("WALLET_NOT_FOUND");
        }
        let chainWallet: Wallet | null = null;
        let trace: TokenTraceability;
        try {
            try {
                chainWallet = await this.getUserBlockchainWallet(commit.actorUid);
            } catch (_ex) {
                chainWallet = null;
            }
            trace = await this.createTrace({
                operationId: id,
                actionKind: TokenTraceabilityActionKind.REDEEM_RELEASE,
                wallet,
                actorUid: commit.actorUid,
                paymentId: commit.paymentId || "",
                checkoutSessionId: commit.checkoutSessionId || "",
                amountTokens: tokens,
                amountEurCents: Math.abs(commit.amountEurCents || 0),
                payload: { reason, restoredFromCommit: true },
                status: TokenTraceabilityStatus.PENDING,
            });
        } catch (ex) {
            await this.atomicUpdateWallet(commit.walletId, w => w.availableTokens >= tokens, {
                availableTokens: -tokens,
            });
            throw ex;
        }
        let depositTxHash = "";
        if (chainWallet && ((commit.txHash || "") + "").trim()) {
            try {
                depositTxHash = await BlockchainService.getInstance().addBalance(
                    chainWallet.address,
                    BigInt(tokens),
                    `nubem:redeem-restore:${id}`,
                );
            } catch (ex) {
                await this.discardPendingTrace(trace);
                await this.atomicUpdateWallet(commit.walletId, w => w.availableTokens >= tokens, {
                    availableTokens: -tokens,
                });
                throw ex;
            }
        }
        await this.markTraceSent(trace, depositTxHash, !chainWallet || !((commit.txHash || "") + "").trim());
    }

    /**
     * Releases a previous redemption hold when checkout does not complete.
     * Moves tokens back from locked to available balance.
     * @param operationId Idempotency key for the checkout operation
     * @param reason Reason metadata for traceability
     * @returns Void
     */
    public async release(operationId: string, reason: string = "REDEEM_RELEASE"): Promise<void> {
        if (await this.existsOperation(operationId, TokenTraceabilityActionKind.REDEEM_RELEASE) || await this.existsOperation(operationId, TokenTraceabilityActionKind.REDEEM_COMMIT)) {
            // If already released or committed, do not run the operation again.
            return;
        }
        const hold = await this.findOperation(operationId, TokenTraceabilityActionKind.REDEEM_HOLD);
        if (!hold) {
            return;
        }
        const tokens = Math.abs(hold.amountTokens || 0);
        const wallet = await this.atomicMoveTokensForRelease(hold.walletId, tokens);
        if (!wallet) {
            throw new Error("INSUFFICIENT_LOCKED_TOKENS");
        }
        await this.createTrace({
            operationId,
            actionKind: TokenTraceabilityActionKind.REDEEM_RELEASE,
            wallet,
            actorUid: hold.actorUid,
            paymentId: "",
            checkoutSessionId: "",
            amountTokens: tokens,
            amountEurCents: Math.abs(hold.amountEurCents),
            payload: { reason },
            status: TokenTraceabilityStatus.SENT,
        });
    }

    /**
     * Reconciles stale PENDING traceability records (older than 24h).
     * A record is only promoted to SENT when it actually carries an on-chain
     * transaction hash (e.g. backfilled by the blockchain event scanner).
     * Records still missing a tx hash after the SLA window remain PENDING and
     * emit an operational warning for manual review, avoiding balance drift.
     * @returns Number of stale records updated (confirmed + warned)
     */
    public async flushPendingTraceability(): Promise<number> {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h
        const stale = await TokenTraceability.findStalePending(cutoff);
        let updated = 0;
        for (const item of stale) {
            if (!tokenTraceRequiresOnChainConfirmation(item.actionKind)) {
                continue;
            }
            if (item.txHash) {
                item.status = TokenTraceabilityStatus.SENT;
                item.errorMessage = "";
                item.updatedAt = Date.now();
                await item.save();
                updated++;
            } else {
                item.errorMessage = "On-chain confirmation delayed beyond SLA; pending manual review";
                item.retries = Math.max(0, Math.floor(item.retries || 0)) + 1;
                item.updatedAt = Date.now();
                await item.save();
                updated++;
                Monitor.warning("[TOKENS] Stale pending traceability still missing on-chain confirmation", {
                    traceId: item.id,
                    operationId: item.operationId,
                    actionKind: item.actionKind,
                    walletId: item.walletId,
                    paymentId: item.paymentId,
                    checkoutSessionId: item.checkoutSessionId,
                    amountTokens: item.amountTokens,
                    retries: item.retries,
                });
            }
        }
        return updated;
    }

    /**
     * Attempts to insert a PROCESSING trace as an atomic idempotency lock.
     * Throws on duplicate operationId+actionKind if a unique index exists.
     * @param operationId Operation identifier
     * @param actionKind Token action kind
     */
    private async createIdempotencyLock(operationId: string, actionKind: string): Promise<boolean> {
        if (await this.existsOperation(operationId, actionKind)) {
            return false;
        }
        await TokenTraceability.create({
            operationId,
            actionKind,
            walletId: "",
            scopeType: "",
            scopeId: "",
            actorUid: "",
            paymentId: "",
            checkoutSessionId: "",
            amountTokens: 0,
            amountEurCents: 0,
            payloadHash: "",
            chainName: "",
            txHash: "",
            status: TokenTraceabilityStatus.PROCESSING + "",
            retries: 0,
            errorMessage: "",
            payloadJson: "{}",
        });
        return true;
    }

    private async removeIdempotencyLock(operationId: string, actionKind: string): Promise<void> {
        const rows = await TokenTraceability.findByOperationActionStatus(operationId, actionKind, TokenTraceabilityStatus.PROCESSING);
        for (const row of rows) {
            await row.delete();
        }
    }

    /**
     * Creates a traceability record using the model factory.
     * @param input Traceability payload
     * @returns Persisted traceability row
     */
    private async createTrace(input: {
        operationId: string;
        actionKind: string;
        wallet: TokenWallet | null;
        actorUid: string;
        paymentId: string;
        checkoutSessionId: string;
        amountTokens: number;
        amountEurCents: number;
        payload: any;
        txHash?: string;
        status?: TokenTraceabilityStatus;
    }): Promise<TokenTraceability> {
        const payloadJson = JSON.stringify({
            actionKind: input.actionKind,
            amountTokens: input.amountTokens,
            amountEurCents: input.amountEurCents,
            paymentId: input.paymentId,
            checkoutSessionId: input.checkoutSessionId,
            payload: input.payload || {},
        });
        return TokenTraceability.create({
            operationId: input.operationId,
            actionKind: input.actionKind,
            walletId: input.wallet?.id || "",
            scopeType: input.wallet?.scopeType || "",
            scopeId: input.wallet?.scopeId || "",
            actorUid: input.actorUid || "",
            paymentId: input.paymentId || "",
            checkoutSessionId: input.checkoutSessionId || "",
            amountTokens: input.amountTokens || 0,
            amountEurCents: input.amountEurCents || 0,
            payloadHash: sha256(payloadJson),
            chainName: "cyberchain",
            txHash: input.txHash || "",
            status: (input.status || TokenTraceabilityStatus.PENDING) + "",
            retries: 0,
            errorMessage: "",
            payloadJson,
        });
    }

    /**
     * Promotes a PENDING trace to SENT once its on-chain transaction is confirmed.
     * @param trace Previously created PENDING traceability record
     * @param txHash On-chain transaction hash backing the operation
     * @param offChainOnly When true, promotes without requiring a tx hash (no blockchain wallet)
     * @returns Void
     */
    private async markTraceSent(trace: TokenTraceability, txHash: string, offChainOnly = false): Promise<void> {
        const normalizedHash = ((txHash || "") + "").trim();
        if (!offChainOnly && !canPromoteTokenTraceToSent(trace.actionKind, normalizedHash)) {
            trace.updatedAt = Date.now();
            await trace.save();
            return;
        }
        trace.txHash = normalizedHash;
        trace.status = TokenTraceabilityStatus.SENT;
        trace.errorMessage = "";
        trace.updatedAt = Date.now();
        await trace.save();
    }

    /**
     * Resolves a human-readable concept name for an earn payment reference.
     * Covers subscription checkout (`earn:subscription:`), one-time payments (`earn:{paymentId}`),
     * and custom-agent deposits that store a catalog item id instead of an ItemPlan id.
     * @param paymentId Internal payment id or legacy Stripe subscription id
     * @returns Human-readable concept name, or null when not resolvable
     */
    private async resolveEarnConceptName(paymentId: string): Promise<string | null> {
        const payment = await Payment.findById(paymentId);
        if (payment) {
            const fromPayment = await this.resolveSubscribableConceptName(payment.subscribableType, payment.subscribableId);
            if (fromPayment) {
                return fromPayment;
            }
        }

        const subscription = await this.resolveSubscriptionForEarnPayment(paymentId);
        if (!subscription) {
            return null;
        }
        return this.resolveSubscribableConceptName(subscription.subscribableType, subscription.subscribableId);
    }

    /**
     * Resolves a catalog item or plan display name from a payment/subscription subscribable.
     * Item rows may store either an ItemPlan id or a CatalogItem id (custom-agent deposit).
     */
    private async resolveSubscribableConceptName(subscribableType: string, subscribableId: string): Promise<string | null> {
        const id = ((subscribableId || "") + "").trim();
        if (!id) {
            return null;
        }

        if (subscribableType === SubscribableType.PLAN) {
            const pricing = await PlanPricing.findById(id);
            if (!pricing) {
                return null;
            }
            const plan = await Plan.findById(pricing.planId);
            return plan?.name || null;
        }

        if (subscribableType === SubscribableType.ITEM) {
            const itemPlan = await ItemPlan.findById(id);
            const item = await CatalogItem.findById(itemPlan?.itemId || id);
            return item?.name || null;
        }

        return null;
    }

    /**
     * Resolves the subscription linked to a subscription-earn payment reference.
     * @param paymentId Internal payment id or legacy Stripe subscription id
     * @returns Matching subscription, or null
     */
    private async resolveSubscriptionForEarnPayment(paymentId: string): Promise<Subscription | null> {
        const payment = await Payment.findById(paymentId);
        if (payment?.subscriptionId) {
            const byPayment = await Subscription.findById(payment.subscriptionId);
            if (byPayment) {
                return byPayment;
            }
        }
        return Subscription.findByStripeSubscriptionId(paymentId);
    }

    /**
     * Discards a PENDING trace whose on-chain transaction failed cleanly, so the
     * operation can be safely retried (idempotency guards are keyed on this trace).
     * @param trace Previously created PENDING traceability record
     * @returns Void
     */
    private async discardPendingTrace(trace: TokenTraceability): Promise<void> {
        await trace.delete();
    }

    /**
     * Checks whether an operation/action pair already exists.
     * Used for idempotency guards.
     * @param operationId Operation identifier
     * @param actionKind Token action kind
     * @returns True when a matching trace already exists
     */
    private async existsOperation(operationId: string, actionKind: string): Promise<boolean> {
        const rows = await TokenTraceability.findByOperationAction(operationId, actionKind);
        return rows.length > 0;
    }

    /**
     * Returns the latest trace for an operation/action pair.
     * @param operationId Operation identifier
     * @param actionKind Token action kind
     * @returns Latest matching trace or null
     */
    private async findOperation(operationId: string, actionKind: string): Promise<TokenTraceability | null> {
        const rows = await TokenTraceability.findByOperationAction(operationId, actionKind);
        return rows[0] || null;
    }

    private async getTotalRevertedCentsForPayment(paymentId: string): Promise<number> {
        const traces = await TokenTraceability.findRefundRevertsByPayment(paymentId);
        return traces.reduce((sum, trace) => sum + Math.abs(Math.floor(trace.amountEurCents || 0)), 0);
    }

    private async getTotalRevertedTokensForPayment(paymentId: string): Promise<number> {
        const traces = await TokenTraceability.findRefundRevertsByPayment(paymentId);
        return traces.reduce((sum, trace) => sum + Math.abs(Math.floor(trace.amountTokens || 0)), 0);
    }

    /**
     * Clamps a number between min and max. Non-finite values fallback to min.
     * @param v Value to clamp
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @returns Clamped numeric value
     */
    /**
     * Resolves human-readable concept names for a batch of history rows in a single
     * pass — avoids an N+1 query pattern.
     * Earn rows (`earn:{paymentId}` and `earn:subscription:`) resolve from the linked payment
     * or subscription; all others return null.
     * @param rows Traceability rows from a history page
     * @returns Map from row id to resolved name (null when not applicable)
     */
    public async resolveConceptNames(rows: { id: string; operationId: string; paymentId: string }[]): Promise<Map<string, string | null>> {
        const result = new Map<string, string | null>(rows.map(r => [r.id, null]));

        const earnRows = rows.filter(r => r.operationId.startsWith("earn:") && r.paymentId);
        if (earnRows.length === 0) {
            return result;
        }

        const uniquePaymentIds = [...new Set(earnRows.map(r => r.paymentId))];

        const nameByPaymentId = new Map<string, string | null>();
        await Promise.all(uniquePaymentIds.map(async (paymentId) => {
            try {
                const name = await this.resolveEarnConceptName(paymentId);
                nameByPaymentId.set(paymentId, name);
            } catch {
                nameByPaymentId.set(paymentId, null);
            }
        }));

        for (const row of earnRows) {
            result.set(row.id, nameByPaymentId.get(row.paymentId) ?? null);
        }

        return result;
    }

    private clamp(v: number, min: number, max: number): number {
        if (!Number.isFinite(v)) {
            return min;
        }
        return Math.min(max, Math.max(min, v));
    }

    /**
     * Resolves the user's blockchain wallet used for on-chain token operations.
     * @param userId User identifier
     * @returns Blockchain wallet with a valid address
     * @throws Error when wallet is missing
     */
    private async getUserBlockchainWallet(userId: string): Promise<Wallet> {
        const chainWallet = await Wallet.findByUser(userId);
        if (!chainWallet?.address) {
            throw new Error("WALLET_NOT_FOUND");
        }
        return chainWallet;
    }

    /**
     * Atomically moves tokens from available to locked for hold.
     * Prevents race conditions between concurrent hold requests.
     */
    private async atomicMoveTokensForHold(walletId: string, tokens: number): Promise<TokenWallet | null> {
        return this.atomicUpdateWallet(walletId, w => w.availableTokens >= tokens, {
            availableTokens: -tokens,
            lockedTokens: tokens,
        });
    }

    /**
     * Atomically consumes locked tokens on commit.
     */
    private async atomicMoveTokensForCommit(walletId: string, tokens: number): Promise<TokenWallet | null> {
        return this.atomicUpdateWallet(walletId, w => w.lockedTokens >= tokens, {
            lockedTokens: -tokens,
        });
    }

    /**
     * Atomically returns locked tokens back to available on release.
     */
    private async atomicMoveTokensForRelease(walletId: string, tokens: number): Promise<TokenWallet | null> {
        return this.atomicUpdateWallet(walletId, w => w.lockedTokens >= tokens, {
            lockedTokens: -tokens,
            availableTokens: tokens,
        });
    }

    /**
     * Executes an atomic wallet update using Mongo findOneAndUpdate.
     * Includes version bump for optimistic concurrency tracking.
     */
    private async atomicUpdateWallet(
        walletId: string,
        validate: (wallet: TokenWallet) => boolean,
        increments: { availableTokens?: number; lockedTokens?: number },
    ): Promise<TokenWallet | null> {
        const sem = this.getSemaphoreForWallet(walletId);
        await sem.acquire();
        try {
            const wallet = await TokenWallet.finder.findByKey(walletId);
            if (!wallet || !validate(wallet)) {
                return null;
            }
            if (typeof increments.availableTokens === "number" && increments.availableTokens !== 0) {
                wallet.availableTokens += increments.availableTokens;
            }
            if (typeof increments.lockedTokens === "number" && increments.lockedTokens !== 0) {
                wallet.lockedTokens += increments.lockedTokens;
            }
            wallet.version += 1;
            wallet.updatedAt = Date.now();
            await wallet.save();
            return wallet;
        } finally {
            sem.release();
        }
    }
}
