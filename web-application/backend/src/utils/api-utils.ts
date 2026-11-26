// Reserved for license

"use strict";

import Express from "express";

/**
 * Clamps page-based pagination from numeric inputs.
 * @param page Requested page (1-based)
 * @param pageSize Requested page size
 * @param total Total number of items
 * @param pageLimit Maximum and default page size
 * @returns Parsed and clamped pagination values
 */
export function resolvePageParameters(
    page: number | undefined,
    pageSize: number | undefined,
    total: number,
    pageLimit: number,
): { page: number; pageSize: number; totalPages: number; skip: number } {
    const limit = Math.max(1, pageLimit);
    let resolvedPageSize = Number(pageSize) || limit;
    if (resolvedPageSize < 1) {
        resolvedPageSize = 1;
    }
    if (resolvedPageSize > limit) {
        resolvedPageSize = limit;
    }

    let totalPages = Math.floor(total / resolvedPageSize);
    if ((total % resolvedPageSize) > 0) {
        totalPages++;
    }
    if (totalPages <= 0) {
        totalPages = 1;
    }

    let resolvedPage = Number(page) || 1;
    if (resolvedPage < 1) {
        resolvedPage = 1;
    }
    if (resolvedPage > totalPages) {
        resolvedPage = totalPages;
    }

    const skip = (resolvedPage - 1) * resolvedPageSize;
    return { page: resolvedPage, pageSize: resolvedPageSize, totalPages, skip };
}

/**
 * Parses page-based pagination parameters from request query.
 * @param request Express request
 * @param total Total number of items
 * @param pageLimit Maximum and default page size
 * @returns Parsed and clamped pagination values
 */
export function parsePageParameters(
    request: Express.Request,
    total: number,
    pageLimit: number,
): { page: number; pageSize: number; totalPages: number; skip: number } {
    const pageSize = Number.parseInt((request.query.pageSize as string) || "", 10);
    const page = Number.parseInt((request.query.page as string) || "1", 10);
    return resolvePageParameters(
        Number.isFinite(page) ? page : 1,
        Number.isFinite(pageSize) ? pageSize : undefined,
        total,
        pageLimit,
    );
}

/**
 * Checks if a string belongs to enum values.
 * @param enumObject Enum object
 * @param value Value to validate
 * @returns True if value belongs to enum values
 */
export function isEnumValue<T extends string>(enumObject: Record<string, T>, value: string): value is T {
    return Object.values(enumObject).includes(value as T);
}

/**
 * Safely parse JSON strings.
 * If parsing fails, returns the original value.
 * @param raw Candidate JSON string or any value
 * @returns Parsed value, or original input when invalid JSON
 */
export function parseJsonSafe(raw: unknown): unknown {
    if (typeof raw !== "string") {
        return raw;
    }
    try {
        return JSON.parse(raw);
    } catch (_ex) {
        return raw;
    }
}
