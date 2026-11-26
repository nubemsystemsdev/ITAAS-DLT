"use strict";

import {
    CustomAgentRequest,
    CustomAgentRequestStatus,
    CustomAgentRequestType,
} from "../models/custom-agent-request";
import { CatalogItem } from "../models/catalog-item";
import { User } from "../models/users/user";
import { Monitor } from "../monitor";
import { isBffProvisioningTransportError } from "../utils/itaas-bff-error";
import { createRandomUID } from "../utils/text-utils";
import { RedisConfig } from "../config/config-redis";
import { CatalogItemService } from "./catalog-item-service";
import { InternalUsersService } from "./internal-users-service";
import { ItaasWorkspaceProvisioningService } from "./itaas-workspace-provisioning-service";
import { NotificationService, NotificationData } from "./notification-service";
import { OrganizationService } from "./organization-service";
import { PaymentService } from "./payment-service";
import { RedisService } from "./redis-service";
import { SubscriptionBillingService } from "./subscription-billing-service";

const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 4000;
const BASE_FLOW_ID_MAX_LENGTH = 255;
const BASE_AGENT_ID_MAX_LENGTH = 64;
const REJECTION_REASON_MAX_LENGTH = 2000;
const MAX_OPEN_CUSTOM_AGENT_REQUESTS = 5;
const DELIVER_LOCK_PREFIX = "itaas:custom-agent-deliver:";
const DELIVER_LOCK_TTL_MS = 180_000;
const DELIVER_LOCK_WAIT_MS = 30_000;
const DELIVER_LOCK_RETRY_MS = 100;

const CUSTOM_AGENT_DELIVERY_KNOWN_ERRORS = new Set([
    "FLOW_IS_GLOBAL",
    "INVALID_FLOW_ID",
    "FLOW_ALREADY_ASSIGNED",
    "DELIVERY_FAILED",
    "BFF_UNAVAILABLE",
    "PAYMENT_METHOD_REQUIRED",
    "FLOW_OP_BUSY",
]);

export type CustomAgentDepositPaymentDecision = "apply" | "already_applied" | "reject";

export type CustomAgentRequestDto = {
    id: string;
    status: string;
    requestType: string;
    description: string;
    baseAgentId: string;
    baseFlowiseFlowId: string;
    requesterUserId: string;
    requesterUsername: string;
    organizationId: string;
    adminRejectionReason: string;
    paymentId: string;
    deliveredFlowiseFlowId: string;
    monthlySubscriptionId: string;
    closedFromStatus: string;
    createdAt: number;
    updatedAt: number;
};

export class ItaasPlatformService {
    private static instance: ItaasPlatformService = null;

    private readonly deliveryChains = new Map<string, Promise<unknown>>();

    public static getInstance(): ItaasPlatformService {
        if (ItaasPlatformService.instance) {
            return ItaasPlatformService.instance;
        }
        ItaasPlatformService.instance = new ItaasPlatformService();
        return ItaasPlatformService.instance;
    }

    /** Exposed for tests to inject a stub. */
    public static setInstance(service: ItaasPlatformService | null): void {
        ItaasPlatformService.instance = service;
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED
     */
    public async assertItaasAccess(userId: string): Promise<{ organizationId: string }> {
        const access = await InternalUsersService.getInstance().resolveItaasAccessForUser(userId);
        if (!access.allowed) {
            throw new Error("ITAAS_ACCESS_REQUIRED");
        }

        return {
            organizationId: access.organizationId || "",
        };
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED | ORG_ADMIN_REQUIRED
     */
    public async assertRequesterAccess(userId: string): Promise<{ organizationId: string }> {
        await this.assertItaasAccess(userId);
        const billing = await OrganizationService.getInstance().resolveBillingOrganizationContext(userId);
        if (!billing) {
            throw new Error("ORG_ADMIN_REQUIRED");
        }

        return {
            organizationId: billing.organizationId || "",
        };
    }

    public async listCustomAgentRequestsForUser(userId: string): Promise<CustomAgentRequestDto[]> {
        const { organizationId } = await this.assertRequesterAccess(userId);
        const rows = organizationId
            ? await CustomAgentRequest.findByOrganizationId(organizationId)
            : await CustomAgentRequest.findByRequesterUserId(userId);
        return await this.toCustomAgentRequestDtos(rows);
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED | ORG_ADMIN_REQUIRED | REQUEST_NOT_FOUND
     */
    public async getCustomAgentRequestForRequester(userId: string, requestId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequesterRequest(userId, requestId);
        return await this.toCustomAgentRequestDto(request);
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED | ORG_ADMIN_REQUIRED | INVALID_REQUEST_TYPE | INVALID_DESCRIPTION | INVALID_BASE_FLOW_ID | INVALID_BASE_AGENT_ID | PENDING_REQUEST_LIMIT_REACHED
     */
    public async createCustomAgentRequest(input: {
        userId: string;
        requestType: string;
        description: string;
        baseAgentId?: string;
        baseFlowiseFlowId?: string;
    }): Promise<CustomAgentRequestDto> {
        const { organizationId } = await this.assertRequesterAccess(input.userId);

        const requestType = ((input.requestType || "") + "").trim();
        if (
            requestType !== CustomAgentRequestType.ADAPTATION
            && requestType !== CustomAgentRequestType.CUSTOM
        ) {
            throw new Error("INVALID_REQUEST_TYPE");
        }

        const description = ((input.description || "") + "").trim();
        if (description.length < DESCRIPTION_MIN_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
            throw new Error("INVALID_DESCRIPTION");
        }

        const baseAgentId = ((input.baseAgentId || "") + "").trim();
        if (baseAgentId.length > BASE_AGENT_ID_MAX_LENGTH) {
            throw new Error("INVALID_BASE_AGENT_ID");
        }

        const baseFlowiseFlowId = ((input.baseFlowiseFlowId || "") + "").trim();
        if (baseFlowiseFlowId.length > BASE_FLOW_ID_MAX_LENGTH) {
            throw new Error("INVALID_BASE_FLOW_ID");
        }

        const openCount = await CustomAgentRequest.countOpenBySubject(input.userId, organizationId);
        if (openCount >= MAX_OPEN_CUSTOM_AGENT_REQUESTS) {
            throw new Error("PENDING_REQUEST_LIMIT_REACHED");
        }

        const created = await CustomAgentRequest.createRequest({
            requestType: requestType as CustomAgentRequestType,
            description,
            requesterUserId: input.userId,
            organizationId,
            baseAgentId,
            baseFlowiseFlowId,
            status: CustomAgentRequestStatus.PENDING_REVIEW,
        });

        await this.notifyPlatformAdmins({
            type: "custom_agent_request_created",
            requestId: created.id,
            info: { message: "A new custom agent request has been received." },
        });

        return await this.toCustomAgentRequestDto(created);
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED | ORG_ADMIN_REQUIRED | REQUEST_NOT_FOUND | INVALID_STATUS
     */
    public async cancelCustomAgentRequest(userId: string, requestId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequesterRequest(userId, requestId);
        await this.invalidateDepositCheckoutBestEffort(request.paymentId);
        await request.cancel();
        return await this.toCustomAgentRequestDto(request);
    }

    public async countCustomAgentRequestsForAdmin(q?: string, status?: string): Promise<number> {
        const requesterUserIds = await this.findRequesterUserIdsForSearch(q);
        return CustomAgentRequest.countFiltered(q, status, requesterUserIds);
    }

    public async listCustomAgentRequestsForAdmin(q?: string, status?: string, skip?: number, limit?: number): Promise<CustomAgentRequestDto[]> {
        const requesterUserIds = await this.findRequesterUserIdsForSearch(q);
        const rows = await CustomAgentRequest.findFiltered(skip || 0, limit || 25, q, status, requesterUserIds);
        return await this.toCustomAgentRequestDtos(rows);
    }

    /**
     * @throws Error REQUEST_NOT_FOUND
     */
    public async getCustomAgentRequestForAdmin(requestId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequest(requestId);
        return await this.toCustomAgentRequestDto(request);
    }

    /**
     * @throws Error REQUEST_NOT_FOUND | INVALID_STATUS | INVALID_REJECTION_REASON
     */
    public async rejectCustomAgentRequest(requestId: string, reason: string): Promise<CustomAgentRequestDto> {
        const trimmed = ((reason || "") + "").trim();
        if (!trimmed || trimmed.length > REJECTION_REASON_MAX_LENGTH) {
            throw new Error("INVALID_REJECTION_REASON");
        }
        const request = await this.requireRequest(requestId);
        await request.reject(trimmed);
        await this.notifyRequester(request, {
            type: "custom_agent_request_rejected",
            requestId: request.id,
            info: { message: "Your custom agent request was rejected.", reason: trimmed },
        });
        return await this.toCustomAgentRequestDto(request);
    }

    /**
     * @throws Error REQUEST_NOT_FOUND | INVALID_STATUS
     */
    public async acceptCustomAgentRequest(requestId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequest(requestId);
        await request.accept();
        const pricing = await this.getCustomAgentPricingEur();
        await this.notifyRequester(request, {
            type: "custom_agent_request_accepted",
            requestId: request.id,
            info: {
                message: "Your custom agent request was accepted. Please pay the deposit to start development.",
                depositPriceEur: pricing.depositPriceEur,
                monthlyPriceEur: pricing.monthlyPriceEur,
            },
        });
        return await this.toCustomAgentRequestDto(request);
    }

    /**
     * Admin cancel is only allowed in `pending_payment`. During `pending_review` the admin must reject.
     * @throws Error REQUEST_NOT_FOUND | INVALID_STATUS
     */
    public async cancelCustomAgentRequestByAdmin(requestId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequest(requestId);
        if (request.status !== CustomAgentRequestStatus.PENDING_PAYMENT) {
            throw new Error("INVALID_STATUS");
        }
        await this.invalidateDepositCheckoutBestEffort(request.paymentId);
        await request.cancel();
        await this.notifyRequester(request, {
            type: "custom_agent_request_cancelled",
            requestId: request.id,
            info: { message: "Your custom agent request was cancelled by the platform." },
        });
        return await this.toCustomAgentRequestDto(request);
    }

    /**
     * @throws Error ITAAS_ACCESS_REQUIRED | ORG_ADMIN_REQUIRED | REQUEST_NOT_FOUND | INVALID_STATUS | DEPOSIT_CHECKOUT_UNAVAILABLE | INSUFFICIENT_TOKEN_BALANCE | TOKENS_EXCEED_LIMIT
     */
    public async checkoutDeposit(userId: string, requestId: string, successUrl?: string, cancelUrl?: string, redeemTokens: number = 0): Promise<{ checkoutUrl: string }> {
        const request = await this.requireRequesterRequest(userId, requestId);
        if (request.status !== CustomAgentRequestStatus.PENDING_PAYMENT) {
            throw new Error("INVALID_STATUS");
        }

        const item = await CatalogItem.getOrCreateCustomAgentService();
        try {
            const result = await PaymentService.getInstance().createCustomAgentDepositCheckout({
                uid: userId,
                requestId: request.id,
                amountCents: item.depositCents,
                successUrl,
                cancelUrl,
                previousPaymentId: request.paymentId || "",
                organizationId: request.organizationId || "",
                redeemTokens,
            });
            request.paymentId = result.paymentId;
            request.updatedAt = Date.now();
            await request.save();
            return { checkoutUrl: result.checkoutUrl };
        } catch (ex) {
            const message = ex instanceof Error ? ex.message : "";
            if (message === "DEPOSIT_CHECKOUT_UNAVAILABLE" || message === "Stripe is not configured") {
                throw new Error("DEPOSIT_CHECKOUT_UNAVAILABLE");
            }
            throw ex;
        }
    }

    /**
     * @throws Error REQUEST_NOT_FOUND
     */
    public async resolveCustomAgentDepositPayment(paymentId: string, requestId?: string): Promise<CustomAgentDepositPaymentDecision> {
        const request = await this.findRequestForDeposit(paymentId, requestId);
        return this.classifyCustomAgentDeposit(request, paymentId);
    }

    /**
     * Webhook hook after a custom-agent deposit payment is confirmed.
     * Accepts only the currently linked paymentId (active checkout) while pending_payment.
     * @returns true when the deposit was newly applied; false when ignored (already paid or stale checkout)
     * @throws Error REQUEST_NOT_FOUND
     */
    public async onDepositPaid(paymentId: string, requestId?: string): Promise<boolean> {
        const request = await this.findRequestForDeposit(paymentId, requestId);
        const decision = this.classifyCustomAgentDeposit(request, paymentId);
        if (decision !== "apply") {
            if (decision === "reject") {
                const activePaymentId = ((request.paymentId || "") + "").trim();
                Monitor.warning(
                    `[ITAAS] Ignoring stale custom-agent deposit ${((paymentId || "") + "").trim()} for request ${request.id} (active=${activePaymentId})`,
                );
            }
            return false;
        }

        await request.markDepositPaid(paymentId);
        await this.notifyRequester(request, {
            type: "custom_agent_request_deposit_paid",
            requestId: request.id,
            info: { message: "A custom agent deposit was paid. Development can start." },
        });
        await this.notifyPlatformAdmins({
            type: "custom_agent_request_deposit_paid",
            requestId: request.id,
            info: { message: "A custom agent deposit was paid. Development can start." },
        });
        return true;
    }

    private async findRequestForDeposit(paymentId: string, requestId?: string): Promise<CustomAgentRequest> {
        let request: CustomAgentRequest | null = null;
        const rid = ((requestId || "") + "").trim();
        if (rid) {
            request = await CustomAgentRequest.findById(rid);
        }
        if (!request) {
            request = await CustomAgentRequest.findByPaymentId(paymentId);
        }
        if (!request) {
            throw new Error("REQUEST_NOT_FOUND");
        }
        return request;
    }

    private classifyCustomAgentDeposit(request: CustomAgentRequest, paymentId: string): CustomAgentDepositPaymentDecision {
        const activePaymentId = ((request.paymentId || "") + "").trim();
        const paidId = ((paymentId || "") + "").trim();
        const isSamePayment = !!activePaymentId && !!paidId && activePaymentId === paidId;

        if (
            request.status === CustomAgentRequestStatus.IN_DEVELOPMENT
            || request.status === CustomAgentRequestStatus.DELIVERED
        ) {
            return isSamePayment ? "already_applied" : "reject";
        }
        if (request.status !== CustomAgentRequestStatus.PENDING_PAYMENT) {
            return "reject";
        }
        if (activePaymentId && paidId && activePaymentId !== paidId) {
            return "reject";
        }
        return "apply";
    }

    /**
     * @throws Error REQUEST_NOT_FOUND | INVALID_STATUS | INVALID_FLOW_ID | FLOW_IS_GLOBAL | FLOW_ALREADY_ASSIGNED | FLOW_ALREADY_DELIVERED | BFF_UNAVAILABLE | DELIVERY_FAILED | PAYMENT_METHOD_REQUIRED | FLOW_OP_BUSY
     */
    public async deliverCustomAgentRequest(requestId: string, flowId: string): Promise<CustomAgentRequestDto> {
        const id = ((flowId || "") + "").trim();
        if (!id || id.length > BASE_FLOW_ID_MAX_LENGTH) {
            throw new Error("INVALID_FLOW_ID");
        }

        const rid = ((requestId || "") + "").trim();
        if (!rid) {
            throw new Error("REQUEST_NOT_FOUND");
        }

        return this.withDeliveryLock(rid, () => this.deliverCustomAgentRequestLocked(rid, id));
    }

    private async deliverCustomAgentRequestLocked(requestId: string, flowId: string): Promise<CustomAgentRequestDto> {
        const request = await this.requireRequest(requestId);
        if (request.status !== CustomAgentRequestStatus.IN_DEVELOPMENT) {
            throw new Error("INVALID_STATUS");
        }

        const persistedFlowId = ((request.deliveredFlowiseFlowId || "") + "").trim();
        if (persistedFlowId && persistedFlowId !== flowId) {
            throw new Error("FLOW_ALREADY_DELIVERED");
        }

        const subject = request.organizationId
            ? { subjectType: "organization" as const, subjectId: request.organizationId }
            : { subjectType: "user" as const, subjectId: request.requesterUserId };

        const alreadyAssigned = persistedFlowId === flowId;
        if (!alreadyAssigned) {
            try {
                const result = await ItaasWorkspaceProvisioningService.getInstance().assignExclusiveCatalogFlowToSubject(subject, flowId);
                if (result.reason === "error" || result.reason === "skipped") {
                    throw new Error("BFF_UNAVAILABLE");
                }
                if (result.reason === "missing_subject" || result.reason === "missing_flow_id") {
                    throw new Error("DELIVERY_FAILED");
                }
            } catch (ex) {
                return this.rethrowKnownDeliveryError(ex);
            }

            request.deliveredFlowiseFlowId = flowId;
            request.updatedAt = Date.now();
            await request.save();
        }

        let monthlySubscriptionId = request.monthlySubscriptionId;
        if (!monthlySubscriptionId) {
            try {
                await CatalogItemService.getInstance().ensureCustomAgentServiceItem();
                const subscription = await SubscriptionBillingService.getInstance().createCustomAgentMonthlySubscription(
                    request.requesterUserId,
                    request.organizationId || undefined,
                    request.id,
                );
                monthlySubscriptionId = subscription.id;
                request.monthlySubscriptionId = monthlySubscriptionId;
                request.updatedAt = Date.now();
                await request.save();
            } catch (ex) {
                await this.revokeExclusiveDeliveryAssignment(request, subject, flowId);
                return this.rethrowKnownDeliveryError(ex);
            }
        }

        await request.markDelivered(flowId, monthlySubscriptionId);
        const pricing = await this.getCustomAgentPricingEur();
        await this.notifyRequester(request, {
            type: "custom_agent_request_delivered",
            requestId: request.id,
            info: {
                message: "Your custom agent flow has been delivered to your workspace.",
                monthlyPriceEur: pricing.monthlyPriceEur,
            },
        });
        return await this.toCustomAgentRequestDto(request);
    }

    private rethrowKnownDeliveryError(ex: unknown): never {
        if (ex instanceof Error && CUSTOM_AGENT_DELIVERY_KNOWN_ERRORS.has(ex.message)) {
            throw ex;
        }
        if (ex instanceof Error && isBffProvisioningTransportError(ex.message)) {
            throw new Error("BFF_UNAVAILABLE");
        }
        Monitor.exception(ex instanceof Error ? ex : new Error(String(ex)));
        throw new Error("DELIVERY_FAILED");
    }

    private async revokeExclusiveDeliveryAssignment(
        request: CustomAgentRequest,
        subject: { subjectType: "organization" | "user"; subjectId: string },
        flowId: string,
    ): Promise<void> {
        let removed = false;
        try {
            const result = await ItaasWorkspaceProvisioningService.getInstance().removeFlowFromSubject(
                subject,
                flowId,
                false,
            );
            removed = result.reason === "flow_removed";
            if (!removed) {
                Monitor.warning(
                    `[ITAAS] Failed to revoke exclusive assignment after billing failure request=${request.id} flow=${flowId}: ${result.reason}`,
                );
            }
        } catch (ex) {
            Monitor.warning(
                `[ITAAS] Failed to revoke exclusive assignment after billing failure request=${request.id} flow=${flowId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }

        if (!removed) {
            return;
        }

        request.deliveredFlowiseFlowId = "";
        request.updatedAt = Date.now();
        await request.save();
    }

    private async withDeliveryLock<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
        if (!RedisConfig.getInstance().enabled) {
            return this.withLocalDeliveryChain(requestId, fn);
        }

        let token: string | null = null;
        try {
            token = await this.acquireDeliveryRedisLock(requestId);
        } catch (ex) {
            if (ex instanceof Error && ex.message === "FLOW_OP_BUSY") {
                throw ex;
            }
            Monitor.warning(
                `[ITAAS] Redis delivery lock unavailable for request=${requestId}: ${ex instanceof Error ? ex.message : ex}`,
            );
            throw new Error("FLOW_OP_BUSY");
        }

        try {
            return await fn();
        } finally {
            await this.releaseDeliveryRedisLock(requestId, token);
        }
    }

    private withLocalDeliveryChain<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.deliveryChains.get(requestId) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(fn);
        const tail = run.then(
            () => undefined,
            () => undefined,
        );
        this.deliveryChains.set(requestId, tail);
        return run.finally(() => {
            if (this.deliveryChains.get(requestId) === tail) {
                this.deliveryChains.delete(requestId);
            }
        });
    }

    private async acquireDeliveryRedisLock(requestId: string): Promise<string> {
        const key = DELIVER_LOCK_PREFIX + requestId;
        const token = createRandomUID();
        const redis = RedisService.getInstance();
        const deadline = Date.now() + DELIVER_LOCK_WAIT_MS;

        while (Date.now() <= deadline) {
            const acquired = await redis.tryAcquireLock(key, token, DELIVER_LOCK_TTL_MS);
            if (acquired) {
                return token;
            }
            await new Promise((resolve) => setTimeout(resolve, DELIVER_LOCK_RETRY_MS));
        }

        throw new Error("FLOW_OP_BUSY");
    }

    private async releaseDeliveryRedisLock(requestId: string, token: string): Promise<void> {
        try {
            await RedisService.getInstance().releaseLock(DELIVER_LOCK_PREFIX + requestId, token);
        } catch (ex) {
            Monitor.warning(
                `[ITAAS] Failed to release Redis delivery lock for request=${requestId}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    private async getCustomAgentPricingEur(): Promise<{ depositPriceEur: number; monthlyPriceEur: number }> {
        const item = await CatalogItem.getOrCreateCustomAgentService();
        const catalogService = CatalogItemService.getInstance();
        return {
            depositPriceEur: catalogService.centsToEur(item.depositCents),
            monthlyPriceEur: catalogService.centsToEur(item.price),
        };
    }

    private async findRequesterUserIdsForSearch(q?: string): Promise<string[] | undefined> {
        const query = ((q || "") + "").trim();
        if (!query) {
            return undefined;
        }
        const users = await User.findFiltered(0, 25, query);
        const ids = users.map(user => user.id).filter(Boolean);
        return ids.length > 0 ? ids : undefined;
    }

    private async invalidateDepositCheckoutBestEffort(paymentId: string): Promise<void> {
        const id = ((paymentId || "") + "").trim();
        if (!id) {
            return;
        }
        try {
            await PaymentService.getInstance().invalidateCustomAgentDepositByPaymentId(id);
        } catch (ex) {
            Monitor.warning(
                `[ITAAS] Failed to expire custom-agent deposit checkout ${id}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    private async requireRequest(requestId: string): Promise<CustomAgentRequest> {
        const id = ((requestId || "") + "").trim();
        if (!id) {
            throw new Error("REQUEST_NOT_FOUND");
        }
        const request = await CustomAgentRequest.findById(id);
        if (!request) {
            throw new Error("REQUEST_NOT_FOUND");
        }
        return request;
    }

    private async requireRequesterRequest(userId: string, requestId: string): Promise<CustomAgentRequest> {
        const { organizationId } = await this.assertRequesterAccess(userId);
        const request = await this.requireRequest(requestId);
        if (organizationId) {
            if (request.organizationId !== organizationId) {
                throw new Error("REQUEST_NOT_FOUND");
            }
        } else if (request.requesterUserId !== userId) {
            throw new Error("REQUEST_NOT_FOUND");
        }
        return request;
    }

    private async notifyRequester(request: CustomAgentRequest, data: NotificationData): Promise<void> {
        try {
            const user = await User.findUserByUID(request.requesterUserId);
            if (!user) {
                return;
            }
            await NotificationService.getInstance().sendNotification(user, data);
        } catch (ex) {
            Monitor.warning(`[ITAAS] Failed to notify requester ${request.requesterUserId} for ${data.type}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    private async notifyPlatformAdmins(data: NotificationData): Promise<void> {
        try {
            const admins = await User.findPlatformAdmins();
            await Promise.all(admins.map(adminUser => NotificationService.getInstance().sendNotification(adminUser, data)));
        } catch (ex) {
            Monitor.warning(`[ITAAS] Failed to notify platform admins for ${data.type}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    private async toCustomAgentRequestDtos(rows: CustomAgentRequest[]): Promise<CustomAgentRequestDto[]> {
        const users = await User.findByIds(rows.map(row => row.requesterUserId));
        const usernameById = new Map(users.map(user => [user.id, user.username || ""]));
        return rows.map(row => this.mapCustomAgentRequestDto(row, usernameById.get(row.requesterUserId) || ""));
    }

    private async toCustomAgentRequestDto(row: CustomAgentRequest): Promise<CustomAgentRequestDto> {
        const user = row.requesterUserId ? await User.findUserByUID(row.requesterUserId) : null;
        return this.mapCustomAgentRequestDto(row, (user && user.username) || "");
    }

    private mapCustomAgentRequestDto(row: CustomAgentRequest, requesterUsername: string): CustomAgentRequestDto {
        return {
            id: row.id,
            status: row.status,
            requestType: row.requestType,
            description: row.description,
            baseAgentId: row.baseAgentId,
            baseFlowiseFlowId: row.baseFlowiseFlowId,
            requesterUserId: row.requesterUserId,
            requesterUsername,
            organizationId: row.organizationId,
            adminRejectionReason: row.adminRejectionReason,
            paymentId: row.paymentId,
            deliveredFlowiseFlowId: row.deliveredFlowiseFlowId,
            monthlySubscriptionId: row.monthlySubscriptionId,
            closedFromStatus: row.closedFromStatus,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
