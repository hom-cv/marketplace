/**
 * Footer component - Minimal
 */

import { Link } from "@tanstack/react-router";
import { Container, Group, Text, Anchor } from "@mantine/core";
import { useTranslation } from "react-i18next";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container size="lg">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text size="xs" c="dimmed">
            © {currentYear} marketplace
          </Text>
          <Group gap="md">
            <Anchor component={Link} to="/terms" size="xs" c="dimmed">
              {t("footer.terms")}
            </Anchor>
            <Anchor component={Link} to="/privacy" size="xs" c="dimmed">
              {t("footer.privacy")}
            </Anchor>
          </Group>
        </Group>
      </Container>
    </footer>
  );
}
