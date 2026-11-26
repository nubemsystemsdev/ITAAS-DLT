// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IUnifiedVCManager.sol";

contract UnifiedVCManager is IUnifiedVCManager {
    mapping(bytes32 => bool) private _revokedCredentials;
    mapping(bytes32 => address) private _credentialOwners;
    mapping(address => bool) private _admins;
    bool private _initialized; 

    modifier onlyAdmin() {
        require(_admins[msg.sender], "Access denied: Administrator role required");
        _;
    }

    function initialize(address initialAdmin) public {
        require(!_initialized, "The contract has already been initialized");
        require(initialAdmin != address(0), "Invalid address");
        _admins[initialAdmin] = true;
        _initialized = true;
    }

    /**
     * @dev Add a new administrator to the system.
     */
    function addAdmin(address account) public onlyAdmin {
        require(account != address(0), "Invalid administrator address");
        _admins[account] = true;
        emit AdminAdded(account, msg.sender);
    }


    function removeAdmin(address account) public onlyAdmin {
        require(account != address(0), "Invalid administrator address");
        require(_admins[account], "The account is not an administrator");
        _admins[account] = false;
        emit AdminRemoved(account, msg.sender);
    }

    /**
     * @dev Issues a credential. Can only be executed by an Administrator..
     */
    function issueCredential(bytes32 credentialId, address owner) public onlyAdmin {
        require(credentialId != bytes32(0), "Invalid credential ID");
        require(owner != address(0), "Invalid owner's address");
        require(_credentialOwners[credentialId] == address(0), "The credential has already been issued");

        _credentialOwners[credentialId] = owner;
        _revokedCredentials[credentialId] = false;

        emit CredentialIssued(credentialId, owner, msg.sender);
    }

    /**
     * @dev Revoke a credential. This can be done by an Admin or the owner..
     */
    function revokeCredential(bytes32 credentialId) public {
        require(credentialId != bytes32(0), "Invalid credential ID");
        require(_credentialOwners[credentialId] != address(0), "The credential does not exist");
        
        
        require(_admins[msg.sender] || msg.sender == _credentialOwners[credentialId], 
                "Unauthorized: Only the administrator or owner can revoke");

        _revokedCredentials[credentialId] = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    function isRevoked(bytes32 credentialId) public view returns (bool) {
        return _revokedCredentials[credentialId];
    }

    function isAdmin(address account) public view returns (bool) {
        return _admins[account];
    }
}
