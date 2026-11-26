"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "identity_credentials";
const PRIMARY_KEY = "credentialId";

export enum VCRequestStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    REVOKED = "REVOKED"
}

export class Identitycredentials extends DataModel {

    public static readonly finder = new DataFinder<Identitycredentials, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Identitycredentials>) => new Identitycredentials(data));
    
    public static async findById(credentialId: string): Promise<Identitycredentials | null> {
        return Identitycredentials.finder.findByKey(credentialId);
    }

    public static async countAll(): Promise<number> {
        return Identitycredentials.finder.count(DataFilter.any());
    }

    public static async countPendingRequests(): Promise<number> {
        return Identitycredentials.finder.count(DataFilter.equals("status", VCRequestStatus.PENDING));
    }

    public static async findAllPaginated(skip: number, limit: number): Promise<Identitycredentials[]> {
        return Identitycredentials.finder.find(DataFilter.any(), OrderBy.desc("credentialId"), SelectOptions.configure().setFirstRow(skip).setMaxRows(limit));
    }
   
    private static generateCredentialId(): string {
        return createRandomUID();
    }

    public async reject(): Promise<void> {
        this.status = VCRequestStatus.REJECTED;
        this.updatedAt = Date.now();
        await this.save();
    }

    public async accept(): Promise<void> {
        this.status = VCRequestStatus.ACTIVE;
        this.updatedAt = Date.now();
        await this.save();
    }

    public static async createRequest(uid: string, address: string, type: string, data: any): Promise<Identitycredentials> {
        const request = new Identitycredentials({
            credentialId: Identitycredentials.generateCredentialId(),
            ownerId: uid,
            credentialType: type,
            address: address,
            credentialData: JSON.stringify(data || {}),
            status: VCRequestStatus.PENDING,
            revocationReason: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            issuedDate: 0,
            expirationDate: Date.now() + 365 * 24 * 60 * 60 * 1000, 
        });
        
        await request.insert();
        return request;
    }

    
    /* db-type: VARCHAR */
    public credentialId: string;
    /* db-type: VARCHAR */
    public ownerId: string;
    /* db-type: VARCHAR */
    public credentialType: string;
    /* db-type: VARCHAR */
    public address: string;
    /* db-type: VARCHAR */
    public credentialData: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: TEXT */
    public revocationReason: string;
    /* db-type: INT */
    public updatedAt: number;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: VARCHAR */
    public txHash: string;
    /* db-type: INT */
    public issuedDate: number;
    /* db-type: INT */
    public expirationDate: number;
    
    constructor(data: TypedRow<Identitycredentials>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.credentialId = enforceType(data.credentialId, "string") || "";
        this.ownerId = enforceType(data.ownerId, "string") || "";
        this.credentialType = enforceType(data.credentialType, "string") || "";
        this.credentialData = enforceType(data.credentialData, "string") || "";
        this.status = enforceType(data.status, "string") || VCRequestStatus.PENDING;
        this.revocationReason = enforceType(data.revocationReason, "string") || "";
        this.updatedAt = enforceType(data.updatedAt, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || 0;
        this.address = enforceType(data.address, "string") || "";
        this.issuedDate = enforceType(data.issuedDate, "number") || 0;
        this.expirationDate = enforceType(data.expirationDate, "number") || 0;
        this.txHash = enforceType(data.txHash, "string") || "";

        this.init();
    }
}
