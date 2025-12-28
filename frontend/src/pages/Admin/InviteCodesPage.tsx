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
  Select,
  NumberInput,
  Center,
  Loader,
  Alert,
  Paper,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { getInvites, generateInvites, revokeInvite } from "@/api/admin";
import type { InviteStatus } from "@/api/types/admin";
import { EmptyStateCard } from "@/components/EmptyStateCard";

const STATUS_COLORS: Record<InviteStatus, string> = {
  active: "green",
  used: "blue",
  revoked: "red",
};

export function InviteCodesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState<number>(1);

  const { data: invitesData, isLoading, error } = useQuery({
    queryKey: ["admin-invites", statusFilter],
    queryFn: () => getInvites(statusFilter || undefined),
  });

  const generateMutation = useMutation({
    mutationFn: (count: number) => generateInvites(count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
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
        {error instanceof Error ? error.message : "Failed to load invite codes"}
      </Alert>
    );
  }

  const invites = invitesData?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Invite Codes</Title>
        <Text c="dimmed">Generate and manage seller invite codes.</Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Group>
          <NumberInput
            value={generateCount}
            onChange={(val) => setGenerateCount(typeof val === "number" ? val : 1)}
            min={1}
            max={50}
            w={100}
            label="Count"
          />
          <Button
            leftSection={<IconPlus size={16} />}
            color="orange"
            onClick={() => generateMutation.mutate(generateCount)}
            loading={generateMutation.isPending}
            mt="auto"
          >
            Generate Codes
          </Button>
        </Group>
      </Paper>

      <Group>
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "", label: "All" },
            { value: "active", label: "Active" },
            { value: "used", label: "Used" },
            { value: "revoked", label: "Revoked" },
          ]}
          clearable
          w={200}
        />
        <Text size="sm" c="dimmed">
          {invitesData?.total ?? 0} total codes
        </Text>
      </Group>

      {invites.length === 0 ? (
        <EmptyStateCard
          icon={<IconPlus size={24} />}
          title="No invite codes"
          description="Generate invite codes to allow new sellers to register."
        />
      ) : (
        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Created By</Table.Th>
                <Table.Th>Used By</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invites.map((invite) => (
                <Table.Tr key={invite.code}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text ff="monospace" size="sm">{invite.code}</Text>
                      <CopyButton value={invite.code}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Copied" : "Copy"}>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color={copied ? "green" : "gray"}
                              onClick={copy}
                            >
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLORS[invite.status]} variant="light">
                      {invite.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(invite.created_date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>{invite.created_by_username || "-"}</Table.Td>
                  <Table.Td>
                    {invite.used_by_username || "-"}
                    {invite.used_at && (
                      <Text size="xs" c="dimmed">
                        {new Date(invite.used_at).toLocaleDateString()}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {invite.status === "active" && (
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconX size={14} />}
                        onClick={() => revokeMutation.mutate(invite.code)}
                        loading={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
