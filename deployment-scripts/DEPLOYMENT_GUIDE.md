# Deployment guide

Deploy the ITAAS web application on a Linux server with systemd. Replace every placeholder before use: `<deploy-user>`, `<repo-path>`, `<domain>`, and `<org>/itaas-project`.

The container stack (Keycloak `start-dev` and the in-repo test chain) is documented in [web-application/README.md](../web-application/README.md#running). Do not use that stack as this production host.

## Table of contents

- [Requirements](#requirements)
- [Install tools](#install-tools)
- [Create a deploy key](#create-a-deploy-key)
- [Clone the repository](#clone-the-repository)
- [Configure the application](#configure-the-application)
- [Start MongoDB and Redis](#start-mongodb-and-redis)
- [Configure Keycloak](#configure-keycloak)
- [Deploy contracts](#deploy-contracts)
- [Build the application](#build-the-application)
- [Install the systemd service](#install-the-systemd-service)
- [Enable HTTPS](#enable-https)
- [Check logs](#check-logs)

## Requirements

- A Linux server (the package commands below use `apt`)
- Node.js `24.22.1` (all npm modules require `>=24.22.1 <25`)
- npm on the system path (`/usr/bin/npm` in [itaas.service](./itaas.service))
- Git
- Docker Engine and Docker Compose V2 (`docker compose`)
- FFmpeg and FFprobe (the server starts without them; install them when the backend encodes images or video)
- MongoDB, Redis, a production Keycloak 26, and a production Cyberchain node (steps below)

## Install tools

Install Git, Docker Engine, and FFmpeg:

```sh
sudo apt install git ffmpeg
```

Install Docker Engine from the [Docker Engine install guide](https://docs.docker.com/engine/install/ubuntu/). Install Node.js `24.22.1` from the [Node.js package manager guide](https://nodejs.org/en/download/package-manager) so `node` and `npm` land in `/usr/bin`.

Allow Node.js to bind to ports 80 and 443:

```sh
sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"
```

Run `setcap` again after every Node.js upgrade.

After a Node.js security update, reinstall dependencies with `npm ci`, rebuild both web modules and restart the application service. Confirm that `node --version` and `/usr/bin/node --version` both report the pinned version used by the service.

## Create a deploy key

Create an SSH key on the server so it can clone and pull the repository. Set no passphrase.

```sh
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "itaas-deploy"
```

Add the key to `~/.ssh/config`:

```conf
Host github.com-itaas
        Hostname github.com
        IdentityFile=/home/<deploy-user>/.ssh/deploy_key
```

Print the public key and add it on GitHub under **Settings** → **Deploy keys**. Leave **Allow write access** off.

```sh
cat ~/.ssh/deploy_key.pub
```

Deploy key details: [Managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).

## Clone the repository

Clone with the host alias from the SSH config:

```sh
git clone git@github.com-itaas:<org>/itaas-project.git <repo-path>
```

## Configure the application

Copy the example environment files:

```sh
cd <repo-path>/web-application/backend
cp .env.example .env

cd ../frontend
cp .env.example .env

cd <repo-path>/smart-contracts
cp .env.example .env
```

Variable references: [backend CONFIG.md](../web-application/backend/CONFIG.md), [frontend configuration](../web-application/frontend/README.md#configuration), and [smart-contracts configuration](../smart-contracts/README.md#configuration).

Set these production values in `web-application/backend/.env`. Sample passwords, client secrets, and wallet keys in the example files are development-only. Replace them.

- `NODE_ENV=production`
- `BACKEND_EXTERNAL_URI=https://<domain>`
- `FRONTEND_EXTERNAL_URI=https://<domain>`
- `ALLOWED_ORIGINS=https://<domain>`
- `SERVE_FRONTEND=YES`
- `FRONTEND_PATH=../frontend/dist`
- `FILE_STORAGE_SERVER_URL=https://<domain>/static/`
- `FILE_STORAGE_PRIVATE_SECRET` — a new random string
- `INITIAL_USER_NAME` and `INITIAL_USER_PASSWORD` — replace the development-only `admin` / `password`
- `INTERNAL_SERVICE_API_KEY` — replace the development-only sample
- `DB_TYPE=MONGO` and `DB_MONGO_URL=mongodb://127.0.0.1:27017/itaas`
- `REDIS_ENABLED=YES`, `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`
- `BLOCKCHAIN_NODE_PROTOCOL`, `BLOCKCHAIN_NODE_RPC_URL`, and the admin key fields, pointed at the production node
- Keycloak variables when SSO is enabled (see [Configure Keycloak](#configure-keycloak))

Leave the HTTPS certificate variables commented until [Enable HTTPS](#enable-https) finishes. A missing certificate stops the process.

In `web-application/frontend/.env`, keep `VITE__API_SERVER_HOST=/` when the backend serves `dist/`. Set `VITE__PLATFORM_NAME` and `VITE__COOKIE_DOMAIN` for `<domain>`.

In `smart-contracts/.env`, set the same production `BLOCKCHAIN_*` endpoint and admin keys. Keep production keys out of git.

## Start MongoDB and Redis

These commands keep MongoDB and Redis on the same host and publish them only on localhost:

```sh
docker run -d --name itaas-mongo --restart unless-stopped \
  -p 127.0.0.1:27017:27017 -v itaas-mongo:/data/db mongo

docker run -d --name itaas-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis
```

Redis is required when `KEYCLOAK_SSO_ENABLED=YES`. The backend does not start if Keycloak SSO is enabled and Redis is off.

## Configure Keycloak

Run Keycloak 26 in `start` mode with HTTPS, a production database, and new client secrets. Do not use `start-dev` or the development-only `admin` / `admin` credentials from the local Compose file.

Follow [Keycloak deployment](../web-application/keycloak/README.md#deployment). Then set `KEYCLOAK_SSO_ENABLED`, `KEYCLOAK_BASE_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_REDIRECT_URI`, and `KEYCLOAK_POST_LOGOUT_REDIRECT_URI` in `web-application/backend/.env`.

## Deploy contracts

Point `smart-contracts/.env` at the production Cyberchain node, then deploy. The test node Compose is for local development. Do not publish it as the production chain. See [cyberchain-test-node deployment](../cyberchain-test-node/README.md#deployment).

```sh
cd <repo-path>/smart-contracts
npm ci
npm run build
npm run deploy
```

`npm run deploy` writes `CONTRACT_*` addresses into `web-application/backend/.env`. Later upgrades use `npm run deploy:upgrade`. Contract details: [smart-contracts deployment](../smart-contracts/README.md#deployment).

## Build the application

Build the backend, sync MongoDB indexes, and build the frontend:

```sh
cd <repo-path>/web-application/backend
npm ci
npm run build
npm run setup-mongo

cd ../frontend
npm ci
npm run build
```

`npm run setup-mongo` requires the backend build. It is safe to run again after later deploys.

## Install the systemd service

Copy [itaas.service](./itaas.service) to `/etc/systemd/system/itaas.service`. Replace `<deploy-user>` and `<repo-path>` in that file. `ExecStart` expects `/usr/bin/npm`. Change it if `command -v npm` prints another path.

```sh
sudo cp <repo-path>/deployment-scripts/itaas.service /etc/systemd/system/itaas.service
sudo systemctl daemon-reload
sudo systemctl enable itaas
sudo systemctl start itaas
```

## Enable HTTPS

Confirm the service is running and serving HTTP on port 80. In `web-application/backend/.env` set:

```env
SERVE_ACME_CHALLENGE=YES
ACME_CHALLENGE_PATH=/var/www/certbot/.well-known/acme-challenge/
```

Restart the service, install Certbot, and issue a certificate for `<domain>`:

```sh
sudo systemctl restart itaas
sudo apt install certbot
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot --email admin@<domain> -d <domain> --agree-tos
sudo chmod -R 755 /etc/letsencrypt/
```

Point the backend at that same domain:

```env
SERVER_HTTPS_PORT=443
SERVER_HTTPS_CERTIFICATE=/etc/letsencrypt/live/<domain>/fullchain.pem
SERVER_HTTPS_KEY=/etc/letsencrypt/live/<domain>/privkey.pem
SERVER_REDIRECT_SECURE=YES
```

```sh
sudo systemctl restart itaas
```

Renew the certificate with [auto-certbot.service](./auto-certbot.service):

```sh
sudo cp <repo-path>/deployment-scripts/auto-certbot.service /etc/systemd/system/auto-certbot.service
sudo systemctl daemon-reload
sudo systemctl enable auto-certbot
sudo systemctl start auto-certbot
```

## Check logs

```sh
journalctl -u itaas -f
```
