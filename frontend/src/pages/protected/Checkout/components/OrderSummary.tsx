import { useTranslation } from "react-i18next";
import type { PriceBreakdownResponse } from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface Post {
  id: number;
  title: string;
  image_url: string | null;
  user: { username: string };
}

interface OrderSummaryProps {
  post: Post;
  priceBreakdown?: PriceBreakdownResponse;
}

export function OrderSummary({ post, priceBreakdown }: OrderSummaryProps) {
  const { t } = useTranslation("common");

  const formatAmount = (v: number) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const itemPrice = parseFloat(priceBreakdown?.item_price ?? "0");
  const shippingCost = parseFloat(priceBreakdown?.shipping_cost ?? "0");
  const total = parseFloat(priceBreakdown?.total ?? "0");

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{t("checkout.orderSummary")}</h3>

      {/* Item */}
      <div className={styles.itemCard}>
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className={styles.itemImage}
          />
        )}
        <div className={styles.itemDetails}>
          <p className={styles.itemTitle}>{post.title}</p>
          <p className={styles.itemSeller}>
            {t("checkout.soldBy", { username: post.user.username })}
          </p>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Price breakdown */}
      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>{t("checkout.itemPrice")}</span>
        <span className={styles.priceValue}>฿{formatAmount(itemPrice)}</span>
      </div>
      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>{t("checkout.shippingLabel")}</span>
        <span
          className={`${styles.priceValue} ${
            shippingCost === 0 ? styles.freeShipping : ""
          }`}
        >
          {shippingCost === 0
            ? t("checkout.freeShipping")
            : `฿${formatAmount(shippingCost)}`}
        </span>
      </div>

      {/* Total */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>{t("checkout.total")}</span>
        <span className={styles.totalValue}>฿{formatAmount(total)}</span>
      </div>
    </div>
  );
}
