/**
 * BecomeSeller page for seller registration and verification
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Title,
  Text,
  Paper,
  TextInput,
  Select,
  Button,
  Stack,
  Alert,
  Group,
  LoadingOverlay,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuildingBank, IconCheck, IconAlertCircle, IconTicket } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { registerSeller, getSellerStatus, BANK_BRANDS } from "@/api/seller";
import type { SellerVerificationRequest } from "@/api/types/seller";
import { useNavigate } from "@tanstack/react-router";
import styles from "./BecomeSellerPage.module.css";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation("common");
  const { t: tPolicies } = useTranslation("policies");

  // Query current seller status
  const { data: sellerStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["sellerStatus"],
    queryFn: getSellerStatus,
  });

  // Mutation for registering as seller
  const registerMutation = useMutation({
    mutationFn: registerSeller,
    onSuccess: (data) => {
      setError(null);
      setSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["sellerStatus"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  const form = useForm<SellerVerificationRequest>({
    initialValues: {
      invite_code: "",
      bank_brand: "",
      bank_account_number: "",
      bank_account_name: "",
    },
    validate: {
      invite_code: (value) =>
        value.trim().length >= 6 ? null : t("seller.validation.inviteCodeMin"),
      bank_brand: (value) => (value ? null : t("seller.validation.selectBank")),
      bank_account_number: (value) =>
        value.length >= 10 ? null : t("seller.validation.accountNumberMin"),
      bank_account_name: (value) =>
        value.length >= 2 ? null : t("seller.validation.accountNameMin"),
    },
  });

  const handleSubmit = (values: SellerVerificationRequest) => {
    registerMutation.mutate(values);
  };

  // If already verified, show success state
  if (sellerStatus?.is_seller && sellerStatus?.verification_status === "verified") {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <Stack align="center" gap="lg">
            <IconCheck size={64} color="var(--mantine-color-green-6)" />
            <Title order={2}>{t("seller.verified")}</Title>
            <Text c="dimmed" ta="center">
              {t("seller.verifiedMessage", { digits: sellerStatus.bank_last_digits })}
            </Text>
            <Button onClick={() => navigate({ to: "/account/listings/new" })}>
              {t("seller.createListing")}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // If verification is pending
  if (sellerStatus?.verification_status === "pending") {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <Stack align="center" gap="lg">
            <Loader />
            <Title order={2}>{t("seller.pendingTitle")}</Title>
            <Text c="dimmed" ta="center">
              {t("seller.pendingMessage")}
            </Text>
            <Button variant="light" onClick={() => queryClient.invalidateQueries({ queryKey: ["sellerStatus"] })}>
              {t("seller.checkStatus")}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // If verification was rejected
  if (sellerStatus?.verification_status === "rejected") {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <Stack align="center" gap="lg">
            <IconAlertCircle size={64} color="var(--mantine-color-red-6)" />
            <Title order={2}>{t("seller.rejectedTitle")}</Title>
            <Text c="dimmed" ta="center">
              {t("seller.rejectedMessage")}
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <LoadingOverlay visible={isLoadingStatus} />

      <Stack gap="lg">
        <div>
          <Title order={1}>{t("seller.becomeSeller")}</Title>
          <Text c="dimmed" mt="sm">
            {t("seller.registerSubtitle")}
          </Text>
        </div>

        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Group gap="xs">
                <IconBuildingBank size={24} />
                <Text fw={500} size="lg">{t("seller.bankDetails")}</Text>
              </Group>

              <Text size="sm" c="dimmed">
                {t("seller.bankDescription")}
              </Text>

              {error && (
                <Alert color="red" title={t("status.error")}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert color="green" title={t("status.success")}>
                  {success}
                </Alert>
              )}

              <TextInput
                label={t("seller.inviteCode")}
                placeholder={t("seller.invitePlaceholder")}
                leftSection={<IconTicket size={16} />}
                {...form.getInputProps("invite_code")}
              />

              <Select
                label={t("seller.bank")}
                placeholder={t("seller.selectBank")}
                data={BANK_BRANDS.map((bank) => ({
                  value: bank.value,
                  label: bank.label,
                }))}
                searchable
                {...form.getInputProps("bank_brand")}
              />

              <TextInput
                label={t("seller.accountHolderName")}
                placeholder={t("seller.accountNamePlaceholder")}
                {...form.getInputProps("bank_account_name")}
              />

              <TextInput
                label={t("seller.accountNumber")}
                placeholder={t("seller.accountNumberPlaceholder")}
                {...form.getInputProps("bank_account_number")}
              />

              <Button
                type="submit"
                size="lg"
                mt="md"
                loading={registerMutation.isPending}
              >
                {t("seller.verifyBank")}
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                {tPolicies("seller.complianceNotice")}
              </Text>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}
