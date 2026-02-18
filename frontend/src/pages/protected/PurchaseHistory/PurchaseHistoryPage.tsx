/**
 * Purchase History Page
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, Modal, Stack, Group, Text } from "@mantine/core";
import {
  IconShoppingBag,
  IconPackage,
  IconTruck,
  IconCheck,
  IconExternalLink,
  IconReceipt,
  IconHeadset,
  IconClock,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { getMyPurchases, confirmDelivery } from "@/api/payments";
import type { PurchaseListItem } from "@/api/types/payment";
import { AccordionCard } from "@/components/AccordionCard";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Stepper } from "@/components/Stepper";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { FULFILLMENT_LABELS } from "@/constants/shipping";
import styles from "./PurchaseHistoryPage.module.css";

export function PurchaseHistoryPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<PurchaseListItem | null>(null);

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
          <Alert variant="error" title={t("status.error")}>
            {error instanceof Error ? error.message : t("errors.failedToLoad")}
          </Alert>
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

  const formatPrice = (satang: number) => {
    return (satang / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  const steps = [
    { icon: IconPackage, label: t("purchases.packing") },
    { icon: IconTruck, label: t("purchases.inTransit") },
    { icon: IconCheck, label: t("purchases.delivered") },
  ];

  const renderRightColumn = (purchase: PurchaseListItem) => {
    const status = purchase.fulfillment_status;

    return (
      <Stack gap="xs">
        {/* Link to listing - always shown */}
        <Link to="/explore/$postId" params={{ postId: String(purchase.post.id) }} className={styles.linkButton}>
          <IconExternalLink size={14} />
          {t("purchases.viewListing")}
        </Link>

        {/* Show Receipt - always shown */}
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setReceiptModalData(purchase)}
        >
          <IconReceipt size={14} />
          {t("purchases.showReceipt")}
        </button>

        {/* Status-specific content */}
        {status === "packing" && (
          <>
            <div className={styles.awaitingCard}>
              <IconClock size={14} className={styles.awaitingIcon} />
              <span>{t("purchases.awaitingShipment")}</span>
            </div>
            <Button variant="ghost" size="sm" fullWidth leftIcon={<IconHeadset size={14} />}>
              {t("purchases.contactSupport")}
            </Button>
          </>
        )}

        {status === "in_transit" && (
          <>
            {purchase.tracking_number && (
              <TrackingInfoCard
                trackingNumber={purchase.tracking_number}
                carrier={purchase.shipping_carrier}
              />
            )}
            <div className={styles.buttonRow}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconCheck size={14} />}
                onClick={() => confirmMutation.mutate(purchase.payment_id)}
                disabled={confirmMutation.isPending}
              >
                {t("purchases.confirmDelivery")}
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<IconHeadset size={14} />}>
                {t("purchases.contactSupport")}
              </Button>
            </div>
          </>
        )}

        {status === "delivered" && (
          <>
            {purchase.tracking_number && (
              <TrackingInfoCard
                trackingNumber={purchase.tracking_number}
                carrier={purchase.shipping_carrier}
              />
            )}
            <div className={styles.buttonRow}>
              <div className={styles.deliveredBadge}>
                <IconCheck size={14} />
                <span>{t("purchases.delivered")}</span>
              </div>
              <Button variant="ghost" size="sm" leftIcon={<IconHeadset size={14} />}>
                {t("purchases.contactSupport")}
              </Button>
            </div>
          </>
        )}
      </Stack>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("purchases.title")}</h1>
          <p className={styles.subtitle}>{t("purchases.subtitle")}</p>
        </div>

        {successfulPurchases.length === 0 ? (
          <EmptyStateCard
            icon={<IconShoppingBag size={24} />}
            title={t("purchases.noPurchases")}
            description={t("purchases.noPurchasesDesc")}
          />
        ) : (
          <div className={styles.purchaseList}>
            {successfulPurchases.map((purchase) => {
              const currentStep = getFulfillmentStep(purchase.fulfillment_status);

              return (
                <AccordionCard
                  key={purchase.payment_id}
                  isExpanded={expandedId === purchase.payment_id}
                  onToggle={() => setExpandedId(expandedId === purchase.payment_id ? null : purchase.payment_id)}
                  ariaLabel={`${purchase.post.title} - ${t("purchases.toggleDetails")}`}
                  header={
                    <div className={styles.purchaseHeader}>
                      <img
                        src={purchase.post.image_url || "https://placehold.co/56x56?text=No+Image"}
                        alt={purchase.post.title}
                        className={styles.purchaseImage}
                      />
                      <div className={styles.purchaseInfo}>
                        <div className={styles.purchaseTopRow}>
                          <p className={styles.purchaseTitle}>{purchase.post.title}</p>
                          <span className={styles.purchasePrice}>
                            ฿{formatPrice(purchase.amount)}
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
                    </div>
                  }
                >
                  <div className={styles.contentGrid}>
                    {/* Left column - Stepper */}
                    <div className={styles.stepperCard}>
                      <p className={styles.cardLabel}>{t("purchases.orderProgress")}</p>
                      <Stepper steps={steps} currentStep={currentStep} vertical />
                    </div>

                    {/* Right column - Status-specific content */}
                    <div className={styles.actionsColumn}>
                      {renderRightColumn(purchase)}
                    </div>
                  </div>
                </AccordionCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <Modal
        opened={receiptModalData !== null}
        onClose={() => setReceiptModalData(null)}
        title={
          <Group gap="xs">
            <IconReceipt size={20} />
            <Text fw={600}>{t("purchases.receipt")}</Text>
          </Group>
        }
        size="sm"
        centered
      >
        {receiptModalData && (
          <Stack gap="md">
            <div className={styles.receiptItem}>
              <Text size="sm" c="dimmed">{t("purchases.item")}</Text>
              <Text size="sm" fw={500}>{receiptModalData.post.title}</Text>
            </div>
            <div className={styles.receiptItem}>
              <Text size="sm" c="dimmed">{t("purchases.date")}</Text>
              <Text size="sm">{new Date(receiptModalData.created_at).toLocaleDateString()}</Text>
            </div>
            <div className={styles.receiptDivider} />
            <div className={styles.receiptItem}>
              <Text size="sm" c="dimmed">{t("checkout.itemPrice")}</Text>
              <Text size="sm">฿{formatPrice(receiptModalData.item_price ?? 0)}</Text>
            </div>
            {(receiptModalData.shipping_cost ?? 0) > 0 && (
              <div className={styles.receiptItem}>
                <Text size="sm" c="dimmed">{t("checkout.shippingLabel")}</Text>
                <Text size="sm">฿{formatPrice(receiptModalData.shipping_cost ?? 0)}</Text>
              </div>
            )}
            <div className={styles.receiptDivider} />
            <div className={styles.receiptItem}>
              <Text size="sm" fw={600}>{t("checkout.total")}</Text>
              <Text size="sm" fw={600}>฿{formatPrice(receiptModalData.amount)}</Text>
            </div>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
