/**
 * Purchase History Page - Flat design
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import {
  IconShoppingBag,
  IconAlertCircle,
  IconPackage,
  IconTruck,
  IconCheck,
  IconChevronDown,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getMyPurchases, confirmDelivery } from "@/api/payments";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { UserCard } from "@/components/UserCard";
import { FULFILLMENT_LABELS } from "@/constants/shipping";
import styles from "./PurchaseHistoryPage.module.css";

export function PurchaseHistoryPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: purchases, isLoading, error } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: getMyPurchases,
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: number) => confirmDelivery(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] });
    },
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <IconAlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>
              {error instanceof Error ? error.message : t("errors.failedToLoad")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getFulfillmentStep = (status: string | null): number => {
    switch (status) {
      case "packing": return 0;
      case "in_transit": return 1;
      case "delivered": return 2;
      default: return 0;
    }
  };

  const getBadgeClass = (status: string | null) => {
    switch (status) {
      case "packing": return styles.badgePacking;
      case "in_transit": return styles.badgeInTransit;
      case "delivered": return styles.badgeDelivered;
      default: return styles.badgePacking;
    }
  };

  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  const steps = [
    { icon: IconPackage, label: t("purchases.packing") },
    { icon: IconTruck, label: t("purchases.inTransit") },
    { icon: IconCheck, label: t("purchases.delivered") },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("purchases.title")}</h1>
          <p className={styles.subtitle}>{t("purchases.subtitle")}</p>
        </div>

        {successfulPurchases.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>
                <IconShoppingBag size={28} />
              </div>
              <p className={styles.emptyTitle}>{t("purchases.noPurchases")}</p>
              <p className={styles.emptyText}>{t("purchases.noPurchasesDesc")}</p>
            </div>
          </div>
        ) : (
          <div className={styles.purchaseList}>
            {successfulPurchases.map((purchase) => {
              const currentStep = getFulfillmentStep(purchase.fulfillment_status);

              return (
                <div key={purchase.payment_id} className={styles.purchaseCard}>
                  <div
                    className={styles.purchaseHeader}
                    onClick={() => setExpandedId(expandedId === purchase.payment_id ? null : purchase.payment_id)}
                  >
                    <img
                      src={purchase.post.image_url || "https://placehold.co/56x56?text=No+Image"}
                      alt={purchase.post.title}
                      className={styles.purchaseImage}
                    />
                    <div className={styles.purchaseInfo}>
                      <div className={styles.purchaseTopRow}>
                        <p className={styles.purchaseTitle}>{purchase.post.title}</p>
                        <span className={styles.purchasePrice}>
                          ฿{(purchase.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={styles.purchaseMeta}>
                        <span className={`${styles.badge} ${getBadgeClass(purchase.fulfillment_status)}`}>
                          {FULFILLMENT_LABELS[purchase.fulfillment_status || ""] || "Processing"}
                        </span>
                        <span className={styles.purchaseDate}>
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <IconChevronDown
                      size={20}
                      className={`${styles.expandIcon} ${expandedId === purchase.payment_id ? styles.expandIconOpen : ""}`}
                    />
                  </div>

                  {expandedId === purchase.payment_id && (
                    <div className={styles.purchaseContent}>
                      <div className={styles.contentGrid}>
                        <div>
                          <div className={styles.infoCard}>
                            <p className={styles.infoLabel}>{t("purchases.orderProgress")}</p>
                            <div className={styles.stepper}>
                              {steps.map((step, index) => {
                                const StepIcon = step.icon;
                                const isCompleted = index < currentStep;
                                const isActive = index === currentStep;
                                const isLast = index === steps.length - 1;

                                return (
                                  <div key={index} className={styles.step}>
                                    <div className={styles.stepIndicator}>
                                      <div
                                        className={`${styles.stepIcon} ${
                                          isCompleted ? styles.stepIconCompleted : isActive ? styles.stepIconActive : ""
                                        }`}
                                      >
                                        <StepIcon size={14} />
                                      </div>
                                      {!isLast && (
                                        <div
                                          className={`${styles.stepLine} ${isCompleted ? styles.stepLineCompleted : ""}`}
                                        />
                                      )}
                                    </div>
                                    <div className={styles.stepContent}>
                                      <p
                                        className={`${styles.stepLabel} ${
                                          isCompleted ? styles.stepLabelCompleted : isActive ? styles.stepLabelActive : ""
                                        }`}
                                      >
                                        {step.label}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {purchase.fulfillment_status === "in_transit" && (
                            <button
                              type="button"
                              className={styles.confirmButton}
                              onClick={() => confirmMutation.mutate(purchase.payment_id)}
                              disabled={confirmMutation.isPending}
                            >
                              {confirmMutation.isPending ? (
                                <Loader size="xs" color="white" />
                              ) : (
                                <>
                                  <IconCheck size={16} />
                                  {t("purchases.confirmDelivery")}
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div>
                          {purchase.seller && (
                            <UserCard username={purchase.seller.username} label={t("purchases.seller")} />
                          )}

                          {purchase.shipping_name && (
                            <div style={{ marginTop: 12 }}>
                              <ShippingAddressCard
                                name={purchase.shipping_name}
                                phone={purchase.shipping_phone}
                                address={purchase.shipping_address}
                                district={purchase.shipping_district}
                                province={purchase.shipping_province}
                                postalCode={purchase.shipping_postal_code}
                                label={t("purchases.shippingTo")}
                              />
                            </div>
                          )}

                          {purchase.tracking_number && (
                            <div style={{ marginTop: 12 }}>
                              <TrackingInfoCard
                                trackingNumber={purchase.tracking_number}
                                carrier={purchase.shipping_carrier}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
