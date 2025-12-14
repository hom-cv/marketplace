import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Card,
  Center,
  ThemeIcon,
  Loader,
  Alert,
  Group,
  Image,
  Badge,
  Button,
  Stepper,
  ActionIcon,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { IconShoppingBag, IconAlertCircle, IconPackage, IconTruck, IconCheck, IconCopy } from "@tabler/icons-react";
import { getMyPurchases, confirmDelivery } from "@/api/payments";

const CARRIER_LABELS: Record<string, string> = {
  ems: "EMS",
  kex: "Kerry",
  flash_express: "Flash",
  j_and_t: "J&T",
};

const CARRIER_COLORS: Record<string, string> = {
  ems: "blue",
  kex: "orange",
  flash_express: "yellow",
  j_and_t: "red",
};

export function PurchaseHistoryPage() {
  const queryClient = useQueryClient();

  const { data: purchases, isLoading, error } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: getMyPurchases,
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: number) => confirmDelivery(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] });
    },
  });

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : "Failed to load purchases"}
      </Alert>
    );
  }

  const getFulfillmentStep = (status: string | null): number => {
    switch (status) {
      case "packing":
        return 0;
      case "in_transit":
        return 1;
      case "delivered":
        return 2;
      default:
        return 0;
    }
  };

  const formatPriceBreakdown = (purchase: Purchase): string => {
    const itemPrice = (purchase.item_price ?? 0) / 100;
    const shippingCost = (purchase.shipping_cost ?? 0) / 100;
    const totalFees = ((purchase.vat_amount ?? 0) + (purchase.processing_fee ?? 0) + (purchase.platform_fee ?? 0)) / 100;
    const shippingText = shippingCost > 0 ? ` + Ship ฿${shippingCost.toLocaleString()}` : "";

    return `Item ฿${itemPrice.toLocaleString()}${shippingText} + Fees ฿${totalFees.toFixed(2)}`;
  };

  // Filter to only show successful payments
  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Purchase History</Title>
        <Text c="dimmed">Track your orders and confirm deliveries.</Text>
      </div>

      {successfulPurchases.length === 0 ? (
        <Center py="xl">
          <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
            <Stack align="center" gap="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconShoppingBag size={24} />
              </ThemeIcon>
              <div>
                <Text fw={500}>No purchases yet</Text>
                <Text size="sm" c="dimmed">
                  When you buy items from the marketplace, they'll appear here.
                </Text>
              </div>
            </Stack>
          </Card>
        </Center>
      ) : (
        <Stack gap="md">
          {successfulPurchases.map((purchase) => (
            <Card key={purchase.payment_id} padding="md" radius="md" withBorder>
              <Group wrap="nowrap" align="flex-start">
                <Image
                  src={purchase.post.image_url || "https://placehold.co/100x100?text=No+Image"}
                  alt={purchase.post.title}
                  w={80}
                  h={80}
                  radius="md"
                  fit="cover"
                />
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group justify="space-between" align="flex-start">
                    <Text fw={500} lineClamp={1}>{purchase.post.title}</Text>
                    <Text size="lg" fw={700}>
                      ฿{(purchase.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </Group>
                  {purchase.seller && (
                    <Text size="sm" c="dimmed">
                      Seller: @{purchase.seller.username}
                    </Text>
                  )}

                  {/* Fee breakdown - from stored payment data */}
                  <Text size="xs" c="dimmed">
                    {formatPriceBreakdown(purchase)}
                  </Text>

                  {/* Order Progress Stepper */}
                  <Stepper
                    active={getFulfillmentStep(purchase.fulfillment_status)}
                    size="xs"
                    mt="sm"
                  >
                    <Stepper.Step
                      icon={<IconPackage size={14} />}
                      label="Packing"
                    />
                    <Stepper.Step
                      icon={<IconTruck size={14} />}
                      label="In Transit"
                      description={purchase.tracking_number || undefined}
                    />
                    <Stepper.Step
                      icon={<IconCheck size={14} />}
                      label="Delivered"
                    />
                  </Stepper>

                  {/* Tracking number display */}
                  {purchase.tracking_number && purchase.fulfillment_status === "in_transit" && (
                    <Group gap="xs" mt="xs" align="center">
                      <Badge
                        variant="filled"
                        color={CARRIER_COLORS[purchase.shipping_carrier || ""] || "blue"}
                      >
                        {CARRIER_LABELS[purchase.shipping_carrier || ""] || purchase.shipping_carrier}
                      </Badge>
                      <Text size="sm" ff="monospace">{purchase.tracking_number}</Text>
                      <CopyButton value={purchase.tracking_number}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Copied" : "Copy"} withArrow>
                            <ActionIcon size="sm" variant="subtle" onClick={copy} color={copied ? "teal" : "gray"}>
                              <IconCopy size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  )}

                  {/* Confirm Delivery button - only show when in_transit */}
                  {purchase.fulfillment_status === "in_transit" && (
                    <Button
                      size="xs"
                      color="green"
                      leftSection={<IconCheck size={14} />}
                      mt="sm"
                      onClick={() => confirmMutation.mutate(purchase.payment_id)}
                      loading={confirmMutation.isPending}
                    >
                      Confirm Delivery
                    </Button>
                  )}

                  {/* Delivered message */}
                  {purchase.fulfillment_status === "delivered" && (
                    <Badge color="green" variant="filled" leftSection={<IconCheck size={12} />} mt="xs">
                      Delivered
                    </Badge>
                  )}

                  <Text size="xs" c="dimmed" mt="xs">
                    Purchased {new Date(purchase.created_at).toLocaleDateString()}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}


