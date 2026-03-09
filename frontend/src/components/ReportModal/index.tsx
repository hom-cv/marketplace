/**
 * ReportModal - Modal component for submitting user/listing reports
 * Premium design with form validation
 */

import { useState, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import { useSubmitReportMutation } from "@/hooks/useReports";
import type { ReportCreateRequest } from "@/api/reports";
import type { ReportReason, ReportType } from "@/api/types/admin";

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

const reasonValues: ReportReason[] = [
  "counterfeit",
  "prohibited_item",
  "scam",
  "abuse_of_system",
];

function isValidReportReason(value: string | null): value is ReportReason {
  return reasonValues.includes(value as ReportReason);
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
  const { t } = useTranslation("common");

  // Reason options with translations
  const reasonOptions = useMemo(
    () => [
      { value: "counterfeit", label: t("report.reasons.counterfeit") },
      { value: "prohibited_item", label: t("report.reasons.prohibited_item") },
      { value: "scam", label: t("report.reasons.scam") },
      { value: "abuse_of_system", label: t("report.reasons.abuse_of_system") },
    ],
    [t],
  );

  const reportMutation = useSubmitReportMutation({
    onSuccess: () => {
      notifications.show({
        title: t("report.submitted"),
        message: t("report.submittedMessage"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      handleClose();
    },
    onError: (error: Error) => {
      notifications.show({
        title: t("report.failedToSubmit"),
        message: error.message || t("errors.generic"),
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

  const isValid = reason !== null && description.trim().length >= 10;
  const entityLabel =
    reportType === "user" ? t("report.user") : t("report.listing");

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconFlag size={20} color="var(--color-error)" />
          <Text fw={600} c="var(--color-error)">
            {t("report.title", { type: entityLabel })}
          </Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Alert color="gray" variant="light">
          <Text size="sm">
            {t("report.youAreReporting")} <strong>{entityName}</strong>
          </Text>
        </Alert>

        <Select
          label={t("report.reason")}
          placeholder={t("report.selectReason")}
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
          label={t("report.description")}
          placeholder={t("report.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={4}
          maxLength={1000}
          required
          withAsterisk
          error={
            description.length > 0 && description.length < 10
              ? t("report.descriptionMinError")
              : undefined
          }
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            {t("buttons.cancel")}
          </Button>
          <Button
            color="red"
            onClick={handleSubmit}
            loading={reportMutation.isPending}
            disabled={!isValid}
            leftSection={<IconFlag size={16} />}
          >
            {t("report.submitReport")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
