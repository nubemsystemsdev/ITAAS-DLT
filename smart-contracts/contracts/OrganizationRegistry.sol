// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

import "./base/BaseContract.sol";
import "./interfaces/IOrganizationRegistry.sol";

/**
 * OrganizationRegistry
 *
 * Stores organizations and memberships on-chain for traceability.
 * Admins are active memberships with the ADMIN role.
 */
contract OrganizationRegistry is BaseContract, IOrganizationRegistry {
    /* Contract data */

    struct Organization {
        bool exists;
        ORG_STATUS status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Membership {
        bool exists;
        bytes32 organizationId;
        bytes32 userId;
        MEMBER_ROLE role;
        MEMBER_STATUS status;
        uint256 joinedAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => Organization) private _organizationById;
    mapping(bytes32 => Membership) private _membershipById;
    mapping(bytes32 => mapping(bytes32 => bytes32)) private _membershipIdByOrgAndUser;

    /* Modifiers */

    modifier validOrganizationId(bytes32 organizationId) {
        require(organizationId != bytes32(0), "Invalid organizationId");
        _;
    }

    modifier validMembershipId(bytes32 membershipId) {
        require(membershipId != bytes32(0), "Invalid membershipId");
        _;
    }

    modifier validUserId(bytes32 userId) {
        require(userId != bytes32(0), "Invalid userId");
        _;
    }

    modifier organizationNotExists(bytes32 organizationId) {
        require(!_organizationById[organizationId].exists, "Duplicated organizationId");
        _;
    }

    modifier existingOrganization(bytes32 organizationId) {
        require(_organizationById[organizationId].exists, "Organization not found");
        _;
    }

    modifier activeOrganization(bytes32 organizationId) {
        Organization storage org = _organizationById[organizationId];
        require(org.exists, "Organization not found");
        require(org.status == ORG_STATUS.ACTIVE, "Organization not active");
        _;
    }

    modifier deactivatedOrganization(bytes32 organizationId) {
        Organization storage org = _organizationById[organizationId];
        require(org.exists, "Organization not found");
        require(org.status == ORG_STATUS.DEACTIVATED, "Organization not deactivated");
        _;
    }

    modifier membershipNotExists(bytes32 membershipId) {
        require(!_membershipById[membershipId].exists, "Duplicated membershipId");
        _;
    }

    modifier existingMembership(bytes32 membershipId) {
        require(_membershipById[membershipId].exists, "Membership not found");
        _;
    }

    modifier activeMembership(bytes32 membershipId) {
        Membership storage membership = _membershipById[membershipId];
        require(membership.exists, "Membership not found");
        require(membership.status == MEMBER_STATUS.ACTIVE, "Membership not active");
        _;
    }

    modifier inactiveMembership(bytes32 membershipId) {
        Membership storage membership = _membershipById[membershipId];
        require(membership.exists, "Membership not found");
        require(membership.status == MEMBER_STATUS.INACTIVE, "Membership not inactive");
        _;
    }

    modifier noActiveMemberForUser(bytes32 organizationId, bytes32 userId) {
        require(
            _activeMembershipIdForUser(organizationId, userId) == bytes32(0),
            "Active membership exists for user"
        );
        _;
    }

    /* Constructor */

    constructor() {}

    /* Initializer */

    function initialize(
        address roleManagerAddress,
        address upgradeControlAddress
    ) public reinitializer(1) {
        _initialize_base(roleManagerAddress, upgradeControlAddress);
    }

    /* View functions */

    function getOrganization(
        bytes32 organizationId
    )
        public
        view
        override
        returns (
            bool exists,
            ORG_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        Organization storage org = _organizationById[organizationId];

        return (
            org.exists,
            org.status,
            org.createdAt,
            org.updatedAt
        );
    }

    function getMembership(
        bytes32 membershipId
    )
        public
        view
        override
        returns (
            bool exists,
            bytes32 organizationId,
            bytes32 userId,
            MEMBER_ROLE role,
            MEMBER_STATUS status,
            uint256 joinedAt,
            uint256 updatedAt
        )
    {
        Membership storage membership = _membershipById[membershipId];

        return (
            membership.exists,
            membership.organizationId,
            membership.userId,
            membership.role,
            membership.status,
            membership.joinedAt,
            membership.updatedAt
        );
    }

    function isOrgAdmin(bytes32 organizationId, bytes32 userId) public view override returns (bool admin) {
        bytes32 membershipId = _membershipIdByOrgAndUser[organizationId][userId];
        Membership storage membership = _membershipById[membershipId];

        return membership.exists
            && membership.status == MEMBER_STATUS.ACTIVE
            && membership.role == MEMBER_ROLE.ADMIN;
    }

    function _activeMembershipIdForUser(
        bytes32 organizationId,
        bytes32 userId
    ) internal view returns (bytes32 membershipId) {
        membershipId = _membershipIdByOrgAndUser[organizationId][userId];

        if (membershipId == bytes32(0)) {
            return bytes32(0);
        }

        Membership storage membership = _membershipById[membershipId];

        if (membership.exists && membership.status == MEMBER_STATUS.ACTIVE) {
            return membershipId;
        }

        return bytes32(0);
    }

    /* Transaction functions */

    function registerOrganization(bytes32 organizationId)
        public
        override
        whenNotPaused
        onlyAdmin
        validOrganizationId(organizationId)
        organizationNotExists(organizationId)
    {
        _organizationById[organizationId] = Organization({
            exists: true,
            status: ORG_STATUS.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit OrganizationRegistered(organizationId);
    }

    function deactivateOrganization(bytes32 organizationId)
        public
        override
        whenNotPaused
        onlyAdmin
        activeOrganization(organizationId)
    {
        Organization storage org = _organizationById[organizationId];

        org.status = ORG_STATUS.DEACTIVATED;
        org.updatedAt = block.timestamp;

        emit OrganizationDeactivated(organizationId);
    }

    function reactivateOrganization(bytes32 organizationId)
        public
        override
        whenNotPaused
        onlyAdmin
        deactivatedOrganization(organizationId)
    {
        Organization storage org = _organizationById[organizationId];

        org.status = ORG_STATUS.ACTIVE;
        org.updatedAt = block.timestamp;

        emit OrganizationReactivated(organizationId);
    }

    function addMember(
        bytes32 organizationId,
        bytes32 membershipId,
        bytes32 userId,
        MEMBER_ROLE role
    )
        public
        override
        whenNotPaused
        onlyAdmin
        validOrganizationId(organizationId)
        validMembershipId(membershipId)
        validUserId(userId)
        activeOrganization(organizationId)
        membershipNotExists(membershipId)
        noActiveMemberForUser(organizationId, userId)
    {
        _membershipById[membershipId] = Membership({
            exists: true,
            organizationId: organizationId,
            userId: userId,
            role: role,
            status: MEMBER_STATUS.ACTIVE,
            joinedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _membershipIdByOrgAndUser[organizationId][userId] = membershipId;

        emit MemberAdded(organizationId, membershipId, userId, role);
    }

    function reactivateMember(bytes32 membershipId, MEMBER_ROLE role)
        public
        override
        whenNotPaused
        onlyAdmin
        inactiveMembership(membershipId)
    {
        Membership storage membership = _membershipById[membershipId];

        Organization storage org = _organizationById[membership.organizationId];
        require(org.exists, "Organization not found");
        require(org.status == ORG_STATUS.ACTIVE, "Organization not active");
        require(
            _activeMembershipIdForUser(membership.organizationId, membership.userId) == bytes32(0),
            "Active membership exists for user"
        );

        membership.role = role;
        membership.status = MEMBER_STATUS.ACTIVE;
        membership.updatedAt = block.timestamp;

        _membershipIdByOrgAndUser[membership.organizationId][membership.userId] = membershipId;

        emit MemberReactivated(membership.organizationId, membershipId, membership.userId, role);
    }

    function removeMember(bytes32 membershipId)
        public
        override
        whenNotPaused
        onlyAdmin
        activeMembership(membershipId)
    {
        Membership storage membership = _membershipById[membershipId];

        membership.status = MEMBER_STATUS.INACTIVE;
        membership.updatedAt = block.timestamp;

        if (
            _membershipIdByOrgAndUser[membership.organizationId][membership.userId] == membershipId
        ) {
            delete _membershipIdByOrgAndUser[membership.organizationId][membership.userId];
        }

        emit MemberRemoved(membership.organizationId, membershipId, membership.userId);
    }

    function changeMemberRole(bytes32 membershipId, MEMBER_ROLE newRole)
        public
        override
        whenNotPaused
        onlyAdmin
        activeMembership(membershipId)
    {
        Membership storage membership = _membershipById[membershipId];

        membership.role = newRole;
        membership.updatedAt = block.timestamp;

        emit MemberRoleChanged(membership.organizationId, membershipId, membership.userId, newRole);
    }
}
