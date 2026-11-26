// StripeAccount - tsbean-orm class (auto generated)

"use strict";

import { DataModel, enforceType, TypedRow, DataSource, DataFinder, DataFilter } from "tsbean-orm";
import { Monitor } from "../monitor";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "stripe_account";
const PRIMARY_KEY = "id";

/* db-index: uid */
/* db-index: date */

export class StripeAccount extends DataModel {

    public static readonly finder = new DataFinder<StripeAccount, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<StripeAccount>) => new StripeAccount(data));

    public static async findById(id: string): Promise<StripeAccount> {
        return StripeAccount.finder.findByKey(id);
    }

    public static async findByUser(uid: string): Promise<StripeAccount> {
        const accounts = await StripeAccount.finder.find(DataFilter.equals("uid", uid));
        return accounts.length ? accounts[0] : null;
    }

    /**
     * Creates new stripe account
     * @param id The id
     * @param uid The user id
     * @param email The creator email
     * @returns The new stripe account
     */
    public static async createAccount(id: string, uid: string): Promise<StripeAccount> {
        Monitor.debug("Creating stripe account");
        const account = new StripeAccount({
            id,
            uid,
            date: Date.now(),
        });
        await account.insert();
        return account;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public uid: string;
    /* db-type: BIGINT */
    public date: number;

    constructor(data: TypedRow<StripeAccount>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.uid = enforceType(data.uid, "string") || "";
        this.date = enforceType(data.date, "number") || Date.now();

        this.init();
    }
}