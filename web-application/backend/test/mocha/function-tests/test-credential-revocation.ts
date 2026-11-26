// Credential revocation regression tests

"use strict";

import assert from "assert";
import Express from "express";
import { VCRequestController } from "../../../src/controllers/api/api-vc-request";
import { UnifiedVCManagerWrapper } from "../../../src/contracts/unified-vcmanager";
import { Identitycredentials, VCRequestStatus } from "../../../src/models/identity-credentials";
import { User } from "../../../src/models/users/user";
import { VerifiableCredential } from "../../../src/models/verifiable-credential";
import { BlockchainService } from "../../../src/services/blockchain-service";
import { AuthContext, UsersService } from "../../../src/services/users-service";
import { VerificableCredentialsService } from "../../../src/services/vc-service";
import * as CredentialJwt from "../../../src/utils/did-jwt-vc";

describe("Credential revocation", () => {
    const credentialId = "0000019a0123456789abcdef000012345";
    const onChainId = "0x" + credentialId.padStart(64, "0");
    const transactionHash = "ab".repeat(32);
    const controller = new VCRequestController();
    const credentialJwt = CredentialJwt as { verifyCredentials: typeof CredentialJwt.verifyCredentials };
    let originalBlockchain: BlockchainService;
    let originalUsers: typeof UsersService.getInstance;
    let originalFindCredential: typeof Identitycredentials.findById;
    let originalFindVC: typeof VerifiableCredential.findByCredentialId;
    let originalRevokeVC: typeof VerifiableCredential.revoke;
    let originalVerifyCredentials: typeof CredentialJwt.verifyCredentials;
    let blockchain: BlockchainService;
    let auth: AuthContext;
    let storedCredential: Pick<Identitycredentials, "credentialId" | "ownerId" | "status" | "txHash" | "updatedAt" | "revocationReason">;
    let storedVC: Pick<VerifiableCredential, "vcId" | "credentialId" | "isRevoked">;
    let revokedOnChain: boolean;
    let chainError: Error;
    let statusError: Error;
    let vcSaveError: Error;
    let credentialSaveError: Error;
    let receiptStatus: bigint;
    let calls: string[];
    let statusIds: string[];
    let revokedIds: string[];
    let issuedIds: string[];
    let request: Express.Request;

    async function revoke() {
        let status = 0;
        let body: any;
        const response = {
            status: (value: number) => { status = value; },
            json: (value: unknown) => { body = value; },
            end: () => undefined,
        } as unknown as Express.Response;
        await controller.revokeCredential(request, response);
        return { status, body };
    }

    beforeEach(() => {
        originalBlockchain = BlockchainService.instance;
        originalUsers = UsersService.getInstance;
        originalFindCredential = Identitycredentials.findById;
        originalFindVC = VerifiableCredential.findByCredentialId;
        originalRevokeVC = VerifiableCredential.revoke;
        originalVerifyCredentials = credentialJwt.verifyCredentials;
        storedCredential = { credentialId, ownerId: "owner", status: VCRequestStatus.ACTIVE, txHash: "issuance_tx", updatedAt: 0, revocationReason: "" };
        storedVC = { vcId: "vc_selected", credentialId, isRevoked: false };
        revokedOnChain = false;
        chainError = statusError = vcSaveError = credentialSaveError = null;
        receiptStatus = 1n;
        calls = [];
        statusIds = [];
        revokedIds = [];
        issuedIds = [];
        auth = new AuthContext();
        auth.user = { id: "owner", role: "user" } as User;
        UsersService.getInstance = () => ({ auth: async () => auth } as unknown as UsersService);
        Identitycredentials.findById = async (id: string) => {
            if (id !== storedCredential.credentialId) return null;
            return {
                ...storedCredential,
                save: async function () {
                    calls.push("identity:save");
                    if (credentialSaveError) throw credentialSaveError;
                    storedCredential = { ...storedCredential, status: this.status, txHash: this.txHash, updatedAt: this.updatedAt, revocationReason: this.revocationReason };
                },
            } as unknown as Identitycredentials;
        };
        VerifiableCredential.findByCredentialId = async (id: string | number) => {
            assert.strictEqual(id, credentialId);
            return storedVC ? { ...storedVC } as VerifiableCredential : null;
        };
        VerifiableCredential.revoke = async (id: string) => {
            assert.strictEqual(id, storedVC.vcId);
            calls.push("vc:revoke");
            if (vcSaveError) throw vcSaveError;
            storedVC.isRevoked = true;
        };
        blockchain = new BlockchainService();
        blockchain.getMethodTransactionOptionsAdmin = () => ({ signKey: null, complementaryAddress: null });
        blockchain.getVCManagerContract = () => ({
            isRevoked: async (id: string) => {
                calls.push("chain:status");
                statusIds.push(id);
                if (statusError) throw statusError;
                return id === onChainId && revokedOnChain;
            },
            revokeCredential: async (id: string) => {
                calls.push("chain:revoke");
                revokedIds.push(id);
                if (chainError) throw chainError;
                if (id !== onChainId) throw new Error("Credential does not exist");
                if (receiptStatus === 1n) revokedOnChain = true;
                return { receipt: { status: receiptStatus, transactionHash: Buffer.from(transactionHash, "hex") } };
            },
            issueCredential: async (id: string) => {
                issuedIds.push(id);
                return { receipt: { status: 1n, transactionHash: Buffer.from(transactionHash, "hex") } };
            },
        } as unknown as UnifiedVCManagerWrapper);
        BlockchainService.instance = blockchain;
        request = {
            params: { credentialId },
            body: { reason: "Revocation requested by the owner" },
            logger: { levels: { debug: false }, error: () => undefined },
        } as unknown as Express.Request;
    });

    afterEach(() => {
        BlockchainService.instance = originalBlockchain;
        UsersService.getInstance = originalUsers;
        Identitycredentials.findById = originalFindCredential;
        VerifiableCredential.findByCredentialId = originalFindVC;
        VerifiableCredential.revoke = originalRevokeVC;
        credentialJwt.verifyCredentials = originalVerifyCredentials;
    });

    it("confirms the transaction before saving either local revocation record", async () => {
        const result = await revoke();

        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body.success, true);
        assert.strictEqual(result.body.credentialId, credentialId);
        assert.deepStrictEqual(calls, ["chain:status", "chain:revoke", "vc:revoke", "identity:save"]);
        assert.strictEqual(revokedOnChain, true);
        assert.strictEqual(storedCredential.status, "revoked");
        assert.strictEqual(storedCredential.txHash, transactionHash);
        assert.strictEqual(storedCredential.revocationReason, request.body.reason);
        assert.strictEqual(storedVC.isRevoked, true);
    });

    for (const body of [{}, { reason: "" }, { reason: "   " }, { reason: 10 }, { reason: {} }]) {
        it(`rejects a missing or invalid revocation reason ${JSON.stringify(body)} before accessing blockchain`, async () => {
            request.body = body;
            assert.deepStrictEqual(await revoke(), { status: 400, body: { code: "REASON_REQUIRED" } });
            assert.deepStrictEqual(calls, []);
            assert.strictEqual(storedCredential.status, VCRequestStatus.ACTIVE);
            assert.strictEqual(storedCredential.revocationReason, "");
        });
    }

    it("stores the trimmed revocation reason", async () => {
        request.body.reason = "  Requested by owner  ";
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(storedCredential.revocationReason, "Requested by owner");
    });

    it("preserves the recorded reason when repairing a partially saved revocation", async () => {
        revokedOnChain = true;
        storedCredential.status = "revoked";
        storedCredential.revocationReason = "Original reason";
        request.body.reason = "Retry reason";
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(storedCredential.revocationReason, "Original reason");
    });

    it("returns an error without local changes on blockchain failure and lets the next attempt succeed", async () => {
        chainError = new Error("RPC unavailable");
        assert.deepStrictEqual(await revoke(), { status: 500, body: { code: "REVOKE_FAILED" } });
        assert.strictEqual(storedCredential.status, VCRequestStatus.ACTIVE);
        assert.strictEqual(storedCredential.txHash, "issuance_tx");
        assert.strictEqual(storedCredential.revocationReason, "");
        assert.strictEqual(storedVC.isRevoked, false);
        assert.deepStrictEqual(calls, ["chain:status", "chain:revoke"]);

        chainError = null;
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(revokedOnChain, true);
        assert.strictEqual(storedCredential.status, "revoked");
        assert.strictEqual(storedVC.isRevoked, true);
    });

    it("rejects an unsuccessful transaction receipt without saving local revocation", async () => {
        receiptStatus = 0n;
        assert.strictEqual((await revoke()).status, 500);
        assert.strictEqual(storedCredential.status, VCRequestStatus.ACTIVE);
        assert.strictEqual(storedVC.isRevoked, false);
        assert.strictEqual(revokedOnChain, false);
    });

    it("does not assume a locally revoked credential is revoked when blockchain status cannot be read", async () => {
        storedCredential.status = "revoked";
        storedVC.isRevoked = true;
        statusError = new Error("RPC unavailable");

        assert.deepStrictEqual(await revoke(), { status: 500, body: { code: "REVOKE_FAILED" } });
        assert.deepStrictEqual(calls, ["chain:status"]);
    });

    for (const localStatus of ["revoked", VCRequestStatus.REVOKED]) {
        it(`repairs an active on-chain credential previously marked ${localStatus} locally`, async () => {
            storedCredential.status = localStatus;
            storedVC.isRevoked = true;
            chainError = new Error("RPC unavailable");
            assert.strictEqual((await revoke()).status, 500);

            chainError = null;
            assert.strictEqual((await revoke()).status, 200);
            assert.strictEqual(revokedOnChain, true);
            assert.strictEqual(storedCredential.txHash, transactionHash);
        });
    }

    it("finishes local revocation when the chain was already revoked", async () => {
        revokedOnChain = true;
        assert.strictEqual((await revoke()).status, 200);
        assert.deepStrictEqual(revokedIds, []);
        assert.strictEqual(storedCredential.status, "revoked");
        assert.strictEqual(storedCredential.txHash, "issuance_tx");
        assert.strictEqual(storedVC.isRevoked, true);
    });

    it("repairs the VC flag instead of rejecting a partially completed local revocation", async () => {
        revokedOnChain = true;
        storedCredential.status = "revoked";
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(storedVC.isRevoked, true);
        assert.deepStrictEqual(revokedIds, []);
    });

    it("returns ALREADY_REVOKED only when both local records and the chain agree", async () => {
        revokedOnChain = true;
        storedCredential.status = "revoked";
        storedVC.isRevoked = true;

        assert.deepStrictEqual(await revoke(), { status: 400, body: { code: "ALREADY_REVOKED" } });
        assert.deepStrictEqual(calls, ["chain:status"]);
    });

    it("retries a failed VC save without submitting another blockchain transaction", async () => {
        vcSaveError = new Error("Database unavailable");
        assert.strictEqual((await revoke()).status, 500);
        assert.strictEqual(revokedOnChain, true);
        assert.strictEqual(storedCredential.status, VCRequestStatus.ACTIVE);
        assert.strictEqual(storedVC.isRevoked, false);

        vcSaveError = null;
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(storedCredential.status, "revoked");
        assert.strictEqual(storedVC.isRevoked, true);
        assert.strictEqual(revokedIds.length, 1);
    });

    it("retries a failed identity save without submitting another blockchain transaction", async () => {
        credentialSaveError = new Error("Database unavailable");
        assert.strictEqual((await revoke()).status, 500);
        assert.strictEqual(revokedOnChain, true);
        assert.strictEqual(storedVC.isRevoked, true);
        assert.strictEqual(storedCredential.status, VCRequestStatus.ACTIVE);

        credentialSaveError = null;
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(storedCredential.status, "revoked");
        assert.strictEqual(revokedIds.length, 1);
    });

    it("still revokes on-chain when no separate VC tracking record exists", async () => {
        storedVC = null;
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(revokedOnChain, true);
        assert.strictEqual(storedCredential.status, "revoked");
    });

    it("requires authentication before accessing blockchain", async () => {
        auth.user = null;
        assert.strictEqual((await revoke()).status, 401);
        assert.deepStrictEqual(calls, []);
    });

    it("rejects a different owner before accessing blockchain", async () => {
        auth.user.id = "other_user";
        assert.deepStrictEqual(await revoke(), { status: 403, body: { code: "NOT_AUTHORIZED" } });
        assert.deepStrictEqual(calls, []);
    });

    it("allows an administrator to revoke another user's credential", async () => {
        auth.user.id = "admin_user";
        auth.user.role = "admin";
        assert.strictEqual((await revoke()).status, 200);
        assert.strictEqual(revokedOnChain, true);
    });

    it("returns not found without accessing blockchain for an unknown credential", async () => {
        request.params.credentialId = "missing";
        assert.deepStrictEqual(await revoke(), { status: 404, body: { code: "CREDENTIAL_NOT_FOUND" } });
        assert.deepStrictEqual(calls, []);
    });

    it("uses the same bytes32 ID for issuance, status queries and revocation", async () => {
        await blockchain.issueCredential("0x" + "12".repeat(20), credentialId);
        await blockchain.isCredentialRevoked(credentialId);
        await blockchain.revokeCredential(credentialId);

        assert.deepStrictEqual(issuedIds, [onChainId]);
        assert.deepStrictEqual(statusIds, [onChainId]);
        assert.deepStrictEqual(revokedIds, [onChainId]);
    });

    it("accepts bytes32 IDs and preserves hexadecimal string IDs containing only digits", async () => {
        await blockchain.isCredentialRevoked(onChainId);
        await blockchain.isCredentialRevoked("10");
        await blockchain.isCredentialRevoked(10);

        assert.deepStrictEqual(statusIds, [onChainId, "0x" + "10".padStart(64, "0"), "0x" + "a".padStart(64, "0")]);
    });

    it("rejects malformed or oversized IDs before accessing blockchain", async () => {
        for (const id of ["", "invalid", "a".repeat(65)]) {
            await assert.rejects(blockchain.isCredentialRevoked(id), /Invalid credential ID/);
        }
        assert.deepStrictEqual(calls, []);
    });

    for (const reference of [
        { jti: credentialId },
        { id: credentialId },
        { id: `urn:credential:${credentialId}` },
        { vc: { id: `urn:credential:${credentialId}` } },
    ]) {
        it(`rejects a revoked credential using its complete identifier from ${JSON.stringify(reference)}`, async () => {
            credentialJwt.verifyCredentials = async () => ({
                verified: true,
                verifiableCredential: { ...reference, credentialSubject: { id: "did:ethr:owner" }, issuer: "did:ethr:admin" },
            }) as unknown as Awaited<ReturnType<typeof CredentialJwt.verifyCredentials>>;
            revokedOnChain = true;

            const result = await VerificableCredentialsService.getInstance().verifyCredential("mock_signed_jwt");
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.error, "Credential has been revoked");
            assert.deepStrictEqual(statusIds, [onChainId]);
        });
    }

    it("accepts a verified credential whose complete ID is active on-chain", async () => {
        credentialJwt.verifyCredentials = async () => ({
            verified: true,
            verifiableCredential: { jti: credentialId, credentialSubject: { id: "did:ethr:owner" }, issuer: "did:ethr:admin" },
        }) as unknown as Awaited<ReturnType<typeof CredentialJwt.verifyCredentials>>;

        assert.strictEqual((await VerificableCredentialsService.getInstance().verifyCredential("mock_signed_jwt")).valid, true);
        assert.deepStrictEqual(statusIds, [onChainId]);
    });
});
