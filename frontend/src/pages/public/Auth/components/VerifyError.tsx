import { Box, Text, Button, Anchor } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import styles from "../Auth.module.css";

interface VerifyErrorProps {
  onGoHome: () => void;
}

export function VerifyError({ onGoHome }: VerifyErrorProps) {
  const { t } = useTranslation("common");
  const { t: tAuth } = useTranslation("auth");

  return (
    <>
      <Box className={styles.statusContainer}>
        <Box className={`${styles.statusIcon} ${styles.error}`}>
          <IconX size={32} stroke={2.5} />
        </Box>
      </Box>
      <Button fullWidth variant="outline" onClick={onGoHome} radius="xs">
        {t("verifyEmail.goHome")}
      </Button>
      <Text size="sm" ta="center" className={styles.subtitle}>
        {tAuth("login.noAccount")}{" "}
        <Anchor component={Link} to="/sign-up" className={styles.link}>
          {tAuth("login.signUpLink")}
        </Anchor>
      </Text>
    </>
  );
}
