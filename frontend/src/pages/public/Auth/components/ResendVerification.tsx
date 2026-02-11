import { Box, Text, Button, Alert } from "@mantine/core";
import { IconMail, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useResendVerificationMutation } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import styles from "../Auth.module.css";

interface ResendVerificationProps {
  email: string;
  onCheckStatus: () => void;
  isCheckingStatus: boolean;
}

export function ResendVerification({
  email,
  onCheckStatus,
  isCheckingStatus,
}: ResendVerificationProps) {
  const { t } = useTranslation("common");

  const resendMutation = useResendVerificationMutation();

  return (
    <>
      <Box className={styles.statusContainer}>
        <Box className={`${styles.statusIcon} ${styles.info}`}>
          <IconMail size={32} stroke={1.5} />
        </Box>
      </Box>

      <Text size="sm" ta="center" c="dimmed">
        {t("verifyEmail.sentTo")}{" "}
        <Text component="span" className={styles.link} fw={500}>
          {email}
        </Text>
      </Text>

      <Text size="sm" ta="center" c="dimmed">
        {t("verifyEmail.checkInbox")}
      </Text>

      {resendMutation.isSuccess && (
        <Alert
          icon={<IconCheck size={16} />}
          color="green"
          variant="light"
          radius="xs"
        >
          {resendMutation.data?.message}
        </Alert>
      )}

      {resendMutation.isError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          radius="xs"
        >
          {getErrorMessage(resendMutation.error, t("verifyEmail.resendFailedDefault"))}
        </Alert>
      )}

      <Text size="xs" ta="center" c="dimmed" mt="sm">
        {t("verifyEmail.didntReceive")}
      </Text>

      <Button
        fullWidth
        onClick={() => resendMutation.mutate()}
        loading={resendMutation.isPending}
        disabled={resendMutation.isSuccess}
        leftSection={<IconMail size={18} />}
        radius="xs"
      >
        {resendMutation.isSuccess
          ? t("verifyEmail.emailSent")
          : t("verifyEmail.resendEmail")}
      </Button>

      <Button
        fullWidth
        variant="subtle"
        onClick={onCheckStatus}
        loading={isCheckingStatus}
        radius="xs"
      >
        {t("verifyEmail.alreadyVerified")}
      </Button>
    </>
  );
}
