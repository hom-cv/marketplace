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
  /** Override the submit button / helper text (defaults to create labels). */
  submitLabel?: string;
  submittingLabel?: string;
  helperText?: string;
}

export function ListingSidebar({
  price,
  shippingCost,
  isPending,
  isFormValid,
  submitLabel,
  submittingLabel,
  helperText,
}: ListingSidebarProps) {
  const { t } = useTranslation("listings");

  const showEarnings = typeof price === "number" && price > 0;
  const idleLabel = submitLabel ?? t("create.form.submit");
  const busyLabel = submittingLabel ?? t("create.form.submitting");
  const hint = helperText ?? t("create.form.publishHint");

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
        {isPending ? busyLabel : idleLabel}
      </Button>

      {/* Helper text */}
      <p className={styles.helperText}>
        {hint}
      </p>
    </Stack>
  );
}
