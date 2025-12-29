import { useState } from "react";
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
  TextInput,
  Button,
  Select,
  Accordion,
  Paper,
  Box,
  SimpleGrid,
} from "@mantine/core";
import { IconReceipt, IconAlertCircle, IconTruck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getMySales, addTracking } from "@/api/payments";
import { EarningsPreview } from "@/components/EarningsPreview";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ShippingAddressCard } from "@/components/ShippingAddressCard";
import { TrackingInfoCard } from "@/components/TrackingInfoCard";
import { UserCard } from "@/components/UserCard";
import { CARRIER_OPTIONS, FULFILLMENT_LABELS, FULFILLMENT_COLORS } from "@/constants/shipping";

export function SoldListingsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
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
      <Alert icon={<IconAlertCircle size={16} />} title={t("status.error")} color="red">
        {error instanceof Error ? error.message : t("errors.failedToLoad")}
      </Alert>
    );
  }

  const handleAddTracking = (paymentId: number) => {
    const trackingNumber = trackingInputs[paymentId];
    const carrier = carrierInputs[paymentId];
    if (trackingNumber?.trim() && carrier) {
      trackingMutation.mutate({ paymentId, carrier, trackingNumber: trackingNumber.trim() });
      setTrackingInputs((prev) => ({ ...prev, [paymentId]: "" }));
      setCarrierInputs((prev) => ({ ...prev, [paymentId]: null }));
    }
  };

  const getSellerPayout = (sale: typeof successfulSales[0]) => {
    return (sale.seller_payout ?? 0) / 100;
  };

  const successfulSales = sales?.filter((s) => s.status === "successful") || [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} mb="xs">{t("sales.title")}</Title>
        <Text c="dimmed">{t("sales.subtitle")}</Text>
      </div>

      {successfulSales.length === 0 ? (
        <EmptyStateCard
          icon={<IconReceipt size={24} />}
          title={t("sales.noSales")}
          description={t("sales.noSalesDesc")}
        />
      ) : (
        <Accordion variant="separated" radius="md">
          {successfulSales.map((sale) => (
            <Accordion.Item key={sale.payment_id} value={String(sale.payment_id)}>
              <Accordion.Control>
                <Group wrap="nowrap" gap="md">
                  <Image
                    src={sale.post.image_url || "https://placehold.co/60x60?text=No+Image"}
                    alt={sale.post.title}
                    w={50}
                    h={50}
                    radius="md"
                    fit="cover"
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" mb={2}>
                      <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
                        {sale.post.title}
                      </Text>
                      <Text fw={700} c="green" size="sm" style={{ flexShrink: 0 }}>
                        +฿{getSellerPayout(sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </Group>
                    <Group gap={6}>
                      <Badge
                        size="xs"
                        color={FULFILLMENT_COLORS[sale.fulfillment_status || ""] || "gray"}
                        variant="light"
                      >
                        {FULFILLMENT_LABELS[sale.fulfillment_status || ""] || "Processing"}
                      </Badge>
                      {sale.tracking_number && (
                        <Badge size="xs" variant="outline" color="gray">{t("sales.shipped")}</Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </Text>
                    </Group>
                  </Box>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <Stack gap="sm">
                    <Paper withBorder p="xs" radius="sm">
                      <Text size="xs" fw={600} mb="xs" c="dimmed">{t("sales.earnings")}</Text>
                      <EarningsPreview
                        breakdown={{
                          itemPrice: (sale.item_price ?? 0) / 100,
                          shippingCost: (sale.shipping_cost ?? 0) / 100,
                          totalFees: (sale.total_fees ?? 0) / 100,
                          sellerPayout: (sale.seller_payout ?? 0) / 100,
                        }}
                        title=""
                        compact
                        hideExplanation
                      />
                    </Paper>

                    {sale.buyer && (
                      <UserCard username={sale.buyer.username} label={t("sales.buyer")} />
                    )}
                  </Stack>

                  <Stack gap="sm">
                    {sale.shipping_name && (
                      <ShippingAddressCard
                        name={sale.shipping_name}
                        phone={sale.shipping_phone}
                        address={sale.shipping_address}
                        district={sale.shipping_district}
                        province={sale.shipping_province}
                        postalCode={sale.shipping_postal_code}
                      />
                    )}

                    {sale.tracking_number ? (
                      <TrackingInfoCard
                        trackingNumber={sale.tracking_number}
                        carrier={sale.shipping_carrier}
                      />
                    ) : (
                      <Paper withBorder p="xs" radius="sm">
                        <Group gap={4} mb={4}>
                          <IconTruck size={12} color="var(--mantine-color-dimmed)" />
                          <Text size="xs" fw={600} c="dimmed">{t("sales.addShipping")}</Text>
                        </Group>
                        <Stack gap={6}>
                          <Select
                            placeholder={t("sales.carrier")}
                            size="xs"
                            data={CARRIER_OPTIONS}
                            value={carrierInputs[sale.payment_id] || null}
                            onChange={(value) => setCarrierInputs((prev) => ({
                              ...prev,
                              [sale.payment_id]: value,
                            }))}
                            disabled={trackingMutation.isPending}
                          />
                          <Group gap={4}>
                            <TextInput
                              placeholder={t("sales.trackingNumber")}
                              size="xs"
                              style={{ flex: 1 }}
                              value={trackingInputs[sale.payment_id] || ""}
                              onChange={(e) => setTrackingInputs((prev) => ({
                                ...prev,
                                [sale.payment_id]: e.target.value,
                              }))}
                              disabled={trackingMutation.isPending}
                            />
                            <Button
                              size="xs"
                              onClick={() => handleAddTracking(sale.payment_id)}
                              loading={trackingMutation.isPending}
                              disabled={!trackingInputs[sale.payment_id]?.trim() || !carrierInputs[sale.payment_id]}
                            >
                              {t("sales.ship")}
                            </Button>
                          </Group>
                        </Stack>
                      </Paper>
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
