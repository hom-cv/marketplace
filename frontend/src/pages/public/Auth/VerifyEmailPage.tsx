/**
 * Verify Email Page
 * Combined page that handles both:
 * - Email verification when token is present in URL
 * - Resend verification email UI when no token (for logged-in unverified users)
 */

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Box, Title, Text, Button, Stack, Loader, Alert, Anchor } from "@mantine/core";
import { IconCheck, IconX, IconMail, IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
} from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./Auth.module.css";

type PageMode = "loading" | "verify" | "resend" | "success" | "error";
type ResendStatus = "idle" | "loading" | "success" | "error";

const REDIRECT_DELAY_SECONDS = 5;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/verify-email" });
  const { user, token: authToken, setUser } = useAuthStore();
  const { t } = useTranslation("common");
  const { t: tAuth } = useTranslation("auth");

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
          setMessage(
            error.detail || "Failed to verify email. The link may have expired."
          );
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
          navigate({ to: authToken ? "/app" : "/login" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, navigate, authToken]);

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
      setResendMessage(
        apiError.detail || "Failed to send verification email. Please try again."
      );
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

  const handleContinue = () => {
    navigate({ to: authToken ? "/app" : "/login" });
  };

  // Get title and subtitle based on mode
  const getHeaderContent = () => {
    switch (mode) {
      case "loading":
        return { title: t("verifyEmail.loading"), subtitle: "" };
      case "verify":
        return { title: t("verifyEmail.verifying"), subtitle: t("verifyEmail.pleaseWait") };
      case "success":
        return { title: t("verifyEmail.verified"), subtitle: message };
      case "error":
        return { title: t("verifyEmail.failed"), subtitle: message };
      case "resend":
        return { title: t("verifyEmail.verifyYourEmail"), subtitle: "" };
      default:
        return { title: "", subtitle: "" };
    }
  };

  const { title, subtitle } = getHeaderContent();

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        {/* Header - outside card like Login/SignUp */}
        <Box className={styles.header}>
          <Title order={1} className={styles.title}>
            {title}
          </Title>
          {subtitle && (
            <Text size="sm" className={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </Box>

        {/* Card content */}
        <Box className={styles.card}>
          <Stack gap="md">
            {/* Loading state */}
            {mode === "loading" && (
              <Box className={styles.statusContainer}>
                <Loader size="md" />
              </Box>
            )}

            {/* Verifying token state */}
            {mode === "verify" && (
              <Box className={styles.statusContainer}>
                <Loader size="md" />
              </Box>
            )}

            {/* Success state */}
            {mode === "success" && (
              <>
                <Box className={styles.statusContainer}>
                  <Box className={`${styles.statusIcon} ${styles.success}`}>
                    <IconCheck size={32} stroke={2.5} />
                  </Box>
                </Box>
                <Text size="sm" ta="center" className={styles.subtitle}>
                  {t("verifyEmail.redirecting", { count: countdown })}
                </Text>
                <Button fullWidth onClick={handleContinue} radius="xs">
                  {authToken
                    ? t("verifyEmail.continueToApp")
                    : t("verifyEmail.continueToLogin")}
                </Button>
              </>
            )}

            {/* Error state */}
            {mode === "error" && (
              <>
                <Box className={styles.statusContainer}>
                  <Box className={`${styles.statusIcon} ${styles.error}`}>
                    <IconX size={32} stroke={2.5} />
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  radius="xs"
                >
                  {t("verifyEmail.goHome")}
                </Button>
                <Text size="sm" ta="center" className={styles.subtitle}>
                  {tAuth("login.noAccount")}{" "}
                  <Anchor component={Link} to="/sign-up" className={styles.link}>
                    {tAuth("login.signUpLink")}
                  </Anchor>
                </Text>
              </>
            )}

            {/* Resend verification email state */}
            {mode === "resend" && (
              <>
                <Box className={styles.statusContainer}>
                  <Box className={`${styles.statusIcon} ${styles.info}`}>
                    <IconMail size={32} stroke={1.5} />
                  </Box>
                </Box>

                <Text size="sm" ta="center" c="dimmed">
                  {t("verifyEmail.sentTo")}{" "}
                  <Text component="span" className={styles.link} fw={500}>
                    {user?.email_address}
                  </Text>
                </Text>

                <Text size="sm" ta="center" c="dimmed">
                  {t("verifyEmail.checkInbox")}
                </Text>

                {resendStatus === "success" && (
                  <Alert
                    icon={<IconCheck size={16} />}
                    color="green"
                    variant="light"
                    radius="xs"
                  >
                    {resendMessage}
                  </Alert>
                )}

                {resendStatus === "error" && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    variant="light"
                    radius="xs"
                  >
                    {resendMessage}
                  </Alert>
                )}

                <Text size="xs" ta="center" c="dimmed" mt="sm">
                  {t("verifyEmail.didntReceive")}
                </Text>

                <Button
                  fullWidth
                  onClick={handleResend}
                  loading={resendStatus === "loading"}
                  disabled={resendStatus === "success"}
                  leftSection={<IconMail size={18} />}
                  radius="xs"
                >
                  {resendStatus === "success"
                    ? t("verifyEmail.emailSent")
                    : t("verifyEmail.resendEmail")}
                </Button>

                <Button
                  fullWidth
                  variant="subtle"
                  onClick={handleCheckStatus}
                  radius="xs"
                >
                  {t("verifyEmail.alreadyVerified")}
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
