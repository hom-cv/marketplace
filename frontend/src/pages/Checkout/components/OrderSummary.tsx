/**
 * OrderSummary - Displays item and price breakdown
 */

import {
  Paper,
  Title,
  Text,
  Image,
  Card,
  Group,
  Box,
  Stack,
  Divider,
  Spoiler,
} from "@mantine/core";
import type { PriceBreakdownResponse } from "@/api/types/payment";

interface Post {
  id: number;
  title: string;
  image_url: string | null;
  user: { username: string };
}

interface OrderSummaryProps {
  post: Post;
  priceBreakdown?: PriceBreakdownResponse;
}

export function OrderSummary({ post, priceBreakdown }: OrderSummaryProps) {
  const itemPrice = priceBreakdown?.item_price ?? 0;
  const shippingCost = priceBreakdown?.shipping_cost ?? 0;
  const vatAmount = priceBreakdown?.vat_amount ?? 0;
  const platformFee = priceBreakdown?.platform_fee ?? 0;
  const processingFee = priceBreakdown?.processing_fee ?? 0;
  const total = priceBreakdown?.total ?? 0;
  const vatPercent = priceBreakdown?.vat_percent ?? 0;
  const platformFeePercent = priceBreakdown?.platform_fee_percent ?? 0;
  const processingFeePercent = priceBreakdown?.processing_fee_percent ?? 0;

  return (
    <Paper withBorder p="xl" radius="md" pos="sticky" top={100}>
      <Title order={4} mb="lg">Order Summary</Title>

      {/* Item */}
      <Card withBorder p="sm" radius="md" mb="lg">
        <Group>
          {post.image_url && (
            <Image
              src={post.image_url}
              alt={post.title}
              w={80}
              h={80}
              radius="md"
              fit="cover"
            />
          )}
          <Box style={{ flex: 1 }}>
            <Text fw={500} lineClamp={2}>{post.title}</Text>
            <Text size="sm" c="dimmed">Sold by @{post.user.username}</Text>
          </Box>
        </Group>
      </Card>

      <Divider my="md" />

      {/* Price breakdown */}
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm">Item Price</Text>
          <Text size="sm" fw={500}>฿{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Shipping</Text>
          <Text size="sm" fw={500} c={shippingCost === 0 ? "green" : undefined}>
            {shippingCost === 0 ? "Free" : `฿${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Fees & Taxes</Text>
          <Text size="sm" fw={500}>฿{(vatAmount + processingFee + platformFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </Group>
        <Spoiler maxHeight={0} showLabel="View fee details" hideLabel="Hide details">
          <Stack gap={4} pl="md" mt="xs">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">VAT ({vatPercent}%)</Text>
              <Text size="xs" c="dimmed">฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Processing ({processingFeePercent.toFixed(2)}%)</Text>
              <Text size="xs" c="dimmed">฿{processingFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Platform ({platformFeePercent}%)</Text>
              <Text size="xs" c="dimmed">฿{platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Group>
          </Stack>
        </Spoiler>
      </Stack>

      <Divider my="md" />

      <Group justify="space-between">
        <Text size="lg" fw={600}>Total</Text>
        <Text size="xl" fw={700}>฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Group>
    </Paper>
  );
}
