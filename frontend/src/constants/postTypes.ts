/**
 * Shared constants for post category badges (colors + label helpers).
 * Used across PostCard, PostFeedItem, PostView pages, and Explore pages.
 */

import type { CategoryTaxonomy, PostCategory } from "@/api/types/post";

/** i18n `t` that accepts a defaultValue fallback (react-i18next signature). */
type TFunc = (key: string, opts?: { defaultValue?: string }) => string;

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

/**
 * Translate a taxonomy category label (namespace "listings"), falling back to
 * the backend-provided English label, then the raw code.
 */
export function categoryLabel(
  t: TFunc,
  taxonomy: CategoryTaxonomy | undefined,
  category: string,
): string {
  return t(`categories.${category.toLowerCase()}`, {
    defaultValue: taxonomy?.categoryLabels?.[category] ?? category,
  });
}

/**
 * Translate a taxonomy subcategory label (namespace "listings"). English keeps
 * coming from the backend payload via defaultValue, so only `th` needs keys.
 */
export function subcategoryLabel(
  t: TFunc,
  taxonomy: CategoryTaxonomy | undefined,
  subcategory: string,
): string {
  return t(`subcategories.${subcategory.toLowerCase()}`, {
    defaultValue: taxonomy?.subcategoryLabels?.[subcategory] ?? subcategory,
  });
}
