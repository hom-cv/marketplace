/**
 * Footer - Site-wide footer with policy links
 * Slim design with logo on left, links on right
 */

import { Container, Text, Anchor, Group } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation(["common", "policies"]);
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ borderTop: "1px solid var(--mantine-color-default-border)", marginTop: "auto" }}>
      <Container size="lg" py="sm">
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            © {currentYear} {t("appName")}
          </Text>
          <Group gap="lg">
            <Anchor component={Link} to="/policies#terms" size="xs" c="dimmed">
              {t("policies:policies.termsAndConditions")}
            </Anchor>
            <Anchor component={Link} to="/policies#privacy" size="xs" c="dimmed">
              {t("policies:policies.privacyPolicy")}
            </Anchor>
            <Anchor component={Link} to="/policies#refund" size="xs" c="dimmed">
              {t("policies:policies.refundPolicy")}
            </Anchor>
          </Group>
        </Group>
      </Container>
    </footer>
  );
}

