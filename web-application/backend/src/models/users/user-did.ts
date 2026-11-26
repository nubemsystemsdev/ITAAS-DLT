// User DID

import { DataModel, DataSource, DataFinder, enforceType, TypedRow, DataFilter, OrderBy, SelectOptions } from "tsbean-orm";
import { toHexString } from "../../utils/hex";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "user_dids";
const PRIMARY_KEY = "id";

export const UserDIDValidTypes = ["ebsi-legal-entity", "ebsi-natural-person", "person", "indy", "ethr"];

/**
 * User DID
 */
export class UserDID extends DataModel {

    public static finder = new DataFinder<UserDID>(DATA_SOURCE, TABLE, PRIMARY_KEY, function (data: any) {
        return new UserDID(data);
    });

    public static async findLastByUser(uid: string): Promise<UserDID> {
        const result = await UserDID.finder.find(
            DataFilter.equals("uid", uid),
            OrderBy.desc("created"), 
        );

        return result[0] || null;
    }

    public static async countAll(): Promise<number> {
        return UserDID.finder.count(DataFilter.any());
    }

    public static async findAll(skip: number, limit: number): Promise<UserDID[]> {
        return UserDID.finder.find(
            DataFilter.any(),
            OrderBy.desc("created"), 
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async countAllByUser(uid: string): Promise<number> {
        return UserDID.finder.count(
            DataFilter.equals("uid", uid)
        );
    }

    public static async findAllByUser(uid: string, skip: number, limit: number): Promise<UserDID[]> {
        return UserDID.finder.find(
            DataFilter.equals("uid", uid),
            OrderBy.desc("created"), 
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async countByUserAndDID(uid: string, did: string): Promise<number> {
        return UserDID.finder.count(
            DataFilter.and(
                DataFilter.equals("uid", uid),
                DataFilter.equals("did", did),
            )
        );
    }

    public static async findByDid(did: string): Promise<UserDID> {
        const dids = await UserDID.finder.find(
            DataFilter.equals("did", did)
        );
        return dids[0] || null;
    }

    public static async findByUserAndDid(uid: string, did: string): Promise<UserDID> {
        const dids = await UserDID.finder.find(
            DataFilter.and(
                DataFilter.equals("uid", uid),
                DataFilter.equals("did", did),
            )
        );
        return dids[0] || null;
    }

    public id: string;

    public uid: string;

    public did: string;
    public didType: string;

    /** Hash de la transacción que registró el DID en EthereumDIDRegistry (si aplica) */
    public registrationTxHash: string;

    public enabled: boolean;

    public created: number;

    constructor(data: TypedRow<UserDID>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";

        this.uid = enforceType(data.uid, "string") || "";

        this.did = enforceType(data.did, "string") || "";
        this.didType = enforceType(data.didType, "string") || "";

        this.registrationTxHash = toHexString(data.registrationTxHash);

        this.enabled = enforceType(data.enabled, "boolean") || false;

        this.created = enforceType(data.created, "int") || 0;

        this.init();
    }
}
