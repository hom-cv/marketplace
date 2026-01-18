/**
 * Filter utilities for explore pages
 * Shared helpers for handling post filters with size categories
 */

import type { PostType, SizeCategory } from "@/api/types/post";

/**
 * State for post filters
 */
export interface FiltersState {
  types: PostType[];
  sizes: string[];
  search: string;
}

/**
 * Initial/default filter state
 */
export const INITIAL_FILTERS: FiltersState = {
  types: [],
  sizes: [],
  search: "",
};

/**
 * Items per page for infinite scroll
 */
export const ITEMS_PER_PAGE = 20;

/**
 * Create a prefixed size key for storing size selections
 * This allows tracking which category a size belongs to (e.g., "shoes:40")
 */
export function createSizeKey(category: SizeCategory, size: string): string {
  return `${category}:${size}`;
}

/**
 * Parse a prefixed size key back into category and size
 */
export function parseSizeKey(key: string): { category: SizeCategory; size: string } {
  const [category, size] = key.split(":");
  return { category: category as SizeCategory, size };
}
