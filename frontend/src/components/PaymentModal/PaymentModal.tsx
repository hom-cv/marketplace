/**
 * PaymentModal component for handling card and PromptPay payments
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Modal,
  Stack,
  Text,
  Button,
  TextInput,
  Group,
  SegmentedControl,
  Alert,
  Image,
  Loader,
  Center,
  Paper,
  Title,
} from "@mantine/core";
import { IconCreditCard, IconQrcode, IconCheck, IconX } from "@tabler/icons-react";
import { createCardPayment, createPromptPayPayment, getPaymentStatus } from "@/api/payments";
import type { Post } from "@/api/types/post";
import type { PaymentResponse } from "@/api/types/payment";
import styles from "./PaymentModal.module.css";

interface PaymentModalProps {
  opened: boolean;
  onClose: () => void;
  post: Post;
}

type PaymentMethod = "card" | "promptpay";

declare global {
  interface Window {
    Omise: {
      setPublicKey: (key: string) => void;
      createToken: (
        type: string,
        data: {
          name: string;
          number: string;
          expiration_month: string;
          expiration_year: string;
          security_code: string;
        },
        callback: (statusCode: number, response: { id?: string; message?: string }) => void
      ) => void;
    };
    OmiseCard: unknown;
  }
}

export function PaymentModal({ opened, onClose, post }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);

  // Card form state
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [isTokenizing, setIsTokenizing] = useState(false);

  // Poll payment status for PromptPay
  const { data: paymentStatus } = useQuery({
    queryKey: ["paymentStatus", paymentResponse?.payment_id],
    queryFn: () => paymentResponse?.payment_id ? getPaymentStatus(paymentResponse.payment_id) : null,
    enabled: !!paymentResponse?.payment_id && paymentResponse.status === "pending" && paymentMethod === "promptpay",
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Card payment mutation
  const cardPaymentMutation = useMutation({
    mutationFn: createCardPayment,
    onSuccess: (data) => {
      setPaymentResponse(data);
      if (data.authorize_uri) {
        // Redirect to 3DS
        window.location.href = data.authorize_uri;
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // PromptPay payment mutation
  const promptPayMutation = useMutation({
    mutationFn: createPromptPayPayment,
    onSuccess: (data) => {
      setPaymentResponse(data);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Load Omise.js script
  useEffect(() => {
    if (opened && !window.Omise) {
      const script = document.createElement("script");
      script.src = "https://cdn.omise.co/omise.js";
      script.async = true;
      script.onload = () => {
        // Set public key - this should come from environment
        const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY;
        if (publicKey && window.Omise) {
          window.Omise.setPublicKey(publicKey);
        }
      };
      document.body.appendChild(script);
    }
  }, [opened]);

  // Handle card submission
  const handleCardSubmit = () => {
    if (!window.Omise) {
      setError("Payment system not loaded. Please try again.");
      return;
    }

    setError(null);
    setIsTokenizing(true);

    window.Omise.createToken(
      "card",
      {
        name: cardName,
        number: cardNumber.replace(/\s/g, ""),
        expiration_month: expMonth.padStart(2, "0"),
        expiration_year: expYear.length === 2 ? `20${expYear}` : expYear,
        security_code: cvv,
      },
      (statusCode, response) => {
        setIsTokenizing(false);

        if (statusCode !== 200 || !response.id) {
          setError(response.message || "Failed to process card");
          return;
        }

        cardPaymentMutation.mutate({
          post_id: post.id,
          token: response.id,
          return_uri: `${window.location.origin}/app?payment=success`,
        });
      }
    );
  };

  // Handle PromptPay
  const handlePromptPay = () => {
    setError(null);
    promptPayMutation.mutate({
      post_id: post.id,
      return_uri: `${window.location.origin}/app?payment=success`,
    });
  };

  // Check if payment succeeded
  const isSuccess = paymentStatus?.status === "successful" || paymentResponse?.status === "successful";
  const isFailed = paymentStatus?.status === "failed" || paymentResponse?.status === "failed";

  // Reset state on close
  const handleClose = () => {
    setPaymentResponse(null);
    setError(null);
    setCardName("");
    setCardNumber("");
    setExpMonth("");
    setExpYear("");
    setCvv("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>Complete Purchase</Title>}
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Product info */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text fw={500}>{post.title}</Text>
              <Text size="sm" c="dimmed">Sold by {post.user.username}</Text>
            </div>
            <Text fw={700} size="lg">฿{post.price}</Text>
          </Group>
        </Paper>

        {/* Success state */}
        {isSuccess && (
          <Alert color="green" icon={<IconCheck />} title="Payment Successful!">
            Your payment has been processed. The seller will be notified.
          </Alert>
        )}

        {/* Failed state */}
        {isFailed && (
          <Alert color="red" icon={<IconX />} title="Payment Failed">
            {paymentStatus?.failure_message || "Please try again or use a different payment method."}
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Payment method selector */}
        {!paymentResponse && (
          <>
            <SegmentedControl
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
              data={[
                {
                  value: "card",
                  label: (
                    <Center>
                      <IconCreditCard size={16} />
                      <Text ml="xs">Credit Card</Text>
                    </Center>
                  ),
                },
                {
                  value: "promptpay",
                  label: (
                    <Center>
                      <IconQrcode size={16} />
                      <Text ml="xs">PromptPay</Text>
                    </Center>
                  ),
                },
              ]}
              fullWidth
            />

            {/* Card form */}
            {paymentMethod === "card" && (
              <Stack gap="sm">
                <TextInput
                  label="Cardholder Name"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
                <TextInput
                  label="Card Number"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <Group grow>
                  <TextInput
                    label="Exp. Month"
                    placeholder="MM"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    maxLength={2}
                  />
                  <TextInput
                    label="Exp. Year"
                    placeholder="YY"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    maxLength={4}
                  />
                  <TextInput
                    label="CVV"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength={4}
                  />
                </Group>
                <Button
                  size="lg"
                  mt="sm"
                  onClick={handleCardSubmit}
                  loading={isTokenizing || cardPaymentMutation.isPending}
                  disabled={!cardName || !cardNumber || !expMonth || !expYear || !cvv}
                >
                  Pay ฿{post.price}
                </Button>
              </Stack>
            )}

            {/* PromptPay button */}
            {paymentMethod === "promptpay" && (
              <Button
                size="lg"
                onClick={handlePromptPay}
                loading={promptPayMutation.isPending}
              >
                Generate QR Code
              </Button>
            )}
          </>
        )}

        {/* PromptPay QR code */}
        {paymentResponse?.qr_code_uri && !isSuccess && !isFailed && (
          <Stack align="center" gap="md">
            <Text size="sm" c="dimmed">Scan with your banking app</Text>
            <Image
              src={paymentResponse.qr_code_uri}
              alt="PromptPay QR Code"
              w={200}
              h={200}
              className={styles.qrCode}
            />
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Waiting for payment...</Text>
            </Group>
          </Stack>
        )}

        {/* Close button for success/failure */}
        {(isSuccess || isFailed) && (
          <Button onClick={handleClose} variant="light">
            Close
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
