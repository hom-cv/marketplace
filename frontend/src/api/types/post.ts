/**
 * Post/listing types
 */

import type { User } from "./user";
import {
  LETTER_SIZES,
  WAIST_SIZES,
  SUIT_SIZES,
  SHOE_SIZES,
} from "./generated";
import type { PostCategory, Gender, SizeGroup } from "./generated";

// The shared vocabulary (categories, genders, size groups, subcategory codes, size
// lists) is generated from the backend enums — backend/app/constants/post.py is the
// source of truth; see generated.ts / scripts/gen_frontend_enums.py. Re-export all of
// it so imports from this module are unchanged; the few pulled into scope above are
// used below. The granular subcategory tree is served separately via GET /categories.
export * from "./generated";

// Measurement interfaces per category
export interface TopMeasurements {
  shoulder?: number;
  length?: number;
  bust?: number;
  sleeve?: number;
  [key: string]: number | undefined;
}

export interface PantsMeasurements {
  total_length?: number;
  inseam?: number;
  rise?: number;
  hip?: number;
  [key: string]: number | undefined;
}

export interface ShoesMeasurements {
  insole_length?: number;
  [key: string]: number | undefined;
}

export type Measurements =
  | TopMeasurements
  | PantsMeasurements
  | ShoesMeasurements;

/**
 * Measurement field configuration per category.
 * Maps field keys (snake_case) to i18n translation keys (camelCase).
 * Used for both form input and display.
 */
export interface MeasurementFieldConfig {
  key: string;
  translationKey: string;
}

/** Standard measurements for tops (shirts, jackets) */
const TOP_MEASUREMENT_FIELDS: readonly MeasurementFieldConfig[] = [
  { key: "shoulder", translationKey: "shoulder" },
  { key: "length", translationKey: "length" },
  { key: "bust", translationKey: "bust" },
  { key: "sleeve", translationKey: "sleeve" },
];

/**
 * Measurement fields per size group (stable: 4 groups). Which group a listing
 * uses comes from the taxonomy (subcategory) — see `size_group` on Post.
 *
 * SYNC: mirrors the measurement schemas in backend/app/schemas/post.py.
 */
export const MEASUREMENT_FIELDS_BY_GROUP: Record<
  SizeGroup,
  readonly MeasurementFieldConfig[]
> = {
  LETTER: TOP_MEASUREMENT_FIELDS,
  SUIT: TOP_MEASUREMENT_FIELDS,
  WAIST: [
    { key: "total_length", translationKey: "totalLength" },
    { key: "inseam", translationKey: "inseam" },
    { key: "rise", translationKey: "rise" },
    { key: "hip", translationKey: "hip" },
  ],
  SHOE: [{ key: "insole_length", translationKey: "insoleLength" }],
  ONE_SIZE: [],
};

/**
 * Map from snake_case measurement keys to i18n translation keys.
 * Used for displaying measurement values with translated labels.
 */
export const MEASUREMENT_KEY_TO_TRANSLATION: Record<string, string> =
  Object.values(MEASUREMENT_FIELDS_BY_GROUP)
    .flat()
    .reduce(
      (acc, field) => {
        acc[field.key] = field.translationKey;
        return acc;
      },
      {} as Record<string, string>,
    );

/**
 * Config for each size group: its sizes and how to render one. The group's filter
 * label comes from i18n (`sizeGroups.<group>`), so it isn't stored here.
 */
export interface SizeGroupConfig {
  group: SizeGroup;
  sizes: readonly string[];
  formatLabel?: (size: string) => string;
}

// Full Record<SizeGroup, ...> so a missing group is a compile error (exhaustiveness).
const SIZE_GROUP_BY_KEY: Record<SizeGroup, SizeGroupConfig> = {
  LETTER: { group: "LETTER", sizes: LETTER_SIZES },
  WAIST: { group: "WAIST", sizes: WAIST_SIZES },
  SUIT: { group: "SUIT", sizes: SUIT_SIZES },
  SHOE: { group: "SHOE", sizes: SHOE_SIZES, formatLabel: (size) => `EU ${size}` },
  ONE_SIZE: {
    group: "ONE_SIZE",
    sizes: ["ONE_SIZE"],
    formatLabel: () => "One Size",
  },
};

export const SIZE_GROUP_CONFIG: readonly SizeGroupConfig[] =
  Object.values(SIZE_GROUP_BY_KEY);

/** Available size options for a size group. */
export function getSizesForGroup(group: SizeGroup): readonly string[] {
  return SIZE_GROUP_BY_KEY[group].sizes;
}

/** Render a size for display (e.g. "EU 42", "One Size"). */
export function formatSize(size: string, group?: SizeGroup): string {
  const config = group
    ? SIZE_GROUP_BY_KEY[group]
    : SIZE_GROUP_CONFIG.find((c) => c.sizes.includes(size));
  if (!config) return size;
  return config.formatLabel ? config.formatLabel(size) : size;
}

/**
 * The taxonomy served by GET /categories. Single client-side source for the
 * gendered category tree and per-subcategory size groups.
 */
export interface CategoryTaxonomy {
  // genders[gender][category] = ordered subcategory CODES (e.g. "POLOS").
  genders: Record<Gender, Record<string, string[]>>;
  categoryLabels: Record<string, string>;
  // Display label per subcategory code, e.g. { POLOS: "Polos" }.
  subcategoryLabels: Record<string, string>;
  categoryDefaultSizeGroups: Record<string, SizeGroup>;
  subcategorySizeGroups: Record<string, SizeGroup>;
}

/** Resolve a (category, subcategory)'s size group, mirroring the backend rule. */
export function sizeGroupFor(
  taxonomy: CategoryTaxonomy | undefined,
  category: PostCategory | null,
  subcategory: string | null,
): SizeGroup {
  if (!taxonomy || !category) return "ONE_SIZE";
  return (
    (subcategory && taxonomy.subcategorySizeGroups[subcategory]) ||
    taxonomy.categoryDefaultSizeGroups[category] ||
    "ONE_SIZE"
  );
}

export interface Brand {
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  title: string;
  description: string;
  category: PostCategory;
  subcategory: string | null;
  /** Derived server-side from (category, subcategory); drives size/measurement UI */
  size_group: SizeGroup;
  gender: Gender;
  brand: Brand | null;
  tags: string[];
  price: string; // Decimal comes as string from API
  shipping_cost: string; // Decimal comes as string from API
  image_url: string | null;
  image_urls: string[] | null;
  size: string | null;
  measurements: Measurements | null;
  user: User;
  is_sold: boolean;
  is_banned?: boolean;
  is_user_banned?: boolean;
  /** Another buyer holds an active checkout reservation on this post */
  is_reserved?: boolean;
  /** The active reservation is the viewer's own checkout (detail endpoint only) */
  is_reserved_by_viewer?: boolean;
  like_count: number;
  is_liked: boolean;
}

export interface CreatePostRequest {
  title: string;
  description: string;
  category: PostCategory;
  subcategory: string;
  gender: Gender;
  brand?: string;
  tags?: string[];
  price: number;
  shipping_cost?: number;
  size: string;
  measurements?: Measurements;
  image_urls: string[];
}

export interface UpdatePostRequest {
  title: string;
  description: string;
  category: PostCategory;
  subcategory: string;
  gender: Gender;
  brand?: string;
  tags?: string[];
  price: number;
  shipping_cost?: number;
  size: string;
  measurements?: Measurements;
  image_urls: string[];
}

export interface PostFilters {
  categories?: PostCategory[];
  subcategories?: string[];
  genders?: Gender[];
  sizes?: string[];
  brands?: string[];
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface PaginatedPostsResponse {
  items: Post[];
  total: number;
  skip: number;
  limit: number;
}
