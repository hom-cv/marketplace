/**
 * ShopByCategoryMenu - hover mega-menu of the gendered category tree.
 * Wraps a department button; hovering reveals columns of categories whose
 * granular subcategories link into /explore pre-filtered.
 */

import { HoverCard, SimpleGrid, Stack } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Gender, PostCategory } from "@/api/types/post";
import type { Department } from "@/constants/departments";
import { useCategoryTree, categoriesForGender } from "@/hooks/useCategoryTree";
import styles from "./ShopByCategoryMenu.module.css";

interface ShopByCategoryMenuProps {
  gender: Gender;
  department: Department;
  children: ReactNode;
}

export function ShopByCategoryMenu({
  gender,
  department,
  children,
}: ShopByCategoryMenuProps) {
  const navigate = useNavigate();
  const { data: taxonomy } = useCategoryTree();
  const categories = categoriesForGender(taxonomy, gender);

  const goTo = (category: PostCategory, subcategory: string) => {
    navigate({
      to: "/explore",
      search: (prev) => ({
        ...prev,
        department,
        categories: [category],
        subcategories: [subcategory],
      }),
    });
  };

  if (categories.length === 0) return <>{children}</>;

  return (
    <HoverCard
      openDelay={80}
      closeDelay={120}
      position="bottom-start"
      shadow="md"
      radius="xs"
      withinPortal
    >
      <HoverCard.Target>
        <div className={styles.trigger}>{children}</div>
      </HoverCard.Target>
      <HoverCard.Dropdown className={styles.dropdown}>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="xl">
          {categories.map((category) => (
            <Stack key={category} gap={6} className={styles.column}>
              <div className={styles.columnTitle}>
                {taxonomy?.categoryLabels[category] ?? category}
              </div>
              {(taxonomy?.genders[gender]?.[category] ?? []).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={styles.leaf}
                  onClick={() => goTo(category, sub)}
                >
                  {sub}
                </button>
              ))}
            </Stack>
          ))}
        </SimpleGrid>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
