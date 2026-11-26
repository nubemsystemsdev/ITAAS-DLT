// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * Ownable with administrators.
 */
contract OwnableFlexible {
    /* Custom Errors */

    /// @notice Caller is not an administrator
    error NotAdmin();

    /// @notice Caller is not root
    error NotRoot();

    /// @notice New root is the zero address
    error RootZeroAddress();

    /// @notice Address is already an administrator
    error AlreadyAdmin();

    /// @notice Address is not an administrator
    error NotAnAdmin();

    /// @notice Root cannot be revoked from administrator role
    error CannotRevokeRootAdmin();

    address public root; // Owner of the contract, the creator
    mapping (address => bool) public administrators; // Administrators.

    /**
     * Root change event
     * @param _root New root address
     */
    event RootChanged (address indexed _root);

    /**
     * Admin granted event
     * @param _admin Admin address
     */
    event AdminGranted (address indexed _admin);

    /**
     * Admin revoked event
     * @param _admin Admin address
     */
    event AdminRevoked (address indexed _admin);

    /* Modifier to check the sender is an admin */
    modifier onlyAdmin() {
        if (!administrators[msg.sender]) revert NotAdmin();
        _;
    }

    /* Modifier to check the sender is root */
    modifier onlyRoot() {
        if (root != msg.sender) revert NotRoot();
        _;
    }

    /**
     * Init function (call in constructor)
     */
    function _init_ownable() internal {
        root = msg.sender;
        administrators[root] = true;

        emit RootChanged(root);
        emit AdminGranted(root);
    }

    /**
     * Transfers the ownership of the smart contract.
     * @param _address The address to transfer the ownership.
     */
    function transferRoot(address _address) public onlyRoot {
        if (_address == address(0)) revert RootZeroAddress();
        root = _address;
        administrators[_address] = true;

        emit RootChanged(_address);
        emit AdminGranted(_address);
    }

    /**
     * Grants administration permissions on the smart contract.
     * @param _address The account address.
     */
    function grantAdmin(address _address) public onlyAdmin {
        if (administrators[_address]) revert AlreadyAdmin();
        administrators[_address] = true;

        emit AdminGranted(_address);
    }

    /**
     * Revokes administation permissions.
     * @param _address The account address.
     */
    function revokeAdmin(address _address) public onlyAdmin {
        if (!administrators[_address]) revert NotAnAdmin();
        if (root == _address) revert CannotRevokeRootAdmin();
        administrators[_address] = false;

        emit AdminRevoked(_address);
    }
}
