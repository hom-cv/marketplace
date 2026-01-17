/**
 * Minimal footer component
 */

import { Link } from "@tanstack/react-router";
import { Container, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container size="xl" className={styles.container}>
        <div className={styles.links}>
          <Link to="/terms" className={styles.link}>
            {t("footer.terms")}
          </Link>
          <span className={styles.separator}>·</span>
          <Link to="/privacy" className={styles.link}>
            {t("footer.privacy")}
          </Link>
        </div>
        <Text className={styles.copyright}>
          © {currentYear}
        </Text>
      </Container>
    </footer>
  );
}
