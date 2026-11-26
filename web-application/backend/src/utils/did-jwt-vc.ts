/* DID JWT VC VP utils */

"use strict";
import { EthrDID } from 'ethr-did';
import { Issuer, JwtCredentialPayload, JwtPresentationPayload, createVerifiableCredentialJwt, createVerifiablePresentationJwt, verifyCredential, verifyPresentation } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver } from 'ethr-did-resolver';
import { Wallet } from '../models/wallet';
import { BlockchainConfig } from '../config/config-blockchain';
import { privateKeyToAddress, SignKey } from '@cyberchain/smart-contract-wrapper';

const providerConfig = {
    name: process.env.BLOCKCHAIN_NETWORK_ID,
    rpcUrl: process.env.BLOCKCHAIN_NODE_RPC_URL,
    registry: process.env.CONTRACT_ETHEREUM_DIDREGISTRY
};

export async function resolveEthrDID(did: string) {
    const ethrDidResolver = getResolver(providerConfig);
    const didResolver = new Resolver(ethrDidResolver);
    const doc = await didResolver.resolve(did);
    return doc;
}
export function createDID(publicKey: string, privateKey: string) {

    const chainId = process.env.BLOCKCHAIN_NETWORK_ID;
    const RegAddress = process.env.CONTRACT_ETHEREUM_DIDREGISTRY;
    const ethrDid = new EthrDID({
        privateKey: privateKey,
        identifier: publicKey,
        registry: RegAddress,
        chainNameOrId: chainId,
    });

    return ethrDid as Issuer;
}

export function createVerifiableCredential(issuer: Issuer, vcRequest: any) {
    const vcPayload: JwtCredentialPayload = {
        sub: vcRequest.deviceDid,
        nbf: Math.floor(Date.now() / 1000),
        vc: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            credentialSubject: JSON.parse(vcRequest.deviceinfo),
        }
    };
    return createVerifiableCredentialJwt(vcPayload, issuer);
}

/**
 * Extracts the hex-encoded private key from an ECDSA SignKey for use with EthrDID.
 * Throws if the key is not of type ec-dsa (EthrDID only supports ECDSA).
 */
function getEcPrivateKeyHex(signKey: SignKey): string {
    if (signKey.type === "ec-dsa") {
        return Buffer.from(signKey.key).toString("hex");
    }
    throw new Error("EthrDID requires an ECDSA (ec-dsa) key, but the configured key type is: " + signKey.type);
}

export async function createUserVerifiablecredential(userDid: string, data: any, credentialId?: string | number) {
    const chainId = process.env.BLOCKCHAIN_NETWORK_ID || "0x0";
    const RegAddress = process.env.CONTRACT_ETHEREUM_DIDREGISTRY;

    const w = await Wallet.findByAddress(process.env.ADMIN_WALLET + "");

    let address: string;
    let pkHex: string;

    if (w) {
        address = w.address;
        const unlocked = w.unlock(process.env.ADMIN_WALLET_PASSWORD, "ec");
        pkHex = getEcPrivateKeyHex(unlocked.signKey);
    } else {
        const adminKey = BlockchainConfig.getInstance().privateKeys.admin;
        address = privateKeyToAddress(adminKey);
        pkHex = getEcPrivateKeyHex(adminKey);
    }

    const ethrDid = new EthrDID({
        privateKey: pkHex,
        identifier: address,
        registry: RegAddress,
        chainNameOrId: chainId,
    }) as Issuer;
    

    //Calculate expiration date
    const now = Math.floor(Date.now() / 1000);
    const ttl = parseInt(process.env.DID_CREDENTIAL_DEFAULT_TTL || "31536000");

    const vcPayload: JwtCredentialPayload = {
        sub: userDid,
        nbf: now,
        exp: now + ttl,
        ...(credentialId !== undefined ? { jti: credentialId.toString() } : {}),
        vc: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            ...(credentialId !== undefined ? { id: `urn:credential:${credentialId}` } : {}),
            credentialSubject: data,
        }
    };

    return createVerifiableCredentialJwt(vcPayload, ethrDid);
}

// Method to create a verifiable presentation from a list of verifiable credentials
export async function createVerifiablePresentation(issuer: Issuer, vcJwts: string | string[]) {
    const vpPayload: JwtPresentationPayload = {
        vp: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: Array.isArray(vcJwts) ? vcJwts : [vcJwts]
        }
    };
    return await createVerifiablePresentationJwt(vpPayload, issuer);
}

export function verifyCredentials(vcJwt: string) {    
    const resolver = new Resolver(getResolver(providerConfig));
        
    const result = verifyCredential(vcJwt, resolver);
    return result;
}
export async function verifyPresentations(vpJwt: string) {
    const resolver = new Resolver(getResolver(providerConfig));

    return await verifyPresentation(vpJwt, resolver);
}