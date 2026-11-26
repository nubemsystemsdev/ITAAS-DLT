// OwnableFlexible contract wrapper

"use strict";

import { Address, SmartContractEventWrapper, SmartContractEvent, AddressLike, MethodCallingOptions, MethodTransactionOptions, TransactionResult, SmartContractInterface, TransactionBuildDetails, QuantityLike, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: OwnableFlexible
 * Ownable with administrators.
 */
export class OwnableFlexibleWrapper {
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
     * Calls View method: administrators(address)
     * Method: administrators(address)
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async administrators(param_0: AddressLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("administrators", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: root()
     * Method: root()
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async root(options?: MethodCallingOptions): Promise<Address> {
        const __r: any = await this._contractInterface.callViewMethod("root", [], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: grantAdmin(address)
     * Grants administration permissions on the smart contract.
     * @param _address The account address.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async grantAdmin(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<OwnableFlexibleEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("grantAdmin", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OwnableFlexibleEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: grantAdmin(address)
     * Grants administration permissions on the smart contract.
     * @param _address The account address.
     * @returns The details for building the transaction
     */
    public grantAdmin$txBuildDetails(_address: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("grantAdmin", [_address]);
    }

    /**
     * Calls Transaction method: revokeAdmin(address)
     * Revokes administation permissions.
     * @param _address The account address.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeAdmin(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<OwnableFlexibleEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeAdmin", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OwnableFlexibleEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeAdmin(address)
     * Revokes administation permissions.
     * @param _address The account address.
     * @returns The details for building the transaction
     */
    public revokeAdmin$txBuildDetails(_address: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeAdmin", [_address]);
    }

    /**
     * Calls Transaction method: transferRoot(address)
     * Transfers the ownership of the smart contract.
     * @param _address The address to transfer the ownership.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transferRoot(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<OwnableFlexibleEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transferRoot", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OwnableFlexibleEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: transferRoot(address)
     * Transfers the ownership of the smart contract.
     * @param _address The address to transfer the ownership.
     * @returns The details for building the transaction
     */
    public transferRoot$txBuildDetails(_address: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("transferRoot", [_address]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<OwnableFlexibleEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new OwnableFlexibleEventCollection(events);
    }
}

/**
 * Possible event types for contract: OwnableFlexible
 */
export type OwnableFlexibleEventType = "AdminGranted" | "AdminRevoked" | "RootChanged";

/**
 * Collection of events for contract: OwnableFlexible
 */
export class OwnableFlexibleEventCollection {
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
    public getEventType(index: number): OwnableFlexibleEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: OwnableFlexibleEventType): OwnableFlexibleEventCollection {
        return new OwnableFlexibleEventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type AdminGranted(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getAdminGrantedEvent(index: number): SmartContractEventWrapper<AdminGrantedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                _admin: __r[0],
            },
        };
    }

    /**
     * Get an event of type AdminRevoked(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getAdminRevokedEvent(index: number): SmartContractEventWrapper<AdminRevokedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                _admin: __r[0],
            },
        };
    }

    /**
     * Get an event of type RootChanged(address) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getRootChangedEvent(index: number): SmartContractEventWrapper<RootChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                _root: __r[0],
            },
        };
    }
}

/**
 * Event: AdminGranted(address)
 * Admin granted event
 */
export interface AdminGrantedEvent {
    /**
     * Admin address
     */
    _admin: Address,
}

/**
 * Event: AdminRevoked(address)
 * Admin revoked event
 */
export interface AdminRevokedEvent {
    /**
     * Admin address
     */
    _admin: Address,
}

/**
 * Event: RootChanged(address)
 * Root change event
 */
export interface RootChangedEvent {
    /**
     * New root address
     */
    _root: Address,
}

const CONTRACT_ABI: ABILike = [
    {
        "inputs": [],
        "name": "AlreadyAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "CannotRevokeRootAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotAnAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotRoot",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "RootZeroAddress",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_admin",
                "type": "address"
            }
        ],
        "name": "AdminGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_admin",
                "type": "address"
            }
        ],
        "name": "AdminRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_root",
                "type": "address"
            }
        ],
        "name": "RootChanged",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "administrators",
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
                "internalType": "address",
                "name": "_address",
                "type": "address"
            }
        ],
        "name": "grantAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_address",
                "type": "address"
            }
        ],
        "name": "revokeAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "root",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_address",
                "type": "address"
            }
        ],
        "name": "transferRoot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
