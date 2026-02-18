import { Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
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
  const clipboard = useClipboard({ timeout: 2000 });
  const carrierKey = carrier?.toLowerCase() || "";
  const { t } = useTranslation("common");

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
          label={clipboard.copied ? t("tracking.copied") : t("tracking.copy")}
          withArrow
        >
          <button
            type="button"
            className={[
              styles.copyButton,
              clipboard.copied && styles.copyButtonCopied,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => clipboard.copy(trackingNumber)}
          >
            <IconCopy size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
