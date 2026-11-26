// PaymentEvent - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "payment_event";
const PRIMARY_KEY = "id";

/* db-index: paymentId */
/* db-index: providerEventId */
/* db-index: kind */
/* db-index: createdAt */

export class PaymentEvent extends DataModel {
    public static readonly finder = new DataFinder<PaymentEvent, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<PaymentEvent>) => new PaymentEvent(data));

    public static async findById(id: string): Promise<PaymentEvent> {
        return PaymentEvent.finder.findByKey(id);
    }

    public static async findByProviderEventId(providerEventId: string): Promise<PaymentEvent> {
        const res = await PaymentEvent.finder.find(DataFilter.equals("providerEventId", providerEventId));
        return res[0] || null;
    }

    public static async create(paymentId: string, providerEventId: string, kind: string): Promise<PaymentEvent> {
        const paymentEvent = new PaymentEvent({
            id: createRandomUID(),
            paymentId,
            providerEventId,
            kind,
            createdAt: Date.now(),
        });
        await paymentEvent.insert();
        return paymentEvent;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public paymentId: string;
    /* db-type: VARCHAR */
    public providerEventId: string;
    /* db-type: VARCHAR */
    public kind: string;
    /* db-type: INT */
    public createdAt: number;

    constructor(data: TypedRow<PaymentEvent>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.paymentId = enforceType(data.paymentId, "string") || "";
        this.providerEventId = enforceType(data.providerEventId, "string") || "";
        this.kind = enforceType(data.kind, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();

        this.init();
    }
}
