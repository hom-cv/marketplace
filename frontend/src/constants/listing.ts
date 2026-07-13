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

/** UI-only sentinel for the "Other" brand pick. Submitting it (or clearing the
 * field) sends no brand — the backend stores NULL, which means "Other". */
export const BRAND_OTHER_VALUE = "other";
