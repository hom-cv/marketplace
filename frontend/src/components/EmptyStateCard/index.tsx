import { Text, Card, Center, Stack, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function EmptyStateCard({ icon, title, description }: EmptyStateCardProps) {
  return (
    <Center py="xl">
      <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
        <Stack align="center" gap="md">
          <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
            {icon}
          </ThemeIcon>
          <div>
            <Text fw={500}>{title}</Text>
            <Text size="sm" c="dimmed">{description}</Text>
          </div>
        </Stack>
      </Card>
    </Center>
  );
}
