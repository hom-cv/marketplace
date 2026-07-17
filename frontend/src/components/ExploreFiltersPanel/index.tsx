/**
 * ExploreFiltersPanel - Reusable filter panel for explore pages.
 * Department selector → per-category accordions (checkbox + nested subcategory
 * checkboxes) → size + brand filters.
 */

import { useMemo, useCallback, useState, memo } from "react";
import { Stack, Group, Checkbox, TextInput } from "@mantine/core";
import {
  IconX,
  IconCategory,
  IconRuler,
  IconBuildingStore,
  IconSearch,
  IconUsers,
  IconChevronRight,
  IconChevronLeft,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import { useBrands } from "@/hooks/useBrands";
import type { PostCategory, SizeGroup } from "@/api/types/post";
import { SIZE_GROUP_CONFIG, sizeGroupFor } from "@/api/types/post";
import {
  DEPARTMENTS,
  departmentToGender,
  type Department,
} from "@/constants/departments";
import {
  useCategoryTree,
  categoriesForGender,
  subcategoriesFor,
} from "@/hooks/useCategoryTree";
import {
  type FiltersState,
  createSizeKey,
  parseSizeKey,
  toggleCategoryFilter,
  toggleSubcategoryFilter,
  toggleSizeFilter,
  toggleBrandFilter,
} from "@/utils/filterHelpers";
import styles from "./ExploreFiltersPanel.module.css";

interface ExploreFiltersPanelProps {
  department: Department | undefined;
  onDepartmentChange: (department: Department | undefined) => void;
  filters: FiltersState;
  onFiltersChange: (
    filters: FiltersState | ((prev: FiltersState) => FiltersState),
  ) => void;
}

function ExploreFiltersPanelComponent({
  department,
  onDepartmentChange,
  filters,
  onFiltersChange,
}: ExploreFiltersPanelProps) {
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const { data: taxonomy } = useCategoryTree();
  const { data: brands } = useBrands();
  const [brandQuery, setBrandQuery] = useState("");

  const gender = departmentToGender(department);
  // Which category the user has drilled into (null = top category list).
  const [drilled, setDrilled] = useState<PostCategory | null>(null);

  const visibleBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const all = brands ?? [];
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  }, [brands, brandQuery]);

  const categories = useMemo(
    () => categoriesForGender(taxonomy, gender),
    [taxonomy, gender],
  );

  const subcatsFor = useCallback(
    (category: PostCategory) => subcategoriesFor(taxonomy, gender, category),
    [taxonomy, gender],
  );

  // Context-aware sizes: which size groups are relevant to the current
  // category/subcategory selection (heterogeneous categories span several).
  const relevantSizeGroups = useMemo(() => {
    const groups = new Set<SizeGroup>();
    if (!taxonomy) return groups;
    for (const cat of filters.categories) {
      groups.add(taxonomy.categoryDefaultSizeGroups[cat]);
      for (const sub of subcategoriesFor(taxonomy, gender, cat)) {
        groups.add(sizeGroupFor(taxonomy, cat, sub));
      }
    }
    for (const sub of filters.subcategories) {
      const owner = categories.find((c) =>
        subcategoriesFor(taxonomy, gender, c).includes(sub),
      );
      if (owner) groups.add(sizeGroupFor(taxonomy, owner, sub));
    }
    groups.delete("ONE_SIZE"); // nothing to pick for one-size items
    return groups;
  }, [taxonomy, gender, categories, filters.categories, filters.subcategories]);

  const activeSizeGroups = useMemo(
    () => new Set(filters.sizes.map((k) => parseSizeKey(k).group)),
    [filters.sizes],
  );

  // Show a group if it's relevant to the selection or already has active picks.
  const visibleSizeGroups = SIZE_GROUP_CONFIG.filter(
    (g) =>
      g.group !== "ONE_SIZE" &&
      (relevantSizeGroups.has(g.group) || activeSizeGroups.has(g.group)),
  );

  const hasCategorySelection =
    filters.categories.length > 0 || filters.subcategories.length > 0;

  const groupLabel = (g: SizeGroup) => tListings(`sizeGroups.${g.toLowerCase()}`);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.subcategories.length > 0 ||
    filters.sizes.length > 0 ||
    filters.brands.length > 0 ||
    filters.tags.length > 0;

  const handleBrandToggle = useCallback(
    (slug: string) => onFiltersChange((prev) => toggleBrandFilter(prev, slug)),
    [onFiltersChange],
  );

  const handleCategoryToggle = useCallback(
    (category: PostCategory) =>
      onFiltersChange((prev) => toggleCategoryFilter(prev, category)),
    [onFiltersChange],
  );

  // Count of active picks under a category (whole-category + its subcategories).
  const categoryActiveCount = useCallback(
    (category: PostCategory) => {
      const subs = new Set(subcatsFor(category));
      const subCount = filters.subcategories.filter((s) => subs.has(s)).length;
      return (filters.categories.includes(category) ? 1 : 0) + subCount;
    },
    [filters.categories, filters.subcategories, subcatsFor],
  );

  // Keep drill target valid when the department/tree changes.
  const activeDrill =
    drilled && categories.includes(drilled) ? drilled : null;

  const handleSubcategoryToggle = useCallback(
    (subcategory: string) =>
      onFiltersChange((prev) => toggleSubcategoryFilter(prev, subcategory)),
    [onFiltersChange],
  );

  const handleSizeToggle = useCallback(
    (group: SizeGroup, size: string) =>
      onFiltersChange((prev) => toggleSizeFilter(prev, group, size)),
    [onFiltersChange],
  );

  const handleClearAllFilters = useCallback(() => {
    onFiltersChange({
      categories: [],
      subcategories: [],
      sizes: [],
      brands: [],
      tags: [],
    });
  }, [onFiltersChange]);

  return (
    <Stack gap="xs">
      {/* Department (single-select: check to scope, uncheck for all) */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.department")}
        icon={<IconUsers size={18} />}
        badge={department ? 1 : 0}
        defaultOpen={true}
      >
        <Stack gap="xs">
          {DEPARTMENTS.map((d) => (
            <Checkbox
              key={d}
              label={tListings(`genders.${d}`)}
              checked={department === d}
              onChange={() => onDepartmentChange(department === d ? undefined : d)}
              radius="xs"
              className={styles.checkbox}
            />
          ))}
        </Stack>
      </CollapsibleFilterSection>

      {/* Category → subcategory drill-down */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.category")}
        icon={<IconCategory size={18} />}
        badge={filters.categories.length + filters.subcategories.length}
        defaultOpen={true}
      >
        {!department ? (
          <p className={styles.categoryHint}>
            {tCommon("filtersSidebar.selectDepartmentFirst")}
          </p>
        ) : activeDrill ? (
          <Stack gap={6}>
            <button
              type="button"
              className={styles.backRow}
              onClick={() => setDrilled(null)}
            >
              <IconChevronLeft size={15} />
              <span>{taxonomy?.categoryLabels[activeDrill] ?? activeDrill}</span>
            </button>
            <Checkbox
              size="xs"
              label={tCommon("filtersSidebar.allOf", {
                category: taxonomy?.categoryLabels[activeDrill] ?? activeDrill,
              })}
              checked={filters.categories.includes(activeDrill)}
              onChange={() => handleCategoryToggle(activeDrill)}
              radius="xs"
              className={styles.checkbox}
            />
            {subcatsFor(activeDrill).map((sub) => (
              <Checkbox
                key={sub}
                label={taxonomy?.subcategoryLabels[sub] ?? sub}
                size="xs"
                checked={filters.subcategories.includes(sub)}
                onChange={() => handleSubcategoryToggle(sub)}
                radius="xs"
                className={styles.checkbox}
              />
            ))}
          </Stack>
        ) : (
          <Stack gap={0}>
            {categories.map((category) => {
              const count = categoryActiveCount(category);
              return (
                <button
                  key={category}
                  type="button"
                  className={styles.drillRow}
                  onClick={() => setDrilled(category)}
                >
                  <span className={styles.drillLabel}>
                    {taxonomy?.categoryLabels[category] ?? category}
                  </span>
                  {count > 0 && <span className={styles.catCount}>{count}</span>}
                  <IconChevronRight size={15} className={styles.drillChevron} />
                </button>
              );
            })}
          </Stack>
        )}
      </CollapsibleFilterSection>

      {/* Brand Filter */}
      {brands && brands.length > 0 && (
        <CollapsibleFilterSection
          title={tCommon("filtersSidebar.brand")}
          icon={<IconBuildingStore size={18} />}
          badge={filters.brands.length}
          defaultOpen={false}
        >
          <Stack gap="xs">
            <TextInput
              placeholder={tCommon("filtersSidebar.searchBrands")}
              leftSection={<IconSearch size={14} />}
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.currentTarget.value)}
              size="xs"
              radius="xs"
            />
            <Stack gap="xs">
              {visibleBrands.map((brand) => (
                <Checkbox
                  key={brand.slug}
                  label={brand.name}
                  checked={filters.brands.includes(brand.slug)}
                  onChange={() => handleBrandToggle(brand.slug)}
                  radius="xs"
                  className={styles.checkbox}
                />
              ))}
              {visibleBrands.length === 0 && (
                <span className={styles.noResults}>
                  {tCommon("filtersSidebar.noBrands")}
                </span>
              )}
            </Stack>
          </Stack>
        </CollapsibleFilterSection>
      )}

      {/* Size (context-aware: only the size types the selection implies) */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.size")}
        icon={<IconRuler size={18} />}
        badge={filters.sizes.length}
        defaultOpen={false}
      >
        {visibleSizeGroups.length === 0 ? (
          <p className={styles.categoryHint}>
            {hasCategorySelection
              ? tCommon("filtersSidebar.oneSizeItems")
              : tCommon("filtersSidebar.selectCategoryForSize")}
          </p>
        ) : (
          <Stack gap="sm">
            {visibleSizeGroups.map((groupConfig) => (
              <div key={groupConfig.group}>
                {visibleSizeGroups.length > 1 && (
                  <div className={styles.sizeGroupLabel}>
                    {groupLabel(groupConfig.group)}
                  </div>
                )}
                <Group gap="xs" wrap="wrap">
                  {groupConfig.sizes.map((size) => {
                    const sizeKey = createSizeKey(groupConfig.group, size);
                    return (
                      <Checkbox
                        key={sizeKey}
                        label={
                          groupConfig.formatLabel
                            ? groupConfig.formatLabel(size)
                            : size
                        }
                        size="xs"
                        checked={filters.sizes.includes(sizeKey)}
                        onChange={() => handleSizeToggle(groupConfig.group, size)}
                        radius="xs"
                        className={styles.checkbox}
                      />
                    );
                  })}
                </Group>
              </div>
            ))}
          </Stack>
        )}
      </CollapsibleFilterSection>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button className={styles.clearButton} onClick={handleClearAllFilters}>
          <IconX size={14} />
          <span>{tCommon("buttons.clearAll")}</span>
        </button>
      )}
    </Stack>
  );
}

function sameArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export const ExploreFiltersPanel = memo(
  ExploreFiltersPanelComponent,
  (prev, next) =>
    prev.department === next.department &&
    prev.onDepartmentChange === next.onDepartmentChange &&
    prev.onFiltersChange === next.onFiltersChange &&
    sameArray(prev.filters.categories, next.filters.categories) &&
    sameArray(prev.filters.subcategories, next.filters.subcategories) &&
    sameArray(prev.filters.sizes, next.filters.sizes) &&
    sameArray(prev.filters.brands, next.filters.brands) &&
    sameArray(prev.filters.tags, next.filters.tags),
);
