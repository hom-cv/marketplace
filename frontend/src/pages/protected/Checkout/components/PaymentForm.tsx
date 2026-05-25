import { useState } from "react";
import { Loader } from "@mantine/core";
import { IconCreditCard, IconQrcode } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createCardPayment, createPromptPayPayment } from "@/api/payments";
import type {
  PaymentResponse,
  PromptPayQr,
  ShippingAddress,
} from "@/api/types/payment";
import { formatThb } from "@/utils/currency";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuthStore } from "@/stores/authStore";
import type { PaymentMethod } from "../CheckoutPage";
import styles from "../CheckoutPage.module.css";

interface PaymentFormProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  postId: number;
  shipping: ShippingAddress;
  total: number;
  onError: (message: string | null) => void;
  onIntentCreated: (intent: PaymentResponse) => void;
  onPromptPayQr: (qr: PromptPayQr | null) => void;
}

export function PaymentForm({
  paymentMethod,
  onPaymentMethodChange,
  postId,
  shipping,
  total,
  onError,
  onIntentCreated,
  onPromptPayQr,
}: PaymentFormProps) {
  const { t } = useTranslation("common");
  const stripe = useStripe();
  const elements = useElements();
  const buyerEmail = useAuthStore((state) => state.user?.email_address);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe) {
      onError(t("checkout.paymentSystemNotLoaded"));
      return;
    }
    if (paymentMethod === "card" && (!elements || !isElementReady)) {
      onError(t("checkout.paymentSystemNotLoaded"));
      return;
    }

    onError(null);
    setIsSubmitting(true);

    try {
      if (paymentMethod === "card") {
        const submit = await elements!.submit();
        if (submit.error) {
          onError(submit.error.message ?? "Payment validation failed");
          return;
        }

        const intent = await createCardPayment({ post_id: postId, shipping });
        onIntentCreated(intent);

        const returnUrl = `${window.location.origin}/payment-return`;
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements: elements!,
          clientSecret: intent.client_secret,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        });

        if (error) {
          onError(error.message ?? "Payment failed");
          return;
        }

        if (paymentIntent?.status === "succeeded") {
          onIntentCreated({ ...intent, status: "successful" });
        }
      } else {
        // PromptPay: no PaymentElement to mount. Create the intent server-side,
        // then confirm directly with billing details from the shipping address
        // so Stripe returns next_action.promptpay_display_qr_code inline.
        const intent = await createPromptPayPayment({
          post_id: postId,
          shipping,
        });
        onIntentCreated(intent);

        const { error, paymentIntent } = await stripe.confirmPromptPayPayment(
          intent.client_secret,
          {
            payment_method: {
              billing_details: {
                name: shipping.name,
                phone: shipping.phone,
                email: buyerEmail,
              },
            },
          },
        );

        if (error) {
          onError(error.message ?? "Payment failed");
          return;
        }

        if (paymentIntent?.next_action) {
          // Stripe's TS types don't yet declare promptpay_display_qr_code on NextAction.
          const nextAction = paymentIntent.next_action as {
            type: string;
            promptpay_display_qr_code?: {
              image_url_png?: string;
              image_url_svg?: string;
              data?: string;
            };
          };
          if (
            nextAction.type === "promptpay_display_qr_code" &&
            nextAction.promptpay_display_qr_code
          ) {
            const qr = nextAction.promptpay_display_qr_code;
            if (qr.image_url_png) {
              onPromptPayQr({
                image_url_png: qr.image_url_png,
                image_url_svg: qr.image_url_svg,
                data: qr.data,
              });
            }
          }
        }
      }
    } catch (err) {
      onError((err as Error).message ?? "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    isSubmitting ||
    !stripe ||
    (paymentMethod === "card" && (!elements || !isElementReady));

  return (
    <Card title={t("checkout.paymentMethod")}>
      {/* Payment method tabs */}
      <div className={styles.paymentTabs}>
        <button
          className={`${styles.paymentTab} ${
            paymentMethod === "card" ? styles.paymentTabActive : ""
          }`}
          onClick={() => onPaymentMethodChange("card")}
          disabled={isSubmitting}
        >
          <IconCreditCard size={18} />
          {t("checkout.creditCard")}
        </button>
        <button
          className={`${styles.paymentTab} ${
            paymentMethod === "promptpay" ? styles.paymentTabActive : ""
          }`}
          onClick={() => onPaymentMethodChange("promptpay")}
          disabled={isSubmitting}
        >
          <IconQrcode size={18} />
          PromptPay
        </button>
      </div>

      {/* Stripe Payment Element for card; PromptPay is handled via
          stripe.confirmPromptPayPayment and renders no input UI here. */}
      {paymentMethod === "card" && (
        <div className={styles.paymentElementWrapper}>
          <PaymentElement
            options={{ layout: "tabs" }}
            onReady={() => setIsElementReady(true)}
          />
        </div>
      )}

      {/* Notice */}
      <Alert variant="info" margin="vertical">
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
      </Alert>

      {/* Payment button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader size="xs" color="white" />
        ) : paymentMethod === "card" ? (
          t("checkout.payAmount", { amount: formatThb(total) })
        ) : (
          t("checkout.generateQR", { amount: formatThb(total) })
        )}
      </Button>

      {/* Policy text */}
      <p className={styles.policyText}>
        <Trans
          i18nKey="checkout.paymentAcknowledgment"
          ns="policies"
          components={{
            termsLink: (
              <a href="/terms" target="_blank" rel="noopener noreferrer" />
            ),
            privacyLink: (
              <a href="/privacy" target="_blank" rel="noopener noreferrer" />
            ),
          }}
        />
      </p>
    </Card>
  );
}
