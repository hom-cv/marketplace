import { Title, Text, Stack, Card, Center, ThemeIcon } from "@mantine/core";
import { IconReceipt } from "@tabler/icons-react";

export function SoldListingsPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Sold Listings</Title>
        <Text c="dimmed">Track your completed sales.</Text>
      </div>

      <Center py="xl">
        <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
          <Stack align="center" gap="md">
            <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
              <IconReceipt size={24} />
            </ThemeIcon>
            <div>
              <Text fw={500}>No sales yet</Text>
              <Text size="sm" c="dimmed">
                When you sell items, they'll appear here.
              </Text>
            </div>
          </Stack>
        </Card>
      </Center>
    </Stack>
  );
}
