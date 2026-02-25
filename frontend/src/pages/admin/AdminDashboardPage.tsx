import { useQuery } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  Group,
  Loader,
  ThemeIcon,
} from "@mantine/core";
import {
  IconFlag,
  IconUserOff,
  IconPackageOff,
} from "@tabler/icons-react";
import { getAdminStats } from "@/api/admin";
import { Alert } from "@/components/Alert";
import styles from "./AdminDashboardPage.module.css";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <ThemeIcon size="xl" radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error instanceof Error ? error.message : "Failed to load admin stats"}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Admin Dashboard</Title>
        <Text c="dimmed">Overview of moderation and management activities.</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatCard
          title="Pending Reports"
          value={stats?.pending_reports ?? 0}
          icon={<IconFlag size={24} />}
          color="orange"
        />
        <StatCard
          title="Active User Bans"
          value={stats?.active_user_bans ?? 0}
          icon={<IconUserOff size={24} />}
          color="red"
        />
        <StatCard
          title="Active Post Bans"
          value={stats?.active_post_bans ?? 0}
          icon={<IconPackageOff size={24} />}
          color="grape"
        />
      </SimpleGrid>
    </Stack>
  );
}
