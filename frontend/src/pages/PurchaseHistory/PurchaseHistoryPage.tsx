import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Center,
  Loader,
  Alert,
  Group,
  Image,
  Badge,
  Button,
  Stepper,
  Accordion,
  Paper,
  Box,
  SimpleGrid,
} from "@mantine/core";
import { IconShoppingBag, IconAlertCircle, IconPackage, IconTruck, IconCheck } from "@tabler/icons-react";
import { getMyPurchases, confirmDelivery } from "@/api/payments";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { UserCard } from "@/components/UserCard";
import { FULFILLMENT_LABELS, FULFILLMENT_COLORS } from "@/constants/shipping";

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
      case "packing": return 0;
      case "in_transit": return 1;
      case "delivered": return 2;
      default: return 0;
    }
  };

  const successfulPurchases = purchases?.filter((p) => p.status === "successful") || [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Purchase History</Title>
        <Text c="dimmed">Track your orders and confirm deliveries.</Text>
      </div>

      {successfulPurchases.length === 0 ? (
        <EmptyStateCard
          icon={<IconShoppingBag size={24} />}
          title="No purchases yet"
          description="When you buy items from the marketplace, they'll appear here."
        />
      ) : (
        <Accordion variant="separated" radius="md">
          {successfulPurchases.map((purchase) => (
            <Accordion.Item key={purchase.payment_id} value={String(purchase.payment_id)}>
              <Accordion.Control>
                <Group wrap="nowrap" gap="md">
                  <Image
                    src={purchase.post.image_url || "https://placehold.co/60x60?text=No+Image"}
                    alt={purchase.post.title}
                    w={50}
                    h={50}
                    radius="md"
                    fit="cover"
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" mb={2}>
                      <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
                        {purchase.post.title}
                      </Text>
                      <Text fw={700} size="sm" style={{ flexShrink: 0 }}>
                        ฿{(purchase.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </Group>
                    <Group gap={6}>
                      <Badge
                        size="xs"
                        color={FULFILLMENT_COLORS[purchase.fulfillment_status || ""] || "gray"}
                        variant="light"
                      >
                        {FULFILLMENT_LABELS[purchase.fulfillment_status || ""] || "Processing"}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </Text>
                    </Group>
                  </Box>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Stack gap="sm">
                    <Paper withBorder p="xs" radius="sm">
                      <Text size="xs" fw={600} mb="xs" c="dimmed">Order Progress</Text>
                      <Stepper
                        active={getFulfillmentStep(purchase.fulfillment_status)}
                        size="xs"
                        orientation="vertical"
                      >
                        <Stepper.Step icon={<IconPackage size={14} />} label="Packing" />
                        <Stepper.Step icon={<IconTruck size={14} />} label="In Transit" />
                        <Stepper.Step icon={<IconCheck size={14} />} label="Delivered" />
                      </Stepper>
                    </Paper>

                    {purchase.fulfillment_status === "in_transit" && (
                      <Button
                        size="xs"
                        color="green"
                        leftSection={<IconCheck size={14} />}
                        onClick={() => confirmMutation.mutate(purchase.payment_id)}
                        loading={confirmMutation.isPending}
                        fullWidth
                      >
                        Confirm Delivery
                      </Button>
                    )}
                  </Stack>

                  <Stack gap="sm">
                    {purchase.seller && (
                      <UserCard username={purchase.seller.username} label="Seller" />
                    )}

                    {purchase.shipping_name && (
                      <ShippingAddressCard
                        name={purchase.shipping_name}
                        phone={purchase.shipping_phone}
                        address={purchase.shipping_address}
                        district={purchase.shipping_district}
                        province={purchase.shipping_province}
                        postalCode={purchase.shipping_postal_code}
                        label="Shipping To"
                      />
                    )}

                    {purchase.tracking_number && (
                      <TrackingInfoCard
                        trackingNumber={purchase.tracking_number}
                        carrier={purchase.shipping_carrier}
                      />
                    )}
                  </Stack>
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
