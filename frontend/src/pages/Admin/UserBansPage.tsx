import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Table,
  Badge,
  Button,
  Group,
  Switch,
  Center,
  Loader,
  Alert,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconUserOff,
  IconAlertCircle,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react";
import { getUserBans, banUser, liftUserBan } from "@/api/admin";
import { EmptyStateCard } from "@/components/EmptyStateCard";

export function UserBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [userId, setUserId] = useState<number | "">("");
  const [reason, setReason] = useState("");

  const { data: bansData, isLoading, error } = useQuery({
    queryKey: ["admin-user-bans", activeOnly],
    queryFn: () => getUserBans(activeOnly),
  });

  const banMutation = useMutation({
    mutationFn: () => banUser({ user_id: userId as number, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      close();
      setUserId("");
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: (banId: number) => liftUserBan(banId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : "Failed to load user bans"}
      </Alert>
    );
  }

  const bans = bansData?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">User Bans</Title>
        <Text c="dimmed">Manage banned users and create new bans.</Text>
      </div>

      <Group justify="space-between">
        <Group>
          <Switch
            label="Active only"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          />
          <Text size="sm" c="dimmed">
            {bansData?.total ?? 0} total bans
          </Text>
        </Group>
        <Button
          leftSection={<IconPlus size={16} />}
          color="red"
          onClick={open}
        >
          Ban User
        </Button>
      </Group>

      {bans.length === 0 ? (
        <EmptyStateCard
          icon={<IconUserOff size={24} />}
          title="No user bans"
          description={activeOnly ? "No active bans found." : "No bans found."}
        />
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Banned By</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bans.map((ban) => (
                <Table.Tr key={ban.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{ban.username}</Text>
                    <Text size="xs" c="dimmed">ID: {ban.user_id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>{ban.reason}</Text>
                  </Table.Td>
                  <Table.Td>{ban.banned_by_username}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(ban.created_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={ban.is_active ? "red" : "gray"} variant="light">
                      {ban.is_active ? "Active" : "Lifted"}
                    </Badge>
                    {ban.lifted_at && (
                      <Text size="xs" c="dimmed">
                        by {ban.lifted_by_username}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {ban.is_active && (
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        leftSection={<IconCheck size={14} />}
                        onClick={() => liftMutation.mutate(ban.id)}
                        loading={liftMutation.isPending}
                      >
                        Lift Ban
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal opened={opened} onClose={close} title="Ban User" centered>
        <Stack gap="md">
          <NumberInput
            label="User ID"
            placeholder="Enter user ID to ban"
            value={userId}
            onChange={(val) => setUserId(typeof val === "number" ? val : "")}
            min={1}
            required
          />
          <Textarea
            label="Reason"
            placeholder="Reason for banning this user..."
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            minLength={5}
            maxLength={500}
            rows={3}
            required
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={close}>Cancel</Button>
            <Button
              color="red"
              onClick={() => banMutation.mutate()}
              loading={banMutation.isPending}
              disabled={!userId || reason.length < 5}
            >
              Ban User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
