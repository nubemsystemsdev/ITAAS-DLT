// Text utils

"use strict";

/**
 * Removes acents and diacritics.
 * @param str   The input string
 * @returns     The normalized string
 */
export function normalizeString(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Escapes html reserved characters.
 * @param html      Input HTML text.
 * @returns         The escaped text.
 */
export function escapeHTML(html: string): string {
    return ("" + html)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
        .replace(/\//g, "&#x2f;");
}

/**
 * Turns HTML into text (removes all tags)
 * @param html HTML
 * @returns Text
 */
export function htmlToText(html: string): string {
    return (html + "").replace(/<[^>]*>/g, "").trim();
}

/**
 * Escapes single quotes and reverse bars
 * @param raw The raw input text
 * @returns The escaped text.
 */
export function escapeSingleQuotes(raw: string): string {
    return ("" + raw).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Escapes double quotes and reverse bars.
 * @param raw The raw input text
 * @returns The escaped text.
 */
export function escapeDoubleQuotes(raw: string): string {
    return ("" + raw).replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}

const TRUNCATE_MIDDLE_ELLIPSIS = "...";

/**
 * Shortens a string by replacing the middle with "..." when it exceeds {@link maxLength}.
 * If there is not enough room for one character on each side of the ellipsis, falls back
 * to suffix truncation (prefix + "...").
 * @param str        The input string
 * @param maxLength  Maximum length of the result (must be >= 1)
 * @returns          The truncated string
 */
/**
 * Converts snake_case, kebab-case or space-separated text to Title Case.
 */
export function toTitleCase(value: string): string {
    return (value || "")
        .split(/[_\s-]+/)
        .filter((part) => !!part)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

export function truncateMiddle(str: string, maxLength: number): string {
    if (maxLength < 1) {
        return "";
    }
    if (str.length <= maxLength) {
        return str;
    }
    const el = TRUNCATE_MIDDLE_ELLIPSIS;
    if (maxLength <= el.length) {
        return str.slice(0, maxLength);
    }
    const inner = maxLength - el.length;
    if (inner < 2) {
        return str.slice(0, maxLength - el.length) + el;
    }
    const leftLen = Math.ceil(inner / 2);
    const rightLen = Math.floor(inner / 2);
    return str.slice(0, leftLen) + el + str.slice(str.length - rightLen);
}

export function truncateText(str: string, maxLength: number): string {
    const normalized = (str || "").trim();
    if (!normalized || maxLength < 1) {
        return normalized;
    }
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
}
