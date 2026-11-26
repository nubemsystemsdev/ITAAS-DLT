# Web application

The web application contains the [Express backend](backend/README.md), the [Vue frontend](frontend/README.md), and the [Keycloak realm and theme](keycloak/README.md).

## Running

### Containerized stack

Follow the [local quick start](../README.md#local-quick-start) to start Cyberchain, MongoDB, and Redis, deploy the contracts, initialize the database, and open the Marketplace.

The application container reads `backend/.env`. Values under `environment` in [docker-compose.yml](docker-compose.yml) override the corresponding values in that file. A separate `.env` beside the Compose file supplies variable substitutions such as `FILE_STORAGE_PRIVATE_SECRET`.

To inspect application startup or the frontend build:

```sh
docker compose logs -f platform_app
```

Run that command from this directory. If you enable local SSO, see the [Keycloak setup](keycloak/README.md#configuration) for the required backend settings. The public Keycloak URL must also be reachable from the backend container when using Compose.

### Local modules

Start the [standalone Cyberchain node](../cyberchain-test-node/README.md#running) and deploy the contracts. Run a local MongoDB instance and configure its connection in `backend/.env`. Use the [backend instructions](backend/README.md#running) and the [frontend instructions](frontend/README.md#running) to run the two npm projects independently.

## Deployment

The [Dockerfile](Dockerfile) builds the backend. The [entrypoint](docker-startup.sh) builds the frontend with the container's environment before starting the backend. For a Linux server with systemd and production services, follow the [deployment guide](../deployment-scripts/DEPLOYMENT_GUIDE.md).
