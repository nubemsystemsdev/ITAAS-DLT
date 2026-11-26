// TokenWallet - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions, TypedRow, enforceType } from "tsbean-orm";
import { MongoDriver } from "tsbean-driver-mongo";
import { Monitor } from "../monitor";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "token_wallet";
const PRIMARY_KEY = "id";
const AGGREGATE_FALLBACK_LIMIT = 10000;

export interface TokenWalletCirculationTotals {
    availableTokens: number;
    lockedTokens: number;
    truncated: boolean;
}

export enum TokenWalletScopeType {
    USER = "user",
    ORGANIZATION = "organization",
}

/* db-index: scopeType */
/* db-index: scopeId */
/* db-index: updatedAt */

export class TokenWallet extends DataModel {
    public static readonly finder = new DataFinder<TokenWallet, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<TokenWallet>) => new TokenWallet(data));

    public static makeId(scopeType: TokenWalletScopeType, scopeId: string): string {
        return `${scopeType}:${scopeId}`;
    }

    public static async findByScope(scopeType: TokenWalletScopeType, scopeId: string): Promise<TokenWallet | null> {
        return TokenWallet.finder.findByKey(TokenWallet.makeId(scopeType, scopeId));
    }

    public static async getOrCreate(scopeType: TokenWalletScopeType, scopeId: string): Promise<TokenWallet> {
        const id = TokenWallet.makeId(scopeType, scopeId);
        const dataSource = DataSource.get(DataSource.DEFAULT);
        if (!(dataSource.driver instanceof MongoDriver)) {
            const existing = await TokenWallet.finder.findByKey(id);
            if (existing) {
                return existing;
            }
            const now = Date.now();
            const wallet = new TokenWallet({ id, scopeType, scopeId, availableTokens: 0, lockedTokens: 0, version: 0, createdAt: now, updatedAt: now });
            await wallet.insert();
            return wallet;
        }
        const now = Date.now();
        const client = dataSource.driver.mongoClient;
        const result = await client.db().collection(TABLE).findOneAndUpdate(
            { id },
            {
                $setOnInsert: { scopeType, scopeId, availableTokens: 0, lockedTokens: 0, version: 0, createdAt: now },
                $set: { updatedAt: now },
            },
            { upsert: true, returnDocument: "after" },
        );
        return new TokenWallet(result as any);
    }

    public static async findByUser(userId: string): Promise<TokenWallet | null> {
        const list = await TokenWallet.finder.find(DataFilter.and(
            DataFilter.equals("scopeType", "user"),
            DataFilter.equals("scopeId", userId),
        ));
        return list[0] || null;
    }

    public static async sumCirculation(): Promise<TokenWalletCirculationTotals> {
        const totalCount = await TokenWallet.finder.count(DataFilter.any());
        const wallets = await TokenWallet.finder.find(
            DataFilter.any(),
            OrderBy.nothing(),
            SelectOptions.configure().setMaxRows(AGGREGATE_FALLBACK_LIMIT),
        );
        const truncated = totalCount > wallets.length;
        return {
            availableTokens: wallets.reduce((sum, w) => sum + (w.availableTokens || 0), 0),
            lockedTokens: wallets.reduce((sum, w) => sum + (w.lockedTokens || 0), 0),
            truncated,
        };
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public scopeType: string;
    /* db-type: VARCHAR */
    public scopeId: string;
    /* db-type: INT */
    public availableTokens: number;
    /* db-type: INT */
    public lockedTokens: number;
    /* db-type: INT */
    public version: number;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<TokenWallet>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.scopeType = enforceType(data.scopeType, "string") || TokenWalletScopeType.USER;
        this.scopeId = enforceType(data.scopeId, "string") || "";
        this.availableTokens = enforceType(data.availableTokens, "number") || 0;
        this.lockedTokens = enforceType(data.lockedTokens, "number") || 0;
        this.version = enforceType(data.version, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
