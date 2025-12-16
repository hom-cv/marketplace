/**
 * ShippingAddressForm - Shipping address step
 */

import { Paper, Title, Stack, Group, TextInput, Button } from "@mantine/core";
import { IconTruck } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { ShippingAddress } from "@/api/types/payment";

interface ShippingAddressFormProps {
  form: UseFormReturnType<ShippingAddress>;
  onSubmit: () => void;
}

export function ShippingAddressForm({ form, onSubmit }: ShippingAddressFormProps) {
  return (
    <Paper withBorder p="xl" radius="md">
      <Title order={4} mb="lg">Shipping Address</Title>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Recipient Name"
              placeholder="Name for delivery"
              size="md"
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Phone"
              placeholder="08X-XXX-XXXX"
              size="md"
              {...form.getInputProps("phone")}
            />
          </Group>
          <TextInput
            label="Address"
            placeholder="Street, building, room number"
            size="md"
            {...form.getInputProps("address")}
          />
          <Group grow>
            <TextInput
              label="District"
              placeholder="District/Subdistrict"
              size="md"
              {...form.getInputProps("district")}
            />
            <TextInput
              label="Province"
              placeholder="Province"
              size="md"
              {...form.getInputProps("province")}
            />
          </Group>
          <TextInput
            label="Postal Code"
            placeholder="10XXX"
            maxLength={5}
            size="md"
            w={180}
            {...form.getInputProps("postal_code")}
          />
          <Button type="submit" size="lg" mt="md" rightSection={<IconTruck size={18} />}>
            Continue to Payment
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
