import { TextInput, SimpleGrid } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { UseFormReturnType } from "@mantine/form";
import type { ShippingAddress } from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface ShippingFormProps {
  form: UseFormReturnType<ShippingAddress>;
  onSubmit: () => void;
}

export function ShippingForm({ form, onSubmit }: ShippingFormProps) {
  const { t } = useTranslation("common");

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{t("checkout.shippingAddress")}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className={styles.formRow}>
          <TextInput
            label={t("checkout.recipientName")}
            placeholder={t("checkout.namePlaceholder")}
            radius="xs"
            {...form.getInputProps("name")}
          />
          <TextInput
            label={t("checkout.form.phone")}
            placeholder={t("checkout.phonePlaceholder")}
            radius="xs"
            {...form.getInputProps("phone")}
          />
          <TextInput
            label={t("checkout.form.address")}
            placeholder={t("checkout.addressPlaceholder")}
            radius="xs"
            {...form.getInputProps("address")}
          />
          <TextInput
            label={t("checkout.form.district")}
            placeholder={t("checkout.districtPlaceholder")}
            radius="xs"
            {...form.getInputProps("district")}
          />
          <SimpleGrid cols={2}>
            <TextInput
              label={t("checkout.form.province")}
              placeholder={t("checkout.provincePlaceholder")}
              radius="xs"
              {...form.getInputProps("province")}
            />
            <TextInput
              label={t("checkout.form.postalCode")}
              placeholder={t("checkout.postalPlaceholder")}
              maxLength={5}
              radius="xs"
              {...form.getInputProps("postal_code")}
            />
          </SimpleGrid>
          <button type="submit" className={styles.primaryButton}>
            {t("checkout.continueToPayment")}
            <IconArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
