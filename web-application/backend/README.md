# Backend

This folder contains the HTTP API for the [web application](../README.md). It is built with [Express](https://expressjs.com/) and [Node.js](https://nodejs.org/en).

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

- **REST API** — authentication (native or Keycloak SSO), accounts, profiles, wallets, organizations, catalog, payments, subscriptions, and user and role administration.
- **Decentralized identity (DID)** — registration of DIDs (users and AI agents) based on [ethr-did](https://github.com/uport-project/ethr-did), DID document resolution, and listing of the user's credentials.
- **Verifiable credentials (VC)** — request, acceptance, rejection, status lookup, and revocation of verifiable credentials; integration with the Ethereum DID Registry.
- **Verifiable presentations (VP)** — verification of verifiable presentations.
- **ITAAS Platform** — flows, workspace credentials, favorites, and custom agent requests, proxied to the BFF.
- **Blockchain** — Cyberchain for contracts and event synchronization.
- **Traceability** — ingestion and query of agent, purchase, and token events.

## Requirements

- [Node.js](https://nodejs.org/) `>=24.22.1 <25`, as required by `package.json`. See the [root runtime setup](../../README.md#nodejs-runtime).
- MongoDB for the default database (`DB_TYPE=MONGO`). MySQL and PostgreSQL are also supported.
- FFmpeg only when encoding images or video. The server starts without it.

## Installation

Install dependencies:

```sh
npm ci
```

## Configuration

Copy `.env.example` to `.env` and edit the values. See the [quick start](../../README.md#local-quick-start) for the local test wallet settings.

```sh
cp .env.example .env
```

See the [configuration reference](./CONFIG.md). The identity API (DID) and verifiable credentials require blockchain configuration (RPC node, network, and the Ethereum DID Registry contract). See *Blockchain configuration* and *DID (Decentralized Identity) configuration* in CONFIG.md.

HTTP listens on port `80` by default (`SERVER_HTTP_PORT`).

### Database

The default database is MongoDB. After a successful build, create the schema and indexes:

```sh
npm run setup-mongo
```

That command runs `dist/setup-mongo.js`, so build first.

For MySQL, apply [database/mysql.auto.sql](./database/mysql.auto.sql). For PostgreSQL, apply [database/postgres.auto.sql](./database/postgres.auto.sql). Details and migrations: [database/README.md](./database/README.md).

Do not edit `database/*.auto.sql` or other generated artifacts by hand.

## Running

`npm run build` runs the linter first. If lint fails, the project does not compile.

```sh
npm run build
npm start
```

Development mode reloads on changes:

```sh
npm run dev
```

### Production

Set `NODE_ENV=production`, build, and start with `npm start`. The container entrypoint is described in the [web application README](../README.md#deployment).

### HTTP API

Swagger is generated from the controller files. With the default port it is at `http://localhost/api-docs` (in production, replace `localhost` with the application domain). The group names are the `@group` tags in `src/controllers/api/`.

`postman/openapi.json` is generated and is not committed. Create it from this folder before opening the file:

```sh
npm run update-api-bindings
```

The command writes the specification to `postman/openapi.json` (repository root) and regenerates the API test client.

## Tests

Unit tests do not need external services:

```sh
npm run unit-tests
```

API tests reset the database named in `TEST_DB_MONGO_URL`. Use a disposable database and the local test chain documented in the [quick start](../../README.md#local-quick-start). Set `FFMPEG_PATH` and `FFPROBE_PATH` to the installed executables for the image upload tests.

```sh
npm run api-tests
```

`npm test` runs both. Folder layout: [test/README.md](./test/README.md). More detail: [documentation/tests.md](./documentation/tests.md).

## Development

| Command | When |
| --- | --- |
| `npm run lint` | Check and fix TypeScript. Also runs automatically before `npm run build`. |
| `npm run update-api-bindings` | After changing API controllers. Regenerates the OpenAPI spec and the test client. |
| `npm run update-db-scripts` | After changing model schema comments. Regenerates the database scripts. |
| `npm run update-translations` | After adding user-facing strings. Updates the keys in [locales](./locales/). |

The server uses [i18n](https://github.com/mashpie/i18n-node) mainly for email templates. Translation files are `.json` files in [locales](./locales/). Keys are the source texts; values are the translations.

## Deployment

Host deployment: [deployment-scripts/README.md](../../deployment-scripts/README.md). Container image: [web application README](../README.md#deployment).

## Related documentation

- [CONFIG.md](./CONFIG.md)
- [documentation/payments.md](./documentation/payments.md)
- [database/README.md](./database/README.md)
- [test/README.md](./test/README.md)
- [Web application](../README.md)
- [Keycloak](../keycloak/README.md)
