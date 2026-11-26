// Blockchain service

"use strict";

import { MethodTransactionOptions, SignKey, TransactionSendingOptions, privateKeyToAddress, privateKeyToMixedAddress } from "@cyberchain/smart-contract-wrapper";
import { sha256 } from "../utils/hash";
import { BlockchainConfig } from "../config/config-blockchain";
import { DynamicConfiguration } from "../models/dynconf";
import { Monitor } from "../monitor";
import { DYN_CONF_CURRENT_BLOCK } from "./blockchain-events-scan";
import { Wallet } from "../models/wallet";
import { User } from "../models/users/user";
import { UnifiedVCManagerWrapper } from "../contracts/unified-vcmanager";
import { ZERO_ADDRESS } from "../utils/blockchain";

/**
 * User wallet information
 */
export interface ProvidedUserWallet {
    /**
     * The wallet retrieved from the database
     * This is null if the wallet was not found
     */
    wallet: Wallet | null,

    /**
     * The sign key of the wallet
     * This is null if the password is not specified or invalid
     */
    signKey: SignKey | null,

    /**
     * The complementary address (for mixed wallets)
     * This is null if the wallet is not unlocked
     */
    complementaryAddress: string | null,
}

/**
 * Blockchain service
 */
export class BlockchainService {
    /* Singleton */

    public static instance: BlockchainService = null;

    public static getInstance(): BlockchainService {
        if (BlockchainService.instance) {
            return BlockchainService.instance;
        } else {
            BlockchainService.instance = new BlockchainService();
            return BlockchainService.instance;
        }
    }

    constructor() {
    }

    /**
     * Gets a wallet from the request
     * @param walletId The wallet ID
     * @param user The user that is authenticated
     * @param walletPassword The wallet password (required to get the private key)
     * @returns The wallet + private key (if unlocked)
     */
    public async getWallet(walletId: string, user: User, walletPassword?: string): Promise<ProvidedUserWallet> {
        if (!walletId) {
            return {
                wallet: null,
                signKey: null,
                complementaryAddress: null,
            };
        }

        const wallet = await Wallet.findById(walletId);

        if (!wallet || wallet.uid !== user.id) {
            return {
                wallet: null,
                signKey: null,
                complementaryAddress: null,
            };
        }

        if (!walletPassword || !wallet.checkPassword(walletPassword)) {
            return {
                wallet: wallet,
                signKey: null,
                complementaryAddress: null,
            };
        }

        const unlocked = wallet.unlock(walletPassword);

        return {
            wallet: wallet,
            signKey: unlocked.signKey,
            complementaryAddress: unlocked.complementaryAddress,
        };
    }

    /**
     * Gets smart contract method transaction options for an user wallet
     * Note: The private key must be not null for this to work
     * @param wallet The user wallet information
     * @returns The smart contract method transaction options
     */
    public getMethodTransactionOptions(wallet: ProvidedUserWallet): MethodTransactionOptions {
        return {
            signKey: wallet.signKey,
            complementaryAddress: wallet.complementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    /**
     * Gets transaction sending options for an user wallet
     * Note: The private key must be not null for this to work
     * @param wallet The user wallet information
     * @returns The transaction sending options
     */
    public getTransactionSendingOptions(wallet: ProvidedUserWallet): TransactionSendingOptions {
        return {
            provider: BlockchainConfig.getInstance().provider,
            signKey: wallet.signKey,
            complementaryAddress: wallet.complementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    /**
     * Gets smart contract method transaction options for the administrator private key
     * @returns The smart contract method transaction options
     */
    public getMethodTransactionOptionsAdmin(): MethodTransactionOptions {
        const config = BlockchainConfig.getInstance();
        return {
            signKey: config.privateKeys.admin,
            complementaryAddress: config.privateKeys.adminComplementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    /**
     * Gets transaction sending options for the administrator private key
     * @returns The transaction sending options
     */
    public getTransactionSendingOptionsAdmin(): TransactionSendingOptions {
        const config = BlockchainConfig.getInstance();
        return {
            provider: config.provider,
            signKey: config.privateKeys.admin,
            complementaryAddress: config.privateKeys.adminComplementaryAddress,
            logFunction: msg => {
                Monitor.debug(msg);
            },
        };
    }

    /**
     * Waits for a block to be synced
     * @param block The block number to wait for
     * @param maxSecondsWait Max number of seconds to wait
     */
    public async waitForBlockSync(block: bigint, maxSecondsWait?: number) {
        let remainingTries = maxSecondsWait || 10;

        while (remainingTries > 0) {
            const currentBlock = await DynamicConfiguration.getStringConfiguration(DYN_CONF_CURRENT_BLOCK, "");

            if (currentBlock) {
                const blockQ = BigInt(currentBlock);
                if (blockQ >= block) {
                    return; // Done
                }
            }

            remainingTries--;

            await (new Promise(resolve => {
                setTimeout(resolve, 1000);
            }));
        }
    }

    public getNubemTokenContract() {
        const contract = BlockchainConfig.getInstance().contracts.nubemToken;
        if (!contract || contract.address === ZERO_ADDRESS) {
            throw new Error("NubemToken contract not configured. Set CONTRACT_NUBEM_TOKEN in backend environment.");
        }
        return contract;
    }

    public getEthereumDIDRegistryContract() {
        return BlockchainConfig.getInstance().contracts.ethereumDidRegistry;
    }

    public async registerCredentialOnDidRegistry(credentialId: string, ownerAddress: string): Promise<string> {
        const contract = this.getEthereumDIDRegistryContract();
        const config = BlockchainConfig.getInstance();
        const adminAddress = config.privateKeys.adminComplementaryAddress && config.privateKeys.adminComplementaryAddress !== "0x0000000000000000000000000000000000000000"
            ? privateKeyToMixedAddress(config.privateKeys.admin, config.privateKeys.adminComplementaryAddress)
            : privateKeyToAddress(config.privateKeys.admin);

        const attributeName = "0x" + sha256(`vc/issued:${credentialId}`);
        const attributeValue = Buffer.from(ownerAddress.replace(/^0x/, ""), "hex");
        const validity = Number.parseInt(process.env.DID_CREDENTIAL_DEFAULT_TTL || "31536000", 10);

        const result = await contract.setAttribute(
            adminAddress,
            attributeName,
            attributeValue,
            validity,
            this.getMethodTransactionOptionsAdmin(),
        );

        const txHash = typeof result.receipt.transactionHash === "string"
            ? result.receipt.transactionHash
            : result.receipt.transactionHash.toString('hex');

        Monitor.debug(`[Blockchain] Credential ${credentialId} registered in EthereumDIDRegistry by ${adminAddress}, Tx: ${txHash}`);
        return txHash;
    }

    public async getBalance(wallet: string) {
        const balanceContract = this.getNubemTokenContract();
        return await balanceContract.balanceOf(wallet);
    }

    public getVCManagerContract() {
        return BlockchainConfig.getInstance().contracts.vcManager;
    }

    /**
     * Authorizes a wallet address in the NubemToken contract (whitelist).
     * Must be called before the address can receive or transfer tokens.
     * Skips if the address is already authorized.
     * @param address The wallet address to authorize
     */
    public async authorizeWalletAddress(address: string): Promise<void> {
        const tokenContract = this.getNubemTokenContract();
        try {
            const alreadyAuthorized = await tokenContract.isAuthorized(address);
            if (alreadyAuthorized) {
                Monitor.debug("Address " + address + " is already authorized in NubemToken");
                return;
            }
            await tokenContract.authorizeAddress(address, this.getMethodTransactionOptionsAdmin());
            Monitor.info("Address " + address + " authorized in NubemToken");
        } catch (e) {
            Monitor.error("Error authorizing address " + address + " in NubemToken: " + e);
            throw e;
        }
    }

    /**
     * Adds balance to a user by registering a deposit and minting tokens
     * @param to The wallet address to add balance to
     * @param amount The amount to add
     * @param details Additional details for the transaction
     */
    public async addBalance(to: string, amount: bigint, details: string = ""): Promise<string> {
        const balanceContract = this.getNubemTokenContract();
        try {
            await this.authorizeWalletAddress(to);
            const tx = await balanceContract.addUserDeposit(to, amount, details, this.getMethodTransactionOptionsAdmin());
            return typeof tx.receipt.transactionHash === "string"
                ? tx.receipt.transactionHash
                : `0x${tx.receipt.transactionHash.toString("hex")}`;
        } catch (e) {
            Monitor.error("Error adding balance to " + to + ": " + e);
            throw e;
        }
    }

    /**
     * Charges user balance by reclaiming tokens to root account.
     * @param from Wallet address to charge
     * @param amount Amount to reclaim
     * @returns The on-chain transaction hash of the reclaim
     */
    public async chargeUserBalance(from: string, amount: bigint): Promise<string> {
        const balanceContract = this.getNubemTokenContract();
        try {
            const rootAddress = await balanceContract.root();
            const tx = await balanceContract.reclaim(from, rootAddress, amount, this.getMethodTransactionOptionsAdmin());
            return typeof tx.receipt.transactionHash === "string"
                ? tx.receipt.transactionHash
                : `0x${tx.receipt.transactionHash.toString("hex")}`;
        } catch (e) {
            Monitor.error("Error charging balance from " + from + ": " + e);
            throw e;
        }
    }


    public async approve(spender: string, amount: bigint, wallet: Wallet, signKey: SignKey, complementaryAddress?: string): Promise<void> {
        const contract = this.getNubemTokenContract();
        try{

            await contract.approve(
                spender,
                amount,
                this.getMethodTransactionOptions({
                    wallet: wallet,
                    signKey: signKey,
                    complementaryAddress: complementaryAddress || null,
                }),
            );
        }catch(e){
            Monitor.error(e);
            throw new Error("Error approving " + amount + " to " + spender + ": " + e);
        }
    }

    public async getAllowance(wallet: Wallet): Promise<bigint> {
        const contract = this.getNubemTokenContract();
        return await contract.allowance(wallet.address, wallet.address);
    }


    public async isCredentialRevoked(credentialId: string | number): Promise<boolean> {
        const contract = this.getVCManagerContract();
        const b32Id = this.formatBytes32(credentialId);
        return await contract.isRevoked(b32Id);
    }

    private formatBytes32(id: string | number): string {
        const hex = typeof id === "number" ? BigInt(id).toString(16) : id.replace(/^0x/i, "");
        if (!/^[a-fA-F0-9]{1,64}$/.test(hex)) {
            throw new Error("Invalid credential ID");
        }
        return '0x' + hex.padStart(64, '0');
    }

    public async revokeCredential(credentialId: string): Promise<{ txHash: string }> {
        const vcManager = this.getVCManagerContract();
        const id = this.formatBytes32(credentialId);
        const result = await vcManager.revokeCredential(id, this.getMethodTransactionOptionsAdmin());
        if (result.receipt?.status !== 1n) {
            throw new Error("Credential revocation transaction failed");
        }
        return {
            txHash: typeof result.receipt?.transactionHash === "string" 
                ? result.receipt.transactionHash 
                : result.receipt?.transactionHash?.toString('hex') || ""
        };
    }

    public async issueCredential(address: string, credentialId: string): Promise<string> {
        const vcManagerContract = this.getVCManagerContract();

        const credentialIdHex = this.formatBytes32(credentialId);

        try {
            const txResponse = await vcManagerContract.issueCredential(
                credentialIdHex,
                address,
                this.getMethodTransactionOptionsAdmin(),
            );

            const txHash = typeof txResponse === 'string' ? txResponse : txResponse.receipt.transactionHash.toString('hex');
            
            return txHash;
        } catch (e) {
            Monitor.error("Detailed error in blockchain: " + e);
            throw e;
        }
    }

    /**
     * Register a new administrator in the UnifiedVCManager Smart Contract
     * @param adminAddress New administrator's wallet address
     */
    public async addAdminToContract(adminAddress: string): Promise<string> {
        const vcManagerContract = this.getVCManagerContract();

        const txResponse = await vcManagerContract.addAdmin(
            adminAddress,
            this.getMethodTransactionOptionsAdmin(),
        );

        return typeof txResponse === 'string' 
            ? txResponse 
            : txResponse.receipt.transactionHash.toString('hex');
    }

    /**
     * Check the blockchain to see if a wallet has the administrator role
     */
    public async isContractAdmin(walletAddress: string): Promise<boolean> {
        const vcManagerContract = this.getVCManagerContract();
        const isAdmin = await vcManagerContract.isAdmin(walletAddress);
        return isAdmin;
    }


    public async removeAdminFromContract(adminAddress: string): Promise<string> {
        const vcManagerContract = this.getVCManagerContract();
        const txResponse = await vcManagerContract.removeAdmin(
            adminAddress,
            this.getMethodTransactionOptionsAdmin()
        );
        return typeof txResponse === 'string' 
            ? txResponse 
            : txResponse.receipt.transactionHash.toString('hex');
    }
}
