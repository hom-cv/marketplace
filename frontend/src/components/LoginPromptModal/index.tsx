import { Modal, Button } from "@mantine/core";
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
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t("loginPrompt.title")}</h3>
        <p className={styles.message}>
          {action
            ? t("loginPrompt.messageWithAction", { action })
            : t("loginPrompt.message")}
        </p>
        <Button fullWidth onClick={(e) => { e.stopPropagation(); handleLogin(); }}>
          {t("buttons.logIn")}
        </Button>
        <button type="button" className={styles.cancel} onClick={(e) => { e.stopPropagation(); onClose(); }}>
          {t("buttons.cancel")}
        </button>
      </div>
    </Modal>
  );
}
