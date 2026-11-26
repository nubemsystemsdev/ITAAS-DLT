// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

/**
 * Subscription registry (Interface)
 *
 * Tracks subscriptions and licenses for traceability.
 * Subscriptions can be created, renewed and cancelled.
 * Licenses can be assigned and revoked within active subscriptions.
 */
interface ISubscriptionRegistry {
    enum SUBSCRIPTION_STATUS {
        ACTIVE,
        CANCELLED,
        SUSPENDED
    }

    enum LICENSE_STATUS {
        ACTIVE,
        REVOKED
    }

    /**
     * SubscriptionCreated - A new subscription was created
     * @param subscriptionId The subscription identifier
     * @param subscriberId Subscriber identifier hash
     */
    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        bytes32 subscriberId
    );

    /**
     * SubscriptionRenewed - An active subscription was renewed
     * @param subscriptionId The subscription identifier
     */
    event SubscriptionRenewed(
        bytes32 indexed subscriptionId
    );

    /**
     * SubscriptionChanged - An active subscription was changed
     * @param subscriptionId The subscription identifier
     */
    event SubscriptionChanged(
        bytes32 indexed subscriptionId
    );

    /**
     * SubscriptionCancelled - An active subscription was cancelled
     * @param subscriptionId The subscription identifier
     */
    event SubscriptionCancelled(
        bytes32 indexed subscriptionId
    );

    /**
     * SubscriptionSuspended - An active subscription was suspended
     * @param subscriptionId The subscription identifier
     */
    event SubscriptionSuspended(
        bytes32 indexed subscriptionId
    );

    /**
     * SubscriptionReactivated - A suspended subscription was reactivated
     * @param subscriptionId The subscription identifier
     */
    event SubscriptionReactivated(
        bytes32 indexed subscriptionId
    );

    /**
     * LicenseAssigned - A license was assigned within an active subscription
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     */
    event LicenseAssigned(
        bytes32 indexed licenseId,
        bytes32 indexed subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    );

    /**
     * LicenseRevoked - An active license was revoked
     * @param licenseId The license identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license was assigned to
     */
    event LicenseRevoked(
        bytes32 indexed licenseId,
        bytes32 organizationId,
        bytes32 userId
    );

    /**
     * LicenseReactivated - A revoked license was reactivated
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     */
    event LicenseReactivated(
        bytes32 indexed licenseId,
        bytes32 indexed subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    );

    /**
     * Gets subscription details
     * @param subscriptionId The subscription identifier
     * @return exists Whether the subscription exists
     * @return subscriberId Subscriber identifier hash
     * @return status Current subscription status
     * @return createdAt Block timestamp when created
     * @return updatedAt Block timestamp when last updated
     */
    function getSubscription(
        bytes32 subscriptionId
    )
        external
        view
        returns (
            bool exists,
            bytes32 subscriberId,
            SUBSCRIPTION_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        );

    /**
     * Gets license details
     * @param licenseId The license identifier
     * @return exists Whether the license exists
     * @return subscriptionId Parent subscription identifier
     * @return status Current license status
     * @return assignedAt Block timestamp when assigned
     * @return revokedAt Block timestamp when revoked (0 if active)
     */
    function getLicense(
        bytes32 licenseId
    )
        external
        view
        returns (
            bool exists,
            bytes32 subscriptionId,
            LICENSE_STATUS status,
            uint256 assignedAt,
            uint256 revokedAt
        );

    /**
     * Creates a new subscription
     * @param subscriptionId The subscription identifier
     * @param subscriberId Subscriber identifier hash
     */
    function createSubscription(
        bytes32 subscriptionId,
        bytes32 subscriberId
    ) external;

    /**
     * Renews an active subscription
     * @param subscriptionId The subscription identifier
     */
    function renewSubscription(bytes32 subscriptionId) external;

    /**
     * Cancels an active subscription
     * @param subscriptionId The subscription identifier
     */
    function cancelSubscription(bytes32 subscriptionId) external;

    /**
     * Suspends an active subscription
     * @param subscriptionId The subscription identifier
     */
    function suspendSubscription(bytes32 subscriptionId) external;

    /**
     * Reactivates a suspended subscription
     * @param subscriptionId The subscription identifier
     */
    function reactivateSubscription(bytes32 subscriptionId) external;

    /**
     * Assigns a license within an active subscription
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     */
    function assignLicense(
        bytes32 licenseId,
        bytes32 subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    ) external;

    /**
     * Revokes an active license
     * @param licenseId The license identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license was assigned to
     */
    function revokeLicense(
        bytes32 licenseId,
        bytes32 organizationId,
        bytes32 userId
    ) external;

    /**
     * Reactivates a revoked license
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     */
    function reactivateLicense(
        bytes32 licenseId,
        bytes32 subscriptionId,
        bytes32 organizationId,
        bytes32 userId
    ) external;
}
