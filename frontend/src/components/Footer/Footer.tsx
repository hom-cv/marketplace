/**
 * Footer component - Soft & Airy Design
 * Multi-column on desktop, hidden on mobile (bottom nav takes over)
 */

import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTwitter,
  IconShoppingBag,
} from "@tabler/icons-react";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Desktop Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.content}>
            {/* Brand Column */}
            <div className={styles.brand}>
              <Link to="/" className={styles.logo}>
                <span className={styles.logoIcon}>
                  <IconShoppingBag size={18} />
                </span>
                {t("appName", "Marketplace")}
              </Link>
              <p className={styles.tagline}>
                {t("footer.tagline", "Your trusted platform for buying and selling quality pre-loved items.")}
              </p>
              <div className={styles.socialLinks}>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  aria-label="Facebook"
                >
                  <IconBrandFacebook size={18} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  aria-label="Instagram"
                >
                  <IconBrandInstagram size={18} />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  aria-label="Twitter"
                >
                  <IconBrandTwitter size={18} />
                </a>
              </div>
            </div>

            {/* Explore Column */}
            <div className={styles.column}>
              <h4 className={styles.columnTitle}>{t("footer.explore", "Explore")}</h4>
              <Link to="/explore" className={styles.link}>
                {t("footer.browseAll", "Browse All")}
              </Link>
              <Link to="/explore" search={{ category: "SHIRT" }} className={styles.link}>
                {t("footer.fashion", "Fashion")}
              </Link>
              <Link to="/explore" search={{ category: "SHOES" }} className={styles.link}>
                {t("footer.shoes", "Shoes")}
              </Link>
              <Link to="/explore" search={{ category: "ACCESSORIES" }} className={styles.link}>
                {t("footer.accessories", "Accessories")}
              </Link>
            </div>

            {/* Company Column */}
            <div className={styles.column}>
              <h4 className={styles.columnTitle}>{t("footer.company", "Company")}</h4>
              <Link to="/" className={styles.link}>
                {t("footer.about", "About Us")}
              </Link>
              <Link to="/" className={styles.link}>
                {t("footer.contact", "Contact")}
              </Link>
              <Link to="/" className={styles.link}>
                {t("footer.help", "Help Center")}
              </Link>
            </div>

            {/* Legal Column */}
            <div className={styles.column}>
              <h4 className={styles.columnTitle}>{t("footer.legal", "Legal")}</h4>
              <Link to="/terms" className={styles.link}>
                {t("footer.terms")}
              </Link>
              <Link to="/privacy" className={styles.link}>
                {t("footer.privacy")}
              </Link>
              <Link to="/terms" hash="refund-policy" className={styles.link}>
                {t("footer.refund", "Refund Policy")}
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={styles.bottomBar}>
            <p className={styles.copyright}>
              © {currentYear} {t("footer.copyright")}
            </p>
            <div className={styles.bottomLinks}>
              <Link to="/terms" className={styles.bottomLink}>
                {t("footer.terms")}
              </Link>
              <Link to="/privacy" className={styles.bottomLink}>
                {t("footer.privacy")}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Footer - Simple version */}
      <div className={styles.mobileFooter}>
        <div className={styles.mobileLinks}>
          <Link to="/terms" className={styles.mobileLink}>
            {t("footer.terms")}
          </Link>
          <Link to="/privacy" className={styles.mobileLink}>
            {t("footer.privacy")}
          </Link>
        </div>
        <p className={styles.mobileCopyright}>
          © {currentYear} {t("footer.copyright")}
        </p>
      </div>
    </>
  );
}
