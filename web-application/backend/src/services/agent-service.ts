// Reserved for license

"use strict";

import { createRandomUID } from "../utils/text-utils";
import { Agent } from "../models/agent";

const AGENT_CODE_MAX_LENGTH = 80;
const AGENT_NAME_MAX_LENGTH = 120;
const AGENT_TYPE_MAX_LENGTH = 80;
const AGENT_CATEGORY_MAX_LENGTH = 80;
const AGENT_DESCRIPTION_MAX_LENGTH = 4000;

export interface AgentInputData {
    code: string;
    name: string;
    description: string;
    type: string;
    category: string;
    price: number;
    numTokens: number;
    isActive?: boolean;
}

export interface AgentAdminItemView {
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    category: string;
    isActive: boolean;
    price: number;
    createdAt: number;
    numTokens: number;
}

export class AgentService {
    private static instance: AgentService = null;

    public static getInstance(): AgentService {
        if (AgentService.instance) {
            return AgentService.instance;
        } else {
            AgentService.instance = new AgentService();
            return AgentService.instance;
        }
    }

    public async assertCodeUniqueness(code: string, excludedId?: string): Promise<void> {
        const existing = await Agent.findByCode(code);
        if (existing && existing.id !== excludedId) {
            throw this.makeError("DUPLICATED_CODE");
        }
    }

    public async updateAgent(agent: Agent, input: AgentInputData): Promise<Agent> {
        if (input.code !== agent.code) {
            await this.assertCodeUniqueness(input.code, agent.id);
        }

        if (input.code) {
            agent.code = input.code;
        }

        if (input.name) {
            agent.name = input.name;
        }

        if (input.description) {
            agent.description = input.description;
        }

        if (input.type) {
            agent.type = input.type;
        }

        if (input.category) {
            agent.category = input.category;
        }

        if (input.isActive !== undefined) {
            agent.isActive = input.isActive;
        }

        if (input.price) {
            agent.price = input.price;
        }

        if (input.numTokens) {
            agent.numTokens = input.numTokens;
        }

        await agent.save();
        return agent;
    }

    public async activate(agent: Agent): Promise<void> {
        agent.isActive = true;
        await agent.save();
    }

    public async deactivate(agent: Agent): Promise<void> {
        agent.isActive = false;
        await agent.save();
    }

    public parseBooleanFilter(value: any): boolean | undefined | null {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }

        const normalized = (value + "").trim().toLowerCase();
        if (normalized === "1" || normalized === "true" || normalized === "yes") {
            return true;
        }
        if (normalized === "0" || normalized === "false" || normalized === "no") {
            return false;
        }
        return null;
    }

    private normalizeText(value: any): string | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        return (value + "").trim();
    }

    private normalizeDescription(value: any): string | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        return (value + "").trim();
    }

    private normalizeCode(value: any): string | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        return (value + "").trim().toLowerCase();
    }

    private normalizeNumber(value: any): number | undefined {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return Number.NaN;
        }
        return parsed;
    }

    private normalizeInteger(value: any): number | undefined {
        const n = this.normalizeNumber(value);
        if (n === undefined) {
            return undefined;
        }
        return Math.floor(n);
    }

    private validateCode(code: string | undefined): void {
        if (!code || code.length > AGENT_CODE_MAX_LENGTH || !(/^[a-z0-9\_\-]+$/).test(code)) {
            throw this.makeError("INVALID_CODE");
        }
    }

    private validateRequiredString(value: string | undefined, maxLength: number, errorCode: string): void {
        if (!value || value.length > maxLength) {
            throw this.makeError(errorCode);
        }
    }

    private validateDescription(value: string | undefined): void {
        if (value === undefined || value.length > AGENT_DESCRIPTION_MAX_LENGTH) {
            throw this.makeError("INVALID_DESCRIPTION");
        }
    }

    private validateNonNegativeNumber(value: number | undefined, errorCode: string): void {
        if (value === undefined || !Number.isFinite(value) || value < 0) {
            throw this.makeError(errorCode);
        }
    }

    private validateNonNegativeInteger(value: number | undefined, errorCode: string): void {
        if (value === undefined || !Number.isFinite(value) || value < 0 || Math.floor(value) !== value) {
            throw this.makeError(errorCode);
        }
    }

    private makeError(code: string): Error {
        const err = new Error(code);
        (err as any).code = code;
        return err;
    }
}
