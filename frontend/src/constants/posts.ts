/**
 * Post-related constants for consistent styling across the application
 */

import type { PostType } from "@/api/types/post";

/**
 * Badge colors for each post type category
 */
export const POST_TYPE_COLORS: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};
