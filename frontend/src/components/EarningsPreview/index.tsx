/**
 * EarningsPreview - Shows seller earnings breakdown
 * 
 * Displays:
 * - Item price
 * - Shipping (if any)
 * - Fees deducted (~14.6%)
 * - Final payout amount
 */
import { Paper, Text, Stack, Group } from "@mantine/core";

interface EarningsPreviewProps {
  itemPrice: number;
  shippingCost?: number;
  feePercent?: number;
  title?: string;
  compact?: boolean;
  hideExplanation?: boolean;
}

export function EarningsPreview({
  itemPrice,
  shippingCost = 0,
  feePercent = 0.146,
  title = "Your Earnings Preview",
  compact = false,
  hideExplanation = false,
}: EarningsPreviewProps) {
  const totalAmount = itemPrice + shippingCost;
  const totalFees = totalAmount * feePercent;
  const sellerPayout = totalAmount - totalFees;

  const format = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const textSize = compact ? "xs" : "sm";

  return (
    <Paper withBorder={!compact} p={compact ? "" : "md"} radius="md" bg={compact ? "transparent" : "gray.0"}>
      {title && <Text size={textSize} fw={600} mb="xs">{title}</Text>}
      <Stack gap={2}>
        <Group justify="space-between">
          <Text size={textSize} c="dimmed">Item Price</Text>
          <Text size={textSize}>฿{format(itemPrice)}</Text>
        </Group>
        {shippingCost > 0 && (
          <Group justify="space-between">
            <Text size={textSize} c="dimmed">+ Shipping</Text>
            <Text size={textSize}>฿{format(shippingCost)}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size={textSize} c="dimmed">- Fees (~{(feePercent * 100).toFixed(1)}%)</Text>
          <Text size={textSize} c="red">-฿{format(totalFees)}</Text>
        </Group>
        <Group
          justify="space-between"
          mt={4}
          pt={4}
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Text size={textSize} fw={600}>You receive</Text>
          <Text size={textSize} fw={700} c="green">
            ฿{format(sellerPayout)}
          </Text>
        </Group>
      </Stack>
      {!hideExplanation && (
        <Text size="xs" c="dimmed" mt="xs">
          Fees include platform (10% + 7% VAT) + processing (~3.9%)
        </Text>
      )}
    </Paper>
  );
}
