/**
 * Banned Page
 * Displayed when a user's account has been banned.
 * The banned flag is cleared when the user clicks "Return to Home".
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, Title, Text, Stack, Button } from "@mantine/core";
import { IconBan } from "@tabler/icons-react";
import { useAuthStore } from "@/stores/authStore";
import styles from "./BannedPage.module.css";

export function BannedPage() {
  const navigate = useNavigate();
  const isBanned = useAuthStore((state) => state.isBanned);
  const setBanned = useAuthStore((state) => state.setBanned);

  useEffect(() => {
    if (!isBanned) {
      navigate({ to: "/" });
    }
  }, [isBanned, navigate]);

  const handleGoHome = () => {
    setBanned(false);
    navigate({ to: "/" });
  };

  if (!isBanned) return null;

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        <Box className={styles.header}>
          <Title order={1} className={styles.title}>
            Account Suspended
          </Title>
          <Text size="sm" className={styles.subtitle}>
            Your account has been banned
          </Text>
        </Box>

        <Box className={styles.card}>
          <Stack gap="md" align="center">
            <Box className={styles.iconContainer}>
              <Box className={styles.icon}>
                <IconBan size={32} />
              </Box>
            </Box>

            <Text size="sm" className={styles.detail}>
              Your account has been suspended due to a violation of our
              community guidelines. You are no longer able to access your
              listings, messages, or make purchases.
            </Text>

            <Text size="sm" className={styles.detail}>
              If you believe this was a mistake, please contact our support team
              for assistance.
            </Text>

            <Button fullWidth radius="xs" onClick={handleGoHome}>
              Return to Home
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
