// OrganizationRegistry contract wrapper

"use strict";

import { BytesLike, TransactionSendingOptions, deploySmartContract, getTxBuildDetailsForDeploy, Quantity, SmartContractEventWrapper, SmartContractEvent, Address, MethodCallingOptions, QuantityLike, MethodTransactionOptions, TransactionResult, AddressLike, SmartContractInterface, TransactionBuildDetails, BlockTag, RPCOptions, ABILike } from "@cyberchain/smart-contract-wrapper";

/**
 * Contract wrapper: OrganizationRegistry
 * OrganizationRegistry Stores organizations and memberships on-chain for traceability. Admins are active memberships with the ADMIN role.
 */
export class OrganizationRegistryWrapper {
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
    public static async deploy(bytecode: BytesLike, options: TransactionSendingOptions): Promise<OrganizationRegistryWrapper> {
        const deployed = await deploySmartContract(bytecode, CONTRACT_ABI, [], 0, options);
        if (deployed.receipt.status > BigInt(0)) {
            return new OrganizationRegistryWrapper(deployed.result, options);
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
     * Calls View method: getMembership(bytes32)
     * Method: getMembership(bytes32)
     * @param membershipId membershipId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async getMembership(membershipId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, organizationId: string, userId: string, role: Quantity, status: Quantity, joinedAt: Quantity, updatedAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getMembership", [membershipId], options || {});
        return {
            exists: __r[0],
            organizationId: __r[1],
            userId: __r[2],
            role: __r[3],
            status: __r[4],
            joinedAt: __r[5],
            updatedAt: __r[6],
        };
    }

    /**
     * Calls View method: getOrganization(bytes32)
     * Method: getOrganization(bytes32)
     * @param organizationId organizationId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async getOrganization(organizationId: BytesLike, options?: MethodCallingOptions): Promise<{exists: boolean, status: Quantity, createdAt: Quantity, updatedAt: Quantity}> {
        const __r: any = await this._contractInterface.callViewMethod("getOrganization", [organizationId], options || {});
        return {
            exists: __r[0],
            status: __r[1],
            createdAt: __r[2],
            updatedAt: __r[3],
        };
    }

    /**
     * Calls View method: isOrgAdmin(bytes32,bytes32)
     * Method: isOrgAdmin(bytes32,bytes32)
     * @param organizationId organizationId
     * @param userId userId
     * @param options The options for sending the request
     * @returns The result for calling the method
     */
    public async isOrgAdmin(organizationId: BytesLike, userId: BytesLike, options?: MethodCallingOptions): Promise<boolean> {
        const __r: any = await this._contractInterface.callViewMethod("isOrgAdmin", [organizationId, userId], options || {});
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
     * Calls Transaction method: addMember(bytes32,bytes32,bytes32,uint8)
     * Method: addMember(bytes32,bytes32,bytes32,uint8)
     * @param organizationId organizationId
     * @param membershipId membershipId
     * @param userId userId
     * @param role role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async addMember(organizationId: BytesLike, membershipId: BytesLike, userId: BytesLike, role: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("addMember", [organizationId, membershipId, userId, role], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: addMember(bytes32,bytes32,bytes32,uint8)
     * Method: addMember(bytes32,bytes32,bytes32,uint8)
     * @param organizationId organizationId
     * @param membershipId membershipId
     * @param userId userId
     * @param role role
     * @returns The details for building the transaction
     */
    public addMember$txBuildDetails(organizationId: BytesLike, membershipId: BytesLike, userId: BytesLike, role: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("addMember", [organizationId, membershipId, userId, role]);
    }

    /**
     * Calls Transaction method: changeMemberRole(bytes32,uint8)
     * Method: changeMemberRole(bytes32,uint8)
     * @param membershipId membershipId
     * @param newRole newRole
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async changeMemberRole(membershipId: BytesLike, newRole: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("changeMemberRole", [membershipId, newRole], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: changeMemberRole(bytes32,uint8)
     * Method: changeMemberRole(bytes32,uint8)
     * @param membershipId membershipId
     * @param newRole newRole
     * @returns The details for building the transaction
     */
    public changeMemberRole$txBuildDetails(membershipId: BytesLike, newRole: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("changeMemberRole", [membershipId, newRole]);
    }

    /**
     * Calls Transaction method: deactivateOrganization(bytes32)
     * Method: deactivateOrganization(bytes32)
     * @param organizationId organizationId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async deactivateOrganization(organizationId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("deactivateOrganization", [organizationId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: deactivateOrganization(bytes32)
     * Method: deactivateOrganization(bytes32)
     * @param organizationId organizationId
     * @returns The details for building the transaction
     */
    public deactivateOrganization$txBuildDetails(organizationId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("deactivateOrganization", [organizationId]);
    }

    /**
     * Calls Transaction method: initialize(address,address)
     * Method: initialize(address,address)
     * @param roleManagerAddress roleManagerAddress
     * @param upgradeControlAddress upgradeControlAddress
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async initialize(roleManagerAddress: AddressLike, upgradeControlAddress: AddressLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("initialize", [roleManagerAddress, upgradeControlAddress], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: initialize(address,address)
     * Method: initialize(address,address)
     * @param roleManagerAddress roleManagerAddress
     * @param upgradeControlAddress upgradeControlAddress
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
    public async pause(options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("pause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
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
     * Calls Transaction method: reactivateMember(bytes32,uint8)
     * Method: reactivateMember(bytes32,uint8)
     * @param membershipId membershipId
     * @param role role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async reactivateMember(membershipId: BytesLike, role: QuantityLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("reactivateMember", [membershipId, role], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: reactivateMember(bytes32,uint8)
     * Method: reactivateMember(bytes32,uint8)
     * @param membershipId membershipId
     * @param role role
     * @returns The details for building the transaction
     */
    public reactivateMember$txBuildDetails(membershipId: BytesLike, role: QuantityLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("reactivateMember", [membershipId, role]);
    }

    /**
     * Calls Transaction method: reactivateOrganization(bytes32)
     * Method: reactivateOrganization(bytes32)
     * @param organizationId organizationId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async reactivateOrganization(organizationId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("reactivateOrganization", [organizationId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: reactivateOrganization(bytes32)
     * Method: reactivateOrganization(bytes32)
     * @param organizationId organizationId
     * @returns The details for building the transaction
     */
    public reactivateOrganization$txBuildDetails(organizationId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("reactivateOrganization", [organizationId]);
    }

    /**
     * Calls Transaction method: registerOrganization(bytes32)
     * Method: registerOrganization(bytes32)
     * @param organizationId organizationId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async registerOrganization(organizationId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("registerOrganization", [organizationId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: registerOrganization(bytes32)
     * Method: registerOrganization(bytes32)
     * @param organizationId organizationId
     * @returns The details for building the transaction
     */
    public registerOrganization$txBuildDetails(organizationId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("registerOrganization", [organizationId]);
    }

    /**
     * Calls Transaction method: removeMember(bytes32)
     * Method: removeMember(bytes32)
     * @param membershipId membershipId
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async removeMember(membershipId: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("removeMember", [membershipId], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
        } else {
            throw new Error("Transaction reverted");
        }
    }
    
    /**
     * Gets details for building a transaction calling the method: removeMember(bytes32)
     * Method: removeMember(bytes32)
     * @param membershipId membershipId
     * @returns The details for building the transaction
     */
    public removeMember$txBuildDetails(membershipId: BytesLike): TransactionBuildDetails {
        return this._contractInterface.encodeMutableMethod("removeMember", [membershipId]);
    }

    /**
     * Calls Transaction method: unpause()
     * Unpauses the smart contract Requires ADMIN role
     * @param options The options for sending the transaction
     * @returns The transaction result
     */
    public async unpause(options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("unpause", [], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
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
    public async upgradeToAndCall(newImplementation: AddressLike, data: BytesLike, options: MethodTransactionOptions): Promise<TransactionResult<OrganizationRegistryEventCollection>> {
        const __r = await this._contractInterface.callMutableMethod("upgradeToAndCall", [newImplementation, data], options);
    
        if (__r.receipt.status > BigInt(0)) {
            const decodedEvents = this._contractInterface.parseTransactionLogs(__r.receipt.logs);
            return { receipt: __r.receipt, result: new OrganizationRegistryEventCollection(decodedEvents) };
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
    public async findEvents(fromBlock: QuantityLike | BlockTag, toBlock: QuantityLike | BlockTag): Promise<OrganizationRegistryEventCollection> {
        const events = await this._contractInterface.findEvents(fromBlock, toBlock);
        return new OrganizationRegistryEventCollection(events);
    }
}

/**
 * Possible event types for contract: OrganizationRegistry
 */
export type OrganizationRegistryEventType = "Initialized" | "MemberAdded" | "MemberReactivated" | "MemberRemoved" | "MemberRoleChanged" | "OrganizationDeactivated" | "OrganizationReactivated" | "OrganizationRegistered" | "Paused" | "Unpaused" | "Upgraded";

/**
 * Collection of events for contract: OrganizationRegistry
 */
export class OrganizationRegistryEventCollection {
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
    public getEventType(index: number): OrganizationRegistryEventType {
        return <any>this.events[index].name;
    }

    /**
     * Filters the collection by event type
     * @param eventType The event type
     * @returns A collection containing only the event of the specified type
     */
    public filter(eventType: OrganizationRegistryEventType): OrganizationRegistryEventCollection {
        return new OrganizationRegistryEventCollection(this.events.filter(event => event.name === eventType));
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
     * Get an event of type MemberAdded(bytes32,bytes32,bytes32,uint8) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getMemberAddedEvent(index: number): SmartContractEventWrapper<MemberAddedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
                membershipId: __r[1],
                userId: __r[2],
                role: __r[3],
            },
        };
    }

    /**
     * Get an event of type MemberReactivated(bytes32,bytes32,bytes32,uint8) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getMemberReactivatedEvent(index: number): SmartContractEventWrapper<MemberReactivatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
                membershipId: __r[1],
                userId: __r[2],
                role: __r[3],
            },
        };
    }

    /**
     * Get an event of type MemberRemoved(bytes32,bytes32,bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getMemberRemovedEvent(index: number): SmartContractEventWrapper<MemberRemovedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
                membershipId: __r[1],
                userId: __r[2],
            },
        };
    }

    /**
     * Get an event of type MemberRoleChanged(bytes32,bytes32,bytes32,uint8) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getMemberRoleChangedEvent(index: number): SmartContractEventWrapper<MemberRoleChangedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
                membershipId: __r[1],
                userId: __r[2],
                newRole: __r[3],
            },
        };
    }

    /**
     * Get an event of type OrganizationDeactivated(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getOrganizationDeactivatedEvent(index: number): SmartContractEventWrapper<OrganizationDeactivatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
            },
        };
    }

    /**
     * Get an event of type OrganizationReactivated(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getOrganizationReactivatedEvent(index: number): SmartContractEventWrapper<OrganizationReactivatedEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
            },
        };
    }

    /**
     * Get an event of type OrganizationRegistered(bytes32) from the collection
     * @param index Event index in the collection (from 0 to length - 1)
     * @returns The event object
     */
    public getOrganizationRegisteredEvent(index: number): SmartContractEventWrapper<OrganizationRegisteredEvent> {
        const __r: any = this.events[index].parameters;
        return {
            event: this.events[index],
            data: {
                organizationId: __r[0],
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
 * Event: Initialized(uint64)
 */
export interface InitializedEvent {
    version: Quantity,
}

/**
 * Event: MemberAdded(bytes32,bytes32,bytes32,uint8)
 */
export interface MemberAddedEvent {
    organizationId: string,

    membershipId: string,

    userId: string,

    role: Quantity,
}

/**
 * Event: MemberReactivated(bytes32,bytes32,bytes32,uint8)
 */
export interface MemberReactivatedEvent {
    organizationId: string,

    membershipId: string,

    userId: string,

    role: Quantity,
}

/**
 * Event: MemberRemoved(bytes32,bytes32,bytes32)
 */
export interface MemberRemovedEvent {
    organizationId: string,

    membershipId: string,

    userId: string,
}

/**
 * Event: MemberRoleChanged(bytes32,bytes32,bytes32,uint8)
 */
export interface MemberRoleChangedEvent {
    organizationId: string,

    membershipId: string,

    userId: string,

    newRole: Quantity,
}

/**
 * Event: OrganizationDeactivated(bytes32)
 */
export interface OrganizationDeactivatedEvent {
    organizationId: string,
}

/**
 * Event: OrganizationReactivated(bytes32)
 */
export interface OrganizationReactivatedEvent {
    organizationId: string,
}

/**
 * Event: OrganizationRegistered(bytes32)
 */
export interface OrganizationRegisteredEvent {
    organizationId: string,
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
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "MemberAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "MemberReactivated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "MemberRemoved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "newRole",
                "type": "uint8"
            }
        ],
        "name": "MemberRoleChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "OrganizationDeactivated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "OrganizationReactivated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "OrganizationRegistered",
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
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            },
            {
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "addMember",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "newRole",
                "type": "uint8"
            }
        ],
        "name": "changeMemberRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "deactivateOrganization",
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
                "name": "membershipId",
                "type": "bytes32"
            }
        ],
        "name": "getMembership",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
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
            },
            {
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "role",
                "type": "uint8"
            },
            {
                "internalType": "enum IOrganizationRegistry.MEMBER_STATUS",
                "name": "status",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "joinedAt",
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
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "getOrganization",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "enum IOrganizationRegistry.ORG_STATUS",
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
                "name": "organizationId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "userId",
                "type": "bytes32"
            }
        ],
        "name": "isOrgAdmin",
        "outputs": [
            {
                "internalType": "bool",
                "name": "admin",
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
                "name": "membershipId",
                "type": "bytes32"
            },
            {
                "internalType": "enum IOrganizationRegistry.MEMBER_ROLE",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "reactivateMember",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "reactivateOrganization",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "organizationId",
                "type": "bytes32"
            }
        ],
        "name": "registerOrganization",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "membershipId",
                "type": "bytes32"
            }
        ],
        "name": "removeMember",
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
