// UnifiedVCManager contract wrapper

"use strict";

import { Address, SmartContractEventWrapper, SmartContractEvent, AddressLike, MethodTransactionOptions, TransactionResult, MethodCallingOptions, BytesLike, SmartContractInterface, TransactionBuildDetails, QuantityLike, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: UnifiedVCManager
 */
export class UnifiedVCManagerWrapper {
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
     * Wrapper constructor
     * @param address Address of the smart contract
     * @param rpcOptions Options to connect to the blockchain
     */
    constructor(address: AddressLike, rpcOptions: RPCOptions) {
        this._contractInterface = new SmartContractInterface(address, CONTRACT_ABI, rpcOptions);
        this.address = this._contractInterface.address;
    }

    /**
     * Calls View method: isAdmin(address)
     * Method: isAdmin(address)
     * @param account account
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async isAdmin(account: AddressLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("isAdmin", [account], options || {});
        return __r[0];
    }

    /**
     * Calls View method: isRevoked(bytes32)
     * Method: isRevoked(bytes32)
     * @param credentialId credentialId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async isRevoked(credentialId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("isRevoked", [credentialId], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: addAdmin(address)
     * Method: addAdmin(address)
     * @param account account
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async addAdmin(account: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<UnifiedVCManagerEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("addAdmin", [account], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new UnifiedVCManagerEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: addAdmin(address)
     * Method: addAdmin(address)
     * @param account account
     * @returns The details for building the transaction
     */
    public addAdmin$txBuildDetails(account: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("addAdmin", [account]);
    }

    /**
     * Calls Transaction method: initialize(address)
     * Method: initialize(address)
     * @param initialAdmin initialAdmin
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(initialAdmin: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<UnifiedVCManagerEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [initialAdmin], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new UnifiedVCManagerEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: initialize(address)
     * Method: initialize(address)
     * @param initialAdmin initialAdmin
     * @returns The details for building the transaction
     */
    public initialize$txBuildDetails(initialAdmin: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("initialize", [initialAdmin]);
    }

    /**
     * Calls Transaction method: issueCredential(bytes32,address)
     * Method: issueCredential(bytes32,address)
     * @param credentialId credentialId
     * @param owner owner
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async issueCredential(credentialId: BytesLike, owner: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<UnifiedVCManagerEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("issueCredential", [credentialId, owner], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new UnifiedVCManagerEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: issueCredential(bytes32,address)
     * Method: issueCredential(bytes32,address)
     * @param credentialId credentialId
     * @param owner owner
     * @returns The details for building the transaction
     */
    public issueCredential$txBuildDetails(credentialId: BytesLike, owner: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("issueCredential", [credentialId, owner]);
    }

    /**
     * Calls Transaction method: removeAdmin(address)
     * Method: removeAdmin(address)
     * @param account account
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async removeAdmin(account: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<UnifiedVCManagerEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("removeAdmin", [account], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new UnifiedVCManagerEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: removeAdmin(address)
     * Method: removeAdmin(address)
     * @param account account
     * @returns The details for building the transaction
     */
    public removeAdmin$txBuildDetails(account: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("removeAdmin", [account]);
    }

    /**
     * Calls Transaction method: revokeCredential(bytes32)
     * Method: revokeCredential(bytes32)
     * @param credentialId credentialId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeCredential(credentialId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<UnifiedVCManagerEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeCredential", [credentialId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new UnifiedVCManagerEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeCredential(bytes32)
     * Method: revokeCredential(bytes32)
     * @param credentialId credentialId
     * @returns The details for building the transaction
     */
    public revokeCredential$txBuildDetails(credentialId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeCredential", [credentialId]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<UnifiedVCManagerEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new UnifiedVCManagerEventCollection(events);
    }
}

/**
 * Possible event types for contract: UnifiedVCManager
 */
export type UnifiedVCManagerEventType = "AdminAdded" | "AdminRemoved" | "CredentialIssued" | "CredentialRevoked";

/**
 * Collection of events for contract: UnifiedVCManager
 */
export class UnifiedVCManagerEventCollection {
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
    public getEventType(index: number): UnifiedVCManagerEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: UnifiedVCManagerEventType): UnifiedVCManagerEventCollection {
        return new UnifiedVCManagerEventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type AdminAdded(address,address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getAdminAddedEvent(index: number): SmartContractEventWrapper<AdminAddedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                newAdmin: __r[0],
                addedBy: __r[1],
            },
        };
    }

    /**
     * Get an event of type AdminRemoved(address,address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getAdminRemovedEvent(index: number): SmartContractEventWrapper<AdminRemovedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                removedAdmin: __r[0],
                removedBy: __r[1],
            },
        };
    }

    /**
     * Get an event of type CredentialIssued(bytes32,address,address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCredentialIssuedEvent(index: number): SmartContractEventWrapper<CredentialIssuedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                credentialId: __r[0],
                owner: __r[1],
                admin: __r[2],
            },
        };
    }

    /**
     * Get an event of type CredentialRevoked(bytes32,address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getCredentialRevokedEvent(index: number): SmartContractEventWrapper<CredentialRevokedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                credentialId: __r[0],
                admin: __r[1],
            },
        };
    }
}

/**
 * Event: AdminAdded(address,address)
 */
export interface AdminAddedEvent {
    newAdmin: Address,

    addedBy: Address,
}

/**
 * Event: AdminRemoved(address,address)
 */
export interface AdminRemovedEvent {
    removedAdmin: Address,

    removedBy: Address,
}

/**
 * Event: CredentialIssued(bytes32,address,address)
 */
export interface CredentialIssuedEvent {
    credentialId: string,

    owner: Address,

    admin: Address,
}

/**
 * Event: CredentialRevoked(bytes32,address)
 */
export interface CredentialRevokedEvent {
    credentialId: string,

    admin: Address,
}

const CONTRACT_ABI: ABILike = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "newAdmin",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "addedBy",
                "type": "address"
            }
        ],
        "name": "AdminAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "removedAdmin",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "removedBy",
                "type": "address"
            }
        ],
        "name": "AdminRemoved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credentialId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "admin",
                "type": "address"
            }
        ],
        "name": "CredentialIssued",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credentialId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "admin",
                "type": "address"
            }
        ],
        "name": "CredentialRevoked",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "addAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "initialAdmin",
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
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "isAdmin",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "credentialId",
                "type": "bytes32"
            }
        ],
        "name": "isRevoked",
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
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "credentialId",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "issueCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "removeAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "credentialId",
                "type": "bytes32"
            }
        ],
        "name": "revokeCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
