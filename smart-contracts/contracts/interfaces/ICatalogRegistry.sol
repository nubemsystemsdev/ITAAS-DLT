// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

/**
 * Catalog registry (Interface)
 *
 * Tracks ITAAS catalog items for traceability.
 * Supports publication, updates, withdrawals and visibility changes.
 */
interface ICatalogRegistry {
    enum CATALOG_ITEM_STATUS {
        PUBLISHED,
        WITHDRAWN
    }

    enum VISIBILITY {
        PUBLIC,
        PRIVATE
    }

    /**
     * CatalogItemCreated - A new catalog item was created
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     */
    event CatalogItemCreated(
        bytes32 indexed itemId,
        VISIBILITY visibility
    );

    /**
     * CatalogItemPublished - A new catalog item was published
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     */
    event CatalogItemPublished(
        bytes32 indexed itemId,
        VISIBILITY visibility
    );

    /**
     * CatalogItemUpdated - An existing catalog item was updated
     * @param itemId The catalog item identifier
     */
    event CatalogItemUpdated(
        bytes32 indexed itemId
    );

    /**
     * CatalogItemWithdrawn - A published catalog item was withdrawn
     * @param itemId The catalog item identifier
     */
    event CatalogItemWithdrawn(
        bytes32 indexed itemId
    );

    /**
     * CatalogItemDeleted - A catalog item was deleted
     * @param itemId The catalog item identifier
     */
    event CatalogItemDeleted(
        bytes32 indexed itemId
    );

    /**
     * Checks if a catalog item exists
     * @param itemId The catalog item identifier
     * @return exists True if the item exists
     */
    function itemExists(bytes32 itemId) external view returns (bool exists);

    /**
     * Gets catalog item details
     * @param itemId The catalog item identifier
     * @return exists Whether the item exists
     * @return visibility Current visibility setting
     * @return status Current item status
     * @return createdAt Block timestamp when created
     * @return updatedAt Block timestamp when last updated
     */
    function getItem(
        bytes32 itemId
    )
        external
        view
        returns (
            bool exists,
            VISIBILITY visibility,
            CATALOG_ITEM_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        );

    /**
     * Creates a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     */
    function createItem(bytes32 itemId, VISIBILITY visibility) external;

    /**
     * Publishes a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     */
    function publishItem(bytes32 itemId, VISIBILITY visibility) external;

    /**
     * Updates an existing catalog item
     * @param itemId The catalog item identifier
     */
    function updateItem(bytes32 itemId) external;

    /**
     * Withdraws a published catalog item
     * @param itemId The catalog item identifier
     */
    function withdrawItem(bytes32 itemId) external;

    /**
     * Deletes a catalog item
     * @param itemId The catalog item identifier
     */
    function deleteItem(bytes32 itemId) external;
}
