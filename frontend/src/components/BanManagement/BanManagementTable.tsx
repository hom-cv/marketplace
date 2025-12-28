import { ReactNode } from "react";
import { BanEntityType } from "./types";
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
} from "@mantine/core";
import { IconPlus, IconCheck } from "@tabler/icons-react";

interface BaseBan {
  id: number;
  reason: string;
  is_active: boolean;
  banned_by_username: string;
  created_date: string;
}

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

interface BanManagementTableProps<T extends BaseBan> {
  /** The entity type being banned */
  entityType: BanEntityType;

  // Data
  items: T[] | undefined;
  total: number;
  isLoading: boolean;
  error: Error | null;

  // Filtering
  activeOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;

  // Table columns (custom columns before reason)
  columns: Column<T>[];

  // Actions
  onCreateClick: () => void;
  onLiftBan: (banId: number) => void;
  isLiftingBan: boolean;
}

export function BanManagementTable<T extends BaseBan>({
  entityType,
  items,
  total,
  isLoading,
  error,
  activeOnly,
  onActiveOnlyChange,
  columns,
  onCreateClick,
  onLiftBan,
  isLiftingBan,
}: BanManagementTableProps<T>) {
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
        {error.message || `Failed to load ${entityType.toLowerCase()} bans`}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{entityType} Bans</Title>
        <Text c="dimmed">Manage banned {entityType.toLowerCase()}s</Text>
      </div>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <Title order={4}>
              All {entityType} Bans ({total})
            </Title>
            <Switch
              label="Active only"
              checked={activeOnly}
              onChange={(e) => onActiveOnlyChange(e.currentTarget.checked)}
            />
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={onCreateClick}>
            Ban {entityType}
          </Button>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.key}>{col.label}</Table.Th>
              ))}
              <Table.Th>Reason</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Banned By</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items?.map((ban) => (
              <Table.Tr key={ban.id}>
                {columns.map((col) => (
                  <Table.Td key={col.key}>{col.render(ban)}</Table.Td>
                ))}
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
                <Table.Td>
                  {new Date(ban.created_date).toLocaleDateString()}
                </Table.Td>
                <Table.Td>
                  {ban.is_active && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="green"
                      leftSection={<IconCheck size={14} />}
                      onClick={() => onLiftBan(ban.id)}
                      loading={isLiftingBan}
                    >
                      Lift Ban
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {items?.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No {entityType.toLowerCase()} bans found
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
