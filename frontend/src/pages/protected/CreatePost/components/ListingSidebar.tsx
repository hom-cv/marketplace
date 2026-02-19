/**
 * ListingSidebar - Earnings preview and submit button
 * Sticky sidebar on desktop with premium publish button
 */

import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { EarningsPreview } from "@/components/EarningsPreview";
import styles from "./ListingSidebar.module.css";

interface ListingSidebarProps {
  price: number | "";
  shippingCost: number | "";
  isPending: boolean;
  isFormValid: boolean;
}

export function ListingSidebar({
  price,
  shippingCost,
  isPending,
  isFormValid,
}: ListingSidebarProps) {
  const { t } = useTranslation("listings");

  const showEarnings = typeof price === "number" && price > 0;

  return (
    <div className={styles.container}>
      {/* Earnings Preview */}
      {showEarnings && (
        <div className={styles.earningsCard}>
          <EarningsPreview
            itemPrice={price}
            shippingCost={(shippingCost as number) || 0}
          />
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={!isFormValid || isPending}
        className={styles.submitButton}
      >
        {isPending ? t("create.form.submitting") : t("create.form.submit")}
      </Button>

      {/* Helper text */}
      <p className={styles.helperText}>
        {t("create.form.publishHint")}
      </p>
    </div>
  );
}
