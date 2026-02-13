/**
 * MeasurementsDisplay - Displays item measurements in a table
 */

import { IconRuler } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { MEASUREMENT_KEY_TO_TRANSLATION } from "@/api/types/post";
import styles from "./MeasurementsDisplay.module.css";

interface MeasurementsDisplayProps {
  measurements: Record<string, number | null | undefined>;
  showDivider?: boolean;
}

export function MeasurementsDisplay({
  measurements,
  showDivider = true,
}: MeasurementsDisplayProps) {
  const { t } = useTranslation("listings");

  // Filter out undefined/null values
  const validMeasurements = Object.entries(measurements).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (validMeasurements.length === 0) {
    return null;
  }

  const formatLabel = (key: string): string => {
    const translationKey = MEASUREMENT_KEY_TO_TRANSLATION[key];
    if (translationKey) {
      return t(`measurements.${translationKey}`);
    }
    // Fallback: convert snake_case to Title Case
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className={styles.container}>
      {showDivider && <hr className={styles.divider} />}
      <div className={styles.header}>
        <IconRuler size={16} className={styles.headerIcon} />
        <span className={styles.headerLabel}>{t("view.measurements")}</span>
      </div>
      <div className={styles.card}>
        <table className={styles.table}>
          <tbody>
            {validMeasurements.map(([key, value]) => (
              <tr key={key} className={styles.row}>
                <td className={styles.labelCell}>{formatLabel(key)}</td>
                <td className={styles.valueCell}>{value} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
