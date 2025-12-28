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
  Select,
  Alert,
  Modal,
  Textarea,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconX, IconEye, IconBan, IconUserOff } from "@tabler/icons-react";
import { listReports, reviewReport, banUser, banPost } from "@/api/admin";
import type { ReportResponse, ReportStatus } from "@/api/types/admin";

function StatusBadge({ status }: { status: ReportStatus }) {
  const colors: Record<ReportStatus, string> = {
    pending: "yellow",
    reviewed: "blue",
    resolved: "green",
    dismissed: "gray",
  };
  return <Badge color={colors[status]}>{status}</Badge>;
}

function ReasonBadge({ reason }: { reason: string }) {
  const colors: Record<string, string> = {
    counterfeit: "red",
    abuse_of_system: "orange",
    prohibited_item: "pink",
    scam: "grape",
  };
  return <Badge variant="light" color={colors[reason] || "gray"}>{reason.replace(/_/g, " ")}</Badge>;
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>("pending");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportResponse | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [banSuccess, setBanSuccess] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", statusFilter, typeFilter],
    queryFn: () => listReports({
      status: statusFilter as ReportStatus | undefined,
      type: typeFilter as 'user' | 'post' | undefined,
    }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'reviewed' | 'resolved' | 'dismissed' }) =>
      reviewReport(id, { status, admin_notes: reviewNotes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      close();
      setSelectedReport(null);
      setReviewNotes("");
      setBanSuccess(null);
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      banUser({ user_id: userId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBans"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setBanSuccess("User has been banned successfully.");
    },
  });

  const banPostMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: number; reason: string }) =>
      banPost({ post_id: postId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postBans"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setBanSuccess("Listing has been banned successfully.");
    },
  });

  const openReview = (report: ReportResponse) => {
    setSelectedReport(report);
    setReviewNotes(report.admin_notes || "");
    setBanSuccess(null);
    open();
  };

  const handleBanUser = () => {
    if (!selectedReport?.reported_user_id) return;
    const reason = `Report #${selectedReport.id}: ${selectedReport.reason} - ${selectedReport.description}`;
    banUserMutation.mutate({ userId: selectedReport.reported_user_id, reason });
  };

  const handleBanPost = () => {
    if (!selectedReport?.reported_post_id) return;
    const reason = `Report #${selectedReport.id}: ${selectedReport.reason} - ${selectedReport.description}`;
    banPostMutation.mutate({ postId: selectedReport.reported_post_id, reason });
  };

  const handleCloseModal = () => {
    close();
    setSelectedReport(null);
    setReviewNotes("");
    setBanSuccess(null);
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
        {error instanceof Error ? error.message : "Failed to load reports"}
      </Alert>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <div>
          <Title order={2}>Reports</Title>
          <Text c="dimmed">Review and manage user/listing reports</Text>
        </div>

        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>All Reports ({data?.total || 0})</Title>
            <Group>
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: "pending", label: "Pending" },
                  { value: "reviewed", label: "Reviewed" },
                  { value: "resolved", label: "Resolved" },
                  { value: "dismissed", label: "Dismissed" },
                ]}
                clearable
                w={130}
              />
              <Select
                placeholder="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                data={[
                  { value: "user", label: "User" },
                  { value: "post", label: "Listing" },
                ]}
                clearable
                w={130}
              />
            </Group>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Target</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.items.map((report: ReportResponse) => (
                <Table.Tr key={report.id}>
                  <Table.Td>
                    <Badge variant="outline">{report.report_type}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <ReasonBadge reason={report.reason} />
                  </Table.Td>
                  <Table.Td>
                    {report.report_type === "user"
                      ? report.reported_username
                      : report.reported_post_title}
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={report.status} />
                  </Table.Td>
                  <Table.Td>{new Date(report.created_date).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconEye size={14} />}
                      onClick={() => openReview(report)}
                    >
                      Review
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {data?.items.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              No reports found
            </Text>
          )}
        </Paper>
      </Stack>

      <Modal opened={opened} onClose={handleCloseModal} title="Review Report" size="lg">
        {selectedReport && (
          <Stack>
            <Group>
              <Text fw={500}>Type:</Text>
              <Badge variant="outline">{selectedReport.report_type}</Badge>
            </Group>
            <Group>
              <Text fw={500}>Reason:</Text>
              <ReasonBadge reason={selectedReport.reason} />
            </Group>
            <Group>
              <Text fw={500}>Target:</Text>
              <Text>
                {selectedReport.report_type === "user"
                  ? `@${selectedReport.reported_username} (ID: ${selectedReport.reported_user_id})`
                  : `"${selectedReport.reported_post_title}" (ID: ${selectedReport.reported_post_id})`}
              </Text>
            </Group>
            <div>
              <Text fw={500} mb="xs">Description:</Text>
              <Paper p="sm" bg="var(--mantine-color-default)" radius="sm">
                <Text size="sm">{selectedReport.description}</Text>
              </Paper>
            </div>

            {banSuccess && (
              <Alert color="green" icon={<IconCheck size={16} />}>
                {banSuccess}
              </Alert>
            )}

            {(banUserMutation.error || banPostMutation.error) && (
              <Alert color="red" title="Ban Error">
                {(banUserMutation.error || banPostMutation.error) instanceof Error
                  ? (banUserMutation.error || banPostMutation.error)?.message
                  : "Failed to apply ban"}
              </Alert>
            )}

            <Divider label="Take Action" labelPosition="center" />

            <Group>
              {selectedReport.report_type === "user" && selectedReport.reported_user_id && (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconUserOff size={16} />}
                  onClick={handleBanUser}
                  loading={banUserMutation.isPending}
                  disabled={!!banSuccess}
                >
                  Ban User
                </Button>
              )}
              {selectedReport.report_type === "post" && selectedReport.reported_post_id && (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconBan size={16} />}
                  onClick={handleBanPost}
                  loading={banPostMutation.isPending}
                  disabled={!!banSuccess}
                >
                  Ban Listing
                </Button>
              )}
            </Group>

            <Divider label="Update Status" labelPosition="center" />

            <Textarea
              label="Admin Notes"
              placeholder="Add notes about your decision..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "dismissed" })}
                loading={reviewMutation.isPending}
              >
                Dismiss
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "resolved" })}
                loading={reviewMutation.isPending}
              >
                Resolve
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

