/**
 * Verify Email Page - Clean & Minimal
 * Handles email verification (with token) and resend verification (for unverified users)
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Title,
  Text,
  Button,
  Loader,
  Stack,
  Alert,
  Box,
} from "@mantine/core";
import { IconCheck, IconX, IconMail, IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { verifyEmail, resendVerificationEmail, getCurrentUser } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./VerifyEmailPage.module.css";

type PageMode = "loading" | "verify" | "resend" | "success" | "error";
type ResendStatus = "idle" | "loading" | "success" | "error";

const REDIRECT_DELAY_SECONDS = 5;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify-email" });
  const token = (search as { token?: string }).token;
  const { user, token: authToken, setUser } = useAuthStore();
  const { t } = useTranslation("common");

  const [mode, setMode] = useState<PageMode>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendMessage, setResendMessage] = useState("");
  const hasAttempted = useRef(false);

  // Redirect verified users to /app
  useEffect(() => {
    if (user?.email_verified) {
      navigate({ to: "/app" });
    }
  }, [user, navigate]);

  // Determine initial mode and handle verification
  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (token) {
      // Token present - attempt verification
      setMode("verify");
      verifyEmail(token)
        .then((response) => {
          setMode("success");
          setMessage(response.message);
        })
        .catch((error) => {
          setMode("error");
          setMessage(error.detail || t("verifyEmail.failedError"));
        });
    } else if (authToken && user && !user.email_verified) {
      // Logged in but not verified - show resend UI
      setMode("resend");
    } else if (!authToken) {
      // Not logged in and no token - redirect to login
      navigate({ to: "/login" });
    } else {
      setMode("loading");
    }
  }, [token, authToken, user, navigate]);

  // Auto-redirect countdown after successful verification
  useEffect(() => {
    if (mode !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate({ to: "/login" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, navigate]);

  const handleResend = async () => {
    setResendStatus("loading");
    setResendMessage("");

    try {
      const response = await resendVerificationEmail();
      setResendStatus("success");
      setResendMessage(response.message);
    } catch (error: unknown) {
      setResendStatus("error");
      const apiError = error as { detail?: string };
      setResendMessage(apiError.detail || t("verifyEmail.resendError"));
    }
  };

  const handleCheckStatus = async () => {
    try {
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      if (updatedUser.email_verified) {
        navigate({ to: "/app" });
      }
    } catch {
      // Ignore errors, user can try again
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Loading state */}
        {mode === "loading" && (
          <Stack align="center" gap="md">
            <Box className={styles.iconWrapper}>
              <Loader size="lg" />
            </Box>
            <Title order={4} className={styles.title}>
              {t("verifyEmail.loading")}
            </Title>
          </Stack>
        )}

        {/* Verifying token state */}
        {mode === "verify" && (
          <Stack align="center" gap="md">
            <Box className={styles.iconWrapper}>
              <Loader size="lg" />
            </Box>
            <Title order={4} className={styles.title}>
              {t("verifyEmail.verifying")}
            </Title>
            <Text c="dimmed" size="sm" className={styles.subtitle}>
              {t("verifyEmail.pleaseWait")}
            </Text>
          </Stack>
        )}

        {/* Success state */}
        {mode === "success" && (
          <Stack align="center" gap="md">
            <Box className={styles.iconWrapper}>
              <IconCheck size={32} className={`${styles.icon} ${styles.success}`} />
            </Box>
            <Title order={4} className={styles.title}>
              {t("verifyEmail.verified")}
            </Title>
            <Text c="dimmed" ta="center" size="sm" className={styles.subtitle}>
              {message}
            </Text>
            <div className={styles.countdown}>
              <Text c="dimmed" size="sm">
                {t("verifyEmail.redirecting", { count: countdown })}
              </Text>
            </div>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/login" })}
              className={styles.primaryButton}
              fullWidth
            >
              {t("verifyEmail.continueToLogin")}
            </Button>
          </Stack>
        )}

        {/* Error state */}
        {mode === "error" && (
          <Stack align="center" gap="md">
            <Box className={styles.iconWrapper}>
              <IconX size={32} className={`${styles.icon} ${styles.error}`} />
            </Box>
            <Title order={4} className={styles.title}>
              {t("verifyEmail.failed")}
            </Title>
            <Text c="dimmed" ta="center" size="sm" className={styles.subtitle}>
              {message}
            </Text>
            <Button
              size="sm"
              variant="light"
              onClick={() => navigate({ to: "/" })}
              className={styles.primaryButton}
              fullWidth
            >
              {t("verifyEmail.goHome")}
            </Button>
          </Stack>
        )}

        {/* Resend verification email state */}
        {mode === "resend" && (
          <Stack align="center" gap="md">
            <Box className={styles.iconWrapper}>
              <IconMail size={48} className={styles.icon} />
            </Box>

            <Title order={4} ta="center" className={styles.title}>
              {t("verifyEmail.verifyYourEmail")}
            </Title>

            <Text c="dimmed" ta="center" size="sm" className={styles.subtitle}>
              {t("verifyEmail.sentTo")}
            </Text>

            <div className={styles.email}>
              {user?.email_address}
            </div>

            <Text c="dimmed" ta="center" size="sm">
              {t("verifyEmail.checkInbox")}
            </Text>

            {resendStatus === "success" && (
              <Alert
                icon={<IconCheck size={16} />}
                color="green"
                variant="light"
                w="100%"
                className={styles.alert}
              >
                {resendMessage}
              </Alert>
            )}

            {resendStatus === "error" && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                w="100%"
                className={styles.alert}
              >
                {resendMessage}
              </Alert>
            )}

            <Stack w="100%" gap="sm">
              <Button
                size="sm"
                onClick={handleResend}
                loading={resendStatus === "loading"}
                disabled={resendStatus === "success"}
                leftSection={<IconMail size={16} />}
                className={styles.primaryButton}
                fullWidth
              >
                {resendStatus === "success" ? t("verifyEmail.emailSent") : t("verifyEmail.resendEmail")}
              </Button>

              <Button
                size="sm"
                variant="subtle"
                onClick={handleCheckStatus}
                className={styles.secondaryButton}
              >
                {t("verifyEmail.alreadyVerified")}
              </Button>
            </Stack>
          </Stack>
        )}
      </div>
    </div>
  );
}
