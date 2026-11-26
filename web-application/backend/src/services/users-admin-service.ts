// Reserved for license

"use strict";

import { Organization } from "../models/organization";
import { OrganizationMembership } from "../models/organization-membership";
import { Session } from "../models/users/session";
import { User } from "../models/users/user";
import { TokenWallet, TokenWalletScopeType } from "../models/token-wallet";
import { TokenService } from "./token-service";

export class UsersAdminService {
    private static instance: UsersAdminService = null;

    public static getInstance(): UsersAdminService {
        if (UsersAdminService.instance) {
            return UsersAdminService.instance;
        }
        UsersAdminService.instance = new UsersAdminService();
        return UsersAdminService.instance;
    }

    /**
     * Builds the admin user detail payload including billing and activity data.
     * @param user Target user
     * @param currentSessionId Active moderator session id (for session highlighting)
     */
    public async buildUserAdminDetails(user: User, currentSessionId: string): Promise<Record<string, unknown>> {
        const uid = user.id;

        const [
            sessions,
            tokenWallet,
            tokenRules,
            adminOrganizations,
            memberships,
        ] = await Promise.all([
            Session.findSessionsByUser(uid),
            TokenWallet.findByUser(uid),
            TokenService.getInstance().getEffectiveRules(),
            Organization.findByAdminUid(uid),
            OrganizationMembership.findByUserId(uid),
        ]);

        const adminOrgIds = new Set(adminOrganizations.map((org) => org.id));
        const memberMemberships = memberships.filter((membership) => !adminOrgIds.has(membership.organizationId));
        const membershipOrgIds = Array.from(new Set(
            memberMemberships.map((membership) => membership.organizationId).filter(Boolean),
        ));
        const membershipOrganizations = membershipOrgIds.length
            ? await Promise.all(membershipOrgIds.map((orgId) => Organization.findById(orgId)))
            : [];
        const organizationNameById = new Map(
            membershipOrganizations
                .filter((org) => !!org)
                .map((org) => [org.id, org.companyName || ""]),
        );

        const adminOrgItems = adminOrganizations.map((org) => ({
            organizationId: org.id,
            companyName: org.companyName || "",
        }));

        const memberOrgItems = memberMemberships
            .map((membership) => ({
                organizationId: membership.organizationId,
                companyName: organizationNameById.get(membership.organizationId) || "",
            }));

        const organizations = [...adminOrgItems, ...memberOrgItems];

        const resolvedWallet = tokenWallet || await TokenWallet.getOrCreate(TokenWalletScopeType.USER, uid);
        const availableTokens = Math.max(0, Math.floor(resolvedWallet.availableTokens || 0));
        const lockedTokens = Math.max(0, Math.floor(resolvedWallet.lockedTokens || 0));
        const tokenValueEurCents = Math.max(1, Math.floor(tokenRules.tokenValueEurCents || 1));

        return {
            id: user.id,
            role: user.role,
            username: user.username,
            email: user.email,
            verified: user.emailVerified,
            banned: user.banned,
            created: user.created,
            modImmune: await user.isImmuneToModeration(),
            tfa: user.tfa,
            locale: user.locale,
            sessions: sessions.map((session) => ({
                session: session.id,
                created: session.created,
                remote: session.remote,
                os: session.os,
                browser: session.browser,
                current: session.id === currentSessionId,
            })),
            tokenBalance: {
                available_tokens: availableTokens,
                locked_tokens: lockedTokens,
                token_value_eur_cents: tokenValueEurCents,
                equivalent_eur_cents: availableTokens * tokenValueEurCents,
            },
            organizations,
        };
    }
}
