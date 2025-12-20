import { Text, Paper, Group, Stack } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

interface ShippingAddressCardProps {
  name: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  label?: string;
}

export function ShippingAddressCard({
  name,
  phone,
  address,
  district,
  province,
  postalCode,
  label = "Ship To",
}: ShippingAddressCardProps) {
  return (
    <Paper withBorder p="xs" radius="sm">
      <Group gap={4} mb={4}>
        <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" fw={600} c="dimmed">{label}</Text>
      </Group>
      <Stack gap={0}>
        <Text size="xs" fw={500}>{name}</Text>
        {phone && <Text size="xs" c="dimmed">{phone}</Text>}
        {address && <Text size="xs">{address}</Text>}
        {(district || province || postalCode) && (
          <Text size="xs">
            {[district, province, postalCode].filter(Boolean).join(", ")}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
