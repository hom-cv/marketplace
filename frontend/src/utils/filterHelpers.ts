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

/**
 * Create a prefixed size key (e.g. "SHOE:40") so a size stays tied to its group.
 */
export function createSizeKey(group: SizeGroup, size: string): string {
  return `${group}:${size}`;
}

/**
 * Parse a prefixed size key back into group and size.
 */
export function parseSizeKey(key: string): { group: SizeGroup; size: string } {
  const [group, size] = key.split(":");
  return { group: group as SizeGroup, size };
}

// Per-group URL param names, so sizes read as ?shoe=39&waist=40 rather than
// ?sizes=SHOE:39. ONE_SIZE is never filterable, so it has no param.
const PARAM_TO_GROUP: Record<string, SizeGroup> = {
  clothing: "LETTER",
  waist: "WAIST",
  shoe: "SHOE",
  suit: "SUIT",
};
const GROUP_TO_PARAM: Partial<Record<SizeGroup, string>> = {
  LETTER: "clothing",
  WAIST: "waist",
  SHOE: "shoe",
  SUIT: "suit",
};
export const SIZE_GROUP_PARAMS = Object.keys(PARAM_TO_GROUP);

/** Per-group URL size params -> internal GROUP:size keys. */
export function paramsToSizeKeys(search: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const [param, group] of Object.entries(PARAM_TO_GROUP)) {
    const values = search[param];
    if (!Array.isArray(values)) continue;
    for (const size of values) keys.push(createSizeKey(group, String(size)));
  }
  return keys;
}

/** Internal GROUP:size keys -> per-group URL size params. */
export function sizeKeysToParams(sizes: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of sizes) {
    const { group, size } = parseSizeKey(key);
    const param = GROUP_TO_PARAM[group];
    if (param) (out[param] ??= []).push(size);
  }
  return out;
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
