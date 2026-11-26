# Frontend

This folder contains the web user interface for the [web application](../README.md). It uses [Vue.js](https://vuejs.org/) and [Vite](https://vitejs.dev/).

## Table of contents

-   [Requirements](#requirements)
-   [Installation](#installation)
-   [Configuration](#configuration)
-   [Running](#running)
-   [Tests](#tests)
-   [Development](#development)
-   [Deployment](#deployment)
-   [Related documentation](#related-documentation)

## Requirements

-   [Node.js](https://nodejs.org/) `>=24.22.1 <25`. See the [root runtime setup](../../README.md#nodejs-runtime).

## Installation

Install dependencies:

```sh
npm ci
```

## Configuration

Copy `.env.example` to `.env` and edit the values.

```sh
cp .env.example .env
```

| Variable                     | Description                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEV_PORT`                   | Port for the Vite dev server. Default `8080`. Read by `vite.config.js` (not exposed to the browser).                                               |
| `VITE__PLATFORM_NAME`        | The platform name.                                                                                                                                 |
| `VITE__PLATFORM_DESCRIPTION` | The platform description.                                                                                                                          |
| `VITE__I18N_LOCALE`          | The default locale for the internationalization plugin. `en` by default.                                                                           |
| `VITE__DEV_TEST_HOST`        | API server base URL in development. Default `http://localhost`.                                                                                    |
| `VITE__API_SERVER_HOST`      | API server base URL in production. Since the backend usually serves the frontend, this can be `/`.                                                 |
| `VITE__COOKIE_DOMAIN`        | Parent domain for SSO UI cookies shared with Keycloak (for example `.example.com`). Leave empty for auto-detect; localhost uses host-only cookies. |
| `VITE__CAPTCHA_SERVICE`      | Captcha service. Available value: `reCAPTCHA`.                                                                                                     |
| `VITE__RECAPTCHA_SITE_KEY`   | Google reCAPTCHA site key.                                                                                                                         |

Client-side variables must use the `VITE__` prefix so Vite exposes them. [Learn more](https://vitejs.dev/guide/env-and-mode#env-and-mode).

## Running

Start the dev server:

```sh
npm run serve
```

The server listens on port `8080` unless `DEV_PORT` is set.

### Production

Build static files:

```sh
npm run build
```

The output is the `dist` folder. Serve that folder as the frontend in production.

Production builds use Vite 7's default `baseline-widely-available` target: Chrome 107, Edge 107, Firefox 104, and Safari 16.

## Tests

`npm test` does not run browser tests. It runs the unit tests, type-checks with `vue-tsc`, then runs ESLint and Prettier.

```sh
npm test
```

## Development

Format and fix lint issues:

```sh
npm run lint
```

`npm run prettier` runs Prettier only.

### Project structure

All application code is in `src/`:

-   `src/api` — API bindings. Generated from the backend (`npm run update-api-bindings` in `web-application/backend`).
-   `src/assets` — images, fonts, and other assets. Static files can also live in `public/`.
-   `src/components` — Vue components.
-   `src/composables` — shared composition functions (`use*.ts`) reused by pages and sections.
-   `src/constants` — shared constants, including SSO cookie names.
-   `src/control` — global app state, such as authentication and preferences.
-   `src/locales` — translation files.
-   `src/services` — small client-side lookup helpers.
-   `src/style` — stylesheets.
-   `src/utils` — shared utility functions.

Routes are declared in [src/routes.ts](./src/routes.ts).

### Translations

Visible text uses `$t("English key")`. Translation files are JSON files in [src/locales](./src/locales/), named `locale-{LANG}.json`.

Scan the code and add new keys (empty string until translated):

```sh
npm run update-translations
```

Translate the new keys in the `.missing.txt` files. When a file is complete, set `STATUS=PENDING` to `STATUS=READY` and apply it:

```sh
npm run apply-missing-translations
```

Do not run `update-translations` again while editing a `.missing.txt` file; it can reorder the keys. Translate the keys added for a task as the last step before the pull request.

To translate a key to an empty string, use a single space: `" "`. Values are trimmed, so do not add spaces at the edges of keys or values.

Add a language:

1. Create `locale-LANG.json` in [src/locales](./src/locales/) with an empty object `{}` (`LANG` is the locale code, for example `en` or `es`).
2. Add the locale to `AVAILABLE_LANGUAGES` in [src/i18n.ts](./src/i18n.ts).
3. Run `npm run update-translations`.
4. Translate the `.missing.txt` file and set `STATUS=READY`.
5. Run `npm run apply-missing-translations`.

### Styles

Shared styles live in [src/style](./src/style/). Theme colors are CSS variables in [src/style/theme.css](./src/style/theme.css). Import shared styles with `@import "@/style/…"`. Icons use [Font Awesome](https://fontawesome.com/search?o=r&m=free).

Vue 3 Options API reference: [Vue 3 — Options API](https://vuejs.org/api/options-state.html).

## Deployment

The production artifact is `dist/` from `npm run build`. The [web application image](../README.md#deployment) builds and serves it. Host deployment: [deployment-scripts/README.md](../../deployment-scripts/README.md).

## Related documentation

-   [Web application](../README.md)
-   [Backend](../backend/README.md)
-   [Keycloak](../keycloak/README.md)
