// Reserved for license

import { AsyncInterval } from "@asanrom/async-tools";
import { Monitor } from "../monitor";
import { Config } from "../config/config";
import { User } from "../models/users/user";
import { PaymentService } from "./payment-service";
import { PaymentsConfig } from "../config/config-payments";
import { PaymentsPlatformConfigService } from "./payments-platform-config-service";
import { SubscriptionService } from "./subscription-service";
import { SubscriptionBillingService } from "./subscription-billing-service";
import { TokenService } from "./token-service";
import { Subscription, SubscriptionBillingCycle, SubscriptionStatus } from "../models/subscription";
import { NotificationService } from "./notification-service";
import { TraceabilityService } from "./traceability-service";
import { OrganizationLicensePoolService } from "./organization-license-pool-service";
import { OrganizationService } from "./organization-service";
import { ItaasWorkspaceProvisioningService } from "./itaas-workspace-provisioning-service";
import { DataFilter } from "tsbean-orm";

interface Task {
    id: string;
    interval: AsyncInterval;
    period: number;
    runOnStartup?: boolean,
}

/**
 * Periodic tasks service
 */
export class TaskService {
    /* Singleton */

    public static instance: TaskService = null;

    public static getInstance(): TaskService {
        if (TaskService.instance) {
            return TaskService.instance;
        } else {
            TaskService.instance = new TaskService();
            return TaskService.instance;
        }
    }

    private async syncItaasWorkspaceBestEffort(local: Subscription): Promise<void> {
        if (!local) {
            return;
        }
        try {
            await ItaasWorkspaceProvisioningService.getInstance().syncWorkspaceForSubscription(local);
        } catch (ex) {
            Monitor.warning(
                `[TASK] ITAAS workspace sync failed for ${local.id}: ${ex instanceof Error ? ex.message : ex}`,
            );
        }
    }

    public tasks: Task[];

    constructor() {
        this.tasks = [];
    }

    private createTask(id: string, period: number, handler: () => Promise<any>, runOnStartup?: boolean) {
        const task: Task = {
            id: id,
            period: period,
            interval: new AsyncInterval(handler, period),
            runOnStartup: runOnStartup,
        };

        task.interval.on("error", err => {
            Monitor.exception(err);
        });

        this.tasks.push(task);
    }

    private startIntervals() {
        for (const task of this.tasks) {
            task.interval.start(task.runOnStartup);
        }
    }

    public start() {
        if (!Config.getInstance().isTaskRunner) {
            return;
        }

        Monitor.status("Task service starting...");

        this.tasks = [];

        // Create the tasks
        this.createTask("clear-unverified-users", 24 * 60 * 60 * 1000, this.clearUnverifiedUsersTasks.bind(this), true);
        this.createTask("subscriptions-stripe-sync", 60 * 60 * 1000, this.subscriptionsStripeSyncTask.bind(this), true);
        this.createTask("subscriptions-auto-renew", 60 * 60 * 1000, this.subscriptionAutoRenewTask.bind(this), true);
        this.createTask("subscriptions-notices", 60 * 60 * 1000, this.subscriptionNoticesTask.bind(this), true);
        this.createTask("subscriptions-pending-payment-cleanup", 24 * 60 * 60 * 1000, this.subscriptionPendingPaymentCleanupTask.bind(this), true);
        this.createTask("subscriptions-grace-period-expiration", 24 * 60 * 60 * 1000, this.subscriptionGracePeriodExpirationTask.bind(this), true);
        this.createTask("token-traceability-pending-flush", 24 * 60 * 60 * 1000, this.tokenTraceabilityPendingFlushTask.bind(this), false);
        this.createTask("itaas-workspace-pending-flush", 15 * 60 * 1000, this.itaasWorkspacePendingFlushTask.bind(this), true);
        this.createTask("itaas-flow-settings-orphan-cleanup", 24 * 60 * 60 * 1000, this.itaasFlowSettingsOrphanCleanupTask.bind(this), true);

        // Start
        this.startIntervals();
    }

    public async tokenTraceabilityPendingFlushTask() {
        Monitor.info("[TASK] Running task: Flush stale pending token traceability rows.");
        const reconciled = await TokenService.getInstance().flushPendingTraceability();
        Monitor.info(`[TASK] Reconciled ${reconciled} stale pending token traceability rows.`);
    }

    public async itaasWorkspacePendingFlushTask() {
        Monitor.info("[TASK] Running task: Flush pending ITAAS workspace BFF syncs.");
        const processed = await ItaasWorkspaceProvisioningService.getInstance().flushPendingWorkspaceSyncs();
        Monitor.info(`[TASK] Processed ${processed} pending ITAAS workspace BFF sync(s).`);
    }

    public async itaasFlowSettingsOrphanCleanupTask() {
        Monitor.info("[TASK] Running task: Purge orphaned ITAAS flow settings.");
        const deleted = await ItaasWorkspaceProvisioningService.getInstance().purgeOrphanedFlowSettings();
        Monitor.info(`[TASK] Purged ${deleted} orphaned ITAAS flow setting(s).`);
    }

    /**
     * Task: Clear unverified users
     * Removes unverified users with more than a day
     */
    public async clearUnverifiedUsersTasks() {
        Monitor.info(`[TASK] Running task: Clear unverified users.`);

        const usersRemoved = await User.clearUnverifiedUsers();

        Monitor.info(`Cleared ${usersRemoved} unverified users from the database.`);
    }

    public async subscriptionNoticesTask() {
        Monitor.info(`[TASK] Running task: Subscription notices.`);
        const notices = await SubscriptionService.getInstance().updateNoticeQueue();
        Monitor.info(`Subscription notices processed: ${notices}`);
    }

    public async subscriptionAutoRenewTask() {
        Monitor.info(`[TASK] Running task: Subscription auto-renew.`);

        const now = Date.now();
        const subs = await Subscription.findAutoRenewableSubscriptions();
        let renewed = 0;
        let cancelled = 0;
        let scheduledActivated = 0;
        let failed = 0;

        for (const sub of subs) {
            if ((sub.stripeSubscriptionId || "").trim()) {
                continue;
            }

            if (sub.cancelAtPeriodEnd) {
                sub.status = SubscriptionStatus.CANCELLED;
                sub.cancelAtPeriodEnd = false;
                sub.currentPeriodEnd = now;
                sub.nextNoticeAt = 0;
                sub.updatedAt = now;
                await sub.save();
                await TraceabilityService.getInstance().recordSubscriptionCancelledBestEffort(sub.id);
                await this.syncItaasWorkspaceBestEffort(sub);

                if (sub.organizationId) {
                    try {
                        await OrganizationLicensePoolService.getInstance().tearDownPoolsForSubscription(sub);
                    } catch (ex) {
                        Monitor.warning(
                            `[TASK] Error tearing down license pools for org ${sub.organizationId}: ${ex instanceof Error ? ex.message : ex}`,
                        );
                    }
                    try {
                        await OrganizationService.getInstance().finalizeOrganizationDeletionIfReady(sub.organizationId);
                    } catch (ex) {
                        Monitor.warning(
                            `[TASK] Error finalizing org deletion for ${sub.organizationId}: ${ex instanceof Error ? ex.message : ex}`,
                        );
                    }
                }

                cancelled++;

                if (sub.succeedingSubscriptionId) {
                    const pending = await Subscription.findById(sub.succeedingSubscriptionId);
                    if (pending && (pending.status === SubscriptionStatus.PENDING || pending.status === SubscriptionStatus.PENDING_PAYMENT)) {
                        pending.status = SubscriptionStatus.PENDING_PAYMENT;
                        pending.updatedAt = now;
                        await pending.save();
                        Monitor.info(`[TASK] Subscription ${pending.id} marked as PENDING_PAYMENT (successor of ${sub.id})`);
                    }
                } else {
                    const activated = await SubscriptionService.getInstance().activatePendingPlan(sub.uid, sub.subscribableId, now);
                    if (activated) {
                        scheduledActivated++;
                    }
                }
                continue;
            }

            const billingCycle = this.parseBillingCycle(sub.billingCycle);
            if (!sub.subscribableId || !billingCycle) {
                sub.status = SubscriptionStatus.PAST_DUE;
                sub.updatedAt = now;
                await sub.save();
                await this.syncItaasWorkspaceBestEffort(sub);
                failed++;
                continue;
            }

            try {
                const { payment, checkoutUrl } = await PaymentService.getInstance().createSubscriptionRenewBalancePayment(
                    sub.uid,
                    sub.subscribableType,
                    sub.subscribableId,
                    sub.id,
                    billingCycle,
                );
                Monitor.info(`[PAYMENTS] Renewal payment created for subscription ${sub.id}: payment=${payment.id}`);
                renewed++;
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : String(ex);
                Monitor.warning(`[PAYMENTS] Auto-renew failed for subscription ${sub.id}: ${message}`);

                const gracePeriodDays = await PaymentsPlatformConfigService.getInstance().getSubscriptionGracePeriodDays();
                sub.status = SubscriptionStatus.SUSPENDED;
                sub.gracePeriodEnd = PaymentsPlatformConfigService.getInstance().computeGracePeriodEnd(now, gracePeriodDays);
                sub.updatedAt = now;
                await sub.save();
                await this.syncItaasWorkspaceBestEffort(sub);
                await TraceabilityService.getInstance().recordSubscriptionSuspendedBestEffort(sub.id);

                try {
                    const user = await User.findUserByUID(sub.uid);
                    if (user) {
                        await NotificationService.getInstance().sendNotification(user, {
                            type: "payment_failed",
                            transactionId: sub.lastPaymentId || sub.id,
                            info: {
                                reason: "PAYMENT_FAILED",
                                retryUrl: "",
                            },
                        });
                    }
                } catch (notifyEx) {
                    const notifyMsg = notifyEx instanceof Error ? notifyEx.message : String(notifyEx);
                    Monitor.warning(`[PAYMENTS] Failed to notify user ${sub.uid} of payment failure: ${notifyMsg}`);
                }

                failed++;
            }
        }

        Monitor.info(`Subscriptions auto-renew processed. Renewed: ${renewed}, Cancelled: ${cancelled}, Scheduled activated: ${scheduledActivated}, Failed: ${failed}`);
    }

    public async subscriptionPendingPaymentCleanupTask() {
        Monitor.info(`[TASK] Running task: Subscription pending payment cleanup.`);

        const now = Date.now();
        const expirationMs = PaymentsConfig.getInstance().pendingPaymentExpirationDays * 24 * 60 * 60 * 1000;
        const cutoff = now - expirationMs;

        let cleaned = 0;

        const abandonedCheckouts = await Subscription.findAbandonedCheckoutSubscriptions(cutoff);
        for (const sub of abandonedCheckouts) {
            sub.status = SubscriptionStatus.CANCELLED;
            sub.updatedAt = now;
            await sub.save();
            await this.syncItaasWorkspaceBestEffort(sub);
            cleaned++;
            Monitor.info(`[TASK] Expired abandoned checkout subscription ${sub.id} cancelled (status=${sub.status})`);
        }

        Monitor.info(`Subscription pending payment cleanup processed. Expired: ${cleaned}`);
    }

    public async subscriptionGracePeriodExpirationTask() {
        Monitor.info(`[TASK] Running task: Subscription grace period expiration.`);

        const now = Date.now();
        const expired = await Subscription.findExpiredGracePeriodSuspendedSubscriptions();

        let cancelled = 0;
        for (const sub of expired) {
            sub.status = SubscriptionStatus.CANCELLED;
            sub.gracePeriodEnd = 0;
            sub.updatedAt = now;
            await sub.save();
            await this.syncItaasWorkspaceBestEffort(sub);
            await TraceabilityService.getInstance().recordSubscriptionCancelledBestEffort(sub.id);
            cancelled++;
            Monitor.info(`[TASK] Subscription ${sub.id} cancelled after grace period expiration.`);

            try {
                const user = await User.findUserByUID(sub.uid);
                if (user) {
                    await NotificationService.getInstance().sendNotification(user, {
                        type: "payment_failed",
                        transactionId: sub.lastPaymentId || sub.id,
                        info: {
                            reason: "SUBSCRIPTION_CANCELLED",
                            retryUrl: "",
                        },
                    });
                }
            } catch (notifyEx) {
                const notifyMsg = notifyEx instanceof Error ? notifyEx.message : String(notifyEx);
                Monitor.warning(`[TASK] Failed to notify user ${sub.uid} of subscription cancellation: ${notifyMsg}`);
            }
        }

        Monitor.info(`Grace period expiration: ${cancelled} subscription(s) cancelled.`);
    }

    public async subscriptionsStripeSyncTask() {
        Monitor.info(`[TASK] Running task: Subscriptions Stripe sync.`);

        const subs = await Subscription.findSyncableWithStripe();
        let synced = 0;
        let failed = 0;

        for (const sub of subs) {
            try {
                await SubscriptionBillingService.getInstance().refreshLocalSubscription(sub.id);
                synced++;
            } catch (ex) {
                const message = ex instanceof Error ? ex.message : String(ex);
                Monitor.warning(`[TASK] Stripe sync failed for subscription ${sub.id}: ${message}`);
                failed++;
            }
        }

        Monitor.info(`Subscriptions Stripe sync complete. Synced: ${synced}, Failed: ${failed}`);
    }

    private parseBillingCycle(raw: string): SubscriptionBillingCycle | null {
        const normalized = (raw || "").trim().toLowerCase();
        if (normalized === "monthly" || normalized === "annual") {
            return normalized as SubscriptionBillingCycle;
        }
        return null;
    }
}
