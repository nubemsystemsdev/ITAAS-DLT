// Big integer quantities utilities

"use strict";

import { Monitor } from "../monitor";
import { Decimal } from 'decimal.js';

/**
 * Formats a quantity
 * @param amount The amount as big integer
 * @param decimals The number of decimal places
 * @returns The formatted quantity
 */
export function formatQuantity(amount: bigint, decimals: number): string {
    const amountString = amount.toString(10);
    if (decimals <= 0) {
        return amountString;
    }
    if (amountString === "0") {
        const integerPart = "0";
        let decimalPart = "";
        for (let i = 0; i < decimals; i++) {
            decimalPart += "0";
        }
        return integerPart + "." + decimalPart;
    }
    if (amountString.length > decimals) {
        const integerPart = amountString.substring(0, amountString.length - decimals);
        const decimalPart = amountString.substring(amountString.length - decimals);
        return integerPart + "." + decimalPart;
    } else if (amountString.length < decimals) {
        const integerPart = "0";
        let decimalPart = amountString;
        while (decimalPart.length < decimals) {
            decimalPart = "0" + decimalPart;
        }
        return integerPart + "." + decimalPart;
    } else {
        return "0." + amountString;
    }
}

/**
 * Parses a decimal quantity into a big integer
 * @param str The formatted decimal quantity
 * @param decimals The number of decimal places
 * @returns The big integer
 */
export function parseDecimalQuantity(str: string, decimals: number): bigint {
    try {
        const d = new Decimal(str.split(" ")[0]);
        return BigInt(d.mul((new Decimal(10)).pow(new Decimal(decimals))).floor().toHex());
    } catch (ex) {
        Monitor.debugException(ex);
        return BigInt(0);
    }
}

/**
 * Parses a quantity from a hex string
 * @param str The hex string
 * @returns The big integer
 */
export function parseQuantityHex(str: string): bigint {
    try {
        return BigInt(str);
    } catch (ex) {
        Monitor.debugException(ex);
        return BigInt(0);
    }
}

/**
 * Formats a quantity in a specific currency
 * @param amount The big integer
 * @param destinationCurrency The destination currency symbol
 * @param decimals The number of decimal places for the big integer
 * @param rate The conversion rate from the original big integer into the destination currency
 * @returns The formatted quantity
 */
export function formatQuantityCurrency(amount: bigint, destinationCurrency: string, decimals: number): string {
    const amountDecimals = new Decimal(amount.toString(10));
    const amountXRate = BigInt(amountDecimals.floor().toHex());

    return formatQuantity(amountXRate, decimals) + " " + destinationCurrency;
}
