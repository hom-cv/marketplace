import { useQuery } from "@tanstack/react-query";
import { Title, Text, SimpleGrid, Paper, Group, Badge, Stack, Loader, Center } from "@mantine/core";
import { IconFlag, IconUserOff, IconBan } from "@tabler/icons-react";
import { getAdminStats } from "@/api/admin";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Paper p="lg" radius="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
        </div>
        <Badge
          size="xl"
          radius="md"
          variant="light"
          color={color}
          styles={{ root: { padding: 12 } }}
        >
          {icon}
        </Badge>
      </Group>
    </Paper>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["adminStats"],
    queryFn: getAdminStats,
  });

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h={400}>
        <Text c="red">{error instanceof Error ? error.message : "Failed to load stats"}</Text>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Admin Dashboard</Title>
        <Text c="dimmed">Manage your marketplace</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
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
          title="Active Listing Bans"
          value={stats?.active_post_bans ?? 0}
          icon={<IconBan size={24} />}
          color="pink"
        />
      </SimpleGrid>

      <Paper p="lg" radius="md" withBorder>
        <Title order={4} mb="md">Quick Actions</Title>
        <Text c="dimmed">
          Use the sidebar to navigate to different admin sections:
        </Text>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><strong>Invite Codes</strong> — Generate and manage seller invite codes</li>
          <li><strong>Reports</strong> — Review user and listing reports</li>
          <li><strong>User Bans</strong> — Ban or unban users</li>
          <li><strong>Listing Bans</strong> — Ban or unban specific listings</li>
        </ul>
      </Paper>
    </Stack>
  );
}

