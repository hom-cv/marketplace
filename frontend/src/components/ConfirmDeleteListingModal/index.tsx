/**
 * ConfirmDeleteListingModal - Confirmation dialog for soft-deleting a listing.
 *
 * Controlled component: the consumer owns the `opened` state and renders its
 * own trigger (button, menu item, etc.). The delete mutation and user feedback
 * are handled here.
 */

import { Modal, Group, Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useDeletePost } from "@/hooks/usePosts";
import { getErrorMessage } from "@/utils/error";
import { notifySuccess, notifyError } from "@/utils/notify";

interface ConfirmDeleteListingModalProps {
  opened: boolean;
  onClose: () => void;
  postId: number;
  postTitle: string;
  onDeleted?: () => void;
}

export function ConfirmDeleteListingModal({
  opened,
  onClose,
  postId,
  postTitle,
  onDeleted,
}: ConfirmDeleteListingModalProps) {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");
  const deleteMutation = useDeletePost();

  const handleConfirm = () => {
    deleteMutation.mutate(postId, {
      onSuccess: () => {
        notifySuccess(t("delete.success"));
        onClose();
        onDeleted?.();
      },
      onError: (error) => {
        notifyError(getErrorMessage(error, t("delete.error")));
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("delete.title")}
      centered
      radius="xs"
    >
      <Text size="sm" mb="lg">
        {t("delete.confirm", { title: postTitle })}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          radius="xs"
          onClick={onClose}
          disabled={deleteMutation.isPending}
        >
          {tCommon("buttons.cancel")}
        </Button>
        <Button
          color="red"
          radius="xs"
          onClick={handleConfirm}
          loading={deleteMutation.isPending}
        >
          {t("delete.action")}
        </Button>
      </Group>
    </Modal>
  );
}
