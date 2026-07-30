/**
 * FeedbackModal - Leave a rating + comment on a delivered purchase.
 */

import { useState } from "react";
import { Modal, Stack, Group, Text, Rating, Textarea } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useCreateFeedbackMutation } from "@/hooks/useFeedback";
import { getErrorMessage } from "@/utils/error";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";

interface FeedbackModalProps {
  paymentId: number | null;
  opened: boolean;
  onClose: () => void;
}

export function FeedbackModal({ paymentId, opened, onClose }: FeedbackModalProps) {
  const { t } = useTranslation("common");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const mutation = useCreateFeedbackMutation();

  const handleClose = () => {
    mutation.reset();
    setRating(0);
    setComment("");
    onClose();
  };

  const handleSubmit = () => {
    if (paymentId === null || rating === 0) return;
    mutation.mutate(
      { payment_id: paymentId, rating, comment: comment.trim() || null },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconStar size={20} />
          <Text fw={600}>{t("feedback.title")}</Text>
        </Group>
      }
      size="sm"
      centered
    >
      <Stack gap="md">
        {mutation.isError && (
          <Alert variant="error">
            {getErrorMessage(mutation.error, t("status.error"))}
          </Alert>
        )}

        <div>
          <Text size="sm" fw={500} mb={4}>
            {t("feedback.ratingLabel")}
          </Text>
          <Rating value={rating} onChange={setRating} size="lg" />
        </div>

        <Textarea
          label={t("feedback.commentLabel")}
          placeholder={t("feedback.commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
          autosize
          minRows={3}
          maxLength={500}
        />

        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={rating === 0 || mutation.isPending}
        >
          {t("feedback.submit")}
        </Button>
      </Stack>
    </Modal>
  );
}
