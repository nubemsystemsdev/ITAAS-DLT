# Keycloak theme

This folder contains the Nubem login and email theme for realm `itaas-dlt` (parent: [Keycloak](../README.md)). It follows the Marketplace auth UI (`web-application/frontend/src/style/auth.css`).

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [Tests](#tests)
- [Development](#development)
- [Deployment](#deployment)
- [Related documentation](#related-documentation)

## Requirements

- Keycloak 26.x, the same major version as `quay.io/keycloak/keycloak:26.0` in [docker-compose.yml](../docker-compose.yml)
- Docker Compose V2, from the [Keycloak setup](../README.md#requirements)

## Installation

The theme is mounted into the Keycloak container at `/opt/keycloak/themes/nubem`. Start Keycloak as described in [Keycloak installation](../README.md#installation). There is no separate package install.

## Configuration

`realm-export.json` sets:

- `loginTheme`: `nubem`
- `emailTheme`: `nubem`

Parent theme for login: `keycloak.v2` (Keycloak 26 / PatternFly v5). Macros that are not overridden locally, such as `buttons.ftl`, are inherited from the parent.

### Logos

Official logos live in `login/resources/img/`, copied from the frontend assets:

| File | Source | Used on |
| --- | --- | --- |
| `logo-navy.png` | `frontend/src/assets/nubemsystem-logo-navy.png` | Light background |
| `logo-white.png` | `frontend/src/assets/nubemsystem-logo-white.png` | Dark background |

If the frontend logos change, copy them here again so both UIs stay aligned.

### SSO UI cookies

Cookie names and write logic live in `web-application/shared/nubem-sso-cookies.js` (copied to `login/resources/js/`). The Marketplace frontend mirrors the same names in `frontend/src/constants/nubem-sso-cookies.ts`.

| Cookie | Purpose |
| --- | --- |
| `nubem-theme` | Light/dark theme |
| `nubem-locale` | `en` / `es` (Keycloak reads it on load via `kc_locale`) |
| `nubem-cookie-pref` | Essential vs all cookies |

Cookies use `path=/`, `SameSite=Lax`, and `Secure` on HTTPS. On localhost they are host-only (shared across ports). In production with subdomains, set `VITE__COOKIE_DOMAIN` in the frontend (for example `.example.com`) or rely on auto-detect of the parent domain.

After editing `shared/nubem-sso-cookies.js`, copy it to `login/resources/js/nubem-sso-cookies.js` and keep `nubem-sso-cookies.ts` names in sync.

## Running

Restart Keycloak after changing templates or CSS:

```sh
cd web-application/keycloak
docker compose restart keycloak
```

If `realm-export.json` changed (theme assignment), reimport the realm:

```sh
docker compose down -v
docker compose up -d
```

## Tests

This folder has no test script. Check login, registration, and email templates in a browser after restarting Keycloak. See [Keycloak running](../README.md#running).

## Development

Theme layout:

```text
nubem/
  login/          Login, register, password reset, update password, TOTP setup, email verify, cookies, info/error
  email/          Verification and password-reset email wrappers
```

Customize:

1. **Layout / branding** — `login/template.ftl`
2. **Page content** — `login/*.ftl` (login, register, reset, update password, TOTP setup, verify, cookies, info, error). `field.ftl` is a local override.
3. **Styles** — `login/resources/css/nubem.css`, which replicates the native Marketplace auth UI. Keep it aligned with `web-application/frontend/src/style/auth.css` (layout and components) and the `--auth-*` tokens in `web-application/frontend/src/style/theme.css` (colors per theme).
4. **Emails** — `email/html/template.ftl` and individual message templates

Dark mode is driven by the `pf-v5-theme-dark` class on `<html>` (set from `prefers-color-scheme` in `template.ftl`). Nubem color tokens are redefined under that class in `nubem.css`.

## Deployment

Ship the `nubem` directory as a Keycloak theme (`loginTheme` and `emailTheme`). Production Keycloak (HTTPS, database, secrets) is in [Keycloak deployment](../README.md#deployment).

## Related documentation

- [Keycloak](../README.md)
- [Frontend](../../frontend/README.md)
