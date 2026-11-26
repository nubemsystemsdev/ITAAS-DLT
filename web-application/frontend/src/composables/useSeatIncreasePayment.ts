import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import type { UpdateSeatsResponse } from "@/api/definitions";
import { getUniqueStringId } from "@/utils/unique-id";

export type SeatIncreaseOutcome = "success" | "scheduled" | "failed" | "timeout";

export interface SeatIncreaseRequest {
    orgId: string;
    licensePoolId: string;
    subscriptionId: string;
    baselineQuantity: number;
    targetQuantity: number;
    pollIntervalMs?: number;
    timeoutMs?: number;
}

export interface SeatIncreaseResult {
    outcome: SeatIncreaseOutcome;
    status: UpdateSeatsResponse | null;
    targetQuantity: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 90000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function normalizeQuantity(value: unknown, fallback = 0): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }
    return Math.max(0, Math.floor(numeric));
}

function resolveTargetQuantity(response: UpdateSeatsResponse, requestedTarget: number): number {
    const pendingQuantity = normalizeQuantity(response.pending_quantity, 0);
    if (pendingQuantity > 0) {
        return pendingQuantity;
    }

    return Math.max(normalizeQuantity(response.quantity, requestedTarget), requestedTarget);
}

function isRequestCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === "REQUEST_CANCELLED";
}

export function useSeatIncreasePayment() {
    const requestId = `seat-increase-payment-${getUniqueStringId()}`;
    let cancelled = false;

    const runRequest = function <T>(requestKey: string, requestParams: any): Promise<T> {
        return new Promise((resolve, reject) => {
            Request.Pending(requestKey, requestParams)
                .onSuccess((response) => resolve(response as T))
                .onCancel(() => reject(new Error("REQUEST_CANCELLED")))
                .onRequestError((err) => reject(err))
                .onUnexpectedError((err) => reject(err));
        });
    };

    const getSeatStatus = async function (orgId: string, licensePoolId: string): Promise<UpdateSeatsResponse> {
        return runRequest<UpdateSeatsResponse>(
            `${requestId}-status-${Date.now()}`,
            ApiOrganizations.GetOrganizationSeatStatus(orgId, licensePoolId),
        );
    };

    const pollUntilSettled = async function (params: SeatIncreaseRequest): Promise<SeatIncreaseResult> {
        const startedAt = Date.now();
        const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;
        const pollIntervalMs = params.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;

        while (!cancelled && Date.now() - startedAt < timeoutMs) {
            const status = await getSeatStatus(params.orgId, params.licensePoolId);
            const pendingQuantity = normalizeQuantity(status.pending_quantity, 0);
            const quantity = normalizeQuantity(status.quantity, 0);

            if (pendingQuantity === 0) {
                if (quantity >= params.targetQuantity) {
                    return {
                        outcome: "success",
                        status,
                        targetQuantity: params.targetQuantity,
                    };
                }

                if (quantity === params.baselineQuantity) {
                    return {
                        outcome: "failed",
                        status,
                        targetQuantity: params.targetQuantity,
                    };
                }
            }

            await sleep(pollIntervalMs);
        }

        return {
            outcome: "timeout",
            status: null,
            targetQuantity: params.targetQuantity,
        };
    };

    const requestChange = async function (params: SeatIncreaseRequest): Promise<SeatIncreaseResult> {
        cancelled = false;

        const response = await runRequest<UpdateSeatsResponse>(
            `${requestId}-update-${params.subscriptionId}`,
            ApiOrganizations.UpdateOrganizationSeats(params.orgId, params.subscriptionId, {
                quantity: params.targetQuantity,
            }),
        );

        if (params.targetQuantity < params.baselineQuantity) {
            return {
                outcome: "scheduled",
                status: response,
                targetQuantity: normalizeQuantity(response.scheduled_quantity, params.targetQuantity) || params.targetQuantity,
            };
        }

        if (params.targetQuantity === params.baselineQuantity) {
            return {
                outcome: "success",
                status: response,
                targetQuantity: params.targetQuantity,
            };
        }

        const targetQuantity = resolveTargetQuantity(response, params.targetQuantity);

        return pollUntilSettled({
            ...params,
            targetQuantity,
        });
    };

    const requestIncrease = async function (params: SeatIncreaseRequest): Promise<SeatIncreaseResult> {
        return requestChange(params);
    };

    const cancel = function (): void {
        cancelled = true;
        Request.Abort(requestId);
    };

    return {
        cancel,
        isRequestCancelled,
        pollUntilSettled,
        requestChange,
        requestIncrease,
    };
}
