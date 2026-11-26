// ERC20 contract wrapper

"use strict";

import { QuantityLike, BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Address, SmartContractEventWrapper, SmartContractEvent, Quantity, AddressLike, MethodCallingOptions, MethodTransactionOptions, TransactionResult, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: ERC20
 * Generic contract for fungible tokens. Standard name: ERC20
 */
export class ERC20Wrapper {
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
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param decimals_ Number of decimals
     * @param bytecode The smart contract bytecode
     * @param options The options for sending the transaction
     * @returns An smart contract wrapper for the deployed contract
     */
    public static async deploy(name_: string, symbol_: string, decimals_: QuantityLike, bytecode: BytesLike, options: TransactionSendingOptions): Promise<ERC20Wrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [name_, symbol_, decimals_], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new ERC20Wrapper(deployed.result, options);
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets transaction details to deploy an smart contract
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param decimals_ Number of decimals
     * @param bytecode The smart contract bytecode
     * @returns An smart contract wrapper for the deployed contract
     */
    public static getDeployTxBuildDetails(name_: string, symbol_: string, decimals_: QuantityLike, bytecode: BytesLike): TransactionBuildDetails {
        return getTxBuildDetailsForDeploy(bytecode, CONTRACT_ABI, [name_, symbol_, decimals_], 0);
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
     * Calls View method: allowance(address,address)
     * Checks the allowance for an authorized spender. Defined in IERC20.
     * @param owner owner of the account
     * @param spender Authorized spender
     * @param options The options for sending the request
     * @returns uint256 The amount authorized to spend
     */
    public async allowance(owner: AddressLike, spender: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("allowance", [owner, spender], options || {});
        return __r[0];
    }

    /**
     * Calls View method: balanceOf(address)
     * Gets the balance of an account. Defined in IERC20.
     * @param account The account
     * @param options The options for sending the request
     * @returns uint256 The balance of the account
     */
    public async balanceOf(account: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("balanceOf", [account], options || {});
        return __r[0];
    }

    /**
     * Calls View method: decimals()
     * Gets the number of decimals of the token.
     * @param options The options for sending the request
     * @returns uint8 The number of decimals
     */
    public async decimals(options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("decimals", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: name()
     * Gets the name of the token.
     * @param options The options for sending the request
     * @returns string The token name
     */
    public async name(options?: MethodCallingOptions): Promise<string> {
        const __r: any = await this._contractInterface.callViewMethod("name", [], options || {});
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
     * Calls View method: symbol()
     * Gets the symbol of the token.
     * @param options The options for sending the request
     * @returns string The token symbol
     */
    public async symbol(options?: MethodCallingOptions): Promise<string> {
        const __r: any = await this._contractInterface.callViewMethod("symbol", [], options || {});
        return __r[0];
    }

    /**
     * Calls View method: totalSupply()
     * Gets the total supply in circulation. Defined in IERC20.
     * @param options The options for sending the request
     * @returns uint256 The total supply
     */
    public async totalSupply(options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("totalSupply", [], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: approve(address,uint256)
     * Approves an authorized spender to transfer an specific amount from your account. Defined in IERC20.
     * @param spender The authorized spender
     * @param amount The authorized amount
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async approve(spender: AddressLike, amount: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("approve", [spender, amount], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: approve(address,uint256)
     * Approves an authorized spender to transfer an specific amount from your account. Defined in IERC20.
     * @param spender The authorized spender
     * @param amount The authorized amount
     * @returns The details for building the transaction
     */
    public approve$txBuildDetails(spender: AddressLike, amount: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("approve", [spender, amount]);
    }

    /**
     * Calls Transaction method: burn(uint256)
     * Burns funds from your account.
     * @param amount Amount to burn
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async burn(amount: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("burn", [amount], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: burn(uint256)
     * Burns funds from your account.
     * @param amount Amount to burn
     * @returns The details for building the transaction
     */
    public burn$txBuildDetails(amount: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("burn", [amount]);
    }

    /**
     * Calls Transaction method: decreaseAllowance(address,uint256)
     * Decreases the authorized amount an spender can use. Defined in IERC20.
     * @param spender The authorized spender
     * @param subtractedValue The authorized amount to subtract
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async decreaseAllowance(spender: AddressLike, subtractedValue: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("decreaseAllowance", [spender, subtractedValue], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: decreaseAllowance(address,uint256)
     * Decreases the authorized amount an spender can use. Defined in IERC20.
     * @param spender The authorized spender
     * @param subtractedValue The authorized amount to subtract
     * @returns The details for building the transaction
     */
    public decreaseAllowance$txBuildDetails(spender: AddressLike, subtractedValue: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("decreaseAllowance", [spender, subtractedValue]);
    }

    /**
     * Calls Transaction method: grantAdmin(address)
     * Grants administration permissions on the smart contract.
     * @param _address The account address.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async grantAdmin(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("grantAdmin", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
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
     * Calls Transaction method: increaseAllowance(address,uint256)
     * Increases the authorized amount an spender can use. Defined in IERC20.
     * @param spender The authorized spender
     * @param addedValue The authorized amount to add
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async increaseAllowance(spender: AddressLike, addedValue: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("increaseAllowance", [spender, addedValue], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: increaseAllowance(address,uint256)
     * Increases the authorized amount an spender can use. Defined in IERC20.
     * @param spender The authorized spender
     * @param addedValue The authorized amount to add
     * @returns The details for building the transaction
     */
    public increaseAllowance$txBuildDetails(spender: AddressLike, addedValue: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("increaseAllowance", [spender, addedValue]);
    }

    /**
     * Calls Transaction method: mint(address,uint256)
     * Mints tokens.
     * @param to Destination account
     * @param amount Amount to mint
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async mint(to: AddressLike, amount: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("mint", [to, amount], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: mint(address,uint256)
     * Mints tokens.
     * @param to Destination account
     * @param amount Amount to mint
     * @returns The details for building the transaction
     */
    public mint$txBuildDetails(to: AddressLike, amount: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("mint", [to, amount]);
    }

    /**
     * Calls Transaction method: revokeAdmin(address)
     * Revokes administation permissions.
     * @param _address The account address.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeAdmin(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeAdmin", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
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
     * Calls Transaction method: transfer(address,uint256)
     * Transfer funds to another account. Defined in IERC20.
     * @param to The destination account
     * @param amount Amount to transfer
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transfer(to: AddressLike, amount: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transfer", [to, amount], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: transfer(address,uint256)
     * Transfer funds to another account. Defined in IERC20.
     * @param to The destination account
     * @param amount Amount to transfer
     * @returns The details for building the transaction
     */
    public transfer$txBuildDetails(to: AddressLike, amount: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("transfer", [to, amount]);
    }

    /**
     * Calls Transaction method: transferFrom(address,address,uint256)
     * Transfer funds from an account to another. You must be the owner of the account, or be authorized to spend the amount. If you are authorized, the allowance will decrease by amount. Defined in IERC20.
     * @param from Origin account
     * @param to Destination account
     * @param amount Amount to transfer
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transferFrom(from: AddressLike, to: AddressLike, amount: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transferFrom", [from, to, amount], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: transferFrom(address,address,uint256)
     * Transfer funds from an account to another. You must be the owner of the account, or be authorized to spend the amount. If you are authorized, the allowance will decrease by amount. Defined in IERC20.
     * @param from Origin account
     * @param to Destination account
     * @param amount Amount to transfer
     * @returns The details for building the transaction
     */
    public transferFrom$txBuildDetails(from: AddressLike, to: AddressLike, amount: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("transferFrom", [from, to, amount]);
    }

    /**
     * Calls Transaction method: transferRoot(address)
     * Transfers the ownership of the smart contract.
     * @param _address The address to transfer the ownership.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async transferRoot(_address: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("transferRoot", [_address], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
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
     * Calls Transaction method: updateContractMetadata(string,string,uint8)
     * Updates contract metadata. Can only be called by the owner of the contract.
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Number of decimals
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async updateContractMetadata(name_: string, symbol_: string, decimals_: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<ERC20EventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("updateContractMetadata", [name_, symbol_, decimals_], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new ERC20EventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: updateContractMetadata(string,string,uint8)
     * Updates contract metadata. Can only be called by the owner of the contract.
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Number of decimals
     * @returns The details for building the transaction
     */
    public updateContractMetadata$txBuildDetails(name_: string, symbol_: string, decimals_: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("updateContractMetadata", [name_, symbol_, decimals_]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<ERC20EventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new ERC20EventCollection(events);
    }
}

/**
 * Possible event types for contract: ERC20
 */
export type ERC20EventType = "AdminGranted" | "AdminRevoked" | "Approval" | "RootChanged" | "Transfer";

/**
 * Collection of events for contract: ERC20
 */
export class ERC20EventCollection {
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
    public getEventType(index: number): ERC20EventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: ERC20EventType): ERC20EventCollection {
        return new ERC20EventCollection(this.events.filter(event => event.name === eventType));
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
 * Event: Approval(address,address,uint256)
 */
export interface ApprovalEvent {
    owner: Address,

    spender: Address,

    value: Quantity,
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
        "inputs": [
            {
                "internalType": "string",
                "name": "name_",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "symbol_",
                "type": "string"
            },
            {
                "internalType": "uint8",
                "name": "decimals_",
                "type": "uint8"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "AllowanceBelowZero",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "AlreadyAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ApproveFromZeroAddress",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ApproveToZeroAddress",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "BurnFromZeroAddress",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "CannotRevokeRootAdmin",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InsufficientAllowance",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InsufficientBalance",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "MintToZeroAddress",
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
        "inputs": [],
        "name": "TransferFromZeroAddress",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "TransferToZeroAddress",
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
                "name": "_root",
                "type": "address"
            }
        ],
        "name": "RootChanged",
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
                "name": "amount",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
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
                "name": "subtractedValue",
                "type": "uint256"
            }
        ],
        "name": "decreaseAllowance",
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
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "addedValue",
                "type": "uint256"
            }
        ],
        "name": "increaseAllowance",
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
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
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
        "inputs": [],
        "name": "symbol",
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
                "name": "amount",
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
                "name": "amount",
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
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "name_",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "symbol_",
                "type": "string"
            },
            {
                "internalType": "uint8",
                "name": "decimals_",
                "type": "uint8"
            }
        ],
        "name": "updateContractMetadata",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
