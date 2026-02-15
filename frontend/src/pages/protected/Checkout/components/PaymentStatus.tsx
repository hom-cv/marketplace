import { Loader } from "@mantine/core";
import { IconCheck, IconShoppingBag, IconArrowRight } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
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
        <Alert
          variant="error"
          title={t("status.error")}
          style={{ marginBottom: 20 }}
        >
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
                onClick={() => navigate({ to: "/app/purchases" })}
              >
                {t("checkout.viewPurchases")}
              </Button>
              <Button
                variant="primary"
                rightIcon={<IconArrowRight size={18} />}
                onClick={() => navigate({ to: "/app/explore" })}
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
          style={{ marginBottom: 20 }}
        >
          {paymentStatus?.failure_message || t("checkout.paymentFailedMessage")}
        </Alert>
      )}

      {/* QR Code state */}
      {showQR && paymentResponse && (
        <Card>
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
        </Card>
      )}
    </>
  );
}
