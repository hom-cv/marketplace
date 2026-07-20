/**
 * Purchase History Page - Messages list style
 */

import { useState } from "react";
import { createPortal } from "react-dom";
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
  IconChevronDown,
  IconPrinter,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useMyPurchases, useConfirmDeliveryMutation } from "@/hooks/usePayments";
import type { PurchaseListItem } from "@/api/types/payment";
import { CONTACT_EMAILS } from "@/constants/contact";
import { formatSatang } from "@/utils/currency";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Stepper } from "@/components/Stepper";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { FulfillmentBadge } from "@/components/FulfillmentBadge";
import shared from "@/styles/listPage.module.css";
import styles from "./PurchaseHistoryPage.module.css";

export function PurchaseHistoryPage() {
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<PurchaseListItem | null>(null);

  const { data: purchases, isLoading, error } = useMyPurchases();

  const confirmMutation = useConfirmDeliveryMutation();

  if (isLoading) {
    return (
      <div className={shared.page}>
        <div className={shared.loading}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shared.page}>
        <div className={shared.container}>
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

  const formatPrice = formatSatang;

  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  const steps = [
    { icon: IconPackage, label: t("purchases.packing") },
    { icon: IconTruck, label: t("purchases.inTransit") },
    { icon: IconCheck, label: t("purchases.delivered") },
  ];

  const contactSupport = (purchase: PurchaseListItem) => {
    const subject = t("purchases.supportSubject", {
      title: purchase.post.title,
      id: purchase.payment_id,
    });
    window.location.assign(
      `mailto:${CONTACT_EMAILS.supportEmail}?subject=${encodeURIComponent(subject)}`,
    );
  };

  const renderRightColumn = (purchase: PurchaseListItem) => {
    const status = purchase.fulfillment_status;

    return (
      <Stack gap="xs">
        <Link to="/explore/$postId" params={{ postId: String(purchase.post.id) }} className={styles.linkButton}>
          <IconExternalLink size={14} />
          {t("purchases.viewListing")}
        </Link>

        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setReceiptModalData(purchase)}
        >
          <IconReceipt size={14} />
          {t("purchases.showReceipt")}
        </button>

        {status === "packing" && (
          <>
            <div className={styles.awaitingCard}>
              <IconClock size={14} className={styles.awaitingIcon} />
              <span>{t("purchases.awaitingShipment")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<IconHeadset size={14} />}
              onClick={() => contactSupport(purchase)}
            >
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
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconHeadset size={14} />}
                onClick={() => contactSupport(purchase)}
              >
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
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconHeadset size={14} />}
                onClick={() => contactSupport(purchase)}
              >
                {t("purchases.contactSupport")}
              </Button>
            </div>
          </>
        )}
      </Stack>
    );
  };

  return (
    <div className={shared.page}>
      <div className={shared.container}>
        <h1 className={shared.title}>{t("purchases.title")}</h1>

        {successfulPurchases.length === 0 ? (
          <EmptyStateCard
            icon={<IconShoppingBag size={24} />}
            title={t("purchases.noPurchases")}
            description={t("purchases.noPurchasesDesc")}
          />
        ) : (
          <div className={shared.list}>
            {successfulPurchases.map((purchase) => {
              const isExpanded = expandedId === purchase.payment_id;
              const currentStep = getFulfillmentStep(purchase.fulfillment_status);

              return (
                <div key={purchase.payment_id} className={shared.item}>
                  <button
                    type="button"
                    className={shared.row}
                    onClick={() => setExpandedId(isExpanded ? null : purchase.payment_id)}
                    aria-expanded={isExpanded}
                    aria-label={`${purchase.post.title} - ${t("purchases.toggleDetails")}`}
                  >
                    <img
                      src={purchase.post.image_url || "https://placehold.co/48x48?text=No+Image"}
                      alt={purchase.post.title}
                      className={shared.thumbnail}
                    />
                    <div className={shared.info}>
                      <div className={shared.topRow}>
                        <span className={shared.itemTitle}>{purchase.post.title}</span>
                        <span className={styles.purchasePrice}>
                          ฿{formatPrice(purchase.amount)}
                        </span>
                      </div>
                      <div className={shared.meta}>
                        <FulfillmentBadge status={purchase.fulfillment_status} />
                        <span className={shared.date}>
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <IconChevronDown
                      size={18}
                      className={`${shared.expandIcon} ${isExpanded ? shared.expandIconOpen : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && (
                    <div className={shared.expandedContent}>
                      <div className={styles.contentGrid}>
                        <div className={styles.stepperCard}>
                          <p className={styles.cardLabel}>{t("purchases.orderProgress")}</p>
                          <Stepper steps={steps} currentStep={currentStep} vertical />
                        </div>

                        <div className={styles.actionsColumn}>
                          {renderRightColumn(purchase)}
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
            <ReceiptBody purchase={receiptModalData} />

            <Button
              variant="secondary"
              fullWidth
              leftIcon={<IconPrinter size={16} />}
              onClick={() => window.print()}
            >
              {t("purchases.printReceipt")}
            </Button>
          </Stack>
        )}
      </Modal>

      {/* Print-only copy portaled to <body> so @media print can hide every
          other body child (incl. Mantine's modal) and keep it to one page. */}
      {receiptModalData &&
        createPortal(
          <div className={`receipt-printable ${styles.printOnly}`}>
            <ReceiptBody purchase={receiptModalData} />
          </div>,
          document.body,
        )}
    </div>
  );
}

function ReceiptBody({ purchase }: { purchase: PurchaseListItem }) {
  const { t } = useTranslation("common");
  return (
    <div className={styles.receipt}>
      <div className={styles.receiptHead}>
        <span className={styles.receiptBrand}>Tallad</span>
        <span className={styles.receiptNo}>
          {t("purchases.receiptNumber")} #{purchase.payment_id}
        </span>
      </div>

      <div className={styles.receiptItem}>
        <Text size="sm" c="dimmed">{t("purchases.date")}</Text>
        <Text size="sm">
          {new Date(purchase.paid_at ?? purchase.created_at).toLocaleDateString()}
        </Text>
      </div>
      <div className={styles.receiptItem}>
        <Text size="sm" c="dimmed">{t("purchases.seller")}</Text>
        <Text size="sm">@{purchase.seller?.username ?? "—"}</Text>
      </div>
      <div className={styles.receiptItem}>
        <Text size="sm" c="dimmed">{t("checkout.paymentMethod")}</Text>
        <Text size="sm">
          {purchase.payment_method === "card"
            ? t("checkout.creditCard")
            : "PromptPay"}
        </Text>
      </div>

      <div className={styles.receiptDivider} />

      <div className={styles.receiptItem}>
        <Text size="sm" fw={500}>{purchase.post.title}</Text>
        <Text size="sm">฿{formatSatang(purchase.item_price ?? 0)}</Text>
      </div>
      {(purchase.shipping_cost ?? 0) > 0 && (
        <div className={styles.receiptItem}>
          <Text size="sm" c="dimmed">{t("checkout.shippingLabel")}</Text>
          <Text size="sm">฿{formatSatang(purchase.shipping_cost ?? 0)}</Text>
        </div>
      )}
      {(purchase.processing_fee ?? 0) > 0 && (
        <div className={styles.receiptItem}>
          <Text size="sm" c="dimmed">{t("checkout.buyerProtectionFee")}</Text>
          <Text size="sm">฿{formatSatang(purchase.processing_fee ?? 0)}</Text>
        </div>
      )}

      <div className={styles.receiptDivider} />

      <div className={styles.receiptItem}>
        <Text size="sm" fw={700}>{t("checkout.total")}</Text>
        <Text size="sm" fw={700}>฿{formatSatang(purchase.amount)}</Text>
      </div>

      <div className={styles.receiptFoot}>{t("purchases.thankYou")}</div>
    </div>
  );
}
