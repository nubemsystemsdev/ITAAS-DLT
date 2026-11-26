# Cyberchain test node

This folder contains a Docker deployment of a local Cyberchain node for the [ITAAS repository](../README.md).

Cyberchain is a modified Hyperledger Besu that supports ML-DSA (Dilithium) post-quantum signatures in addition to ECDSA. That gives quantum-resistant signatures for transactions and accounts.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Tests](#tests)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Related documentation](#related-documentation)

## Features

- **Post-quantum cryptography.** ML-DSA (Module-Lattice-Based Digital Signature Algorithm).
- **Backward compatible.** Standard ECDSA signatures still work.
- **Mixed-mode accounts.** An account can hold both ECDSA and ML-DSA keys.
- **Zero gas price.** Suited to development and testing.
- **Pre-configured accounts.** Test accounts with pre-funded Ether.
- **Same API shape as Besu.** Ethereum JSON-RPC, extended for ML-DSA.

### ML-DSA

Cyberchain implements ML-DSA (Dilithium), a NIST-selected post-quantum signature (CRYSTALS-Dilithium). Levels 44, 65, and 87 correspond to Dilithium2, Dilithium3, and Dilithium5.

| Level | Secret key | Public key | Signature size | Security level | Recommended use |
| --- | --- | --- | --- | --- | --- |
| 44 | 2560 bytes | 1312 bytes | ~2420 bytes | ~128-bit | Development, fast transactions |
| 65 | 4032 bytes | 1952 bytes | ~3293 bytes | ~192-bit | Production, balanced security |
| 87 | 4896 bytes | 2592 bytes | ~4595 bytes | ~256-bit | Maximum security requirements |

### Account types

1. **ECDSA-only.** Standard Ethereum accounts.
2. **ML-DSA-only.** Post-quantum accounts.
3. **Mixed-mode.** Both ECDSA and ML-DSA keys. This is the recommended type: ML-DSA for quantum resistance, ECDSA for existing tools, and either key can sign.

### Differences from Besu

| Feature | Besu | Cyberchain |
| --- | --- | --- |
| Signature algorithm | ECDSA only | ECDSA and ML-DSA |
| Quantum resistant | No | Yes |
| Account types | ECDSA | ECDSA, ML-DSA, mixed |
| API compatibility | Standard Ethereum | Extended with ML-DSA |
| Key size | 32 bytes | 32 bytes (ECDSA) plus 2.5–4.9 KB (ML-DSA) |

## Requirements

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/) V2 (`docker compose`)

## Installation

No npm install. Docker pulls `airdlt/cyberchain:latest` when the compose project starts. Copy the environment file first; see [Configuration](#configuration).

## Configuration

Copy the example environment file:

```sh
cp .env.example .env
```

The node is pre-configured in `docker-compose.yml` and `IBFT-Network/Node-1/config/genesis.json`:

- **Chain ID:** 1212 (development)
- **Consensus:** IBFT2 (block period 2 seconds)
- **Base fee:** 0
- **RPC port:** host port from `BLOCKCHAIN_RPC_PORT` (container port 8545). `.env.example` sets `8547`. If the variable is unset, the published port is `8545`.
- **Image:** `airdlt/cyberchain:latest`
- **Pre-funded accounts:** `alloc` entries in `genesis.json`, plus the admin wallet in `test-admin-wallet/`

### Integration with the application

Point smart contracts and the backend at the published RPC URL (`http://localhost:8547` when using `.env.example`).

1. Smart contracts (`smart-contracts/.env`):

```sh
BLOCKCHAIN_NODE_PROTOCOL=http
BLOCKCHAIN_NODE_RPC_URL=http://localhost:8547
```

Copy `BLOCKCHAIN_PK_ADMIN_EC`, `BLOCKCHAIN_PK_ADMIN_ML`, and `BLOCKCHAIN_PK_ADMIN_ML_PUB` from `test-admin-wallet`. See `smart-contracts/.env.example`.

2. Backend (`web-application/backend/.env`):

```sh
BLOCKCHAIN_NODE_PROTOCOL=http
BLOCKCHAIN_NODE_RPC_URL=http://localhost:8547
ML_DSA_LEVEL=44
```

The backend reads the same admin key fields (`BLOCKCHAIN_PK_ADMIN`, `BLOCKCHAIN_PK_ADMIN_TYPE`, `BLOCKCHAIN_PK_ADMIN_EC`, `BLOCKCHAIN_PK_ADMIN_ML`, `BLOCKCHAIN_PK_ADMIN_ML_PUB`). `BLOCKCHAIN_NETWORK_ID` defaults to `1212`.

3. Deploy the contracts:

```sh
cd ../smart-contracts
npm run deploy
```

## Running

Start the node:

```sh
docker compose up -d
```

With `.env.example`, JSON-RPC is at `http://localhost:8547`.

Stop the node:

```sh
docker compose down
```

Reset chain data (deletes the volume):

```sh
docker compose down -v
```

## Tests

This folder has no npm test script. Check that RPC answers:

```sh
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8547
```

Contract tests that use this node are in [smart-contracts/README.md](../smart-contracts/README.md#tests).

## Development

Genesis, keys, and node config live under `IBFT-Network/Node-1/`. Change `BLOCKCHAIN_RPC_PORT` in `.env` when 8547 is already in use. The admin wallet used by contracts and the backend is `test-admin-wallet/`.

## Deployment

This compose file is for local development. Do not publish it as a production chain. The web application Compose file mounts the same `IBFT-Network/Node-1/data` directory. Do not run both Compose projects at the same time. See [web-application running](../web-application/README.md#running). Production contract endpoints are configured in [smart-contracts](../smart-contracts/README.md#deployment).

## Troubleshooting

**RPC port already in use**

- Stop any other blockchain node (Besu, Ganache, or another Cyberchain).
- Or change `BLOCKCHAIN_RPC_PORT` in `.env`.

**Node not producing blocks**

- Check logs: `docker compose logs -f`
- Confirm the container is running: `docker compose ps`

**Cannot connect to RPC**

- Confirm the node is running: `docker compose ps`
- Probe the port from `.env` (example): `curl http://localhost:8547`
- Check firewall rules.

## Related documentation

- [Repository root](../README.md)
- [Smart contracts](../smart-contracts/README.md)
- [Backend](../web-application/backend/README.md)
- [ML-DSA / Dilithium (NIST)](https://csrc.nist.gov/Projects/post-quantum-cryptography)
- [Hyperledger Besu documentation](https://besu.hyperledger.org/)
