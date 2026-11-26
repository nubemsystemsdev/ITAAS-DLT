"use strict";

const DEFAULT_CURRENCY = "EUR";
const MONEY_LOCALE = "en-EN";

function normalizeCurrencyCode(currency: string | undefined | null): string {
    const code = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
    return code.length === 3 ? code : DEFAULT_CURRENCY;
}

export type FormatMoneyFromCentsOptions = {
    maximumFractionDigits?: number;
};

/**
 * Formats an amount in minor units (cents) with the given ISO 4217 currency code.
 */
export function formatMoneyFromCents(cents: number, currency?: string, options?: FormatMoneyFromCentsOptions): string {
    const amount = (cents || 0) / 100;
    const currencyCode = normalizeCurrencyCode(currency);
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

    try {
        return new Intl.NumberFormat(MONEY_LOCALE, {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits,
        }).format(amount);
    } catch {
        return new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits }).format(amount);
    }
}

/**
 * Formats a number as EUR using the given app locale string (e.g. "es", "en").
 * Spanish uses comma as decimal separator; English uses period.
 * Safe fallback when Intl is unavailable.
 */
export function formatEur(amount: number, locale: string): string {
    const intlLocale = String(locale || "")
        .trim()
        .toLowerCase()
        .startsWith("es")
        ? "es-ES"
        : "en-US";
    try {
        return new Intl.NumberFormat(intlLocale, {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        if (intlLocale === "es-ES") {
            return amount.toFixed(2).replace(".", ",") + " €";
        }
        return "€" + amount.toFixed(2);
    }
}

export interface FormatPriceOptions {
    locale: string;
    currency?: string;
    minimumFractionDigits?: number;
    nullFallback?: string;
    nullishCoerceToZero?: boolean;
}

/**
 * Generic EUR currency formatter parameterized by locale and null-handling strategy.
 *
 * Callers must pass `locale` explicitly so this helper never imposes an i18n choice;
 * each component preserves its existing behavior verbatim.
 *
 * - `nullFallback` (default `"-"`) is returned when `amount` is null/undefined,
 *   unless `nullishCoerceToZero` is true — in which case nullish values render as `0`.
 */
export function formatPrice(amount: number | null | undefined, options: FormatPriceOptions): string {
    const { locale, currency = "EUR", minimumFractionDigits, nullFallback = "-", nullishCoerceToZero = false } = options;

    if (amount === null || amount === undefined) {
        if (!nullishCoerceToZero) {
            return nullFallback;
        }
        amount = 0;
    }

    const formatterOptions: Intl.NumberFormatOptions = { style: "currency", currency };
    if (minimumFractionDigits !== undefined) {
        formatterOptions.minimumFractionDigits = minimumFractionDigits;
    }

    return new Intl.NumberFormat(locale, formatterOptions).format(amount);
}
