# Smart contracts documentation

This document contains the generated documentation of the main smart contracts.

This documentation was extracted from the SolidityDoc present in the methods and events.

## UpgradeControl

Upgrade control This smart contract manges the upgrades of other contracts

### Events

**ContractUpgraded(address,address,address)**
 - Description: ContractUpgraded - A smart contract was upgraded
 - Parameters:
    - `by` - The address of the administrator who made the upgrade
    - `implementation` - The address of the implementation contract
    - `proxy` - The address of the proxy contract

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**initialize(address)**
 - Description: Initializes the smart contract
 - Parameters:
    - `roleManagerAddress` - The address of the role manager smart contract

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**upgradeContract(address,address)**
 - Description: Upgrades a smart contract Requires ADMIN role
 - Parameters:
    - `implementation` - The address of the implementation contract
    - `proxy` - The address of the proxy contract

**upgradeContractAndCall(address,address,bytes)**
 - Description: Upgrades a smart contract and calls a re-initializer Requires ADMIN role
 - Parameters:
    - `callData` - The callData of the re-initializer
    - `implementation` - The address of the implementation contract
    - `proxy` - The address of the proxy contract

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.


## RoleManager

RoleManager - Smart contract to manage the roles of the participants

### Events

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**RoleAssigned(address,uint8,address)**
 - Description: RoleAssigned - A role was assigned to an account
 - Parameters:
    - `account` - - The account
    - `by` - - The address of the administrator who set the role
    - `role` - - The role

**RoleRevoked(address,uint8,address)**
 - Description: RoleRevoked - A role was revoked
 - Parameters:
    - `account` - The account
    - `by` - The address of the administrator who revoked the role
    - `role` - The role

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**assignRole(address,uint8)**
 - Description: Assigns a role to an account Can only be called by accounts with the ADMIN role
 - Parameters:
    - `account` - The account address
    - `role` - The role to assign
 - Returns:
    - `assigned` - True in case the role was assigned, false in case the account already had the role

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**hasRole(address,uint8)**
 - Description: Checks if an account has a role (or has the role ADMIN)
 - Parameters:
    - `account` - The account address
    - `role` - The role to assign
 - Returns:
    - `assigned` - True in case the role is assigned, false if the role is not assigned to the account

**initialize(address)**
 - Description: Initializes the smart contract
 - Parameters:
    - `upgradeControlAddress` - The address of the upgrade control smart contract

**isAdmin(address)**
 - Description: Checks if an account has the ADMIN role
 - Parameters:
    - `account` - The account address
 - Returns:
    - `admin` - True is the account has the ADMIN role

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**revokeRole(address,uint8)**
 - Description: Revokes a role from an account Can only be called by accounts with the ADMIN role
 - Parameters:
    - `account` - The account address
    - `role` - The role to revoke
 - Returns:
    - `revoked` - True in case the role was revoked, false in case the account did not have the role

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.


## EthereumDIDRegistry

This smart contract lacks a description.

### Methods

**addDelegate(address,bytes32,address,uint256)**
 - Details: Adds a delegate for a specific identity.
 - Parameters:
    - `delegate` - The address of the delegate.
    - `delegateType` - The type of the delegate.
    - `identity` - The address of the identity.
    - `validity` - The validity period of the delegate.

**addDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address,uint256)**
 - Details: Adds a delegate to the specified identity using a signed message.
 - Parameters:
    - `delegate` - The address of the delegate.
    - `delegateType` - The type of the delegate.
    - `identity` - The address of the identity.
    - `sigR` - The R component of the signature.
    - `sigS` - The S component of the signature.
    - `sigV` - The recovery id of the signature.
    - `validity` - The validity period of the delegate.

**changeOwnerSigned(address,uint8,bytes32,bytes32,address)**
 - Details: Changes the owner of an identity using a signed message.
 - Parameters:
    - `identity` - The address of the identity.
    - `newOwner` - The address of the new owner.
    - `sigR` - The R component of the signature.
    - `sigS` - The S component of the signature.
    - `sigV` - The recovery id of the signature.

**initialize()**
 - Details: Initializes the DID Registry. No-op for this contract; used for deployment flow compatibility.

**revokeAttribute(address,bytes32,bytes)**
 - Details: Revokes an attribute for a given identity.
 - Parameters:
    - `identity` - The address of the identity.
    - `name` - The name of the attribute to revoke.
    - `value` - The value of the attribute to revoke.

**revokeAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes)**
 - Details: Revokes an attribute for a given identity using a signed message.
 - Parameters:
    - `identity` - The address of the identity.
    - `name` - The name of the attribute to revoke.
    - `sigR` - The R component of the signature.
    - `sigS` - The S component of the signature.
    - `sigV` - The recovery id of the signature.
    - `value` - The value of the attribute to revoke.

**revokeDelegate(address,bytes32,address)**
 - Details: Revokes a delegate for a specific identity and delegate type.
 - Parameters:
    - `delegate` - The address of the delegate to be revoked.
    - `delegateType` - The type of the delegate.
    - `identity` - The address of the identity.

**revokeDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address)**
 - Details: Revokes a delegate's permission to act on behalf of an identity using a signed message.
 - Parameters:
    - `delegate` - The address of the delegate.
    - `delegateType` - The type of the delegate.
    - `identity` - The address of the identity.
    - `sigR` - The R component of the signature.
    - `sigS` - The S component of the signature.
    - `sigV` - The recovery id of the signature.

**setAttribute(address,bytes32,bytes,uint256)**
 - Details: Sets an attribute for a given identity.
 - Parameters:
    - `identity` - The address of the identity for which the attribute is being set.
    - `name` - The name of the attribute.
    - `validity` - The validity period of the attribute.
    - `value` - The value of the attribute.

**setAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes,uint256)**
 - Details: Sets an attribute for a given identity, with a signed message.
 - Parameters:
    - `identity` - The address of the identity.
    - `name` - The name of the attribute.
    - `sigR` - The R component of the signature.
    - `sigS` - The S component of the signature.
    - `sigV` - The recovery id of the signature.
    - `validity` - The validity period of the attribute.
    - `value` - The value of the attribute.


## NubemToken

NubemToken - Closed ERC-20 token for the Nubem ecosystem. Internal credit used for payments, rewards, and service automation. Non-transferable outside the Nubem ecosystem. Key features: - Restricted transfers: only between authorized (whitelisted) addresses - Controlled minting: only root or governance contract can mint - No burning: tokens are never destroyed, only reclaimed - Pausable: all transfers can be paused in case of emergency - Whitelist management: root can authorize/revoke addresses

### Events

**AddressAuthorized(address)**
 - Description: Emitted when an address is authorized to participate in the ecosystem
 - Parameters:
    - `account` - The authorized address

**AddressRevoked(address)**
 - Description: Emitted when an address authorization is revoked
 - Parameters:
    - `account` - The revoked address

**AdminGranted(address)**
 - Description: Admin granted event
 - Parameters:
    - `_admin` - Admin address

**AdminRevoked(address)**
 - Description: Admin revoked event
 - Parameters:
    - `_admin` - Admin address

**GovernanceChanged(address,address)**
 - Description: Emitted when the governance contract address changes
 - Parameters:
    - `newGovernance` - The new governance address
    - `previousGovernance` - The previous governance address

**Paused(address)**
 - Description: Emitted when the contract is paused
 - Parameters:
    - `account` - The account that paused the contract

**RootChanged(address)**
 - Description: Root change event
 - Parameters:
    - `_root` - New root address

**TokensReclaimed(address,address,uint256)**
 - Description: Emitted when tokens are reclaimed from an account
 - Parameters:
    - `amount` - The amount reclaimed
    - `from` - The account tokens were reclaimed from
    - `to` - The account tokens were sent to

**Unpaused(address)**
 - Description: Emitted when the contract is unpaused
 - Parameters:
    - `account` - The account that unpaused the contract

**UserDeposit(address,uint256,string)**
 - Description: Emitted when a user deposit is registered
 - Parameters:
    - `account` - The account that received the deposit
    - `amount` - The amount deposited
    - `details` - Additional details for the transaction


### Methods

**addUserDeposit(address,uint256,string)**
 - Description: Adds a user deposit, minting the corresponding tokens. Can only be called by an administrator. The recipient must be an authorized address.
 - Parameters:
    - `account` - Account address (must be authorized)
    - `amount` - Amount to mint
    - `details` - Additional details for the transaction

**allowance(address,address)**
 - Description: Checks the allowance for an authorized spender. Defined in IERC20.
 - Parameters:
    - `owner` - owner of the account
    - `spender` - Authorized spender
 - Returns:
    - `_0` - uint256 The amount authorized to spend

**approve(address,uint256)**
 - Description: Approves an authorized spender to transfer an specific amount from your account. Defined in IERC20.
 - Parameters:
    - `amount` - The authorized amount
    - `spender` - The authorized spender

**authorizeAddress(address)**
 - Description: Authorizes an address to participate in the Nubem token ecosystem. Can only be called by the contract root.
 - Parameters:
    - `account` - The address to authorize

**authorizeAddressBatch(address[])**
 - Description: Authorizes multiple addresses in a single transaction. Silently skips zero addresses and already authorized addresses. Can only be called by the contract root.
 - Parameters:
    - `accounts` - Array of addresses to authorize

**balanceOf(address)**
 - Description: Gets the balance of an account. Defined in IERC20.
 - Parameters:
    - `account` - The account
 - Returns:
    - `_0` - uint256 The balance of the account

**burn(uint256)**
 - Description: Burns funds from your account.
 - Parameters:
    - `amount` - Amount to burn

**constructor**
 - Description: Constructor - Creates the Nubem Token. The deployer is automatically authorized and set as root.

**decimals()**
 - Description: Gets the number of decimals of the token.
 - Returns:
    - `_0` - uint8 The number of decimals

**decreaseAllowance(address,uint256)**
 - Description: Decreases the authorized amount an spender can use. Defined in IERC20.
 - Parameters:
    - `spender` - The authorized spender
    - `subtractedValue` - The authorized amount to subtract

**governance()**
 - Description: Address of the governance contract (can mint tokens)

**grantAdmin(address)**
 - Description: Grants administration permissions on the smart contract.
 - Parameters:
    - `_address` - The account address.

**increaseAllowance(address,uint256)**
 - Description: Increases the authorized amount an spender can use. Defined in IERC20.
 - Parameters:
    - `addedValue` - The authorized amount to add
    - `spender` - The authorized spender

**initialize()**
 - Description: Initializes the smart contract (for proxy deployment). Replicates the constructor logic so it runs in the proxy context. Can only be called once (when root is not yet set).

**isAuthorized(address)**
 - Description: Checks if an address is authorized to hold and transfer Nubem tokens.
 - Parameters:
    - `account` - The address to check
 - Returns:
    - `_0` - bool True if authorized

**mint(address,uint256)**
 - Description: Mints tokens to an authorized address. Can be called by root or the governance contract. The recipient must be an authorized address.
 - Parameters:
    - `amount` - Amount to mint
    - `to` - Destination account (must be authorized)

**name()**
 - Description: Gets the name of the token.
 - Returns:
    - `_0` - string The token name

**pause()**
 - Description: Pauses all token transfers. Can only be called by the contract root when not paused.

**paused()**
 - Description: Checks if the contract is paused.
 - Returns:
    - `_0` - bool True if paused

**reclaim(address,address,uint256)**
 - Description: Reclaims tokens from an account and sends them to another. Used to recover tokens from revoked or inactive accounts. Bypasses the whitelist check to allow recovery from revoked addresses. Can only be called by the contract root.
 - Parameters:
    - `amount` - Amount to reclaim
    - `from` - The account to reclaim tokens from
    - `to` - The account to send tokens to (must be authorized)

**revokeAddress(address)**
 - Description: Revokes authorization from an address. Cannot revoke root. Can only be called by the contract root.
 - Parameters:
    - `account` - The address to revoke

**revokeAddressBatch(address[])**
 - Description: Revokes authorization from multiple addresses in a single transaction. Silently skips root and non-authorized addresses. Can only be called by the contract root.
 - Parameters:
    - `accounts` - Array of addresses to revoke

**revokeAdmin(address)**
 - Description: Revokes administation permissions.
 - Parameters:
    - `_address` - The account address.

**setGovernance(address)**
 - Description: Sets the governance contract address. The governance contract is automatically authorized. Can only be called by the contract root.
 - Parameters:
    - `_governance` - The governance contract address

**symbol()**
 - Description: Gets the symbol of the token.
 - Returns:
    - `_0` - string The token symbol

**totalSupply()**
 - Description: Gets the total supply in circulation. Defined in IERC20.
 - Returns:
    - `_0` - uint256 The total supply

**transfer(address,uint256)**
 - Description: Transfer funds to another account. Defined in IERC20.
 - Parameters:
    - `amount` - Amount to transfer
    - `to` - The destination account

**transferFrom(address,address,uint256)**
 - Description: Transfer funds from an account to another. You must be the owner of the account, or be authorized to spend the amount. If you are authorized, the allowance will decrease by amount. Defined in IERC20.
 - Parameters:
    - `amount` - Amount to transfer
    - `from` - Origin account
    - `to` - Destination account

**transferRoot(address)**
 - Description: Transfers the ownership of the smart contract.
 - Parameters:
    - `_address` - The address to transfer the ownership.

**unpause()**
 - Description: Unpauses token transfers. Can only be called by the contract root when paused.

**updateContractMetadata(string,string,uint8)**
 - Description: Updates contract metadata. Can only be called by the owner of the contract.
 - Parameters:
    - `decimals_` - Number of decimals
    - `name_` - Token name
    - `symbol_` - Token symbol


## PaymentRouter

PaymentRouter - Registry for payment records.

### Methods

**administrators(address)**
 - Description: Administrators allowed to record payments

**grantAdmin(address)**
 - Description: Grants administrator permissions.
 - Parameters:
    - `account` - The account address

**initialize()**
 - Description: Initializes the smart contract (for proxy deployment). Replicates constructor state initialization in the proxy storage. Can only be called once (when root is not yet set).

**isPaymentRecorded(bytes32)**
 - Description: Checks whether a payment ID was already recorded.
 - Parameters:
    - `paymentId` - The payment identifier
 - Returns:
    - `_0` - bool True if payment is already recorded

**recordPayment(bytes32,address,uint256,uint8,string)**
 - Description: Records a payment operation.
 - Parameters:
    - `account` - Account related to the payment
    - `amount` - Payment amount
    - `kind` - Payment kind/type
    - `paymentId` - Unique payment identifier
    - `ref` - External payment reference

**recorded(bytes32)**
 - Description: Registered payment IDs

**revokeAdmin(address)**
 - Description: Revokes administrator permissions.
 - Parameters:
    - `account` - The account address

**root()**
 - Description: Contract owner


## AgentEventTraceability

AgentEventTraceability Lightweight on-chain ledger for traceability events. Designed for IA -> DLT integration where business events are produced off-chain and anchored on-chain with hashes/references for auditability.

### Events

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**TraceEventRecorded(bytes32,string,bytes32,string,uint256,uint256,address)**
 - Description: TraceEventRecorded - A new traceability event was anchored
 - Parameters:
    - `actor` - Actor/user identifier
    - `anchoredAt` - Block timestamp when anchored
    - `eventId` - Unique event identifier (UUID hash)
    - `eventType` - Canonical business event type (e.g., "execution.started")
    - `occurredAt` - Event occurrence timestamp (provided by source system)
    - `payloadHash` - Hash of relevant payload snapshot
    - `submittedBy` - Address that submitted the anchoring tx

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**initialize(address,address)**
 - Description: Initializes the smart contract
 - Parameters:
    - `roleManagerAddress` - The address of the role manager smart contract
    - `upgradeControlAddress` - The address of the upgrade control smart contract

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**recordEvent(bytes32,string,bytes32,string,uint256)**
 - Description: Anchors one traceability event on-chain. Input model matches the ingest endpoint payload.

**traceExists(bytes32)**
 - Description: Compatibility note: traceId is interpreted as eventId in the simplified model.

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.


## CatalogRegistry

CatalogRegistry Stores ITAAS catalog items on-chain for traceability. Supports publication, updates, withdrawals and visibility changes.

### Events

**CatalogItemCreated(bytes32,uint8)**
 - Description: CatalogItemCreated - A new catalog item was created
 - Parameters:
    - `itemId` - The catalog item identifier
    - `visibility` - Initial visibility setting

**CatalogItemDeleted(bytes32)**
 - Description: CatalogItemDeleted - A catalog item was deleted
 - Parameters:
    - `itemId` - The catalog item identifier

**CatalogItemPublished(bytes32,uint8)**
 - Description: CatalogItemPublished - A new catalog item was published
 - Parameters:
    - `itemId` - The catalog item identifier
    - `visibility` - Initial visibility setting

**CatalogItemUpdated(bytes32)**
 - Description: CatalogItemUpdated - An existing catalog item was updated
 - Parameters:
    - `itemId` - The catalog item identifier

**CatalogItemWithdrawn(bytes32)**
 - Description: CatalogItemWithdrawn - A published catalog item was withdrawn
 - Parameters:
    - `itemId` - The catalog item identifier

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**createItem(bytes32,uint8)**
 - Description: Creates a new catalog item
 - Parameters:
    - `itemId` - The catalog item identifier
    - `visibility` - Initial visibility setting

**deleteItem(bytes32)**
 - Description: Deletes a catalog item
 - Parameters:
    - `itemId` - The catalog item identifier

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**getItem(bytes32)**
 - Description: Gets catalog item details
 - Parameters:
    - `itemId` - The catalog item identifier
 - Returns:
    - `createdAt` - Block timestamp when created
    - `exists` - Whether the item exists
    - `status` - Current item status
    - `updatedAt` - Block timestamp when last updated
    - `visibility` - Current visibility setting

**initialize(address,address)**
 - Description: Initializes the smart contract
 - Parameters:
    - `roleManagerAddress` - The address of the role manager smart contract
    - `upgradeControlAddress` - The address of the upgrade control smart contract

**itemExists(bytes32)**
 - Description: Checks if a catalog item exists
 - Parameters:
    - `itemId` - The catalog item identifier
 - Returns:
    - `exists` - True if the item exists

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**publishItem(bytes32,uint8)**
 - Description: Publishes a new catalog item
 - Parameters:
    - `itemId` - The catalog item identifier
    - `visibility` - Initial visibility setting

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**updateItem(bytes32)**
 - Description: Updates an existing catalog item
 - Parameters:
    - `itemId` - The catalog item identifier

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.

**withdrawItem(bytes32)**
 - Description: Withdraws a published catalog item
 - Parameters:
    - `itemId` - The catalog item identifier


## SubscriptionRegistry

SubscriptionRegistry Stores subscriptions and licenses on-chain for traceability. Subscriptions can contain multiple assigned licenses.

### Events

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**LicenseAssigned(bytes32,bytes32,bytes32,bytes32)**
 - Description: LicenseAssigned - A license was assigned within an active subscription
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `subscriptionId` - Parent subscription identifier
    - `userId` - User identifier the license is assigned to

**LicenseReactivated(bytes32,bytes32,bytes32,bytes32)**
 - Description: LicenseReactivated - A revoked license was reactivated
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `subscriptionId` - Parent subscription identifier
    - `userId` - User identifier the license is assigned to

**LicenseRevoked(bytes32,bytes32,bytes32)**
 - Description: LicenseRevoked - An active license was revoked
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `userId` - User identifier the license was assigned to

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**SubscriptionCancelled(bytes32)**
 - Description: SubscriptionCancelled - An active subscription was cancelled
 - Parameters:
    - `subscriptionId` - The subscription identifier

**SubscriptionChanged(bytes32)**
 - Description: SubscriptionChanged - An active subscription was changed
 - Parameters:
    - `subscriptionId` - The subscription identifier

**SubscriptionCreated(bytes32,bytes32)**
 - Description: SubscriptionCreated - A new subscription was created
 - Parameters:
    - `subscriberId` - Subscriber identifier hash
    - `subscriptionId` - The subscription identifier

**SubscriptionReactivated(bytes32)**
 - Description: SubscriptionReactivated - A suspended subscription was reactivated
 - Parameters:
    - `subscriptionId` - The subscription identifier

**SubscriptionRenewed(bytes32)**
 - Description: SubscriptionRenewed - An active subscription was renewed
 - Parameters:
    - `subscriptionId` - The subscription identifier

**SubscriptionSuspended(bytes32)**
 - Description: SubscriptionSuspended - An active subscription was suspended
 - Parameters:
    - `subscriptionId` - The subscription identifier

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**assignLicense(bytes32,bytes32,bytes32,bytes32)**
 - Description: Assigns a license within an active subscription
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `subscriptionId` - Parent subscription identifier
    - `userId` - User identifier the license is assigned to

**cancelSubscription(bytes32)**
 - Description: Cancels an active subscription
 - Parameters:
    - `subscriptionId` - The subscription identifier

**createSubscription(bytes32,bytes32)**
 - Description: Creates a new subscription
 - Parameters:
    - `subscriberId` - Subscriber identifier hash
    - `subscriptionId` - The subscription identifier

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**getLicense(bytes32)**
 - Description: Gets license details
 - Parameters:
    - `licenseId` - The license identifier
 - Returns:
    - `assignedAt` - Block timestamp when assigned
    - `exists` - Whether the license exists
    - `revokedAt` - Block timestamp when revoked (0 if active)
    - `status` - Current license status
    - `subscriptionId` - Parent subscription identifier

**getSubscription(bytes32)**
 - Description: Gets subscription details
 - Parameters:
    - `subscriptionId` - The subscription identifier
 - Returns:
    - `createdAt` - Block timestamp when created
    - `exists` - Whether the subscription exists
    - `status` - Current subscription status
    - `subscriberId` - Subscriber identifier hash
    - `updatedAt` - Block timestamp when last updated

**initialize(address,address)**
 - Description: Initializes the smart contract
 - Parameters:
    - `roleManagerAddress` - The address of the role manager smart contract
    - `upgradeControlAddress` - The address of the upgrade control smart contract

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**reactivateLicense(bytes32,bytes32,bytes32,bytes32)**
 - Description: Reactivates a revoked license
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `subscriptionId` - Parent subscription identifier
    - `userId` - User identifier the license is assigned to

**reactivateSubscription(bytes32)**
 - Description: Reactivates a suspended subscription
 - Parameters:
    - `subscriptionId` - The subscription identifier

**renewSubscription(bytes32)**
 - Description: Renews an active subscription
 - Parameters:
    - `subscriptionId` - The subscription identifier

**revokeLicense(bytes32,bytes32,bytes32)**
 - Description: Revokes an active license
 - Parameters:
    - `licenseId` - The license identifier
    - `organizationId` - Organization identifier (zero for personal subscriptions)
    - `userId` - User identifier the license was assigned to

**suspendSubscription(bytes32)**
 - Description: Suspends an active subscription
 - Parameters:
    - `subscriptionId` - The subscription identifier

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.


## OrganizationRegistry

OrganizationRegistry Stores organizations and memberships on-chain for traceability. Admins are active memberships with the ADMIN role.

### Events

**Initialized(uint64)**
 - Details: Triggered when the contract has been initialized or reinitialized.

**Paused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Unpaused(address)**
 - Description: Paused - The smart contract was paused
 - Parameters:
    - `by` - The administrator who paused the smart contract

**Upgraded(address)**
 - Details: Emitted when the implementation is upgraded.


### Methods

**getInitializedVersion()**
 - Description: Gets the current initialized version Use this method to figure out the last deployed version of the contract
 - Returns:
    - `v` - The current initialized version

**pause()**
 - Description: Pauses the smart contract Requires ADMIN role

**paused()**
 - Description: Checks if the smart contract is paused
 - Returns:
    - `_0` - bool True if paused, false otherwise

**proxiableUUID()**
 - Details: Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.

**unpause()**
 - Description: Unpauses the smart contract Requires ADMIN role

**upgradeToAndCall(address,bytes)**
 - Details: Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.


## UnifiedVCManager

This smart contract lacks a description.

### Methods

**addAdmin(address)**
 - Details: Add a new administrator to the system.

**issueCredential(bytes32,address)**
 - Details: Issues a credential. Can only be executed by an Administrator..

**revokeCredential(bytes32)**
 - Details: Revoke a credential. This can be done by an Admin or the owner..

