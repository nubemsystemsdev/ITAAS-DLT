# ITAAS DLT

ITAAS DLT includes a Vue Marketplace, an Express API, Solidity contracts, and a local Cyberchain node. The platform supports decentralized identity (DID and verifiable credentials), payments, and subscriptions.

## Requirements

- Node.js `>=24.22.1 <25` and npm. The repository's [`.nvmrc`](.nvmrc) pins `24.22.1`.
- Docker with Docker Compose (`docker compose`).

## Node.js runtime

With nvm, run `nvm install` and `nvm use` from the repository root. With nvm-windows, use `nvm install 24.22.1` and `nvm use 24.22.1`.

## Local quick start

The local stack uses ports `80`, `443`, and `8547` on the host. On the first start, create the environment files by copying the templates from the repository root.

```sh
cp smart-contracts/.env.example smart-contracts/.env
cp web-application/backend/.env.example web-application/backend/.env
```

In both `.env` files, set the following values from the [test admin wallet](cyberchain-test-node/test-admin-wallet).

| Variable | Wallet field |
| --- | --- |
| `BLOCKCHAIN_PK_ADMIN_EC` | `ec.key` |
| `BLOCKCHAIN_PK_ADMIN_ML` | `ml_dsa.sec` |
| `BLOCKCHAIN_PK_ADMIN_ML_PUB` | `ml_dsa.pub` |

If you already have environment files, check that they point to the local test environment before deploying. Then run the following commands from the repository root.

```sh
docker compose -f web-application/docker-compose.yml up -d --wait platform_cyberchain platform_database platform_redis
npm --prefix smart-contracts ci
npm --prefix smart-contracts run build
npm --prefix smart-contracts run deploy
docker compose -f web-application/docker-compose.yml build platform_app
docker compose -f web-application/docker-compose.yml run --rm --no-deps --entrypoint npm platform_app run setup-mongo
docker compose -f web-application/docker-compose.yml up -d platform_app
```

Open [the Marketplace](http://localhost) once the frontend build in the container finishes. Sign in with the local administrator `admin` / `password`. The test chain's JSON-RPC endpoint is `http://localhost:8547`.

The deploy command writes the contract addresses to `web-application/backend/.env`.

For later starts, run the final `docker compose up` command. The chain data and MongoDB data persist between starts. Stop the stack with `docker compose -f web-application/docker-compose.yml down`. The standalone chain shares the same data directory, so run only one chain container at a time.

This setup uses local authentication. For SSO and external services, configure [Keycloak](web-application/keycloak/README.md) and the [backend environment](web-application/backend/CONFIG.md). Use the [Linux deployment guide](deployment-scripts/DEPLOYMENT_GUIDE.md) for shared or production environments.

## Modules

| Module | Documentation |
| --- | --- |
| Web application | [Docker and standalone setup](web-application/README.md) |
| Backend | [Configuration, API and tests](web-application/backend/README.md) |
| Frontend | [Development and build](web-application/frontend/README.md) |
| Keycloak | [SSO setup](web-application/keycloak/README.md) |
| Smart contracts | [Build, deploy and upgrade](smart-contracts/README.md) |
| Cyberchain test node | [Standalone setup and RPC](cyberchain-test-node/README.md) |

## License

See [LICENSE](LICENSE).
