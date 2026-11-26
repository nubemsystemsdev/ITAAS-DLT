// Notifications - tsbean-orm class (auto generated)
"use strict";

import { DataModel, enforceType, TypedRow, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions } from "tsbean-orm";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "notifications";
const PRIMARY_KEY = "id";

/* db-index: uid */
/* db-index: date */
/* db-index: read */

export class Notifications extends DataModel {

    public static readonly finder = new DataFinder<Notifications, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Notifications>) => new Notifications(data));

    public static async countByUser(uid: string): Promise<number> {
        return Notifications.finder.count(DataFilter.equals("uid", uid));
    }

    public static async countByUserUnread(uid: string): Promise<number> {
        return Notifications.finder.count(DataFilter.and(
            DataFilter.equals("uid", uid), 
            DataFilter.equals("read", false)
        ));
    }

    public static async findByUser(uid: string, oldest: number, limit: number): Promise<Notifications[]> {
        return Notifications.finder.find(DataFilter.and(DataFilter.equals("uid", uid), DataFilter.lessThan("date", oldest)), OrderBy.desc("date"), SelectOptions.configure().setMaxRows(limit));
    }

    public static async removeAllByUser(uid: string): Promise<number> {
        return Notifications.finder.delete(DataFilter.equals("uid", uid));
    }

    public static async removeAllByUserExcept(uid: string, excludeIds: string[]): Promise<number> {
        return Notifications.finder.delete(
            DataFilter.and(
                DataFilter.equals("uid", uid),
                DataFilter.not(DataFilter.into("id", excludeIds)),
            ),
        );
    }

    public static async findAllNotificationUser(uid: string): Promise<Notifications[]> {
        return Notifications.finder.find(DataFilter.equals("uid", uid));
    }

    public static async findAllPaginatedNotificationUser(uid: string, limit: number): Promise<Notifications[]> {
        return Notifications.finder.find(
            DataFilter.equals("uid", uid), 
            OrderBy.desc("date"),  
            SelectOptions.configure().setMaxRows(limit)
        );
    }

    public static async findAllPaginatedNotificationUserWithOffset(uid: string, offset: number, limit: number): Promise<Notifications[]> {
        return Notifications.finder.find(
            DataFilter.equals("uid", uid), 
            OrderBy.desc("date"),  
            SelectOptions.configure().setFirstRow(offset).setMaxRows(limit)
        );
    }

    public static async markAsRead(id: string): Promise<number> {
        return Notifications.finder.update(
            { read: true },
            DataFilter.equals("id", id)
        );
    }

    public static async markAllAsReadByUser(uid: string): Promise<number> {
        return Notifications.finder.update(
            { read: true },
            DataFilter.equals("uid", uid)
        );
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public uid: string;
    /* db-type: BIGINT */
    public date: number;
    /* db-type: TEXT */
    public notificationContent: string;
    /* db-type: BOOLEAN */
    public read: boolean;

    constructor(data: TypedRow<Notifications>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.uid = enforceType(data.uid, "string") || "";
        this.date = enforceType(data.date, "number") || 0;
        this.notificationContent = enforceType(data.notificationContent, "string") || "";
        this.read = enforceType(data.read, "boolean") || false;

        this.init();
    }
}
