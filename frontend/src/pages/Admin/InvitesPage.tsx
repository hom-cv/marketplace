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
  NumberInput,
  ActionIcon,
  Tooltip,
  Select,
  Alert,
} from "@mantine/core";
import { IconPlus, IconX, IconCopy, IconCheck } from "@tabler/icons-react";
import { generateInvites, listInvites, revokeInvite } from "@/api/admin";
import type { InviteResponse } from "@/api/types/admin";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "green",
    used: "blue",
    revoked: "red",
  };
  return <Badge color={colors[status] || "gray"}>{status}</Badge>;
}

export function InvitesPage() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invites", statusFilter],
    queryFn: () => listInvites({ status: statusFilter as 'active' | 'used' | 'revoked' | undefined }),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateInvites({ count }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
        {error instanceof Error ? error.message : "Failed to load invites"}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Invite Codes</Title>
        <Text c="dimmed">Generate and manage seller invite codes</Text>
      </div>

      <Paper p="md" withBorder>
        <Group>
          <NumberInput
            value={count}
            onChange={(val) => setCount(Number(val) || 1)}
            min={1}
            max={50}
            label="Number of codes"
            w={150}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
            mt={24}
          >
            Generate Codes
          </Button>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>All Invite Codes</Title>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: "active", label: "Active" },
              { value: "used", label: "Used" },
              { value: "revoked", label: "Revoked" },
            ]}
            clearable
            w={150}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Created By</Table.Th>
              <Table.Th>Used By</Table.Th>
              <Table.Th>Created At</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.items.map((invite: InviteResponse) => (
              <Table.Tr key={invite.code}>
                <Table.Td>
                  <Group gap="xs">
                    <code>{invite.code}</code>
                    <Tooltip label={copiedCode === invite.code ? "Copied!" : "Copy"}>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => copyToClipboard(invite.code)}
                      >
                        {copiedCode === invite.code ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={invite.status} />
                </Table.Td>
                <Table.Td>{invite.created_by_username || "-"}</Table.Td>
                <Table.Td>{invite.used_by_username || "-"}</Table.Td>
                <Table.Td>{new Date(invite.created_date).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  {invite.status === "active" && (
                    <Tooltip label="Revoke">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => revokeMutation.mutate(invite.code)}
                        loading={revokeMutation.isPending}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {data?.items.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No invite codes found
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
