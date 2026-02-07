import { Modal, Button, Text, Stack, UnstyledButton } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import styles from "./LoginPromptModal.module.css";

interface LoginPromptModalProps {
  opened: boolean;
  onClose: () => void;
  action?: string;
}

export function LoginPromptModal({
  opened,
  onClose,
  action,
}: LoginPromptModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const handleLogin = () => {
    onClose();
    navigate({ to: "/login" });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="xs"
      padding="lg"
      radius="sm"
      withCloseButton={false}
    >
      <Stack align="center" gap="xs" onClick={(e) => e.stopPropagation()}>
        <Text size="lg" fw={600} c="var(--color-text)" ta="center">
          {t("loginPrompt.title")}
        </Text>
        <Text size="sm" c="var(--color-text-secondary)" ta="center" mb="md">
          {action
            ? t("loginPrompt.messageWithAction", { action })
            : t("loginPrompt.message")}
        </Text>
        <Button fullWidth onClick={handleLogin}>
          {t("buttons.logIn")}
        </Button>
        <UnstyledButton
          className={styles.cancel}
          onClick={onClose}
        >
          <Text size="sm" c="var(--color-text-muted)">{t("buttons.cancel")}</Text>
        </UnstyledButton>
      </Stack>
    </Modal>
  );
}
