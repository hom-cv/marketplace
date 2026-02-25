import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Badge,
  Button,
  Group,
  Select,
  Center,
  Loader,
  Alert,
  Accordion,
  Paper,
  Grid,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconFlag,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
} from "@tabler/icons-react";
import { getReports } from "@/api/admin";
import type { Report, ReportStatus, ReportType } from "@/api/types/admin";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ReviewReportModal } from "./components/ReviewReportModal";
import styles from "./ReportsPage.module.css";

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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const {
    data: reportsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-reports", statusFilter, typeFilter],
    queryFn: () =>
      getReports(statusFilter || undefined, typeFilter || undefined),
  });

  const handleAction = (report: Report) => {
    setSelectedReport(report);
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
    <Stack gap="xl">
      <div>
        <Title order={2} mb="xs">
          Reports
        </Title>
        <Text c="dimmed">Review and manage user and listing reports.</Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <Group>
            <Select
              label="Status"
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: "", label: "All Statuses" },
                { value: "pending", label: "Pending" },
                { value: "reviewed", label: "Reviewed" },
                { value: "resolved", label: "Resolved" },
                { value: "dismissed", label: "Dismissed" },
              ]}
              clearable
              w={180}
            />
            <Select
              label="Type"
              placeholder="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              data={[
                { value: "", label: "All Types" },
                { value: "user", label: "User" },
                { value: "post", label: "Listing" },
              ]}
              clearable
              w={160}
            />
          </Group>
          <Stack gap={0} align="flex-end">
            <Text size="xl" fw={700}>
              {reportsData?.total ?? 0}
            </Text>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Total Reports
            </Text>
          </Stack>
        </Group>
      </Paper>

      {reports.length === 0 ? (
        <EmptyStateCard
          icon={<IconFlag size={24} />}
          title="No reports"
          description="No reports match the current filters."
        />
      ) : (
        <Accordion variant="separated" radius="lg">
          {reports.map((report) => (
            <Accordion.Item
              key={report.id}
              value={String(report.id)}
              className={styles.accordionItem}
            >
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap" pr="md">
                  <Group gap="md">
                    <Badge
                      color={TYPE_COLORS[report.report_type]}
                      variant="filled"
                      size="sm"
                      radius="sm"
                    >
                      {report.report_type.toUpperCase()}
                    </Badge>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>
                        {report.report_type === "user"
                          ? report.reported_username
                          : report.reported_post_title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Reported by {report.reporter_username || "anonymous"}
                      </Text>
                    </Stack>
                  </Group>
                  <Group gap="xl">
                    <Badge
                      color={STATUS_COLORS[report.status]}
                      variant="light"
                      size="sm"
                    >
                      {report.status}
                    </Badge>
                    <Text size="xs" c="dimmed" className={styles.noWrap}>
                      {new Date(report.created_date).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </Text>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md" pt="xs">
                  <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                          Reason
                        </Text>
                        <Text fw={600} mt={4}>
                          {REASON_LABELS[report.reason] || report.reason}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 8 }}>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                          Description
                        </Text>
                        <Text
                          size="sm"
                          mt={4}
                          className={styles.preWrap}
                        >
                          {report.description}
                        </Text>
                      </Grid.Col>
                    </Grid>
                  </Paper>

                  {report.admin_notes && (
                    <Paper
                      p="md"
                      radius="md"
                      withBorder
                      className={styles.dashedBorder}
                      bg="blue.0"
                    >
                      <Text size="xs" c="blue.7" fw={700} tt="uppercase" mb={4}>
                        Admin Decision Notes
                      </Text>
                      <Text size="sm" c="blue.9">
                        {report.admin_notes}
                      </Text>
                      {report.reviewed_by_username && (
                        <Text size="xs" c="blue.6" mt={8}>
                          Reviewed by {report.reviewed_by_username}
                        </Text>
                      )}
                    </Paper>
                  )}

                  <Group justify="flex-start" mt="sm">
                    {report.status === "pending" && (
                      <Button
                        size="sm"
                        variant="filled"
                        color="green"
                        leftSection={<IconCheck size={16} />}
                        onClick={() => handleAction(report)}
                      >
                        Take Action
                      </Button>
                    )}
                    {report.report_type === "post" &&
                      report.reported_post_id && (
                        <Button
                          variant="subtle"
                          size="sm"
                          color="gray"
                          component="a"
                          href={`/posts/${report.reported_post_id}`}
                          target="_blank"
                          leftSection={<IconExternalLink size={14} />}
                        >
                          View Listing
                        </Button>
                      )}
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <ReviewReportModal
        opened={opened}
        onClose={close}
        report={selectedReport}
      />
    </Stack>
  );
}
