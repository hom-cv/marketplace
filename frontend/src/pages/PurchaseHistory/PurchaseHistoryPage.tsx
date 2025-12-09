import { Title, Text, Stack, Card, Center, ThemeIcon } from "@mantine/core";
import { IconShoppingBag } from "@tabler/icons-react";

export function PurchaseHistoryPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Purchase History</Title>
        <Text c="dimmed">View all your past purchases.</Text>
      </div>

      <Center py="xl">
        <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
          <Stack align="center" gap="md">
            <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
              <IconShoppingBag size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>No purchases yet</Text>
              <Text size="sm" c="dimmed">
                When you buy items from the marketplace, they'll appear here.
              </Text>
            </div>
          </Stack>
        </Card>
      </Center>
    </Stack>
  );
}
