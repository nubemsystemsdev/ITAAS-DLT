// SubscriptionRegistry contract wrapper

"use strict";

import { BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Quantity, SmartContractEventWrapper, SmartContractEvent, Address, MethodCallingOptions, MethodTransactionOptions, TransactionResult, AddressLike, SmartContractInterface, TransactionBuildDetails, QuantityLike, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: SubscriptionRegistry
 * SubscriptionRegistry Stores subscriptions and licenses on-chain for traceability. Subscriptions can contain multiple assigned licenses.
 */
export class SubscriptionRegistryWrapper {
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
    public static async deploy(bytecode: BytesLike, options: TransactionSendingOptions): Promise<SubscriptionRegistryWrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new SubscriptionRegistryWrapper(deployed.result, options);
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
     * Calls View method: getLicense(bytes32)
     * Gets license details
     * @param licenseId The license identifier
     * @param options The options for sending the request
     * @returns assignedAt Block timestamp when assigned
     * @returns exists Whether the license exists
     * @returns revokedAt Block timestamp when revoked (0 if active)
     * @returns status Current license status
     * @returns subscriptionId Parent subscription identifier
     */
    public async getLicense(licenseId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, subscriptionId: string, status: Quantity, assignedAt: Quantity, revokedAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getLicense", [licenseId], options || {});
        return {
            exists: __r[0],
            subscriptionId: __r[1],
            status: __r[2],
            assignedAt: __r[3],
            revokedAt: __r[4],
        };
    }

    /**
     * Calls View method: getSubscription(bytes32)
     * Gets subscription details
     * @param subscriptionId The subscription identifier
     * @param options The options for sending the request
     * @returns createdAt Block timestamp when created
     * @returns exists Whether the subscription exists
     * @returns status Current subscription status
     * @returns subscriberId Subscriber identifier hash
     * @returns updatedAt Block timestamp when last updated
     */
    public async getSubscription(subscriptionId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, subscriberId: string, status: Quantity, createdAt: Quantity, updatedAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getSubscription", [subscriptionId], options || {});
        return {
            exists: __r[0],
            subscriberId: __r[1],
            status: __r[2],
            createdAt: __r[3],
            updatedAt: __r[4],
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
     * Calls Transaction method: assignLicense(bytes32,bytes32,bytes32,bytes32)
     * Assigns a license within an active subscription
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async assignLicense(licenseId: BytesLike, subscriptionId: BytesLike, organizationId: BytesLike, userId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("assignLicense", [licenseId, subscriptionId, organizationId, userId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: assignLicense(bytes32,bytes32,bytes32,bytes32)
     * Assigns a license within an active subscription
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     * @returns The details for building the transaction
     */
    public assignLicense$txBuildDetails(licenseId: BytesLike, subscriptionId: BytesLike, organizationId: BytesLike, userId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("assignLicense", [licenseId, subscriptionId, organizationId, userId]);
    }

    /**
     * Calls Transaction method: cancelSubscription(bytes32)
     * Cancels an active subscription
     * @param subscriptionId The subscription identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async cancelSubscription(subscriptionId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("cancelSubscription", [subscriptionId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: cancelSubscription(bytes32)
     * Cancels an active subscription
     * @param subscriptionId The subscription identifier
     * @returns The details for building the transaction
     */
    public cancelSubscription$txBuildDetails(subscriptionId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("cancelSubscription", [subscriptionId]);
    }

    /**
     * Calls Transaction method: changeSubscription(bytes32,bytes32)
     * Method: changeSubscription(bytes32,bytes32)
     * @param subscriptionId subscriptionId
     * @param subscriberId subscriberId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async changeSubscription(subscriptionId: BytesLike, subscriberId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("changeSubscription", [subscriptionId, subscriberId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: changeSubscription(bytes32,bytes32)
     * Method: changeSubscription(bytes32,bytes32)
     * @param subscriptionId subscriptionId
     * @param subscriberId subscriberId
     * @returns The details for building the transaction
     */
    public changeSubscription$txBuildDetails(subscriptionId: BytesLike, subscriberId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("changeSubscription", [subscriptionId, subscriberId]);
    }

    /**
     * Calls Transaction method: createSubscription(bytes32,bytes32)
     * Creates a new subscription
     * @param subscriptionId The subscription identifier
     * @param subscriberId Subscriber identifier hash
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async createSubscription(subscriptionId: BytesLike, subscriberId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("createSubscription", [subscriptionId, subscriberId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: createSubscription(bytes32,bytes32)
     * Creates a new subscription
     * @param subscriptionId The subscription identifier
     * @param subscriberId Subscriber identifier hash
     * @returns The details for building the transaction
     */
    public createSubscription$txBuildDetails(subscriptionId: BytesLike, subscriberId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("createSubscription", [subscriptionId, subscriberId]);
    }

    /**
     * Calls Transaction method: initialize(address,address)
     * Initializes the smart contract
     * @param roleManagerAddress The address of the role manager smart contract
     * @param upgradeControlAddress The address of the upgrade control smart contract
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(roleManagerAddress: AddressLike, upgradeControlAddress: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [roleManagerAddress, upgradeControlAddress], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
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
    public async pause(options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("pause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
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
     * Calls Transaction method: reactivateLicense(bytes32,bytes32,bytes32,bytes32)
     * Reactivates a revoked license
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async reactivateLicense(licenseId: BytesLike, subscriptionId: BytesLike, organizationId: BytesLike, userId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("reactivateLicense", [licenseId, subscriptionId, organizationId, userId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: reactivateLicense(bytes32,bytes32,bytes32,bytes32)
     * Reactivates a revoked license
     * @param licenseId The license identifier
     * @param subscriptionId Parent subscription identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license is assigned to
     * @returns The details for building the transaction
     */
    public reactivateLicense$txBuildDetails(licenseId: BytesLike, subscriptionId: BytesLike, organizationId: BytesLike, userId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("reactivateLicense", [licenseId, subscriptionId, organizationId, userId]);
    }

    /**
     * Calls Transaction method: reactivateSubscription(bytes32)
     * Reactivates a suspended subscription
     * @param subscriptionId The subscription identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async reactivateSubscription(subscriptionId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("reactivateSubscription", [subscriptionId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: reactivateSubscription(bytes32)
     * Reactivates a suspended subscription
     * @param subscriptionId The subscription identifier
     * @returns The details for building the transaction
     */
    public reactivateSubscription$txBuildDetails(subscriptionId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("reactivateSubscription", [subscriptionId]);
    }

    /**
     * Calls Transaction method: renewSubscription(bytes32)
     * Renews an active subscription
     * @param subscriptionId The subscription identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async renewSubscription(subscriptionId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("renewSubscription", [subscriptionId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: renewSubscription(bytes32)
     * Renews an active subscription
     * @param subscriptionId The subscription identifier
     * @returns The details for building the transaction
     */
    public renewSubscription$txBuildDetails(subscriptionId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("renewSubscription", [subscriptionId]);
    }

    /**
     * Calls Transaction method: revokeLicense(bytes32,bytes32,bytes32)
     * Revokes an active license
     * @param licenseId The license identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license was assigned to
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async revokeLicense(licenseId: BytesLike, organizationId: BytesLike, userId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("revokeLicense", [licenseId, organizationId, userId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: revokeLicense(bytes32,bytes32,bytes32)
     * Revokes an active license
     * @param licenseId The license identifier
     * @param organizationId Organization identifier (zero for personal subscriptions)
     * @param userId User identifier the license was assigned to
     * @returns The details for building the transaction
     */
    public revokeLicense$txBuildDetails(licenseId: BytesLike, organizationId: BytesLike, userId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("revokeLicense", [licenseId, organizationId, userId]);
    }

    /**
     * Calls Transaction method: suspendSubscription(bytes32)
     * Suspends an active subscription
     * @param subscriptionId The subscription identifier
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async suspendSubscription(subscriptionId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("suspendSubscription", [subscriptionId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: suspendSubscription(bytes32)
     * Suspends an active subscription
     * @param subscriptionId The subscription identifier
     * @returns The details for building the transaction
     */
    public suspendSubscription$txBuildDetails(subscriptionId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("suspendSubscription", [subscriptionId]);
    }

    /**
     * Calls Transaction method: unpause()
     * Unpauses the smart contract Requires ADMIN role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async unpause(options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("unpause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
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
    public async upgradeToAndCall(newImplementation: AddressLike, data: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<SubscriptionRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("upgradeToAndCall", [newImplementation, data], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new SubscriptionRegistryEventCollection(decodedEvents) };
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
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<SubscriptionRegistryEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new SubscriptionRegistryEventCollection(events);
    }
}

/**
 * Possible event types for contract: SubscriptionRegistry
 */
export type SubscriptionRegistryEventType = "Initialized" | "LicenseAssigned" | "LicenseReactivated" | "LicenseRevoked" | "Paused" | "SubscriptionCancelled" | "SubscriptionChanged" | "SubscriptionCreated" | "SubscriptionReactivated" | "SubscriptionRenewed" | "SubscriptionSuspended" | "Unpaused" | "Upgraded";

/**
 * Collection of events for contract: SubscriptionRegistry
 */
export class SubscriptionRegistryEventCollection {
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
    public getEventType(index: number): SubscriptionRegistryEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: SubscriptionRegistryEventType): SubscriptionRegistryEventCollection {
        return new SubscriptionRegistryEventCollection(this.events.filter(event => event.name === eventType));
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
     * Get an event of type LicenseAssigned(bytes32,bytes32,bytes32,bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getLicenseAssignedEvent(index: number): SmartContractEventWrapper<LicenseAssignedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                licenseId: __r[0],
                subscriptionId: __r[1],
                organizationId: __r[2],
                userId: __r[3],
            },
        };
    }

    /**
     * Get an event of type LicenseReactivated(bytes32,bytes32,bytes32,bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getLicenseReactivatedEvent(index: number): SmartContractEventWrapper<LicenseReactivatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                licenseId: __r[0],
                subscriptionId: __r[1],
                organizationId: __r[2],
                userId: __r[3],
            },
        };
    }

    /**
     * Get an event of type LicenseRevoked(bytes32,bytes32,bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getLicenseRevokedEvent(index: number): SmartContractEventWrapper<LicenseRevokedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                licenseId: __r[0],
                organizationId: __r[1],
                userId: __r[2],
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
     * Get an event of type SubscriptionCancelled(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionCancelledEvent(index: number): SmartContractEventWrapper<SubscriptionCancelledEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
            },
        };
    }

    /**
     * Get an event of type SubscriptionChanged(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionChangedEvent(index: number): SmartContractEventWrapper<SubscriptionChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
            },
        };
    }

    /**
     * Get an event of type SubscriptionCreated(bytes32,bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionCreatedEvent(index: number): SmartContractEventWrapper<SubscriptionCreatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
                subscriberId: __r[1],
            },
        };
    }

    /**
     * Get an event of type SubscriptionReactivated(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionReactivatedEvent(index: number): SmartContractEventWrapper<SubscriptionReactivatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
            },
        };
    }

    /**
     * Get an event of type SubscriptionRenewed(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionRenewedEvent(index: number): SmartContractEventWrapper<SubscriptionRenewedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
            },
        };
    }

    /**
     * Get an event of type SubscriptionSuspended(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getSubscriptionSuspendedEvent(index: number): SmartContractEventWrapper<SubscriptionSuspendedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                subscriptionId: __r[0],
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
 * Event: LicenseAssigned(bytes32,bytes32,bytes32,bytes32)
 * LicenseAssigned - A license was assigned within an active subscription
 */
export interface LicenseAssignedEvent {
    /**
     * The license identifier
     */
    licenseId: string,

    /**
     * Parent subscription identifier
     */
    subscriptionId: string,

    /**
     * Organization identifier (zero for personal subscriptions)
     */
    organizationId: string,

    /**
     * User identifier the license is assigned to
     */
    userId: string,
}

/**
 * Event: LicenseReactivated(bytes32,bytes32,bytes32,bytes32)
 * LicenseReactivated - A revoked license was reactivated
 */
export interface LicenseReactivatedEvent {
    /**
     * The license identifier
     */
    licenseId: string,

    /**
     * Parent subscription identifier
     */
    subscriptionId: string,

    /**
     * Organization identifier (zero for personal subscriptions)
     */
    organizationId: string,

    /**
     * User identifier the license is assigned to
     */
    userId: string,
}

/**
 * Event: LicenseRevoked(bytes32,bytes32,bytes32)
 * LicenseRevoked - An active license was revoked
 */
export interface LicenseRevokedEvent {
    /**
     * The license identifier
     */
    licenseId: string,

    /**
     * Organization identifier (zero for personal subscriptions)
     */
    organizationId: string,

    /**
     * User identifier the license was assigned to
     */
    userId: string,
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
 * Event: SubscriptionCancelled(bytes32)
 * SubscriptionCancelled - An active subscription was cancelled
 */
export interface SubscriptionCancelledEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,
}

/**
 * Event: SubscriptionChanged(bytes32)
 * SubscriptionChanged - An active subscription was changed
 */
export interface SubscriptionChangedEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,
}

/**
 * Event: SubscriptionCreated(bytes32,bytes32)
 * SubscriptionCreated - A new subscription was created
 */
export interface SubscriptionCreatedEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,

    /**
     * Subscriber identifier hash
     */
    subscriberId: string,
}

/**
 * Event: SubscriptionReactivated(bytes32)
 * SubscriptionReactivated - A suspended subscription was reactivated
 */
export interface SubscriptionReactivatedEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,
}

/**
 * Event: SubscriptionRenewed(bytes32)
 * SubscriptionRenewed - An active subscription was renewed
 */
export interface SubscriptionRenewedEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,
}

/**
 * Event: SubscriptionSuspended(bytes32)
 * SubscriptionSuspended - An active subscription was suspended
 */
export interface SubscriptionSuspendedEvent {
    /**
     * The subscription identifier
     */
    subscriptionId: string,
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
                "indexed": true,
                "internalType": "bytes32",
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "LicenseAssigned",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "LicenseReactivated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "LicenseRevoked",
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
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionCancelled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "subscriberId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionReactivated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionRenewed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "SubscriptionSuspended",
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
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "assignLicense",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "cancelSubscription",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "subscriberId",
                "type": "bytes32"
            }
        ],
        "name": "changeSubscription",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "subscriberId",
                "type": "bytes32"
            }
        ],
        "name": "createSubscription",
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
                "name": "licenseId",
                "type": "bytes32"
            }
        ],
        "name": "getLicense",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "internalType": "enum ISubscriptionRegistry.LICENSE_STATUS",
                "name": "status",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "assignedAt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "revokedAt",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "getSubscription",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "bytes32",
                "name": "subscriberId",
                "type": "bytes32"
            },
            {
                "internalType": "enum ISubscriptionRegistry.SUBSCRIPTION_STATUS",
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
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "reactivateLicense",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "reactivateSubscription",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "renewSubscription",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "licenseId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "revokeLicense",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "subscriptionId",
                "type": "bytes32"
            }
        ],
        "name": "suspendSubscription",
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
