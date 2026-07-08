/**
 * ExploreFiltersPanel - Reusable filter panel for explore pages
 * Contains category checkboxes and size filters
 */

import { useMemo, useCallback, useState, memo } from "react";
import { Stack, Group, Checkbox, TextInput, ScrollArea } from "@mantine/core";
import {
  IconX,
  IconCategory,
  IconRuler,
  IconBuildingStore,
  IconSearch,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import { useBrands } from "@/hooks/useBrands";
import type { PostType, SizeCategory } from "@/api/types/post";
import { POST_TYPES, SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  createSizeKey,
  parseSizeKey,
  toggleTypeFilter,
  toggleSizeFilter,
  toggleBrandFilter,
} from "@/utils/filterHelpers";
import styles from "./ExploreFiltersPanel.module.css";

interface ExploreFiltersPanelProps {
  filters: FiltersState;
  onFiltersChange: (
    filters: FiltersState | ((prev: FiltersState) => FiltersState),
  ) => void;
}

function ExploreFiltersPanelComponent({
  filters,
  onFiltersChange,
}: ExploreFiltersPanelProps) {
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const { data: brands } = useBrands();
  const [brandQuery, setBrandQuery] = useState("");

  const visibleBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const all = brands ?? [];
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  }, [brands, brandQuery]);

  const typeOptions = useMemo(
    () =>
      POST_TYPES.map((postType) => ({
        value: postType,
        label: tListings(`categories.${postType.toLowerCase()}`),
      })),
    [tListings],
  );

  const visibleSizeCategories = useMemo(() => {
    if (filters.types.length === 0) {
      return SIZE_CATEGORY_CONFIG;
    }
    return SIZE_CATEGORY_CONFIG.filter((config) =>
      config.postTypes.some((postType) => filters.types.includes(postType)),
    );
  }, [filters.types]);

  const activeSizeCountByCategory = useMemo(() => {
    const counts = new Map<SizeCategory, number>();
    for (const sizeKey of filters.sizes) {
      const { category } = parseSizeKey(sizeKey);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [filters.sizes]);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.sizes.length > 0 ||
    filters.brands.length > 0;

  const handleBrandToggle = useCallback(
    (slug: string) => {
      onFiltersChange((prev) => toggleBrandFilter(prev, slug));
    },
    [onFiltersChange],
  );

  const handleTypeToggle = useCallback(
    (postType: PostType) => {
      onFiltersChange((prev) =>
        toggleTypeFilter(prev, postType, SIZE_CATEGORY_CONFIG),
      );
    },
    [onFiltersChange],
  );

  const handleSizeToggle = useCallback(
    (category: SizeCategory, size: string) => {
      onFiltersChange((prev) => toggleSizeFilter(prev, category, size));
    },
    [onFiltersChange],
  );

  const handleClearAllFilters = useCallback(() => {
    onFiltersChange({ types: [], sizes: [], brands: [] });
  }, [onFiltersChange]);

  return (
    <Stack gap="lg">
      {/* Category Filter */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.category")}
        icon={<IconCategory size={18} />}
        badge={filters.types.length}
        defaultOpen={true}
      >
        <Stack gap="xs">
          {typeOptions.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={filters.types.includes(option.value)}
              onChange={() => handleTypeToggle(option.value)}
              radius="xs"
              className={styles.checkbox}
            />
          ))}
        </Stack>
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
            <ScrollArea.Autosize mah={220}>
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
            </ScrollArea.Autosize>
          </Stack>
        </CollapsibleFilterSection>
      )}

      {/* Size Filters */}
      {visibleSizeCategories.map((categoryConfig) => (
        <CollapsibleFilterSection
          key={categoryConfig.category}
          title={tListings(categoryConfig.labelKey)}
          icon={<IconRuler size={18} />}
          badge={activeSizeCountByCategory.get(categoryConfig.category) ?? 0}
          defaultOpen={false}
        >
          <Group gap="xs" wrap="wrap">
            {categoryConfig.sizes.map((size) => {
              const sizeKey = createSizeKey(categoryConfig.category, size);
              return (
                <Checkbox
                  key={sizeKey}
                  label={
                    categoryConfig.formatLabel
                      ? categoryConfig.formatLabel(size)
                      : size
                  }
                  size="xs"
                  checked={filters.sizes.includes(sizeKey)}
                  onChange={() =>
                    handleSizeToggle(categoryConfig.category, size)
                  }
                  radius="xs"
                  className={styles.checkbox}
                />
              );
            })}
          </Group>
        </CollapsibleFilterSection>
      ))}

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
    prev.onFiltersChange === next.onFiltersChange &&
    sameArray(prev.filters.types, next.filters.types) &&
    sameArray(prev.filters.sizes, next.filters.sizes) &&
    sameArray(prev.filters.brands, next.filters.brands),
);
