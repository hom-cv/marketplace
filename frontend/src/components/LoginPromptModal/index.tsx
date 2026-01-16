/**
 * Modal prompting users to log in for certain actions
 */

import { Modal, Text, Button, Stack, Group } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface LoginPromptModalProps {
  opened: boolean;
  onClose: () => void;
  action?: string;
}

export function LoginPromptModal({ opened, onClose, action }: LoginPromptModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const handleLogin = () => {
    onClose();
    navigate({ to: "/login" });
  };

  const handleSignUp = () => {
    onClose();
    navigate({ to: "/sign-up" });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("loginPrompt.title")}
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text c="dimmed">
          {action
            ? t("loginPrompt.messageWithAction", { action })
            : t("loginPrompt.message")}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t("buttons.cancel")}
          </Button>
          <Button variant="light" onClick={handleSignUp}>
            {t("buttons.signUp")}
          </Button>
          <Button leftSection={<IconLogin size={16} />} onClick={handleLogin}>
            {t("buttons.logIn")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
