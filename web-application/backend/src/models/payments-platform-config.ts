// PaymentsPlatformConfig - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, TypedRow, enforceType } from "tsbean-orm";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "payments_platform_config";
const PRIMARY_KEY = "id";

/* db-index: updatedAt */

export class PaymentsPlatformConfig extends DataModel {
    public static readonly finder = new DataFinder<PaymentsPlatformConfig, string>(
        DATA_SOURCE,
        TABLE,
        PRIMARY_KEY,
        (data: TypedRow<PaymentsPlatformConfig>) => new PaymentsPlatformConfig(data),
    );

    public static async getDefault(): Promise<PaymentsPlatformConfig | null> {
        return PaymentsPlatformConfig.finder.findByKey("payments_config");
    }

    public static async getOrCreateDefault(defaultGracePeriodDays: number): Promise<PaymentsPlatformConfig> {
        const existing = await PaymentsPlatformConfig.getDefault();
        if (existing) {
            return existing;
        }
        const now = Date.now();
        const cfg = new PaymentsPlatformConfig({
            id: "payments_config",
            subscriptionGracePeriodDays: defaultGracePeriodDays,
            createdAt: now,
            updatedAt: now,
        });
        await cfg.insert();
        return cfg;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: INT */
    public subscriptionGracePeriodDays: number;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;

    constructor(data: TypedRow<PaymentsPlatformConfig>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "payments_config";
        this.subscriptionGracePeriodDays = enforceType(data.subscriptionGracePeriodDays, "number") || 0;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();

        this.init();
    }
}
