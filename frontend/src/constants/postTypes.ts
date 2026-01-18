/**
 * Shared constants for post type colors and label helpers
 * Used across PostCard, PostFeedItem, PostView pages, and Explore pages
 */

import type { PostType } from "@/api/types/post";

/**
 * Color mapping for post type badges
 */
export const POST_TYPE_COLORS: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

/**
 * Translation keys for post type labels
 */
export const POST_TYPE_LABEL_KEYS: Record<PostType, string> = {
  SHIRT: "categories.shirt",
  PANTS: "categories.pants",
  JACKET: "categories.jacket",
  SHOES: "categories.shoes",
  ACCESSORIES: "categories.accessories",
  OTHER: "categories.other",
};

/**
 * Hook to get translated post type labels
 * @param t - Translation function from useTranslation("listings")
 */
export function getPostTypeLabels(t: (key: string) => string): Record<PostType, string> {
  return {
    SHIRT: t("categories.shirt"),
    PANTS: t("categories.pants"),
    JACKET: t("categories.jacket"),
    SHOES: t("categories.shoes"),
    ACCESSORIES: t("categories.accessories"),
    OTHER: t("categories.other"),
  };
}
