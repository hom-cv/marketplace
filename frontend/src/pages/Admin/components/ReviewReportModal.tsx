import {
  Modal,
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  Badge,
  Divider,
  Paper,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconTrash, IconUserCancel, IconCheck, IconX, IconEye, IconGavel } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { reviewReport, banUser, banPost } from "@/api/admin";
import type { Report, ReportType } from "@/api/types/admin";
import { useEffect } from "react";

interface ReviewReportModalProps {
  opened: boolean;
  onClose: () => void;
  report: Report | null;
  onSuccess?: () => void;
}

const REASON_LABELS: Record<string, string> = {
  counterfeit: "Counterfeit",
  abuse_of_system: "Abuse of System",
  prohibited_item: "Prohibited Item",
  scam: "Scam",
};

const TYPE_COLORS: Record<ReportType, string> = {
  user: "violet",
  post: "cyan",
};

export function ReviewReportModal({ opened, onClose, report, onSuccess }: ReviewReportModalProps) {
  const queryClient = useQueryClient();
  const form = useForm({
    initialValues: {
      admin_notes: report?.admin_notes || "",
    },
  });

  useEffect(() => {
    if (report) {
      form.setValues({ admin_notes: report.admin_notes || "" });
    } else {
      form.reset();
    }
  }, [report]);

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: "reviewed" | "resolved" | "dismissed"; notes?: string }) =>
      reviewReport(reportId, { status, admin_notes: form.values.admin_notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      onClose();
      form.reset();
      onSuccess?.();
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId: number) =>
      banUser({ user_id: userId, reason: `Report Resolved: ${form.values.admin_notes || report?.reason || "Rules violation"}` }),
    onSuccess: () => {
      notifications.show({
        title: "User Banned",
        message: "The user has been banned successfully.",
        color: "red",
        icon: <IconUserCancel size={16} />,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Ban Failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const banPostMutation = useMutation({
    mutationFn: (postId: number) =>
      banPost({ post_id: postId, reason: `Report Resolved: ${form.values.admin_notes || report?.reason || "Inappropriate content"}` }),
    onSuccess: () => {
      notifications.show({
        title: "Listing Removed",
        message: "The listing has been removed successfully.",
        color: "red",
        icon: <IconTrash size={16} />,
      });
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Removal Failed",
        message: err.message,
        color: "red",
      });
    },
  });

  if (!report) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconGavel size={20} />
          <Text fw={600}>Review Report</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Report Info */}
        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Group justify="space-between" mb="sm">
            <Badge color={TYPE_COLORS[report.report_type]} variant="filled" size="sm">
              {report.report_type.toUpperCase()}
            </Badge>
            <Text size="xs" c="dimmed">
              #{report.id} • {new Date(report.created_date).toLocaleDateString()}
            </Text>
          </Group>

          <Text size="lg" fw={600} mb="xs">
            {report.report_type === "user" ? report.reported_username : report.reported_post_title}
          </Text>

          <Group gap="lg">
            <div>
              <Text size="xs" c="dimmed" fw={600}>Reason</Text>
              <Badge color="red" variant="light" mt={4}>
                {REASON_LABELS[report.reason] || report.reason}
              </Badge>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={600}>Reporter</Text>
              <Text size="sm" mt={4}>{report.reporter_username || "Anonymous"}</Text>
            </div>
          </Group>

          {report.description && (
            <>
              <Divider my="sm" />
              <Text size="xs" c="dimmed" fw={600} mb={4}>Description</Text>
              <Text size="sm">{report.description}</Text>
            </>
          )}
        </Paper>

        {/* Admin Notes */}
        <Textarea
          label="Admin Notes"
          placeholder="Add notes about your decision (optional)..."
          {...form.getInputProps("admin_notes")}
          minRows={2}
          radius="md"
        />

        {/* Moderation Actions */}
        <div>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Moderation Actions
          </Text>
          <Group grow>
            {report.report_type === "post" && report.reported_post_id && (
              <Tooltip
                label="This listing is already banned"
                disabled={!report.is_post_banned}
              >
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => banPostMutation.mutate(report.reported_post_id!)}
                  loading={banPostMutation.isPending}
                  disabled={report.is_post_banned}
                  radius="md"
                >
                  {report.is_post_banned ? "Listing Removed" : "Remove Listing"}
                </Button>
              </Tooltip>
            )}
            <Tooltip
              label="This user is already banned"
              disabled={!report.is_user_banned}
            >
              <Button
                color="red"
                variant="outline"
                leftSection={<IconUserCancel size={16} />}
                onClick={() => banUserMutation.mutate(report.reported_user_id!)}
                disabled={!report.reported_user_id || report.is_user_banned}
                loading={banUserMutation.isPending}
                radius="md"
              >
                {report.is_user_banned ? "User Banned" : "Ban User"}
              </Button>
            </Tooltip>
          </Group>
        </div>

        <Divider />

        {/* Status Actions */}
        <Group grow>
          <Button
            variant="default"
            leftSection={<IconX size={16} />}
            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "dismissed" })}
            loading={reviewMutation.isPending}
            radius="md"
          >
            Dismiss
          </Button>
          <Button
            variant="light"
            color="blue"
            leftSection={<IconEye size={16} />}
            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "reviewed" })}
            loading={reviewMutation.isPending}
            radius="md"
          >
            Mark Reviewed
          </Button>
          <Button
            variant="filled"
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={() => reviewMutation.mutate({ reportId: report.id, status: "resolved" })}
            loading={reviewMutation.isPending}
            radius="md"
          >
            Resolve
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
