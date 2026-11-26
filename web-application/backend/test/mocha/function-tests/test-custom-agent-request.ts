// Function tests — custom agent request status transitions

"use strict";

import assert from "assert";
import {
    CustomAgentRequest,
    CustomAgentRequestStatus,
    CustomAgentRequestType,
} from "../../../src/models/custom-agent-request";

function makeRequest(status: CustomAgentRequestStatus): CustomAgentRequest {
    return new CustomAgentRequest({
        id: "req-1",
        status,
        requestType: CustomAgentRequestType.CUSTOM,
        description: "Need a custom flow",
        requesterUserId: "user-1",
        createdAt: 1,
        updatedAt: 1,
    });
}

describe("CustomAgentRequest transitions", () => {
    it("allows pending_review to rejected, pending_payment and cancelled", () => {
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.PENDING_REVIEW, CustomAgentRequestStatus.REJECTED), true);
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.PENDING_REVIEW, CustomAgentRequestStatus.PENDING_PAYMENT), true);
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.PENDING_REVIEW, CustomAgentRequestStatus.CANCELLED), true);
    });

    it("allows pending_payment to in_development and cancelled", () => {
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.PENDING_PAYMENT, CustomAgentRequestStatus.IN_DEVELOPMENT), true);
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.PENDING_PAYMENT, CustomAgentRequestStatus.CANCELLED), true);
    });

    it("allows in_development to delivered", () => {
        assert.strictEqual(CustomAgentRequest.canTransition(CustomAgentRequestStatus.IN_DEVELOPMENT, CustomAgentRequestStatus.DELIVERED), true);
    });

    it("rejects illegal transitions with INVALID_STATUS", () => {
        const illegal: Array<[CustomAgentRequestStatus, CustomAgentRequestStatus]> = [
            [CustomAgentRequestStatus.PENDING_REVIEW, CustomAgentRequestStatus.IN_DEVELOPMENT],
            [CustomAgentRequestStatus.PENDING_REVIEW, CustomAgentRequestStatus.DELIVERED],
            [CustomAgentRequestStatus.PENDING_PAYMENT, CustomAgentRequestStatus.REJECTED],
            [CustomAgentRequestStatus.IN_DEVELOPMENT, CustomAgentRequestStatus.CANCELLED],
            [CustomAgentRequestStatus.IN_DEVELOPMENT, CustomAgentRequestStatus.PENDING_PAYMENT],
            [CustomAgentRequestStatus.DELIVERED, CustomAgentRequestStatus.CANCELLED],
            [CustomAgentRequestStatus.REJECTED, CustomAgentRequestStatus.PENDING_REVIEW],
            [CustomAgentRequestStatus.CANCELLED, CustomAgentRequestStatus.PENDING_REVIEW],
        ];

        for (const [from, to] of illegal) {
            assert.strictEqual(CustomAgentRequest.canTransition(from, to), false, `${from} -> ${to}`);
            assert.throws(() => CustomAgentRequest.assertTransition(from, to), (err: Error) => {
                return err.message === "INVALID_STATUS";
            });
        }
    });

    it("transitionTo updates status and updatedAt on a legal move", () => {
        const request = makeRequest(CustomAgentRequestStatus.PENDING_REVIEW);
        request.transitionTo(CustomAgentRequestStatus.PENDING_PAYMENT);
        assert.strictEqual(request.status, CustomAgentRequestStatus.PENDING_PAYMENT);
        assert.ok(request.updatedAt >= 1);
    });

    it("transitionTo throws INVALID_STATUS without changing status", () => {
        const request = makeRequest(CustomAgentRequestStatus.PENDING_REVIEW);
        const before = request.updatedAt;
        assert.throws(() => request.transitionTo(CustomAgentRequestStatus.DELIVERED), (err: Error) => {
            return err.message === "INVALID_STATUS";
        });
        assert.strictEqual(request.status, CustomAgentRequestStatus.PENDING_REVIEW);
        assert.strictEqual(request.updatedAt, before);
    });
});
