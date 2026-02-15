import { useTranslation } from "react-i18next";
import type { ShippingAddress } from "@/api/types/payment";
import styles from "../CheckoutPage.module.css";

interface ShippingPreviewProps {
  address: ShippingAddress;
  onEdit: () => void;
}

export function ShippingPreview({ address, onEdit }: ShippingPreviewProps) {
  const { t } = useTranslation("common");

  return (
    <div className={styles.shippingPreview}>
      <div className={styles.shippingHeader}>
        <span className={styles.shippingLabel}>{t("checkout.shipToLabel")}</span>
        <button className={styles.editButton} onClick={onEdit}>
          {t("buttons.edit")}
        </button>
      </div>
      <p className={styles.shippingName}>{address.name}</p>
      <p className={styles.shippingDetail}>{address.phone}</p>
      <p className={styles.shippingDetail}>{address.address}</p>
      <p className={styles.shippingDetail}>
        {address.district}, {address.province} {address.postal_code}
      </p>
    </div>
  );
}
