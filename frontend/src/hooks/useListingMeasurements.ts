/**
 * Shared measurement state for the listing forms (known fields + custom rows).
 * `assemble()` merges them and rejects duplicate labels. Pass `post` to seed.
 */

import { useRef, useState, useMemo, useCallback } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import type { Measurements, Post } from "@/api/types/post";
import { MEASUREMENT_FIELDS } from "@/api/types/post";
import type { ExtraMeasurement } from "@/api/types/listingForm";
import { updateAt } from "@/utils/array";

/** Reverse the form slug ("total_length" -> "total length") for display. */
function keyToLabel(key: string): string {
  return key.replace(/_/g, " ");
}

/** Split a post's stored measurements into known fields vs. custom extras. */
function splitMeasurements(post: Post): {
  known: Measurements;
  extra: ExtraMeasurement[];
} {
  const known: Record<string, number> = {};
  const extra: ExtraMeasurement[] = [];
  const fieldKeys = new Set(
    (MEASUREMENT_FIELDS[post.type] ?? []).map((f) => f.key),
  );

  let counter = 0;
  for (const [key, value] of Object.entries(post.measurements ?? {})) {
    if (value === undefined || value === null) continue;
    if (fieldKeys.has(key)) {
      known[key] = value as number;
    } else {
      extra.push({
        id: String(++counter),
        label: keyToLabel(key),
        value: String(value),
      });
    }
  }
  return { known: known as Measurements, extra };
}

type AssembleResult =
  | { ok: true; measurements: Measurements | undefined }
  | { ok: false };

export function useListingMeasurements(post?: Post) {
  const { t } = useTranslation("listings");

  const initial = useMemo(
    () =>
      post
        ? splitMeasurements(post)
        : { known: {} as Measurements, extra: [] as ExtraMeasurement[] },
    [post],
  );

  const extraIdCounter = useRef(initial.extra.length);
  const [measurements, setMeasurements] = useState<Measurements>(initial.known);
  const [extraMeasurements, setExtraMeasurements] = useState<
    ExtraMeasurement[]
  >(initial.extra);
  const [measurementsOpen, { toggle: toggleMeasurements }] = useDisclosure(
    initial.extra.length > 0 || Object.keys(initial.known as object).length > 0,
  );
  const [measurementError, setMeasurementError] = useState<string | null>(null);

  // Cleared when the category changes.
  const reset = useCallback(() => {
    setMeasurements({});
    setExtraMeasurements([]);
    setMeasurementError(null);
  }, []);

  const handleMeasurementChange = useCallback((key: string, value: string) => {
    const numValue = parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  }, []);

  const handleAddExtraMeasurement = useCallback(() => {
    setExtraMeasurements((prev) => [
      ...prev,
      { id: String(++extraIdCounter.current), label: "", value: "" },
    ]);
  }, []);

  const handleExtraMeasurementChange = useCallback(
    (index: number, field: "label" | "value", newValue: string) => {
      setExtraMeasurements((prev) =>
        updateAt(prev, index, (row) => ({ ...row, [field]: newValue })),
      );
    },
    [],
  );

  const handleRemoveExtraMeasurement = useCallback((index: number) => {
    setExtraMeasurements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Merge known + custom rows; { ok: false } + sets error on a duplicate label.
  const assemble = useCallback((): AssembleResult => {
    setMeasurementError(null);

    const cleanMeasurements = Object.fromEntries(
      Object.entries(measurements).filter(
        ([, v]) => v !== undefined && v !== null,
      ),
    ) as Measurements;

    const allMeasurements = { ...cleanMeasurements } as Record<
      string,
      number | undefined
    >;
    const seenKeys = new Set(Object.keys(cleanMeasurements));

    for (const extra of extraMeasurements) {
      const label = extra.label.trim();
      const rawValue = extra.value.trim();

      if (!label && !rawValue) continue;

      if (!label || !rawValue) {
        setMeasurementError(t("create.form.incompleteMeasurement"));
        return { ok: false };
      }

      const numValue = parseFloat(rawValue);
      if (isNaN(numValue)) {
        setMeasurementError(
          t("create.form.invalidMeasurementValue", { label }),
        );
        return { ok: false };
      }

      const key = label.toLowerCase().replace(/\s+/g, "_");
      if (seenKeys.has(key)) {
        setMeasurementError(t("create.form.duplicateMeasurement", { label }));
        return { ok: false };
      }

      seenKeys.add(key);
      allMeasurements[key] = numValue;
    }

    return {
      ok: true,
      measurements:
        Object.keys(allMeasurements).length > 0
          ? (allMeasurements as Measurements)
          : undefined,
    };
  }, [measurements, extraMeasurements, t]);

  return {
    measurements,
    extraMeasurements,
    measurementsOpen,
    toggleMeasurements,
    measurementError,
    reset,
    assemble,
    handleMeasurementChange,
    handleAddExtraMeasurement,
    handleExtraMeasurementChange,
    handleRemoveExtraMeasurement,
  };
}
