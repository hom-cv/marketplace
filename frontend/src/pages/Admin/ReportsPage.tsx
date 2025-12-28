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
  Center,
  Loader,
  Alert,
  Modal,
  Textarea,
  Accordion,
  Paper,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconFlag,
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { getReports, reviewReport } from "@/api/admin";
import type { Report, ReportStatus, ReportType } from "@/api/types/admin";
import { EmptyStateCard } from "@/components/EmptyStateCard";

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: "orange",
  reviewed: "blue",
  resolved: "green",
  dismissed: "gray",
};

const TYPE_COLORS: Record<ReportType, string> = {
  user: "violet",
  post: "cyan",
};

const REASON_LABELS: Record<string, string> = {
  counterfeit: "Counterfeit",
  abuse_of_system: "Abuse of System",
  prohibited_item: "Prohibited Item",
  scam: "Scam",
};

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [opened, { open, close }] = useDisclosure(false);

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ["admin-reports", statusFilter, typeFilter],
    queryFn: () => getReports(statusFilter || undefined, typeFilter || undefined),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: "reviewed" | "resolved" | "dismissed" }) =>
      reviewReport(reportId, { status, admin_notes: adminNotes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      close();
      setSelectedReport(null);
      setAdminNotes("");
    },
  });

  const handleAction = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes("");
    open();
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
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : "Failed to load reports"}
      </Alert>
    );
  }

  const reports = reportsData?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Reports</Title>
        <Text c="dimmed">Review and manage user and listing reports.</Text>
      </div>

      <Group>
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "reviewed", label: "Reviewed" },
            { value: "resolved", label: "Resolved" },
            { value: "dismissed", label: "Dismissed" },
          ]}
          clearable
          w={160}
        />
        <Select
          placeholder="Filter by type"
          value={typeFilter}
          onChange={setTypeFilter}
          data={[
            { value: "", label: "All Types" },
            { value: "user", label: "User" },
            { value: "post", label: "Post" },
          ]}
          clearable
          w={140}
        />
        <Text size="sm" c="dimmed">
          {reportsData?.total ?? 0} total reports
        </Text>
      </Group>

      {reports.length === 0 ? (
        <EmptyStateCard
          icon={<IconFlag size={24} />}
          title="No reports"
          description="No reports match the current filters."
        />
      ) : (
        <Accordion variant="separated" radius="md">
          {reports.map((report) => (
            <Accordion.Item key={report.id} value={String(report.id)}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="md">
                  <Group gap="sm">
                    <Badge color={TYPE_COLORS[report.report_type]} variant="light" size="sm">
                      {report.report_type}
                    </Badge>
                    <Text size="sm" fw={500}>
                      {report.report_type === "user"
                        ? report.reported_username
                        : report.reported_post_title}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color={STATUS_COLORS[report.status]} variant="light" size="sm">
                      {report.status}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {new Date(report.created_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </Text>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Paper withBorder p="sm" radius="sm">
                    <Group gap="lg">
                      <div>
                        <Text size="xs" c="dimmed">Reason</Text>
                        <Badge variant="outline" size="sm">
                          {REASON_LABELS[report.reason] || report.reason}
                        </Badge>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Reporter</Text>
                        <Text size="sm">{report.reporter_username || "Unknown"}</Text>
                      </div>
                      {report.reviewed_by_username && (
                        <div>
                          <Text size="xs" c="dimmed">Reviewed By</Text>
                          <Text size="sm">{report.reviewed_by_username}</Text>
                        </div>
                      )}
                    </Group>
                  </Paper>

                  <div>
                    <Text size="xs" c="dimmed" mb={4}>Description</Text>
                    <Text size="sm">{report.description}</Text>
                  </div>

                  {report.admin_notes && (
                    <div>
                      <Text size="xs" c="dimmed" mb={4}>Admin Notes</Text>
                      <Text size="sm" fs="italic">{report.admin_notes}</Text>
                    </div>
                  )}

                  {report.status === "pending" && (
                    <Group mt="sm">
                      <Button
                        size="xs"
                        color="green"
                        leftSection={<IconCheck size={14} />}
                        onClick={() => handleAction(report)}
                      >
                        Take Action
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <Modal opened={opened} onClose={close} title="Review Report" centered>
        {selectedReport && (
          <Stack gap="md">
            <Text size="sm">
              <strong>Reported:</strong>{" "}
              {selectedReport.report_type === "user"
                ? selectedReport.reported_username
                : selectedReport.reported_post_title}
            </Text>
            <Text size="sm">
              <strong>Reason:</strong> {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
            </Text>

            <Textarea
              label="Admin Notes"
              placeholder="Optional notes about your decision..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.currentTarget.value)}
              rows={3}
            />

            <Group justify="flex-end">
              <Button
                variant="light"
                color="gray"
                leftSection={<IconX size={14} />}
                onClick={() => reviewMutation.mutate({ reportId: selectedReport.id, status: "dismissed" })}
                loading={reviewMutation.isPending}
              >
                Dismiss
              </Button>
              <Button
                variant="light"
                color="blue"
                onClick={() => reviewMutation.mutate({ reportId: selectedReport.id, status: "reviewed" })}
                loading={reviewMutation.isPending}
              >
                Mark as Reviewed
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => reviewMutation.mutate({ reportId: selectedReport.id, status: "resolved" })}
                loading={reviewMutation.isPending}
              >
                Resolve
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
