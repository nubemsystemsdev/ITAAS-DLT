// Payments utils tests

"use strict";

import { expect } from 'chai';
import { computeNoticeAt, computePeriodEnd, computeUnusedPeriodRefundCents, paymentIdToBytes32 } from "../../../src/utils/payments-utils";

describe("Payments utils", () => {
    it('Should compute period end correctly', async () => {
        const start = 1700000000000;
        const end = computePeriodEnd(start, 30);
        expect(end).to.be.equal(start + (30 * 24 * 60 * 60 * 1000));
    });

    it('Should compute notice correctly', async () => {
        const end = 1700000000000;
        const notice = computeNoticeAt(end, 7);
        expect(notice).to.be.equal(end - (7 * 24 * 60 * 60 * 1000));
    });

    it('Should generate a bytes32 hash', async () => {
        const h = paymentIdToBytes32("payment-123");
        expect(h.startsWith("0x")).to.be.true;
        expect(h.length).to.be.equal(66);
    });

    it('Should compute unused period refund cents', async () => {
        const start = 0;
        const end = 1000;
        expect(computeUnusedPeriodRefundCents(start, end, 1000, 500)).to.equal(500);
        expect(computeUnusedPeriodRefundCents(start, end, 1000, 1000)).to.equal(0);
        expect(computeUnusedPeriodRefundCents(start, end, 0, 500)).to.equal(0);
    });
});
