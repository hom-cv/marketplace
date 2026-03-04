import { FULFILLMENT_LABELS } from "@/constants/shipping";
import styles from "./FulfillmentBadge.module.css";

const VARIANT_CLASS: Record<string, string> = {
  packing: styles.packing,
  in_transit: styles.inTransit,
  delivered: styles.delivered,
};

interface FulfillmentBadgeProps {
  status: string | null;
}

export function FulfillmentBadge({ status }: FulfillmentBadgeProps) {
  const key = status || "";
  const variant = VARIANT_CLASS[key] || styles.packing;
  const label = FULFILLMENT_LABELS[key] || "Processing";

  return (
    <span className={`${styles.badge} ${variant}`}>
      {label}
    </span>
  );
}
