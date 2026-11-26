// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUnifiedVCManager {
    event CredentialIssued(bytes32 indexed credentialId, address indexed owner, address indexed admin);
    event CredentialRevoked(bytes32 indexed credentialId, address indexed admin);
    event AdminAdded(address indexed newAdmin, address indexed addedBy);
    event AdminRemoved(address indexed removedAdmin, address indexed removedBy);

    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function issueCredential(bytes32 credentialId, address owner) external;
    function revokeCredential(bytes32 credentialId) external;
    function isRevoked(bytes32 credentialId) external view returns (bool);
    function isAdmin(address account) external view returns (bool);
}
