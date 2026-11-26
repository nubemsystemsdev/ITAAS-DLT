// Organization - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, TypedRow, enforceType, OrderBy, SelectOptions } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "organization";
const PRIMARY_KEY = "id";

/* db-index: companyName */
/* db-index: cifNif */
/* db-index: adminUid */
/* db-index: createdAt */

export class Organization extends DataModel {
    public static readonly finder = new DataFinder<Organization, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<Organization>) => new Organization(data));

    public static async findById(id: string): Promise<Organization> {
        return Organization.finder.findByKey(id);
    }

    public static async findByAdminUid(uid: string): Promise<Organization[]> {
        return Organization.finder.find(
            DataFilter.equals("adminUid", uid),
            OrderBy.desc("createdAt"),
            SelectOptions.configure(),
        );
    }

    public static async findByCifNif(cifNif: string): Promise<Organization> {
        const result = await Organization.finder.find(DataFilter.equals("cifNif", cifNif));
        return result[0] || null;
    }

    public static makeFilter(q?: string): DataFilter {
        const filters: DataFilter[] = [];

        if (q) {
            filters.push(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("companyName", q, true),
                DataFilter.startsWith("cifNif", q, true),
            ));
        }

        if (filters.length === 0) {
            return DataFilter.any();
        }

        return DataFilter.and(...filters);
    }

    public static async countFiltered(q?: string): Promise<number> {
        return Organization.finder.count(Organization.makeFilter(q));
    }

    public static async countActive(): Promise<number> {
        return Organization.finder.count(DataFilter.equals("isActive", true));
    }

    public static async findFiltered(skip: number, limit: number, q?: string): Promise<Organization[]> {
        return Organization.finder.find(
            Organization.makeFilter(q),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(skip).setMaxRows(limit),
        );
    }

    public static async create(data: {
        companyName: string;
        cifNif: string;
        country: string;
        fiscalAddress: string;
        email: string;
        adminUid: string;
    }): Promise<Organization> {
        const now = Date.now();
        const org = new Organization({
            id: createRandomUID(),
            companyName: data.companyName,
            cifNif: data.cifNif,
            country: data.country,
            fiscalAddress: data.fiscalAddress,
            email: data.email,
            adminUid: data.adminUid,
            isActive: true,
            createdAt: now,
        });

        await org.insert();
        return org;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public companyName: string;
    /* db-type: VARCHAR */
    public cifNif: string;
    /* db-type: VARCHAR */
    public country: string;
    /* db-type: VARCHAR */
    public fiscalAddress: string;
    /* db-type: VARCHAR */
    public email: string;
    /* db-type: VARCHAR */
    public adminUid: string;
    /* db-type: BOOLEAN */
    public isActive: boolean;
    /* db-type: INT */
    public createdAt: number;

    constructor(data: TypedRow<Organization>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        this.id = enforceType(data.id, "string") || "";
        this.companyName = enforceType(data.companyName, "string") || "";
        this.cifNif = enforceType(data.cifNif, "string") || "";
        this.country = enforceType(data.country, "string") || "";
        this.fiscalAddress = enforceType(data.fiscalAddress, "string") || "";
        this.email = enforceType(data.email, "string") || "";
        this.adminUid = enforceType(data.adminUid, "string") || "";
        this.isActive = enforceType(data.isActive, "boolean") || false;
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();

        this.init();
    }
}
