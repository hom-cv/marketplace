import { Loader } from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconShoppingBag,
  IconArrowRight,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StatusIcon } from "@/components/StatusIcon";
import type { PaymentResponse, PaymentStatusResponse } from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface PaymentStatusProps {
  paymentResponse: PaymentResponse | null;
  paymentStatus: PaymentStatusResponse | null;
  error: string | null;
}

export function PaymentStatus({
  paymentResponse,
  paymentStatus,
  error,
}: PaymentStatusProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const isSuccess =
    paymentStatus?.status === "successful" ||
    paymentResponse?.status === "successful";
  const isFailed =
    paymentStatus?.status === "failed" || paymentResponse?.status === "failed";
  const showQR = paymentResponse?.qr_code_uri && !isSuccess && !isFailed;

  return (
    <>
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
      {showQR && paymentResponse && (
        <div className={styles.card}>
          <div className={styles.qrContainer}>
            <h3 className={styles.qrTitle}>{t("checkout.scanToPay")}</h3>
            <p className={styles.qrSubtitle}>{t("checkout.scanWithApp")}</p>
            <img
              src={paymentResponse.qr_code_uri ?? undefined}
              alt="PromptPay QR Code"
              className={styles.qrCode}
            />
            {paymentResponse.expires_at && (
              <p className={styles.qrExpiry}>
                {t("checkout.expires", {
                  time: new Date(
                    paymentResponse.expires_at
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
    </>
  );
}
