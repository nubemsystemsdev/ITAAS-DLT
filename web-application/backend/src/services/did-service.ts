// DID service

"use strict";

import Crypto from "node:crypto";
import { privateKeyToAddress, sendTransaction, SignKey } from "@cyberchain/smart-contract-wrapper";
import { Wallet } from "../models/wallet";
import { BlockchainConfig } from "../config/config-blockchain";
import { BlockchainService } from "./blockchain-service";
import { Monitor } from "../monitor";
import { encrypt as aesEncrypt } from "../utils/aes";
import { createUserVerifiablecredential, verifyCredentials, resolveEthrDID } from "../utils/did-jwt-vc";
import { UserDID } from "../models/users/user-did";
import { Identitycredentials } from "../models/identity-credentials";
import { VerifiableCredential } from "../models/verifiable-credential";
import { createRandomUID } from "../utils/text-utils";
import { sha256 } from "../utils/hash";
import { toHexString } from "../utils/hex";
import { VerificableCredentialsService } from "./vc-service";

/**
 * Credential subject for DID verifiable credentials
 */
export interface DidCredentialSubject {
    id: string;
    username?: string;
    entityType: "user" | "ai";
    ethereumAddress: string;
    email?: string;
    emailVerified?: boolean;
    createdAt: number;
    issuedBy: string;
}

/**
 * Result of a DID registration (user or AI)
 */
export interface DidRegistrationResult {
    did: string;
    ethereumAddress: string;
}

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

const DEFAULT_TTL = 31536000;

/**
 * DID service – high-level wrapper over did-jwt-vc utilities
 */
export class DIDService {
    /* Singleton */

    public static instance: DIDService = null;

    public static getInstance(): DIDService {
        if (DIDService.instance) {
            return DIDService.instance;
        } else {
            DIDService.instance = new DIDService();
            return DIDService.instance;
        }
    }

    /**
     * Devuelve el wrapper del contrato EthereumDIDRegistry
     */
    private getDidRegistryContract() {
        return BlockchainConfig.getInstance().contracts.ethereumDidRegistry;
    }

    /**
     * Registra el DID en blockchain llamando a setAttribute en EthereumDIDRegistry.
     * Debe ser invocado con la clave privada del identity (owner).
     * @param identityAddress Dirección Ethereum del identity (owner)
     * @param privateKey Clave privada del identity para firmar la transacción
     * @returns Hash de la transacción
     */
    private async registerDidOnBlockchain(identityAddress: string, signKey: SignKey, complementaryAddress?: string): Promise<string> {
        const contract = this.getDidRegistryContract();
        const attrName = "0x" + sha256("did/registered");
        const attrValue = "0x01";
        const validity = Number.parseInt(process.env.DID_CREDENTIAL_DEFAULT_TTL || String(DEFAULT_TTL), 10);

        const result = await contract.setAttribute(
            identityAddress,
            attrName,
            attrValue,
            validity,
            {
                signKey,
                complementaryAddress: complementaryAddress || null,
                logFunction: (msg: string) => Monitor.debug(msg),
            }
        );
        const txHashRaw = (result.receipt as any).transactionHash ?? (result.receipt as any).hash ?? "";
        const txHash = toHexString(txHashRaw);
        Monitor.debug(`[DID] Registered on blockchain: ${identityAddress} txHash=${txHash}`);
        return txHash;
    }

    /**
     * Actualiza el hash de la transacción de registro en blockchain del DID
     */
    private async saveUserDidRegistrationTxHash(userId: string, did: string, txHash: string): Promise<void> {
        const userDid = await UserDID.findByUserAndDid(userId, did);
        if (userDid && txHash) {
            userDid.registrationTxHash = txHash;
            await userDid.save();
            Monitor.debug(`[DID] Saved registration tx hash for ${did}`);
        }
    }

    /**
     * Guarda el DID del usuario en BD
     * @param userId User ID
     * @param did DID string
     * @param didType Tipo de DID (default: "ethr")
     */
    private async saveUserDid(userId: string, did: string, didType: string = "ethr"): Promise<void> {
        try {
            // Verificar si ya existe
            const existing = await UserDID.countByUserAndDID(userId, did);
            
            if (existing === 0) {
                const userDid = new UserDID({
                    id: createRandomUID(),
                    uid: userId,
                    did: did,
                    didType: didType,
                    enabled: true,
                    created: Date.now()
                });
                
                await userDid.insert();
                Monitor.debug(`[DID] Saved user DID: ${did}`);
            } else {
                Monitor.debug(`[DID] User DID already exists: ${did}`);
            }
        } catch (error) {
            Monitor.exception(error);
            throw new Error(`Failed to save user DID: ${error.message}`);
        }
    }

    

    /**
     * Creates a DID for an existing user using their wallet
     * @param userId User ID
     * @param username Username
     * @param email Optional email
     * @param emailVerified Optional email verified flag
     * @param walletPassword Optional wallet password; if provided, registers the DID on blockchain (EthereumDIDRegistry)
     * @returns Registration result with did, address
     */
    public async createDIDForUser(
        userId: string,
        username: string,
        email?: string,
        emailVerified?: boolean,
        walletPassword?: string
    ): Promise<DidRegistrationResult> {
        const wallet = await Wallet.findByUser(userId);


        const did = `did:ethr:${BlockchainConfig.getInstance().networkId}:${wallet.address}`;

        await this.saveUserDid(userId, did, "ethr");

        if (walletPassword) {
            if (!wallet.checkPassword(walletPassword)) {
                throw new Error("Invalid wallet password");
            }
            try {
                const unlocked = wallet.unlock(walletPassword);
                const txHash = await this.registerDidOnBlockchain(wallet.address, unlocked.signKey, unlocked.complementaryAddress);
                await this.saveUserDidRegistrationTxHash(userId, did, txHash);
            } catch (err) {
                Monitor.exception(err);
                throw new Error(`DID saved in DB but blockchain registration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        }

        return {
            did,
            ethereumAddress: wallet.address
        };
    }

    /**
     * Creates a DID and wallet for a new AI entity
     * @param name AI name
     * @param walletPassword Password to encrypt the wallet
     * @returns Registration result plus privateKey (hex)
     */
    public async createDIDForAI(
        name: string,
        walletPassword: string
    ): Promise<DidRegistrationResult> {

        const wallet = await Wallet.createRandom("", walletPassword);
        await sendTransaction(
            wallet.address, 
            Buffer.from("/0x0000000000000000000000000000000000000001:0x1", "utf-8"), 
            0, 
            BlockchainService.getInstance().getTransactionSendingOptionsAdmin()
        );
        const did = `did:ethr:${BlockchainConfig.getInstance().networkId}:${wallet.address}`;

        await this.saveUserDid("", did, "ethr");

        let txHash = "";
        try {
            const aiSignKey = wallet.unlock(walletPassword);
            txHash = await this.registerDidOnBlockchain(wallet.address, aiSignKey.signKey, aiSignKey.complementaryAddress);
            await this.saveUserDidRegistrationTxHash("", did, txHash);
        } catch (err) {
            Monitor.exception(err);
            throw new Error(`DID saved in DB but blockchain registration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        // Authorize the AI wallet address in the NubemToken contract (whitelist)
        await BlockchainService.getInstance().authorizeWalletAddress(wallet.address);

        const credentialData: DidCredentialSubject = {
            id: did,
            username: name,
            entityType: "ai",
            ethereumAddress: wallet.address,
            createdAt: Math.floor(Date.now() / 1000),
            issuedBy: await this.getIssuerDid()
        };

        const vcJwt = await createUserVerifiablecredential(did, credentialData);

        const ttl = Number.parseInt(process.env.DID_CREDENTIAL_DEFAULT_TTL || String(DEFAULT_TTL), 10);
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;

        const credentialId = await VerificableCredentialsService.getInstance().saveCredential("", vcJwt, expiresAt);
        await VerificableCredentialsService.getInstance().registerCredentialForRevocation(did, "", credentialId);

        return {
            did,
            ethereumAddress: wallet.address,
        };
    }

    

    /**
     * Resolves an ethr DID document
     * @param did DID string
     * @returns Resolved DID document
     */
    public async resolveDID(did: string) {
        return await resolveEthrDID(did);
    }

    
    /**
     * Returns the issuer DID (admin wallet or BLOCKCHAIN_PK_ADMIN)
     */
    public async getIssuerDid(): Promise<string> {
        let address: string;

        if (process.env.ADMIN_WALLET) {
            const wallet = await Wallet.findByAddress(process.env.ADMIN_WALLET);
            address = wallet ? wallet.address : process.env.ADMIN_WALLET;
        } else {
            const pk = BlockchainConfig.getInstance().privateKeys.admin;
            address = privateKeyToAddress(pk);
        }

        return `did:ethr:${BlockchainConfig.getInstance().networkId}:${address}`;
    }
}
