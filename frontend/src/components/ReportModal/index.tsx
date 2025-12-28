/**
 * ReportModal - Modal component for submitting user/listing reports
 * Premium design with form validation
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Text,
  Alert,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck, IconFlag } from "@tabler/icons-react";
import { submitReport, type ReportCreateRequest } from "@/api/reports";
import type { ReportReason, ReportType } from "@/api/types/admin";

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

const reasonOptions: { value: ReportReason; label: string }[] = [
  { value: "counterfeit", label: "Counterfeit Item" },
  { value: "prohibited_item", label: "Prohibited Item" },
  { value: "scam", label: "Scam / Fraud" },
  { value: "abuse_of_system", label: "Abuse of System" },
];

function isValidReportReason(value: string | null): value is ReportReason {
  return reasonOptions.some((option) => option.value === value);
}

export function ReportModal({
  opened,
  onClose,
  reportType,
  entityId,
  entityName,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: (request: ReportCreateRequest) => submitReport(request),
    onSuccess: () => {
      notifications.show({
        title: "Report Submitted",
        message: "Thank you for your report. We will review it shortly.",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      handleClose();
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Failed to Submit Report",
        message: error.message || "Something went wrong. Please try again.",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    },
  });

  const handleClose = () => {
    setReason(null);
    setDescription("");
    onClose();
  };

  const handleSubmit = () => {
    if (!reason || description.trim().length < 10) return;

    const request: ReportCreateRequest = {
      report_type: reportType,
      reason,
      description,
      ...(reportType === "user"
        ? { reported_user_id: entityId }
        : { reported_post_id: entityId }),
    };

    reportMutation.mutate(request);
  };

  const isValid = reason !== null && description.length >= 10;
  const entityLabel = reportType === "user" ? "User" : "Listing";

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconFlag size={20} />
          <Text fw={600}>Report {entityLabel}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Alert color="gray" variant="light">
          <Text size="sm">
            You are reporting <strong>{entityName}</strong>
          </Text>
        </Alert>

        <Select
          label="Reason for Report"
          placeholder="Select a reason"
          data={reasonOptions}
          value={reason}
          onChange={(value) => {
            if (isValidReportReason(value)) {
              setReason(value);
            } else {
              setReason(null);
            }
          }}
          required
          withAsterisk
        />

        <Textarea
          label="Description"
          placeholder="Please provide details about the issue (minimum 10 characters)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={4}
          maxLength={1000}
          required
          withAsterisk
          error={
            description.length > 0 && description.length < 10
              ? "Description must be at least 10 characters"
              : undefined
          }
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleSubmit}
            loading={reportMutation.isPending}
            disabled={!isValid}
            leftSection={<IconFlag size={16} />}
          >
            Submit Report
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
