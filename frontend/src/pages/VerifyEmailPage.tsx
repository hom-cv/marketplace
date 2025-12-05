/**
 * Verify Email Page
 * Handles email verification when users click the link in their verification email.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Container, Title, Text, Button, Center, Loader, Paper, Stack, ThemeIcon } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { verifyEmail } from "../api/auth";

type VerificationStatus = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify-email" });
  const token = (search as { token?: string }).token;

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("");
  const hasAttempted = useRef(false);

  useEffect(() => {
    // Prevent double call in React StrictMode
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token)
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.detail || "Failed to verify email. The link may have expired.");
      });
  }, [token]);

  return (
    <Container size="xs" py={80}>
      <Paper shadow="md" p={40} radius="md" withBorder>
        <Center>
          {status === "loading" && (
            <Stack align="center" gap="md">
              <Loader size="xl" />
              <Title order={2}>Verifying your email...</Title>
              <Text c="dimmed">Please wait while we verify your email address.</Text>
            </Stack>
          )}

          {status === "success" && (
            <Stack align="center" gap="md">
              <ThemeIcon size={80} radius="xl" color="green">
                <IconCheck size={48} />
              </ThemeIcon>
              <Title order={2}>Email Verified!</Title>
              <Text c="dimmed" ta="center">
                {message}
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

          {status === "error" && (
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
        </Center>
      </Paper>
    </Container>
  );
}
