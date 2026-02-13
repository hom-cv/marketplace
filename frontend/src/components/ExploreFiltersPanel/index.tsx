/**
 * ExploreFiltersPanel - Reusable filter panel for explore pages
 * Contains search, category checkboxes, and size filters
 */

import { useMemo, useCallback } from "react";
import { Stack, Group, Checkbox, TextInput } from "@mantine/core";
import {
  IconSearch,
  IconX,
  IconCategory,
  IconRuler,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import type { PostType, SizeCategory } from "@/api/types/post";
import { SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  createSizeKey,
  parseSizeKey,
} from "@/utils/filterHelpers";
import styles from "./ExploreFiltersPanel.module.css";

interface ExploreFiltersPanelProps {
  filters: FiltersState;
  onFiltersChange: (
    filters: FiltersState | ((prev: FiltersState) => FiltersState),
  ) => void;
}

export function ExploreFiltersPanel({
  filters,
  onFiltersChange,
}: ExploreFiltersPanelProps) {
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");

  const typeOptions: { value: PostType; label: string }[] = useMemo(
    () => [
      { value: "SHIRT", label: tListings("categories.shirt") },
      { value: "PANTS", label: tListings("categories.pants") },
      { value: "JACKET", label: tListings("categories.jacket") },
      { value: "SHOES", label: tListings("categories.shoes") },
      { value: "ACCESSORIES", label: tListings("categories.accessories") },
      { value: "OTHER", label: tListings("categories.other") },
    ],
    [tListings],
  );

  const visibleSizeCategories = useMemo(() => {
    const selectedTypes = filters.types;

    return SIZE_CATEGORY_CONFIG.map((config) => {
      const isVisible =
        selectedTypes.length === 0 ||
        config.postTypes.some((pt) => selectedTypes.includes(pt));

      return { ...config, isVisible };
    }).filter((c) => c.isVisible);
  }, [filters.types]);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.sizes.length > 0 ||
    filters.search.trim() !== "";

  const handleTypeToggle = useCallback(
    (type: PostType) => {
      onFiltersChange((prev) => {
        const newTypes = prev.types.includes(type)
          ? prev.types.filter((t) => t !== type)
          : [...prev.types, type];

        // Keep sizes that are still relevant to the new type selection
        const newSizes =
          newTypes.length === 0
            ? prev.sizes // All categories visible when no types selected
            : prev.sizes.filter((sizeKey) => {
                const { category } = parseSizeKey(sizeKey);
                const categoryConfig = SIZE_CATEGORY_CONFIG.find(
                  (c) => c.category === category,
                );
                // Keep if category has at least one post type in common with selection
                return categoryConfig?.postTypes.some((pt) =>
                  newTypes.includes(pt),
                );
              });

        return { ...prev, types: newTypes, sizes: newSizes };
      });
    },
    [onFiltersChange],
  );

  const handleSizeToggle = useCallback(
    (category: SizeCategory, size: string) => {
      const sizeKey = createSizeKey(category, size);
      onFiltersChange((prev) => ({
        ...prev,
        sizes: prev.sizes.includes(sizeKey)
          ? prev.sizes.filter((s) => s !== sizeKey)
          : [...prev.sizes, sizeKey],
      }));
    },
    [onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({ types: [], sizes: [], search: "" });
  }, [onFiltersChange]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const searchText = e.currentTarget.value;
      onFiltersChange((prev) => ({ ...prev, search: searchText }));
    },
    [onFiltersChange],
  );

  const handleSearchClear = useCallback(() => {
    onFiltersChange((prev) => ({ ...prev, search: "" }));
  }, [onFiltersChange]);

  return (
    <Stack gap="lg">
      {/* Search Input */}
      <TextInput
        placeholder={t("search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={handleSearchChange}
        radius="xs"
        className={styles.searchInput}
        rightSection={
          filters.search && (
            <IconX
              size={14}
              className={styles.clearIcon}
              onClick={handleSearchClear}
            />
          )
        }
      />

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
      {visibleSizeCategories.map((categoryConfig) => {
        const activeSizesInCategory = filters.sizes.filter((sizeKey) => {
          const { category } = parseSizeKey(sizeKey);
          return category === categoryConfig.category;
        }).length;

        return (
          <CollapsibleFilterSection
            key={categoryConfig.category}
            title={tListings(categoryConfig.labelKey)}
            icon={<IconRuler size={18} />}
            badge={activeSizesInCategory}
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
        );
      })}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button className={styles.clearButton} onClick={handleClearFilters}>
          <IconX size={14} />
          <span>{tCommon("buttons.clearAll")}</span>
        </button>
      )}
    </Stack>
  );
}
