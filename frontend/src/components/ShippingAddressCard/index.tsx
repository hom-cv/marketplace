import { IconMapPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./ShippingAddressCard.module.css";

interface ShippingAddressCardProps {
  name: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  label?: string;
}

export function ShippingAddressCard({
  name,
  phone,
  address,
  district,
  province,
  postalCode,
  label,
}: ShippingAddressCardProps) {
  const { t } = useTranslation("common");

  const displayLabel = label !== undefined ? label : t("shipTo");

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <IconMapPin size={12} className={styles.labelIcon} />
        <span className={styles.labelText}>{displayLabel}</span>
      </div>
      <div>
        <p className={styles.name}>{name}</p>
        {phone && <p className={styles.phone}>{phone}</p>}
        {address && <p className={styles.address}>{address}</p>}
        {(district || province || postalCode) && (
          <p className={styles.location}>
            {[district, province, postalCode].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
