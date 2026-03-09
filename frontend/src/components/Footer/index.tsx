/**
 * Footer component with policy links and language switcher
 */

import {
  Container,
  Group,
  Text,
  Anchor,
  Divider,
  Stack,
  Box,
} from "@mantine/core";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();
  const matchRoute = useMatchRoute();

  // Hide footer on full-viewport pages
  if (matchRoute({ to: "/admin/flagged-messages", fuzzy: true })) {
    return null;
  }

  return (
    <Box component="footer" mt="auto" pb="1.5rem">
      <Container size="lg">
        <Divider mb="lg" />
        <Stack gap="md" hiddenFrom="sm">
          <LanguageSwitcher />
          <Group justify="center" gap="lg">
            <Anchor component={Link} to="/terms" size="sm" c="dimmed">
              {t("footer.terms")}
            </Anchor>
            <Anchor component={Link} to="/privacy" size="sm" c="dimmed">
              {t("footer.privacy")}
            </Anchor>
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            © {currentYear} {t("footer.copyright")}
          </Text>
        </Stack>
        <Group justify="space-between" visibleFrom="sm">
          <LanguageSwitcher />
          <Group gap="lg">
            <Anchor component={Link} to="/terms" size="sm" c="dimmed">
              {t("footer.terms")}
            </Anchor>
            <Anchor component={Link} to="/privacy" size="sm" c="dimmed">
              {t("footer.privacy")}
            </Anchor>
          </Group>
          <Text size="xs" c="dimmed">
            © {currentYear} {t("footer.copyright")}
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
