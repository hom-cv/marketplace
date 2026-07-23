import { useState, type ReactNode } from "react";
import { IconMapPin, IconCopy, IconCheck } from "@tabler/icons-react";
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

/** A field whose text copies to the clipboard when clicked. */
function CopyField({ value, children }: { value: string; children: ReactNode }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      className={styles.copyField}
      onClick={copy}
      aria-label={t("sales.copy")}
      title={t("sales.copy")}
    >
      <span className={styles.copyContent}>{children}</span>
      {copied ? (
        <IconCheck size={13} className={styles.copyDone} />
      ) : (
        <IconCopy size={13} className={styles.copyIcon} />
      )}
    </button>
  );
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
  const location = [district, province, postalCode].filter(Boolean).join(", ");
  const fullAddress = [address, location].filter(Boolean).join("\n");

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <IconMapPin size={12} className={styles.labelIcon} />
        <span className={styles.labelText}>{displayLabel}</span>
      </div>
      <div className={styles.fields}>
        <CopyField value={name}>
          <span className={styles.name}>{name}</span>
        </CopyField>
        {phone && (
          <CopyField value={phone}>
            <span className={styles.phone}>{phone}</span>
          </CopyField>
        )}
        {fullAddress && (
          <CopyField value={fullAddress}>
            {address && <span className={styles.address}>{address}</span>}
            {location && <span className={styles.location}>{location}</span>}
          </CopyField>
        )}
      </div>
    </div>
  );
}
