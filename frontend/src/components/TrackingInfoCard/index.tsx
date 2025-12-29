import { Text, Paper, Group, Badge, ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconTruck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CARRIER_LABELS, CARRIER_COLORS } from "@/constants/shipping";

interface TrackingInfoCardProps {
  trackingNumber: string;
  carrier: string | null;
}

export function TrackingInfoCard({ trackingNumber, carrier }: TrackingInfoCardProps) {
  const carrierKey = carrier?.toLowerCase() || "";
  const { t } = useTranslation("common");

  return (
    <Paper withBorder p="xs" radius="sm">
      <Group gap={4} mb={4}>
        <IconTruck size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" fw={600} c="dimmed">{t("tracking.title")}</Text>
      </Group>
      <Group gap="xs">
        <Badge size="xs" variant="filled" color={CARRIER_COLORS[carrierKey] || "blue"}>
          {CARRIER_LABELS[carrierKey] || carrier}
        </Badge>
        <Text size="xs" ff="monospace">{trackingNumber}</Text>
        <CopyButton value={trackingNumber}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? t("tracking.copied") : t("tracking.copy")} withArrow>
              <ActionIcon size="xs" variant="subtle" onClick={copy} color={copied ? "teal" : "gray"}>
                <IconCopy size={12} />
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Paper>
  );
}
