// Reserved for license

"use strict";

import Express from "express";
import { Wallet } from "../../models/wallet";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, ensureObjectBody, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendApiSuccess, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";
import { BlockchainConfig } from "../../config/config-blockchain";
import { BlockchainService } from "../../services/blockchain-service";
import { DIDService } from "../../services/did-service";
import { UserDID } from "../../models/users/user-did";
import { sendTransaction } from "@cyberchain/smart-contract-wrapper";
import { Monitor } from "../../monitor";


/**
 * Wallet API
 * @group wallet
 */
export class WalletController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/wallet", ensureObjectBody(noCache(this.getWallet.bind(this))));

        application.post(prefix + "/wallet", ensureObjectBody(this.createWallet.bind(this)));
        application.post(prefix + "/wallet/password", ensureObjectBody(this.changePassword.bind(this)));
        application.post(prefix + "/wallet/export", ensureObjectBody(this.exportPrivateKey.bind(this)));
    }

    /**
     * @typedef WalletInfo
     * @property {string} id.required - Internal wallet ID
     * @property {string} address.required - Wallet address
     * @property {string} did - DID asignado (se crea al crear la wallet)
     */

    /**
     * Get wallet
     * Binding: GetWallet
     * @route GET /wallet
     * @group wallet
     * @returns {WalletInfo.model} 200 - Wallet
     * @returns {void} 404 - Not found
     * @security AuthToken
     */
    public async getWallet(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const wallet = await Wallet.findByUser(user.id);

        if (!wallet || wallet.uid !== user.id) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "WALLET_NOT_FOUND",
                "Wallet not found",
            );
            return;
        }

        const userDid = await UserDID.findLastByUser(user.id);

        sendApiResult(request, response, {
            id: wallet.id,
            address: wallet.address,
            did: userDid ? userDid.did : undefined,
        });
    }

    /**
     * @typedef WalletCreateBody
     * @property {string} password.required - Password to protect the wallet (min 8 characters)
     * @property {string} privateKeyEc - ECDSA private key (HEX, 32 bytes). If neither EC nor ML keys are provided, a random mixed wallet is generated.
     * @property {string} privateKeyMl - ML-DSA secret key (HEX). Required together with publicKeyMl to import an ML-DSA key.
     * @property {string} publicKeyMl - ML-DSA public key (HEX). Required together with privateKeyMl to import an ML-DSA key.
     */

    /**
     * Create wallet
     * Binding: CreateWallet
     * @route POST /wallet
     * @group wallet
     * @param {WalletCreateBody.model} request.body - Request body
     * @returns {WalletInfo.model} 200 - Wallet
     * @returns {void} 400 - Bad request: WEAK_PASSWORD, INVALID_PRIVATE_KEY_EC, INVALID_PRIVATE_KEY_ML, INVALID_PUBLIC_KEY_ML, ERROR_CREATING_WALLET
     * @security AuthToken
     */
    public async createWallet(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const password = (request.body.password || "") + "";

        if (password.length < 8) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too weak password",
            );
            return;
        }

        let pkEc: Buffer | null = null;
        let pkMl: Buffer | null = null;
        let pubMl: Buffer | null = null;

        const pkEcHex = (request.body.privateKeyEc || "") + "";

        if (pkEcHex) {
            try {
                pkEc = Buffer.from(pkEcHex, 'hex');
                if (pkEc.length !== 32) {
                    throw new Error("Invalid private key length");
                }
            } catch (ex) {
                response.status(BAD_REQUEST);
                response.json({ code: "INVALID_PRIVATE_KEY_EC" });
                return;
            }
        }

        const pkMlHex = (request.body.privateKeyMl || "") + "";

        if (pkMlHex) {
            try {
                pkMl = Buffer.from(pkMlHex, 'hex');
                if (pkMl.length !== BlockchainConfig.getInstance().getMlDsaSize().secretKey) {
                    throw new Error("Invalid private key length");
                }
            } catch (ex) {
                response.status(BAD_REQUEST);
                response.json({ code: "INVALID_PRIVATE_KEY_ML" });
                return;
            }
        }

        const pubMlHex = (request.body.publicKeyMl || "") + "";

        if (pubMlHex) {
            try {
                pubMl = Buffer.from(pubMlHex, 'hex');
                if (pubMl.length !== BlockchainConfig.getInstance().getMlDsaSize().publicKey) {
                    throw new Error("Invalid public key length");
                }
            } catch (ex) {
                response.status(BAD_REQUEST);
                response.json({ code: "INVALID_PUBLIC_KEY_ML" });
                return;
            }
        }
        try {
            
            const wallet = await Wallet.findByUser(user.id);
            if (wallet) {
                await wallet.delete();
            }
    
            let w: Wallet;

            // Will be set if the DID auto-creation succeeds.
            let createdDid: string | undefined;
    


            if (pkEc || (pubMl && pkMl)) {
                w = await Wallet.createFromPrivateKeys(user.id, password, pkEc, pkMl, pubMl);
            } else {
                w = await Wallet.createRandom(user.id, password);
            }
    
            try {
                await sendTransaction(
                    w.address, 
                    Buffer.from("/0x0000000000000000000000000000000000000001:0x1", "utf-8"), 
                    0, 
                    BlockchainService.getInstance().getTransactionSendingOptionsAdmin()
                );
            } catch (ex) {
                Monitor.error("Error sending transaction to register wallet on blockchain", ex);
                sendApiError(
                    request,
                    response,
                    INTERNAL_SERVER_ERROR,
                    "ERROR_SENDING_TRANSACTION",
                    "Error: " + ex.message,
                );
                return;
            }

            try {
                const didService = DIDService.getInstance();
                const result = await didService.createDIDForUser(
                    user.id,
                    user.username,
                    user.email,
                    user.emailVerified,
                    password
                );
                createdDid = result.did;
            } catch (ex) {
                Monitor.error("Error creating DID for user " + user.id, ex);
                sendApiError(
                    request,
                    response,
                    INTERNAL_SERVER_ERROR,
                    "ERROR_CREATING_DID",
                    "Error: " + ex.message,
                );
                return;
            }           

            sendApiResult(request, response, {
                id: w.id,
                address: w.address,
                did: createdDid
            });
        } catch (ex) {
            Monitor.error("Error creating wallet for user " + user.id, ex);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "ERROR_CREATING_WALLET",
                "Error: " + ex.message,
            );
            return;
        }
    }

    /**
     * @typedef WalletChangePasswordBody
     * @property {string} password.required - Current wallet password
     * @property {string} new_password.required - New wallet password (min 8 characters)
     */

    /**
     * Change wallet password
     * Binding: ChangeWalletPassword
     * @route POST /wallet/password
     * @group wallet
     * @param {WalletChangePasswordBody.model} request.body - Request body
     * @returns {void} 200 - Success
     * @returns {void} 404 - Not found
     * @returns {void} 400 - Bad request: WEAK_PASSWORD, WRONG_PASSWORD
     * @security AuthToken
     */
    public async changePassword(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const wallet = await Wallet.findByUser(user.id);

        if (!wallet || wallet.uid !== user.id) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "WALLET_NOT_FOUND",
                "Wallet not found",
            );
            return;
        }

        const password = (request.body.password || "") + "";

        if (!wallet.checkPassword(password)) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WRONG_PASSWORD",
                "The client provided a wrong password for the wallet",
            );
            return;
        }

        const newPassword = (request.body.new_password || "") + "";

        if (newPassword.length < 8) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WEAK_PASSWORD",
                "The client provided an empty or too weak password",
            );
            return;
        }

        await wallet.changePassword(newPassword, password);

        sendApiSuccess(request, response);
    }

    /**
     * @typedef WalletExportBody
     * @property {string} password.required - Current wallet password
     */

    /**
     * @typedef WalletExportResponse
     * @property {string} privateKeyEc.required - ECDSA private key in uppercase HEX (empty string if the wallet has no ECDSA key)
     * @property {string} privateKeyMl.required - ML-DSA secret key in uppercase HEX (empty string if the wallet has no ML-DSA key)
     * @property {string} publicKeyMl.required - ML-DSA public key in uppercase HEX (empty string if the wallet has no ML-DSA key)
     */

    /**
     * Export wallet private key
     * Binding: ExportPrivatekey
     * @route POST /wallet/export
     * @group wallet
     * @param {WalletExportBody.model} request.body - Request body
     * @returns {WalletExportResponse.model} 200 - Success
     * @returns {void} 404 - Not found
     * @returns {void} 400 - Bad request: WRONG_PASSWORD
     * @security AuthToken
     */
    public async exportPrivateKey(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const user = auth.user;

        const wallet = await Wallet.findByUser(user.id);

        if (!wallet || wallet.uid !== user.id) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "WALLET_NOT_FOUND",
                "Wallet not found",
            );
            return;
        }

        const password = (request.body.password || "") + "";

        if (!wallet.checkPassword(password)) {
            response.status(BAD_REQUEST);
            response.json({ code: "WRONG_PASSWORD" });
            return;
        }

        const keys = wallet.unlockMix(password);

        response.json({
            privateKeyEc: keys.signKeyECDSA ? Buffer.from(keys.signKeyECDSA.key).toString("hex").toUpperCase() : "",
            privateKeyMl: keys.signKeyMLSA ? Buffer.from(keys.signKeyMLSA.secretKey).toString("hex").toUpperCase() : "",
            publicKeyMl: keys.signKeyMLSA ? Buffer.from(keys.signKeyMLSA.publicKey).toString("hex").toUpperCase() : "",
        });
    }

    

}
