/**
 * Filter utilities for explore pages
 * Shared helpers for handling post filters with size categories
 */

import type {
  PostType,
  SizeCategory,
  SizeCategoryConfig,
} from "@/api/types/post";

/**
 * State for post filters
 */
export interface FiltersState {
  types: PostType[];
  sizes: string[];
}

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
export function parseSizeKey(key: string): {
  category: SizeCategory;
  size: string;
} {
  const [category, size] = key.split(":");
  return { category: category as SizeCategory, size };
}

/**
 * Toggle a post type in the filter state.
 * When types change, removes sizes that no longer belong to any selected type.
 */
export function toggleTypeFilter(
  currentFilters: FiltersState,
  typeToToggle: PostType,
  sizeCategoryConfig: readonly SizeCategoryConfig[],
): FiltersState {
  const updatedTypes = currentFilters.types.includes(typeToToggle)
    ? currentFilters.types.filter((t) => t !== typeToToggle)
    : [...currentFilters.types, typeToToggle];

  const updatedSizes =
    updatedTypes.length === 0
      ? []
      : currentFilters.sizes.filter((sizeKey) => {
          const { category } = parseSizeKey(sizeKey);
          const categoryConfig = sizeCategoryConfig.find(
            (config) => config.category === category,
          );
          return categoryConfig?.postTypes.some((postType) =>
            updatedTypes.includes(postType),
          );
        });

  return { ...currentFilters, types: updatedTypes, sizes: updatedSizes };
}

/**
 * Toggle a size filter in the filter state.
 */
export function toggleSizeFilter(
  currentFilters: FiltersState,
  category: SizeCategory,
  size: string,
): FiltersState {
  const sizeKey = createSizeKey(category, size);
  const updatedSizes = currentFilters.sizes.includes(sizeKey)
    ? currentFilters.sizes.filter((key) => key !== sizeKey)
    : [...currentFilters.sizes, sizeKey];

  return { ...currentFilters, sizes: updatedSizes };
}
