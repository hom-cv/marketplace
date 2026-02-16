/**
 * Footer component with policy links and language switcher
 */

import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.divider} />
      <div className={styles.content}>
        <LanguageSwitcher />
        <div className={styles.links}>
          <Link to="/terms" className={styles.link}>
            {t("footer.terms")}
          </Link>
          <Link to="/privacy" className={styles.link}>
            {t("footer.privacy")}
          </Link>
        </div>
        <p className={styles.copyright}>
          © {currentYear} {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
