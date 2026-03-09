/**
 * EarningsPreview - Shows seller earnings breakdown
 *
 * Three modes:
 * 1. postId: Fetches breakdown from backend using post ID
 * 2. breakdown: Displays pre-fetched breakdown data directly
 * 3. itemPrice/shippingCost: Fetches preview from backend (for create post page)
 */
import { useMemo } from "react";
import { Loader } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPriceBreakdown, getEarningsPreview } from "@/api/payments";
import styles from "./EarningsPreview.module.css";

interface BreakdownData {
  itemPrice: number;
  shippingCost: number;
  totalFees: number;
  sellerPayout: number;
}

interface EarningsPreviewProps {
  /** Post ID to fetch breakdown from API */
  postId?: number;
  /** Pre-fetched breakdown data */
  breakdown?: BreakdownData;
  /** Item price for preview calculation (used when no postId) */
  itemPrice?: number;
  /** Shipping cost for preview calculation */
  shippingCost?: number;
  /** Title text to display. Empty string to hide */
  title?: string;
  /** Compact mode with less padding and smaller text */
  compact?: boolean;
  /** Hide the fee explanation text */
  hideExplanation?: boolean;
}

export function EarningsPreview({
  postId,
  breakdown,
  itemPrice,
  shippingCost = 0,
  title,
  compact = false,
  hideExplanation = false,
}: EarningsPreviewProps) {
  const { t } = useTranslation("common");

  // Use provided title or default from translations
  const displayTitle = title !== undefined ? title : t("earnings.title");

  // Mode 1: Fetch by post ID
  const postQuery = useQuery({
    queryKey: ["priceBreakdown", postId],
    queryFn: () => getPriceBreakdown(postId!, "card"),
    enabled: !!postId && !breakdown,
  });

  // Mode 3: Fetch preview by price/shipping
  const previewQuery = useQuery({
    queryKey: ["earningsPreview", itemPrice, shippingCost],
    queryFn: () => getEarningsPreview(itemPrice!, shippingCost, "card"),
    enabled: !!itemPrice && !postId && !breakdown,
  });

  const isLoading = postQuery.isLoading || previewQuery.isLoading;
  const isError = postQuery.isError || previewQuery.isError;
  const apiData = postQuery.data || previewQuery.data;

  // Use provided breakdown or convert API response (memoized to prevent re-creation)
  const data = useMemo<BreakdownData | null>(() => {
    if (breakdown) return breakdown;
    if (!apiData) return null;
    return {
      itemPrice: parseFloat(apiData.item_price),
      shippingCost: parseFloat(apiData.shipping_cost),
      totalFees: parseFloat(apiData.total_fees),
      sellerPayout: parseFloat(apiData.seller_payout),
    };
  }, [breakdown, apiData]);

  const format = (v: number) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const containerClass = compact
    ? `${styles.container} ${styles.containerCompact} ${styles.compact}`
    : styles.container;

  const titleClass = compact
    ? `${styles.title} ${styles.titleCompact}`
    : styles.title;

  if (isLoading) {
    return (
      <div className={containerClass}>
        {displayTitle && <div className={titleClass}>{displayTitle}</div>}
        <div className={styles.loading}>
          <Loader size="sm" />
          <span className={styles.loadingText}>{t("earnings.calculating")}</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={containerClass}>
        {displayTitle && <div className={titleClass}>{displayTitle}</div>}
        <div className={styles.error}>
          <IconAlertCircle size={16} />
          <span>{t("earnings.error")}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={containerClass}>
      {displayTitle && <div className={titleClass}>{displayTitle}</div>}
      <table className={styles.table}>
        <tbody>
          <tr className={styles.row}>
            <td className={styles.labelCell}>{t("earnings.itemPrice")}</td>
            <td className={styles.valueCell}>฿{format(data.itemPrice)}</td>
          </tr>
          {data.shippingCost > 0 && (
            <tr className={styles.row}>
              <td className={styles.labelCell}>{t("earnings.shipping")}</td>
              <td className={styles.valueCell}>฿{format(data.shippingCost)}</td>
            </tr>
          )}
          <tr className={styles.row}>
            <td className={styles.labelCell}>{t("earnings.fees")}</td>
            <td className={`${styles.valueCell} ${styles.valueFee}`}>
              -฿{format(data.totalFees)}
            </td>
          </tr>
          <tr className={styles.rowTotal}>
            <td className={styles.labelTotal}>{t("earnings.youReceive")}</td>
            <td className={styles.valueTotal}>฿{format(data.sellerPayout)}</td>
          </tr>
        </tbody>
      </table>
      {!hideExplanation && (
        <p className={styles.explanation}>{t("earnings.feesExplanation")}</p>
      )}
    </div>
  );
}
