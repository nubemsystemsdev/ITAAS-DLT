// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

/**
 * Organization registry (Interface)
 *
 * Stores organizations and memberships on-chain for traceability.
 * Admins are tracked as active memberships with the ADMIN role.
 */
interface IOrganizationRegistry {
    enum ORG_STATUS {
        ACTIVE,
        DEACTIVATED
    }

    enum MEMBER_ROLE {
        ADMIN,
        MEMBER
    }

    enum MEMBER_STATUS {
        ACTIVE,
        INACTIVE
    }

    event OrganizationRegistered(bytes32 indexed organizationId);

    event OrganizationDeactivated(bytes32 indexed organizationId);

    event OrganizationReactivated(bytes32 indexed organizationId);

    event MemberAdded(
        bytes32 indexed organizationId,
        bytes32 indexed membershipId,
        bytes32 userId,
        MEMBER_ROLE role
    );

    event MemberReactivated(
        bytes32 indexed organizationId,
        bytes32 indexed membershipId,
        bytes32 userId,
        MEMBER_ROLE role
    );

    event MemberRemoved(
        bytes32 indexed organizationId,
        bytes32 indexed membershipId,
        bytes32 userId
    );

    event MemberRoleChanged(
        bytes32 indexed organizationId,
        bytes32 indexed membershipId,
        bytes32 userId,
        MEMBER_ROLE newRole
    );

    function getOrganization(
        bytes32 organizationId
    )
        external
        view
        returns (
            bool exists,
            ORG_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        );

    function getMembership(
        bytes32 membershipId
    )
        external
        view
        returns (
            bool exists,
            bytes32 organizationId,
            bytes32 userId,
            MEMBER_ROLE role,
            MEMBER_STATUS status,
            uint256 joinedAt,
            uint256 updatedAt
        );

    function isOrgAdmin(bytes32 organizationId, bytes32 userId) external view returns (bool admin);

    function registerOrganization(bytes32 organizationId) external;

    function deactivateOrganization(bytes32 organizationId) external;

    function reactivateOrganization(bytes32 organizationId) external;

    function addMember(
        bytes32 organizationId,
        bytes32 membershipId,
        bytes32 userId,
        MEMBER_ROLE role
    ) external;

    function reactivateMember(bytes32 membershipId, MEMBER_ROLE role) external;

    function removeMember(bytes32 membershipId) external;

    function changeMemberRole(bytes32 membershipId, MEMBER_ROLE newRole) external;
}
