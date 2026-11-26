// TokenRuleConfig - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, TypedRow, enforceType } from "tsbean-orm";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "token_rule_config";
const PRIMARY_KEY = "id";

/* db-index: enabled */
/* db-index: updatedAt */

export class TokenRuleConfig extends DataModel {
    public static readonly finder = new DataFinder<TokenRuleConfig, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<TokenRuleConfig>) => new TokenRuleConfig(data));

    public static async getDefault(): Promise<TokenRuleConfig | null> {
        return TokenRuleConfig.finder.findByKey("default");
    }

    public static async getOrCreateDefault(): Promise<TokenRuleConfig> {
        const existing = await TokenRuleConfig.getDefault();
        if (existing) {
            return existing;
        }
        const now = Date.now();
        const cfg = new TokenRuleConfig({
            id: "default",
            enabled: true,
            emissionRatePct: 5,
            tokenValueEurCents: 100,
            minPurchaseEurCentsToEarn: 1000,
            minPurchaseEurCentsToRedeem: 1000,
            maxRedeemPct: 25,
            expirationMonths: 12,
            stackWithPromotions: false,
            allowedProductKinds: "all",
            createdAt: now,
            updatedAt: now,
        });
        await cfg.insert();
        return cfg;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: BOOLEAN */
    public enabled: boolean;
    /* db-type: INT */
    public emissionRatePct: number;
    /* db-type: INT */
    public tokenValueEurCents: number;
    /* db-type: INT */
    public minPurchaseEurCentsToEarn: number;
    /* db-type: INT */
    public minPurchaseEurCentsToRedeem: number;
    /* db-type: INT */
    public maxRedeemPct: number;
    /* db-type: INT */
    public expirationMonths: number;
    /* db-type: BOOLEAN */
    public stackWithPromotions: boolean;
    /* db-type: VARCHAR */
    public allowedProductKinds: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<TokenRuleConfig>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "default";
        this.enabled = enforceType(data.enabled, "boolean") ?? true;
        this.emissionRatePct = enforceType(data.emissionRatePct, "number") || 0;
        this.tokenValueEurCents = enforceType(data.tokenValueEurCents, "number") || 1;
        this.minPurchaseEurCentsToEarn = enforceType(data.minPurchaseEurCentsToEarn, "number") || 0;
        this.minPurchaseEurCentsToRedeem = enforceType(data.minPurchaseEurCentsToRedeem, "number") || 0;
        this.maxRedeemPct = enforceType(data.maxRedeemPct, "number") || 0;
        this.expirationMonths = enforceType(data.expirationMonths, "number") || 0;
        this.stackWithPromotions = enforceType(data.stackWithPromotions, "boolean") ?? false;
        this.allowedProductKinds = enforceType(data.allowedProductKinds, "string") || "all";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
