/**
 * PostFiltersBar - Filter sidebar matching site design patterns
 * Uses same typography and spacing as Login/SignUp and HomePage
 */

import { useState, useMemo } from "react";
import { TextInput, Button, Text, Stack, Chip, Group, Collapse, UnstyledButton } from "@mantine/core";
import { IconSearch, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { PostType } from "@/api/types/post";
import { LETTER_SIZES, PANTS_SIZES, SHOE_SIZES } from "@/api/types/post";
import type { FiltersState } from "@/hooks/usePostFilters";
import styles from "./PostFiltersBar.module.css";

interface PostFiltersBarProps {
  filters: FiltersState;
  onTypeToggle: (type: PostType) => void;
  onSizeToggle: (size: string) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  variant?: "sidebar" | "drawer";
}

interface FilterSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ label, defaultOpen = true, children }: FilterSectionProps) {
  const [opened, setOpened] = useState(defaultOpen);

  return (
    <div>
      <UnstyledButton className={styles.sectionToggle} onClick={() => setOpened((o) => !o)}>
        <Text size="sm" c="dimmed" fw={500} tt="uppercase" className={styles.sectionLabel}>
          {label}
        </Text>
        <IconChevronDown
          size={16}
          stroke={1.5}
          className={`${styles.sectionChevron} ${opened ? styles.sectionChevronOpen : ""}`}
        />
      </UnstyledButton>
      <Collapse in={opened}>
        <div className={styles.sectionContent}>{children}</div>
      </Collapse>
    </div>
  );
}

export function PostFiltersBar({
  filters,
  onTypeToggle,
  onSizeToggle,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
  variant = "sidebar",
}: PostFiltersBarProps) {
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");

  const typeOptions: { value: PostType; label: string }[] = useMemo(
    () => [
      { value: "SHIRT", label: t("categories.shirts") },
      { value: "PANTS", label: t("categories.pants") },
      { value: "JACKET", label: t("categories.jackets") },
      { value: "SHOES", label: t("categories.shoes") },
      { value: "ACCESSORIES", label: t("categories.accessories") },
      { value: "OTHER", label: t("categories.other") },
    ],
    [t]
  );

  const isDrawer = variant === "drawer";

  return (
    <div className={`${styles.container} ${isDrawer ? styles.drawer : styles.sidebar}`}>
      <Stack gap="lg">
        {/* Search - same size="md" radius="md" as HomePage */}
        <TextInput
          placeholder={t("search.placeholder")}
          leftSection={<IconSearch size={18} stroke={1.5} />}
          size="md"
          radius="md"
          value={filters.search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="subtle" size="xs" onClick={onClearFilters} style={{ alignSelf: "flex-start" }}>
            {tCommon("buttons.clearAll")}
          </Button>
        )}

        {/* Category - using Mantine Chip for consistency */}
        <FilterSection label={t("filters.category")} defaultOpen>
          <Group gap="xs">
            {typeOptions.map((option) => (
              <Chip
                key={option.value}
                checked={filters.types.includes(option.value)}
                onChange={() => onTypeToggle(option.value)}
                variant="outline"
                radius="xl"
              >
                {option.label}
              </Chip>
            ))}
          </Group>
        </FilterSection>

        {/* Clothing Sizes */}
        <FilterSection label={t("sizes.clothing")} defaultOpen>
          <Group gap={6}>
            {LETTER_SIZES.map((size) => (
              <Chip
                key={size}
                checked={filters.sizes.includes(size)}
                onChange={() => onSizeToggle(size)}
                variant="outline"
                radius="xl"
                size="xs"
              >
                {size}
              </Chip>
            ))}
          </Group>
        </FilterSection>

        {/* Pants Sizes */}
        <FilterSection label={t("sizes.pants")} defaultOpen={false}>
          <Group gap={6}>
            {PANTS_SIZES.map((size) => (
              <Chip
                key={size}
                checked={filters.sizes.includes(size)}
                onChange={() => onSizeToggle(size)}
                variant="outline"
                radius="xl"
                size="xs"
              >
                {size}
              </Chip>
            ))}
          </Group>
        </FilterSection>

        {/* Shoe Sizes */}
        <FilterSection label={t("sizes.shoes")} defaultOpen={false}>
          <Group gap={6}>
            {SHOE_SIZES.map((size) => (
              <Chip
                key={size}
                checked={filters.sizes.includes(size)}
                onChange={() => onSizeToggle(size)}
                variant="outline"
                radius="xl"
                size="xs"
              >
                {size}
              </Chip>
            ))}
          </Group>
        </FilterSection>
      </Stack>
    </div>
  );
}
