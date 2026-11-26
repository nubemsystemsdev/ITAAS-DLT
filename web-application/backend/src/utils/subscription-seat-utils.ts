// Reserved for license

"use strict";

import Stripe from "stripe";

function parsePositiveInt(value: string | undefined | null): number | null {
    if (!value) {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return null;
    }
    return parsed;
}

/**
 * Resolves the seat target for a paid subscription_update invoice.
 * Prefers invoice metadata and line quantities over the local pending snapshot.
 * @param invoice - Stripe invoice (lines expanded when possible)
 * @param fallbackPending - Local pending_quantity at request time
 * @param currentQuantity - Active paid seat count before applying the increase
 * @returns Target seat count, or null when no valid target can be determined
 */
export function resolveSeatIncreaseTargetFromInvoice(
    invoice: Stripe.Invoice,
    fallbackPending: number,
    currentQuantity: number,
): number | null {
    const fromMeta = parsePositiveInt(invoice.metadata?.pending_quantity);
    if (fromMeta !== null && fromMeta >= currentQuantity) {
        return fromMeta;
    }

    let maxLineQty = 0;
    for (const line of invoice.lines?.data || []) {
        const qty = typeof line.quantity === "number" ? line.quantity : 0;
        if (qty > maxLineQty) {
            maxLineQty = qty;
        }
    }
    if (maxLineQty >= currentQuantity) {
        return maxLineQty;
    }

    const fallback = Math.max(1, fallbackPending || 0);
    if (fallback >= currentQuantity) {
        return fallback;
    }

    return null;
}
