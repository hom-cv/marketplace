/**
 * PaymentMethodForm - Payment method selection and card/promptpay forms
 */

import { Link } from "@tanstack/react-router";
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Button,
  SegmentedControl,
  Center,
  Anchor,
  Alert,
} from "@mantine/core";
import { IconCreditCard, IconQrcode, IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { UseFormReturnType } from "@mantine/form";
import type { ShippingAddress } from "@/api/types/payment";

type PaymentMethod = "card" | "promptpay";

interface CardFormValues {
  name: string;
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

interface PaymentMethodFormProps {
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cardForm: UseFormReturnType<CardFormValues>;
  onCardSubmit: () => void;
  onPromptPaySubmit: () => void;
  onEditShipping: () => void;
  total: number;
  isCardLoading: boolean;
  isPromptPayLoading: boolean;
}

export function PaymentMethodForm({
  shippingAddress,
  paymentMethod,
  onPaymentMethodChange,
  cardForm,
  onCardSubmit,
  onPromptPaySubmit,
  onEditShipping,
  total,
  isCardLoading,
  isPromptPayLoading,
}: PaymentMethodFormProps) {
  const { t } = useTranslation("common");
  const { t: tPolicies } = useTranslation("policies");
  const formatAmount = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Stack gap="lg">
      {/* Address confirmation */}
      <Paper withBorder p="lg" radius="md" bg="gray.0">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={600}>{t("checkout.shipToLabel")}</Text>
          <Button size="xs" variant="subtle" onClick={onEditShipping}>
            {t("buttons.edit")}
          </Button>
        </Group>
        <Text size="sm" fw={500}>{shippingAddress.name}</Text>
        <Text size="xs" c="dimmed">{shippingAddress.phone}</Text>
        <Text size="xs">{shippingAddress.address}</Text>
        <Text size="xs">
          {shippingAddress.district}, {shippingAddress.province} {shippingAddress.postal_code}
        </Text>
      </Paper>

      <Paper withBorder p="xl" radius="md">
        <Title order={4} mb="lg">{t("checkout.paymentMethod")}</Title>

        <SegmentedControl
          value={paymentMethod}
          onChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
          data={[
            {
              value: "card",
              label: (
                <Center>
                  <IconCreditCard size={18} />
                  <Text ml="xs">{t("checkout.creditCard")}</Text>
                </Center>
              ),
            },
            {
              value: "promptpay",
              label: (
                <Center>
                  <IconQrcode size={18} />
                  <Text ml="xs">PromptPay</Text>
                </Center>
              ),
            },
          ]}
          fullWidth
          size="md"
          mb="lg"
        />

        {/* Card form */}
        {paymentMethod === "card" && (
          <Stack gap="md">
            <TextInput
              label={t("checkout.cardholderName")}
              placeholder={t("checkout.nameOnCard")}
              size="md"
              {...cardForm.getInputProps("name")}
            />
            <TextInput
              label={t("checkout.cardNumber")}
              placeholder={t("checkout.cardPlaceholder")}
              size="md"
              {...cardForm.getInputProps("number")}
            />
            <Group grow>
              <TextInput
                label={t("checkout.expMonth")}
                placeholder="MM"
                size="md"
                maxLength={2}
                {...cardForm.getInputProps("expMonth")}
              />
              <TextInput
                label={t("checkout.expYear")}
                placeholder="YY"
                size="md"
                maxLength={4}
                {...cardForm.getInputProps("expYear")}
              />
              <TextInput
                label={t("checkout.cvv")}
                placeholder="123"
                size="md"
                maxLength={4}
                {...cardForm.getInputProps("cvv")}
              />
            </Group>
          </Stack>
        )}

        {/* Refund Policy Notice */}
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="blue"
          variant="light"
          mt="lg"
          mb="md"
        >
          <Text size="sm">
            {tPolicies("checkout.refundNotice")}{" "}
            <Anchor component={Link} to="/terms" target="_blank" size="sm">
              {tPolicies("checkout.refundPolicyLink")}
            </Anchor>
          </Text>
        </Alert>

        {/* Payment buttons */}
        {paymentMethod === "card" && (
          <Button
            size="lg"
            fullWidth
            onClick={onCardSubmit}
            loading={isCardLoading}
            disabled={!cardForm.isValid()}
          >
            {t("checkout.payAmount", { amount: formatAmount(total) })}
          </Button>
        )}

        {paymentMethod === "promptpay" && (
          <Button
            size="lg"
            fullWidth
            onClick={onPromptPaySubmit}
            loading={isPromptPayLoading}
          >
            {t("checkout.generateQR", { amount: formatAmount(total) })}
          </Button>
        )}

        {/* Policy acknowledgment text */}
        <Text size="xs" c="dimmed" ta="center" mt="md">
          {tPolicies("checkout.paymentAcknowledgment")}{" "}
          <Anchor component={Link} to="/terms" target="_blank" size="xs">
            {tPolicies("nav.terms")}
          </Anchor>
          {" "}&{" "}
          <Anchor component={Link} to="/privacy" target="_blank" size="xs">
            {tPolicies("nav.privacy")}
          </Anchor>
        </Text>
      </Paper>
    </Stack>
  );
}
