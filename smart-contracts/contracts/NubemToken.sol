// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./ERC20.sol";
import "./interfaces/INubemToken.sol";

/**
 * NubemToken - Closed ERC-20 token for the Nubem ecosystem.
 *
 * Internal credit used for payments, rewards, and service automation.
 * Non-transferable outside the Nubem ecosystem.
 *
 * Key features:
 * - Restricted transfers: only between authorized (whitelisted) addresses
 * - Controlled minting: only root or governance contract can mint
 * - No burning: tokens are never destroyed, only reclaimed
 * - Pausable: all transfers can be paused in case of emergency
 * - Whitelist management: root can authorize/revoke addresses
 */
contract NubemToken is ERC20, INubemToken {
    /* Contract data */

    /// @notice Mapping of addresses authorized to hold and transfer tokens
    mapping(address => bool) private _authorizedAddresses;

    /// @notice Address of the governance contract (can mint tokens)
    address public override governance;

    /// @notice Whether the contract is paused (packed with governance in same storage slot)
    bool private _paused;

    /* Modifiers */

    /**
     * Restricts function execution to root or the governance contract
     */
    modifier onlyGovernanceOrRoot() {
        if (msg.sender != root && msg.sender != governance) {
            revert NotGovernanceOrRoot();
        }
        _;
    }

    /**
     * Modifier to make a function callable only when the contract is not paused
     */
    modifier whenNotPaused() {
        if (_paused) revert EnforcedPause();
        _;
    }

    /**
     * Modifier to make a function callable only when the contract is paused
     */
    modifier whenPaused() {
        if (!_paused) revert ExpectedPause();
        _;
    }

    /* Constructor */

    /**
     * Constructor - Creates the Nubem Token.
     * The deployer is automatically authorized and set as root.
     */
    constructor() ERC20("Nubem Token", "NUBEM", 2) {
        _authorizedAddresses[msg.sender] = true;
        emit AddressAuthorized(msg.sender);
    }

    /* Initializer */

    /**
     * Initializes the smart contract (for proxy deployment).
     * Replicates the constructor logic so it runs in the proxy context.
     * Can only be called once (when root is not yet set).
     */
    function initialize() public {
        if (root != address(0)) revert AlreadyInitialized();
        _init_ownable();
        updateContractMetadata("Nubem Token", "NUBEM", 2);
        _authorizedAddresses[msg.sender] = true;
        emit AddressAuthorized(msg.sender);
    }

    /* Internal functions */

    /**
     * @dev Override _update to enforce transfer restrictions and pause.
     * - Burning is blocked: tokens cannot be sent to address(0)
     * - Minting (from == address(0)): recipient must be authorized
     * - Transfer: both sender and recipient must be authorized
     * - All operations are blocked when the contract is paused
     */
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        // Block burning: tokens cannot be destroyed
        if (to == address(0) && from != address(0)) revert BurningNotAllowed();

        if (from != address(0)) {
            if (!_authorizedAddresses[from]) revert SenderNotAuthorized();
        }
        if (to != address(0)) {
            if (!_authorizedAddresses[to]) revert RecipientNotAuthorized();
        }
        super._update(from, to, amount);
    }

    /* View functions */

    /**
     * Checks if an address is authorized to hold and transfer Nubem tokens.
     * @param account The address to check
     * @return bool True if authorized
     */
    function isAuthorized(address account) public view override returns (bool) {
        return _authorizedAddresses[account];
    }

    /**
     * Checks if the contract is paused.
     * @return bool True if paused
     */
    function paused() public view override returns (bool) {
        return _paused;
    }

    /* Root functions */

    /**
     * Authorizes an address to participate in the Nubem token ecosystem.
     * Can only be called by the contract root.
     * @param account The address to authorize
     */
    function authorizeAddress(address account) public override onlyRoot {
        if (account == address(0)) revert ZeroAddress();
        if (_authorizedAddresses[account]) revert AlreadyAuthorized();
        _authorizedAddresses[account] = true;
        emit AddressAuthorized(account);
    }

    /**
     * Revokes authorization from an address.
     * Cannot revoke root. Can only be called by the contract root.
     * @param account The address to revoke
     */
    function revokeAddress(address account) public override onlyRoot {
        if (account == root) revert CannotRevokeRoot();
        if (!_authorizedAddresses[account]) revert AddressNotAuthorized();
        _authorizedAddresses[account] = false;
        emit AddressRevoked(account);
    }

    /**
     * Authorizes multiple addresses in a single transaction.
     * Silently skips zero addresses and already authorized addresses.
     * Can only be called by the contract root.
     * @param accounts Array of addresses to authorize
     */
    function authorizeAddressBatch(address[] calldata accounts) public override onlyRoot {
        uint256 len = accounts.length;
        for (uint256 i = 0; i < len;) {
            address account = accounts[i];
            if (account != address(0) && !_authorizedAddresses[account]) {
                _authorizedAddresses[account] = true;
                emit AddressAuthorized(account);
            }
            unchecked { ++i; }
        }
    }

    /**
     * Revokes authorization from multiple addresses in a single transaction.
     * Silently skips root and non-authorized addresses.
     * Can only be called by the contract root.
     * @param accounts Array of addresses to revoke
     */
    function revokeAddressBatch(address[] calldata accounts) public override onlyRoot {
        address _root = root; // Cache storage read
        uint256 len = accounts.length;
        for (uint256 i = 0; i < len;) {
            address account = accounts[i];
            if (account != _root && _authorizedAddresses[account]) {
                _authorizedAddresses[account] = false;
                emit AddressRevoked(account);
            }
            unchecked { ++i; }
        }
    }

    /**
     * Sets the governance contract address.
     * The governance contract is automatically authorized.
     * Can only be called by the contract root.
     * @param _governance The governance contract address
     */
    function setGovernance(address _governance) public override onlyRoot {
        address previous = governance;
        governance = _governance;

        // Auto-authorize the governance contract
        if (_governance != address(0) && !_authorizedAddresses[_governance]) {
            _authorizedAddresses[_governance] = true;
            emit AddressAuthorized(_governance);
        }

        emit GovernanceChanged(previous, _governance);
    }

    /**
     * Pauses all token transfers.
     * Can only be called by the contract root when not paused.
     */
    function pause() public override onlyRoot whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * Unpauses token transfers.
     * Can only be called by the contract root when paused.
     */
    function unpause() public override onlyRoot whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /* Governance functions */

    /**
     * Mints tokens to an authorized address.
     * Can be called by root or the governance contract.
     * The recipient must be an authorized address.
     * @param to Destination account (must be authorized)
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) public override(ERC20, INubemToken) onlyGovernanceOrRoot {
        _mint(to, amount);
    }

    /**
     * Adds a user deposit, minting the corresponding tokens.
     * Can only be called by an administrator.
     * The recipient must be an authorized address.
     * @param account Account address (must be authorized)
     * @param amount Amount to mint
     * @param details Additional details for the transaction
     */
    function addUserDeposit(address account, uint256 amount, string calldata details) public override onlyAdmin {
        _mint(account, amount);
        emit UserDeposit(account, amount, details);
    }

    /**
     * Reclaims tokens from an account and sends them to another.
     * Used to recover tokens from revoked or inactive accounts.
     * Bypasses the whitelist check to allow recovery from revoked addresses.
     * Can only be called by the contract root.
     * @param from The account to reclaim tokens from
     * @param to The account to send tokens to (must be authorized)
     * @param amount Amount to reclaim
     */
    function reclaim(address from, address to, uint256 amount) public override onlyRoot {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (!_authorizedAddresses[to]) revert RecipientNotAuthorized();

        // Use the parent _update directly to bypass NubemToken whitelist on sender
        // This allows reclaiming from revoked addresses
        super._update(from, to, amount);
        emit TokensReclaimed(from, to, amount);
    }
}
