/**
 * Category taxonomy hook. The taxonomy is static, so it's cached aggressively
 * and shared across the create form, explore filters, and Shop By Category menu.
 */

import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/api/categories";
import { queryKeys } from "@/hooks/queryKeys";
import type { CategoryTaxonomy, Gender, PostCategory } from "@/api/types/post";

export function useCategoryTree() {
  return useQuery<CategoryTaxonomy>({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
    staleTime: Infinity, // static taxonomy; refetched only on remount/reload
    gcTime: Infinity,
  });
}

/** Ordered top categories available for a gender. */
export function categoriesForGender(
  taxonomy: CategoryTaxonomy | undefined,
  gender: Gender | null,
): PostCategory[] {
  if (!taxonomy || !gender) return [];
  return Object.keys(taxonomy.genders[gender] ?? {}) as PostCategory[];
}

/** Ordered subcategory codes for a (gender, category). */
export function subcategoriesFor(
  taxonomy: CategoryTaxonomy | undefined,
  gender: Gender | null,
  category: PostCategory | null,
): string[] {
  if (!taxonomy || !gender || !category) return [];
  return taxonomy.genders[gender]?.[category] ?? [];
}
