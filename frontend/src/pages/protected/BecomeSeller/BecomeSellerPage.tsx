/**
 * BecomeSeller page for Stripe Connect Standard onboarding.
 *
 * Seller registration is invite-gated. On submit, the backend creates a
 * Stripe Connect Standard account and the page re-renders into the
 * in-progress state, which shows a tutorial video and a button that fetches
 * a fresh one-time onboarding URL and redirects to Stripe for KYC and bank
 * details. The user is returned to this page (or the refresh URL)
 * afterwards, at which point we poll the backend for the latest account
 * state. Verified sellers manage payouts on dashboard.stripe.com directly.
 */

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  TextInput,
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
import {
  useSellerStatus,
  useRegisterSellerMutation,
  useOnboardingLinkMutation,
} from "@/hooks/useSeller";
import { queryKeys } from "@/hooks/queryKeys";
import type { SellerVerificationRequest } from "@/api/types/seller";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./BecomeSellerPage.module.css";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("common");
  const { t: tPolicies } = useTranslation("policies");

  // Query current seller status
  const { data: sellerStatus, isLoading: isLoadingStatus } = useSellerStatus();

  // Mutation for registering as seller
  const registerMutation = useRegisterSellerMutation({
    // No redirect here: invalidating seller status re-renders this page into
    // the in-progress state, which shows the tutorial video and fetches a
    // fresh onboarding link on click (account links are single-use and expire).
    onSuccess: () => setError(null),
    onError: (err: Error) => setError(err.message),
  });

  // Redirects to Stripe on success, so isPending stays true until navigation
  const onboardingLinkMutation = useOnboardingLinkMutation({
    onError: (err: Error) => setError(err.message),
  });

  const form = useForm<SellerVerificationRequest>({
    initialValues: {
      invite_code: "",
    },
    validate: {
      invite_code: (value) =>
        value.trim().length >= 6 ? null : t("seller.validation.inviteCodeMin"),
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
              {t("seller.verifiedMessage")}
            </Text>
            {(sellerStatus?.fee_free_sales_remaining ?? 0) > 0 && (
              <Text c="green" fw={500} ta="center">
                {t("seller.feeFreeSalesRemaining", {
                  count: sellerStatus?.fee_free_sales_remaining,
                })}
              </Text>
            )}
            <Group>
              <Button onClick={() => navigate({ to: "/account/listings/new" })}>
                {t("seller.createListing")}
              </Button>
              <Button
                variant="light"
                component="a"
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("seller.managePayoutAccount")}
              </Button>
            </Group>
            {error && (
              <Alert color="red" title={t("status.error")}>
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>
      </Container>
    );
  }

  // If onboarding has been submitted but review is still pending
  if (
    sellerStatus?.verification_status === "pending" &&
    sellerStatus?.details_submitted
  ) {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <Stack align="center" gap="lg">
            <Loader />
            <Title order={2}>{t("seller.reviewPending")}</Title>
            <Text c="dimmed" ta="center">
              {t("seller.pendingMessage")}
            </Text>
            <Button
              variant="light"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: queryKeys.seller.status,
                })
              }
            >
              {t("seller.checkStatus")}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // If onboarding has been started but not yet completed
  if (
    sellerStatus?.verification_status === "pending" &&
    !sellerStatus?.details_submitted
  ) {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <Stack align="center" gap="lg">
            <Title order={2}>{t("seller.onboardingInProgress")}</Title>
            <Text c="dimmed" ta="center">
              {t("seller.onboardingVideoMessage")}
            </Text>
            <video
              className={styles.video}
              src={t("seller.onboardingVideoUrl")}
              controls
              preload="metadata"
            />
            <Button
              loading={onboardingLinkMutation.isPending}
              onClick={() => onboardingLinkMutation.mutate()}
            >
              {t("seller.continueToStripe")}
            </Button>
            {error && (
              <Alert color="red" title={t("status.error")}>
                {error}
              </Alert>
            )}
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

              <TextInput
                label={t("seller.inviteCode")}
                placeholder={t("seller.invitePlaceholder")}
                leftSection={<IconTicket size={16} />}
                {...form.getInputProps("invite_code")}
              />

              <Button
                type="submit"
                size="lg"
                mt="md"
                loading={registerMutation.isPending}
              >
                {t("seller.continueToStripe")}
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
