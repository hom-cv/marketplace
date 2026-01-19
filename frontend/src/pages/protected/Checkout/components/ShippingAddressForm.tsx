/**
 * ShippingAddressForm - Shipping address step
 */

import { Paper, Title, Stack, Group, TextInput, Button } from "@mantine/core";
import { IconTruck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { UseFormReturnType } from "@mantine/form";
import type { ShippingAddress } from "@/api/types/payment";

interface ShippingAddressFormProps {
  form: UseFormReturnType<ShippingAddress>;
  onSubmit: () => void;
}

export function ShippingAddressForm({ form, onSubmit }: ShippingAddressFormProps) {
  const { t } = useTranslation("common");

  return (
    <Paper withBorder p="xl" radius="md">
      <Title order={4} mb="lg">{t("checkout.shippingAddress")}</Title>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label={t("checkout.recipientName")}
              placeholder={t("checkout.namePlaceholder")}
              size="md"
              {...form.getInputProps("name")}
            />
            <TextInput
              label={t("checkout.form.phone")}
              placeholder={t("checkout.phonePlaceholder")}
              size="md"
              {...form.getInputProps("phone")}
            />
          </Group>
          <TextInput
            label={t("checkout.form.address")}
            placeholder={t("checkout.addressPlaceholder")}
            size="md"
            {...form.getInputProps("address")}
          />
          <Group grow>
            <TextInput
              label={t("checkout.form.district")}
              placeholder={t("checkout.districtPlaceholder")}
              size="md"
              {...form.getInputProps("district")}
            />
            <TextInput
              label={t("checkout.form.province")}
              placeholder={t("checkout.provincePlaceholder")}
              size="md"
              {...form.getInputProps("province")}
            />
          </Group>
          <TextInput
            label={t("checkout.form.postalCode")}
            placeholder={t("checkout.postalPlaceholder")}
            maxLength={5}
            size="md"
            w={180}
            {...form.getInputProps("postal_code")}
          />
          <Button type="submit" size="lg" mt="md" rightSection={<IconTruck size={18} />}>
            {t("checkout.continueToPayment")}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
