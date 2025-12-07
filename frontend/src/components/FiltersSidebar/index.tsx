/**
 * Filters Sidebar for the main feed
 * Contains filters for post type, price range, etc.
 */

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
import type { PostType } from "../../api/types";

interface FiltersState {
  types: PostType[];
  priceRange: [number, number];
}

interface FiltersSidebarProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

const typeOptions: { value: PostType; label: string }[] = [
  { value: "SHIRT", label: "Shirts" },
  { value: "PANTS", label: "Pants" },
  { value: "JACKET", label: "Jackets" },
  { value: "SHOES", label: "Shoes" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

export function FiltersSidebar({ filters, onFiltersChange }: FiltersSidebarProps) {
  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const handlePriceChange = (value: [number, number]) => {
    onFiltersChange({ ...filters, priceRange: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({ types: [], priceRange: [0, 1000] });
  };

  const hasActiveFilters = filters.types.length > 0 || filters.priceRange[0] > 0 || filters.priceRange[1] < 1000;

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
          <Text fw={600}>Filters</Text>
        </Group>
        {hasActiveFilters && (
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<IconX size={14} />}
            onClick={handleClearFilters}
          >
            Clear
          </Button>
        )}
      </Group>

      <Stack gap="lg">
        {/* Category Filter */}
        <Box>
          <Text size="sm" fw={500} mb="sm">
            Category
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

        <Divider />

        {/* Price Range Filter */}
        <Box>
          <Text size="sm" fw={500} mb="sm">
            Price Range
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            ${filters.priceRange[0]} - ${filters.priceRange[1]}
          </Text>
          <RangeSlider
            min={0}
            max={1000}
            step={10}
            value={filters.priceRange}
            onChange={handlePriceChange}
            marks={[
              { value: 0, label: "$0" },
              { value: 500, label: "$500" },
              { value: 1000, label: "$1000" },
            ]}
          />
        </Box>
      </Stack>
    </Box>
  );
}

export type { FiltersState };
