/**
 * ListingSidebar - Earnings preview and submit button
 * Sticky sidebar on desktop with premium publish button
 */

import { Stack } from "@mantine/core";
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
    <Stack gap="md">
      {/* Earnings Preview */}
      {showEarnings && (
        <EarningsPreview
          itemPrice={price}
          shippingCost={typeof shippingCost === "number" ? shippingCost : 0}
        />
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
    </Stack>
  );
}
