/**
 * OrderSummary - Displays item and price breakdown for buyers
 * Buyers pay only item price + shipping (no extra fees)
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
} from "@mantine/core";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  const itemPrice = parseFloat(priceBreakdown?.item_price ?? "0");
  const shippingCost = parseFloat(priceBreakdown?.shipping_cost ?? "0");
  const total = parseFloat(priceBreakdown?.total ?? "0");

  return (
    <Paper withBorder p="xl" radius="md" pos="sticky" top={100}>
      <Title order={4} mb="lg">{t("checkout.orderSummary")}</Title>

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
            <Text size="sm" c="dimmed">{t("checkout.soldBy", { username: post.user.username })}</Text>
          </Box>
        </Group>
      </Card>

      <Divider my="md" />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm">{t("checkout.itemPrice")}</Text>
          <Text size="sm" fw={500}>฿{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">{t("checkout.shippingLabel")}</Text>
          <Text size="sm" fw={500} c={shippingCost === 0 ? "green" : undefined}>
            {shippingCost === 0 ? t("checkout.freeShipping") : `฿${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </Text>
        </Group>
      </Stack>

      <Divider my="md" />

      <Group justify="space-between">
        <Text size="lg" fw={600}>{t("checkout.total")}</Text>
        <Text size="xl" fw={700}>฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Group>
    </Paper>
  );
}
