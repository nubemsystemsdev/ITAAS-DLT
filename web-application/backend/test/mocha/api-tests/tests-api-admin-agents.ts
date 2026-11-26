// API tests

"use strict";

import assert from "assert";
import { APITester } from "../test-tools/api-tester";
import { PreparedUser, TestUsers } from "../test-tools/models/users";
import { ApiAgentsAdmin } from "../test-tools/api-bindings/api-group-agents-admin";

// Test group
describe("API / Admin / Agents", () => {
    let testAdmin: PreparedUser;
    let testUser: PreparedUser;

    let createdAgentId = "";

    before(async () => {
        await APITester.Initialize();

        testAdmin = await TestUsers.NewAdministrator();
        testUser = await TestUsers.NewRegularUser();
    });

    it("Should fail if called by unauthorized user", async () => {
        await APITester.TestError(ApiAgentsAdmin.GetAgents({}), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.GetAgent("a"), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.CreateAgent({
            code: "agent_unauthorized",
            name: "Unauthorized",
            description: "Unauthorized",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: 1,
            numTokens: 1,
        }), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.UpdateAgent("a", {
            code: "agent_unauthorized",
            name: "Unauthorized",
            description: "Unauthorized",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: 1,
            numTokens: 1,
        }), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.ActivateAgent("a"), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.DeactivateAgent("a"), testUser.auth, 403);
        await APITester.TestError(ApiAgentsAdmin.DeleteAgent("a"), testUser.auth, 403);
    });

    it("Should validate negative price and tokens", async () => {
        await APITester.TestError(ApiAgentsAdmin.CreateAgent({
            code: "agent_negative_price",
            name: "Agent negative price",
            description: "invalid",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: -10,
            numTokens: 1,
        }), testAdmin.auth, 400, "INVALID_PRICE");

        await APITester.TestError(ApiAgentsAdmin.CreateAgent({
            code: "agent_neg_tokens",
            name: "Neg tokens",
            description: "invalid",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: 1,
            numTokens: -100,
        }), testAdmin.auth, 400, "INVALID_NUM_TOKENS");
    });

    it("Should create agent and reject duplicated code", async () => {
        await APITester.Test(ApiAgentsAdmin.CreateAgent({
            code: "agent_test_1",
            name: "Agent test 1",
            description: "First test agent",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: 99.5,
            numTokens: 1000,
        }), testAdmin.auth);

        const createdList = await APITester.Test(ApiAgentsAdmin.GetAgents({ q: "agent_test_1", page: 1, pageSize: 1 }), testAdmin.auth);
        assert.equal(createdList.agents.length, 1);
        const created = createdList.agents[0];
        assert(created.id);
        assert.equal(created.code, "agent_test_1");
        assert.equal(created.name, "Agent test 1");
        assert.equal(created.isActive, true);
        assert.equal(created.price, 99.5);
        assert.equal(created.numTokens, 1000);
        createdAgentId = created.id;

        await APITester.TestError(ApiAgentsAdmin.CreateAgent({
            code: "agent_test_1",
            name: "Duplicated code",
            description: "Duplicated code",
            type: "assistant",
            category: "qa",
            isActive: true,
            price: 1,
            numTokens: 1,
        }), testAdmin.auth, 400, "DUPLICATED_CODE");
    });

    it("Should list agents with pagination and filters", async () => {
        await APITester.Test(ApiAgentsAdmin.CreateAgent({
            code: "agent_test_2",
            name: "Agent test 2",
            description: "Second test agent",
            type: "assistant",
            category: "research",
            isActive: false,
            price: 10,
            numTokens: 100,
        }), testAdmin.auth);

        const listAll = await APITester.Test(ApiAgentsAdmin.GetAgents({ page: 1, pageSize: 10 }), testAdmin.auth);
        assert(listAll.total >= 2);
        assert(listAll.agents.length >= 2);

        const byCode = await APITester.Test(ApiAgentsAdmin.GetAgents({ q: "agent_test_1" }), testAdmin.auth);
        assert.equal(byCode.agents.length, 1);
        assert.equal(byCode.agents[0].id, createdAgentId);

        const byType = await APITester.Test(ApiAgentsAdmin.GetAgents({ type: "assistant" }), testAdmin.auth);
        assert(byType.agents.length >= 2);

        const byCategory = await APITester.Test(ApiAgentsAdmin.GetAgents({ category: "research" }), testAdmin.auth);
        assert.equal(byCategory.agents.length, 1);
        assert.equal(byCategory.agents[0].code, "agent_test_2");

        const byActive = await APITester.Test(ApiAgentsAdmin.GetAgents({ isActive: true }), testAdmin.auth);
        assert(byActive.agents.some(a => a.id === createdAgentId));
    });

    it("Should get agent details", async () => {
        const details = await APITester.Test(ApiAgentsAdmin.GetAgent(createdAgentId), testAdmin.auth);
        assert.equal(details.id, createdAgentId);
        assert.equal(details.code, "agent_test_1");
        assert.equal(details.type, "assistant");
    });

    it("Should update agent", async () => {
        const updated = await APITester.Test(ApiAgentsAdmin.UpdateAgent(createdAgentId, {
            code: "agent_test_1_upd",
            name: "Agent test 1 updated",
            description: "Updated",
            type: "assistant_v2",
            category: "ops",
            isActive: false,
            price: 120,
            numTokens: 2000,
        }), testAdmin.auth);

        assert.equal(updated.id, createdAgentId);
        assert.equal(updated.code, "agent_test_1_upd");
        assert.equal(updated.name, "Agent test 1 updated");
        assert.equal(updated.isActive, false);
        assert.equal(updated.price, 120);
        assert.equal(updated.numTokens, 2000);
    });

    it("Should activate and deactivate agent", async () => {
        await APITester.Test(ApiAgentsAdmin.ActivateAgent(createdAgentId), testAdmin.auth);
        let details = await APITester.Test(ApiAgentsAdmin.GetAgent(createdAgentId), testAdmin.auth);
        assert.equal(details.isActive, true);

        await APITester.Test(ApiAgentsAdmin.DeactivateAgent(createdAgentId), testAdmin.auth);
        details = await APITester.Test(ApiAgentsAdmin.GetAgent(createdAgentId), testAdmin.auth);
        assert.equal(details.isActive, false);
    });

    it("Should delete agent", async () => {
        await APITester.Test(ApiAgentsAdmin.DeleteAgent(createdAgentId), testAdmin.auth);
        await APITester.TestError(ApiAgentsAdmin.GetAgent(createdAgentId), testAdmin.auth, 404);
    });
});
