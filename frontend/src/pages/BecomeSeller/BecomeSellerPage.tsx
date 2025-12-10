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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuildingBank, IconCheck, IconAlertCircle, IconLoader } from "@tabler/icons-react";
import { registerSeller, getSellerStatus, BANK_BRANDS } from "@/api/seller";
import type { SellerVerificationRequest } from "@/api/types/seller";
import { useNavigate } from "@tanstack/react-router";
import styles from "./BecomeSellerPage.module.css";

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      bank_brand: "",
      bank_account_number: "",
      bank_account_name: "",
    },
    validate: {
      bank_brand: (value) => (value ? null : "Please select a bank"),
      bank_account_number: (value) =>
        value.length >= 10 ? null : "Account number must be at least 10 digits",
      bank_account_name: (value) =>
        value.length >= 2 ? null : "Please enter the account holder name",
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
            <Title order={2}>You're a Verified Seller!</Title>
            <Text c="dimmed" ta="center">
              Your bank account ending in ****{sellerStatus.bank_last_digits} has been verified.
              You can now create listings and receive payments.
            </Text>
            <Button onClick={() => navigate({ to: "/app/posts/new" })}>
              Create a Listing
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
            <IconLoader size={64} color="var(--mantine-color-blue-6)" className={styles.spinner} />
            <Title order={2}>Verification in Progress</Title>
            <Text c="dimmed" ta="center">
              Your bank account is being verified. This usually takes a few moments.
              Please check back shortly.
            </Text>
            <Button variant="light" onClick={() => queryClient.invalidateQueries({ queryKey: ["sellerStatus"] })}>
              Check Status
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
            <Title order={2}>Verification Failed</Title>
            <Text c="dimmed" ta="center">
              Unfortunately, we couldn't verify your bank account.
              Please contact support for assistance.
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
          <Title order={1}>Become a Seller</Title>
          <Text c="dimmed" mt="sm">
            Register as a seller to start listing your products and receive payments.
          </Text>
        </div>

        <Paper shadow="sm" p="xl" radius="md" className={styles.paper}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Group gap="xs">
                <IconBuildingBank size={24} />
                <Text fw={500} size="lg">Bank Account Details</Text>
              </Group>

              <Text size="sm" c="dimmed">
                We use Omise to verify your bank account and process payments.
                Your earnings will be transferred to this account.
              </Text>

              {error && (
                <Alert color="red" title="Error">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert color="green" title="Success">
                  {success}
                </Alert>
              )}

              <Select
                label="Bank"
                placeholder="Select your bank"
                data={BANK_BRANDS.map((bank) => ({
                  value: bank.value,
                  label: bank.label,
                }))}
                searchable
                {...form.getInputProps("bank_brand")}
              />

              <TextInput
                label="Account Holder Name"
                placeholder="Name on your bank account"
                {...form.getInputProps("bank_account_name")}
              />

              <TextInput
                label="Account Number"
                placeholder="Your bank account number"
                {...form.getInputProps("bank_account_number")}
              />

              <Button
                type="submit"
                size="lg"
                mt="md"
                loading={registerMutation.isPending}
              >
                Verify Bank Account
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                By registering, you agree to our seller terms and conditions.
                Your bank account information is securely processed by Omise.
              </Text>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}
