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
          <section>
            <Title order={3}>{t("terms.acceptance.title")}</Title>
            <Text mt="sm">{t("terms.acceptance.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.eligibility.title")}</Title>
            <Text mt="sm">{t("terms.eligibility.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.userAccounts.title")}</Title>
            <Text mt="sm">{t("terms.userAccounts.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.prohibitedItems.title")}</Title>
            <Text mt="sm">{t("terms.prohibitedItems.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.transactions.title")}</Title>
            <Text mt="sm">{t("terms.transactions.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.liability.title")}</Title>
            <Text mt="sm">{t("terms.liability.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.modifications.title")}</Title>
            <Text mt="sm">{t("terms.modifications.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("terms.governingLaw.title")}</Title>
            <Text mt="sm">{t("terms.governingLaw.content")}</Text>
          </section>
        </Stack>

        <Box mx="calc(var(--mantine-spacing-md) * -1)" my="xl">
          <Divider />
        </Box>

        {/* Refund Policy Section */}
        <div>
          <Title order={2}>{t("refund.title")}</Title>
          <Text size="sm" c="dimmed" mt="xs">
            {t("refund.lastUpdated")}
          </Text>
        </div>

        <Stack gap="xl">
          <section>
            <Title order={3}>{t("refund.overview.title")}</Title>
            <Text mt="sm">{t("refund.overview.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.eligibility.title")}</Title>
            <Text mt="sm">{t("refund.eligibility.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.process.title")}</Title>
            <Text mt="sm">{t("refund.process.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.timeline.title")}</Title>
            <Text mt="sm">{t("refund.timeline.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.nonRefundable.title")}</Title>
            <Text mt="sm">{t("refund.nonRefundable.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.disputes.title")}</Title>
            <Text mt="sm">{t("refund.disputes.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("refund.contact.title")}</Title>
            <Text mt="sm">{t("refund.contact.content")}</Text>
          </section>
        </Stack>
      </Stack>
    </Container>
  );
}
