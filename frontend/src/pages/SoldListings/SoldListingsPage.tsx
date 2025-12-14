import { useState } from "react";
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
  TextInput,
  Button,
  Select,
  ActionIcon,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { IconReceipt, IconAlertCircle, IconTruck, IconCheck, IconCopy } from "@tabler/icons-react";
import { getMySales, addTracking } from "@/api/payments";
import { formatPriceBreakdown } from "@/utils/priceFormatters";


const CARRIER_OPTIONS = [
  { value: "EMS", label: "EMS (Thailand Post)" },
  { value: "KEX", label: "Kerry Express" },
  { value: "FLASH_EXPRESS", label: "Flash Express" },
  { value: "J_AND_T", label: "J&T Express" },
];

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

export function SoldListingsPage() {
  const queryClient = useQueryClient();
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<number, string | null>>({});

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ["my-sales"],
    queryFn: getMySales,
  });

  const trackingMutation = useMutation({
    mutationFn: ({ paymentId, carrier, trackingNumber }: { paymentId: number; carrier: string; trackingNumber: string }) =>
      addTracking(paymentId, carrier, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sales"] });
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
        {error instanceof Error ? error.message : "Failed to load sales"}
      </Alert>
    );
  }

  const fulfillmentLabels: Record<string, string> = {
    packing: "Packing",
    in_transit: "In Transit",
    delivered: "Delivered",
  };

  const fulfillmentColors: Record<string, string> = {
    packing: "orange",
    in_transit: "blue",
    delivered: "green",
  };

  const handleAddTracking = (paymentId: number) => {
    const trackingNumber = trackingInputs[paymentId];
    const carrier = carrierInputs[paymentId];
    if (trackingNumber?.trim() && carrier) {
      trackingMutation.mutate({ paymentId, carrier, trackingNumber: trackingNumber.trim() });
      setTrackingInputs((prev) => ({ ...prev, [paymentId]: "" }));
      setCarrierInputs((prev) => ({ ...prev, [paymentId]: null }));
    }
  };

  // Filter to only show successful payments
  const successfulSales = sales?.filter((s) => s.status === "successful") || [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">Sold Listings</Title>
        <Text c="dimmed">Track your completed sales and add shipping information.</Text>
      </div>

      {successfulSales.length === 0 ? (
        <Center py="xl">
          <Card padding="xl" radius="md" withBorder ta="center" maw={400}>
            <Stack align="center" gap="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconReceipt size={24} />
              </ThemeIcon>
              <div>
                <Text fw={500}>No sales yet</Text>
                <Text size="sm" c="dimmed">
                  When you sell items, they'll appear here.
                </Text>
              </div>
            </Stack>
          </Card>
        </Center>
      ) : (
        <Stack gap="md">
          {successfulSales.map((sale) => (
            <Card key={sale.payment_id} padding="md" radius="md" withBorder>
              <Group wrap="nowrap" align="flex-start">
                <Image
                  src={sale.post.image_url || "https://placehold.co/100x100?text=No+Image"}
                  alt={sale.post.title}
                  w={80}
                  h={80}
                  radius="md"
                  fit="cover"
                />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group justify="space-between" align="flex-start">
                    <Text fw={500} lineClamp={1}>{sale.post.title}</Text>
                    <Group gap="xs">
                      {sale.fulfillment_status && (
                        <Badge
                          color={fulfillmentColors[sale.fulfillment_status] || "gray"}
                          variant="filled"
                          leftSection={sale.fulfillment_status === "delivered" ? <IconCheck size={12} /> : <IconTruck size={12} />}
                        >
                          {fulfillmentLabels[sale.fulfillment_status] || sale.fulfillment_status}
                        </Badge>
                      )}
                    </Group>
                  </Group>
                  <Text size="lg" fw={700} c="green">
                    +฿{(sale.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  {sale.buyer && (
                    <Text size="sm" c="dimmed">
                      Buyer: @{sale.buyer.username}
                    </Text>
                  )}

                  {/* Fee breakdown - from stored payment data */}
                  <Text size="xs" c="dimmed">
                    {formatPriceBreakdown(sale)}
                  </Text>

                  <Text size="xs" c="dimmed">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </Text>

                  {/* Shipping Address */}
                  {sale.shipping_name && (
                    <Card withBorder p="xs" mt="sm" radius="sm" bg="gray.0">
                      <Text size="xs" fw={600} mb={4}>Ship to:</Text>
                      <Text size="sm" fw={500}>{sale.shipping_name}</Text>
                      <Text size="xs" c="dimmed">{sale.shipping_phone}</Text>
                      <Text size="xs">{sale.shipping_address}</Text>
                      <Text size="xs">{sale.shipping_district}, {sale.shipping_province} {sale.shipping_postal_code}</Text>
                    </Card>
                  )}

                  {/* Tracking section */}
                  {sale.tracking_number ? (
                    <Group gap="xs" mt="xs" align="center">
                      <Badge
                        variant="filled"
                        color={CARRIER_COLORS[sale.shipping_carrier || ""] || "blue"}
                      >
                        {CARRIER_LABELS[sale.shipping_carrier || ""] || sale.shipping_carrier}
                      </Badge>
                      <Text size="sm" ff="monospace">{sale.tracking_number}</Text>
                      <CopyButton value={sale.tracking_number}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Copied" : "Copy"} withArrow>
                            <ActionIcon size="sm" variant="subtle" onClick={copy} color={copied ? "teal" : "gray"}>
                              <IconCopy size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Stack gap="xs" mt="xs">
                      <Select
                        placeholder="Select carrier"
                        size="xs"
                        data={CARRIER_OPTIONS}
                        value={carrierInputs[sale.payment_id] || null}
                        onChange={(value) => setCarrierInputs((prev) => ({
                          ...prev,
                          [sale.payment_id]: value,
                        }))}
                      />
                      <Group gap="xs">
                        <TextInput
                          placeholder="Enter tracking number"
                          size="xs"
                          style={{ flex: 1 }}
                          value={trackingInputs[sale.payment_id] || ""}
                          onChange={(e) => setTrackingInputs((prev) => ({
                            ...prev,
                            [sale.payment_id]: e.target.value,
                          }))}
                        />
                        <Button
                          size="xs"
                          onClick={() => handleAddTracking(sale.payment_id)}
                          loading={trackingMutation.isPending}
                          disabled={!trackingInputs[sale.payment_id]?.trim() || !carrierInputs[sale.payment_id]}
                        >
                          Ship
                        </Button>
                      </Group>
                    </Stack>
                  )}
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}


