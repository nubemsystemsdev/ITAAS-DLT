// ERC1967 proxy utils

"use strict";

import { AddressLike, RPCOptions, TransactionSendingOptions, deploySmartContract } from "@cyberchain/smart-contract-wrapper";
import { ERC1967ProxyWrapper } from "../contract-wrappers/erc1967-proxy";
import { getContractByteCode } from "./bytecode";
import { logDebug } from "./log-debug";

const ERC1967ProxyByteCode = getContractByteCode("ERC1967Proxy");

export type GenericWrapper<T> = new (address: AddressLike, rpcOptions: RPCOptions) => T;

/**
 * Deploys proxied smart contract that supports upgrades
 * @param bytecode The bytecode
 * @param wrapper The wrapper
 * @returns The smart contract wrapper
 */
export async function deployProxiedContract<T>(contractName: string, bytecode: Buffer, wrapper: GenericWrapper<T>, txOptions: TransactionSendingOptions): Promise<T> {
    // Deploy implementation
    logDebug(`[${contractName}] Deploying implementation...`);

    const deployedImplementation = await deploySmartContract(bytecode, [], [], 0, txOptions);
    const implementationAddress = deployedImplementation.result;

    logDebug(`[${contractName}] Deployed implementation: ${implementationAddress}`);

    // Deploy proxy
    logDebug(`[${contractName}] Deploying proxy (ERC1967)...`);

    const deployedProxy = await ERC1967ProxyWrapper.deploy(implementationAddress, Buffer.from(""), ERC1967ProxyByteCode, txOptions);
    const proxyAddress = deployedProxy.address;

    logDebug(`[${contractName}] Deployed proxy: ${proxyAddress}`);

    // Create wrapper (only pass RPC options, not signing keys,
    // so per-call options are not overridden by stored deployer keys)

    const rpcOptions: RPCOptions = 'provider' in txOptions
        ? { provider: (txOptions as any).provider }
        : { rpcURL: (txOptions as any).rpcURL };
    return new wrapper(proxyAddress, rpcOptions);
}
