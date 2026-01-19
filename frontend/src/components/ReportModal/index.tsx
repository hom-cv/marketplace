/**
 * ReportModal - Modal component for submitting user/listing reports
 * Premium design with form validation
 */

import { useMemo } from "react";
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
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck, IconFlag } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { submitReport, type ReportCreateRequest } from "@/api/reports";
import type { ReportReason, ReportType } from "@/api/types/admin";

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

interface ReportFormValues {
  reason: ReportReason | "";
  description: string;
}

const reasonValues: ReportReason[] = ["counterfeit", "prohibited_item", "scam", "abuse_of_system"];

function isValidReportReason(value: string): value is ReportReason {
  return reasonValues.includes(value as ReportReason);
}

export function ReportModal({
  opened,
  onClose,
  reportType,
  entityId,
  entityName,
}: ReportModalProps) {
  const { t } = useTranslation("common");

  const form = useForm<ReportFormValues>({
    initialValues: {
      reason: "",
      description: "",
    },
    validate: {
      reason: (value) => (!value ? t("report.reasonRequired") : null),
      description: (value) =>
        value.trim().length < 10 ? t("report.descriptionMinError") : null,
    },
  });

  // Reason options with translations
  const reasonOptions = useMemo(() => [
    { value: "counterfeit", label: t("report.reasons.counterfeit") },
    { value: "prohibited_item", label: t("report.reasons.prohibited_item") },
    { value: "scam", label: t("report.reasons.scam") },
    { value: "abuse_of_system", label: t("report.reasons.abuse_of_system") },
  ], [t]);

  const reportMutation = useMutation({
    mutationFn: (request: ReportCreateRequest) => submitReport(request),
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
    form.reset();
    onClose();
  };

  const handleSubmit = (values: ReportFormValues) => {
    if (!isValidReportReason(values.reason)) return;

    const request: ReportCreateRequest = {
      report_type: reportType,
      reason: values.reason,
      description: values.description,
      ...(reportType === "user"
        ? { reported_user_id: entityId }
        : { reported_post_id: entityId }),
    };

    reportMutation.mutate(request);
  };
  const entityLabel = reportType === "user" ? t("report.user") : t("report.listing");

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconFlag size={20} />
          <Text fw={600}>{t("report.title", { type: entityLabel })}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
            required
            withAsterisk
            {...form.getInputProps("reason")}
          />

          <Textarea
            label={t("report.description")}
            placeholder={t("report.descriptionPlaceholder")}
            minRows={4}
            maxLength={1000}
            required
            withAsterisk
            {...form.getInputProps("description")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              {t("buttons.cancel")}
            </Button>
            <Button
              type="submit"
              color="red"
              loading={reportMutation.isPending}
              disabled={!form.isValid()}
              leftSection={<IconFlag size={16} />}
            >
              {t("report.submitReport")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
