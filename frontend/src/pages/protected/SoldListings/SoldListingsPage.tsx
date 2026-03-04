/**
 * Sold Listings Page - Messages list style
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader,
  Select,
  TextInput,
} from "@mantine/core";
import { IconReceipt, IconTruck, IconCheck, IconUser, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { getMySales, addTracking } from "@/api/payments";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EarningsPreview } from "@/components/EarningsPreview";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { CARRIER_OPTIONS, FULFILLMENT_LABELS } from "@/constants/shipping";
import styles from "./SoldListingsPage.module.css";

export function SoldListingsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<number, string | null>>({});

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ["my-sales"],
    queryFn: getMySales,
  });

  const trackingMutation = useMutation({
    mutationFn: ({ paymentId, carrier, trackingNumber }: { paymentId: number; carrier: string; trackingNumber: string }) =>
      addTracking(paymentId, carrier, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sales"] });
    },
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader size="lg" />
        </div>
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
    return (sale.seller_payout ?? 0) / 100;
  };

  const getBadgeClass = (status: string | null) => {
    switch (status) {
      case "packing": return styles.badgePacking;
      case "in_transit": return styles.badgeInTransit;
      case "delivered": return styles.badgeDelivered;
      default: return styles.badgePacking;
    }
  };

  const successfulSales = sales?.filter((s) => s.status === "successful") || [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("sales.title")}</h1>

        {successfulSales.length === 0 ? (
          <EmptyStateCard
            icon={<IconReceipt size={24} />}
            title={t("sales.noSales")}
            description={t("sales.noSalesDesc")}
          />
        ) : (
          <div className={styles.saleList}>
            {successfulSales.map((sale) => {
              const isExpanded = expandedId === sale.payment_id;
              return (
                <div key={sale.payment_id} className={styles.saleItem}>
                  <button
                    type="button"
                    className={styles.saleRow}
                    onClick={() => setExpandedId(isExpanded ? null : sale.payment_id)}
                    aria-expanded={isExpanded}
                    aria-label={`${sale.post.title} - ${t("sales.toggleDetails")}`}
                  >
                    <img
                      src={sale.post.image_url || "https://placehold.co/48x48?text=No+Image"}
                      alt={sale.post.title}
                      className={styles.saleImage}
                    />
                    <div className={styles.saleInfo}>
                      <div className={styles.saleTopRow}>
                        <span className={styles.saleTitle}>{sale.post.title}</span>
                        <span className={styles.saleEarnings}>
                          +฿{getSellerPayout(sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={styles.saleMeta}>
                        <span className={`${styles.badge} ${getBadgeClass(sale.fulfillment_status)}`}>
                          {FULFILLMENT_LABELS[sale.fulfillment_status || ""] || "Processing"}
                        </span>
                        <span className={styles.saleDate}>
                          {new Date(sale.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <IconChevronDown
                      size={18}
                      className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && (
                    <div className={styles.expandedContent}>
                      <div className={styles.detailGrid}>
                        {/* Left Column: Earnings (spans 2 rows) */}
                        <div className={`${styles.cell} ${styles.earningsCell}`}>
                          <p className={styles.cellLabel}>{t("sales.earnings")}</p>
                          <EarningsPreview
                            breakdown={{
                              itemPrice: (sale.item_price ?? 0) / 100,
                              shippingCost: (sale.shipping_cost ?? 0) / 100,
                              totalFees: (sale.total_fees ?? 0) / 100,
                              sellerPayout: (sale.seller_payout ?? 0) / 100,
                            }}
                            title=""
                            compact
                            hideExplanation
                          />
                        </div>

                        {/* Right Column: Stacked info */}
                        <div className={styles.infoColumn}>
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

                        {/* Bottom Row: Add Tracking / Shipped Status */}
                        {sale.tracking_number ? (
                          <div className={styles.shippedBadge}>
                            <IconCheck size={14} />
                            <p className={styles.shippedText}>{t("sales.shipped")}</p>
                          </div>
                        ) : (
                          <div className={styles.cell}>
                            <p className={styles.cellLabel}>
                              <IconTruck size={12} />
                              {t("sales.addShipping")}
                            </p>
                            <div className={styles.trackingForm}>
                              <Select
                                placeholder={t("sales.carrier")}
                                size="xs"
                                radius="xs"
                                data={CARRIER_OPTIONS}
                                value={carrierInputs[sale.payment_id] || null}
                                onChange={(value) => setCarrierInputs((prev) => ({
                                  ...prev,
                                  [sale.payment_id]: value,
                                }))}
                                disabled={trackingMutation.isPending}
                              />
                              <div className={styles.trackingRow}>
                                <TextInput
                                  placeholder={t("sales.trackingNumber")}
                                  size="xs"
                                  radius="xs"
                                  className={styles.trackingInput}
                                  value={trackingInputs[sale.payment_id] || ""}
                                  onChange={(e) => setTrackingInputs((prev) => ({
                                    ...prev,
                                    [sale.payment_id]: e.target.value,
                                  }))}
                                  disabled={trackingMutation.isPending}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddTracking(sale.payment_id)}
                                  disabled={trackingMutation.isPending || !trackingInputs[sale.payment_id]?.trim() || !carrierInputs[sale.payment_id]}
                                >
                                  {trackingMutation.isPending ? t("status.loading") : t("sales.ship")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
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
