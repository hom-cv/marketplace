/**
 * ConfirmDeleteListingModal - Confirmation dialog for soft-deleting a listing.
 *
 * Controlled component: the consumer owns the `opened` state and renders its
 * own trigger (button, menu item, etc.). The delete mutation and user feedback
 * are handled here.
 */

import { Modal, Group, Button, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { useDeletePost } from "@/hooks/usePosts";
import { getErrorMessage } from "@/utils/error";

interface ConfirmDeleteListingModalProps {
  opened: boolean;
  onClose: () => void;
  postId: number;
  postTitle: string;
  /** Called after a successful delete (e.g. to navigate away). */
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
        notifications.show({
          message: t("delete.success"),
          color: "green",
        });
        onClose();
        onDeleted?.();
      },
      onError: (error) => {
        notifications.show({
          title: tCommon("status.error"),
          message: getErrorMessage(error, t("delete.error")),
          color: "red",
        });
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
