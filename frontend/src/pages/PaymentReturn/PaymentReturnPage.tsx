/**
 * Payment Return Page
 * Handles redirects from Omise 3DS authentication and QR payment completion
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  Center,
  Stack,
  Title,
  Text,
  Loader,
  Alert,
  Button,
  Paper,
  ThemeIcon,
  Group,
} from "@mantine/core";
import { IconCheck, IconX, IconShoppingBag, IconArrowRight } from "@tabler/icons-react";
import { getPaymentStatus } from "@/api/payments";

export function PaymentReturnPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/protected/app/payment-return" });
  const paymentId = search.payment_id ? parseInt(search.payment_id, 10) : null;
  const [pollCount, setPollCount] = useState(0);

  // Fetch payment status
  const {
    data: paymentStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["paymentStatus", paymentId],
    queryFn: () => (paymentId ? getPaymentStatus(paymentId) : null),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      // Stop polling if payment is complete or after 20 attempts (60 seconds)
      const status = query.state.data?.status;
      if (!status) return 3000; // Keep polling if no data yet
      if (status === "successful" || status === "failed" || status === "expired" || pollCount >= 20) {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
  });

  useEffect(() => {
    if (paymentStatus?.status === "pending") {
      setPollCount((prev) => prev + 1);
    }
  }, [paymentStatus]);

  const isSuccess = paymentStatus?.status === "successful";
  const isFailed = paymentStatus?.status === "failed" || paymentStatus?.status === "expired";
  const isPending = paymentStatus?.status === "pending" || paymentStatus?.status === "authorized";

  // No payment ID provided
  if (!paymentId) {
    return (
      <Center h={400}>
        <Alert color="yellow" title="No Payment Found">
          No payment information was provided. Please return to the shop.
        </Alert>
      </Center>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading payment status...</Text>
        </Stack>
      </Center>
    );
  }

  // Error state
  if (error) {
    return (
      <Center h={400}>
        <Alert color="red" title="Error">
          {error instanceof Error ? error.message : "Failed to load payment status"}
        </Alert>
      </Center>
    );
  }

  return (
    <Center h={400}>
      <Paper p="xl" radius="lg" withBorder style={{ maxWidth: 400, width: "100%" }}>
        <Stack align="center" gap="lg">
          {/* Success */}
          {isSuccess && (
            <>
              <ThemeIcon size={80} radius="xl" color="green" variant="light">
                <IconCheck size={48} />
              </ThemeIcon>
              <Title order={2} ta="center">
                Payment Successful!
              </Title>
              <Text c="dimmed" ta="center">
                Your payment of ฿{(paymentStatus.amount / 100).toLocaleString()} has been processed.
                The seller has been notified.
              </Text>
              <Group justify="center">
                <Button
                  variant="light"
                  leftSection={<IconShoppingBag size={18} />}
                  onClick={() => navigate({ to: "/app/purchases" })}
                >
                  View Purchases
                </Button>
                <Button
                  rightSection={<IconArrowRight size={18} />}
                  onClick={() => navigate({ to: "/app/explore" })}
                >
                  Continue Shopping
                </Button>
              </Group>
            </>
          )}

          {/* Failed */}
          {isFailed && (
            <>
              <ThemeIcon size={80} radius="xl" color="red" variant="light">
                <IconX size={48} />
              </ThemeIcon>
              <Title order={2} ta="center">
                Payment Failed
              </Title>
              <Text c="dimmed" ta="center">
                {paymentStatus?.failure_message || "Your payment could not be processed. Please try again."}
              </Text>
              {paymentStatus?.failure_code && (
                <Text size="xs" c="dimmed">
                  Error code: {paymentStatus.failure_code}
                </Text>
              )}
              <Button
                onClick={() => navigate({ to: "/app/explore" })}
              >
                Return to Shop
              </Button>
            </>
          )}

          {/* Pending */}
          {isPending && (
            <>
              <Loader size="lg" />
              <Title order={2} ta="center">
                Processing Payment
              </Title>
              <Text c="dimmed" ta="center">
                Please wait while we confirm your payment...
              </Text>
              {pollCount >= 15 && (
                <Text size="xs" c="dimmed" ta="center">
                  This is taking longer than usual. You can check your purchase history later.
                </Text>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
