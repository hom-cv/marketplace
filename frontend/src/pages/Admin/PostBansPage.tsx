import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Button,
  Table,
  Badge,
  Loader,
  Center,
  Switch,
  Alert,
  Modal,
  Textarea,
  NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconCheck } from "@tabler/icons-react";
import { listPostBans, banPost, liftPostBan } from "@/api/admin";
import type { PostBanResponse } from "@/api/types/admin";

export function PostBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [postId, setPostId] = useState<number | undefined>();
  const [reason, setReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["postBans", activeOnly],
    queryFn: () => listPostBans({ active_only: activeOnly }),
  });

  const banMutation = useMutation({
    mutationFn: () => banPost({ post_id: postId!, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postBans"] });
      close();
      setPostId(undefined);
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: liftPostBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postBans"] });
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
      <Alert color="red" title="Error">
        {error instanceof Error ? error.message : "Failed to load bans"}
      </Alert>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <div>
          <Title order={2}>Listing Bans</Title>
          <Text c="dimmed">Manage banned listings</Text>
        </div>

        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <Title order={4}>All Listing Bans ({data?.total || 0})</Title>
              <Switch
                label="Active only"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.currentTarget.checked)}
              />
            </Group>
            <Button leftSection={<IconPlus size={16} />} onClick={open}>
              Ban Listing
            </Button>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Listing</Table.Th>
                <Table.Th>Seller</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Banned By</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.items.map((ban: PostBanResponse) => (
                <Table.Tr key={ban.id}>
                  <Table.Td>
                    <Text fw={500} lineClamp={1} maw={200}>
                      {ban.post_title}
                    </Text>
                  </Table.Td>
                  <Table.Td>{ban.seller_username}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1} maw={200}>
                      {ban.reason}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={ban.is_active ? "red" : "gray"}>
                      {ban.is_active ? "Active" : "Lifted"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{ban.banned_by_username}</Table.Td>
                  <Table.Td>{new Date(ban.created_date).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    {ban.is_active && (
                      <Button
                        size="xs"
                        variant="subtle"
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

          {data?.items.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              No listing bans found
            </Text>
          )}
        </Paper>
      </Stack>

      <Modal opened={opened} onClose={close} title="Ban Listing">
        <Stack>
          <NumberInput
            label="Listing ID"
            placeholder="Enter listing ID to ban"
            value={postId}
            onChange={(val) => setPostId(Number(val) || undefined)}
            required
          />
          <Textarea
            label="Reason"
            placeholder="Reason for banning this listing..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => banMutation.mutate()}
              loading={banMutation.isPending}
              disabled={!postId || reason.length < 5}
            >
              Ban Listing
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
