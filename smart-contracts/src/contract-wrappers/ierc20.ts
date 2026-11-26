// IERC20 contract wrapper

"use strict";

import { Address, Quantity, SmartContractEventWrapper, SmartContractEvent, AddressLike, MethodCallingOptions, QuantityLike, MethodTransactionOptions, TransactionResult, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: IERC20
 */
export class IERC20Wrapper {
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
     * Calls View method: allowance(address,address)
     * Method: allowance(address,address)
     * @param owner owner
     * @param spender spender
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async allowance(owner: AddressLike, spender: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("allowance", [owner, spender], options || {});
        return __r[0];
    }

    /**
     * Calls View method: balanceOf(address)
     * Method: balanceOf(address)
     * @param account account
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async balanceOf(account: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("balanceOf", [account], options || {});
        return __r[0];
    }

    /**
     * Calls View method: totalSupply()
     * Method: totalSupply()
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async totalSupply(options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("totalSupply", [], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: approve(address,uint256)
     * Method: approve(address,uint256)
     * @param spender spender
     * @param value value
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async approve(spender: AddressLike, value: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<IERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("approve", [spender, value], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new IERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: approve(address,uint256)
     * Method: approve(address,uint256)
     * @param spender spender
     * @param value value
     * @returns The details for building the transaction
     */
    public approve$txBuildDetails(spender: AddressLike, value: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("approve", [spender, value]);
    }

    /**
     * Calls Transaction method: transfer(address,uint256)
     * Method: transfer(address,uint256)
     * @param to to
     * @param value value
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transfer(to: AddressLike, value: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<IERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transfer", [to, value], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new IERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: transfer(address,uint256)
     * Method: transfer(address,uint256)
     * @param to to
     * @param value value
     * @returns The details for building the transaction
     */
    public transfer$txBuildDetails(to: AddressLike, value: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("transfer", [to, value]);
    }

    /**
     * Calls Transaction method: transferFrom(address,address,uint256)
     * Method: transferFrom(address,address,uint256)
     * @param from from
     * @param to to
     * @param value value
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transferFrom(from: AddressLike, to: AddressLike, value: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<IERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transferFrom", [from, to, value], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new IERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: transferFrom(address,address,uint256)
     * Method: transferFrom(address,address,uint256)
     * @param from from
     * @param to to
     * @param value value
     * @returns The details for building the transaction
     */
    public transferFrom$txBuildDetails(from: AddressLike, to: AddressLike, value: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("transferFrom", [from, to, value]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<IERC20EventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new IERC20EventCollection(events);
    }
}

/**
 * Possible event types for contract: IERC20
 */
export type IERC20EventType = "Approval" | "Transfer";

/**
 * Collection of events for contract: IERC20
 */
export class IERC20EventCollection {
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
    public getEventType(index: number): IERC20EventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: IERC20EventType): IERC20EventCollection {
        return new IERC20EventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type Approval(address,address,uint256) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getApprovalEvent(index: number): SmartContractEventWrapper<ApprovalEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                owner: __r[0],
                spender: __r[1],
                value: __r[2],
            },
        };
    }

    /**
     * Get an event of type Transfer(address,address,uint256) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getTransferEvent(index: number): SmartContractEventWrapper<TransferEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                from: __r[0],
                to: __r[1],
                value: __r[2],
            },
        };
    }
}

/**
 * Event: Approval(address,address,uint256)
 */
export interface ApprovalEvent {
    owner: Address,

    spender: Address,

    value: Quantity,
}

/**
 * Event: Transfer(address,address,uint256)
 */
export interface TransferEvent {
    from: Address,

    to: Address,

    value: Quantity,
}

const CONTRACT_ABI: ABILike = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
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
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
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
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
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
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
