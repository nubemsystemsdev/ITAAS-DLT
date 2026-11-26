// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

interface IPaymentRouter {
    function isPaymentRecorded(bytes32 paymentId) external view returns (bool);
    function recordPayment(bytes32 paymentId, address account, uint256 amount, uint8 kind, string calldata ref) external;
}
