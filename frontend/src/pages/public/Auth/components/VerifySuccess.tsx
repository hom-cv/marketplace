import { Box, Text, Button } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "../Auth.module.css";

interface VerifySuccessProps {
  countdown: number;
  onContinue: () => void;
  continueLabel: string;
}

export function VerifySuccess({
  countdown,
  onContinue,
  continueLabel,
}: VerifySuccessProps) {
  const { t } = useTranslation("common");

  return (
    <>
      <Box className={styles.statusContainer}>
        <Box className={`${styles.statusIcon} ${styles.success}`}>
          <IconCheck size={32} stroke={2.5} />
        </Box>
      </Box>
      <Text size="sm" ta="center" className={styles.subtitle}>
        {t("verifyEmail.redirecting", { count: countdown })}
      </Text>
      <Button fullWidth onClick={onContinue} radius="xs">
        {continueLabel}
      </Button>
    </>
  );
}
