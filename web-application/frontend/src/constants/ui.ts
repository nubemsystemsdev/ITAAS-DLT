"use strict";

/**
 * UI interaction tuning constants.
 *
 * Centralizes timing values used purely for interaction polish (loading
 * delays, transitions). These are NOT business rules — adjusting them
 * tweaks perceived UX but does not alter functional behavior.
 *
 * For business-rule constants (renewal windows, billing thresholds, etc.)
 * use `src/constants/business.ts` instead.
 */

/** Time before a snackbar can be dismissed automatically, even when hovered or focused. */
export const SNACKBAR_AUTO_DISMISS_MS = 10000;

/**
 * Delay before the loading fallback is shown when lazy-loading a route
 * component via `defineAsyncComponent`.
 *
 * Vue swallows the fallback if the chunk resolves within this window,
 * preventing a flash of the loader on fast networks.
 */
export const ASYNC_COMPONENT_LOADER_DELAY_MS = 1000;

/**
 * Default page size for paginated list views (dashboard tables, catalog lists, etc.).
 */
export const LIST_PAGE_SIZE = 8;

/**
 * Page size for credential requirement cards on the flow detail page.
 */
export const FLOW_CREDENTIALS_PAGE_SIZE = 4;
