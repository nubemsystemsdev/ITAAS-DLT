// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "../IERC20.sol";

/**
 * INubemToken - Interface for the Nubem Token
 * Closed ERC-20 token: internal credit for payments, rewards, and service automation.
 * Non-transferable outside the Nubem ecosystem.
 * Burning is not allowed; tokens are reclaimed instead.
 */
interface INubemToken is IERC20 {
    /* Custom Errors */

    /// @notice Caller is not root or governance
    error NotGovernanceOrRoot();

    /// @notice Action blocked: contract is paused
    error EnforcedPause();

    /// @notice Action requires the contract to be paused
    error ExpectedPause();

    /// @notice Contract has already been initialized
    error AlreadyInitialized();

    /// @notice Burning is not allowed in this token
    error BurningNotAllowed();

    /// @notice Sender address is not authorized
    error SenderNotAuthorized();

    /// @notice Recipient address is not authorized
    error RecipientNotAuthorized();

    /// @notice Zero address is not valid for this operation
    error ZeroAddress();

    /// @notice Address is already authorized
    error AlreadyAuthorized();

    /// @notice Root address cannot be revoked
    error CannotRevokeRoot();

    /// @notice Address is not authorized
    error AddressNotAuthorized();

    /* Events */

    /**
     * Emitted when an address is authorized to participate in the ecosystem
     * @param account The authorized address
     */
    event AddressAuthorized(address indexed account);

    /**
     * Emitted when an address authorization is revoked
     * @param account The revoked address
     */
    event AddressRevoked(address indexed account);

    /**
     * Emitted when the governance contract address changes
     * @param previousGovernance The previous governance address
     * @param newGovernance The new governance address
     */
    event GovernanceChanged(address indexed previousGovernance, address indexed newGovernance);

    /**
     * Emitted when tokens are reclaimed from an account
     * @param from The account tokens were reclaimed from
     * @param to The account tokens were sent to
     * @param amount The amount reclaimed
     */
    event TokensReclaimed(address indexed from, address indexed to, uint256 amount);

    /**
     * Emitted when a user deposit is registered
     * @param account The account that received the deposit
     * @param amount The amount deposited
     * @param details Additional details for the transaction
     */
    event UserDeposit(address indexed account, uint256 amount, string details);

    /**
     * Emitted when the contract is paused
     * @param account The account that paused the contract
     */
    event Paused(address account);

    /**
     * Emitted when the contract is unpaused
     * @param account The account that unpaused the contract
     */
    event Unpaused(address account);

    /* View functions */

    /**
     * Checks if an address is authorized to hold and transfer Nubem tokens
     * @param account The address to check
     * @return bool True if the address is authorized
     */
    function isAuthorized(address account) external view returns (bool);

    /**
     * Gets the governance contract address
     * @return address The governance contract address
     */
    function governance() external view returns (address);

    /**
     * Checks if the contract is paused
     * @return bool True if paused
     */
    function paused() external view returns (bool);

    /* Transaction functions */

    /**
     * Authorizes an address to participate in the Nubem token ecosystem
     * @param account The address to authorize
     */
    function authorizeAddress(address account) external;

    /**
     * Revokes authorization from an address
     * @param account The address to revoke
     */
    function revokeAddress(address account) external;

    /**
     * Authorizes multiple addresses in a single transaction
     * @param accounts Array of addresses to authorize
     */
    function authorizeAddressBatch(address[] calldata accounts) external;

    /**
     * Revokes authorization from multiple addresses in a single transaction
     * @param accounts Array of addresses to revoke
     */
    function revokeAddressBatch(address[] calldata accounts) external;

    /**
     * Sets the governance contract address
     * @param _governance The governance contract address
     */
    function setGovernance(address _governance) external;

    /**
     * Mints tokens to an authorized address
     * @param to Destination account (must be authorized)
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * Adds a user deposit, minting the corresponding tokens.
     * Can only be called by an administrator.
     * @param account Account address (must be authorized)
     * @param amount Amount to mint
     * @param details Additional details for the transaction
     */
    function addUserDeposit(address account, uint256 amount, string calldata details) external;

    /**
     * Reclaims tokens from an account and sends them to another.
     * Used to recover tokens from revoked or inactive accounts.
     * @param from The account to reclaim tokens from
     * @param to The account to send tokens to
     * @param amount Amount to reclaim
     */
    function reclaim(address from, address to, uint256 amount) external;

    /**
     * Pauses all token transfers
     */
    function pause() external;

    /**
     * Unpauses token transfers
     */
    function unpause() external;

    /**
     * Initializes the smart contract (for proxy deployment).
     * Replicates the constructor logic so it runs in the proxy context.
     */
    function initialize() external;
}
