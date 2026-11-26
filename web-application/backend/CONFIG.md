# Configuration reference

Configure the backend with environment variables. Copy `.env.example` to `.env` and edit that file. Sample passwords, client secrets, and wallet keys in the example file are development-only.

```sh
cp .env.example .env
```

## General configuration

| Variable                | Description                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | Set it to `production` when the server is running on production.                                                                   |
| `RUN_TASKS`             | Can be `YES` or `NO`. Set it to `YES` to enable periodic tasks. This should be set only for a single server                        |
| `APP_NAME`              | Name of the application.                                                                                                           |
| `APP_VERSION`           | Version of the application.                                                                                                        |
| `BACKEND_EXTERNAL_URI`  | External URL for users to access the backend. Example: `http://localhost`                                                          |
| `FRONTEND_EXTERNAL_URI` | External URL for users to access the frontend. Example: `http://localhost:8080`                                                    |
| `ALLOWED_ORIGINS`       | List of origins allowed to make CORS requests. Make sure to allow both the backend and the frontend URLs.                          |
| `SERVE_FRONTEND`        | Can be `YES` or `NO`. Set it to `YES` to serve the frontend. Set it to `NO` for an API-only backend.                               |
| `FRONTEND_PATH`         | Path to the compiled and minified frontend, in order to serve it.                                                                  |
| `WORKERS_NUMBER`        | Number of worker processes to spawn. Set it to 0 to use the number of CPUs                                                         |
| `SERVE_SWAGGER_DOCS`    | Can be `YES` or `NO`. Set it to `YES` to serve the swagger documentation at `/api-docs`. Set it to `NO` to hide the documentation. |

## Logs configuration

| Variable                                     | Description                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `LOG_REQUESTS`                               | Can be `YES` or `NO`. Set it to `YES` to enable request logging.                     |
| `LOG_INFO`                                   | Can be `YES` or `NO`. Set it to `YES` to enable logging informational messages.      |
| `LOG_DEBUG`                                  | Can be `YES` or `NO`. Set it to `YES` to enable logging debugging messages.          |
| `LOG_TRACE`                                  | Can be `YES` or `NO`. Set it to `YES` to enable logging trace messages.              |
| `LOG_ELASTIC_SEARCH_ENABLED`                 | Can be `YES` or `NO`. Set it to `YES` to enable sending logs to ElasticSearch.       |
| `LOG_ELASTIC_SEARCH_NODE`                    | URL of the ElasticSearch node to use for monitoring.                                 |
| `LOG_ELASTIC_SEARCH_USER`                    | Authentication username for ElasticSearch.                                           |
| `LOG_ELASTIC_SEARCH_PASSWORD`                | Authentication password for ElasticSearch.                                           |
| `LOG_ELASTIC_SEARCH_INDEX_PREFIX`            | Index prefix for logs.                                                               |
| `LOG_ELASTIC_SEARCH_TLS_REJECT_UNAUTHORIZED` | Can be `YES` or `NO`. Set it to `YES` to to reject any unauthorized TLS connections. |

## Server configuration

### HTTP

| Variable              | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `SERVER_HTTP_PORT`    | Port for HTTP. By default `80`.                                   |
| `SERVER_HTTP_ADDRESS` | Bind address. If not set, it will bind to all network interfaces. |

### HTTPS

| Variable                   | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `SERVER_HTTPS_PORT`        | Port for HTTPS. By default `443`.                                            |
| `SERVER_HTTPS_ADDRESS`     | Bind address. If not set, it will bind to all network interfaces.            |
| `SERVER_HTTPS_CERTIFICATE` | Path to the certificate file. It must be in PEM format.                      |
| `SERVER_HTTPS_KEY`         | Path to the private key file. It must be in PEM format.                      |
| `SERVER_REDIRECT_SECURE`   | Can be `YES` or `NO`. Set it to `YES` to redirect all HTTP traffic to HTTPS. |

### Let's Encrypt / Certbot configuration

In order for the application to use dynamic certificates generated with the `certbot` utility, set `SERVE_ACME_CHALLENGE=YES` in order for the backend to serve the challenge to Let's Encrypt. Also make sure:

 - You have a public IP and domain name
 - You have the backend HTTP listening on port `80`

| Variable               | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `SERVE_ACME_CHALLENGE` | Can be `YES` or `NO`. Set it to `YES` to serve ACME challenge results from `certbot` |
| `ACME_CHALLENGE_PATH`  | Set to the path where certbot stores the challenge results.                          |

### Other server configuration parameters

| Variable               | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `USING_PROXY`          | Can be `YES` or `NO`. Set it to `YES` if you are using a reverse proxy or a load balancer |
| `MAX_UPLOAD_FILE_SIZE` | Max size of any uploaded file, in bytes.                                                  |

## Database configuration

Depending on the database you want to use, you can set `DB_TYPE` to `MONGO`, `MySQL` or `Postgres`.

### MongoDB

Set `DB_TYPE=MONGO` to use MongoDB.

| Variable       | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `DB_MONGO_URL` | MongoDB connection URL. Example: `mongodb://127.0.0.1:27017/itaas` |

### MySQL

Set `DB_TYPE=MySQL` to use MySQL.

| Variable             | Description                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `DB_HOST`            | Database host or IP address.                                                                           |
| `DB_PORT`            | Database port number.                                                                                  |
| `DB_USER`            | Database authentication username.                                                                      |
| `DB_PASSWORD`        | Database authentication password.                                                                      |
| `DB_NAME`            | Database name.                                                                                         |
| `DB_MAX_CONNECTIONS` | Max size of the database connections pool.                                                             |
| `DB_TRACE`           | Can be `YES` or `NO`. Set it to `YES` to log debug messages with all the queries sent to the database. |

## PostgreSQL

Set `DB_TYPE=Postgres` to use PostgreSQL.

| Variable             | Description                                |
| -------------------- | ------------------------------------------ |
| `DB_HOST`            | Database host or IP address.               |
| `DB_PORT`            | Database port number.                      |
| `DB_USER`            | Database authentication username.          |
| `DB_PASSWORD`        | Database authentication password.          |
| `DB_NAME`            | Database name.                             |
| `DB_MAX_CONNECTIONS` | Max size of the database connections pool. |

## File storage configuration

Depending on the file storage system you want to use, you may set the `FILE_STORAGE_MODE` to the appropriate value.

### File system storage

Set `FILE_STORAGE_MODE=FS` to store files in a local, remote or shared file system.

| Variable                      | Description                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `FILE_STORAGE_FS_PATH`        | Path of the folder to store the files.                                                            |
| `FILE_STORAGE_PRIVATE_SECRET` | Secret to generate authentication tokens to access private files.                                 |
| `FILE_STORAGE_SERVER_URL`     | Base URL of the static files serving system. Use the backend with the `/static/` path by default. |

## Users system configuration

| Variable                   | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| `DISABLE_EMAIL_VALIDATION` | Can be `YES` or `NO`. Set it to `YES` to disable the email validation process. |
| `INITIAL_USER_NAME`        | Initial user name. If the users collection is empty. This user is created.     |
| `INITIAL_USER_PASSWORD`    | Initial user password.                                                         |
| `USER_ALWAYS_ADMIN`        | Set this variable to an username to set it to administrator on startup.        |

### Google Login system

| Variable                     | Description                 |
| ---------------------------- | --------------------------- |
| `GOOGLE_LOGIN_CLIENT_ID`     | Google login client ID.     |
| `GOOGLE_LOGIN_CLIENT_SECRET` | Google login client secret. |

Google login system is an optional authentication method you can enable following these steps:

 1. Go to [Google API console](https://console.developers.google.com/) and create a project.
 2. Add in `APIs & Services` section, the `People API` service.
 3. Go to `Credentials` and create an OAuth 2.0 client.
 4. Allow the callback URL under the `Authorized redirection URLs` section, being your frontend URL + `/login/tp/google`. Example: `http://localhost:8080/login/tp/google`.
 5. Copy the client ID and secret into the configuration variables.

## BFF integration (ITAAS / Flowise)

Shared base URL for outbound calls to the ITAAS BFF. Provisioning uses a service API key; flows proxy uses the user's Keycloak access token.

### Provisioning (DLT → BFF `/provisioning/workspaces*`)

| Variable | Description |
| --- | --- |
| `BFF_BASE_URL` | BFF base URL without trailing slash (e.g. `http://localhost:4000`) |
| `BFF_PROVISIONING_ENABLED` | `YES` / `TRUE` / `1` to enable outbound provisioning calls |
| `BFF_PROVISIONING_API_KEY` | Shared secret sent as `x-provisioning-key` (must match BFF `PROVISIONING_API_KEY`) |
| `BFF_PROVISIONING_TIMEOUT_MS` | HTTP timeout in ms (default `15000`) |

Provisioning is disabled when the flag is off or `BFF_BASE_URL` / API key are missing.

### Flows proxy (DLT → BFF `/api/flows*`)

| Variable | Description |
| --- | --- |
| `BFF_BASE_URL` | Same base URL as provisioning; when set, flows proxy is enabled |
| `BFF_FLOWS_TIMEOUT_MS` | HTTP timeout in ms (default `600000`; flow runs can be long) |
| `BFF_FLOWS_MAX_RESPONSE_BYTES` | Max BFF response body size in bytes (default `33554432` / 32 MiB); larger bodies abort to protect worker memory |

The flows proxy authenticates with the user’s Keycloak access token. See the [flow graph response contract](../../docs/itaas-flow-graph-bff-contract.md).

### Inbound internal API (BFF → DLT)

| Variable | Description |
| --- | --- |
| `INTERNAL_SERVICE_API_KEY` | Shared secret for `GET /internal/users/:keycloakSub` (`x-internal-service-api-key`) |

## Mailing system configuration

Send mail through an SMTP server. The mailer stays on unless `MAIL_ENABLED=NO`.

If the mailing system is disabled, emails will be logged as debug messages.

| Variable                       | Description                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `MAIL_ENABLED`                 | `NO` disables mail. Any other value sends mail.                                   |
| `SMTP_HOST`                    | Host of the mail server.                                                          |
| `SMTP_PORT`                    | SMTP port number of the mail server.                                              |
| `SMTP_SECURE`                  | Can be `YES` or `NO`. Set it to `YES` to enable TLS.                              |
| `SMTP_FROM`                    | Email the application will use to send emails.                                    |
| `SMTP_AUTH_USER`               | Authentication username for SMTP.                                                 |
| `SMTP_AUTH_PASSWORD`           | Authentication password for SMTP.                                                 |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | Can be `YES` or `NO`. Set it to `YES` to reject any unauthorized TLS connections. |

## Captcha service configuration

Depending on the captcha service you want to use, you may set the `CAPTCHA_SERVICE` to the appropriate value.

If not set, captchas will be disabled.

### Google reCAPTCHA

Set `CAPTCHA_SERVICE=reCAPTCHA` to use Google reCAPTCHA (v3) service.

| Variable          | Description      |
| ----------------- | ---------------- |
| `CAPTCHA_SITE_ID` | Site identifier. |
| `CAPTCHA_SECRET`  | Secret key.      |

## Redis configuration

Redis can be used as a cache and also for real time messaging purposes.

| Variable         | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `REDIS_ENABLED`  | Can be `YES` or `NO`. Set it to `YES` to enable Redis. |
| `REDIS_HOST`     | Redis host.                                            |
| `REDIS_PORT`     | Redis port number.                                     |
| `REDIS_PASSWORD` | Redis authentication password.                         |
| `REDIS_TLS`      | Can be `YES` or `NO`. Set it to `YES` to use TLS.      |

## FFmpeg configuration

FFmpeg is used to encode images and videos, if needed.

| Variable       | Description                   |
| -------------- | ----------------------------- |
| `FFPROBE_PATH` | Path to the `ffprobe` binary. |
| `FFMPEG_PATH`  | Path to the `ffmpeg` binary.  |

## Keycloak SSO

Set `KEYCLOAK_SSO_ENABLED=YES` to use Keycloak as the only authentication provider. Redis must stay enabled. Realm setup: [keycloak/README.md](../keycloak/README.md).

| Variable | Description |
| --- | --- |
| `KEYCLOAK_SSO_ENABLED` | `YES` to require Keycloak. |
| `KEYCLOAK_BASE_URL` | Issuer base URL, without a trailing slash. |
| `KEYCLOAK_REALM` | Realm name (`itaas-dlt`). |
| `KEYCLOAK_CLIENT_ID` | OIDC client id (`itaas-dlt`). |
| `KEYCLOAK_CLIENT_SECRET` | OIDC client secret. The value in `.env.example` is development-only. |
| `KEYCLOAK_REDIRECT_URI` | Callback URL. Default: frontend `/callbacks/keycloak`. |
| `KEYCLOAK_POST_LOGOUT_REDIRECT_URI` | Post-logout URL. Default: frontend `/login`. |

## Blockchain configuration

### Node

| Variable | Description |
| --- | --- |
| `BLOCKCHAIN_NODE_PROTOCOL` | `http`, `https`, or `ws`. |
| `BLOCKCHAIN_NODE_RPC_URL` | JSON-RPC URL. Local example: `http://localhost:8547`. |
| `BLOCKCHAIN_NETWORK_ID` | Chain id for ethr-did. Default `1212`. |
| `ML_DSA_LEVEL` | ML-DSA level: `44`, `65`, or `87`. |

### Admin keys

Development-only keys live in `cyberchain-test-node/test-admin-wallet`. Replace them in any shared or production environment.

| Variable | Description |
| --- | --- |
| `BLOCKCHAIN_PK_ADMIN` | ECDSA admin private key (hex, no `0x`) used when `BLOCKCHAIN_PK_ADMIN_EC` is empty. |
| `BLOCKCHAIN_PK_ADMIN_TYPE` | `ec` or `ml-dsa`. |
| `BLOCKCHAIN_PK_ADMIN_EC` | ECDSA admin private key. Preferred over `BLOCKCHAIN_PK_ADMIN`. |
| `BLOCKCHAIN_PK_ADMIN_ML` | ML-DSA admin private key. |
| `BLOCKCHAIN_PK_ADMIN_ML_PUB` | ML-DSA admin public key. |

### Smart contracts

`npm run deploy` in `smart-contracts/` writes these addresses into `.env`.

| Variable | Contract |
| --- | --- |
| `CONTRACT_ETHEREUM_DIDREGISTRY` | Ethereum DID Registry |
| `CONTRACT_VC_MANAGER` | Verifiable credential manager |
| `CONTRACT_NUBEM_TOKEN` | Nubem token |
| `CONTRACT_PAYMENT_ROUTER` | Payment router |
| `CONTRACT_CATALOG_REGISTRY` | Catalog registry |
| `CONTRACT_SUBSCRIPTION_REGISTRY` | Subscription registry |
| `CONTRACT_ORGANIZATION_REGISTRY` | Organization registry |
| `CONTRACT_AGENT_EVENT_TRACEABILITY` | Agent event traceability |

| Variable | Description |
| --- | --- |
| `DID_CREDENTIAL_DEFAULT_TTL` | Credential TTL in seconds. Empty uses `31536000`. |
| `TRACE_INGEST_API_KEY` | Optional key for `POST /api/v1/trace/events` (`x-trace-ingest-key`). The sample in `.env.example` is development-only. |

### Event synchronization

Enable synchronization on a single server.

| Variable | Description |
| --- | --- |
| `BLOCKCHAIN_SYNC` | `YES` to scan chain events into the database. |
| `BLOCKCHAIN_SYNC_FIRST_BLOCK` | First block to synchronize. Use `0` unless the chain is already long. |
| `BLOCKCHAIN_SYNC_RANGE` | Maximum blocks per step. |
| `BLOCKCHAIN_SYNC_TIME` | Expected block time in milliseconds. |

Reset stored sync progress after a build:

```sh
npm run reset-blockchain-sync
```

## Payments and tokens

`PAYMENTS_SUBSCRIPTION_GRACE_PERIOD_DAYS` is the initial grace period. The admin payments view stores the value in use in `payments_platform_config`.

| Variable | Description |
| --- | --- |
| `PAYMENTS_CURRENCY` | Currency code. Default `EUR`. |
| `PAYMENTS_PENDING_PAYMENT_EXPIRATION_DAYS` | Days before a pending payment expires. Default `7`. |
| `PAYMENTS_SUBSCRIPTION_GRACE_PERIOD_DAYS` | Bootstrap grace period in days. Default `5`. |
| `PAYMENTS_SUBSCRIPTION_MONTHLY_PERIOD_DAYS` | Monthly period length. Default `30`. |
| `PAYMENTS_SUBSCRIPTION_ANNUAL_PERIOD_DAYS` | Annual period length. Default `365`. |
| `PAYMENTS_SUBSCRIPTION_NOTICE_DAYS` | Days before renewal to emit a notice. Default `7`. |
| `STRIPE_CLIENT_ID` | Stripe publishable key. |
| `STRIPE_CLIENT_SECRET` | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `POST /stripe/webhook`. |
| `INVOICE_ISSUER_EMAIL` | Contact email printed on invoices. |
| `INVOICE_ISSUER_TAX_ID` | Tax id printed on invoices. `COMPANY_TAX_ID` is the fallback. |
| `STABLE_COIN_NAME` | Internal stable-coin name. Default `Euro`. |
| `STABLE_COIN_SYMBOL` | Internal stable-coin symbol. Default `EUR`. |
| `STABLE_COIN_DECIMALS` | Internal stable-coin decimals. Default `2`. |
| `TOKENS_NUBEM_ENABLED` | `NO` disables the Nubem token balance. Default enabled. |

## Tests

| Variable | Description |
| --- | --- |
| `TEST_DB_MONGO_URL` | MongoDB URL for API tests. Use a database other than the application database. |
