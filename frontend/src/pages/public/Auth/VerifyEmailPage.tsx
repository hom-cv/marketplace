/**
 * Verify Email Page
 * Combined page that handles both:
 * - Email verification when token is present in URL
 * - Resend verification email UI when no token (for logged-in unverified users)
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Box, Title, Text, Stack, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useVerifyEmailQuery, useCurrentUser } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import { VerifySuccess } from "./components/VerifySuccess";
import { VerifyError } from "./components/VerifyError";
import { ResendVerification } from "./components/ResendVerification";
import styles from "./Auth.module.css";

type PageMode = "loading" | "verify" | "resend" | "success" | "error";

const REDIRECT_DELAY_SECONDS = 5;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/verify-email" });
  const { user, token: authToken } = useAuthStore();
  const { t } = useTranslation("common");

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const verifyQuery = useVerifyEmailQuery(token);
  const { refetch: refetchUser } = useCurrentUser();

  // Derive mode from query state and auth state
  const getMode = (): PageMode => {
    if (token) {
      if (verifyQuery.isPending) return "verify";
      if (verifyQuery.isSuccess) return "success";
      if (verifyQuery.isError) return "error";
    }
    if (authToken && user && !user.email_verified) return "resend";
    if (!authToken) return "loading"; // Will redirect to login
    return "loading";
  };

  const mode = getMode();

  // Get error/success message from query
  const getMessage = (): string => {
    if (verifyQuery.isSuccess) {
      return verifyQuery.data.message;
    }
    if (verifyQuery.isError) {
      return getErrorMessage(verifyQuery.error, t("verifyEmail.verificationFailedDefault"));
    }
    return "";
  };

  const message = getMessage();

  // Refetch user after verification success to update authStore
  useEffect(() => {
    if (verifyQuery.isSuccess) {
      refetchUser();
    }
  }, [verifyQuery.isSuccess, refetchUser]);

  // Redirect verified users to /app
  useEffect(() => {
    if (user?.email_verified) {
      navigate({ to: "/app" });
    }
  }, [user, navigate]);

  // Redirect to login if not logged in and no token
  useEffect(() => {
    if (!authToken && !token) {
      navigate({ to: "/login" });
    }
  }, [authToken, token, navigate]);

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

  const handleContinue = () => {
    navigate({ to: authToken ? "/app" : "/login" });
  };

  const handleGoHome = () => {
    navigate({ to: "/" });
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const result = await refetchUser();
      if (result.data?.email_verified) {
        navigate({ to: "/app" });
      }
    } catch (error) {
      notifications.show({
        title: t("status.error"),
        message: getErrorMessage(error, t("verifyEmail.checkStatusFailed")),
        color: "red",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Get title and subtitle based on mode
  const getHeaderContent = () => {
    switch (mode) {
      case "loading":
        return { title: t("verifyEmail.loading"), subtitle: "" };
      case "verify":
        return {
          title: t("verifyEmail.verifying"),
          subtitle: t("verifyEmail.pleaseWait"),
        };
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

  const continueLabel = authToken
    ? t("verifyEmail.continueToApp")
    : t("verifyEmail.continueToLogin");

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
              <VerifySuccess
                countdown={countdown}
                onContinue={handleContinue}
                continueLabel={continueLabel}
              />
            )}

            {/* Error state */}
            {mode === "error" && <VerifyError onGoHome={handleGoHome} />}

            {/* Resend verification email state */}
            {mode === "resend" && user && (
              <ResendVerification
                email={user.email_address}
                onCheckStatus={handleCheckStatus}
                isCheckingStatus={isCheckingStatus}
              />
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
