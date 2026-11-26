"use strict";

import Express from "express";
import { DashboardService } from "../../services/dashboard-service";
import { UsersService } from "../../services/users-service";
import { FORBIDDEN, noCache, sendApiError, sendApiResult, sendUnauthorized } from "../../utils/http-utils";
import { Controller } from "../controller";

/**
 * Dashboard admin API
 * @group dashboard_admin
 */
export class DashboardAdminController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/admin/dashboard/summary", noCache(this.getSummary.bind(this)));
    }

    /**
     * @typedef DashboardSummaryMrr
     * @property {number} currentCents.required
     * @property {number} previousCents - Previous month MRR (nullable; not available without historical snapshots)
     * @property {number} variationPct - Month-over-month MRR change (nullable; not available without historical snapshots)
     */

    /**
     * @typedef DashboardSummaryArr
     * @property {number} currentCents.required
     */

    /**
     * @typedef DashboardSummaryActiveSubscriptions
     * @property {number} total.required
     * @property {number} plan.required
     * @property {number} service.required
     * @property {number} product.required
     */

    /**
     * @typedef DashboardSummaryTotalUsers
     * @property {number} total.required
     * @property {number} newLast30Days.required
     */

    /**
     * @typedef DashboardSummaryActiveOrganizations
     * @property {number} total.required
     * @property {number} totalMembers.required
     */

    /**
     * @typedef DashboardSummaryCurrentMonthRevenue
     * @property {number} cents.required
     * @property {number} previousMonthCents.required
     * @property {number} variationPct.required
     */

    /**
     * @typedef DashboardRevenueMonthlyPoint
     * @property {string} month.required - Month label (YYYY-MM)
     * @property {number} revenueCents.required
     * @property {number} transactionCount.required
     */

    /**
     * @typedef DashboardSubscriptionTrendPoint
     * @property {string} month.required - Month label (YYYY-MM)
     * @property {number} created.required
     * @property {number} cancelled.required
     */

    /**
     * @typedef DashboardSummaryTokenCirculation
     * @property {number} availableTokens.required
     * @property {number} lockedTokens.required
     * @property {number} equivalentEurCents.required
     */

    /**
     * @typedef DashboardTopSubscribedCatalogItem
     * @property {string} catalogItemId.required
     * @property {string} name.required
     * @property {string} type.required
     * @property {string} status.required
     * @property {number} subscriptionCount.required
     */

    /**
     * @typedef DashboardTopSubscribedCatalogItems
     * @property {Array.<DashboardTopSubscribedCatalogItem>} items.required
     * @property {number} total.required - Catalog items with at least one active subscription
     */

    /**
     * @typedef DashboardSummaryPaymentHealth
     * @property {number} failedPaymentsCount.required
     * @property {number} suspendedSubscriptions.required
     */

    /**
     * @typedef DashboardBlockchainDailyPoint
     * @property {string} day.required - Day label (YYYY-MM-DD)
     * @property {number} eventCount.required - Blockchain traceability events recorded that day
     */

    /**
     * @typedef DashboardRecentActivityItem
     * @property {string} type.required
     * @property {string} title.required
     * @property {number} timestamp.required
     * @property {string} severity.required
     * @property {string} referenceId.required
     */

    /**
     * @typedef AdminDashboardSummary
     * @property {DashboardSummaryMrr.model} mrr.required - Monthly recurring revenue
     * @property {DashboardSummaryArr.model} arr.required - Annual recurring revenue
     * @property {DashboardSummaryActiveSubscriptions.model} activeSubscriptions.required - Active subscriptions by category
     * @property {DashboardSummaryTotalUsers.model} totalUsers.required - Total registered users
     * @property {DashboardSummaryActiveOrganizations.model} activeOrganizations.required - Active organizations
     * @property {DashboardSummaryCurrentMonthRevenue.model} currentMonthRevenue.required - Current month revenue
     * @property {Array.<DashboardRevenueMonthlyPoint>} revenueMonthly.required - Revenue per month (12 months)
     * @property {object} subscriptionStatusDistribution.required - Subscription counts by status
     * @property {Array.<DashboardSubscriptionTrendPoint>} subscriptionTrend.required - Subscription creation/cancellation trend
     * @property {DashboardSummaryTokenCirculation.model} tokenCirculation.required - Token circulation metrics
     * @property {DashboardTopSubscribedCatalogItems.model} topSubscribedCatalogItems.required - Catalog items ranked by active subscriptions
     * @property {DashboardSummaryPaymentHealth.model} paymentHealth.required - Payment health metrics
     * @property {number} traceabilityFailedCount.required - Failed blockchain traceability events
     * @property {Array.<DashboardBlockchainDailyPoint>} blockchainEventsDaily.required - Blockchain events per day (last 30 days)
     * @property {number} pendingOrgRequests.required - Pending organization requests
     * @property {number} pendingVCRequests.required - Pending verifiable credential requests
     * @property {Array.<DashboardRecentActivityItem>} recentActivity.required - Recent platform activity
     */

    /**
     * Gets admin dashboard summary
     * Requires permission: admin.users.manage
     * Binding: GetDashboardSummary
     * @route GET /admin/dashboard/summary
     * @group dashboard_admin
     * @returns {AdminDashboardSummary.model} 200 - Dashboard summary data
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async getSummary(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }
        if (!auth.hasPermission("admin.users.manage")) {
            sendApiError(
                request,
                response,
                FORBIDDEN,
                "",
                "The user lacks the required permission: admin.users.manage",
            );
            return;
        }

        const summary = await DashboardService.getInstance().getAdminDashboardSummary();
        sendApiResult(request, response, summary);
    }
}
