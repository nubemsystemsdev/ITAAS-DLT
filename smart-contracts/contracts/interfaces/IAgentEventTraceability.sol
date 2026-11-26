// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

/**
 * Agent event traceability (Interface)
 *
 * Stores a lightweight on-chain ledger for traceability events.
 * Detailed payloads stay off-chain; only hashes and references are anchored.
 */
interface IAgentEventTraceability {
    /**
     * TraceEventRecorded - A new traceability event was anchored
     * @param eventId Unique event identifier (UUID hash)
     * @param eventType Canonical business event type (e.g., "execution.started")
     * @param payloadHash Hash of relevant payload snapshot
     * @param actor Actor/user identifier
     * @param occurredAt Event occurrence timestamp (provided by source system)
     * @param anchoredAt Block timestamp when anchored
     * @param submittedBy Address that submitted the anchoring tx
     */
    event TraceEventRecorded(
        bytes32 indexed eventId,
        string eventType,
        bytes32 payloadHash,
        string actor,
        uint256 occurredAt,
        uint256 anchoredAt,
        address submittedBy
    );

    function traceExists(bytes32 traceId) external view returns (bool exists);

    function eventExists(bytes32 traceId, bytes32 eventId) external view returns (bool exists);

    function getTraceSummary(
        bytes32 traceId
    )
        external
        view
        returns (
            bool exists,
            uint256 eventCount,
            bytes32 lastEventId,
            bytes32 lastEventTypeHash,
            bytes32 lastPayloadHash,
            bytes32 lastContextHash,
            uint256 lastOccurredAt,
            uint256 lastAnchoredAt
        );

    function recordEvent(
        bytes32 eventId,
        string calldata eventType,
        bytes32 payloadHash,
        string calldata actor,
        uint256 occurredAt
    ) external;
}
