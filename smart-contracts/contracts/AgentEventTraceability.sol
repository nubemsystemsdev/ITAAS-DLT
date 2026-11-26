// SPDX-License-Identifier: unspecified

pragma solidity ^0.8.24;

import "./base/BaseContract.sol";
import "./interfaces/IAgentEventTraceability.sol";

/**
 * AgentEventTraceability
 *
 * Lightweight on-chain ledger for traceability events.
 * Designed for IA -> DLT integration where business events are produced off-chain
 * and anchored on-chain with hashes/references for auditability.
 */
contract AgentEventTraceability is BaseContract, IAgentEventTraceability {
    /* Contract data */

    struct EventSummary {
        bool exists;
        bytes32 eventTypeHash;
        bytes32 actorHash;
        bytes32 payloadHash;
        uint256 occurredAt;
        uint256 anchoredAt;
    }

    mapping(bytes32 => EventSummary) private _eventSummaryById;

    /* Constructor */

    constructor() {}

    /* Initializer */

    /**
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     */
    function initialize(
        address roleManagerAddress,
        address upgradeControlAddress
    ) public reinitializer(1) {
        _initialize_base(roleManagerAddress, upgradeControlAddress);
    }

    /* View functions */

    /**
     * Compatibility note:
     * traceId is interpreted as eventId in the simplified model.
     */
    function traceExists(bytes32 traceId) public view override returns (bool exists) {
        return _eventSummaryById[traceId].exists;
    }

    function eventExists(bytes32 traceId, bytes32 eventId) public view override returns (bool exists) {
        traceId; // Unused in simplified model, kept for ABI compatibility.
        return _eventSummaryById[eventId].exists;
    }

    function getTraceSummary(
        bytes32 traceId
    )
        public
        view
        override
        returns (
            bool exists,
            uint256 eventCount,
            bytes32 lastEventId,
            bytes32 lastEventTypeHash,
            bytes32 lastPayloadHash,
            bytes32 lastContextHash,
            uint256 lastOccurredAt,
            uint256 lastAnchoredAt
        )
    {
        EventSummary storage summary = _eventSummaryById[traceId];

        return (
            summary.exists,
            summary.exists ? 1 : 0,
            traceId,
            summary.eventTypeHash,
            summary.payloadHash,
            summary.actorHash,
            summary.occurredAt,
            summary.anchoredAt
        );
    }

    /* Transaction functions */

    /**
     * Anchors one traceability event on-chain.
     * Input model matches the ingest endpoint payload.
     */
    function recordEvent(
        bytes32 eventId,
        string calldata eventType,
        bytes32 payloadHash,
        string calldata actor,
        uint256 occurredAt
    ) public override whenNotPaused onlyAdmin {
        bytes32 eventTypeHash = keccak256(bytes(eventType));
        bytes32 actorHash = keccak256(bytes(actor));

        require(eventId != bytes32(0), "Invalid eventId");
        require(payloadHash != bytes32(0), "Invalid payloadHash");
        require(bytes(eventType).length > 0, "Invalid eventType");
        require(bytes(actor).length > 0, "Invalid actor");
        require(eventTypeHash != bytes32(0), "Invalid eventTypeHash");
        require(actorHash != bytes32(0), "Invalid actorHash");
        require(occurredAt > 0, "Invalid occurredAt");
        require(!_eventSummaryById[eventId].exists, "Duplicated eventId");

        _eventSummaryById[eventId] = EventSummary({
            exists: true,
            eventTypeHash: eventTypeHash,
            actorHash: actorHash,
            payloadHash: payloadHash,
            occurredAt: occurredAt,
            anchoredAt: block.timestamp
        });

        emit TraceEventRecorded(
            eventId,
            eventType,
            payloadHash,
            actor,
            occurredAt,
            block.timestamp,
            msg.sender
        );
    }
}
