/**
 * Payment Return Page
 * Handles redirects from Omise 3DS authentication and QR payment completion
 * Flat design matching homepage/auth/explore pages
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { Loader } from "@mantine/core";
import { IconCheck, IconX, IconShoppingBag, IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPaymentStatus } from "@/api/payments";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusIcon } from "@/components/StatusIcon";
import styles from "./PaymentReturnPage.module.css";

export function PaymentReturnPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/protected/app/payment-return" });
  const paymentId = search.payment_id ? parseInt(search.payment_id, 10) : null;
  const [pollCount, setPollCount] = useState(0);
  const { t } = useTranslation("common");

  // Fetch payment status
  const {
    data: paymentStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["paymentStatus", paymentId],
    queryFn: () => (paymentId ? getPaymentStatus(paymentId) : null),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      // Stop polling if payment is complete or after 20 attempts (60 seconds)
      const status = query.state.data?.status;
      if (!status) return 3000; // Keep polling if no data yet
      if (
        status === "successful" ||
        status === "failed" ||
        status === "expired" ||
        pollCount >= 20
      ) {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
  });

  useEffect(() => {
    if (paymentStatus?.status === "pending") {
      setPollCount((prev) => prev + 1);
    }
  }, [paymentStatus]);

  const isSuccess = paymentStatus?.status === "successful";
  const isFailed =
    paymentStatus?.status === "failed" || paymentStatus?.status === "expired";
  const isPending =
    paymentStatus?.status === "pending" ||
    paymentStatus?.status === "authorized";

  // No payment ID provided
  if (!paymentId) {
    return (
      <div className={styles.page}>
        <Card padding="lg" centered>
          <Alert
            variant="warning"
            title={t("paymentReturn.noPayment")}
            fullWidth
          >
            {t("paymentReturn.noPaymentMessage")}
          </Alert>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.page}>
        <Card padding="lg" centered>
          <div className={styles.loadingContainer}>
            <Loader size="lg" />
            <p className={styles.loadingText}>
              {t("paymentReturn.loadingStatus")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <Card padding="lg" centered>
          <Alert variant="error" title={t("status.error")} fullWidth>
            {error instanceof Error ? error.message : t("errors.failedToLoad")}
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Card padding="lg" centered className={styles.card}>
        {/* Success */}
        {isSuccess && (
          <>
            <StatusIcon variant="success" size={72}>
              <IconCheck size={36} />
            </StatusIcon>
            <h1 className={`${styles.title} ${styles.titleSuccess}`}>
              {t("paymentReturn.success")}
            </h1>
            <p className={styles.message}>
              {t("paymentReturn.successMessage", {
                amount: (paymentStatus.amount / 100).toLocaleString(),
              })}
            </p>
            <div className={styles.buttonGroup}>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<IconShoppingBag size={18} />}
                onClick={() => navigate({ to: "/app/purchases" })}
              >
                {t("paymentReturn.viewPurchases")}
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                rightIcon={<IconArrowRight size={18} />}
                onClick={() => navigate({ to: "/app/explore" })}
              >
                {t("paymentReturn.continueShopping")}
              </Button>
            </div>
          </>
        )}

        {/* Failed */}
        {isFailed && (
          <>
            <StatusIcon variant="error" size={72}>
              <IconX size={36} />
            </StatusIcon>
            <h1 className={`${styles.title} ${styles.titleError}`}>
              {t("paymentReturn.failed")}
            </h1>
            <p className={styles.message}>
              {paymentStatus?.failure_message ||
                t("paymentReturn.failedMessage")}
            </p>
            {paymentStatus?.failure_code && (
              <p className={styles.errorCode}>
                {t("paymentReturn.errorCode", {
                  code: paymentStatus.failure_code,
                })}
              </p>
            )}
            <div className={styles.buttonGroup}>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => navigate({ to: "/app/explore" })}
              >
                {t("paymentReturn.returnToShop")}
              </Button>
            </div>
          </>
        )}

        {/* Pending */}
        {isPending && (
          <>
            <Loader size="lg" />
            <h2 className={styles.pendingTitle}>
              {t("paymentReturn.processing")}
            </h2>
            <p className={styles.message}>
              {t("paymentReturn.processingMessage")}
            </p>
            {pollCount >= 15 && (
              <p className={styles.takingLong}>
                {t("paymentReturn.takingLong")}
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
