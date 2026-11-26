// Nubem token API

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { BAD_REQUEST, FORBIDDEN, ensureObjectBody, noCache, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { parseJsonSafe, parsePageParameters } from "../../utils/api-utils";
import { ADMIN_ROLE, UsersService } from "../../services/users-service";
import { OrganizationService } from "../../services/organization-service";
import { TokenService } from "../../services/token-service";
import { TokenTraceability } from "../../models/token-traceability";
import { TokenWalletScopeType } from "../../models/token-wallet";
import { Wallet } from "../../models/wallet";
import { BlockchainService } from "../../services/blockchain-service";
import { formatQuantityCurrency } from "../../utils/quantity";
import { BalanceConfig } from "../../config/config-balance";

/**
 * Nubem Tokens API
 * @group tokens_nubem
 */
export class TokensNubemController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/tokens/balance", noCache(this.getBalance.bind(this)));
        application.get(prefix + "/tokens/history", noCache(this.getHistory.bind(this)));
        application.post(prefix + "/tokens/redeem/quote", ensureObjectBody(this.getRedeemQuote.bind(this)));
        application.get(prefix + "/tokens/onchain/balance", noCache(this.getOnChainBalanceByAddress.bind(this)));
        application.get(prefix + "/tokens/onchain/balance/own", noCache(this.getOwnOnChainBalance.bind(this)));
    }

    /**
     * @typedef TokenRedeemQuoteBody
     * @property {number} amount_eur_cents.required - Purchase amount in cents
     * @property {number} requested_tokens - Requested tokens to redeem
     */

    /**
     * @typedef TokensOnChainBalanceResponse
     * @property {string} token.required - Formatted token amount with currency symbol
     */

    /**
     * @typedef TokensBalanceResponse
     * @property {string} scope_type.required - Scope type for the wallet
     * @property {string} scope_id.required - Scope identifier
     * @property {number} available_tokens.required - Available token balance
     * @property {number} locked_tokens.required - Locked token balance
     * @property {number} token_value_eur_cents.required - Value of one token in euro cents
     * @property {number} equivalent_eur_cents.required - Fiat equivalent for available tokens
     */

    /**
     * @typedef TokenHistoryEntry
     * @property {string} id.required - Trace row identifier
     * @property {string} operationId.required - Operation identifier
     * @property {string} actionKind.required - Trace action kind
     * @property {string} walletId.required - Wallet identifier
     * @property {string} scopeType.required - Scope type
     * @property {string} scopeId.required - Scope identifier
     * @property {string} actorUid.required - Actor user identifier
     * @property {string} paymentId.required - Related payment identifier
     * @property {string} checkoutSessionId.required - Checkout session identifier
     * @property {number} amountTokens.required - Token amount involved in this trace
     * @property {number} amountEurCents.required - Fiat amount in euro cents
     * @property {string} payloadHash.required - Payload hash
     * @property {string} chainName.required - Blockchain network name
     * @property {string} txHash.required - Blockchain transaction hash
     * @property {string} status.required - Trace status
     * @property {number} retries.required - Retry counter
     * @property {string} errorMessage.required - Error message (if any)
     * @property {number} createdAt.required - Creation timestamp (ms)
     * @property {number} updatedAt.required - Last update timestamp (ms)
     * @property {string} payloadJson.required - Parsed payload data
     * @property {string} conceptName - Resolved human-readable concept name (nullable)
     */

    /**
     * @typedef TokensHistoryResponse
     * @property {string} wallet_id.required - Wallet identifier
     * @property {string} scope_type.required - Scope type for the wallet
     * @property {string} scope_id.required - Scope identifier
     * @property {number} page.required - Current page number
     * @property {number} totalPages.required - Total number of pages
     * @property {Array.<TokenHistoryEntry>} history.required - Ledger traceability rows
     */

    /**
     * @typedef TokenRedeemQuoteResponse
     * @property {string} walletId.required - Wallet identifier
     * @property {number} availableTokens.required - Current available token balance
     * @property {number} requestedTokens.required - Requested token amount
     * @property {number} appliedTokens.required - Applied token amount for this quote
     * @property {number} maxApplicableTokens.required - Maximum applicable token amount
     * @property {number} discountEurCents.required - Discount amount in euro cents
     * @property {number} finalAmountEurCents.required - Final payable amount in euro cents
     */

    /**
     * Get NubemToken balance
     * Binding: GetNubemTokenBalance
     * @route GET /tokens/balance
     * @group tokens_nubem
     * @returns {TokensBalanceResponse.model} 200 - Current balance
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getBalance(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        const wallet = await TokenService.getInstance().resolveAndGetWalletForUser(auth.user.id, true);
        const allowed = await OrganizationService.getInstance().canAccessScope(auth.user.id, wallet.scopeType, wallet.scopeId);
        if (!allowed) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }
        const rules = await TokenService.getInstance().getEffectiveRules();
        sendApiResult(request, response, {
            scope_type: wallet.scopeType,
            scope_id: wallet.scopeId,
            available_tokens: wallet.availableTokens,
            locked_tokens: wallet.lockedTokens,
            token_value_eur_cents: rules.tokenValueEurCents,
            equivalent_eur_cents: wallet.availableTokens * rules.tokenValueEurCents,
        });
    }

    /**
     * Get NubemToken history
     * Binding: GetNubemTokenHistory
     * @route GET /tokens/history
     * @group tokens_nubem
     * @param {number} page.query - Page number (1-based)
     * @param {number} pageSize.query - Page size
     * @returns {TokensHistoryResponse.model} 200 - Ledger history with traceability
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getHistory(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        const wallet = await TokenService.getInstance().resolveAndGetWalletForUser(auth.user.id, true);
        const allowed = await OrganizationService.getInstance().canAccessScope(auth.user.id, wallet.scopeType, wallet.scopeId);
        if (!allowed) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const total = await TokenTraceability.countByWalletVisible(wallet.id);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, 20);
        const traces = await TokenTraceability.findByWalletPagedVisible(wallet.id, skip, pageSize);

        const conceptNames = await TokenService.getInstance().resolveConceptNames(
            traces.map(t => ({ id: t.id, operationId: t.operationId, paymentId: t.paymentId })),
        );
        const history = traces.map(trace => {
            const row = trace.toObject();
            row.payloadJson = parseJsonSafe(row.payloadJson);
            row.conceptName = conceptNames.get(row.id) ?? null;
            return row;
        });

        sendApiResult(request, response, {
            wallet_id: wallet.id,
            scope_type: wallet.scopeType,
            scope_id: wallet.scopeId,
            page,
            totalPages,
            history,
        });
    }

    /**
     * Quote token redeem
     * Binding: PostNubemTokenRedeemQuote
     * @route POST /tokens/redeem/quote
     * @group tokens_nubem
     * @param {TokenRedeemQuoteBody.model} request.body - Quote body
     * @returns {TokenRedeemQuoteResponse.model} 200 - Redeem quote
     * @returns {void} 400 - Bad request: INVALID_AMOUNT
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getRedeemQuote(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        const amountEurCents = Math.floor(Number(request.body.amount_eur_cents || 0));
        if (!Number.isFinite(amountEurCents) || amountEurCents <= 0) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_AMOUNT", "Invalid amount");
            return;
        }
        const wallet = await TokenService.getInstance().resolveAndGetWalletForUser(auth.user.id, true);
        const allowed = await OrganizationService.getInstance().canAccessScope(auth.user.id, wallet.scopeType, wallet.scopeId);
        if (!allowed) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }
        const requested = Math.floor(Number(request.body.requested_tokens || 0));
        const organizationId = wallet.scopeType === TokenWalletScopeType.ORGANIZATION ? wallet.scopeId : null;
        const quote = await TokenService.getInstance().quote(auth.user.id, amountEurCents, requested, organizationId);
        sendApiResult(request, response, quote);
    }

    /**
     * Get user's own on-chain balance
     * Binding: GetOwnOnChainTokenBalance
     * @route GET /tokens/onchain/balance/own
     * @group tokens_nubem
     * @returns {TokensOnChainBalanceResponse.model} 200 - User on-chain token balance
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: WALLET_NOT_FOUND
     * @security AuthToken
     */
    public async getOwnOnChainBalance(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const wallet = await Wallet.findByUser(auth.user.id);
        if (!wallet) {
            sendApiError(request, response, FORBIDDEN, "WALLET_NOT_FOUND", "Wallet not found");
            return;
        }

        const tokenBalance = await BlockchainService.getInstance().getBalance(wallet.address);
        const formattedBalance = formatQuantityCurrency(
            tokenBalance,
            BalanceConfig.getInstance().stableCoinSymbol,
            BalanceConfig.getInstance().stableCoinDecimals,
        );
        sendApiResult(request, response, { token: formattedBalance });
    }

    /**
     * Get on-chain balance for a specific wallet address (admin only)
     * Binding: GetOnChainTokenBalance
     * @route GET /tokens/onchain/balance
     * @group tokens_nubem
     * @param {string} address.query.required - Wallet address to query
     * @returns {TokensOnChainBalanceResponse.model} 200 - Wallet on-chain token balance
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: ACCESS_DENIED, WALLET_NOT_FOUND
     * @security AuthToken
     */
    public async getOnChainBalanceByAddress(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== ADMIN_ROLE) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const walletAddress = ((request.query.address || "") + "").trim();
        const wallet = await Wallet.findByAddress(walletAddress);
        if (!wallet) {
            sendApiError(request, response, FORBIDDEN, "WALLET_NOT_FOUND", "Wallet not found");
            return;
        }

        const tokenBalance = await BlockchainService.getInstance().getBalance(wallet.address);
        const formattedBalance = formatQuantityCurrency(
            tokenBalance,
            BalanceConfig.getInstance().stableCoinSymbol,
            BalanceConfig.getInstance().stableCoinDecimals,
        );
        sendApiResult(request, response, { token: formattedBalance });
    }
}
