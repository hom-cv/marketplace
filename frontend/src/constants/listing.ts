/**
 * Listing/shipping bounds in whole THB. Mirrored from
 * backend/app/constants/post.py — keep these in sync.
 */

export const MIN_LISTING_PRICE = 50;
export const MAX_LISTING_PRICE = 1_000_000;

export const MIN_SHIPPING_COST = 0;
export const MAX_SHIPPING_COST = 10_000;

export const MAX_BRAND_NAME_LENGTH = 128;
export const MAX_TAGS_PER_POST = 10;
export const MAX_TAG_LENGTH = 50;

/** Catch-all brand slug (mirror of backend CATCHALL_BRAND_SLUG). Hidden in
 * display since it's a fallback, not a brand to advertise. */
export const CATCHALL_BRAND_SLUG = "other";
