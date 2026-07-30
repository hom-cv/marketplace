/**
 * Checkout Page - Dedicated page for completing purchases
 * Flat design matching homepage/auth/explore pages
 */

import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconArrowLeft, IconMapPin, IconCreditCard } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Elements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { usePost } from "@/hooks/usePosts";
import { usePriceBreakdown, usePaymentStatus } from "@/hooks/usePayments";
import { queryKeys } from "@/hooks/queryKeys";
import { cancelPayment } from "@/api/payments";
import { getErrorMessage } from "@/utils/error";
import type {
  ShippingAddress,
  PaymentResponse,
  PromptPayQr,
} from "@/api/types/payment";
import { stripePromise } from "@/lib/stripe";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { OrderProgressRail } from "@/components/OrderProgressRail";
import {
  ShippingForm,
  PaymentForm,
  OrderSummary,
  ShippingPreview,
  PaymentStatus,
} from "./components";
import styles from "./CheckoutPage.module.css";

export type PaymentMethod = "card" | "promptpay";

export function CheckoutPage() {
  const { postId } = useParams({ from: "/protected/checkout/$postId" });
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] =
    useState<PaymentResponse | null>(null);
  const [promptpayQr, setPromptpayQr] = useState<PromptPayQr | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const queryClient = useQueryClient();

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
      name: (value) =>
        value.trim().length < 2 ? t("checkout.form.nameRequired") : null,
      phone: (value) =>
        value.trim().length < 9 ? t("checkout.form.phoneRequired") : null,
      address: (value) =>
        value.trim().length < 5 ? t("checkout.form.addressRequired") : null,
      district: (value) =>
        value.trim().length < 2 ? t("checkout.form.districtRequired") : null,
      province: (value) =>
        value.trim().length < 2 ? t("checkout.form.provinceRequired") : null,
      postal_code: (value) =>
        /^\d{5}$/.test(value) ? null : t("checkout.form.postalRequired"),
    },
  });

  // Queries
  const {
    data: post,
    isLoading: postLoading,
    error: postError,
  } = usePost(postId);

  const { data: priceBreakdown } = usePriceBreakdown(postId, paymentMethod);

  const { data: paymentStatus } = usePaymentStatus(
    paymentResponse?.payment_id ?? null,
    {
      enabled:
        !!paymentResponse?.payment_id && paymentResponse?.status === "pending",
      refetchInterval: (query) =>
        query.state.data?.status === "pending" ? 3000 : false,
    },
  );

  const handleNextStep = () => {
    if (!shippingForm.validate().hasErrors) {
      setStep(1);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentResponse) return;
    setIsCancelling(true);
    try {
      await cancelPayment(paymentResponse.payment_id);
      setPaymentResponse(null);
      setPromptpayQr(null);
      setError(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(postId),
      });
    } catch (err) {
      setError(getErrorMessage(err, t("checkout.paymentFailedMessage")));
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (postLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (postError || !post) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Alert variant="error" title={t("status.error")} margin="bottom">
            {t("checkout.failedToLoadProduct")}
          </Alert>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate({ to: "/explore" })}
          >
            {t("checkout.backToExplore")}
          </Button>
        </div>
      </div>
    );
  }

  const totalThb = parseFloat(priceBreakdown?.total ?? "0");
  const amountSatang = Math.round(totalThb * 100);
  const hasPaymentResponse = !!paymentResponse;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconArrowLeft size={16} />}
            onClick={() => navigate({ to: `/explore/${postId}` })}
          >
            {t("checkout.backToListing")}
          </Button>
          <h1 className={styles.title}>{t("checkout.title")}</h1>
        </div>

        <div className={styles.layout}>
          {/* Main content */}
          <div>
            <PaymentStatus
              paymentResponse={paymentResponse}
              paymentStatus={paymentStatus ?? null}
              promptpayQr={promptpayQr}
              error={error}
              onCancel={handleCancelPayment}
              isCancelling={isCancelling}
            />

            {/* Checkout forms */}
            {!hasPaymentResponse && (
              <>
                <div className={styles.stepperWrapper}>
                  <OrderProgressRail
                    steps={[
                      { label: t("checkout.shipping"), icon: IconMapPin },
                      { label: t("checkout.payment"), icon: IconCreditCard },
                    ]}
                    currentStep={step}
                  />
                </div>

                {step === 0 && (
                  <ShippingForm form={shippingForm} onSubmit={handleNextStep} />
                )}

                {step === 1 && amountSatang > 0 && (
                  <Elements
                    key={paymentMethod}
                    stripe={stripePromise}
                    options={{
                      mode: "payment",
                      amount: amountSatang,
                      currency: "thb",
                      paymentMethodTypes: [paymentMethod],
                    }}
                  >
                    <PaymentForm
                      paymentMethod={paymentMethod}
                      onPaymentMethodChange={setPaymentMethod}
                      postId={post.id}
                      shipping={shippingForm.values}
                      total={totalThb}
                      onError={setError}
                      onIntentCreated={setPaymentResponse}
                      onPromptPayQr={setPromptpayQr}
                    />
                  </Elements>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {step === 1 && !hasPaymentResponse && (
              <ShippingPreview
                address={shippingForm.values}
                onEdit={() => setStep(0)}
              />
            )}
            <OrderSummary post={post} priceBreakdown={priceBreakdown} />
          </div>
        </div>
      </div>
    </div>
  );
}
