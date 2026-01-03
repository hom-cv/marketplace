/**
 * Footer component with policy links
 */

import { Link } from "@tanstack/react-router";
import { Container, Group, Text, Anchor, Divider, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Divider />
      <Container size="xl" pt="lg">
        <Stack gap="sm">
          <Group justify="center" gap="lg" wrap="wrap">
            <Anchor component={Link} to="/terms" size="sm" c="dimmed">
              {t("footer.terms")}
            </Anchor>
            <Anchor component={Link} to="/privacy" size="sm" c="dimmed">
              {t("footer.privacy")}
            </Anchor>
          </Group>
          <Text ta="center" size="xs" c="dimmed">
            © {currentYear} {t("footer.copyright")}
          </Text>
        </Stack>
      </Container>
    </footer>
  );
}
