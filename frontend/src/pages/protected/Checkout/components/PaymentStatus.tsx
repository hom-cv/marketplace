import { Loader } from "@mantine/core";
import {
  IconCheck,
  IconShoppingBag,
  IconArrowRight,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusIcon } from "@/components/StatusIcon";
import type {
  PaymentResponse,
  PaymentStatusResponse,
  PromptPayQr,
} from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface PaymentStatusProps {
  paymentResponse: PaymentResponse | null;
  paymentStatus: PaymentStatusResponse | null;
  promptpayQr: PromptPayQr | null;
  error: string | null;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function PaymentStatus({
  paymentResponse,
  paymentStatus,
  promptpayQr,
  error,
  onCancel,
  isCancelling,
}: PaymentStatusProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const isSuccess =
    paymentStatus?.status === "successful" ||
    paymentResponse?.status === "successful";
  const isFailed =
    paymentStatus?.status === "failed" || paymentResponse?.status === "failed";
  const isRefundRequired = paymentStatus?.status === "refund_required";
  const showQR = !!promptpayQr && !isSuccess && !isFailed && !isRefundRequired;

  return (
    <>
      {/* Error alert */}
      {error && (
        <Alert variant="error" title={t("status.error")} margin="bottom">
          {error}
        </Alert>
      )}

      {/* Success state */}
      {isSuccess && (
        <Card>
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
              <Button
                variant="secondary"
                leftIcon={<IconShoppingBag size={18} />}
                onClick={() => navigate({ to: "/account/purchases" })}
              >
                {t("checkout.viewPurchases")}
              </Button>
              <Button
                variant="primary"
                rightIcon={<IconArrowRight size={18} />}
                onClick={() => navigate({ to: "/explore" })}
              >
                {t("checkout.continueShoppingBtn")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Failed state */}
      {isFailed && (
        <Alert
          variant="error"
          title={t("checkout.paymentFailed")}
          margin="bottom"
        >
          {paymentStatus?.failure_message || t("checkout.paymentFailedMessage")}
        </Alert>
      )}

      {isRefundRequired && (
        <Alert
          variant="warning"
          title={t("checkout.refundRequiredTitle")}
          margin="bottom"
        >
          {t("checkout.refundRequiredMessage")}
        </Alert>
      )}

      {/* QR Code state */}
      {showQR && promptpayQr && (
        <Card>
          <div className={styles.qrContainer}>
            <h3 className={styles.qrTitle}>{t("checkout.scanToPay")}</h3>
            <p className={styles.qrSubtitle}>{t("checkout.scanWithApp")}</p>
            <img
              src={promptpayQr.image_url_png}
              alt="PromptPay QR Code"
              className={styles.qrCode}
            />
            <div className={styles.waitingIndicator}>
              <Loader size="xs" />
              <span>{t("checkout.waitingForPayment")}</span>
            </div>
            <p className={styles.qrSubtitle}>{t("checkout.qrValidity")}</p>
            {onCancel && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {t("checkout.cancelAndChooseAnother")}
              </Button>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
