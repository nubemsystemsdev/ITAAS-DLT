"use strict";

import Express from "express";
import { BAD_REQUEST, ensureObjectBody, FORBIDDEN, INTERNAL_SERVER_ERROR, noCache, NOT_FOUND, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";
import { DIDService } from "../../services/did-service";
import { UsersService } from "../../services/users-service";
// import { authenticateWithDID, requireDIDAuth } from "../../middleware/auth-did";
import { VerificableCredentialsService } from "../../services/vc-service";
import { Identitycredentials } from "../../models/identity-credentials";
import { UserDID } from "../../models/users/user-did";
import { Wallet } from "../../models/wallet";
import { DataFilter } from "tsbean-orm";

/**
 * DID API
 * @group did - Decentralized Identity API
 */
export class DidController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.post(prefix + "/did/register/user", ensureObjectBody(this.registerUser.bind(this)));
        application.post(prefix + "/did/register/ai", ensureObjectBody(this.registerAI.bind(this)));
        application.get(prefix + "/did/resolve/:did", noCache(this.resolve.bind(this)));
        //application.get(prefix + "/did/me", authenticateWithDID, requireDIDAuth, noCache(this.me.bind(this)));
        //application.post(prefix + "/did/reissue", authenticateWithDID, requireDIDAuth, ensureObjectBody(this.reissue.bind(this)));
        application.get(prefix + "/did/my-credentials", noCache(this.myCredentials.bind(this)));
        
        //application.post(prefix + "/did/create-presentation", authenticateWithDID, requireDIDAuth, ensureObjectBody(this.createPresentation.bind(this)));
        application.post(prefix + "/did/verify-presentation", ensureObjectBody(this.verifyPresentation.bind(this)));
    }

    /**
     * @typedef DidRegisterUserBody
     * @property {string} walletPassword.required - Wallet password (needed to sign the blockchain registration tx)
     */

    /**
     * @typedef DidRegisterUserResponse
     * @property {boolean} success.required - Operation successful
     * @property {string} did.required - Created DID
     * @property {string} ethereumAddress.required - Ethereum address
     */

    /**
     * Creates DID for the authenticated user and registers it on blockchain (EthereumDIDRegistry)
     * @route POST /did/register/user
     * @group did
     * @param {DidRegisterUserBody.model} request.body.required - walletPassword
     * @returns {DidRegisterUserResponse.model} 200 - DID created
     * @returns {void} 400 - Bad request: WALLET_PASSWORD_REQUIRED
     * @returns {void} 401 - Unauthorized: AUTH_REQUIRED
     * @returns {void} 404 - Not found: WALLET_NOT_FOUND
     * @returns {void} 500 - Server error: DID_CREATE_FAILED
     * @security AuthToken
     */
    public async registerUser(request: Express.Request, response: Express.Response): Promise<void> {
        const auth = await UsersService.getInstance().auth(request);

        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const wallet = await Wallet.findByUser(auth.user.id);
        if (!wallet) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "WALLET_NOT_FOUND",
                "Wallet not found for the authenticated user"
            );
            return;
        }

        const walletPassword = (request.body.walletPassword || "") + "";
        if (!walletPassword) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WALLET_PASSWORD_REQUIRED",
                "walletPassword is required to register the DID on blockchain"
            );
            return;
        }

        try {
            const didService = DIDService.getInstance();
            const user = auth.user;
            const result = await didService.createDIDForUser(
                user.id,
                user.username,
                user.email,
                user.emailVerified,
                walletPassword
            );

            sendApiResult(request, response, {
                success: true,
                did: result.did,
                ethereumAddress: result.ethereumAddress,
            });
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "DID_CREATE_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    /**
     * @typedef DidRegisterAIBody
     * @property {string} name.required - AI agent name
     * @property {string} walletPassword.required - Wallet password
     */

    /**
     * @typedef DidRegisterAIResponse
     * @property {boolean} success.required - Operation successful
     * @property {string} did.required - Created DID
     * @property {string} ethereumAddress.required - Ethereum address
     */

    /**
     * Creates DID for an AI agent (admins only)
     * @route POST /did/register/ai
     * @group did
     * @param {DidRegisterAIBody.model} request.body.required - name, walletPassword
     * @returns {DidRegisterAIResponse.model} 200 - DID created
     * @returns {void} 400 - Bad request: INVALID_NAME, WALLET_PASSWORD_REQUIRED
     * @returns {void} 403 - Access denied: ADMIN_REQUIRED
     * @returns {void} 404 - Not found: WALLET_NOT_FOUND
     * @security AuthToken
     */
    public async registerAI(request: Express.Request, response: Express.Response): Promise<void> {
        const auth = await UsersService.getInstance().auth(request);

        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (auth.user.role !== "admin") {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "ADMIN_REQUIRED",
                "Admin role required"
            );
            return;
        }

        const wallet = await Wallet.findByUser(auth.user.id);
        if (!wallet) {
            sendApiError(
                request,
                response,
                NOT_FOUND,
                "WALLET_NOT_FOUND",
                "Wallet not found for the authenticated admin"
            );
            return;
        }

        const name = (request.body.name || "") + "";
        const walletPassword = (request.body.walletPassword || "") + "";

        if (!name) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_NAME",
            );
            return;
        }
        
        if (!walletPassword) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "WALLET_PASSWORD_REQUIRED",
                "walletPassword is required to register the DID on blockchain"
            );
            return;     
        }
        try {
            const didService = DIDService.getInstance();
            const result = await didService.createDIDForAI(name, walletPassword);

            sendApiResult(request, response, {
                success: true,
                did: result.did,
                ethereumAddress: result.ethereumAddress,
            });
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "DID_AI_CREATE_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    

    /**
     * Resolves a DID and returns the identity document
     * @route GET /did/resolve/{did}
     * @group did
     * @param {string} did.path.required - DID to resolve (e.g. did:ethr:...)
     * @returns {object} 200 - DID document
     * @returns {void} 400 - Bad request: INVALID_DID_FORMAT
     */
    public async resolve(request: Express.Request, response: Express.Response): Promise<void> {
        const did = (request.params.did || "") + "";

        if (!did?.startsWith("did:")) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_DID_FORMAT",
                "Invalid DID format"
            );
            return;
        }

        try {
            const didService = DIDService.getInstance();
            const doc = await didService.resolveDID(did);
            sendApiResult(request, response, doc);
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "RESOLVE_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    /**
     * @typedef DidMeResponse
     * @property {boolean} success.required - Operation successful
     * @property {string} did - Token DID
     * @property {object} credentialSubject - Credential subject
     * @property {string} vcJwt - Credential JWT
     */

    /**
     * Returns the authenticated DID info (Bearer vcJwt)
     * @route GET /did/me
     * @group did
     * @returns {DidMeResponse.model} 200 - Authenticated DID data
     * @security BearerAuth
     */
    public async me(request: Express.Request, response: Express.Response): Promise<void> {
        sendApiResult(request, response, {
            success: true,
            ...request.didAuth,
        });
    }

    

    /**
     * @typedef DidMyCredentialsResponse
     * @property {boolean} success.required - Operation successful
     * @property {number} count.required - Number of credentials
     * @property {array} credentials.required - List of credentials
     */

    /**
     * Lists the verifiable credentials of the authenticated user
     * @route GET /did/my-credentials
     * @group did
     * @returns {DidMyCredentialsResponse.model} 200 - List of credentials
     * @returns {void} 401 - Unauthorized: AUTH_REQUIRED
     * @security AuthToken
     */
    public async myCredentials(request: Express.Request, response: Express.Response): Promise<void> {
        const auth = await UsersService.getInstance().auth(request);

        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        try {
            const user = auth.user;
            const credentials = await Identitycredentials.finder.find(
                DataFilter.and(
                    DataFilter.equals("ownerId", user.id),
                    DataFilter.equals("status", "active")
                )
            );

            const formattedCredentials = credentials.map(cred => ({
                credentialId: cred.credentialId,
                credentialType: cred.credentialType,
                vcJwt: cred.credentialData,
                issuedDate: cred.issuedDate,
                expirationDate: cred.expirationDate,
                status: cred.status
            }));

            sendApiResult(request, response, {
                success: true,
                count: formattedCredentials.length,
                credentials: formattedCredentials
            });

        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "FETCH_CREDENTIALS_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    
    /**
     * @typedef DidCreatePresentationBody
     * @property {array} credentialIds.required - IDs of the credentials to include
     * @property {number} nonce.required - Unique nonce (prevents replay attacks)
     * @property {string} walletPassword.required - Password of the wallet to sign
     * @property {string} message - Optional message to include
     */

    /**
     * @typedef DidCreatePresentationResponse
     * @property {boolean} success.required - Operation successful
     * @property {string} vpJwt.required - Verifiable Presentation JWT
     * @property {number} credentialsCount.required - Number of credentials included
     * @property {string} message - Confirmation message
     */

    /**
     * Creates a Verifiable Presentation grouping multiple VCs
     * @route POST /did/create-presentation
     * @group did
     * @param {DidCreatePresentationBody.model} request.body.required - credentialIds, nonce, walletPassword
     * @returns {DidCreatePresentationResponse.model} 200 - VP created
     * @returns {void} 400 - Bad request: CREDENTIAL_IDS_REQUIRED, NONCE_REQUIRED, PASSWORD_REQUIRED, INVALID_PASSWORD
     * @returns {void} 404 - Not found: USER_NOT_FOUND, NO_CREDENTIALS_FOUND, WALLET_NOT_FOUND
     * @security BearerAuth
     */
    public async createPresentation(request: Express.Request, response: Express.Response): Promise<void> {
        const didAuth = request.didAuth;
        if (!didAuth) {
            sendUnauthorized(request, response);
            return;
        }

        const { credentialIds, message, nonce, walletPassword } = request.body;

        if (!credentialIds || !Array.isArray(credentialIds) || credentialIds.length === 0) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "CREDENTIAL_IDS_REQUIRED",
                "At least one credentialId required"
            );
            return;
        }

        if (typeof nonce !== "number") {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "NONCE_REQUIRED",
                "Nonce (number) is required"
            );
            return;
        }

        if (!walletPassword) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "PASSWORD_REQUIRED",
                "walletPassword required to sign presentation"
            );
            return;
        }

        try {
            const userDid = await UserDID.findByDid(didAuth.did);
            if (!userDid) {
                sendApiError(
                    request,
                    response,
                    NOT_FOUND,
                    "USER_NOT_FOUND",
                    "User not found"
                );
                return;
            }

            const credentials = await Identitycredentials.finder.find(
                DataFilter.and(
                    DataFilter.equals("ownerId", userDid.uid),
                    DataFilter.into("credentialId", credentialIds),
                    DataFilter.equals("status", "active")
                )
            );

            if (credentials.length === 0) {
                sendApiError(
                    request,
                    response,
                    NOT_FOUND,
                    "NO_CREDENTIALS_FOUND",
                    "No active credentials found with provided IDs"
                );
                return;
            }

            const vcJwts = credentials.map(c => c.credentialData);
            const wallet = await Wallet.findByUser(userDid.uid);
            if (!wallet) {
                sendApiError(
                    request,
                    response,
                    NOT_FOUND,
                    "WALLET_NOT_FOUND",
                    "Wallet not found for the user"
                );
                return;
            }

            let privateKey;
            try {
                privateKey = wallet.unlock(walletPassword);
            } catch (error) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "INVALID_PASSWORD",
                    "Invalid wallet password"
                );
                return;
            }

            const vcService = VerificableCredentialsService.getInstance();
            const holder = vcService.getIssuerToSign(
                didAuth.did,
                "Secp256k1",
                new Uint8Array(privateKey)
            );

            const vpJwt = await vcService.issueVerificablePresentation(
                holder,
                vcJwts,
                nonce,
                message
            );

            sendApiResult(request, response, {
                success: true,
                vpJwt: vpJwt,
                credentialsCount: vcJwts.length,
                message: "Verifiable Presentation created successfully"
            });

        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "CREATE_PRESENTATION_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    /**
     * @typedef DidVerifyPresentationBody
     * @property {string} vpJwt.required - Verifiable Presentation JWT to verify
     */

    /**
     * @typedef DidVerifyPresentationResponse
     * @property {boolean} success.required - Operation successful
     * @property {boolean} valid.required - If the presentation is valid
     * @property {object} presentation - Verified presentation data
     * @property {string} message - Additional message
     */

    /**
     * Verifies a Verifiable Presentation
     * @route POST /did/verify-presentation
     * @group did
     * @param {DidVerifyPresentationBody.model} request.body.required - vpJwt
     * @returns {DidVerifyPresentationResponse.model} 200 - Verification result
     * @returns {void} 400 - Bad request: VPJWT_REQUIRED
     */
    public async verifyPresentation(request: Express.Request, response: Express.Response): Promise<void> {
        const vpJwt = (request.body.vpJwt || "") + "";

        if (!vpJwt) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "VPJWT_REQUIRED",
                "vpJwt is required"
            );
            return;
        }

        try {
            const vcService = VerificableCredentialsService.getInstance();
            const [verified, message] = await vcService.verifyMessagePresentation(vpJwt);

            if (!verified) {
                sendApiResult(request, response, {
                    success: false,
                    valid: false,
                    error: message || "Presentation verification failed"
                });
                return;
            }

            sendApiResult(request, response, {
                success: true,
                valid: true,
                presentation: {
                    did: verified.did,
                    hasCredential: verified.hasCredential,
                    credentialSubject: verified.credentialSubject,
                    nonce: verified.nonce,
                    timestamp: verified.timestamp,
                    encryptedMessage: verified.encryptedMessage
                },
                message: message
            });

        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "VERIFY_PRESENTATION_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

}
