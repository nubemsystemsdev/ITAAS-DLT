/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.24;

contract EthereumDIDRegistry {

  mapping(address => address) public owners;
  mapping(address => mapping(bytes32 => mapping(address => uint))) public delegates;
  mapping(address => uint) public changed;
  mapping(address => uint) public nonce;

  modifier onlyOwner(address identity, address actor) {
    require (actor == identityOwner(identity), "bad_actor");
    _;
  }

  /**
   * @dev Initializes the DID Registry. No-op for this contract; used for deployment flow compatibility.
   */
  function initialize() public {}

  event DIDOwnerChanged(
    address indexed identity,
    address owner,
    uint previousChange
  );

  event DIDDelegateChanged(
    address indexed identity,
    bytes32 delegateType,
    address delegate,
    uint validTo,
    uint previousChange
  );

  event DIDAttributeChanged(
    address indexed identity,
    bytes32 name,
    bytes value,
    uint validTo,
    uint previousChange
  );

  function identityOwner(address identity) public view returns(address) {
     address owner = owners[identity];
     if (owner != address(0x00)) {
       return owner;
     }
     return identity;
  }

  /**
   * @dev Verifies the signature of a given hash using the provided signature components.
   * @param identity The address of the identity being verified.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param hash The hash that was signed.
   * @return The address of the signer if the signature is valid.
   */
  function checkSignature(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 hash) internal returns(address) {
    address signer = ecrecover(hash, sigV, sigR, sigS);
    require(signer == identityOwner(identity), "bad_signature");
    nonce[signer]++;
    return signer;
  }

  function validDelegate(address identity, bytes32 delegateType, address delegate) public view returns(bool) {
    uint validity = delegates[identity][keccak256(abi.encode(delegateType))][delegate];
    return (validity > block.timestamp);
  }

  /**
   * @dev Changes the owner of an identity.
   * @param identity The address of the identity.
   * @param actor The address of the actor performing the change.
   * @param newOwner The address of the new owner.
   * @notice This function can only be called by the owner of the identity.
   */
  function changeOwner(address identity, address actor, address newOwner) internal onlyOwner(identity, actor) {
    owners[identity] = newOwner;
    emit DIDOwnerChanged(identity, newOwner, changed[identity]);
    changed[identity] = block.number;
  }

  function changeOwner(address identity, address newOwner) public {
    changeOwner(identity, msg.sender, newOwner);
  }

  /**
   * @dev Changes the owner of an identity using a signed message.
   * @param identity The address of the identity.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param newOwner The address of the new owner.
   */
  function changeOwnerSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, address newOwner) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "changeOwner", newOwner));
    changeOwner(identity, checkSignature(identity, sigV, sigR, sigS, hash), newOwner);
  }

  /**
   * @dev Adds a delegate for a specific identity and actor.
   * @param identity The address of the identity.
   * @param actor The address of the actor.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate.
   * @param validity The validity period for the delegate in seconds.
   * @notice This function can only be called by the contract owner.
   */
  function addDelegate(address identity, address actor, bytes32 delegateType, address delegate, uint validity) internal onlyOwner(identity, actor) {
    delegates[identity][keccak256(abi.encode(delegateType))][delegate] = block.timestamp + validity;
    emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp + validity, changed[identity]);
    changed[identity] = block.number;
  }

  /**
   * @dev Adds a delegate for a specific identity.
   * @param identity The address of the identity.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate.
   * @param validity The validity period of the delegate.
   */
  function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity) public {
    addDelegate(identity, msg.sender, delegateType, delegate, validity);
  }

  /**
   * @dev Adds a delegate to the specified identity using a signed message.
   * @param identity The address of the identity.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate.
   * @param validity The validity period of the delegate.
   */
  function addDelegateSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 delegateType, address delegate, uint validity) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "addDelegate", delegateType, delegate, validity));
    addDelegate(identity, checkSignature(identity, sigV, sigR, sigS, hash), delegateType, delegate, validity);
  }

  /**
   * @dev Revokes a delegate for a specific identity.
   * @param identity The address of the identity.
   * @param actor The address of the actor performing the revocation.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate to be revoked.
   * @notice This function can only be called by the owner of the identity and the specified actor.
   */
  function revokeDelegate(address identity, address actor, bytes32 delegateType, address delegate) internal onlyOwner(identity, actor) {
    delegates[identity][keccak256(abi.encode(delegateType))][delegate] = block.timestamp;
    emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp, changed[identity]);
    changed[identity] = block.number;
  }

  /**
   * @dev Revokes a delegate for a specific identity and delegate type.
   * @param identity The address of the identity.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate to be revoked.
   */
  function revokeDelegate(address identity, bytes32 delegateType, address delegate) public {
    revokeDelegate(identity, msg.sender, delegateType, delegate);
  }

  /**
   * @dev Revokes a delegate's permission to act on behalf of an identity using a signed message.
   * @param identity The address of the identity.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param delegateType The type of the delegate.
   * @param delegate The address of the delegate.
   */
  function revokeDelegateSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 delegateType, address delegate) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "revokeDelegate", delegateType, delegate));
    revokeDelegate(identity, checkSignature(identity, sigV, sigR, sigS, hash), delegateType, delegate);
  }

  /**
   * @dev Sets an attribute for a given identity.
   * @param identity The address of the identity.
   * @param actor The address of the actor setting the attribute.
   * @param name The name of the attribute.
   * @param value The value of the attribute.
   * @param validity The validity period of the attribute in seconds.
   */
  function setAttribute(address identity, address actor, bytes32 name, bytes memory value, uint validity ) internal onlyOwner(identity, actor) {
    emit DIDAttributeChanged(identity, name, value, block.timestamp + validity, changed[identity]);
    changed[identity] = block.number;
  }

  /**
   * @dev Sets an attribute for a given identity.
   * @param identity The address of the identity for which the attribute is being set.
   * @param name The name of the attribute.
   * @param value The value of the attribute.
   * @param validity The validity period of the attribute.
   */
  function setAttribute(address identity, bytes32 name, bytes memory value, uint validity) public {
    setAttribute(identity, msg.sender, name, value, validity);
  }

  /**
   * @dev Sets an attribute for a given identity, with a signed message.
   * @param identity The address of the identity.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param name The name of the attribute.
   * @param value The value of the attribute.
   * @param validity The validity period of the attribute.
   */
  function setAttributeSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 name, bytes memory value, uint validity) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "setAttribute", name, value, validity));
    setAttribute(identity, checkSignature(identity, sigV, sigR, sigS, hash), name, value, validity);
  }

  /**
   * @dev Revokes an attribute for a given identity.
   * @param identity The address of the identity.
   * @param actor The address of the actor revoking the attribute.
   * @param name The name of the attribute to revoke.
   * @param value The value of the attribute to revoke.
   */
  function revokeAttribute(address identity, address actor, bytes32 name, bytes memory value ) internal onlyOwner(identity, actor) {
    emit DIDAttributeChanged(identity, name, value, 0, changed[identity]);
    changed[identity] = block.number;
  }

  /**
   * @dev Revokes an attribute for a given identity.
   * @param identity The address of the identity.
   * @param name The name of the attribute to revoke.
   * @param value The value of the attribute to revoke.
   */
  function revokeAttribute(address identity, bytes32 name, bytes memory value) public {
    revokeAttribute(identity, msg.sender, name, value);
  }

  /**
   * @dev Revokes an attribute for a given identity using a signed message.
   * @param identity The address of the identity.
   * @param sigV The recovery id of the signature.
   * @param sigR The R component of the signature.
   * @param sigS The S component of the signature.
   * @param name The name of the attribute to revoke.
   * @param value The value of the attribute to revoke.
   */
  function revokeAttributeSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 name, bytes memory value) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "revokeAttribute", name, value));
    revokeAttribute(identity, checkSignature(identity, sigV, sigR, sigS, hash), name, value);
  }

}