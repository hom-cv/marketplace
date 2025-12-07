/**
 * Verify Email Page
 * Combined page that handles both:
 * - Email verification when token is present in URL
 * - Resend verification email UI when no token (for logged-in unverified users)
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Button,
  Center,
  Loader,
  Paper,
  Stack,
  ThemeIcon,
  Alert,
} from "@mantine/core";
import { IconCheck, IconX, IconMail, IconAlertCircle } from "@tabler/icons-react";
import { verifyEmail, resendVerificationEmail, getCurrentUser } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

type PageMode = "loading" | "verify" | "resend" | "success" | "error";
type ResendStatus = "idle" | "loading" | "success" | "error";

const REDIRECT_DELAY_SECONDS = 5;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify-email" });
  const token = (search as { token?: string }).token;
  const { user, token: authToken, setUser } = useAuthStore();

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
          setMessage(error.detail || "Failed to verify email. The link may have expired.");
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
      setResendMessage(apiError.detail || "Failed to send verification email. Please try again.");
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
    <Container size="xs" py={80}>
      <Paper shadow="md" p={40} radius="md" withBorder>
        <Center>
          {/* Loading state */}
          {mode === "loading" && (
            <Stack align="center" gap="md">
              <Loader size="xl" />
              <Title order={2}>Loading...</Title>
            </Stack>
          )}

          {/* Verifying token state */}
          {mode === "verify" && (
            <Stack align="center" gap="md">
              <Loader size="xl" />
              <Title order={2}>Verifying your email...</Title>
              <Text c="dimmed">Please wait while we verify your email address.</Text>
            </Stack>
          )}

          {/* Success state */}
          {mode === "success" && (
            <Stack align="center" gap="md">
              <ThemeIcon size={80} radius="xl" color="green">
                <IconCheck size={48} />
              </ThemeIcon>
              <Title order={2}>Email Verified!</Title>
              <Text c="dimmed" ta="center">
                {message}
              </Text>
              <Text c="dimmed" ta="center" size="sm">
                Redirecting to login in {countdown} seconds...
              </Text>
              <Button
                size="md"
                onClick={() => navigate({ to: "/login" })}
                mt="md"
              >
                Continue to Login
              </Button>
            </Stack>
          )}

          {/* Error state */}
          {mode === "error" && (
            <Stack align="center" gap="md">
              <ThemeIcon size={80} radius="xl" color="red">
                <IconX size={48} />
              </ThemeIcon>
              <Title order={2}>Verification Failed</Title>
              <Text c="dimmed" ta="center">
                {message}
              </Text>
              <Button
                size="md"
                variant="outline"
                onClick={() => navigate({ to: "/" })}
                mt="md"
              >
                Go to Home
              </Button>
            </Stack>
          )}

          {/* Resend verification email state */}
          {mode === "resend" && (
            <Stack align="center" gap="lg">
              <ThemeIcon size={80} radius="xl" color="blue" variant="light">
                <IconMail size={48} />
              </ThemeIcon>

              <Title order={2} ta="center">
                Verify Your Email
              </Title>

              <Text c="dimmed" ta="center" size="md">
                We've sent a verification email to{" "}
                <Text component="span" fw={600} c="blue">
                  {user?.email_address}
                </Text>
                . Please check your inbox and click the verification link to activate your account.
              </Text>

              <Text c="dimmed" ta="center" size="sm">
                Didn't receive the email? Check your spam folder or click below to resend.
              </Text>

              {resendStatus === "success" && (
                <Alert
                  icon={<IconCheck size={16} />}
                  color="green"
                  variant="light"
                  w="100%"
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
                >
                  {resendMessage}
                </Alert>
              )}

              <Button
                size="md"
                onClick={handleResend}
                loading={resendStatus === "loading"}
                disabled={resendStatus === "success"}
                leftSection={<IconMail size={18} />}
                mt="sm"
              >
                {resendStatus === "success" ? "Email Sent!" : "Resend Verification Email"}
              </Button>

              <Button
                size="sm"
                variant="subtle"
                onClick={handleCheckStatus}
              >
                I've verified my email
              </Button>
            </Stack>
          )}
        </Center>
      </Paper>
    </Container>
  );
}
