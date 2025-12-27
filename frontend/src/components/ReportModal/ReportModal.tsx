/**
 * Report Modal - Allows users to report listings or users
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
} from "@mantine/core";
import { IconFlag, IconCheck } from "@tabler/icons-react";
import { submitReport } from "@/api/admin";
import type { ReportType, ReportReason } from "@/api/types/admin";

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetId: number;
  targetName: string;
}

const reasonOptions = [
  { value: "counterfeit", label: "Counterfeit Item" },
  { value: "scam", label: "Scam / Fraud" },
  { value: "prohibited_item", label: "Prohibited Item" },
  { value: "abuse_of_system", label: "Abuse of System" },
];

export function ReportModal({
  opened,
  onClose,
  reportType,
  targetId,
  targetName,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: submitReport,
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
  });

  const handleClose = () => {
    setReason(null);
    setDescription("");
    setSuccess(false);
    mutation.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason || description.length < 10) return;

    mutation.mutate({
      report_type: reportType,
      reported_user_id: reportType === "user" ? targetId : undefined,
      reported_post_id: reportType === "post" ? targetId : undefined,
      reason,
      description,
    });
  };

  const isValid = reason && description.length >= 10;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={600} size="lg">
          <IconFlag size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
          Report {reportType === "user" ? "User" : "Listing"}
        </Text>
      }
      size="md"
    >
      {success ? (
        <Alert color="green" icon={<IconCheck size={16} />} title="Report Submitted">
          Thank you for your report. Our team will review it shortly.
        </Alert>
      ) : (
        <Stack>
          <Text size="sm" c="dimmed">
            Reporting: <strong>{targetName}</strong>
          </Text>

          {mutation.error && (
            <Alert color="red" title="Error">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to submit report"}
            </Alert>
          )}

          <Select
            label="Reason"
            placeholder="Select a reason"
            data={reasonOptions}
            value={reason}
            onChange={(val) => setReason(val as ReportReason)}
            required
          />

          <Textarea
            label="Description"
            placeholder="Please provide details about your report (minimum 10 characters)"
            minRows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            error={description.length > 0 && description.length < 10 ? "Minimum 10 characters" : null}
          />

          <Button
            onClick={handleSubmit}
            loading={mutation.isPending}
            disabled={!isValid}
            color="red"
            leftSection={<IconFlag size={16} />}
          >
            Submit Report
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
