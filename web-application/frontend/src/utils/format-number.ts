"use strict";

const NUMBER_LOCALE = "en-EN";

/**
 * Formats an integer with locale-aware grouping and no decimal places.
 */
export function formatInteger(value: number): string {
    return new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 0 }).format(value);
}
