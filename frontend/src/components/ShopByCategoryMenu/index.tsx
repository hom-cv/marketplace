/**
 * ShopByCategoryPanel - panel of a department's top categories, rendered as a
 * full-width section below the department bar (not a popup). Each links into
 * /explore pre-filtered by category.
 */

import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";
import type { Gender, PostCategory } from "@/api/types/post";
import type { Department } from "@/constants/departments";
import { useCategoryTree, categoriesForGender } from "@/hooks/useCategoryTree";
import { categoryLabel } from "@/constants/postTypes";
import styles from "./ShopByCategoryMenu.module.css";

interface ShopByCategoryPanelProps {
  gender: Gender;
  department: Department;
  label: string; // display name of the department, for the "View all" button
  onSelect: () => void; // close the panel after navigating into a subcategory
  onViewAll: () => void; // navigate to the whole department (like clicking it)
}

export function ShopByCategoryPanel({
  gender,
  department,
  label,
  onSelect,
  onViewAll,
}: ShopByCategoryPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("explore");
  const { t: tListings } = useTranslation("listings");
  const { data: taxonomy } = useCategoryTree();
  const categories = categoriesForGender(taxonomy, gender);

  const goTo = (category: PostCategory) => {
    onSelect();
    navigate({
      to: "/explore",
      search: { department, categories: [category] },
    });
  };

  if (categories.length === 0) return null;

  return (
    <div className={styles.grid}>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={styles.leaf}
          onClick={() => goTo(category)}
        >
          {categoryLabel(tListings, taxonomy, category)}
        </button>
      ))}
      <button type="button" className={styles.viewAll} onClick={onViewAll}>
        {t("departments.viewAll", { department: label })}
        <IconArrowRight size={16} stroke={1.5} />
      </button>
    </div>
  );
}
