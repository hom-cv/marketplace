/**
 * Terms of Service Page - Single long page with all terms content
 */

import { Link } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Stack,
  Divider,
  Anchor,
  Box,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

const TERMS_SECTIONS = [
  "acceptance",
  "eligibility",
  "userAccounts",
  "prohibitedItems",
  "transactions",
  "liability",
  "modifications",
  "governingLaw",
] as const;

const REFUND_SECTIONS = [
  "overview",
  "eligibility",
  "process",
  "timeline",
  "nonRefundable",
  "disputes",
  "contact",
] as const;

// Contact emails - should match your actual support emails
const CONTACT_EMAILS = {
  supportEmail: "support@marketarchives.com",
};

export function TermsPage() {
  const { t } = useTranslation("policies");

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/" size="sm">
          {t("backToHome")}
        </Anchor>

        <div>
          <Title order={1}>{t("terms.title")}</Title>
          <Text size="sm" c="dimmed" mt="xs">
            {t("terms.lastUpdated")}
          </Text>
        </div>

        <Box mx="calc(var(--mantine-spacing-md) * -1)">
          <Divider />
        </Box>

        <Stack gap="xl">
          {TERMS_SECTIONS.map((section) => (
            <section key={section}>
              <Title order={3}>{t(`terms.${section}.title`)}</Title>
              <Text mt="sm">{t(`terms.${section}.content`)}</Text>
            </section>
          ))}
        </Stack>

        <Box mx="calc(var(--mantine-spacing-md) * -1)" my="xl">
          <Divider />
        </Box>

        {/* Refund Policy Section */}
        <div id="refund-policy">
          <Title order={2}>{t("refund.title")}</Title>
          <Text size="sm" c="dimmed" mt="xs">
            {t("refund.lastUpdated")}
          </Text>
        </div>

        <Stack gap="xl">
          {REFUND_SECTIONS.map((section) => (
            <section key={section}>
              <Title order={3}>{t(`refund.${section}.title`)}</Title>
              <Text mt="sm">{t(`refund.${section}.content`, CONTACT_EMAILS)}</Text>
            </section>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

