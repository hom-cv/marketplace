/**
 * Checkout Page - Dedicated page for completing purchases
 * Layout: Left side (forms) | Right side (order summary)
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  Container,
  Grid,
  Stack,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Group,
  SegmentedControl,
  Alert,
  Image,
  Loader,
  Center,
  Stepper,
  Divider,
  Card,
  Box,
  Spoiler,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCreditCard, IconQrcode, IconCheck, IconX, IconTruck, IconMapPin, IconArrowLeft } from "@tabler/icons-react";
import { createCardPayment, createPromptPayPayment, getPaymentStatus } from "@/api/payments";
import { getPost } from "@/api/posts";
import type { ShippingAddress, PaymentResponse } from "@/api/types/payment";
import styles from "./CheckoutPage.module.css";

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

export function CheckoutPage() {
  const { postId } = useParams({ strict: false }) as { postId: string };
  const navigate = useNavigate();
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

  // Fetch post data
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(parseInt(postId, 10)),
    enabled: !!postId,
  });

  // Shipping address form
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
  }, []);

  // Handle card form submit
  const handleCardSubmit = () => {
    if (!window.Omise || !post) {
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
    if (!post) return;
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

  // Loading state
  if (postLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Error">
          Failed to load product. Please go back and try again.
        </Alert>
        <Button mt="md" variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate({ to: "/app/explore" })}>
          Back to Explore
        </Button>
      </Container>
    );
  }

  const itemPrice = parseFloat(post.price);
  const shippingCost = parseFloat(post.shipping_cost || "0");

  // Fee constants (must match backend pricing_service.py)
  const VAT_PERCENT = 7;
  const PLATFORM_FEE_PERCENT = 10;
  const CARD_PROCESSING_FEE_PERCENT = 3.65;
  const PROMPTPAY_PROCESSING_FEE_PERCENT = 1.65;
  const PROCESSING_FEE_VAT_PERCENT = 7;

  // VAT and platform fee on item price
  const vatAmount = Math.round(itemPrice * (VAT_PERCENT / 100) * 100) / 100;
  const platformFee = Math.round(itemPrice * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;

  // Subtotal before processing
  const subtotal = itemPrice + shippingCost + vatAmount + platformFee;

  // Processing fee (gross-up: subtotal * rate / (1 - rate))
  const baseProcessingPercent = paymentMethod === "promptpay"
    ? PROMPTPAY_PROCESSING_FEE_PERCENT
    : CARD_PROCESSING_FEE_PERCENT;
  const effectiveProcessingRate = (baseProcessingPercent / 100) * (1 + PROCESSING_FEE_VAT_PERCENT / 100);
  const processingFee = Math.round(subtotal * effectiveProcessingRate / (1 - effectiveProcessingRate) * 100) / 100;
  const effectiveProcessingPercent = effectiveProcessingRate * 100;

  const total = Math.round((subtotal + processingFee) * 100) / 100;

  return (
    <Container size="lg">
      {/* Back button */}
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="lg"
        onClick={() => navigate({ to: `/app/posts/${postId}` })}
      >
        Back to listing
      </Button>

      <Title order={1} mb="xl">Checkout</Title>

      <Grid gutter="xl">
        {/* LEFT SIDE - Forms */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            {/* Success state */}
            {isSuccess && (
              <Paper withBorder p="xl" radius="md" bg="green.0">
                <Stack align="center" gap="md">
                  <IconCheck size={48} color="var(--mantine-color-green-6)" />
                  <Title order={3} ta="center" c="green.8">Payment Successful!</Title>
                  <Text ta="center" c="dimmed">
                    Your payment has been processed. The seller will be notified.
                  </Text>
                  <Group justify="center" mt="md">
                    <Button variant="light" onClick={() => navigate({ to: "/app/purchases" })}>
                      View Purchases
                    </Button>
                    <Button onClick={() => navigate({ to: "/app/explore" })}>
                      Continue Shopping
                    </Button>
                  </Group>
                </Stack>
              </Paper>
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

            {/* PromptPay QR code */}
            {paymentResponse?.qr_code_uri && !isSuccess && !isFailed && (
              <Paper withBorder p="xl" radius="md">
                <Stack align="center" gap="md">
                  <Title order={4}>Scan to Pay</Title>
                  <Text size="sm" c="dimmed">Scan with your banking app</Text>
                  <Image
                    src={paymentResponse.qr_code_uri}
                    alt="PromptPay QR Code"
                    w={250}
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
              </Paper>
            )}

            {/* Forms - only show when no payment response */}
            {!paymentResponse && (
              <>
                <Stepper active={step} size="sm">
                  <Stepper.Step label="Shipping" icon={<IconMapPin size={18} />} />
                  <Stepper.Step label="Payment" icon={<IconCreditCard size={18} />} />
                </Stepper>

                {/* Step 1: Shipping Address */}
                {step === 0 && (
                  <Paper withBorder p="xl" radius="md">
                    <Title order={4} mb="lg">Shipping Address</Title>
                    <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                      <Stack gap="md">
                        <Group grow>
                          <TextInput
                            label="Recipient Name"
                            placeholder="Name for delivery"
                            size="md"
                            {...shippingForm.getInputProps("name")}
                          />
                          <TextInput
                            label="Phone"
                            placeholder="08X-XXX-XXXX"
                            size="md"
                            {...shippingForm.getInputProps("phone")}
                          />
                        </Group>
                        <TextInput
                          label="Address"
                          placeholder="Street, building, room number"
                          size="md"
                          {...shippingForm.getInputProps("address")}
                        />
                        <Group grow>
                          <TextInput
                            label="District"
                            placeholder="District/Subdistrict"
                            size="md"
                            {...shippingForm.getInputProps("district")}
                          />
                          <TextInput
                            label="Province"
                            placeholder="Province"
                            size="md"
                            {...shippingForm.getInputProps("province")}
                          />
                        </Group>
                        <TextInput
                          label="Postal Code"
                          placeholder="10XXX"
                          maxLength={5}
                          size="md"
                          w={180}
                          {...shippingForm.getInputProps("postal_code")}
                        />
                        <Button type="submit" size="lg" mt="md" rightSection={<IconTruck size={18} />}>
                          Continue to Payment
                        </Button>
                      </Stack>
                    </form>
                  </Paper>
                )}

                {/* Step 2: Payment */}
                {step === 1 && (
                  <Stack gap="lg">
                    {/* Address confirmation */}
                    <Paper withBorder p="lg" radius="md" bg="gray.0">
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

                    <Paper withBorder p="xl" radius="md">
                      <Title order={4} mb="lg">Payment Method</Title>

                      <SegmentedControl
                        value={paymentMethod}
                        onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                        data={[
                          {
                            value: "card",
                            label: (
                              <Center>
                                <IconCreditCard size={18} />
                                <Text ml="xs">Credit Card</Text>
                              </Center>
                            ),
                          },
                          {
                            value: "promptpay",
                            label: (
                              <Center>
                                <IconQrcode size={18} />
                                <Text ml="xs">PromptPay</Text>
                              </Center>
                            ),
                          },
                        ]}
                        fullWidth
                        size="md"
                        mb="lg"
                      />

                      {/* Card form */}
                      {paymentMethod === "card" && (
                        <Stack gap="md">
                          <TextInput
                            label="Cardholder Name"
                            placeholder="Name on card"
                            size="md"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                          />
                          <TextInput
                            label="Card Number"
                            placeholder="4242 4242 4242 4242"
                            size="md"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                          />
                          <Group grow>
                            <TextInput
                              label="Exp. Month"
                              placeholder="MM"
                              size="md"
                              value={expMonth}
                              onChange={(e) => setExpMonth(e.target.value)}
                              maxLength={2}
                            />
                            <TextInput
                              label="Exp. Year"
                              placeholder="YY"
                              size="md"
                              value={expYear}
                              onChange={(e) => setExpYear(e.target.value)}
                              maxLength={4}
                            />
                            <TextInput
                              label="CVV"
                              placeholder="123"
                              size="md"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value)}
                              maxLength={4}
                            />
                          </Group>
                          <Button
                            size="lg"
                            mt="md"
                            onClick={handleCardSubmit}
                            loading={isTokenizing || cardPaymentMutation.isPending}
                            disabled={!cardName || !cardNumber || !expMonth || !expYear || !cvv}
                          >
                            Pay ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Button>
                        </Stack>
                      )}

                      {/* PromptPay button */}
                      {paymentMethod === "promptpay" && (
                        <Button
                          size="lg"
                          fullWidth
                          onClick={handlePromptPay}
                          loading={promptPayMutation.isPending}
                        >
                          Generate QR Code - ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Button>
                      )}
                    </Paper>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Grid.Col>

        {/* RIGHT SIDE - Order Summary */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="xl" radius="md" pos="sticky" top={100}>
            <Title order={4} mb="lg">Order Summary</Title>

            {/* Item */}
            <Card withBorder p="sm" radius="md" mb="lg">
              <Group>
                {post.image_url && (
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    w={80}
                    h={80}
                    radius="md"
                    fit="cover"
                  />
                )}
                <Box style={{ flex: 1 }}>
                  <Text fw={500} lineClamp={2}>{post.title}</Text>
                  <Text size="sm" c="dimmed">Sold by @{post.user.username}</Text>
                </Box>
              </Group>
            </Card>

            <Divider my="md" />

            {/* Price breakdown */}
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Item Price</Text>
                <Text size="sm" fw={500}>฿{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Shipping</Text>
                <Text size="sm" fw={500} c={shippingCost === 0 ? "green" : undefined}>
                  {shippingCost === 0 ? "Free" : `฿${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Fees & Taxes</Text>
                <Text size="sm" fw={500}>฿{(vatAmount + processingFee + platformFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </Group>
              <Spoiler maxHeight={0} showLabel="View fee details" hideLabel="Hide details">
                <Stack gap={4} pl="md" mt="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">VAT ({VAT_PERCENT}%)</Text>
                    <Text size="xs" c="dimmed">฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Processing ({effectiveProcessingPercent.toFixed(2)}%)</Text>
                    <Text size="xs" c="dimmed">฿{processingFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Platform ({PLATFORM_FEE_PERCENT}%)</Text>
                    <Text size="xs" c="dimmed">฿{platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </Group>
                </Stack>
              </Spoiler>
            </Stack>

            <Divider my="md" />

            <Group justify="space-between">
              <Text size="lg" fw={600}>Total</Text>
              <Text size="xl" fw={700}>฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
