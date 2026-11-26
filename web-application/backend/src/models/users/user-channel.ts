// User socket channel

import { DataModel, DataSource, DataFinder, enforceType, TypedRow } from "tsbean-orm";
import { createRandomUID } from "../../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "user_channels";
const PRIMARY_KEY = "id";

/**
 * User channel
 */
export class UserChannel extends DataModel {
    public static finder = new DataFinder<UserChannel>(DATA_SOURCE, TABLE, PRIMARY_KEY, function (data: any) {
        return new UserChannel(data);
    });

    public static async findByUser(uid: string): Promise<UserChannel> {
        let channel = await UserChannel.finder.findByKey(uid);

        if (!channel) {
            channel = new UserChannel({
                id: uid,
                channel: "user_channel_" + createRandomUID(),
            });

            try {
                await channel.insert();
            } catch (ex) {}
        }

        return channel;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public channel: string;

    constructor(data: TypedRow<UserChannel>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.channel = enforceType(data.channel, "string") || "";
        
        this.init();
    }
}
