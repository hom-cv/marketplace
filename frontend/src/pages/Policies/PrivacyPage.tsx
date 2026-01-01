/**
 * Privacy Policy Page - Single long page with privacy and data protection
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

export function PrivacyPage() {
  const { t } = useTranslation("policies");

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/" size="sm">
          {t("backToHome")}
        </Anchor>

        <div>
          <Title order={1}>{t("privacy.title")}</Title>
          <Text size="sm" c="dimmed" mt="xs">
            {t("privacy.lastUpdated")}
          </Text>
        </div>

        <Box mx="calc(var(--mantine-spacing-md) * -1)">
          <Divider />
        </Box>

        <Stack gap="xl">
          <section>
            <Title order={3}>{t("privacy.introduction.title")}</Title>
            <Text mt="sm">{t("privacy.introduction.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.dataCollection.title")}</Title>
            <Text mt="sm">{t("privacy.dataCollection.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.dataUsage.title")}</Title>
            <Text mt="sm">{t("privacy.dataUsage.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.dataSharing.title")}</Title>
            <Text mt="sm">{t("privacy.dataSharing.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.dataSecurity.title")}</Title>
            <Text mt="sm">{t("privacy.dataSecurity.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.userRights.title")}</Title>
            <Text mt="sm">{t("privacy.userRights.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.cookies.title")}</Title>
            <Text mt="sm">{t("privacy.cookies.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.pdpaCompliance.title")}</Title>
            <Text mt="sm">{t("privacy.pdpaCompliance.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("privacy.contact.title")}</Title>
            <Text mt="sm">{t("privacy.contact.content")}</Text>
          </section>
        </Stack>

        <Box mx="calc(var(--mantine-spacing-md) * -1)" my="xl">
          <Divider />
        </Box>

        {/* Data Protection Section */}
        <div>
          <Title order={2}>{t("data-protection.title")}</Title>
          <Text size="sm" c="dimmed" mt="xs">
            {t("data-protection.lastUpdated")}
          </Text>
        </div>

        <Stack gap="xl">
          <section>
            <Title order={3}>{t("data-protection.introduction.title")}</Title>
            <Text mt="sm">{t("data-protection.introduction.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.dataController.title")}</Title>
            <Text mt="sm">{t("data-protection.dataController.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.dataProcessing.title")}</Title>
            <Text mt="sm">{t("data-protection.dataProcessing.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.securityMeasures.title")}</Title>
            <Text mt="sm">{t("data-protection.securityMeasures.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.dataRetention.title")}</Title>
            <Text mt="sm">{t("data-protection.dataRetention.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.userRights.title")}</Title>
            <Text mt="sm">{t("data-protection.userRights.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.internationalTransfers.title")}</Title>
            <Text mt="sm">{t("data-protection.internationalTransfers.content")}</Text>
          </section>

          <section>
            <Title order={3}>{t("data-protection.breachNotification.title")}</Title>
            <Text mt="sm">{t("data-protection.breachNotification.content")}</Text>
          </section>
        </Stack>
      </Stack>
    </Container>
  );
}
