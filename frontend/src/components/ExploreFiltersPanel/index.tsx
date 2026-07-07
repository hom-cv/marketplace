/**
 * ExploreFiltersPanel - Reusable filter panel for explore pages
 * Contains category checkboxes and size filters
 */

import { useMemo, useCallback, memo } from "react";
import { Stack, Group, Checkbox } from "@mantine/core";
import { IconX, IconCategory, IconRuler } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import type { PostType, SizeCategory } from "@/api/types/post";
import { POST_TYPES, SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  createSizeKey,
  parseSizeKey,
  toggleTypeFilter,
  toggleSizeFilter,
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
    filters.types.length > 0 || filters.sizes.length > 0;

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
    onFiltersChange({ types: [], sizes: [] });
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

// `filters` is a fresh object each parent render, so compare it by value.
// `onFiltersChange` is referentially stable (useCallback), so a ref check is
// enough. Lets the panel skip re-rendering when e.g. the search input changes.
export const ExploreFiltersPanel = memo(
  ExploreFiltersPanelComponent,
  (prev, next) =>
    prev.onFiltersChange === next.onFiltersChange &&
    sameArray(prev.filters.types, next.filters.types) &&
    sameArray(prev.filters.sizes, next.filters.sizes),
);
