// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

import "./base/BaseContract.sol";
import "./interfaces/ICatalogRegistry.sol";

/**
 * CatalogRegistry
 *
 * Stores ITAAS catalog items on-chain for traceability.
 * Supports publication, updates, withdrawals and visibility changes.
 */
contract CatalogRegistry is BaseContract, ICatalogRegistry {
    /* Contract data */

    struct CatalogItem {
        bool exists;
        VISIBILITY visibility;
        CATALOG_ITEM_STATUS status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => CatalogItem) private _itemById;

    /* Modifiers */

    modifier validItemId(bytes32 itemId) {
        require(itemId != bytes32(0), "Invalid itemId");
        _;
    }

    modifier itemNotExists(bytes32 itemId) {
        require(!_itemById[itemId].exists, "Duplicated itemId");
        _;
    }

    modifier existingItem(bytes32 itemId) {
        require(_itemById[itemId].exists, "Item not found");
        _;
    }

    modifier publishedItem(bytes32 itemId) {
        CatalogItem storage item = _itemById[itemId];
        require(item.exists, "Item not found");
        require(item.status == CATALOG_ITEM_STATUS.PUBLISHED, "Not published");
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

    function itemExists(bytes32 itemId) public view override returns (bool exists) {
        return _itemById[itemId].exists;
    }

    function getItem(
        bytes32 itemId
    )
        public
        view
        override
        returns (
            bool exists,
            VISIBILITY visibility,
            CATALOG_ITEM_STATUS status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        CatalogItem storage item = _itemById[itemId];

        return (
            item.exists,
            item.visibility,
            item.status,
            item.createdAt,
            item.updatedAt
        );
    }

    /* Transaction functions */

    function createItem(bytes32 itemId, VISIBILITY visibility)
        public
        override
        whenNotPaused
        onlyAdmin
        validItemId(itemId)
        itemNotExists(itemId)
    {
        _itemById[itemId] = CatalogItem({
            exists: true,
            visibility: visibility,
            status: CATALOG_ITEM_STATUS.WITHDRAWN,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit CatalogItemCreated(itemId, visibility);
    }

    function publishItem(bytes32 itemId, VISIBILITY visibility)
        public
        override
        whenNotPaused
        onlyAdmin
        validItemId(itemId)
    {
        CatalogItem storage item = _itemById[itemId];

        if (!item.exists) {
            _itemById[itemId] = CatalogItem({
                exists: true,
                visibility: visibility,
                status: CATALOG_ITEM_STATUS.PUBLISHED,
                createdAt: block.timestamp,
                updatedAt: block.timestamp
            });
        } else {
            item.visibility = visibility;
            item.status = CATALOG_ITEM_STATUS.PUBLISHED;
            item.updatedAt = block.timestamp;
        }

        emit CatalogItemPublished(itemId, visibility);
    }

    function updateItem(bytes32 itemId) public override whenNotPaused onlyAdmin publishedItem(itemId) {
        CatalogItem storage item = _itemById[itemId];

        item.updatedAt = block.timestamp;

        emit CatalogItemUpdated(itemId);
    }

    function withdrawItem(bytes32 itemId) public override whenNotPaused onlyAdmin publishedItem(itemId) {
        CatalogItem storage item = _itemById[itemId];

        item.status = CATALOG_ITEM_STATUS.WITHDRAWN;
        item.updatedAt = block.timestamp;

        emit CatalogItemWithdrawn(itemId);
    }

    function deleteItem(bytes32 itemId) public override whenNotPaused onlyAdmin validItemId(itemId) {
        if (_itemById[itemId].exists) {
            delete _itemById[itemId];
        }

        emit CatalogItemDeleted(itemId);
    }
}
