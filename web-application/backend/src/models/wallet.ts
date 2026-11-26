// Wallets

"use strict";

import Crypto from "crypto";
import { DataModel, GenericRow, DataSource, DataFinder, DataFilter, TypedRow, SelectOptions, OrderBy } from "tsbean-orm";
import { decrypt, encrypt } from "../utils/aes";
import { createRandomUID } from "../utils/text-utils";
import { generateMixedWallet, privateKeysToAddress, privateKeyToAddress, privateKeyToMixedAddress, SignKey, SignKeyECDSA, SignKeyMLDSA } from "@cyberchain/smart-contract-wrapper";
import { BlockchainConfig } from "../config/config-blockchain";
import { ZERO_ADDRESS } from "../utils/blockchain";
import { BlockchainService } from "../services/blockchain-service";

const DATA_SOURCE = DataSource.DEFAULT;
const TABLE = "wallets";
const PRIMARY_KEY = "id";

const SALT_LENGTH_BYTES = 16;

export class Wallet extends DataModel {

    public static finder = new DataFinder<Wallet>(DATA_SOURCE, TABLE, PRIMARY_KEY, (data: GenericRow) => { return new Wallet(data); });

    public static async findById(id: string): Promise<Wallet> {
        return Wallet.finder.findByKey(id);
    }

    public static async findByUser(uid: string): Promise<Wallet> {
        const wallets = await Wallet.finder.find(DataFilter.equals("uid", uid));
        if (wallets.length > 0) {
            return wallets[0];
        } else {
            return null;
        }
    }

    public static async existsByAddress(address: string): Promise<boolean> {
        const wallet = await Wallet.finder.find(DataFilter.equals("address", address));
        if (wallet.length > 0) {
            return true;
        } else {
            return false;
        }
    }

    public static async getByAddress(address: string): Promise<Wallet> {
        const wallet = await Wallet.finder.find(DataFilter.equals("address", address));
        if (wallet.length > 0) {
            return wallet[0];
        } else {
            return null;
        }
    }

    public static async createRandom(uid: string, password: string): Promise<Wallet> {
        const salt = randomSalt();

        const walletKeys = generateMixedWallet({
            mlDsaLevel: BlockchainConfig.getInstance().mlDsaLevel,
        });

        const wallet = new Wallet({
            id: createRandomUID(),
            uid: uid,
        });

        const address = privateKeysToAddress(walletKeys.signKeyECDSA, walletKeys.signKeyMLSA);

        wallet.address = address;
        wallet.passwordSalt = salt;
        wallet.passwordHash = computePasswordHash(password, salt);
        wallet.encryptedKey = encryptPrivateKey(Buffer.from(walletKeys.signKeyECDSA.key), password);
        wallet.encryptedKeyMl = encryptPrivateKey(Buffer.from(walletKeys.signKeyMLSA.secretKey), password);
        wallet.publicKeyMl = Buffer.from(walletKeys.signKeyMLSA.publicKey).toString("hex");

        await wallet.insert();
        return wallet;
    }

    public static async createFromPrivateKeys(uid: string, password: string, pkEc: Buffer | null, pkMl: Buffer | null, pubMl: Buffer): Promise<Wallet> {
        const salt = randomSalt();

        const wallet = new Wallet({
            id: createRandomUID(),
            uid: uid,
        });

        wallet.passwordSalt = salt;
        wallet.passwordHash = computePasswordHash(password, salt);

        if (pkEc && pkMl && pubMl) {
            const address = privateKeysToAddress({
                type: "ec-dsa",
                key: new Uint8Array(pkEc),
            }, {
                type: "ml-dsa",
                spec: BlockchainConfig.getInstance().mlDsaLevel,
                secretKey: new Uint8Array(pkMl),
                publicKey: new Uint8Array(pubMl),
            });

            wallet.address = address;

            wallet.encryptedKey = encryptPrivateKey(pkEc, password);
            wallet.encryptedKeyMl = encryptPrivateKey(pkMl, password);
            wallet.publicKeyMl = pubMl.toString("hex");
        } else if (pkEc) {
            const address = privateKeyToMixedAddress({
                type: "ec-dsa",
                key: new Uint8Array(pkEc),
            }, ZERO_ADDRESS);

            wallet.address = address;

            wallet.encryptedKey = encryptPrivateKey(pkEc, password);
            wallet.encryptedKeyMl = "";
            wallet.publicKeyMl = "";
        } else if (pkMl && pubMl) {
            const address = privateKeyToMixedAddress({
                type: "ml-dsa",
                spec: BlockchainConfig.getInstance().mlDsaLevel,
                secretKey: new Uint8Array(pkMl),
                publicKey: new Uint8Array(pubMl),
            }, ZERO_ADDRESS);

            wallet.address = address;

            wallet.encryptedKey = "";
            wallet.encryptedKeyMl = encryptPrivateKey(pkMl, password);
            wallet.publicKeyMl = pubMl.toString("hex");
        } else {
            throw new Error("Could not create wallet. Not enough keys provided.");
        }

        await wallet.insert();
        return wallet;
    }


    public id: string;

    /* db-index: uid */
    public uid: string;

    /* db-index: address */
    public address: string;

    /* db-type: text */
    public encryptedKey: string;

    /* db-type: text */
    public encryptedKeyMl: string;

    /* db-type: text */
    public publicKeyMl: string;

    public passwordHash: string;
    public passwordSalt: string;

    constructor(data: TypedRow<Wallet>) {
        // First, we call DataModel constructor 
        super(DATA_SOURCE, TABLE, PRIMARY_KEY);

        // Second, we set the class properties
        // The recommended way is to set one by one to prevent prototype pollution
        // You can also enforce the types if you do not trust the data source
        // In that case you can use the enforceType utility function

        this.id = data.id || "";
        this.uid = data.uid || "";
        this.address = data.address || "";
        this.encryptedKey = data.encryptedKey || "";
        this.encryptedKeyMl = data.encryptedKeyMl || "";
        this.publicKeyMl = data.publicKeyMl || "";
        this.passwordHash = data.passwordHash || "";
        this.passwordSalt = data.passwordSalt || "";

        // Finally, we must call init()
        this.init();
    }

    public static async createWallet(address: string) {
        const item = new Wallet({
            id: createRandomUID(),
            address: address,
        });
        try {
            await item.insert();
        } catch (ex) {
            return Promise.reject(ex);
        }
        return item;
    }

    public static async countAll(address: string, role: string): Promise<number> {
        const filters: DataFilter[] = [];

        if (address) {
            filters.push(DataFilter.equals("address", address));
        }

        if (role) {
            filters.push(DataFilter.equals("role", role));
        }

        return Wallet.finder.count(filters.length > 0 ? DataFilter.and(...filters) : DataFilter.any());
    }

    public static async countFiltered(q?: string): Promise<number> {
        if (q) {
            return Wallet.finder.count(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("address", q, true),
                DataFilter.equals("uid", q),
            ));
        } else {
            return Wallet.finder.count(DataFilter.any());
        }
    }

    public static async findAll(skip: number, limit: number, address: string, role: string): Promise<Wallet[]> {
        const filters: DataFilter[] = [];

        if (address) {
            filters.push(DataFilter.equals("address", address));
        }

        if (role) {
            filters.push(DataFilter.equals("role", role));
        }

        const allResults = await Wallet.finder.find(filters.length > 0 ? DataFilter.and(...filters) : DataFilter.any(), OrderBy.nothing(), SelectOptions.configure());
        
        allResults.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

        return allResults.slice(skip, skip + limit);
    }

    public static async findFiltered(skip: number, limit: number, q?: string): Promise<Wallet[]> {
        let allResults: Wallet[];
        
        if (q) {
            allResults = await Wallet.finder.find(DataFilter.or(
                DataFilter.equals("id", q),
                DataFilter.startsWith("address", q, true),
                DataFilter.equals("uid", q),
            ), OrderBy.nothing(), SelectOptions.configure());
        } else {
            allResults = await Wallet.finder.find(DataFilter.any(), OrderBy.nothing(), SelectOptions.configure());
        }
        
        allResults.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

        return allResults.slice(skip, skip + limit);
    }

    public static async findByAddress(address: string): Promise<Wallet> {
        const result = await Wallet.finder.find(DataFilter.equals("address", address));
        return result[0] || null;
    }

    public checkPassword(password: string): boolean {
        return checkPassword(this.passwordHash, this.passwordSalt, password);
    }

    public async changePassword(password: string, oldPassword: string) {
        if (!this.checkPassword(oldPassword)) {
            throw new Error("Invalid password");
        }

        const privateKey = decryptPrivateKey(this.encryptedKey, oldPassword);

        this.passwordSalt = randomSalt();
        this.passwordHash = computePasswordHash(password, this.passwordSalt);
        this.encryptedKey = encryptPrivateKey(privateKey, password);
        await this.save();
    }

    /**
     * Unlocks both keys
     * @param password The wallet password
     * @returns The keys
     */
    public unlockMix(password: string): {signKeyECDSA: SignKeyECDSA | null, signKeyMLSA: SignKeyMLDSA | null} {
        if (!this.checkPassword(password)) {
            throw new Error("Invalid password");
        }

        if (this.encryptedKey && this.encryptedKeyMl && this.publicKeyMl) {
            const pkEc = decryptPrivateKey(this.encryptedKey, password);
            const pkMl = decryptPrivateKey(this.encryptedKeyMl, password);
            const pubMl = Buffer.from(this.publicKeyMl, "hex");

            return {
                signKeyECDSA: {
                    type: "ec-dsa",
                    key: new Uint8Array(pkEc),
                },
                signKeyMLSA: {
                    type: "ml-dsa",
                    spec: BlockchainConfig.getInstance().mlDsaLevel,
                    secretKey: new Uint8Array(pkMl),
                    publicKey: new Uint8Array(pubMl),
                },
            };
        } else if (this.encryptedKey) {
            const pkEc = decryptPrivateKey(this.encryptedKey, password);

            return {
                signKeyECDSA: {
                    type: "ec-dsa",
                    key: new Uint8Array(pkEc),
                },
                signKeyMLSA: null,
            };
        }  else if (this.encryptedKeyMl && this.publicKeyMl) {
            const pkMl = decryptPrivateKey(this.encryptedKeyMl, password);
            const pubMl = Buffer.from(this.publicKeyMl, "hex");

            return {
                signKeyECDSA: null,
                signKeyMLSA: {
                    type: "ml-dsa",
                    spec: BlockchainConfig.getInstance().mlDsaLevel,
                    secretKey: new Uint8Array(pkMl),
                    publicKey: new Uint8Array(pubMl),
                },
            };
        } else {
            throw new Error("Wallets does not have any suitable key to sign");
        }
    }

    /**
     * Unlocks the wallet
     * @param password The wallet password
     * @param signMode The preferred sign mode
     * @returns The private key
     */
    public unlock(password: string, signMode?: "ec" | "ml-dsa"): { signKey: SignKey, complementaryAddress: string } {
        if (!this.checkPassword(password)) {
            throw new Error("Invalid password");
        }

        if (this.encryptedKey && this.encryptedKeyMl && this.publicKeyMl) {
            // Can sign with both modes

            const pkEc = decryptPrivateKey(this.encryptedKey, password);
            const pkMl = decryptPrivateKey(this.encryptedKeyMl, password);
            const pubMl = Buffer.from(this.publicKeyMl, "hex");

            const signKeyEc: SignKeyECDSA = {
                type: "ec-dsa",
                key: new Uint8Array(pkEc),
            };

            const signKeyMl: SignKeyMLDSA = {
                type: "ml-dsa",
                spec: BlockchainConfig.getInstance().mlDsaLevel,
                secretKey: new Uint8Array(pkMl),
                publicKey: new Uint8Array(pubMl),
            };

            if (signMode === "ec") {
                return {
                    signKey: signKeyEc,
                    complementaryAddress: privateKeyToAddress(signKeyMl),
                };
            } else {
                return {
                    signKey: signKeyMl,
                    complementaryAddress: privateKeyToAddress(signKeyEc),
                };
            }
        } else if (this.encryptedKey) {
            const pkEc = decryptPrivateKey(this.encryptedKey, password);

            const signKeyEc: SignKeyECDSA = {
                type: "ec-dsa",
                key: new Uint8Array(pkEc),
            };

            return {
                signKey: signKeyEc,
                complementaryAddress: ZERO_ADDRESS,
            };
        } else if (this.encryptedKeyMl && this.publicKeyMl) {
            const pkMl = decryptPrivateKey(this.encryptedKeyMl, password);
            const pubMl = Buffer.from(this.publicKeyMl, "hex");

            const signKeyMl: SignKeyMLDSA = {
                type: "ml-dsa",
                spec: BlockchainConfig.getInstance().mlDsaLevel,
                secretKey: new Uint8Array(pkMl),
                publicKey: new Uint8Array(pubMl),
            };

            return {
                signKey: signKeyMl,
                complementaryAddress: ZERO_ADDRESS,
            };
        } else {
            throw new Error("Wallets does not have any suitable key to sign");
        }
    }
}

/**
 * Generates a random salt.
 * @returns A random salt.
 */
function randomSalt(): string {
    return Crypto.randomBytes(SALT_LENGTH_BYTES).toString("hex");
}

/**
 * Computes the hash of a password.
 * @param password The password.
 * @param salt The salt.
 * @returns The password hash
 */
function computePasswordHash(password: string, salt: string): string {
    const hash = Crypto.createHash("sha256");
    hash.update(password, "utf8");
    hash.update(salt, "utf8");
    const hash2 = Crypto.createHash("sha256");
    hash2.update(new Uint8Array(hash.digest()));
    return hash2.digest().toString("hex");
}

/**
 * Checks a password.
 * @param passwordHash The password hash.
 * @param passwordSalt The salt.
 * @param password The input password.
 * @returns true if the password is valid, false if it is invalid.
 */
function checkPassword(passwordHash: string, passwordSalt: string, password: string): boolean {
    try {
        return Crypto.timingSafeEqual(new Uint8Array(Buffer.from(computePasswordHash(password, passwordSalt), 'hex')), new Uint8Array(Buffer.from(passwordHash, 'hex')));
    } catch (ex) {
        return false;
    }
}

function encryptPrivateKey(pk: Buffer, password: string): string {
    return encrypt(pk, password);
}

function decryptPrivateKey(encryptedKey: string, password: string): Buffer {
    if (!encryptedKey || !encryptedKey.includes(":")) {
        throw new Error("Invalid wallet key");
    }
    return decrypt(encryptedKey, password);
}

