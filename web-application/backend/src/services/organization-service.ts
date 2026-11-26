// Reserved for license

"use strict";

import { Organization } from "../models/organization";
import { OrganizationMembership, OrganizationMembershipRole, OrganizationMembershipStatus } from "../models/organization-membership";
import {
    OrganizationDeletionRequest,
    OrganizationDeletionRequestStatus,
    OrganizationDeletionSubscriptionPreference,
} from "../models/organization-deletion-request";
import { OrganizationRequest, OrganizationRequestStatus } from "../models/organization-request";
import { OrganizationLicenseAssignment } from "../models/organization-license-assignment";
import { OrganizationLicensePool, poolHasAvailableSeat } from "../models/organization-license-pool";
import { Subscription, SubscriptionStatus } from "../models/subscription";
import { OrganizationLicensePoolService } from "./organization-license-pool-service";
import { SubscriptionBillingService } from "./subscription-billing-service";
import { User } from "../models/users/user";
import { Monitor } from "../monitor";
import { NotificationService, NotificationData } from "./notification-service";
import { TraceabilityService } from "./traceability-service";
import { executeWithOnChainRollback, OnChainRollbackStep, BLOCKCHAIN_REGISTRATION_FAILED } from "./on-chain-rollback";

export { BLOCKCHAIN_REGISTRATION_FAILED };

export interface BillingOrganizationContext {
    /** Set when the user is an organization admin; null for individual (non-org) purchases */
    organizationId: string | null;
}

interface MembershipSnapshot {
    id: string;
    userId: string;
    organizationId: string;
    organizationRole: string;
    status: string;
    joinedAt: number;
}

interface LicenseSnapshot {
    id: string;
    organizationId: string;
    userId: string;
    subscriptionId: string;
    isActive: boolean;
}

export interface InvitationAcceptanceResult {
    acceptedMembership: OrganizationMembership;
    rejectedInvitations: OrganizationMembership[];
}

export interface OrgDeletionRequestApiItem {
    id: string;
    organizationId: string;
    organizationName: string;
    requestedByUserId: string;
    requestedByUsername: string;
    subscriptionPreference: string;
    resolvedSubscriptionHandling: string;
    status: string;
    requestedAt: number;
    resolvedAt: number;
    resolvedByUserId: string;
    resolvedByUsername: string;
    scheduledDeletionAt: number;
    rejectionReason: string;
}

/**
 * Service for organization management (create, members, licenses, billing).
 */
export class OrganizationService {
    /* Singleton */
    private static instance: OrganizationService | null = null;

    public static getInstance(): OrganizationService {
        if (!OrganizationService.instance) {
            OrganizationService.instance = new OrganizationService();
        }
        return OrganizationService.instance;
    }

    private traceability(): TraceabilityService {
        return TraceabilityService.getInstance();
    }

    private membershipRoleToChain(role: string): bigint {
        return this.traceability().mapOrganizationMembershipRole(role === OrganizationMembershipRole.ADMIN);
    }

    /** 
     * Parses API role input (Admin | Member). Returns null when invalid. 
     */
    public parseMembershipRole(roleInput: string): OrganizationMembershipRole | null {
        const normalized = ((roleInput || "") + "").trim().toLowerCase();
        if (normalized === "admin") {
            return OrganizationMembershipRole.ADMIN;
        }
        if (normalized === "member") {
            return OrganizationMembershipRole.MEMBER;
        }
        return null;
    }

    private async restoreMembership(snapshot: MembershipSnapshot): Promise<void> {
        const membership = new OrganizationMembership({
            id: snapshot.id,
            userId: snapshot.userId,
            organizationId: snapshot.organizationId,
            organizationRole: snapshot.organizationRole,
            status: snapshot.status,
            joinedAt: snapshot.joinedAt,
        });
        await membership.insert();
    }

    // ---------------------------------------------------------------------------
    // Organization CRUD
    // ---------------------------------------------------------------------------

    /**
     * Creates a new organization request for later approval.
     */
    public async submitOrganizationRequest(userId: string, companyName: string, cifNif: string, country: string, fiscalAddress: string): Promise<OrganizationRequest> {
        const user = await User.findUserByUID(userId);

        return OrganizationRequest.createRequest({
            uid: user.id,
            companyName: companyName,
            cifNif: cifNif,
            country: country,
            fiscalAddress: fiscalAddress,
            applicantEmail: (user?.email || "").toLowerCase()
        });
    }

    /**
     * Creates a new organization and makes the given user its admin.
     */
    public async createOrganization(userId: string, data: {
        companyName: string;
        cifNif: string;
        country: string;
        fiscalAddress: string;
        email: string;
    }): Promise<Organization> {
        const trace = this.traceability();

        const result = await executeWithOnChainRollback({
            persist: async () => {
                const org = await Organization.create({
                    companyName: data.companyName,
                    cifNif: data.cifNif,
                    country: data.country,
                    fiscalAddress: data.fiscalAddress,
                    email: data.email,
                    adminUid: userId,
                });

                const membership = await OrganizationMembership.createMembership({
                    userId: userId,
                    organizationId: org.id,
                    organizationRole: OrganizationMembershipRole.ADMIN,
                    status: OrganizationMembershipStatus.ACTIVE,
                });

                return { org, membership };
            },
            rollback: async ({ org, membership }) => {
                await membership.delete();
                await org.delete();
            },
            chainSteps: [
                {
                    execute: async ({ org }) => {
                        await trace.recordOrganizationRegistered(org.id);
                    },
                    compensate: async ({ org }) => {
                        await trace.recordOrganizationDeactivated(org.id);
                    },
                },
                {
                    execute: async ({ org, membership }) => {
                        await trace.recordMemberAdded(
                            org.id,
                            membership.id,
                            membership.userId,
                            this.membershipRoleToChain(membership.organizationRole),
                        );
                    },
                    compensate: async ({ org }) => {
                        await trace.recordOrganizationDeactivated(org.id);
                    },
                },
            ],
        });

        Monitor.debug(`[ORG] Organization created: ${result.org.id} by user ${userId}`);
        return result.org;
    }

    /**
     * Approves an organization request and creates the organization for the applicant.
     */
    public async approveOrganizationRequest(requestId: string): Promise<void> {
        const request = await OrganizationRequest.findById(requestId);
        const applicantUser = await User.findUser((request?.applicantEmail || "").toLowerCase());

        await this.createOrganization(applicantUser?.id || "", {
            companyName: request?.companyName || "",
            cifNif: request?.cifNif || "",
            country: request?.country || "",
            fiscalAddress: request?.fiscalAddress || "",
            email: request?.applicantEmail || "",
        });

        if (request) {
            request.status = OrganizationRequestStatus.APPROVED;
            request.resolvedAt = Date.now();
            await request.save();
        }
    }

    /**
     * Rejects an organization request.
     */
    public async rejectOrganizationRequest(requestId: string): Promise<void> {
        const request = await OrganizationRequest.findById(requestId);
        if (request) {
            request.status = OrganizationRequestStatus.REJECTED;
            request.resolvedAt = Date.now();
            await request.save();
        }
    }

    /**
     * Deletes the user's pending organization request.
     * @returns deleted when a pending request was removed; not_pending when a non-pending request exists; not_found otherwise
     */
    public async cancelMyOrganizationRequest(userId: string): Promise<"deleted" | "not_pending" | "not_found"> {
        const pending = await OrganizationRequest.findPendingByUid(userId);
        if (pending.length > 0) {
            await pending[0].delete();
            return "deleted";
        }

        const latest = await OrganizationRequest.findLatestByUid(userId);
        if (latest) {
            return "not_pending";
        }

        return "not_found";
    }

    // ---------------------------------------------------------------------------
    // Organization deletion requests
    // ---------------------------------------------------------------------------

    private async requireActiveOrganizationAdmin(orgId: string, userId: string): Promise<Organization> {
        const org = await Organization.findById(orgId);
        if (!org) {
            throw new Error("ORGANIZATION_NOT_FOUND");
        }
        if (!org.isActive) {
            throw new Error("ORGANIZATION_NOT_ACTIVE");
        }
        if (!await OrganizationMembership.isAdminMember(userId, orgId)) {
            throw new Error("NOT_ORGANIZATION_ADMIN");
        }
        return org;
    }

    /**
     * Submits a pending organization deletion request.
     * Notifies other org admins and platform admins.
     */
    public async submitDeletionRequest(
        orgId: string,
        userId: string,
        subscriptionPreference: OrganizationDeletionSubscriptionPreference,
    ): Promise<OrganizationDeletionRequest> {
        const org = await this.requireActiveOrganizationAdmin(orgId, userId);

        const existingClosure = await OrganizationDeletionRequest.findActiveClosureByOrganizationId(orgId);
        if (existingClosure) {
            throw new Error("PENDING_DELETION_REQUEST_EXISTS");
        }

        const request = await OrganizationDeletionRequest.createRequest({
            organizationId: orgId,
            requestedByUserId: userId,
            subscriptionPreference,
        });

        const requester = await User.findUserByUID(userId);
        const requesterName = requester?.username || userId;

        void (async () => {
            await this.notifyOrganizationAdmins(orgId, {
                type: "organization_deletion_request",
                organizationName: org.companyName,
                memberName: requesterName,
                info: {
                    message: "An organization admin has requested organization deletion.",
                },
            }, userId);

            const platformAdmins = await User.findPlatformAdmins();
            await Promise.all(platformAdmins.map(adminUser => NotificationService.getInstance().sendNotification(adminUser, {
                type: "organization_deletion_request",
                organizationName: org.companyName,
                memberName: requesterName,
                info: {
                    message: "An organization deletion request has been submitted.",
                },
            })));
        })().catch((ex) => {
            Monitor.warning(`[ORG] Failed to notify about deletion request for org ${orgId}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        });

        Monitor.debug(`[ORG] Deletion request ${request.id} submitted for org ${orgId} by ${userId}`);
        return request;
    }

    /**
     * Cancels the pending deletion request for an organization.
     */
    public async cancelDeletionRequest(orgId: string, userId: string): Promise<"deleted" | "not_pending" | "not_found"> {
        await this.requireActiveOrganizationAdmin(orgId, userId);

        const pending = await OrganizationDeletionRequest.findPendingByOrganizationId(orgId);
        if (pending) {
            await pending.delete();
            return "deleted";
        }

        const latest = await OrganizationDeletionRequest.findLatestByOrganizationId(orgId);
        if (latest) {
            return "not_pending";
        }

        return "not_found";
    }

    /**
     * Returns the pending deletion request for an organization, or the latest if none is pending.
     */
    public async getDeletionRequestForOrganization(orgId: string): Promise<OrganizationDeletionRequest | null> {
        const activeClosure = await OrganizationDeletionRequest.findActiveClosureByOrganizationId(orgId);
        if (activeClosure) {
            return activeClosure;
        }
        return OrganizationDeletionRequest.findLatestByOrganizationId(orgId);
    }

    /**
     * Rejects a pending organization deletion request.
     */
    public async rejectDeletionRequest(requestId: string, resolvedByUserId: string, rejectionReason?: string): Promise<void> {
        const request = await OrganizationDeletionRequest.findById(requestId);
        if (!request) {
            throw new Error("DELETION_REQUEST_NOT_FOUND");
        }
        if (request.status !== OrganizationDeletionRequestStatus.PENDING) {
            throw new Error("DELETION_REQUEST_NOT_PENDING");
        }

        request.status = OrganizationDeletionRequestStatus.REJECTED;
        request.resolvedAt = Date.now();
        request.resolvedByUserId = resolvedByUserId;
        request.rejectionReason = ((rejectionReason || "") + "").trim();
        await request.save();

        const org = await Organization.findById(request.organizationId);
        const orgName = org?.companyName || request.organizationId;
        void this.notifyOrganizationAdminsDeletionRequestResolved(request.organizationId, orgName, false).catch((ex) => {
            Monitor.warning(`[ORG] Failed to notify org admins about rejected deletion request for org ${request.organizationId}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        });
    }

    /**
     * Lists organization deletion requests (platform admin).
     */
    public async listDeletionRequests(
        skip: number,
        limit: number,
        q?: string,
        status?: OrganizationDeletionRequestStatus,
    ): Promise<{ items: OrganizationDeletionRequest[]; total: number }> {
        const total = await OrganizationDeletionRequest.countFiltered(q, status);
        const items = await OrganizationDeletionRequest.findFiltered(skip, limit, q, status);
        return { items, total };
    }

    public parseDeletionSubscriptionPreference(value: string): OrganizationDeletionSubscriptionPreference | null {
        const pref = ((value || "") + "").trim();
        if (Object.values(OrganizationDeletionSubscriptionPreference).includes(pref as OrganizationDeletionSubscriptionPreference)) {
            return pref as OrganizationDeletionSubscriptionPreference;
        }
        return null;
    }

    public async mapDeletionRequestToApiItem(r: OrganizationDeletionRequest): Promise<OrgDeletionRequestApiItem> {
        const org = await Organization.findById(r.organizationId);
        const requester = await User.findUserByUID(r.requestedByUserId);
        const resolver = r.resolvedByUserId ? await User.findUserByUID(r.resolvedByUserId) : null;
        let scheduledDeletionAt = 0;
        if (r.status === OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END) {
            scheduledDeletionAt = await this.computeScheduledDeletionAt(r.organizationId);
        }
        return {
            id: r.id,
            organizationId: r.organizationId,
            organizationName: org?.companyName || "",
            requestedByUserId: r.requestedByUserId,
            requestedByUsername: requester?.username || "",
            subscriptionPreference: r.subscriptionPreference,
            resolvedSubscriptionHandling: r.resolvedSubscriptionHandling,
            status: r.status,
            requestedAt: r.requestedAt,
            resolvedAt: r.resolvedAt,
            resolvedByUserId: r.resolvedByUserId,
            resolvedByUsername: resolver?.username || "",
            scheduledDeletionAt,
            rejectionReason: r.rejectionReason,
        };
    }

    private scheduledDeletionAtFromSubs(subs: Subscription[]): number {
        if (subs.length === 0) {
            return 0;
        }
        return subs.reduce((max, sub) => Math.max(max, sub.currentPeriodEnd || 0), 0);
    }

    private async computeScheduledDeletionAt(orgId: string): Promise<number> {
        return this.scheduledDeletionAtFromSubs(await Subscription.findNonCancelledByOrganization(orgId));
    }

    /**
     * Cancels subscriptions and either defers org closure to period end or soft-deletes now.
     */
    private async closeOrganizationWithSubscriptionHandling(
        orgId: string,
        actorUserId: string,
        subscriptionHandling: OrganizationDeletionSubscriptionPreference,
        orgName: string,
        activeMembers: OrganizationMembership[],
    ): Promise<"deferred" | "deleted"> {
        await SubscriptionBillingService.getInstance().cancelOrganizationSubscriptionsForDeletion(
            orgId,
            subscriptionHandling,
            actorUserId,
        );

        const remainingSubs = await Subscription.findNonCancelledByOrganization(orgId);
        const deferUntilPeriodEnd = subscriptionHandling === OrganizationDeletionSubscriptionPreference.AT_PERIOD_END
            && remainingSubs.length > 0;

        if (deferUntilPeriodEnd) {
            await this.notifyMembersOrganizationDeletionScheduled(
                activeMembers,
                orgName,
                orgId,
                this.scheduledDeletionAtFromSubs(remainingSubs),
            );
            return "deferred";
        }

        await this.deleteOrganization(orgId, actorUserId);
        await this.notifyMembersOrganizationDeleted(activeMembers, orgName, orgId);
        return "deleted";
    }

    /**
     * Approves a pending organization deletion request.
     * Immediate handling soft-deletes now; AtPeriodEnd keeps the org active until subscriptions end.
     */
    public async approveDeletionRequest(requestId: string, actorUserId: string): Promise<void> {
        const request = await OrganizationDeletionRequest.findById(requestId);
        if (!request) {
            throw new Error("DELETION_REQUEST_NOT_FOUND");
        }
        if (request.status !== OrganizationDeletionRequestStatus.PENDING) {
            throw new Error("DELETION_REQUEST_NOT_PENDING");
        }

        const subscriptionHandling = this.parseDeletionSubscriptionPreference(request.subscriptionPreference);
        if (!subscriptionHandling) {
            throw new Error("INVALID_SUBSCRIPTION_PREFERENCE");
        }

        const org = await Organization.findById(request.organizationId);
        if (!org) {
            throw new Error("ORGANIZATION_NOT_FOUND");
        }
        if (!org.isActive) {
            throw new Error("ORGANIZATION_NOT_ACTIVE");
        }

        const activeMembers = await OrganizationMembership.findActiveByOrganization(request.organizationId);
        const orgName = org.companyName || request.organizationId;

        request.resolvedAt = Date.now();
        request.resolvedByUserId = actorUserId;
        request.resolvedSubscriptionHandling = subscriptionHandling;

        const outcome = await this.closeOrganizationWithSubscriptionHandling(
            request.organizationId,
            actorUserId,
            subscriptionHandling,
            orgName,
            activeMembers,
        );
        
        request.status = outcome === "deferred"
            ? OrganizationDeletionRequestStatus.APPROVED_PENDING_PERIOD_END
            : OrganizationDeletionRequestStatus.APPROVED;
        await request.save();

        void this.notifyOrganizationAdminsDeletionRequestResolved(request.organizationId, orgName, true).catch((ex) => {
            Monitor.warning(`[ORG] Failed to notify org admins about approved deletion request for org ${request.organizationId}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        });

        if (outcome === "deferred") {
            Monitor.debug(`[ORG] Deletion request ${requestId} approved (deferred) for org ${request.organizationId} by ${actorUserId}`);
            return;
        }

        Monitor.debug(`[ORG] Deletion request ${requestId} approved for org ${request.organizationId} by ${actorUserId}`);
    }

    /**
     * Soft-deletes the org when an AtPeriodEnd approval has no remaining subscriptions.
     * Called from subscription lifecycle hooks (webhook / task).
     */
    public async finalizeOrganizationDeletionIfReady(orgId: string): Promise<boolean> {
        const request = await OrganizationDeletionRequest.findApprovedPendingPeriodEndByOrganizationId(orgId);
        if (!request) {
            return false;
        }

        if ((await Subscription.findNonCancelledByOrganization(orgId)).length > 0) {
            return false;
        }

        const org = await Organization.findById(orgId);
        if (!org?.isActive) {
            request.status = OrganizationDeletionRequestStatus.APPROVED;
            await request.save();
            return false;
        }

        const activeMembers = await OrganizationMembership.findActiveByOrganization(orgId);
        const orgName = org.companyName || orgId;

        await this.deleteOrganization(orgId, request.resolvedByUserId || "");

        request.status = OrganizationDeletionRequestStatus.APPROVED;
        await request.save();

        await this.notifyMembersOrganizationDeleted(activeMembers, orgName, orgId);

        Monitor.debug(`[ORG] Finalized deferred deletion for org ${orgId}`);
        return true;
    }

    private async notifyOrganizationAdminsDeletionRequestResolved(
        organizationId: string,
        organizationName: string,
        approved: boolean,
    ): Promise<void> {
        await this.notifyOrganizationAdmins(organizationId, {
            type: approved ? "organization_deletion_request_approved" : "organization_deletion_request_rejected",
            organizationName,
            info: {
                message: approved
                    ? "Your organization deletion request has been approved by a platform administrator."
                    : "Your organization deletion request has been rejected by a platform administrator.",
            },
        });
    }

    private async notifyMembersOrganizationDeleted(
        activeMembers: OrganizationMembership[],
        orgName: string,
        orgId: string,
    ): Promise<void> {
        try {
            for (const membership of activeMembers) {
                const memberUser = await User.findUserByUID(membership.userId);
                if (!memberUser) {
                    continue;
                }
                await NotificationService.getInstance().sendNotification(memberUser, {
                    type: "organization_deleted",
                    organizationName: orgName,
                    info: {
                        message: "Your organization has been deleted from the platform.",
                    },
                });
            }
        } catch (ex) {
            Monitor.warning(`[ORG] Failed to notify members about deletion of org ${orgId}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    private async notifyMembersOrganizationDeletionScheduled(
        activeMembers: OrganizationMembership[],
        orgName: string,
        orgId: string,
        scheduledDeletionAt: number,
    ): Promise<void> {
        try {
            for (const membership of activeMembers) {
                const memberUser = await User.findUserByUID(membership.userId);
                if (!memberUser) {
                    continue;
                }
                await NotificationService.getInstance().sendNotification(memberUser, {
                    type: "organization_deletion_scheduled",
                    organizationName: orgName,
                    info: {
                        message: "Your organization deletion has been approved. The organization will remain active until the billing period ends.",
                        scheduledDeletionAt,
                    },
                });
            }
        } catch (ex) {
            Monitor.warning(`[ORG] Failed to notify members about scheduled deletion of org ${orgId}`);
            Monitor.debugException(ex instanceof Error ? ex : new Error(String(ex)));
        }
    }

    /**
     * Updates organization details. Only the org admin may do this.
     */
    public async updateOrganization(orgId: string, userId: string, data: {
        companyName?: string;
        fiscalAddress?: string;
        email?: string;
        country?: string;
    }): Promise<Organization | null> {
        const org = await Organization.findById(orgId);

        if (!org || !await OrganizationMembership.isAdminMember(userId, orgId)) {
            return null;
        }

        if (data.companyName !== undefined) { org.companyName = data.companyName.trim(); }
        if (data.fiscalAddress !== undefined) { org.fiscalAddress = data.fiscalAddress.trim(); }
        if (data.email !== undefined) { org.email = data.email.trim().toLowerCase(); }
        if (data.country !== undefined) { org.country = data.country.trim(); }

        await org.save();
        return org;
    }

    /**
     * Platform-admin direct delete with subscription handling.
     * AtPeriodEnd keeps the org active until subscriptions end.
     */
    public async deleteOrganizationByPlatform(
        orgId: string,
        actorUserId: string,
        subscriptionHandling: OrganizationDeletionSubscriptionPreference,
    ): Promise<void> {
        const org = await Organization.findById(orgId);
        if (!org) {
            throw new Error("ORGANIZATION_NOT_FOUND");
        }
        if (!org.isActive) {
            throw new Error("ORGANIZATION_NOT_ACTIVE");
        }
        if (await OrganizationDeletionRequest.findActiveClosureByOrganizationId(orgId)) {
            throw new Error("PENDING_DELETION_REQUEST_EXISTS");
        }

        const activeMembers = await OrganizationMembership.findActiveByOrganization(orgId);
        const orgName = org.companyName || orgId;

        const outcome = await this.closeOrganizationWithSubscriptionHandling(
            orgId,
            actorUserId,
            subscriptionHandling,
            orgName,
            activeMembers,
        );

        if (outcome === "deferred") {
            await OrganizationDeletionRequest.createApprovedPendingPeriodEnd({
                organizationId: orgId,
                requestedByUserId: actorUserId,
                subscriptionPreference: subscriptionHandling,
                resolvedByUserId: actorUserId,
                resolvedSubscriptionHandling: subscriptionHandling,
            });
            Monitor.debug(`[ORG] Platform deferred deletion for org ${orgId} by ${actorUserId}`);
            return;
        }

        Monitor.debug(`[ORG] Platform deleted org ${orgId} by ${actorUserId}`);
    }

    /**
     * Deletes (deactivates) an organization.
     * Also deactivates memberships and active license assignments.
     * Authorization is handled at controller level (platform admin only).
     */
    public async deleteOrganization(orgId: string, actorUserId: string): Promise<void> {
        const org = await Organization.findById(orgId);
        if (!org) {
            return;
        }

        const trace = this.traceability();
        const memberships = await OrganizationMembership.findByOrganizationId(orgId);
        const licenses = await OrganizationLicenseAssignment.findByOrganization(orgId);

        const membershipSnapshots: MembershipSnapshot[] = memberships.map(m => ({
            id: m.id,
            userId: m.userId,
            organizationId: m.organizationId,
            organizationRole: m.organizationRole,
            status: m.status,
            joinedAt: m.joinedAt,
        }));

        const licenseSnapshots: LicenseSnapshot[] = licenses.map(l => ({
            id: l.id,
            organizationId: l.organizationId,
            userId: l.userId,
            subscriptionId: l.subscriptionId,
            isActive: l.isActive,
        }));

        const activeMembersOnChain = membershipSnapshots.filter(
            m => m.status === OrganizationMembershipStatus.ACTIVE,
        );
        const activeLicensesOnChain = licenseSnapshots.filter(l => l.isActive);

        const chainSteps: OnChainRollbackStep<{
            orgId: string;
            membershipSnapshots: MembershipSnapshot[];
            licenseSnapshots: LicenseSnapshot[];
            orgWasActive: boolean;
        }>[] = [];

        for (const member of activeMembersOnChain) {
            chainSteps.push({
                execute: async () => {
                    await trace.recordMemberRemoved(member.id, orgId);
                },
                compensate: async () => {
                    await trace.recordMemberReactivated(
                        member.id,
                        this.membershipRoleToChain(member.organizationRole),
                        orgId,
                    );
                },
            });
        }

        for (const license of activeLicensesOnChain) {
            chainSteps.push({
                execute: async () => {
                    await trace.recordLicenseRevoked(license.id, orgId, license.userId);
                },
                compensate: async () => {
                    await trace.recordLicenseReactivated(
                        license.id,
                        license.subscriptionId,
                        orgId,
                        license.userId,
                    );
                },
            });
        }

        chainSteps.push({
            execute: async () => {
                await trace.recordOrganizationDeactivated(orgId);
            },
            compensate: async () => {
                await trace.recordOrganizationReactivated(orgId);
            },
        });

        await executeWithOnChainRollback({
            persist: async () => {
                for (const membership of memberships) {
                    if (membership.status !== OrganizationMembershipStatus.INACTIVE) {
                        membership.status = OrganizationMembershipStatus.INACTIVE;
                        await membership.save();
                    }
                }

                for (const license of licenses) {
                    if (license.isActive) {
                        license.isActive = false;
                        await license.save();
                    }
                }

                const orgWasActive = org.isActive;
                org.isActive = false;
                await org.save();

                return { orgId, membershipSnapshots, licenseSnapshots, orgWasActive };
            },
            rollback: async (ctx) => {
                const orgToRestore = await Organization.findById(ctx.orgId);
                if (orgToRestore) {
                    orgToRestore.isActive = ctx.orgWasActive;
                    await orgToRestore.save();
                }

                for (const snapshot of ctx.membershipSnapshots) {
                    const current = await OrganizationMembership.findById(snapshot.id);
                    if (current) {
                        current.status = snapshot.status;
                        await current.save();
                    }
                }

                for (const snapshot of ctx.licenseSnapshots) {
                    const current = await OrganizationLicenseAssignment.findById(snapshot.id);
                    if (current) {
                        current.isActive = snapshot.isActive;
                        await current.save();
                    }
                }
            },
            chainSteps,
        });

        const deletedCreationRequests = await OrganizationRequest.deleteApprovedByCreatorAndCifNif(org.adminUid, org.cifNif);
        if (deletedCreationRequests > 0) {
            Monitor.debug(`[ORG] Deleted ${deletedCreationRequests} approved creation request(s) for org ${orgId}`);
        }

        Monitor.debug(`[ORG] Organization ${orgId} deleted (deactivated) by ${actorUserId}`);
    }

    /**
     * Returns the organization where the user has an active Admin membership.
     */
    public async getOrganizationsByAdmin(userId: string): Promise<Organization | null> {
        const adminMembership = await OrganizationMembership.findActiveAdminMembershipForUser(userId);
        if (!adminMembership) {
            return null;
        }
        return Organization.findById(adminMembership.organizationId);
    }

    /**
     * Returns true when the user has at least one active Admin membership in any organization.
     */
    public async userAdministersAnyOrganization(userId: string): Promise<boolean> {
        const adminMembership = await OrganizationMembership.findActiveAdminMembershipForUser(userId);
        return !!adminMembership;
    }

    /**
     * Returns true when the user is an active Admin member of the given organization.
     */
    public async isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
        return OrganizationMembership.isAdminMember(userId, organizationId);
    }

    /**
     * Returns true when the user is the organization creator (adminUid on the org record).
     */
    public isOrganizationCreator(org: Organization, userId: string): boolean {
        const creatorUid = ((org?.adminUid || "") + "").trim();
        const targetUid = ((userId || "") + "").trim();
        return !!creatorUid && creatorUid === targetUid;
    }

    /**
     * Resolves billing scope from the user's single active organization membership.
     * Returns null when the user belongs to an organization but is not an admin.
     */
    public async resolveBillingOrganizationContext(userId: string): Promise<BillingOrganizationContext | null> {
        const membership = await OrganizationMembership.findActiveMembershipForUser(userId);
        if (!membership) {
            return { organizationId: null };
        }

        if (membership.organizationRole !== OrganizationMembershipRole.ADMIN) {
            return null;
        }

        return { organizationId: membership.organizationId };
    }

    public async showMultiLicensePlansInCatalog(userId: string | null | undefined): Promise<boolean> {
        const normalizedUserId = ((userId || "") + "").trim();
        if (!normalizedUserId) {
            return false;
        }

        return !!(await this.resolveBillingOrganizationContext(normalizedUserId))?.organizationId;
    }

    /**
     * Returns the memberships for the user (all organizations they belong to).
     */
    public async getMemberships(userId: string): Promise<OrganizationMembership | null> {
        const memberships = await OrganizationMembership.findByUserId(userId);
        return memberships[0] || null;
    }

    /**
     * Converts an Organization to an API response object, including the admin username.
     */
    public async toOrganizationItem(org: Organization, currentUserId: string = ""): Promise<any> {
        const data = org.toObject();
        const admin = await User.findUserByUID(org.adminUid);
        data.adminUsername = admin?.username || "";
        data.currentUserOrganizationRole = "";
        data.currentUserIsOrganizationAdmin = false;
        data.currentUserJoinedAt = 0;

        if (currentUserId) {
            const membership = await OrganizationMembership.findByUserAndOrganization(currentUserId, org.id);
            if (membership?.status === OrganizationMembershipStatus.ACTIVE) {
                data.currentUserOrganizationRole = membership.organizationRole;
                data.currentUserIsOrganizationAdmin = membership.organizationRole === OrganizationMembershipRole.ADMIN;
                data.currentUserJoinedAt = membership.joinedAt || 0;
            }
        }

        return data;
    }

    /**
     * Converts organization memberships to API response objects, including each member username.
     */
    public async toMemberItems(members: OrganizationMembership[]): Promise<any[]> {
        if (members.length === 0) {
            return [];
        }

        const organizationId = ((members[0]?.organizationId || "") + "").trim();
        const activeLicenseCountByUserId = await this.countActiveLicensesByUserForOrganization(organizationId);

        const userIds = Array.from(new Set(members.map(m => m.userId)));
        const users = await Promise.all(userIds.map(uid => User.findUserByUID(uid)));
        const userById = new Map(users.filter(u => !!u).map(u => [u.id, u]));

        return members.map(m => {
            const data = m.toObject();
            const user = userById.get(m.userId);
            data.username = user?.username || "";
            data.email = (user?.email || "").toLowerCase();
            data.activeLicenseCount = activeLicenseCountByUserId.get(m.userId) || 0;
            return data;
        });
    }

    private async countActiveLicensesByUserForOrganization(organizationId: string): Promise<Map<string, number>> {
        const counts = new Map<string, number>();
        if (!organizationId) {
            return counts;
        }

        const assignments = await OrganizationLicenseAssignment.findActiveByOrganization(organizationId);
        for (const assignment of assignments) {
            const userId = ((assignment.userId || "") + "").trim();
            if (!userId) {
                continue;
            }
            counts.set(userId, (counts.get(userId) || 0) + 1);
        }

        return counts;
    }

    /**
     * Checks whether a user can access data for a given scope.
     * Non-organization scopes are always allowed.
     */
    public async canAccessScope(userId: string, scopeType: string, scopeId: string): Promise<boolean> {
        if (scopeType !== "organization") {
            return true;
        }
        return OrganizationMembership.isAdminMember(userId, scopeId);
    }

    // ---------------------------------------------------------------------------
    // Member management
    // ---------------------------------------------------------------------------

    /**
     * Invites an existing user (by email) to the organization.
     * Creates a membership record with status "Invited".
     */
    public async inviteMember(orgId: string, userId: string, email: string, role: OrganizationMembershipRole = OrganizationMembershipRole.MEMBER): Promise<OrganizationMembership> {
        const targetUser = await User.findUser(email.toLowerCase());

        const membership = await OrganizationMembership.createMembership({
            userId: targetUser?.id || "",
            organizationId: orgId,
            organizationRole: role,
            status: OrganizationMembershipStatus.INVITED,
        });

        Monitor.debug(`[ORG] User ${targetUser.id} invited to org ${orgId} by ${userId}`);
        return membership;
    }

    /**
     * Sets a membership status to Active and reactivates prior license assignments when seats are available.
     */
    public async activateMember(membershipId: string): Promise<OrganizationMembership | null> {
        const membership = await OrganizationMembership.findById(membershipId);

        if (!membership) {
            return null;
        }

        if (membership.status === OrganizationMembershipStatus.ACTIVE) {
            return membership;
        }

        const previousStatus = membership.status;
        const isFirstActivation = previousStatus === OrganizationMembershipStatus.INVITED;
        const trace = this.traceability();
        const chainRole = this.membershipRoleToChain(membership.organizationRole);

        await executeWithOnChainRollback({
            persist: async () => {
                membership.status = OrganizationMembershipStatus.ACTIVE;
                await membership.save();
                return { membership, previousStatus, isFirstActivation, chainRole };
            },
            rollback: async ({ membership, previousStatus }) => {
                membership.status = previousStatus;
                await membership.save();
            },
            chainSteps: [
                {
                    execute: async ({ membership, isFirstActivation, chainRole }) => {
                        if (isFirstActivation) {
                            await trace.recordMemberAdded(
                                membership.organizationId,
                                membership.id,
                                membership.userId,
                                chainRole,
                            );
                        } else {
                            await trace.recordMemberReactivated(
                                membership.id,
                                chainRole,
                                membership.organizationId,
                            );
                        }
                    },
                    compensate: async ({ membership }) => {
                        await trace.recordMemberRemoved(membership.id, membership.organizationId);
                    },
                },
            ],
        });

        const inactiveAssignments = (await OrganizationLicenseAssignment.findByOrganizationAndUser(
            membership.organizationId,
            membership.userId,
        )).filter((a) => !a.isActive && a.licensePoolId);

        const poolService = OrganizationLicensePoolService.getInstance();
        for (const assignment of inactiveAssignments) {
            const pool = await OrganizationLicensePool.findById(assignment.licensePoolId);
            if (!pool || !(await poolService.isPoolAssignable(pool))) {
                continue;
            }
            const activeCount = await OrganizationLicenseAssignment.countActiveByPool(pool.id);
            if (!poolHasAvailableSeat(pool.seatLimit, activeCount)) {
                continue;
            }
            assignment.isActive = true;
            await assignment.save();
        }

        return membership;
    }

    /**
     * Sets a membership status to Inactive and deactivates (does not delete) license assignments.
     */
    public async deactivateMember(membershipId: string): Promise<OrganizationMembership | null> {
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership) {
            return null;
        }

        const org = await Organization.findById(membership.organizationId);
        if (org && this.isOrganizationCreator(org, membership.userId)) {
            throw new Error("CANNOT_DEACTIVATE_ORG_CREATOR");
        }

        if (membership.status === OrganizationMembershipStatus.INACTIVE) {
            return membership;
        }

        const previousStatus = membership.status;
        const trace = this.traceability();
        const chainRole = this.membershipRoleToChain(membership.organizationRole);
        const licenses = await OrganizationLicenseAssignment.findByOrganizationAndUser(
            membership.organizationId,
            membership.userId,
        );

        await executeWithOnChainRollback({
            persist: async () => {
                for (const license of licenses) {
                    if (license.isActive) {
                        license.isActive = false;
                        await license.save();
                    }
                }
                membership.status = OrganizationMembershipStatus.INACTIVE;
                await membership.save();
                return { membership, previousStatus, chainRole };
            },
            rollback: async ({ membership, previousStatus }) => {
                membership.status = previousStatus;
                await membership.save();
            },
            chainSteps: [
                {
                    execute: async ({ membership }) => {
                        await trace.recordMemberRemoved(membership.id, membership.organizationId);
                    },
                    compensate: async ({ membership, chainRole }) => {
                        await trace.recordMemberReactivated(
                            membership.id,
                            chainRole,
                            membership.organizationId,
                        );
                    },
                },
            ],
        });

        return membership;
    }

    /**
     * Updates a member's organization role. The organization creator's role cannot be changed.
     * On-chain role change is recorded only for active memberships.
     */
    public async changeMemberRole(membershipId: string, newRole: OrganizationMembershipRole): Promise<OrganizationMembership | null> {
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership) {
            return null;
        }

        const org = await Organization.findById(membership.organizationId);
        if (org && this.isOrganizationCreator(org, membership.userId)) {
            throw new Error("CANNOT_CHANGE_ORG_CREATOR_ROLE");
        }

        if (membership.organizationRole === newRole) {
            return membership;
        }

        const previousRole = membership.organizationRole;
        const isActiveOnChain = membership.status === OrganizationMembershipStatus.ACTIVE;
        const trace = this.traceability();
        const previousChainRole = this.membershipRoleToChain(previousRole);
        const newChainRole = this.membershipRoleToChain(newRole);

        await executeWithOnChainRollback({
            persist: async () => {
                membership.organizationRole = newRole;
                await membership.save();
                return { membership, previousRole, isActiveOnChain, previousChainRole, newChainRole };
            },
            rollback: async ({ membership, previousRole }) => {
                membership.organizationRole = previousRole;
                await membership.save();
            },
            chainSteps: isActiveOnChain
                ? [
                    {
                        execute: async ({ membership, newChainRole }) => {
                            await trace.recordMemberRoleChanged(
                                membership.id,
                                newChainRole,
                                membership.organizationId,
                            );
                        },
                        compensate: async ({ membership, previousChainRole }) => {
                            await trace.recordMemberRoleChanged(
                                membership.id,
                                previousChainRole,
                                membership.organizationId,
                            );
                        },
                    },
                ]
                : [],
        });

        return membership;
    }

    /**
     * Accepts an invited membership owned by the user.
     */
    public async acceptMembershipInvitation(userId: string, membershipId: string): Promise<InvitationAcceptanceResult | null> {
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.userId !== userId || membership.status !== OrganizationMembershipStatus.INVITED) {
            return null;
        }

        const existingActive = await OrganizationMembership.findActiveMembershipForUser(userId);
        if (existingActive) {
            throw new Error("USER_ALREADY_IN_ORGANIZATION");
        }

        const rejectedInvitations = (await OrganizationMembership.findByUserId(userId)).filter(
            (item) => item.status === OrganizationMembershipStatus.INVITED && item.id !== membershipId,
        );
        const rejectedInvitationSnapshots: MembershipSnapshot[] = rejectedInvitations.map((item) => ({
            id: item.id,
            userId: item.userId,
            organizationId: item.organizationId,
            organizationRole: item.organizationRole,
            status: item.status,
            joinedAt: item.joinedAt,
        }));

        const activeSubscriptions = await Subscription.findActiveByUser(userId);
        if (activeSubscriptions.length > 0) {
            throw new Error("USER_HAS_ACTIVE_SUBSCRIPTIONS");
        }

        const trace = this.traceability();
        const chainRole = this.membershipRoleToChain(membership.organizationRole);

        await executeWithOnChainRollback({
            persist: async () => {
                membership.status = OrganizationMembershipStatus.ACTIVE;
                await membership.save();
                for (const rejectedInvitation of rejectedInvitations) {
                    await rejectedInvitation.delete();
                }
                return { membership, chainRole };
            },
            rollback: async ({ membership }) => {
                membership.status = OrganizationMembershipStatus.INVITED;
                await membership.save();
                for (const rejectedInvitationSnapshot of rejectedInvitationSnapshots) {
                    await this.restoreMembership(rejectedInvitationSnapshot);
                }
            },
            chainSteps: [
                {
                    execute: async ({ membership, chainRole }) => {
                        await trace.recordMemberAdded(
                            membership.organizationId,
                            membership.id,
                            membership.userId,
                            chainRole,
                        );
                    },
                    compensate: async ({ membership }) => {
                        await trace.recordMemberRemoved(membership.id, membership.organizationId);
                    },
                },
            ],
        });

        return {
            acceptedMembership: membership,
            rejectedInvitations,
        };
    }

    public async acceptMembershipInvitationAndNotify(
        userId: string,
        username: string,
        membershipId: string,
        notificationId: string,
    ): Promise<void> {
        const acceptanceResult = await this.acceptMembershipInvitation(userId, membershipId);
        if (!acceptanceResult) {
            return;
        }

        await NotificationService.getInstance().resolveInvitationNotificationsAfterAcceptance(
            userId,
            acceptanceResult.acceptedMembership.id,
            notificationId,
        );

        const acceptedOrg = await Organization.findById(acceptanceResult.acceptedMembership.organizationId);
        if (acceptedOrg) {
            await this.notifyOrganizationAdmins(acceptedOrg.id, {
                type: "organization_member_invitation_accepted",
                organizationName: acceptedOrg.companyName,
                memberName: username,
                info: {
                    message: "An invitation has been accepted.",
                },
            }, userId);
        }

        const notifiedRejectedOrganizations = new Set<string>();
        for (const rejectedInvitation of acceptanceResult.rejectedInvitations) {
            if (
                !rejectedInvitation.organizationId
                || rejectedInvitation.organizationId === acceptanceResult.acceptedMembership.organizationId
            ) {
                continue;
            }
            if (notifiedRejectedOrganizations.has(rejectedInvitation.organizationId)) {
                continue;
            }

            notifiedRejectedOrganizations.add(rejectedInvitation.organizationId);
            const rejectedOrg = await Organization.findById(rejectedInvitation.organizationId);
            if (!rejectedOrg) {
                continue;
            }

            await this.notifyOrganizationAdmins(rejectedOrg.id, {
                type: "organization_member_invitation_rejected",
                organizationName: rejectedOrg.companyName,
                memberName: username,
                info: {
                    message: "An invitation has been rejected.",
                },
            }, userId);
        }
    }

    /**
     * Rejects an invited membership owned by the user and removes it.
     */
    public async rejectMembershipInvitation(userId: string, membershipId: string): Promise<void> {
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership || membership.userId !== userId || membership.status !== OrganizationMembershipStatus.INVITED) {
            return;
        }

        await membership.delete();
    }

    /**
     * Sends a notification to every active organization admin, optionally excluding one user.
     */
    public async notifyOrganizationAdmins(
        organizationId: string,
        data: NotificationData,
        excludeUserId: string = "",
    ): Promise<void> {
        const adminMemberships = await OrganizationMembership.findActiveAdminByOrganization(organizationId);
        for (const adminMembership of adminMemberships) {
            if (adminMembership.userId === excludeUserId) {
                continue;
            }
            const adminUser = await User.findUserByUID(adminMembership.userId);
            if (!adminUser) {
                continue;
            }
            await NotificationService.getInstance().sendNotification(adminUser, data);
        }
    }

    /**
     * Removes a member from the organization and deletes all of their license assignment records.
     */
    public async removeMember(orgId: string, userId: string, membershipId: string): Promise<void> {
        const membership = await OrganizationMembership.findById(membershipId);
        if (!membership) {
            return;
        }

        const org = await Organization.findById(orgId);
        if (org && this.isOrganizationCreator(org, membership.userId)) {
            throw new Error("CANNOT_REMOVE_ORG_CREATOR");
        }

        const membershipSnapshot: MembershipSnapshot = {
            id: membership.id,
            userId: membership.userId,
            organizationId: membership.organizationId,
            organizationRole: membership.organizationRole,
            status: membership.status,
            joinedAt: membership.joinedAt,
        };

        const licenses = await OrganizationLicenseAssignment.findByOrganizationAndUser(orgId, membership.userId);
        const activeLicenses = licenses.filter(l => l.isActive);
        const licenseSnapshots: LicenseSnapshot[] = activeLicenses.map(l => ({
            id: l.id,
            organizationId: l.organizationId,
            userId: l.userId,
            subscriptionId: l.subscriptionId,
            isActive: l.isActive,
        }));

        const trace = this.traceability();
        const chainRole = this.membershipRoleToChain(membership.organizationRole);
        const wasActiveOnChain = membership.status === OrganizationMembershipStatus.ACTIVE;

        const chainSteps: OnChainRollbackStep<{
            membershipSnapshot: MembershipSnapshot;
            licenseSnapshots: LicenseSnapshot[];
            orgId: string;
            chainRole: bigint;
            wasActiveOnChain: boolean;
        }>[] = [];

        if (wasActiveOnChain) {
            chainSteps.push({
                execute: async () => {
                    await trace.recordMemberRemoved(membershipId, orgId);
                },
                compensate: async () => {
                    await trace.recordMemberReactivated(membershipId, chainRole, orgId);
                },
            });
        }

        for (const license of licenseSnapshots) {
            chainSteps.push({
                execute: async () => {
                    await trace.recordLicenseRevoked(license.id, orgId, license.userId);
                },
                compensate: async () => {
                    await trace.recordLicenseReactivated(
                        license.id,
                        license.subscriptionId,
                        orgId,
                        license.userId,
                    );
                },
            });
        }

        await executeWithOnChainRollback({
            persist: async () => {
                for (const license of activeLicenses) {
                    license.isActive = false;
                    await license.save();
                }
                await membership.delete();
                return { membershipSnapshot, licenseSnapshots, orgId, chainRole, wasActiveOnChain };
            },
            rollback: async (ctx) => {
                await this.restoreMembership(ctx.membershipSnapshot);
                for (const snapshot of ctx.licenseSnapshots) {
                    const license = await OrganizationLicenseAssignment.findById(snapshot.id);
                    if (license) {
                        license.isActive = snapshot.isActive;
                        await license.save();
                    }
                }
            },
            chainSteps,
        });

        Monitor.debug(`[ORG] Membership ${membershipId} removed from org ${orgId} by ${userId}`);
    }

    // ---------------------------------------------------------------------------
    // License assignment
    // ---------------------------------------------------------------------------

    /**
     * Assigns a license pool seat to a member.
     * Re-validates seat availability immediately before persisting (race-safe).
     * @throws Error LICENSE_POOL_NOT_FOUND | LICENSE_POOL_NOT_ACTIVE | NO_SEATS_AVAILABLE | LICENSE_ALREADY_ASSIGNED
     */
    public async assignLicense(orgId: string, userId: string, licensePoolId: string, targetUserId: string): Promise<OrganizationLicenseAssignment> {
        const pool = await OrganizationLicensePool.findById(licensePoolId);
        if (!pool || pool.organizationId !== orgId) {
            throw new Error("LICENSE_POOL_NOT_FOUND");
        }

        const poolService = OrganizationLicensePoolService.getInstance();
        if (!(await poolService.isPoolAssignable(pool))) {
            throw new Error("LICENSE_POOL_NOT_ACTIVE");
        }

        const membership = await OrganizationMembership.findByUserAndOrganization(targetUserId, orgId);
        if (!membership || membership.status !== OrganizationMembershipStatus.ACTIVE) {
            throw new Error("MEMBER_NOT_ACTIVE");
        }

        const existing = await OrganizationLicenseAssignment.findByPoolAndUser(licensePoolId, targetUserId);
        if (existing?.isActive) {
            throw new Error("LICENSE_ALREADY_ASSIGNED");
        }

        const activeAssignments = await OrganizationLicenseAssignment.countActiveByPool(licensePoolId);
        if (!poolHasAvailableSeat(pool.seatLimit, activeAssignments)) {
            throw new Error("NO_SEATS_AVAILABLE");
        }

        const subscriptionId = pool.sourceSubscriptionId;
        const trace = this.traceability();
        const isReactivation = !!existing && !existing.isActive;

        const result = await executeWithOnChainRollback({
            persist: async () => {
                if (existing) {
                    existing.isActive = true;
                    existing.subscriptionId = subscriptionId;
                    existing.assignedAt = Date.now();
                    await existing.save();
                    return { assignment: existing, isReactivation, createdNew: false };
                }

                const assignment = await OrganizationLicenseAssignment.create({
                    organizationId: orgId,
                    userId: targetUserId,
                    licensePoolId,
                    subscriptionId,
                });
                return { assignment, isReactivation: false, createdNew: true };
            },
            rollback: async ({ assignment, createdNew }) => {
                if (createdNew) {
                    await assignment.delete();
                } else {
                    assignment.isActive = false;
                    await assignment.save();
                }
            },
            chainSteps: [
                {
                    execute: async ({ assignment, isReactivation }) => {
                        if (isReactivation) {
                            await trace.recordLicenseReactivated(
                                assignment.id,
                                subscriptionId,
                                orgId,
                                targetUserId,
                            );
                        } else {
                            await trace.recordLicenseAssigned(
                                assignment.id,
                                subscriptionId,
                                orgId,
                                targetUserId,
                            );
                        }
                    },
                    compensate: async ({ assignment }) => {
                        await trace.recordLicenseRevoked(assignment.id, orgId, targetUserId);
                    },
                },
            ],
        });

        Monitor.debug(`[ORG] Pool ${licensePoolId} assigned to user ${targetUserId} in org ${orgId} by ${userId}`);
        return result.assignment;
    }

    /**
     * Revokes a license assignment.
     */
    public async revokeLicense(orgId: string, userId: string, licenseAssignmentId: string): Promise<void> {
        const assignment = await OrganizationLicenseAssignment.findById(licenseAssignmentId);
        if (!assignment) {
            return;
        }

        if (!assignment.isActive) {
            return;
        }

        const trace = this.traceability();

        await executeWithOnChainRollback({
            persist: async () => {
                assignment.isActive = false;
                await assignment.save();
                return { assignment };
            },
            rollback: async ({ assignment }) => {
                assignment.isActive = true;
                await assignment.save();
            },
            chainSteps: [
                {
                    execute: async ({ assignment }) => {
                        await trace.recordLicenseRevoked(
                            assignment.id,
                            orgId,
                            assignment.userId,
                        );
                    },
                    compensate: async ({ assignment }) => {
                        await trace.recordLicenseReactivated(
                            assignment.id,
                            assignment.subscriptionId,
                            orgId,
                            assignment.userId,
                        );
                    },
                },
            ],
        });

        Monitor.debug(`[ORG] License assignment ${licenseAssignmentId} revoked in org ${orgId}`);
    }

}
