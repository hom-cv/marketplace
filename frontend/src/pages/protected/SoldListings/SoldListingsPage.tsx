/**
 * Sold Listings Page - Flat design
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import { IconReceipt, IconAlertCircle, IconTruck, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getMySales, addTracking } from "@/api/payments";
import { EarningsPreview } from "@/components/EarningsPreview";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { UserCard } from "@/components/UserCard";
import { CARRIER_OPTIONS, FULFILLMENT_LABELS } from "@/constants/shipping";
import styles from "./SoldListingsPage.module.css";

export function SoldListingsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<number, string>>({});

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

  const handleAddTracking = (paymentId: number) => {
    const trackingNumber = trackingInputs[paymentId];
    const carrier = carrierInputs[paymentId];
    if (trackingNumber?.trim() && carrier) {
      trackingMutation.mutate({ paymentId, carrier, trackingNumber: trackingNumber.trim() });
      setTrackingInputs((prev) => ({ ...prev, [paymentId]: "" }));
      setCarrierInputs((prev) => ({ ...prev, [paymentId]: "" }));
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
        <div className={styles.header}>
          <h1 className={styles.title}>{t("sales.title")}</h1>
          <p className={styles.subtitle}>{t("sales.subtitle")}</p>
        </div>

        {successfulSales.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>
                <IconReceipt size={28} />
              </div>
              <p className={styles.emptyTitle}>{t("sales.noSales")}</p>
              <p className={styles.emptyText}>{t("sales.noSalesDesc")}</p>
            </div>
          </div>
        ) : (
          <div className={styles.saleList}>
            {successfulSales.map((sale) => (
              <div key={sale.payment_id} className={styles.saleCard}>
                <div
                  className={styles.saleHeader}
                  onClick={() => setExpandedId(expandedId === sale.payment_id ? null : sale.payment_id)}
                >
                  <img
                    src={sale.post.image_url || "https://placehold.co/56x56?text=No+Image"}
                    alt={sale.post.title}
                    className={styles.saleImage}
                  />
                  <div className={styles.saleInfo}>
                    <div className={styles.saleTopRow}>
                      <p className={styles.saleTitle}>{sale.post.title}</p>
                      <span className={styles.saleEarnings}>
                        +฿{getSellerPayout(sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={styles.saleMeta}>
                      <span className={`${styles.badge} ${getBadgeClass(sale.fulfillment_status)}`}>
                        {FULFILLMENT_LABELS[sale.fulfillment_status || ""] || "Processing"}
                      </span>
                      {sale.tracking_number && (
                        <span className={`${styles.badge} ${styles.badgeShipped}`}>
                          {t("sales.shipped")}
                        </span>
                      )}
                      <span className={styles.saleDate}>
                        {new Date(sale.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <IconChevronDown
                    size={20}
                    className={`${styles.expandIcon} ${expandedId === sale.payment_id ? styles.expandIconOpen : ""}`}
                  />
                </div>

                {expandedId === sale.payment_id && (
                  <div className={styles.saleContent}>
                    <div className={styles.contentGrid}>
                      <div>
                        <div className={styles.infoCard}>
                          <p className={styles.infoLabel}>{t("sales.earnings")}</p>
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

                        {sale.buyer && (
                          <div style={{ marginTop: 12 }}>
                            <UserCard username={sale.buyer.username} label={t("sales.buyer")} />
                          </div>
                        )}
                      </div>

                      <div>
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

                        {sale.tracking_number ? (
                          <div style={{ marginTop: 12 }}>
                            <TrackingInfoCard
                              trackingNumber={sale.tracking_number}
                              carrier={sale.shipping_carrier}
                            />
                          </div>
                        ) : (
                          <div className={styles.infoCard} style={{ marginTop: 12 }}>
                            <p className={styles.infoLabel}>
                              <IconTruck size={12} />
                              {t("sales.addShipping")}
                            </p>
                            <div className={styles.trackingForm}>
                              <select
                                className={styles.trackingSelect}
                                value={carrierInputs[sale.payment_id] || ""}
                                onChange={(e) => setCarrierInputs((prev) => ({
                                  ...prev,
                                  [sale.payment_id]: e.target.value,
                                }))}
                                disabled={trackingMutation.isPending}
                              >
                                <option value="">{t("sales.carrier")}</option>
                                {CARRIER_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <div className={styles.trackingRow}>
                                <input
                                  type="text"
                                  className={styles.trackingInput}
                                  placeholder={t("sales.trackingNumber")}
                                  value={trackingInputs[sale.payment_id] || ""}
                                  onChange={(e) => setTrackingInputs((prev) => ({
                                    ...prev,
                                    [sale.payment_id]: e.target.value,
                                  }))}
                                  disabled={trackingMutation.isPending}
                                />
                                <button
                                  type="button"
                                  className={styles.trackingButton}
                                  onClick={() => handleAddTracking(sale.payment_id)}
                                  disabled={
                                    trackingMutation.isPending ||
                                    !trackingInputs[sale.payment_id]?.trim() ||
                                    !carrierInputs[sale.payment_id]
                                  }
                                >
                                  {trackingMutation.isPending ? (
                                    <Loader size="xs" color="white" />
                                  ) : (
                                    t("sales.ship")
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
