# Keycloak

This folder contains the [Keycloak](https://www.keycloak.org/) identity provider for the [web application](../README.md). Keycloak handles user registration, login, password management, and SSO via OpenID Connect (OIDC).

When `KEYCLOAK_SSO_ENABLED=YES`, Keycloak replaces native Marketplace authentication. Users sign in through Keycloak; the backend creates or links a local user using the OIDC `sub` claim (`keycloakSub`).

The shared realm `itaas-dlt` is used by the Marketplace (client `itaas-dlt`) and Flowise / BFF integrations (client `flowise`).

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

- **OIDC Authorization Code flow** for the Marketplace frontend and backend.
- **Realm export** (`realm-export.json`) imported on first container start.
- **Self-registration** enabled in the realm (users register in Keycloak, not in native Marketplace forms).
- **Email verification** required (`verifyEmail: true`). Users must verify their email in Keycloak before the Marketplace provisions a local account.
- **Initial admin bootstrap.** On first startup with an empty database, the backend provisions the admin user in Keycloak and links `keycloakSub`.
- **Internal user-info API** — `GET /api/v1/internal/users/:keycloakSub` for BFF / Flowise to resolve organization membership and ITAAS Platform subscription status.
- **End-session logout.** The backend returns a Keycloak logout URL with `id_token_hint` to clear the SSO session.
- **Account Console blocked.** End users cannot open `/realms/itaas-dlt/account`. Credential changes stay in Marketplace **Profile and security**.

## Requirements

- [Docker](https://www.docker.com/) and Docker Compose V2 (`docker compose`)
- [Redis](https://redis.io/) reachable by the backend (`REDIS_ENABLED=YES`). Required when Keycloak SSO is enabled. OAuth CSRF state is stored in Redis so it works across multiple backend workers.
- Marketplace [backend](../backend/) and [frontend](../frontend/) running, or the full stack from [web-application/docker-compose.yml](../docker-compose.yml)
- Free ports in development: **8081** (Keycloak), **8080** (frontend dev), **80** (backend / nginx depending on setup)

## Installation

### Keycloak only

Use this for SSO development:

```sh
cd web-application/keycloak
docker compose up -d
```

### From the web application stack

```sh
cd web-application
docker compose up -d platform_keycloak
```

The realm is imported only on the container's first start (`--import-realm`). Wait for the healthcheck to pass (about one minute on first boot).

## Configuration

Keycloak SSO is configured in the backend environment. Copy `.env.example` to `.env` in `web-application/backend/`:

```sh
cd web-application/backend
cp .env.example .env
```

Keycloak-related variables (see also [backend/.env.example](../backend/.env.example)):

| Variable | Description |
| --- | --- |
| `KEYCLOAK_SSO_ENABLED` | Set to `YES` to use Keycloak as the only authentication provider. |
| `REDIS_ENABLED` | Must not be `NO` when Keycloak SSO is enabled. |
| `REDIS_HOST` | Redis host for OAuth state storage. |
| `REDIS_PORT` | Redis port (default `6379`). |
| `KEYCLOAK_BASE_URL` | Public base URL of Keycloak (for example `http://localhost:8081`). |
| `KEYCLOAK_REALM` | Realm name (`itaas-dlt`). |
| `KEYCLOAK_CLIENT_ID` | OIDC client ID (`itaas-dlt`). |
| `KEYCLOAK_CLIENT_SECRET` | OIDC client secret. |
| `KEYCLOAK_REDIRECT_URI` | OAuth redirect URI (default: frontend `/callbacks/keycloak`). |
| `KEYCLOAK_POST_LOGOUT_REDIRECT_URI` | URL after Keycloak logout (default: frontend `/login`). |
| `INTERNAL_SERVICE_API_KEY` | Shared secret for `GET /internal/users/:keycloakSub` (BFF / Flowise). |
| `INITIAL_USER_NAME` | Username for the first local admin when the database is empty. |
| `INITIAL_USER_PASSWORD` | Password for the first local admin. |

Example for local development only:

```env
KEYCLOAK_SSO_ENABLED=YES
REDIS_ENABLED=YES
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

KEYCLOAK_BASE_URL=http://localhost:8081
KEYCLOAK_REALM=itaas-dlt
KEYCLOAK_CLIENT_ID=itaas-dlt
KEYCLOAK_CLIENT_SECRET=itaas-dlt-dev-secret
KEYCLOAK_REDIRECT_URI=http://localhost:8080/callbacks/keycloak
KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:8080/login

INTERNAL_SERVICE_API_KEY=bff-dev-internal-key
INITIAL_USER_NAME=admin
INITIAL_USER_PASSWORD=password
```

`itaas-dlt-dev-secret`, `admin`, and `password` above are development values. Do not use them in production.

Align `KEYCLOAK_REDIRECT_URI` and `KEYCLOAK_POST_LOGOUT_REDIRECT_URI` with `FRONTEND_EXTERNAL_URI` if the frontend uses a different host or port.

### Email verification and SMTP

The realm is exported with `verifyEmail: true`. Keycloak sends a verification email on self-registration and does not mark the account as verified until the user clicks the link. The Marketplace backend also rejects OIDC callbacks when the `email_verified` claim is `false`.

Configure SMTP in Keycloak so verification emails can be delivered. Without it, new users cannot complete registration.

#### Admin console

1. Open the Keycloak admin console and select realm `itaas-dlt`.
2. Go to **Realm settings** → **Email**.
3. Fill in:

| Field | Example |
| --- | --- |
| **From** | `noreply@example.com` |
| **From display name** | `ITAAS DLT` |
| **Host** | `smtp.example.com` |
| **Port** | `587` (STARTTLS) or `465` (SSL) |
| **Encryption** | Enable **Start TLS** for port 587, or **SSL** for port 465 |
| **Authentication** | Enabled |
| **Username** | SMTP user |
| **Password** | SMTP password |

4. Click **Save**, then **Test connection** (sends a test email to the logged-in admin user).
5. Under **Realm settings** → **Login**, confirm **Verify email** is **ON** (already set in `realm-export.json`).

#### Local development with Mailpit

[Mailpit](https://github.com/axllent/mailpit) catches outbound SMTP locally and exposes a web UI to read messages.

Run Mailpit next to Keycloak, or on its own:

```sh
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Then in the Keycloak admin console (realm `itaas-dlt` → **Email**):

| Field | Value |
| --- | --- |
| From | `noreply@localhost` |
| Host | `host.docker.internal` (Windows/macOS Docker) or the Mailpit container hostname on the same Docker network |
| Port | `1025` |
| Encryption | None |
| Authentication | Disabled |

Web UI: http://localhost:8025. Verification emails appear here after registration.

On Linux Docker, use `172.17.0.1`, or attach Keycloak and Mailpit to the same user-defined network and use the service name as host.

#### Realm export (`smtpServer`)

For repeatable non-secret host and port settings, add an `smtpServer` block to `realm-export.json`:

```json
"smtpServer": {
  "host": "host.docker.internal",
  "port": "1025",
  "from": "noreply@localhost",
  "fromDisplayName": "ITAAS DLT",
  "ssl": "false",
  "starttls": "false",
  "auth": "false"
}
```

Do not commit real SMTP passwords in the JSON. Set credentials in the admin console, or inject them with a secrets manager in production.

After changing `realm-export.json`, reimport the realm in development:

```sh
cd web-application/keycloak
docker compose down -v
docker compose up -d
```

## Running

### Verify Keycloak

```sh
curl -s http://localhost:8081/realms/itaas-dlt/.well-known/openid-configuration | head
```

Expected: JSON with `issuer`, `authorization_endpoint`, `token_endpoint`, and related fields.

| Resource | URL (development) |
| --- | --- |
| Admin console | http://localhost:8081/admin |
| OIDC issuer | http://localhost:8081/realms/itaas-dlt |
| OpenID configuration | http://localhost:8081/realms/itaas-dlt/.well-known/openid-configuration |
| Account Console UI | Blocked (deny flow on client `account-console`). Use Marketplace Profile and security. |

Development admin credentials only: `admin` / `admin`.

### Start Redis, backend, and frontend

Redis is required. With `KEYCLOAK_SSO_ENABLED=YES`, the backend does not start if Redis is disabled.

```sh
docker run -d --name redis -p 6379:6379 redis:latest
```

Start the backend and the frontend as described in [backend/README.md](../backend/README.md) and [frontend/README.md](../frontend/README.md).

Open `http://localhost:8080` and go to `/login`. The frontend redirects to Keycloak.

### End-to-end login

1. Go to `/login`. The browser redirects to Keycloak.
2. Sign in or register (the realm allows self-registration).
3. Return to `/callbacks/keycloak`. The Marketplace session is active.
4. Log out. Keycloak ends the session, then redirects to `/login`.

### Internal user-info API

```sh
curl -s -H "x-internal-service-api-key: <INTERNAL_SERVICE_API_KEY>" \
  http://localhost/api/v1/internal/users/<keycloak-sub>
```

Returns `uid`, `keycloakSub`, `email`, `username`, `role`, `organization`, and `itaasSubscription` (`hasSubscription`, `source`, `assignedToUser`).

## Tests

This folder has no automated test script. Use the checks under [Running](#running). Backend coverage of Keycloak helpers lives in the [backend tests](../backend/README.md#tests).

## Development

### Folder contents

| File | Description |
| --- | --- |
| `docker-compose.yml` | Standalone Keycloak for local development (port **8081**) |
| `realm-export.json` | Realm `itaas-dlt` imported on container start |
| `theme/nubem/` | Custom **Nubem** login and email theme (`loginTheme` / `emailTheme`) |
| `theme/README.md` | Theme structure, logos, and customization notes |
| `README.md` | This document |

The full stack also defines `platform_keycloak` in [web-application/docker-compose.yml](../docker-compose.yml), mounting the same `realm-export.json`.

### Authentication flow

```text
User → Frontend (/login)
    → Backend GET /auth/keycloak/login  (state stored in Redis)
    → Keycloak (login / registration)
    → Frontend /callbacks/keycloak?code&state
    → Backend POST /auth/keycloak/callback  (code exchange, user provisioning)
    → Local session (cookie + x-session-id)
```

Canonical identity across systems: OIDC claim `sub`, stored in the database as `keycloakSub`. The backend does not link local users by email. Every Marketplace account is created on first login from a verified Keycloak identity.

### Responsibility split

| Area | Keycloak | Marketplace (backend) |
| --- | --- | --- |
| Login / registration / password reset (forgot) | Yes | No (native auth endpoints blocked) |
| OIDC tokens | Yes | No |
| Application session (`x-session-id`) | No | Yes |
| Platform roles, organizations, licenses | Partial (`admin` realm role → local admin) | Yes |
| Change username / email (signed-in user) | Source of truth | Proxies via Admin API and syncs local `User` |
| Change password (signed-in user) | Source of truth | Marketplace opens Keycloak AIA `UPDATE_PASSWORD` (`GET /auth/keycloak/update-password`). Account REST password endpoint is not used under SSO (removed on Keycloak 26+) |
| Native Marketplace TFA (TOTP) | — | Disabled (`403 KEYCLOAK_ONLY`); CTA opens Keycloak AIA `CONFIGURE_TOTP` (Mobile Authenticator Setup) |
| Account Console UI | Blocked | Deny browser flow on client `account-console` (`deny-account-console`). Self-service is Marketplace-only |

### Initial admin user

If the database is empty, the backend creates the local user from `INITIAL_USER_NAME` / `INITIAL_USER_PASSWORD`.

With Keycloak enabled, it also:

1. Creates the same user in realm `itaas-dlt` via the Admin API (client credentials on `itaas-dlt`).
2. Assigns the `admin` realm role.
3. Links `keycloakSub` on the local user.

The Admin API uses the `itaas-dlt` service account (`serviceAccountsEnabled` with `realm-management` roles in `realm-export.json`).

### Preconfigured OIDC clients

Development only:

| Client ID | Secret (development) | Purpose |
| --- | --- | --- |
| `itaas-dlt` | `itaas-dlt-dev-secret` | Marketplace. Redirects `http://localhost:8080/callbacks/keycloak` and `http://localhost/callbacks/keycloak`. |
| `flowise` | `flowise-dev-secret` | Flowise / BFF SSO. Redirects at `http://localhost:3000/*`. Default scopes include `basic` (required for `sub` in access tokens). Access token `aud` includes `flowise` (Audience mapper). |

### Realm roles

| Role | Purpose |
| --- | --- |
| `user` | Default role on registration |
| `admin` | Mapped to platform administrator on first login |

### Modifying the realm

`realm-export.json` is imported on the first container start only. Apply changes in development:

```sh
cd web-application/keycloak
docker compose down -v
docker compose up -d
```

`-v` removes the data volume. In production, export or import from the admin console or the Admin REST API without deleting data.

After changing service-account roles for `itaas-dlt` in the JSON, restart Keycloak and the backend so initial admin provisioning and in-app username and email updates work.

Login theme details: [theme/README.md](./theme/README.md).

## Deployment

`docker-compose.yml` in this folder uses `start-dev` and fixed credentials. Development only.

For production:

1. Run Keycloak 26.x (aligned with `quay.io/keycloak/keycloak:26.0`) in `start` mode (not `start-dev`), with an external database (PostgreSQL recommended).
2. Expose HTTPS via a reverse proxy. `KEYCLOAK_BASE_URL` must be the public issuer URL (for example `https://auth.example.com`).
3. Configure `KC_HOSTNAME`, TLS, and bootstrap admin secrets via a secrets manager. Do not use `admin` / `admin`.
4. Import realm `itaas-dlt` from `realm-export.json`, or create it in the admin console and export the final configuration.
5. Create production OIDC clients with new secrets. Do not use `itaas-dlt-dev-secret` or `flowise-dev-secret`.
6. Restrict `redirectUris`, `webOrigins`, and `post.logout.redirect.uris` to real production domains (avoid `+` in `webOrigins`).
7. Use a real SMTP provider (SendGrid, Amazon SES, Microsoft 365, or similar) with TLS. Set a **From** address on a domain you control (SPF/DKIM configured). Confirm **Verify email** is enabled. Test: register, receive the email, click the link, and log in to the Marketplace.
8. Ensure Redis is available to all backend instances (`WORKERS_NUMBER` > 1).
9. Apply Marketplace database schema updates (`database/*.auto.sql` / Mongo sync) before enabling Keycloak in production.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Backend fails to start with Keycloak enabled | Redis disabled | Set `REDIS_ENABLED=YES` and ensure Redis is running |
| `INVALID_STATE` on callback | Expired state, Redis not shared across workers, or link reused | Retry login; verify a single Redis for all backend instances |
| `IDENTITY_MISMATCH` on callback | AIA started as user A, but Keycloak completed as another account | Stay signed into the same Keycloak user that owns the Marketplace session; retry from Profile and security |
| `KEYCLOAK_DISABLED` / 403 on login URL | Incomplete env or `KEYCLOAK_SSO_ENABLED` is not `YES` | Check `.env` and restart the backend |
| `OAUTH_ERROR` on callback | `redirect_uri` mismatch, wrong secret, or Keycloak down | Align `KEYCLOAK_REDIRECT_URI` with the Keycloak client |
| Logout does not clear Keycloak SSO session | Session created before `id_token` was stored | Sign in again (new sessions send `id_token_hint`) |
| `404 USER_NOT_FOUND` on internal API | User never logged into the Marketplace | First Marketplace login provisions `keycloakSub` |
| Realm not updated after editing JSON | Import runs only on first start | `docker compose down -v && docker compose up -d` (development) or reimport in production |
| Username/email change → `KEYCLOAK_UNAVAILABLE` | Service account missing `manage-users` / Admin API unreachable (email: failure happens on verify sync, not on request) | Reimport realm; check Keycloak logs and `KEYCLOAK_BASE_URL` |
| Password change → cannot open Keycloak / `NO_KEYCLOAK_SESSION` | Refresh token missing or expired, or OAuth state / Redis issue on AIA URL | Sign in again; use **Change password** (AIA `UPDATE_PASSWORD`) from Profile and security |
| TFA endpoints → `403 KEYCLOAK_ONLY` | Expected under SSO | Use **Set up mobile authenticator** (AIA `CONFIGURE_TOTP`) from Profile and security |
| Account Console → Access denied | Expected: deny flow on `account-console` | Use Marketplace **Profile and security**; restart the backend so `ensureAccountConsoleBlocked` applies, or reimport the realm if the client is missing |
| Backend exits: cannot block Account Console / HTTP 403 on `account-console` | Service account missing `view-clients` / `manage-clients` on an existing realm | In Admin Console → Clients → `itaas-dlt` → Service account roles → assign `realm-management` `view-clients` and `manage-clients`, then restart the backend; or `docker compose down -v && docker compose up -d` to reimport |

## Related documentation

- [theme/README.md](./theme/README.md)
- [backend/.env.example](../backend/.env.example) — `KEYCLOAK_*` and `INTERNAL_SERVICE_API_KEY`
- [backend/README.md](../backend/README.md)
- [frontend/README.md](../frontend/README.md)
- [Web application](../README.md)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
