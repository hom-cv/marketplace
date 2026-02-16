import { useState } from "react";
import { Tooltip } from "@mantine/core";
import { IconTruck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CARRIER_LABELS } from "@/constants/shipping";
import styles from "./TrackingInfoCard.module.css";

interface TrackingInfoCardProps {
  trackingNumber: string;
  carrier: string | null;
}

export function TrackingInfoCard({
  trackingNumber,
  carrier,
}: TrackingInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const carrierKey = carrier?.toLowerCase() || "";
  const { t } = useTranslation("common");

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied or failed
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <IconTruck size={12} className={styles.labelIcon} />
        <span className={styles.labelText}>{t("tracking.title")}</span>
      </div>
      <div className={styles.trackingRow}>
        <span className={styles.badge}>
          {CARRIER_LABELS[carrierKey] || carrier}
        </span>
        <span className={styles.trackingNumber}>{trackingNumber}</span>
        <Tooltip
          label={copied ? t("tracking.copied") : t("tracking.copy")}
          withArrow
        >
          <button
            type="button"
            className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ""}`}
            onClick={handleCopy}
          >
            <IconCopy size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
