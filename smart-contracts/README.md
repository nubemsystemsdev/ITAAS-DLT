# Smart contracts

This folder contains the Solidity contracts for the [ITAAS repository](../README.md), plus the TypeScript tools to compile, deploy, upgrade, and test them.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Tests](#tests)
- [Development](#development)
- [Deployment](#deployment)
- [Related documentation](#related-documentation)

## Features

- Solidity contracts compiled with solc `0.8.24`
- TypeScript deployment, initialization, and upgrade flow
- Generated wrappers copied into the web application backend
- Contract tests against a running JSON-RPC network

## Requirements

- [Node.js](https://nodejs.org/) `>=24.22.1 <25`. See the [root runtime setup](../README.md#nodejs-runtime).
- npm
- A JSON-RPC node. For local work, use [cyberchain-test-node](../cyberchain-test-node/).

## Installation

Install dependencies:

```sh
npm ci
```

## Configuration

Copy `.env.example` to `.env` and edit the variables.

```sh
cp .env.example .env
```

For local development, copy the admin keys from [the test admin wallet](../cyberchain-test-node/test-admin-wallet). The example RPC URL is `http://localhost:8547`. Use the same wallet for the `TEST_` fields when running the contract tests against the bundled node.

### Production network

| Variable name | Description |
| --- | --- |
| `BLOCKCHAIN_NODE_PROTOCOL` | Protocol to connect to the node via JSON-RPC (`http`, `https`, `ws`, `wss`) |
| `BLOCKCHAIN_NODE_RPC_URL` | URL of the JSON-RPC endpoint of the node |
| `BLOCKCHAIN_PK_ADMIN_TYPE` | Admin key type: `ec` or `ml-dsa` |
| `BLOCKCHAIN_PK_ADMIN_EC` | ECDSA admin private key (hex, without `0x`) |
| `BLOCKCHAIN_PK_ADMIN_ML` | ML-DSA admin private key (hex, without `0x`). Required for mixed-mode |
| `BLOCKCHAIN_PK_ADMIN_ML_PUB` | ML-DSA admin public key (hex, without `0x`). Required for mixed-mode |
| `ML_DSA_LEVEL` | ML-DSA security level: `44`, `65`, or `87` |

### Test network

Test network configuration uses the same fields with the `TEST_` prefix (`TEST_BLOCKCHAIN_NODE_PROTOCOL`, `TEST_BLOCKCHAIN_NODE_RPC_URL`, `TEST_BLOCKCHAIN_PK_ADMIN_TYPE`, `TEST_BLOCKCHAIN_PK_ADMIN_EC`, `TEST_BLOCKCHAIN_PK_ADMIN_ML`, `TEST_BLOCKCHAIN_PK_ADMIN_ML_PUB`, `TEST_ML_DSA_LEVEL`).

### Logging

| Variable name | Description |
| --- | --- |
| `LOG_DEBUG` | Set it to `YES` to log debug messages |

## Running

Compile the contracts:

```sh
npm run build
```

The Solidity compiler writes artifacts to `build/`. The script also generates wrappers in `src/contract-wrappers/` and copies them into the backend.

Deploy:

```sh
npm run deploy
```

Upgrade contracts that are already deployed:

```sh
npm run deploy:upgrade
```

Deploy and upgrade scripts update contract addresses in `web-application/backend/.env`.

## Tests

Run the tests against the test network. Start that node before running tests.

```sh
npm test
```

## Development

Contract source is in [contracts](./contracts/) ([Solidity](https://soliditylang.org/)).

Tests, deployment, initialization, and upgrade logic are in [src](./src/) ([TypeScript](https://www.typescriptlang.org/)), using [`@cyberchain/smart-contract-wrapper`](https://www.npmjs.com/package/@cyberchain/smart-contract-wrapper).

Lint:

```sh
npm run lint
```

### Contracts to deploy

When adding or removing contracts, or changing initialization, edit [src/contracts.ts](./src/contracts.ts).

The type `DeployedContracts` must contain a key for each contract that should be deployed, mapped to the corresponding wrapper.

For each key in `DeployedContracts`, add an entry to the `SMART_CONTRACTS` object:

- `contractName` — contract name, used to find its bytecode and ABI
- `wrapper` — contract wrapper, used to instantiate it
- `deploy` — optional. A function that deploys the contract and returns a wrapper instance. If omitted, the contract is deployed with an `ERC1967` proxy and treated as upgradeable. If you provide it, use [getContractByteCode](./src/utils/bytecode.ts) to load the compiled bytecode.
- `initialize` — optional. Called after all contracts are deployed. Preferred for upgradeable contracts: empty constructor plus an initializer.
- `notUpgradeable` — optional. Defaults to upgradeable. Set to `true` to skip the contract during upgrade.
- `upgrade` — optional. Custom upgrade function. If omitted, the contract is upgraded through `UpgradeControl`.
- `skipFromDocumentation` — optional. Set to `true` to leave the contract out of generated documentation.
- `generateBytecodeFile` — optional. Set to `true` to write a bytecode file into the backend so the backend can deploy instances.

### Adding a test

Store tests in [src/tests](./src/tests/). Add a file there. [test-upgrade.ts](./src/tests/test-upgrade.ts) is a template. `src/tests/index.ts` runs that upgrade test after deploying the contracts.

Update the test function for your cases, and register it in [src/tests/index.ts](./src/tests/index.ts).

| Name | Type | File | Description |
| --- | --- | --- | --- |
| `runTest` | Function | [src/utils/test-utils.ts](./src/utils/test-utils.ts) | Runs a test and logs its name. |
| `runTestCase` | Function | [src/utils/test-utils.ts](./src/utils/test-utils.ts) | Runs a test case and marks it passed or failed. Use it inside the `runTest` callback. |
| `assertFailure` | Function | [src/utils/test-utils.ts](./src/utils/test-utils.ts) | Ensures an async function throws. |
| `assertRevert` | Function | [src/utils/test-utils.ts](./src/utils/test-utils.ts) | Ensures a transaction reverts. More specific than `assertFailure`. |
| `assertEqualHex` | Function | [src/utils/test-utils.ts](./src/utils/test-utils.ts) | Ensures two hexadecimal values are equal, ignoring case differences. |
| `assertEvent` | Function | [src/utils/assert-event.ts](./src/utils/assert-event.ts) | Ensures a transaction emitted an event with the expected parameters. |
| `logDebug` | Function | [src/utils/log-debug.ts](./src/utils/log-debug.ts) | Logs a debug message only when debug logging is enabled. |
| `TestWallet` | Class | [src/utils/test-wallet.ts](./src/utils/test-wallet.ts) | Obtains or generates wallets for tests. Each wallet has `key`, `address`, and `getTxOptions`. |

## Deployment

Point `BLOCKCHAIN_*` at the production node and admin keys, then run `npm run deploy` or `npm run deploy:upgrade`. Keep production keys out of git. Application hosting is documented in [deployment-scripts/README.md](../deployment-scripts/README.md).

## Related documentation

- [CONTRACTS_DOC.md](./CONTRACTS_DOC.md)
- [Cyberchain test node](../cyberchain-test-node/README.md)
- [Backend](../web-application/backend/README.md)
- [Repository root](../README.md)
