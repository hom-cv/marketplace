import { Text, Paper, Group } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";

interface UserCardProps {
  username: string;
  label: string;
}

export function UserCard({ username, label }: UserCardProps) {
  return (
    <Paper withBorder p="xs" radius="sm">
      <Group gap={4} mb={4}>
        <IconUser size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" fw={600} c="dimmed">{label}</Text>
      </Group>
      <Text size="xs">@{username}</Text>
    </Paper>
  );
}
