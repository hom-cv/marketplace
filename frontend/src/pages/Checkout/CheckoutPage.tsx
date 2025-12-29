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
  Title,
  Button,
  Alert,
  Loader,
  Center,
  Stepper,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCreditCard, IconMapPin, IconArrowLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { createCardPayment, createPromptPayPayment, getPaymentStatus, getPriceBreakdown } from "@/api/payments";
import { getPost } from "@/api/posts";
import type { ShippingAddress, PaymentResponse } from "@/api/types/payment";

import { OrderSummary } from "./components/OrderSummary";
import { ShippingAddressForm } from "./components/ShippingAddressForm";
import { PaymentMethodForm } from "./components/PaymentMethodForm";
import { PaymentStatusView } from "./components/PaymentStatusView";

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
  const { postId } = useParams({ from: "/protected/app/checkout/$postId" });
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);
  const [isTokenizing, setIsTokenizing] = useState(false);

  // Card form
  const cardForm = useForm({
    initialValues: {
      name: "",
      number: "",
      expMonth: "",
      expYear: "",
      cvv: "",
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? t("checkout.form.nameRequired") : null),
      number: (value) => (value.replace(/\s/g, "").length < 13 ? t("checkout.form.cardRequired") : null),
      expMonth: (value) => (/^(0[1-9]|1[0-2]|[1-9])$/.test(value) ? null : t("checkout.form.validMonth")),
      expYear: (value) => (/^\d{2,4}$/.test(value) ? null : t("checkout.form.validYear")),
      cvv: (value) => (/^\d{3,4}$/.test(value) ? null : t("checkout.form.validCvv")),
    },
  });

  // Shipping form
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
      name: (value) => (value.trim().length < 2 ? t("checkout.form.nameRequired") : null),
      phone: (value) => (value.trim().length < 9 ? t("checkout.form.phoneRequired") : null),
      address: (value) => (value.trim().length < 5 ? t("checkout.form.addressRequired") : null),
      district: (value) => (value.trim().length < 2 ? t("checkout.form.districtRequired") : null),
      province: (value) => (value.trim().length < 2 ? t("checkout.form.provinceRequired") : null),
      postal_code: (value) => (/^\d{5}$/.test(value) ? null : t("checkout.form.postalRequired")),
    },
  });

  // Queries
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(parseInt(postId, 10)),
    enabled: !!postId,
  });

  const { data: priceBreakdown } = useQuery({
    queryKey: ["priceBreakdown", postId, paymentMethod],
    queryFn: () => getPriceBreakdown(parseInt(postId, 10), paymentMethod),
    enabled: !!postId,
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ["paymentStatus", paymentResponse?.payment_id],
    queryFn: () => getPaymentStatus(paymentResponse!.payment_id),
    enabled: !!paymentResponse?.payment_id && paymentResponse.status === "pending" && paymentMethod === "promptpay",
    refetchInterval: 3000,
  });

  // Mutations
  const cardPaymentMutation = useMutation({
    mutationFn: createCardPayment,
    onSuccess: (data) => {
      setPaymentResponse(data);
      if (data.authorize_uri) {
        window.location.href = data.authorize_uri;
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const promptPayMutation = useMutation({
    mutationFn: createPromptPayPayment,
    onSuccess: (data) => setPaymentResponse(data),
    onError: (err: Error) => setError(err.message),
  });

  // Load Omise script and set public key
  useEffect(() => {
    const setOmiseKey = () => {
      if (window.Omise) {
        window.Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY || "");
      }
    };

    if (window.Omise) {
      // Script already loaded
      setOmiseKey();
    } else {
      // Load script and set key on load
      const script = document.createElement("script");
      script.src = "https://cdn.omise.co/omise.js";
      script.async = true;
      script.onload = setOmiseKey;
      document.body.appendChild(script);
    }
  }, []);

  // Handlers
  const handleNextStep = () => {
    if (!shippingForm.validate().hasErrors) {
      setStep(1);
    }
  };

  const handleCardSubmit = () => {
    if (cardForm.validate().hasErrors) return;
    if (!window.Omise || !post) {
      setError(t("checkout.paymentSystemNotLoaded"));
      return;
    }

    setIsTokenizing(true);
    setError(null);

    const { name, number, expMonth, expYear, cvv } = cardForm.values;

    window.Omise.createToken(
      "card",
      {
        name,
        number: number.replace(/\s/g, ""),
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

  const handlePromptPay = () => {
    if (!post) return;
    setError(null);
    promptPayMutation.mutate({
      post_id: post.id,
      return_uri: `${window.location.origin}/app/payment-return`,
      shipping: shippingForm.values,
    });
  };

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
        <Alert color="red" title={t("status.error")}>
          {t("checkout.failedToLoadProduct")}
        </Alert>
        <Button mt="md" variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate({ to: "/app/explore" })}>
          {t("checkout.backToExplore")}
        </Button>
      </Container>
    );
  }

  const total = parseFloat(priceBreakdown?.total ?? "0");
  const hasPaymentResponse = !!paymentResponse;

  return (
    <Container size="lg">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="lg"
        onClick={() => navigate({ to: `/app/posts/${postId}` })}
      >
        {t("checkout.backToListing")}
      </Button>

      <Title order={1} mb="xl">{t("checkout.title")}</Title>

      <Grid gutter="xl">
        {/* LEFT SIDE - Forms */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            <PaymentStatusView
              paymentResponse={paymentResponse}
              paymentStatus={paymentStatus ?? null}
              error={error}
            />

            {!hasPaymentResponse && (
              <>
                <Stepper active={step} size="sm">
                  <Stepper.Step label={t("checkout.shipping")} icon={<IconMapPin size={18} />} />
                  <Stepper.Step label={t("checkout.payment")} icon={<IconCreditCard size={18} />} />
                </Stepper>

                {step === 0 && (
                  <ShippingAddressForm
                    form={shippingForm}
                    onSubmit={handleNextStep}
                  />
                )}

                {step === 1 && (
                  <PaymentMethodForm
                    shippingAddress={shippingForm.values}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cardForm={cardForm}
                    onCardSubmit={handleCardSubmit}
                    onPromptPaySubmit={handlePromptPay}
                    onEditShipping={() => setStep(0)}
                    total={total}
                    isCardLoading={isTokenizing || cardPaymentMutation.isPending}
                    isPromptPayLoading={promptPayMutation.isPending}
                  />
                )}
              </>
            )}
          </Stack>
        </Grid.Col>

        {/* RIGHT SIDE - Order Summary */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <OrderSummary post={post} priceBreakdown={priceBreakdown} />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
