import type { MemberItem } from "@/api/definitions";
import { OrganizationController } from "@/control/organization";
import { AuthController } from "@/control/auth";
import { truncateMiddle } from "@/utils/text";

export type TranslateFn = (key: string) => string;

export function memberRoleLabel(role: string, t: TranslateFn): string {
    const normalized = (role || "").toLowerCase();
    if (normalized === "admin") {
        return t("Organization admin");
    }
    if (normalized === "member") {
        return t("Member");
    }
    return role || "—";
}

export function memberStatusLabel(status: string, t: TranslateFn): string {
    const normalized = (status || "").toLowerCase();
    if (normalized === "active") {
        return t("Active");
    }
    if (normalized === "invited") {
        return t("Invited");
    }
    if (normalized === "inactive") {
        return t("Inactive");
    }
    return status || "—";
}

export function isInactiveMemberStatus(status: string): boolean {
    return (status || "").toLowerCase() === "inactive";
}

export function isActiveMemberStatus(status: string): boolean {
    return (status || "").toLowerCase() === "active";
}

export function memberDisplayName(member: MemberItem): string {
    if (member.username) {
        return member.username;
    }
    if (member.userId) {
        return truncateMiddle(member.userId, 24);
    }
    return "—";
}

/** Whether an org admin may change this member's role (not the organization creator). */
export function canChangeOrganizationMemberRole(member: MemberItem): boolean {
    if (!member?.id) {
        return false;
    }
    if (OrganizationController.isOrganizationCreator(member.userId)) {
        return false;
    }
    return true;
}

/** Whether an org admin may deactivate or remove this member. */
export function canModifyOrganizationMember(member: MemberItem): boolean {
    if (!member?.id) {
        return false;
    }
    if (member.userId === AuthController.UID) {
        return false;
    }
    if (OrganizationController.isOrganizationCreator(member.userId)) {
        return false;
    }
    return true;
}
