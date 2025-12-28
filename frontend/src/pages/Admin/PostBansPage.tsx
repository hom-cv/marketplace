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
  Textarea,
  NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPackageOff,
  IconAlertCircle,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react";
import { getPostBans, banPost, liftPostBan } from "@/api/admin";
import { EmptyStateCard } from "@/components/EmptyStateCard";

export function PostBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [postId, setPostId] = useState<number | "">("");
  const [reason, setReason] = useState("");

  const { data: bansData, isLoading, error } = useQuery({
    queryKey: ["admin-post-bans", activeOnly],
    queryFn: () => getPostBans(activeOnly),
  });

  const banMutation = useMutation({
    mutationFn: () => banPost({ post_id: postId as number, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      close();
      setPostId("");
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: (banId: number) => liftPostBan(banId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-bans"] });
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
        {error instanceof Error ? error.message : "Failed to load post bans"}
      </Alert>
    );
  }

  const bans = bansData?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Post Bans</Title>
        <Text c="dimmed">Manage banned listings and create new bans.</Text>
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
          color="grape"
          onClick={open}
        >
          Ban Post
        </Button>
      </Group>

      {bans.length === 0 ? (
        <EmptyStateCard
          icon={<IconPackageOff size={24} />}
          title="No post bans"
          description={activeOnly ? "No active bans found." : "No bans found."}
        />
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Post</Table.Th>
                <Table.Th>Seller</Table.Th>
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
                    <Text size="sm" fw={500} lineClamp={1}>{ban.post_title}</Text>
                    <Text size="xs" c="dimmed">ID: {ban.post_id}</Text>
                  </Table.Td>
                  <Table.Td>{ban.seller_username}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>{ban.reason}</Text>
                  </Table.Td>
                  <Table.Td>{ban.banned_by_username}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(ban.created_date).toLocaleDateString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={ban.is_active ? "grape" : "gray"} variant="light">
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

      <Modal opened={opened} onClose={close} title="Ban Post" centered>
        <Stack gap="md">
          <NumberInput
            label="Post ID"
            placeholder="Enter post ID to ban"
            value={postId}
            onChange={(val) => setPostId(typeof val === "number" ? val : "")}
            min={1}
            required
          />
          <Textarea
            label="Reason"
            placeholder="Reason for banning this post..."
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
              color="grape"
              onClick={() => banMutation.mutate()}
              loading={banMutation.isPending}
              disabled={!postId || reason.length < 5}
            >
              Ban Post
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
