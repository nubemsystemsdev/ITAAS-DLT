// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

import "./base/BaseContract.sol";
import "./interfaces/ISubscriptionRegistry.sol";

/**
 * SubscriptionRegistry
 *
 * Stores subscriptions and licenses on-chain for traceability.
 * Subscriptions can contain multiple assigned licenses.
 */
contract SubscriptionRegistry is BaseContract, ISubscriptionRegistry {
    /* Contract data */

    struct Subscription {
        bool exists;
        bytes32 subscriberId;
        SUBSCRIPTION_STATUS status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct License {
        bool exists;
        bytes32 subscriptionId;
        LICENSE_STATUS status;
        uint256 assignedAt;
        uint256 revokedAt;
    }

    mapping(bytes32 => Subscription) private _subscriptionById;
    mapping(bytes32 => License) private _licenseById;

    /* Modifiers */

    modifier validSubscriptionId(bytes32 subscriptionId) {
        require(subscriptionId != bytes32(0), "Invalid subscriptionId");
        _;
    }

    modifier validSubscriberId(bytes32 subscriberId) {
        require(subscriberId != bytes32(0), "Invalid subscriberId");
        _;
    }

    modifier subscriptionNotExists(bytes32 subscriptionId) {
        require(!_subscriptionById[subscriptionId].exists, "Duplicated subscriptionId");
        _;
    }

    modifier activeSubscription(bytes32 subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];
        require(sub.exists, "Subscription not found");
        require(sub.status == SUBSCRIPTION_STATUS.ACTIVE, "Not active");
        _;
    }

    modifier suspendedSubscription(bytes32 subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];
        require(sub.exists, "Subscription not found");
        require(sub.status == SUBSCRIPTION_STATUS.SUSPENDED, "Not suspended");
        _;
    }

    modifier cancellableSubscription(bytes32 subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];
        require(sub.exists, "Subscription not found");
        require(
            sub.status == SUBSCRIPTION_STATUS.ACTIVE || sub.status == SUBSCRIPTION_STATUS.SUSPENDED,
            "Not cancellable"
        );
        _;
    }

    modifier validLicenseId(bytes32 licenseId) {
        require(licenseId != bytes32(0), "Invalid licenseId");
        _;
    }

    modifier licenseNotExists(bytes32 licenseId) {
        require(!_licenseById[licenseId].exists, "Duplicated licenseId");
        _;
    }

    modifier activeSubscriptionForLicense(bytes32 subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];
        require(sub.exists, "Subscription not found");
        require(sub.status == SUBSCRIPTION_STATUS.ACTIVE, "Subscription not active");
        _;
    }

    modifier activeLicense(bytes32 licenseId) {
        License storage lic = _licenseById[licenseId];
        require(lic.exists, "License not found");
        require(lic.status == LICENSE_STATUS.ACTIVE, "Not active");
        _;
    }

    modifier revokedLicense(bytes32 licenseId) {
        License storage lic = _licenseById[licenseId];
        require(lic.exists, "License not found");
        require(lic.status == LICENSE_STATUS.REVOKED, "Not revoked");
        _;
    }

    /* Constructor */

    constructor() {}

    /* Initializer */

    /**
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     */
    function initialize(
        address roleManagerAddress,
        address upgradeControlAddress
    ) public reinitializer(1) {
        _initialize_base(roleManagerAddress, upgradeControlAddress);
    }

    /* View functions */

    function getSubscription(
        bytes32 subscriptionId
    )
        public
        view
        override
        returns (
            bool exists,
            bytes32 subscriberId,
            SUBSCRIPTION_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        Subscription storage sub = _subscriptionById[subscriptionId];

        return (
            sub.exists,
            sub.subscriberId,
            sub.status,
            sub.createdAt,
            sub.updatedAt
        );
    }

    function getLicense(
        bytes32 licenseId
    )
        public
        view
        override
        returns (
            bool exists,
            bytes32 subscriptionId,
            LICENSE_STATUS status,
            uint256 assignedAt,
            uint256 revokedAt
        )
    {
        License storage lic = _licenseById[licenseId];

        return (
            lic.exists,
            lic.subscriptionId,
            lic.status,
            lic.assignedAt,
            lic.revokedAt
        );
    }

    /* Transaction functions */

    function createSubscription(
        bytes32 subscriptionId,
        bytes32 subscriberId
    )
        public
        override
        whenNotPaused
        onlyAdmin
        validSubscriptionId(subscriptionId)
        validSubscriberId(subscriberId)
        subscriptionNotExists(subscriptionId)
    {

        _subscriptionById[subscriptionId] = Subscription({
            exists: true,
            subscriberId: subscriberId,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit SubscriptionCreated(subscriptionId, subscriberId);
    }

    function renewSubscription(bytes32 subscriptionId) public override whenNotPaused onlyAdmin activeSubscription(subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];

        sub.updatedAt = block.timestamp;

        emit SubscriptionRenewed(subscriptionId);
    }

    function changeSubscription(
        bytes32 subscriptionId,
        bytes32 subscriberId
    )
        public
        whenNotPaused
        onlyAdmin
        validSubscriptionId(subscriptionId)
        validSubscriberId(subscriberId)
        subscriptionNotExists(subscriptionId)
    {

        _subscriptionById[subscriptionId] = Subscription({
            exists: true,
            subscriberId: subscriberId,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit SubscriptionChanged(subscriptionId);
    }

    function cancelSubscription(bytes32 subscriptionId) public override whenNotPaused onlyAdmin cancellableSubscription(subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];

        sub.status = SUBSCRIPTION_STATUS.CANCELLED;
        sub.updatedAt = block.timestamp;

        emit SubscriptionCancelled(subscriptionId);
    }

    function suspendSubscription(bytes32 subscriptionId) public override whenNotPaused onlyAdmin activeSubscription(subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];

        sub.status = SUBSCRIPTION_STATUS.SUSPENDED;
        sub.updatedAt = block.timestamp;

        emit SubscriptionSuspended(subscriptionId);
    }

    function reactivateSubscription(bytes32 subscriptionId) public override whenNotPaused onlyAdmin suspendedSubscription(subscriptionId) {
        Subscription storage sub = _subscriptionById[subscriptionId];

        sub.status = SUBSCRIPTION_STATUS.ACTIVE;
        sub.updatedAt = block.timestamp;

        emit SubscriptionReactivated(subscriptionId);
    }

    function assignLicense(
        bytes32 licenseId,
        bytes32 subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    )
        public
        override
        whenNotPaused
        onlyAdmin
        validLicenseId(licenseId)
        licenseNotExists(licenseId)
        activeSubscriptionForLicense(subscriptionId)
    {

        _licenseById[licenseId] = License({
            exists: true,
            subscriptionId: subscriptionId,
            status: LICENSE_STATUS.ACTIVE,
            assignedAt: block.timestamp,
            revokedAt: 0
        });

        emit LicenseAssigned(licenseId, subscriptionId, organizationId, userId);
    }

    function revokeLicense(
        bytes32 licenseId,
        bytes32 organizationId,
        bytes32 userId
    )
        public
        override
        whenNotPaused
        onlyAdmin
        activeLicense(licenseId)
    {
        License storage lic = _licenseById[licenseId];

        lic.status = LICENSE_STATUS.REVOKED;
        lic.revokedAt = block.timestamp;

        emit LicenseRevoked(licenseId, organizationId, userId);
    }

    function reactivateLicense(
        bytes32 licenseId,
        bytes32 subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    )
        public
        override
        whenNotPaused
        onlyAdmin
        revokedLicense(licenseId)
        activeSubscriptionForLicense(subscriptionId)
    {
        License storage lic = _licenseById[licenseId];

        require(lic.subscriptionId == subscriptionId, "Subscription mismatch");

        lic.status = LICENSE_STATUS.ACTIVE;
        lic.assignedAt = block.timestamp;
        lic.revokedAt = 0;

        emit LicenseReactivated(licenseId, subscriptionId, organizationId, userId);
    }
}
