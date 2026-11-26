// Verifiable Credentials and Presentations service

"use strict";

import { 
    createVerifiableCredentialJwt, 
    JwtCredentialPayload, 
    VerifiedPresentation, 
    verifyCredential, 
    verifyPresentation, 
    Issuer, 
    JwtPresentationPayload, 
    createVerifiablePresentationJwt, 
    VerifiedCredential 
} from "did-jwt-vc";
import { DidCredentialSubject, DIDService } from "./did-service";
import { Monitor } from "../monitor";
import { compareAddresses } from "../utils/blockchain";
import { EdDSASigner, ES256KSigner } from "did-jwt";
import { VerifiableCredential } from "../models/verifiable-credential";
import { UserDID } from "../models/users/user-did";
import { Identitycredentials } from "../models/identity-credentials";
import { Wallet } from "../models/wallet";
import { createUserVerifiablecredential } from "../utils/did-jwt-vc";
import { BlockchainService } from "./blockchain-service";
import { createRandomUID } from "../utils/text-utils";
import { verifyCredentials } from "../utils/did-jwt-vc";



/**
 * Result of credential verification
 */
export interface DidVerificationResult {
    valid: boolean;
    did?: string;
    credentialSubject?: any;
    issuer?: string;
    issuedAt?: number;
    expiresAt?: number;
    error?: string;
}

/**
 * Verifiable Credentials and Presentations service
 */
export class VerificableCredentialsService {
    private static instance: VerificableCredentialsService = null;

    public static getInstance(): VerificableCredentialsService {
        if (VerificableCredentialsService.instance) {
            return VerificableCredentialsService.instance;
        } else {
            VerificableCredentialsService.instance = new VerificableCredentialsService();
            return VerificableCredentialsService.instance;
        }
    }

    /**
     * Compares 2 issuers by DID
     * Handles case-insensitive comparison for ethr DIDs
     * @param didA The DID 1
     * @param didB The DID 2
     * @returns True if they are equal
     */
    public compareIssuers(didA: string, didB: string): boolean {
        const didMethodA = didA.split(":")[1] || "";
        const didMethodB = didB.split(":")[1] || "";

        if (didMethodA !== didMethodB) {
            return false;
        }

        switch (didMethodA) {
            case "ethr":
            {
                // For ethr DIDs, compare addresses (case-insensitive)
                const addressA = didA.split(":").slice(2).join(":");
                const addressB = didB.split(":").slice(2).join(":");

                return compareAddresses(addressA, addressB);
            }
            default:
                return didA === didB;
        }
    }

    /**
     * Checks if an issuer is trusted
     * TODO: When roles system is implemented, check if user has issuer role
     * @param did The issuer DID
     * @returns True if trusted
     */
    public async isTrustedIssuer(did: string): Promise<boolean> {
        try {
            // Get the admin issuer DID from DIDService
            const adminIssuerDid = await DIDService.getInstance()['getIssuerDid']();
            
            // For now, we only trust the admin issuer
            const isTrusted = this.compareIssuers(did, adminIssuerDid);
            
            if (!isTrusted) {
                Monitor.debug(`[VC Service] Issuer not trusted: ${did} (expected: ${adminIssuerDid})`);
            }
            
            return isTrusted;
            
        } catch (error) {
            Monitor.exception(error);
            return false;
        }
    }

    /**
     * Verifies a presentation message
     * This method:
     * 1. Verifies the VP signature
     * 2. Checks each VC is not revoked
     * 3. Checks each VC issuer is trusted (admin issuer for now)
     * 4. Aggregates all credential subjects
     * 
     * @param msgString The message (JWT - Contains the VCs and the message as the property 'message')
     * @returns [VerifiedIdentityPresentation | null, message: string]
     */
    public async verifyMessagePresentation(msgString: string): Promise<[valid: VerifiedIdentityPresentation | null, message?: string]> {
        let vp: VerifiedPresentation;
        
        try {
            vp = await verifyPresentation(msgString, {
                resolve: did => DIDService.getInstance().resolveDID(did),
            });
        } catch (ex) {
            Monitor.exception(ex);
            return [null, ex.message];
        }

        if (!vp.verified) {
            return [null, "Invalid presentation signature"];
        }

        const nonce = Number(vp.payload.nonce) || 0;
        const timestamp = Number(vp.payload.iat || 0) || 0;

        // Check for at least one valid VC
        let hasValidVC = false;
        const sub: VerifiedIdentitySubject = Object.create(null);

        for (const vc of (vp.verifiablePresentation.verifiableCredential || [])) {
            const credentialId = this.extractCredentialIdFromVC(vc);
            let isRevoked = false;

            if (credentialId) {
                isRevoked = await BlockchainService.getInstance().isCredentialRevoked(credentialId);
            } else {
                isRevoked = await VerifiableCredential.isRevoked(vc.credentialSubject.id?.toString() || "");
            }

            if (isRevoked) {
                Monitor.debug(`[VC Service] Credential is revoked: ${credentialId || vc.credentialSubject.id}`);
                continue;
            }

            // Check if issuer is trusted
            const isTrusted = await this.isTrustedIssuer(vc.issuer.id);

            if (!isTrusted) {
                Monitor.debug(`[VC Service] Untrusted issuer: ${vc.issuer.id}`);
                continue;
            }

            // Aggregate credential subject properties
            if (vc.credentialSubject && typeof vc.credentialSubject === "object") {
                for (const key of Object.keys(vc.credentialSubject)) {
                    sub[key] = vc.credentialSubject[key];
                }
            }

            hasValidVC = true;
        }

        // Extract message from payload
        const message = (vp.payload.message || "") + "";
        const encrypted = !!vp.payload.encrypted;

        // Return verified presentation
        return [{
            did: vp.verifiablePresentation.holder,
            hasCredential: hasValidVC,
            credentialSubject: sub,
            nonce,
            timestamp,
            encryptedMessage: encrypted,
        }, message];
    }

    private extractCredentialIdFromVC(vc: any): string | null {
        if (!vc) {
            return null;
        }

        const candidate = vc.jti || vc.id || vc.vc?.id;
        if (!candidate) {
            return null;
        }

        return String(candidate).replace(/^urn:credential:/, "");
    }

    /**
     * Issues a verifiable credential
     * @param issuer The issuer (includes the DID and the private key)
     * @param id Credential unique ID
     * @param subjectDid The subject DID
     * @param subjectProperties The subject properties to include in the credential
     * @returns The verifiable credential in JWT form
     */
    public async issueVerificableCredential(
        issuer: Issuer, 
        id: string, 
        subjectDid: string, 
        subjectProperties: VerifiedIdentitySubject
    ): Promise<string> {
        const payload: JwtCredentialPayload = {
            id,
            sub: subjectDid,
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential'],
                credentialSubject: subjectProperties,
            },
            iat: Math.floor(Date.now() / 1000),
        };

        const vcJwt = await createVerifiableCredentialJwt(payload, issuer);

        return vcJwt;
    }

    /**
     * Issues a verifiable presentation
     * The holder signs this presentation with their own private key
     * @param holder The holder (DID + private key)
     * @param credentials The list of credential JWTs to include
     * @param nonce Nonce for the presentation (prevents replay attacks)
     * @param message Optionally, a message to be included in the VP
     * @returns The presentation in JWT form
     */
    public async issueVerificablePresentation(
        holder: Issuer, 
        credentials: string[], 
        nonce: number, 
        message?: string
    ): Promise<string> {
        const payload: JwtPresentationPayload = {
            vp: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiablePresentation'],
                verifiableCredential: credentials,
            },
            iat: Math.floor(Date.now() / 1000),
            message: message,
            nonce: nonce + "",
        };

        const vpJwt = await createVerifiablePresentationJwt(payload, holder);

        return vpJwt;
    }

    /**
     * Gets an issuer object to sign credentials or presentations
     * @param did The DID
     * @param algorithm The algorithm used to sign (Secp256k1 for Ethereum, Ed25519 for other)
     * @param privateKey The private key to sign (as Uint8Array)
     * @returns The issuer object, used to sign
     */
    public getIssuerToSign(did: string, algorithm: "Secp256k1" | "Ed25519", privateKey: Uint8Array): Issuer {
        switch (algorithm) {
            case "Secp256k1":
                return {
                    did,
                    alg: "ES256K-R",
                    signer: ES256KSigner(privateKey)
                };
            case "Ed25519":
                return {
                    did,
                    alg: "Ed25519",
                    signer: EdDSASigner(privateKey)
                };
            default:
                throw new Error("Unsupported signature algorithm: " + algorithm);
        }
    }

    /**
     * Generates a verifiable credential for a VC request and issues it on the blockchain
     * @param vcRequest 
     * @returns verifiable credential JWT
     */
    public async processAcceptance(vcRequest: Identitycredentials): Promise<string> {
        const wallet = await Wallet.findByUser(vcRequest.ownerId);
        if (!wallet) throw new Error("User has no wallet");

        const userDid = await UserDID.findLastByUser(vcRequest.ownerId);
        if (!userDid) throw new Error("User DID not found");

        const requestData = (() => {
            try { return JSON.parse(vcRequest.credentialData || "{}") || {}; }
            catch (ex) { return {}; }
        })();

        const subject = {
            id: userDid.did,
            type: vcRequest.credentialType,
            ...requestData,
        };
        

        const vcJwt = await createUserVerifiablecredential(userDid.did, subject, vcRequest.credentialId);
        

        const didRegistryTxHash = await BlockchainService.getInstance().registerCredentialOnDidRegistry(vcRequest.credentialId, wallet.address);
        Monitor.debug(`[Blockchain] Credencial registrada en EthereumDIDRegistry: ${didRegistryTxHash}`);

        const txResult = await BlockchainService.getInstance().issueCredential(wallet.address, vcRequest.credentialId);
        
        vcRequest.txHash = txResult;

        const now = Math.floor(Date.now() / 1000);
        vcRequest.credentialData = vcJwt;
        vcRequest.issuedDate = now;
        vcRequest.expirationDate = now + Number.parseInt(process.env.DID_CREDENTIAL_DEFAULT_TTL || "31536000", 10);
        await vcRequest.accept();

        const vcId = `vc_${vcRequest.credentialId}_${Date.now()}`;
        await VerifiableCredential.create(vcId, userDid.did, vcRequest.ownerId, vcRequest.credentialId);

        return vcJwt;
    }



    /**
     * Saves the issued credential in the database
     * @param userId User ID (empty string for AI)
     * @param vcJwt VC JWT string
     * @param expiresAt Expiration timestamp (Unix seconds)
     * @returns credentialId from identity_credentials table
     */
    public async saveCredential(
        userId: string, 
        vcJwt: string, 
        expiresAt: number
    ): Promise<string> {
        try {
            const now = Math.floor(Date.now() / 1000);
                
            const credential = new Identitycredentials({
                credentialId: createRandomUID(), 
                ownerId: userId,
                credentialType: "UserIdentity",
                credentialData: vcJwt,
                issuedDate: now,
                expirationDate: expiresAt,
                status: "active"
            });
                
            await credential.insert();
                
            Monitor.debug(`[DID] Saved credential: credentialId=${credential.credentialId}`);
                
            return credential.credentialId;
        } catch (error) {
            Monitor.exception(error);
            throw new Error(`Failed to save credential: ${error.message}`);
        }
    }
    
    /**
     * Register the credential in the revocation system
     * @param did Subject DID
     * @param userId User ID (empty string for AI)
     * @param credentialId ID from identity_credentials
     */
    public async registerCredentialForRevocation(
        did: string, 
        userId: string, 
        credentialId: string
    ): Promise<void> {
        try {
            const vcId = `vc_${credentialId}_${Date.now()}`;
            await VerifiableCredential.create(vcId, did, userId, credentialId);
            Monitor.debug(`[DID] Registered for revocation: ${did}`);
        } catch (error) {
            Monitor.exception(error);
            throw new Error(`Failed to register credential for revocation: ${error.message}`);
        }
    }


    /**
     * Verifies a verifiable credential JWT
     * @param vcJwt VC JWT string
     * @returns Verification result with valid, did, credentialSubject, issuer, issuedAt, expiresAt or error
     */
    public async verifyCredential(vcJwt: string): Promise<DidVerificationResult> {
        try {
            Monitor.debug("[DID] Verifying credential…");

            const result = await verifyCredentials(vcJwt);

            if (!result.verified || !result.verifiableCredential) {
                Monitor.debug("[DID] Verification failed: no payload or not verified");
                return {
                    valid: false,
                    error: "Credential signature verification failed"
                };
            }

            const payload = result.verifiableCredential;

            let credentialSubject: any;
            if (payload.vc?.credentialSubject) {
                credentialSubject = payload.vc.credentialSubject;
            } else if (payload.credentialSubject) {
                credentialSubject = payload.credentialSubject;
            } else {
                Monitor.debug("[DID] Invalid credential structure; keys: " + Object.keys(payload).join(", "));
                return {
                    valid: false,
                    error: "Invalid credential structure"
                };
            }

            const now = Math.floor(Date.now() / 1000);
            let expiresAt: number | undefined;
            if (payload.exp) {
                expiresAt = payload.exp;
            } else if (payload.expirationDate) {
                expiresAt = Math.floor(new Date(payload.expirationDate).getTime() / 1000);
            }

            if (expiresAt !== undefined && expiresAt < now) {
                Monitor.debug("[DID] Credential expired");
                return {
                    valid: false,
                    error: "Credential has expired"
                };
            }

            let issuedAt: number | undefined;
            if (payload.nbf) {
                issuedAt = payload.nbf;
            } else if (payload.issuanceDate) {
                issuedAt = Math.floor(new Date(payload.issuanceDate).getTime() / 1000);
            }

            const did = payload.sub || credentialSubject.id;
            const issuer = payload.iss || payload.issuer;

            const credentialId = this.extractCredentialIdFromVC(payload);

            if (credentialId) {
                const isRevoked = await BlockchainService.getInstance().isCredentialRevoked(credentialId);
                if (isRevoked) {
                    Monitor.debug(`[DID] Credential revoked on-chain: ${credentialId}`);
                    return {
                        valid: false,
                        error: "Credential has been revoked"
                    };
                }
            } else {
                const isRevoked = await VerifiableCredential.isRevoked(did);

                if (isRevoked) {
                    Monitor.debug(`[DID] Credential revoked: ${did}`);
                    return {
                        valid: false,
                        error: "Credential has been revoked"
                    };
                }
            }

            if (expiresAt !== undefined && expiresAt < now) {
                Monitor.debug("[DID] Credential expired");
                return {
                    valid: false,
                    error: "Credential has expired"
                };
            }
        
            if (issuedAt !== undefined && issuedAt > now) {
                Monitor.debug("[DID] Credential not yet valid");
                return {
                    valid: false,
                    error: "Credential is not yet valid"
                };
            }

            Monitor.debug("[DID] Verification OK; did=" + did);

            return {
                valid: true,
                did,
                credentialSubject,
                issuer,
                issuedAt,
                expiresAt
            };
        } catch (error) {
            Monitor.exception(error);
            return {
                valid: false,
                error: error instanceof Error ? error.message : "Verification error"
            };
        }
    }


    /**
     * Reissues a credential with updated subject data
     * @param did Subject DID
     * @param updatedData Partial credential subject to merge
     * @returns New VC JWT
     */
    public async reissueCredential(
        did: string,
        updatedData: Partial<DidCredentialSubject>
    ): Promise<string> {
        const address = did.split(":").pop();
        if (!address) {
            throw new Error("Invalid DID format");
        }
    
        const credentialData: DidCredentialSubject = {
            id: did,
            ethereumAddress: address,
            createdAt: Math.floor(Date.now() / 1000),
            issuedBy: await DIDService.getInstance().getIssuerDid(),
            entityType: "user",
            ...updatedData
        };
    
        return await createUserVerifiablecredential(did, credentialData);
    }
    
    
}

/**
 * Subject of verified identity
 */
export interface VerifiedIdentitySubject {
    // DID
    id?: string;

    // Other properties (flexible schema)
    [x: string]: any;
}

/**
 * Verified identity from a presentation
 */
export interface VerifiedIdentityPresentation {
    /**
     * DID of the holder (who created the presentation)
     */
    did: string;

    /**
     * True if it has at least one valid verifiable credential
     */
    hasCredential: boolean;

    /**
     * Verified properties aggregated from all VCs in the presentation
     */
    credentialSubject: VerifiedIdentitySubject;

    /**
     * Presentation nonce (prevents replay attacks)
     */
    nonce: number;

    /**
     * Presentation timestamp (Unix seconds)
     */
    timestamp: number;

    /**
     * True if the message is encrypted
     */
    encryptedMessage: boolean;
}
