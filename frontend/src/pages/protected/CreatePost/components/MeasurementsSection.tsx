/**
 * MeasurementsSection - Expandable measurements panel
 * Full-width with grid layout and custom measurement support
 */

import { NumberInput, TextInput } from "@mantine/core";
import {
  IconRuler,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Measurements } from "@/api/types/post";
import type { MeasurementField, ExtraMeasurement } from "../hooks/useCreatePostForm";
import formStyles from "@/styles/forms.module.css";
import styles from "./MeasurementsSection.module.css";

interface MeasurementsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  measurements: Measurements;
  measurementFields: MeasurementField[];
  extraMeasurements: ExtraMeasurement[];
  onMeasurementChange: (key: string, value: string) => void;
  onAddExtraMeasurement: () => void;
  onExtraMeasurementChange: (
    index: number,
    field: "label" | "value",
    value: string
  ) => void;
  onRemoveExtraMeasurement: (index: number) => void;
}

export function MeasurementsSection({
  isOpen,
  onToggle,
  measurements,
  measurementFields,
  extraMeasurements,
  onMeasurementChange,
  onAddExtraMeasurement,
  onExtraMeasurementChange,
  onRemoveExtraMeasurement,
}: MeasurementsSectionProps) {
  const { t } = useTranslation("listings");

  // Don't render if no measurement fields available
  if (measurementFields.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.toggle} onClick={onToggle}>
        <IconRuler size={18} strokeWidth={1.5} />
        <span className={styles.toggleText}>
          {t("create.form.addMeasurements")}
        </span>
        <span className={styles.optionalBadge}>{t("create.form.optional")}</span>
        {isOpen ? (
          <IconChevronUp size={18} className={styles.toggleIcon} />
        ) : (
          <IconChevronDown size={18} className={styles.toggleIcon} />
        )}
      </button>

      <div className={`${styles.content} ${isOpen ? styles.contentOpen : ""}`}>
        <div className={styles.contentInner}>
          <p className={styles.description}>
            {t("create.form.measurementsDescription")}
          </p>

          {/* Standard Measurements Grid */}
          <div className={styles.grid}>
            {measurementFields.map((field) => (
              <NumberInput
                key={field.key}
                label={field.label}
                placeholder="0"
                min={0}
                step={0.1}
                decimalScale={1}
                radius="xs"
                rightSection={<span className={formStyles.unit}>cm</span>}
                value={
                  (measurements as Record<string, number | undefined>)[
                    field.key
                  ] ?? ""
                }
                onChange={(val) =>
                  onMeasurementChange(field.key, val?.toString() ?? "")
                }
              />
            ))}
          </div>

          {/* Extra Measurements */}
          {extraMeasurements.length > 0 && (
            <div className={styles.extras}>
              <h4 className={styles.extrasLabel}>
                {t("create.form.extraMeasurements")}
              </h4>
              {extraMeasurements.map((extra, index) => (
                <div key={extra.id} className={styles.extraRow}>
                  <TextInput
                    placeholder={t("create.form.measurementLabel")}
                    value={extra.label}
                    onChange={(e) =>
                      onExtraMeasurementChange(index, "label", e.target.value)
                    }
                    radius="xs"
                    className={styles.extraLabelInput}
                  />
                  <NumberInput
                    placeholder="0"
                    min={0}
                    step={0.1}
                    decimalScale={1}
                    radius="xs"
                    rightSection={<span className={formStyles.unit}>cm</span>}
                    value={extra.value === "" ? "" : parseFloat(extra.value)}
                    onChange={(val) =>
                      onExtraMeasurementChange(index, "value", val?.toString() ?? "")
                    }
                    className={styles.extraValueInput}
                  />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => onRemoveExtraMeasurement(index)}
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Extra Measurement Button */}
          <button
            type="button"
            className={styles.addButton}
            onClick={onAddExtraMeasurement}
          >
            <IconPlus size={14} />
            {t("create.form.addExtraMeasurement")}
          </button>
        </div>
      </div>
    </div>
  );
}
