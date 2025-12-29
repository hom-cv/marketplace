/**
 * EarningsPreview - Shows seller earnings breakdown
 * 
 * Three modes:
 * 1. postId: Fetches breakdown from backend using post ID
 * 2. breakdown: Displays pre-fetched breakdown data directly
 * 3. itemPrice/shippingCost: Fetches preview from backend (for create post page)
 */
import { Paper, Text, Stack, Group, Loader, Center } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPriceBreakdown, getEarningsPreview } from "@/api/payments";

interface BreakdownData {
  itemPrice: number;
  shippingCost: number;
  totalFees: number;
  sellerPayout: number;
}

interface EarningsPreviewProps {
  /** Post ID to fetch breakdown from API */
  postId?: number;
  /** Pre-fetched breakdown data */
  breakdown?: BreakdownData;
  /** Item price for preview calculation (used when no postId) */
  itemPrice?: number;
  /** Shipping cost for preview calculation */
  shippingCost?: number;
  /** Title text to display. Empty string to hide */
  title?: string;
  /** Compact mode with less padding and smaller text */
  compact?: boolean;
  /** Hide the fee explanation text */
  hideExplanation?: boolean;
}

export function EarningsPreview({
  postId,
  breakdown,
  itemPrice,
  shippingCost = 0,
  title,
  compact = false,
  hideExplanation = false,
}: EarningsPreviewProps) {
  const { t } = useTranslation("common");

  // Use provided title or default from translations
  const displayTitle = title !== undefined ? title : t("earnings.title");

  // Mode 1: Fetch by post ID
  const postQuery = useQuery({
    queryKey: ["price-breakdown", postId],
    queryFn: () => getPriceBreakdown(postId!, "card"),
    enabled: !!postId && !breakdown,
  });

  // Mode 3: Fetch preview by price/shipping
  const previewQuery = useQuery({
    queryKey: ["earnings-preview", itemPrice, shippingCost],
    queryFn: () => getEarningsPreview(itemPrice!, shippingCost, "card"),
    enabled: !!itemPrice && !postId && !breakdown,
  });

  const isLoading = postQuery.isLoading || previewQuery.isLoading;
  const apiData = postQuery.data || previewQuery.data;

  // Use provided breakdown or convert API response
  const data: BreakdownData | null = breakdown ?? (apiData ? {
    itemPrice: parseFloat(apiData.item_price),
    shippingCost: parseFloat(apiData.shipping_cost),
    totalFees: parseFloat(apiData.total_fees),
    sellerPayout: parseFloat(apiData.seller_payout),
  } : null);

  const format = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const textSize = compact ? "xs" : "sm";

  if (isLoading) {
    return (
      <Paper withBorder={!compact} p={compact ? "" : "md"} radius="md" bg={compact ? "transparent" : "gray.0"}>
        {displayTitle && <Text size={textSize} fw={600} mb="xs">{displayTitle}</Text>}
        <Center py="sm">
          <Stack align="center" gap={4}>
            <Loader size="sm" />
            <Text size="xs" c="dimmed">{t("earnings.calculating")}</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Paper withBorder={!compact} p={compact ? "" : "md"} radius="md" bg={compact ? "transparent" : "gray.0"}>
      {displayTitle && <Text size={textSize} fw={600} mb="xs">{displayTitle}</Text>}
      <Stack gap={2}>
        <Group justify="space-between">
          <Text size={textSize} c="dimmed">{t("earnings.itemPrice")}</Text>
          <Text size={textSize}>฿{format(data.itemPrice)}</Text>
        </Group>
        {data.shippingCost > 0 && (
          <Group justify="space-between">
            <Text size={textSize} c="dimmed">{t("earnings.shipping")}</Text>
            <Text size={textSize}>฿{format(data.shippingCost)}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size={textSize} c="dimmed">{t("earnings.fees")}</Text>
          <Text size={textSize} c="red">-฿{format(data.totalFees)}</Text>
        </Group>
        <Group
          justify="space-between"
          mt={4}
          pt={4}
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Text size={textSize} fw={600}>{t("earnings.youReceive")}</Text>
          <Text size={textSize} fw={700} c="green">
            ฿{format(data.sellerPayout)}
          </Text>
        </Group>
      </Stack>
      {!hideExplanation && (
        <Text size="xs" c="dimmed" mt="xs">
          {t("earnings.feesExplanation")}
        </Text>
      )}
    </Paper>
  );
}
