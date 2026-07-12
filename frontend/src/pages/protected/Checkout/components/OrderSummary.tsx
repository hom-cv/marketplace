import { useTranslation } from "react-i18next";
import { Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { PriceBreakdownResponse } from "@/api/types/payment";
import { formatThb } from "@/utils/currency";
import { Card } from "@/components/Card";
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

  const itemPrice = parseFloat(priceBreakdown?.item_price ?? "0");
  const shippingCost = parseFloat(priceBreakdown?.shipping_cost ?? "0");
  const processingFee = parseFloat(priceBreakdown?.processing_fee ?? "0");
  const total = parseFloat(priceBreakdown?.total ?? "0");

  return (
    <Card title={t("checkout.orderSummary")}>
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
        <span className={styles.priceValue}>฿{formatThb(itemPrice)}</span>
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
            : `฿${formatThb(shippingCost)}`}
        </span>
      </div>
      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>
          {t("checkout.buyerProtectionFee")}
          <Tooltip
            label={t("checkout.buyerProtectionTooltip")}
            multiline
            w={240}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            <IconInfoCircle size={14} className={styles.infoIcon} />
          </Tooltip>
        </span>
        <span className={styles.priceValue}>฿{formatThb(processingFee)}</span>
      </div>

      {/* Total */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>{t("checkout.total")}</span>
        <span className={styles.totalValue}>฿{formatThb(total)}</span>
      </div>
    </Card>
  );
}
