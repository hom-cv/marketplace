/**
 * Sold Listings Page - Messages list style
 */

import { useState } from "react";
import {
  Loader,
  Select,
  TextInput,
} from "@mantine/core";
import {
  IconReceipt,
  IconTruck,
  IconCheck,
  IconUser,
  IconChevronDown,
  IconChevronRight,
  IconPackage,
  IconStar,
  IconExternalLink,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useMySales, useAddTrackingMutation } from "@/hooks/usePayments";
import type { PurchaseListItem } from "@/api/types/payment";
import { satangToThb } from "@/utils/currency";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EarningsPreview } from "@/components/EarningsPreview";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { OrderProgressRail } from "@/components/OrderProgressRail";
import { CARRIER_OPTIONS } from "@/constants/shipping";
import shared from "@/styles/listPage.module.css";
import styles from "./SoldListingsPage.module.css";

type SaleState = "to_ship" | "in_transit" | "delivered";

/** What action, if any, a sale is waiting on — drives the dashboard grouping. */
const saleState = (s: PurchaseListItem): SaleState =>
  !s.tracking_number
    ? "to_ship"
    : s.fulfillment_status === "delivered"
      ? "delivered"
      : "in_transit";

const STATE_ORDER: Record<SaleState, number> = {
  to_ship: 0,
  in_transit: 1,
  delivered: 2,
};

export function SoldListingsPage() {
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<number, string | null>>({});
  const [filter, setFilter] = useState<SaleState | "all">("all");

  const { data: sales, isLoading, error } = useMySales();

  const trackingMutation = useAddTrackingMutation();

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

  const handleAddTracking = (paymentId: number) => {
    const trackingNumber = trackingInputs[paymentId];
    const carrier = carrierInputs[paymentId];
    if (trackingNumber?.trim() && carrier) {
      trackingMutation.mutate({ paymentId, carrier, trackingNumber: trackingNumber.trim() });
      setTrackingInputs((prev) => ({ ...prev, [paymentId]: "" }));
      setCarrierInputs((prev) => ({ ...prev, [paymentId]: null }));
    }
  };

  const getSellerPayout = (sale: typeof successfulSales[0]) => {
    return satangToThb(sale.seller_payout ?? 0);
  };

  const successfulSales = sales?.filter((s) => s.status === "successful") || [];

  const counts: Record<SaleState, number> = {
    to_ship: 0,
    in_transit: 0,
    delivered: 0,
  };
  successfulSales.forEach((s) => {
    counts[saleState(s)]++;
  });

  // Sales needing action float to the top; a filter narrows to one group.
  const visibleSales = [...successfulSales]
    .filter((s) => filter === "all" || saleState(s) === filter)
    .sort((a, b) => STATE_ORDER[saleState(a)] - STATE_ORDER[saleState(b)]);

  const filters: { key: SaleState | "all"; label: string; count: number }[] = [
    { key: "all", label: t("sales.filterAll"), count: successfulSales.length },
    { key: "to_ship", label: t("sales.filterToShip"), count: counts.to_ship },
    { key: "in_transit", label: t("sales.filterInTransit"), count: counts.in_transit },
    { key: "delivered", label: t("sales.filterDelivered"), count: counts.delivered },
  ];

  const steps = [
    { icon: IconPackage, label: t("purchases.packing") },
    { icon: IconTruck, label: t("sales.shipped") },
    { icon: IconCheck, label: t("purchases.delivered") },
    { icon: IconStar, label: t("purchases.feedbackStep") },
  ];

  // 0 Packing · 1 Shipped · 2 Delivered · 3 Feedback · 4 = completed
  const getSellerStep = (sale: PurchaseListItem): number => {
    if (!sale.tracking_number) return 0;
    if (sale.fulfillment_status === "delivered") {
      return sale.has_feedback ? 4 : 3;
    }
    return 1; // shipped / in transit
  };

  const renderDetail = (sale: PurchaseListItem) => (
    <div className={shared.detail}>
      <OrderProgressRail steps={steps} currentStep={getSellerStep(sale)} />

      {/* Primary action / status — full width, up top */}
      {!sale.tracking_number ? (
        <div className={styles.shipHighlight}>
          <p className={styles.shipHighlightLabel}>
            <IconTruck size={13} /> {t("sales.addShipping")}
          </p>
          <div className={styles.trackingForm}>
            <Select
              placeholder={t("sales.carrier")}
              size="xs"
              radius="xs"
              data={CARRIER_OPTIONS}
              value={carrierInputs[sale.payment_id] || null}
              onChange={(value) =>
                setCarrierInputs((prev) => ({ ...prev, [sale.payment_id]: value }))
              }
              disabled={trackingMutation.isPending}
            />
            <div className={styles.trackingRow}>
              <TextInput
                placeholder={t("sales.trackingNumber")}
                size="xs"
                radius="xs"
                className={styles.trackingInput}
                value={trackingInputs[sale.payment_id] || ""}
                onChange={(e) =>
                  setTrackingInputs((prev) => ({
                    ...prev,
                    [sale.payment_id]: e.target.value,
                  }))
                }
                disabled={trackingMutation.isPending}
              />
              <Button
                size="sm"
                onClick={() => handleAddTracking(sale.payment_id)}
                disabled={
                  trackingMutation.isPending ||
                  !trackingInputs[sale.payment_id]?.trim() ||
                  !carrierInputs[sale.payment_id]
                }
              >
                {trackingMutation.isPending ? t("status.loading") : t("sales.ship")}
              </Button>
            </div>
          </div>
        </div>
      ) : sale.fulfillment_status === "delivered" ? (
        sale.has_feedback ? (
          <div className={`${shared.note} ${shared.noteDone}`}>
            <IconCheck size={15} />
            <span>{t("purchases.completed")}</span>
          </div>
        ) : (
          <div className={shared.note}>
            <IconCheck size={15} />
            <span>{t("sales.awaitingFeedback")}</span>
          </div>
        )
      ) : (
        <div className={shared.note}>
          <IconTruck size={15} />
          <span>{t("sales.awaitingDelivery")}</span>
        </div>
      )}

      {/* Reference info in two columns */}
      <div className={styles.detailGrid}>
        <div className={styles.detailCol}>
          {sale.buyer && (
            <Link
              to="/profile/$username"
              params={{ username: sale.buyer.username }}
              className={styles.buyerLink}
            >
              <IconUser size={14} />
              <span className={styles.buyerUsername}>@{sale.buyer.username}</span>
              <span className={styles.buyerDate}>
                {new Date(sale.created_at).toLocaleDateString()}
              </span>
            </Link>
          )}
          {sale.shipping_name && (
            <ShippingAddressCard
              name={sale.shipping_name}
              phone={sale.shipping_phone}
              address={sale.shipping_address}
              district={sale.shipping_district}
              province={sale.shipping_province}
              postalCode={sale.shipping_postal_code}
            />
          )}
          {sale.tracking_number && (
            <TrackingInfoCard
              trackingNumber={sale.tracking_number}
              carrier={sale.shipping_carrier}
            />
          )}
        </div>

        <div className={styles.detailCol}>
          <div className={styles.panel}>
            <p className={styles.panelLabel}>{t("sales.earnings")}</p>
            <EarningsPreview
              breakdown={{
                itemPrice: satangToThb(sale.item_price ?? 0),
                shippingCost: satangToThb(sale.shipping_cost ?? 0),
                sellerFee: satangToThb(sale.platform_fee ?? 0),
                sellerPayout: satangToThb(sale.seller_payout ?? 0),
                platformFeeWaived: sale.platform_fee_waived,
              }}
              title=""
              compact
              hideExplanation
            />
          </div>
        </div>
      </div>

      {/* Secondary actions */}
      <div className={shared.secondary}>
        <Link
          to="/explore/$postId"
          params={{ postId: String(sale.post.id) }}
          className={shared.secondaryLink}
        >
          <IconExternalLink size={14} />
          {t("purchases.viewListing")}
        </Link>
      </div>
    </div>
  );

  const STATUS_META: Record<SaleState, { label: string; cls: string }> = {
    to_ship: { label: t("sales.filterToShip"), cls: styles.pillToShip },
    in_transit: { label: t("sales.filterInTransit"), cls: styles.pillInTransit },
    delivered: { label: t("sales.filterDelivered"), cls: styles.pillDelivered },
  };

  const renderStatusPill = (state: SaleState) => (
    <span className={`${styles.pill} ${STATUS_META[state].cls}`}>
      <span className={styles.pillDot} />
      {STATUS_META[state].label}
    </span>
  );

  return (
    <div className={shared.page}>
      <div className={shared.container}>
        <h1 className={shared.title}>{t("sales.title")}</h1>

        {successfulSales.length === 0 ? (
          <EmptyStateCard
            icon={<IconReceipt size={24} />}
            title={t("sales.noSales")}
            description={t("sales.noSalesDesc")}
          />
        ) : (
          <>
            {/* Dashboard: filter by what each order needs */}
            <div className={styles.filterBar}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={[
                    styles.filterChip,
                    filter === f.key && styles.filterChipActive,
                    f.key === "to_ship" && f.count > 0 && styles.filterChipAlert,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className={styles.filterCount}>{f.count}</span>
                </button>
              ))}
            </div>

            {visibleSales.length === 0 ? (
              <p className={styles.emptyFilter}>{t("sales.noSalesInFilter")}</p>
            ) : (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span />
                  <span className={styles.headCell}>{t("sales.colItem")}</span>
                  <span className={styles.headCell}>{t("sales.buyer")}</span>
                  <span className={styles.headCell}>{t("sales.colStatus")}</span>
                  <span className={`${styles.headCell} ${styles.headEarn}`}>
                    {t("sales.earnings")}
                  </span>
                  <span />
                </div>

                {visibleSales.map((sale) => {
                  const isExpanded = expandedId === sale.payment_id;
                  const state = saleState(sale);
                  return (
                    <div
                      key={sale.payment_id}
                      className={[
                        styles.rowGroup,
                        state === "to_ship" && styles.rowAlert,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className={styles.row}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : sale.payment_id)
                        }
                        aria-expanded={isExpanded}
                        aria-label={`${sale.post.title} - ${t("sales.toggleDetails")}`}
                      >
                        <img
                          src={
                            sale.post.image_url ||
                            "https://placehold.co/48x48?text=No+Image"
                          }
                          alt={sale.post.title}
                          className={styles.cThumb}
                        />
                        <span className={styles.cTitle}>{sale.post.title}</span>
                        <span className={styles.cBuyer}>
                          {sale.buyer ? `@${sale.buyer.username}` : "—"}
                        </span>
                        <span className={styles.cStatus}>
                          {renderStatusPill(state)}
                        </span>
                        <span className={styles.cEarn}>
                          +฿
                          {getSellerPayout(sale).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className={styles.cAction}>
                          {state === "to_ship" ? (
                            <span className={styles.shipCue}>
                              {t("sales.ship")}
                              <IconChevronRight size={13} />
                            </span>
                          ) : (
                            <IconChevronDown
                              size={16}
                              className={`${styles.chevron} ${
                                isExpanded ? styles.chevronOpen : ""
                              }`}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className={styles.detailWrap}>
                          {renderDetail(sale)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
