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
import { Trans, useTranslation } from "react-i18next";
import { CONTACT_EMAILS } from "@/constants/contact";

const PRIVACY_SECTIONS = [
  "introduction",
  "dataCollection",
  "dataUsage",
  "dataSharing",
  "dataSecurity",
  "userRights",
  "cookies",
  "pdpaCompliance",
  "contact",
] as const;

const DATA_PROTECTION_SECTIONS = [
  "introduction",
  "dataController",
  "dataProcessing",
  "securityMeasures",
  "dataRetention",
  "userRights",
  "internationalTransfers",
  "breachNotification",
] as const;

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
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section}>
              <Title order={3}>{t(`privacy.${section}.title`)}</Title>
              <Text mt="sm">
                <Trans
                  t={t}
                  i18nKey={`privacy.${section}.content`}
                  values={CONTACT_EMAILS}
                  components={{
                    emailLink: (
                      <Anchor href={`mailto:${CONTACT_EMAILS.supportEmail}`} />
                    ),
                  }}
                />
              </Text>
            </section>
          ))}
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
          {DATA_PROTECTION_SECTIONS.map((section) => (
            <section key={section}>
              <Title order={3}>{t(`data-protection.${section}.title`)}</Title>
              <Text mt="sm">{t(`data-protection.${section}.content`)}</Text>
            </section>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

