// Verifiable Credential - tsbean-orm class
// Purpose: Track revocation status of credentials for fast verification

"use strict";

import { DataModel, enforceType, TypedRow, DataSource, DataFinder, DataFilter } from "tsbean-orm";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "verifiable_credentials";
const PRIMARY_KEY = "vcId";

/* db-index: ownerId */
/* db-index: credentialId */
/* db-index: isRevoked */

export class VerifiableCredential extends DataModel {

    public static readonly finder = new DataFinder<VerifiableCredential, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<VerifiableCredential>) => new VerifiableCredential(data));

    /**
     * Check if a credential is revoked by its unique VC ID
     * @param vcId The unique VC ID
     * @returns True if revoked
     */
    public static async isRevoked(vcId: string): Promise<boolean> {
        const vc = await VerifiableCredential.finder.findByKey(vcId);
        return vc ? vc.isRevoked : false;
    }

    /**
     * Revoke a credential by its unique VC ID
     * @param vcId The unique VC ID
     */
    public static async revoke(vcId: string): Promise<void> {
        const vc = await VerifiableCredential.finder.findByKey(vcId);
        if (vc) {
            vc.isRevoked = true;
            vc.revokedAt = Date.now();
            await vc.save();
        }
    }

    /**
     * Create a new verifiable credential entry
     * Called when issuing a new VC to register it for revocation tracking
     * @param vcId Unique VC ID
     * @param did The credential subject ID (DID)
     * @param ownerId The user ID who owns this credential
     * @param credentialId The ID from identity_credentials table
     */
    public static async create(
        vcId: string,
        did: string, 
        ownerId: string, 
        credentialId: string
    ): Promise<VerifiableCredential> {
        const vc = new VerifiableCredential({
            vcId: vcId,
            did: did,
            ownerId: ownerId,
            credentialId: credentialId,
            isRevoked: false,
            revokedAt: 0
        });
        await vc.insert();
        return vc;
    }

    /**
     * Find all revoked credentials by owner
     * @param ownerId User ID
     */
    public static async findRevokedByOwner(ownerId: string): Promise<VerifiableCredential[]> {
        return VerifiableCredential.finder.find(
            DataFilter.and(
                DataFilter.equals("ownerId", ownerId),
                DataFilter.equals("isRevoked", true)
            )
        );
    }

    /**
     * Find all credentials by owner
     * @param ownerId User ID
     */
    public static async findByOwner(ownerId: string): Promise<VerifiableCredential[]> {
        return VerifiableCredential.finder.find(
            DataFilter.equals("ownerId", ownerId)
        );
    }

    /**
     * Find credential by identity_credentials ID
     * @param credentialId The ID from identity_credentials table
     */
    public static async findByCredentialId(credentialId: string | number): Promise<VerifiableCredential | null> {
        const vcs = await VerifiableCredential.finder.find(
            DataFilter.equals("credentialId", credentialId.toString())
        );
        return vcs[0] || null;
    }

    /* db-type: VARCHAR */
    public vcId: string;                // Unique VC ID
    /* db-type: VARCHAR */
    public did: string;                 // credentialSubject.id (DID)
    /* db-type: VARCHAR */
    public ownerId: string;             // User ID
    /* db-type: VARCHAR */
    public credentialId: string;        // FK to identity_credentials
    /* db-type: BOOLEAN */
    public isRevoked: boolean;          // Revocation flag
    /* db-type: INT */
    public revokedAt: number;           // Timestamp (Unix milliseconds)

    constructor(data: TypedRow<VerifiableCredential>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.vcId = enforceType(data.vcId, "string") || "";
        this.did = enforceType(data.did, "string") || "";
        this.ownerId = enforceType(data.ownerId, "string") || "";
        this.credentialId = enforceType(data.credentialId, "string") || "";
        this.isRevoked = enforceType(data.isRevoked, "boolean") || false;
        this.revokedAt = enforceType(data.revokedAt, "number") || 0;

        this.init();
    }
}
