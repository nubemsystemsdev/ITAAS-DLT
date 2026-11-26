// AgentEventTraceability contract wrapper

"use strict";

import { BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Quantity, SmartContractEventWrapper, SmartContractEvent, Address, MethodCallingOptions, AddressLike, MethodTransactionOptions, TransactionResult, QuantityLike, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: AgentEventTraceability
 * AgentEventTraceability Lightweight on-chain ledger for traceability events. Designed for IA -> DLT integration where business events are produced off-chain and anchored on-chain with hashes/references for auditability.
 */
export class AgentEventTraceabilityWrapper {
    /**
     * Gets the ABI the smart contract
     * @returns The ABI
     */
    public static abi(): ABILike {
        return CONTRACT_ABI;
    }

    /**
     * Address of the smart contract
     */
    public address: Address;

    private _contractInterface: SmartContractInterface;

    /**
     * Deploys the smart contract
     * @param bytecode The smart contract bytecode
     * @param options The options for sending the transaction
     * @returns An smart contract wrapper for the deployed contract
     */
    public static async deploy(bytecode: BytesLike, options: TransactionSendingOptions): Promise<AgentEventTraceabilityWrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new AgentEventTraceabilityWrapper(deployed.result, options);
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets transaction details to deploy an smart contract
     * @param bytecode The smart contract bytecode
     * @returns An smart contract wrapper for the deployed contract
     */
    public static getDeployTxBuildDetails(bytecode: BytesLike): TransactionBuildDetails {
        return getTxBuildDetailsForDeploy(bytecode, CONTRACT_ABI, [], 0);
    }

    /**
     * Wrapper constructor
     * @param address Address of the smart contract
     * @param rpcOptions Options to connect to the blockchain
     */
    constructor(address: AddressLike, rpcOptions: RPCOptions) {
        this._contractInterface = new SmartContractInterface(address, CONTRACT_ABI, rpcOptions);
        this.address = this._contractInterface.address;
    }

    /**
     * Calls View method: UPGRADE_INTERFACE_VERSION()
     * Method: UPGRADE_INTERFACE_VERSION()
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async UPGRADE_INTERFACE_VERSION(options?: MethodCallingOptions): Promise<string> {
        const __r: any = await this._contractInterface.callViewMethod("UPGRADE_INTERFACE_VERSION", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: eventExists(bytes32,bytes32)
     * Method: eventExists(bytes32,bytes32)
     * @param traceId traceId
     * @param eventId eventId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async eventExists(traceId: BytesLike, eventId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("eventExists", [traceId, eventId], options || {});
        return __r[0];
    }

    /**
     * Calls View method: getInitializedVersion()
     * Gets the current initialized version Use this method to figure out the last deployed version of the contract
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async getInitializedVersion(options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("getInitializedVersion", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: getTraceSummary(bytes32)
     * Method: getTraceSummary(bytes32)
     * @param traceId traceId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async getTraceSummary(traceId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, eventCount: Quantity, lastEventId: string, lastEventTypeHash: string, lastPayloadHash: string, lastContextHash: string, lastOccurredAt: Quantity, lastAnchoredAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getTraceSummary", [traceId], options || {});
        return {
            exists: __r[0],
            eventCount: __r[1],
            lastEventId: __r[2],
            lastEventTypeHash: __r[3],
            lastPayloadHash: __r[4],
            lastContextHash: __r[5],
            lastOccurredAt: __r[6],
            lastAnchoredAt: __r[7],
        };
    }

    /**
     * Calls View method: paused()
     * Checks if the smart contract is paused
     * @param options The options for sending the request
     * @returns bool True if paused, false otherwise
     */
    public async paused(options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("paused", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: proxiableUUID()
     * Method: proxiableUUID()
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async proxiableUUID(options?: MethodCallingOptions): Promise<string> {
        const __r: any = await this._contractInterface.callViewMethod("proxiableUUID", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: traceExists(bytes32)
     * Compatibility note: traceId is interpreted as eventId in the simplified model.
     * @param traceId traceId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async traceExists(traceId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("traceExists", [traceId], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: initialize(address,address)
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(roleManagerAddress: AddressLike, upgradeControlAddress: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<AgentEventTraceabilityEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [roleManagerAddress, upgradeControlAddress], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new AgentEventTraceabilityEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: initialize(address,address)
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     * @returns The details for building the transaction
     */
    public initialize$txBuildDetails(roleManagerAddress: AddressLike, upgradeControlAddress: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("initialize", [roleManagerAddress, upgradeControlAddress]);
    }

    /**
     * Calls Transaction method: pause()
     * Pauses the smart contract Requires ADMIN role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async pause(options: MethodTransactionOptions): Promise<TransactionResult<AgentEventTraceabilityEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("pause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new AgentEventTraceabilityEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: pause()
     * Pauses the smart contract Requires ADMIN role
     * @returns The details for building the transaction
     */
    public pause$txBuildDetails(): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("pause", []);
    }

    /**
     * Calls Transaction method: recordEvent(bytes32,string,bytes32,string,uint256)
     * Anchors one traceability event on-chain. Input model matches the ingest endpoint payload.
     * @param eventId eventId
     * @param eventType eventType
     * @param payloadHash payloadHash
     * @param actor actor
     * @param occurredAt occurredAt
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async recordEvent(eventId: BytesLike, eventType: string, payloadHash: BytesLike, actor: string, occurredAt: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<AgentEventTraceabilityEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("recordEvent", [eventId, eventType, payloadHash, actor, occurredAt], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new AgentEventTraceabilityEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: recordEvent(bytes32,string,bytes32,string,uint256)
     * Anchors one traceability event on-chain. Input model matches the ingest endpoint payload.
     * @param eventId eventId
     * @param eventType eventType
     * @param payloadHash payloadHash
     * @param actor actor
     * @param occurredAt occurredAt
     * @returns The details for building the transaction
     */
    public recordEvent$txBuildDetails(eventId: BytesLike, eventType: string, payloadHash: BytesLike, actor: string, occurredAt: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("recordEvent", [eventId, eventType, payloadHash, actor, occurredAt]);
    }

    /**
     * Calls Transaction method: unpause()
     * Unpauses the smart contract Requires ADMIN role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async unpause(options: MethodTransactionOptions): Promise<TransactionResult<AgentEventTraceabilityEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("unpause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new AgentEventTraceabilityEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: unpause()
     * Unpauses the smart contract Requires ADMIN role
     * @returns The details for building the transaction
     */
    public unpause$txBuildDetails(): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("unpause", []);
    }

    /**
     * Calls Transaction method: upgradeToAndCall(address,bytes)
     * Method: upgradeToAndCall(address,bytes)
     * @param newImplementation newImplementation
     * @param data data
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async upgradeToAndCall(newImplementation: AddressLike, data: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<AgentEventTraceabilityEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("upgradeToAndCall", [newImplementation, data], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new AgentEventTraceabilityEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: upgradeToAndCall(address,bytes)
     * Method: upgradeToAndCall(address,bytes)
     * @param newImplementation newImplementation
     * @param data data
     * @returns The details for building the transaction
     */
    public upgradeToAndCall$txBuildDetails(newImplementation: AddressLike, data: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("upgradeToAndCall", [newImplementation, data]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<AgentEventTraceabilityEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new AgentEventTraceabilityEventCollection(events);
    }
}

/**
 * Possible event types for contract: AgentEventTraceability
 */
export type AgentEventTraceabilityEventType = "Initialized" | "Paused" | "TraceEventRecorded" | "Unpaused" | "Upgraded";

/**
 * Collection of events for contract: AgentEventTraceability
 */
export class AgentEventTraceabilityEventCollection {
    /**
     * Array of events
     */
    public events: SmartContractEvent[];

    /**
     * Event collection constructor
     * @param events Array of events
     */
    constructor(events: SmartContractEvent[]) {
        this.events = events;
    }

    /**
     * Gets the number of events in the collection
     * @returns The event count
     */
    public length(): number {
        return this.events.length;
    }

    /**
     * Gets the event type given the index
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event type
     */
    public getEventType(index: number): AgentEventTraceabilityEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: AgentEventTraceabilityEventType): AgentEventTraceabilityEventCollection {
        return new AgentEventTraceabilityEventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type Initialized(uint64) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getInitializedEvent(index: number): SmartContractEventWrapper<InitializedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                version: __r[0],
            },
        };
    }

    /**
     * Get an event of type Paused(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getPausedEvent(index: number): SmartContractEventWrapper<PausedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                by: __r[0],
            },
        };
    }

    /**
     * Get an event of type TraceEventRecorded(bytes32,string,bytes32,string,uint256,uint256,address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getTraceEventRecordedEvent(index: number): SmartContractEventWrapper<TraceEventRecordedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                eventId: __r[0],
                eventType: __r[1],
                payloadHash: __r[2],
                actor: __r[3],
                occurredAt: __r[4],
                anchoredAt: __r[5],
                submittedBy: __r[6],
            },
        };
    }

    /**
     * Get an event of type Unpaused(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getUnpausedEvent(index: number): SmartContractEventWrapper<UnpausedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                by: __r[0],
            },
        };
    }

    /**
     * Get an event of type Upgraded(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getUpgradedEvent(index: number): SmartContractEventWrapper<UpgradedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                implementation: __r[0],
            },
        };
    }
}

/**
 * Event: Initialized(uint64)
 */
export interface InitializedEvent {
    version: Quantity,
}

/**
 * Event: Paused(address)
 * Paused - The smart contract was paused
 */
export interface PausedEvent {
    /**
     * The administrator who paused the smart contract
     */
    by: Address,
}

/**
 * Event: TraceEventRecorded(bytes32,string,bytes32,string,uint256,uint256,address)
 * TraceEventRecorded - A new traceability event was anchored
 */
export interface TraceEventRecordedEvent {
    /**
     * Unique event identifier (UUID hash)
     */
    eventId: string,

    /**
     * Canonical business event type (e.g., "execution.started")
     */
    eventType: string,

    /**
     * Hash of relevant payload snapshot
     */
    payloadHash: string,

    /**
     * Actor/user identifier
     */
    actor: string,

    /**
     * Event occurrence timestamp (provided by source system)
     */
    occurredAt: Quantity,

    /**
     * Block timestamp when anchored
     */
    anchoredAt: Quantity,

    /**
     * Address that submitted the anchoring tx
     */
    submittedBy: Address,
}

/**
 * Event: Unpaused(address)
 * Paused - The smart contract was paused
 */
export interface UnpausedEvent {
    /**
     * The administrator who paused the smart contract
     */
    by: Address,
}

/**
 * Event: Upgraded(address)
 */
export interface UpgradedEvent {
    implementation: Address,
}

const CONTRACT_ABI: ABILike = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "target",
                "type": "address"
            }
        ],
        "name": "AddressEmptyCode",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "implementation",
                "type": "address"
            }
        ],
        "name": "ERC1967InvalidImplementation",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ERC1967NonPayable",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "FailedInnerCall",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidInitialization",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotInitializing",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "UUPSUnauthorizedCallContext",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "slot",
                "type": "bytes32"
            }
        ],
        "name": "UUPSUnsupportedProxiableUUID",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "version",
                "type": "uint64"
            }
        ],
        "name": "Initialized",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "by",
                "type": "address"
            }
        ],
        "name": "Paused",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "eventType",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "payloadHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "actor",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "occurredAt",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "anchoredAt",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "submittedBy",
                "type": "address"
            }
        ],
        "name": "TraceEventRecorded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "by",
                "type": "address"
            }
        ],
        "name": "Unpaused",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "implementation",
                "type": "address"
            }
        ],
        "name": "Upgraded",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "UPGRADE_INTERFACE_VERSION",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "traceId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            }
        ],
        "name": "eventExists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getInitializedVersion",
        "outputs": [
            {
                "internalType": "uint64",
                "name": "v",
                "type": "uint64"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "traceId",
                "type": "bytes32"
            }
        ],
        "name": "getTraceSummary",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "eventCount",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "lastEventId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "lastEventTypeHash",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "lastPayloadHash",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "lastContextHash",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "lastOccurredAt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "lastAnchoredAt",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "roleManagerAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "upgradeControlAddress",
                "type": "address"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pause",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "paused",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "proxiableUUID",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "eventType",
                "type": "string"
            },
            {
                "internalType": "bytes32",
                "name": "payloadHash",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "actor",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "occurredAt",
                "type": "uint256"
            }
        ],
        "name": "recordEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "traceId",
                "type": "bytes32"
            }
        ],
        "name": "traceExists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "unpause",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newImplementation",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "upgradeToAndCall",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];
