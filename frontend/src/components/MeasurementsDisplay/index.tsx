/**
 * MeasurementsDisplay - Displays item measurements in a formatted grid
 */

import { Text, Paper, Group, Divider } from "@mantine/core";
import { IconRuler } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

// Map snake_case measurement keys to translation keys
const MEASUREMENT_KEY_MAP: Record<string, string> = {
  shoulder: "shoulder",
  length: "length",
  bust: "bust",
  sleeve: "sleeve",
  total_length: "totalLength",
  inseam: "inseam",
  rise: "rise",
  hip: "hip",
  insole_length: "insoleLength",
};

interface MeasurementsDisplayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measurements: Record<string, any>;
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
    const translationKey = MEASUREMENT_KEY_MAP[key];
    if (translationKey) {
      return t(`measurements.${translationKey}`);
    }
    // Fallback: convert snake_case to Title Case
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <>
      {showDivider && <Divider />}
      <div>
        <Group gap="xs" mb="sm">
          <IconRuler size={18} color="var(--mantine-color-dimmed)" />
          <Text size="sm" fw={500} c="dimmed">
            {t("view.measurements")}
          </Text>
        </Group>
        <Paper p="sm" radius="md" withBorder>
          <Group gap="lg" wrap="wrap" justify="space-around">
            {validMeasurements.map(([key, value]) => (
              <div key={key}>
                <Text size="xs" c="dimmed">
                  {formatLabel(key)}
                </Text>
                <Text fw={500}>{value} cm</Text>
              </div>
            ))}
          </Group>
        </Paper>
      </div>
    </>
  );
}
