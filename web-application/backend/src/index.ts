// Reserved for license

"use strict";

require('dotenv').config();

import Cluster from "cluster";
import FS from "fs";
import Path from "path";
import { DatabaseConfig } from "./config/config-database";
import { BlockchainConfig } from "./config/config-blockchain";
import { CrashGuard } from "./crash-guard";
import { Monitor } from "./monitor";
import { BlockchainEventsScanner } from "./services/blockchain-events-scan";
import { WorkerProcess } from "./worker";
import { Config } from "./config/config";
import { KeycloakConfig } from "./config/config-keycloak";
import { UsersService } from "./services/users-service";
import { TaskService } from "./services/task-service";
import { CatalogItemService } from "./services/catalog-item-service";
import { PaymentsPlatformConfigService } from "./services/payments-platform-config-service";

DatabaseConfig.getInstance(); // Initialize database

CrashGuard.enable();

const processMap: any = {};

/**
 * Validates required configuration before the server starts.
 * Exits the process when Keycloak SSO is enabled without Redis.
 */
function validateStartupConfiguration(): void {
    KeycloakConfig.getInstance().assertOAuthStateStoreReady();
}

async function main() {
    try {
        validateStartupConfiguration();
    } catch (ex) {
        Monitor.error("[Startup] Backend cannot start: " + (ex.message || ex));
        process.exit(1);
    }

    if (Cluster.isMaster) {
        Monitor.status(`Master process started. PID = ${process.pid}`);

        // Clear temp dir

        try {
            FS.mkdirSync(Path.resolve(__dirname, "..", "temp"));
        } catch (ex) { }

        const tempFiles = FS.readdirSync(Path.resolve(__dirname, "..", "temp"));

        for (const tempFile of tempFiles) {
            try {
                FS.unlinkSync(Path.resolve(__dirname, "..", "temp", tempFile));
            } catch (e) { }
        }

        Monitor.status(`Spawning workers...`);
        const numWorkers = Config.getInstance().numberOfWorkers;

        const workerEnv = Object.create(null);

        for (const key of Object.keys(process.env)) {
            workerEnv[key] = process.env[key];
        }

        workerEnv["WorkerType"] = "server";

        for (let i = 0; i < numWorkers; i++) {
            const pid = Cluster.fork(workerEnv).id;
            Monitor.debug(`Spawned ${pid}`);
            processMap[pid] = "server";
        }

        // Messages
        Cluster.on("message", (worker, message) => {
            if (typeof message === "object" && !!message && message.type === "will-die") {
                const type = processMap[worker.id];

                delete processMap[worker.id];

                if (type === "server") {
                    Monitor.info(`Server worker ${worker.id} (PID=${worker.process.pid}) will die. Spawning new worker to replace it...`);
                    const pid = Cluster.fork(workerEnv).id;
                    Monitor.debug(`Spawned ${pid}`);
                    processMap[pid] = "server";
                } else {
                    Monitor.info(`Worker ${worker.id} (PID=${worker.process.pid}) will die.`);
                }
            }
        });

        // Watch for workers
        Cluster.on("exit", function (worker, code, signal) {
            const type = processMap[worker.id];

            delete processMap[worker.id];

            if (type === "server") {
                Monitor.error(`Server worker ${worker.id} (PID=${worker.process.pid}) died (${signal || code}). Spawning new worker to replace it...`);
                const pid = Cluster.fork(workerEnv).id;
                Monitor.debug(`Spawned ${pid}`);
                processMap[pid] = "server";
            } else {
                Monitor.status(`Worker ${worker.id} (PID=${worker.process.pid}) died (${signal || code}).`);
            }
        });

        // Initialize users system
        UsersService.getInstance().initialize().catch(err => {
            Monitor.exception(err);
            Monitor.error("[Startup] UsersService.initialize failed; shutting down.");
            process.exit(1);
        });

        CatalogItemService.getInstance().ensureItaasPlatformItem().catch(err => {
            Monitor.exception(err);
        });

        CatalogItemService.getInstance().ensureCustomAgentServiceItem().catch(err => {
            Monitor.exception(err);
        });

        PaymentsPlatformConfigService.getInstance().ensureDefaultConfig().catch(err => {
            Monitor.exception(err);
        });

        // Run blockchain sync
        if (BlockchainConfig.getInstance().sync) {
            BlockchainEventsScanner.getInstance().start().catch(err => {
                Monitor.exception(err);
            });
        }

        // Master process

        // Start task service
        TaskService.getInstance().start();

        Monitor.status("Server initialization completed");
    } else {
        Monitor.status(`Worker started. PID = ${process.pid} / WORKER ${Cluster.worker.id} / TYPE = ${process.env.WorkerType}`);

        if (process.env.WorkerType === "server") {
            const worker: WorkerProcess = new WorkerProcess();
            worker.run();
        } else {
            Monitor.error(`Environment variable WorkerType expected to be 'server', but found '${process.env.WorkerType}' | The worker cannot be started.`);
            process.exit(1);
        }
    }
}

main().catch(function (ex) {
    console.error(ex);
    process.exit(1);
});
