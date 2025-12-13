/**
 * PaymentModal component for handling card and PromptPay payments
 * Uses a 2-step flow: 1) Shipping Address 2) Payment
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
  Stepper,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCreditCard, IconQrcode, IconCheck, IconX, IconTruck, IconMapPin } from "@tabler/icons-react";
import { createCardPayment, createPromptPayPayment, getPaymentStatus } from "@/api/payments";
import type { Post } from "@/api/types/post";
import type { PaymentResponse, ShippingAddress } from "@/api/types/payment";
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
  const [step, setStep] = useState(0);
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

  // Shipping address form with Mantine useForm
  const shippingForm = useForm<ShippingAddress>({
    initialValues: {
      name: "",
      phone: "",
      address: "",
      district: "",
      province: "",
      postal_code: "",
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? "Name is required" : null),
      phone: (value) => (value.trim().length < 9 ? "Valid phone number required" : null),
      address: (value) => (value.trim().length < 5 ? "Address is required" : null),
      district: (value) => (value.trim().length < 2 ? "District is required" : null),
      province: (value) => (value.trim().length < 2 ? "Province is required" : null),
      postal_code: (value) => (/^\d{5}$/.test(value) ? null : "Valid 5-digit postal code required"),
    },
  });

  // Poll payment status for PromptPay
  const { data: paymentStatus } = useQuery({
    queryKey: ["paymentStatus", paymentResponse?.payment_id],
    queryFn: () => paymentResponse?.payment_id ? getPaymentStatus(paymentResponse.payment_id) : null,
    enabled: !!paymentResponse?.payment_id && paymentResponse.status === "pending" && paymentMethod === "promptpay",
    refetchInterval: 3000,
  });

  // Card payment mutation
  const cardPaymentMutation = useMutation({
    mutationFn: createCardPayment,
    onSuccess: (data) => {
      setPaymentResponse(data);
      if (data.authorize_uri) {
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

  // Load Omise script
  useEffect(() => {
    if (!window.Omise) {
      const script = document.createElement("script");
      script.src = "https://cdn.omise.co/omise.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Set Omise public key when ready
  useEffect(() => {
    if (window.Omise) {
      window.Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY || "");
    }
  }, [opened]);

  // Handle card form submit
  const handleCardSubmit = () => {
    if (!window.Omise) {
      setError("Payment system not loaded. Please refresh.");
      return;
    }

    setIsTokenizing(true);
    setError(null);

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
          return_uri: `${window.location.origin}/app/payment-return`,
          shipping: shippingForm.values,
        });
      }
    );
  };

  // Handle PromptPay
  const handlePromptPay = () => {
    setError(null);
    promptPayMutation.mutate({
      post_id: post.id,
      return_uri: `${window.location.origin}/app/payment-return`,
      shipping: shippingForm.values,
    });
  };

  // Proceed to payment step
  const handleNextStep = () => {
    if (shippingForm.validate().hasErrors) {
      return;
    }
    setStep(1);
  };

  // Check if payment succeeded
  const isSuccess = paymentStatus?.status === "successful" || paymentResponse?.status === "successful";
  const isFailed = paymentStatus?.status === "failed" || paymentResponse?.status === "failed";

  // Reset state on close
  const handleClose = () => {
    setStep(0);
    setPaymentResponse(null);
    setError(null);
    setCardName("");
    setCardNumber("");
    setExpMonth("");
    setExpYear("");
    setCvv("");
    shippingForm.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>Complete Purchase</Title>}
      size="xl"
      centered
      padding="lg"
    >
      <Stack gap="lg">
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

        {/* Stepper - only show when no payment response */}
        {!paymentResponse && (
          <>
            <Stepper active={step} size="sm">
              <Stepper.Step label="Shipping" icon={<IconMapPin size={18} />} />
              <Stepper.Step label="Payment" icon={<IconCreditCard size={18} />} />
            </Stepper>

            {/* Step 1: Shipping Address */}
            {step === 0 && (
              <Paper withBorder p="lg" radius="md">
                <Title order={5} mb="lg">Shipping Address</Title>
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                  <Stack gap="md">
                    <Group grow>
                      <TextInput
                        label="Recipient Name"
                        placeholder="Name for delivery"
                        {...shippingForm.getInputProps("name")}
                      />
                      <TextInput
                        label="Phone"
                        placeholder="08X-XXX-XXXX"
                        {...shippingForm.getInputProps("phone")}
                      />
                    </Group>
                    <TextInput
                      label="Address"
                      placeholder="Street, building, room number"
                      {...shippingForm.getInputProps("address")}
                    />
                    <Group grow>
                      <TextInput
                        label="District"
                        placeholder="District/Subdistrict"
                        {...shippingForm.getInputProps("district")}
                      />
                      <TextInput
                        label="Province"
                        placeholder="Province"
                        {...shippingForm.getInputProps("province")}
                      />
                    </Group>
                    <TextInput
                      label="Postal Code"
                      placeholder="10XXX"
                      maxLength={5}
                      w={150}
                      {...shippingForm.getInputProps("postal_code")}
                    />
                    <Button type="submit" mt="md" size="md" rightSection={<IconTruck size={16} />}>
                      Continue to Payment
                    </Button>
                  </Stack>
                </form>
              </Paper>
            )}

            {/* Step 2: Payment */}
            {step === 1 && (
              <Stack gap="md">
                {/* Address confirmation */}
                <Paper withBorder p="md" radius="md" bg="gray.0">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={600}>Ship to:</Text>
                    <Button size="xs" variant="subtle" onClick={() => setStep(0)}>
                      Edit
                    </Button>
                  </Group>
                  <Text size="sm" fw={500}>{shippingForm.values.name}</Text>
                  <Text size="xs" c="dimmed">{shippingForm.values.phone}</Text>
                  <Text size="xs">{shippingForm.values.address}</Text>
                  <Text size="xs">
                    {shippingForm.values.district}, {shippingForm.values.province} {shippingForm.values.postal_code}
                  </Text>
                </Paper>

                {/* Payment method selector */}
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
              </Stack>
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
              className={styles.qrCode}
            />
            {paymentResponse.expires_at && (
              <Text size="xs" c="dimmed">
                Expires: {new Date(paymentResponse.expires_at).toLocaleTimeString()}
              </Text>
            )}
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">Waiting for payment...</Text>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
