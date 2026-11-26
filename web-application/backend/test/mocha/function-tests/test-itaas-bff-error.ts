// Function tests — BFF HTTP error mapping

"use strict";

import assert from "assert";
import {
    createItaasServiceError,
    getItaasErrorDetails,
    isBffProvisioningTransportError,
    mapBffHttpError,
    parseBffErrorDetails,
    sanitizeItaasRunErrorDetails,
} from "../../../src/utils/itaas-bff-error";

function bffBody(code: string): string {
    return JSON.stringify({ error: { code, message: "ignored" } });
}

describe("mapBffHttpError", () => {
    it("maps BFF error.code to DLT codes regardless of generic 502/400 fallback", () => {
        assert.strictEqual(mapBffHttpError(409, bffBody("flow_not_deployed")), "FLOW_NOT_DEPLOYED");
        assert.strictEqual(mapBffHttpError(400, bffBody("credential_missing")), "CREDENTIAL_MISSING");
        assert.strictEqual(mapBffHttpError(400, bffBody("credential_unresolved")), "CREDENTIAL_UNRESOLVED");
        assert.strictEqual(mapBffHttpError(400, bffBody("credential_invalid")), "CREDENTIAL_INVALID");
        assert.strictEqual(mapBffHttpError(400, bffBody("flow_invalid")), "FLOW_INVALID");
        assert.strictEqual(mapBffHttpError(429, bffBody("llm_rate_limited")), "LLM_RATE_LIMITED");
        assert.strictEqual(mapBffHttpError(503, bffBody("llm_unavailable")), "LLM_UNAVAILABLE");
        assert.strictEqual(mapBffHttpError(422, bffBody("execution_failed")), "EXECUTION_FAILED");
        assert.strictEqual(mapBffHttpError(504, bffBody("upstream_timeout")), "UPSTREAM_TIMEOUT");
        assert.strictEqual(mapBffHttpError(502, bffBody("upstream_unreachable")), "UPSTREAM_UNREACHABLE");
        assert.strictEqual(mapBffHttpError(502, bffBody("upstream_unauthorized")), "UPSTREAM_UNAUTHORIZED");
        assert.strictEqual(mapBffHttpError(502, bffBody("identity_resolver_unavailable")), "IDENTITY_RESOLVER_UNAVAILABLE");
        assert.strictEqual(mapBffHttpError(502, bffBody("upstream_error")), "BFF_BAD_GATEWAY");
    });

    it("maps auth and not-found BFF codes", () => {
        assert.strictEqual(mapBffHttpError(401, bffBody("unauthorized")), "BFF_UNAUTHORIZED");
        assert.strictEqual(mapBffHttpError(403, bffBody("forbidden")), "BFF_FORBIDDEN");
        assert.strictEqual(mapBffHttpError(404, bffBody("not_found")), "FLOW_NOT_FOUND");
        assert.strictEqual(mapBffHttpError(404, bffBody("not_found"), "CREDENTIAL_NOT_FOUND"), "CREDENTIAL_NOT_FOUND");
        assert.strictEqual(mapBffHttpError(400, bffBody("bad_request")), "BFF_BAD_REQUEST");
        assert.strictEqual(mapBffHttpError(400, bffBody("validation_error")), "BFF_BAD_REQUEST");
    });

    it("falls back by HTTP status when the body has no known code", () => {
        assert.strictEqual(mapBffHttpError(400, "nope"), "BFF_BAD_REQUEST");
        assert.strictEqual(mapBffHttpError(401, ""), "BFF_UNAUTHORIZED");
        assert.strictEqual(mapBffHttpError(403, "{}"), "BFF_FORBIDDEN");
        assert.strictEqual(mapBffHttpError(404, ""), "FLOW_NOT_FOUND");
        assert.strictEqual(mapBffHttpError(409, ""), "FLOW_NOT_DEPLOYED");
        assert.strictEqual(mapBffHttpError(422, ""), "EXECUTION_FAILED");
        assert.strictEqual(mapBffHttpError(429, ""), "LLM_RATE_LIMITED");
        assert.strictEqual(mapBffHttpError(503, ""), "BFF_BAD_GATEWAY");
        assert.strictEqual(mapBffHttpError(503, bffBody("unknown_thing")), "BFF_BAD_GATEWAY");
        assert.strictEqual(mapBffHttpError(504, ""), "UPSTREAM_TIMEOUT");
        assert.strictEqual(mapBffHttpError(502, bffBody("unknown_thing")), "BFF_BAD_GATEWAY");
        assert.strictEqual(mapBffHttpError(500, "boom"), "BFF_BAD_GATEWAY");
    });
});

describe("parseBffErrorDetails", () => {
    it("copies sanitized nodeId and credentialId and drops extra keys", () => {
        const body = JSON.stringify({
            error: {
                code: "credential_invalid",
                details: {
                    nodeId: "llm-gemini<script>",
                    credentialId: "cred-gemini",
                    secret: "nope",
                },
            },
        });
        assert.deepStrictEqual(parseBffErrorDetails(body), {
            nodeId: "llm-geminiscript",
            credentialId: "cred-gemini",
        });
    });

    it("copies sanitized credentialType", () => {
        const body = JSON.stringify({
            error: {
                code: "credential_invalid",
                details: { credentialType: "openAIApi", secret: "nope" },
            },
        });
        assert.deepStrictEqual(parseBffErrorDetails(body), { credentialType: "openAIApi" });
    });

    it("keeps credentialIds when the node has several credentials", () => {
        const body = JSON.stringify({
            error: {
                code: "credential_invalid",
                details: { nodeId: "agent-1", credentialIds: ["cred-model", "cred-tool", ""] },
            },
        });
        assert.deepStrictEqual(parseBffErrorDetails(body), {
            nodeId: "agent-1",
            credentialIds: ["cred-model", "cred-tool"],
        });
    });

    it("returns undefined when details are missing or empty", () => {
        assert.strictEqual(parseBffErrorDetails(bffBody("credential_invalid")), undefined);
        assert.strictEqual(parseBffErrorDetails("{"), undefined);
        assert.strictEqual(sanitizeItaasRunErrorDetails({ nodeId: "!!!" }), undefined);
    });

    it("attaches details on ItaasServiceError without changing the code", () => {
        const error = createItaasServiceError("CREDENTIAL_INVALID", { nodeId: "n1", credentialId: "c1" });
        assert.strictEqual(error.message, "CREDENTIAL_INVALID");
        assert.deepStrictEqual(getItaasErrorDetails(error), { nodeId: "n1", credentialId: "c1" });
        assert.strictEqual(getItaasErrorDetails(new Error("CREDENTIAL_INVALID")), undefined);
    });
});

describe("isBffProvisioningTransportError", () => {
    it("detects network, invalid-response and HTTP status failures", () => {
        assert.strictEqual(isBffProvisioningTransportError("BFF_PROVISIONING_NETWORK_ERROR"), true);
        assert.strictEqual(isBffProvisioningTransportError("BFF_PROVISIONING_INVALID_RESPONSE"), true);
        assert.strictEqual(isBffProvisioningTransportError("BFF_PROVISIONING_HTTP_500"), true);
        assert.strictEqual(isBffProvisioningTransportError("BFF_UNAVAILABLE"), false);
        assert.strictEqual(isBffProvisioningTransportError("DELIVERY_FAILED"), false);
    });
});
