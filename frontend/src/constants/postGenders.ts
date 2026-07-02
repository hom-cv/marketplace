// Translated gender labels for the create/edit form select.

import type { Gender } from "@/api/types/post";

export function getGenderLabels(t: (key: string) => string): Record<Gender, string> {
  return {
    MENS: t("genders.mens"),
    WOMENS: t("genders.womens"),
    UNISEX: t("genders.unisex"),
  };
}
