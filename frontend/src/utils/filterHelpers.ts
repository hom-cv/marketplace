/**
 * Filter utilities for explore pages.
 * Shared helpers for handling post filters (categories, subcategories, sizes).
 */

import type { PostCategory, SizeGroup } from "@/api/types/post";
import { toggleInArray } from "@/utils/array";

/**
 * State for post filters.
 */
export interface FiltersState {
  categories: PostCategory[];
  subcategories: string[];
  sizes: string[];
  brands: string[];
  tags: string[];
}

/**
 * Items per page for infinite scroll
 */
export const ITEMS_PER_PAGE = 20;

// A size key carries its group so it survives round-trips (URL, API): "SHOE-39".
// The "-" separator is URL-safe (unencoded) and absent from every group/size value.
export function createSizeKey(group: SizeGroup, size: string): string {
  return `${group}-${size}`;
}

export function parseSizeKey(key: string): { group: SizeGroup; size: string } {
  const i = key.indexOf("-");
  return { group: key.slice(0, i) as SizeGroup, size: key.slice(i + 1) };
}

/**
 * Toggle a top-level category. Independent of subcategories — selecting a
 * category means "all of it", selecting subcategories narrows within.
 */
export function toggleCategoryFilter(
  currentFilters: FiltersState,
  categoryToToggle: PostCategory,
): FiltersState {
  return {
    ...currentFilters,
    categories: toggleInArray(currentFilters.categories, categoryToToggle),
  };
}

export function toggleSubcategoryFilter(
  currentFilters: FiltersState,
  subcategory: string,
): FiltersState {
  return {
    ...currentFilters,
    subcategories: toggleInArray(currentFilters.subcategories, subcategory),
  };
}

export function toggleSizeFilter(
  currentFilters: FiltersState,
  group: SizeGroup,
  size: string,
): FiltersState {
  const sizeKey = createSizeKey(group, size);
  return {
    ...currentFilters,
    sizes: toggleInArray(currentFilters.sizes, sizeKey),
  };
}

export function toggleBrandFilter(
  currentFilters: FiltersState,
  slug: string,
): FiltersState {
  return {
    ...currentFilters,
    brands: toggleInArray(currentFilters.brands, slug),
  };
}

export function toggleTagFilter(
  currentFilters: FiltersState,
  tag: string,
): FiltersState {
  return { ...currentFilters, tags: toggleInArray(currentFilters.tags, tag) };
}
