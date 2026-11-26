import Express from "express";
import { Controller } from "../controller";
import { UsersService } from "../../services/users-service";
import { BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR, NOT_FOUND, sendApiError, sendForbidden, sendApiResult, sendApiSuccess, sendUnauthorized, ensureObjectBody } from "../../utils/http-utils";
import { Identitycredentials, VCRequestStatus } from "../../models/identity-credentials";
import { Wallet } from "../../models/wallet";
import { ADMIN_ROLE } from "../../services/users-service";
import { VerificableCredentialsService } from "../../services/vc-service";
import { BlockchainService } from "../../services/blockchain-service";
import { VerifiableCredential } from "../../models/verifiable-credential";
import { DataFilter } from "tsbean-orm";


const VC_REQUESTS_LIST_PAGE_LENGTH = 20;



/**
 * Verifiable Credentials API
 * @group verifiable-credentials
 */
export class VCRequestController extends Controller {
    public async registerAPI(prefix: string, application: Express.Express) {
        application.post(prefix + "/vc-request", this.requestVC.bind(this));
        application.post(prefix + "/vc-request/:id/accept", this.acceptVC.bind(this));
        application.post(prefix + "/vc-request/:id/reject", this.rejectVC.bind(this));

        application.get(prefix + "/vc-request/list", this.getVCRequestList.bind(this));
        application.get(prefix + "/vc-request/:id", this.getVCRequest.bind(this));

        application.get(prefix + "/vc-request/credentials/:credentialId/revoked", this.getCredentialRevocationStatus.bind(this));
        application.post(prefix + "/vc-request/credentials/:credentialId/revoke", this.revokeCredential.bind(this));
    
        application.post(prefix + "/vc-request/verify", ensureObjectBody(this.verify.bind(this)));
        
    }

    /**
     * @typedef VCRequest
     * @property {string} id.required - VC request identifier
     * @property {string} status.required - VC request status
     * @property {string} requestedBy.required - Username of the requester
     * @property {string} requestDate.required - Date of the request
     * @property {string} requesterDid.required - DID of the requester
     * @property {string} credentialId.required - Credential ID
     * @property {string} credentialType.required - Credential type
     * @property {string} credentialData.required - Credential data
     * @property {string} credentialStatus.required - Credential status
     */

    /**
     * @typedef RoleRequestListResponse
     * @property {RoleRequestItem[]} items.required - List of role requests
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total number of pages
     * @property {number} total.required - Total number of role requests
     */

    /**
     * @typedef RoleRequestItem
     * @property {string} id.required - VC request identifier
     * @property {string} status.required - VC request status
     * @property {string} requestedBy.required - Username of the requester
     * @property {string} requestDate.required - Date of the request
     * @property {string} requesterDid.required - DID of the requester
     * @property {string} credentialId.required - Credential ID
     * @property {string} credentialType.required - Credential type
     * @property {object} credentialData.required - Credential data
     * @property {string} credentialStatus.required - Credential status
     */

    /**
     * @typedef RevokeCredentialBody
     * @property {string} reason.required - Revocation reason
     */

    /**
     * @typedef RequestVCRequest
     * @property {string} did.required - Applicant's Decentralized Identifier (DID)
     */

    /**
     * Request Verifiable Credential
     * @route POST /vc-request
     * @group verifiable-credentials
     * @param {RequestVCRequest.model} request.body.required - Application body with DID
     * @returns {object} 200 - Success
     * @returns {Error}  400 - Bad request: INVALID_DID_FORMAT, DID_MISMATCH, WALLET_NOT_FOUND
     * @returns {Error}  401 - Unauthorized
     * @security AuthToken 
     * @example request - Example request for Postman
     * {
     * "did": "did:key:z6MkpTHR8VNs2KyzNyMTY1v5u7HLKVsFrS1goS"
     * }
    */
    public async requestVC(req: Express.Request, res: Express.Response) {
        try {
            const auth = await UsersService.getInstance().auth(req);
            if (!auth.isRegisteredUser()) return sendUnauthorized(req, res);

            const { did } = req.body;

            if (!did) {
                return sendApiError(req, res, BAD_REQUEST, "MISSING_DATA", "DID is required");
            }

            const didRegex = /^did:[a-z0-9]+:([a-zA-Z0-9._%-]+(:[a-zA-Z0-9._%-]+)*)$/;
            if (!didRegex.test(did)) {
                return sendApiError(req, res, BAD_REQUEST, "INVALID_DID_FORMAT", "The provided DID does not follow a valid structure");
            }

            const wallet = await Wallet.findByUser(auth.user.id);
            if (!wallet) {
                return sendApiError(req, res, BAD_REQUEST, "WALLET_NOT_FOUND", "Wallet not found for the user");
            }

            
            const credentialType = "IdentityCredential";
            const credentialData = { 
                requestedBy: auth.user.username,
                requestDate: new Date().toISOString(),
                requesterDid: did
            };

            await Identitycredentials.createRequest(
                auth.user.id, 
                wallet.address, 
                credentialType, 
                credentialData
            );

            return sendApiSuccess(req, res);

        } catch (error) {
            req.logger?.error("Error in requestVC: " + error);
            return sendApiError(
                req, 
                res, 
                INTERNAL_SERVER_ERROR, 
                "VC_REQUEST_FAILED", 
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }

    /**
     * Accept VC Request
     * Binding: AcceptVC
     * @route POST /vc-request/{id}/accept
     * @group verifiable-credentials
     * @param {string} id.path - Request ID
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: VC_REQUEST_NOT_FOUND
     * @security AuthToken 
    */
    public async acceptVC(req: Express.Request, res: Express.Response) {
        const auth = await UsersService.getInstance().auth(req);
        if (!auth.isRegisteredUser()) {
            return sendUnauthorized(req, res);
        }

        if (auth.user.role !== ADMIN_ROLE) {
            sendForbidden(req, res);
            return;
        }

        const id = (req.params.id || "") + "";
        if (!id) {
            sendApiError(req, res, BAD_REQUEST, "INVALID_ID", "Invalid role request id");
            return;
        }

        const vcRequest = await Identitycredentials.findById(id);
        if (!vcRequest) {
            sendApiError(req, res, NOT_FOUND, "VC_REQUEST_NOT_FOUND", "VC request not found");
            return;
        }

        if (vcRequest.status !== VCRequestStatus.PENDING) {
            sendApiError(req, res, BAD_REQUEST, "INVALID_REQUEST_STATUS", "VC request must be pending to be accepted");
            return;
        }
        try {
            const vcJwt = await VerificableCredentialsService.getInstance().processAcceptance(vcRequest);

            sendApiResult(req, res, {
                success: true,
                vcJwt: vcJwt,
                credentialId: vcRequest.credentialId,
                status: vcRequest.status,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            sendApiError(req, res, INTERNAL_SERVER_ERROR, "ACCEPT_ERROR", message);
        }
    }

    /**
     * Reject VC
     * Binding: RejectVC
     * @route POST /vc-request/{id}/reject
     * @group verifiable-credentials
     * @param {string} id.path - Credential ID to reject
     * @returns {void} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken 
    */
    public async rejectVC(req: Express.Request, res: Express.Response) {
        const auth = await UsersService.getInstance().auth(req);
        if (!auth.isRegisteredUser()) return sendUnauthorized(req, res);
            
        if (auth.user.role !== ADMIN_ROLE) return sendForbidden(req, res);

        const id = (req.params.id || "") + "";
        if (!id) {
            sendApiError(req, res, BAD_REQUEST, "INVALID_ID", "Invalid role request id");
            return;
        }

        const vcRequest = await Identitycredentials.findById(id);

        if (!vcRequest) return sendApiError(req, res, NOT_FOUND, "NOT_FOUND", "Request not found");

        try {
            await vcRequest.reject(); 
            sendApiSuccess(req, res);
        } catch (err) {
            sendApiError(req, res, INTERNAL_SERVER_ERROR, "REJECT_ERROR", "Error rejecting VC request");
        }
    }



    /**
     * Get all vc requests with pagination (admin only)
     * Binding: GetVCRequestList
     * @route GET /vc-request/list
     * @group verifiable-credentials
     * @param {number} page.query - Page number for pagination (default: 1)
     * @returns {RoleRequestListResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getVCRequestList(req: Express.Request, res: Express.Response) {

        const auth = await UsersService.getInstance().auth(req);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(req, res);
            return;
        }
        
        if (auth.user.role !== ADMIN_ROLE) {
            sendForbidden(req, res);
            return;
        }


        const totalCount = await Identitycredentials.countAll();

        let totalPages = Math.floor(totalCount / VC_REQUESTS_LIST_PAGE_LENGTH);

        if (totalCount % VC_REQUESTS_LIST_PAGE_LENGTH > 0) {
            totalPages++;
        }

        if (totalPages < 1) {
            totalPages = 1;
        }

        let page = parseInt((req.query.page || "1") + "", 10);

        if (isNaN(page) || !isFinite(page) || page < 1) {
            page = 1;
        }

        if (page > totalPages) {
            page = totalPages;
        }

        const skip = (page - 1) * VC_REQUESTS_LIST_PAGE_LENGTH;

        const pendingCredentials = await Identitycredentials.findAllPaginated(skip, VC_REQUESTS_LIST_PAGE_LENGTH);
        
        const pendingCredentialsObjects = pendingCredentials.map(r => r.toObject());
        
        res.json({
            page: page,
            totalPages: totalPages,
            items: pendingCredentialsObjects
        });

    }


    /**
     * Get a vc request by ID
     * Binding: GetVCRequest
     * @route GET /vc-request/{id}
     * @group verifiable-credentials
     * @param {string} id.path.required - VC request identifier
     * @returns {VCRequest.model} 200 - Success
     * @returns {void} 400 - Bad request: INVALID_ID
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: VC_REQUEST_NOT_FOUND
     * @security AuthToken
     */
    public async getVCRequest(req: Express.Request, res: Express.Response) {

        const auth = await UsersService.getInstance().auth(req);
        if(!auth.isRegisteredUser()){
            sendUnauthorized(req, res);
            return;
        }

        if(auth.user.role !== ADMIN_ROLE){
            sendForbidden(req, res);
            return;
        }

        const id = (req.params.id || "") + "";
        if (!id) {
            sendApiError(req, res, BAD_REQUEST, "INVALID_ID", "Invalid VC request identifier");
            return;
        }

        const vcRequest = await Identitycredentials.findById(id);
        if (!vcRequest) {
            sendApiError(req, res, NOT_FOUND, "VC_REQUEST_NOT_FOUND", "VC request not found");
            return;
        }

        

        res.json(vcRequest.toObject());

    }


    /**
     * @typedef CredentialRevocationStatusResponse
     * @property {boolean} success.required - Operation successful
     * @property {number} credentialId.required - Credential ID
     * @property {boolean} revoked.required - Revocation status from blockchain (or local if contract not deployed)
     * @property {string} status - Local credential status if available
     */
        
    /**
     * Check whether a credential is revoked on-chain or locally
     * @route GET /vc-request/credentials/{credentialId}/revoked
     * @group vc-request
     * @param {string} credentialId.path.required - Credential ID to check
     * @returns {CredentialRevocationStatusResponse.model} 200 - Credential revocation status
     * @returns {void} 400 - Bad request: INVALID_ID
     * @returns {void} 500 - Server error
     */
    public async getCredentialRevocationStatus(request: Express.Request, response: Express.Response): Promise<void> {
        const credentialId = request.params?.credentialId;
        if (!credentialId) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "INVALID_ID",
                "Credential ID is required"
            );
            return;
        }
    
        try {
            const results = await Identitycredentials.finder.find(DataFilter.equals("credentialId", credentialId));
            const credential = results.length > 0 ? results[0] : null;
    
            if (!credential) {
                sendApiError(
                    request,
                    response,
                    NOT_FOUND,
                    "CREDENTIAL_NOT_FOUND",
                    "Credential not found"
                );
                return;
            }
    
            let revoked = credential.status === "revoked";
                
            try {
                revoked = await BlockchainService.getInstance().isCredentialRevoked(credential.credentialId);
            } catch (blockchainError) {
                request.logger?.debug("Could not check on-chain revocation status: " + (blockchainError instanceof Error ? blockchainError.message : "unknown"));
            }
    
            sendApiResult(request, response, {
                success: true,
                credentialId: credential.credentialId,
                revoked,
                status: credential.status
            });
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "REVOCATION_STATUS_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }
    
    /**
     * @typedef DidRevokeCredentialBody
     * @property {string} reason.required - Revocation reason
     */
    
    /**
     * @typedef RevokeCredentialResponse
     * @property {boolean} success.required - Operation successful
     * @property {string} credentialId.required - Revoked credential ID
     * @property {string} status.required - Status: "revoked"
     * @property {string} message - Confirmation message
     */
    
    
    /**
     * Revokes a verifiable credential (admin or credential owner)
     * @route POST /vc-request/credentials/{credentialId}/revoke
     * @group vc-request
     * @param {string} credentialId.path.required - Credential ID to revoke
     * @param {RevokeCredentialBody.model} request.body.required - reason
     * @returns {RevokeCredentialResponse.model} 200 - Credential revoked
     * @returns {void} 400 - Bad request: REASON_REQUIRED, ALREADY_REVOKED
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied: NOT_AUTHORIZED
     * @returns {void} 404 - Not found: CREDENTIAL_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async revokeCredential(request: Express.Request, response: Express.Response): Promise<void> {
        const auth = await UsersService.getInstance().auth(request);
    
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
    
        const credentialId = request.params?.credentialId;
        const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
        if (!reason) {
            sendApiError(request, response, BAD_REQUEST, "REASON_REQUIRED", "Revocation reason is required");
            return;
        }
    
    
        try {
            const credential = await Identitycredentials.findById(credentialId);
    
            if (!credential) {
                sendApiError(
                    request,
                    response,
                    NOT_FOUND,
                    "CREDENTIAL_NOT_FOUND",
                    "Credential not found"
                );
                return;
            }
    
            const isAdmin = auth.user.role === "admin";
            const isOwner = credential.ownerId === auth.user.id;
                
            if (!isAdmin && !isOwner) {
                sendApiError(
                    request,
                    response,
                    FORBIDDEN,
                    "NOT_AUTHORIZED",
                    "Only admin or credential owner can revoke this credential"
                );
                return;
            }
    
            const blockchain = BlockchainService.getInstance();
            const revokedOnChain = await blockchain.isCredentialRevoked(credential.credentialId);
            const vc = await VerifiableCredential.findByCredentialId(credential.credentialId);
            const revokedLocally = credential.status === "revoked" || credential.status === VCRequestStatus.REVOKED;

            if (revokedLocally && revokedOnChain && (!vc || vc.isRevoked)) {
                sendApiError(
                    request,
                    response,
                    BAD_REQUEST,
                    "ALREADY_REVOKED",
                    "Credential already revoked"
                );
                return;
            }
    
            const revokeResult = revokedOnChain ? null : await blockchain.revokeCredential(credential.credentialId);

            if (vc && !vc.isRevoked) {
                await VerifiableCredential.revoke(vc.vcId);
            }

            credential.status = "revoked";
            credential.revocationReason = credential.revocationReason || reason;
            credential.updatedAt = Date.now();
            if (revokeResult) {
                credential.txHash = revokeResult.txHash;
            }
            await credential.save();
    
            sendApiResult(request, response, {
                success: true,
                credentialId: credential.credentialId,
                status: "revoked",
                message: "Credential revoked successfully"
            });
    
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "REVOKE_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }


    /**
     * @typedef DidVerifyBody
     * @property {string} vcJwt.required - JWT credential to verify
     */

    /**
     * Verifies a Verifiable Credential (VC) JWT
     * @route POST /vc-request/credentials/verify
     * @group vc-request
     * @param {DidVerifyBody.model} request.body.required - vcJwt
     * @returns {object} 200 - Verification result (valid, payload, etc.)
     * @returns {void} 400 - Bad request: VCJWT_REQUIRED
     */
    public async verify(request: Express.Request, response: Express.Response): Promise<void> {
        const vcJwt = (request.body.vcJwt || "") + "";
    
        if (!vcJwt) {
            sendApiError(
                request,
                response,
                BAD_REQUEST,
                "VCJWT_REQUIRED",
                "vcJwt required"
            );
            return;
        }
    
        try {
            const vcService = VerificableCredentialsService.getInstance();
            const result = await vcService.verifyCredential(vcJwt);
            sendApiResult(request, response, result);
        } catch (error) {
            request.logger?.error(error);
            sendApiError(
                request,
                response,
                INTERNAL_SERVER_ERROR,
                "VERIFICATION_FAILED",
                error instanceof Error ? error.message : "Unknown error"
            );
        }
    }
                
}
