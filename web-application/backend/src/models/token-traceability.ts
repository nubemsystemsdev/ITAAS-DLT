// TokenTraceability - tsbean-orm class

"use strict";

import { DataModel, DataSource, DataFinder, DataFilter, OrderBy, SelectOptions, TypedRow, enforceType } from "tsbean-orm";
import { createRandomUID } from "../utils/text-utils";
import { Monitor } from "../monitor";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "token_traceability";
const PRIMARY_KEY = "id";
const AGGREGATE_FALLBACK_LIMIT = 10000;

export interface TokenMonthlyActionRow {
    month: string;
    earned: number;
    redeemed: number;
    reverted: number;
}

export enum TokenTraceabilityStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SENT = "sent",
    FAILED = "failed",
}

export interface TokenStatusCounts {
    pending: number;
    sent: number;
    failed: number;
}

export enum TokenTraceabilityActionKind {
    EARN = "EARN",
    REFUND_REVERT = "REFUND_REVERT",
    REDEEM_HOLD = "REDEEM_HOLD",
    REDEEM_COMMIT = "REDEEM_COMMIT",
    REDEEM_RELEASE = "REDEEM_RELEASE",
}

/* db-index: operationId */
/* db-index: walletId */
/* db-index: actorUid */
/* db-index: status */
/* db-index: createdAt */
/* db-index: paymentId */

export class TokenTraceability extends DataModel {
    public static readonly finder = new DataFinder<TokenTraceability, string>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: TypedRow<TokenTraceability>) => new TokenTraceability(data));

    private static visibleTraceFilter(): DataFilter<TokenTraceability> {
        return DataFilter.notEquals("status", TokenTraceabilityStatus.PROCESSING);
    }

    public static async findById(id: string): Promise<TokenTraceability> {
        return TokenTraceability.finder.findByKey(id);
    }

    public static async findByOperation(operationId: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(DataFilter.equals("operationId", operationId), OrderBy.asc("createdAt"));
    }

    public static async findOpenPlanChangeHolds(subscriptionId: string): Promise<TokenTraceability[]> {
        const traces = await TokenTraceability.finder.find(DataFilter.and(
            DataFilter.into("actionKind", [TokenTraceabilityActionKind.REDEEM_HOLD, TokenTraceabilityActionKind.REDEEM_COMMIT, TokenTraceabilityActionKind.REDEEM_RELEASE]),
            DataFilter.startsWith("operationId", `redeem:subscription:change:${subscriptionId}:`),
        ), OrderBy.asc("createdAt"));
        const closed = new Set(traces.filter(trace => trace.actionKind !== TokenTraceabilityActionKind.REDEEM_HOLD).map(trace => trace.operationId));
        return traces.filter(trace => trace.actionKind === TokenTraceabilityActionKind.REDEEM_HOLD && !closed.has(trace.operationId));
    }

    public static async findAll(): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(DataFilter.any(), OrderBy.desc("createdAt"));
    }

    public static async countAll(): Promise<number> {
        return TokenTraceability.finder.count(TokenTraceability.visibleTraceFilter());
    }

    public static async findAllPaginated(skip: number, limit: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            TokenTraceability.visibleTraceFilter(),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static async findByUid(actorUid: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(DataFilter.equals("actorUid", actorUid), OrderBy.desc("createdAt"));
    }

    public static async countByUid(uid: string): Promise<number> {
        return TokenTraceability.finder.count(
            DataFilter.and(
                TokenTraceability.visibleTraceFilter(),
                DataFilter.equals("actorUid", uid),
            ),
        );
    }

    public static async countByStatusForAdmin(): Promise<TokenStatusCounts> {
        return TokenTraceability.countByStatusGrouped(TokenTraceability.visibleTraceFilter());
    }

    public static async countByStatusForUid(uid: string): Promise<TokenStatusCounts> {
        return TokenTraceability.countByStatusGrouped(
            DataFilter.and(
                TokenTraceability.visibleTraceFilter(),
                DataFilter.equals("actorUid", uid),
            ),
        );
    }

    private static async countByStatusGrouped(base: DataFilter<TokenTraceability>): Promise<TokenStatusCounts> {
        const statuses: TokenTraceabilityStatus[] = [
            TokenTraceabilityStatus.PENDING,
            TokenTraceabilityStatus.SENT,
            TokenTraceabilityStatus.FAILED,
        ];
        const counts = await Promise.all(
            statuses.map((status) =>
                TokenTraceability.finder.count(DataFilter.and(base, DataFilter.equals("status", status))),
            ),
        );
        return {
            pending: counts[0],
            sent: counts[1],
            failed: counts[2],
        };
    }

    public static async findByUidPaginated(uid: string, skip: number, limit: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                TokenTraceability.visibleTraceFilter(),
                DataFilter.equals("actorUid", uid),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static async findPending(limit = 100): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.equals("status", "pending"),
            OrderBy.asc("createdAt"),
        ).then(rows => rows.slice(0, limit));
    }

    public static async findByWallet(walletId: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(DataFilter.equals("walletId", walletId), OrderBy.asc("createdAt"));
    }

    public static async countByWallet(walletId: string): Promise<number> {
        return TokenTraceability.finder.count(
            DataFilter.and(
                TokenTraceability.visibleTraceFilter(),
                DataFilter.equals("walletId", walletId),
            ),
        );
    }

    public static async findByWalletPaged(walletId: string, skip: number, limit: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                TokenTraceability.visibleTraceFilter(),
                DataFilter.equals("walletId", walletId),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static async countByWalletVisible(walletId: string): Promise<number> {
        return TokenTraceability.finder.count(
            DataFilter.and(
                DataFilter.equals("walletId", walletId),
                DataFilter.notEquals("actionKind", TokenTraceabilityActionKind.REDEEM_HOLD),
                DataFilter.notEquals("actionKind", TokenTraceabilityActionKind.REDEEM_RELEASE),
            ),
        );
    }

    public static async findByWalletPagedVisible(walletId: string, skip: number, limit: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("walletId", walletId),
                DataFilter.notEquals("actionKind", TokenTraceabilityActionKind.REDEEM_HOLD),
                DataFilter.notEquals("actionKind", TokenTraceabilityActionKind.REDEEM_RELEASE),
            ),
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setFirstRow(Math.max(0, skip)).setMaxRows(Math.max(1, Math.min(200, limit))),
        );
    }

    public static async findStalePending(cutoff: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("status", "pending"),
                DataFilter.lessThan("createdAt", cutoff)
            ),
            OrderBy.asc("createdAt")
        );
    }

    public static async findByOperationActionStatus(operationId: string, actionKind: string, status: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("operationId", operationId),
                DataFilter.equals("actionKind", actionKind),
                DataFilter.equals("status", status)
            )
        );
    }

    public static async findByOperationAction(operationId: string, actionKind: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("operationId", operationId),
                DataFilter.equals("actionKind", actionKind)
            )
        );
    }

    public static async findPendingEarnTraceByOperation(operationId: string): Promise<TokenTraceability | null> {
        const rows = await TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("status", TokenTraceabilityStatus.PENDING),
                DataFilter.equals("actionKind", TokenTraceabilityActionKind.EARN),
                DataFilter.equals("operationId", operationId),
            ),
            OrderBy.asc("createdAt"),
        );
        return rows[0] || null;
    }

    public static async findEarnTraceByPayment(paymentId: string): Promise<TokenTraceability | null> {
        const rows = await TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("actionKind", TokenTraceabilityActionKind.EARN),
                DataFilter.equals("paymentId", paymentId),
            ),
            OrderBy.desc("createdAt"),
        );
        return rows[0] || null;
    }

    public static async findPendingTokenTraceByPayment(status: string, actionKind: string, paymentId: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("status", status),
                DataFilter.equals("actionKind", actionKind),
                DataFilter.equals("paymentId", paymentId),
            ),
            OrderBy.asc("createdAt"),
        );
    }

    public static async findRefundRevertsByPayment(paymentId: string): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("paymentId", paymentId),
                DataFilter.equals("actionKind", TokenTraceabilityActionKind.REFUND_REVERT),
            ),
            OrderBy.asc("createdAt"),
        );
    }

    public static async findPendingReclaimTrace(amount: number): Promise<TokenTraceability[]> {
        return TokenTraceability.finder.find(
            DataFilter.and(
                DataFilter.equals("status", TokenTraceabilityStatus.PENDING),
                DataFilter.equals("amountTokens", -Math.floor(amount)),
                DataFilter.or(
                    DataFilter.equals("actionKind", TokenTraceabilityActionKind.REFUND_REVERT),
                    DataFilter.equals("actionKind", TokenTraceabilityActionKind.REDEEM_COMMIT),
                ),
            ),
            OrderBy.asc("createdAt"),
        );
    }

    public static async aggregateMonthlyByAction(rangeStart: number, rangeEnd: number): Promise<TokenMonthlyActionRow[]> {
        const monthRanges = TokenTraceability.enumerateMonthRanges(rangeStart, rangeEnd);
        return Promise.all(monthRanges.map(({ month, dateFrom, dateTo }) =>
            TokenTraceability.sumSentActionsInRange(month, dateFrom, dateTo),
        ));
    }

    private static makeSentTraceRangeFilter(dateFrom: number, dateTo: number): DataFilter<TokenTraceability> {
        return DataFilter.and(
            DataFilter.equals("status", TokenTraceabilityStatus.SENT),
            DataFilter.greaterOrEquals("createdAt", Math.floor(dateFrom)),
            DataFilter.lessThan("createdAt", Math.floor(dateTo)),
            DataFilter.into("actionKind", [
                TokenTraceabilityActionKind.EARN,
                TokenTraceabilityActionKind.REDEEM_COMMIT,
                TokenTraceabilityActionKind.REFUND_REVERT,
            ]),
        );
    }

    private static async sumSentActionsInRange(month: string, dateFrom: number, dateTo: number): Promise<TokenMonthlyActionRow> {
        const filter = TokenTraceability.makeSentTraceRangeFilter(dateFrom, dateTo);
        const traces = await TokenTraceability.finder.find(
            filter,
            OrderBy.desc("createdAt"),
            SelectOptions.configure().setMaxRows(AGGREGATE_FALLBACK_LIMIT),
        );

        const row: TokenMonthlyActionRow = { month, earned: 0, redeemed: 0, reverted: 0 };
        for (const trace of traces) {
            const actionKind = trace.actionKind || "";
            if (actionKind === TokenTraceabilityActionKind.EARN) {
                row.earned += trace.amountTokens || 0;
            } else if (actionKind === TokenTraceabilityActionKind.REDEEM_COMMIT) {
                row.redeemed += trace.amountTokens || 0;
            } else if (actionKind === TokenTraceabilityActionKind.REFUND_REVERT) {
                row.reverted += Math.abs(trace.amountTokens || 0);
            }
        }
        return row;
    }

    private static enumerateMonthRanges(
        rangeStart: number,
        rangeEnd: number,
    ): Array<{ month: string; dateFrom: number; dateTo: number }> {
        const months: Array<{ month: string; dateFrom: number; dateTo: number }> = [];
        const cursor = new Date(rangeStart);
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);

        while (cursor.getTime() < rangeEnd) {
            const dateFrom = Math.max(cursor.getTime(), rangeStart);
            const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            const dateTo = Math.min(nextMonth.getTime(), rangeEnd);
            months.push({
                month: TokenTraceability.monthLabelFromTimestamp(dateFrom),
                dateFrom,
                dateTo,
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        return months;
    }

    private static monthLabelFromTimestamp(timestamp: number): string {
        const date = new Date(timestamp || 0);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    }

    public static async create(input: {
        operationId: string;
        actionKind: string;
        walletId: string;
        scopeType: string;
        scopeId: string;
        actorUid: string;
        paymentId: string;
        checkoutSessionId: string;
        amountTokens: number;
        amountEurCents: number;
        payloadHash: string;
        chainName: string;
        txHash: string;
        status: string;
        retries: number;
        errorMessage: string;
        payloadJson: string;
    }): Promise<TokenTraceability> {
        const now = Date.now();
        const trace = new TokenTraceability({
            id: createRandomUID(),
            operationId: input.operationId,
            actionKind: input.actionKind,
            walletId: input.walletId,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
            actorUid: input.actorUid,
            paymentId: input.paymentId,
            checkoutSessionId: input.checkoutSessionId,
            amountTokens: input.amountTokens,
            amountEurCents: input.amountEurCents,
            payloadHash: input.payloadHash,
            chainName: input.chainName,
            txHash: input.txHash,
            status: input.status,
            retries: input.retries,
            errorMessage: input.errorMessage,
            payloadJson: input.payloadJson,
            createdAt: now,
            updatedAt: now,
        });
        await trace.insert();
        return trace;
    }

    /* db-type: VARCHAR */
    public id: string;
    /* db-type: VARCHAR */
    public operationId: string;
    /* db-type: VARCHAR */
    public actionKind: string;
    /* db-type: VARCHAR */
    public walletId: string;
    /* db-type: VARCHAR */
    public scopeType: string;
    /* db-type: VARCHAR */
    public scopeId: string;
    /* db-type: VARCHAR */
    public actorUid: string;
    /* db-type: VARCHAR */
    public paymentId: string;
    /* db-type: VARCHAR */
    public checkoutSessionId: string;
    /* db-type: INT */
    public amountTokens: number;
    /* db-type: INT */
    public amountEurCents: number;
    /* db-type: VARCHAR */
    public payloadHash: string;
    /* db-type: VARCHAR */
    public chainName: string;
    /* db-type: VARCHAR */
    public txHash: string;
    /* db-type: VARCHAR */
    public status: string;
    /* db-type: INT */
    public retries: number;
    /* db-type: VARCHAR */
    public errorMessage: string;
    /* db-type: INT */
    public createdAt: number;
    /* db-type: INT */
    public updatedAt: number;
    /* db-type: VARCHAR */
    public payloadJson: string;

    constructor(data: TypedRow<TokenTraceability>) {
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);
        this.id = enforceType(data.id, "string") || "";
        this.operationId = enforceType(data.operationId, "string") || "";
        this.actionKind = enforceType(data.actionKind, "string") || TokenTraceabilityActionKind.EARN;
        this.walletId = enforceType(data.walletId, "string") || "";
        this.scopeType = enforceType(data.scopeType, "string") || "";
        this.scopeId = enforceType(data.scopeId, "string") || "";
        this.actorUid = enforceType(data.actorUid, "string") || "";
        this.paymentId = enforceType(data.paymentId, "string") || "";
        this.checkoutSessionId = enforceType(data.checkoutSessionId, "string") || "";
        this.amountTokens = enforceType(data.amountTokens, "number") || 0;
        this.amountEurCents = enforceType(data.amountEurCents, "number") || 0;
        this.payloadHash = enforceType(data.payloadHash, "string") || "";
        this.chainName = enforceType(data.chainName, "string") || "";
        this.txHash = enforceType(data.txHash, "string") || "";
        this.status = enforceType(data.status, "string") || TokenTraceabilityStatus.PENDING;
        this.retries = enforceType(data.retries, "number") || 0;
        this.errorMessage = enforceType(data.errorMessage, "string") || "";
        this.createdAt = enforceType(data.createdAt, "number") || Date.now();
        this.updatedAt = enforceType(data.updatedAt, "number") || Date.now();
        this.payloadJson = enforceType(data.payloadJson, "string") || "{}";
        this.init();
    }
}
