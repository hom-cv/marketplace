/**
 * Checkout Page - Dedicated page for completing purchases
 * Flat design matching homepage/auth/explore pages
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Loader, TextInput, SimpleGrid } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconArrowLeft,
  IconMapPin,
  IconCreditCard,
  IconQrcode,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconShoppingBag,
  IconArrowRight,
} from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import {
  createCardPayment,
  createPromptPayPayment,
  getPaymentStatus,
  getPriceBreakdown,
} from "@/api/payments";
import { getPost } from "@/api/posts";
import type { ShippingAddress, PaymentResponse } from "@/api/types/payment";
import { StatusIcon } from "@/components/StatusIcon";
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
        callback: (
          statusCode: number,
          response: { id?: string; message?: string },
        ) => void,
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
  const [paymentResponse, setPaymentResponse] =
    useState<PaymentResponse | null>(null);
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
      name: (value) =>
        value.trim().length < 2 ? t("checkout.form.nameRequired") : null,
      number: (value) =>
        value.replace(/\s/g, "").length < 13
          ? t("checkout.form.cardRequired")
          : null,
      expMonth: (value) =>
        /^(0[1-9]|1[0-2]|[1-9])$/.test(value)
          ? null
          : t("checkout.form.validMonth"),
      expYear: (value) =>
        /^\d{2,4}$/.test(value) ? null : t("checkout.form.validYear"),
      cvv: (value) =>
        /^\d{3,4}$/.test(value) ? null : t("checkout.form.validCvv"),
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
  } = useQuery({
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
    enabled:
      !!paymentResponse?.payment_id &&
      paymentResponse.status === "pending" &&
      paymentMethod === "promptpay",
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
      setOmiseKey();
    } else {
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
      },
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

  const formatAmount = (v: number) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
          <div className={styles.errorAlert}>
            <IconX size={18} className={styles.errorAlertIcon} />
            <div className={styles.errorAlertContent}>
              <p className={styles.errorAlertTitle}>{t("status.error")}</p>
              <p className={styles.errorAlertMessage}>
                {t("checkout.failedToLoadProduct")}
              </p>
            </div>
          </div>
          <button
            className={styles.backButton}
            onClick={() => navigate({ to: "/app/explore" })}
          >
            <IconArrowLeft size={16} />
            {t("checkout.backToExplore")}
          </button>
        </div>
      </div>
    );
  }

  const itemPrice = parseFloat(priceBreakdown?.item_price ?? "0");
  const shippingCost = parseFloat(priceBreakdown?.shipping_cost ?? "0");
  const total = parseFloat(priceBreakdown?.total ?? "0");
  const isSuccess =
    paymentStatus?.status === "successful" ||
    paymentResponse?.status === "successful";
  const isFailed =
    paymentStatus?.status === "failed" || paymentResponse?.status === "failed";
  const showQR = paymentResponse?.qr_code_uri && !isSuccess && !isFailed;
  const hasPaymentResponse = !!paymentResponse;
  const isLoading =
    isTokenizing ||
    cardPaymentMutation.isPending ||
    promptPayMutation.isPending;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate({ to: `/explore/${postId}` })}
          >
            <IconArrowLeft size={16} />
            {t("checkout.backToListing")}
          </button>
          <h1 className={styles.title}>{t("checkout.title")}</h1>
        </div>

        <div className={styles.layout}>
          {/* Main content */}
          <div>
            {/* Error alert */}
            {error && (
              <div className={styles.errorAlert}>
                <IconX size={18} className={styles.errorAlertIcon} />
                <div className={styles.errorAlertContent}>
                  <p className={styles.errorAlertTitle}>{t("status.error")}</p>
                  <p className={styles.errorAlertMessage}>{error}</p>
                </div>
              </div>
            )}

            {/* Success state */}
            {isSuccess && (
              <div className={styles.card}>
                <div className={styles.successContainer}>
                  <StatusIcon variant="success" size={64}>
                    <IconCheck size={32} />
                  </StatusIcon>
                  <h2 className={styles.successTitle}>
                    {t("checkout.paymentSuccess")}
                  </h2>
                  <p className={styles.successMessage}>
                    {t("checkout.paymentSuccessMessage")}
                  </p>
                  <div className={styles.buttonGroup}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => navigate({ to: "/app/purchases" })}
                    >
                      <IconShoppingBag size={18} />
                      {t("checkout.viewPurchases")}
                    </button>
                    <button
                      className={styles.primaryButtonCompact}
                      onClick={() => navigate({ to: "/app/explore" })}
                    >
                      {t("checkout.continueShoppingBtn")}
                      <IconArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Failed state */}
            {isFailed && (
              <div className={styles.errorAlert}>
                <IconX size={18} className={styles.errorAlertIcon} />
                <div className={styles.errorAlertContent}>
                  <p className={styles.errorAlertTitle}>
                    {t("checkout.paymentFailed")}
                  </p>
                  <p className={styles.errorAlertMessage}>
                    {paymentStatus?.failure_message ||
                      t("checkout.paymentFailedMessage")}
                  </p>
                </div>
              </div>
            )}

            {/* QR Code state */}
            {showQR && (
              <div className={styles.card}>
                <div className={styles.qrContainer}>
                  <h3 className={styles.qrTitle}>{t("checkout.scanToPay")}</h3>
                  <p className={styles.qrSubtitle}>
                    {t("checkout.scanWithApp")}
                  </p>
                  <img
                    src={paymentResponse.qr_code_uri ?? undefined}
                    alt="PromptPay QR Code"
                    className={styles.qrCode}
                  />
                  {paymentResponse.expires_at && (
                    <p className={styles.qrExpiry}>
                      {t("checkout.expires", {
                        time: new Date(
                          paymentResponse.expires_at,
                        ).toLocaleTimeString(),
                      })}
                    </p>
                  )}
                  <div className={styles.waitingIndicator}>
                    <Loader size="xs" />
                    <span>{t("checkout.waitingForPayment")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout forms */}
            {!hasPaymentResponse && (
              <>
                {/* Stepper */}
                <div className={styles.stepper}>
                  <div
                    className={`${styles.step} ${
                      step === 0
                        ? styles.stepActive
                        : step > 0
                          ? styles.stepCompleted
                          : ""
                    }`}
                  >
                    <span className={styles.stepNumber}>
                      {step > 0 ? <IconCheck size={14} /> : "1"}
                    </span>
                    <IconMapPin size={16} />
                    {t("checkout.shipping")}
                  </div>
                  <div
                    className={`${styles.step} ${
                      step === 1 ? styles.stepActive : ""
                    }`}
                  >
                    <span className={styles.stepNumber}>2</span>
                    <IconCreditCard size={16} />
                    {t("checkout.payment")}
                  </div>
                </div>

                {/* Step 0: Shipping */}
                {step === 0 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>
                      {t("checkout.shippingAddress")}
                    </h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleNextStep();
                      }}
                    >
                      <div className={styles.formRow}>
                        <TextInput
                          label={t("checkout.recipientName")}
                          placeholder={t("checkout.namePlaceholder")}
                          radius="xs"
                          {...shippingForm.getInputProps("name")}
                        />
                        <TextInput
                          label={t("checkout.form.phone")}
                          placeholder={t("checkout.phonePlaceholder")}
                          radius="xs"
                          {...shippingForm.getInputProps("phone")}
                        />
                        <TextInput
                          label={t("checkout.form.address")}
                          placeholder={t("checkout.addressPlaceholder")}
                          radius="xs"
                          {...shippingForm.getInputProps("address")}
                        />
                        <TextInput
                          label={t("checkout.form.district")}
                          placeholder={t("checkout.districtPlaceholder")}
                          radius="xs"
                          {...shippingForm.getInputProps("district")}
                        />
                        <SimpleGrid cols={2}>
                          <TextInput
                            label={t("checkout.form.province")}
                            placeholder={t("checkout.provincePlaceholder")}
                            radius="xs"
                            {...shippingForm.getInputProps("province")}
                          />
                          <TextInput
                            label={t("checkout.form.postalCode")}
                            placeholder={t("checkout.postalPlaceholder")}
                            maxLength={5}
                            radius="xs"
                            {...shippingForm.getInputProps("postal_code")}
                          />
                        </SimpleGrid>
                        <button type="submit" className={styles.primaryButton}>
                          {t("checkout.continueToPayment")}
                          <IconArrowRight size={18} />
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 1: Payment */}
                {step === 1 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>
                      {t("checkout.paymentMethod")}
                    </h3>

                    {/* Payment tabs */}
                    <div className={styles.paymentTabs}>
                      <button
                        className={`${styles.paymentTab} ${
                          paymentMethod === "card"
                            ? styles.paymentTabActive
                            : ""
                        }`}
                        onClick={() => setPaymentMethod("card")}
                      >
                        <IconCreditCard size={18} />
                        {t("checkout.creditCard")}
                      </button>
                      <button
                        className={`${styles.paymentTab} ${
                          paymentMethod === "promptpay"
                            ? styles.paymentTabActive
                            : ""
                        }`}
                        onClick={() => setPaymentMethod("promptpay")}
                      >
                        <IconQrcode size={18} />
                        PromptPay
                      </button>
                    </div>

                    {/* Card form */}
                    {paymentMethod === "card" && (
                      <div className={styles.formRow}>
                        <TextInput
                          label={t("checkout.cardholderName")}
                          placeholder={t("checkout.nameOnCard")}
                          radius="xs"
                          {...cardForm.getInputProps("name")}
                        />
                        <TextInput
                          label={t("checkout.cardNumber")}
                          placeholder={t("checkout.cardPlaceholder")}
                          radius="xs"
                          {...cardForm.getInputProps("number")}
                        />
                        <SimpleGrid cols={3}>
                          <TextInput
                            label={t("checkout.expMonth")}
                            placeholder="MM"
                            maxLength={2}
                            radius="xs"
                            {...cardForm.getInputProps("expMonth")}
                          />
                          <TextInput
                            label={t("checkout.expYear")}
                            placeholder="YY"
                            maxLength={4}
                            radius="xs"
                            {...cardForm.getInputProps("expYear")}
                          />
                          <TextInput
                            label={t("checkout.cvv")}
                            placeholder="123"
                            maxLength={4}
                            radius="xs"
                            {...cardForm.getInputProps("cvv")}
                          />
                        </SimpleGrid>
                      </div>
                    )}

                    {/* Notice */}
                    <div className={styles.notice}>
                      <IconInfoCircle size={18} className={styles.noticeIcon} />
                      <p className={styles.noticeText}>
                        <Trans
                          i18nKey="checkout.refundNotice"
                          ns="policies"
                          components={{
                            refundLink: (
                              <a
                                href="/terms#refund-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                          }}
                        />
                      </p>
                    </div>

                    {/* Payment button */}
                    {paymentMethod === "card" ? (
                      <button
                        className={styles.primaryButton}
                        onClick={handleCardSubmit}
                        disabled={isLoading || !cardForm.isValid()}
                      >
                        {isLoading ? (
                          <Loader size="xs" color="white" />
                        ) : (
                          t("checkout.payAmount", {
                            amount: formatAmount(total),
                          })
                        )}
                      </button>
                    ) : (
                      <button
                        className={styles.primaryButton}
                        onClick={handlePromptPay}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader size="xs" color="white" />
                        ) : (
                          t("checkout.generateQR", {
                            amount: formatAmount(total),
                          })
                        )}
                      </button>
                    )}

                    {/* Policy text */}
                    <p className={styles.policyText}>
                      <Trans
                        i18nKey="checkout.paymentAcknowledgment"
                        ns="policies"
                        components={{
                          termsLink: (
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                          privacyLink: (
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                        }}
                      />
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className={styles.sidebar}>
            {/* Shipping preview - show on payment step */}
            {step === 1 && !hasPaymentResponse && (
              <div className={styles.shippingPreview}>
                <div className={styles.shippingHeader}>
                  <span className={styles.shippingLabel}>
                    {t("checkout.shipToLabel")}
                  </span>
                  <button
                    className={styles.editButton}
                    onClick={() => setStep(0)}
                  >
                    {t("buttons.edit")}
                  </button>
                </div>
                <p className={styles.shippingName}>
                  {shippingForm.values.name}
                </p>
                <p className={styles.shippingDetail}>
                  {shippingForm.values.phone}
                </p>
                <p className={styles.shippingDetail}>
                  {shippingForm.values.address}
                </p>
                <p className={styles.shippingDetail}>
                  {shippingForm.values.district}, {shippingForm.values.province}{" "}
                  {shippingForm.values.postal_code}
                </p>
              </div>
            )}

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{t("checkout.orderSummary")}</h3>

              {/* Item */}
              <div className={styles.itemCard}>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className={styles.itemImage}
                  />
                )}
                <div className={styles.itemDetails}>
                  <p className={styles.itemTitle}>{post.title}</p>
                  <p className={styles.itemSeller}>
                    {t("checkout.soldBy", { username: post.user.username })}
                  </p>
                </div>
              </div>

              <hr className={styles.divider} />

              {/* Price breakdown */}
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>
                  {t("checkout.itemPrice")}
                </span>
                <span className={styles.priceValue}>
                  ฿{formatAmount(itemPrice)}
                </span>
              </div>
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>
                  {t("checkout.shippingLabel")}
                </span>
                <span
                  className={`${styles.priceValue} ${
                    shippingCost === 0 ? styles.freeShipping : ""
                  }`}
                >
                  {shippingCost === 0
                    ? t("checkout.freeShipping")
                    : `฿${formatAmount(shippingCost)}`}
                </span>
              </div>

              {/* Total */}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>{t("checkout.total")}</span>
                <span className={styles.totalValue}>
                  ฿{formatAmount(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
