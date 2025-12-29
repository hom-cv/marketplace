/**
 * PaymentStatusView - Handles success, failure, and QR pending states
 */

import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Alert,
  Image,
  Loader,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { PaymentResponse, PaymentStatusResponse } from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface PaymentStatusViewProps {
  paymentResponse: PaymentResponse | null;
  paymentStatus: PaymentStatusResponse | null;
  error: string | null;
}

export function PaymentStatusView({
  paymentResponse,
  paymentStatus,
  error,
}: PaymentStatusViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const isSuccess = paymentStatus?.status === "successful" || paymentResponse?.status === "successful";
  const isFailed = paymentStatus?.status === "failed" || paymentResponse?.status === "failed";
  const showQR = paymentResponse?.qr_code_uri && !isSuccess && !isFailed;

  return (
    <>
      {/* Success state */}
      {isSuccess && (
        <Paper withBorder p="xl" radius="md" bg="green.0">
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={3} ta="center" c="green.8">{t("checkout.paymentSuccess")}</Title>
            <Text ta="center" c="dimmed">
              {t("checkout.paymentSuccessMessage")}
            </Text>
            <Group justify="center" mt="md">
              <Button variant="light" onClick={() => navigate({ to: "/app/purchases" })}>
                {t("checkout.viewPurchases")}
              </Button>
              <Button onClick={() => navigate({ to: "/app/explore" })}>
                {t("checkout.continueShoppingBtn")}
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Failed state */}
      {isFailed && (
        <Alert color="red" icon={<IconX />} title={t("checkout.paymentFailed")}>
          {paymentStatus?.failure_message || t("checkout.paymentFailedMessage")}
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert color="red" title={t("status.error")}>
          {error}
        </Alert>
      )}

      {/* PromptPay QR code */}
      {showQR && (
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="md">
            <Title order={4}>{t("checkout.scanToPay")}</Title>
            <Text size="sm" c="dimmed">{t("checkout.scanWithApp")}</Text>
            <Image
              src={paymentResponse.qr_code_uri}
              alt="PromptPay QR Code"
              w={250}
              className={styles.qrCode}
            />
            {paymentResponse.expires_at && (
              <Text size="xs" c="dimmed">
                {t("checkout.expires", { time: new Date(paymentResponse.expires_at).toLocaleTimeString() })}
              </Text>
            )}
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">{t("checkout.waitingForPayment")}</Text>
            </Group>
          </Stack>
        </Paper>
      )}
    </>
  );
}
