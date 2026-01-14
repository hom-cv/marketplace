/**
 * Filters Sidebar for the main feed
 * Contains filters for post type, price range, and sizes.
 */

import { useMemo } from "react";
import {
  Stack,
  Text,
  Checkbox,
  RangeSlider,
  Button,
  Divider,
  Box,
  Group,
} from "@mantine/core";
import { IconFilter, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { PostType } from "@/api/types/post";
import { PANTS_SIZES, SHOE_SIZES } from "@/api/types/post";

interface FiltersState {
  types: PostType[];
  sizes: string[];
  priceRange: [number, number];
}

interface FiltersSidebarProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

// Letter sizes for shirts, jackets, tops
const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

export function FiltersSidebar({ filters, onFiltersChange }: FiltersSidebarProps) {
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");

  // Type labels with translations
  const typeOptions: { value: PostType; label: string }[] = useMemo(() => [
    { value: "SHIRT", label: tListings("categories.shirt") },
    { value: "PANTS", label: tListings("categories.pants") },
    { value: "JACKET", label: tListings("categories.jacket") },
    { value: "SHOES", label: tListings("categories.shoes") },
    { value: "ACCESSORIES", label: tListings("categories.accessories") },
    { value: "OTHER", label: tListings("categories.other") },
  ], [tListings]);

  // Determine which size options to show based on selected categories
  const availableSizes = useMemo(() => {
    const selectedTypes = filters.types;

    // If no types selected, show all sizes
    if (selectedTypes.length === 0) {
      return {
        letter: [...LETTER_SIZES],
        pants: [...PANTS_SIZES],
        shoes: [...SHOE_SIZES],
        hasAccessories: true,
      };
    }

    // Only show relevant sizes based on selected categories
    const hasTopTypes = selectedTypes.some(t => ["SHIRT", "JACKET", "OTHER"].includes(t));
    const hasPants = selectedTypes.includes("PANTS");
    const hasShoes = selectedTypes.includes("SHOES");
    const hasAccessories = selectedTypes.includes("ACCESSORIES");

    return {
      letter: hasTopTypes ? [...LETTER_SIZES] : [],
      pants: hasPants ? [...PANTS_SIZES] : [],
      shoes: hasShoes ? [...SHOE_SIZES] : [],
      hasAccessories,
    };
  }, [filters.types]);

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    // Clear sizes when category changes to avoid confusion
    onFiltersChange({ ...filters, types: newTypes, sizes: [] });
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onFiltersChange({ ...filters, sizes: newSizes });
  };

  const handlePriceChange = (value: [number, number]) => {
    onFiltersChange({ ...filters, priceRange: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({ types: [], sizes: [], priceRange: [0, 1000] });
  };

  const hasActiveFilters = filters.types.length > 0 || filters.sizes.length > 0 || filters.priceRange[0] > 0 || filters.priceRange[1] < 1000;

  const hasSizeOptions = availableSizes.letter.length > 0 || availableSizes.pants.length > 0 || availableSizes.shoes.length > 0 || availableSizes.hasAccessories;

  return (
    <Box
      p="md"
      style={{
        borderRight: "1px solid var(--mantine-color-gray-2)",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconFilter size={18} />
          <Text fw={600}>{t("filtersSidebar.filters")}</Text>
        </Group>
        {hasActiveFilters && (
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<IconX size={14} />}
            onClick={handleClearFilters}
          >
            {t("filtersSidebar.clear")}
          </Button>
        )}
      </Group>

      <Stack gap="lg">
        {/* Category Filter */}
        <Box>
          <Text size="sm" fw={500} mb="sm">
            {t("filtersSidebar.category")}
          </Text>
          <Stack gap="xs">
            {typeOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={filters.types.includes(option.value)}
                onChange={() => handleTypeToggle(option.value)}
              />
            ))}
          </Stack>
        </Box>

        <Divider mx="calc(var(--mantine-spacing-md) * -1)" />

        {/* Size Filter */}
        {hasSizeOptions && (
          <>
            <Box>
              <Text size="sm" fw={500} mb="sm">
                {t("filtersSidebar.size")}
              </Text>
              <Stack gap="md">
                {/* Letter sizes (tops) */}
                {availableSizes.letter.length > 0 && (
                  <Box>
                    {filters.types.length > 0 && (
                      <Text size="xs" c="dimmed" mb="xs">{tListings("sizeCategories.tops")}</Text>
                    )}
                    <Group gap="xs">
                      {availableSizes.letter.map((size) => (
                        <Checkbox
                          key={size}
                          label={size}
                          size="xs"
                          checked={filters.sizes.includes(size)}
                          onChange={() => handleSizeToggle(size)}
                        />
                      ))}
                    </Group>
                  </Box>
                )}

                {/* Pants sizes */}
                {availableSizes.pants.length > 0 && (
                  <Box>
                    {filters.types.length > 0 && (
                      <Text size="xs" c="dimmed" mb="xs">{tListings("sizeCategories.pants")}</Text>
                    )}
                    <Group gap="xs">
                      {availableSizes.pants.map((size) => (
                        <Checkbox
                          key={`pants-${size}`}
                          label={size}
                          size="xs"
                          checked={filters.sizes.includes(size)}
                          onChange={() => handleSizeToggle(size)}
                        />
                      ))}
                    </Group>
                  </Box>
                )}

                {/* Shoe sizes (EU) */}
                {availableSizes.shoes.length > 0 && (
                  <Box>
                    {filters.types.length > 0 && (
                      <Text size="xs" c="dimmed" mb="xs">{tListings("sizeCategories.shoes")}</Text>
                    )}
                    <Group gap="xs">
                      {availableSizes.shoes.map((size) => (
                        <Checkbox
                          key={`shoe-${size}`}
                          label={`EU ${size}`}
                          size="xs"
                          checked={filters.sizes.includes(size)}
                          onChange={() => handleSizeToggle(size)}
                        />
                      ))}
                    </Group>
                  </Box>
                )}

                {/* ONE_SIZE for accessories */}
                {availableSizes.hasAccessories && (
                  <Box>
                    <Checkbox
                      label={t("filtersSidebar.oneSize")}
                      size="xs"
                      checked={filters.sizes.includes("ONE_SIZE")}
                      onChange={() => handleSizeToggle("ONE_SIZE")}
                    />
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider mx="calc(var(--mantine-spacing-md) * -1)" />
          </>
        )}

        {/* Price Range Filter */}
        <Box>
          <Text size="sm" fw={500} mb="sm">
            {t("filtersSidebar.priceRange")}
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            ฿{filters.priceRange[0]} - ฿{filters.priceRange[1]}
          </Text>
          <RangeSlider
            min={0}
            max={1000}
            step={10}
            value={filters.priceRange}
            onChange={handlePriceChange}
            marks={[
              { value: 0, label: "฿0" },
              { value: 500, label: "฿500" },
              { value: 1000, label: "฿1000" },
            ]}
          />
        </Box>
      </Stack>
    </Box>
  );
}

export type { FiltersState };
