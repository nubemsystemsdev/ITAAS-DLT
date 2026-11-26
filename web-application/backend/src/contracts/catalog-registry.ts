// CatalogRegistry contract wrapper

"use strict";

import { BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Quantity, SmartContractEventWrapper, SmartContractEvent, Address, MethodCallingOptions, QuantityLike, MethodTransactionOptions, TransactionResult, AddressLike, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: CatalogRegistry
 * CatalogRegistry Stores ITAAS catalog items on-chain for traceability. Supports publication, updates, withdrawals and visibility changes.
 */
export class CatalogRegistryWrapper {
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
    public static async deploy(bytecode: BytesLike, options: TransactionSendingOptions): Promise<CatalogRegistryWrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new CatalogRegistryWrapper(deployed.result, options);
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
     * Calls View method: getItem(bytes32)
     * Gets catalog item details
     * @param itemId The catalog item identifier
     * @param options The options for sending the request
     * @returns createdAt Block timestamp when created
     * @returns exists Whether the item exists
     * @returns status Current item status
     * @returns updatedAt Block timestamp when last updated
     * @returns visibility Current visibility setting
     */
    public async getItem(itemId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, visibility: Quantity, status: Quantity, createdAt: Quantity, updatedAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getItem", [itemId], options || {});
        return {
            exists: __r[0],
            visibility: __r[1],
            status: __r[2],
            createdAt: __r[3],
            updatedAt: __r[4],
        };
    }

    /**
     * Calls View method: itemExists(bytes32)
     * Checks if a catalog item exists
     * @param itemId The catalog item identifier
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async itemExists(itemId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("itemExists", [itemId], options || {});
        return __r[0];
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
     * Calls Transaction method: createItem(bytes32,uint8)
     * Creates a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async createItem(itemId: BytesLike, visibility: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("createItem", [itemId, visibility], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: createItem(bytes32,uint8)
     * Creates a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     * @returns The details for building the transaction
     */
    public createItem$txBuildDetails(itemId: BytesLike, visibility: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("createItem", [itemId, visibility]);
    }

    /**
     * Calls Transaction method: deleteItem(bytes32)
     * Deletes a catalog item
     * @param itemId The catalog item identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async deleteItem(itemId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("deleteItem", [itemId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: deleteItem(bytes32)
     * Deletes a catalog item
     * @param itemId The catalog item identifier
     * @returns The details for building the transaction
     */
    public deleteItem$txBuildDetails(itemId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("deleteItem", [itemId]);
    }

    /**
     * Calls Transaction method: initialize(address,address)
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(roleManagerAddress: AddressLike, upgradeControlAddress: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [roleManagerAddress, upgradeControlAddress], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
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
    public async pause(options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("pause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
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
     * Calls Transaction method: publishItem(bytes32,uint8)
     * Publishes a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async publishItem(itemId: BytesLike, visibility: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("publishItem", [itemId, visibility], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: publishItem(bytes32,uint8)
     * Publishes a new catalog item
     * @param itemId The catalog item identifier
     * @param visibility Initial visibility setting
     * @returns The details for building the transaction
     */
    public publishItem$txBuildDetails(itemId: BytesLike, visibility: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("publishItem", [itemId, visibility]);
    }

    /**
     * Calls Transaction method: unpause()
     * Unpauses the smart contract Requires ADMIN role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async unpause(options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("unpause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
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
     * Calls Transaction method: updateItem(bytes32)
     * Updates an existing catalog item
     * @param itemId The catalog item identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async updateItem(itemId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("updateItem", [itemId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: updateItem(bytes32)
     * Updates an existing catalog item
     * @param itemId The catalog item identifier
     * @returns The details for building the transaction
     */
    public updateItem$txBuildDetails(itemId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("updateItem", [itemId]);
    }

    /**
     * Calls Transaction method: upgradeToAndCall(address,bytes)
     * Method: upgradeToAndCall(address,bytes)
     * @param newImplementation newImplementation
     * @param data data
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async upgradeToAndCall(newImplementation: AddressLike, data: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("upgradeToAndCall", [newImplementation, data], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
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
     * Calls Transaction method: withdrawItem(bytes32)
     * Withdraws a published catalog item
     * @param itemId The catalog item identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async withdrawItem(itemId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<CatalogRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("withdrawItem", [itemId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new CatalogRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: withdrawItem(bytes32)
     * Withdraws a published catalog item
     * @param itemId The catalog item identifier
     * @returns The details for building the transaction
     */
    public withdrawItem$txBuildDetails(itemId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("withdrawItem", [itemId]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<CatalogRegistryEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new CatalogRegistryEventCollection(events);
    }
}

/**
 * Possible event types for contract: CatalogRegistry
 */
export type CatalogRegistryEventType = "CatalogItemCreated" | "CatalogItemDeleted" | "CatalogItemPublished" | "CatalogItemUpdated" | "CatalogItemWithdrawn" | "Initialized" | "Paused" | "Unpaused" | "Upgraded";

/**
 * Collection of events for contract: CatalogRegistry
 */
export class CatalogRegistryEventCollection {
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
    public getEventType(index: number): CatalogRegistryEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: CatalogRegistryEventType): CatalogRegistryEventCollection {
        return new CatalogRegistryEventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type CatalogItemCreated(bytes32,uint8) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCatalogItemCreatedEvent(index: number): SmartContractEventWrapper<CatalogItemCreatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                itemId: __r[0],
                visibility: __r[1],
            },
        };
    }

    /**
     * Get an event of type CatalogItemDeleted(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCatalogItemDeletedEvent(index: number): SmartContractEventWrapper<CatalogItemDeletedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                itemId: __r[0],
            },
        };
    }

    /**
     * Get an event of type CatalogItemPublished(bytes32,uint8) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCatalogItemPublishedEvent(index: number): SmartContractEventWrapper<CatalogItemPublishedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                itemId: __r[0],
                visibility: __r[1],
            },
        };
    }

    /**
     * Get an event of type CatalogItemUpdated(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCatalogItemUpdatedEvent(index: number): SmartContractEventWrapper<CatalogItemUpdatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                itemId: __r[0],
            },
        };
    }

    /**
     * Get an event of type CatalogItemWithdrawn(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCatalogItemWithdrawnEvent(index: number): SmartContractEventWrapper<CatalogItemWithdrawnEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                itemId: __r[0],
            },
        };
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
 * Event: CatalogItemCreated(bytes32,uint8)
 * CatalogItemCreated - A new catalog item was created
 */
export interface CatalogItemCreatedEvent {
    /**
     * The catalog item identifier
     */
    itemId: string,

    /**
     * Initial visibility setting
     */
    visibility: Quantity,
}

/**
 * Event: CatalogItemDeleted(bytes32)
 * CatalogItemDeleted - A catalog item was deleted
 */
export interface CatalogItemDeletedEvent {
    /**
     * The catalog item identifier
     */
    itemId: string,
}

/**
 * Event: CatalogItemPublished(bytes32,uint8)
 * CatalogItemPublished - A new catalog item was published
 */
export interface CatalogItemPublishedEvent {
    /**
     * The catalog item identifier
     */
    itemId: string,

    /**
     * Initial visibility setting
     */
    visibility: Quantity,
}

/**
 * Event: CatalogItemUpdated(bytes32)
 * CatalogItemUpdated - An existing catalog item was updated
 */
export interface CatalogItemUpdatedEvent {
    /**
     * The catalog item identifier
     */
    itemId: string,
}

/**
 * Event: CatalogItemWithdrawn(bytes32)
 * CatalogItemWithdrawn - A published catalog item was withdrawn
 */
export interface CatalogItemWithdrawnEvent {
    /**
     * The catalog item identifier
     */
    itemId: string,
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
                "indexed": true,
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "enum ICatalogRegistry.VISIBILITY",
                "name": "visibility",
                "type": "uint8"
            }
        ],
        "name": "CatalogItemCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "CatalogItemDeleted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "enum ICatalogRegistry.VISIBILITY",
                "name": "visibility",
                "type": "uint8"
            }
        ],
        "name": "CatalogItemPublished",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "CatalogItemUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "CatalogItemWithdrawn",
        "type": "event"
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
                "name": "itemId",
                "type": "bytes32"
            },
            {
                "internalType": "enum ICatalogRegistry.VISIBILITY",
                "name": "visibility",
                "type": "uint8"
            }
        ],
        "name": "createItem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "deleteItem",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "getItem",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "enum ICatalogRegistry.VISIBILITY",
                "name": "visibility",
                "type": "uint8"
            },
            {
                "internalType": "enum ICatalogRegistry.CATALOG_ITEM_STATUS",
                "name": "status",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "createdAt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "updatedAt",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "itemExists",
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
                "name": "itemId",
                "type": "bytes32"
            },
            {
                "internalType": "enum ICatalogRegistry.VISIBILITY",
                "name": "visibility",
                "type": "uint8"
            }
        ],
        "name": "publishItem",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "updateItem",
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
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "itemId",
                "type": "bytes32"
            }
        ],
        "name": "withdrawItem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
