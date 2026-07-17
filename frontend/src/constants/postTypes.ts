/**
 * Shared constants for post category badges (colors + label helpers).
 * Used across PostCard, PostFeedItem, PostView pages, and Explore pages.
 */

import type { PostCategory } from "@/api/types/post";

/**
 * Color mapping for post category badges.
 */
export const POST_CATEGORY_COLORS: Record<PostCategory, string> = {
  TOPS: "blue",
  BOTTOMS: "teal",
  OUTERWEAR: "grape",
  FOOTWEAR: "orange",
  ACCESSORIES: "pink",
  TAILORING: "indigo",
  DRESSES: "violet",
  JEWELRY: "yellow",
  BAGS: "gray",
};

/**
 * i18n keys for category labels (namespace "listings").
 */
export const POST_CATEGORY_LABEL_KEYS: Record<PostCategory, string> = {
  TOPS: "categories.tops",
  BOTTOMS: "categories.bottoms",
  OUTERWEAR: "categories.outerwear",
  FOOTWEAR: "categories.footwear",
  ACCESSORIES: "categories.accessories",
  TAILORING: "categories.tailoring",
  DRESSES: "categories.dresses",
  JEWELRY: "categories.jewelry",
  BAGS: "categories.bags",
};

/**
 * Get translated category labels.
 * @param t - Translation function from useTranslation("listings")
 */
export function getCategoryLabels(
  t: (key: string) => string,
): Record<PostCategory, string> {
  return Object.fromEntries(
    Object.entries(POST_CATEGORY_LABEL_KEYS).map(([cat, key]) => [cat, t(key)]),
  ) as Record<PostCategory, string>;
}
