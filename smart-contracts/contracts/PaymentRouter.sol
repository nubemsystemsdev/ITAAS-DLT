// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./interfaces/IPaymentRouter.sol";

/**
 * PaymentRouter - Registry for payment records.
 */
contract PaymentRouter is IPaymentRouter {
    /* Custom Errors */

    /// @notice Caller is not an administrator
    error NotAdmin();

    /// @notice Caller is not root
    error NotRoot();

    /// @notice Contract is already initialized
    error AlreadyInitialized();

    /// @notice Payment has already been recorded
    error AlreadyRecorded();

    /* Contract data */

    /// @notice Contract owner
    address public root;

    /// @notice Administrators allowed to record payments
    mapping(address => bool) public administrators;

    /// @notice Registered payment IDs
    mapping(bytes32 => bool) public recorded;

    /* Events */

    event AdminGranted(address indexed account);
    event AdminRevoked(address indexed account);
    event PaymentRecorded(
        bytes32 indexed paymentId,
        address indexed account,
        uint256 amount,
        uint8 kind,
        string ref
    );

    /* Modifiers */

    /// @notice Restricts execution to administrators
    modifier onlyAdmin() {
        if (!administrators[msg.sender]) revert NotAdmin();
        _;
    }

    /// @notice Restricts execution to root
    modifier onlyRoot() {
        if (msg.sender != root) revert NotRoot();
        _;
    }

    /* Constructor */

    constructor() {
        root = msg.sender;
        administrators[msg.sender] = true;
        emit AdminGranted(msg.sender);
    }

    /* Initializer */

    /**
     * Initializes the smart contract (for proxy deployment).
     * Replicates constructor state initialization in the proxy storage.
     * Can only be called once (when root is not yet set).
     */
    function initialize() public {
        if (root != address(0)) revert AlreadyInitialized();

        root = msg.sender;
        administrators[msg.sender] = true;
        emit AdminGranted(msg.sender);
    }

    /* Root functions */

    /**
     * Grants administrator permissions.
     * @param account The account address
     */
    function grantAdmin(address account) external onlyRoot {
        administrators[account] = true;
        emit AdminGranted(account);
    }

    /**
     * Revokes administrator permissions.
     * @param account The account address
     */
    function revokeAdmin(address account) external onlyRoot {
        administrators[account] = false;
        emit AdminRevoked(account);
    }

    /* View functions */

    /**
     * Checks whether a payment ID was already recorded.
     * @param paymentId The payment identifier
     * @return bool True if payment is already recorded
     */
    function isPaymentRecorded(bytes32 paymentId) external view override returns (bool) {
        return recorded[paymentId];
    }

    /* Transaction functions */

    /**
     * Records a payment operation.
     * @param paymentId Unique payment identifier
     * @param account Account related to the payment
     * @param amount Payment amount
     * @param kind Payment kind/type
     * @param ref External payment reference
     */
    function recordPayment(
        bytes32 paymentId,
        address account,
        uint256 amount,
        uint8 kind,
        string calldata ref
    ) external override onlyAdmin {
        if (recorded[paymentId]) revert AlreadyRecorded();

        recorded[paymentId] = true;
        emit PaymentRecorded(paymentId, account, amount, kind, ref);
    }
}
