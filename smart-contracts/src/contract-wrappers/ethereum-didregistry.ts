// EthereumDIDRegistry contract wrapper

"use strict";

import { Address, Quantity, SmartContractEventWrapper, SmartContractEvent, AddressLike, BytesLike, QuantityLike, MethodTransactionOptions, TransactionResult, MethodCallingOptions, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: EthereumDIDRegistry
 */
export class EthereumDIDRegistryWrapper {
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
     * Calls View method: changed(address)
     * Method: changed(address)
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async changed(param_0: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("changed", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: delegates(address,bytes32,address)
     * Method: delegates(address,bytes32,address)
     * @param param_0 param_0
     * @param param_1 param_1
     * @param param_2 param_2
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async delegates(param_0: AddressLike, param_1: BytesLike, param_2: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("delegates", [param_0, param_1, param_2], options || {});
        return __r[0];
    }

    /**
     * Calls View method: identityOwner(address)
     * Method: identityOwner(address)
     * @param identity identity
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async identityOwner(identity: AddressLike, options?: MethodCallingOptions): Promise<Address> {
        const __r: any = await this._contractInterface.callViewMethod("identityOwner", [identity], options || {});
        return __r[0];
    }

    /**
     * Calls View method: nonce(address)
     * Method: nonce(address)
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async nonce(param_0: AddressLike, options?: MethodCallingOptions): Promise<Quantity> {
        const __r: any = await this._contractInterface.callViewMethod("nonce", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: owners(address)
     * Method: owners(address)
     * @param param_0 param_0
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async owners(param_0: AddressLike, options?: MethodCallingOptions): Promise<Address> {
        const __r: any = await this._contractInterface.callViewMethod("owners", [param_0], options || {});
        return __r[0];
    }

    /**
     * Calls View method: validDelegate(address,bytes32,address)
     * Method: validDelegate(address,bytes32,address)
     * @param identity identity
     * @param delegateType delegateType
     * @param delegate delegate
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async validDelegate(identity: AddressLike, delegateType: BytesLike, delegate: AddressLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("validDelegate", [identity, delegateType, delegate], options || {});
        return __r[0];
    }

    /**
     * Calls Transaction method: addDelegate(address,bytes32,address,uint256)
     * Method: addDelegate(address,bytes32,address,uint256)
     * @param identity The address of the identity.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @param validity The validity period of the delegate.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async addDelegate(identity: AddressLike, delegateType: BytesLike, delegate: AddressLike, validity: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("addDelegate", [identity, delegateType, delegate, validity], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: addDelegate(address,bytes32,address,uint256)
     * Method: addDelegate(address,bytes32,address,uint256)
     * @param identity The address of the identity.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @param validity The validity period of the delegate.
     * @returns The details for building the transaction
     */
    public addDelegate$txBuildDetails(identity: AddressLike, delegateType: BytesLike, delegate: AddressLike, validity: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("addDelegate", [identity, delegateType, delegate, validity]);
    }

    /**
     * Calls Transaction method: addDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address,uint256)
     * Method: addDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address,uint256)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @param validity The validity period of the delegate.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async addDelegateSigned(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, delegateType: BytesLike, delegate: AddressLike, validity: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("addDelegateSigned", [identity, sigV, sigR, sigS, delegateType, delegate, validity], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: addDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address,uint256)
     * Method: addDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address,uint256)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @param validity The validity period of the delegate.
     * @returns The details for building the transaction
     */
    public addDelegateSigned$txBuildDetails(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, delegateType: BytesLike, delegate: AddressLike, validity: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("addDelegateSigned", [identity, sigV, sigR, sigS, delegateType, delegate, validity]);
    }

    /**
     * Calls Transaction method: changeOwner(address,address)
     * Method: changeOwner(address,address)
     * @param identity identity
     * @param newOwner newOwner
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async changeOwner(identity: AddressLike, newOwner: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("changeOwner", [identity, newOwner], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: changeOwner(address,address)
     * Method: changeOwner(address,address)
     * @param identity identity
     * @param newOwner newOwner
     * @returns The details for building the transaction
     */
    public changeOwner$txBuildDetails(identity: AddressLike, newOwner: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("changeOwner", [identity, newOwner]);
    }

    /**
     * Calls Transaction method: changeOwnerSigned(address,uint8,bytes32,bytes32,address)
     * Method: changeOwnerSigned(address,uint8,bytes32,bytes32,address)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param newOwner The address of the new owner.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async changeOwnerSigned(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, newOwner: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("changeOwnerSigned", [identity, sigV, sigR, sigS, newOwner], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: changeOwnerSigned(address,uint8,bytes32,bytes32,address)
     * Method: changeOwnerSigned(address,uint8,bytes32,bytes32,address)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param newOwner The address of the new owner.
     * @returns The details for building the transaction
     */
    public changeOwnerSigned$txBuildDetails(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, newOwner: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("changeOwnerSigned", [identity, sigV, sigR, sigS, newOwner]);
    }

    /**
     * Calls Transaction method: initialize()
     * Method: initialize()
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: initialize()
     * Method: initialize()
     * @returns The details for building the transaction
     */
    public initialize$txBuildDetails(): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("initialize", []);
    }

    /**
     * Calls Transaction method: revokeAttribute(address,bytes32,bytes)
     * Method: revokeAttribute(address,bytes32,bytes)
     * @param identity The address of the identity.
     * @param name The name of the attribute to revoke.
     * @param value The value of the attribute to revoke.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeAttribute(identity: AddressLike, name: BytesLike, value: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeAttribute", [identity, name, value], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeAttribute(address,bytes32,bytes)
     * Method: revokeAttribute(address,bytes32,bytes)
     * @param identity The address of the identity.
     * @param name The name of the attribute to revoke.
     * @param value The value of the attribute to revoke.
     * @returns The details for building the transaction
     */
    public revokeAttribute$txBuildDetails(identity: AddressLike, name: BytesLike, value: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeAttribute", [identity, name, value]);
    }

    /**
     * Calls Transaction method: revokeAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes)
     * Method: revokeAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param name The name of the attribute to revoke.
     * @param value The value of the attribute to revoke.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeAttributeSigned(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, name: BytesLike, value: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeAttributeSigned", [identity, sigV, sigR, sigS, name, value], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes)
     * Method: revokeAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param name The name of the attribute to revoke.
     * @param value The value of the attribute to revoke.
     * @returns The details for building the transaction
     */
    public revokeAttributeSigned$txBuildDetails(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, name: BytesLike, value: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeAttributeSigned", [identity, sigV, sigR, sigS, name, value]);
    }

    /**
     * Calls Transaction method: revokeDelegate(address,bytes32,address)
     * Method: revokeDelegate(address,bytes32,address)
     * @param identity The address of the identity.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate to be revoked.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeDelegate(identity: AddressLike, delegateType: BytesLike, delegate: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeDelegate", [identity, delegateType, delegate], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeDelegate(address,bytes32,address)
     * Method: revokeDelegate(address,bytes32,address)
     * @param identity The address of the identity.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate to be revoked.
     * @returns The details for building the transaction
     */
    public revokeDelegate$txBuildDetails(identity: AddressLike, delegateType: BytesLike, delegate: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeDelegate", [identity, delegateType, delegate]);
    }

    /**
     * Calls Transaction method: revokeDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address)
     * Method: revokeDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeDelegateSigned(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, delegateType: BytesLike, delegate: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeDelegateSigned", [identity, sigV, sigR, sigS, delegateType, delegate], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address)
     * Method: revokeDelegateSigned(address,uint8,bytes32,bytes32,bytes32,address)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param delegateType The type of the delegate.
     * @param delegate The address of the delegate.
     * @returns The details for building the transaction
     */
    public revokeDelegateSigned$txBuildDetails(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, delegateType: BytesLike, delegate: AddressLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeDelegateSigned", [identity, sigV, sigR, sigS, delegateType, delegate]);
    }

    /**
     * Calls Transaction method: setAttribute(address,bytes32,bytes,uint256)
     * Method: setAttribute(address,bytes32,bytes,uint256)
     * @param identity The address of the identity for which the attribute is being set.
     * @param name The name of the attribute.
     * @param value The value of the attribute.
     * @param validity The validity period of the attribute.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async setAttribute(identity: AddressLike, name: BytesLike, value: BytesLike, validity: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("setAttribute", [identity, name, value, validity], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: setAttribute(address,bytes32,bytes,uint256)
     * Method: setAttribute(address,bytes32,bytes,uint256)
     * @param identity The address of the identity for which the attribute is being set.
     * @param name The name of the attribute.
     * @param value The value of the attribute.
     * @param validity The validity period of the attribute.
     * @returns The details for building the transaction
     */
    public setAttribute$txBuildDetails(identity: AddressLike, name: BytesLike, value: BytesLike, validity: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("setAttribute", [identity, name, value, validity]);
    }

    /**
     * Calls Transaction method: setAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes,uint256)
     * Method: setAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes,uint256)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param name The name of the attribute.
     * @param value The value of the attribute.
     * @param validity The validity period of the attribute.
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async setAttributeSigned(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, name: BytesLike, value: BytesLike, validity: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<EthereumDIDRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("setAttributeSigned", [identity, sigV, sigR, sigS, name, value, validity], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new EthereumDIDRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: setAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes,uint256)
     * Method: setAttributeSigned(address,uint8,bytes32,bytes32,bytes32,bytes,uint256)
     * @param identity The address of the identity.
     * @param sigV The recovery id of the signature.
     * @param sigR The R component of the signature.
     * @param sigS The S component of the signature.
     * @param name The name of the attribute.
     * @param value The value of the attribute.
     * @param validity The validity period of the attribute.
     * @returns The details for building the transaction
     */
    public setAttributeSigned$txBuildDetails(identity: AddressLike, sigV: QuantityLike, sigR: BytesLike, sigS: BytesLike, name: BytesLike, value: BytesLike, validity: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("setAttributeSigned", [identity, sigV, sigR, sigS, name, value, validity]);
    }

    /**
     * Finds events sent by the smart contract
     * @param fromBlock Beginning of the block range
     * @param toBlock Ending of the block range
     * @returns A connection of events
     */
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<EthereumDIDRegistryEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new EthereumDIDRegistryEventCollection(events);
    }
}

/**
 * Possible event types for contract: EthereumDIDRegistry
 */
export type EthereumDIDRegistryEventType = "DIDAttributeChanged" | "DIDDelegateChanged" | "DIDOwnerChanged";

/**
 * Collection of events for contract: EthereumDIDRegistry
 */
export class EthereumDIDRegistryEventCollection {
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
    public getEventType(index: number): EthereumDIDRegistryEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: EthereumDIDRegistryEventType): EthereumDIDRegistryEventCollection {
        return new EthereumDIDRegistryEventCollection(this.events.filter(event => event.name === eventType));
    }

    /**
     * Get an event of type DIDAttributeChanged(address,bytes32,bytes,uint256,uint256) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getDIDAttributeChangedEvent(index: number): SmartContractEventWrapper<DIDAttributeChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                identity: __r[0],
                name: __r[1],
                value: __r[2],
                validTo: __r[3],
                previousChange: __r[4],
            },
        };
    }

    /**
     * Get an event of type DIDDelegateChanged(address,bytes32,address,uint256,uint256) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getDIDDelegateChangedEvent(index: number): SmartContractEventWrapper<DIDDelegateChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                identity: __r[0],
                delegateType: __r[1],
                delegate: __r[2],
                validTo: __r[3],
                previousChange: __r[4],
            },
        };
    }

    /**
     * Get an event of type DIDOwnerChanged(address,address,uint256) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getDIDOwnerChangedEvent(index: number): SmartContractEventWrapper<DIDOwnerChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                identity: __r[0],
                owner: __r[1],
                previousChange: __r[2],
            },
        };
    }
}

/**
 * Event: DIDAttributeChanged(address,bytes32,bytes,uint256,uint256)
 */
export interface DIDAttributeChangedEvent {
    identity: Address,

    name: string,

    value: string,

    validTo: Quantity,

    previousChange: Quantity,
}

/**
 * Event: DIDDelegateChanged(address,bytes32,address,uint256,uint256)
 */
export interface DIDDelegateChangedEvent {
    identity: Address,

    delegateType: string,

    delegate: Address,

    validTo: Quantity,

    previousChange: Quantity,
}

/**
 * Event: DIDOwnerChanged(address,address,uint256)
 */
export interface DIDOwnerChangedEvent {
    identity: Address,

    owner: Address,

    previousChange: Quantity,
}

const CONTRACT_ABI: ABILike = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "name",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "value",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "validTo",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "previousChange",
                "type": "uint256"
            }
        ],
        "name": "DIDAttributeChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "validTo",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "previousChange",
                "type": "uint256"
            }
        ],
        "name": "DIDDelegateChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "previousChange",
                "type": "uint256"
            }
        ],
        "name": "DIDOwnerChanged",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "validity",
                "type": "uint256"
            }
        ],
        "name": "addDelegate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "sigV",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "sigR",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "sigS",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "validity",
                "type": "uint256"
            }
        ],
        "name": "addDelegateSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "changeOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "sigV",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "sigR",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "sigS",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "changeOwnerSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "changed",
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
                "name": "",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "delegates",
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
                "name": "identity",
                "type": "address"
            }
        ],
        "name": "identityOwner",
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
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "nonce",
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
                "name": "",
                "type": "address"
            }
        ],
        "name": "owners",
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
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "name",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "value",
                "type": "bytes"
            }
        ],
        "name": "revokeAttribute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "sigV",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "sigR",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "sigS",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "name",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "value",
                "type": "bytes"
            }
        ],
        "name": "revokeAttributeSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            }
        ],
        "name": "revokeDelegate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "sigV",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "sigR",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "sigS",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            }
        ],
        "name": "revokeDelegateSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "name",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "value",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "validity",
                "type": "uint256"
            }
        ],
        "name": "setAttribute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "sigV",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "sigR",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "sigS",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "name",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "value",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "validity",
                "type": "uint256"
            }
        ],
        "name": "setAttributeSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "identity",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "delegateType",
                "type": "bytes32"
            },
            {
                "internalType": "address",
                "name": "delegate",
                "type": "address"
            }
        ],
        "name": "validDelegate",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
