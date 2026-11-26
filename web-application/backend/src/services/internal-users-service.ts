// Internal user info for BFF / Flowise

"use strict";

import { ITAAS_PLATFORM_ITEM_ID } from "../models/catalog-item";
import { ItemPlan } from "../models/item-plan";
import { Organization } from "../models/organization";
import { OrganizationLicenseAssignment } from "../models/organization-license-assignment";
import { OrganizationLicensePool } from "../models/organization-license-pool";
import { OrganizationMembership } from "../models/organization-membership";
import { SubscribableType, Subscription } from "../models/subscription";
import { User } from "../models/users/user";

/**
 * Organization summary for internal consumers.
 */
export interface InternalUserOrganizationInfo {
    id: string;
    companyName: string;
    role: string;
}

/**
 * ITAAS Platform subscription status for BFF / Flowise.
 * `source` is `organization`, `personal`, or `none`.
 */
export interface InternalUserItaasSubscriptionInfo {
    hasSubscription: boolean;
    source: string;
    assignedToUser: boolean;
}

/**
 * Entitlement to use ITAAS flows / read agent execution traces.
 * - organization: active org ITAAS pool + license assigned to the user
 * - personal: active personal ITAAS subscription
 * - none: no access
 */
export interface ItaasAccessResult {
    allowed: boolean;
    source: "organization" | "personal" | "none";
    organizationId: string | null;
}

/**
 * User profile for internal service consumers (BFF / Flowise).
 */
export interface InternalUserInfoResponse {
    uid: string;
    keycloakSub: string;
    email: string;
    username: string;
    role: string;
    organization: InternalUserOrganizationInfo | null;
    itaasSubscription: InternalUserItaasSubscriptionInfo;
}

/**
 * Resolves marketplace user data by Keycloak subject.
 */
export class InternalUsersService {
    /* Singleton */

    public static instance: InternalUsersService = null;

    public static getInstance(): InternalUsersService {
        if (InternalUsersService.instance) {
            return InternalUsersService.instance;
        } else {
            InternalUsersService.instance = new InternalUsersService();
            return InternalUsersService.instance;
        }
    }

    constructor() {

    }

    /**
     * Finds user info by Keycloak `sub` claim.
     * @param keycloakSub Keycloak user identifier
     */
    public async getUserInfoByKeycloakSub(keycloakSub: string): Promise<InternalUserInfoResponse | null> {
        if (!keycloakSub) {
            return null;
        }

        const user = await User.findByKeycloakSub(keycloakSub);

        if (!user) {
            return null;
        }

        const organization = await this.getOrganizationForUser(user.id);
        const itaasSubscription = await this.getItaasSubscriptionForUser(user.id, organization ? organization.id : null);

        return {
            uid: user.id,
            keycloakSub: user.keycloakSub || keycloakSub,
            email: user.email,
            username: user.username,
            role: user.role || "",
            organization,
            itaasSubscription,
        };
    }

    /**
     * Whether the user may access ITAAS flow features / agent execution traces.
     * Org members need an assigned ITAAS license; individuals need an active personal subscription.
     * If the org has ITAAS but the user is not assigned, personal subscription is still accepted.
     */
    public async resolveItaasAccessForUser(userId: string): Promise<ItaasAccessResult> {
        const none: ItaasAccessResult = {
            allowed: false,
            source: "none",
            organizationId: null,
        };

        if (!userId) {
            return none;
        }

        const organization = await this.getOrganizationForUser(userId);
        const organizationId = organization ? organization.id : null;
        const itaas = await this.getItaasSubscriptionForUser(userId, organizationId);

        if (itaas.source === "organization" && itaas.assignedToUser && organizationId) {
            return {
                allowed: true,
                source: "organization",
                organizationId,
            };
        }

        if (itaas.source === "personal" && itaas.hasSubscription) {
            return {
                allowed: true,
                source: "personal",
                organizationId: null,
            };
        }

        if (itaas.source === "organization" && !itaas.assignedToUser) {
            const hasPersonal = await this.hasPersonalItaasSubscription(userId);
            if (hasPersonal) {
                return {
                    allowed: true,
                    source: "personal",
                    organizationId: null,
                };
            }
        }

        return none;
    }

    private async getOrganizationForUser(userId: string): Promise<InternalUserOrganizationInfo | null> {
        const membership = await OrganizationMembership.findActiveMembershipForUser(userId);

        if (!membership) {
            return null;
        }

        const organization = await Organization.findById(membership.organizationId);

        if (!organization) {
            return null;
        }

        return {
            id: organization.id,
            companyName: organization.companyName,
            role: membership.organizationRole,
        };
    }

    /**
     * Resolves whether the user (or their organization) has an active ITAAS Platform subscription.
     */
    private async getItaasSubscriptionForUser(
        userId: string,
        organizationId: string | null,
    ): Promise<InternalUserItaasSubscriptionInfo> {
        const none: InternalUserItaasSubscriptionInfo = {
            hasSubscription: false,
            source: "none",
            assignedToUser: false,
        };

        if (organizationId) {
            const orgStatus = await this.getOrganizationItaasStatus(userId, organizationId);
            if (orgStatus) {
                return orgStatus;
            }
        }

        const hasPersonal = await this.hasPersonalItaasSubscription(userId);
        if (hasPersonal) {
            return {
                hasSubscription: true,
                source: "personal",
                assignedToUser: true,
            };
        }

        return none;
    }

    private async getOrganizationItaasStatus(
        userId: string,
        organizationId: string,
    ): Promise<InternalUserItaasSubscriptionInfo | null> {
        const pools = await OrganizationLicensePool.findActiveByOrganization(organizationId);
        const itaasPools = pools.filter((pool) => pool.catalogItemId === ITAAS_PLATFORM_ITEM_ID);

        if (itaasPools.length === 0) {
            return null;
        }

        const assignments = await OrganizationLicenseAssignment.findActiveByUser(userId);
        const itaasPoolIds = new Set(itaasPools.map((pool) => pool.id));
        const assignedToUser = assignments.some((assignment) => itaasPoolIds.has(assignment.licensePoolId));

        if (assignedToUser) {
            return {
                hasSubscription: true,
                source: "organization",
                assignedToUser: true,
            };
        }

        const hasPersonal = await this.hasPersonalItaasSubscription(userId);
        if (hasPersonal) {
            return {
                hasSubscription: true,
                source: "personal",
                assignedToUser: true,
            };
        }

        return {
            hasSubscription: true,
            source: "organization",
            assignedToUser: false,
        };
    }

    private async hasPersonalItaasSubscription(userId: string): Promise<boolean> {
        const itaasItemPlans = await ItemPlan.findByItemId(ITAAS_PLATFORM_ITEM_ID);
        const planIds = itaasItemPlans.map((plan) => plan.id);

        if (planIds.length === 0) {
            return false;
        }

        return Subscription.hasActivePersonalByUserAndSubscribableIds(userId, SubscribableType.ITEM, planIds);
    }
}
