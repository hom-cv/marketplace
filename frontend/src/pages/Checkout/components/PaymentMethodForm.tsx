/**
 * PaymentMethodForm - Payment method selection and card/promptpay forms
 */

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
} from "@mantine/core";
import { IconCreditCard, IconQrcode } from "@tabler/icons-react";
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
  return (
    <Stack gap="lg">
      {/* Address confirmation */}
      <Paper withBorder p="lg" radius="md" bg="gray.0">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={600}>Ship to:</Text>
          <Button size="xs" variant="subtle" onClick={onEditShipping}>
            Edit
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
        <Title order={4} mb="lg">Payment Method</Title>

        <SegmentedControl
          value={paymentMethod}
          onChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
          data={[
            {
              value: "card",
              label: (
                <Center>
                  <IconCreditCard size={18} />
                  <Text ml="xs">Credit Card</Text>
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
              label="Cardholder Name"
              placeholder="Name on card"
              size="md"
              {...cardForm.getInputProps("name")}
            />
            <TextInput
              label="Card Number"
              placeholder="4242 4242 4242 4242"
              size="md"
              {...cardForm.getInputProps("number")}
            />
            <Group grow>
              <TextInput
                label="Exp. Month"
                placeholder="MM"
                size="md"
                maxLength={2}
                {...cardForm.getInputProps("expMonth")}
              />
              <TextInput
                label="Exp. Year"
                placeholder="YY"
                size="md"
                maxLength={4}
                {...cardForm.getInputProps("expYear")}
              />
              <TextInput
                label="CVV"
                placeholder="123"
                size="md"
                maxLength={4}
                {...cardForm.getInputProps("cvv")}
              />
            </Group>
            <Button
              size="lg"
              mt="md"
              onClick={onCardSubmit}
              loading={isCardLoading}
              disabled={!cardForm.isValid()}
            >
              Pay ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Button>
          </Stack>
        )}

        {/* PromptPay button */}
        {paymentMethod === "promptpay" && (
          <Button
            size="lg"
            fullWidth
            onClick={onPromptPaySubmit}
            loading={isPromptPayLoading}
          >
            Generate QR Code - ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
