// Reserved for license

"use strict";

import Express from "express";
import { Controller } from "../controller";
import { sendApiError, sendApiResult, sendUnauthorized, BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR, NOT_FOUND, noCache } from "../../utils/http-utils";
import { parsePageParameters } from "../../utils/api-utils";
import { UsersService, ADMIN_ROLE } from "../../services/users-service";
import { Payment } from "../../models/payment";
import { SubscribableType } from "../../models/subscription";
import { PaymentService } from "../../services/payment-service";
import { Monitor } from "../../monitor";

const PAYMENTS_PAGE_LIMIT = 25;

/**
 * Payments API
 * @group payments
 */
export class PaymentsController extends Controller {
    public registerAPI(prefix: string, application: Express.Express): any {
        application.get(prefix + "/payments", noCache(this.listPayments.bind(this)));
        application.get(prefix + "/payments/:id", noCache(this.getPayment.bind(this)));
        application.get(prefix + "/payments/:id/invoice", noCache(this.downloadInvoice.bind(this)));
        application.get(prefix + "/payments/admin/user/:uid", noCache(this.listAdminUserPayments.bind(this)));
    }

    /**
     * @typedef PaymentListItem
     * @property {string} id.required - Payment id
     * @property {string} uid.required - Owner user id
     * @property {string} username - Owner username
     * @property {string} type.required - Payment type
     * @property {string} provider.required - Payment provider
     * @property {number} amountCents.required - Amount in cents
     * @property {string} currency.required - Currency
     * @property {string} status.required - Payment status
     * @property {string} subscribableType - Subscribable type
     * @property {string} subscribableId - Subscribable id
     * @property {string} billingCycle - Billing cycle
     * @property {string} subscriptionId - Subscription id
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     */

    /**
     * @typedef PaymentListResponse
     * @property {Array.<PaymentListItem>} payments.required - Payments list
     * @property {number} page.required - Page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * @typedef MyPaymentHistoryItem
     * @property {string} id.required - Payment id
     * @property {string} concept.required - Payment concept
     * @property {number} amountCents.required - Amount in cents
     * @property {string} currency.required - Currency
     * @property {string} method.required - Payment method label
     * @property {string} status.required - Payment status
     * @property {string} paymentType.required - Payment type
     * @property {string} productType.required - Product type
     * @property {string} billingCycle.required - Billing cycle
     * @property {number} createdAt.required - Creation timestamp (Unix ms)
     * @property {string} catalogItemType - Catalog item type for item-type payments
     */

    /**
     * @typedef MyPaymentHistoryResponse
     * @property {Array.<MyPaymentHistoryItem>} payments.required - Paginated payment history
     * @property {number} page.required - Current page number
     * @property {number} totalPages.required - Total pages
     * @property {number} total.required - Total results
     */

    /**
     * List payments for authenticated user (or all payments for admins)
     * Binding: ListPayments
     * @route GET /payments
     * @group payments
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @param {string} dateFrom.query - Filter by date from (Unix ms timestamp)
     * @param {string} dateTo.query - Filter by date to (Unix ms timestamp)
     * @param {string} paymentType.query - Filter by payment type
     * @param {string} productType.query - Filter by product type (item or plan)
     * @param {string} status.query - Filter by payment status (`paid` matches completed and confirmed)
     * @returns {PaymentListResponse.model} 200 - Payments list
     * @returns {void} 401 - Unauthorized
     * @security AuthToken
     */
    public async listPayments(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const isAdmin = auth.user.role === ADMIN_ROLE && auth.hasPermission("admin.users.manage");

        const filtersInput = {
            dateFrom: Number.parseInt((request.query.dateFrom as string) || "", 10) || undefined,
            dateTo: Number.parseInt((request.query.dateTo as string) || "", 10) || undefined,
            paymentType: ((request.query.paymentType as string) || "").trim(),
            productType: ((request.query.productType as string) || "").trim(),
            status: ((request.query.status as string) || "").trim(),
        };

        const filters = PaymentService.getInstance().normalizeHistoryFilters(filtersInput);

        let total: number;
        let payments: Payment[];

        if (isAdmin) {
            total = await Payment.countAllWithFilters(filters);
            const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, PAYMENTS_PAGE_LIMIT);
            payments = await Payment.findAllWithFilters(skip, pageSize, filters);

            const paymentObjects = await PaymentService.getInstance().toAdminListItems(payments);
            sendApiResult(request, response, { payments: paymentObjects, page, totalPages, total });
        } else {
            total = await Payment.countByUserWithFilters(auth.user.id, filters);
            const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, PAYMENTS_PAGE_LIMIT);
            payments = await Payment.findByUserWithFilters(auth.user.id, skip, pageSize, filters);

            const paymentViews = await Promise.all(
                payments.map((p) => PaymentService.getInstance().toHistoryItemView(p)),
            );
            sendApiResult(request, response, { payments: paymentViews, page, totalPages, total });
        }
    }

    /**
     * Lists payments for a specific user (admin view).
     * Requires permission: admin.users.manage
     * Binding: ListAdminUserPayments
     * @route GET /payments/admin/user/{uid}
     * @group payments
     * @param {string} uid.path.required - Target user id
     * @param {string} page.query - Page number
     * @param {string} pageSize.query - Page size
     * @returns {PaymentListResponse.model} 200 - Payments list
     * @returns {void} 400 - Bad request: INVALID_REQUEST
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @security AuthToken
     */
    public async listAdminUserPayments(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        if (auth.user.role !== ADMIN_ROLE || !auth.hasPermission("admin.users.manage")) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Access denied");
            return;
        }

        const uid = ((request.params.uid || "") + "").trim();
        if (!uid) {
            sendApiError(request, response, BAD_REQUEST, "INVALID_REQUEST", "uid is required");
            return;
        }

        const total = await Payment.countByUser(uid);
        const { page, pageSize, totalPages, skip } = parsePageParameters(request, total, PAYMENTS_PAGE_LIMIT);
        const payments = await Payment.findByUser(uid, skip, pageSize);

        const paymentObjects = await PaymentService.getInstance().toAdminListItems(payments);

        sendApiResult(request, response, {
            payments: paymentObjects,
            page,
            totalPages,
            total,
        });
    }

    /**
     * @typedef PaymentCheckoutResponse
     * @property {string} payment_id.required - Payment id
     * @property {string} status.required - Payment status
     */

    /**
     * Get payment by id
     * Binding: GetPayment
     * @route GET /payments/{id}
     * @group payments
     * @param {string} id.path.required - Payment id
     * @returns {PaymentCheckoutResponse.model} 200 - Success
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: PAYMENT_NOT_FOUND
     * @security AuthToken
     */
    public async getPayment(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const id = (request.params.id || "") + "";
        const payment = await Payment.findById(id);
        if (!payment) {
            sendApiError(request, response, NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found");
            return;
        }

        const canAccess = await PaymentService.getInstance().canUserAccessPayment(auth.user.id, payment, {
            isPlatformAdmin: auth.user.role === ADMIN_ROLE,
            allowPlatformAdmin: auth.hasPermission("admin.users.manage"),
        });
        if (!canAccess) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Cannot access this payment");
            return;
        }

        sendApiResult(request, response, {
            payment_id: payment.id,
            status: payment.status
        });
    }

    /**
     * Downloads invoice PDF for a payment.
     * Binding: DownloadPaymentInvoice
     * @route GET /payments/{id}/invoice
     * @group payments
     * @param {string} id.path.required - Payment ID
     * @returns {void} 200 - PDF file
     * @returns {void} 401 - Unauthorized
     * @returns {void} 403 - Access denied
     * @returns {void} 404 - Not found: PAYMENT_NOT_FOUND
     * @returns {void} 500 - Internal server error
     * @security AuthToken
     */
    public async downloadInvoice(request: Express.Request, response: Express.Response) {
        const auth = await UsersService.getInstance().auth(request);
        if (!auth.isRegisteredUser()) {
            sendUnauthorized(request, response);
            return;
        }

        const id = (request.params.id || "") + "";
        const payment = await Payment.findById(id);
        if (!payment) {
            sendApiError(request, response, NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found");
            return;
        }

        const canAccess = await PaymentService.getInstance().canUserAccessPayment(auth.user.id, payment, {
            isPlatformAdmin: auth.user.role === ADMIN_ROLE,
            allowPlatformAdmin: true,
        });
        if (!canAccess) {
            sendApiError(request, response, FORBIDDEN, "ACCESS_DENIED", "Cannot access this payment");
            return;
        }

        try {
            const pdf = await PaymentService.getInstance().generateInvoicePdf(payment);
            response.setHeader("Content-Type", "application/pdf");
            response.setHeader("Content-Disposition", `attachment; filename="invoice-${payment.id}.pdf"`);
            response.status(200);
            response.send(pdf);
        } catch (ex) {
            Monitor.error(
                `[API] Invoice generation failed for payment ${payment.id}: ${
                    ex instanceof Error ? ex.message : String(ex)
                }`,
            );
            sendApiError(request, response, INTERNAL_SERVER_ERROR, "INVOICE_GENERATION_FAILED", "Invoice generation failed");
        }
    }

}
