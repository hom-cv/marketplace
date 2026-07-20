/**
 * Purchase History Page - Messages list style
 */

import { Fragment, useState } from "react";
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
  IconStar,
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
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { FulfillmentBadge } from "@/components/FulfillmentBadge";
import { FeedbackModal } from "@/components/FeedbackModal";
import shared from "@/styles/listPage.module.css";
import styles from "./PurchaseHistoryPage.module.css";

export function PurchaseHistoryPage() {
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<PurchaseListItem | null>(null);
  const [feedbackPaymentId, setFeedbackPaymentId] = useState<number | null>(null);

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

  // 0 Packing · 1 In transit · 2 Delivered · 3 Feedback · 4 = all done (completed)
  const getProgressStep = (purchase: PurchaseListItem): number => {
    switch (purchase.fulfillment_status) {
      case "packing": return 0;
      case "in_transit": return 1;
      case "delivered": return purchase.has_feedback ? 4 : 3;
      default: return 0;
    }
  };

  const formatPrice = formatSatang;

  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  const steps = [
    { icon: IconPackage, label: t("purchases.packing") },
    { icon: IconTruck, label: t("purchases.inTransit") },
    { icon: IconCheck, label: t("purchases.delivered") },
    { icon: IconStar, label: t("purchases.feedbackStep") },
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

  const renderProgressRail = (currentStep: number) => (
    <div className={styles.rail}>
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        const done = i < currentStep;
        const active = i === currentStep;
        const nodeClass = [
          styles.node,
          done && styles.nodeDone,
          active && styles.nodeActive,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Fragment key={i}>
            {i > 0 && (
              <div
                className={`${styles.connector} ${
                  i <= currentStep ? styles.connectorDone : ""
                }`}
              />
            )}
            <div className={nodeClass}>
              <span className={styles.dot}>
                {done ? <IconCheck size={15} /> : <StepIcon size={15} />}
              </span>
              <span className={styles.nodeLabel}>{step.label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  const renderDetail = (purchase: PurchaseListItem) => {
    const status = purchase.fulfillment_status;

    return (
      <div className={styles.detail}>
        {renderProgressRail(getProgressStep(purchase))}

        {purchase.tracking_number && (
          <TrackingInfoCard
            trackingNumber={purchase.tracking_number}
            carrier={purchase.shipping_carrier}
          />
        )}

        {/* What's next — one clear action per state */}
        {status === "packing" && (
          <div className={`${styles.note} ${styles.noteWait}`}>
            <IconClock size={15} />
            <span>{t("purchases.waitingToShip")}</span>
          </div>
        )}

        {status === "in_transit" && (
          <Button
            variant="primary"
            fullWidth
            leftIcon={<IconCheck size={16} />}
            onClick={() => confirmMutation.mutate(purchase.payment_id)}
            disabled={confirmMutation.isPending}
          >
            {t("purchases.confirmDelivery")}
          </Button>
        )}

        {status === "delivered" && !purchase.has_feedback && (
          <div className={styles.ratePrompt}>
            <div className={styles.rateText}>
              <p className={styles.rateTitle}>{t("purchases.rateTitle")}</p>
              {purchase.seller && (
                <p className={styles.rateSub}>
                  {t("purchases.rateSubtitle", {
                    username: purchase.seller.username,
                  })}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              leftIcon={<IconStar size={15} />}
              onClick={() => setFeedbackPaymentId(purchase.payment_id)}
            >
              {t("purchases.rateButton")}
            </Button>
          </div>
        )}

        {status === "delivered" && purchase.has_feedback && (
          <div className={`${styles.note} ${styles.noteDone}`}>
            <IconCheck size={15} />
            <span>{t("purchases.completed")}</span>
          </div>
        )}

        {/* Quiet secondary actions */}
        <div className={styles.secondary}>
          <Link
            to="/explore/$postId"
            params={{ postId: String(purchase.post.id) }}
            className={styles.secondaryLink}
          >
            <IconExternalLink size={14} />
            {t("purchases.viewListing")}
          </Link>
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => setReceiptModalData(purchase)}
          >
            <IconReceipt size={14} />
            {t("purchases.showReceipt")}
          </button>
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => contactSupport(purchase)}
          >
            <IconHeadset size={14} />
            {t("purchases.contactSupport")}
          </button>
        </div>
      </div>
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
                      {renderDetail(purchase)}
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

      <FeedbackModal
        paymentId={feedbackPaymentId}
        opened={feedbackPaymentId !== null}
        onClose={() => setFeedbackPaymentId(null)}
      />

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
