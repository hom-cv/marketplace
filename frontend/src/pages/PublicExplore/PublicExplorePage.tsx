/**
 * PublicExplorePage - Browse listings without authentication
 * Uses shared ExploreLayout component
 */

import { useTranslation } from "react-i18next";
import { ExploreLayout } from "@/components/ExploreLayout";

export function PublicExplorePage() {
  const { t } = useTranslation("explore");

  return (
    <ExploreLayout
      isPublic
      queryKeyPrefix={["public"]}
      subtitle={t("subtitle")}
    />
  );
}
