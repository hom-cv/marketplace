/**
 * Post/listing types
 */

import type { User } from "./user";

/**
 * All top-level post categories (must match backend PostCategory).
 * The full gendered tree of granular subcategories is served by GET /categories
 * (see useCategoryTree) — this union is only for labels/colors/badges.
 */
export const POST_CATEGORIES = [
  "TOPS",
  "BOTTOMS",
  "OUTERWEAR",
  "FOOTWEAR",
  "ACCESSORIES",
  "TAILORING",
  "DRESSES",
  "JEWELRY",
  "BAGS",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

/**
 * All available departments (who the item is for).
 * Single source of truth for gender values.
 */
export const POST_GENDERS = ["MENS", "WOMENS", "UNISEX"] as const;

export type Gender = (typeof POST_GENDERS)[number];

/**
 * Size group a subcategory belongs to (must match backend SizeGroup). Determines
 * the available size options + measurement fields for a listing.
 */
export const SIZE_GROUPS = [
  "LETTER",
  "WAIST",
  "SHOE",
  "SUIT",
  "ONE_SIZE",
] as const;
export type SizeGroup = (typeof SIZE_GROUPS)[number];

// Letter-based sizes for tops, outerwear, dresses, tailoring
export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
export type LetterSize = (typeof LETTER_SIZES)[number] | "ONE_SIZE";

// Waist sizes for denim/trousers (every inch, 26-44)
export const WAIST_SIZES = [
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
] as const;
export type WaistSize = (typeof WAIST_SIZES)[number];

// Suit / tailoring sizes (chest, inches)
export const SUIT_SIZES = [
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
] as const;
export type SuitSize = (typeof SUIT_SIZES)[number];

// Italian (EU) shoe sizes 35-48
export const SHOE_SIZES = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
] as const;
export type ShoeSize = (typeof SHOE_SIZES)[number];

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
 * Config for each size group: its sizes, filter label, and how to render a size.
 */
export interface SizeGroupConfig {
  group: SizeGroup;
  sizes: readonly string[];
  /** i18n key for the group label in the size filter (e.g. "sizeCategories.tops") */
  labelKey: string;
  formatLabel?: (size: string) => string;
}

export const SIZE_GROUP_CONFIG: readonly SizeGroupConfig[] = [
  { group: "LETTER", sizes: LETTER_SIZES, labelKey: "sizeGroups.letter" },
  { group: "WAIST", sizes: WAIST_SIZES, labelKey: "sizeGroups.waist" },
  { group: "SUIT", sizes: SUIT_SIZES, labelKey: "sizeGroups.suit" },
  {
    group: "SHOE",
    sizes: SHOE_SIZES,
    labelKey: "sizeCategories.shoes",
    formatLabel: (size) => `EU ${size}`,
  },
  {
    group: "ONE_SIZE",
    sizes: ["ONE_SIZE"],
    labelKey: "sizeCategories.accessories",
    formatLabel: () => "One Size",
  },
];

const SIZE_GROUP_BY_KEY: Record<SizeGroup, SizeGroupConfig> =
  SIZE_GROUP_CONFIG.reduce(
    (acc, c) => {
      acc[c.group] = c;
      return acc;
    },
    {} as Record<SizeGroup, SizeGroupConfig>,
  );

/** Available size options for a size group. */
export function getSizesForGroup(group: SizeGroup): readonly string[] {
  return SIZE_GROUP_BY_KEY[group]?.sizes ?? [];
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
  genders: Record<Gender, Record<string, string[]>>;
  categoryLabels: Record<string, string>;
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
