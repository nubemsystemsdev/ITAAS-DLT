// PaymentRouter contract wrapper

"use strict";

import { BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Address, SmartContractEventWrapper, SmartContractEvent, Quantity, AddressLike, MethodCallingOptions, MethodTransactionOptions, TransactionResult, QuantityLike, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: PaymentRouter
 * PaymentRouter - Registry for payment records.
 */
export class PaymentRouterWrapper {
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
    public static async deploy(bytecode: BytesLike, options: TransactionSendingOptions): Promise<PaymentRouterWrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new PaymentRouterWrapper(deployed.result, options);
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
     * Calls View method: administrators(address)
     * Administrators allowed to record payments
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async administrators(param_0: AddressLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("administrators", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: isPaymentRecorded(bytes32)
     * Checks whether a payment ID was already recorded.
     * @param paymentId The payment identifier
     * @param options The options for sending the request
     * @returns bool True if payment is already recorded
     */
    public async isPaymentRecorded(paymentId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("isPaymentRecorded", [paymentId], options || {});
        return __r[0];
    }

    /**
     * Calls View method: recorded(bytes32)
     * Registered payment IDs
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async recorded(param_0: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("recorded", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: root()
     * Contract owner
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async root(options?: MethodCallingOptions): Promise<Address> {
        const __r: any = await this._contractInterface.callViewMethod("root", [], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: grantAdmin(address)
     * Grants administrator permissions.
     * @param account The account address
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async grantAdmin(account: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<PaymentRouterEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("grantAdmin", [account], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new PaymentRouterEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: grantAdmin(address)
     * Grants administrator permissions.
     * @param account The account address
     * @returns The details for building the transaction
     */
    public grantAdmin$txBuildDetails(account: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("grantAdmin", [account]);
    }

    /**
     * Calls Transaction method: initialize()
     * Initializes the smart contract (for proxy deployment). Replicates constructor state initialization in the proxy storage. Can only be called once (when root is not yet set).
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(options: MethodTransactionOptions): Promise<TransactionResult<PaymentRouterEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new PaymentRouterEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: initialize()
     * Initializes the smart contract (for proxy deployment). Replicates constructor state initialization in the proxy storage. Can only be called once (when root is not yet set).
     * @returns The details for building the transaction
     */
    public initialize$txBuildDetails(): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("initialize", []);
    }

    /**
     * Calls Transaction method: recordPayment(bytes32,address,uint256,uint8,string)
     * Records a payment operation.
     * @param paymentId Unique payment identifier
     * @param account Account related to the payment
     * @param amount Payment amount
     * @param kind Payment kind/type
     * @param ref External payment reference
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async recordPayment(paymentId: BytesLike, account: AddressLike, amount: QuantityLike, kind: QuantityLike, ref: string, options: MethodTransactionOptions): Promise<TransactionResult<PaymentRouterEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("recordPayment", [paymentId, account, amount, kind, ref], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new PaymentRouterEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: recordPayment(bytes32,address,uint256,uint8,string)
     * Records a payment operation.
     * @param paymentId Unique payment identifier
     * @param account Account related to the payment
     * @param amount Payment amount
     * @param kind Payment kind/type
     * @param ref External payment reference
     * @returns The details for building the transaction
     */
    public recordPayment$txBuildDetails(paymentId: BytesLike, account: AddressLike, amount: QuantityLike, kind: QuantityLike, ref: string): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("recordPayment", [paymentId, account, amount, kind, ref]);
    }

    /**
     * Calls Transaction method: revokeAdmin(address)
     * Revokes administrator permissions.
     * @param account The account address
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeAdmin(account: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<PaymentRouterEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeAdmin", [account], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new PaymentRouterEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeAdmin(address)
     * Revokes administrator permissions.
     * @param account The account address
     * @returns The details for building the transaction
     */
    public revokeAdmin$txBuildDetails(account: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeAdmin", [account]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<PaymentRouterEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new PaymentRouterEventCollection(events);
    }
}

/**
 * Possible event types for contract: PaymentRouter
 */
export type PaymentRouterEventType = "AdminGranted" | "AdminRevoked" | "PaymentRecorded";

/**
 * Collection of events for contract: PaymentRouter
 */
export class PaymentRouterEventCollection {
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
    public getEventType(index: number): PaymentRouterEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: PaymentRouterEventType): PaymentRouterEventCollection {
        return new PaymentRouterEventCollection(this.events.filter(event => event.name === eventType));
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
                account: __r[0],
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
                account: __r[0],
            },
        };
    }

    /**
     * Get an event of type PaymentRecorded(bytes32,address,uint256,uint8,string) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getPaymentRecordedEvent(index: number): SmartContractEventWrapper<PaymentRecordedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                paymentId: __r[0],
                account: __r[1],
                amount: __r[2],
                kind: __r[3],
                ref: __r[4],
            },
        };
    }
}

/**
 * Event: AdminGranted(address)
 */
export interface AdminGrantedEvent {
    account: Address,
}

/**
 * Event: AdminRevoked(address)
 */
export interface AdminRevokedEvent {
    account: Address,
}

/**
 * Event: PaymentRecorded(bytes32,address,uint256,uint8,string)
 */
export interface PaymentRecordedEvent {
    paymentId: string,

    account: Address,

    amount: Quantity,

    kind: Quantity,

    ref: string,
}

const CONTRACT_ABI: ABILike = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "AlreadyInitialized",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "AlreadyRecorded",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotRoot",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
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
                "name": "account",
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
                "internalType": "bytes32",
                "name": "paymentId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "kind",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "ref",
                "type": "string"
            }
        ],
        "name": "PaymentRecorded",
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
                "name": "account",
                "type": "address"
            }
        ],
        "name": "grantAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "paymentId",
                "type": "bytes32"
            }
        ],
        "name": "isPaymentRecorded",
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
                "name": "paymentId",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "kind",
                "type": "uint8"
            },
            {
                "internalType": "string",
                "name": "ref",
                "type": "string"
            }
        ],
        "name": "recordPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "recorded",
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
                "name": "account",
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
    }
];
