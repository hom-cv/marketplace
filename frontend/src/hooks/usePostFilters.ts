/**
 * Shared hook for post filtering state and logic
 */

import { useState, useMemo } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import type { PostType, PostFilters } from "@/api/types/post";

export interface FiltersState {
  types: PostType[];
  sizes: string[];
  search: string;
}

const DEFAULT_FILTERS: FiltersState = {
  types: [],
  sizes: [],
  search: "",
};

export interface UsePostFiltersReturn {
  filters: FiltersState;
  queryFilters: PostFilters;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  handleTypeToggle: (type: PostType) => void;
  handleSizeToggle: (size: string) => void;
  handleSearchChange: (search: string) => void;
  handleClearFilters: () => void;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
}

export function usePostFilters(initialFilters?: Partial<FiltersState>): UsePostFiltersReturn {
  const [filters, setFilters] = useState<FiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [debouncedSearch] = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo<PostFilters>(() => {
    const apiFilters: PostFilters = {};

    if (filters.types.length > 0) {
      apiFilters.types = filters.types;
    }
    if (filters.sizes.length > 0) {
      apiFilters.sizes = filters.sizes;
    }
    if (debouncedSearch.trim()) {
      apiFilters.search = debouncedSearch.trim();
    }

    return apiFilters;
  }, [filters.types, filters.sizes, debouncedSearch]);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.sizes.length > 0 ||
    filters.search.trim() !== "";

  const activeFilterCount =
    filters.types.length +
    filters.sizes.length +
    (filters.search.trim() ? 1 : 0);

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters((prev) => ({ ...prev, types: newTypes }));
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    setFilters((prev) => ({ ...prev, sizes: newSizes }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    queryFilters,
    hasActiveFilters,
    activeFilterCount,
    handleTypeToggle,
    handleSizeToggle,
    handleSearchChange,
    handleClearFilters,
    setFilters,
  };
}
